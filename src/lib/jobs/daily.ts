/**
 * The once-a-day job (Vercel Cron → /api/cron/daily, or `npm run cron:daily` from any scheduler):
 *  1. delete expired demo workspaces
 *  2. weekday morning deadline digests to each workspace's team
 *  3. landlord approval reminders (rotating the one-time link)
 *  4. trial-ending reminders
 *  5. expire simulated subscriptions; tidy sessions, reset tokens and rate-limit rows
 */
import { and, count, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { addEvent, listCases, propertyAddress } from "@/lib/cases/service";
import { getDb } from "@/lib/db";
import {
  approvalRequests,
  cases,
  landlords,
  memberships,
  organizations,
  outboxEmails,
  passwordResets,
  properties,
  rateLimits,
  sessions,
  users,
} from "@/lib/db/schema";
import { agencySender, sendEmail } from "@/lib/email/send";
import { approvalRequestEmail, digestEmail, firstReportNudgeEmail, importHomesNudgeEmail, trialEndingEmail } from "@/lib/email/templates";
import { formatPence } from "@/lib/domain";
import { env } from "@/lib/env";
import { orgAccess } from "@/lib/billing/plans";
import { addWorkingDays, dayOfWeek, formatInstant, formatIsoDate, formatIsoDateLong, londonDateOf } from "@/lib/rules/calendar";
import { randomToken, sha256 } from "@/lib/security/crypto";

export interface DailyReport {
  demoWorkspacesDeleted: number;
  digestsSent: number;
  approvalRemindersSent: number;
  trialRemindersSent: number;
  nudgesSent: number;
  subscriptionsExpired: number;
}

const DAY = 86_400_000;

export async function runDailyJobs(now = new Date()): Promise<DailyReport> {
  const db = await getDb();
  const report: DailyReport = { demoWorkspacesDeleted: 0, digestsSent: 0, approvalRemindersSent: 0, trialRemindersSent: 0, nudgesSent: 0, subscriptionsExpired: 0 };

  // 1. Demo workspaces past their expiry (users created for the demo go with them).
  const expiredDemos = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.isDemo, true), lt(organizations.demoExpiresAt, now)));
  if (expiredDemos.length) {
    const ids = expiredDemos.map((o) => o.id);
    const demoUsers = await db
      .select({ id: memberships.userId })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(and(inArray(memberships.orgId, ids), eq(users.isDemo, true)));
    // Cases restrict property deletion, so remove them first.
    await db.delete(cases).where(inArray(cases.orgId, ids));
    await db.delete(organizations).where(inArray(organizations.id, ids));
    if (demoUsers.length) await db.delete(users).where(inArray(users.id, demoUsers.map((u) => u.id)));
    report.demoWorkspacesDeleted = ids.length;
  }

  const orgs = await db.select().from(organizations).where(eq(organizations.isDemo, false));
  const weekday = ![0, 6].includes(dayOfWeek(londonDateOf(now)));

  for (const org of orgs) {
    const access = orgAccess(org, now);

    // 2. Digest (weekdays, opted-in). Sent even after a trial ends: the statutory deadlines on
    //    existing cases keep running, and a missed one hurts the tenant and the customer alike.
    if (weekday && org.settings?.digestEnabled !== false) {
      const items = (await listCases(org.id, { now }))
        .filter((i) => ["overdue", "due_today", "due_soon"].includes(i.evaluation.overall) && i.evaluation.nextDuty)
        .map((i) => {
          const d = i.evaluation.nextDuty!;
          return {
            reference: i.case.reference,
            address: propertyAddress(i.property),
            duty: d.label,
            due: d.dueAt ? formatInstant(d.dueAt) : d.dueDate ? formatIsoDate(d.dueDate) : "",
            status: i.evaluation.overall === "overdue" ? "Overdue" : i.evaluation.overall === "due_today" ? "Due today" : "Due soon",
            url: `${env.appUrl}/app/cases/${i.case.id}`,
          };
        });
      const waiting = await db
        .select({ req: approvalRequests, c: cases, p: properties, l: landlords })
        .from(approvalRequests)
        .innerJoin(cases, eq(cases.id, approvalRequests.caseId))
        .innerJoin(properties, eq(properties.id, cases.propertyId))
        .leftJoin(landlords, eq(landlords.id, approvalRequests.landlordId))
        .where(and(eq(approvalRequests.orgId, org.id), eq(approvalRequests.status, "pending"), lt(approvalRequests.createdAt, new Date(now.getTime() - DAY))));
      for (const w of waiting) {
        items.push({
          reference: w.c.reference,
          address: propertyAddress(w.p),
          duty: `Waiting on ${w.l?.name ?? "landlord"} to approve: ${w.req.description.slice(0, 80)}`,
          due: `sent ${formatIsoDate(londonDateOf(w.req.createdAt))}`,
          status: "Awaiting landlord",
          url: `${env.appUrl}/app/cases/${w.c.id}`,
        });
      }
      if (items.length) {
        const team = await db
          .select({ email: users.email })
          .from(memberships)
          .innerJoin(users, eq(users.id, memberships.userId))
          .where(and(eq(memberships.orgId, org.id), eq(users.isDemo, false)));
        const mail = digestEmail({ orgName: org.name, items });
        for (const member of team) {
          await sendEmail({ to: member.email, ...mail, category: "digest", orgId: org.id });
          report.digestsSent++;
        }
      }
    }

    // 4. Trial ending in ~3 days (sent once).
    if (access.state === "trial" && access.trialDaysLeft !== null && access.trialDaysLeft <= 3) {
      const [already] = await db
        .select({ id: outboxEmails.id })
        .from(outboxEmails)
        .where(and(eq(outboxEmails.orgId, org.id), eq(outboxEmails.category, "trial_ending")))
        .limit(1);
      if (!already) {
        const [owner] = await db
          .select({ email: users.email })
          .from(memberships)
          .innerJoin(users, eq(users.id, memberships.userId))
          .where(and(eq(memberships.orgId, org.id), eq(memberships.role, "owner")))
          .limit(1);
        if (owner) {
          await sendEmail({ to: owner.email, ...trialEndingEmail({ orgName: org.name, daysLeft: access.trialDaysLeft }), category: "trial_ending", orgId: org.id });
          report.trialRemindersSent++;
        }
      }
    }

    // 4b. Onboarding nudges during the trial (each sent once): no report after a day, few homes after three.
    if (access.state === "trial") {
      const ageDays = (now.getTime() - org.createdAt.getTime()) / DAY;
      const sentBefore = async (category: string) =>
        (await db.select({ id: outboxEmails.id }).from(outboxEmails).where(and(eq(outboxEmails.orgId, org.id), eq(outboxEmails.category, category))).limit(1)).length > 0;
      const owner = async () =>
        (
          await db
            .select({ email: users.email, name: users.name })
            .from(memberships)
            .innerJoin(users, eq(users.id, memberships.userId))
            .where(and(eq(memberships.orgId, org.id), eq(memberships.role, "owner")))
            .limit(1)
        )[0];
      const [[caseCount], [homeCount]] = await Promise.all([
        db.select({ n: count() }).from(cases).where(eq(cases.orgId, org.id)),
        db.select({ n: count() }).from(properties).where(and(eq(properties.orgId, org.id), isNull(properties.archivedAt))),
      ]);
      if (ageDays >= 1 && Number(caseCount?.n ?? 0) === 0 && !(await sentBefore("nudge_first_report"))) {
        const o = await owner();
        if (o) {
          const investigateBy = formatIsoDateLong(addWorkingDays(londonDateOf(now), 10, org.jurisdiction === "scotland" ? "scotland" : "england-and-wales"));
          await sendEmail({ to: o.email, ...firstReportNudgeEmail({ name: o.name.split(" ")[0], orgName: org.name, investigateBy }), category: "nudge_first_report", orgId: org.id, replyTo: env.company.email });
          report.nudgesSent++;
        }
      } else if (ageDays >= 3 && Number(caseCount?.n ?? 0) > 0 && Number(homeCount?.n ?? 0) < 5 && !(await sentBefore("nudge_import_homes"))) {
        const o = await owner();
        if (o) {
          await sendEmail({ to: o.email, ...importHomesNudgeEmail({ name: o.name.split(" ")[0], orgName: org.name }), category: "nudge_import_homes", orgId: org.id, replyTo: env.company.email });
          report.nudgesSent++;
        }
      }
    }

    // 5a. Simulated subscriptions that were cancelled and have reached period end.
    if (org.cancelAtPeriodEnd && org.currentPeriodEnd && org.currentPeriodEnd < now && org.stripeSubscriptionId?.startsWith("sim_")) {
      await db.update(organizations).set({ subscriptionStatus: "canceled" }).where(eq(organizations.id, org.id));
      report.subscriptionsExpired++;
    }
  }

  // 3. Landlord reminders: unanswered for 2+ days, at most every 2 days, at most 3 times.
  if (weekday) {
    const due = await db
      .select({ req: approvalRequests, org: organizations, c: cases, p: properties, l: landlords })
      .from(approvalRequests)
      .innerJoin(organizations, eq(organizations.id, approvalRequests.orgId))
      .innerJoin(cases, eq(cases.id, approvalRequests.caseId))
      .innerJoin(properties, eq(properties.id, cases.propertyId))
      .innerJoin(landlords, eq(landlords.id, approvalRequests.landlordId))
      .where(
        and(
          eq(approvalRequests.status, "pending"),
          eq(organizations.isDemo, false),
          isNotNull(landlords.email),
          lt(approvalRequests.createdAt, new Date(now.getTime() - 2 * DAY)),
          gt(approvalRequests.expiresAt, now),
          or(sql`${approvalRequests.lastReminderAt} is null`, lt(approvalRequests.lastReminderAt, new Date(now.getTime() - 2 * DAY + 3_600_000))),
        ),
      );
    for (const r of due) {
      const reminders = await db.execute(
        sql`select count(*)::int as n from case_events where case_id = ${r.c.id} and type = 'approval_reminder' and (data->>'approvalId') = ${r.req.id}`,
      );
      const sentBefore = Number((reminders as unknown as { rows: Array<{ n: number }> }).rows[0]?.n ?? 0);
      if (sentBefore >= 3) continue;
      // Only the hash is stored, so a reminder carries a fresh link that replaces the old one.
      const token = randomToken();
      await db.update(approvalRequests).set({ tokenHash: sha256(token), lastReminderAt: now }).where(eq(approvalRequests.id, r.req.id));
      const url = `${env.appUrl}/approve/${encodeURIComponent(token)}`;
      const mail = approvalRequestEmail({
        orgName: r.org.name,
        landlordName: r.l.name,
        propertyAddress: propertyAddress(r.p),
        kind: r.req.kind,
        description: r.req.description,
        amount: formatPence(r.req.amountPence),
        contractor: r.req.contractor,
        deadlineText: "Reminder: we're still waiting for your decision. This link replaces the one we sent earlier.",
        respondBy: r.req.respondBy ? formatIsoDateLong(r.req.respondBy) : null,
        url,
      });
      await sendEmail({
        to: r.l.email!,
        ...mail,
        subject: `Reminder: ${mail.subject}`,
        category: "approval_reminder",
        orgId: r.org.id,
        caseId: r.c.id,
        replyTo: r.org.settings?.replyToEmail ?? null,
        ...agencySender(r.org),
      });
      await addEvent(db, {
        orgId: r.org.id,
        caseId: r.c.id,
        type: "approval_reminder",
        actorType: "system",
        actorLabel: "RepairClock",
        summary: `Reminder sent to ${r.l.name} about the pending approval (${sentBefore + 1} of 3).`,
        data: { approvalId: r.req.id },
      });
      report.approvalRemindersSent++;
    }
  }

  // 5b. Housekeeping.
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
  await db.delete(passwordResets).where(lt(passwordResets.expiresAt, new Date(now.getTime() - DAY)));
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date(now.getTime() - DAY)));

  return report;
}
