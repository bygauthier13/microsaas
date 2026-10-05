/**
 * Server-rendered case forms. Each posts to a server action through <ActionForm>, which shows
 * inline errors/success without losing the user's place on the page.
 */
import { Field, Input, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import {
  addNoteAction,
  bookInvestigationAction,
  closeCaseAction,
  delayNoticeAction,
  repairCommencedAction,
  repairCompletedAction,
  requestApprovalAction,
  safetyWorkAction,
  setTargetAction,
  supplementaryStepsAction,
} from "@/lib/actions/cases";
import { uploadDocumentsAction } from "@/lib/actions/documents";
import { DELAY_REASONS } from "@/lib/domain";
import { ActionForm } from "./action-form";

interface Base {
  caseId: string;
  todayIso: string;
  nowTime: string;
}

function DateTime({ prefix, label, todayIso, nowTime, allowFuture = false }: { prefix: string; label: string; todayIso: string; nowTime: string; allowFuture?: boolean }) {
  return (
    <>
      <Field label={label} htmlFor={`${prefix}_date`}>
        <Input id={`${prefix}_date`} name={`${prefix}_date`} type="date" defaultValue={todayIso} max={allowFuture ? undefined : todayIso} required />
      </Field>
      <Field label="Time" htmlFor={`${prefix}_time`}>
        <Input id={`${prefix}_time`} name={`${prefix}_time`} type="time" defaultValue={nowTime} />
      </Field>
    </>
  );
}

export function BookingForm({ caseId, todayIso, nowTime }: Base) {
  return (
    <ActionForm action={bookInvestigationAction} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <DateTime prefix="booked" label="Appointment date" todayIso={todayIso} nowTime={nowTime} allowFuture />
        <Field label="With" htmlFor="investigator">
          <Input id="investigator" name="investigator" placeholder="Contractor or surveyor" />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save appointment
      </SubmitButton>
    </ActionForm>
  );
}

export function RepairStartForm({ caseId, todayIso, nowTime, england }: Base & { england: boolean }) {
  return (
    <ActionForm action={repairCommencedAction} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DateTime prefix="commenced" label={england ? "Date work physically began" : "Date repairs began"} todayIso={todayIso} nowTime={nowTime} />
        <Field label="Contractor" htmlFor="contractor">
          <Input id="contractor" name="contractor" placeholder="Firm or person" />
        </Field>
        <Field label="Target completion" htmlFor="targetCompletion">
          <Input id="targetCompletion" name="targetCompletion" type="date" min={todayIso} />
        </Field>
      </div>
      <Field label="What work began" htmlFor="commenced-desc" hint="Ordering parts alone isn't commencing work — record the first physical repair step.">
        <Textarea id="commenced-desc" name="description" rows={2} required placeholder="Extractor fan replaced; mould treatment to bedroom ceiling started." />
      </Field>
      <SubmitButton pendingLabel="Saving…">Record start of work</SubmitButton>
    </ActionForm>
  );
}

export function SafetyForm({ caseId, todayIso, nowTime }: Base) {
  return (
    <ActionForm action={safetyWorkAction} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTime prefix="completed" label="Made safe on" todayIso={todayIso} nowTime={nowTime} />
      </div>
      <Field label="What was done" htmlFor="safety-desc" hint="Temporary measures count if they remove the risk (e.g. dehumidifier, isolating a circuit).">
        <Textarea id="safety-desc" name="description" rows={2} required placeholder="Mould removed from bedroom; two dehumidifiers installed; leak isolated." />
      </Field>
      <SubmitButton pendingLabel="Saving…">Record safety work</SubmitButton>
    </ActionForm>
  );
}

export function StepsForm({ caseId, todayIso, nowTime }: Base) {
  return (
    <ActionForm action={supplementaryStepsAction} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTime prefix="steps" label="Steps taken on" todayIso={todayIso} nowTime={nowTime} />
      </div>
      <Field label="Steps taken" htmlFor="steps-desc">
        <Textarea id="steps-desc" name="description" rows={2} required placeholder="Specialist ventilation survey booked; roofer instructed for gutter repair." />
      </Field>
      <SubmitButton pendingLabel="Saving…">Record steps</SubmitButton>
    </ActionForm>
  );
}

export function CompletionForm({ caseId, todayIso, nowTime }: Base) {
  return (
    <ActionForm action={repairCompletedAction} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <DateTime prefix="completed" label="Completed on" todayIso={todayIso} nowTime={nowTime} />
      </div>
      <Field label="Completion notes" htmlFor="completion-notes">
        <Textarea id="completion-notes" name="notes" rows={2} placeholder="Works signed off; tenant satisfied; follow-up check booked for 4 weeks." />
      </Field>
      <SubmitButton pendingLabel="Saving…">Record completion</SubmitButton>
    </ActionForm>
  );
}

export function TargetForm({ caseId, current }: { caseId: string; current: string | null }) {
  return (
    <ActionForm action={setTargetAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <Field label="Your target completion date" htmlFor="target" hint="Private landlords must complete repairs within a reasonable time — record the target you're working to.">
        <Input id="target" name="target" type="date" defaultValue={current ?? undefined} required className="w-auto" />
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Saving…">
        Save target
      </SubmitButton>
    </ActionForm>
  );
}

export function DelayForm({
  caseId,
  todayIso,
  nowTime,
  duties,
  tenantEmail,
  scotland,
}: Base & { duties: Array<{ key: string; label: string; due: string }>; tenantEmail: string | null; scotland: boolean }) {
  return (
    <ActionForm action={delayNoticeAction} className="space-y-4">
      <input type="hidden" name="caseId" value={caseId} />
      <p className="text-sm text-muted leading-relaxed">
        {scotland
          ? "If circumstances beyond your control stop you meeting a timescale, tell the tenant in writing — the reason, and when you now expect to comply. Giving notice before the deadline is what protects you."
          : "Awaab's Law has no formal extension, but you must keep records showing why a timescale couldn't be met and what you did instead. This notice gives the tenant that explanation in writing."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Which timescale can't be met?" htmlFor="duty">
          <Select id="duty" name="duty" required>
            {duties.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label} (due {d.due})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Revised date" htmlFor="revisedDate" hint="When you now expect to comply.">
          <Input id="revisedDate" name="revisedDate" type="date" min={todayIso} required />
        </Field>
        <Field label="Reason" htmlFor="reasonPreset">
          <Select id="reasonPreset" name="reasonPreset" defaultValue={DELAY_REASONS[0]}>
            {DELAY_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
            <option value="">Other (describe below)</option>
          </Select>
        </Field>
        <Field label="Details" htmlFor="reasonDetail" hint="Be specific: who you tried, when, what they said.">
          <Input id="reasonDetail" name="reasonDetail" placeholder="3 contractors contacted 7–8 Oct; earliest slot 21 Oct" />
        </Field>
      </div>
      <Field label="What you'll do in the meantime" htmlFor="interimSteps">
        <Textarea id="interimSteps" name="interimSteps" rows={2} placeholder="Dehumidifier delivered 8 Oct; weekly check-in calls with the tenant." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DateTime prefix="issued" label="Notice date" todayIso={todayIso} nowTime={nowTime} />
        <Field label="How it's given" htmlFor="delay-method">
          <Select id="delay-method" name="method" defaultValue={tenantEmail ? "email" : "post"}>
            <option value="email">Email</option>
            <option value="post">Post</option>
            <option value="hand">By hand</option>
            <option value="portal">Tenant portal / app</option>
          </Select>
        </Field>
        <div className="flex items-end">
          {tenantEmail ? (
            <label className="flex items-start gap-2 text-sm leading-snug">
              <input type="checkbox" name="sendEmail" value="yes" defaultChecked className="mt-0.5 h-4 w-4 accent-[var(--color-ink)]" />
              <span>Email it to the tenant (if sending by email)</span>
            </label>
          ) : (
            <p className="text-xs text-muted">No tenant email on file — the PDF is filed for you to send.</p>
          )}
        </div>
      </div>
      <SubmitButton variant="signal" pendingLabel="Issuing…">
        Issue delay notice
      </SubmitButton>
    </ActionForm>
  );
}

export function ApprovalForm({ caseId, todayIso, landlordName, defaultKind }: { caseId: string; todayIso: string; landlordName: string; defaultKind: "investigation" | "repair" }) {
  return (
    <ActionForm action={requestApprovalAction} className="space-y-4" resetOnSuccess>
      <input type="hidden" name="caseId" value={caseId} />
      <p className="text-sm text-muted leading-relaxed">
        {landlordName} gets a one-time link showing the work, the cost and the legal deadline. They approve or decline in one click — no login — and the
        decision lands on this case&apos;s timeline.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="For" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue={defaultKind}>
            <option value="investigation">Investigation / survey</option>
            <option value="repair">Repair work</option>
          </Select>
        </Field>
        <Field label="Cost (£, optional)" htmlFor="amount">
          <Input id="amount" name="amount" inputMode="decimal" placeholder="420" />
        </Field>
      </div>
      <Field label="Work to approve" htmlFor="approval-desc">
        <Textarea id="approval-desc" name="description" rows={2} required placeholder="Replace bathroom extractor fan and treat bedroom ceiling (quote attached to case)." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contractor (optional)" htmlFor="approval-contractor">
          <Input id="approval-contractor" name="contractor" placeholder="Reid Damp Surveys Ltd" />
        </Field>
        <Field label="Respond by (optional)" htmlFor="respondBy">
          <Input id="respondBy" name="respondBy" type="date" min={todayIso} />
        </Field>
      </div>
      <SubmitButton pendingLabel="Sending…">Send approval link</SubmitButton>
    </ActionForm>
  );
}

export function UploadForm({ caseId }: { caseId: string }) {
  return (
    <ActionForm action={uploadDocumentsAction} className="space-y-4" resetOnSuccess>
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <Field label="Type" htmlFor="upload-kind">
          <Select id="upload-kind" name="kind" defaultValue="photo">
            <option value="photo">Photos</option>
            <option value="report">Report / survey</option>
            <option value="quote">Quote / invoice</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Files" htmlFor="files" hint="JPG, PNG, WebP, HEIC or PDF · up to 8 files, 8 MB each. Each file is fingerprinted (SHA-256) for the evidence pack.">
          <input
            id="files"
            name="files"
            type="file"
            multiple
            required
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="block w-full text-sm file:mr-3 file:h-9 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:text-sm file:font-medium hover:file:bg-paper"
          />
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingLabel="Uploading…">
        Upload
      </SubmitButton>
    </ActionForm>
  );
}

export function NoteForm({ caseId, todayIso, nowTime }: Base) {
  return (
    <ActionForm action={addNoteAction} className="space-y-4" resetOnSuccess>
      <input type="hidden" name="caseId" value={caseId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Type" htmlFor="note-kind">
          <Select id="note-kind" name="kind" defaultValue="note">
            <option value="note">Note</option>
            <option value="contact_attempt">Contact attempt (no answer)</option>
            <option value="access_refused">Access not possible</option>
            <option value="tenant_contact">Spoke to tenant</option>
            <option value="landlord_contact">Spoke to landlord</option>
          </Select>
        </Field>
        <Field label="When" htmlFor="at_date">
          <Input id="at_date" name="at_date" type="date" defaultValue={todayIso} max={todayIso} />
        </Field>
        <Field label="Time" htmlFor="at_time">
          <Input id="at_time" name="at_time" type="time" defaultValue={nowTime} />
        </Field>
      </div>
      <Field label="Details" htmlFor="note" hint="Access attempts matter: they're your evidence if a deadline is missed for reasons outside your control.">
        <Textarea id="note" name="note" rows={2} required placeholder="Called tenant 10:15 to arrange access — no answer, voicemail left; follow-up text sent." />
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Adding…">
        Add to timeline
      </SubmitButton>
    </ActionForm>
  );
}

export function CloseForm({ caseId }: { caseId: string }) {
  return (
    <ActionForm action={closeCaseAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="caseId" value={caseId} />
      <Field label="Reason for closing" htmlFor="close-reason" className="min-w-[240px] flex-1">
        <Select id="close-reason" name="reason" defaultValue="Repairs completed and no recurrence">
          <option>Repairs completed and no recurrence</option>
          <option>Home found substantially free from damp and mould</option>
          <option>No hazard found — no further action</option>
          <option>Tenancy ended</option>
          <option>Logged in error / duplicate</option>
        </Select>
      </Field>
      <SubmitButton variant="secondary" pendingLabel="Closing…">
        Close case
      </SubmitButton>
    </ActionForm>
  );
}
