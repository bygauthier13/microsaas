/**
 * Live completeness check for a written summary draft (pure — runs in the browser as the user
 * edits). Heuristic by design: it catches the omissions that make a summary non-compliant
 * (no investigator named, no conclusion, no repair start date, unresolved placeholders),
 * it does not judge the quality of the investigation itself.
 */

export interface ChecklistItem {
  label: string;
  ok: boolean;
  hint?: string;
}

export function checkWrittenSummary(
  body: string,
  opts: { jurisdiction: "scotland" | "england"; hazardFound: boolean | null },
): ChecklistItem[] {
  const text = body.replace(/\s+/g, " ");
  const lower = text.toLowerCase();
  const placeholders = body.match(/\[[^\]\n]{2,80}\]|⟦[A-Z_]+⟧/g) ?? [];
  const hasDate = /\b\d{1,2}(st|nd|rd|th)? (january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b/i.test(text);
  const signposted = /shelter|citizens advice|ombudsman|tribunal|advice/i.test(text);
  const items: ChecklistItem[] = [];

  if (opts.jurisdiction === "scotland") {
    items.push({
      label: "Names who carried out the investigation",
      ok: /carried out|investigated by|investigation was (carried|completed)|visited/i.test(text) && !/\[name of investigator/i.test(body),
    });
    items.push({ label: "Gives the date of the investigation", ok: hasDate });
    items.push({
      label: "States whether the home is substantially free from damp and mould",
      ok: /substantially free from damp and mould/i.test(text),
      hint: "Guidance para 5.5 expects an explicit conclusion.",
    });
    items.push({
      label: "Says what work was done during the visit (or that none was)",
      ok: /during the visit|on the visit|at the visit|no repair work was carried out/i.test(text),
    });
    if (opts.hazardFound) {
      items.push({
        label: "Describes the repair work required",
        ok: /repair|work is needed|work required|following work/i.test(lower) && !/\[describe the repair work/i.test(body),
      });
      items.push({
        label: "Gives a target date to begin repairs",
        ok: /(begin|start|commence)[^.]{0,80}\b\d{1,2}(st|nd|rd|th)? [a-z]+ \d{4}/i.test(text) && !/\[target date\]/i.test(body),
        hint: "Repairs must begin within 5 working days of the investigation.",
      });
    } else if (opts.hazardFound === false) {
      items.push({
        label: "Explains why no repair work is required",
        ok: /no repair work is required|no further (action|work)|not required/i.test(text),
      });
    }
  } else {
    items.push({ label: "Describes what the investigation found", ok: /found|identif/i.test(text) });
    items.push({
      label: "Says whether a significant or emergency hazard was identified",
      ok: /(significant|emergency) hazard/i.test(text),
    });
    if (opts.hazardFound) {
      items.push({
        label: "Sets out the safety works and when they'll be done",
        ok: /safety works?/i.test(text) && hasDate && !/\[insert works\]/i.test(body),
      });
      items.push({
        label: "Covers preventative (supplementary) work, if needed",
        ok: /stop the problem coming back|preventative|supplementary/i.test(text),
      });
    } else if (opts.hazardFound === false) {
      items.push({ label: "Explains why no further action is needed", ok: /no further action|not (needed|required)/i.test(text) });
    }
  }

  items.push({ label: "Signposts independent advice or complaints routes", ok: signposted });
  items.push({ label: "Tells the tenant how to contact you", ok: /contact us|call us|email us|get in touch/i.test(text) });
  items.push({
    label: placeholders.length ? `Fill in ${placeholders.length} placeholder${placeholders.length === 1 ? "" : "s"}: ${placeholders.slice(0, 3).join(", ")}${placeholders.length > 3 ? "…" : ""}` : "No unfilled placeholders",
    ok: placeholders.length === 0,
  });
  return items;
}
