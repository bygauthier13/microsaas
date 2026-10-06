"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { track } from "@/lib/analytics";
import { requireOrg } from "@/lib/auth/session";
import { addEvent, propertyAddress } from "@/lib/cases/service";
import { issueLetter, loadCase, requestLandlordApproval } from "@/lib/cases/workflow";
import { getDb } from "@/lib/db";
import { approvalRequests, caseDelays, cases, landlords, properties } from "@/lib/db/schema";
import { draftDelayNotice, type LetterDocument } from "@/lib/docs/letters";
import { CAUSES, DELAY_REASONS, SOURCES, orgInitials } from "@/lib/domain";
import { homesHeadroom, homesInUse, nextCaseReference } from "@/lib/org";
import { orgAccess } from "@/lib/billing/plans";
import { compareIso, formatIsoDate, londonDateOf } from "@/lib/rules/calendar";
import { HAZARD_KEYS, hazardLabel, type HazardKey } from "@/lib/rules/hazards";
import type { DutyKey } from "@/lib/rules/engine";
import {
  ActionError,
  bool,
  dateTimeField,
  emailField,
  isoDateField,
  oneOf,
  optStr,
  penceField,
  str,
  toState,
  type ActionState,
} from "./helpers";

function actor(user: { name: string; email: string }) {
  return user.name || user.email;
}

function refresh(caseId: string) {
  revalidatePath(`/app/cases/${caseId}`);
  revalidatePath("/app");
  revalidatePath("/app/cases");
}

async function caseCtx(fd: FormData) {
  const auth = await requireOrg();
  const db = await getDb();
  const caseId = str(fd, "caseId", 64);
  const loaded = await loadCase(db, auth.org.id, caseId);
  if (!loaded) throw new ActionError("That case could not be found.");
  return { ...auth, db, caseId, loaded };
}

// ---------------------------------------------------------------------------
// Create a case (optionally creating the property and landlord inline)
// ---------------------------------------------------------------------------

