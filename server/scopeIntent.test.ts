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

  it("does not include roofing membrane in below-grade waterproofing scope", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only - include membrane and protection board");

    expect(classifyScopeMatch({
      csiDivision: "07",
      csiCode: "07 54 00",
      description: "TPO roofing membrane at low-slope roof",
    }, intent)).toBe("excluded");
  });

  it("does not let foundation drains imply broad foundation concrete", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only - include foundation drains and drainage board");

    expect(classifyScopeMatch({
      csiDivision: "33",
      csiCode: "33 46 00",
      description: "Foundation drain pipe with drainage board",
    }, intent)).toBe("included");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Cast-in-place foundation walls with reinforcing and formwork",
    }, intent)).toBe("excluded");
  });

  it("includes underground concrete plus below-grade waterproofing scope for car wash pits", () => {
    const intent = buildScopeIntent("Underground concrete plus below-grade waterproofing - include trench pits, correlator pit, rebar, formwork, concrete, vapor barrier, waterproofing, protection board, direct excavation and backfill");

    expect(intent.summary).toContain("Underground concrete");

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "Cast-in-place concrete trench pit walls" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Rebar reinforcing at correlator pit" },
      { csiDivision: "03", csiCode: "03 10 00", description: "Formwork for underground pit concrete" },
      { csiDivision: "07", csiCode: "07 26 00", description: "Vapor barrier below slab-on-grade" },
      { csiDivision: "07", csiCode: "07 13 00", description: "Below-grade waterproofing membrane and protection board" },
      { csiDivision: "31", csiCode: "31 23 00", description: "Direct excavation and backfill for trench pit" },
    ]) {
      expect(classifyScopeMatch(item, intent)).toBe("included");
    }
  });

  it("excludes broad adjacent work from below-grade waterproofing only", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude roofing, above-grade envelope, finishes, masonry, MEP, and general concrete.");

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "General concrete slab-on-grade" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Rebar reinforcing for foundation walls" },
      { csiDivision: "04", csiCode: "04 22 00", description: "CMU masonry wall" },
      { csiDivision: "22", csiCode: "22 11 00", description: "Plumbing pipe rough-in" },
      { csiDivision: "23", csiCode: "23 05 00", description: "HVAC ductwork" },
      { csiDivision: "26", csiCode: "26 05 00", description: "Electrical conduit" },
      { csiDivision: "07", csiCode: "07 54 00", description: "Roofing membrane" },
      { csiDivision: "07", csiCode: "07 24 00", description: "EIFS above-grade envelope" },
      { csiDivision: "07", csiCode: "07 21 00", description: "Batt insulation" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("keeps waterstop vapor barrier and foundation drain included for below-grade waterproofing", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains.");

    for (const item of [
      { csiDivision: "07", csiCode: "07 13 00", description: "Waterproofing membrane below grade" },
      { csiDivision: "07", csiCode: "07 13 00", description: "Protection board at foundation wall" },
      { csiDivision: "03", csiCode: "03 15 13", description: "Keyway waterstop at construction joint" },
      { csiDivision: "07", csiCode: "07 26 00", description: "Vapor barrier below slab" },
      { csiDivision: "33", csiCode: "33 46 00", description: "Foundation drain with drainage board" },
    ]) {
      expect(classifyScopeMatch(item, intent)).toBe("included");
    }
  });

  it("excludes broad slab-adjacent items from below-grade waterproofing only", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude general concrete.");

    for (const item of [
      { csiDivision: "31", csiCode: "31 23 23", description: "General compacted aggregate base below slab" },
      { csiDivision: "31", csiCode: "31 23 23", description: "Broad slab fill and engineered fill" },
      { csiDivision: "31", csiCode: "31 31 16", description: "Termite treatment below slab-on-grade" },
      { csiDivision: "07", csiCode: "07 21 13", description: "Unrelated rigid insulation board at slab edge" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("moves explicitly requested base fill and rigid insulation to review for below-grade waterproofing", () => {
    const intent = buildScopeIntent("Below-grade waterproofing only with compacted base and rigid insulation review items.");

    expect(classifyScopeMatch({
      csiDivision: "31",
      csiCode: "31 23 23",
      description: "Compacted base below waterproofing assembly",
    }, intent)).toBe("review");

    expect(classifyScopeMatch({
      csiDivision: "07",
      csiCode: "07 21 13",
      description: "Below-grade rigid insulation board",
    }, intent)).toBe("review");
  });
});
