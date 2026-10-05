import { and, asc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { NewCaseForm } from "@/components/forms/new-case-form";
import { Alert, PageHeader } from "@/components/ui";
import { requireOrg } from "@/lib/auth/session";
import { orgAccess } from "@/lib/billing/plans";
import { getDb } from "@/lib/db";
import { landlords, properties } from "@/lib/db/schema";
import { londonDateOf, londonParts } from "@/lib/rules/calendar";

export const metadata = { title: "Log a report" };

export default async function NewCasePage({ searchParams }: PageProps<"/app/cases/new">) {
  const { org } = await requireOrg();
  const sp = await searchParams;
  const db = await getDb();
  const [props, lls] = await Promise.all([
    db
      .select()
      .from(properties)
      .where(and(eq(properties.orgId, org.id), isNull(properties.archivedAt)))
      .orderBy(asc(properties.addressLine1)),
    db.select({ id: landlords.id, name: landlords.name }).from(landlords).where(eq(landlords.orgId, org.id)).orderBy(asc(landlords.name)),
  ]);
  const access = orgAccess(org);
  const now = new Date();
  const p = londonParts(now);
  const first = sp.first === "1";
  const preselect = typeof sp.property === "string" ? sp.property : undefined;

  return (
    <div>
      <PageHeader
        eyebrow={first ? "Step 2 of 2" : "New report"}
        title={first ? "Log your first damp or mould report" : "Log a report"}
        description="Use the date you first became aware — a tenant message, an inspection, a contractor. RepairClock counts the working days from the day after."
      />
      {!access.canCreate ? (
        <Alert tone="warn" title="Your trial has ended">
          Choose a plan to log new reports. <Link href="/app/billing" className="underline font-medium">See plans</Link>
        </Alert>
      ) : (
        <NewCaseForm
          properties={props.map((x) => ({
            id: x.id,
            label: [x.addressLine1, x.city, x.postcode].filter(Boolean).join(", ") + (x.tenantName ? ` — ${x.tenantName}` : ""),
            jurisdiction: x.jurisdiction,
            sector: x.sector,
          }))}
          landlords={lls}
          defaultJurisdiction={org.jurisdiction}
          defaultSector={org.kind === "social_landlord" ? "social" : "private"}
          isAgent={org.kind === "letting_agent"}
          todayIso={londonDateOf(now)}
          nowTime={`${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`}
          preselectPropertyId={preselect}
        />
      )}
    </div>
  );
}