export async function createCaseAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let newId: string;
  try {
    const { user, org } = await requireOrg();
    const access = orgAccess(org);
    if (!access.canCreate) {
      throw new ActionError("Your trial has ended. Choose a plan to log new reports — existing cases stay fully usable.");
    }
    const homesNow = await homesInUse(org.id);
    if (homesNow > access.homesLimit) {
      throw new ActionError(
        `Your plan covers ${access.homesLimit} homes and you have ${homesNow}. Upgrade, or archive homes you no longer manage, to log new reports. Existing cases stay fully usable.`,
      );
    }
    const db = await getDb();

    let propertyId = str(fd, "propertyId", 64);
    if (propertyId === "new" || !propertyId) {
      const headroom = await homesHeadroom(org, 1);
      if (!headroom.ok) {
        throw new ActionError(`Your plan covers ${headroom.limit} homes and you have ${headroom.current}. Upgrade to add more.`);
      }
      const addressLine1 = str(fd, "addressLine1", 200);
      if (!addressLine1) throw new ActionError("Enter the property address.");
      let landlordId: string | null = null;
      const landlordChoice = str(fd, "landlordId", 64);
      if (landlordChoice === "new") {
        const name = str(fd, "landlordName", 160);
        if (!name) throw new ActionError("Enter the landlord's name (or choose “No landlord”).");
        const [l] = await db
          .insert(landlords)
          .values({ orgId: org.id, name, email: emailField(fd, "landlordEmail"), phone: optStr(fd, "landlordPhone", 40) })
          .returning({ id: landlords.id });
        landlordId = l.id;
      } else if (landlordChoice && landlordChoice !== "none") {
        const [l] = await db
          .select({ id: landlords.id })
          .from(landlords)
          .where(and(eq(landlords.orgId, org.id), eq(landlords.id, landlordChoice)))
          .limit(1);
        if (!l) throw new ActionError("Choose a valid landlord.");
        landlordId = l.id;
      }
      const [p] = await db
        .insert(properties)
        .values({
          orgId: org.id,
          landlordId,
          addressLine1,
          addressLine2: optStr(fd, "addressLine2", 200),
          city: optStr(fd, "city", 120),
          postcode: optStr(fd, "postcode", 12)?.toUpperCase() ?? null,
          jurisdiction: oneOf(fd, "jurisdiction", ["scotland", "england"] as const, org.jurisdiction),
          sector: oneOf(fd, "sector", ["private", "social"] as const, org.kind === "social_landlord" ? "social" : "private"),
          tenantName: optStr(fd, "tenantName", 160),
          tenantEmail: emailField(fd, "tenantEmail"),
          tenantPhone: optStr(fd, "tenantPhone", 40),
        })
        .returning({ id: properties.id });
      propertyId = p.id;
      await track("property_added", { orgId: org.id, userId: user.id, isDemo: org.isDemo, props: { inline: true } });
    } else {
      const [p] = await db
        .select({ id: properties.id })
        .from(properties)
        .where(and(eq(properties.orgId, org.id), eq(properties.id, propertyId)))
        .limit(1);
      if (!p) throw new ActionError("Choose a valid property.");
    }

    const hazard = oneOf(fd, "hazard", HAZARD_KEYS, "damp_mould") as HazardKey;
    const awareAt = dateTimeField(fd, "aware", "the date you became aware");
    const description = str(fd, "description", 4000);
    if (!description) throw new ActionError("Describe what was reported (where, how bad, how long).");
    const reference = await nextCaseReference(org.id, orgInitials(org.name));
    const [c] = await db
      .insert(cases)
      .values({
        orgId: org.id,
        propertyId,
        reference,
        hazard,
        triage: oneOf(fd, "triage", ["significant", "emergency"] as const, "significant"),
        awareAt,
        source: oneOf(fd, "source", SOURCES.map((s) => s.value), "tenant_report"),
        reportedBy: optStr(fd, "reportedBy", 160),
        description,
        rooms: optStr(fd, "rooms", 300),
        vulnerability: optStr(fd, "vulnerability", 1000),
        createdBy: user.id,
      })
      .returning({ id: cases.id });
    newId = c.id;
    await addEvent(db, {
      orgId: org.id,
      caseId: c.id,
      type: "created",
      occurredAt: awareAt,
      summary: `${hazardLabel(hazard)} reported — statutory clock started. ${description.slice(0, 280)}`,
      actorId: user.id,
      actorLabel: actor(user),
    });
    const isFirst = reference.endsWith("-0001");
    await track(isFirst ? "first_case_created" : "case_created", {
      orgId: org.id,
      userId: user.id,
      isDemo: org.isDemo,
      props: { hazard },
    });
    if (isFirst) await track("case_created", { orgId: org.id, userId: user.id, isDemo: org.isDemo, props: { hazard } });
  } catch (err) {
    return toState(err);
  }
  revalidatePath("/app");
  redirect(`/app/cases/${newId}?created=1`);
}

// ---------------------------------------------------------------------------
// Investigation
// ---------------------------------------------------------------------------

export async function bookInvestigationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    const when = dateTimeField(fd, "booked", "the appointment", { allowFuture: true });
    const who = str(fd, "investigator", 200);
    await db
      .update(cases)
      .set({ investigationBookedFor: when, status: loaded.case.investigationCompletedAt ? loaded.case.status : "investigation_booked", updatedAt: new Date() })
      .where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    const due = loaded.evaluation.duties.find((d) => d.key === "investigate" || d.key === "investigate_24h");
    const late = due?.dueDate && compareIso(londonDateOf(when), due.dueDate) > 0;
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "investigation_booked",
      summary: `Investigation booked for ${formatIsoDate(londonDateOf(when))}${who ? ` with ${who}` : ""}${
        late ? " — after the statutory deadline: issue a delay notice if this is beyond your control" : ""
      }`,
      actorId: user.id,
      actorLabel: actor(user),
      data: { investigator: who },
    });
    refresh(caseId);
    return { ok: true, message: late ? "Booked — but this is after the deadline. Consider a delay notice." : "Appointment saved." };
  } catch (err) {
    return toState(err);
  }
}

