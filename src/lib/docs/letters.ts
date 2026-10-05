/**
 * Letter content builders. Each returns editable plain text (blank line = paragraph,
 * "## " = heading, "- " = bullet). Users always review the draft before it is issued.
 *
 * Scotland written summary: content required by Scottish Government guidance para 5.5
 * (investigator, process & findings with explicit "substantially free" conclusion, work done on
 * the visit, work required + target start, or reasons if none) plus signposting (para 5.6).
 * England written summary: Hazards in Social Housing Regs Part 4 + MHCLG template (section 7.2).
 */
import type { OrgSettings } from "@/lib/db/schema";
import { CAUSES, optionLabel } from "@/lib/domain";
import type { CaseEvaluation, DutyKey } from "@/lib/rules/engine";
import { formatIsoDateLong, londonDateOf } from "@/lib/rules/calendar";
import { hazardLabel, type HazardKey } from "@/lib/rules/hazards";
import type { CaseRow, PropertyRow } from "@/lib/cases/service";

export interface LetterContext {
  orgName: string;
  settings: OrgSettings;
  property: PropertyRow;
  caseRow: CaseRow;
  evaluation: CaseEvaluation;
  issueDateIso?: string;
}

export interface LetterDocument {
  title: string;
  reference: string;
  dateIso: string;
  recipientName: string;
  recipientAddress: string[];
  fromName: string;
  fromLines: string[];
  body: string;
  signoffName: string;
  signoffRole: string;
  footer: string;
}

function addressLines(p: PropertyRow): string[] {
  return [p.addressLine1, p.addressLine2, p.city, p.postcode].filter((x): x is string => Boolean(x));
}

function fullAddress(p: PropertyRow): string {
  return addressLines(p).join(", ");
}

function due(ev: CaseEvaluation, key: DutyKey): string | null {
  const d = ev.duties.find((x) => x.key === key);
  return d?.dueDate ? formatIsoDateLong(d.dueDate) : null;
}

export function defaultSignpost(jurisdiction: "scotland" | "england", sector: "private" | "social"): string {
  if (jurisdiction === "scotland") {
    return sector === "social"
      ? "- Shelter Scotland: 0808 800 4444 or scotland.shelter.org.uk\n- Citizens Advice Scotland: cas.org.uk\n- If you are unhappy with how we have handled this, you can use our complaints procedure and then contact the Scottish Public Services Ombudsman (spso.org.uk)."
      : "- Shelter Scotland: 0808 800 4444 or scotland.shelter.org.uk\n- Citizens Advice Scotland: cas.org.uk\n- If repairs are not carried out, you can apply to the First-tier Tribunal for Scotland (Housing and Property Chamber): housingandpropertychamber.scot";
  }
  return "- Shelter: 0808 800 4444 or england.shelter.org.uk\n- Citizens Advice: citizensadvice.org.uk\n- If you are unhappy with how we have handled this, you can use our complaints procedure and then contact the Housing Ombudsman Service (housing-ombudsman.org.uk).";
}

function contactLine(ctx: LetterContext): string {
  const s = ctx.settings;
  const parts = [s.phone, s.replyToEmail].filter(Boolean);
  return parts.length ? parts.join(" or ") : "the contact details at the top of this letter";
}

function baseDoc(ctx: LetterContext, title: string, body: string, footer: string): LetterDocument {
  const s = ctx.settings;
  return {
    title,
    reference: ctx.caseRow.reference,
    dateIso: ctx.issueDateIso ?? londonDateOf(new Date()),
    recipientName: ctx.property.tenantName || "The Tenant",
    recipientAddress: addressLines(ctx.property),
    fromName: ctx.orgName,
    fromLines: [s.phone, s.replyToEmail].filter((x): x is string => Boolean(x)),
    body,
    signoffName: s.signatoryName || ctx.orgName,
    signoffRole: s.signatoryRole || "",
    footer,
  };
}

// ---------------------------------------------------------------------------
// Written summary
// ---------------------------------------------------------------------------

export function draftWrittenSummary(ctx: LetterContext): LetterDocument {
  const { caseRow: c, property: p, evaluation: ev } = ctx;
  return p.jurisdiction === "scotland" ? scotlandSummary(ctx, c, p, ev) : englandSummary(ctx, c, p, ev);
}

