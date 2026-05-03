import { describe, expect, it } from "vitest";
import { buildScopeIntent, classifyScopeMatch, classifyTradePackageScopeSafety } from "../shared/scopeIntent";

const CRYSTAL_BELOW_GRADE_WATERPROOFING_SCOPE = "Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude roofing, above-grade envelope, finishes, masonry, MEP, and general concrete.";
const CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE = "Commercial project. Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude roofing, above-grade envelope, finishes, masonry, MEP, general concrete, slabs, footings, rebar, structural reinforcing, trench concrete, and pit concrete.";
const CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE = "Commercial project. Concrete foundations, slab-on-grade, trench/pit systems, and associated drains package. Include mobilization, layout coordination, site preparation, excavation for continuous footings, isolated footings, trench drains, trench pit, tire seal drainage pit, correlator pit, gate post foundations, bollard foundations, equipment pole foundations, vacuum enclosure foundations, trash enclosure foundations, and related slab work. Include subgrade preparation, fine grading, compaction, onsite reuse of suitable excavated material, formwork, reinforcing steel within foundations and pits, dowels required for foundation continuation, concrete placement, finishing, curing, stepped footings, slab edge forms, 10 mil vapor barrier, rigid insulation at occupied slab perimeter areas, fiber-reinforced slab-on-grade, sawcut control joints, trench drain concrete, trench pit concrete, tire seal drainage pit concrete, correlator pit concrete, termite treatment, concrete testing coordination, compaction testing coordination, field supervision, and project management. Exclude CMU masonry work, masonry stem walls, masonry enclosures, structural work above top of foundation, reinforcing steel beyond foundation scope and footing dowels, drive slabs outside the building footprint unless specifically listed, surveying services, dewatering, underground utilities beyond included pits and drains, import/export of fill beyond onsite reuse, control joint sealants, epoxy fillers, joint caulking, car wash equipment, and any work not explicitly listed in this scope.";

