import { and, eq, inArray } from "drizzle-orm";
import { track } from "@/lib/analytics";
import { getAuth } from "@/lib/auth/session";
import { getCaseDetail, propertyAddress } from "@/lib/cases/service";
import { getDb } from "@/lib/db";
import { documents, landlords } from "@/lib/db/schema";
import { renderEvidencePack } from "@/lib/docs/pdf";
import { CAUSES, SOURCES, formatPence, optionLabel } from "@/lib/domain";
import { formatInstant, formatIsoDate, londonDateOf } from "@/lib/rules/calendar";
import { hazardLabel, type HazardKey } from "@/lib/rules/hazards";
import { rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PHOTOS = 40;
const MAX_EMBED_BYTES = 60 * 1024 * 1024;

export async function GET(_req: Request, { params }: RouteContext<"/api/cases/[id]/evidence-pack">) {
  const { id } = await params;
  const auth = await getAuth();
  if (!auth?.org) return Response.json({ error: "Not signed in" }, { status: 401 });
  const org = auth.org;
  const limit = await rateLimit(`pack:${org.id}`, 60, 3600);
  if (!limit.ok) return Response.json({ error: "Too many evidence packs generated — try again later." }, { status: 429 });

  const detail = await getCaseDetail(org.id, id);
  if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
  const { case: c, property: p, landlord, evaluation } = detail;

  // Load the bytes we embed: JPEG/PNG photos inline, issued letters + uploaded PDFs as appendices.
  const db = await getDb();
  const embeddable = detail.documents.filter(
    (d) => d.mime === "image/jpeg" || d.mime === "image/png" || d.mime === "application/pdf",
  );
  let budget = MAX_EMBED_BYTES;
  const wanted = embeddable.filter((d) => {
    if (budget - d.size < 0) return false;
    budget -= d.size;
    return true;
  });
  const blobs = wanted.length
    ? await db
        .select({ id: documents.id, data: documents.data })
        .from(documents)
        .where(and(eq(documents.orgId, org.id), inArray(documents.id, wanted.map((d) => d.id))))
    : [];
  const bytesOf = (docId: string) => blobs.find((b) => b.id === docId)?.data;

  const photos = wanted
    .filter((d) => d.mime.startsWith("image/"))
    .slice(0, MAX_PHOTOS)
    .flatMap((d) => {
      const bytes = bytesOf(d.id);
      return bytes ? [{ filename: d.filename, mime: d.mime, bytes: new Uint8Array(bytes), createdAt: d.createdAt }] : [];
    });
  const appendixPdfs = wanted
    .filter((d) => d.mime === "application/pdf")
    .flatMap((d) => {
      const bytes = bytesOf(d.id);
      const title =
        d.kind === "written_summary" ? "Written summary" : d.kind === "delay_notice" ? "Delay notice" : d.kind === "quote" ? "Quote" : "Report";
      return bytes ? [{ title: `${title}: ${d.filename}`, bytes: new Uint8Array(bytes) }] : [];
    });

  const landlordNames = new Map<string, string>();
  const ids = [...new Set(detail.approvals.map((a) => a.landlordId).filter((x): x is string => Boolean(x)))];
  if (ids.length) {
    const rows = await db.select({ id: landlords.id, name: landlords.name }).from(landlords).where(and(eq(landlords.orgId, org.id), inArray(landlords.id, ids)));
    for (const r of rows) landlordNames.set(r.id, r.name);
  }

  const pdf = await renderEvidencePack({
    orgName: org.name,
    reference: c.reference,
    generatedAt: new Date(),
    propertyAddress: propertyAddress(p),
    tenantName: p.tenantName,
    landlordName: landlord?.name ?? null,
    evaluation,
    details: [
      ["Issue", hazardLabel(c.hazard as HazardKey)],
      ["Became aware", formatInstant(c.awareAt)],
      ["How we found out", optionLabel(SOURCES, c.source)],
      ["Reported by", c.reportedBy],
      ["What was reported", c.description],
      ["Rooms affected", c.rooms],
      ["Household vulnerability", c.vulnerability],
      ["Investigation booked for", c.investigationBookedFor ? formatInstant(c.investigationBookedFor) : null],
      ["Investigation completed", c.investigationCompletedAt ? formatInstant(c.investigationCompletedAt) : null],
      ["Investigated by", c.investigators],
      ["Method", c.investigationMethod === "remote" ? `Remote — ${c.remoteJustification ?? "reason not recorded"}` : c.investigationMethod ? "In person" : null],
      ["Findings", c.findings],
      [
        "Outcome",
        c.hazardFound == null
          ? null
          : p.jurisdiction === "scotland"
            ? c.hazardFound
              ? "Not substantially free from damp and mould — repairs required"
              : "Substantially free from damp and mould"
            : c.hazardFound
              ? `${c.foundSeverity ?? "Significant"} hazard confirmed`
              : "No significant or emergency hazard",
      ],
      ["Likely cause", c.cause ? optionLabel(CAUSES, c.cause) : null],
      ["Work done on the visit", c.workDoneOnVisit],
      ["Work required", c.workRequired],
      ["Target repair start", c.targetRepairStart ? formatIsoDate(c.targetRepairStart) : null],
      ["Written summary issued", c.summaryIssuedAt ? `${formatInstant(c.summaryIssuedAt)} (${c.summaryMethod ?? "method not recorded"})` : null],
      ["Made safe", c.safetyWorkCompletedAt ? formatInstant(c.safetyWorkCompletedAt) : null],
      ["Repair work began", c.repairCommencedAt ? formatInstant(c.repairCommencedAt) : null],
      ["Contractor", c.contractor],
      ["Target completion", c.repairTargetDate ? formatIsoDate(c.repairTargetDate) : null],
      ["Repair completed", c.repairCompletedAt ? formatInstant(c.repairCompletedAt) : null],
      ["Closed", c.closedAt ? `${formatInstant(c.closedAt)} — ${c.closeReason ?? ""}` : null],
    ],
    delays: detail.delays.map((d) => ({
      duty: evaluation.duties.find((x) => x.key === d.duty)?.shortLabel ?? d.duty,
      reason: d.reason,
      revisedDate: d.revisedDate,
      noticeIssuedAt: d.noticeIssuedAt,
      interimSteps: d.interimSteps,
    })),
    approvals: detail.approvals.map((a) => ({
      description: a.description,
      amount: formatPence(a.amountPence),
      status: a.status,
      createdAt: a.createdAt,
      respondedAt: a.respondedAt,
      note: a.responseNote,
      landlord: a.landlordId ? (landlordNames.get(a.landlordId) ?? null) : null,
    })),
    events: detail.events.map((e) => ({
      occurredAt: e.occurredAt,
      recordedAt: e.recordedAt,
      summary: e.summary,
      actor: e.actorLabel ?? (e.actorType === "system" ? "RepairClock" : e.actorType),
    })),
    documents: detail.documents.map((d) => ({ filename: d.filename, kind: d.kind, size: d.size, createdAt: d.createdAt, sha256: d.sha256 })),
    photos,
    appendixPdfs,
  });

  await track("evidence_pack_downloaded", { orgId: org.id, userId: auth.user.id, isDemo: org.isDemo });
  const filename = `RepairClock-evidence-${c.reference}-${londonDateOf(new Date())}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
