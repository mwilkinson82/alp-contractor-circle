/**
 * Vitest suite for Division Selector and Regional Cost Factors
 * Tests the shared constants, backend integration, and data validation.
 */
import { describe, it, expect } from "vitest";
import {
  TAKEOFF_DIVISIONS,
  ALL_TAKEOFF_DIVISION_CODES,
  DIVISION_PRESETS,
  TAKEOFF_DIVISION_MAP,
} from "../shared/csiDivisions";
import {
  COST_REGION_GROUPS,
  COST_REGIONS,
  getRegionMultiplier,
  getRegion,
  applyRegionalMultiplier,
  getRegionGroupsForCurrency,
} from "../shared/costRegions";
import { CURRENCIES, getCurrency, formatCurrencyAmount } from "../shared/currencies";
import { buildScopeIntent } from "../shared/scopeIntent";
import { filterBySelectedDivisions, holdDuplicateTradePackageAssemblies } from "./takeoffPostProcess";

describe("Division Selector", () => {
  it("should have all expected CSI divisions", () => {
    expect(TAKEOFF_DIVISIONS.length).toBeGreaterThan(0);
    expect(TAKEOFF_DIVISIONS.length).toBeLessThanOrEqual(50);
  });

  it("should have valid division codes", () => {
    for (const div of TAKEOFF_DIVISIONS) {
      expect(div.code).toMatch(/^\d{2}$/);
      expect(div.name).toBeTruthy();
      expect(div.code).toMatch(/^(0[1-9]|[1-3]\d)$/); // 01-35 range
    }
  });

  it("should have all division codes in the map", () => {
    for (const div of TAKEOFF_DIVISIONS) {
      expect(TAKEOFF_DIVISION_MAP[div.code]).toBe(div.name);
    }
  });

  it("should have correct ALL_TAKEOFF_DIVISION_CODES", () => {
    const codes = ALL_TAKEOFF_DIVISION_CODES;
    expect(codes.length).toBe(TAKEOFF_DIVISIONS.length);
    expect(codes).toEqual(TAKEOFF_DIVISIONS.map((d) => d.code));
  });

  it("should have valid division presets", () => {
    for (const preset of DIVISION_PRESETS) {
      expect(preset.label).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.codes.length).toBeGreaterThan(0);

      // All codes in preset should be valid
      for (const code of preset.codes) {
        expect(ALL_TAKEOFF_DIVISION_CODES).toContain(code);
      }
    }
  });

  it("should have 'All Divisions' preset", () => {
    const allDivPreset = DIVISION_PRESETS.find((p) => p.label === "All Divisions");
    expect(allDivPreset).toBeTruthy();
    expect(allDivPreset?.codes.length).toBe(ALL_TAKEOFF_DIVISION_CODES.length);
  });

  it("should have specialty sub presets", () => {
    const concretePreset = DIVISION_PRESETS.find((p) => p.label === "Concrete Sub");
    expect(concretePreset).toBeTruthy();
    expect(concretePreset?.codes).toEqual(["03"]);

    const mepPreset = DIVISION_PRESETS.find((p) => p.label === "MEP Package");
    expect(mepPreset).toBeTruthy();
    expect(mepPreset?.codes).toContain("21");
    expect(mepPreset?.codes).toContain("22");
    expect(mepPreset?.codes).toContain("23");
    expect(mepPreset?.codes).toContain("26");
  });
});

