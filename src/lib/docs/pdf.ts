import fs from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatInstant, formatIsoDate, formatIsoDateLong } from "@/lib/rules/calendar";
import type { CaseEvaluation, DutyResult } from "@/lib/rules/engine";
import type { LetterDocument } from "./letters";

const A4: [number, number] = [595.28, 841.89];
const MARGIN_X = 56;
const MARGIN_TOP = 56;
const MARGIN_BOTTOM = 64;
const INK = rgb(0.078, 0.129, 0.239);
const MUTED = rgb(0.38, 0.36, 0.31);
const LINE = rgb(0.86, 0.84, 0.79);
const ACCENT = rgb(0.76, 0.25, 0.05);

let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;

async function fontBytes() {
  if (!fontCache) {
    const dir = path.join(process.cwd(), "assets", "fonts");
    const [regular, bold] = await Promise.all([
      fs.readFile(path.join(dir, "IBMPlexSans-400.ttf")),
      fs.readFile(path.join(dir, "IBMPlexSans-600.ttf")),
    ]);
    fontCache = { regular: new Uint8Array(regular), bold: new Uint8Array(bold) };
  }
  return fontCache;
}

interface Fonts {
  regular: PDFFont;
  bold: PDFFont;
}

async function newDoc(title: string): Promise<{ doc: PDFDocument; fonts: Fonts }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const bytes = await fontBytes();
  const [regular, bold] = await Promise.all([
    doc.embedFont(bytes.regular, { subset: true }),
    doc.embedFont(bytes.bold, { subset: true }),
  ]);
  doc.setTitle(title);
  doc.setProducer("RepairClock");
  doc.setCreator("RepairClock");
  return { doc, fonts: { regular, bold } };
}

/** Strip characters the embedded font can't encode (e.g. emoji) to avoid broken glyphs. */
function clean(text: string): string {
  return text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}️]/gu, "").replace(/\t/g, "  ");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawLine of clean(text).split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      // Break very long words (URLs, references).
      let w = word;
      while (font.widthOfTextAtSize(w, size) > maxWidth) {
        let cut = w.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(w.slice(0, cut), size) > maxWidth) cut--;
        out.push(w.slice(0, cut));
        w = w.slice(cut);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}

class Writer {
  page: PDFPage;
  y: number;
  readonly width = A4[0] - MARGIN_X * 2;
  pages: PDFPage[] = [];

  constructor(
    private doc: PDFDocument,
    public fonts: Fonts,
    private footer: string,
  ) {
    this.page = this.addPage();
    this.y = A4[1] - MARGIN_TOP;
  }

  addPage(): PDFPage {
    const p = this.doc.addPage(A4);
    this.pages.push(p);
    this.page = p;
    this.y = A4[1] - MARGIN_TOP;
    return p;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN_BOTTOM) this.addPage();
  }

  text(
    text: string,
    opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; indent?: number; lineGap?: number; x?: number; width?: number } = {},
  ) {
    const size = opts.size ?? 10.5;
    const font = opts.font ?? this.fonts.regular;
    const indent = opts.indent ?? 0;
    const x = (opts.x ?? MARGIN_X) + indent;
    const width = (opts.width ?? this.width) - indent;
    const leading = size * (opts.lineGap ?? 1.45);
    for (const line of wrap(text, font, size, width)) {
      this.ensure(leading);
      this.page.drawText(line, { x, y: this.y - size, size, font, color: opts.color ?? INK });
      this.y -= leading;
    }
  }

  space(h: number) {
    this.y -= h;
  }

  rule(color = LINE) {
    this.ensure(8);
    this.page.drawLine({
      start: { x: MARGIN_X, y: this.y },
      end: { x: A4[0] - MARGIN_X, y: this.y },
      thickness: 0.7,
      color,
    });
    this.y -= 8;
  }

  finish() {
    const total = this.pages.length;
    this.pages.forEach((p, i) => {
      const size = 7.5;
      const footerLines = wrap(this.footer, this.fonts.regular, size, this.width - 70);
      footerLines.slice(0, 2).forEach((line, li) => {
        p.drawText(line, { x: MARGIN_X, y: 38 - li * 10, size, font: this.fonts.regular, color: MUTED });
      });
      const label = `Page ${i + 1} of ${total}`;
      p.drawText(label, {
        x: A4[0] - MARGIN_X - this.fonts.regular.widthOfTextAtSize(label, size),
        y: 38,
        size,
        font: this.fonts.regular,
        color: MUTED,
      });
    });
  }
}

