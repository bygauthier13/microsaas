"use client";

import Link from "next/link";
import { CalendarPlus, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Field, Input, Select, buttonClass } from "@/components/ui";
import { addCalendarDays, compareIso, formatIsoDateLong, isIsoDate } from "@/lib/rules/calendar";
import { previewEnglandTimeline, previewScotlandTimeline } from "@/lib/rules/engine";
import { SCOTLAND_COMMENCEMENT } from "@/lib/rules/hazards";

interface Row {
  label: string;
  date: string;
  rule: string;
  key: string;
}

function ics(rows: Row[], title: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const events = rows
    .map((r, i) => {
      const d = r.date.replace(/-/g, "");
      return [
        "BEGIN:VEVENT",
        `UID:${d}-${i}-${Math.random().toString(36).slice(2)}@repairclock`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${d}`,
        `SUMMARY:${(title ? `${title}: ` : "") + r.label}`.replace(/[,;]/g, " "),
        `DESCRIPTION:${r.rule.replace(/[,;]/g, " ")} — calculated by RepairClock (not legal advice).`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");
  return `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//RepairClock//Deadline calculator//EN\r\nCALSCALE:GREGORIAN\r\n${events}\r\nEND:VCALENDAR\r\n`;
}

export function DeadlineCalculator({ todayIso }: { todayIso: string }) {
  const [nation, setNation] = useState<"scotland" | "england">("scotland");
  const [sector, setSector] = useState<"private" | "social">("private");
  const [aware, setAware] = useState(todayIso);
  const [investigated, setInvestigated] = useState("");
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState(false);
  const tracked = useRef(false);

  const result = useMemo(() => {
    if (!isIsoDate(aware)) return null;
    const inv = investigated && isIsoDate(investigated) && compareIso(investigated, aware) >= 0 ? investigated : undefined;
    if (nation === "scotland") {
      const t = previewScotlandTimeline(aware, { investigationIso: inv, social: sector === "social" });
      const rows: Row[] = [
        { key: "inv", label: "Investigation by a competent person", date: t.investigateBy, rule: "10 working days, beginning with the day after you became aware" },
        { key: "sum", label: "Written summary to the tenant", date: t.summaryBy, rule: `3 working days after the investigation${inv ? "" : " (if it happens on the last permitted day)"}` },
        { key: "rep", label: "Repair work must begin", date: t.repairsStartBy, rule: `5 working days after the investigation${inv ? "" : " (latest case)"}, where repairs are needed` },
      ];
      if (t.socialCompleteBy) rows.push({ key: "cmp", label: "Repairs completed (social landlords)", date: t.socialCompleteBy, rule: "20 working days after repairs begin (latest case)" });
      return {
        rows,
        holidays: t.holidays,
        note:
          compareIso(aware, SCOTLAND_COMMENCEMENT) < 0
            ? "This date is before 6 October 2026, when the Regulations came into force, so these timescales are good practice rather than statutory for this report."
            : sector === "private"
              ? "Private landlords must then complete repairs as soon as reasonably practicable. Tenants can raise missed duties with the First-tier Tribunal for Scotland (Housing and Property Chamber)."
              : "Social tenants can claim Right to Repair compensation (£15 plus £3 per working day late, up to £100) if the investigation or start of repairs is late.",
      };
    }
    const t = previewEnglandTimeline(aware, { investigationIso: inv });
    return {
      rows: [
        { key: "emg", label: "Emergency hazard: investigate and make safe", date: addCalendarDays(aware, 1), rule: "Within 24 hours of becoming aware — the clock runs through weekends and holidays" },
        { key: "inv", label: "Significant hazard: investigation", date: t.investigateBy, rule: "10 working days, beginning with the day after you became aware" },
        { key: "sum", label: "Written summary to the tenant", date: t.summaryBy, rule: "3 working days after the investigation concludes" },
        { key: "safe", label: "Relevant safety work completed", date: t.safetyWorkBy, rule: "5 working days after the investigation concludes" },
        { key: "prev", label: "Preventative work begun (or steps taken)", date: t.preventativeStepsBy, rule: "5 working days after the investigation; physically begun within 12 weeks" },
        { key: "prev2", label: "Preventative work physically begun (backstop)", date: t.preventativeStartBy, rule: "12 weeks after the investigation" },
      ],
      holidays: t.holidays,
      note:
        sector === "private"
          ? "Awaab's Law doesn't yet apply to private landlords in England — an extension is planned. These social-housing timescales are a sensible benchmark."
          : "Awaab's Law covers damp, mould and all emergency hazards from 27 October 2025, with more hazard types from 30 November 2026 (Phase 2) and 2027 (Phase 3).",
    };
  }, [nation, sector, aware, investigated]);

  useEffect(() => {
    if (!result || tracked.current) return;
    if (aware === todayIso && !investigated) return; // only count real use
    tracked.current = true;
    try {
      navigator.sendBeacon?.("/api/track", JSON.stringify({ event: "calculator_used", props: { nation, sector } }));
    } catch {
      // analytics is best-effort
    }
  }, [result, aware, investigated, nation, sector, todayIso]);

  function download() {
    if (!result) return;
    const blob = new Blob([ics(result.rows, label.trim())], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repair-deadlines-${aware}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    if (!result) return;
    const text = [label.trim() || "Repair deadlines", ...result.rows.map((r) => `${r.label}: ${formatIsoDateLong(r.date)}`)].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      <div className="card space-y-4 p-5 sm:p-6 self-start">
        <Field label="Where is the home?" htmlFor="nation">
          <Select id="nation" value={nation} onChange={(e) => setNation(e.target.value as "scotland" | "england")}>
            <option value="scotland">Scotland</option>
            <option value="england">England</option>
          </Select>
        </Field>
        <Field label="Landlord type" htmlFor="sector">
          <Select id="sector" value={sector} onChange={(e) => setSector(e.target.value as "private" | "social")}>
            <option value="private">Private landlord / letting agent</option>
            <option value="social">Social landlord</option>
          </Select>
        </Field>
        <Field label="Date you became aware" htmlFor="aware" hint="The day a tenant, contractor or inspection told you.">
          <Input id="aware" type="date" value={aware} onChange={(e) => setAware(e.target.value)} />
        </Field>
        <Field label="Investigation date (optional)" htmlFor="investigated" hint="Leave blank to see the latest permitted dates.">
          <Input id="investigated" type="date" value={investigated} min={aware} onChange={(e) => setInvestigated(e.target.value)} />
        </Field>
        <Field label="Label for your calendar (optional)" htmlFor="label">
          <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. 14 Dalmeny St" />
        </Field>
      </div>

      <div className="min-w-0 space-y-4">
        {result ? (
          <>
            <div className="card overflow-hidden">
              <ol className="divide-y divide-line">
                {result.rows.map((r, i) => (
                  <li key={r.key} className="grid gap-1 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted">
                        <span className="mr-1 font-mono text-faint">{String(i + 1).padStart(2, "0")}</span>
                        {r.rule}
                      </p>
                      <p className="mt-0.5 font-semibold">{r.label}</p>
                    </div>
                    <p className="display text-xl tabular sm:text-right sm:text-2xl">{formatIsoDateLong(r.date)}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={download} className={buttonClass("secondary", "sm")}>
                <CalendarPlus className="h-4 w-4" aria-hidden /> Add to calendar (.ics)
              </button>
              <button type="button" onClick={copy} className={buttonClass("secondary", "sm")}>
                <Copy className="h-4 w-4" aria-hidden /> {copied ? "Copied" : "Copy dates"}
              </button>
            </div>
            <div className="rounded-xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed text-ink-2">
              {result.holidays.length ? (
                <p className="mb-1.5">
                  <span className="font-medium">Bank holidays skipped:</span> {result.holidays.map((h) => `${h.name} (${formatIsoDateLong(h.date)})`).join("; ")}.
                </p>
              ) : null}
              <p>{result.note}</p>
            </div>
            <div className="rounded-2xl bg-ink p-5 text-white sm:p-6">
              <p className="font-semibold">Tracking more than a couple of these?</p>
              <p className="mt-1 text-sm text-white/75">
                RepairClock runs these clocks for every report automatically, chases landlords for approval, drafts the written summary and reminds you each morning.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/signup?from=calculator" className={buttonClass("signal", "sm")}>
                  Start free trial
                </Link>
                <Link href="/demo" className={buttonClass("secondary", "sm", "border-white/20 bg-white/10 text-white hover:bg-white/20")}>
                  See the demo
                </Link>
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Enter a valid date.</p>
        )}
      </div>
    </div>
  );
}
