import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { formatIsoDateLong, londonDateOf } from "@/lib/rules/calendar";
import { previewScotlandTimeline } from "@/lib/rules/engine";

export const revalidate = 3600;

export const metadata = {
  title: "Awaab’s Law in Scotland: the damp & mould rules for landlords and letting agents (2026)",
  description:
    "Plain-English guide to the Investigation and Commencement of Repair (Scotland) Regulations 2026: the 10-3-5 working-day timescales, what the written summary must include, delay notices, records and what happens if you miss a deadline.",
  alternates: { canonical: "/scotland" },
};

const FAQ = [
  {
    q: "When did the Scottish damp and mould rules start?",
    a: "The Investigation and Commencement of Repair (Scotland) Regulations 2026 came into force on 6 October 2026. They apply to damp and mould you become aware of from that date.",
  },
  {
    q: "Do the rules apply to private landlords?",
    a: "Yes. Unlike Awaab's Law in England (social housing only, for now), the Scottish rules apply to both social and private landlords. Letting agents usually carry out the duties on the landlord's behalf.",
  },
  {
    q: "What are the timescales?",
    a: "A competent person must investigate within 10 working days of the landlord becoming aware. The tenant must get a written summary within 3 working days of the investigation concluding. If there is substantial damp or mould, repair work must start within 5 working days of the investigation concluding. Social landlords must then complete the repair within 20 working days; private landlords as soon as reasonably practicable.",
  },
  {
    q: "What counts as a working day?",
    a: "Any day except Saturday, Sunday and Scottish bank holidays. The count begins with the day after the landlord became aware (or after the investigation concluded).",
  },
  {
    q: "What if I can't meet a timescale?",
    a: "If it's due to circumstances beyond your control, you must tell the tenant which duty you can't meet, why, and a revised timeframe — and take reasonable steps to minimise the effect of the damp or mould in the meantime. Keep records: they are your evidence if the tenant complains.",
  },
];

