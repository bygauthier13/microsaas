import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invitations, memberships, organizations, properties, type OrgKind, type OrgSettings } from "@/lib/db/schema";
import { orgAccess, TRIAL_DAYS } from "@/lib/billing/plans";

export async function createOrganization(input: {
  userId: string;
  name: string;
  kind: OrgKind;
  jurisdiction: "scotland" | "england";
  settings?: OrgSettings;
  isDemo?: boolean;
}) {
  const db = await getDb();
  const now = Date.now();
  const [org] = await db
    .insert(organizations)
    .values({
      name: input.name,
      kind: input.kind,
      jurisdiction: input.jurisdiction,
      isDemo: Boolean(input.isDemo),
      demoExpiresAt: input.isDemo ? new Date(now + 24 * 3600_000) : null,
      plan: "trial",
      subscriptionStatus: "trialing",
      trialEndsAt: new Date(now + TRIAL_DAYS * 86_400_000),
      settings: input.settings ?? {},
      onboardingCompletedAt: new Date(),
    })
    .returning();
  await db.insert(memberships).values({ userId: input.userId, orgId: org.id, role: "owner" });
  return org;
}

export async function activeHomes(orgId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(properties)
    .where(and(eq(properties.orgId, orgId), isNull(properties.archivedAt)));
  return Number(row?.n ?? 0);
}

/** Can this organisation add `extra` more homes under its plan? */
export async function homesHeadroom(org: typeof organizations.$inferSelect, extra = 1) {
  const access = orgAccess(org);
  const current = await activeHomes(org.id);
  return { ok: access.canCreate && current + extra <= access.homesLimit, current, limit: access.homesLimit, access };
}

/** Next human-friendly case reference, e.g. "LL-0007". Atomic per organisation. */
export async function nextCaseReference(orgId: string, prefix: string): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .update(organizations)
    .set({ caseCounter: sql`${organizations.caseCounter} + 1` })
    .where(eq(organizations.id, orgId))
    .returning({ n: organizations.caseCounter });
  return `${prefix}-${String(row.n).padStart(4, "0")}`;
}

/** Members plus live (unaccepted, unrevoked, unexpired) invitations. */
export async function seatsInUse(orgId: string): Promise<number> {
  const db = await getDb();
  const [[m], [i]] = await Promise.all([
    db.select({ n: count() }).from(memberships).where(eq(memberships.orgId, orgId)),
    db
      .select({ n: count() })
      .from(invitations)
      .where(and(eq(invitations.orgId, orgId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, new Date()))),
  ]);
  return Number(m?.n ?? 0) + Number(i?.n ?? 0);
}
