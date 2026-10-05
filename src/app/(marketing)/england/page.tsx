import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { formatIsoDateLong, londonDateOf } from "@/lib/rules/calendar";
import { previewEnglandTimeline } from "@/lib/rules/engine";

export const revalidate = 3600;

export const metadata = {
  title: "Awaab’s Law timescales explained: 24 hours, 10, 3 and 5 working days",
  description:
    "Awaab’s Law for social landlords in England: emergency hazards within 24 hours; significant hazards investigated in 10 working days, summary in 3, safety work in 5, preventative work within 12 weeks. Phases, records and what's next for private landlords.",
  alternates: { canonical: "/england" },
};

const FAQ = [
  {
    q: "Who does Awaab's Law apply to?",
    a: "Social landlords in England (housing associations, councils and other registered providers), from 27 October 2025. The government intends to extend it to the private rented sector through the Renters' Rights Act 2025, on a timetable still to be confirmed.",
  },
  {
    q: "What are the Awaab's Law timescales?",
    a: "Emergency hazards: investigate and make safe within 24 hours. Significant hazards: investigate within 10 working days, give the tenant a written summary within 3 working days of the investigation, complete relevant safety work within 5 working days, and begin (or take steps to begin) supplementary preventative work within 5 working days, physically starting within 12 weeks.",
  },
  {
    q: "Which hazards are covered?",
    a: "Phase 1 (from 27 October 2025): damp and mould, and all emergency hazards. Phase 2 (from 30 November 2026): excess cold and heat, falls, structural collapse, fire and explosions, electrical hazards and domestic hygiene, pests and food safety. Phase 3 (2027): the remaining HHSRS hazards except overcrowding.",
  },
  {
    q: "What if safety work can't be finished in time?",
    a: "The landlord must offer suitable alternative accommodation, at its expense, until the home is safe, unless the tenant declines. Keep a record of the offer and the tenant's decision.",
  },
];

