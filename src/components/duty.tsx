import clsx from "clsx";
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, PauseCircle, XCircle } from "lucide-react";
import type { CaseEvaluation, DutyResult, DutyStatus } from "@/lib/rules/engine";
import { formatInstant, formatIsoDate } from "@/lib/rules/calendar";
import { Badge } from "./ui";

type Tone = "neutral" | "ok" | "warn" | "bad" | "info" | "signal";

export const STATUS_TONE: Record<DutyStatus, Tone> = {
  waiting: "neutral",
  not_required: "neutral",
  open: "info",
  due_soon: "warn",
  due_today: "signal",
  overdue: "bad",
  met: "ok",
  met_late: "warn",
  extended: "info",
  extended_overdue: "bad",
};

export const STATUS_LABEL: Record<DutyStatus, string> = {
  waiting: "Not started",
  not_required: "Not required",
  open: "On track",
  due_soon: "Due soon",
  due_today: "Due today",
  overdue: "Overdue",
  met: "Done in time",
  met_late: "Done late",
  extended: "Extended",
  extended_overdue: "Revised date passed",
};

export function countdown(d: DutyResult): string {
  switch (d.status) {
    case "open":
    case "due_soon":
      if (d.dueAt) return `${d.hoursLeft ?? 0}h left`;
      return `${d.workingDaysLeft} working day${d.workingDaysLeft === 1 ? "" : "s"} left`;
    case "due_today":
      return "Due by end of today";
    case "overdue":
      if (d.dueAt) return `${d.hoursLate}h overdue`;
      return `${d.workingDaysLate} working day${d.workingDaysLate === 1 ? "" : "s"} overdue`;
    case "extended":
      return d.delay ? `Extended to ${formatIsoDate(d.delay.revisedDate)}` : "Extended";
    case "extended_overdue":
      return d.delay ? `Revised date ${formatIsoDate(d.delay.revisedDate)} passed` : "Revised date passed";
    case "met":
      return d.completedAt ? `Done ${formatInstant(d.completedAt)}` : "Done";
    case "met_late":
      return d.workingDaysLate ? `Done ${d.workingDaysLate} working day${d.workingDaysLate === 1 ? "" : "s"} late` : d.hoursLate ? `Done ${d.hoursLate}h late` : "Done late";
    case "not_required":
      return d.note ?? "Not required";
    case "waiting":
    default:
      return d.trigger;
  }
}

export function dueLabel(d: DutyResult): string {
  if (d.dueAt) return formatInstant(d.dueAt);
  if (d.dueDate) return formatIsoDate(d.dueDate);
  if (d.dueKind === "reasonable") return "As soon as practicable";
  return "—";
}

function StatusIcon({ status, className }: { status: DutyStatus; className?: string }) {
  const cls = clsx("h-4 w-4 shrink-0", className);
  switch (status) {
    case "met":
      return <CheckCircle2 className={clsx(cls, "text-ok")} aria-hidden />;
    case "met_late":
      return <CheckCircle2 className={clsx(cls, "text-warn")} aria-hidden />;
    case "overdue":
    case "extended_overdue":
      return <XCircle className={clsx(cls, "text-bad")} aria-hidden />;
    case "due_today":
    case "due_soon":
      return <AlertTriangle className={clsx(cls, status === "due_today" ? "text-signal" : "text-warn")} aria-hidden />;
    case "extended":
      return <PauseCircle className={clsx(cls, "text-info")} aria-hidden />;
    case "open":
      return <Clock className={clsx(cls, "text-info")} aria-hidden />;
    default:
      return <CircleDashed className={clsx(cls, "text-faint")} aria-hidden />;
  }
}

export function DutyBadge({ status }: { status: DutyStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

const BAR: Record<DutyStatus, string> = {
  waiting: "bg-paper-2",
  not_required: "bg-paper-2",
  open: "bg-info/70",
  due_soon: "bg-warn",
  due_today: "bg-signal",
  overdue: "bg-bad",
  met: "bg-ok",
  met_late: "bg-warn",
  extended: "bg-info/50",
  extended_overdue: "bg-bad",
};

/**
 * The signature component: each statutory duty as a segment of one strip — window, deadline,
 * countdown — so anyone glancing at a case knows exactly where it stands legally.
 */
export function ClockStrip({
  evaluation,
  compact = false,
  stack = false,
}: {
  evaluation: CaseEvaluation;
  compact?: boolean;
  stack?: boolean;
}) {
  const duties = evaluation.duties.filter((d) => !(compact && d.status === "not_required"));
  if (!duties.length) return null;
  return (
    <ol
      className={clsx(
        "grid gap-px overflow-hidden rounded-xl border border-line bg-line",
        stack ? "grid-cols-1" : compact ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {duties.map((d, i) => (
        <li key={d.key} className={clsx("relative bg-surface", compact ? "px-3 py-2.5" : "px-4 py-3.5")}>
          <span className={clsx("absolute inset-x-0 top-0 h-1", BAR[d.status])} aria-hidden />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted">
              <span className="font-mono text-faint mr-1">{String(i + 1).padStart(2, "0")}</span>
              {d.window}
            </p>
            <StatusIcon status={d.status} />
          </div>
          <p className={clsx("mt-1 font-semibold leading-snug", compact ? "text-sm" : "text-[0.95rem]")}>{d.shortLabel}</p>
          <p className="mt-0.5 text-sm tabular text-ink-2">
            {d.dueKind === "none" ? <span className="text-muted">—</span> : <>Due {dueLabel(d)}</>}
          </p>
          <p
            className={clsx(
              "mt-1 text-xs leading-snug",
              d.status === "overdue" || d.status === "extended_overdue"
                ? "text-bad font-medium"
                : d.status === "due_today"
                  ? "text-signal-strong font-medium"
                  : d.status === "due_soon"
                    ? "text-warn font-medium"
                    : "text-muted",
            )}
          >
            {countdown(d)}
          </p>
        </li>
      ))}
    </ol>
  );
}

export const OVERALL: Record<CaseEvaluation["overall"], { label: string; tone: Tone }> = {
  overdue: { label: "Overdue", tone: "bad" },
  due_today: { label: "Due today", tone: "signal" },
  due_soon: { label: "Due soon", tone: "warn" },
  on_track: { label: "On track", tone: "info" },
  waiting: { label: "In progress", tone: "neutral" },
  closed: { label: "Closed", tone: "neutral" },
  not_in_scope: { label: "Outside the Regulations", tone: "neutral" },
};

export function OverallBadge({ overall }: { overall: CaseEvaluation["overall"] }) {
  const o = OVERALL[overall];
  return <Badge tone={o.tone}>{o.label}</Badge>;
}
