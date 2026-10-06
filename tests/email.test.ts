/**
 * Reply-to routing: with a sending-only From address, replies must reach a real inbox.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const sent: Array<Record<string, unknown>> = [];

vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: async (payload: Record<string, unknown>) => {
        sent.push(payload);
        return { data: { id: "email_1" }, error: null };
      },
    };
  },
}));
vi.mock("@/lib/db", () => ({
  getDb: async () => ({ insert: () => ({ values: async () => undefined }) }),
}));

describe("sendEmail reply-to", () => {
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "RepairClock <notifications@repairclock.example.com>";
    process.env.SUPPORT_EMAIL = "owner@example.com";
  });

  it("falls back to SUPPORT_EMAIL when no reply-to is given", async () => {
    const { sendEmail } = await import("@/lib/email/send");
    await sendEmail({ to: "a@example.com", subject: "s", html: "<p>h</p>", text: "t", category: "digest" });
    await sendEmail({ to: "a@example.com", subject: "s", html: "<p>h</p>", text: "t", category: "approval_request", replyTo: null });
    expect(sent.map((p) => p.replyTo)).toEqual(["owner@example.com", "owner@example.com"]);
    expect(sent[0].from).toBe("RepairClock <notifications@repairclock.example.com>");
  });

  it("keeps an explicit reply-to such as the agency's own address", async () => {
    const { sendEmail } = await import("@/lib/email/send");
    await sendEmail({ to: "tenant@example.com", subject: "s", html: "<p>h</p>", text: "t", category: "written_summary", replyTo: "lettings@agency.example" });
    expect(sent[0].replyTo).toBe("lettings@agency.example");
  });
});

describe("agency sender name and copy", () => {
  beforeEach(() => {
    sent.length = 0;
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "RepairClock <notifications@repairclock.example.com>";
  });

  it("shows the agency's name but keeps the sending address", async () => {
    const { fromWithName } = await import("@/lib/email/send");
    expect(fromWithName("RepairClock <notifications@x.com>", "Test Lettings via RepairClock")).toBe('"Test Lettings via RepairClock" <notifications@x.com>');
    expect(fromWithName("notifications@x.com", 'Evil" <a@b.c>\nBcc: x')).toBe('"Evil a@b.c Bcc: x" <notifications@x.com>');
    expect(fromWithName("RepairClock <notifications@x.com>", "  ")).toBe("RepairClock <notifications@x.com>");
  });

  it("copies the agency's inbox unless switched off, never the recipient twice", async () => {
    const { agencySender, sendEmail } = await import("@/lib/email/send");
    const org = { name: "Test Lettings", settings: { replyToEmail: "sara@testlettings.example" } };
    expect(agencySender(org)).toEqual({ fromName: "Test Lettings via RepairClock", bcc: "sara@testlettings.example" });
    expect(agencySender({ ...org, settings: { ...org.settings, copyLettersToReplyTo: false } }).bcc).toBeNull();
    expect(agencySender({ name: "No Inbox Lettings", settings: {} }).bcc).toBeNull();

    await sendEmail({ to: "tenant@example.com", subject: "s", html: "<p>h</p>", text: "t", category: "written_summary", replyTo: "sara@testlettings.example", ...agencySender(org) });
    await sendEmail({ to: "sara@testlettings.example", subject: "s", html: "<p>h</p>", text: "t", category: "approval_request", ...agencySender(org) });
    expect(sent[0]).toMatchObject({ from: '"Test Lettings via RepairClock" <notifications@repairclock.example.com>', bcc: "sara@testlettings.example" });
    expect(sent[1].bcc).toBeUndefined();
  });
});
