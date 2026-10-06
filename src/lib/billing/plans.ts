import type { PlanId } from "@/lib/db/schema";

export type PaidPlanId = Exclude<PlanId, "trial">;

export interface Plan {
  id: PaidPlanId;
  name: string;
  audience: string;
  monthly: number; // GBP, excl. VAT
  annual: number; // GBP per year, excl. VAT (2 months free)
  homes: number;
  seats: number;
  highlight?: boolean;
  features: string[];
}

/** Why `plan` can't hold a workspace with this usage, or null when it fits. */
export function planMisfit(plan: PaidPlanId, usage: { homes: number; seats: number }): string | null {
  const p = PLANS[plan];
  if (usage.homes > p.homes) return `You have ${usage.homes} active homes and the ${p.name} plan covers ${p.homes}.`;
  if (usage.seats > p.seats)
    return `You have ${usage.seats} team members (including invitations) and the ${p.name} plan includes ${p.seats}.`;
  return null;
}

export const TRIAL_DAYS = 14;
export const TRIAL_HOMES = 300;

export const PLANS: Record<PaidPlanId, Plan> = {
  landlord: {
    id: "landlord",
    name: "Landlord",
    audience: "Self-managing landlords",
    monthly: 12,
    annual: 120,
    homes: 10,
    seats: 1,
    features: [
      "Up to 10 homes",
      "Statutory clocks for every damp & mould report",
      "Written summary & delay notice generator",
      "Tribunal-ready evidence pack",
    ],
  },
  agent: {
    id: "agent",
    name: "Agent",
    audience: "Letting agents up to 300 managed homes",
    monthly: 99,
    annual: 990,
    homes: 300,
    seats: 5,
    highlight: true,
    features: [
      "Up to 300 managed homes, 5 team members",
      "One-click landlord approval links with deadline warnings",
      "Daily deadline digest & landlord reminders",
      "AI-drafted written summaries (you review before issuing)",
      "Evidence packs, CSV import, audit trail",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    audience: "Multi-branch agencies up to 1,500 homes",
    monthly: 249,
    annual: 2490,
    homes: 1500,
    seats: 15,
    features: [
      "Up to 1,500 managed homes, 15 team members",
      "Everything in Agent",
      "Branded tenant letters",
      "Priority support",
    ],
  },
  housing: {
    id: "housing",
    name: "Housing",
    audience: "Housing associations, co-ops & councils",
    monthly: 499,
    annual: 4990,
    homes: 5000,
    seats: 50,
    features: [
      "Up to 5,000 homes (larger on request)",
      "Scotland Right to Repair compensation tracking",
      "England Awaab's Law Phase 1 & 2 hazard clocks",
      "Alternative accommodation alerts",
    ],
  },
};

export const PLAN_ORDER: PaidPlanId[] = ["landlord", "agent", "agency", "housing"];

export function isPaidPlan(plan: string): plan is PaidPlanId {
  return plan in PLANS;
}

interface OrgLike {
  plan: PlanId;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  isDemo: boolean;
  currentPeriodEnd?: Date | null;
}

export interface Access {
  state: "demo" | "trial" | "trial_expired" | "active" | "past_due" | "canceled";
  homesLimit: number;
  seats: number;
  /** New cases and new homes need an active trial or subscription. */
  canCreate: boolean;
  trialDaysLeft: number | null;
  planName: string;
}

export function orgAccess(org: OrgLike, now = new Date()): Access {
  if (org.isDemo) {
    return { state: "demo", homesLimit: 500, seats: 5, canCreate: true, trialDaysLeft: null, planName: "Demo" };
  }
  if (isPaidPlan(org.plan)) {
    const plan = PLANS[org.plan];
    if (org.subscriptionStatus === "active" || org.subscriptionStatus === "trialing") {
      return { state: "active", homesLimit: plan.homes, seats: plan.seats, canCreate: true, trialDaysLeft: null, planName: plan.name };
    }
    if (org.subscriptionStatus === "past_due") {
      return { state: "past_due", homesLimit: plan.homes, seats: plan.seats, canCreate: true, trialDaysLeft: null, planName: plan.name };
    }
    // Canceled: keep access until the end of the paid period.
    if (org.currentPeriodEnd && org.currentPeriodEnd.getTime() > now.getTime()) {
      return { state: "active", homesLimit: plan.homes, seats: plan.seats, canCreate: true, trialDaysLeft: null, planName: plan.name };
    }
    return { state: "canceled", homesLimit: plan.homes, seats: plan.seats, canCreate: false, trialDaysLeft: null, planName: plan.name };
  }
  const ends = org.trialEndsAt?.getTime() ?? 0;
  const daysLeft = Math.ceil((ends - now.getTime()) / 86_400_000);
  if (daysLeft > 0) {
    return { state: "trial", homesLimit: TRIAL_HOMES, seats: 5, canCreate: true, trialDaysLeft: daysLeft, planName: "Free trial" };
  }
  return { state: "trial_expired", homesLimit: TRIAL_HOMES, seats: 5, canCreate: false, trialDaysLeft: 0, planName: "Trial ended" };
}

export function recommendedPlan(homes: number, kind: string): PaidPlanId {
  if (kind === "social_landlord") return "housing";
  if (kind === "private_landlord" && homes <= 10) return "landlord";
  if (homes <= 300) return "agent";
  if (homes <= 1500) return "agency";
  return "housing";
}

export function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