function scotlandSummary(ctx: LetterContext, c: CaseRow, p: PropertyRow, ev: CaseEvaluation): LetterDocument {
  const aware = formatIsoDateLong(londonDateOf(c.awareAt));
  const inv = c.investigationCompletedAt ? formatIsoDateLong(londonDateOf(c.investigationCompletedAt)) : "[investigation date]";
  const method = c.investigationMethod === "remote" ? "a remote" : "an in-person";
  const cause = c.cause && c.cause !== "unknown" ? optionLabel(CAUSES, c.cause).toLowerCase() : null;
  const found = c.hazardFound === true;
  const commenceDue = due(ev, "commence_repair");
  const target = c.targetRepairStart ? formatIsoDateLong(c.targetRepairStart) : commenceDue;

  const lines: string[] = [];
  lines.push(`Dear ${p.tenantName || "Tenant"},`);
  lines.push(
    `Thank you for letting us know about damp or mould at ${fullAddress(p)}. We became aware of it on ${aware}. This letter is the written summary of our investigation, which we are required to give you under the Investigation and Commencement of Repair (Scotland) Regulations 2026.`,
  );
  lines.push("## Who carried out the investigation");
  lines.push(
    `${c.investigators || "[name of investigator / organisation]"} carried out ${method} investigation on ${inv}.${
      c.investigationMethod === "remote" && c.remoteJustification
        ? ` We investigated remotely because ${c.remoteJustification.replace(/\.$/, "")}.`
        : ""
    }`,
  );
  lines.push("## What we found");
  lines.push(c.findings?.trim() || "[Brief description of the investigation and what was found.]");
  lines.push(
    found
      ? `Our conclusion: your home is NOT currently substantially free from damp and mould.${cause ? ` The main cause appears to be ${cause}.` : ""}`
      : `Our conclusion: your home IS substantially free from damp and mould.${cause ? ` What we saw is consistent with ${cause}.` : ""}`,
  );
  lines.push("## Work carried out during the visit");
  lines.push(c.workDoneOnVisit?.trim() || "No repair work was carried out during the visit.");
  lines.push("## What happens next");
  if (found) {
    lines.push(`The following repair work is needed: ${c.workRequired?.trim() || "[describe the repair work, including how the root cause will be fixed]"}.`);
    lines.push(
      `We aim to begin this work by ${target ?? "[target date]"}.${
        commenceDue ? ` By law, repair work must begin within 5 working days of the investigation — by ${commenceDue}.` : ""
      } We will contact you to arrange a suitable time.`,
    );
  } else {
    lines.push(
      `No repair work is required under the 2026 Regulations because the investigation found your home to be substantially free from damp and mould.${
        ctx.settings.repairPolicyNote ? ` ${ctx.settings.repairPolicyNote}` : ""
      }`,
    );
  }
  lines.push("## If things change");
  lines.push(
    "If the damp or mould comes back, gets worse or appears somewhere new, please tell us straight away. We will investigate again within the same timescales.",
  );
  lines.push("## Help and advice");
  lines.push(ctx.settings.adviceSignpost?.trim() || defaultSignpost("scotland", p.sector));
  lines.push(`If you have any questions about this summary, please contact us on ${contactLine(ctx)}.`);
  return baseDoc(
    ctx,
    "Written summary of damp and mould investigation",
    lines.join("\n\n"),
    `Issued under the Investigation and Commencement of Repair (Scotland) Regulations 2026 (SSI 2026/173). Case reference ${c.reference}.`,
  );
}

