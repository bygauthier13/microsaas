import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer | Uint8Array }>({
  dataType() {
    return "bytea";
  },
  fromDriver(value) {
    return Buffer.isBuffer(value) ? value : Buffer.from(value);
  },
  toDriver(value) {
    return value;
  },
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull().default(""),
    passwordHash: text("password_hash"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
    lastLoginAt: ts("last_login_at"),
  },
  (t) => [uniqueIndex("users_email_unique").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    /** sha256 of the session token — the raw token only ever lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    expiresAt: ts("expires_at").notNull(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResets = pgTable("password_resets", {
  id: text("id").primaryKey(), // sha256 of token
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: ts("expires_at").notNull(),
  usedAt: ts("used_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type OrgKind = "letting_agent" | "private_landlord" | "social_landlord";
export type PlanId = "trial" | "landlord" | "agent" | "agency" | "housing";
export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "expired";

export interface OrgSettings {
  signatoryName?: string;
  signatoryRole?: string;
  replyToEmail?: string;
  phone?: string;
  adviceSignpost?: string;
  repairPolicyNote?: string;
  digestEnabled?: boolean;
}

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  kind: text("kind").$type<OrgKind>().notNull().default("letting_agent"),
  jurisdiction: text("jurisdiction").$type<"scotland" | "england">().notNull().default("scotland"),
  isDemo: boolean("is_demo").notNull().default(false),
  demoExpiresAt: ts("demo_expires_at"),
  plan: text("plan").$type<PlanId>().notNull().default("trial"),
  billingInterval: text("billing_interval").$type<"month" | "year">(),
  subscriptionStatus: text("subscription_status").$type<SubscriptionStatus>().notNull().default("trialing"),
  trialEndsAt: ts("trial_ends_at"),
  currentPeriodEnd: ts("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  caseCounter: integer("case_counter").notNull().default(0),
  settings: jsonb("settings").$type<OrgSettings>().notNull().default({}),
  onboardingCompletedAt: ts("onboarding_completed_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role").$type<"owner" | "member">().notNull().default("owner"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.orgId] }), index("memberships_org_idx").on(t.orgId)],
);

export const landlords = pgTable(
  "landlords",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    approvalLimitPence: integer("approval_limit_pence"),
    notes: text("notes"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("landlords_org_idx").on(t.orgId)],
);

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    landlordId: uuid("landlord_id").references(() => landlords.id, { onDelete: "set null" }),
    addressLine1: text("address_line1").notNull(),
    addressLine2: text("address_line2"),
    city: text("city"),
    postcode: text("postcode"),
    jurisdiction: text("jurisdiction").$type<"scotland" | "england">().notNull(),
    sector: text("sector").$type<"private" | "social">().notNull(),
    tenantName: text("tenant_name"),
    tenantEmail: text("tenant_email"),
    tenantPhone: text("tenant_phone"),
    notes: text("notes"),
    archivedAt: ts("archived_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("properties_org_idx").on(t.orgId)],
);

export type CaseStatus =
  | "open"
  | "investigation_booked"
  | "investigated"
  | "repair_in_progress"
  | "monitoring"
  | "closed";

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "restrict" }),
    reference: text("reference").notNull(),
    hazard: text("hazard").notNull().default("damp_mould"),
    triage: text("triage").$type<"emergency" | "significant">().notNull().default("significant"),
    status: text("status").$type<CaseStatus>().notNull().default("open"),
    awareAt: ts("aware_at").notNull(),
    source: text("source").notNull().default("tenant_report"),
    reportedBy: text("reported_by"),
    description: text("description").notNull().default(""),
    rooms: text("rooms"),
    vulnerability: text("vulnerability"),
    // Investigation
    investigationBookedFor: ts("investigation_booked_for"),
    investigationCompletedAt: ts("investigation_completed_at"),
    investigators: text("investigators"),
    investigationMethod: text("investigation_method").$type<"in_person" | "remote">(),
    remoteJustification: text("remote_justification"),
    findings: text("findings"),
    hazardFound: boolean("hazard_found"),
    foundSeverity: text("found_severity").$type<"emergency" | "significant">(),
    cause: text("cause"),
    workDoneOnVisit: text("work_done_on_visit"),
    workRequired: text("work_required"),
    targetRepairStart: text("target_repair_start"), // ISO date
    supplementaryRequired: boolean("supplementary_required"),
    // Summary & works
    summaryIssuedAt: ts("summary_issued_at"),
    summaryMethod: text("summary_method"),
    safetyWorkCompletedAt: ts("safety_work_completed_at"),
    supplementaryStepsAt: ts("supplementary_steps_at"),
    repairCommencedAt: ts("repair_commenced_at"),
    repairTargetDate: text("repair_target_date"), // ISO date
    repairCompletedAt: ts("repair_completed_at"),
    contractor: text("contractor"),
    closedAt: ts("closed_at"),
    closeReason: text("close_reason"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("cases_org_idx").on(t.orgId),
    index("cases_property_idx").on(t.propertyId),
    uniqueIndex("cases_org_reference_unique").on(t.orgId, t.reference),
  ],
);

export const caseDelays = pgTable(
  "case_delays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    duty: text("duty").notNull(),
    reason: text("reason").notNull(),
    interimSteps: text("interim_steps"),
    revisedDate: text("revised_date").notNull(),
    noticeIssuedAt: ts("notice_issued_at").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("case_delays_case_idx").on(t.caseId)],
);

/** Append-only audit trail. Rows are never updated or deleted by application code. */
export const caseEvents = pgTable(
  "case_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    /** When the thing happened (may be back-dated by the user, e.g. a site visit yesterday). */
    occurredAt: ts("occurred_at").notNull(),
    /** When it was recorded in RepairClock (server time, not editable). */
    recordedAt: ts("recorded_at").notNull().defaultNow(),
    actorType: text("actor_type").$type<"user" | "landlord" | "system">().notNull().default("user"),
    actorId: text("actor_id"),
    actorLabel: text("actor_label"),
    summary: text("summary").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index("case_events_case_idx").on(t.caseId), index("case_events_org_idx").on(t.orgId)],
);

export type DocumentKind = "photo" | "report" | "written_summary" | "delay_notice" | "quote" | "other";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "cascade" }),
    kind: text("kind").$type<DocumentKind>().notNull().default("other"),
    filename: text("filename").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    data: bytea("data").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("documents_case_idx").on(t.caseId), index("documents_org_idx").on(t.orgId)],
);