describe("trade-package duplicate assembly safety", () => {
  it("keeps the clearest duplicate active and moves overlapping assemblies to scope review", () => {
    const intent = buildScopeIntent(
      "Commercial project. Concrete foundations, slab-on-grade, trench/pit systems, and associated drains package. Include slab-on-grade, trench pit, vapor barrier, and formwork.",
      null,
      "trade_package"
    );
    const items = [
      {
        csiDivision: "03",
        csiCode: "03 30 00",
        description: "Concrete slab-on-grade, fiber reinforced, 4\" thick",
        quantity: 14178,
        unit: "SF",
        unitCost: 689,
        extendedCost: 9_768_642,
        materialCost: 450,
        laborCost: 239,
        confidence: 100,
        notes: "Measured from A-200 slab plan.",
        sourceSheetIds: [1],
        sourceItemIds: [1],
        wasConsolidated: false,
        wasEnhanced: false,
        isGenerated: false,
        needsMeasurement: false,
      },
      {
        csiDivision: "03",
        csiCode: "03 20 00",
        description: "Reinforcing steel for slab-on-grade",
        quantity: 13600,
        unit: "LB",
        unitCost: 204,
        extendedCost: 2_774_400,
        materialCost: 122,
        laborCost: 82,
        confidence: 90,
        notes: "[Consolidated 2 items from: S-102, S-102] Original quantity seems reasonable.",
        sourceSheetIds: [1],
        sourceItemIds: [1],
        wasConsolidated: true,
        wasEnhanced: false,
        isGenerated: false,
        needsMeasurement: false,
      },
      {
        csiDivision: "03",
        csiCode: "03 20 00",
        description: "Reinforcing steel, #5 continuous bars for slab-on-grade",
        quantity: 46048,
        unit: "LB",
        unitCost: 184,
        extendedCost: 8_472_832,
        materialCost: 110,
        laborCost: 74,
        confidence: 75,
        notes: "[Enhanced] #5 rebar calculated from slab-on-grade and wall quantities.",
        sourceSheetIds: [1],
        sourceItemIds: [1],
        wasConsolidated: false,
        wasEnhanced: true,
        isGenerated: false,
        needsMeasurement: false,
      },
      {
        csiDivision: "03",
        csiCode: "03 30 00",
        description: "Concrete for correlator pit",
        quantity: 12,
        unit: "CY",
        unitCost: 18721,
        extendedCost: 224_652,
        materialCost: 16975,
        laborCost: 1746,
        confidence: 95,
        notes: "Measured from S-103 trench detail.",
        sourceSheetIds: [2],
        sourceItemIds: [2],
        wasConsolidated: false,
        wasEnhanced: false,
        isGenerated: false,
        needsMeasurement: false,
      },
    ];

    const result = holdDuplicateTradePackageAssemblies(items as any, intent);

    expect(result[0].notes).not.toContain("[Scope: review]");
    expect(result[1].notes).not.toContain("[Scope: review]");
    expect(result[2].notes).toContain("[Scope: review]");
    expect(result[2].notes).toContain("Duplicate/consolidation safety");
    expect(result[3].notes).not.toContain("[Scope: review]");
  });
});

