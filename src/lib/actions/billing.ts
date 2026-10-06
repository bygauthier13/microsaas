"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { track } from "@/lib/analytics";
import { requireOrg } from "@/lib/auth/session";
import { isPaidPlan, planMisfit } from "@/lib/billing/plans";
import { createCheckoutUrl, createPortalUrl } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { activeHomes, seatsInUse } from "@/lib/org";
import { str } from "./helpers";

async function ownerOrg() {
  const auth = await requireOrg();
  if (auth.role !== "owner") redirect("/app/billing?error=owner");
  if (auth.org.isDemo) redirect("/app/billing?error=demo");
  return auth;
}

export async function startCheckoutAction(fd: FormData): Promise<void> {
  const { org, user } = await ownerOrg();
  const plan = str(fd, "plan", 20);
  const interval = str(fd, "interval", 10) === "year" ? "year" : "month";
  if (!isPaidPlan(plan)) redirect("/app/billing?error=plan");
  // A plan smaller than the workspace (e.g. 300 homes imported during the trial, then the
  // 10-home plan) would leave everything usable for the lowest price.
  const [homes, seats] = await Promise.all([activeHomes(org.id), seatsInUse(org.id)]);
  if (planMisfit(plan, { homes, seats })) redirect("/app/billing?error=too_small");
  await track("checkout_started", { orgId: org.id, userId: user.id, props: { plan, interval, mode: env.billingMode } });

  if (env.billingMode === "stripe") {
    let url: string;
    try {
      url = await createCheckoutUrl(org, user.email, plan, interval);
    } catch (err) {
      console.error("[billing] checkout failed", err);
      redirect("/app/billing?error=checkout");
    }
    redirect(url);
  }

  if (!env.allowSimulatedBilling) redirect("/app/billing?error=not_configured");
  // Simulated billing: activate immediately so the full journey can be tested without Stripe.
  const db = await getDb();
  const periodEnd = new Date();
  if (interval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);
  await db
    .update(organizations)
    .set({
      plan,
      billingInterval: interval,
      subscriptionStatus: "active",
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: `sim_${org.id.slice(0, 8)}`,
    })
    .where(eq(organizations.id, org.id));
  await track("subscription_activated", { orgId: org.id, userId: user.id, props: { plan, interval, provider: "simulated" } });
  redirect("/app/billing?checkout=success");
}

export async function openPortalAction(): Promise<void> {
  const { org } = await ownerOrg();
  if (env.billingMode !== "stripe") redirect("/app/billing?error=portal_simulated");
  let url: string;
  try {
    url = await createPortalUrl(org);
  } catch (err) {
    console.error("[billing] portal failed", err);
    redirect("/app/billing?error=portal");
  }
  redirect(url);
}

/** Simulated mode only — in Stripe mode cancellation happens in the Customer Portal. */
export async function simulatedCancelAction(): Promise<void> {
  const { org, user } = await ownerOrg();
  if (env.billingMode === "stripe") redirect("/app/billing");
  const db = await getDb();
  await db.update(organizations).set({ cancelAtPeriodEnd: true }).where(eq(organizations.id, org.id));
  await track("subscription_canceled", { orgId: org.id, userId: user.id, props: { plan: org.plan, provider: "simulated", atPeriodEnd: true } });
  redirect("/app/billing?canceled=1");
}

export async function simulatedResumeAction(): Promise<void> {
  const { org } = await ownerOrg();
  if (env.billingMode === "stripe") redirect("/app/billing");
  const db = await getDb();
  await db.update(organizations).set({ cancelAtPeriodEnd: false }).where(eq(organizations.id, org.id));
  redirect("/app/billing?resumed=1");
}
