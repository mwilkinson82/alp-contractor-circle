import { describe, expect, it } from "vitest";
import { normalizeRebarUnitAndReview } from "../shared/rebarSanity";

describe("rebar sanity", () => {
  it("prevents LB-derived rebar from being priced as LF", () => {
    const item = normalizeRebarUnitAndReview({
      csiDivision: "03",
      csiCode: "03 20 00",
      description: "Rebar reinforcing",
      quantity: 25254,
      unit: "LF",
      unitCost: 125,
      extendedCost: 3156750,
      confidence: 82,
      notes: "Calculated reinforcement: 25,254 lbs total from schedule.",
    });

    expect(item.unit).toBe("LB");
    expect(item.quantity).toBe(25254);
    expect(item.unitCost).toBe(85);
    expect(item.extendedCost).toBe(2146590);
    expect(item.notes).toContain("priced as LB instead of LF");
  });

  it("marks extreme generated rebar quantities for review", () => {
    const item = normalizeRebarUnitAndReview({
      csiDivision: "03",
      csiCode: "03 20 00",
      description: "Generated slab rebar",
      quantity: 25001,
      unit: "LF",
      confidence: 95,
      notes: "[Enhanced] generated from slab ratio",
    });

    expect(item.unit).toBe("LF");
    expect(item.confidence).toBe(60);
    expect(item.notes).toContain("[Scope: review]");
  });
});
