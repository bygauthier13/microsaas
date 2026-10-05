import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { ShieldAlert } from "lucide-react";
import { Logo } from "@/components/logo";
import { Alert, Badge } from "@/components/ui";
import { ApprovalResponseForm } from "@/components/public/approval-response-form";
import { loadCase } from "@/lib/cases/workflow";
import { propertyAddress } from "@/lib/cases/service";
import { getDb } from "@/lib/db";
import { approvalRequests, landlords, organizations } from "@/lib/db/schema";
import { formatPence } from "@/lib/domain";
import { formatInstant, formatIsoDateLong } from "@/lib/rules/calendar";
import { hazardLabel, type HazardKey } from "@/lib/rules/hazards";
import { sha256 } from "@/lib/security/crypto";

export const metadata: Metadata = {
  title: "Approve repair work",
  robots: { index: false, follow: false },
  // The token is in the URL: never leak it to other sites via the Referer header.
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

function hasExpired(at: Date): boolean {
  return at.getTime() < Date.now();
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function ApprovePage({ params }: PageProps<"/approve/[token]">) {
  const token = safeDecode((await params).token);
  const db = await getDb();
  const [row] =
    token.length <= 200
      ? await db
          .select({ req: approvalRequests, org: organizations, landlord: landlords })
          .from(approvalRequests)
          .innerJoin(organizations, eq(organizations.id, approvalRequests.orgId))
          .leftJoin(landlords, and(eq(landlords.id, approvalRequests.landlordId), eq(landlords.orgId, approvalRequests.orgId)))
          .where(eq(approvalRequests.tokenHash, sha256(token)))
          .limit(1)
      : [];

  const shell = (content: React.ReactNode) => (
    <div className="min-h-screen bg-paper px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center justify-between">
          <Logo href="/" />
          <span className="text-xs text-muted">Secure approval link</span>
        </div>
        {content}
      </div>
    </div>
  );

  if (!row) {
    return shell(
      <Alert tone="warn" title="This link isn't valid">
        It may have been mistyped, withdrawn or replaced by a newer request. Please contact your letting agent.
      </Alert>,
    );
  }
  const loaded = await loadCase(db, row.org.id, row.req.caseId);
  if (!loaded) {
    return shell(<Alert tone="warn" title="This request is no longer available">Please contact your letting agent.</Alert>);
  }
  const { req, org, landlord } = row;
  const ev = loaded.evaluation;
  const next = ev.nextDuty;
  const expired = hasExpired(req.expiresAt);
  const scotland = loaded.property.jurisdiction === "scotland";

  return shell(
    <div className="space-y-5">
      <div>
        <p className="eyebrow">{org.name} needs your decision</p>
        <h1 className="display mt-2 text-3xl leading-tight">
          Approve {req.kind === "investigation" ? "an investigation" : "repair work"} at {loaded.property.addressLine1}
        </h1>
        <p className="mt-2 text-muted">
          Hello {landlord?.name ?? "there"} — your agent is asking you to approve the work below for{" "}
          <span className="text-ink">{propertyAddress(loaded.property)}</span>.
        </p>
      </div>

      <div className="card divide-y divide-line">
        <Item label="Issue">{hazardLabel(loaded.case.hazard as HazardKey)}</Item>
        <Item label="Work">{req.description}</Item>
        {req.amountPence != null ? <Item label="Estimated cost">{formatPence(req.amountPence)}</Item> : null}
        {req.contractor ? <Item label="Contractor">{req.contractor}</Item> : null}
        {req.respondBy ? <Item label="Please respond by">{formatIsoDateLong(req.respondBy)}</Item> : null}
        <Item label="Case reference">
          <span className="font-mono">{loaded.case.reference}</span>
        </Item>
      </div>

      {ev.inForce && next?.dueDate ? (
        <div className="rounded-xl border border-signal/30 bg-signal-soft p-4">
          <div className="flex gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-signal-strong" aria-hidden />
            <div className="text-sm leading-relaxed">
              <p className="font-semibold text-signal-strong">
                Legal deadline: {next.label.toLowerCase()} by {formatIsoDateLong(next.dueDate)}
              </p>
              <p className="mt-1 text-ink-2">
                {scotland
                  ? "Under the Investigation and Commencement of Repair (Scotland) Regulations 2026, landlords must investigate damp and mould within 10 working days of becoming aware of it and begin any repairs within 5 working days of the investigation. The legal duty rests with you as the landlord, even when an agent manages the property."
                  : "Under Awaab's Law, social landlords must investigate potential hazards and make homes safe within fixed timescales. The legal duty rests with the landlord."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {req.status !== "pending" ? (
        <Alert tone={req.status === "approved" ? "ok" : "neutral"} title={`This request was ${req.status}`}>
          {req.respondedAt ? `Answered ${formatInstant(req.respondedAt)}.` : null} {req.responseNote ?? ""}
        </Alert>
      ) : expired ? (
        <Alert tone="warn" title="This link has expired">
          Please ask {org.name} to send a new approval request.
        </Alert>
      ) : (
        <ApprovalResponseForm token={token} landlordName={landlord?.name ?? "the landlord"} />
      )}

      <p className="text-xs leading-relaxed text-muted">
        Sent by {org.name} using RepairClock. Your decision, your typed name and the time are added to the case&apos;s audit log. Questions? Reply to the email
        this link came in, or contact {org.name} directly. <Badge className="ml-1">No account needed</Badge>
      </p>
    </div>,
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="text-sm text-ink break-words">{children}</p>
    </div>
  );
}