/** Body text format: blank-line paragraphs, "## " headings, "- " bullets. */
function writeBody(w: Writer, body: string) {
  const blocks = body.replace(/\r\n/g, "\n").split(/\n{2,}/);
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("## ")) {
      w.space(6);
      w.ensure(30);
      w.text(trimmed.slice(3), { font: w.fonts.bold, size: 11.5 });
      w.space(2);
      continue;
    }
    const lines = trimmed.split("\n");
    if (lines.every((l) => l.trim().startsWith("- "))) {
      for (const l of lines) {
        const item = l.trim().slice(2);
        const before = w.y;
        w.text(`•`, { indent: 4, width: 20 });
        w.y = before;
        w.text(item, { indent: 16 });
      }
      w.space(6);
      continue;
    }
    w.text(lines.join("\n"));
    w.space(7);
  }
}

export async function renderLetterPdf(letter: LetterDocument): Promise<Uint8Array> {
  const { doc, fonts } = await newDoc(`${letter.title} — ${letter.reference}`);
  const w = new Writer(doc, fonts, letter.footer);

  // Letterhead
  w.text(letter.fromName, { font: fonts.bold, size: 14 });
  for (const l of letter.fromLines) w.text(l, { size: 9, color: MUTED, lineGap: 1.35 });
  const meta = [`Date: ${formatIsoDateLong(letter.dateIso)}`, `Our reference: ${letter.reference}`];
  let metaY = A4[1] - MARGIN_TOP;
  for (const m of meta) {
    const width = fonts.regular.widthOfTextAtSize(m, 9);
    w.page.drawText(m, { x: A4[0] - MARGIN_X - width, y: metaY - 9, size: 9, font: fonts.regular, color: MUTED });
    metaY -= 13;
  }
  w.space(14);
  w.text(letter.recipientName, { size: 10.5 });
  for (const l of letter.recipientAddress) w.text(l, { size: 10.5, lineGap: 1.35 });
  w.space(18);
  w.text(letter.title, { font: fonts.bold, size: 15 });
  w.space(2);
  w.page.drawRectangle({ x: MARGIN_X, y: w.y, width: 36, height: 2, color: ACCENT });
  w.space(14);

  writeBody(w, letter.body);

  w.space(6);
  w.ensure(60);
  w.text("Yours sincerely,");
  w.space(16);
  w.text(letter.signoffName, { font: fonts.bold });
  if (letter.signoffRole) w.text(letter.signoffRole, { color: MUTED, size: 9.5 });
  if (letter.signoffName !== letter.fromName) w.text(`On behalf of ${letter.fromName}`, { color: MUTED, size: 9.5 });

  w.finish();
  return doc.save();
}

// ---------------------------------------------------------------------------
// Evidence pack
// ---------------------------------------------------------------------------

const STATUS_TEXT: Record<string, string> = {
  waiting: "Not yet triggered",
  not_required: "Not required",
  open: "Open",
  due_soon: "Due soon",
  due_today: "Due today",
  overdue: "OVERDUE",
  met: "Met",
  met_late: "Met late",
  extended: "Extended (notice issued)",
  extended_overdue: "Revised date passed",
};

function dueText(d: DutyResult): string {
  if (d.dueAt) return formatInstant(d.dueAt);
  if (d.dueDate) return `${formatIsoDate(d.dueDate)}${d.dueKind === "reasonable" ? " (own target)" : ""}`;
  if (d.dueKind === "reasonable") return "Reasonable time";
  return "—";
}

export interface EvidencePackInput {
  orgName: string;
  reference: string;
  generatedAt: Date;
  propertyAddress: string;
  tenantName: string | null;
  landlordName: string | null;
  evaluation: CaseEvaluation;
  details: Array<[string, string | null | undefined]>;
  delays: Array<{ duty: string; reason: string; revisedDate: string; noticeIssuedAt: Date; interimSteps: string | null }>;
  approvals: Array<{ description: string; amount: string | null; status: string; createdAt: Date; respondedAt: Date | null; note: string | null; landlord: string | null }>;
  events: Array<{ occurredAt: Date; recordedAt: Date; summary: string; actor: string }>;
  documents: Array<{ filename: string; kind: string; size: number; createdAt: Date; sha256: string }>;
  photos: Array<{ filename: string; mime: string; bytes: Uint8Array; createdAt: Date }>;
  appendixPdfs: Array<{ title: string; bytes: Uint8Array }>;
}

