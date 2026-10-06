/**
 * Daily job integration test against a throwaway embedded database (no network: email falls
 * back to the outbox because RESEND_API_KEY is unset).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repairclock-jobs-"));
process.env.PGLITE_DIR = path.join(dir, "db");
delete process.env.RESEND_API_KEY;

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("daily job", () => {
  it("sends digests, reminds landlords with a fresh link, and deletes expired demos", async () => {
    const { getDb } = await import("@/lib/db");
    const schema = await import("@/lib/db/schema");
    const { createOrganization } = await import("@/lib/org");
    const { createDemoWorkspace } = await import("@/lib/demo/seed");
    const { runDailyJobs } = await import("@/lib/jobs/daily");
    const { fromLondonLocal } = await import("@/lib/rules/calendar");
    const db = await getDb();

    const [user] = await db.insert(schema.users).values({ email: "agent@example.com", name: "Agent" }).returning();
    const org = await createOrganization({ userId: user.id, name: "Job Test Lettings", kind: "letting_agent", jurisdiction: "scotland" });
    const [landlord] = await db.insert(schema.landlords).values({ orgId: org.id, name: "Morag", email: "morag@example.com" }).returning();
    const [home] = await db
      .insert(schema.properties)
      .values({ orgId: org.id, landlordId: landlord.id, addressLine1: "1 Test Street", jurisdiction: "scotland", sector: "private" })
      .returning();
    // Aware Mon 12 Oct 2026 → investigation due Mon 26 Oct; on Wed 28 Oct it is overdue.
    const [c] = await db
      .insert(schema.cases)
      .values({ orgId: org.id, propertyId: home.id, reference: "JT-0001", awareAt: fromLondonLocal("2026-10-12", "09:00"), description: "Mould in bedroom" })
      .returning();
    const [req] = await db
      .insert(schema.approvalRequests)
      .values({
        orgId: org.id,
        caseId: c.id,
        landlordId: landlord.id,
        tokenHash: "original-hash",
        description: "Damp survey",
        expiresAt: fromLondonLocal("2026-11-20", "00:00"),
        createdAt: fromLondonLocal("2026-10-23", "10:00"),
      })
      .returning();

    const demo = await createDemoWorkspace(db, fromLondonLocal("2026-10-20", "09:00"));
    await db.update(schema.organizations).set({ demoExpiresAt: fromLondonLocal("2026-10-21", "09:00") }).where(eq(schema.organizations.id, demo.org.id));

    const now = fromLondonLocal("2026-10-28", "07:00"); // a Wednesday
    const report = await runDailyJobs(now);

    expect(report.demoWorkspacesDeleted).toBe(1);
    expect(report.digestsSent).toBe(1);
    expect(report.approvalRemindersSent).toBe(1);

    const digests = await db.select().from(schema.outboxEmails).where(and(eq(schema.outboxEmails.orgId, org.id), eq(schema.outboxEmails.category, "digest")));
    expect(digests).toHaveLength(1);
    expect(digests[0].to).toBe("agent@example.com");
    expect(digests[0].subject).toMatch(/overdue/);
    expect(digests[0].text).toContain("JT-0001");

    const [after] = await db.select().from(schema.approvalRequests).where(eq(schema.approvalRequests.id, req.id));
    expect(after.tokenHash).not.toBe("original-hash");
    expect(after.lastReminderAt?.getTime()).toBe(now.getTime());
    const reminder = await db.select().from(schema.outboxEmails).where(eq(schema.outboxEmails.category, "approval_reminder"));
    expect(reminder[0].to).toBe("morag@example.com");
    expect(reminder[0].text).toContain("/approve/");

    const demoOrgs = await db.select().from(schema.organizations).where(eq(schema.organizations.id, demo.org.id));
    expect(demoOrgs).toHaveLength(0);
    const demoUsers = await db.select().from(schema.users).where(eq(schema.users.id, demo.user.id));
    expect(demoUsers).toHaveLength(0);

    // Running again the same day doesn't re-send the landlord reminder.
    const again = await runDailyJobs(now);
    expect(again.approvalRemindersSent).toBe(0);

    // Weekends: no digests.
    const saturday = await runDailyJobs(fromLondonLocal("2026-10-31", "07:00"));
    expect(saturday.digestsSent).toBe(0);
  });

  it("nudges a new trial workspace that hasn't logged a report, once", async () => {
    const { getDb } = await import("@/lib/db");
    const schema = await import("@/lib/db/schema");
    const { createOrganization } = await import("@/lib/org");
    const { runDailyJobs } = await import("@/lib/jobs/daily");
    const db = await getDb();
    const [user] = await db.insert(schema.users).values({ email: "quiet@example.com", name: "Quinn Quiet" }).returning();
    const org = await createOrganization({ userId: user.id, name: "Quiet Lettings", kind: "letting_agent", jurisdiction: "scotland" });
    const later = new Date(Date.now() + 36 * 3600_000);
    const first = await runDailyJobs(later);
    expect(first.nudgesSent).toBeGreaterThanOrEqual(1);
    const nudges = await db.select().from(schema.outboxEmails).where(and(eq(schema.outboxEmails.orgId, org.id), eq(schema.outboxEmails.category, "nudge_first_report")));
    expect(nudges).toHaveLength(1);
    expect(nudges[0].to).toBe("quiet@example.com");
    expect(nudges[0].text).toContain("must be investigated by");
    await runDailyJobs(later);
    const again = await db.select().from(schema.outboxEmails).where(and(eq(schema.outboxEmails.orgId, org.id), eq(schema.outboxEmails.category, "nudge_first_report")));
    expect(again).toHaveLength(1);
  });
});
