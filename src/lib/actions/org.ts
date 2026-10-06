"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { track } from "@/lib/analytics";
import { requireOrg, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { cases, landlords, organizations, properties, type OrgKind } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email/send";
import { welcomeEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { createOrganization, homesHeadroom } from "@/lib/org";
import { ActionError, emailField, oneOf, optStr, str, toState, type ActionState } from "./helpers";

export async function onboardingAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org } = await requireUser();
    if (org) redirect("/app");
    const name = str(fd, "orgName", 160);
    if (!name) throw new ActionError("Enter your organisation's name.");
    const kind = oneOf(fd, "kind", ["letting_agent", "private_landlord", "social_landlord"] as const) as OrgKind;
    const jurisdiction = oneOf(fd, "jurisdiction", ["scotland", "england"] as const);
    const created = await createOrganization({
      userId: user.id,
      name,
      kind,
      jurisdiction,
      settings: {
        signatoryName: optStr(fd, "signatoryName", 160) ?? user.name,
        signatoryRole: optStr(fd, "signatoryRole", 160) ?? undefined,
        phone: optStr(fd, "phone", 40) ?? undefined,
        replyToEmail: emailField(fd, "replyToEmail") ?? user.email,
        digestEnabled: true,
      },
    });
    await track("onboarding_completed", {
      orgId: created.id,
      userId: user.id,
      props: { kind, jurisdiction, homes: str(fd, "homes", 10) },
    });
    const mail = welcomeEmail({ name: user.name, orgName: name });
    await sendEmail({ to: user.email, ...mail, category: "welcome", orgId: created.id, replyTo: env.company.email });
  } catch (err) {
    return toState(err);
  }
  // The app layout was first drawn without a workspace (no menu); redraw it with the new one.
  revalidatePath("/app", "layout");
  redirect("/app/cases/new?first=1");
}

export async function updateSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { org, role } = await requireOrg();
    if (role !== "owner") throw new ActionError("Only the account owner can change settings.");
    const db = await getDb();
    const name = str(fd, "orgName", 160);
    if (!name) throw new ActionError("Enter your organisation's name.");
    await db
      .update(organizations)
      .set({
        name,
        jurisdiction: oneOf(fd, "jurisdiction", ["scotland", "england"] as const, org.jurisdiction),
        settings: {
          ...org.settings,
          signatoryName: optStr(fd, "signatoryName", 160) ?? undefined,
          signatoryRole: optStr(fd, "signatoryRole", 160) ?? undefined,
          phone: optStr(fd, "phone", 40) ?? undefined,
          replyToEmail: emailField(fd, "replyToEmail") ?? undefined,
          adviceSignpost: optStr(fd, "adviceSignpost", 2000) ?? undefined,
          repairPolicyNote: optStr(fd, "repairPolicyNote", 1000) ?? undefined,
          digestEnabled: str(fd, "digestEnabled", 5) === "on",
          copyLettersToReplyTo: str(fd, "copyLettersToReplyTo", 5) === "on",
        },
      })
      .where(eq(organizations.id, org.id));
    revalidatePath("/app", "layout");
    return { ok: true, message: "Settings saved." };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Landlords
// ---------------------------------------------------------------------------

export async function saveLandlordAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { org } = await requireOrg();
    const db = await getDb();
    const id = str(fd, "landlordId", 64);
    const name = str(fd, "name", 160);
    if (!name) throw new ActionError("Enter the landlord's name.");
    const values = {
      name,
      email: emailField(fd, "email"),
      phone: optStr(fd, "phone", 40),
      notes: optStr(fd, "notes", 2000),
    };
    if (id) {
      const res = await db
        .update(landlords)
        .set(values)
        .where(and(eq(landlords.orgId, org.id), eq(landlords.id, id)))
        .returning({ id: landlords.id });
      if (!res.length) throw new ActionError("Landlord not found.");
    } else {
      await db.insert(landlords).values({ orgId: org.id, ...values });
    }
    revalidatePath("/app/landlords");
    return { ok: true, message: id ? "Landlord updated." : "Landlord added." };
  } catch (err) {
    return toState(err);
  }
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

