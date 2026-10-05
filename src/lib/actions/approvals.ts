"use server";

import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { track } from "@/lib/analytics";
import { addEvent, propertyAddress } from "@/lib/cases/service";
import { getDb } from "@/lib/db";
import { approvalRequests, cases, landlords, memberships, organizations, properties, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { approvalResponseEmail } from "@/lib/email/templates";
import { formatPence } from "@/lib/domain";
import { env } from "@/lib/env";
import { sha256 } from "@/lib/security/crypto";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { ActionError, oneOf, optStr, str, toState, type ActionState } from "./helpers";

/** Public: the landlord answers via the tokenised link — no account needed. */
export async function respondApprovalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const ip = clientIp(await headers());
    const limit = await rateLimit(`approve:${ip}`, 30, 3600);
    if (!limit.ok) throw new ActionError("Too many attempts. Please try again later.");
    const token = str(fd, "token", 200);
    if (!token) throw new ActionError("This link is invalid.");
    const decision = oneOf(fd, "decision", ["approved", "declined"] as const);
    const note = optStr(fd, "note", 1000);
    const signedName = optStr(fd, "signedName", 160);
    if (!signedName) throw new ActionError("Type your name to confirm your decision.");
    if (decision === "declined" && !note) throw new ActionError("Please give a reason for declining, so your agent can respond.");

    const db = await getDb();
    const [row] = await db
      .select({ req: approvalRequests, case: cases, property: properties, org: organizations, landlord: landlords })
      .from(approvalRequests)
      .innerJoin(cases, eq(cases.id, approvalRequests.caseId))
      .innerJoin(properties, eq(properties.id, cases.propertyId))
      .innerJoin(organizations, eq(organizations.id, approvalRequests.orgId))
      .leftJoin(landlords, eq(landlords.id, approvalRequests.landlordId))
      .where(eq(approvalRequests.tokenHash, sha256(token)))
      .limit(1);
    if (!row) throw new ActionError("This link is invalid or has been withdrawn.");
    if (row.req.status !== "pending") throw new ActionError("This request has already been answered.");
    if (row.req.expiresAt.getTime() < Date.now()) throw new ActionError("This link has expired. Ask your agent to send a new one.");

    // Conditional update so a double-submit can't record two decisions.
    const updated = await db
      .update(approvalRequests)
      .set({ status: decision, responseNote: note ? `${note} — ${signedName}` : `Signed: ${signedName}`, respondedAt: new Date() })
      .where(and(eq(approvalRequests.id, row.req.id), eq(approvalRequests.status, "pending")))
      .returning({ id: approvalRequests.id });
    if (!updated.length) throw new ActionError("This request has already been answered.");

    const who = row.landlord?.name ?? "The landlord";
    await addEvent(db, {
      orgId: row.org.id,
      caseId: row.case.id,
      type: "approval_responded",
      summary: `${who} ${decision} the ${row.req.kind === "investigation" ? "investigation" : "repair work"}: ${row.req.description}${
        row.req.amountPence != null ? ` (${formatPence(row.req.amountPence)})` : ""
      }. Confirmed by “${signedName}”.${note ? ` Note: ${note}` : ""}`,
      actorType: "landlord",
      actorId: row.req.landlordId,
      actorLabel: signedName,
      data: { approvalId: row.req.id, decision },
    });

    // Tell the agent: the requester if we know them, otherwise the workspace owner / reply-to.
    let to = row.org.settings?.replyToEmail ?? null;
    if (row.req.createdBy) {
      const [u] = await db.select({ email: users.email }).from(users).where(eq(users.id, row.req.createdBy)).limit(1);
      to = u?.email ?? to;
    }
    if (!to) {
      const [owner] = await db
        .select({ email: users.email })
        .from(memberships)
        .innerJoin(users, eq(users.id, memberships.userId))
        .where(and(eq(memberships.orgId, row.org.id), eq(memberships.role, "owner")))
        .orderBy(asc(memberships.createdAt))
        .limit(1);
      to = owner?.email ?? null;
    }
    if (to) {
      const mail = approvalResponseEmail({
        landlordName: who,
        decision,
        reference: row.case.reference,
        propertyAddress: propertyAddress(row.property),
        note,
        caseUrl: `${env.appUrl}/app/cases/${row.case.id}`,
      });
      await sendEmail({ to, ...mail, category: "approval_response", orgId: row.org.id, caseId: row.case.id, isDemo: row.org.isDemo });
    }
    await track("approval_responded", { orgId: row.org.id, isDemo: row.org.isDemo, props: { decision } });
    return {
      ok: true,
      message:
        decision === "approved"
          ? "Thank you — your approval has been recorded and your agent has been notified."
          : "Thank you — your decision has been recorded and your agent has been notified.",
    };
  } catch (err) {
    return toState(err);
  }
}
