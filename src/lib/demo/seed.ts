/**
 * Demo workspace: an isolated, clearly-flagged organisation with fictional homes, landlords and
 * cases at every stage, so prospects can explore the product without signing up.
 *
 * Isolation guarantees: `organizations.is_demo` and `users.is_demo` are set; demo emails are
 * never delivered (sendEmail logs them to the outbox); billing is disabled; analytics events are
 * flagged; the workspace and its demo user are deleted by the daily job 24 hours after creation.
 * Names, emails and phone numbers are fictional (example.com addresses, Ofcom drama numbers).
 */
import { eq } from "drizzle-orm";
import { addEvent } from "@/lib/cases/service";
import { storeDocument } from "@/lib/cases/workflow";
import type { DB } from "@/lib/db";
import { approvalRequests, caseDelays, cases, landlords, organizations, outboxEmails, properties, users } from "@/lib/db/schema";
import { draftDelayNotice, draftWrittenSummary } from "@/lib/docs/letters";
import { renderLetterPdf } from "@/lib/docs/pdf";
import { createOrganization } from "@/lib/org";
import { addCalendarDays, addWorkingDays, fromLondonLocal, isWorkingDay, londonDateOf } from "@/lib/rules/calendar";
import { evaluateCase } from "@/lib/rules/engine";
import { randomToken, sha256 } from "@/lib/security/crypto";
import { toFacts } from "@/lib/cases/service";

const REGION = "scotland" as const;

/** The date `n` working days before `iso` (n = 0 returns iso). */
function workingDaysAgo(iso: string, n: number): string {
  let cursor = iso;
  let left = n;
  while (left > 0) {
    cursor = addCalendarDays(cursor, -1);
    if (isWorkingDay(cursor, REGION)) left--;
  }
  return cursor;
}

function at(iso: string, time: string): Date {
  return fromLondonLocal(iso, time);
}

const SETTINGS = {
  signatoryName: "Fiona Mackay",
  signatoryRole: "Senior Property Manager",
  phone: "0131 496 0123",
  replyToEmail: "lettings@lothianforth.example.com",
  digestEnabled: false,
};

