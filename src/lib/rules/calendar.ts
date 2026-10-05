/**
 * Calendar helpers for statutory working-day arithmetic.
 *
 * All "calendar dates" are ISO strings (YYYY-MM-DD) in UK local time (Europe/London).
 * Instants (Date objects) are converted to London dates before counting.
 */
import { holidayName, type Region } from "./bank-holidays";

export const LONDON_TZ = "Europe/London";

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LONDON_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** The UK calendar date (Europe/London) on which an instant falls. */
export function londonDateOf(instant: Date): string {
  return isoFormatter.format(instant);
}

/** Wall-clock parts of an instant in Europe/London. */
export function londonParts(instant: Date) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset (minutes) of Europe/London from UTC at a given instant (0 in winter, 60 in summer). */
function londonOffsetMinutes(instant: Date): number {
  const p = londonParts(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/**
 * Convert a London wall-clock date + time (e.g. from a form) to an instant.
 * During the autumn DST overlap the earlier instant is returned; times in the spring gap
 * are moved forward by an hour, matching how most UK systems behave.
 */
export function fromLondonLocal(dateIso: string, time = "00:00"): Date {
  if (!isIsoDate(dateIso)) throw new Error(`Invalid date: ${dateIso}`);
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh || 0, mm || 0, 0);
  // Try the two candidate offsets and keep the one that round-trips.
  for (const offset of [60, 0]) {
    const candidate = new Date(naive - offset * 60000);
    if (londonOffsetMinutes(candidate) === offset) {
      const p = londonParts(candidate);
      if (p.hour === (hh || 0) && p.minute === (mm || 0)) return candidate;
    }
  }
  // Spring-forward gap: the local time does not exist; move forward one hour.
  return new Date(naive - 0 * 60000);
}

export function dayOfWeek(dateIso: string): number {
  const [y, m, d] = dateIso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addCalendarDays(dateIso: string, days: number): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(
    t.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function isWeekend(dateIso: string): boolean {
  const w = dayOfWeek(dateIso);
  return w === 0 || w === 6;
}

export function isWorkingDay(dateIso: string, region: Region): boolean {
  return !isWeekend(dateIso) && holidayName(region, dateIso) === null;
}

/**
 * The date on which a period of `n` working days ends, where the period begins with the
 * day *after* `startIso` (the statutory formula used by both SSI 2026/173 and the English
 * Hazards in Social Housing Regulations: "beginning with the day after the day on which…").
 */
export function addWorkingDays(startIso: string, n: number, region: Region): string {
  if (!Number.isInteger(n) || n < 1) throw new Error("n must be a positive integer");
  let cursor = startIso;
  let counted = 0;
  // Guard against infinite loops on bad input.
  for (let i = 0; i < 4000; i++) {
    cursor = addCalendarDays(cursor, 1);
    if (isWorkingDay(cursor, region)) {
      counted += 1;
      if (counted === n) return cursor;
    }
  }
  throw new Error("Working-day calculation did not converge");
}

/**
 * Number of working days in the half-open interval (fromIso, toIso].
 * Returns a negative count when `toIso` is before `fromIso`.
 */
export function workingDaysBetween(fromIso: string, toIso: string, region: Region): number {
  const cmp = compareIso(fromIso, toIso);
  if (cmp === 0) return 0;
  if (cmp > 0) return -workingDaysBetween(toIso, fromIso, region);
  let cursor = fromIso;
  let count = 0;
  for (let i = 0; i < 4000 && cursor !== toIso; i++) {
    cursor = addCalendarDays(cursor, 1);
    if (isWorkingDay(cursor, region)) count += 1;
  }
  return count;
}

/** Holidays (name by date) that fall strictly inside (fromIso, toIso]. */
export function holidaysInRange(
  fromIso: string,
  toIso: string,
  region: Region,
): Array<{ date: string; name: string }> {
  const out: Array<{ date: string; name: string }> = [];
  let cursor = fromIso;
  for (let i = 0; i < 4000 && compareIso(cursor, toIso) < 0; i++) {
    cursor = addCalendarDays(cursor, 1);
    const name = holidayName(region, cursor);
    if (name && !isWeekend(cursor)) out.push({ date: cursor, name });
  }
  return out;
}

const longDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "Tue 20 Oct 2026" for an ISO calendar date. */
export function formatIsoDate(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return longDate.format(new Date(Date.UTC(y, m - 1, d)));
}

const fullDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "Tuesday 20 October 2026" for letters. */
export function formatIsoDateLong(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  return fullDate.format(new Date(Date.UTC(y, m - 1, d)));
}

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON_TZ,
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "Tue 20 Oct 2026, 14:05" in UK time. */
export function formatInstant(instant: Date): string {
  return dateTimeFmt.format(instant);
}