async function resolveLandlord(orgId: string, fd: FormData): Promise<string | null> {
  const db = await getDb();
  const choice = str(fd, "landlordId", 64);
  if (!choice || choice === "none") return null;
  if (choice === "new") {
    const name = str(fd, "landlordName", 160);
    if (!name) throw new ActionError("Enter the new landlord's name.");
    const [l] = await db
      .insert(landlords)
      .values({ orgId, name, email: emailField(fd, "landlordEmail"), phone: optStr(fd, "landlordPhone", 40) })
      .returning({ id: landlords.id });
    return l.id;
  }
  const [l] = await db
    .select({ id: landlords.id })
    .from(landlords)
    .where(and(eq(landlords.orgId, orgId), eq(landlords.id, choice)))
    .limit(1);
  if (!l) throw new ActionError("Choose a valid landlord.");
  return l.id;
}

export async function savePropertyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { org, user } = await requireOrg();
    const db = await getDb();
    const id = str(fd, "propertyId", 64);
    const addressLine1 = str(fd, "addressLine1", 200);
    if (!addressLine1) throw new ActionError("Enter the first line of the address.");
    if (!id) {
      const headroom = await homesHeadroom(org, 1);
      if (!headroom.ok) {
        throw new ActionError(
          headroom.access.canCreate
            ? `Your plan covers ${headroom.limit} homes. Upgrade to add more.`
            : "Your trial has ended — choose a plan to add homes.",
        );
      }
    }
    const values = {
      addressLine1,
      addressLine2: optStr(fd, "addressLine2", 200),
      city: optStr(fd, "city", 120),
      postcode: optStr(fd, "postcode", 12)?.toUpperCase() ?? null,
      jurisdiction: oneOf(fd, "jurisdiction", ["scotland", "england"] as const, org.jurisdiction),
      sector: oneOf(fd, "sector", ["private", "social"] as const, org.kind === "social_landlord" ? "social" : "private"),
      tenantName: optStr(fd, "tenantName", 160),
      tenantEmail: emailField(fd, "tenantEmail"),
      tenantPhone: optStr(fd, "tenantPhone", 40),
      notes: optStr(fd, "notes", 2000),
      landlordId: await resolveLandlord(org.id, fd),
    };
    if (id) {
      const res = await db
        .update(properties)
        .set(values)
        .where(and(eq(properties.orgId, org.id), eq(properties.id, id)))
        .returning({ id: properties.id });
      if (!res.length) throw new ActionError("Property not found.");
    } else {
      await db.insert(properties).values({ orgId: org.id, ...values });
      await track("property_added", { orgId: org.id, userId: user.id, isDemo: org.isDemo });
    }
    revalidatePath("/app/properties");
    return { ok: true, message: id ? "Property updated." : "Property added." };
  } catch (err) {
    return toState(err);
  }
}

export async function archivePropertyAction(fd: FormData): Promise<void> {
  const { org } = await requireOrg();
  const db = await getDb();
  const propertyId = str(fd, "propertyId", 64);
  const [openCase] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.orgId, org.id), eq(cases.propertyId, propertyId), ne(cases.status, "closed")))
    .limit(1);
  if (openCase) redirect("/app/properties?error=open_case");
  await db
    .update(properties)
    .set({ archivedAt: new Date() })
    .where(and(eq(properties.orgId, org.id), eq(properties.id, propertyId), isNull(properties.archivedAt)));
  revalidatePath("/app/properties");
}

