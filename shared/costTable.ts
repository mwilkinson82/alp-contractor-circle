/**
 * ConstructLine Cost Reference Table
 * 
 * Real-world 2025 unit costs for common construction items.
 * Sources: RSMeans 2025, HomeAdvisor, Angi, HomGuide, industry standards.
 * 
 * PRICING PHILOSOPHY:
 * - "materialOnly" = cost when formwork/rebar are SEPARATE line items (just concrete + pour + finish)
 * - "installed" = all-in cost when it's a single assembly line item (concrete + formwork + rebar + labor)
 * - The lookup engine decides which to use based on whether companion items exist
 * 
 * All costs are US National Average. Regional multipliers are applied separately.
 */

export interface CostTableEntry {
  /** Unique ID for the entry */
  id: string;
  /** CSI division (2-digit) */
  csiDivision: string;
  /** CSI code (6-digit) */
  csiCode: string;
  /** Keywords to match against item descriptions (lowercase) */
  keywords: string[];
  /** Negative keywords — if present, this entry should NOT match */
  excludeKeywords?: string[];
  /** Unit of measure */
  unit: string;
  /** Material + labor cost (when formwork/rebar are separate line items) */
  materialOnlyCost: number;
  /** Fully installed cost (when this is the only line item for the element) */
  installedCost: number;
  /** Category for grouping: concrete, formwork, rebar, earthwork, accessories */
  category: string;
  /** Human-readable description */
  description: string;
}

// ─── CSI 03: Concrete ─────────────────────────────────────────────────────────

