import { describe, expect, it } from "vitest";
import { evaluateCase, previewScotlandTimeline, type CaseFacts } from "@/lib/rules/engine";
import { fromLondonLocal } from "@/lib/rules/calendar";

const at = (date: string, time = "10:00") => fromLondonLocal(date, time);

function scot(overrides: Partial<CaseFacts> = {}): CaseFacts {
  return {
    jurisdiction: "scotland",
    sector: "private",
    hazard: "damp_mould",
    awareAt: at("2026-10-06"),
    ...overrides,
  };
}

describe("Scotland — private rented", () => {
  it("starts the 10 working day investigation clock", () => {
    const ev = evaluateCase(scot(), at("2026-10-07"));
    expect(ev.regime).toBe("scotland_private");
    expect(ev.inForce).toBe(true);
    const inv = ev.duties.find((d) => d.key === "investigate")!;
    expect(inv.dueDate).toBe("2026-10-20");
    expect(inv.status).toBe("open");
    expect(inv.workingDaysLeft).toBe(9);
    expect(ev.duties.find((d) => d.key === "written_summary")!.status).toBe("waiting");
    expect(ev.overall).toBe("on_track");
  });

  it("flags due soon, due today and overdue", () => {
    expect(evaluateCase(scot(), at("2026-10-16")).duties[0].status).toBe("due_soon");
    expect(evaluateCase(scot(), at("2026-10-20")).duties[0].status).toBe("due_today");
    const late = evaluateCase(scot(), at("2026-10-22")).duties[0];
    expect(late.status).toBe("overdue");
    expect(late.workingDaysLate).toBe(2);
  });

  it("derives summary and repair deadlines from the investigation date", () => {
    const ev = evaluateCase(
      scot({ investigationCompletedAt: at("2026-10-14"), hazardFound: true }),
      at("2026-10-15"),
    );
    expect(ev.duties.find((d) => d.key === "investigate")!.status).toBe("met");
    expect(ev.duties.find((d) => d.key === "written_summary")!.dueDate).toBe("2026-10-19");
    expect(ev.duties.find((d) => d.key === "commence_repair")!.dueDate).toBe("2026-10-21");
    expect(ev.nextDuty?.key).toBe("written_summary");
  });

  it("does not require repairs when the home is substantially free from damp and mould", () => {
    const ev = evaluateCase(
      scot({ investigationCompletedAt: at("2026-10-14"), hazardFound: false }),
      at("2026-10-15"),
    );
    expect(ev.duties.find((d) => d.key === "commence_repair")!.status).toBe("not_required");
    expect(ev.duties.find((d) => d.key === "complete_repair")!.status).toBe("not_required");
  });

  it("treats a delay notice as extending the investigation period", () => {
    const facts = scot({
      delays: [
        {
          duty: "investigate",
          noticeIssuedAt: at("2026-10-15"),
          reason: "Specialist surveyor unavailable",
          revisedDate: "2026-10-30",
        },
      ],
    });
    const ev = evaluateCase(facts, at("2026-10-23"));
    const inv = ev.duties[0];
    expect(inv.status).toBe("extended");
    expect(inv.delay?.legallyExtends).toBe(true);
    expect(inv.delay?.issuedAfterDeadline).toBe(false);
    expect(evaluateCase(facts, at("2026-11-02")).duties[0].status).toBe("extended_overdue");
    // Completed within the revised period → met.
    const done = evaluateCase({ ...facts, investigationCompletedAt: at("2026-10-29") }, at("2026-11-02"));
    expect(done.duties[0].status).toBe("met");
  });

  it("warns when a delay notice is issued after the deadline", () => {
    const ev = evaluateCase(
      scot({
        delays: [{ duty: "investigate", noticeIssuedAt: at("2026-10-22"), reason: "x", revisedDate: "2026-10-30" }],
      }),
      at("2026-10-23"),
    );
    expect(ev.warnings.length).toBe(1);
  });

  it("does not apply statutory timescales to reports before 6 October 2026", () => {
    const ev = evaluateCase(scot({ awareAt: at("2026-10-05") }), at("2026-10-06"));
    expect(ev.inForce).toBe(false);
    expect(ev.scopeNote).toMatch(/before 6 October 2026/);
  });

  it("puts non-damp hazards out of scope in Scotland", () => {
    const ev = evaluateCase(scot({ hazard: "electrical" }), at("2026-10-07"));
    expect(ev.regime).toBe("out_of_scope");
    expect(ev.duties).toHaveLength(0);
  });

  it("uses the landlord's own target date for completion", () => {
    const ev = evaluateCase(
      scot({
        investigationCompletedAt: at("2026-10-14"),
        hazardFound: true,
        repairCommencedAt: at("2026-10-19"),
        repairTargetDate: "2026-11-13",
      }),
      at("2026-10-20"),
    );
    const complete = ev.duties.find((d) => d.key === "complete_repair")!;
    expect(complete.dueKind).toBe("reasonable");
    expect(complete.dueDate).toBe("2026-11-13");
    expect(complete.status).toBe("open");
  });
});

