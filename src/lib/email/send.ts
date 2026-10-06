/**
 * Outbound email. Uses Resend when RESEND_API_KEY is set; otherwise (and always for demo
 * workspaces) messages are written to the `outbox_emails` table and viewable in-app at
 * /app/outbox, so every flow can be exercised locally without an email provider.
 *
 * Replies go to `replyTo` when given, otherwise to SUPPORT_EMAIL: the From address can be a
 * sending-only address (e.g. notifications@ on a subdomain) with no mailbox behind it.
 */
import { Resend } from "resend";
import { getDb } from "@/lib/db";
import { outboxEmails } from "@/lib/db/schema";
import { env } from "@/lib/env";

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: string;
  orgId?: string | null;
  caseId?: string | null;
  isDemo?: boolean;
  replyTo?: string | null;
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>;
}

export interface EmailResult {
  status: "sent" | "logged" | "failed";
  id?: string;
  error?: string;
}

let resendClient: Resend | null = null;

function resend(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) resendClient = new Resend(env.resendApiKey);
  return resendClient;
}

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const client = input.isDemo ? null : resend();
  let result: EmailResult;
  if (client) {
    try {
      const { data, error } = await client.emails.send({
        from: env.emailFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo || env.company.email,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      });
      result = error ? { status: "failed", error: error.message } : { status: "sent", id: data?.id };
    } catch (err) {
      result = { status: "failed", error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    result = { status: "logged" };
    if (!env.isProduction) {
      console.info(`[email:outbox] to=${input.to} subject="${input.subject}"`);
      // Local development without an email provider: print account emails so links can be followed.
      if (input.category === "password_reset") console.info(input.text);
    }
  }

  try {
    const db = await getDb();
    await db.insert(outboxEmails).values({
      orgId: input.orgId ?? null,
      caseId: input.caseId ?? null,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      category: input.category,
      provider: client ? "resend" : "outbox",
      status: result.status,
      providerId: result.id ?? null,
      error: result.error ?? null,
    });
  } catch (err) {
    console.error("[email] failed to write outbox", err);
  }
  return result;
}
