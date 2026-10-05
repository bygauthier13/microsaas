/**
 * UK bank holidays used to count statutory "working days".
 *
 * Source: https://www.gov.uk/bank-holidays.json (official GOV.UK feed), retrieved 5 Oct 2026.
 * The feed publishes dates up to the end of 2028. For later years we fall back to the
 * standard statutory pattern (see `generatedHolidays`) and flag the result as provisional.
 *
 * Note the one-off Scottish "World Cup bank holiday" on 15 June 2026 — a hand-maintained
 * list would easily miss this, which is exactly the kind of error that breaks a deadline.
 */

export type Region = "scotland" | "england-and-wales";

export const OFFICIAL_HOLIDAYS: Record<Region, Record<string, string>> = {
  "england-and-wales": {
    "2025-01-01": "New Year’s Day",
    "2025-04-18": "Good Friday",
    "2025-04-21": "Easter Monday",
    "2025-05-05": "Early May bank holiday",
    "2025-05-26": "Spring bank holiday",
    "2025-08-25": "Summer bank holiday",
    "2025-12-25": "Christmas Day",
    "2025-12-26": "Boxing Day",
    "2026-01-01": "New Year’s Day",
    "2026-04-03": "Good Friday",
    "2026-04-06": "Easter Monday",
    "2026-05-04": "Early May bank holiday",
    "2026-05-25": "Spring bank holiday",
    "2026-08-31": "Summer bank holiday",
    "2026-12-25": "Christmas Day",
    "2026-12-28": "Boxing Day (substitute day)",
    "2027-01-01": "New Year’s Day",
    "2027-03-26": "Good Friday",
    "2027-03-29": "Easter Monday",
    "2027-05-03": "Early May bank holiday",
    "2027-05-31": "Spring bank holiday",
    "2027-08-30": "Summer bank holiday",
    "2027-12-27": "Christmas Day (substitute day)",
    "2027-12-28": "Boxing Day (substitute day)",
    "2028-01-03": "New Year’s Day (substitute day)",
    "2028-04-14": "Good Friday",
    "2028-04-17": "Easter Monday",
    "2028-05-01": "Early May bank holiday",
    "2028-05-29": "Spring bank holiday",
    "2028-08-28": "Summer bank holiday",
    "2028-12-25": "Christmas Day",
    "2028-12-26": "Boxing Day",
  },
  scotland: {
    "2025-01-01": "New Year’s Day",
    "2025-01-02": "2nd January",
    "2025-04-18": "Good Friday",
    "2025-05-05": "Early May bank holiday",
    "2025-05-26": "Spring bank holiday",
    "2025-08-04": "Summer bank holiday",
    "2025-12-01": "St Andrew’s Day (substitute day)",
    "2025-12-25": "Christmas Day",
    "2025-12-26": "Boxing Day",
    "2026-01-01": "New Year’s Day",
    "2026-01-02": "2nd January",
    "2026-04-03": "Good Friday",
    "2026-05-04": "Early May bank holiday",
    "2026-05-25": "Spring bank holiday",
    "2026-06-15": "World Cup bank holiday",
    "2026-08-03": "Summer bank holiday",
    "2026-11-30": "St Andrew’s Day",
    "2026-12-25": "Christmas Day",
    "2026-12-28": "Boxing Day (substitute day)",
    "2027-01-01": "New Year’s Day",
    "2027-01-04": "2nd January (substitute day)",
    "2027-03-26": "Good Friday",
    "2027-05-03": "Early May bank holiday",
    "2027-05-31": "Spring bank holiday",
    "2027-08-02": "Summer bank holiday",
    "2027-11-30": "St Andrew’s Day",
    "2027-12-27": "Christmas Day (substitute day)",
    "2027-12-28": "Boxing Day (substitute day)",
    "2028-01-03": "New Year’s Day (substitute day)",
    "2028-01-04": "2nd January (substitute day)",
    "2028-04-14": "Good Friday",
    "2028-05-01": "Early May bank holiday",
    "2028-05-29": "Spring bank holiday",
    "2028-08-07": "Summer bank holiday",
    "2028-11-30": "St Andrew’s Day",
    "2028-12-25": "Christmas Day",
    "2028-12-26": "Boxing Day",
  },
};