export async function recordInvestigationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    const completedAt = dateTimeField(fd, "completed", "the investigation date", { notBefore: loaded.case.awareAt });
    const investigators = str(fd, "investigators", 400);
    if (!investigators) throw new ActionError("Name the person or organisation who investigated (required in the written summary).");
    const method = oneOf(fd, "method", ["in_person", "remote"] as const, "in_person");
    const remoteJustification = optStr(fd, "remoteJustification", 1000);
    if (method === "remote" && !remoteJustification) {
      throw new ActionError("Record why a remote investigation was justified — the guidance expects in-person unless there's a reason.");
    }
    const found = bool(fd, "hazardFound");
    if (found === null) throw new ActionError("Record the outcome of the investigation.");
    const england = loaded.property.jurisdiction === "england";
    const foundSeverity = england && found ? oneOf(fd, "foundSeverity", ["significant", "emergency"] as const, "significant") : null;
    const findings = str(fd, "findings", 6000);
    if (!findings) throw new ActionError("Summarise what the investigation found.");
    const cause = optStr(fd, "cause", 40);
    if (cause && !CAUSES.some((c) => c.value === cause)) throw new ActionError("Choose a valid cause.");
    await db
      .update(cases)
      .set({
        investigationCompletedAt: completedAt,
        investigators,
        investigationMethod: method,
        remoteJustification: method === "remote" ? remoteJustification : null,
        findings,
        hazardFound: found,
        foundSeverity,
        cause,
        workDoneOnVisit: optStr(fd, "workDoneOnVisit", 2000),
        workRequired: optStr(fd, "workRequired", 3000),
        targetRepairStart: isoDateField(fd, "targetRepairStart", "the target start date", false),
        supplementaryRequired: england && found ? bool(fd, "supplementaryRequired") ?? true : null,
        status: "investigated",
        updatedAt: new Date(),
      })
      .where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    const outcome = england
      ? found
        ? `${foundSeverity} hazard confirmed`
        : "no significant or emergency hazard"
      : found
        ? "home NOT substantially free from damp and mould — repairs required"
        : "home substantially free from damp and mould";
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "investigation_completed",
      occurredAt: completedAt,
      summary: `Investigation completed (${method === "remote" ? "remote" : "in person"}) by ${investigators}: ${outcome}.`,
      actorId: user.id,
      actorLabel: actor(user),
      data: { method, found, cause },
    });
    await track("investigation_recorded", { orgId: org.id, userId: user.id, isDemo: org.isDemo, props: { found, method } });
    refresh(caseId);
    return { ok: true, message: "Investigation recorded. The written summary clock has started." };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Written summary
// ---------------------------------------------------------------------------

