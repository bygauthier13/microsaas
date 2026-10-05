import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, FileText, Image as ImageIcon, RotateCcw } from "lucide-react";
import { ClockStrip, DutyBadge, OverallBadge, countdown, dueLabel } from "@/components/duty";
import { Alert, Badge, buttonClass, Card } from "@/components/ui";
import { InvestigationForm } from "@/components/case/investigation-form";
import { SummaryEditor } from "@/components/case/summary-editor";
import {
  ApprovalForm,
  BookingForm,
  CloseForm,
  CompletionForm,
  DelayForm,
  NoteForm,
  RepairStartForm,
  SafetyForm,
  StepsForm,
  TargetForm,
  UploadForm,
} from "@/components/case/panels";
import { Timeline } from "@/components/case/timeline";
import { cancelApprovalAction, reopenCaseAction } from "@/lib/actions/cases";
import { aiConfigured } from "@/lib/ai/draft";
import { requireOrg } from "@/lib/auth/session";
import { getCaseDetail, propertyAddress } from "@/lib/cases/service";
import { draftWrittenSummary } from "@/lib/docs/letters";
import { CASE_STATUS_LABELS, CAUSES, SOURCES, formatPence, optionLabel } from "@/lib/domain";
import { isOpenStatus, type DutyResult } from "@/lib/rules/engine";
import { formatInstant, formatIsoDate, londonDateOf, londonParts } from "@/lib/rules/calendar";
import { hazardLabel, type HazardKey } from "@/lib/rules/hazards";

export async function generateMetadata({ params }: PageProps<"/app/cases/[id]">) {
  const { id } = await params;
  return { title: `Case ${id.slice(0, 8)}` };
}