export default function EnglandGuide() {
  const today = londonDateOf(new Date());
  const t = previewEnglandTimeline(today);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="eyebrow">Guide · England</p>
      <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">Awaab’s Law timescales explained</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-2">
        The Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025 — Awaab&apos;s Law — set fixed deadlines for social landlords to investigate hazards and
        make homes safe. Phase 2 extends them to more hazard types from 30 November 2026.
      </p>

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr className="border-b border-line bg-paper">
              <th className="px-5 py-2.5 font-medium">Duty</th>
              <th className="px-5 py-2.5 font-medium">Emergency hazard</th>
              <th className="px-5 py-2.5 font-medium">Significant hazard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="px-5 py-3">Investigate</td>
              <td className="px-5 py-3 font-medium">24 hours</td>
              <td className="px-5 py-3 font-medium">10 working days</td>
            </tr>
            <tr>
              <td className="px-5 py-3">Written summary to tenant</td>
              <td className="px-5 py-3 text-muted">—</td>
              <td className="px-5 py-3 font-medium">3 working days after investigation</td>
            </tr>
            <tr>
              <td className="px-5 py-3">Make safe (relevant safety work)</td>
              <td className="px-5 py-3 font-medium">24 hours</td>
              <td className="px-5 py-3 font-medium">5 working days after investigation</td>
            </tr>
            <tr>
              <td className="px-5 py-3">Preventative (supplementary) work</td>
              <td className="px-5 py-3 text-muted">As for significant</td>
              <td className="px-5 py-3 font-medium">Steps within 5 working days; physically begun within 12 weeks</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-signal/30 bg-signal-soft/60 p-5 text-sm leading-relaxed text-ink-2">
        <p className="font-semibold text-signal-strong">Worked example: a significant hazard reported today</p>
        <p className="mt-1">
          Aware {formatIsoDateLong(today)} → investigate by <strong>{formatIsoDateLong(t.investigateBy)}</strong>; if investigated that day, summary by{" "}
          <strong>{formatIsoDateLong(t.summaryBy)}</strong>, safety work by <strong>{formatIsoDateLong(t.safetyWorkBy)}</strong>, preventative work physically begun by{" "}
          <strong>{formatIsoDateLong(t.preventativeStartBy)}</strong>.{" "}
          <Link href="/tools/deadline-calculator" className="font-medium underline underline-offset-2">
            Calculate your own
          </Link>
          .
        </p>
      </div>

      <div className="prose-legal mt-10 text-[1.02rem] text-ink-2">
        <h2>The phases</h2>
        <ul>
          <li>
            <strong>Phase 1 — from 27 October 2025:</strong> damp and mould, and all emergency hazards.
          </li>
          <li>
            <strong>Phase 2 — from 30 November 2026:</strong> excess cold, excess heat, falls, structural collapse and falling elements, fire and explosions, electrical hazards,
            domestic hygiene, pests and food safety.
          </li>
          <li>
            <strong>Phase 3 — 2027:</strong> the remaining Housing Health and Safety Rating System hazards, except overcrowding.
          </li>
        </ul>

        <h2>How working days are counted</h2>
        <p>
          Periods begin with the day after the landlord becomes aware of a potential hazard (or after the investigation concludes). Weekends and bank holidays in England don&apos;t
          count. The 24-hour emergency clock runs continuously, nights and weekends included.
        </p>

        <h2>Investigations and the written summary</h2>
        <p>
          Investigations can sometimes be remote — for example from good photos or video — but the tenant can ask for an in-person investigation and the landlord must arrange it.
          The written summary must explain what was found, whether a significant or emergency hazard was identified, what safety and preventative work will be done and when, and
          how to complain.
        </p>

        <h2>Alternative accommodation</h2>
        <p>
          If relevant safety work can&apos;t be completed in time, the landlord must offer suitable alternative accommodation at its own cost until the home is safe, unless the
          tenant declines.
        </p>

        <h2>Records</h2>
        <p>
          Keep a record of every step and of anything outside your control — no access, contractor delays, specialist surveys. The Housing Ombudsman will ask for it if a resident
          complains.
        </p>

        <h2>Private landlords in England</h2>
        <p>
          Awaab&apos;s Law doesn&apos;t yet apply to private renting. The government intends to extend it through the Renters&apos; Rights Act 2025, with timescales to be
          confirmed. Many agents are already using the social-housing timescales as a benchmark — RepairClock tracks them that way for English private lets, clearly labelled.
        </p>

        <h2>Frequently asked questions</h2>
        {FAQ.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <h2>Sources</h2>
        <ul>
          <li>
            <a href="https://www.gov.uk/government/collections/awaabs-law-in-the-social-rented-sector" rel="noopener" target="_blank">
              GOV.UK — Awaab’s Law in the social rented sector (collection)
            </a>
          </li>
          <li>
            <a
              href="https://www.gov.uk/government/publications/awaabs-law-guidance-for-social-landlords/awaabs-law-guidance-for-social-landlords-timeframes-for-repairs-in-the-social-rented-sector"
              rel="noopener"
              target="_blank"
            >
              GOV.UK — Awaab’s Law: guidance for social landlords
            </a>
          </li>
          <li>
            <a
              href="https://www.gov.uk/government/publications/awaabs-law-phase-2-guidance-for-social-housing-landlords/awaabs-law-phase-2-guidance-for-social-landlords"
              rel="noopener"
              target="_blank"
            >
              GOV.UK — Awaab’s Law Phase 2 guidance
            </a>
          </li>
        </ul>
        <p className="text-sm text-muted">This guide summarises the rules for convenience. It isn&apos;t legal advice.</p>
      </div>

      <div className="mt-12 flex flex-col gap-3 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">Track every Awaab’s Law clock — including the 24-hour emergency track.</p>
        <Link href="/signup?from=guide-england" className={buttonClass("signal", "md", "shrink-0")}>
          Start free trial <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
