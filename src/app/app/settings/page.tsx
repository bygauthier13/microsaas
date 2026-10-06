import Link from "next/link";
import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { ActionForm } from "@/components/case/action-form";
import { Alert, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { updateSettingsAction } from "@/lib/actions/org";
import { inviteMemberAction, removeMemberAction, revokeInviteAction } from "@/lib/actions/team";
import { requireOrg } from "@/lib/auth/session";
import { orgAccess } from "@/lib/billing/plans";
import { getDb } from "@/lib/db";
import { invitations, memberships, users } from "@/lib/db/schema";
import { formatInstant } from "@/lib/rules/calendar";
import { defaultSignpost } from "@/lib/docs/letters";
import { ORG_KINDS, optionLabel } from "@/lib/domain";
import { env } from "@/lib/env";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, org, role } = await requireOrg();
  const s = org.settings ?? {};
  const owner = role === "owner";
  const sector = org.kind === "social_landlord" ? "social" : "private";
  const db = await getDb();
  const [team, invites] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: memberships.role })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.orgId, org.id))
      .orderBy(asc(memberships.createdAt)),
    db
      .select()
      .from(invitations)
      .where(and(eq(invitations.orgId, org.id), isNull(invitations.acceptedAt), isNull(invitations.revokedAt), gt(invitations.expiresAt, new Date())))
      .orderBy(desc(invitations.createdAt)),
  ]);
  const seats = orgAccess(org).seats;
  const seatsUsed = team.length + invites.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="How your letters are signed, who tenants contact, and how RepairClock reminds you." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="p-5 sm:p-6">
          {!owner ? (
            <Alert tone="info" className="mb-4">
              Only the workspace owner can change these settings.
            </Alert>
          ) : null}
          <ActionForm action={updateSettingsAction} className="space-y-6">
            <fieldset className="grid gap-4 sm:grid-cols-2" disabled={!owner}>
              <legend className="mb-2 font-semibold sm:col-span-2">Organisation</legend>
              <Field label="Name on letters" htmlFor="orgName">
                <Input id="orgName" name="orgName" required defaultValue={org.name} />
              </Field>
              <Field label="Default nation for new homes" htmlFor="jurisdiction">
                <Select id="jurisdiction" name="jurisdiction" defaultValue={org.jurisdiction}>
                  <option value="scotland">Scotland</option>
                  <option value="england">England</option>
                </Select>
              </Field>
              <Field label="Letters signed by" htmlFor="signatoryName">
                <Input id="signatoryName" name="signatoryName" defaultValue={s.signatoryName ?? ""} />
              </Field>
              <Field label="Their role" htmlFor="signatoryRole">
                <Input id="signatoryRole" name="signatoryRole" defaultValue={s.signatoryRole ?? ""} placeholder="Property Manager" />
              </Field>
              <Field label="Phone for tenants" htmlFor="phone">
                <Input id="phone" name="phone" type="tel" defaultValue={s.phone ?? ""} />
              </Field>
              <Field label="Reply-to email" htmlFor="replyToEmail" hint="Tenant and landlord replies go here.">
                <Input id="replyToEmail" name="replyToEmail" type="email" defaultValue={s.replyToEmail ?? ""} />
              </Field>
            </fieldset>

            <fieldset className="space-y-4 border-t border-line pt-5" disabled={!owner}>
              <legend className="mb-2 font-semibold">Letter content</legend>
              <Field
                label="Advice & complaints signposting"
                htmlFor="adviceSignpost"
                hint="Printed in every written summary and delay notice. Leave blank to use the default shown."
              >
                <Textarea id="adviceSignpost" name="adviceSignpost" rows={4} defaultValue={s.adviceSignpost ?? ""} placeholder={defaultSignpost(org.jurisdiction, sector)} />
              </Field>
              <Field
                label="When no repair is needed (optional)"
                htmlFor="repairPolicyNote"
                hint="Added when an investigation finds no work is required — e.g. what you'll still do as good practice."
              >
                <Textarea
                  id="repairPolicyNote"
                  name="repairPolicyNote"
                  rows={2}
                  defaultValue={s.repairPolicyNote ?? ""}
                  placeholder="We will still check the extractor fan at your next routine inspection and can provide a dehumidifier on request."
                />
              </Field>
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-5" disabled={!owner}>
              <legend className="mb-2 font-semibold">Reminders</legend>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="digestEnabled" defaultChecked={s.digestEnabled !== false} className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]" />
                <span>
                  <span className="font-medium">Morning deadline digest</span>
                  <span className="block text-muted">One email early each weekday morning listing anything overdue, due today or due in the next 2 working days, plus unanswered landlord approvals. Skipped when nothing needs you.</span>
                </span>
              </label>
            </fieldset>

            {owner ? <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton> : null}
          </ActionForm>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Team</h2>
              <span className="text-xs text-muted tabular">
                {seatsUsed} of {seats} seats
              </span>
            </div>
            <ul className="mt-3 space-y-2.5 text-sm">
              {team.map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{m.name || m.email}</span>
                    <span className="block truncate text-xs text-muted">
                      {user.isDemo ? "Demo account" : m.email} · {m.role}
                    </span>
                  </span>
                  {owner && m.role === "member" ? (
                    <form action={removeMemberAction}>
                      <input type="hidden" name="userId" value={m.id} />
                      <button type="submit" className="text-xs text-muted underline underline-offset-2 hover:text-bad">
                        Remove
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
              {invites.map((i) => (
                <li key={i.id} className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{i.email}</span>
                    <span className="block text-xs text-muted">Invited · expires {formatInstant(i.expiresAt).split(",")[0]}</span>
                  </span>
                  {owner ? (
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="inviteId" value={i.id} />
                      <button type="submit" className="text-xs text-muted underline underline-offset-2 hover:text-bad">
                        Withdraw
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
            {owner && !org.isDemo ? (
              <ActionForm action={inviteMemberAction} className="mt-4 space-y-3 border-t border-line pt-4" resetOnSuccess>
                <Field label="Invite a colleague" htmlFor="invite-email">
                  <Input id="invite-email" name="email" type="email" required placeholder="name@agency.co.uk" />
                </Field>
                <SubmitButton variant="secondary" size="sm" pendingLabel="Sending…" disabled={seatsUsed >= seats}>
                  Send invitation
                </SubmitButton>
                {seatsUsed >= seats ? (
                  <p className="text-xs text-muted">
                    All seats in use. <Link href="/app/billing" className="underline">Upgrade</Link> for more.
                  </p>
                ) : null}
              </ActionForm>
            ) : null}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Your account</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Name</dt>
                <dd>{user.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="break-all">{user.isDemo ? "Demo account" : user.email}</dd>
              </div>
              <div>
                <dt className="text-muted">Workspace type</dt>
                <dd>{optionLabel(ORG_KINDS, org.kind)}</dd>
              </div>
            </dl>
            {!user.isDemo ? (
              <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
                Change password
              </Link>
            ) : null}
          </Card>
          <Card className="p-5">
            <h2 className="font-semibold">Your data</h2>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Everything you record is yours. Export all cases as CSV any time, or download each case&apos;s evidence pack (PDF with timeline, letters and photos).
            </p>
            <a href="/api/export/cases" className="mt-3 inline-block text-sm font-medium underline underline-offset-2">
              Export all cases (CSV)
            </a>
            <p className="mt-4 text-xs text-muted leading-relaxed">
              To close your workspace and delete its data, email <a className="underline" href={`mailto:${env.company.email}`}>{env.company.email}</a> from the
              owner&apos;s address. We delete within 30 days, except records we must keep by law (e.g. invoices).
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
