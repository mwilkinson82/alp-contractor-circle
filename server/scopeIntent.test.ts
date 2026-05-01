import { describe, expect, it } from "vitest";
import { buildScopeIntent, classifyScopeMatch } from "../shared/scopeIntent";

describe("scope intent", () => {
  it("recognizes below-grade waterproofing as a narrow scope", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only - include membrane and protection board. Exclude roofing.");

    expect(intent.hasScope).toBe(true);
    expect(intent.summary).toContain("Below-grade waterproofing");
    expect(intent.focusDivisions).toContain("07");
    expect(intent.excludedDivisions).toContain("09");
  });

  it("keeps waterproofing items but excludes unrelated division work", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only");

    expect(classifyScopeMatch({
      csiDivision: "07",
      csiCode: "07 13 00",
      description: "Self-adhered waterproofing membrane at foundation wall",
    }, intent)).toBe("included");

    expect(classifyScopeMatch({
      csiDivision: "09",
      csiCode: "09 29 00",
      description: "Gypsum board partitions",
    }, intent)).toBe("excluded");
  });

  it("flags foundation-adjacent items for review when they may cross trade boundaries", () => {
    const intent = buildScopeIntent("Foundations only - spread footings and slab-on-grade");

    expect(classifyScopeMatch({
      csiDivision: "33",
      csiCode: "33 40 00",
      description: "Underslab drainage connection",
    }, intent)).toBe("review");
  });
});
