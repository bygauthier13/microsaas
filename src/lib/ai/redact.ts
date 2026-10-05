/**
 * Swap personal details for stable tokens before text leaves the server, and restore them in
 * the reply. Longest values are replaced first so a full address wins over its first line.
 */
export function buildRedactor(values: Array<[string | null | undefined, string]>) {
  const pairs = values
    .filter((p): p is [string, string] => typeof p[0] === "string" && p[0].trim().length >= 2)
    .map(([value, name]) => [value.trim(), `⟦${name}⟧`] as const)
    .sort((a, b) => b[0].length - a[0].length);
  return {
    redact: (s: string) => pairs.reduce((acc, [value, token]) => acc.split(value).join(token), s),
    /** Restores known tokens; any token the model invented becomes a visible [placeholder]. */
    restore: (s: string) =>
      pairs
        .reduce((acc, [value, token]) => acc.split(token).join(value), s)
        .replace(/⟦([A-Z0-9_]+)⟧/g, (_m, name: string) => `[${name.toLowerCase().replace(/_/g, " ")}]`),
  };
}