describe("scope intent", () => {
  it("recognizes a broad concrete foundations and trench pit subcontract package", () => {
    const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

    expect(intent.scopeStrictness).toBe("strict");
    expect(intent.summary).toContain("Concrete foundations, slab-on-grade, trench/pit systems, and drains package");
    expect(intent.presetIds).toContain("concrete_foundations_sog_pits_drains");
    expect(intent.focusDivisions).toEqual(expect.arrayContaining(["03", "07", "31", "33"]));
  });

  it("keeps broad concrete foundations package work active instead of pushing it to review or excluded", () => {
    const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

    for (const item of [
      { csiDivision: "31", csiCode: "31 23 16", description: "Excavation for continuous footings" },
      { csiDivision: "31", csiCode: "31 23 23", description: "Subgrade preparation and compaction below slab-on-grade" },
      { csiDivision: "03", csiCode: "03 10 00", description: "Formwork for trench pit walls and slab edge forms" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Reinforcing steel within foundations and pits" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete foundations and slab-on-grade placement" },
      { csiDivision: "07", csiCode: "07 26 00", description: "10 mil vapor barrier below slab-on-grade" },
      { csiDivision: "07", csiCode: "07 21 13", description: "Rigid insulation at occupied slab perimeter" },
      { csiDivision: "33", csiCode: "33 46 00", description: "Trench drains and foundation drain piping at included pits" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete for correlator pit and tire seal drainage pit" },
      { csiDivision: "31", csiCode: "31 31 16", description: "Termite treatment below slab-on-grade" },
      { csiDivision: "01", csiCode: "01 45 00", description: "Concrete testing coordination and compaction testing coordination" },
      { csiDivision: "01", csiCode: "01 31 00", description: "Field supervision and project management" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }
  });

  it("reserves review for missing quantity signals inside the broad concrete package", () => {
    const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete for correlator pit",
      notes: "Quantity set to 1 - update with actual measurement before bidding",
    }, intent)).toBe("review");
  });

  it("holds high-dollar generic or weak-evidence trade-package assemblies for review", () => {
    const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

    expect(classifyTradePackageScopeSafety({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Sawcut control joints for slab-on-grade",
      notes: "[Consolidated 4 items from: A-501, A-400] Quantity matches original extraction.",
      extendedCost: 25_789_782,
    }, intent)).toBe("review");

    expect(classifyTradePackageScopeSafety({
      csiDivision: "03",
      csiCode: "03 20 00",
      description: "Reinforcing steel, #5 continuous bars (Sections 1, 2, 3, 4, 5, 6)",
      notes: "[Enhanced] Rebar calculated from multiple concrete members.",
      extendedCost: 8_472_832,
    }, intent)).toBe("review");

    expect(classifyTradePackageScopeSafety({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete slab-on-grade, fiber reinforced, 4\" thick",
      notes: "No specific quantity noted on drawing, assuming original extraction is based on a floor plan not provided.",
      extendedCost: 9_768_642,
    }, intent)).toBe("review");
  });

  it("allows anchored low-risk broad concrete package items to remain active", () => {
    const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

    expect(classifyTradePackageScopeSafety({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete for correlator pit",
      notes: "Measured from S-103 trench detail.",
      extendedCost: 6_500,
    }, intent)).toBe("included");
  });

  it("still excludes explicit non-package work from the broad concrete package", () => {
    const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

    for (const item of [
      { csiDivision: "04", csiCode: "04 22 00", description: "CMU masonry enclosure wall" },
      { csiDivision: "05", csiCode: "05 12 00", description: "Structural steel above top of foundation" },
      { csiDivision: "22", csiCode: "22 11 00", description: "Plumbing utilities beyond included pits and drains" },
      { csiDivision: "31", csiCode: "31 23 16", description: "Dewatering" },
      { csiDivision: "07", csiCode: "07 92 00", description: "Control joint sealants and joint caulking" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("keeps Full GC Takeoff broad instead of excluding adjacent trade work", () => {
    const intent = buildScopeIntent(CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE, null, "full_gc");

    expect(intent.summary).toBe("Full GC broad coverage");
    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete footing with rebar and formwork",
    }, intent)).toBe("included");
    expect(classifyScopeMatch({
      csiDivision: "22",
      csiCode: "22 11 00",
      description: "Plumbing rough-in piping",
    }, intent)).toBe("included");
  });

  it("enforces strict boundaries for Trade Package Takeoff", () => {
    const intent = buildScopeIntent(CRYSTAL_COMMERCIAL_BELOW_GRADE_WATERPROOFING_SCOPE, null, "trade_package");

    expect(intent.scopeStrictness).toBe("strict");
    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete footing with rebar and formwork",
    }, intent)).toBe("excluded");
    expect(classifyScopeMatch({
      csiDivision: "07",
      csiCode: "07 13 00",
      description: "Below-grade waterproofing membrane",
    }, intent)).toBe("included");
  });

  it("keeps Fast Scope Check boundary items visible for review", () => {
    const intent = buildScopeIntent("Fast check for below-grade waterproofing. Include membrane, protection board, and foundation drains.", null, "fast_scope_check");

    expect(intent.scopeStrictness).toBe("review_first");
    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete footing with rebar and formwork",
    }, intent)).toBe("review");
  });

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