export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id, { onDelete: "cascade" }),
    landlordId: uuid("landlord_id").references(() => landlords.id, { onDelete: "set null" }),
    tokenHash: text("token_hash").notNull(),
    kind: text("kind").$type<"investigation" | "repair">().notNull().default("repair"),
    description: text("description").notNull(),
    amountPence: integer("amount_pence"),
    contractor: text("contractor"),
    respondBy: text("respond_by"), // ISO date
    status: text("status").$type<"pending" | "approved" | "declined" | "cancelled">().notNull().default("pending"),
    responseNote: text("response_note"),
    respondedAt: ts("responded_at"),
    lastReminderAt: ts("last_reminder_at"),
    expiresAt: ts("expires_at").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("approval_token_unique").on(t.tokenHash), index("approval_case_idx").on(t.caseId)],
);

export const outboxEmails = pgTable(
  "outbox_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    caseId: uuid("case_id").references(() => cases.id, { onDelete: "set null" }),
    to: text("to").notNull(),
    subject: text("subject").notNull(),
    html: text("html").notNull(),
    text: text("text").notNull(),
    category: text("category").notNull(),
    provider: text("provider").notNull(),
    status: text("status").$type<"sent" | "logged" | "failed">().notNull(),
    providerId: text("provider_id"),
    error: text("error"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("outbox_org_idx").on(t.orgId)],
);

export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    props: jsonb("props").$type<Record<string, unknown>>().notNull().default({}),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("analytics_name_idx").on(t.name)],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  receivedAt: ts("received_at").notNull().defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: ts("reset_at").notNull(),
});
