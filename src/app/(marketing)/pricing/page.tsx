import Link from "next/link";
import { Check } from "lucide-react";
import { Beacon } from "@/components/marketing/beacon";
import { buttonClass } from "@/components/ui";
import { PLANS, PLAN_ORDER, TRIAL_DAYS, formatGbp } from "@/lib/billing/plans";
import { env } from "@/lib/env";

export const metadata = {
  title: "Pricing — from £12/month",
  description:
    "Simple per-workspace pricing for landlords (£12/month), letting agents (£99/month up to 300 homes), multi-branch agencies and housing providers. 14-day free trial, no card needed.",
  alternates: { canonical: "/pricing" },
};

const FAQ = [
  ["What counts as a home?", "Each active property in your workspace, plus any archived property that had a report in the last 12 months. Archived homes keep their full case history."],
  ["Do I need a card for the trial?", `No. You get ${TRIAL_DAYS} days with up to 300 homes. When it ends, your cases stay readable and exportable; choose a plan to keep logging new reports.`],
  ["Do prices include VAT?", "Prices exclude VAT, which is added at checkout where applicable. You can add your VAT number in checkout."],
  ["Can I change plan or cancel?", "Yes — upgrade, downgrade or cancel from the billing page at any time. Changes are prorated; cancellation takes effect at the end of the period you've paid for."],
  ["Is there a discount for annual billing?", "Annual plans cost 10× the monthly price — two months free."],
  ["We manage more than 5,000 homes, or need invoicing.", `Email ${env.company.email} and we'll set you up with invoicing, a DPA and onboarding.`],
];

export default function PricingPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Beacon event="pricing_viewed" />
      <div className="max-w-2xl">
        <p className="eyebrow">Pricing</p>
        <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">One missed deadline costs more than a year of RepairClock.</h1>
        <p className="mt-4 text-lg text-ink-2">Per workspace, not per user. Every plan includes the statutory clocks, letters and evidence packs.</p>
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          return (
            <div key={id} className={`flex flex-col rounded-2xl border p-6 ${p.highlight ? "border-signal/50 bg-surface shadow-[var(--shadow-lift)] ring-2 ring-signal/20" : "border-line bg-surface"}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                {p.highlight ? <span className="rounded-full bg-signal-soft px-2 py-0.5 text-xs font-medium text-signal-strong">Most agents</span> : null}
              </div>
              <p className="mt-0.5 text-sm text-muted">{p.audience}</p>
              <p className="mt-5">
                <span className="text-4xl font-semibold tabular">{formatGbp(p.monthly)}</span>
                <span className="text-sm text-muted"> /month + VAT</span>
              </p>
              <p className="mt-1 text-xs text-muted">or {formatGbp(p.annual)}/year (2 months free)</p>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={`/signup?plan=${id}`} className={buttonClass(p.highlight ? "signal" : "secondary", "md", "mt-6 w-full")}>
                Start free trial
              </Link>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted">All plans: {TRIAL_DAYS}-day free trial, no card · cancel any time · your data exportable as CSV and PDF.</p>

      <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)]">
        <h2 className="display text-3xl leading-tight">Pricing questions</h2>
        <dl className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <div key={q} className="px-5 py-4">
              <dt className="font-medium">{q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-ink-2">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