describe("Crystal Car Wash explicit exclusion override regression", () => {
  const SCOPE = "Commercial project. Below-grade waterproofing only. Include waterproofing membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude roofing, above-grade envelope, finishes, masonry, MEP, general concrete, slabs, footings, rebar, structural reinforcing, trench concrete, and pit concrete.";

  it("excludes 'Concrete for slab-on-grade (4 inch thick)' when concrete and slabs are explicitly excluded", () => {
    const intent = buildScopeIntent(SCOPE);

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete for slab-on-grade (4 inch thick)",
    }, intent)).toBe("excluded");
  });

  it("excludes any slab-on-grade concrete item", () => {
    const intent = buildScopeIntent(SCOPE);

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "4 inch slab-on-grade concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Slab on grade at wash bay" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete slab at equipment area" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("excludes all broad concrete/rebar/footing/trench/pit items", () => {
    const intent = buildScopeIntent(SCOPE);

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete for continuous footings" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Rebar for slab-on-grade" },
      { csiDivision: "03", csiCode: "03 20 00", description: "Structural reinforcing at footing" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Trench concrete for car wash equipment" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Pit concrete at correlator" },
      { csiDivision: "03", csiCode: "03 10 00", description: "Formwork for footings" },
      { csiDivision: "03", csiCode: "03 30 00", description: "WF footing concrete" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("excluded");
    }
  });

  it("keeps waterproofing and drainage items active", () => {
    const intent = buildScopeIntent(SCOPE);

    for (const item of [
      { csiDivision: "07", csiCode: "07 13 00", description: "Protection board at foundation" },
      { csiDivision: "07", csiCode: "07 14 00", description: "Fluid-applied waterproofing membrane" },
      { csiDivision: "07", csiCode: "07 26 00", description: "Vapor barrier below slab" },
      { csiDivision: "33", csiCode: "33 46 00", description: "Foundation drain and drainage board" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }
  });

  it("does not infer underground concrete from below-grade slab conditions or foundation walls or trench pits", () => {
    const intent = buildScopeIntent(SCOPE);

    expect(intent.summary).toBe("Below-grade waterproofing and drainage at foundation/trench conditions");
    expect(intent.summary).not.toContain("concrete");
    expect(intent.summary).not.toContain("Foundations");
    expect(intent.summary).not.toContain("footings");
    expect(intent.summary).not.toContain("slabs-on-grade");
    expect(intent.summary).not.toContain("directly related concrete work");
    expect(intent.presetIds).not.toContain("foundations");
    expect(intent.presetIds).not.toContain("underground_concrete_below_grade_waterproofing");
    expect(intent.presetIds).not.toContain("roofing");
  });

  it("does not activate roofing profile from 'Exclude roofing' clause", () => {
    const intent = buildScopeIntent(SCOPE);
    expect(intent.presetIds).not.toContain("roofing");
    expect(intent.summary).not.toContain("Roofing");
  });

  it("classifies 'Formwork for #4 @ 16 O.C. Typ. (Trench Walls)' as not active", () => {
    const intent = buildScopeIntent(SCOPE);
    const result = classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 10 00",
      description: "Formwork for #4 @ 16\" O.C. Typ. (Trench Walls)",
    }, intent);
    expect(["excluded", "review"]).toContain(result);
  });

  it("classifies 'Formwork for #4 @ 12 O.C. Cont. (Trench Walls)' as not active", () => {
    const intent = buildScopeIntent(SCOPE);
    const result = classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 10 00",
      description: "Formwork for #4 @ 12\" O.C. Cont. (Trench Walls)",
    }, intent);
    expect(["excluded", "review"]).toContain(result);
  });

  it("classifies 'Formwork for Keyway Joint and Waterstop, PVC, at Trench Walls' as not active", () => {
    const intent = buildScopeIntent(SCOPE);
    const result = classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 10 00",
      description: "Formwork for Keyway Joint and Waterstop, PVC, at Trench Walls",
    }, intent);
    expect(["excluded", "review"]).toContain(result);
  });

  it("classifies 'Formwork for Non-shrink grout at column base plate' as not active", () => {
    const intent = buildScopeIntent(SCOPE);
    const result = classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 10 00",
      description: "Formwork for Non-shrink grout at column base plate",
    }, intent);
    expect(["excluded", "review"]).toContain(result);
  });

  it("keeps 'Keyway Joint and Waterstop, PVC' active or review (not excluded)", () => {
    const intent = buildScopeIntent(SCOPE);
    const result = classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 15 13",
      description: "Keyway Joint and Waterstop, PVC",
    }, intent);
    expect(["included", "review"]).toContain(result);
  });
});

