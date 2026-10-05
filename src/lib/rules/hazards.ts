/**
 * Hazard catalogue and the dates each legal regime starts to apply.
 *
 * Scotland — The Investigation and Commencement of Repair (Scotland) Regulations 2026
 * (SSI 2026/173), in force 6 October 2026, damp and mould only, private and social landlords.
 *
 * England — The Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025
 * ("Awaab's Law"), social landlords only:
 *   Phase 1 (27 Oct 2025): all emergency hazards + significant damp and mould.
 *   Phase 2 (30 Nov 2026): significant excess cold, excess heat, falls, structural collapse,
 *                          fire and explosions, electrical, domestic hygiene.
 *   Phase 3 (2027, date to be confirmed): remaining HHSRS hazards except overcrowding.
 * Private rented sector in England: extension planned via the Renters' Rights Act 2025, no date yet.
 */

export type Jurisdiction = "scotland" | "england";
export type Sector = "private" | "social";

export const HAZARDS = [
  { key: "damp_mould", label: "Damp and mould", short: "Damp & mould" },
  { key: "excess_cold", label: "Excess cold", short: "Excess cold" },
  { key: "excess_heat", label: "Excess heat", short: "Excess heat" },
  {
    key: "falls",
    label: "Falls (on the level, on stairs, between levels)",
    short: "Falls",
  },
  {
    key: "structural_collapse",
    label: "Structural collapse and falling elements",
    short: "Structural collapse",
  },
  { key: "fire_explosions", label: "Fire and explosions", short: "Fire & explosions" },
  { key: "electrical", label: "Electrical hazards", short: "Electrical" },
  {
    key: "domestic_hygiene",
    label: "Domestic hygiene (incl. personal hygiene and food safety)",
    short: "Domestic hygiene",
  },
  { key: "other", label: "Other hazard (HHSRS)", short: "Other hazard" },
] as const;

export type HazardKey = (typeof HAZARDS)[number]["key"];

export const HAZARD_KEYS = HAZARDS.map((h) => h.key) as [HazardKey, ...HazardKey[]];

export function hazardLabel(key: HazardKey): string {
  return HAZARDS.find((h) => h.key === key)?.label ?? key;
}

export function hazardShort(key: HazardKey): string {
  return HAZARDS.find((h) => h.key === key)?.short ?? key;
}

export const SCOTLAND_COMMENCEMENT = "2026-10-06";
export const ENGLAND_PHASE_1 = "2025-10-27";
export const ENGLAND_PHASE_2 = "2026-11-30";

const PHASE_2_HAZARDS: HazardKey[] = [
  "excess_cold",
  "excess_heat",
  "falls",
  "structural_collapse",
  "fire_explosions",
  "electrical",
  "domestic_hygiene",
];

/**
 * Date from which a *significant* hazard of this type is covered by Awaab's Law (England,
 * social). `null` means not yet scheduled (Phase 3).
 */
export function englandSignificantFrom(hazard: HazardKey): string | null {
  if (hazard === "damp_mould") return ENGLAND_PHASE_1;
  if (PHASE_2_HAZARDS.includes(hazard)) return ENGLAND_PHASE_2;
  return null;
}

export function englandPhaseLabel(hazard: HazardKey): string {
  if (hazard === "damp_mould") return "Phase 1 (from 27 Oct 2025)";
  if (PHASE_2_HAZARDS.includes(hazard)) return "Phase 2 (from 30 Nov 2026)";
  return "Phase 3 (2027, date to be confirmed)";
}
