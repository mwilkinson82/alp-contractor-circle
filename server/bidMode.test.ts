import { describe, expect, it } from "vitest";
import {
  DEFAULT_NEW_TAKEOFF_BID_MODE,
  LEGACY_TAKEOFF_BID_MODE_FALLBACK,
  normalizeTakeoffBidMode,
} from "../shared/bidMode";
import {
  scoreSheetForBidMode,
  shouldVerifyExtractionForBidMode,
} from "./takeoffAI";
import type { SheetIndexEntry } from "./takeoffSheetIndex";

function sheet(overrides: Partial<SheetIndexEntry>): SheetIndexEntry {
  return {
    sheetId: 1,
    pageNumber: 1,
    sheetName: "A1.1 Floor Plan",
    sheetType: "floor_plan",
    discipline: "architectural",
    dimensions: [],
    elements: [],
    summary: "Floor plan with partitions and doors",
    ...overrides,
  };
}

describe("bid mode behavior", () => {
  it("keeps legacy fallback stable while allowing new takeoffs to default broad", () => {
    expect(normalizeTakeoffBidMode(undefined)).toBe(
      LEGACY_TAKEOFF_BID_MODE_FALLBACK
    );
    expect(
      normalizeTakeoffBidMode(undefined, DEFAULT_NEW_TAKEOFF_BID_MODE)
    ).toBe("full_gc");
  });

  it("scores every buildable sheet for Full GC Takeoff", () => {
    expect(
      scoreSheetForBidMode(
        sheet({ sheetType: "mep_plan", discipline: "mechanical" }),
        "full_gc"
      )
    ).toBe(100);
  });

  it("prioritizes scope-relevant sheets for Trade Package Takeoff", () => {
    const foundationSheet = sheet({
      sheetName: "S2.1 Foundation Plan",
      sheetType: "foundation_plan",
      discipline: "structural",
      summary:
        "Foundation plan with below-grade waterproofing membrane and drainage board at foundation walls",
      elements: [
        {
          type: "foundation_wall",
          description: "Below-grade waterproofing at foundation wall",
          count: null,
          dimensionRefs: [],
          rebarCallouts: [],
          concreteStrength: null,
        },
      ],
    });
    const finishSheet = sheet({
      sheetName: "A7.1 Finish Schedule",
      sheetType: "schedule",
      discipline: "architectural",
      summary: "Interior paint, flooring, and ceiling finishes",
    });

    const scope =
      "Below-grade waterproofing only. Include membrane, protection board, and foundation drains. Exclude finishes.";
    expect(
      scoreSheetForBidMode(foundationSheet, "trade_package", scope, null)
    ).toBeGreaterThan(
      scoreSheetForBidMode(finishSheet, "trade_package", scope, null)
    );
  });

  it("keeps estimator-led modes on the fast default path for usable reads", () => {
    const extracted = {
      sheetName: "A1.1 Floor Plan",
      sheetType: "floor_plan",
      items: [
        {
          csiDivision: "07",
          csiCode: "07 13 00",
          description: "Below-grade waterproofing membrane",
          quantity: 250,
          unit: "SF",
          unitCost: 1,
          confidence: 88,
          notes: "Measured from plan callouts",
        },
      ],
      detectedScale: {
        found: false,
        notation: "",
        drawingUnitsPerRealUnit: 0,
        realUnit: "",
      },
    };

    expect(
      shouldVerifyExtractionForBidMode(extracted, "full_gc").shouldVerify
    ).toBe(false);
    expect(
      shouldVerifyExtractionForBidMode(extracted, "full_gc").reason
    ).toContain("fast default");
    expect(
      shouldVerifyExtractionForBidMode(extracted, "trade_package").shouldVerify
    ).toBe(false);
    expect(
      shouldVerifyExtractionForBidMode(extracted, "trade_package").reason
    ).toContain("fast default");
    expect(
      shouldVerifyExtractionForBidMode(extracted, "fast_scope_check")
        .shouldVerify
    ).toBe(false);
  });
});
