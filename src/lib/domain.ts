/** Shared labels and option lists (safe to import from client components). */

export const ORG_KINDS = [
  { value: "letting_agent", label: "Letting agent", hint: "You manage homes for landlords" },
  { value: "private_landlord", label: "Private landlord", hint: "You let and manage your own homes" },
  { value: "social_landlord", label: "Social landlord", hint: "Housing association, co-operative or council" },
] as const;

export const JURISDICTIONS = [
  { value: "scotland", label: "Scotland" },
  { value: "england", label: "England" },
] as const;

export const SOURCES = [
  { value: "tenant_report", label: "Tenant report (email, phone, portal…)" },
  { value: "routine_visit", label: "Seen on an inspection or routine visit" },
  { value: "contractor", label: "Reported by a contractor or during another repair" },
  { value: "third_party", label: "Support worker, council or other third party" },
  { value: "sensor", label: "Confirmed after environmental sensor alerts" },
  { value: "other", label: "Other" },
] as const;

export const CAUSES = [
  { value: "condensation", label: "Condensation" },
  { value: "ventilation", label: "Poor ventilation / extractor fault" },
  { value: "heating_insulation", label: "Heating or insulation deficiency" },
  { value: "penetrating", label: "Penetrating damp" },
  { value: "rising", label: "Rising damp" },
  { value: "leak", label: "Leak, burst pipe or flood (traumatic damp)" },
  { value: "structural", label: "Structural defect" },
  { value: "unknown", label: "Not yet determined" },
  { value: "other", label: "Other" },
] as const;

export const DELAY_REASONS = [
  "No contractor or specialist available in time",
  "Unable to access the property despite reasonable attempts",
  "Severe weather or travel disruption",
  "Illness or bereavement",
  "Waiting for materials or supply chain",
  "Waiting for permissions or approvals from an external body",
  "Complex investigation needs a further specialist visit",
] as const;

export function optionLabel(list: ReadonlyArray<{ value: string; label: string }>, value: string | null | undefined): string {
  return list.find((o) => o.value === value)?.label ?? value ?? "";
}

export const CASE_STATUS_LABELS: Record<string, string> = {
  open: "Awaiting investigation",
  investigation_booked: "Investigation booked",
  investigated: "Investigated",
  repair_in_progress: "Repairs under way",
  monitoring: "Monitoring",
  closed: "Closed",
};

export function formatPence(pence: number | null | undefined): string | null {
  if (pence == null) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export function orgInitials(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["ltd", "limited", "the", "and", "of", "llp", "plc"].includes(w.toLowerCase()));
  const initials = words
    .slice(0, 3)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return initials.length >= 2 ? initials : (name.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase() || "RC");
}