describe("Scope-safety pass: named-area gate for broad concrete profile", () => {
  const BROAD_SCOPE = "Commercial project. Concrete foundations, slab-on-grade, trench/pit systems, and associated drains package. Include mobilization, layout coordination, site preparation, excavation for continuous footings, isolated footings, trench drains, trench pit, tire seal drainage pit, correlator pit, gate post foundations, bollard foundations, equipment pole foundations, vacuum enclosure foundations, trash enclosure foundations, and related slab work. Include subgrade preparation, fine grading, compaction, onsite reuse of suitable excavated material, formwork, reinforcing steel within foundations and pits, dowels required for foundation continuation, concrete placement, finishing, curing, stepped footings, slab edge forms, 10 mil vapor barrier, rigid insulation at occupied slab perimeter areas, fiber-reinforced slab-on-grade, sawcut control joints, trench drain concrete, trench pit concrete, tire seal drainage pit concrete, correlator pit concrete, termite treatment, concrete testing coordination, compaction testing coordination, field supervision, and project management. Exclude CMU masonry work, masonry stem walls, masonry enclosures, structural work above top of foundation, reinforcing steel beyond foundation scope and footing dowels, drive slabs outside the building footprint unless specifically listed, surveying services, dewatering, underground utilities beyond included pits and drains, import/export of fill beyond onsite reuse, control joint sealants, epoxy fillers, joint caulking, car wash equipment, and any work not explicitly listed in this scope.";

  it("demotes generic 'Concrete for slab-on-grade (4 inch thick)' to review in trade_package mode", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    // Generic slab item without named-area tie → review
    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete for slab-on-grade (4 inch thick)",
    }, intent)).toBe("review");
  });

  it("demotes generic 'Concrete walls' to review in trade_package mode", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 30 00",
      description: "Concrete walls at building perimeter",
    }, intent)).toBe("review");
  });

  it("demotes generic 'Reinforcing steel' to review in trade_package mode", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 20 00",
      description: "Reinforcing steel general",
    }, intent)).toBe("review");
  });

  it("demotes generic 'Formwork' to review in trade_package mode", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    expect(classifyScopeMatch({
      csiDivision: "03",
      csiCode: "03 10 00",
      description: "Formwork general",
    }, intent)).toBe("review");
  });

  it("keeps named-area items active: trench pit concrete, correlator pit, tire seal pit", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "Trench pit concrete at car wash trench" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Concrete for correlator pit" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Tire seal drainage pit concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Gate post foundation concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Bollard foundation concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Equipment pole foundation" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Vacuum enclosure foundation concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Trash enclosure foundation" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }
  });

  it("keeps named-area items active: continuous footing, isolated footing, grade beam", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    for (const item of [
      { csiDivision: "03", csiCode: "03 30 00", description: "Continuous footing concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Isolated footing at column" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Grade beam concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Wall footing concrete" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Foundation wall concrete" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }
  });

  it("keeps vapor barrier, rigid insulation, termite treatment, control joints active", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    for (const item of [
      { csiDivision: "07", csiCode: "07 26 00", description: "10 mil vapor barrier below slab-on-grade" },
      { csiDivision: "07", csiCode: "07 21 13", description: "Rigid insulation at occupied slab perimeter" },
      { csiDivision: "31", csiCode: "31 31 16", description: "Termite treatment below slab-on-grade" },
      { csiDivision: "03", csiCode: "03 35 00", description: "Sawcut control joints" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }
  });

  it("keeps supervision, testing, mobilization active", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    for (const item of [
      { csiDivision: "01", csiCode: "01 45 00", description: "Concrete testing coordination" },
      { csiDivision: "01", csiCode: "01 45 00", description: "Compaction testing coordination" },
      { csiDivision: "01", csiCode: "01 31 00", description: "Field supervision and project management" },
      { csiDivision: "01", csiCode: "01 50 00", description: "Mobilization and layout coordination" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("included");
    }
  });

  it("demotes 'Broad reinforcing' and 'Consolidated formwork' to review", () => {
    const intent = buildScopeIntent(BROAD_SCOPE, null, "trade_package");

    for (const item of [
      { csiDivision: "03", csiCode: "03 20 00", description: "Broad reinforcing steel for building" },
      { csiDivision: "03", csiCode: "03 10 00", description: "Consolidated formwork for walls and columns" },
      { csiDivision: "03", csiCode: "03 30 00", description: "Generic concrete for building structure" },
    ]) {
      expect(classifyScopeMatch(item, intent), item.description).toBe("review");
    }
  });
});

describe("scope-safety: explicit includes not excluded", () => {
  const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

  it("fiber-reinforced slab-on-grade is included, not excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "03", csiCode: "03 30 00", description: "Fiber-reinforced slab-on-grade", notes: "" },
      intent
    );
    expect(result).not.toBe("excluded");
  });

  it("10 mil vapor barrier under slab-on-grade is included, not excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "07", csiCode: "07 26 00", description: "10 mil vapor barrier under slab-on-grade", notes: "" },
      intent
    );
    expect(result).not.toBe("excluded");
  });

  it("rigid insulation at occupied slab perimeter is included, not excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "07", csiCode: "07 21 00", description: "Rigid insulation at occupied slab perimeter", notes: "" },
      intent
    );
    expect(result).not.toBe("excluded");
  });

  it("excavation for continuous footings is included, not excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "31", csiCode: "31 23 00", description: "Excavation for continuous footings", notes: "" },
      intent
    );
    expect(result).not.toBe("excluded");
  });

  it("formwork for continuous footings is included, not excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "03", csiCode: "03 11 00", description: "Formwork for continuous footings", notes: "" },
      intent
    );
    expect(result).not.toBe("excluded");
  });

  it("subgrade preparation and compaction is included, not excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "31", csiCode: "31 22 00", description: "Subgrade preparation and compaction", notes: "" },
      intent
    );
    expect(result).not.toBe("excluded");
  });

  it("dewatering remains excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "31", csiCode: "31 23 19", description: "Dewatering at excavation", notes: "" },
      intent
    );
    expect(result).toBe("excluded");
  });

  it("CMU masonry remains excluded", () => {
    const result = classifyScopeMatch(
      { csiDivision: "04", csiCode: "04 22 00", description: "CMU masonry work at enclosures", notes: "" },
      intent
    );
    expect(result).toBe("excluded");
  });
});

