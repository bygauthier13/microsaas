"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { track } from "@/lib/analytics";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { createSession, getAuth, requireOrg } from "@/lib/auth/session";
import { orgAccess } from "@/lib/billing/plans";
import { getDb } from "@/lib/db";
import { invitations, memberships, organizations, users } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { teamInviteEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { clientIp, rateLimit } from "@/lib/security/rate-limit";
import { seatsInUse } from "@/lib/org";
import { ActionError, emailField, str, toState, type ActionState } from "./helpers";

async function ownerOnly() {
  const auth = await requireOrg();
  if (auth.role !== "owner") throw new ActionError("Only the workspace owner can manage the team.");
  if (auth.org.isDemo) throw new ActionError("Team invitations are disabled in the demo workspace.");
  return auth;
}

export async function inviteMemberAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { org, user } = await ownerOnly();
    const email = emailField(fd, "email");
    if (!email) throw new ActionError("Enter their email address.");
    const limit = await rateLimit(`invite:${org.id}`, 30, 3600);
    if (!limit.ok) throw new ActionError("Too many invitations in the last hour. Please try again later.");
    const access = orgAccess(org);
    if ((await seatsInUse(org.id)) >= access.seats) {
      throw new ActionError(`Your plan includes ${access.seats} team member${access.seats === 1 ? "" : "s"}. Upgrade to invite more.`);
    }
    const db = await getDb();
    const [existing] = await db
      .select({ id: users.id, orgs: sql<number>`(select count(*)::int from memberships m where m.user_id = ${users.id})` })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    if (existing && Number(existing.orgs) > 0) throw new ActionError("That person already belongs to a RepairClock workspace.");
    // Replace any earlier live invitation for the same address.
    await db
      .update(invitations)
      .set({ revokedAt: new Date() })
      .where(and(eq(invitations.orgId, org.id), sql`lower(${invitations.email}) = ${email}`, isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
    const token = randomToken();
    await db.insert(invitations).values({
      orgId: org.id,
      email,
      tokenHash: sha256(token),
      invitedBy: user.id,
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    });
    const url = `${env.appUrl}/invite/${encodeURIComponent(token)}`;
    const res = await sendEmail({ to: email, ...teamInviteEmail({ orgName: org.name, inviterName: user.name || user.email, url }), category: "team_invite", orgId: org.id });
    await track("member_invited", { orgId: org.id, userId: user.id });
    revalidatePath("/app/settings");
    return {
      ok: true,
      message: res.status === "sent" ? `Invitation emailed to ${email}.` : `Invitation created. Share this one-time link with ${email}: ${url}`,
    };
  } catch (err) {
    return toState(err);
  }
}

export async function revokeInviteAction(fd: FormData): Promise<void> {
  const { org } = await requireOrg();
  const auth = await getAuth();
  if (auth?.role !== "owner") return;
  const db = await getDb();
  await db
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(and(eq(invitations.orgId, org.id), eq(invitations.id, str(fd, "inviteId", 64)), isNull(invitations.acceptedAt)));
  revalidatePath("/app/settings");
}

export async function removeMemberAction(fd: FormData): Promise<void> {
  const { org, user, role } = await requireOrg();
  if (role !== "owner") return;
  const target = str(fd, "userId", 64);
  if (!target || target === user.id) return;
  const db = await getDb();
  await db.delete(memberships).where(and(eq(memberships.orgId, org.id), eq(memberships.userId, target), eq(memberships.role, "member")));
  revalidatePath("/app/settings");
}

async function loadInvite(token: string) {
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const [row] = await db
    .select({ invite: invitations, org: organizations })
    .from(invitations)
    .innerJoin(organizations, eq(organizations.id, invitations.orgId))
    .where(eq(invitations.tokenHash, sha256(token)))
    .limit(1);
  if (!row || row.invite.acceptedAt || row.invite.revokedAt || row.invite.expiresAt.getTime() < Date.now()) return null;
  return row;
}

/** Accept as the signed-in user, or create an account for the invited address. */
export async function acceptInviteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const h = await headers();
    const limit = await rateLimit(`invite-accept:${clientIp(h)}`, 20, 3600);
    if (!limit.ok) throw new ActionError("Too many attempts. Please try again later.");
    const token = str(fd, "token", 200);
    const row = await loadInvite(token);
    if (!row) throw new ActionError("This invitation is no longer valid. Ask for a new one.");
    const db = await getDb();
    const auth = await getAuth();
    let userId: string;
    if (auth) {
      if (auth.user.email.toLowerCase() !== row.invite.email.toLowerCase()) {
        throw new ActionError(`This invitation is for ${row.invite.email}. Sign out and open the link again.`);
      }
      if (auth.org) throw new ActionError("You already belong to a workspace.");
      userId = auth.user.id;
    } else {
      const name = str(fd, "name", 120);
      const password = str(fd, "password", 200);
      if (!name) throw new ActionError("Tell us your name.");
      const problem = passwordProblem(password);
      if (problem) throw new ActionError(problem);
      const [exists] = await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${row.invite.email.toLowerCase()}`).limit(1);
      if (exists) throw new ActionError("An account already exists for this email. Sign in first, then open the invitation link again.");
      const [created] = await db
        .insert(users)
        .values({ email: row.invite.email.toLowerCase(), name, passwordHash: await hashPassword(password), lastLoginAt: new Date() })
        .returning({ id: users.id });
      userId = created.id;
      await createSession(userId, h.get("user-agent"));
    }
    // Claim the invitation atomically so it can't be used twice.
    const claimed = await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(and(eq(invitations.id, row.invite.id), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)))
      .returning({ id: invitations.id });
    if (!claimed.length) throw new ActionError("This invitation has already been used.");
    await db.insert(memberships).values({ userId, orgId: row.org.id, role: row.invite.role }).onConflictDoNothing();
    await track("member_joined", { orgId: row.org.id, userId });
  } catch (err) {
    return toState(err);
  }
  redirect("/app");
}