export async function issueSummaryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    if (!loaded.case.investigationCompletedAt) throw new ActionError("Record the investigation before issuing the written summary.");
    const body = str(fd, "body", 20000);
    if (body.length < 80) throw new ActionError("The summary looks too short — check it covers the findings and next steps.");
    const issuedAt = dateTimeField(fd, "issued", "the issue date", { notBefore: loaded.case.investigationCompletedAt });
    const method = oneOf(fd, "method", ["email", "post", "hand", "portal"] as const, "email");
    const emailTenant = method === "email" && bool(fd, "sendEmail") === true;
    if (emailTenant && !loaded.property.tenantEmail) throw new ActionError("Add the tenant's email to the property to send it by email.");
    const issueDateIso = londonDateOf(issuedAt);
    const s = org.settings ?? {};
    const letter: LetterDocument = {
      title: loaded.property.jurisdiction === "scotland" ? "Written summary of damp and mould investigation" : "Written summary of hazard investigation",
      reference: loaded.case.reference,
      dateIso: issueDateIso,
      recipientName: loaded.property.tenantName || "The Tenant",
      recipientAddress: [loaded.property.addressLine1, loaded.property.addressLine2, loaded.property.city, loaded.property.postcode].filter(
        (x): x is string => Boolean(x),
      ),
      fromName: org.name,
      fromLines: [s.phone, s.replyToEmail].filter((x): x is string => Boolean(x)),
      body,
      signoffName: s.signatoryName || actor(user),
      signoffRole: s.signatoryRole || "",
      footer:
        loaded.property.jurisdiction === "scotland"
          ? `Issued under the Investigation and Commencement of Repair (Scotland) Regulations 2026 (SSI 2026/173). Case reference ${loaded.case.reference}.`
          : `Issued under the Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025 (Awaab’s Law). Case reference ${loaded.case.reference}.`,
    };
    const result = await issueLetter(db, {
      org,
      caseId,
      userId: user.id,
      actorLabel: actor(user),
      kind: "written_summary",
      letter,
      tenantEmail: loaded.property.tenantEmail,
      emailTenant,
      propertyAddress: propertyAddress(loaded.property),
      tenantName: loaded.property.tenantName,
    });
    const first = !loaded.case.summaryIssuedAt;
    await db
      .update(cases)
      .set({ summaryIssuedAt: loaded.case.summaryIssuedAt ?? issuedAt, summaryMethod: method, updatedAt: new Date() })
      .where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: first ? "summary_issued" : "summary_reissued",
      occurredAt: issuedAt,
      summary: `${first ? "Written summary issued" : "Updated written summary issued"} to the tenant (${method}).`,
      actorId: user.id,
      actorLabel: actor(user),
      data: { documentId: result.documentId, method },
    });
    await track("summary_issued", { orgId: org.id, userId: user.id, isDemo: org.isDemo, props: { method, emailed: result.emailed } });
    refresh(caseId);
    return {
      ok: true,
      message: result.emailError
        ? `Summary filed, but the email failed: ${result.emailError}`
        : emailTenant
          ? "Written summary issued and emailed to the tenant."
          : "Written summary issued and filed on the case.",
    };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Delay notice (circumstances beyond the landlord's control)
// ---------------------------------------------------------------------------

export async function delayNoticeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    const duty = str(fd, "duty", 40) as DutyKey;
    const dutyResult = loaded.evaluation.duties.find((d) => d.key === duty);
    if (!dutyResult) throw new ActionError("Choose which timescale can't be met.");
    const preset = str(fd, "reasonPreset", 200);
    const detail = str(fd, "reasonDetail", 1000);
    const reason = [DELAY_REASONS.includes(preset as (typeof DELAY_REASONS)[number]) ? preset : "", detail].filter(Boolean).join(" — ");
    if (!reason) throw new ActionError("Give the reason the timescale can't be met.");
    const revisedDate = isoDateField(fd, "revisedDate", "the revised date")!;
    const issuedAt = dateTimeField(fd, "issued", "the notice date", { notBefore: loaded.case.awareAt });
    if (compareIso(revisedDate, londonDateOf(issuedAt)) < 0) throw new ActionError("The revised date must be after the notice date.");
    const interimSteps = optStr(fd, "interimSteps", 2000);
    const method = oneOf(fd, "method", ["email", "post", "hand", "portal"] as const, "email");
    const emailTenant = method === "email" && bool(fd, "sendEmail") === true;
    if (emailTenant && !loaded.property.tenantEmail) throw new ActionError("Add the tenant's email to the property to send it by email.");

    const letter = draftDelayNotice({
      orgName: org.name,
      settings: org.settings ?? {},
      property: loaded.property,
      caseRow: loaded.case,
      evaluation: loaded.evaluation,
      issueDateIso: londonDateOf(issuedAt),
      duty,
      reason,
      revisedDateIso: revisedDate,
      interimSteps,
    });
    letter.signoffName = org.settings?.signatoryName || actor(user);
    const result = await issueLetter(db, {
      org,
      caseId,
      userId: user.id,
      actorLabel: actor(user),
      kind: "delay_notice",
      letter,
      tenantEmail: loaded.property.tenantEmail,
      emailTenant,
      propertyAddress: propertyAddress(loaded.property),
      tenantName: loaded.property.tenantName,
    });
    await db.insert(caseDelays).values({
      orgId: org.id,
      caseId,
      duty,
      reason,
      interimSteps,
      revisedDate,
      noticeIssuedAt: issuedAt,
      createdBy: user.id,
    });
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "delay_notice",
      occurredAt: issuedAt,
      summary: `Delay notice issued for “${dutyResult.shortLabel}”: ${reason}. Revised date ${formatIsoDate(revisedDate)}.${
        interimSteps ? ` Interim steps: ${interimSteps}` : ""
      }`,
      actorId: user.id,
      actorLabel: actor(user),
      data: { duty, revisedDate, documentId: result.documentId },
    });
    await track("delay_notice_issued", { orgId: org.id, userId: user.id, isDemo: org.isDemo, props: { duty } });
    refresh(caseId);
    return { ok: true, message: "Delay notice issued and filed on the case." };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Landlord approval
