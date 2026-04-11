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
} from "../shared/costRegions";

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
