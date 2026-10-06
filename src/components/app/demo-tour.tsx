import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { CaseListItem } from "@/lib/cases/service";

/**
 * Self-guided tour for the demo workspace: someone arriving from an email can understand the
 * product without a call. Steps point at the seeded cases by reference.
 */
export function DemoTour({ items }: { items: CaseListItem[] }) {
  const byRef = (ref: string) => items.find((i) => i.case.reference === ref);
  const href = (ref: string) => {
    const item = byRef(ref);
    return item ? `/app/cases/${item.case.id}` : "/app/cases";
  };
  const summaryDone = Boolean(byRef("LFL-0003")?.case.summaryIssuedAt);
  const steps = [
    {
      title: "See a missed deadline",
      body: "41 Easter Road: the investigation was due 2 working days ago. The timeline shows every call made to find a contractor.",
      href: href("LFL-0001"),
      done: false,
    },
    {
      title: "Send a tenant letter in one click",
      body: "22 Restalrig Avenue: the written summary is due today and already drafted from the surveyor's notes. Press “Issue written summary”.",
      href: href("LFL-0003"),
      done: summaryDone,
    },
    {
      title: "Get the landlord's approval",
      body: "18 Dalmeny Street: open “Ask the landlord to approve work”, send it, then open the link to see exactly what the landlord sees.",
      href: href("LFL-0002"),
      done: false,
    },
    {
      title: "See a delay notice at work",
      body: "7 Marchmont Crescent: no roofer could come in time, so a delay notice sent before the deadline set a new date. Download its evidence pack.",
      href: href("LFL-0004"),
      done: false,
    },
  ];
  return (
    <section className="card p-4 sm:p-5" aria-labelledby="tour-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id="tour-heading" className="font-semibold">
          Try it in 2 minutes
        </h2>
        <p className="text-sm text-muted">A fictional Edinburgh agency. Nothing you do here reaches a real person.</p>
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Link href={s.href} className="flex h-full flex-col rounded-lg border border-line bg-paper px-3.5 py-3 hover:border-line-strong">
              <span className="flex items-center gap-2 text-sm font-semibold">
                {s.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-label="Done" />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[0.7rem] text-white">{i + 1}</span>
                )}
                {s.title}
              </span>
              <span className="mt-1.5 text-sm leading-snug text-ink-2">{s.body}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-ink-2">
        Seen enough?{" "}
        <Link href="/signup?from=demo" className="font-semibold text-signal-strong underline underline-offset-2">
          Start your own free trial
        </Link>{" "}
        — 14 days, no card. Import your homes from a spreadsheet and log your next real report.
      </p>
    </section>
  );
}