// ---------------------------------------------------------------------------

export async function requestApprovalAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    if (!loaded.landlord) throw new ActionError("Link a landlord to this property first (Properties → edit).");
    if (!loaded.landlord.email) throw new ActionError("Add the landlord's email address so we can send the approval link.");
    const description = str(fd, "description", 1000);
    if (!description) throw new ActionError("Describe the work you need approved.");
    const result = await requestLandlordApproval(db, {
      org,
      caseId,
      userId: user.id,
      actorLabel: actor(user),
      landlord: loaded.landlord,
      kind: oneOf(fd, "kind", ["investigation", "repair"] as const, "repair"),
      description,
      amountPence: penceField(fd, "amount"),
      contractor: optStr(fd, "contractor", 200),
      respondBy: isoDateField(fd, "respondBy", "the respond-by date", false),
    });
    await track("approval_requested", { orgId: org.id, userId: user.id, isDemo: org.isDemo });
    refresh(caseId);
    return {
      ok: true,
      message:
        result.emailStatus === "sent"
          ? `Approval link emailed to ${loaded.landlord.email}.`
          : `Approval request created. Share this one-time link with the landlord: ${result.url}`,
    };
  } catch (err) {
    return toState(err);
  }
}

export async function cancelApprovalAction(fd: FormData): Promise<void> {
  const { user, org } = await requireOrg();
  const db = await getDb();
  const id = str(fd, "approvalId", 64);
  const caseId = str(fd, "caseId", 64);
  const [req] = await db
    .update(approvalRequests)
    .set({ status: "cancelled" })
    .where(and(eq(approvalRequests.orgId, org.id), eq(approvalRequests.id, id), eq(approvalRequests.status, "pending")))
    .returning({ id: approvalRequests.id, caseId: approvalRequests.caseId });
  if (req) {
    await addEvent(db, { orgId: org.id, caseId: req.caseId, type: "approval_cancelled", summary: "Approval request withdrawn.", actorId: user.id, actorLabel: actor(user) });
  }
  refresh(caseId);
}

// ---------------------------------------------------------------------------
// Works
// ---------------------------------------------------------------------------

export async function repairCommencedAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    if (!loaded.case.investigationCompletedAt) throw new ActionError("Record the investigation first.");
    const at = dateTimeField(fd, "commenced", "the start date", { notBefore: loaded.case.investigationCompletedAt });
    const what = str(fd, "description", 1000);
    if (!what) throw new ActionError("Describe the work that started (e.g. mould wash and new extractor fan ordered).");
    await db
      .update(cases)
      .set({
        repairCommencedAt: at,
        contractor: optStr(fd, "contractor", 200) ?? loaded.case.contractor,
        repairTargetDate: isoDateField(fd, "targetCompletion", "the target completion date", false) ?? loaded.case.repairTargetDate,
        status: "repair_in_progress",
        updatedAt: new Date(),
      })
      .where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "repair_commenced",
      occurredAt: at,
      summary: `Repair work started: ${what}`,
      actorId: user.id,
      actorLabel: actor(user),
    });
    await track("repair_commenced", { orgId: org.id, userId: user.id, isDemo: org.isDemo });
    refresh(caseId);
    return { ok: true, message: "Repair start recorded." };
  } catch (err) {
    return toState(err);
  }
}

export async function safetyWorkAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    const at = dateTimeField(fd, "completed", "the completion time", { notBefore: loaded.case.awareAt });
    const what = str(fd, "description", 1000);
    if (!what) throw new ActionError("Describe the safety work (temporary measures count).");
    await db.update(cases).set({ safetyWorkCompletedAt: at, updatedAt: new Date() }).where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    await addEvent(db, { orgId: org.id, caseId, type: "safety_work_completed", occurredAt: at, summary: `Home made safe: ${what}`, actorId: user.id, actorLabel: actor(user) });
    refresh(caseId);
    return { ok: true, message: "Safety work recorded." };
  } catch (err) {
    return toState(err);
  }
}

