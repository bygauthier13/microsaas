/**
 * Home limits: archiving a home after its report doesn't free a plan slot for 12 months.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repairclock-limits-"));
process.env.PGLITE_DIR = path.join(dir, "db");

afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("homesInUse", () => {
  it("counts active homes and archived homes with a report in the last 12 months", async () => {
    const { getDb } = await import("@/lib/db");
    const schema = await import("@/lib/db/schema");
    const { createOrganization, homesInUse } = await import("@/lib/org");
    const db = await getDb();

    const [user] = await db.insert(schema.users).values({ email: "limits@example.com", name: "Limits" }).returning();
    const org = await createOrganization({ userId: user.id, name: "Cycle Lettings", kind: "letting_agent", jurisdiction: "scotland" });
    const now = new Date("2026-10-06T12:00:00Z");
    const archived = new Date("2026-10-01T12:00:00Z");
    const home = (addressLine1: string, archivedAt: Date | null) =>
      db.insert(schema.properties).values({ orgId: org.id, addressLine1, jurisdiction: "scotland", sector: "private", archivedAt }).returning();

    await home("1 Active Street", null);
    await home("2 Archived Quiet Street", archived);
    const [recent] = await home("3 Archived Recent Report", archived);
    const [old] = await home("4 Archived Old Report", archived);
    await db.insert(schema.cases).values([
      { orgId: org.id, propertyId: recent.id, reference: "CL-0001", awareAt: new Date("2026-09-01T09:00:00Z"), createdAt: new Date("2026-09-01T09:00:00Z"), status: "closed" },
      { orgId: org.id, propertyId: old.id, reference: "CL-0002", awareAt: new Date("2025-08-01T09:00:00Z"), createdAt: new Date("2025-08-01T09:00:00Z"), status: "closed" },
    ]);

    // Active home + the archived one whose report is under 12 months old.
    expect(await homesInUse(org.id, now)).toBe(2);
    // A year on, the September report no longer holds a slot.
    expect(await homesInUse(org.id, new Date("2027-09-02T12:00:00Z"))).toBe(1);
  });
});
