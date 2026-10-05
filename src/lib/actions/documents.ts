"use server";

import { revalidatePath } from "next/cache";
import { track } from "@/lib/analytics";
import { improveLetterWithAi, type DraftStyle } from "@/lib/ai/draft";
import { requireOrg } from "@/lib/auth/session";
import { addEvent, propertyAddress } from "@/lib/cases/service";
import { loadCase, storeDocument } from "@/lib/cases/workflow";
import { getDb } from "@/lib/db";
import type { DocumentKind } from "@/lib/db/schema";
import { CAUSES, optionLabel } from "@/lib/domain";
import { formatInstant } from "@/lib/rules/calendar";
import { hazardLabel, type HazardKey } from "@/lib/rules/hazards";
import { rateLimit } from "@/lib/security/rate-limit";
import { ActionError, oneOf, str, toState, type ActionState } from "./helpers";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 8;

/** Identify the file from its first bytes — never trust the browser-supplied type. */
function sniff(bytes: Uint8Array): { mime: string; ext: string } | null {
  const b = bytes;
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: "image/png", ext: "png" };
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return { mime: "image/webp", ext: "webp" };
  if (ascii(0, 5) === "%PDF-") return { mime: "application/pdf", ext: "pdf" };
  if (ascii(4, 8) === "ftyp" && /heic|heix|mif1|msf1|hevc/.test(ascii(8, 12))) return { mime: "image/heic", ext: "heic" };
  return null;
}

function safeFilename(name: string, ext: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[^A-Za-z0-9 _.-]+/g, "")
    .trim()
    .slice(0, 80);
  return `${base || "upload"}.${ext}`;
}

export async function uploadDocumentsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  try {
    const { user, org } = await requireOrg();
    const db = await getDb();
    const caseId = str(fd, "caseId", 64);
    const loaded = await loadCase(db, org.id, caseId);
    if (!loaded) throw new ActionError("That case could not be found.");
    const kind = oneOf(fd, "kind", ["photo", "report", "quote", "other"] as const, "photo") as DocumentKind;
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new ActionError("Choose at least one file.");
    if (files.length > MAX_FILES) throw new ActionError(`Upload up to ${MAX_FILES} files at a time.`);
    const limit = await rateLimit(`upload:${org.id}`, org.isDemo ? 30 : 300, 3600);
    if (!limit.ok) throw new ActionError("Too many uploads in the last hour. Please try again later.");

    const stored: string[] = [];
    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) throw new ActionError(`“${file.name}” is larger than 8 MB.`);
      const bytes = new Uint8Array(await file.arrayBuffer());
      const type = sniff(bytes);
      if (!type) throw new ActionError(`“${file.name}” isn't a supported file. Use JPG, PNG, WebP, HEIC or PDF.`);
      const effectiveKind: DocumentKind = kind === "photo" && type.mime === "application/pdf" ? "report" : kind;
      const name = safeFilename(file.name, type.ext);
      await storeDocument(db, {
        orgId: org.id,
        caseId,
        kind: effectiveKind,
        filename: name,
        mime: type.mime,
        bytes,
        uploadedBy: user.id,
      });
      stored.push(name);
    }
    const label = kind === "photo" ? "photo" : kind === "quote" ? "quote" : kind === "report" ? "report" : "file";
    await addEvent(db, {
      orgId: org.id,
      caseId,
      type: "documents_uploaded",
      summary: `Uploaded ${stored.length} ${label}${stored.length === 1 ? "" : "s"}: ${stored.join(", ")}`,
      actorId: user.id,
      actorLabel: user.name || user.email,
    });
    revalidatePath(`/app/cases/${caseId}`);
    return { ok: true, message: `Uploaded ${stored.length} file${stored.length === 1 ? "" : "s"}.` };
  } catch (err) {
    return toState(err);
  }
}

/**
 * Called directly from the summary editor (not a form post). Returns the improved draft in
 * `draft`, or an error — the editor keeps the user's text untouched on any failure.
 */
export async function improveSummaryAction(caseId: string, draft: string, style: DraftStyle): Promise<ActionState> {
  try {
    const { user, org } = await requireOrg();
    if (typeof caseId !== "string" || typeof draft !== "string") throw new ActionError("Invalid request.");
    const text = draft.trim().slice(0, 20000);
    if (text.length < 40) throw new ActionError("Write or generate a draft first.");
    const chosen: DraftStyle = style === "concise" || style === "formal" ? style : "plain";
    const db = await getDb();
    const loaded = await loadCase(db, org.id, caseId);
    if (!loaded) throw new ActionError("That case could not be found.");
    const limit = await rateLimit(`ai:${org.id}`, org.isDemo ? 8 : 40, 3600);
    if (!limit.ok) throw new ActionError("You've used AI drafting a lot in the last hour. Please try again later.");

    const c = loaded.case;
    const p = loaded.property;
    const result = await improveLetterWithAi({
      jurisdiction: p.jurisdiction,
      sector: p.sector,
      hazardFound: c.hazardFound,
      draft: text,
      style: chosen,
      facts: [
        ["Issue reported", hazardLabel(c.hazard as HazardKey)],
        ["Date landlord became aware", formatInstant(c.awareAt)],
        ["What the tenant reported", c.description],
        ["Rooms", c.rooms],
        ["Investigation completed", c.investigationCompletedAt ? formatInstant(c.investigationCompletedAt) : null],
        ["Investigation method", c.investigationMethod === "remote" ? "Remote" : c.investigationMethod ? "In person" : null],
        ["Investigated by", c.investigators],
        ["Findings (may be rough notes)", c.findings],
        ["Likely cause", c.cause ? optionLabel(CAUSES, c.cause) : null],
        ["Work done on the visit", c.workDoneOnVisit],
        ["Work required", c.workRequired],
        [
          "Outcome",
          c.hazardFound == null
            ? null
            : p.jurisdiction === "scotland"
              ? c.hazardFound
                ? "Home is NOT substantially free from damp and mould"
                : "Home IS substantially free from damp and mould"
              : c.hazardFound
                ? `${c.foundSeverity ?? "significant"} hazard confirmed`
                : "No significant or emergency hazard",
        ],
        ["Legal framework", loaded.evaluation.regimeLabel],
      ],
      redact: [
        [p.tenantName, "TENANT_NAME"],
        [propertyAddress(p), "PROPERTY_ADDRESS"],
        [p.addressLine1, "ADDRESS_LINE_1"],
        [p.addressLine2, "ADDRESS_LINE_2"],
        [p.postcode, "POSTCODE"],
        [p.tenantEmail, "TENANT_EMAIL"],
        [p.tenantPhone, "TENANT_PHONE"],
        [loaded.landlord?.name, "LANDLORD_NAME"],
        [c.investigators, "INVESTIGATOR"],
        [c.reportedBy, "REPORTED_BY"],
      ],
    });
    if (!result.ok) {
      return { error: result.message };
    }
    await track("summary_drafted", {
      orgId: org.id,
      userId: user.id,
      isDemo: org.isDemo,
      props: { style: chosen, fallback: result.servedByFallback },
    });
    return {
      ok: true,
      draft: result.text,
      message: "AI suggestion ready — read it carefully and check every fact before issuing.",
    };
  } catch (err) {
    return toState(err);
  }
}
