import Link from "next/link";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { Pencil, Users } from "lucide-react";
import { ActionForm } from "@/components/case/action-form";
import { Badge, Card, EmptyState, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { saveLandlordAction } from "@/lib/actions/org";
import { requireOrg } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { approvalRequests, landlords, properties } from "@/lib/db/schema";

export const metadata = { title: "Landlords" };

export default async function LandlordsPage({ searchParams }: PageProps<"/app/landlords">) {
  const { org } = await requireOrg();
  const sp = await searchParams;
  const db = await getDb();
  const [rows, homeCounts, pending] = await Promise.all([
    db.select().from(landlords).where(eq(landlords.orgId, org.id)).orderBy(asc(landlords.name)),
    db
      .select({ landlordId: properties.landlordId, n: count() })
      .from(properties)
      .where(and(eq(properties.orgId, org.id), isNull(properties.archivedAt)))
      .groupBy(properties.landlordId),
    db
      .select({ landlordId: approvalRequests.landlordId, n: count() })
      .from(approvalRequests)
      .where(and(eq(approvalRequests.orgId, org.id), eq(approvalRequests.status, "pending")))
      .groupBy(approvalRequests.landlordId),
  ]);
  const homes = new Map(homeCounts.map((r) => [r.landlordId, Number(r.n)]));
  const waiting = new Map(pending.map((r) => [r.landlordId, Number(r.n)]));
  const editId = typeof sp.edit === "string" ? sp.edit : null;
  const editing = editId ? rows.find((r) => r.id === editId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Landlords"
        description="The owners you manage homes for. The legal duty stays with them — approval links make their decisions fast and on the record."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          {rows.length ? (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {rows.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{l.name}</p>
                      <p className="truncate text-xs text-muted">
                        {l.email ?? <span className="text-warn">No email — can&apos;t send approval links</span>}
                        {l.phone ? ` · ${l.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {waiting.get(l.id) ? <Badge tone="warn">{waiting.get(l.id)} awaiting reply</Badge> : null}
                      <span className="hidden text-sm text-muted sm:inline">
                        {homes.get(l.id) ?? 0} home{(homes.get(l.id) ?? 0) === 1 ? "" : "s"}
                      </span>
                      <Link href={`/app/landlords?edit=${l.id}`} className="rounded-md p-1.5 text-muted hover:bg-paper-2 hover:text-ink" aria-label={`Edit ${l.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <EmptyState
              icon={<Users className="h-5 w-5" />}
              title="No landlords yet"
              body="Add them here, while adding a home, or let the CSV import create them from a “Landlord name” column."
            />
          )}
        </div>
        <Card className="p-5 sm:p-6 self-start">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">{editing ? `Edit ${editing.name}` : "Add a landlord"}</h2>
            {editing ? (
              <Link href="/app/landlords" className="text-sm text-muted hover:text-ink">
                Cancel
              </Link>
            ) : null}
          </div>
          <ActionForm key={editing?.id ?? "new"} action={saveLandlordAction} className="space-y-4" resetOnSuccess={!editing}>
            {editing ? <input type="hidden" name="landlordId" value={editing.id} /> : null}
            <Field label="Name" htmlFor="name">
              <Input id="name" name="name" required defaultValue={editing?.name} placeholder="Morag Campbell or Campbell Property Ltd" />
            </Field>
            <Field label="Email" htmlFor="email" hint="Approval links and reminders go here.">
              <Input id="email" name="email" type="email" defaultValue={editing?.email ?? ""} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" type="tel" defaultValue={editing?.phone ?? ""} />
            </Field>
            <Field label="Notes" htmlFor="notes">
              <Textarea id="notes" name="notes" rows={2} defaultValue={editing?.notes ?? ""} placeholder="Pre-approved spend limit, preferred contractors…" />
            </Field>
            <SubmitButton pendingLabel="Saving…">{editing ? "Save changes" : "Add landlord"}</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
