import { sql } from "drizzle-orm";
import { databaseKind, getDb } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + configuration summary (no secrets) for uptime monitors and deploy checks. */
export async function GET() {
  try {
    const db = await getDb();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: databaseKind(),
      email: env.resendApiKey ? "resend" : "outbox",
      billing: env.billingMode,
      ai: env.anthropicApiKey ? "enabled" : "off",
      time: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health]", err);
    return Response.json({ ok: false }, { status: 503 });
  }
}
