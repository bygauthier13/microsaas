import Link from "next/link";
import clsx from "clsx";
import { ChevronRight, UserCheck } from "lucide-react";
import { OverallBadge, countdown, dueLabel } from "@/components/duty";
import type { CaseListItem } from "@/lib/cases/service";
import { hazardShort, type HazardKey } from "@/lib/rules/hazards";

/** One scannable line per case: where, what, the next legal deadline, and how close it is. */
export function CaseRow({ item }: { item: CaseListItem }) {
  const { case: c, property: p, evaluation: ev } = item;
  const next = ev.nextDuty;
  const urgent = ev.overall === "overdue" || ev.overall === "due_today";
  return (
    <li>
      <Link
        href={`/app/cases/${c.id}`}
        className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 hover:bg-paper sm:grid-cols-[110px_minmax(0,1.3fr)_minmax(0,1fr)_140px_20px] sm:px-5"
      >
        <span className="hidden font-mono text-xs text-muted sm:block">{c.reference}</span>
        <span className="min-w-0">
          <span className="block truncate font-medium">
            {p.addressLine1}
            {p.postcode ? <span className="font-normal text-muted">, {p.postcode}</span> : null}
          </span>
          <span className="block truncate text-xs text-muted">
            <span className="font-mono sm:hidden">{c.reference} · </span>
            {hazardShort(c.hazard as HazardKey)}
            {p.tenantName ? ` · ${p.tenantName}` : ""}
            {item.pendingApproval ? (
              <span className="ml-1 inline-flex items-center gap-0.5 text-info">
                · <UserCheck className="h-3 w-3" aria-hidden /> awaiting landlord
              </span>
            ) : null}
          </span>
        </span>
        <span className="col-span-2 row-start-2 min-w-0 sm:col-span-1 sm:row-start-auto">
          {next ? (
            <>
              <span className="block truncate text-sm">{next.shortLabel}</span>
              <span className={clsx("block text-xs tabular", urgent ? "font-medium text-bad" : ev.overall === "due_soon" ? "font-medium text-warn" : "text-muted")}>
                {next.dueKind === "none" ? countdown(next) : `${dueLabel(next)} · ${countdown(next)}`}
              </span>
            </>
          ) : (
            <span className="text-sm text-muted">{ev.overall === "closed" ? "Closed" : "No open deadlines"}</span>
          )}
        </span>
        <span className="row-start-1 col-start-2 justify-self-end sm:row-start-auto sm:col-start-auto sm:justify-self-start">
          <OverallBadge overall={ev.overall} />
        </span>
        <ChevronRight className="hidden h-4 w-4 text-faint group-hover:text-ink sm:block" aria-hidden />
      </Link>
    </li>
  );
}

export function CaseListHeader() {
  return (
    <div className="hidden grid-cols-[110px_minmax(0,1.3fr)_minmax(0,1fr)_140px_20px] gap-3 border-b border-line px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted sm:grid">
      <span>Ref</span>
      <span>Home</span>
      <span>Next deadline</span>
      <span>Status</span>
      <span />
    </div>
  );
}

const RANK: Record<string, number> = { overdue: 0, due_today: 1, due_soon: 2, on_track: 3, waiting: 4, not_in_scope: 5, closed: 6 };

/** Most urgent first; within a band, the soonest deadline first. */
export function sortByUrgency(items: CaseListItem[]): CaseListItem[] {
  const due = (i: CaseListItem) => {
    const d = i.evaluation.nextDuty;
    if (!d) return Number.POSITIVE_INFINITY;
    if (d.dueAt) return d.dueAt.getTime();
    if (d.status === "extended" && d.delay) return Date.parse(`${d.delay.revisedDate}T23:59:59Z`);
    if (d.dueDate) return Date.parse(`${d.dueDate}T23:59:59Z`);
    return Number.POSITIVE_INFINITY;
  };
  return [...items].sort((a, b) => (RANK[a.evaluation.overall] ?? 9) - (RANK[b.evaluation.overall] ?? 9) || due(a) - due(b));
}
