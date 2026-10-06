import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  Check,
  FileCheck2,
  FileText,
  Gavel,
  Inbox,
  MailCheck,
  Minus,
  PlayCircle,
  Timer,
  UserCheck,
  X,
} from "lucide-react";
import { ClockStrip } from "@/components/duty";
import { buttonClass } from "@/components/ui";
import { GuideVideoButton, PlayBadge, Video } from "@/components/video";
import { PLANS, PLAN_ORDER, formatGbp } from "@/lib/billing/plans";
import { addCalendarDays, compareIso, formatIsoDate, fromLondonLocal, isWorkingDay, londonDateOf } from "@/lib/rules/calendar";
import { evaluateCase, previewScotlandTimeline } from "@/lib/rules/engine";
import { SCOTLAND_COMMENCEMENT } from "@/lib/rules/hazards";
import { VIDEOS } from "@/lib/videos";

// Dates on this page are computed from "today" — refresh hourly.
export const revalidate = 3600;

export const metadata = {
  title: { absolute: "RepairClock — never miss a damp & mould deadline (Scotland 2026 rules)" },
  description:
    "Scotland's damp and mould Regulations (in force 6 October 2026) give landlords 10 working days to investigate, 3 to issue a written summary and 5 to start repairs. RepairClock tracks every deadline, gets landlord approval in one click, drafts the tenant letters and keeps a tribunal-ready record.",
  alternates: { canonical: "/" },
};

function workingDaysAgo(iso: string, n: number) {
  let cursor = iso;
  while (n > 0) {
    cursor = addCalendarDays(cursor, -1);
    if (isWorkingDay(cursor, "scotland")) n--;
  }
  return cursor;
}

const FAQ = [
  {
    q: "Does this apply to private landlords and letting agents?",
    a: "Yes. From 6 October 2026 the Investigation and Commencement of Repair (Scotland) Regulations 2026 apply to private landlords (through the Repairing Standard) and to social landlords (through the Right to Repair scheme). The duty sits with the landlord, but in practice it's the letting agent who receives the report and has to make the deadlines happen — that's who RepairClock is built for.",
  },
  {
    q: "When does the clock start?",
    a: "When the landlord — or the agent acting for them — becomes aware of the damp or mould: a tenant's email, a call, a portal message, something spotted on an inspection or mentioned by a contractor. Day 1 is the next working day. Weekends and Scottish bank holidays don't count. RepairClock asks for that date when you log a report, and records when you logged it.",
  },
  {
    q: "What if a contractor can't get there in time?",
    a: "The Regulations allow for circumstances beyond your control, but you have to tell the tenant in writing — the reason and the revised date — and take reasonable steps in the meantime. RepairClock drafts that delay notice, files it on the case and flags it if it would be issued after the deadline has already passed.",
  },
  {
    q: "What goes in the written summary?",
    a: "Scottish Government guidance expects it to name who investigated, summarise what they found with a clear conclusion on whether the home is substantially free from damp and mould, note any work done on the visit, and — if repairs are needed — what they are and when they'll start, plus where the tenant can get advice. RepairClock drafts it from your investigation record and checks those elements before you issue it.",
  },
  {
    q: "Is RepairClock legal advice?",
    a: "No. It's a system for running and evidencing the process the Regulations set out, with the legal sources linked. You stay in control of every decision and every letter, and we recommend Propertymark, SAL or your solicitor for advice on specific cases.",
  },
  {
    q: "What about England and Awaab's Law?",
    a: "RepairClock also runs the Awaab's Law timescales for social landlords in England (24 hours for emergency hazards; 10, 3 and 5 working days for significant ones) and tracks the same timescales as a benchmark for private lets ahead of the planned extension.",
  },
  {
    q: "Can I cancel? What happens to my records?",
    a: "Cancel any time from the billing page. Your cases stay exportable as CSV and every case can be downloaded as a PDF evidence pack — the record is yours.",
  },
];

