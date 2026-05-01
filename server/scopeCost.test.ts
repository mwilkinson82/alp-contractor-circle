import { describe, expect, it } from "vitest";
import {
  sumScopeIncludedExtendedCost,
  sumScopeIncludedLaborCost,
  sumScopeIncludedMaterialCost,
} from "../shared/scopeCost";

describe("scope cost totals", () => {
  it("does not count likely excluded items in totals", () => {
    expect(sumScopeIncludedExtendedCost([
      { extendedCost: 10000, notes: "[Scope: included] Waterproofing membrane" },
      { extendedCost: 25000, notes: "[Scope: review] Verify drainage interface" },
      { extendedCost: 900000, notes: "[Scope: excluded] General concrete slab-on-grade" },
    ])).toBe(35000);
  });

  it("does not count likely excluded material or default labor in summary totals", () => {
    const items = [
      { quantity: 10, materialCost: 100, laborCost: 50, notes: "[Scope: included] Waterproofing membrane" },
      { quantity: 5, unitCost: 300, laborCost: 100, notes: "[Scope: review] Drainage interface" },
      { quantity: 1000, materialCost: 200, laborCost: 175, notes: "[Scope: excluded] General concrete slab-on-grade" },
    ];

    expect(sumScopeIncludedMaterialCost(items)).toBe(2000);
    expect(sumScopeIncludedLaborCost(items)).toBe(1000);
  });
});
