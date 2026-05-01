import { describe, expect, it } from "vitest";
import { buildScopeIntent, classifyScopeMatch } from "../shared/scopeIntent";

const CRYSTAL_BELOW_GRADE_WATERPROOFING_SCOPE = "Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude roofing, above-grade envelope, finishes, masonry, MEP, and general concrete.";
const CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE = "Commercial project. Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude roofing, above-grade envelope, finishes, masonry, MEP, general concrete, slabs, footings, rebar, structural reinforcing, trench concrete, and pit concrete.";

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
    const intent = buildScopeIntent(CRYSTAL_BELOW_GRADE_WATERPROOFING_SCOPE);

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

  it("keeps Crystal Car Wash below-grade waterproofing from becoming a foundations scope", () => {
    const intent = buildScopeIntent(CRYSTAL_BELOW_GRADE_WATERPROOFING_SCOPE);

    expect(intent.summary).toBe("Below-grade waterproofing and drainage at foundation/trench conditions");
    expect(intent.summary).not.toContain("Foundations, footings");
    expect(intent.presetIds).toEqual(["below_grade_waterproofing"]);
  });

  it("excludes Crystal Car Wash slab footing rebar formwork and pole foundation items", () => {
    const intent = buildScopeIntent(CRYSTAL_BELOW_GRADE_WATERPROOFING_SCOPE);

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "Slab-on-grade concrete at wash bay" },
      { csiDivision: "03", csiCode: "03 30 00", description: "WF footing concrete with formwork" },
      { csiDivision: "03", csiCode: "03 20 00", description: "WF footing rebar and structural reinforcing" },
      { csiDivision: "03", csiCode: "03 10 00", description: "Formwork for trench concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Pit concrete at correlator trench" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Equipment pole foundation reinforcing" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("keeps Crystal Car Wash waterproofing and drainage items active", () => {
    const intent = buildScopeIntent(CRYSTAL_BELOW_GRADE_WATERPROOFING_SCOPE);
    const activeStatuses = ["included", "review"];

    for (const item of [
      { csiDivision: "07", csiCode: "07 13 00", description: "Waterproofing membrane at below-grade wall" },
      { csiDivision: "07", csiCode: "07 14 00", description: "Fluid-applied below-grade waterproofing" },
      { csiDivision: "07", csiCode: "07 13 00", description: "Protection board over waterproofing membrane" },
      { csiDivision: "03", csiCode: "03 15 13", description: "Keyway waterstop at construction joint" },
      { csiDivision: "07", csiCode: "07 26 00", description: "Vapor barrier below slab" },
      { csiDivision: "33", csiCode: "33 46 00", description: "Foundation drain pipe" },
      { csiDivision: "07", csiCode: "07 13 00", description: "Drainage board at foundation wall" },
      { csiDivision: "31", csiCode: "31 23 00", description: "Minor excavation and backfill for foundation drain installation" },
    ]) {
      expect(activeStatuses, item.description).toContain(classifyScopeMatch(item, intent));
    }
  });

  it("excludes latest Crystal Car Wash concrete rebar and trench rows from commercial waterproofing-only scope", () => {
    const intent = buildScopeIntent(CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE);

    expect(intent.summary).toBe("Below-grade waterproofing and drainage at foundation/trench conditions");
    expect(intent.presetIds).toEqual(["below_grade_waterproofing"]);

    for (const item of [
      { csiDivision: "03", csiCode: "03 20 00", description: "Reinforcing Steel for Trench Pit and Correlator Pit" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete Footing for Enclosure Wall" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete car wash trench" },
      { csiDivision: "03", csiCode: "03 10 00", description: "Footing formwork rows" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Footing rebar rows" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Trench concrete / pit concrete" },
      { csiDivision: "31", csiCode: "31 23 23", description: "Compacted base course under slab" },
      { csiDivision: "31", csiCode: "31 23 16", description: "Broad excavation for continuous footings" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("keeps latest Crystal Car Wash waterproofing and direct drainage installation active", () => {
    const intent = buildScopeIntent(CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE);

    for (const item of [
      { csiDivision: "07", csiCode: "07 13 00", description: "Waterproofing membrane at below-grade wall" },
      { csiDivision: "07", csiCode: "07 14 00", description: "Fluid-applied below-grade waterproofing" },
      { csiDivision: "07", csiCode: "07 13 00", description: "Protection board over waterproofing membrane" },
      { csiDivision: "03", csiCode: "03 15 13", description: "Keyway waterstop at construction joint" },
      { csiDivision: "07", csiCode: "07 26 00", description: "Vapor barrier below slab" },
      { csiDivision: "33", csiCode: "33 46 00", description: "Foundation drains with drainage board" },
    ].slice(0, 6)) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }

    expect(classifyScopeMatch({
      csiDivision: "31",
      csiCode: "31 23 00",
      description: "Minor excavation and backfill directly required for foundation drain installation",
    }, intent)).toBe("review");
  });

  it("does not automatically include rigid insulation in commercial waterproofing-only scope", () => {
    const intent = buildScopeIntent(CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE);

    expect(classifyScopeMatch({
      csiDivision: "07",
      csiCode: "07 21 13",
      description: "Rigid insulation board at below-grade wall",
    }, intent)).toBe("excluded");

    const withInsulation = buildScopeIntent(`${CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE} Include below-grade insulation.`);
    expect(classifyScopeMatch({
      csiDivision: "07",
      csiCode: "07 21 13",
      description: "Rigid insulation board at below-grade wall",
    }, withInsulation)).toBe("review");
  });

  it("uses general waterproofing rules so adjacent foundation trench and slab terms do not include concrete assemblies", () => {
    const intent = buildScopeIntent("Below-grade waterproofing at foundation walls, trench pits, and slab conditions. Include membrane and waterstops. Exclude concrete, rebar, slabs, and footings.");

    expect(intent.explicitIncludes).toContain("waterproofing");
    expect(intent.explicitExcludes).toEqual(expect.arrayContaining(["concrete", "rebar", "slab", "footing"]));
    expect(intent.boundaryTerms).toEqual(expect.arrayContaining(["footing", "concrete", "slab"]));

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete at trench pits" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Rebar at foundation walls" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Slab-on-grade at slab conditions" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Footing concrete at foundation walls" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("keeps piles scope narrow and holds unclear support work for review", () => {
    const intent = buildScopeIntent("Piles only. Include drilled piers and pile caps.");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Drilled pier concrete pile cap",
    }, intent)).toBe("included");

    for (const item of [
      { csiDivision: "31", csiCode: "31 23 16", description: "Excavation for pile caps" },
      { csiDivision: "31", csiCode: "31 23 23", description: "Spoils handling from drilled piers" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Rebar for pile caps" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("review");
    }
  });

  it("allows foundations-only scope to include concrete rebar and formwork when explicitly requested", () => {
    const intent = buildScopeIntent("Foundations only. Include footings, rebar, formwork, and concrete.");

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete footings" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Rebar reinforcing for footings" },
      { csiDivision: "03", csiCode: "03 10 00", description: "Formwork for foundation walls" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }
  });

  it("keeps site utilities focused on pipe trench and backfill while excluding building concrete", () => {
    const intent = buildScopeIntent("Site utilities scope. Include storm pipe, trenching, and backfill.");

    for (const item of [
      { csiDivision: "33", csiCode: "33 40 00", description: "Storm pipe" },
      { csiDivision: "31", csiCode: "31 23 00", description: "Utility trench excavation" },
      { csiDivision: "31", csiCode: "31 23 23", description: "Utility trench backfill" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Building slab and foundation concrete",
    }, intent)).toBe("excluded");
  });

  it("lets explicit excludes override inferred trade profile includes", () => {
    const intent = buildScopeIntent("Foundations only. Include foundation walls. Exclude concrete, rebar, slabs, and footings.");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Foundation wall concrete",
    }, intent)).toBe("excluded");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 20 00",
      description: "Foundation wall rebar",
    }, intent)).toBe("excluded");
  });

  it("lets explicit includes override default trade exclusions without overriding explicit excludes", () => {
    const glazingWithBlocking = buildScopeIntent("Glazing scope. Include storefront and blocking.");

    expect(classifyScopeMatch({
      csiDivision: "06",
      csiCode: "06 10 00",
      description: "Wood blocking for storefront anchors",
    }, glazingWithBlocking)).toBe("review");

    const glazingWithoutConcrete = buildScopeIntent("Glazing scope. Include storefront. Exclude concrete.");
    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete equipment support for storefront",
    }, glazingWithoutConcrete)).toBe("excluded");
  });
});
