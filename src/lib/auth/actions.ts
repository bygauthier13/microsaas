"use server";

import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { track } from "@/lib/analytics";
import { getDb } from "@/lib/db";
import { passwordResets, sessions, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { createSession, destroySession } from "./session";
import { hashPassword, passwordProblem, verifyPassword } from "./password";

export interface FormState {
  error?: string;
  message?: string;
  fields?: Record<string, string>;
}

const emailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address."));

function safeNext(next: unknown): string {
  const v = typeof next === "string" ? next : "";
  // Only allow local paths — prevents open redirects.
  return v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/app";
}

export async function signupAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const h = await headers();
  const ip = clientIp(h);
  const limited = await rateLimit(`signup:${ip}`, env.signupRateLimit, 3600);
  if (!limited.ok) return { error: "Too many sign-ups from this network. Please try again later." };

  const parsed = z
    .object({
      name: z.string().trim().min(1, "Tell us your name.").max(120),
      email: emailSchema,
      password: z.string().min(1, "Choose a password."),
    })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
    });
  const fields = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form.", fields };
  const problem = passwordProblem(parsed.data.password);
  if (problem) return { error: problem, fields };

  const db = await getDb();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data.email}`)
    .limit(1);
  if (existing.length) {
    return { error: "An account with that email already exists. Try signing in instead.", fields };
  }

  const [user] = await db
    .insert(users)
    .values({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash: await hashPassword(parsed.data.password),
      lastLoginAt: new Date(),
    })
    .returning({ id: users.id });

  await createSession(user.id, h.get("user-agent"));
  await track("signup_completed", { userId: user.id, props: { source: String(formData.get("source") ?? "") } });
  redirect("/app/onboarding");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const h = await headers();
  const ip = clientIp(h);
  const emailRaw = String(formData.get("email") ?? "");
  const fields = { email: emailRaw };
  const parsedEmail = emailSchema.safeParse(emailRaw);
  if (!parsedEmail.success) return { error: "Enter a valid email address.", fields };
  const email = parsedEmail.data;

  const [byIp, byEmail] = await Promise.all([
    rateLimit(`login-ip:${ip}`, 20, 900),
    rateLimit(`login-email:${email}`, 8, 900),
  ]);
  if (!byIp.ok || !byEmail.ok) {
    return { error: "Too many attempts. Wait a few minutes, or reset your password.", fields };
  }

  const db = await getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${email}`)
    .limit(1);
  const valid = await verifyPassword(String(formData.get("password") ?? ""), user?.passwordHash);
  if (!user || !valid || user.isDemo) return { error: "That email and password don't match.", fields };

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id, h.get("user-agent"));
  await track("login", { userId: user.id });
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const generic: FormState = {
    message: "If an account exists for that address, a reset link is on its way. It expires in 60 minutes.",
  };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Enter a valid email address." };
  const h = await headers();
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`reset-ip:${clientIp(h)}`, 10, 3600),
    rateLimit(`reset-email:${parsed.data}`, 3, 3600),
  ]);
  if (!byIp.ok || !byEmail.ok) return generic; // don't reveal throttling per address

  const db = await getDb();
  const [user] = await db
    .select({ id: users.id, isDemo: users.isDemo, email: users.email })
    .from(users)
    .where(sql`lower(${users.email}) = ${parsed.data}`)
    .limit(1);
  if (user && !user.isDemo) {
    const token = randomToken();
    await db.insert(passwordResets).values({
      id: sha256(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const url = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    const mail = passwordResetEmail(url);
    await sendEmail({ to: user.email, ...mail, category: "password_reset" });
  }
  return generic;
}

export async function resetPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!token || token.length > 200) return { error: "This reset link is invalid. Request a new one." };
  const problem = passwordProblem(password);
  if (problem) return { error: problem };

  const db = await getDb();
  const [reset] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.id, sha256(token)),
        isNull(passwordResets.usedAt),
        gt(passwordResets.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!reset) return { error: "This reset link has expired or was already used. Request a new one." };

  await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, reset.userId));
  await db.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, reset.id));
  // Sign out every other device.
  await db.delete(sessions).where(eq(sessions.userId, reset.userId));
  const h = await headers();
  await createSession(reset.userId, h.get("user-agent"));
  redirect("/app");
}