/** First and last years covered by the official feed. */
export const OFFICIAL_FIRST_YEAR = 2025;
export const OFFICIAL_LAST_YEAR = 2028;

// ---------------------------------------------------------------------------
// Fallback generator for years outside the official feed.
// ---------------------------------------------------------------------------

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Day of week for a calendar date (0 = Sunday), computed in UTC so it is TZ-independent. */
function dow(y: number, m: number, d: number): number {
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Anonymous Gregorian algorithm (Meeus/Jones/Butcher) for Easter Sunday. */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function addDaysIso(y: number, m: number, d: number, delta: number): string {
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function firstMonday(y: number, m: number): number {
  for (let d = 1; d <= 7; d++) if (dow(y, m, d) === 1) return d;
  return 1;
}

function lastMonday(y: number, m: number): number {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = last; d > last - 7; d--) if (dow(y, m, d) === 1) return d;
  return last;
}

/**
 * Standard statutory pattern. Substitute days: a holiday falling at a weekend moves to the
 * next weekday not already a holiday (this reproduces GOV.UK's published substitutes).
 */
export function generatedHolidays(region: Region, year: number): Record<string, string> {
  const out: Record<string, string> = {};
  const taken = new Set<string>();

  const place = (m: number, d: number, name: string) => {
    let dateIso = iso(year, m, d);
    let wd = dow(year, m, d);
    let shift = 0;
    let substituted = false;
    while (wd === 0 || wd === 6 || taken.has(dateIso)) {
      shift += 1;
      dateIso = addDaysIso(year, m, d, shift);
      wd = (dow(year, m, d) + shift) % 7;
      substituted = true;
    }
    taken.add(dateIso);
    out[dateIso] = substituted ? `${name} (substitute day)` : name;
  };

  place(1, 1, "New Year’s Day");
  if (region === "scotland") place(1, 2, "2nd January");

  const easter = easterSunday(year);
  const goodFriday = addDaysIso(year, easter.month, easter.day, -2);
  out[goodFriday] = "Good Friday";
  taken.add(goodFriday);
  if (region === "england-and-wales") {
    const easterMonday = addDaysIso(year, easter.month, easter.day, 1);
    out[easterMonday] = "Easter Monday";
    taken.add(easterMonday);
  }

  const em = iso(year, 5, firstMonday(year, 5));
  out[em] = "Early May bank holiday";
  taken.add(em);
  const spring = iso(year, 5, lastMonday(year, 5));
  out[spring] = "Spring bank holiday";
  taken.add(spring);
  const summer =
    region === "scotland" ? iso(year, 8, firstMonday(year, 8)) : iso(year, 8, lastMonday(year, 8));
  out[summer] = "Summer bank holiday";
  taken.add(summer);

  if (region === "scotland") place(11, 30, "St Andrew’s Day");
  place(12, 25, "Christmas Day");
  place(12, 26, "Boxing Day");
  return out;
}

const generatedCache = new Map<string, Record<string, string>>();

export function holidaysForYear(region: Region, year: number): Record<string, string> {
  if (year >= OFFICIAL_FIRST_YEAR && year <= OFFICIAL_LAST_YEAR) {
    const all = OFFICIAL_HOLIDAYS[region];
    const prefix = `${year}-`;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(all)) if (k.startsWith(prefix)) out[k] = v;
    return out;
  }
  const key = `${region}:${year}`;
  let cached = generatedCache.get(key);
  if (!cached) {
    cached = generatedHolidays(region, year);
    generatedCache.set(key, cached);
  }
  return cached;
}

export function holidayName(region: Region, isoDate: string): string | null {
  const year = Number(isoDate.slice(0, 4));
  return holidaysForYear(region, year)[isoDate] ?? null;
}

export function isProvisionalYear(year: number): boolean {
  return year < OFFICIAL_FIRST_YEAR || year > OFFICIAL_LAST_YEAR;
}
