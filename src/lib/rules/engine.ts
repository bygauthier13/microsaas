/**
 * Statutory deadline engine.
 *
 * Pure functions: given the facts of a case and "now", work out which legal regime applies,
 * every duty's deadline, and its status. No I/O — used by the server, the free public
 * calculator and the unit tests alike.
 *
 * Legal sources (summarised in plain English in the UI):
 *  - Scotland private: Housing (Scotland) Act 2006 s14(5)–(10), inserted by SSI 2026/173 reg 3(3).
 *  - Scotland social: Scottish Secure Tenants (Right to Repair) Regulations 2002 reg 8A & reg 12,
 *    inserted by SSI 2026/173 reg 4.
 *  - England social: Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025.
 */
import type { Region } from "./bank-holidays";
import {
  addCalendarDays,
  addWorkingDays,
  compareIso,
  formatIsoDate,
  holidaysInRange,
  londonDateOf,
  workingDaysBetween,
} from "./calendar";
import {
  ENGLAND_PHASE_1,
  SCOTLAND_COMMENCEMENT,
  englandPhaseLabel,
  englandSignificantFrom,
  type HazardKey,
  type Jurisdiction,
  type Sector,
} from "./hazards";

export type DutyKey =
  | "investigate"
  | "investigate_24h"
  | "written_summary"
  | "commence_repair"
  | "complete_repair"
  | "safety_work"
  | "supplementary_steps"
  | "supplementary_start";

export type RegimeId =
  | "scotland_private"
  | "scotland_social"
  | "england_social"
  | "england_private_benchmark"
  | "out_of_scope";

export type DutyStatus =
  | "waiting"
  | "not_required"
  | "open"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "met"
  | "met_late"
  | "extended"
  | "extended_overdue";

export type Triage = "emergency" | "significant";

export interface DelayRecord {
  duty: DutyKey;
  noticeIssuedAt: Date;
  reason: string;
  /** ISO date by which the landlord now expects to comply. */
  revisedDate: string;
}

export interface CaseFacts {
  jurisdiction: Jurisdiction;
  sector: Sector;
  hazard: HazardKey;
  /** England only: initial triage of the report. */
  triage?: Triage;
  awareAt: Date;
  investigationCompletedAt?: Date | null;
  /**
   * Investigation outcome. Scotland: true when the home is NOT substantially free from damp
   * and mould (repair work required). England: true when a significant/emergency hazard is confirmed.
   */
  hazardFound?: boolean | null;
  /** England: the severity the investigation confirmed. */
  foundSeverity?: Triage | null;
  summaryIssuedAt?: Date | null;
  /** Scotland: repair work commenced. England: supplementary preventative work physically begun. */
  repairCommencedAt?: Date | null;
  /** England: relevant safety work ("make safe") completed. */
  safetyWorkCompletedAt?: Date | null;
  /** England: steps taken to begin supplementary preventative work. */
  supplementaryStepsAt?: Date | null;
  /** England: does the hazard need supplementary preventative work? */
  supplementaryRequired?: boolean | null;
  repairCompletedAt?: Date | null;
  /** Scotland private: landlord's own target for completion ("reasonable time"). */
  repairTargetDate?: string | null;
  delays?: DelayRecord[];
  closed?: boolean;
}

export interface DutyResult {
  key: DutyKey;
  label: string;
  shortLabel: string;
  window: string;
  basis: string;
  trigger: string;
  dueKind: "date" | "datetime" | "reasonable" | "none";
  dueDate?: string;
  dueAt?: Date;
  completedAt?: Date | null;
  status: DutyStatus;
  workingDaysLeft?: number;
  hoursLeft?: number;
  workingDaysLate?: number;
  hoursLate?: number;
  delay?: {
    revisedDate: string;
    reason: string;
    noticeIssuedAt: Date;
    legallyExtends: boolean;
    issuedAfterDeadline: boolean;
  };
  holidaysInWindow?: Array<{ date: string; name: string }>;
  note?: string;
}

