import Link from "next/link";
import { ActionForm } from "@/components/case/action-form";
import { Alert, Card, Field, Input, PageHeader, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { updateSettingsAction } from "@/lib/actions/org";
import { requireOrg } from "@/lib/auth/session";
import { defaultSignpost } from "@/lib/docs/letters";
import { ORG_KINDS, optionLabel } from "@/lib/domain";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, org, role } = await requireOrg();
  const s = org.settings ?? {};
  const owner = role === "owner";
  const sector = org.kind === "social_landlord" ? "social" : "private";

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
              To close your workspace and delete its data, email <a className="underline" href="mailto:support@repairclock.co.uk">support@repairclock.co.uk</a> from the
              owner&apos;s address. We delete within 30 days, except records we must keep by law (e.g. invoices).
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}
