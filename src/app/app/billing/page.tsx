import Link from "next/link";
import clsx from "clsx";
import { eq } from "drizzle-orm";
import { Check, CreditCard } from "lucide-react";
import { Alert, Badge, Card, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { openPortalAction, simulatedCancelAction, simulatedResumeAction, startCheckoutAction } from "@/lib/actions/billing";
import { requireOrg } from "@/lib/auth/session";
import { PLANS, PLAN_ORDER, formatGbp, isPaidPlan, orgAccess, recommendedPlan } from "@/lib/billing/plans";
import { syncFromCheckoutSession } from "@/lib/billing/stripe";
import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { activeHomes } from "@/lib/org";
import { formatInstant } from "@/lib/rules/calendar";

export const metadata = { title: "Plan & billing" };

const ERRORS: Record<string, string> = {
  owner: "Only the workspace owner can change the plan.",
  demo: "Billing is disabled in the demo workspace — create your own workspace to choose a plan.",
  plan: "Choose a valid plan.",
  checkout: "We couldn't start checkout. Please try again, or contact support.",
  portal: "We couldn't open the billing portal. Please try again.",
  portal_simulated: "The billing portal needs Stripe. In simulated mode, use the cancel button below.",
  not_configured: "Card payments aren't switched on yet, so nothing was charged and your plan hasn't changed.",
};

export default async function BillingPage({ searchParams }: PageProps<"/app/billing">) {
  const auth = await requireOrg();
  const sp = await searchParams;
  let org = auth.org;
  let synced = false;
  if (sp.checkout === "success" && typeof sp.session_id === "string" && env.billingMode === "stripe") {
    try {
      synced = await syncFromCheckoutSession(sp.session_id, org.id);
      if (synced) org = (await reloadOrg(org.id)) ?? org;
    } catch (err) {
      console.error("[billing] could not sync checkout session", err);
    }
  }
  const access = orgAccess(org);
  const homes = await activeHomes(org.id);
  const interval = sp.interval === "year" ? "year" : "month";
  const recommended = recommendedPlan(homes, org.kind);
  const current = isPaidPlan(org.plan) && access.state !== "canceled" ? org.plan : null;
  const simulated = env.billingMode === "simulated";
  const owner = auth.role === "owner" && !org.isDemo;
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Plan & billing" description="Simple per-workspace pricing. Prices exclude VAT. Cancel any time — your records stay exportable." />

      {error ? <Alert tone="bad">{error}</Alert> : null}
      {sp.checkout === "success" ? (
        <Alert tone="ok" title="You're subscribed — thank you!">
          {simulated
            ? "Simulated billing: your plan is active (no card was charged because Stripe isn't configured)."
            : synced
              ? "Your plan is active. A receipt is on its way from Stripe."
              : "Payment received. Your plan will show as active within a few seconds — refresh if not."}
        </Alert>
      ) : null}
      {sp.checkout === "cancelled" ? <Alert tone="neutral">Checkout cancelled — nothing was charged.</Alert> : null}
      {sp.canceled === "1" ? <Alert tone="neutral">Your plan will end at the end of the current billing period. You can resume any time before then.</Alert> : null}
      {sp.resumed === "1" ? <Alert tone="ok">Your plan will continue to renew.</Alert> : null}
      {simulated && env.allowSimulatedBilling ? (
        <Alert tone="info" title="Simulated billing mode">
          Stripe isn&apos;t configured on this server (no STRIPE_SECRET_KEY), so choosing a plan activates it instantly without payment. Set the Stripe keys to take real
          (test-mode) payments.
        </Alert>
      ) : null}
      {simulated && !env.allowSimulatedBilling ? (
        <Alert tone="neutral" title="Card payments open soon">
          Plans can&apos;t be bought here just yet. Your free trial carries on as normal in the meantime.
        </Alert>
      ) : null}

      <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="eyebrow">Current plan</p>
          <p className="mt-1 text-xl font-semibold">
            {access.planName}
            {org.billingInterval && current ? <span className="text-base font-normal text-muted"> · billed {org.billingInterval === "year" ? "annually" : "monthly"}</span> : null}
          </p>
          <p className="mt-1 text-sm text-muted">
            {access.state === "trial"
              ? `${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? "" : "s"} left in your free trial · ${homes} of ${access.homesLimit} homes used`
              : access.state === "trial_expired"
                ? "Your trial has ended. Existing cases stay usable; choose a plan to log new reports."
                : access.state === "past_due"
                  ? "Your last payment failed — update your card to avoid interruption."
                  : access.state === "canceled"
                    ? "Your subscription has ended."
                    : `${homes} of ${access.homesLimit.toLocaleString("en-GB")} homes used${
                        org.currentPeriodEnd ? ` · ${org.cancelAtPeriodEnd ? "ends" : "renews"} ${formatInstant(org.currentPeriodEnd).split(",")[0]}` : ""
                      }`}
          </p>
          {org.cancelAtPeriodEnd && current ? <Badge tone="warn" className="mt-2">Cancels at period end</Badge> : null}
        </div>
        {owner && current ? (
          <div className="flex flex-wrap gap-2">
            {simulated ? (
              org.cancelAtPeriodEnd ? (
                <form action={simulatedResumeAction}>
                  <SubmitButton variant="secondary">Resume plan</SubmitButton>
                </form>
              ) : (
                <form action={simulatedCancelAction}>
                  <SubmitButton variant="danger" pendingLabel="Cancelling…">
                    Cancel plan
                  </SubmitButton>
                </form>
              )
            ) : (
              <form action={openPortalAction}>
                <SubmitButton variant="secondary" pendingLabel="Opening…">
                  <CreditCard className="h-4 w-4" aria-hidden /> Manage billing, invoices &amp; cancellation
                </SubmitButton>
              </form>
            )}
          </div>
        ) : null}
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{current ? "Change plan" : "Choose a plan"}</h2>
        <div className="inline-flex rounded-lg border border-line bg-surface p-0.5 text-sm" role="tablist" aria-label="Billing period">
          <Link
            href="/app/billing?interval=month"
            role="tab"
            aria-selected={interval === "month"}
            className={clsx("rounded-md px-3 py-1.5", interval === "month" ? "bg-ink text-white" : "text-ink-2")}
          >
            Monthly
          </Link>
          <Link
            href="/app/billing?interval=year"
            role="tab"
            aria-selected={interval === "year"}
            className={clsx("rounded-md px-3 py-1.5", interval === "year" ? "bg-ink text-white" : "text-ink-2")}
          >
            Annual <span className={interval === "year" ? "text-white/70" : "text-ok"}>· 2 months free</span>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = current === id && org.billingInterval === interval;
          const isRecommended = id === recommended;
          const price = interval === "year" ? plan.annual : plan.monthly;
          const tooSmall = homes > plan.homes;
          return (
            <Card key={id} className={clsx("flex flex-col p-5", isRecommended && "ring-2 ring-signal/40 border-signal/40")}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {isCurrent ? <Badge tone="ok">Current</Badge> : isRecommended ? <Badge tone="signal">Recommended</Badge> : null}
              </div>
              <p className="mt-0.5 text-xs text-muted">{plan.audience}</p>
              <p className="mt-4">
                <span className="text-3xl font-semibold tabular">{formatGbp(price)}</span>
                <span className="text-sm text-muted"> / {interval === "year" ? "year" : "month"} + VAT</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {owner ? (
                <form action={startCheckoutAction} className="mt-5">
                  <input type="hidden" name="plan" value={id} />
                  <input type="hidden" name="interval" value={interval} />
                  <SubmitButton
                    className="w-full"
                    variant={isRecommended ? "signal" : "secondary"}
                    disabled={isCurrent || tooSmall}
                    pendingLabel="Starting checkout…"
                  >
                    {isCurrent ? "Your plan" : tooSmall ? `Over ${plan.homes} homes` : current ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                  </SubmitButton>
                </form>
              ) : null}
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted leading-relaxed">
        Payments are handled by Stripe; we never see your card details. Switching plans mid-period is prorated by Stripe. Need more than 5,000 homes, invoicing or a
        DPA? <a href={`mailto:${env.company.email}`} className="underline">Talk to us</a>.
      </p>
    </div>
  );
}

async function reloadOrg(orgId: string) {
  const db = await getDb();
  const [row] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  return row;
}
