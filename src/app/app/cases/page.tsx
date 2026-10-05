import Link from "next/link";
import clsx from "clsx";
import { Download, FolderClock, Plus, Search } from "lucide-react";
import { CaseListHeader, CaseRow, sortByUrgency } from "@/components/case/case-row";
import { Card, EmptyState, Input, LinkButton, PageHeader } from "@/components/ui";
import { requireOrg } from "@/lib/auth/session";
import { listCases, propertyAddress } from "@/lib/cases/service";

export const metadata = { title: "Cases" };

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "attention", label: "Needs attention" },
  { key: "closed", label: "Closed" },
  { key: "all", label: "All" },
] as const;

export default async function CasesPage({ searchParams }: PageProps<"/app/cases">) {
  const { org } = await requireOrg();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.key === sp.filter)?.key ?? "open";
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 100) : "";
  const all = await listCases(org.id, { includeClosed: true });
  const counts = {
    open: all.filter((i) => i.case.status !== "closed").length,
    attention: all.filter((i) => ["overdue", "due_today", "due_soon"].includes(i.evaluation.overall)).length,
    closed: all.filter((i) => i.case.status === "closed").length,
    all: all.length,
  };
  const filtered = sortByUrgency(
    all.filter((i) => {
      if (filter === "open" && i.case.status === "closed") return false;
      if (filter === "closed" && i.case.status !== "closed") return false;
      if (filter === "attention" && !["overdue", "due_today", "due_soon"].includes(i.evaluation.overall)) return false;
      if (q) {
        const hay = `${i.case.reference} ${propertyAddress(i.property)} ${i.property.tenantName ?? ""} ${i.landlord?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }),
  );

  return (
    <div>
      <PageHeader
        title="Cases"
        description="Every damp, mould and hazard report, most urgent first."
        actions={
          <>
            <a href="/api/export/cases" className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-muted hover:bg-paper-2 hover:text-ink">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
            <LinkButton href="/app/cases/new" variant="signal">
              <Plus className="h-4 w-4" aria-hidden /> Log a report
            </LinkButton>
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 overflow-x-auto" aria-label="Filter cases">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={{ pathname: "/app/cases", query: { filter: f.key, ...(q ? { q } : {}) } }}
              aria-current={filter === f.key ? "page" : undefined}
              className={clsx(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm",
                filter === f.key ? "bg-surface border border-line font-medium shadow-[var(--shadow-card)]" : "text-ink-2 hover:bg-paper-2",
              )}
            >
              {f.label} <span className="tabular text-muted">{counts[f.key]}</span>
            </Link>
          ))}
        </nav>
        <form className="relative sm:w-72" action="/app/cases">
          <input type="hidden" name="filter" value={filter} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" aria-hidden />
          <Input name="q" defaultValue={q} placeholder="Search address, tenant, ref…" className="pl-9" aria-label="Search cases" />
        </form>
      </div>

      {filtered.length ? (
        <Card className="overflow-hidden">
          <CaseListHeader />
          <ul className="divide-y divide-line">
            {filtered.map((i) => (
              <CaseRow key={i.case.id} item={i} />
            ))}
          </ul>
        </Card>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<FolderClock className="h-5 w-5" />}
          title="No cases yet"
          body="Log the first damp or mould report and RepairClock calculates every statutory deadline."
          action={
            <LinkButton href="/app/cases/new" variant="signal">
              Log a report
            </LinkButton>
          }
        />
      ) : (
        <EmptyState title="Nothing matches" body={q ? `No cases match “${q}”.` : "No cases in this view."} action={<LinkButton href="/app/cases" variant="secondary">Clear filters</LinkButton>} />
      )}
    </div>
  );
}
