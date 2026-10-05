/**
 * Read-side queries for cases. Every query is scoped by organisation id — callers must pass
 * the id from the authenticated session, never from user input.
 */
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { getDb, type DB } from "@/lib/db";
import {
  approvalRequests,
  caseDelays,
  caseEvents,
  cases,
  documents,
  landlords,
  properties,
} from "@/lib/db/schema";
import { evaluateCase, type CaseEvaluation, type CaseFacts, type DutyKey } from "@/lib/rules/engine";
import type { HazardKey } from "@/lib/rules/hazards";

export type CaseRow = typeof cases.$inferSelect;
export type PropertyRow = typeof properties.$inferSelect;
export type LandlordRow = typeof landlords.$inferSelect;
export type DelayRow = typeof caseDelays.$inferSelect;
export type EventRow = typeof caseEvents.$inferSelect;
export type ApprovalRow = typeof approvalRequests.$inferSelect;

export function toFacts(c: CaseRow, p: PropertyRow, delays: DelayRow[]): CaseFacts {
  return {
    jurisdiction: p.jurisdiction,
    sector: p.sector,
    hazard: c.hazard as HazardKey,
    triage: c.triage,
    awareAt: c.awareAt,
    investigationCompletedAt: c.investigationCompletedAt,
    hazardFound: c.hazardFound,
    foundSeverity: c.foundSeverity,
    summaryIssuedAt: c.summaryIssuedAt,
    repairCommencedAt: c.repairCommencedAt,
    safetyWorkCompletedAt: c.safetyWorkCompletedAt,
    supplementaryStepsAt: c.supplementaryStepsAt,
    supplementaryRequired: c.supplementaryRequired,
    repairCompletedAt: c.repairCompletedAt,
    repairTargetDate: c.repairTargetDate,
    delays: delays.map((d) => ({
      duty: d.duty as DutyKey,
      noticeIssuedAt: d.noticeIssuedAt,
      reason: d.reason,
      revisedDate: d.revisedDate,
    })),
    closed: c.status === "closed",
  };
}

export interface CaseListItem {
  case: CaseRow;
  property: PropertyRow;
  landlord: LandlordRow | null;
  evaluation: CaseEvaluation;
  pendingApproval: ApprovalRow | null;
}

export async function listCases(
  orgId: string,
  opts: { includeClosed?: boolean; propertyId?: string; now?: Date } = {},
): Promise<CaseListItem[]> {
  const db = await getDb();
  const where = [eq(cases.orgId, orgId)];
  if (!opts.includeClosed) where.push(ne(cases.status, "closed"));
  if (opts.propertyId) where.push(eq(cases.propertyId, opts.propertyId));
  const rows = await db
    .select({ case: cases, property: properties, landlord: landlords })
    .from(cases)
    .innerJoin(properties, eq(properties.id, cases.propertyId))
    .leftJoin(landlords, eq(landlords.id, properties.landlordId))
    .where(and(...where))
    .orderBy(desc(cases.awareAt));
  if (!rows.length) return [];
  const ids = rows.map((r) => r.case.id);
  const [delayRows, approvalRows] = await Promise.all([
    db.select().from(caseDelays).where(and(eq(caseDelays.orgId, orgId), inArray(caseDelays.caseId, ids))),
    db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.orgId, orgId),
          inArray(approvalRequests.caseId, ids),
          eq(approvalRequests.status, "pending"),
        ),
      ),
  ]);
  const now = opts.now ?? new Date();
  return rows.map((r) => ({
    ...r,
    evaluation: evaluateCase(
      toFacts(
        r.case,
        r.property,
        delayRows.filter((d) => d.caseId === r.case.id),
      ),
      now,
    ),
    pendingApproval: approvalRows.find((a) => a.caseId === r.case.id) ?? null,
  }));
}

export type DocumentMeta = Omit<typeof documents.$inferSelect, "data">;

export interface CaseDetail {
  case: CaseRow;
  property: PropertyRow;
  landlord: LandlordRow | null;
  delays: DelayRow[];
  events: EventRow[];
  documents: DocumentMeta[];
  approvals: ApprovalRow[];
  evaluation: CaseEvaluation;
}

export async function getCaseDetail(orgId: string, caseId: string, now = new Date()): Promise<CaseDetail | null> {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) return null;
  const db = await getDb();
  const [row] = await db
    .select({ case: cases, property: properties, landlord: landlords })
    .from(cases)
    .innerJoin(properties, eq(properties.id, cases.propertyId))
    .leftJoin(landlords, eq(landlords.id, properties.landlordId))
    .where(and(eq(cases.orgId, orgId), eq(cases.id, caseId)))
    .limit(1);
  if (!row) return null;
  const [delays, events, docs, approvals] = await Promise.all([
    db.select().from(caseDelays).where(and(eq(caseDelays.orgId, orgId), eq(caseDelays.caseId, caseId))).orderBy(asc(caseDelays.noticeIssuedAt)),
    db.select().from(caseEvents).where(and(eq(caseEvents.orgId, orgId), eq(caseEvents.caseId, caseId))).orderBy(asc(caseEvents.occurredAt), asc(caseEvents.recordedAt)),
    db
      .select({
        id: documents.id,
        orgId: documents.orgId,
        caseId: documents.caseId,
        kind: documents.kind,
        filename: documents.filename,
        mime: documents.mime,
        size: documents.size,
        sha256: documents.sha256,
        uploadedBy: documents.uploadedBy,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(and(eq(documents.orgId, orgId), eq(documents.caseId, caseId)))
      .orderBy(asc(documents.createdAt)),
    db.select().from(approvalRequests).where(and(eq(approvalRequests.orgId, orgId), eq(approvalRequests.caseId, caseId))).orderBy(desc(approvalRequests.createdAt)),
  ]);
  return {
    ...row,
    delays,
    events,
    documents: docs,
    approvals,
    evaluation: evaluateCase(toFacts(row.case, row.property, delays), now),
  };
}

export async function addEvent(
  db: DB,
  input: {
    orgId: string;
    caseId: string;
    type: string;
    summary: string;
    occurredAt?: Date;
    actorType?: "user" | "landlord" | "system";
    actorId?: string | null;
    actorLabel?: string | null;
    data?: Record<string, unknown>;
  },
) {
  await db.insert(caseEvents).values({
    orgId: input.orgId,
    caseId: input.caseId,
    type: input.type,
    summary: input.summary.slice(0, 2000),
    occurredAt: input.occurredAt ?? new Date(),
    actorType: input.actorType ?? "user",
    actorId: input.actorId ?? null,
    actorLabel: input.actorLabel ?? null,
    data: input.data ?? {},
  });
}

export function propertyAddress(p: Pick<PropertyRow, "addressLine1" | "addressLine2" | "city" | "postcode">): string {
  return [p.addressLine1, p.addressLine2, p.city, p.postcode].filter(Boolean).join(", ");
}
