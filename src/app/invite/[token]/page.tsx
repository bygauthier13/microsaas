import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Logo } from "@/components/logo";
import { Alert } from "@/components/ui";
import { AcceptInviteForm } from "@/components/public/accept-invite-form";
import { getAuth } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { invitations, organizations, users } from "@/lib/db/schema";
import { sha256 } from "@/lib/security/crypto";

export const metadata: Metadata = { title: "Join your team", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

function isLive(invite: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }): boolean {
  return !invite.acceptedAt && !invite.revokedAt && invite.expiresAt.getTime() > Date.now();
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const raw = (await params).token;
  let token = raw;
  try {
    token = decodeURIComponent(raw);
  } catch {
    token = raw;
  }
  const db = await getDb();
  const [row] =
    token.length <= 200
      ? await db
          .select({ invite: invitations, org: organizations, inviter: users.name })
          .from(invitations)
          .innerJoin(organizations, eq(organizations.id, invitations.orgId))
          .leftJoin(users, eq(users.id, invitations.invitedBy))
          .where(eq(invitations.tokenHash, sha256(token)))
          .limit(1)
      : [];
  const auth = await getAuth();
  const valid = row && isLive(row.invite);

  return (
    <div className="min-h-screen bg-paper px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <Logo />
        <div className="card mt-8 p-6 sm:p-8">
          {!valid ? (
            <Alert tone="warn" title="This invitation isn't valid">
              It may have expired, been withdrawn or already used. Ask the person who invited you to send a new one.
            </Alert>
          ) : auth && auth.user.email.toLowerCase() !== row.invite.email.toLowerCase() ? (
            <Alert tone="warn" title={`This invitation is for ${row.invite.email}`}>
              You&apos;re signed in as {auth.user.email}. Sign out, then open the link again.
            </Alert>
          ) : auth?.org ? (
            <Alert tone="info" title="You already belong to a workspace">
              Each account can belong to one workspace. <Link href="/app" className="underline">Go to your dashboard</Link>.
            </Alert>
          ) : (
            <>
              <p className="eyebrow">Team invitation</p>
              <h1 className="display mt-2 text-3xl leading-tight">Join {row.org.name}</h1>
              <p className="mt-2 text-sm text-muted">
                {row.inviter ?? "A colleague"} invited <span className="text-ink">{row.invite.email}</span> to track damp, mould and repair deadlines together.
              </p>
              <div className="mt-6">
                <AcceptInviteForm token={token} email={row.invite.email} signedIn={Boolean(auth)} />
              </div>
              {!auth ? (
                <p className="mt-4 text-center text-sm text-muted">
                  Already have an account?{" "}
                  <Link href={`/login?next=${encodeURIComponent(`/invite/${raw}`)}`} className="font-medium text-ink underline underline-offset-2">
                    Sign in
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
