/**
 * Fixed-window rate limiter backed by the database, so it works across serverless instances.
 */
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const db = await getDb();
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const result = await db.execute(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, ${resetAt.toISOString()})
    on conflict (key) do update set
      count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at < now() then excluded.reset_at else rate_limits.reset_at end
    returning count, reset_at
  `);
  const rows = (result as unknown as { rows: Array<{ count: number; reset_at: string | Date }> }).rows;
  const row = rows[0];
  const count = Number(row.count);
  const reset = new Date(row.reset_at);
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((reset.getTime() - now.getTime()) / 1000)),
  };
}

/** Best-effort client IP from proxy headers (Vercel / most hosts set x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