const CONCRETE_ITEMS: CostTableEntry[] = [
  // ── Slabs ──
  {
    id: "slab-4in",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "4\"", "4 inch", "4-inch", "4 in"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh"],
    unit: "SF",
    materialOnlyCost: 4.00,   // concrete + pour + finish only
    installedCost: 5.50,      // all-in with mesh/basic rebar
    category: "concrete",
    description: "4\" Concrete Slab-on-Grade",
  },
  {
    id: "slab-6in",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "6\"", "6 inch", "6-inch", "6 in"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh"],
    unit: "SF",
    materialOnlyCost: 5.00,
    installedCost: 6.50,
    category: "concrete",
    description: "6\" Concrete Slab-on-Grade",
  },
  {
    id: "slab-8in",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "8\"", "8 inch", "8-inch", "8 in"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh"],
    unit: "SF",
    materialOnlyCost: 6.00,
    installedCost: 7.50,
    category: "concrete",
    description: "8\" Concrete Slab-on-Grade",
  },
  {
    id: "slab-generic",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "on grade", "on-grade", "sog"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh", "4\"", "6\"", "8\""],
    unit: "SF",
    materialOnlyCost: 4.50,
    installedCost: 6.00,
    category: "concrete",
    description: "Concrete Slab-on-Grade (generic)",
  },

  // ── Continuous Footings ──
  {
    id: "footing-12x6",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "12\"", "6\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad"],
    unit: "LF",
    materialOnlyCost: 6.00,
    installedCost: 10.00,
    category: "concrete",
    description: "Continuous Footing 12\"W x 6\"D",
  },
  {
    id: "footing-16x8",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "16\"", "8\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad"],
    unit: "LF",
    materialOnlyCost: 8.00,
    installedCost: 14.00,
    category: "concrete",
    description: "Continuous Footing 16\"W x 8\"D",
  },
  {
    id: "footing-24x12",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "continuous", "wf-"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad"],
    unit: "LF",
    materialOnlyCost: 12.00,
    installedCost: 22.00,
    category: "concrete",
    description: "Continuous Footing 24\"W x 12\"D (typical WF)",
  },
  {
    id: "footing-generic",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "continuous"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad", "step"],
    unit: "LF",
    materialOnlyCost: 10.00,
    installedCost: 18.00,
    category: "concrete",
    description: "Continuous Footing (generic)",
  },

  // ── Spread/Pad Footings ──
  {
    id: "spread-footing",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["spread footing", "pad footing", "isolated footing", "f-1"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "EA",
    materialOnlyCost: 250.00,
    installedCost: 450.00,
    category: "concrete",
    description: "Spread/Pad Footing",
  },

  // ── Stem Walls ──
  {
    id: "stem-wall",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["stem wall", "stemwall", "foundation wall"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 25.00,   // concrete only for stem wall
    installedCost: 55.00,      // all-in with formwork + rebar
    category: "concrete",
    description: "Concrete Foundation Stem Wall",
  },
  {
    id: "stem-wall-cmu",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["stem wall", "cmu", "block"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 30.00,
    installedCost: 65.00,
    category: "concrete",
    description: "CMU Stem Wall with Footing",
  },

  // ── Grade Beams ──
  {
    id: "grade-beam",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["grade beam"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 18.00,
    installedCost: 35.00,
    category: "concrete",
    description: "Concrete Grade Beam",
  },

  // ── Piers/Columns ──
  {
    id: "pier-small",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["pier", "column", "12\"", "14\"", "16\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "anchor"],
    unit: "EA",
    materialOnlyCost: 150.00,
    installedCost: 300.00,
    category: "concrete",
    description: "Concrete Pier 12\"-16\" diameter",
  },
  {
    id: "pier-large",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["pier", "column", "18\"", "20\"", "24\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "anchor"],
    unit: "EA",
    materialOnlyCost: 250.00,
    installedCost: 500.00,
    category: "concrete",
    description: "Concrete Pier 18\"-24\" diameter",
  },

  // ── Trench/Pit Concrete ──
  {
    id: "trench-pit",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["trench pit", "trench", "pit"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "drain", "excavat", "backfill"],
    unit: "LF",
    materialOnlyCost: 45.00,   // concrete walls + base per LF of trench
    installedCost: 85.00,
    category: "concrete",
    description: "Concrete Trench Pit",
  },
  {
    id: "trench-drain-foundation",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["trench drain", "drain foundation"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "pre-fab", "prefab", "excavat"],
    unit: "LF",
    materialOnlyCost: 35.00,
    installedCost: 65.00,
    category: "concrete",
    description: "Concrete Trench Drain Foundation",
  },
  {
    id: "trench-drain-prefab",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["trench drain", "pre-fabricated", "prefab", "pre-fab"],
    excludeKeywords: ["foundation", "formwork", "rebar"],
    unit: "LF",
    materialOnlyCost: 45.00,
    installedCost: 75.00,
    category: "concrete",
    description: "Pre-fabricated Trench Drain (supply + install)",
  },

  // ── Correlator/Drainage Pits ──
  {
    id: "concrete-pit-sf",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["correlator", "drainage pit", "catch basin", "sump"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "excavat", "backfill"],
    unit: "SF",
    materialOnlyCost: 120.00,
    installedCost: 200.00,
    category: "concrete",
    description: "Concrete Pit (correlator/drainage) per SF",
  },
  {
    id: "concrete-pit-ea",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["correlator", "drainage pit", "catch basin", "sump", "tire seal"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "excavat", "backfill"],
    unit: "EA",
    materialOnlyCost: 1500.00,
    installedCost: 3000.00,
    category: "concrete",
    description: "Concrete Pit (each)",
  },

  // ── Bollard/Gate Post Footings ──
  {
    id: "bollard-footing",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["bollard", "post footing", "gate post", "pole foundation"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "excavat"],
    unit: "EA",
    materialOnlyCost: 120.00,
    installedCost: 225.00,
    category: "concrete",
    description: "Bollard/Post Footing (each)",
  },

  // ── Concrete by CY (generic) ──
  {
    id: "concrete-cy",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["concrete"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "slab", "footing", "wall", "beam", "pier", "trench", "pit", "bollard", "anchor"],
    unit: "CY",
    materialOnlyCost: 200.00,  // ready-mix + pour
    installedCost: 300.00,     // all-in
    category: "concrete",
    description: "Concrete (generic, per CY)",
  },

  // ── Construction Joints ──
  {
    id: "construction-joint",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["construction joint", "dowel", "sleeve"],
    excludeKeywords: ["expansion", "control"],
    unit: "LF",
    materialOnlyCost: 8.00,
    installedCost: 12.00,
    category: "concrete",
    description: "Construction Joint with Dowels",
  },

  // ── Expansion Joints ──
  {
    id: "expansion-joint",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["expansion joint", "compressible filler"],
    unit: "LF",
    materialOnlyCost: 3.50,
    installedCost: 6.00,
    category: "accessories",
    description: "Expansion Joint (1/2\" filler)",
  },

  // ── Control Joints ──
  {
    id: "control-joint",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["control joint", "saw cut", "sawcut"],
    unit: "LF",
    materialOnlyCost: 2.00,
    installedCost: 3.50,
    category: "accessories",
    description: "Control Joint / Saw Cut",
  },

  // ── Footing Step ──
  {
    id: "footing-step",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing step", "step"],
    excludeKeywords: ["formwork", "rebar"],
    unit: "EA",
    materialOnlyCost: 50.00,
    installedCost: 100.00,
    category: "concrete",
    description: "Footing Step (each)",
  },

  // ── Anchor/Embed ──
  {
    id: "anchor-rod",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["anchor", "anchor rod", "anchor bolt", "embed", "column anchor"],
    unit: "EA",
    materialOnlyCost: 75.00,
    installedCost: 150.00,
    category: "accessories",
    description: "Anchor Rod / Embed Detail",
  },

  // ── Pipe Sleeve ──
  {
    id: "pipe-sleeve",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["pipe sleeve", "sleeve", "penetration"],
    unit: "EA",
    materialOnlyCost: 25.00,
    installedCost: 50.00,
    category: "accessories",
    description: "Pipe Sleeve Through Foundation",
  },

  // ── Shearwall (below SOG) ──
  {
    id: "shearwall-below",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["shearwall", "shear wall"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 20.00,
    installedCost: 45.00,
    category: "concrete",
    description: "Concrete Shearwall (below SOG)",
  },
];

// ─── CSI 03 10: Formwork ──────────────────────────────────────────────────────

const FORMWORK_ITEMS: CostTableEntry[] = [
  {
    id: "formwork-footing",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form", "footing"],
    unit: "SFCA",
    materialOnlyCost: 4.50,
    installedCost: 4.50,
    category: "formwork",
    description: "Formwork for Footings",
  },
  {
    id: "formwork-wall",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form", "wall", "stem"],
    unit: "SFCA",
    materialOnlyCost: 5.50,
    installedCost: 5.50,
    category: "formwork",
    description: "Formwork for Walls",
  },
  {
    id: "formwork-slab-edge",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form", "slab", "edge"],
    unit: "LF",
    materialOnlyCost: 4.00,
    installedCost: 4.00,
    category: "formwork",
    description: "Formwork for Slab Edge",
  },
  {
    id: "formwork-pit",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form", "pit", "trench"],
    unit: "SFCA",
    materialOnlyCost: 7.00,
    installedCost: 7.00,
    category: "formwork",
    description: "Formwork for Pits/Trenches",
  },
  {
    id: "formwork-pier",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form", "pier", "column", "sonotube"],
    unit: "SFCA",
    materialOnlyCost: 6.00,
    installedCost: 6.00,
    category: "formwork",
    description: "Formwork for Piers/Columns",
  },
  {
    id: "formwork-generic",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form"],
    unit: "SFCA",
    materialOnlyCost: 5.00,
    installedCost: 5.00,
    category: "formwork",
    description: "Formwork (generic)",
  },
  {
    id: "formwork-lf",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form"],
    unit: "LF",
    materialOnlyCost: 8.00,
    installedCost: 8.00,
    category: "formwork",
    description: "Formwork per LF",
  },
  {
    id: "formwork-ea",
    csiDivision: "03", csiCode: "03 10 00",
    keywords: ["formwork", "form"],
    unit: "EA",
    materialOnlyCost: 35.00,
    installedCost: 35.00,
    category: "formwork",
    description: "Formwork per EA (bollard/post)",
  },
];

// ─── CSI 03 20: Reinforcing ──────────────────────────────────────────────────

const REBAR_ITEMS: CostTableEntry[] = [
  {
    id: "rebar-3",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#3", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 0.85,
    installedCost: 0.85,
    category: "rebar",
    description: "#3 Rebar",
  },
  {
    id: "rebar-4",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#4", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 1.15,
    installedCost: 1.15,
    category: "rebar",
    description: "#4 Rebar",
  },
  {
    id: "rebar-5",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#5", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 1.50,
    installedCost: 1.50,
    category: "rebar",
    description: "#5 Rebar",
  },
  {
    id: "rebar-6",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#6", "rebar", "reinforc"],
    unit: "LF",
    materialOnlyCost: 1.95,
    installedCost: 1.95,
    category: "rebar",
    description: "#6 Rebar",
  },
  {
    id: "rebar-generic",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["rebar", "reinforc", "steel"],
    excludeKeywords: ["#3", "#4", "#5", "#6", "structural", "mesh"],
    unit: "LF",
    materialOnlyCost: 1.25,
    installedCost: 1.25,
    category: "rebar",
    description: "Rebar (generic size)",
  },
  {
    id: "rebar-ea",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["rebar", "reinforc", "steel"],
    unit: "EA",
    materialOnlyCost: 50.00,
    installedCost: 50.00,
    category: "rebar",
    description: "Rebar per EA (bollard/post rebar cage)",
  },
  {
    id: "wwf-mesh",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["mesh", "wwf", "welded wire", "wire fabric"],
    unit: "SF",
    materialOnlyCost: 0.35,
    installedCost: 0.35,
    category: "rebar",
    description: "Welded Wire Fabric / Mesh",
  },
  {
    id: "rebar-ties",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["ties", "stirrup"],
    unit: "LF",
    materialOnlyCost: 1.00,
    installedCost: 1.00,
    category: "rebar",
    description: "Rebar Ties/Stirrups",
  },
  {
    id: "dowels",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["dowel"],
    unit: "LF",
    materialOnlyCost: 1.35,
    installedCost: 1.35,
    category: "rebar",
    description: "Rebar Dowels",
  },
];

// ─── CSI 03 05: Concrete Accessories ──────────────────────────────────────────

const CONCRETE_ACCESSORIES: CostTableEntry[] = [
  {
    id: "vapor-barrier",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["vapor barrier", "vapor", "moisture barrier", "poly", "6 mil", "10 mil", "15 mil"],
    unit: "SF",
    materialOnlyCost: 0.15,
    installedCost: 0.25,
    category: "accessories",
    description: "Vapor Barrier (6-15 mil poly)",
  },
  {
    id: "base-course",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["base course", "compacted base", "crushed stone", "aggregate base", "abc"],
    unit: "SF",
    materialOnlyCost: 0.75,
    installedCost: 1.10,
    category: "accessories",
    description: "Compacted Base Course (4\"-6\" thick)",
  },
  {
    id: "curing-compound",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["curing", "cure", "compound"],
    unit: "SF",
    materialOnlyCost: 0.15,
    installedCost: 0.25,
    category: "accessories",
    description: "Curing Compound",
  },
  {
    id: "concrete-sealer",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["sealer", "seal"],
    excludeKeywords: ["joint", "expansion", "tire"],
    unit: "SF",
    materialOnlyCost: 0.30,
    installedCost: 0.50,
    category: "accessories",
    description: "Concrete Sealer",
  },
];

// ─── CSI 31: Earthwork ────────────────────────────────────────────────────────

const EARTHWORK_ITEMS: CostTableEntry[] = [
  {
    id: "excavation-footing",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["excavation", "excavat", "dig", "trench"],
    excludeKeywords: ["backfill", "compact", "grade"],
    unit: "CY",
    materialOnlyCost: 12.00,
    installedCost: 12.00,
    category: "earthwork",
    description: "Excavation for Foundations",
  },
  {
    id: "excavation-pit",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["excavation", "excavat", "pit"],
    excludeKeywords: ["backfill"],
    unit: "CY",
    materialOnlyCost: 15.00,
    installedCost: 15.00,
    category: "earthwork",
    description: "Excavation for Pits",
  },
  {
    id: "excavation-ea",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["excavation", "excavat"],
    unit: "EA",
    materialOnlyCost: 150.00,
    installedCost: 150.00,
    category: "earthwork",
    description: "Excavation per EA (small footing)",
  },
  {
    id: "backfill",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["backfill", "fill"],
    excludeKeywords: ["excavat", "compact", "base course"],
    unit: "CY",
    materialOnlyCost: 12.00,
    installedCost: 12.00,
    category: "earthwork",
    description: "Backfill (structural)",
  },
  {
    id: "backfill-ea",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["backfill"],
    unit: "EA",
    materialOnlyCost: 40.00,
    installedCost: 40.00,
    category: "earthwork",
    description: "Backfill per EA (small footing)",
  },
  {
    id: "compaction",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["compact", "compaction"],
    excludeKeywords: ["base course", "backfill"],
    unit: "CY",
    materialOnlyCost: 5.00,
    installedCost: 5.00,
    category: "earthwork",
    description: "Compaction",
  },
  {
    id: "grading",
    csiDivision: "31", csiCode: "31 22 00",
    keywords: ["grading", "grade", "fine grade", "rough grade"],
    excludeKeywords: ["beam", "slab"],
    unit: "SF",
    materialOnlyCost: 0.50,
    installedCost: 0.50,
    category: "earthwork",
    description: "Grading",
  },
  {
    id: "subgrade-prep",
    csiDivision: "31", csiCode: "31 20 00",
    keywords: ["subgrade", "sub-grade", "preparation"],
    unit: "SF",
    materialOnlyCost: 0.50,
    installedCost: 0.50,
    category: "earthwork",
    description: "Subgrade Preparation",
  },
  {
    id: "base-course-31",
    csiDivision: "31", csiCode: "31 20 00",
    keywords: ["base course", "compacted base", "crushed stone", "aggregate base"],
    unit: "SF",
    materialOnlyCost: 0.75,
    installedCost: 1.10,
    category: "earthwork",
    description: "Compacted Base Course (under slab)",
  },
  {
    id: "vapor-barrier-31",
    csiDivision: "31", csiCode: "31 20 00",
    keywords: ["vapor barrier", "vapor", "moisture barrier", "poly"],
    unit: "SF",
    materialOnlyCost: 0.15,
    installedCost: 0.25,
    category: "earthwork",
    description: "Vapor Barrier (under slab)",
  },
  {
    id: "dewatering",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["dewater", "pump"],
    unit: "LS",
    materialOnlyCost: 2500.00,
    installedCost: 2500.00,
    category: "earthwork",
    description: "Dewatering (lump sum)",
  },
];

// ─── CSI 02: Existing Conditions ──────────────────────────────────────────────

const EXISTING_CONDITIONS: CostTableEntry[] = [
  {
    id: "demolition-concrete",
    csiDivision: "02", csiCode: "02 41 00",
    keywords: ["demolition", "demo", "remove", "concrete"],
    unit: "SF",
    materialOnlyCost: 3.00,
    installedCost: 3.00,
    category: "demolition",
    description: "Concrete Demolition",
  },
  {
    id: "demolition-cy",
    csiDivision: "02", csiCode: "02 41 00",
    keywords: ["demolition", "demo", "remove"],
    unit: "CY",
    materialOnlyCost: 50.00,
    installedCost: 50.00,
    category: "demolition",
    description: "Demolition per CY",
  },
  {
    id: "clearing",
    csiDivision: "02", csiCode: "02 41 00",
    keywords: ["clearing", "grubbing", "clear"],
    unit: "SF",
    materialOnlyCost: 0.25,
    installedCost: 0.25,
    category: "demolition",
    description: "Site Clearing",
  },
];

// ─── CSI 32: Exterior Improvements ───────────────────────────────────────────

const EXTERIOR_ITEMS: CostTableEntry[] = [
  {
    id: "asphalt-paving",
    csiDivision: "32", csiCode: "32 12 00",
    keywords: ["asphalt", "paving", "blacktop"],
    unit: "SF",
    materialOnlyCost: 3.50,
    installedCost: 3.50,
    category: "exterior",
    description: "Asphalt Paving",
  },
  {
    id: "concrete-sidewalk",
    csiDivision: "32", csiCode: "32 13 00",
    keywords: ["sidewalk", "walkway"],
    unit: "SF",
    materialOnlyCost: 7.00,
    installedCost: 9.00,
    category: "exterior",
    description: "Concrete Sidewalk",
  },
  {
    id: "curb",
    csiDivision: "32", csiCode: "32 16 00",
    keywords: ["curb", "curbing"],
    unit: "LF",
    materialOnlyCost: 15.00,
    installedCost: 25.00,
    category: "exterior",
    description: "Concrete Curb",
  },
  {
    id: "expansion-joint-ext",
    csiDivision: "32", csiCode: "32 13 00",
    keywords: ["expansion joint", "compressible filler", "joint"],
    unit: "LF",
    materialOnlyCost: 3.00,
    installedCost: 5.00,
    category: "exterior",
    description: "Expansion Joint (exterior)",
  },
];

// ─── Combined Export ──────────────────────────────────────────────────────────

export const COST_TABLE: CostTableEntry[] = [
  ...CONCRETE_ITEMS,
  ...FORMWORK_ITEMS,
  ...REBAR_ITEMS,
  ...CONCRETE_ACCESSORIES,
  ...EARTHWORK_ITEMS,
  ...EXISTING_CONDITIONS,
  ...EXTERIOR_ITEMS,
];

/**
 * Get all entries for a specific CSI division
 */
export function getEntriesForDivision(division: string): CostTableEntry[] {
  return COST_TABLE.filter(e => e.csiDivision === division);
}

/**
 * Get all entries for a specific category
 */
export function getEntriesForCategory(category: string): CostTableEntry[] {
  return COST_TABLE.filter(e => e.category === category);
}
