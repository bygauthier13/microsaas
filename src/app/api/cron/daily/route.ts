import { env } from "@/lib/env";
import { runDailyJobs } from "@/lib/jobs/daily";
import { safeEqual } from "@/lib/security/crypto";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Called by Vercel Cron (which sends `Authorization: Bearer $CRON_SECRET`), or any scheduler
 * that can send the same header. Without CRON_SECRET the endpoint only runs outside production.
 */
export async function GET(req: Request) {
  const secret = env.cronSecret;
  if (secret) {
    const header = req.headers.get("authorization") ?? "";
    if (!safeEqual(header, `Bearer ${secret}`)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } else if (env.isProduction) {
    return Response.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  const report = await runDailyJobs();
  return Response.json({ ok: true, ...report });
}