export async function createDemoWorkspace(db: DB, now = new Date()) {
  const today = londonDateOf(now);
  const [user] = await db
    .insert(users)
    .values({ email: `demo-${randomToken(9).toLowerCase()}@demo.repairclock.invalid`, name: "Fiona Mackay", isDemo: true })
    .returning();
  const org = await createOrganization({
    userId: user.id,
    name: "Lothian & Forth Lettings",
    kind: "letting_agent",
    jurisdiction: "scotland",
    settings: SETTINGS,
    isDemo: true,
  });
  await db.update(organizations).set({ caseCounter: 0 }).where(eq(organizations.id, org.id));

  const [morag, northfield, rao] = await db
    .insert(landlords)
    .values([
      { orgId: org.id, name: "Morag Campbell", email: "morag.campbell@example.com", phone: "07700 900461" },
      { orgId: org.id, name: "Northfield Property Holdings Ltd", email: "accounts@northfield.example.com", notes: "Portfolio landlord — 14 units. Pre-approved spend up to £250." },
      { orgId: org.id, name: "Dr Arjun Rao", email: "arjun.rao@example.com" },
    ])
    .returning();

  const homes = await db
    .insert(properties)
    .values([
      { orgId: org.id, landlordId: northfield.id, addressLine1: "Flat 3F2, 41 Easter Road", city: "Edinburgh", postcode: "EH7 5PL", jurisdiction: "scotland", sector: "private", tenantName: "Megan Wallace", tenantEmail: "megan.w@example.com", tenantPhone: "07700 900112" },
      { orgId: org.id, landlordId: northfield.id, addressLine1: "Flat 1/2, 18 Dalmeny Street", city: "Edinburgh", postcode: "EH6 8PG", jurisdiction: "scotland", sector: "private", tenantName: "Tomasz Nowak", tenantEmail: "t.nowak@example.com" },
      { orgId: org.id, landlordId: morag.id, addressLine1: "22 Restalrig Avenue", city: "Edinburgh", postcode: "EH7 6PH", jurisdiction: "scotland", sector: "private", tenantName: "Aisha Bello", tenantEmail: "aisha.bello@example.com" },
      { orgId: org.id, landlordId: rao.id, addressLine1: "Flat 2, 7 Marchmont Crescent", city: "Edinburgh", postcode: "EH9 1HN", jurisdiction: "scotland", sector: "private", tenantName: "Callum Fraser", tenantEmail: "callum.f@example.com" },
      { orgId: org.id, landlordId: morag.id, addressLine1: "Flat 4, 55 Leith Walk", city: "Edinburgh", postcode: "EH6 8LS", jurisdiction: "scotland", sector: "private", tenantName: "Priya Shah", tenantEmail: "priya.shah@example.com" },
      { orgId: org.id, landlordId: northfield.id, addressLine1: "9 Craigentinny Road", city: "Edinburgh", postcode: "EH7 6QA", jurisdiction: "scotland", sector: "private", tenantName: "Sophie & Liam Grant", tenantEmail: "grants@example.com" },
      { orgId: org.id, landlordId: rao.id, addressLine1: "Flat 0/1, 120 Dumbarton Road", city: "Glasgow", postcode: "G11 6NY", jurisdiction: "scotland", sector: "private", tenantName: "Hamza Iqbal", tenantEmail: "hamza.iqbal@example.com" },
      { orgId: org.id, landlordId: morag.id, addressLine1: "14 Commercial Street", city: "Dundee", postcode: "DD1 3EJ", jurisdiction: "scotland", sector: "private", tenantName: null, tenantEmail: null },
    ])
    .returning();

  let n = 0;
  const ref = () => `LFL-${String(++n).padStart(4, "0")}`;
  const staff = { actorLabel: "Fiona Mackay", actorId: user.id };

  async function newCase(values: Partial<typeof cases.$inferInsert> & { propertyId: string; awareAt: Date; description: string }) {
    const [c] = await db
      .insert(cases)
      .values({ orgId: org.id, reference: ref(), hazard: "damp_mould", source: "tenant_report", createdBy: user.id, ...values })
      .returning();
    await addEvent(db, {
      orgId: org.id,
      caseId: c.id,
      type: "created",
      occurredAt: values.awareAt,
      summary: `Damp and mould reported — statutory clock started. ${values.description.slice(0, 200)}`,
      ...staff,
    });
    return c;
  }

  async function issueSummary(caseId: string, issuedAt: Date) {
    const [c] = await db.select().from(cases).where(eq(cases.id, caseId));
    const [p] = await db.select().from(properties).where(eq(properties.id, c.propertyId));
    const ev = evaluateCase(toFacts(c, p, [], { demo: true }), issuedAt);
    const letter = draftWrittenSummary({ orgName: org.name, settings: SETTINGS, property: p, caseRow: c, evaluation: ev, issueDateIso: londonDateOf(issuedAt) });
    const pdf = await renderLetterPdf(letter);
    const filename = `${c.reference}-written-summary-${londonDateOf(issuedAt)}.pdf`;
    const documentId = await storeDocument(db, { orgId: org.id, caseId, kind: "written_summary", filename, mime: "application/pdf", bytes: pdf, uploadedBy: user.id });
    await db.update(cases).set({ summaryIssuedAt: issuedAt, summaryMethod: "email" }).where(eq(cases.id, caseId));
    await addEvent(db, { orgId: org.id, caseId, type: "summary_issued", occurredAt: issuedAt, summary: "Written summary issued to the tenant (email).", data: { documentId }, ...staff });
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "email_sent",
      occurredAt: issuedAt,
      summary: `Emailed “${letter.title}” to the tenant (${p.tenantEmail}) — demo: recorded in the outbox, not delivered`,
      ...staff,
    });
    await db.insert(outboxEmails).values({
      orgId: org.id,
      caseId,
      to: p.tenantEmail ?? "tenant@example.com",
      subject: `${letter.title} — ${p.addressLine1}`,
      html: `<p>Dear ${p.tenantName ?? "tenant"},</p><p>Please find attached the written summary of our recent damp and mould investigation at your home.</p><p>${org.name}</p>`,
      text: "Please find attached the written summary of our recent damp and mould investigation at your home.",
      category: "written_summary",
      provider: "outbox",
      status: "logged",
      createdAt: issuedAt,
    });
  }

  // 1. Overdue investigation — vulnerable household, access attempts logged.
  const aware1 = workingDaysAgo(today, 12);
  const c1 = await newCase({
    propertyId: homes[0].id,
    awareAt: at(aware1, "09:12"),
    reportedBy: "Tenant by email",
    description: "Black mould on the ceiling and window reveal in the small bedroom, spreading over the last month. Child's cot is in this room.",
    rooms: "Bedroom 2",
    vulnerability: "Child (age 4) with asthma",
  });
  await addEvent(db, { orgId: org.id, caseId: c1.id, type: "contact_attempt", occurredAt: at(workingDaysAgo(today, 10), "10:05"), summary: "Contact attempt: called contractor (Reid Damp) — no availability until w/c next week.", ...staff });
  await addEvent(db, { orgId: org.id, caseId: c1.id, type: "contact_attempt", occurredAt: at(workingDaysAgo(today, 8), "15:40"), summary: "Contact attempt: second contractor quoted 3 weeks. Escalated to branch manager.", ...staff });

  // 2. Investigation due soon, landlord approval pending for the survey.
  const aware2 = workingDaysAgo(today, 9);
  const c2 = await newCase({
    propertyId: homes[1].id,
    awareAt: at(aware2, "16:30"),
    reportedBy: "Tenant by phone",
    description: "Mould behind the wardrobe and around the bathroom extractor; musty smell throughout the flat.",
    rooms: "Bedroom, bathroom",
    investigationBookedFor: at(addCalendarDays(today, 1), "10:00"),
    status: "investigation_booked",
  });
  await addEvent(db, { orgId: org.id, caseId: c2.id, type: "investigation_booked", occurredAt: at(workingDaysAgo(today, 2), "11:20"), summary: "Investigation booked for tomorrow 10:00 with Reid Damp Surveys Ltd.", ...staff });
  await db.insert(approvalRequests).values({
    orgId: org.id,
    caseId: c2.id,
    landlordId: northfield.id,
    tokenHash: sha256(randomToken()),
    kind: "investigation",
    description: "Damp & mould survey with moisture mapping (Reid Damp Surveys Ltd)",
    amountPence: 18000,
    contractor: "Reid Damp Surveys Ltd",
    status: "pending",
    expiresAt: new Date(now.getTime() + 18 * 86_400_000),
    createdBy: user.id,
    createdAt: at(workingDaysAgo(today, 3), "11:25"),
  });
  await addEvent(db, { orgId: org.id, caseId: c2.id, type: "approval_requested", occurredAt: at(workingDaysAgo(today, 3), "11:25"), summary: "Asked Northfield Property Holdings Ltd to approve: Damp & mould survey with moisture mapping (£180.00) — demo: email recorded in the outbox", ...staff });

  // 3. Investigated 3 working days ago — written summary due today (try the editor here).
  const aware3 = workingDaysAgo(today, 7);
  const inv3 = workingDaysAgo(today, 3);
  await newCase({
    propertyId: homes[2].id,
    awareAt: at(aware3, "08:47"),
    reportedBy: "Tenant via portal",
    description: "Condensation streaming down bedroom windows every morning; black spots on the curtains and sill.",
    rooms: "Main bedroom",
    investigationCompletedAt: at(inv3, "14:10"),
    investigators: "Sam Reid, Reid Damp Surveys Ltd",
    investigationMethod: "in_person",
    findings: "black mould approx 0.8m2 on window reveal + sill, main bedroom. surface moisture 24% WME. trickle vents closed + painted shut. extractor in bathroom not running on humidistat. no penetrating damp externally",
    hazardFound: true,
    cause: "ventilation",
    workDoneOnVisit: "Mould wash treatment applied to the window reveal",
    workRequired: "Free and repair trickle vents; replace bathroom extractor with a humidistat-controlled unit; treat and redecorate the reveal with anti-mould paint",
    targetRepairStart: addWorkingDays(today, 1, REGION),
    status: "investigated",
  }).then(async (c) => {
    await addEvent(db, { orgId: org.id, caseId: c.id, type: "investigation_completed", occurredAt: at(inv3, "14:10"), summary: "Investigation completed (in person) by Sam Reid, Reid Damp Surveys Ltd: home NOT substantially free from damp and mould — repairs required.", ...staff });
  });

  // 4. Repairs couldn't start in time — delay notice issued before the deadline.
  const aware4 = workingDaysAgo(today, 14);
  const inv4 = workingDaysAgo(today, 6);
  const c4 = await newCase({
    propertyId: homes[3].id,
    awareAt: at(aware4, "12:02"),
    reportedBy: "Tenant by email",
    description: "Damp patch spreading on the gable wall in the living room after heavy rain; plaster bubbling.",
    rooms: "Living room",
    investigationCompletedAt: at(inv4, "11:00"),
    investigators: "Iona Baird MRICS, Baird Building Surveys",
    investigationMethod: "in_person",
    findings: "Penetrating damp to the gable wall from a failed rhone (gutter) joint and defective pointing. Readings 30%+ WME up to 1.2m.",
    hazardFound: true,
    cause: "penetrating",
    workRequired: "Repair the rhone joint and repoint the gable; then hack off and replaster the affected internal wall",
    status: "investigated",
  });
  await addEvent(db, { orgId: org.id, caseId: c4.id, type: "investigation_completed", occurredAt: at(inv4, "11:00"), summary: "Investigation completed (in person) by Iona Baird MRICS, Baird Building Surveys: home NOT substantially free from damp and mould — repairs required.", ...staff });
  await issueSummary(c4.id, at(workingDaysAgo(today, 5), "09:30"));
  const noticeAt = at(workingDaysAgo(today, 3), "16:15");
  const revised = addWorkingDays(today, 3, REGION);
  const [row4] = await db.select().from(cases).where(eq(cases.id, c4.id));
  const ev4 = evaluateCase(toFacts(row4, homes[3], [], { demo: true }), noticeAt);
  const delayLetter = draftDelayNotice({
    orgName: org.name,
    settings: SETTINGS,
    property: homes[3],
    caseRow: row4,
    evaluation: ev4,
    issueDateIso: londonDateOf(noticeAt),
    duty: "commence_repair",
    reason: "No contractor or specialist available in time — scaffold needed for the gable; earliest roofer slot confirmed",
    revisedDateIso: revised,
    interimSteps: "Dehumidifier delivered; furniture moved away from the wall; weekly check-in calls with the tenant.",
  });
  const delayPdf = await renderLetterPdf(delayLetter);
  const delayDoc = await storeDocument(db, { orgId: org.id, caseId: c4.id, kind: "delay_notice", filename: `${row4.reference}-notice-of-delay-${londonDateOf(noticeAt)}.pdf`, mime: "application/pdf", bytes: delayPdf, uploadedBy: user.id });
  await db.insert(caseDelays).values({
    orgId: org.id,
    caseId: c4.id,
    duty: "commence_repair",
    reason: "No contractor or specialist available in time — scaffold needed for the gable; earliest roofer slot confirmed",
    interimSteps: "Dehumidifier delivered; furniture moved away from the wall; weekly check-in calls with the tenant.",
    revisedDate: revised,
    noticeIssuedAt: noticeAt,
    createdBy: user.id,
  });
  await addEvent(db, { orgId: org.id, caseId: c4.id, type: "delay_notice", occurredAt: noticeAt, summary: `Delay notice issued for “Start repairs”: no contractor available in time (scaffold needed). Revised date set.`, data: { documentId: delayDoc }, ...staff });

  // 5. Repairs under way — landlord approved the quote via the link.
  const aware5 = workingDaysAgo(today, 20);
  const inv5 = workingDaysAgo(today, 13);
  const c5 = await newCase({
    propertyId: homes[4].id,
    awareAt: at(aware5, "10:30"),
    reportedBy: "Found at routine inspection",
    source: "routine_visit",
    description: "Mould growth in the bathroom ceiling corners and on the silicone around the bath; extractor fan very noisy.",
    rooms: "Bathroom",
    investigationCompletedAt: at(inv5, "15:00"),
    investigators: "Sam Reid, Reid Damp Surveys Ltd",
    investigationMethod: "in_person",
    findings: "Mould to ceiling corners (approx 0.5m² total) and sealant. Extractor fan failed (motor). Relative humidity 81% at time of visit.",
    hazardFound: true,
    cause: "ventilation",
    workRequired: "Replace extractor fan; treat ceiling and reseal the bath",
    repairCommencedAt: at(workingDaysAgo(today, 9), "09:00"),
    contractor: "Leith Electrical & Building",
    repairTargetDate: addWorkingDays(today, 4, REGION),
    status: "repair_in_progress",
  });
  await addEvent(db, { orgId: org.id, caseId: c5.id, type: "investigation_completed", occurredAt: at(inv5, "15:00"), summary: "Investigation completed (in person) by Sam Reid, Reid Damp Surveys Ltd: home NOT substantially free from damp and mould — repairs required.", ...staff });
  await issueSummary(c5.id, at(workingDaysAgo(today, 12), "10:00"));
  const approvedAt = at(workingDaysAgo(today, 11), "19:42");
  await db.insert(approvalRequests).values({
    orgId: org.id,
    caseId: c5.id,
    landlordId: morag.id,
    tokenHash: sha256(randomToken()),
    kind: "repair",
    description: "Replace bathroom extractor fan, mould treatment to ceiling and reseal bath",
    amountPence: 64000,
    contractor: "Leith Electrical & Building",
    status: "approved",
    responseNote: "Go ahead — please send me the invoice. — Morag Campbell",
    respondedAt: approvedAt,
    expiresAt: new Date(now.getTime() + 5 * 86_400_000),
    createdBy: user.id,
    createdAt: at(workingDaysAgo(today, 12), "10:20"),
  });
  await addEvent(db, { orgId: org.id, caseId: c5.id, type: "approval_requested", occurredAt: at(workingDaysAgo(today, 12), "10:20"), summary: "Asked Morag Campbell to approve: Replace bathroom extractor fan, mould treatment to ceiling and reseal bath (£640.00)", ...staff });
  await addEvent(db, { orgId: org.id, caseId: c5.id, type: "approval_responded", occurredAt: approvedAt, actorType: "landlord", actorLabel: "Morag Campbell", actorId: morag.id, summary: "Morag Campbell approved the repair work: Replace bathroom extractor fan, mould treatment to ceiling and reseal bath (£640.00). Confirmed by “Morag Campbell”. Note: Go ahead — please send me the invoice." });
  await addEvent(db, { orgId: org.id, caseId: c5.id, type: "repair_commenced", occurredAt: at(workingDaysAgo(today, 9), "09:00"), summary: "Repair work started: old extractor removed, new humidistat fan fitted; ceiling treatment booked.", ...staff });

  // 6. Closed — found substantially free.
  const aware6 = workingDaysAgo(today, 24);
  const inv6 = workingDaysAgo(today, 18);
  const c6 = await newCase({
    propertyId: homes[6].id,
    awareAt: at(aware6, "13:15"),
    reportedBy: "Tenant by phone",
    description: "Small patch of mould on the kitchen window seal.",
    rooms: "Kitchen",
    investigationCompletedAt: at(inv6, "10:30"),
    investigators: "Fiona Mackay, Lothian & Forth Lettings",
    investigationMethod: "in_person",
    findings: "Minor surface mould on the window seal only (approx 10cm). Moisture readings normal. Extractor and heating working. Cleaned during the visit and advice given on ventilation.",
    hazardFound: false,
    cause: "condensation",
    workDoneOnVisit: "Seal cleaned with fungicidal wash; ventilation advice leaflet left with tenant",
    status: "closed",
    closedAt: at(workingDaysAgo(today, 15), "12:00"),
    closeReason: "Home found substantially free from damp and mould",
  });
  await addEvent(db, { orgId: org.id, caseId: c6.id, type: "investigation_completed", occurredAt: at(inv6, "10:30"), summary: "Investigation completed (in person) by Fiona Mackay: home substantially free from damp and mould.", ...staff });
  await issueSummary(c6.id, at(workingDaysAgo(today, 17), "09:10"));
  await addEvent(db, { orgId: org.id, caseId: c6.id, type: "case_closed", occurredAt: at(workingDaysAgo(today, 15), "12:00"), summary: "Case closed: Home found substantially free from damp and mould", ...staff });

  // 7. Just reported this morning.
  await newCase({
    propertyId: homes[5].id,
    awareAt: new Date(now.getTime() - 2 * 3600_000),
    reportedBy: "Tenant by email",
    description: "Black mould appearing on the bedroom wall behind the bed, near the external corner. Started after the weather turned colder.",
    rooms: "Bedroom 1",
  });

  await db.update(organizations).set({ caseCounter: n }).where(eq(organizations.id, org.id));
  return { user, org };
}
