/**
 * Plain, accessible transactional email templates. Every dynamic value is HTML-escaped.
 */
import { env } from "@/lib/env";

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

function layout(opts: { preheader: string; heading: string; body: string; footer?: string }): string {
  const footer =
    opts.footer ??
    `Sent by RepairClock — statutory repair deadlines for UK landlords and letting agents.`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    opts.heading,
  )}</title></head>
<body style="margin:0;background:#f4f1ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14213d;">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e4dfd3;border-radius:12px">
<tr><td style="padding:24px 28px 8px 28px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:#8a5a12;font-weight:600">RepairClock</td></tr>
<tr><td style="padding:0 28px"><h1 style="font-size:22px;line-height:1.3;margin:8px 0 16px 0;font-weight:650">${escapeHtml(opts.heading)}</h1></td></tr>
<tr><td style="padding:0 28px 24px 28px;font-size:15px;line-height:1.6">${opts.body}</td></tr>
</table>
<p style="max-width:560px;font-size:12px;line-height:1.5;color:#6b6457;margin:16px auto 0 auto">${escapeHtml(footer)}</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string, color = "#14213d"): string {
  return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:${color};color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600">${escapeHtml(
    label,
  )}</a></p>`;
}

function rows(pairs: Array<[string, string | null | undefined]>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:12px 0">${pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px 6px 0;color:#6b6457;font-size:13px;vertical-align:top;white-space:nowrap">${escapeHtml(
          k,
        )}</td><td style="padding:6px 0;font-size:14px">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;
}

export function passwordResetEmail(url: string): Rendered {
  return {
    subject: "Reset your RepairClock password",
    html: layout({
      preheader: "Use this link within an hour to choose a new password.",
      heading: "Reset your password",
      body: `<p>Someone (hopefully you) asked to reset the password for this RepairClock account.</p>${button(
        url,
        "Choose a new password",
      )}<p style="color:#6b6457;font-size:13px">The link works once and expires in 60 minutes. If you didn't ask for this, you can ignore this email.</p>`,
    }),
    text: `Reset your RepairClock password: ${url}\n\nThe link works once and expires in 60 minutes. If you didn't ask for this, ignore this email.`,
  };
}

export function welcomeEmail(opts: { name: string; orgName: string }): Rendered {
  const url = `${env.appUrl}/app`;
  return {
    subject: `Welcome to RepairClock, ${opts.name || "there"}`,
    html: layout({
      preheader: "Log your first damp or mould report and the statutory clocks start automatically.",
      heading: `${opts.orgName} is set up`,
      body: `<p>Every damp, mould or hazard report you log now gets its statutory deadlines worked out automatically — Scottish and English bank holidays included.</p>
<p>The fastest way to see the value: log the next report you receive (or one from this week) and send the landlord an approval link.</p>${button(url, "Open RepairClock")}
<p style="color:#6b6457;font-size:13px">Your free trial lasts 14 days. No card needed until you choose a plan.</p>`,
    }),
    text: `${opts.orgName} is set up on RepairClock. Open: ${url}`,
  };
}

export function approvalRequestEmail(opts: {
  orgName: string;
  landlordName: string;
  propertyAddress: string;
  kind: "investigation" | "repair";
  description: string;
  amount: string | null;
  contractor: string | null;
  deadlineText: string | null;
  respondBy: string | null;
  url: string;
}): Rendered {
  const what = opts.kind === "investigation" ? "a damp & mould investigation" : "repair work";
  return {
    subject: `Approval needed: ${what} at ${opts.propertyAddress}`,
    html: layout({
      preheader: `${opts.orgName} needs your go-ahead${opts.respondBy ? ` by ${opts.respondBy}` : ""}.`,
      heading: `Your approval is needed for ${what}`,
      body: `<p>Hello ${escapeHtml(opts.landlordName)},</p>
<p>${escapeHtml(opts.orgName)} manages <strong>${escapeHtml(opts.propertyAddress)}</strong> on your behalf and needs your decision.</p>
${rows([
  ["Work", opts.description],
  ["Estimated cost", opts.amount],
  ["Contractor", opts.contractor],
  ["Please respond by", opts.respondBy],
])}
${
  opts.deadlineText
    ? `<p style="background:#fff6e6;border-left:3px solid #c27c0e;padding:10px 12px;font-size:14px">${escapeHtml(opts.deadlineText)}</p>`
    : ""
}
${button(opts.url, "Review and respond")}
<p style="color:#6b6457;font-size:13px">One click — no account or password needed. The link is unique to you; please don't forward it.</p>`,
    }),
    text: `${opts.orgName} needs your approval for ${what} at ${opts.propertyAddress}.\n\n${opts.description}\n${
      opts.amount ? `Estimated cost: ${opts.amount}\n` : ""
    }${opts.deadlineText ? `\n${opts.deadlineText}\n` : ""}\nRespond here: ${opts.url}`,
  };
}

