import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { CheckCircle2, Circle, FolderClock, PlayCircle, Plus, Upload } from "lucide-react";
import { DemoTour } from "@/components/app/demo-tour";
import { CaseListHeader, CaseRow, sortByUrgency } from "@/components/case/case-row";
import { Alert, Card, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { GuideVideoButton } from "@/components/video";
import { requireOrg } from "@/lib/auth/session";
import { listCases } from "@/lib/cases/service";
import { getDb } from "@/lib/db";
import { caseEvents, properties } from "@/lib/db/schema";
import { compareIso, formatIsoDateLong, londonDateOf, londonParts } from "@/lib/rules/calendar";
import { SCOTLAND_COMMENCEMENT } from "@/lib/rules/hazards";

export const metadata = { title: "Today" };

export default async function DashboardPage() {
  const { user, org } = await requireOrg();
  const db = await getDb();
  const [items, [homes], [summaries]] = await Promise.all([
    listCases(org.id),
    db.select({ n: count() }).from(properties).where(and(eq(properties.orgId, org.id), isNull(properties.archivedAt))),
    db.select({ n: count() }).from(caseEvents).where(and(eq(caseEvents.orgId, org.id), eq(caseEvents.type, "summary_issued"))),
  ]);
  const todayIso = londonDateOf(new Date());
  const sorted = sortByUrgency(items);
  const overdue = items.filter((i) => i.evaluation.overall === "overdue").length;
  const dueToday = items.filter((i) => i.evaluation.overall === "due_today").length;
  const dueSoon = items.filter((i) => i.evaluation.overall === "due_soon").length;
  const awaiting = items.filter((i) => i.pendingApproval).length;
  const attention = sorted.filter((i) => ["overdue", "due_today", "due_soon"].includes(i.evaluation.overall));
  const rest = sorted.filter((i) => !attention.includes(i));
  const homesCount = Number(homes?.n ?? 0);
  const hasInvestigation = items.some((i) => i.case.investigationCompletedAt);
  const steps = [
    { done: true, label: "Create your workspace" },
    { done: items.length > 0, label: "Log a damp or mould report", href: "/app/cases/new" },
    { done: hasInvestigation, label: "Record the investigation", href: items[0] ? `/app/cases/${items[0].case.id}` : undefined },
    { done: Number(summaries?.n ?? 0) > 0, label: "Issue the written summary", href: items[0] ? `/app/cases/${items[0].case.id}` : undefined },
    { done: homesCount >= 5, label: "Add the rest of your homes (CSV import)", href: "/app/properties#import" },
  ];
  const showSetup = !org.isDemo && steps.some((s) => !s.done);
  const firstName = (user.name || "").split(" ")[0];
  const hour = londonParts(new Date()).hour;
  const greeting = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
  const preCommencement = compareIso(todayIso, SCOTLAND_COMMENCEMENT) < 0 && org.jurisdiction === "scotland";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={formatIsoDateLong(todayIso)}
        title={firstName ? `${greeting}, ${firstName}.` : "Today"}
        description={
          items.length
            ? overdue + dueToday
              ? `${overdue + dueToday} case${overdue + dueToday === 1 ? " needs" : "s need"} action today.`
              : "Nothing is overdue. Here's what's coming up."
            : "Log a report and RepairClock works out every statutory deadline for you."
        }
        actions={
          <LinkButton href="/app/cases/new" variant="signal">
            <Plus className="h-4 w-4" aria-hidden /> Log a report
          </LinkButton>
        }
      />

      {org.isDemo ? <DemoTour items={items} /> : null}

      {preCommencement ? (
        <Alert tone="signal" title={`The Scottish Regulations come into force on ${formatIsoDateLong(SCOTLAND_COMMENCEMENT)}`}>
          Reports you become aware of from that date carry statutory clocks for private and social tenancies. Anything logged before then is tracked as
          good practice.
        </Alert>
      ) : null}

      {items.length ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Overdue" value={overdue} tone={overdue ? "bad" : undefined} hint="Past a statutory deadline" />
          <Stat label="Due today" value={dueToday} tone={dueToday ? "signal" : undefined} hint="Deadline ends today" />
          <Stat label="Due soon" value={dueSoon} tone={dueSoon ? "warn" : undefined} hint="Within 2 working days" />
          <Stat label="Awaiting landlord" value={awaiting} hint="Approval links not answered" />
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {items.length === 0 ? (
            <EmptyState
              icon={<FolderClock className="h-5 w-5" />}
              title="No open cases"
              body={
                <>
                  When a tenant reports damp or mould, log it here with the date you became aware. You&apos;ll see the investigation, written summary and repair
                  deadlines straight away.
                </>
              }
              action={
                <>
                  <LinkButton href="/app/cases/new" variant="signal">
                    Log a report
                  </LinkButton>
                  <LinkButton href="/app/properties#import" variant="secondary">
                    <Upload className="h-4 w-4" aria-hidden /> Import homes
                  </LinkButton>
                </>
              }
            />
          ) : (
            <>
              {attention.length ? (
                <section aria-labelledby="attention">
                  <h2 id="attention" className="mb-2 text-lg font-semibold">
                    Needs attention
                  </h2>
                  <Card className="overflow-hidden">
                    <CaseListHeader />
                    <ul className="divide-y divide-line">
                      {attention.map((i) => (
                        <CaseRow key={i.case.id} item={i} />
                      ))}
                    </ul>
                  </Card>
                </section>
              ) : null}
              {rest.length ? (
                <section aria-labelledby="open">
                  <h2 id="open" className="mb-2 text-lg font-semibold">
                    {attention.length ? "Everything else open" : "Open cases"}
                  </h2>
                  <Card className="overflow-hidden">
                    <CaseListHeader />
                    <ul className="divide-y divide-line">
                      {rest.map((i) => (
                        <CaseRow key={i.case.id} item={i} />
                      ))}
                    </ul>
                  </Card>
                </section>
              ) : null}
            </>
          )}
        </div>

        <aside className="space-y-4">
          {showSetup ? (
            <Card className="p-4 sm:p-5">
              <p className="eyebrow">Getting set up</p>
              <ol className="mt-3 space-y-2.5">
                {steps.map((s) => (
                  <li key={s.label} className="flex items-start gap-2.5 text-sm">
                    {s.done ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-faint" aria-hidden />
                    )}
                    {s.href && !s.done ? (
                      <Link href={s.href} className="font-medium underline-offset-2 hover:underline">
                        {s.label}
                      </Link>
                    ) : (
                      <span className={s.done ? "text-muted line-through decoration-faint" : ""}>{s.label}</span>
                    )}
                  </li>
                ))}
              </ol>
              <GuideVideoButton className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-signal-strong underline-offset-2 hover:underline">
                <PlayCircle className="h-4 w-4" aria-hidden /> Watch the 2-minute setup guide
              </GuideVideoButton>
            </Card>
          ) : null}
          <Card className="p-4 sm:p-5">
            <p className="eyebrow">How the clock counts</p>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-2">
              <li>Day 1 is the working day after you became aware — weekends and bank holidays don&apos;t count.</li>
              <li>
                {org.jurisdiction === "scotland"
                  ? "Scotland: investigate within 10 working days, written summary within 3, start repairs within 5 of the investigation."
                  : "England (Awaab's Law): emergency hazards within 24 hours; investigate significant hazards within 10 working days, summary within 3, make safe within 5."}
              </li>
              <li>Can&apos;t make a deadline for reasons outside your control? Issue a delay notice before it passes.</li>
            </ul>
            <Link href="/tools/deadline-calculator" className="mt-3 inline-block text-sm font-medium underline underline-offset-2">
              Open the deadline calculator
            </Link>
          </Card>
        </aside>
      </div>
    </div>
  );
}
