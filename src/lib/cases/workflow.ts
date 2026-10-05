/**
 * Write-side building blocks shared by server actions, route handlers and the daily job.
 */
import { and, eq } from "drizzle-orm";
import type { DB } from "@/lib/db";
import {
  approvalRequests,
  caseDelays,
  cases,
  documents,
  landlords,
  organizations,
  properties,
  type DocumentKind,
} from "@/lib/db/schema";
import { renderLetterPdf } from "@/lib/docs/pdf";
import type { LetterDocument } from "@/lib/docs/letters";
import { sendEmail } from "@/lib/email/send";
import { approvalRequestEmail, tenantLetterEmail } from "@/lib/email/templates";
import { formatPence } from "@/lib/domain";
import { env } from "@/lib/env";
import { formatIsoDateLong } from "@/lib/rules/calendar";
import { evaluateCase } from "@/lib/rules/engine";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { addEvent, propertyAddress, toFacts } from "./service";

type Org = typeof organizations.$inferSelect;

export async function loadCase(db: DB, orgId: string, caseId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) return null;
  const [row] = await db
    .select({ case: cases, property: properties, landlord: landlords })
    .from(cases)
    .innerJoin(properties, eq(properties.id, cases.propertyId))
    .leftJoin(landlords, eq(landlords.id, properties.landlordId))
    .where(and(eq(cases.orgId, orgId), eq(cases.id, caseId)))
    .limit(1);
  if (!row) return null;
  const delays = await db
    .select()
    .from(caseDelays)
    .where(and(eq(caseDelays.orgId, orgId), eq(caseDelays.caseId, caseId)));
  return { ...row, delays, evaluation: evaluateCase(toFacts(row.case, row.property, delays)) };
}

export async function storeDocument(
  db: DB,
  input: {
    orgId: string;
    caseId: string | null;
    kind: DocumentKind;
    filename: string;
    mime: string;
    bytes: Uint8Array | Buffer;
    uploadedBy: string | null;
  },
) {
  const buf = Buffer.isBuffer(input.bytes) ? input.bytes : Buffer.from(input.bytes);
  const [doc] = await db
    .insert(documents)
    .values({
      orgId: input.orgId,
      caseId: input.caseId,
      kind: input.kind,
      filename: input.filename.slice(0, 180),
      mime: input.mime,
      size: buf.length,
      sha256: sha256(buf),
      data: buf,
      uploadedBy: input.uploadedBy,
    })
    .returning({ id: documents.id });
  return doc.id;
}

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Render a letter to PDF, file it on the case, and optionally email it to the tenant.
 * Returns the stored document id.
 */
export async function issueLetter(
  db: DB,
  input: {
    org: Org;
    caseId: string;
    userId: string | null;
    actorLabel: string;
    kind: DocumentKind;
    letter: LetterDocument;
    tenantEmail: string | null;
    emailTenant: boolean;
    propertyAddress: string;
    tenantName: string | null;
  },
): Promise<{ documentId: string; emailed: boolean; emailError?: string }> {
  const pdf = await renderLetterPdf(input.letter);
  const filename = `${input.letter.reference}-${slug(input.letter.title)}-${input.letter.dateIso}.pdf`;
  const documentId = await storeDocument(db, {
    orgId: input.org.id,
    caseId: input.caseId,
    kind: input.kind,
    filename,
    mime: "application/pdf",
    bytes: pdf,
    uploadedBy: input.userId,
  });
  let emailed = false;
  let emailError: string | undefined;
  if (input.emailTenant && input.tenantEmail) {
    const mail = tenantLetterEmail({
      orgName: input.org.name,
      tenantName: input.tenantName ?? "",
      propertyAddress: input.propertyAddress,
      letterTitle: input.letter.title,
      intro:
        input.kind === "written_summary"
          ? "Please find attached the written summary of our recent damp and mould investigation at your home."
          : "Please find attached an update about the timescale for dealing with the damp or mould at your home.",
    });
    const res = await sendEmail({
      to: input.tenantEmail,
      ...mail,
      category: input.kind,
      orgId: input.org.id,
      caseId: input.caseId,
      isDemo: input.org.isDemo,
      replyTo: input.org.settings?.replyToEmail ?? null,
      attachments: [{ filename, content: Buffer.from(pdf), contentType: "application/pdf" }],
    });
    emailed = res.status !== "failed";
    emailError = res.error;
    await addEvent(db, {
      orgId: input.org.id,
      caseId: input.caseId,
      type: "email_sent",
      summary: emailed
        ? `Emailed “${input.letter.title}” to the tenant (${input.tenantEmail})${res.status === "logged" ? " — logged to outbox (no email provider configured)" : ""}`
        : `Email to the tenant failed: ${res.error ?? "unknown error"}`,
      actorId: input.userId,
      actorLabel: input.actorLabel,
      data: { documentId, status: res.status },
    });
  }
  return { documentId, emailed, emailError };
}