export async function supplementaryStepsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    const at = dateTimeField(fd, "steps", "the date steps were taken", { notBefore: loaded.case.awareAt });
    const what = str(fd, "description", 1000);
    if (!what) throw new ActionError("Describe the steps taken (e.g. specialist survey booked, contractor instructed).");
    await db.update(cases).set({ supplementaryStepsAt: at, updatedAt: new Date() }).where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    await addEvent(db, { orgId: org.id, caseId, type: "supplementary_steps", occurredAt: at, summary: `Steps taken towards preventative work: ${what}`, actorId: user.id, actorLabel: actor(user) });
    refresh(caseId);
    return { ok: true, message: "Steps recorded." };
  } catch (err) {
    return toState(err);
  }
}

export async function repairCompletedAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    const at = dateTimeField(fd, "completed", "the completion date", { notBefore: loaded.case.repairCommencedAt ?? loaded.case.awareAt });
    const notes = str(fd, "notes", 2000);
    await db
      .update(cases)
      .set({ repairCompletedAt: at, status: "monitoring", updatedAt: new Date() })
      .where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "repair_completed",
      occurredAt: at,
      summary: `Repair completed${notes ? `: ${notes}` : ""}. Monitoring for recurrence.`,
      actorId: user.id,
      actorLabel: actor(user),
    });
    await track("repair_completed", { orgId: org.id, userId: user.id, isDemo: org.isDemo });
    refresh(caseId);
    return { ok: true, message: "Repair completion recorded. Close the case once you're satisfied it won't recur." };
  } catch (err) {
    return toState(err);
  }
}

export async function setTargetAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId } = await caseCtx(fd);
    const target = isoDateField(fd, "target", "the target date")!;
    await db.update(cases).set({ repairTargetDate: target, updatedAt: new Date() }).where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    await addEvent(db, { orgId: org.id, caseId, type: "target_set", summary: `Target completion date set: ${formatIsoDate(target)}.`, actorId: user.id, actorLabel: actor(user) });
    refresh(caseId);
    return { ok: true, message: "Target saved." };
  } catch (err) {
    return toState(err);
  }
}

export async function addNoteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId, loaded } = await caseCtx(fd);
    const note = str(fd, "note", 4000);
    if (!note) throw new ActionError("Write a note first.");
    const kind = oneOf(fd, "kind", ["note", "contact_attempt", "access_refused", "tenant_contact", "landlord_contact"] as const, "note");
    const at = str(fd, "at_date", 10) ? dateTimeField(fd, "at", "the date", { notBefore: loaded.case.awareAt }) : new Date();
    const prefix: Record<string, string> = {
      note: "Note",
      contact_attempt: "Contact attempt",
      access_refused: "Access not possible",
      tenant_contact: "Spoke to tenant",
      landlord_contact: "Spoke to landlord",
    };
    await addEvent(db, { orgId: org.id, caseId, type: kind, occurredAt: at, summary: `${prefix[kind]}: ${note}`, actorId: user.id, actorLabel: actor(user) });
    refresh(caseId);
    return { ok: true, message: "Added to the timeline." };
  } catch (err) {
    return toState(err);
  }
}

export async function closeCaseAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org, db, caseId } = await caseCtx(fd);
    const reason = str(fd, "reason", 1000) || "Resolved";
    await db.update(cases).set({ status: "closed", closedAt: new Date(), closeReason: reason, updatedAt: new Date() }).where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)));
    await addEvent(db, { orgId: org.id, caseId, type: "case_closed", summary: `Case closed: ${reason}`, actorId: user.id, actorLabel: actor(user) });
    await track("case_closed", { orgId: org.id, userId: user.id, isDemo: org.isDemo });
    refresh(caseId);
    return { ok: true, message: "Case closed." };
  } catch (err) {
    return toState(err);
  }
}

export async function reopenCaseAction(fd: FormData): Promise<void> {
  const { user, org } = await requireOrg();
  const db = await getDb();
  const caseId = str(fd, "caseId", 64);
  const [row] = await db
    .update(cases)
    .set({ status: "monitoring", closedAt: null, closeReason: null, updatedAt: new Date() })
    .where(and(eq(cases.orgId, org.id), eq(cases.id, caseId)))
    .returning({ id: cases.id });
  if (row) {
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "case_reopened",
      summary: "Case reopened. If the damp or mould has spread or appeared somewhere new, log a new report — the timescales start again.",
      actorId: user.id,
      actorLabel: actor(user),
    });
  }
  refresh(caseId);
}
