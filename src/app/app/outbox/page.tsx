import { desc, eq } from "drizzle-orm";
import { Mail } from "lucide-react";
import { Alert, Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireOrg } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { outboxEmails } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { formatInstant } from "@/lib/rules/calendar";

export const metadata = { title: "Sent emails" };

const CATEGORY: Record<string, string> = {
  written_summary: "Written summary",
  delay_notice: "Delay notice",
  approval_request: "Landlord approval",
  approval_response: "Landlord decision",
  approval_reminder: "Approval reminder",
  digest: "Daily digest",
  welcome: "Welcome",
  password_reset: "Password reset",
  trial_ending: "Trial reminder",
  team_invite: "Team invitation",
};

export default async function OutboxPage() {
  const { org } = await requireOrg();
  const db = await getDb();
  const rows = await db.select().from(outboxEmails).where(eq(outboxEmails.orgId, org.id)).orderBy(desc(outboxEmails.createdAt)).limit(200);
  const live = Boolean(env.resendApiKey) && !org.isDemo;

  return (
    <div>
      <PageHeader title="Sent emails" description="Every email RepairClock sends for your workspace — tenant letters, landlord approvals, reminders and digests." />
      {!live ? (
        <Alert tone="info" className="mb-4">
          {org.isDemo
            ? "Demo workspace: emails are never delivered — they're recorded here so you can see exactly what tenants and landlords would receive."
            : "No email provider is configured yet (RESEND_API_KEY), so emails are recorded here instead of being delivered."}
        </Alert>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState icon={<Mail className="h-5 w-5" />} title="Nothing sent yet" body="Written summaries, delay notices and landlord approval links you send will appear here." />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {rows.map((m) => (
            <details key={m.id} className="group">
              <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] gap-3 px-4 py-3 hover:bg-paper sm:grid-cols-[minmax(0,1fr)_160px_150px_auto] sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{m.subject}</span>
                  <span className="block truncate text-xs text-muted">To {m.to}</span>
                </span>
                <span className="hidden text-xs text-muted sm:block">{CATEGORY[m.category] ?? m.category}</span>
                <span className="hidden text-xs text-muted tabular sm:block">{formatInstant(m.createdAt)}</span>
                <Badge tone={m.status === "sent" ? "ok" : m.status === "failed" ? "bad" : "neutral"}>
                  {m.status === "logged" ? "recorded" : m.status}
                </Badge>
              </summary>
              <div className="border-t border-line bg-paper px-4 py-4 sm:px-5">
                {m.error ? <Alert tone="bad" className="mb-3">{m.error}</Alert> : null}
                <iframe
                  title={`Email: ${m.subject}`}
                  srcDoc={m.html}
                  sandbox=""
                  loading="lazy"
                  className="h-[520px] w-full rounded-lg border border-line bg-white"
                />
              </div>
            </details>
          ))}
        </Card>
      )}
    </div>
  );
}