/** Creates a tokenised approval request and emails the landlord. */
export async function requestLandlordApproval(
  db: DB,
  input: {
    org: Org;
    caseId: string;
    userId: string | null;
    actorLabel: string;
    landlord: typeof landlords.$inferSelect;
    kind: "investigation" | "repair";
    description: string;
    amountPence: number | null;
    contractor: string | null;
    respondBy: string | null;
  },
) {
  const loaded = await loadCase(db, input.org.id, input.caseId);
  if (!loaded) throw new Error("Case not found");
  const token = randomToken();
  const [req] = await db
    .insert(approvalRequests)
    .values({
      orgId: input.org.id,
      caseId: input.caseId,
      landlordId: input.landlord.id,
      tokenHash: sha256(token),
      kind: input.kind,
      description: input.description,
      amountPence: input.amountPence,
      contractor: input.contractor,
      respondBy: input.respondBy,
      expiresAt: new Date(Date.now() + 21 * 86_400_000),
      createdBy: input.userId,
    })
    .returning();

  const next = loaded.evaluation.nextDuty;
  const deadlineText =
    next && next.dueDate && loaded.evaluation.inForce
      ? `Legal deadline: ${next.label.toLowerCase()} by ${formatIsoDateLong(next.dueDate)} under ${
          loaded.property.jurisdiction === "scotland"
            ? "the Investigation and Commencement of Repair (Scotland) Regulations 2026"
            : "Awaab’s Law"
        }. The duty rests with you as the landlord.`
      : null;
  const url = `${env.appUrl}/approve/${encodeURIComponent(token)}`;
  let emailStatus: string = "skipped";
  if (input.landlord.email) {
    const mail = approvalRequestEmail({
      orgName: input.org.name,
      landlordName: input.landlord.name,
      propertyAddress: propertyAddress(loaded.property),
      kind: input.kind,
      description: input.description,
      amount: formatPence(input.amountPence),
      contractor: input.contractor,
      deadlineText,
      respondBy: input.respondBy ? formatIsoDateLong(input.respondBy) : null,
      url,
    });
    const res = await sendEmail({
      to: input.landlord.email,
      ...mail,
      category: "approval_request",
      orgId: input.org.id,
      caseId: input.caseId,
      isDemo: input.org.isDemo,
      replyTo: input.org.settings?.replyToEmail ?? null,
    });
    emailStatus = res.status;
  }
  await addEvent(db, {
    orgId: input.org.id,
    caseId: input.caseId,
    type: "approval_requested",
    summary: `Asked ${input.landlord.name} to approve: ${input.description}${
      input.amountPence != null ? ` (${formatPence(input.amountPence)})` : ""
    }${emailStatus === "logged" ? " — email logged to outbox" : emailStatus === "failed" ? " — email failed to send" : ""}`,
    actorId: input.userId,
    actorLabel: input.actorLabel,
    data: { approvalId: req.id, kind: input.kind, emailStatus },
  });
  return { request: req, url, emailStatus };
}
