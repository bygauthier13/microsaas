/**
 * Product analytics: every event lands in our own `analytics_events` table (so the funnel is
 * queryable with SQL from day one) and is mirrored to PostHog when POSTHOG_KEY is set.
 * Demo-workspace events are flagged so they never pollute real funnel numbers.
 */
import { getDb } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";
import { env } from "@/lib/env";

export type EventName =
  | "signup_completed"
  | "login"
  | "onboarding_completed"
  | "property_added"
  | "properties_imported"
  | "case_created"
  | "first_case_created"
  | "investigation_recorded"
  | "summary_drafted"
  | "summary_issued"
  | "delay_notice_issued"
  | "approval_requested"
  | "approval_responded"
  | "repair_commenced"
  | "repair_completed"
  | "case_closed"
  | "evidence_pack_downloaded"
  | "checkout_started"
  | "subscription_activated"
  | "subscription_canceled"
  | "payment_failed"
  | "demo_started"
  | "member_invited"
  | "member_joined"
  | "calculator_used"
  | "pricing_viewed"
  | "landing_visited"
  | "video_played";

export async function track(
  name: EventName,
  opts: { orgId?: string | null; userId?: string | null; isDemo?: boolean; props?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(analyticsEvents).values({
      name,
      orgId: opts.orgId ?? null,
      userId: opts.userId ?? null,
      isDemo: Boolean(opts.isDemo),
      props: opts.props ?? {},
    });
    if (env.posthogKey && !opts.isDemo) {
      void fetch(`${env.posthogHost}/capture/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          api_key: env.posthogKey,
          event: name,
          distinct_id: opts.userId ?? opts.orgId ?? "anonymous",
          properties: { ...opts.props, org_id: opts.orgId, $groups: opts.orgId ? { organization: opts.orgId } : undefined },
        }),
        signal: AbortSignal.timeout(3000),
      }).catch(() => undefined);
    }
  } catch (err) {
    console.error("[analytics] failed to record", name, err);
  }
}