export default function LandingPage() {
  const today = londonDateOf(new Date());
  const t = previewScotlandTimeline(today);
  const commenced = compareIso(today, SCOTLAND_COMMENCEMENT) >= 0;
  const eyebrow =
    today === SCOTLAND_COMMENCEMENT
      ? "Scotland · in force from today, 6 October 2026"
      : commenced
        ? "Scotland · in force since 6 October 2026"
        : "Scotland · in force from 6 October 2026";

  // A realistic case, mid-flow, for the product preview.
  const aware = workingDaysAgo(today, 8);
  const investigated = workingDaysAgo(today, 2);
  const sample = evaluateCase(
    {
      jurisdiction: "scotland",
      sector: "private",
      hazard: "damp_mould",
      awareAt: fromLondonLocal(aware, "09:20"),
      investigationCompletedAt: fromLondonLocal(investigated, "14:00"),
      hazardFound: true,
      assumeInForce: true,
    },
    new Date(),
  );

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:pb-24 lg:pt-20">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display mt-4 text-[2.6rem] leading-[1.05] sm:text-6xl">
              Damp and mould reports now run on a legal clock.
              <span className="block text-signal-strong">Never miss a deadline.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
              10 working days to investigate. 3 to send the tenant a written summary. 5 to start repairs. RepairClock tracks every clock, gets the landlord&apos;s approval in one
              click, drafts the letters and keeps a tribunal-ready record — built for letting agents.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClass("signal", "lg")}>
                Start 14-day free trial <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/demo" className={buttonClass("secondary", "lg")}>
                Explore the live demo
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted">No card needed · import your homes from a spreadsheet · set up in 10 minutes</p>
            <a href="#video" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-2 hover:underline">
              <PlayCircle className="h-4 w-4 text-signal-strong" aria-hidden /> Watch the 90-second video
            </a>
          </div>

          <div className="relative">
            <div className="card relative p-5 shadow-[var(--shadow-lift)] sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">If a tenant reports mould today</p>
              <ol className="mt-4 space-y-0">
                <TimelineRow day="Day 0" date={formatIsoDate(today)} title="You become aware" body="Email, call, portal message or inspection — the clock starts here." tone="ink" />
                <TimelineRow day="10 WD" date={formatIsoDate(t.investigateBy)} title="Investigation by a competent person" body="Within 10 working days, beginning the day after." tone="signal" />
                <TimelineRow day="+3 WD" date={formatIsoDate(t.summaryBy)} title="Written summary to the tenant" body="Within 3 working days of the investigation (latest case shown)." tone="info" />
                <TimelineRow day="+5 WD" date={formatIsoDate(t.repairsStartBy)} title="Repairs must begin" body="Within 5 working days of the investigation, if needed." tone="ok" last />
              </ol>
              <div className="mt-4 rounded-lg bg-paper px-3 py-2.5 text-xs leading-relaxed text-muted">
                {t.holidays.length
                  ? `Skips ${t.holidays.map((h) => `${h.name} (${formatIsoDate(h.date)})`).join(", ")} and weekends.`
                  : "Weekends and Scottish bank holidays excluded automatically."}{" "}
                <Link href="/tools/deadline-calculator" className="font-medium text-ink underline underline-offset-2">
                  Check any date →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Videos: what it does, then how to set it up */}
      <section id="video" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:items-end lg:py-16">
          <div className="min-w-0">
            <p className="eyebrow">See it in action</p>
            <h2 className="display mt-3 text-3xl leading-tight sm:text-4xl">{VIDEOS.overview.title}</h2>
            <Video className="mt-6" src={VIDEOS.overview.src} poster={VIDEOS.overview.poster} title={VIDEOS.overview.title} label="Play the 90-second overview" />
          </div>
          <div className="card flex flex-col p-5 sm:p-6">
            <p className="eyebrow">Ready to set up?</p>
            <h3 className="mt-2 text-xl font-semibold">The step-by-step guide</h3>
            <p className="mt-1 text-sm text-muted">2 minutes · 8 steps, from sign-up to choosing a plan</p>
            <GuideVideoButton className="group relative mt-4 block overflow-hidden rounded-xl border border-line">
              <Image src={VIDEOS.guide.poster} alt="" width={1280} height={720} className="aspect-video w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-ink/5">
                <PlayBadge size="md" />
              </span>
              <span className="sr-only">Play the setup guide</span>
            </GuideVideoButton>
            <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
              {["Import your homes from a spreadsheet", "Log a report and see every deadline", "Invite your team and choose a plan"].map((t) => (
                <li key={t} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/guide" className="mt-5 text-sm font-medium text-signal-strong underline-offset-2 hover:underline">
              See all 8 steps →
            </Link>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="eyebrow">Why agents are exposed</p>
          <h2 className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl">The rules changed overnight. Your inbox, diary and spreadsheet didn&apos;t.</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Pain icon={<Inbox className="h-5 w-5" />} title="The clock starts with whoever hears first">
              A WhatsApp to a property manager or a note from a contractor counts. Not when the landlord replies, not when a contractor is booked.
            </Pain>
            <Pain icon={<UserCheck className="h-5 w-5" />} title="You wait on landlords. The law doesn't.">
              Approval chains by email can eat half of the 10 working days. The legal duty stays with the landlord — the scramble lands on you.
            </Pain>
            <Pain icon={<FileText className="h-5 w-5" />} title="The paperwork has required content">
              The written summary must name the investigator, give a clear conclusion and a repair start date. Delays need a written notice with reasons.
            </Pain>
            <Pain icon={<Gavel className="h-5 w-5" />} title="Tenants can take it to the Tribunal">
              Missed duties can mean a Repairing Standard Enforcement Order, rent relief, compensation for social tenants — and a record you&apos;ll have to defend.
            </Pain>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="eyebrow">How it works</p>
              <h2 className="display mt-3 text-3xl leading-tight sm:text-4xl">One place for every report, every deadline and every letter.</h2>
              <p className="mt-4 text-ink-2 leading-relaxed">
                No new hardware, no change to how tenants contact you. Log the report when it arrives and RepairClock runs the rest of the process with you.
              </p>
              <Link href="/demo" className="mt-6 inline-flex items-center gap-1 font-medium text-signal-strong hover:underline">
                Click through it in the demo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ol className="space-y-4">
              <Step n="01" icon={<Timer className="h-5 w-5" />} title="Log the report in 30 seconds">
                Pick the home, paste the tenant&apos;s message, enter when you became aware. Every statutory deadline appears instantly — calculated in working days with the
                correct Scottish bank holidays.
              </Step>
              <Step n="02" icon={<UserCheck className="h-5 w-5" />} title="Get landlord approval in one click">
                Send a secure link showing the work, the cost and the legal deadline. The landlord approves or declines without logging in, and their decision is time-stamped on
                the case. Reminders go automatically.
              </Step>
              <Step n="03" icon={<FileCheck2 className="h-5 w-5" />} title="Issue the written summary — drafted for you">
                Record the investigation (rough notes are fine) and RepairClock drafts the tenant&apos;s written summary with every element the guidance expects, checks it, and
                emails the PDF. Running late? Issue a delay notice in two clicks.
              </Step>
              <Step n="04" icon={<BellRing className="h-5 w-5" />} title="Stay ahead, every morning">
                A weekday digest lists what&apos;s overdue, due today and due soon across your whole portfolio, plus landlords who haven&apos;t answered.
              </Step>
              <Step n="05" icon={<MailCheck className="h-5 w-5" />} title="Prove it, whenever you're asked">
                Every action lands on an append-only timeline. One click produces an evidence pack — deadlines, letters, photos and approvals — for a landlord, the Tribunal or
                your own audit.
              </Step>
            </ol>
          </div>
        </div>
      </section>

      {/* Product preview */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow !text-[#f3b183]">What your team sees</p>
              <h2 className="display mt-3 max-w-2xl text-3xl leading-tight sm:text-4xl">Every case shows exactly where it stands, legally.</h2>
            </div>
            <Link href="/demo" className={buttonClass("secondary", "md", "self-start border-white/20 bg-white/10 text-white hover:bg-white/20")}>
              Open the demo
            </Link>
          </div>
          <div className="mt-8 rounded-2xl bg-paper p-3 text-ink sm:p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 px-1">
              <p className="font-semibold">
                <span className="mr-2 font-mono text-xs text-muted">LFL-0003</span>Flat 1/2, 18 Dalmeny Street, Edinburgh
              </p>
              <p className="text-xs text-muted">Investigated {formatIsoDate(investigated)} · repairs needed</p>
            </div>
            <ClockStrip evaluation={sample} />
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <p className="eyebrow">Why RepairClock</p>
          <h2 className="display mt-3 max-w-3xl text-3xl leading-tight sm:text-4xl">Built for one job: meeting the new duties, and proving you did.</h2>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
                  <th className="px-5 py-3 font-medium"> </th>
                  <th className="px-5 py-3 font-medium">Inbox + spreadsheet</th>
                  <th className="px-5 py-3 font-medium">General property CRM</th>
                  <th className="bg-signal-soft/60 px-5 py-3 font-semibold text-signal-strong">RepairClock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {[
                  ["Working-day deadlines with Scottish bank holidays", "no", "partial", "yes"],
                  ["Delay notices that protect you (before the deadline)", "no", "no", "yes"],
                  ["Written summary drafted with the required content", "no", "no", "yes"],
                  ["Landlord approval in one click, with the legal deadline shown", "no", "partial", "yes"],
                  ["Morning digest of what's overdue and due", "no", "partial", "yes"],
                  ["Tribunal-ready evidence pack in one click", "no", "no", "yes"],
                  ["Live in an afternoon, no contract", "yes", "no", "yes"],
                ].map(([label, a, b, c]) => (
                  <tr key={label}>
                    <td className="px-5 py-3.5 font-medium">{label}</td>
                    <td className="px-5 py-3.5"><Mark v={a} /></td>
                    <td className="px-5 py-3.5"><Mark v={b} /></td>
                    <td className="bg-signal-soft/30 px-5 py-3.5"><Mark v={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-muted">
            Already on Reapit, Alto or Arthur? Keep them. Export your property list as CSV and import it into RepairClock in a minute — it runs alongside your CRM.
          </p>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Pricing</p>
              <h2 className="display mt-3 text-3xl leading-tight sm:text-4xl">Less than one late repair costs you.</h2>
            </div>
            <Link href="/pricing" className="font-medium text-signal-strong hover:underline">
              Compare plans →
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLAN_ORDER.map((id) => {
              const p = PLANS[id];
              return (
                <div key={id} className={`rounded-2xl border p-5 ${p.highlight ? "border-signal/40 bg-signal-soft/40" : "border-line bg-paper"}`}>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-xs text-muted">{p.audience}</p>
                  <p className="mt-3 text-3xl font-semibold tabular">
                    {formatGbp(p.monthly)}
                    <span className="text-sm font-normal text-muted"> /month + VAT</span>
                  </p>
                  <p className="mt-1 text-xs text-muted">Up to {p.homes.toLocaleString("en-GB")} homes</p>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted">14-day free trial on every plan. No card to start. Annual billing gets 2 months free.</p>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:py-24">
          <div>
            <p className="eyebrow">Questions</p>
            <h2 className="display mt-3 text-3xl leading-tight sm:text-4xl">What agents ask us</h2>
            <p className="mt-4 text-ink-2">
              Want the detail? Read our plain-English guide to{" "}
              <Link href="/scotland" className="underline underline-offset-2">
                Scotland&apos;s new damp and mould rules
              </Link>
              .
            </p>
          </div>
          <div className="divide-y divide-line rounded-2xl border border-line bg-surface">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="mt-0.5 text-xl leading-none text-muted transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 pb-20 sm:px-6">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink px-6 py-12 text-white sm:px-12 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-center">
            <div>
              <h2 className="display text-3xl leading-tight sm:text-4xl">Put a clock on every report before the first deadline lands.</h2>
              <p className="mt-3 max-w-xl text-white/75">
                Reports from today have to be investigated by {formatIsoDate(t.investigateBy)}. Start your trial now and log them as they come in.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/signup" className={buttonClass("signal", "lg")}>
                Start free trial
              </Link>
              <Link href="/demo" className={buttonClass("secondary", "lg", "border-white/20 bg-white/10 text-white hover:bg-white/20")}>
                See the demo first
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function TimelineRow({ day, date, title, body, tone, last }: { day: string; date: string; title: string; body: string; tone: "ink" | "signal" | "info" | "ok"; last?: boolean }) {
  const dot = { ink: "bg-ink", signal: "bg-signal", info: "bg-info", ok: "bg-ok" }[tone];
  return (
    <li className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
      {!last ? <span className="absolute left-[71px] top-3 h-full w-px bg-line" aria-hidden /> : null}
      <span className="pt-0.5 font-mono text-xs text-muted">{day}</span>
      <div className="relative pl-5">
        <span className={`absolute left-[3px] top-1.5 h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden />
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-semibold">{title}</span>
          <span className="text-sm font-semibold tabular text-ink">{date}</span>
        </p>
        <p className="mt-0.5 text-sm leading-snug text-muted">{body}</p>
      </div>
    </li>
  );
}

function Pain({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal-soft text-signal-strong">{icon}</div>
      <h3 className="mt-4 font-semibold leading-snug">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-2">{children}</p>
    </div>
  );
}

function Step({ n, icon, title, children }: { n: string; icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <li className="card flex gap-4 p-5 sm:p-6">
      <div className="flex flex-col items-center gap-2">
        <span className="font-mono text-xs text-faint">{n}</span>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper-2 text-ink">{icon}</span>
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{children}</p>
      </div>
    </li>
  );
}

function Mark({ v }: { v: string }) {
  if (v === "yes") return <Check className="h-5 w-5 text-ok" aria-label="Yes" />;
  if (v === "partial") return <Minus className="h-5 w-5 text-warn" aria-label="Partly" />;
  return <X className="h-5 w-5 text-faint" aria-label="No" />;
}
