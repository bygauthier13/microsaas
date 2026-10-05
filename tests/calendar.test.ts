import { describe, expect, it } from "vitest";
import {
  addWorkingDays,
  formatIsoDate,
  fromLondonLocal,
  holidaysInRange,
  isWorkingDay,
  londonDateOf,
  workingDaysBetween,
} from "@/lib/rules/calendar";
import { OFFICIAL_HOLIDAYS, generatedHolidays, easterSunday } from "@/lib/rules/bank-holidays";

describe("bank holidays", () => {
  it("includes Scotland-only holidays", () => {
    expect(isWorkingDay("2026-11-30", "scotland")).toBe(false); // St Andrew's Day
    expect(isWorkingDay("2026-11-30", "england-and-wales")).toBe(true);
    expect(isWorkingDay("2026-08-03", "scotland")).toBe(false); // Scottish summer holiday
    expect(isWorkingDay("2026-08-31", "scotland")).toBe(true); // English summer holiday
    expect(isWorkingDay("2026-06-15", "scotland")).toBe(false); // World Cup bank holiday
    expect(isWorkingDay("2026-04-06", "scotland")).toBe(true); // no Easter Monday in Scotland
    expect(isWorkingDay("2026-04-06", "england-and-wales")).toBe(false);
  });

  it("generator reproduces the official GOV.UK dates for every published year", () => {
    for (const region of ["scotland", "england-and-wales"] as const) {
      for (const year of [2025, 2026, 2027, 2028]) {
        const official = Object.keys(OFFICIAL_HOLIDAYS[region])
          .filter((d) => d.startsWith(`${year}-`))
          // one-off holidays the generator cannot know about
          .filter((d) => d !== "2026-06-15");
        const generated = Object.keys(generatedHolidays(region, year)).sort();
        expect(generated).toEqual(official.sort());
      }
    }
  });

  it("computes Easter correctly", () => {
    expect(easterSunday(2026)).toEqual({ month: 4, day: 5 });
    expect(easterSunday(2027)).toEqual({ month: 3, day: 28 });
    expect(easterSunday(2029)).toEqual({ month: 4, day: 1 });
  });
});

describe("working days", () => {
  it("counts from the day after the trigger (SSI 2026/173 formula)", () => {
    // Aware Tue 6 Oct 2026 (commencement day) → 10th working day is Tue 20 Oct.
    expect(addWorkingDays("2026-10-06", 10, "scotland")).toBe("2026-10-20");
    // 3 working days after an investigation on Fri 16 Oct → Wed 21 Oct.
    expect(addWorkingDays("2026-10-16", 3, "scotland")).toBe("2026-10-21");
  });

  it("skips weekends when the trigger falls on a Saturday", () => {
    // Aware Sat 10 Oct → WD1 is Mon 12 Oct → WD10 is Fri 23 Oct.
    expect(addWorkingDays("2026-10-10", 10, "scotland")).toBe("2026-10-23");
  });

  it("skips St Andrew's Day in Scotland but not in England", () => {
    expect(addWorkingDays("2026-11-20", 10, "scotland")).toBe("2026-12-07");
    expect(addWorkingDays("2026-11-20", 10, "england-and-wales")).toBe("2026-12-04");
    expect(holidaysInRange("2026-11-20", "2026-12-07", "scotland")).toEqual([
      { date: "2026-11-30", name: "St Andrew’s Day" },
    ]);
  });

  it("handles the Christmas / New Year cluster in Scotland", () => {
    // Fri 18 Dec 2026: holidays 25 Dec, 28 Dec, 1 Jan, 4 Jan (2nd Jan substitute).
    // WD: 21,22,23,24 Dec (4), 29,30,31 Dec (7), 5,6,7 Jan (10)
    expect(addWorkingDays("2026-12-18", 10, "scotland")).toBe("2027-01-07");
    // England: no 4 Jan holiday → 21,22,23,24,29,30,31 Dec, 4,5,6 Jan
    expect(addWorkingDays("2026-12-18", 10, "england-and-wales")).toBe("2027-01-06");
  });

  it("workingDaysBetween is consistent with addWorkingDays", () => {
    const due = addWorkingDays("2026-12-18", 10, "scotland");
    expect(workingDaysBetween("2026-12-18", due, "scotland")).toBe(10);
    expect(workingDaysBetween(due, "2026-12-18", "scotland")).toBe(-10);
    expect(workingDaysBetween("2026-10-09", "2026-10-12", "scotland")).toBe(1); // Fri → Mon
  });
});

describe("London time handling", () => {
  it("maps instants to UK dates across BST", () => {
    // 23:30 UTC on 5 Oct 2026 is 00:30 BST on 6 Oct.
    expect(londonDateOf(new Date("2026-10-05T23:30:00Z"))).toBe("2026-10-06");
    // In winter, UTC == UK time.
    expect(londonDateOf(new Date("2026-11-30T23:30:00Z"))).toBe("2026-11-30");
  });

  it("parses UK wall-clock times", () => {
    expect(fromLondonLocal("2026-10-06", "09:00").toISOString()).toBe("2026-10-06T08:00:00.000Z");
    expect(fromLondonLocal("2026-12-01", "09:00").toISOString()).toBe("2026-12-01T09:00:00.000Z");
  });

  it("formats dates for humans", () => {
    expect(formatIsoDate("2026-10-20")).toBe("Tue 20 Oct 2026");
  });
});

describe("deterministic formatting", () => {
  it("formats long dates without locale-dependent punctuation", async () => {
    const { formatIsoDateLong, formatInstant, fromLondonLocal } = await import("@/lib/rules/calendar");
    expect(formatIsoDateLong("2026-10-20")).toBe("Tuesday 20 October 2026");
    expect(formatIsoDateLong("2027-01-01")).toBe("Friday 1 January 2027");
    // 14:05 BST on 20 Oct 2026 and 09:30 GMT on 7 Dec 2026, shown in UK time.
    expect(formatInstant(fromLondonLocal("2026-10-20", "14:05"))).toBe("Tue 20 Oct 2026, 14:05");
    expect(formatInstant(fromLondonLocal("2026-12-07", "09:30"))).toBe("Mon 7 Dec 2026, 09:30");
  });
});