describe("scope-safety: high-dollar generated row with broad calc basis", () => {
  const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");

  it("generated rebar row with named area but broad calc basis → review", () => {
    const item = {
      csiDivision: "03",
      csiCode: "03 21 00",
      description: "Reinforcing steel for Gate Post Foundations",
      notes: "[Scope: included] [Enhanced] Calc: #5 rebar at 12 OC both ways across total building slab area 18,500 SF plus grade beams 1,240 LF plus columns 48 EA plus retaining walls 860 LF = 48,178 LB",
      extendedCost: 9_828_312,
    };
    const result = classifyTradePackageScopeSafety(item, intent);
    expect(result).toBe("review");
  });

  it("legitimate aggregate rebar row without broad calc basis stays included", () => {
    const item = {
      csiDivision: "03",
      csiCode: "03 21 00",
      description: "Reinforcing steel within foundations and pits",
      notes: "[Scope: included] [Enhanced] Calc: continuous footings 1,240 LF × #5 at 12 OC + isolated footings 24 EA × #6 bars = 26,845 LB",
      extendedCost: 5_500_000,
    };
    const result = classifyTradePackageScopeSafety(item, intent);
    expect(result).toBe("included");
  });

  it("named work area alone does not override generated safety for high-dollar items", () => {
    const item = {
      csiDivision: "03",
      csiCode: "03 21 00",
      description: "Reinforcing steel for Bollard Foundations",
      notes: "[Scope: included] [Generated] Calc: total project rebar = all concrete areas × #5 at 12 OC both ways, slabs + beams + walls + footings = 48,178 LB",
      extendedCost: 9_000_000,
    };
    const result = classifyTradePackageScopeSafety(item, intent);
    expect(result).toBe("review");
  });
});

describe("scope-safety: Needs Scope Review remains out of active total", () => {
  it("review items are not counted as included by classifyScopeMatch", () => {
    const intent = buildScopeIntent(CRYSTAL_BROAD_CONCRETE_PACKAGE_SCOPE, null, "trade_package");
    const item = { csiDivision: "03", description: "Concrete for slab-on-grade (4 inch thick)", notes: "" };
    const result = classifyScopeMatch(item, intent);
    // Generic slab item without named area should be review, not included
    expect(result).toBe("review");
  });
});