const DOC_LABEL: Record<string, string> = {
  photo: "Photo",
  report: "Report",
  written_summary: "Written summary",
  delay_notice: "Delay notice",
  quote: "Quote",
  other: "File",
};

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function CasePage({ params, searchParams }: PageProps<"/app/cases/[id]">) {
  const { org } = await requireOrg();
  const { id } = await params;
  const sp = await searchParams;
  const detail = await getCaseDetail(org.id, id);
  if (!detail) notFound();

  const { case: c, property: p, landlord, evaluation: ev } = detail;
  const scotland = p.jurisdiction === "scotland";
  const england = !scotland;
  const closed = c.status === "closed";
  const now = new Date();
  const todayIso = londonDateOf(now);
  const parts = londonParts(now);
  const nowTime = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
  const base = { caseId: c.id, todayIso, nowTime };
  const isAgent = org.kind === "letting_agent";

  const actionable = closed
    ? []
    : ev.duties.filter((d) => isOpenStatus(d.status)).sort((a, b) => sortKey(a) - sortKey(b));
  const allDone = !closed && ev.duties.length > 0 && ev.duties.every((d) => ["met", "met_late", "not_required"].includes(d.status));
  const delayable = ev.duties
    .filter((d) => isOpenStatus(d.status) && d.dueKind !== "none" && d.key !== "written_summary")
    .map((d) => ({ key: d.key, label: d.shortLabel, due: dueLabel(d) }));

  const summaryDraft = c.investigationCompletedAt
    ? draftWrittenSummary({ orgName: org.name, settings: org.settings ?? {}, property: p, caseRow: c, evaluation: ev }).body
    : "";
  const ai = aiConfigured();
  const pendingApprovals = detail.approvals.filter((a) => a.status === "pending");

  function dutyForm(d: DutyResult) {
    switch (d.key) {
      case "investigate":
      case "investigate_24h":
        return (
          <div className="space-y-6">
            <InvestigationForm
              caseId={c.id}
              jurisdiction={p.jurisdiction}
              todayIso={todayIso}
              nowTime={nowTime}
              awareIso={londonDateOf(c.awareAt)}
            />
            <details className="rounded-lg border border-line bg-paper px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium">Not visited yet? Record the appointment</summary>
              <div className="pt-4">
                <BookingForm {...base} />
              </div>
            </details>
          </div>
        );
      case "written_summary":
        return (
          <SummaryEditor
            caseId={c.id}
            initialBody={summaryDraft}
            jurisdiction={p.jurisdiction}
            hazardFound={c.hazardFound}
            tenantEmail={p.tenantEmail}
            aiEnabled={ai}
            todayIso={todayIso}
            nowTime={nowTime}
            dueLabel={dueLabel(d)}
          />
        );
      case "commence_repair":
        return <RepairStartForm {...base} england={false} />;
      case "supplementary_start":
        return <RepairStartForm {...base} england />;
      case "safety_work":
        return <SafetyForm {...base} />;
      case "supplementary_steps":
        return <StepsForm {...base} />;
      case "complete_repair":
        return (
          <div className="space-y-6">
            <CompletionForm {...base} />
            {d.dueKind === "reasonable" || !c.repairTargetDate ? (
              <div className="border-t border-line pt-5">
                <TargetForm caseId={c.id} current={c.repairTargetDate} />
              </div>
            ) : null}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/cases" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden /> All cases
        </Link>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">
            <span className="font-mono">{c.reference}</span> · {hazardLabel(c.hazard as HazardKey)}
          </p>
          <h1 className="display mt-1 text-[1.7rem] leading-tight sm:text-3xl break-words">{propertyAddress(p)}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <OverallBadge overall={ev.overall} />
            <Badge>{CASE_STATUS_LABELS[c.status] ?? c.status}</Badge>
            <span>{ev.regimeLabel}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a href={`/api/cases/${c.id}/evidence-pack`} className={buttonClass("secondary", "md")}>
            <Download className="h-4 w-4" aria-hidden /> Evidence pack
          </a>
          {closed ? (
            <form action={reopenCaseAction}>
              <input type="hidden" name="caseId" value={c.id} />
              <button type="submit" className={buttonClass("ghost", "md")}>
                <RotateCcw className="h-4 w-4" aria-hidden /> Reopen
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {sp.created === "1" ? (
        <Alert tone="ok" title="Report logged — the statutory clock is running">
          Every deadline below is calculated in working days from the day after you became aware, skipping weekends and{" "}
          {scotland ? "Scottish" : "English"} bank holidays. You&apos;ll get a digest email each morning while anything is due.
        </Alert>
      ) : null}
      {closed ? (
        <Alert tone="neutral" title={`Closed ${c.closedAt ? formatInstant(c.closedAt) : ""}`}>
          {c.closeReason}. If the damp or mould returns or appears somewhere new, log a new report — the timescales start again.
        </Alert>
      ) : null}
      {ev.scopeNote ? <Alert tone={ev.inForce ? "info" : "warn"}>{ev.scopeNote}</Alert> : null}
      {ev.warnings.map((w) => (
        <Alert key={w} tone="bad">
          {w}
        </Alert>
      ))}
      {ev.compensation && ev.compensation.total > 0 ? (
        <Alert tone="warn" title={`Right to Repair compensation: ${formatPence(ev.compensation.total * 100)}`}>
          Late investigation: {formatPence(ev.compensation.investigation * 100)} · late start of repairs: {formatPence(ev.compensation.commencement * 100)}. Scottish
          secure tenants are entitled to compensation for each working day a qualifying deadline is missed (capped at £100 per repair).
        </Alert>
      ) : null}

      <ClockStrip evaluation={ev} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {actionable.length ? (
            <section className="space-y-3" aria-labelledby="due-heading">
              <h2 id="due-heading" className="text-lg font-semibold">
                What&apos;s due
              </h2>
              {actionable.map((d, i) => (
                <details key={d.key} open={i === 0} className="card group overflow-hidden">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted">
                        {d.window} · {d.basis}
                      </p>
                      <h3 className="mt-0.5 font-semibold">{d.label}</h3>
                      <p className="mt-0.5 text-sm text-ink-2 tabular">
                        {d.dueKind === "none" ? null : <>Due {dueLabel(d)} · </>}
                        <span className={d.status === "overdue" || d.status === "extended_overdue" ? "font-medium text-bad" : ""}>{countdown(d)}</span>
                      </p>
                      {d.holidaysInWindow?.length ? (
                        <p className="mt-1 text-xs text-muted">
                          Skips {d.holidaysInWindow.map((h) => `${h.name} (${formatIsoDate(h.date)})`).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <DutyBadge status={d.status} />
                  </summary>
                  <div className="border-t border-line px-4 py-5 sm:px-5">
                    {d.delay ? (
                      <Alert tone={d.delay.legallyExtends ? "info" : "warn"} className="mb-4">
                        Delay notice issued {formatInstant(d.delay.noticeIssuedAt)} — revised date {formatIsoDate(d.delay.revisedDate)}. {d.delay.reason}.
                        {d.delay.issuedAfterDeadline ? " Note: the notice was issued after the original deadline." : ""}
                      </Alert>
                    ) : null}
                    {d.note ? <p className="mb-4 text-sm text-muted leading-relaxed">{d.note}</p> : null}
                    {dutyForm(d)}
                  </div>
                </details>
              ))}
            </section>
          ) : null}

          {allDone ? (
            <Card className="p-5">
              <h2 className="font-semibold">Every statutory step is recorded</h2>
              <p className="mt-1 text-sm text-muted">Close the case once you&apos;re satisfied the problem won&apos;t come back. You can reopen it at any time.</p>
              <div className="mt-4">
                <CloseForm caseId={c.id} />
              </div>
            </Card>
          ) : null}

          {!closed ? (
            <section className="space-y-3" aria-labelledby="more-heading">
              <h2 id="more-heading" className="text-lg font-semibold">
                More actions
              </h2>
              <div className="card divide-y divide-line overflow-hidden">
                <Disclosure title="Upload photos, reports or quotes" subtitle="Timestamped and fingerprinted for the evidence pack">
                  <UploadForm caseId={c.id} />
                </Disclosure>
                <Disclosure title="Log a note or contact attempt" subtitle="Access attempts are your evidence if a deadline slips">
                  <NoteForm {...base} />
                </Disclosure>
                {isAgent ? (
                  <Disclosure
                    title="Ask the landlord to approve work"
                    subtitle={landlord ? `One-click link for ${landlord.name}` : "Link a landlord to this home first"}
                  >
                    {landlord ? (
                      landlord.email ? (
                        <ApprovalForm
                          caseId={c.id}
                          todayIso={todayIso}
                          landlordName={landlord.name}
                          defaultKind={c.investigationCompletedAt ? "repair" : "investigation"}
                        />
                      ) : (
                        <p className="text-sm text-muted">
                          Add an email address for {landlord.name} on the{" "}
                          <Link href="/app/landlords" className="underline">
                            Landlords
                          </Link>{" "}
                          page to send approval links.
                        </p>
                      )
                    ) : (
                      <p className="text-sm text-muted">
                        This home has no landlord linked.{" "}
                        <Link href={`/app/properties?edit=${p.id}`} className="underline">
                          Edit the home
                        </Link>{" "}
                        to choose one.
                      </p>
                    )}
                  </Disclosure>
                ) : null}
                {delayable.length ? (
                  <Disclosure title="Issue a delay notice" subtitle="When something beyond your control stops you meeting a timescale">
                    <DelayForm {...base} duties={delayable} tenantEmail={p.tenantEmail} scotland={scotland} />
                  </Disclosure>
                ) : null}
                {england && (c.safetyWorkCompletedAt || c.repairCommencedAt) && !c.repairCompletedAt ? (
                  <Disclosure title="Record that all work is complete" subtitle="Moves the case to monitoring">
                    <CompletionForm {...base} />
                  </Disclosure>
                ) : null}
                {c.summaryIssuedAt && c.investigationCompletedAt ? (
                  <Disclosure title="Issue an updated written summary" subtitle="If findings or plans change">
                    <SummaryEditor
                      caseId={c.id}
                      initialBody={summaryDraft}
                      jurisdiction={p.jurisdiction}
                      hazardFound={c.hazardFound}
                      tenantEmail={p.tenantEmail}
                      aiEnabled={ai}
                      todayIso={todayIso}
                      nowTime={nowTime}
                      reissue
                    />
                  </Disclosure>
                ) : null}
                {!allDone ? (
                  <Disclosure title="Close this case" subtitle="E.g. logged in error, or the tenancy ended">
                    <CloseForm caseId={c.id} />
                  </Disclosure>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="space-y-3" aria-labelledby="timeline-heading">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="timeline-heading" className="text-lg font-semibold">
                Timeline
              </h2>
              <p className="text-xs text-muted">Append-only — entries can&apos;t be edited or deleted.</p>
            </div>
            <Card className="p-4 sm:p-5">
              <Timeline events={detail.events} />
            </Card>
          </section>
        </div>

        <aside className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h2 className="font-semibold">The report</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Became aware">{formatInstant(c.awareAt)}</Row>
              <Row label="Source">{optionLabel(SOURCES, c.source)}</Row>
              {c.reportedBy ? <Row label="Reported by">{c.reportedBy}</Row> : null}
              <Row label="Tenant">
                {p.tenantName ?? <span className="text-faint">Not recorded</span>}
                {p.tenantEmail ? <span className="block text-muted break-all">{p.tenantEmail}</span> : null}
                {p.tenantPhone ? <span className="block text-muted">{p.tenantPhone}</span> : null}
              </Row>
              {isAgent ? <Row label="Landlord">{landlord ? landlord.name : <span className="text-faint">None linked</span>}</Row> : null}
              {c.rooms ? <Row label="Rooms">{c.rooms}</Row> : null}
              {c.vulnerability ? (
                <Row label="Vulnerability">
                  <span className="text-warn font-medium">{c.vulnerability}</span>
                </Row>
              ) : null}
              <Row label="Description">
                <span className="whitespace-pre-line">{c.description}</span>
              </Row>
              {c.investigationCompletedAt ? (
                <>
                  <Row label="Investigated">
                    {formatInstant(c.investigationCompletedAt)} · {c.investigationMethod === "remote" ? "remote" : "in person"}
                    {c.investigators ? <span className="block text-muted">{c.investigators}</span> : null}
                  </Row>
                  {c.cause ? <Row label="Cause">{optionLabel(CAUSES, c.cause)}</Row> : null}
                  {c.findings ? (
                    <Row label="Findings">
                      <span className="whitespace-pre-line">{c.findings}</span>
                    </Row>
                  ) : null}
                </>
              ) : c.investigationBookedFor ? (
                <Row label="Visit booked">{formatInstant(c.investigationBookedFor)}</Row>
              ) : null}
              {c.repairTargetDate ? <Row label="Target completion">{formatIsoDate(c.repairTargetDate)}</Row> : null}
            </dl>
          </Card>

          {isAgent && detail.approvals.length ? (
            <Card className="p-4 sm:p-5">
              <h2 className="font-semibold">Landlord approvals</h2>
              <ul className="mt-3 space-y-3">
                {detail.approvals.map((a) => (
                  <li key={a.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{a.description}</p>
                      <Badge tone={a.status === "approved" ? "ok" : a.status === "declined" ? "bad" : a.status === "pending" ? "warn" : "neutral"}>
                        {a.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted">
                      {formatPence(a.amountPence) ? `${formatPence(a.amountPence)} · ` : ""}
                      sent {formatInstant(a.createdAt)}
                      {a.respondedAt ? ` · answered ${formatInstant(a.respondedAt)}` : ""}
                    </p>
                    {a.responseNote ? <p className="mt-1 text-xs text-ink-2">“{a.responseNote}”</p> : null}
                    {a.status === "pending" ? (
                      <form action={cancelApprovalAction} className="mt-1">
                        <input type="hidden" name="caseId" value={c.id} />
                        <input type="hidden" name="approvalId" value={a.id} />
                        <button type="submit" className="text-xs text-muted underline underline-offset-2 hover:text-ink">
                          Withdraw request
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
              {pendingApprovals.length ? (
                <p className="mt-3 text-xs text-muted">Reminders go to the landlord automatically each morning until they answer.</p>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-semibold">Documents</h2>
              <span className="text-xs text-muted">{detail.documents.length}</span>
            </div>
            {detail.documents.length ? (
              <ul className="mt-3 space-y-2">
                {detail.documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/api/documents/${d.id}`}
                      target="_blank"
                      rel="noopener"
                      className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 -mx-2 hover:bg-paper"
                    >
                      {d.mime.startsWith("image/") ? (
                        <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                      ) : (
                        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium group-hover:underline">{d.filename}</span>
                        <span className="block text-xs text-muted">
                          {DOC_LABEL[d.kind] ?? "File"} · {fileSize(d.size)} · {formatInstant(d.createdAt)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Letters you issue and files you upload appear here.</p>
            )}
            <a href={`/api/cases/${c.id}/evidence-pack`} className={buttonClass("secondary", "sm", "mt-4 w-full")}>
              <Download className="h-4 w-4" aria-hidden /> Download evidence pack (PDF)
            </a>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function sortKey(d: DutyResult): number {
  if (d.dueAt) return d.dueAt.getTime();
  if (d.status === "extended" && d.delay) return Date.parse(`${d.delay.revisedDate}T23:59:59Z`);
  if (d.dueDate) return Date.parse(`${d.dueDate}T23:59:59Z`);
  return Number.POSITIVE_INFINITY;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink break-words">{children}</dd>
    </div>
  );
}

function Disclosure({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 hover:bg-paper [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="block text-sm font-medium">{title}</span>
          {subtitle ? <span className="block text-xs text-muted">{subtitle}</span> : null}
        </span>
        <span className="text-muted transition-transform group-open:rotate-45 text-xl leading-none" aria-hidden>
          +
        </span>
      </summary>
      <div className="px-4 pb-5 pt-1 sm:px-5">{children}</div>
    </details>
  );
}