describe("Regional Cost Factors", () => {
  it("should have cost region groups", () => {
    expect(COST_REGION_GROUPS.length).toBeGreaterThan(0);
  });

  it("should have regions in each group", () => {
    for (const group of COST_REGION_GROUPS) {
      expect(group.region).toBeTruthy();
      expect(group.metros.length).toBeGreaterThan(0);
    }
  });

  it("should have valid cost region data", () => {
    for (const region of COST_REGIONS) {
      expect(region.code).toBeTruthy();
      expect(region.name).toBeTruthy();
      expect(region.description).toBeTruthy();
      expect(region.multiplier).toBeGreaterThan(0);
      expect(region.displayMultiplier).toBeTruthy();

      // Multiplier should be reasonable (0.5x to 2.0x)
      expect(region.multiplier).toBeGreaterThanOrEqual(5000);
      expect(region.multiplier).toBeLessThanOrEqual(20000);
    }
  });

  it("should have national average at 1.00x", () => {
    const national = COST_REGIONS.find((r) => r.code === "national");
    expect(national).toBeTruthy();
    expect(national?.multiplier).toBe(10000);
    expect(national?.displayMultiplier).toBe("1.00x");
  });

  it("should have high-cost metros (NYC, SF, Boston)", () => {
    const nyc = COST_REGIONS.find((r) => r.code === "ne-nyc");
    expect(nyc).toBeTruthy();
    expect(nyc?.multiplier).toBeGreaterThan(10000); // > 1.00x

    const sf = COST_REGIONS.find((r) => r.code === "wc-sf");
    expect(sf).toBeTruthy();
    expect(sf?.multiplier).toBeGreaterThan(10000);
  });

  it("should have low-cost metros (Charleston, Albuquerque)", () => {
    const charleston = COST_REGIONS.find((r) => r.code === "se-charleston");
    expect(charleston).toBeTruthy();
    expect(charleston?.multiplier).toBeLessThan(10000); // < 1.00x

    const albuquerque = COST_REGIONS.find((r) => r.code === "sw-albuquerque");
    expect(albuquerque).toBeTruthy();
    expect(albuquerque?.multiplier).toBeLessThan(10000);
  });

  it("getRegionMultiplier should return correct values", () => {
    expect(getRegionMultiplier("national")).toBe(10000);
    expect(getRegionMultiplier("ne-nyc")).toBeGreaterThan(10000);
    expect(getRegionMultiplier("invalid-code")).toBeNull();
  });

  it("getRegion should return full region object", () => {
    const region = getRegion("national");
    expect(region).toBeTruthy();
    expect(region?.code).toBe("national");
    expect(region?.name).toBe("National Average");

    expect(getRegion("invalid-code")).toBeNull();
  });

  it("applyRegionalMultiplier should calculate correctly", () => {
    // Base cost: $100 (10000 cents)
    const baseCost = 10000;

    // National average: 1.00x → $100
    expect(applyRegionalMultiplier(baseCost, 10000)).toBe(10000);

    // 1.05x → $105
    expect(applyRegionalMultiplier(baseCost, 10500)).toBe(10500);

    // 0.95x → $95
    expect(applyRegionalMultiplier(baseCost, 9500)).toBe(9500);

    // 1.34x (NYC) → $134
    expect(applyRegionalMultiplier(baseCost, 13400)).toBe(13400);

    // 0.88x (Charleston) → $88
    expect(applyRegionalMultiplier(baseCost, 8800)).toBe(8800);
  });

  it("applyRegionalMultiplier should handle rounding correctly", () => {
    // $123.45 (12345 cents) with 1.05x multiplier
    // Expected: 12345 * 1.05 = 12962.25 → rounds to 12962
    const result = applyRegionalMultiplier(12345, 10500);
    expect(result).toBe(12962);
  });

  it("should have unique region codes", () => {
    const codes = COST_REGIONS.map((r) => r.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it("should have consistent multiplier display", () => {
    for (const region of COST_REGIONS) {
      const multiplier = region.multiplier / 10000;
      const expected = multiplier.toFixed(2) + "x";
      expect(region.displayMultiplier).toBe(expected);
    }
  });
});

describe("UK Regional Cost Factors", () => {
  it("should have UK region groups", () => {
    const ukGroups = getRegionGroupsForCurrency("GBP");
    expect(ukGroups.length).toBeGreaterThan(0);
    expect(ukGroups.every((g) => g.country === "UK")).toBe(true);
  });

  it("should have UK national average at 1.00x", () => {
    const ukNational = COST_REGIONS.find((r) => r.code === "uk-national");
    expect(ukNational).toBeTruthy();
    expect(ukNational?.multiplier).toBe(10000);
  });

  it("should have Inner London as highest UK cost", () => {
    const innerLondon = COST_REGIONS.find((r) => r.code === "uk-inner-london");
    expect(innerLondon).toBeTruthy();
    expect(innerLondon?.multiplier).toBeGreaterThan(12000);
  });

  it("should have Birmingham in West Midlands", () => {
    const westMidlands = COST_REGIONS.find((r) => r.code === "uk-west-midlands");
    expect(westMidlands).toBeTruthy();
    expect(westMidlands?.description).toContain("Birmingham");
  });

  it("should have Northern Ireland as lower cost", () => {
    const ni = COST_REGIONS.find((r) => r.code === "uk-northern-ireland");
    expect(ni).toBeTruthy();
    expect(ni?.multiplier).toBeLessThan(10000);
  });
});

describe("Australian Regional Cost Factors", () => {
  it("should have AU region groups", () => {
    const auGroups = getRegionGroupsForCurrency("AUD");
    expect(auGroups.length).toBeGreaterThan(0);
    expect(auGroups.every((g) => g.country === "AU")).toBe(true);
  });

  it("should have AU national average at 1.00x", () => {
    const auNational = COST_REGIONS.find((r) => r.code === "au-national");
    expect(auNational).toBeTruthy();
    expect(auNational?.multiplier).toBe(10000);
  });

  it("should have Sydney as highest AU cost", () => {
    const sydney = COST_REGIONS.find((r) => r.code === "au-sydney");
    expect(sydney).toBeTruthy();
    expect(sydney?.multiplier).toBeGreaterThan(12000);
  });

  it("should have Melbourne as high cost", () => {
    const melbourne = COST_REGIONS.find((r) => r.code === "au-melbourne");
    expect(melbourne).toBeTruthy();
    expect(melbourne?.multiplier).toBeGreaterThan(10000);
  });
});

describe("Currency Support", () => {
  it("should have USD, GBP, AUD currencies", () => {
    expect(CURRENCIES.length).toBe(3);
    expect(getCurrency("USD")).toBeTruthy();
    expect(getCurrency("GBP")).toBeTruthy();
    expect(getCurrency("AUD")).toBeTruthy();
  });

  it("should format USD correctly", () => {
    const formatted = formatCurrencyAmount(10000, "USD");
    expect(formatted).toContain("100");
  });

  it("should format GBP correctly", () => {
    const formatted = formatCurrencyAmount(10000, "GBP");
    expect(formatted).toContain("100");
    expect(formatted).toContain("\u00a3");
  });

  it("should format AUD correctly", () => {
    const formatted = formatCurrencyAmount(10000, "AUD");
    expect(formatted).toContain("100");
  });

  it("getRegionGroupsForCurrency should filter by country", () => {
    const usGroups = getRegionGroupsForCurrency("USD");
    expect(usGroups.every((g) => g.country === "US")).toBe(true);

    const ukGroups = getRegionGroupsForCurrency("GBP");
    expect(ukGroups.every((g) => g.country === "UK")).toBe(true);

    const auGroups = getRegionGroupsForCurrency("AUD");
    expect(auGroups.every((g) => g.country === "AU")).toBe(true);
  });
});

describe("Integration: Division + Region", () => {
  it("should support creating a project with specific divisions and region", () => {
    // Simulate project creation with Concrete Sub + NYC pricing
    const selectedDivisions = ["03"]; // Concrete only
    const costRegion = "ne-nyc";

    expect(selectedDivisions.every((c) => ALL_TAKEOFF_DIVISION_CODES.includes(c))).toBe(true);
    expect(getRegionMultiplier(costRegion)).toBeGreaterThan(0);
  });

  it("should support creating a project with all divisions and national pricing", () => {
    const selectedDivisions: string[] = []; // Empty means all
    const costRegion = "national";

    expect(getRegionMultiplier(costRegion)).toBe(10000);
  });

  it("should support MEP package with regional pricing", () => {
    const mepPreset = DIVISION_PRESETS.find((p) => p.label === "MEP Package");
    const costRegion = "mw-chicago";

    expect(mepPreset?.codes.length).toBeGreaterThan(0);
    expect(getRegionMultiplier(costRegion)).toBeGreaterThan(0);
  });
});

describe("filterBySelectedDivisions (post-extraction filter)", () => {

  // Helper to create mock items
  function mockItem(csiDivision: string, description: string, csiCode?: string) {
    return {
      id: Math.floor(Math.random() * 10000),
      projectId: 1,
      sheetId: 1,
      csiDivision,
      csiCode: csiCode || `${csiDivision} 00 00`,
      description,
      quantity: "10.00",
      unit: "SF",
      unitCost: 100,
      extendedCost: 1000,
      confidence: 85,
      notes: null,
      reviewed: false,
    };
  }

  it("should return all items when selectedDivisions is null", () => {
    const items = [mockItem("03", "Concrete slab"), mockItem("05", "Steel beam")];
    const result = filterBySelectedDivisions(items, null);
    expect(result.length).toBe(2);
  });

  it("should return all items when selectedDivisions is empty array", () => {
    const items = [mockItem("03", "Concrete slab"), mockItem("05", "Steel beam")];
    const result = filterBySelectedDivisions(items, []);
    expect(result.length).toBe(2);
  });

  it("should filter to only Division 03 when selected", () => {
    const items = [
      mockItem("03", "Concrete slab 4\""),
      mockItem("03", "Footing F1"),
      mockItem("05", "Steel beam W12x26"),
      mockItem("31", "Earthwork excavation"),
      mockItem("09", "Drywall partition"),
    ];
    const result = filterBySelectedDivisions(items, ["03"]);
    expect(result.length).toBe(2);
    expect(result.every((i: any) => i.csiDivision === "03")).toBe(true);
  });

  it("should support multiple selected divisions", () => {
    const items = [
      mockItem("03", "Concrete slab"),
      mockItem("05", "Steel beam"),
      mockItem("31", "Earthwork"),
      mockItem("09", "Drywall"),
    ];
    const result = filterBySelectedDivisions(items, ["03", "31"]);
    expect(result.length).toBe(2);
    expect(result.map((i: any) => i.csiDivision).sort()).toEqual(["03", "31"]);
  });

  it("should keep items with unknown division code (99)", () => {
    const items = [
      mockItem("03", "Concrete slab"),
      mockItem("99", "Unknown item"),
      mockItem("05", "Steel beam"),
    ];
    const result = filterBySelectedDivisions(items, ["03"]);
    expect(result.length).toBe(2);
    expect(result.map((i: any) => i.csiDivision).sort()).toEqual(["03", "99"]);
  });

  it("should keep items with empty/null division code when csiCode also empty", () => {
    const items = [
      mockItem("03", "Concrete slab"),
      { ...mockItem("", "No division assigned"), csiCode: "" },
      { ...mockItem("", "Null division"), csiDivision: null, csiCode: null },
    ];
    const result = filterBySelectedDivisions(items, ["03"]);
    // 03 kept, empty div+code kept (safety), null div+code kept (safety)
    expect(result.length).toBe(3);
  });

  it("should filter by csiCode prefix when csiDivision is empty but csiCode has a division", () => {
    const items = [
      { ...mockItem("", "Concrete item"), csiCode: "03 30 00" },
      { ...mockItem("", "Steel item"), csiCode: "05 12 00" },
    ];
    // Empty csiDivision → falls back to csiCode prefix
    // "03 30 00" → prefix "03" → matches selected → kept
    // "05 12 00" → prefix "05" → not in selected → removed
    const result = filterBySelectedDivisions(items, ["03"]);
    expect(result.length).toBe(1);
    expect(result[0].description).toBe("Concrete item");
  });



  it("should handle MEP package preset (divisions 21-26)", () => {
    const items = [
      mockItem("03", "Concrete slab"),
      mockItem("21", "Fire suppression"),
      mockItem("22", "Plumbing rough-in"),
      mockItem("23", "HVAC ductwork"),
      mockItem("26", "Electrical conduit"),
      mockItem("09", "Drywall"),
    ];
    const result = filterBySelectedDivisions(items, ["21", "22", "23", "26"]);
    expect(result.length).toBe(4);
    expect(result.every((i: any) => ["21", "22", "23", "26"].includes(i.csiDivision))).toBe(true);
  });

  it("should handle Concrete Sub preset (division 03 only)", () => {
    const items = [
      mockItem("03", "Concrete slab 4\""),
      mockItem("03", "Footing F1 - 24\"x12\""),
      mockItem("03", "Grade beam GB1"),
      mockItem("05", "Steel beam W12x26"),
      mockItem("31", "Earthwork excavation"),
      mockItem("04", "CMU wall"),
      mockItem("07", "Waterproofing"),
    ];
    const result = filterBySelectedDivisions(items, ["03"]);
    expect(result.length).toBe(3);
    expect(result.every((i: any) => i.csiDivision === "03")).toBe(true);
  });
});
