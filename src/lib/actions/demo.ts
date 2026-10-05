"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { track } from "@/lib/analytics";
import { createSession, destroySession } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createDemoWorkspace } from "@/lib/demo/seed";
import { env } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";

/** Creates a fresh, isolated demo workspace and signs the visitor into it. */
export async function startDemoAction(): Promise<void> {
  if (!env.demoEnabled) redirect("/demo?unavailable=1");
  const h = await headers();
  const limit = await rateLimit(`demo:${clientIp(h)}`, env.isProduction ? 10 : 200, 3600);
  if (!limit.ok) redirect("/demo?limited=1");
  const db = await getDb();
  const { user, org } = await createDemoWorkspace(db);
  // Replace any existing session so a real account is never mixed with demo data.
  await destroySession();
  await createSession(user.id, h.get("user-agent"));
  await track("demo_started", { orgId: org.id, userId: user.id, isDemo: true });
  redirect("/app");
}