describe("Scotland — social housing", () => {
  it("sets a 20 working day completion period from commencement", () => {
    const ev = evaluateCase(
      scot({
        sector: "social",
        investigationCompletedAt: at("2026-10-14"),
        hazardFound: true,
        repairCommencedAt: at("2026-10-19"),
      }),
      at("2026-10-20"),
    );
    expect(ev.regime).toBe("scotland_social");
    // 19 Oct + 20 WD → 16 Nov 2026
    expect(ev.duties.find((d) => d.key === "complete_repair")!.dueDate).toBe("2026-11-16");
  });

  it("calculates Right to Repair compensation (£15 + £3/day, max £100)", () => {
    // Investigation due 20 Oct; completed 23 Oct = 3 WD late → £24
    const ev = evaluateCase(
      scot({ sector: "social", investigationCompletedAt: at("2026-10-23"), hazardFound: false }),
      at("2026-10-26"),
    );
    expect(ev.compensation?.investigation).toBe(24);
    // Still not investigated 40 WD after the deadline → capped at £100
    const capped = evaluateCase(scot({ sector: "social" }), at("2026-12-31"));
    expect(capped.compensation?.investigation).toBe(100);
  });

  it("does not charge compensation when the period was suspended", () => {
    const ev = evaluateCase(
      scot({
        sector: "social",
        investigationCompletedAt: at("2026-10-23"),
        hazardFound: false,
        delays: [{ duty: "investigate", noticeIssuedAt: at("2026-10-15"), reason: "No access", revisedDate: "2026-10-27" }],
      }),
      at("2026-10-26"),
    );
    expect(ev.compensation?.investigation).toBe(0);
  });
});

describe("England — social housing (Awaab's Law)", () => {
  const eng = (o: Partial<CaseFacts> = {}): CaseFacts => ({
    jurisdiction: "england",
    sector: "social",
    hazard: "damp_mould",
    triage: "significant",
    awareAt: at("2026-10-06"),
    ...o,
  });

  it("applies the 10 / 3 / 5 working-day and 12-week duties", () => {
    const ev = evaluateCase(
      eng({ investigationCompletedAt: at("2026-10-14"), hazardFound: true, foundSeverity: "significant" }),
      at("2026-10-15"),
    );
    expect(ev.inForce).toBe(true);
    expect(ev.duties.find((d) => d.key === "investigate")!.dueDate).toBe("2026-10-20");
    expect(ev.duties.find((d) => d.key === "written_summary")!.dueDate).toBe("2026-10-19");
    expect(ev.duties.find((d) => d.key === "safety_work")!.dueDate).toBe("2026-10-21");
    expect(ev.duties.find((d) => d.key === "supplementary_steps")!.dueDate).toBe("2026-10-21");
    expect(ev.duties.find((d) => d.key === "supplementary_start")!.dueDate).toBe("2027-01-06");
  });

  it("runs a 24-hour clock for emergency hazards", () => {
    const ev = evaluateCase(eng({ hazard: "electrical", triage: "emergency", awareAt: at("2026-10-06", "09:00") }), at("2026-10-06", "20:00"));
    const inv = ev.duties.find((d) => d.key === "investigate_24h")!;
    expect(inv.dueAt?.toISOString()).toBe("2026-10-07T08:00:00.000Z");
    expect(inv.status).toBe("open");
    expect(inv.hoursLeft).toBe(13);
    const late = evaluateCase(eng({ hazard: "electrical", triage: "emergency", awareAt: at("2026-10-06", "09:00") }), at("2026-10-07", "10:00"));
    expect(late.duties.find((d) => d.key === "investigate_24h")!.status).toBe("overdue");
    expect(late.alternativeAccommodation).toBe(true);
  });

  it("brings Phase 2 hazards into scope from 30 November 2026", () => {
    expect(evaluateCase(eng({ hazard: "excess_cold", awareAt: at("2026-11-27") }), at("2026-11-28")).inForce).toBe(false);
    expect(evaluateCase(eng({ hazard: "excess_cold", awareAt: at("2026-11-30") }), at("2026-12-01")).inForce).toBe(true);
    // Phase 3 hazards are not yet scheduled.
    expect(evaluateCase(eng({ hazard: "other" }), at("2026-12-01")).inForce).toBe(false);
    // ...but emergency hazards of any kind are covered.
    expect(evaluateCase(eng({ hazard: "other", triage: "emergency" }), at("2026-10-06")).inForce).toBe(true);
  });

  it("treats English private rented as a benchmark only", () => {
    const ev = evaluateCase(eng({ sector: "private" }), at("2026-10-07"));
    expect(ev.regime).toBe("england_private_benchmark");
    expect(ev.inForce).toBe(false);
  });
});

describe("timeline preview", () => {
  it("shows worst-case dates for a Scottish report", () => {
    const p = previewScotlandTimeline("2026-11-20", { social: true });
    expect(p.investigateBy).toBe("2026-12-07");
    expect(p.summaryBy).toBe("2026-12-10");
    expect(p.repairsStartBy).toBe("2026-12-14");
    expect(p.holidays.map((h) => h.date)).toContain("2026-11-30");
  });
});
