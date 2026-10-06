/**
 * Stripe billing: Checkout for new subscriptions, the Customer Portal for card changes,
 * invoices and cancellation, and webhooks as the source of truth for subscription state.
 *
 * Without STRIPE_SECRET_KEY the app runs in "simulated" billing mode (see actions/billing.ts) so
 * the full upgrade → cancel journey can be exercised locally. Simulated mode is refused in
 * production unless ALLOW_SIMULATED_BILLING=true.
 */
import "server-only";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { track } from "@/lib/analytics";
import { getDb } from "@/lib/db";
import { organizations, type PlanId, type SubscriptionStatus } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { PLANS, isPaidPlan, type PaidPlanId } from "./plans";

type Org = typeof organizations.$inferSelect;

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!env.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
  client ??= new Stripe(env.stripeSecretKey, { maxNetworkRetries: 2, timeout: 20_000, appInfo: { name: "RepairClock" } });
  return client;
}

export function priceIdFor(plan: PaidPlanId, interval: "month" | "year"): string | undefined {
  return env.stripePrice(plan, interval);
}

async function ensureCustomer(org: Org, email: string): Promise<string> {
  if (org.stripeCustomerId) {
    // A customer made with test keys doesn't exist once live keys are in place (or it was
    // deleted in the dashboard): create a fresh one instead of failing checkout.
    const existing = await stripe()
      .customers.retrieve(org.stripeCustomerId)
      .catch((err: unknown) => {
        if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing") return null;
        throw err;
      });
    if (existing && !existing.deleted) return existing.id;
  }
  const customer = await stripe().customers.create({
    email,
    name: org.name,
    metadata: { orgId: org.id },
  });
  const db = await getDb();
  await db.update(organizations).set({ stripeCustomerId: customer.id }).where(eq(organizations.id, org.id));
  return customer.id;
}

export async function createCheckoutUrl(org: Org, email: string, plan: PaidPlanId, interval: "month" | "year"): Promise<string> {
  const price = priceIdFor(plan, interval);
  const p = PLANS[plan];
  // Pre-created prices (npm run stripe:setup) are used when configured; otherwise the price is
  // defined inline from the plan table, so a fresh Stripe account works with just a secret key.
  const lineItem = price
    ? { price, quantity: 1 }
    : {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: Math.round((interval === "year" ? p.annual : p.monthly) * 100),
          recurring: { interval },
          tax_behavior: "exclusive" as const,
          product_data: { name: `RepairClock ${p.name}`, description: p.audience, metadata: { plan } },
        },
      };
  const customer = await ensureCustomer(org, email);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: org.id,
    line_items: [lineItem],
    allow_promotion_codes: true,
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    metadata: { orgId: org.id, plan, interval },
    subscription_data: { metadata: { orgId: org.id, plan, interval } },
    success_url: `${env.appUrl}/app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.appUrl}/app/billing?checkout=cancelled`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPortalUrl(org: Org): Promise<string> {
  if (!org.stripeCustomerId) throw new Error("This workspace has no Stripe customer yet");
  const session = await stripe().billingPortal.sessions.create({
    customer: org.stripeCustomerId,
    return_url: `${env.appUrl}/app/billing`,
    ...(env.stripePortalConfiguration ? { configuration: env.stripePortalConfiguration } : {}),
  });
  return session.url;
}

type Sub = Stripe.Subscription;

function mapStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "incomplete":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    default:
      return "past_due";
  }
}

function planFromSubscription(sub: Sub): { plan: PlanId | null; interval: "month" | "year" | null } {
  const metaPlan = sub.metadata?.plan;
  const item = sub.items.data[0];
  const interval = (item?.price?.recurring?.interval as "month" | "year" | undefined) ?? (sub.metadata?.interval as "month" | "year" | undefined) ?? null;
  if (metaPlan && isPaidPlan(metaPlan)) return { plan: metaPlan, interval };
  // Fall back to matching the configured price ids.
  const priceId = item?.price?.id;
  for (const p of ["landlord", "agent", "agency", "housing"] as const) {
    if (priceId && (priceId === priceIdFor(p, "month") || priceId === priceIdFor(p, "year"))) return { plan: p, interval };
  }
  return { plan: null, interval };
}

/** Write a Stripe subscription's state onto the organisation it belongs to. */
export async function syncSubscription(sub: Sub, opts: { orgIdHint?: string | null } = {}) {
  const db = await getDb();
  const orgId = sub.metadata?.orgId ?? opts.orgIdHint ?? null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const [org] = orgId
    ? await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1)
    : await db.select().from(organizations).where(eq(organizations.stripeCustomerId, customerId)).limit(1);
  if (!org) {
    console.warn(`[stripe] no organisation for subscription ${sub.id}`);
    return null;
  }
  const { plan, interval } = planFromSubscription(sub);
  // In recent API versions the billing period lives on the subscription item.
  const periodEnd = sub.items.data[0]?.current_period_end ?? null;
  const status = mapStatus(sub.status);
  const wasActive = org.subscriptionStatus === "active" && isPaidPlan(org.plan);
  await db
    .update(organizations)
    .set({
      plan: plan ?? org.plan,
      billingInterval: interval ?? org.billingInterval,
      subscriptionStatus: status,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : org.currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end || sub.cancel_at),
    })
    .where(eq(organizations.id, org.id));
  if (status === "active" && !wasActive) {
    await track("subscription_activated", { orgId: org.id, props: { plan, interval, provider: "stripe" } });
  }
  if (status === "canceled" && org.subscriptionStatus !== "canceled") {
    await track("subscription_canceled", { orgId: org.id, props: { plan, provider: "stripe" } });
  }
  return org.id;
}

/** Used on the success redirect so the plan shows as active even before the webhook lands. */
export async function syncFromCheckoutSession(sessionId: string, orgId: string): Promise<boolean> {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return false;
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.client_reference_id !== orgId || !session.subscription) return false;
  const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const sub = await stripe().subscriptions.retrieve(subId);
  await syncSubscription(sub, { orgIdHint: orgId });
  return true;
}
