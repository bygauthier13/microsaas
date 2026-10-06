import Link from "next/link";
import { and, asc, count, eq, isNull, ne } from "drizzle-orm";
import { Archive, Building2, FileSpreadsheet, Pencil, Plus } from "lucide-react";
import { ActionForm } from "@/components/case/action-form";
import { PropertyForm } from "@/components/forms/property-form";
import { Alert, Badge, Card, EmptyState, Field, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { archivePropertyAction, importPropertiesAction } from "@/lib/actions/org";
import { requireOrg } from "@/lib/auth/session";
import { orgAccess } from "@/lib/billing/plans";
import { getDb } from "@/lib/db";
import { cases, landlords, properties } from "@/lib/db/schema";
import { homesInUse } from "@/lib/org";

export const metadata = { title: "Homes" };

export default async function PropertiesPage({ searchParams }: PageProps<"/app/properties">) {
  const { org } = await requireOrg();
  const sp = await searchParams;
  const db = await getDb();
  const [homes, lls, openCounts, inUse] = await Promise.all([
    db
      .select({ property: properties, landlordName: landlords.name })
      .from(properties)
      .leftJoin(landlords, eq(landlords.id, properties.landlordId))
      .where(and(eq(properties.orgId, org.id), isNull(properties.archivedAt)))
      .orderBy(asc(properties.addressLine1)),
    db.select({ id: landlords.id, name: landlords.name }).from(landlords).where(eq(landlords.orgId, org.id)).orderBy(asc(landlords.name)),
    db
      .select({ propertyId: cases.propertyId, n: count() })
      .from(cases)
      .where(and(eq(cases.orgId, org.id), ne(cases.status, "closed")))
      .groupBy(cases.propertyId),
    homesInUse(org.id),
  ]);
  const open = new Map(openCounts.map((r) => [r.propertyId, Number(r.n)]));
  const access = orgAccess(org);
  const isAgent = org.kind === "letting_agent";
  const editId = typeof sp.edit === "string" ? sp.edit : null;
  const editing = editId ? homes.find((h) => h.property.id === editId)?.property : undefined;
  const defaults = { jurisdiction: org.jurisdiction, sector: org.kind === "social_landlord" ? ("social" as const) : ("private" as const) };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homes"
        description={`${inUse} of ${access.homesLimit.toLocaleString("en-GB")} homes used on your ${access.planName.toLowerCase()}${
          inUse > homes.length ? ", including archived homes with a report in the last 12 months" : ""
        }.`}
        actions={
          <a href="#add" className="inline-flex h-10 items-center gap-2 rounded-lg bg-ink px-4 text-[0.95rem] font-medium text-white hover:bg-ink-2">
            <Plus className="h-4 w-4" aria-hidden /> Add a home
          </a>
        }
      />

      {sp.error === "open_case" ? (
        <Alert tone="bad">This home has an open report. Close the report before archiving the home, so its deadlines stay in view.</Alert>
      ) : null}

      {editing ? (
        <Card className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Edit {editing.addressLine1}</h2>
            <Link href="/app/properties" className="text-sm text-muted hover:text-ink">
              Cancel
            </Link>
          </div>
          <PropertyForm key={editing.id} values={editing} landlords={lls} isAgent={isAgent} onDoneHref="/app/properties" />
        </Card>
      ) : null}

      {homes.length ? (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_110px_auto] gap-3 border-b border-line px-5 py-2 text-xs font-medium uppercase tracking-wider text-muted md:grid">
            <span>Home</span>
            <span>Tenant</span>
            <span>{isAgent ? "Landlord" : "Notes"}</span>
            <span>Open cases</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {homes.map(({ property: p, landlordName }) => (
              <li key={p.id} className="grid gap-2 px-4 py-3.5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_110px_auto] md:items-center md:gap-3 md:px-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.addressLine1}</p>
                  <p className="truncate text-xs text-muted">
                    {[p.addressLine2, p.city, p.postcode].filter(Boolean).join(", ")}
                    {" · "}
                    {p.jurisdiction === "scotland" ? "Scotland" : "England"} {p.sector === "social" ? "social" : "private"}
                  </p>
                </div>
                <p className="min-w-0 truncate text-sm text-ink-2">{p.tenantName ?? <span className="text-faint">No tenant recorded</span>}</p>
                <p className="min-w-0 truncate text-sm text-ink-2">
                  {isAgent ? (landlordName ?? <span className="text-faint">None linked</span>) : (p.notes ?? "")}
                </p>
                <div>
                  {open.get(p.id) ? (
                    <Link href={`/app/cases?q=${encodeURIComponent(p.addressLine1)}`}>
                      <Badge tone="info">{open.get(p.id)} open</Badge>
                    </Link>
                  ) : (
                    <span className="text-sm text-faint">—</span>
                  )}
                </div>
                <div className="flex items-center gap-1 md:justify-end">
                  <Link href={`/app/cases/new?property=${p.id}`} className="rounded-md px-2 py-1 text-sm font-medium text-signal-strong hover:bg-signal-soft">
                    Log report
                  </Link>
                  <Link href={`/app/properties?edit=${p.id}`} className="rounded-md p-1.5 text-muted hover:bg-paper-2 hover:text-ink" aria-label={`Edit ${p.addressLine1}`}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <form action={archivePropertyAction}>
                    <input type="hidden" name="propertyId" value={p.id} />
                    <button
                      type="submit"
                      disabled={(open.get(p.id) ?? 0) > 0}
                      className="rounded-md p-1.5 text-muted hover:bg-paper-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Archive ${p.addressLine1}`}
                      title={(open.get(p.id) ?? 0) > 0 ? "Close its open report before archiving" : "Archive (keeps its case history)"}
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No homes yet"
          body="Add homes one at a time, import them from a spreadsheet, or just log a report — the home is created as you go."
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6" id="add">
          <h2 className="font-semibold">Add a home</h2>
          <p className="mt-1 mb-4 text-sm text-muted">The nation decides which law and bank holidays apply to its reports.</p>
          <PropertyForm values={defaults} landlords={lls} isAgent={isAgent} />
        </Card>
        <Card className="p-5 sm:p-6 self-start" id="import">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-ok" aria-hidden />
            <h2 className="font-semibold">Import from a spreadsheet</h2>
          </div>
          <p className="mt-1 mb-4 text-sm text-muted leading-relaxed">
            Export your property list from your CRM (Reapit, Alto, Arthur, Goodlord…) as CSV. We recognise common column names: Address, Town, Postcode,
            Tenant name, Tenant email, Landlord name, Landlord email, Nation, Sector.{" "}
            <a href="/homes-template.csv" className="font-medium underline underline-offset-2" download>
              Download a template
            </a>
            .
          </p>
          <ActionForm action={importPropertiesAction} className="space-y-4" resetOnSuccess>
            <Field label="CSV file" htmlFor="file">
              <input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
                className="block w-full text-sm file:mr-3 file:h-9 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:text-sm file:font-medium hover:file:bg-paper"
              />
            </Field>
            <SubmitButton variant="secondary" pendingLabel="Importing…">
              Import homes
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
