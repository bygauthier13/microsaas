import { sql } from "drizzle-orm";
import { databaseKind, getDb } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Liveness plus a setup checklist (no secret values) — open it in a browser after each
 * deployment step to see what's configured.
 */
export async function GET() {
  const setup = {
    website_address: env.appUrl,
    emails: env.resendApiKey ? `sending from ${env.emailFrom}` : "not set up yet: emails are only recorded in the app (add RESEND_API_KEY)",
    payments: env.stripeSecretKey
      ? env.stripeSecretKey.startsWith("sk_live_")
        ? "Stripe LIVE mode: real cards are charged"
        : "Stripe test mode: use card 4242 4242 4242 4242"
      : "not set up yet (add STRIPE_SECRET_KEY)",
    stripe_webhook: env.stripeWebhookSecret ? "set" : "not set up yet (add STRIPE_WEBHOOK_SECRET)",
    daily_emails_job: env.cronSecret ? "set" : "not set up yet (add CRON_SECRET)",
    company_details: process.env.COMPANY_NAME ? "set" : "not set up yet (add COMPANY_NAME, COMPANY_NUMBER, COMPANY_ADDRESS)",
    ai_letter_polishing: env.anthropicApiKey ? "on" : "off (optional)",
  };
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: databaseKind() === "postgres" ? "connected (Postgres)" : "embedded (local only)", ...setup, time: new Date().toISOString() });
  } catch (err) {
    console.error("[health]", err);
    return Response.json(
      {
        ok: false,
        database:
          err instanceof Error && err.message.startsWith("DATABASE_URL is not set")
            ? err.message
            : "not working: check the DATABASE_URL value (details are in the deployment's logs)",
        ...setup,
      },
      { status: 503 },
    );
  }
}