export default function ScotlandGuide() {
  const today = londonDateOf(new Date());
  const t = previewScotlandTimeline(today);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="eyebrow">Guide · updated for 6 October 2026</p>
      <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">Awaab’s Law in Scotland: the damp and mould rules for landlords and letting agents</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-2">
        From 6 October 2026, every report of damp or mould in a Scottish rented home comes with legal deadlines — for private landlords as well as social landlords. Here&apos;s what
        the Investigation and Commencement of Repair (Scotland) Regulations 2026 require, in plain English, and what agents should change this week.
      </p>

      <div className="card mt-8 overflow-hidden">
        <div className="border-b border-line bg-paper px-5 py-3">
          <p className="text-sm font-semibold">The timescales at a glance</p>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-2.5 font-medium">Duty</th>
              <th className="px-5 py-2.5 font-medium">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            <tr>
              <td className="px-5 py-3">A competent person investigates</td>
              <td className="px-5 py-3 font-medium">10 working days after you become aware</td>
            </tr>
            <tr>
              <td className="px-5 py-3">Written summary of findings to the tenant</td>
              <td className="px-5 py-3 font-medium">3 working days after the investigation concludes</td>
            </tr>
            <tr>
              <td className="px-5 py-3">Repair work starts (if substantial damp or mould)</td>
              <td className="px-5 py-3 font-medium">5 working days after the investigation concludes</td>
            </tr>
            <tr>
              <td className="px-5 py-3">Repair completed</td>
              <td className="px-5 py-3 font-medium">Social: 20 working days after starting · Private: as soon as reasonably practicable</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-signal/30 bg-signal-soft/60 p-5">
        <p className="text-sm font-semibold text-signal-strong">Worked example: a report made today</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">
          Aware on {formatIsoDateLong(today)} → investigate by <strong>{formatIsoDateLong(t.investigateBy)}</strong>. If the investigation happens that day, the written summary is
          due by <strong>{formatIsoDateLong(t.summaryBy)}</strong> and repairs must begin by <strong>{formatIsoDateLong(t.repairsStartBy)}</strong>.
          {t.holidays.length ? ` Bank holidays skipped: ${t.holidays.map((h) => h.name).join(", ")}.` : ""}{" "}
          <Link href="/tools/deadline-calculator" className="font-medium underline underline-offset-2">
            Try your own dates
          </Link>
          .
        </p>
      </div>

      <div className="prose-legal mt-10 text-[1.02rem] text-ink-2">
        <h2>Who the rules apply to</h2>
        <p>
          Both <strong>social landlords</strong> (through the Scottish secure tenancy Right to Repair scheme) and <strong>private landlords</strong> (through the Repairing
          Standard) — wherever the damp or mould is part of the building the landlord is responsible for, and the repair is the landlord&apos;s responsibility. The duty sits with the
          landlord, but where a letting agent manages the property it&apos;s usually the agent who receives the report and has to make every step happen on time.
        </p>

        <h2>When the clock starts</h2>
        <p>
          Day 0 is the day the landlord <em>becomes aware</em> of potential damp or mould. That isn&apos;t only a formal tenant report: it can be something seen on an inspection,
          mentioned by a contractor, or flagged by a support worker or a sensor. If your agency is told, treat the clock as started — not when the landlord replies, and not when a
          contractor is booked.
        </p>
        <p>
          Periods are counted in <strong>working days</strong>, beginning with the day after. Saturdays, Sundays and Scottish bank holidays don&apos;t count — including 2 January,
          St Andrew&apos;s Day and one-offs such as the 15 June 2026 holiday. Getting this wrong by one day is the easiest way to miss a deadline.
        </p>

        <h2>The investigation</h2>
        <p>
          It must be carried out by a <strong>competent person</strong>: someone who, in your reasonable opinion, has the skills and experience to decide whether the home is
          substantially free from damp and mould and, if not, what repair work is needed. Record who investigated, how (in person or remotely, and why), and what they found.
        </p>

        <h2>The written summary</h2>
        <p>Within 3 working days of the investigation concluding, the tenant (or their representative) must receive a written summary. In practice it should cover:</p>
        <ul>
          <li>who carried out the investigation (names and organisation);</li>
          <li>a summary of the investigation and its findings, with a clear conclusion on whether the home is substantially free from damp and mould;</li>
          <li>any work carried out during the visit;</li>
          <li>if repairs are needed: the work required and the target date to begin it — or, if not, the reasons;</li>
          <li>where the tenant can get independent advice, and how to contact you.</li>
        </ul>
        <p>Make it accessible to the tenant — another language or large print where needed.</p>

        <h2>Starting and finishing repairs</h2>
        <p>
          Where there is substantial damp or mould, repair work must <strong>begin within 5 working days</strong> of the investigation concluding. Social landlords must then complete
          the repair within 20 working days. Private landlords must complete it as soon as reasonably practicable — so record a realistic target and the reasons for any slippage.
          Afterwards you must keep the home substantially free from damp and mould as far as reasonably practicable. If the problem significantly changes or appears somewhere new,
          that&apos;s a new investigation and the timescales start again.
        </p>

        <h2>When you can&apos;t meet a timescale</h2>
        <p>If circumstances beyond your control — no contractor available, no access, complex structural work — stop you meeting a duty, you must tell the tenant:</p>
        <ul>
          <li>which duty you can&apos;t comply with and why; and</li>
          <li>a revised timeframe in which you will.</li>
        </ul>
        <p>
          Until then, take reasonable steps to minimise the effect of the damp or mould — mould removal, a temporary extractor or dehumidifier, sealing a leak, regular contact
          with the tenant. Send the notice <em>before</em> the deadline passes: a notice issued afterwards is much harder to defend.
        </p>

        <h2>Records and enforcement</h2>
        <p>
          If a tenant complains, you&apos;ll need to show you complied — or why you couldn&apos;t. Keep a dated record of every attempt: calls, access refusals, contractor
          availability, approvals. Private tenants can apply to the First-tier Tribunal for Scotland (Housing and Property Chamber), which can make a Repairing Standard Enforcement
          Order; social tenants can claim Right to Repair compensation and use the complaints route to the Scottish Public Services Ombudsman.
        </p>

        <h2>What letting agents should do this week</h2>
        <ol>
          <li>Decide who logs every damp or mould report — from email, phone, portal, inspections and contractors — on the day it arrives.</li>
          <li>Agree approval limits with landlords so investigations aren&apos;t held up waiting for a reply.</li>
          <li>Line up competent investigators and contractors who can attend within days, not weeks.</li>
          <li>Prepare written summary and delay notice templates that include the required content.</li>
          <li>Keep one dated record per case that you could hand to a tribunal.</li>
        </ol>
        <p>
          RepairClock does steps 1, 4 and 5 for you and makes step 2 a one-click link.{" "}
          <Link href="/signup?from=guide-scotland">Start a free trial</Link> or <Link href="/demo">explore the demo</Link>.
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
            <a href="https://www.legislation.gov.uk/ssi/2026/173/made" rel="noopener" target="_blank">
              The Investigation and Commencement of Repair (Scotland) Regulations 2026 (SSI 2026/173)
            </a>
          </li>
          <li>
            <a href="https://www.gov.scot/publications/awaabs-law-guidance-landlords-scotland/" rel="noopener" target="_blank">
              Scottish Government — Awaab’s Law: guidance for landlords (Scotland)
            </a>
          </li>
          <li>
            <a href="https://www.gov.scot/publications/awaabs-law-guidance-tenants-scotland/" rel="noopener" target="_blank">
              Scottish Government — Awaab’s Law: guidance for tenants (Scotland)
            </a>
          </li>
        </ul>
        <p className="text-sm text-muted">This guide summarises the rules for convenience. It isn&apos;t legal advice — check the Regulations and guidance for your circumstances.</p>
      </div>

      <div className="mt-12 flex flex-col gap-3 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="font-semibold">Run every clock automatically — from the first report to the evidence pack.</p>
        <Link href="/signup?from=guide-scotland" className={buttonClass("signal", "md", "shrink-0")}>
          Start free trial <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
