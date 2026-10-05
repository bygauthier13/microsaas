import "server-only";
import { and, asc, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { memberships, organizations, sessions, users } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/security/crypto";

export const SESSION_COOKIE = "rc_session";
const SESSION_DAYS = 30;

export type SessionUser = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;

export interface AuthContext {
  user: SessionUser;
  org: Organization | null;
  role: "owner" | "member" | null;
}

export async function createSession(userId: string, userAgent?: string | null): Promise<void> {
  const db = await getDb();
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({
    id: sha256(token),
    userId,
    expiresAt,
    userAgent: userAgent?.slice(0, 300) ?? null,
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  }
  jar.delete(SESSION_COOKIE);
}

/** Resolve the current user + organisation from the session cookie (memoised per request). */
export const getAuth = cache(async (): Promise<AuthContext | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const user = rows[0]?.user;
  if (!user) return null;

  const m = await db
    .select({ org: organizations, role: memberships.role })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.orgId))
    .where(eq(memberships.userId, user.id))
    .orderBy(asc(memberships.createdAt))
    .limit(1);
  return { user, org: m[0]?.org ?? null, role: m[0]?.role ?? null };
});

export async function requireUser(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) {
    const jar = await cookies();
    // A stale cookie would otherwise bounce between /login and /app via the proxy.
    if (jar.get(SESSION_COOKIE)) redirect("/auth/clear-session");
    redirect("/login");
  }
  return auth;
}

/** For app pages and actions: a signed-in user who belongs to an organisation. */
export async function requireOrg(): Promise<AuthContext & { org: Organization; role: "owner" | "member" }> {
  const auth = await requireUser();
  if (!auth.org || !auth.role) redirect("/app/onboarding");
  if (auth.org.isDemo && auth.org.demoExpiresAt && auth.org.demoExpiresAt.getTime() < Date.now()) {
    redirect("/demo?expired=1");
  }
  return auth as AuthContext & { org: Organization; role: "owner" | "member" };
}