const HEADER_ALIASES: Record<string, string> = {
  address: "addressLine1",
  address1: "addressLine1",
  "address line 1": "addressLine1",
  addressline1: "addressLine1",
  address2: "addressLine2",
  "address line 2": "addressLine2",
  addressline2: "addressLine2",
  town: "city",
  city: "city",
  postcode: "postcode",
  "post code": "postcode",
  tenant: "tenantName",
  "tenant name": "tenantName",
  tenantname: "tenantName",
  "tenant email": "tenantEmail",
  tenantemail: "tenantEmail",
  "tenant phone": "tenantPhone",
  tenantphone: "tenantPhone",
  landlord: "landlordName",
  "landlord name": "landlordName",
  landlordname: "landlordName",
  "landlord email": "landlordEmail",
  landlordemail: "landlordEmail",
  country: "jurisdiction",
  nation: "jurisdiction",
  jurisdiction: "jurisdiction",
  sector: "sector",
};

export async function importPropertiesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { org, user } = await requireOrg();
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError("Choose a CSV file.");
    if (file.size > 2 * 1024 * 1024) throw new ActionError("CSV files must be under 2 MB.");
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => HEADER_ALIASES[h.trim().toLowerCase()] ?? h.trim(),
    });
    const rows = parsed.data.filter((r) => (r.addressLine1 ?? "").trim());
    if (!rows.length) throw new ActionError("No rows with an address found. Use a header row with at least an “Address” column.");
    if (rows.length > 5000) throw new ActionError("Import up to 5,000 homes at a time.");
    const headroom = await homesHeadroom(org, rows.length);
    if (!headroom.ok) {
      throw new ActionError(`That import would take you to ${headroom.current + rows.length} homes; your plan covers ${headroom.limit}.`);
    }
    const db = await getDb();
    const landlordCache = new Map<string, string>();
    const existing = await db.select().from(landlords).where(eq(landlords.orgId, org.id));
    for (const l of existing) landlordCache.set(l.name.trim().toLowerCase(), l.id);
    let imported = 0;
    for (const r of rows) {
      let landlordId: string | null = null;
      const lname = (r.landlordName ?? "").trim();
      if (lname) {
        const key = lname.toLowerCase();
        landlordId = landlordCache.get(key) ?? null;
        if (!landlordId) {
          const email = (r.landlordEmail ?? "").trim().toLowerCase();
          const [l] = await db
            .insert(landlords)
            .values({ orgId: org.id, name: lname.slice(0, 160), email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null })
            .returning({ id: landlords.id });
          landlordId = l.id;
          landlordCache.set(key, l.id);
        }
      }
      const nation = (r.jurisdiction ?? "").toLowerCase();
      const sector = (r.sector ?? "").toLowerCase();
      const tenantEmail = (r.tenantEmail ?? "").trim().toLowerCase();
      await db.insert(properties).values({
        orgId: org.id,
        landlordId,
        addressLine1: r.addressLine1.trim().slice(0, 200),
        addressLine2: r.addressLine2?.trim().slice(0, 200) || null,
        city: r.city?.trim().slice(0, 120) || null,
        postcode: r.postcode?.trim().toUpperCase().slice(0, 12) || null,
        jurisdiction: nation.startsWith("eng") ? "england" : nation.startsWith("sco") ? "scotland" : org.jurisdiction,
        sector: sector.startsWith("soc") ? "social" : sector.startsWith("pri") ? "private" : org.kind === "social_landlord" ? "social" : "private",
        tenantName: r.tenantName?.trim().slice(0, 160) || null,
        tenantEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(tenantEmail) ? tenantEmail : null,
        tenantPhone: r.tenantPhone?.trim().slice(0, 40) || null,
      });
      imported++;
    }
    await track("properties_imported", { orgId: org.id, userId: user.id, isDemo: org.isDemo, props: { count: imported } });
    revalidatePath("/app/properties");
    return { ok: true, message: `Imported ${imported} home${imported === 1 ? "" : "s"}.` };
  } catch (err) {
    return toState(err);
  }
}
