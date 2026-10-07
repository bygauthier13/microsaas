import { track, type EventName } from "@/lib/analytics";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/** Anonymous marketing-site events (sendBeacon). Only allow-listed names are accepted. */
const PUBLIC_EVENTS: EventName[] = ["calculator_used", "pricing_viewed", "landing_visited", "video_played"];

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 2048) return new Response(null, { status: 413 });
  let body: { event?: unknown; props?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const event = typeof body.event === "string" ? (body.event as EventName) : null;
  if (!event || !PUBLIC_EVENTS.includes(event)) return new Response(null, { status: 400 });
  const limit = await rateLimit(`track:${clientIp(req.headers)}`, 120, 3600);
  if (!limit.ok) return new Response(null, { status: 429 });
  const props: Record<string, string> = {};
  if (body.props && typeof body.props === "object") {
    for (const [k, v] of Object.entries(body.props as Record<string, unknown>).slice(0, 10)) {
      if (typeof v === "string" && /^[a-z_]{1,30}$/.test(k)) props[k] = v.slice(0, 50);
    }
  }
  await track(event, { props });
  return new Response(null, { status: 204 });
}