function englandSummary(ctx: LetterContext, c: CaseRow, p: PropertyRow, ev: CaseEvaluation): LetterDocument {
  const aware = formatIsoDateLong(londonDateOf(c.awareAt));
  const hazard = hazardLabel(c.hazard as HazardKey).toLowerCase();
  const severity = c.foundSeverity === "emergency" ? "an emergency" : "a significant";
  const found = c.hazardFound === true;
  const safetyDue = due(ev, "safety_work");
  const stepsDue = due(ev, "supplementary_steps");
  const startBy = due(ev, "supplementary_start");
  const lines: string[] = [];
  lines.push(`Dear ${p.tenantName || "Tenant"},`);
  lines.push(`You reported ${hazard} at ${fullAddress(p)} on ${aware}.`);
  lines.push(
    "Awaab’s Law means that we must investigate and fix emergency hazards within 24 hours, investigate potential significant hazards within 10 working days and then make your home safe within 5 working days of the investigation finishing. We have investigated your issue under Awaab’s Law and are writing to explain what we found.",
  );
  lines.push("## 1. What we found");
  lines.push(
    `The ${c.investigationMethod === "remote" ? "virtual" : "in-person"} investigation ${
      found ? `did identify ${severity} hazard (${hazard})` : "did not identify a significant or emergency hazard"
    }.`,
  );
  lines.push(c.findings?.trim() || "[Further information about what was found.]");
  if (c.workDoneOnVisit?.trim()) {
    lines.push("## 2. Safety steps taken");
    lines.push(`To keep you safe we have: ${c.workDoneOnVisit.trim()}`);
  }
  if (found) {
    lines.push("## 3. Fixing the problem");
    lines.push(
      `Based on the findings, we will carry out the following safety works: ${c.workRequired?.trim() || "[insert works]"}. The target for completing the safety works is ${
        safetyDue ?? "[date]"
      }. We will contact you to arrange a suitable time.`,
    );
    if (c.supplementaryRequired !== false) {
      lines.push("## 4. Stopping the problem coming back");
      lines.push(
        `We need to do extra work to stop the problem coming back. We will take steps to begin this by ${stepsDue ?? "[date]"} and aim to start the work by ${
          startBy ?? "[date]"
        }. We will contact you to arrange a suitable time.`,
      );
    }
    lines.push("## 5. Somewhere else to stay");
    lines.push(
      `If we cannot finish the safety works on or before ${safetyDue ?? "[date]"}, we will offer you somewhere else to stay until they are completed. We will take reasonable steps to make sure this is suitable for your household’s needs.`,
    );
  } else {
    lines.push("## 3. No further action required");
    lines.push(
      `The investigation found that no further action is needed under Awaab’s Law because ${
        c.findings?.trim() ? "of the findings set out above" : "[explain why]"
      }.${ctx.settings.repairPolicyNote ? ` ${ctx.settings.repairPolicyNote}` : ""}`,
    );
  }
  lines.push("## Complaints and advice");
  lines.push(ctx.settings.adviceSignpost?.trim() || defaultSignpost("england", p.sector));
  lines.push(`If you have any questions or concerns, please contact us on ${contactLine(ctx)}.`);
  return baseDoc(
    ctx,
    "Written summary of hazard investigation",
    lines.join("\n\n"),
    `Issued under the Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025 (Awaab’s Law). Case reference ${c.reference}.`,
  );
}

// ---------------------------------------------------------------------------
// Delay notice (Scotland: Housing (Scotland) Act 2006 s14(9) / Right to Repair reg 8A(9))
// ---------------------------------------------------------------------------

const DUTY_PHRASES: Partial<Record<DutyKey, { cannot: string; will: string }>> = {
  investigate: {
    cannot: "complete the investigation of the damp or mould within 10 working days",
    will: "complete the investigation",
  },
  investigate_24h: { cannot: "complete the emergency investigation within 24 hours", will: "complete the investigation" },
  commence_repair: { cannot: "start the repair work within 5 working days of the investigation", will: "start the repair work" },
  safety_work: { cannot: "complete the work to make your home safe within the required time", will: "complete the safety work" },
  supplementary_steps: { cannot: "begin the preventative work within 5 working days", will: "begin the preventative work" },
  supplementary_start: { cannot: "start the preventative work within 12 weeks", will: "start the preventative work" },
  complete_repair: { cannot: "complete the repair work within the expected time", will: "complete the repair work" },
};

export function draftDelayNotice(
  ctx: LetterContext & { duty: DutyKey; reason: string; revisedDateIso: string; interimSteps?: string | null },
): LetterDocument {
  const { caseRow: c, property: p } = ctx;
  const phrase = DUTY_PHRASES[ctx.duty] ?? { cannot: "meet the required timescale", will: "do this" };
  const aware = formatIsoDateLong(londonDateOf(c.awareAt));
  const lines = [
    `Dear ${p.tenantName || "Tenant"},`,
    `We are writing about the damp or mould at ${fullAddress(p)}, which we became aware of on ${aware}.`,
    `We are sorry that we are unable to ${phrase.cannot}. The reason is: ${ctx.reason.replace(/\.$/, "")}. This is due to circumstances beyond our control.`,
    `We now expect to ${phrase.will} by ${formatIsoDateLong(ctx.revisedDateIso)}.`,
    "## What we are doing in the meantime",
    ctx.interimSteps?.trim()
      ? ctx.interimSteps.trim()
      : "We will take reasonable steps to reduce the effect of the damp or mould on your home until the work can be done, and we will keep the situation under review.",
    `If the damp or mould gets worse, or you have any concerns, please contact us straight away on ${contactLine(ctx)}.`,
    "## Help and advice",
    ctx.settings.adviceSignpost?.trim() || defaultSignpost(p.jurisdiction, p.sector),
  ];
  const basis =
    p.jurisdiction === "scotland"
      ? p.sector === "social"
        ? "Notice under regulation 8A(9) of the Scottish Secure Tenants (Right to Repair) Regulations 2002 (as inserted by SSI 2026/173)."
        : "Notice under section 14(9) of the Housing (Scotland) Act 2006 (as inserted by SSI 2026/173)."
      : "Record of delay and reasons (Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025).";
  return baseDoc(ctx, "Notice of delay — damp and mould", lines.join("\n\n"), `${basis} Case reference ${c.reference}.`);
}