export async function renderEvidencePack(input: EvidencePackInput): Promise<Uint8Array> {
  const { doc, fonts } = await newDoc(`Evidence pack — ${input.reference}`);
  const footer = `Evidence pack ${input.reference} · generated ${formatInstant(input.generatedAt)} (UK time) from RepairClock's append-only case log.`;
  const w = new Writer(doc, fonts, footer);
  const ev = input.evaluation;

  w.text("EVIDENCE PACK", { font: fonts.bold, size: 9, color: ACCENT });
  w.space(4);
  w.text(`Damp, mould & hazard case ${input.reference}`, { font: fonts.bold, size: 20 });
  w.space(4);
  w.text(input.propertyAddress, { size: 12 });
  w.space(10);
  const head: Array<[string, string | null]> = [
    ["Prepared by", input.orgName],
    ["Tenant", input.tenantName],
    ["Landlord", input.landlordName],
    ["Legal framework", ev.regimeLabel],
    ["Statutory timescales", ev.inForce ? "Apply to this report" : "Not statutory for this report (tracked as good practice)"],
  ];
  for (const [k, v] of head) {
    if (!v) continue;
    const before = w.y;
    w.text(k, { size: 9.5, color: MUTED, width: 130 });
    w.y = before;
    w.text(v, { size: 9.5, x: MARGIN_X + 130, width: w.width - 130 });
  }
  if (ev.scopeNote) {
    w.space(4);
    w.text(ev.scopeNote, { size: 9, color: MUTED });
  }

  // Duties table
  w.space(14);
  w.text("Statutory timescales", { font: fonts.bold, size: 13 });
  w.space(4);
  w.rule();
  const cols = [0, 190, 270, 380];
  const headers = ["Duty", "Window", "Deadline", "Completed / status"];
  headers.forEach((h, i) =>
    w.page.drawText(h, { x: MARGIN_X + cols[i], y: w.y - 9, size: 8.5, font: fonts.bold, color: MUTED }),
  );
  w.space(16);
  for (const d of ev.duties) {
    w.ensure(28);
    const y0 = w.y;
    const row = [
      d.label,
      d.window,
      dueText(d),
      `${d.completedAt ? formatInstant(d.completedAt) : "—"} · ${STATUS_TEXT[d.status] ?? d.status}${
        d.workingDaysLate ? ` (${d.workingDaysLate} working day${d.workingDaysLate === 1 ? "" : "s"} late)` : ""
      }`,
    ];
    let minY = y0;
    row.forEach((cell, i) => {
      w.y = y0;
      const width = (i < 3 ? cols[i + 1] : w.width) - cols[i] - 8;
      w.text(cell, { size: 8.5, x: MARGIN_X + cols[i], width, lineGap: 1.35, font: i === 0 ? fonts.bold : fonts.regular, color: d.status === "overdue" && i === 3 ? ACCENT : INK });
      minY = Math.min(minY, w.y);
    });
    w.y = minY - 4;
    if (d.delay) {
      w.text(
        `Delay notice ${formatInstant(d.delay.noticeIssuedAt)} — ${d.delay.reason}; revised date ${formatIsoDate(d.delay.revisedDate)}${
          d.delay.legallyExtends ? " (period extended under the Regulations)" : ""
        }`,
        { size: 8, color: MUTED, indent: 10 },
      );
    }
    if (d.holidaysInWindow?.length) {
      w.text(`Bank holidays excluded: ${d.holidaysInWindow.map((h) => `${h.name} (${formatIsoDate(h.date)})`).join(", ")}`, {
        size: 8,
        color: MUTED,
        indent: 10,
      });
    }
    w.space(2);
    w.rule();
  }
  if (ev.compensation && ev.compensation.total > 0) {
    w.text(`Right to Repair compensation payable to the tenant: £${ev.compensation.total} (investigation £${ev.compensation.investigation}, commencement £${ev.compensation.commencement}).`, {
      size: 9,
      color: ACCENT,
    });
  }
  for (const warning of ev.warnings) w.text(`Note: ${warning}`, { size: 9, color: ACCENT });

  // Details
  w.space(12);
  w.text("Case details", { font: fonts.bold, size: 13 });
  w.space(4);
  for (const [k, v] of input.details) {
    if (!v) continue;
    w.ensure(30);
    w.text(k, { size: 8.5, color: MUTED, font: fonts.bold });
    w.text(v, { size: 9.5 });
    w.space(4);
  }

  if (input.delays.length) {
    w.space(8);
    w.text("Delay notices (circumstances beyond the landlord’s control)", { font: fonts.bold, size: 12 });
    for (const d of input.delays) {
      w.text(`${formatInstant(d.noticeIssuedAt)} — ${d.duty}: ${d.reason}. Revised date ${formatIsoDate(d.revisedDate)}.${d.interimSteps ? ` Interim steps: ${d.interimSteps}` : ""}`, { size: 9.5 });
      w.space(3);
    }
  }

  if (input.approvals.length) {
    w.space(8);
    w.text("Landlord approvals", { font: fonts.bold, size: 12 });
    for (const a of input.approvals) {
      w.text(
        `Requested ${formatInstant(a.createdAt)}${a.landlord ? ` from ${a.landlord}` : ""}: ${a.description}${a.amount ? ` (${a.amount})` : ""} — ${a.status.toUpperCase()}${
          a.respondedAt ? ` on ${formatInstant(a.respondedAt)}` : ""
        }${a.note ? `. Note: “${a.note}”` : ""}`,
        { size: 9.5 },
      );
      w.space(3);
    }
  }

  // Timeline
  w.addPage();
  w.text("Timeline", { font: fonts.bold, size: 13 });
  w.text("Every action as recorded. ‘Recorded’ is the server time the entry was made and cannot be edited.", { size: 8.5, color: MUTED });
  w.space(6);
  for (const e of input.events) {
    w.ensure(34);
    const y0 = w.y;
    w.text(formatInstant(e.occurredAt), { size: 8.5, font: fonts.bold, width: 120 });
    const y1 = w.y;
    w.y = y0;
    w.text(e.summary, { size: 9.5, x: MARGIN_X + 125, width: w.width - 125 });
    w.text(`Recorded ${formatInstant(e.recordedAt)} · ${e.actor}`, { size: 7.5, color: MUTED, x: MARGIN_X + 125, width: w.width - 125 });
    w.y = Math.min(w.y, y1) - 4;
  }

  if (input.documents.length) {
    w.space(10);
    w.text("Documents on file", { font: fonts.bold, size: 12 });
    for (const d of input.documents) {
      w.text(`${d.filename} — ${d.kind.replace(/_/g, " ")}, ${(d.size / 1024).toFixed(0)} KB, added ${formatInstant(d.createdAt)}. SHA-256 ${d.sha256.slice(0, 16)}…`, { size: 8.5 });
    }
  }

  // Photos
  for (const photo of input.photos) {
    try {
      const img = photo.mime === "image/png" ? await doc.embedPng(photo.bytes) : await doc.embedJpg(photo.bytes);
      w.addPage();
      w.text(`Photo: ${photo.filename}`, { font: fonts.bold, size: 11 });
      w.text(`Uploaded ${formatInstant(photo.createdAt)}`, { size: 8.5, color: MUTED });
      const maxW = w.width;
      const maxH = w.y - MARGIN_BOTTOM - 10;
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const dw = img.width * scale;
      const dh = img.height * scale;
      w.page.drawImage(img, { x: MARGIN_X, y: w.y - dh - 6, width: dw, height: dh });
    } catch {
      // Unsupported image encoding — listed under documents instead.
    }
  }

  w.finish();

  // Appendix: issued letters, copied page-for-page.
  for (const appendix of input.appendixPdfs) {
    try {
      const src = await PDFDocument.load(appendix.bytes);
      const copied = await doc.copyPages(src, src.getPageIndices());
      copied.forEach((p) => doc.addPage(p));
    } catch {
      // Skip unreadable attachments rather than failing the whole pack.
    }
  }
  return doc.save();
}
