/**
 * "Improve with AI" for tenant letters.
 *
 * - Off unless ANTHROPIC_API_KEY is set; callers fall back to the deterministic templates.
 * - Personal details (tenant name, address, landlord, investigator) are swapped for tokens
 *   before anything leaves the server and restored afterwards (UK GDPR data minimisation).
 * - Server-side refusal fallbacks are enabled (`fallbacks: "default"`), so a policy decline on
 *   the primary model is retried on Anthropic's recommended fallback model within the same call.
 * - The output is always a draft: the user reviews and edits it before anything is issued.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

export type DraftStyle = "plain" | "concise" | "formal";

export interface AiDraftInput {
  jurisdiction: "scotland" | "england";
  sector: "private" | "social";
  /** Scotland: true when NOT substantially free (repairs needed). England: hazard confirmed. */
  hazardFound: boolean | null;
  /** Labelled case facts, e.g. ["Investigation date", "6 October 2026"]. */
  facts: Array<[string, string | null | undefined]>;
  draft: string;
  style: DraftStyle;
  /** Personal values to replace with tokens before sending, e.g. ["Jane Smith", "TENANT_NAME"]. */
  redact: Array<[string | null | undefined, string]>;
}

export type AiDraftResult =
  | { ok: true; text: string; model: string; servedByFallback: boolean }
  | { ok: false; reason: "not_configured" | "refused" | "truncated" | "empty" | "error"; message: string };

export function aiConfigured(): boolean {
  return Boolean(env.anthropicApiKey);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic({ apiKey: env.anthropicApiKey, timeout: 90_000, maxRetries: 2 });
  return client;
}

const REGIME: Record<"scotland" | "england", string> = {
  scotland:
    "the Investigation and Commencement of Repair (Scotland) Regulations 2026 (in force 6 October 2026). Scottish Government guidance (para 5.5) says the written summary should cover: who carried out the investigation; how it was done and what was found, ending with an explicit conclusion on whether the home is substantially free from damp and mould; any work done during the visit; if it is not substantially free, the repair work needed and the target date to begin it (repairs must begin within 5 working days of the investigation); if no work is needed, the reasons; and signposting to independent advice",
  england:
    "the Hazards in Social Housing (Prescribed Requirements) (England) Regulations 2025 (Awaab's Law). The written summary must describe the investigation's findings, say whether a significant or emergency hazard was identified, and where one was, set out the safety works and their expected timescale, any supplementary preventative works and their timescale, and the offer of alternative accommodation if safety works can't be completed in time; where no hazard was found, explain why no further action is needed; and say how to complain or get advice",
};

const STYLE: Record<DraftStyle, string> = {
  plain: "Rewrite the draft so it is as clear as possible in plain English, keeping every piece of required content.",
  concise: "Make the draft shorter — aim for under 350 words — without dropping any required content.",
  formal:
    "Give the draft a more formal, professional tone suitable for a letter that a tribunal or ombudsman may later read, while keeping it clear for the tenant.",
};

function systemPrompt(jurisdiction: "scotland" | "england"): string {
  return [
    "You help UK letting agents and landlords write the written summary a tenant must receive after a damp and mould (or hazard) investigation.",
    `The letter is a legal record under ${REGIME[jurisdiction]}.`,
    "Tenants read it, often while worried about their health, so it should be calm, specific and free of jargon — aim for a reading age of about 12. A tribunal may read it later, so it must never overstate, soften or invent anything.",
    "",
    "How to work:",
    "- Use only facts in the case facts or the current draft. If something required is missing, keep or add a short placeholder in square brackets, such as [target date], so the sender can fill it in. Never guess dates, names, measurements, causes or promises.",
    "- Keep every date and deadline exactly as given, and keep the statutory conclusion unambiguous (for example \"your home IS substantially free from damp and mould\" or \"is NOT\").",
    "- If the findings read like rough site notes, turn them into clear full sentences without adding facts.",
    "- Tokens written like ⟦TENANT_NAME⟧ stand in for personal details. Copy them exactly where they belong.",
    "- Keep the format: paragraphs separated by a blank line, headings starting with \"## \", bullet points starting with \"- \". No other markdown.",
    "- Leave out the letterhead, date, address block, sign-off and signature; they are added automatically.",
    "",
    "Reply with the letter body only, without any preamble or commentary.",
  ].join("\n");
}

function escapeForTag(value: string): string {
  return value.replace(/</g, "‹").replace(/>/g, "›");
}

export async function improveLetterWithAi(input: AiDraftInput): Promise<AiDraftResult> {
  if (!aiConfigured()) {
    return { ok: false, reason: "not_configured", message: "AI drafting isn't switched on for this workspace." };
  }

  // Swap personal details for tokens (longest first so a full address wins over its first line).
  const pairs = input.redact
    .filter((p): p is [string, string] => typeof p[0] === "string" && p[0].trim().length >= 2)
    .map(([value, name]) => [value.trim(), `⟦${name}⟧`] as const)
    .sort((a, b) => b[0].length - a[0].length);
  const redact = (s: string) => pairs.reduce((acc, [value, token]) => acc.split(value).join(token), s);
  const restore = (s: string) => pairs.reduce((acc, [value, token]) => acc.split(token).join(value), s);

  const facts = input.facts
    .filter(([, v]) => v != null && String(v).trim() !== "")
    .map(([k, v]) => `${k}: ${redact(String(v)).trim()}`)
    .join("\n");

  const userContent = [
    `<case_facts>\n${escapeForTag(facts)}\n</case_facts>`,
    `<current_draft>\n${escapeForTag(redact(input.draft))}\n</current_draft>`,
    STYLE[input.style],
  ].join("\n\n");

  try {
    const stream = getClient().beta.messages.stream({
      model: env.anthropicModel,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive", display: "omitted" },
      output_config: { effort: "medium" },
      system: systemPrompt(input.jurisdiction),
      messages: [{ role: "user", content: userContent }],
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { ok: false, reason: "refused", message: "The AI declined to rewrite this letter. Your draft is unchanged." };
    }
    if (message.stop_reason === "max_tokens") {
      return { ok: false, reason: "truncated", message: "The AI response was cut short. Your draft is unchanged — try again." };
    }
    const text = message.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (text.length < 80) {
      return { ok: false, reason: "empty", message: "The AI returned an unusable draft. Your draft is unchanged." };
    }
    const servedByFallback = (message.usage.iterations ?? []).some((it) => it.type === "fallback_message");
    // Restore personal details; any token the model invented becomes a visible placeholder.
    const restored = restore(text).replace(/⟦([A-Z_]+)⟧/g, (_m, name: string) => `[${name.toLowerCase().replace(/_/g, " ")}]`);
    return { ok: true, text: restored, model: message.model, servedByFallback };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error("[ai] authentication failed — check ANTHROPIC_API_KEY");
      return { ok: false, reason: "error", message: "AI drafting is misconfigured (invalid API key). Your draft is unchanged." };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, reason: "error", message: "The AI service is busy. Wait a minute and try again." };
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return { ok: false, reason: "error", message: "Couldn't reach the AI service. Your draft is unchanged." };
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[ai] API error ${err.status}: ${err.message}`);
      return { ok: false, reason: "error", message: "The AI service returned an error. Your draft is unchanged." };
    }
    console.error("[ai] unexpected error", err);
    return { ok: false, reason: "error", message: "Something went wrong while drafting. Your draft is unchanged." };
  }
}
