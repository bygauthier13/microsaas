import { describe, expect, it } from "vitest";
import { buildRedactor } from "@/lib/ai/redact";

describe("AI redaction", () => {
  const { redact, restore } = buildRedactor([
    ["Jamie Reid", "TENANT_NAME"],
    ["Flat 2/1, 14 Dalmeny Street, Edinburgh, EH6 8PG", "PROPERTY_ADDRESS"],
    ["Flat 2/1, 14 Dalmeny Street", "ADDRESS_LINE_1"],
    ["EH6 8PG", "POSTCODE"],
    [null, "TENANT_EMAIL"],
    ["x", "TOO_SHORT"],
  ]);

  it("removes every personal value before sending", () => {
    const out = redact("Dear Jamie Reid, about Flat 2/1, 14 Dalmeny Street, Edinburgh, EH6 8PG and Flat 2/1, 14 Dalmeny Street (EH6 8PG).");
    expect(out).not.toMatch(/Jamie|Dalmeny|EH6/);
    expect(out).toContain("⟦TENANT_NAME⟧");
    expect(out).toContain("⟦PROPERTY_ADDRESS⟧");
    expect(out).toContain("⟦ADDRESS_LINE_1⟧");
  });

  it("restores values and turns invented tokens into visible placeholders", () => {
    expect(restore("Dear ⟦TENANT_NAME⟧, ⟦LANDLORD_PHONE⟧")).toBe("Dear Jamie Reid, [landlord phone]");
    expect(restore(redact("Jamie Reid at EH6 8PG"))).toBe("Jamie Reid at EH6 8PG");
  });
});
