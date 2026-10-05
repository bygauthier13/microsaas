import { getAuth } from "@/lib/auth/session";
import { listCases, propertyAddress } from "@/lib/cases/service";
import { CASE_STATUS_LABELS } from "@/lib/domain";
import { formatInstant, londonDateOf } from "@/lib/rules/calendar";
import { hazardLabel, type HazardKey } from "@/lib/rules/hazards";

export const dynamic = "force-dynamic";

/** CSV cell: quoted, and neutralised against spreadsheet formula injection. */
function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  const auth = await getAuth();
  if (!auth?.org) return Response.json({ error: "Not signed in" }, { status: 401 });
  const items = await listCases(auth.org.id, { includeClosed: true });
  const header = [
    "Reference",
    "Address",
    "Tenant",
    "Landlord",
    "Issue",
    "Status",
    "Became aware",
    "Investigated",
    "Summary issued",
    "Repair started",
    "Repair completed",
    "Next deadline",
    "Next deadline due",
    "Overall",
    "Legal framework",
  ];
  const lines = items.map((i) => {
    const next = i.evaluation.nextDuty;
    return [
      i.case.reference,
      propertyAddress(i.property),
      i.property.tenantName,
      i.landlord?.name,
      hazardLabel(i.case.hazard as HazardKey),
      CASE_STATUS_LABELS[i.case.status] ?? i.case.status,
      formatInstant(i.case.awareAt),
      i.case.investigationCompletedAt ? formatInstant(i.case.investigationCompletedAt) : "",
      i.case.summaryIssuedAt ? formatInstant(i.case.summaryIssuedAt) : "",
      i.case.repairCommencedAt ? formatInstant(i.case.repairCommencedAt) : "",
      i.case.repairCompletedAt ? formatInstant(i.case.repairCompletedAt) : "",
      next?.label ?? "",
      next?.dueAt ? formatInstant(next.dueAt) : (next?.dueDate ?? ""),
      i.evaluation.overall,
      i.evaluation.regimeLabel,
    ]
      .map(cell)
      .join(",");
  });
  const csv = `﻿${header.map(cell).join(",")}\r\n${lines.join("\r\n")}\r\n`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="repairclock-cases-${londonDateOf(new Date())}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
