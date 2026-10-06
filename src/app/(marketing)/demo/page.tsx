import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { startDemoAction } from "@/lib/actions/demo";

export const metadata = {
  title: "Live demo — explore RepairClock with sample cases",
  description: "Open a private demo workspace with a sample Edinburgh letting agency, homes and damp & mould cases at every stage. No signup.",
  alternates: { canonical: "/demo" },
};

export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const sp = await searchParams;
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <p className="eyebrow">Live demo · no signup</p>
      <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">Click through a real workspace in two minutes.</h1>
      <p className="mt-5 text-lg leading-relaxed text-ink-2">
        We&apos;ll create a private demo workspace for a sample Edinburgh letting agency — eight homes, three landlords and seven damp and mould cases at every stage: one overdue,
        one with a written summary due today, one waiting on landlord approval, one protected by a delay notice and more.
      </p>

      {sp.expired === "1" ? (
        <Alert tone="info" className="mt-6">
          Your previous demo workspace has expired (they last 24 hours). Start a fresh one below.
        </Alert>
      ) : null}
      {sp.limited === "1" ? (
        <Alert tone="warn" className="mt-6">
          Too many demo workspaces have been created from your network in the last hour. Please try again later.
        </Alert>
      ) : null}
      {sp.unavailable === "1" ? (
        <Alert tone="warn" className="mt-6">
          The demo is switched off on this server.
        </Alert>
      ) : null}

      <div className="card mt-8 p-6 sm:p-8">
        <ul className="space-y-3 text-sm">
          {[
            "Try the written summary editor on a case investigated three days ago",
            "See how a delay notice keeps a late repair compliant",
            "Open the landlord approval link, the morning digest and the outbox",
            "Download a full evidence pack PDF",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
        <form action={startDemoAction} className="mt-6">
          <input type="hidden" name="from" value={typeof sp.from === "string" ? sp.from.slice(0, 40) : ""} />
          <SubmitButton variant="signal" size="lg" className="w-full sm:w-auto" pendingLabel="Building your demo workspace…">
            Open the demo workspace
          </SubmitButton>
        </form>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Everything in the demo is fictional. Emails are never sent — they appear in the in-app outbox — and the workspace is deleted after 24 hours. Opening the demo
          signs you out of any RepairClock account in this browser.
        </p>
      </div>
      <p className="mt-6 text-sm text-muted">
        Ready to use it for real?{" "}
        <Link href="/signup?from=demo" className="font-medium text-ink underline underline-offset-2">
          Start your free trial
        </Link>{" "}
        — it takes about as long as the demo.
      </p>
    </section>
  );
}
