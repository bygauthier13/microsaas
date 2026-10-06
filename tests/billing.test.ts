/**
 * Billing integration tests against a throwaway embedded database. No network: webhook
 * signatures are generated locally and subscriptions are passed in as Stripe would send them.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { afterAll, describe, expect, it } from "vitest";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "repairclock-billing-"));
process.env.PGLITE_DIR = path.join(dir, "db");
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
process.env.STRIPE_PRICE_AGENT_MONTHLY = "price_agent_monthly_test";

const SECRET = "whsec_test_secret";
const stripe = new Stripe("sk_test_dummy_for_tests");

function signed(payload: string) {
  return stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET });
}

function eventJson(id: string, type: string, object: Record<string, unknown>) {
  return JSON.stringify({
    id,
    object: "event",
    type,
    api_version: "2026-09-30.endive",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: { object },
  });
}

async function makeOrg() {
  const { getDb } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");
  const { createOrganization } = await import("@/lib/org");
  const db = await getDb();
  const [u] = await db.insert(users).values({ email: `billing-${Date.now()}@example.com`, name: "Billing Test" }).returning();
  return createOrganization({ userId: u.id, name: "Billing Test Lettings", kind: "letting_agent", jurisdiction: "scotland" });
}

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("Stripe webhook endpoint", () => {
  it("rejects requests without a valid signature", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const noSig = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));
    expect(noSig.status).toBe(400);
    const badSig = await POST(
      new Request("http://localhost/api/stripe/webhook", { method: "POST", body: eventJson("evt_bad", "customer.created", {}), headers: { "stripe-signature": "t=1,v1=deadbeef" } }),
    );
    expect(badSig.status).toBe(400);
  });

  it("accepts a signed event and ignores replays", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const payload = eventJson("evt_test_once", "customer.created", { id: "cus_test", object: "customer" });
    const first = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signed(payload) } }));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ received: true });
    const replay = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signed(payload) } }));
    expect(await replay.json()).toEqual({ received: true, duplicate: true });
  });

  it("applies subscription updates to the organisation", async () => {
    const org = await makeOrg();
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const periodEnd = Math.floor(Date.now() / 1000) + 30 * 86400;
    const subscription = {
      id: "sub_test_1",
      object: "subscription",
      customer: "cus_test_1",
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      metadata: { orgId: org.id, plan: "agent", interval: "month" },
      items: { object: "list", data: [{ id: "si_1", object: "subscription_item", current_period_end: periodEnd, price: { id: "price_agent_monthly_test", recurring: { interval: "month" } } }] },
    };
    const payload = eventJson("evt_sub_updated", "customer.subscription.updated", subscription);
    const res = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: payload, headers: { "stripe-signature": signed(payload) } }));
    expect(res.status).toBe(200);

    const { getDb } = await import("@/lib/db");
    const { organizations } = await import("@/lib/db/schema");
    const { orgAccess } = await import("@/lib/billing/plans");
    const db = await getDb();
    let [row] = await db.select().from(organizations).where(eq(organizations.id, org.id));
    expect(row.plan).toBe("agent");
    expect(row.subscriptionStatus).toBe("active");
    expect(row.stripeCustomerId).toBe("cus_test_1");
    expect(row.currentPeriodEnd?.getTime()).toBe(periodEnd * 1000);
    expect(orgAccess(row).homesLimit).toBe(300);

    // Cancellation at period end keeps access until the period ends…
    const cancelling = { ...subscription, cancel_at_period_end: true };
    const p2 = eventJson("evt_sub_cancelling", "customer.subscription.updated", cancelling);
    await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: p2, headers: { "stripe-signature": signed(p2) } }));
    [row] = await db.select().from(organizations).where(eq(organizations.id, org.id));
    expect(row.cancelAtPeriodEnd).toBe(true);
    expect(orgAccess(row).canCreate).toBe(true);

    // …and deletion ends it once the period is over.
    const ended = { ...subscription, status: "canceled", items: { ...subscription.items, data: [{ ...subscription.items.data[0], current_period_end: Math.floor(Date.now() / 1000) - 60 }] } };
    const p3 = eventJson("evt_sub_deleted", "customer.subscription.deleted", ended);
    await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: p3, headers: { "stripe-signature": signed(p3) } }));
    [row] = await db.select().from(organizations).where(eq(organizations.id, org.id));
    expect(row.subscriptionStatus).toBe("canceled");
    expect(orgAccess(row).canCreate).toBe(false);
  });
});

describe("planMisfit", () => {
  it("refuses a plan smaller than the workspace's homes or team", async () => {
    const { planMisfit } = await import("@/lib/billing/plans");
    expect(planMisfit("landlord", { homes: 300, seats: 1 })).toMatch(/300 active homes/);
    expect(planMisfit("landlord", { homes: 8, seats: 3 })).toMatch(/3 team members/);
    expect(planMisfit("agent", { homes: 300, seats: 5 })).toBeNull();
    expect(planMisfit("agent", { homes: 301, seats: 2 })).toMatch(/Agent plan covers 300/);
  });
});