export function approvalResponseEmail(opts: {
  landlordName: string;
  decision: "approved" | "declined";
  reference: string;
  propertyAddress: string;
  note: string | null;
  caseUrl: string;
}): Rendered {
  const verb = opts.decision === "approved" ? "approved" : "declined";
  return {
    subject: `${opts.landlordName} ${verb} works for ${opts.reference}`,
    html: layout({
      preheader: `${opts.propertyAddress} — ${verb}.`,
      heading: `Landlord ${verb} the request`,
      body: `${rows([
        ["Case", opts.reference],
        ["Property", opts.propertyAddress],
        ["Decision", verb],
        ["Note", opts.note],
      ])}${button(opts.caseUrl, "Open the case")}${
        opts.decision === "declined"
          ? `<p style="font-size:14px">The statutory duty sits with the landlord. RepairClock has logged the decision on the case timeline; consider writing to the landlord to explain the legal exposure.</p>`
          : ""
      }`,
    }),
    text: `${opts.landlordName} ${verb} works for ${opts.reference} (${opts.propertyAddress}). ${opts.note ?? ""}\n${opts.caseUrl}`,
  };
}

export function digestEmail(opts: {
  orgName: string;
  items: Array<{ reference: string; address: string; duty: string; due: string; status: string; url: string }>;
}): Rendered {
  const overdue = opts.items.filter((i) => i.status === "Overdue").length;
  const list = opts.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 8px 8px 0;border-top:1px solid #eee;font-size:14px"><a href="${escapeHtml(i.url)}" style="color:#14213d;font-weight:600">${escapeHtml(
          i.reference,
        )}</a><br><span style="color:#6b6457;font-size:13px">${escapeHtml(i.address)}</span></td><td style="padding:8px 0;border-top:1px solid #eee;font-size:13px">${escapeHtml(
          i.duty,
        )}<br><strong style="color:${i.status === "Overdue" ? "#b42318" : "#8a5a12"}">${escapeHtml(i.status)} · ${escapeHtml(i.due)}</strong></td></tr>`,
    )
    .join("");
  return {
    subject: overdue
      ? `${overdue} overdue · ${opts.items.length} deadlines need attention`
      : `${opts.items.length} statutory deadline${opts.items.length === 1 ? "" : "s"} coming up`,
    html: layout({
      preheader: `Today's damp, mould & hazard deadlines for ${opts.orgName}.`,
      heading: "Deadlines that need you today",
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${list}</table>${button(
        `${env.appUrl}/app`,
        "Open dashboard",
      )}`,
    }),
    text: opts.items.map((i) => `${i.reference} ${i.address}: ${i.duty} — ${i.status} ${i.due} (${i.url})`).join("\n"),
  };
}

export function tenantLetterEmail(opts: {
  orgName: string;
  tenantName: string;
  propertyAddress: string;
  letterTitle: string;
  intro: string;
}): Rendered {
  return {
    subject: `${opts.letterTitle} — ${opts.propertyAddress}`,
    html: layout({
      preheader: `${opts.orgName}: ${opts.letterTitle}.`,
      heading: opts.letterTitle,
      body: `<p>Dear ${escapeHtml(opts.tenantName || "tenant")},</p><p>${escapeHtml(opts.intro)}</p><p>The full letter is attached as a PDF. Please keep it for your records.</p><p>${escapeHtml(
        opts.orgName,
      )}</p>`,
      footer: `Sent on behalf of ${opts.orgName} via RepairClock.`,
    }),
    text: `Dear ${opts.tenantName || "tenant"},\n\n${opts.intro}\n\nThe full letter is attached as a PDF.\n\n${opts.orgName}`,
  };
}

export function trialEndingEmail(opts: { orgName: string; daysLeft: number }): Rendered {
  const url = `${env.appUrl}/app/billing`;
  return {
    subject: `Your RepairClock trial ends in ${opts.daysLeft} day${opts.daysLeft === 1 ? "" : "s"}`,
    html: layout({
      preheader: "Keep your statutory clocks and evidence running.",
      heading: "Your trial is nearly over",
      body: `<p>${escapeHtml(opts.orgName)}'s trial ends in ${opts.daysLeft} day${
        opts.daysLeft === 1 ? "" : "s"
      }. Existing cases stay fully usable and exportable either way — a plan lets you keep logging new reports.</p>${button(url, "Choose a plan")}`,
    }),
    text: `Your RepairClock trial ends in ${opts.daysLeft} days. Choose a plan: ${url}`,
  };
}
