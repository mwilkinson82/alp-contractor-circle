import { describe, expect, it } from "vitest";
import { sumScopeIncludedExtendedCost } from "../shared/scopeCost";

describe("scope cost totals", () => {
  it("does not count likely excluded items in totals", () => {
    expect(sumScopeIncludedExtendedCost([
      { extendedCost: 10000, notes: "[Scope: included] Waterproofing membrane" },
      { extendedCost: 25000, notes: "[Scope: review] Verify drainage interface" },
      { extendedCost: 900000, notes: "[Scope: excluded] General concrete slab-on-grade" },
    ])).toBe(35000);
  });
});
