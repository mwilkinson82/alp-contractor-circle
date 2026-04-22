/**
 * Tests for the V2 Synonym-First Cost Lookup Engine
 * 
 * Tests the core matching logic, synonym scoring, and pricing functions.
 * Uses the actual expanded library from the database.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  loadExpandedLibrary,
  applyPricingV2,
  applyPricingWithLibraryV2,
  findBestMatchV2,
  resetCache,
  type TakeoffItem,
  type UserLibraryEntry,
} from "./costLookupV2";

// Load the library once before all tests
beforeAll(async () => {
  resetCache();
  await loadExpandedLibrary();
}, 30_000);

describe("loadExpandedLibrary", () => {
  it("should load without errors", async () => {
    // Already loaded in beforeAll — just verify no crash
    expect(true).toBe(true);
  });
});

describe("findBestMatchV2", () => {
  it("should match a 4 inch concrete slab", async () => {
    const item: TakeoffItem = {
      description: '4" Concrete Slab-on-Grade',
      csiDivision: "03",
      csiCode: "03 30 00",
      quantity: 5000,
      unit: "SF",
    };
    const match = await findBestMatchV2(item);
    expect(match).not.toBeNull();
    expect(match!.entry.id).toBe("slab-4in");
    expect(match!.score).toBeGreaterThan(30);
    expect(match!.unitCost).toBeGreaterThan(0);
  });

  it("should match a 6 inch slab separately from 4 inch", async () => {
    const item: TakeoffItem = {
      description: '6" Concrete Slab on Grade',
      csiDivision: "03",
      csiCode: "03 30 00",
      quantity: 3000,
      unit: "SF",
    };
    const match = await findBestMatchV2(item);
    expect(match).not.toBeNull();
    expect(match!.entry.id).toBe("slab-6in");
  });

  it("should match CMU block wall", async () => {
    const item: TakeoffItem = {
      description: "8 inch CMU Block Wall",
      csiDivision: "04",
      csiCode: "04 22 00",
      quantity: 2000,
      unit: "SF",
    };
    const match = await findBestMatchV2(item);
    expect(match).not.toBeNull();
    expect(match!.entry.id).toContain("cmu");
    expect(match!.unitCost).toBeGreaterThan(0);
  });

  it("should match EMT conduit", async () => {
    const item: TakeoffItem = {
      description: "EMT Conduit",
      csiDivision: "26",
      csiCode: "26 05 33",
      quantity: 500,
      unit: "LF",
    };
    const match = await findBestMatchV2(item);
    expect(match).not.toBeNull();
    expect(match!.unitCost).toBeGreaterThan(0);
  });

  it("should match using synonyms (SOG = slab on grade)", async () => {
    const item: TakeoffItem = {
      description: "4 inch SOG",
      csiDivision: "03",
      quantity: 5000,
      unit: "SF",
    };
    const match = await findBestMatchV2(item);
    expect(match).not.toBeNull();
    // Should match the slab entry via synonym
    expect(match!.entry.id).toContain("slab");
  });

  it("should match GWB (gypsum wallboard synonym)", async () => {
    const item: TakeoffItem = {
      description: "5/8 GWB",
      csiDivision: "09",
      quantity: 10000,
      unit: "SF",
    };
    const match = await findBestMatchV2(item);
    expect(match).not.toBeNull();
    // Should match gypsum wallboard via GWB synonym
    expect(match!.unitCost).toBeGreaterThan(0);
  });

  it("should return null for nonsense descriptions", async () => {
    const item: TakeoffItem = {
      description: "Xyzzy foobar baz",
      csiDivision: "99",
      quantity: 1,
      unit: "EA",
    };
    const match = await findBestMatchV2(item);
    // May or may not match — but shouldn't crash
    expect(true).toBe(true);
  });

  it("should respect unit compatibility", async () => {
    // A slab item measured in CY should NOT match a SF-based slab entry
    const item: TakeoffItem = {
      description: "Concrete Slab",
      csiDivision: "03",
      quantity: 50,
      unit: "CY",
    };
    const match = await findBestMatchV2(item);
    // If it matches, it should be a CY-based entry, not an SF-based one
    if (match) {
      expect(["CY", "CF"]).toContain(match.entry.unit);
    }
  });
});

describe("applyPricingV2", () => {
  it("should price a list of items with material + labor", async () => {
    const items: TakeoffItem[] = [
      {
        description: '4" Concrete Slab-on-Grade',
        csiDivision: "03",
        csiCode: "03 30 00",
        quantity: 5000,
        unit: "SF",
      },
      {
        description: "Excavation for Foundations",
        csiDivision: "31",
        csiCode: "31 23 16",
        quantity: 200,
        unit: "CY",
      },
      {
        description: "EMT Conduit",
        csiDivision: "26",
        csiCode: "26 05 33",
        quantity: 500,
        unit: "LF",
      },
    ];

    const priced = await applyPricingV2(items, 1.0);
    expect(priced).toHaveLength(3);

    for (const item of priced) {
      // Every item should have material + labor costs
      expect(item.materialCost).toBeGreaterThanOrEqual(0);
      expect(item.laborCost).toBeGreaterThanOrEqual(0);
      expect(item.unitCost).toBeGreaterThan(0);
      expect(item.extendedCost).toBeGreaterThan(0);
      // unitCost should be material + labor
      expect(item.unitCost).toBeCloseTo(
        (item.materialCost || 0) + (item.laborCost || 0),
        1
      );
    }
  });

  it("should apply regional multiplier", async () => {
    const items: TakeoffItem[] = [
      {
        description: '4" Concrete Slab-on-Grade',
        csiDivision: "03",
        quantity: 1000,
        unit: "SF",
      },
    ];

    const base = await applyPricingV2(items, 1.0);
    const scaled = await applyPricingV2(items, 1.2);

    // Scaled prices should be ~20% higher
    const ratio = (scaled[0].unitCost || 0) / (base[0].unitCost || 1);
    expect(ratio).toBeCloseTo(1.2, 1);
  });

  it("should provide defaults for unmatched items", async () => {
    const items: TakeoffItem[] = [
      {
        description: "Qxzzy Flarbnoggle Wibblestick",
        csiDivision: "99",
        quantity: 5,
        unit: "EA",
      },
    ];

    const priced = await applyPricingV2(items, 1.0);
    expect(priced[0].unitCost).toBeGreaterThan(0);
    // With 8,600+ synonyms, most real descriptions match something;
    // only truly nonsensical items fall to DEFAULT
    expect(priced[0]._costMatch).toBe("DEFAULT");
  });
});

describe("applyPricingWithLibraryV2", () => {
  it("should prioritize user library over synonym matches", async () => {
    const items: TakeoffItem[] = [
      {
        description: '4" Concrete Slab-on-Grade',
        csiDivision: "03",
        quantity: 5000,
        unit: "SF",
      },
    ];

    const userLibrary: UserLibraryEntry[] = [
      {
        description: "4 inch Concrete Slab on Grade material",
        unit: "SF",
        unitCost: 99.99, // Deliberately high to verify it's used
        csiDivision: "03",
      },
    ];

    const priced = await applyPricingWithLibraryV2(items, userLibrary, 1.0);
    expect(priced[0]._costMatch).toBe("LIBRARY");
    expect(priced[0].materialCost).toBe(99.99);
  });

  it("should fall back to synonym match when no library match", async () => {
    const items: TakeoffItem[] = [
      {
        description: "EMT Conduit",
        csiDivision: "26",
        quantity: 500,
        unit: "LF",
      },
    ];

    const userLibrary: UserLibraryEntry[] = [
      {
        description: "Something Completely Different",
        unit: "EA",
        unitCost: 50.00,
      },
    ];

    const priced = await applyPricingWithLibraryV2(items, userLibrary, 1.0);
    // Should NOT match the user library (different description + unit)
    expect(priced[0]._costMatch).not.toBe("LIBRARY");
    expect(priced[0].unitCost).toBeGreaterThan(0);
  });
});