export interface CaseEvaluation {
  regime: RegimeId;
  regimeLabel: string;
  inForce: boolean;
  scopeNote?: string;
  region: Region;
  duties: DutyResult[];
  nextDuty?: DutyResult;
  overall: "closed" | "overdue" | "due_today" | "due_soon" | "on_track" | "waiting" | "not_in_scope";
  compensation?: { investigation: number; commencement: number; total: number };
  alternativeAccommodation: boolean;
  warnings: string[];
}

export const DUE_SOON_WORKING_DAYS = 2;
export const DUE_SOON_HOURS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

export function regionFor(jurisdiction: Jurisdiction): Region {
  return jurisdiction === "scotland" ? "scotland" : "england-and-wales";
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

interface DateDutyInput {
  dueDate: string;
  completedAt?: Date | null;
  todayIso: string;
  region: Region;
  delay?: DelayRecord;
  delayLegallyExtends?: boolean;
}

function dateDutyStatus(input: DateDutyInput): Pick<
  DutyResult,
  "status" | "workingDaysLeft" | "workingDaysLate" | "delay"
> {
  const { dueDate, completedAt, todayIso, region, delay } = input;
  const legallyExtends = Boolean(delay && input.delayLegallyExtends);
  const delayInfo = delay
    ? {
        revisedDate: delay.revisedDate,
        reason: delay.reason,
        noticeIssuedAt: delay.noticeIssuedAt,
        legallyExtends,
        issuedAfterDeadline: compareIso(londonDateOf(delay.noticeIssuedAt), dueDate) > 0,
      }
    : undefined;

  if (completedAt) {
    const doneIso = londonDateOf(completedAt);
    if (compareIso(doneIso, dueDate) <= 0) return { status: "met", delay: delayInfo };
    if (legallyExtends && delay && compareIso(doneIso, delay.revisedDate) <= 0) {
      return { status: "met", delay: delayInfo };
    }
    return {
      status: "met_late",
      workingDaysLate: workingDaysBetween(dueDate, doneIso, region),
      delay: delayInfo,
    };
  }

  const cmp = compareIso(todayIso, dueDate);
  if (cmp === 0) return { status: "due_today", workingDaysLeft: 0, delay: delayInfo };
  if (cmp < 0) {
    const left = workingDaysBetween(todayIso, dueDate, region);
    return {
      status: left <= DUE_SOON_WORKING_DAYS ? "due_soon" : "open",
      workingDaysLeft: left,
      delay: delayInfo,
    };
  }
  const late = workingDaysBetween(dueDate, todayIso, region);
  if (legallyExtends && delay) {
    if (compareIso(todayIso, delay.revisedDate) <= 0) {
      return { status: "extended", workingDaysLate: late, delay: delayInfo };
    }
    return { status: "extended_overdue", workingDaysLate: late, delay: delayInfo };
  }
  return { status: "overdue", workingDaysLate: late, delay: delayInfo };
}

function datetimeDutyStatus(
  dueAt: Date,
  completedAt: Date | null | undefined,
  now: Date,
): Pick<DutyResult, "status" | "hoursLeft" | "hoursLate"> {
  if (completedAt) {
    if (completedAt.getTime() <= dueAt.getTime()) return { status: "met" };
    return {
      status: "met_late",
      hoursLate: Math.ceil((completedAt.getTime() - dueAt.getTime()) / 3_600_000),
    };
  }
  const diffH = (dueAt.getTime() - now.getTime()) / 3_600_000;
  if (diffH < 0) return { status: "overdue", hoursLate: Math.ceil(-diffH) };
  return { status: diffH <= DUE_SOON_HOURS ? "due_soon" : "open", hoursLeft: Math.floor(diffH) };
}

function findDelay(delays: DelayRecord[] | undefined, duty: DutyKey): DelayRecord | undefined {
  if (!delays?.length) return undefined;
  // The most recent notice for the duty wins.
  return [...delays]
    .filter((d) => d.duty === duty)
    .sort((a, b) => b.noticeIssuedAt.getTime() - a.noticeIssuedAt.getTime())[0];
}

const OPEN_STATUSES: DutyStatus[] = [
  "open",
  "due_soon",
  "due_today",
  "overdue",
  "extended",
  "extended_overdue",
];

export function isOpenStatus(status: DutyStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

/** Sort key: the instant a duty falls due (end of day for date duties). */
function dueInstant(d: DutyResult): number {
  if (d.dueAt) return d.dueAt.getTime();
  if (d.delay?.legallyExtends && d.delay.revisedDate && d.status === "extended") {
    return Date.parse(`${d.delay.revisedDate}T23:59:59Z`);
  }
  if (d.dueDate) return Date.parse(`${d.dueDate}T23:59:59Z`);
  return Number.POSITIVE_INFINITY;
}

const STATUS_WEIGHT: Record<DutyStatus, number> = {
  overdue: 0,
  extended_overdue: 0,
  due_today: 1,
  due_soon: 2,
  open: 3,
  extended: 3,
  waiting: 4,
  met_late: 5,
  met: 6,
  not_required: 7,
};

function summarise(duties: DutyResult[], closed: boolean): CaseEvaluation["overall"] {
  if (closed) return "closed";
  if (duties.some((d) => d.status === "overdue" || d.status === "extended_overdue")) return "overdue";
  if (duties.some((d) => d.status === "due_today")) return "due_today";
  if (duties.some((d) => d.status === "due_soon")) return "due_soon";
  if (duties.some((d) => d.status === "open" || d.status === "extended")) return "on_track";
  return "waiting";
}

function pickNext(duties: DutyResult[]): DutyResult | undefined {
  return duties
    .filter((d) => isOpenStatus(d.status))
    .sort((a, b) => STATUS_WEIGHT[a.status] - STATUS_WEIGHT[b.status] || dueInstant(a) - dueInstant(b))[0];
}

// ---------------------------------------------------------------------------
// Scotland
// ---------------------------------------------------------------------------

function scotlandCompensation(duty: DutyResult, todayIso: string, region: Region): number {
  // SSI 2026/173 reg 4(7): £15 + £3 per working day late, max £100, unless the period was suspended.
  if (duty.dueKind !== "date" || !duty.dueDate) return 0;
  if (duty.delay?.legallyExtends) return 0;
  if (duty.status !== "met_late" && duty.status !== "overdue") return 0;
  const endIso = duty.completedAt ? londonDateOf(duty.completedAt) : todayIso;
  const late = Math.max(0, workingDaysBetween(duty.dueDate, endIso, region));
  if (late <= 0) return 0;
  return Math.min(100, 15 + 3 * late);
}

function evaluateScotland(facts: CaseFacts, now: Date): CaseEvaluation {
  const region: Region = "scotland";
  const social = facts.sector === "social";
  const regime: RegimeId = social ? "scotland_social" : "scotland_private";
  const regimeLabel = social
    ? "Scotland · social housing (Right to Repair Scheme)"
    : "Scotland · private rented (Repairing Standard)";
  const warnings: string[] = [];
  const todayIso = londonDateOf(now);
  const awareIso = londonDateOf(facts.awareAt);

  if (facts.hazard !== "damp_mould") {
    return {
      regime: "out_of_scope",
      regimeLabel: "Scotland · outside the 2026 damp and mould Regulations",
      inForce: false,
      scopeNote:
        "Scotland's 2026 Regulations cover damp and mould only. Handle this repair under the Repairing Standard / Right to Repair timescales and your own repair policy.",
      region,
      duties: [],
      overall: facts.closed ? "closed" : "not_in_scope",
      alternativeAccommodation: false,
      warnings,
    };
  }

  const inForce = compareIso(awareIso, SCOTLAND_COMMENCEMENT) >= 0;
  const scopeNote = inForce
    ? undefined
    : "Reported before 6 October 2026, so the statutory timescales do not apply. RepairClock still tracks the same timescales as good practice.";

  const basisPrefix = social
    ? "Right to Repair Regs 2002 reg 8A (inserted by SSI 2026/173)"
    : "Housing (Scotland) Act 2006 s14 (as amended by SSI 2026/173)";

  const duties: DutyResult[] = [];

  // 1. Investigation — 10 working days from the day after awareness.
  const invDue = addWorkingDays(awareIso, 10, region);
  const invDelay = findDelay(facts.delays, "investigate");
  duties.push({
    key: "investigate",
    label: "Investigation by a competent person",
    shortLabel: "Investigate",
    window: "10 working days",
    basis: social ? `${basisPrefix}(3)` : `${basisPrefix}(6)`,
    trigger: `Counted from the day after you became aware (${formatIsoDate(awareIso)}).`,
    dueKind: "date",
    dueDate: invDue,
    completedAt: facts.investigationCompletedAt ?? null,
    holidaysInWindow: holidaysInRange(awareIso, invDue, region),
    ...dateDutyStatus({
      dueDate: invDue,
      completedAt: facts.investigationCompletedAt,
      todayIso,
      region,
      delay: invDelay,
      delayLegallyExtends: true,
    }),
  });

  const invIso = facts.investigationCompletedAt ? londonDateOf(facts.investigationCompletedAt) : null;

  // 2. Written summary — 3 working days after the investigation is completed.
  if (invIso) {
    const due = addWorkingDays(invIso, 3, region);
    duties.push({
      key: "written_summary",
      label: "Written summary of findings to the tenant",
      shortLabel: "Written summary",
      window: "3 working days",
      basis: social ? `${basisPrefix}(4)` : `${basisPrefix}(7)`,
      trigger: `Counted from the day after the investigation concluded (${formatIsoDate(invIso)}).`,
      dueKind: "date",
      dueDate: due,
      completedAt: facts.summaryIssuedAt ?? null,
      holidaysInWindow: holidaysInRange(invIso, due, region),
      ...dateDutyStatus({ dueDate: due, completedAt: facts.summaryIssuedAt, todayIso, region }),
      note: "The deadline is about when you issue the summary, not when the tenant receives it.",
    });
  } else {
    duties.push({
      key: "written_summary",
      label: "Written summary of findings to the tenant",
      shortLabel: "Written summary",
      window: "3 working days",
      basis: social ? `${basisPrefix}(4)` : `${basisPrefix}(7)`,
      trigger: "Starts when the investigation is completed.",
      dueKind: "none",
      status: "waiting",
      completedAt: facts.summaryIssuedAt ?? null,
    });
  }

  // 3. Commence repair — 5 working days after the investigation, if substantial damp/mould.
  const commenceBase: Omit<DutyResult, "status" | "dueKind"> = {
    key: "commence_repair",
    label: "Start repair work (if substantial damp or mould)",
    shortLabel: "Start repairs",
    window: "5 working days",
    basis: social ? `${basisPrefix}(5)` : `${basisPrefix}(8)`,
    trigger: "Counted from the day after the investigation concluded.",
    completedAt: facts.repairCommencedAt ?? null,
  };
  if (!invIso) {
    duties.push({ ...commenceBase, dueKind: "none", status: "waiting", trigger: "Starts when the investigation is completed." });
  } else if (facts.hazardFound === false) {
    duties.push({
      ...commenceBase,
      dueKind: "none",
      status: "not_required",
      note: "Investigation found the home substantially free from damp and mould.",
    });
  } else if (facts.hazardFound == null) {
    duties.push({
      ...commenceBase,
      dueKind: "none",
      status: "waiting",
      note: "Record whether the investigation found substantial damp or mould.",
    });
  } else {
    const due = addWorkingDays(invIso, 5, region);
    const delay = findDelay(facts.delays, "commence_repair");
    duties.push({
      ...commenceBase,
      dueKind: "date",
      dueDate: due,
      holidaysInWindow: holidaysInRange(invIso, due, region),
      ...dateDutyStatus({
        dueDate: due,
        completedAt: facts.repairCommencedAt,
        todayIso,
        region,
        delay,
        delayLegallyExtends: true,
      }),
      note: "Immediate mould treatment or temporary remedial work counts as commencing the repair, but the root cause must still be fixed.",
    });
  }

  // 4. Complete repair.
  const completeBase: Omit<DutyResult, "status" | "dueKind"> = {
    key: "complete_repair",
    label: social ? "Complete the repair" : "Complete the repair (as soon as reasonably practicable)",
    shortLabel: "Complete repair",
    window: social ? "20 working days" : "Reasonable time",
    basis: social
      ? "Right to Repair Regs 2002 Schedule (substantial damp or mould: 20 working days)"
      : "Housing (Scotland) Act 2006 s13–14; Scottish Government guidance para 6.4",
    trigger: social ? "Counted from the first working day after repairs start." : "No fixed statutory period for private landlords.",
    completedAt: facts.repairCompletedAt ?? null,
  };
  if (facts.hazardFound === false && invIso) {
    duties.push({ ...completeBase, dueKind: "none", status: "not_required" });
  } else if (social) {
    if (facts.repairCommencedAt) {
      const startIso = londonDateOf(facts.repairCommencedAt);
      const due = addWorkingDays(startIso, 20, region);
      duties.push({
        ...completeBase,
        dueKind: "date",
        dueDate: due,
        holidaysInWindow: holidaysInRange(startIso, due, region),
        ...dateDutyStatus({ dueDate: due, completedAt: facts.repairCompletedAt, todayIso, region }),
      });
    } else {
      duties.push({ ...completeBase, dueKind: "none", status: "waiting", trigger: "Starts when repair work begins." });
    }
  } else {
    // Private: "reasonable time". Track against the landlord's own target if set.
    if (facts.repairCompletedAt) {
      duties.push({ ...completeBase, dueKind: "reasonable", status: "met" });
    } else if (facts.hazardFound && facts.repairCommencedAt) {
      if (facts.repairTargetDate) {
        const st = dateDutyStatus({ dueDate: facts.repairTargetDate, todayIso, region });
        duties.push({
          ...completeBase,
          dueKind: "reasonable",
          dueDate: facts.repairTargetDate,
          status: st.status === "overdue" ? "overdue" : st.status,
          workingDaysLeft: st.workingDaysLeft,
          workingDaysLate: st.workingDaysLate,
          note: "Your own target date — not a statutory deadline, but missing it weakens a 'reasonable time' argument at tribunal.",
        });
      } else {
        duties.push({
          ...completeBase,
          dueKind: "reasonable",
          status: "open",
          note: "Set a target completion date so the tenant and tribunal can see a reasonable plan.",
        });
      }
    } else {
      duties.push({ ...completeBase, dueKind: "none", status: "waiting", trigger: "Starts when repair work begins." });
    }
  }

  // Exposure / warnings
  let compensation: CaseEvaluation["compensation"];
  if (social && inForce) {
    const inv = scotlandCompensation(duties.find((d) => d.key === "investigate")!, todayIso, region);
    const com = scotlandCompensation(duties.find((d) => d.key === "commence_repair")!, todayIso, region);
    compensation = { investigation: inv, commencement: com, total: inv + com };
  }
  for (const d of duties) {
    if (d.delay?.issuedAfterDeadline) {
      warnings.push(
        `The delay notice for "${d.shortLabel}" was issued after the original deadline. Notices should go out as soon as you know a timescale can't be met.`,
      );
    }
  }
  if (!inForce) for (const d of duties) d.note = d.note ?? "Good-practice timescale (not statutory for this report).";

  const closed = Boolean(facts.closed);
  return {
    regime,
    regimeLabel,
    inForce,
    scopeNote,
    region,
    duties,
    nextDuty: closed ? undefined : pickNext(duties),
    overall: summarise(duties, closed),
    compensation,
    alternativeAccommodation: false,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// England
// ---------------------------------------------------------------------------

function evaluateEngland(facts: CaseFacts, now: Date): CaseEvaluation {
  const region: Region = "england-and-wales";
  const todayIso = londonDateOf(now);
  const awareIso = londonDateOf(facts.awareAt);
  const triage: Triage = facts.triage ?? "significant";
  const privateSector = facts.sector === "private";
  const warnings: string[] = [];

  let inForce: boolean;
  let scopeNote: string | undefined;
  if (privateSector) {
    inForce = false;
    scopeNote =
      "Awaab's Law does not yet apply to private landlords in England (an extension is planned under the Renters' Rights Act 2025). These are the social-housing timescales, tracked as a best-practice benchmark.";
  } else if (triage === "emergency") {
    inForce = compareIso(awareIso, ENGLAND_PHASE_1) >= 0;
    if (!inForce) scopeNote = "Reported before Awaab's Law commenced (27 October 2025). Tracked as good practice.";
  } else {
    const from = englandSignificantFrom(facts.hazard);
    inForce = from !== null && compareIso(awareIso, from) >= 0;
    if (!inForce) {
      scopeNote =
        from === null
          ? `Significant ${englandPhaseLabel(facts.hazard).toLowerCase()} hazards are not yet covered by Awaab's Law. Emergency hazards of any type are already covered. Tracked as good practice.`
          : `Significant hazards of this type are covered from ${formatIsoDate(from)} (${englandPhaseLabel(facts.hazard)}). This report predates that, so it is tracked as good practice.`;
    }
  }

  const basis = "Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025";
  const duties: DutyResult[] = [];
  const invIso = facts.investigationCompletedAt ? londonDateOf(facts.investigationCompletedAt) : null;

  // 1. Investigation.
  if (triage === "emergency") {
    const dueAt = new Date(facts.awareAt.getTime() + DAY_MS);
    duties.push({
      key: "investigate_24h",
      label: "Emergency investigation",
      shortLabel: "Investigate (24h)",
      window: "24 hours",
      basis: `${basis}, Part 3 (emergency action)`,
      trigger: "Runs from the moment you became aware.",
      dueKind: "datetime",
      dueAt,
      completedAt: facts.investigationCompletedAt ?? null,
      ...datetimeDutyStatus(dueAt, facts.investigationCompletedAt, now),
    });
  } else {
    const due = addWorkingDays(awareIso, 10, region);
    duties.push({
      key: "investigate",
      label: "Investigation by a competent person",
      shortLabel: "Investigate",
      window: "10 working days",
      basis: `${basis}, reg 5 (standard investigation)`,
      trigger: `Day 1 is the day after you became aware (${formatIsoDate(awareIso)}).`,
      dueKind: "date",
      dueDate: due,
      completedAt: facts.investigationCompletedAt ?? null,
      holidaysInWindow: holidaysInRange(awareIso, due, region),
      ...dateDutyStatus({ dueDate: due, completedAt: facts.investigationCompletedAt, todayIso, region }),
    });
  }

  // 2. Relevant safety work ("make safe").
  const safetyBase = {
    key: "safety_work" as const,
    label: "Relevant safety work (make the home safe)",
    shortLabel: "Make safe",
    basis: `${basis}, Part 5`,
    completedAt: facts.safetyWorkCompletedAt ?? null,
  };
  let safetyDuty: DutyResult;
  if (triage === "emergency" && (facts.foundSeverity === "emergency" || !invIso)) {
    // Emergency: investigation AND safety work within 24 hours of awareness.
    const dueAt = new Date(facts.awareAt.getTime() + DAY_MS);
    safetyDuty = {
      ...safetyBase,
      window: "24 hours",
      trigger: "Runs from the moment you became aware.",
      dueKind: "datetime",
      dueAt,
      ...datetimeDutyStatus(dueAt, facts.safetyWorkCompletedAt, now),
    };
    if (invIso && facts.hazardFound === false) safetyDuty = { ...safetyDuty, status: "not_required", dueKind: "none" };
  } else if (!invIso) {
    safetyDuty = { ...safetyBase, window: "5 working days", trigger: "Starts when the investigation concludes.", dueKind: "none", status: "waiting" };
  } else if (facts.hazardFound === false) {
    safetyDuty = { ...safetyBase, window: "5 working days", trigger: "", dueKind: "none", status: "not_required", note: "No significant or emergency hazard found." };
  } else if (facts.hazardFound == null) {
    safetyDuty = { ...safetyBase, window: "5 working days", trigger: "", dueKind: "none", status: "waiting", note: "Record the investigation outcome." };
  } else if (facts.foundSeverity === "emergency") {
    const dueAt = new Date(facts.investigationCompletedAt!.getTime() + DAY_MS);
    safetyDuty = {
      ...safetyBase,
      window: "24 hours",
      trigger: "Within 24 hours of the investigation that identified the emergency hazard.",
      dueKind: "datetime",
      dueAt,
      ...datetimeDutyStatus(dueAt, facts.safetyWorkCompletedAt, now),
    };
  } else {
    const due = addWorkingDays(invIso, 5, region);
    safetyDuty = {
      ...safetyBase,
      window: "5 working days",
      trigger: `Day 1 is the day after the investigation concluded (${formatIsoDate(invIso)}).`,
      dueKind: "date",
      dueDate: due,
      holidaysInWindow: holidaysInRange(invIso, due, region),
      ...dateDutyStatus({ dueDate: due, completedAt: facts.safetyWorkCompletedAt, todayIso, region }),
    };
  }

  // 3. Written summary.
  let summaryDuty: DutyResult;
  if (invIso) {
    const due = addWorkingDays(invIso, 3, region);
    summaryDuty = {
      key: "written_summary",
      label: "Written summary of findings to the tenant",
      shortLabel: "Written summary",
      window: "3 working days",
      basis: `${basis}, Part 4`,
      trigger: `Day 1 is the day after the investigation concluded (${formatIsoDate(invIso)}).`,
      dueKind: "date",
      dueDate: due,
      completedAt: facts.summaryIssuedAt ?? null,
      holidaysInWindow: holidaysInRange(invIso, due, region),
      ...dateDutyStatus({ dueDate: due, completedAt: facts.summaryIssuedAt, todayIso, region }),
      note: "Not required if all works are fully completed within the 3 working days — but you must still tell the tenant.",
    };
  } else {
    summaryDuty = {
      key: "written_summary",
      label: "Written summary of findings to the tenant",
      shortLabel: "Written summary",
      window: "3 working days",
      basis: `${basis}, Part 4`,
      trigger: "Starts when the investigation concludes.",
      dueKind: "none",
      status: "waiting",
      completedAt: facts.summaryIssuedAt ?? null,
    };
  }

  duties.push(summaryDuty, safetyDuty);

  // 4–5. Supplementary preventative work.
  const suppApplies = Boolean(invIso && facts.hazardFound && facts.supplementaryRequired !== false);
  if (suppApplies && invIso) {
    const stepsDue = addWorkingDays(invIso, 5, region);
    duties.push({
      key: "supplementary_steps",
      label: "Begin, or take steps to begin, preventative work",
      shortLabel: "Preventative work: steps",
      window: "5 working days",
      basis: `${basis}, Part 5 (supplementary preventative work)`,
      trigger: "Day 1 is the day after the investigation concluded.",
      dueKind: "date",
      dueDate: stepsDue,
      completedAt: facts.supplementaryStepsAt ?? facts.repairCommencedAt ?? null,
      ...dateDutyStatus({
        dueDate: stepsDue,
        completedAt: facts.supplementaryStepsAt ?? facts.repairCommencedAt,
        todayIso,
        region,
      }),
      note: "Taking steps includes booking a specialist survey or securing contractors and materials.",
    });
    const startDue = addCalendarDays(invIso, 84);
    duties.push({
      key: "supplementary_start",
      label: "Physically begin preventative work",
      shortLabel: "Preventative work: start",
      window: "12 weeks",
      basis: `${basis}, Part 5 (backstop)`,
      trigger: "As soon as reasonably practicable, and within 12 weeks of the investigation.",
      dueKind: "date",
      dueDate: startDue,
      completedAt: facts.repairCommencedAt ?? null,
      ...dateDutyStatus({ dueDate: startDue, completedAt: facts.repairCommencedAt, todayIso, region }),
    });
  } else if (invIso && facts.hazardFound && facts.supplementaryRequired === false) {
    duties.push({
      key: "supplementary_steps",
      label: "Preventative work",
      shortLabel: "Preventative work",
      window: "—",
      basis: `${basis}, Part 5`,
      trigger: "",
      dueKind: "none",
      status: "not_required",
      note: "Recorded as not required to prevent recurrence.",
    });
  }

  const alternativeAccommodation =
    !facts.closed && (safetyDuty.status === "overdue" || safetyDuty.status === "extended_overdue");
  if (alternativeAccommodation) {
    warnings.push(
      "Safety work is overdue: social landlords must secure suitable alternative accommodation (at their expense) until the home is made safe, unless the tenant declines.",
    );
  }
  if (!inForce) for (const d of duties) d.note = d.note ?? "Good-practice timescale (not statutory for this report).";
  for (const d of duties) {
    if (d.delay) d.delay.legallyExtends = false;
  }
  for (const d of facts.delays ?? []) {
    const duty = duties.find((x) => x.key === d.duty);
    if (duty && !duty.delay) {
      duty.delay = {
        revisedDate: d.revisedDate,
        reason: d.reason,
        noticeIssuedAt: d.noticeIssuedAt,
        legallyExtends: false,
        issuedAfterDeadline: duty.dueDate ? compareIso(londonDateOf(d.noticeIssuedAt), duty.dueDate) > 0 : false,
      };
    }
  }

  const closed = Boolean(facts.closed);
  return {
    regime: privateSector ? "england_private_benchmark" : "england_social",
    regimeLabel: privateSector
      ? "England · private rented (benchmark — not yet in force)"
      : `England · social housing (Awaab's Law, ${triage === "emergency" ? "emergency hazard" : englandPhaseLabel(facts.hazard)})`,
    inForce,
    scopeNote,
    region,
    duties,
    nextDuty: closed ? undefined : pickNext(duties),
    overall: summarise(duties, closed),
    alternativeAccommodation,
    warnings,
  };
}

/** Evaluate a case. `now` is injectable for tests and for "as at" reporting. */
export function evaluateCase(facts: CaseFacts, now: Date = new Date()): CaseEvaluation {
  return facts.jurisdiction === "scotland" ? evaluateScotland(facts, now) : evaluateEngland(facts, now);
}

// ---------------------------------------------------------------------------
// Preview helper for the public calculator and landing page.
// ---------------------------------------------------------------------------

export interface TimelinePreview {
  region: Region;
  awareIso: string;
  investigateBy: string;
  investigationIso: string;
  summaryBy: string;
  repairsStartBy: string;
  socialCompleteBy?: string;
  holidays: Array<{ date: string; name: string }>;
}

/**
 * Worst-case timeline for a Scottish damp/mould report: if the investigation happens on its
 * last permitted day, when are the later duties due? Optionally pass the actual investigation date.
 */
export function previewScotlandTimeline(
  awareIso: string,
  opts: { investigationIso?: string; social?: boolean; repairsStartIso?: string } = {},
): TimelinePreview {
  const region: Region = "scotland";
  const investigateBy = addWorkingDays(awareIso, 10, region);
  const investigationIso = opts.investigationIso ?? investigateBy;
  const summaryBy = addWorkingDays(investigationIso, 3, region);
  const repairsStartBy = addWorkingDays(investigationIso, 5, region);
  const socialCompleteBy = opts.social
    ? addWorkingDays(opts.repairsStartIso ?? repairsStartBy, 20, region)
    : undefined;
  const end = socialCompleteBy ?? repairsStartBy;
  return {
    region,
    awareIso,
    investigateBy,
    investigationIso,
    summaryBy,
    repairsStartBy,
    socialCompleteBy,
    holidays: holidaysInRange(awareIso, end, region),
  };
}

export interface EnglandPreview {
  region: Region;
  awareIso: string;
  investigateBy: string;
  investigationIso: string;
  summaryBy: string;
  safetyWorkBy: string;
  preventativeStepsBy: string;
  preventativeStartBy: string;
  holidays: Array<{ date: string; name: string }>;
}

export function previewEnglandTimeline(
  awareIso: string,
  opts: { investigationIso?: string } = {},
): EnglandPreview {
  const region: Region = "england-and-wales";
  const investigateBy = addWorkingDays(awareIso, 10, region);
  const investigationIso = opts.investigationIso ?? investigateBy;
  const preventativeStartBy = addCalendarDays(investigationIso, 84);
  return {
    region,
    awareIso,
    investigateBy,
    investigationIso,
    summaryBy: addWorkingDays(investigationIso, 3, region),
    safetyWorkBy: addWorkingDays(investigationIso, 5, region),
    preventativeStepsBy: addWorkingDays(investigationIso, 5, region),
    preventativeStartBy,
    holidays: holidaysInRange(awareIso, addWorkingDays(investigationIso, 5, region), region),
  };
}
