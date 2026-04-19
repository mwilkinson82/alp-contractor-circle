/**
 * ConstructLine Cost Reference Table
 * 
 * MATERIAL-ONLY unit costs for construction items (2025 pricing).
 * Sources: RSMeans 2025, supplier catalogs, industry averages.
 * 
 * PRICING PHILOSOPHY:
 * - ALL costs are MATERIAL ONLY — no labor, no installation, no overhead
 * - Concrete = ready-mix delivered to site (per CY, converted to per-unit)
 * - Rebar = fabricated bar delivered (per LF or per LB)
 * - Formwork = form lumber/plywood/hardware (per SFCA)
 * - Earthwork = equipment rental rates + fuel (per CY moved)
 * - Contractors review quantities, adjust pricing, and add their own labor/markup
 * 
 * All costs are US National Average. Regional multipliers are applied separately.
 */

export interface CostTableEntry {
  id: string;
  csiDivision: string;
  csiCode: string;
  keywords: string[];
  excludeKeywords?: string[];
  unit: string;
  /** Material cost per unit (no labor) */
  materialCost: number;
  category: string;
  description: string;
}

// ─── CSI 03: Concrete ─────────────────────────────────────────────────────────

const CONCRETE_ITEMS: CostTableEntry[] = [
  // ── Slabs ──
  // Ready-mix concrete: ~$175/CY delivered (2025 avg)
  // 4" slab = 1.23 CY per 100 SF → ~$2.15/SF material
  // + vapor barrier $0.15/SF + base course $0.75/SF + finish materials $0.25/SF
  {
    id: "slab-4in",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "4\"", "4 inch", "4-inch", "4 in"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh", "base course", "vapor", "fiber"],
    unit: "SF",
    materialCost: 3.25,  // concrete + vapor barrier + base course + finish materials
    category: "concrete",
    description: "4\" Concrete Slab-on-Grade (material: concrete + base + vapor barrier)",
  },
  {
    id: "slab-6in",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "6\"", "6 inch", "6-inch", "6 in"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh", "base course", "vapor", "fiber"],
    unit: "SF",
    materialCost: 4.25,  // 6" = 1.85 CY/100SF → $3.24/SF + base + vapor + finish
    category: "concrete",
    description: "6\" Concrete Slab-on-Grade (material: concrete + base + vapor barrier)",
  },
  {
    id: "slab-8in",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "8\"", "8 inch", "8-inch", "8 in"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh", "base course", "vapor", "fiber"],
    unit: "SF",
    materialCost: 5.50,  // 8" = 2.47 CY/100SF → $4.32/SF + base + vapor + finish
    category: "concrete",
    description: "8\" Concrete Slab-on-Grade (material: concrete + base + vapor barrier)",
  },
  {
    id: "slab-generic",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["slab", "on grade", "on-grade", "sog"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "mesh", "4\"", "6\"", "8\"", "base course", "vapor", "fiber"],
    unit: "SF",
    materialCost: 3.75,  // assume 5" avg
    category: "concrete",
    description: "Concrete Slab-on-Grade (generic thickness)",
  },

  // ── Continuous Footings ──
  // Footing concrete: volume depends on width × depth × length
  // 12"W × 6"D = 0.037 CY/LF → $6.50/LF concrete material
  // 24"W × 12"D = 0.074 CY/LF → $13.00/LF concrete material
  {
    id: "footing-12x6",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "12\"", "6\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad"],
    unit: "LF",
    materialCost: 6.50,
    category: "concrete",
    description: "Continuous Footing 12\"W × 6\"D (concrete material)",
  },
  {
    id: "footing-16x8",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "16\"", "8\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad"],
    unit: "LF",
    materialCost: 9.50,
    category: "concrete",
    description: "Continuous Footing 16\"W × 8\"D (concrete material)",
  },
  {
    id: "footing-24x12",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "continuous", "wf-", "2'-0", "2'", "24"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad"],
    unit: "LF",
    materialCost: 13.00,  // 2'W × 1'D = 0.074 CY/LF × $175/CY
    category: "concrete",
    description: "Continuous Footing 24\"W × 12\"D / WF-1 (concrete material)",
  },
  {
    id: "footing-generic",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing", "continuous"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "spread", "pad", "step"],
    unit: "LF",
    materialCost: 10.00,
    category: "concrete",
    description: "Continuous Footing (generic, concrete material)",
  },

  // ── Spread/Pad Footings ──
  // Typical 5'×5'×1' = 0.93 CY → ~$163 concrete material
  {
    id: "spread-footing",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["spread footing", "pad footing", "isolated footing", "f-1", "f-2"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "EA",
    materialCost: 175.00,
    category: "concrete",
    description: "Spread/Pad Footing (concrete material each)",
  },

  // ── Stem Walls / Foundation Walls ──
  // 8" thick × 4' tall = 0.099 CY/LF → $17.30/LF concrete
  // 12" thick × 4' tall = 0.148 CY/LF → $25.90/LF concrete
  {
    id: "stem-wall",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["stem wall", "stemwall", "foundation wall"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "cmu", "block"],
    unit: "LF",
    materialCost: 22.00,  // avg 10" thick × 4' tall
    category: "concrete",
    description: "Cast-in-Place Foundation Stem Wall (concrete material)",
  },
  {
    id: "stem-wall-cmu",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["stem wall", "cmu", "block", "masonry"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "LF",
    materialCost: 32.00,  // CMU blocks + mortar + grout fill per LF
    category: "concrete",
    description: "CMU Foundation Stem Wall (block + mortar + grout material)",
  },

  // ── Grade Beams ──
  {
    id: "grade-beam",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["grade beam"],
    excludeKeywords: ["formwork", "rebar", "reinforc"],
    unit: "LF",
    materialCost: 15.00,
    category: "concrete",
    description: "Concrete Grade Beam (concrete material)",
  },

  // ── Piers/Columns ──
  {
    id: "pier-small",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["pier", "column", "12\"", "14\"", "16\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "anchor"],
    unit: "EA",
    materialCost: 85.00,  // ~0.5 CY concrete + sonotube
    category: "concrete",
    description: "Concrete Pier 12\"-16\" diameter (concrete + tube material)",
  },
  {
    id: "pier-large",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["pier", "column", "18\"", "20\"", "24\""],
    excludeKeywords: ["formwork", "rebar", "reinforc", "anchor"],
    unit: "EA",
    materialCost: 165.00,  // ~1 CY concrete + sonotube
    category: "concrete",
    description: "Concrete Pier 18\"-24\" diameter (concrete + tube material)",
  },

  // ── Trench/Pit Concrete ──
  {
    id: "trench-pit-lf",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["trench pit", "trench", "pit"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "drain", "excavat", "backfill"],
    unit: "LF",
    materialCost: 35.00,  // walls + base concrete per LF
    category: "concrete",
    description: "Concrete Trench Pit (concrete material per LF)",
  },
  {
    id: "trench-pit-cy",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["trench pit", "trench", "pit", "concrete"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "drain", "excavat", "backfill"],
    unit: "CY",
    materialCost: 175.00,  // ready-mix per CY
    category: "concrete",
    description: "Concrete for Trench/Pit (ready-mix per CY)",
  },
  {
    id: "trench-drain-foundation",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["trench drain", "drain foundation"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "pre-fab", "prefab", "excavat"],
    unit: "LF",
    materialCost: 28.00,
    category: "concrete",
    description: "Concrete Trench Drain Foundation (concrete material)",
  },
  {
    id: "trench-drain-prefab",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["trench drain", "pre-fabricated", "prefab", "pre-fab"],
    excludeKeywords: ["foundation", "formwork", "rebar"],
    unit: "LF",
    materialCost: 55.00,  // prefab channel + grate
    category: "concrete",
    description: "Pre-fabricated Trench Drain (channel + grate material)",
  },

  // ── Correlator/Drainage Pits ──
  {
    id: "concrete-pit-cy",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["correlator", "drainage pit", "catch basin", "sump", "tire seal"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "excavat", "backfill"],
    unit: "CY",
    materialCost: 175.00,
    category: "concrete",
    description: "Concrete for Pit/Basin (ready-mix per CY)",
  },
  {
    id: "concrete-pit-ea",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["correlator", "drainage pit", "catch basin", "sump", "tire seal"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "excavat", "backfill"],
    unit: "EA",
    materialCost: 850.00,  // ~5 CY concrete material
    category: "concrete",
    description: "Concrete Pit (material each)",
  },

  // ── Bollard/Gate Post Footings ──
  // Typical 2'×2'×2.5' = 0.37 CY → ~$65 concrete material
  {
    id: "bollard-footing",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["bollard", "post footing", "gate post", "pole foundation", "equipment pole"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "excavat"],
    unit: "EA",
    materialCost: 75.00,
    category: "concrete",
    description: "Bollard/Post Footing (concrete material each)",
  },

  // ── Concrete by CY (generic fallback) ──
  {
    id: "concrete-cy",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["concrete"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "slab", "footing", "wall", "beam", "pier", "trench", "pit", "bollard", "anchor", "base course", "fiber"],
    unit: "CY",
    materialCost: 175.00,  // ready-mix delivered, national avg 2025
    category: "concrete",
    description: "Concrete ready-mix (per CY delivered)",
  },

  // ── Curbs ──
  {
    id: "concrete-curb",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["curb"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "gutter"],
    unit: "LF",
    materialCost: 8.50,  // concrete material for typical 6"×18" curb
    category: "concrete",
    description: "Concrete Curb (concrete material per LF)",
  },

  // ── Construction Joints ──
  {
    id: "construction-joint",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["construction joint", "dowel", "sleeve"],
    excludeKeywords: ["expansion", "control"],
    unit: "LF",
    materialCost: 4.50,  // dowels + sleeve material
    category: "accessories",
    description: "Construction Joint with Dowels (material)",
  },

  // ── Expansion Joints ──
  {
    id: "expansion-joint",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["expansion joint", "compressible filler"],
    unit: "LF",
    materialCost: 3.00,  // filler board + sealant
    category: "accessories",
    description: "Expansion Joint (filler + sealant material)",
  },

  // ── Control Joints ──
  {
    id: "control-joint",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["control joint", "saw cut", "sawcut"],
    unit: "LF",
    materialCost: 1.50,  // blade wear + sealant
    category: "accessories",
    description: "Control Joint / Saw Cut (material)",
  },

  // ── Footing Step ──
  {
    id: "footing-step",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["footing step", "step"],
    excludeKeywords: ["formwork", "rebar"],
    unit: "EA",
    materialCost: 35.00,  // additional concrete for step
    category: "concrete",
    description: "Footing Step (additional concrete material)",
  },

  // ── Anchor/Embed ──
  {
    id: "anchor-rod",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["anchor", "anchor rod", "anchor bolt", "embed", "column anchor"],
    unit: "EA",
    materialCost: 45.00,  // anchor bolt assembly
    category: "accessories",
    description: "Anchor Rod / Embed (hardware material)",
  },

  // ── Pipe Sleeve ──
  {
    id: "pipe-sleeve",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["pipe sleeve", "sleeve", "penetration", "pvc pipe", "insulation"],
    unit: "EA",
    materialCost: 18.00,  // PVC sleeve + insulation material
    category: "accessories",
    description: "Pipe Sleeve Through Foundation (PVC + insulation material)",
  },
  {
    id: "pipe-sleeve-lf",
    csiDivision: "03", csiCode: "03 15 00",
    keywords: ["pipe sleeve", "pvc pipe", "pipe under"],
    unit: "LF",
    materialCost: 8.50,  // PVC pipe + insulation per LF
    category: "accessories",
    description: "PVC Pipe Sleeve (material per LF)",
  },

  // ── Concrete Specialty Items ──
  {
    id: "tire-switch-indentation",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["tire switch", "tire indentation", "tire seal", "indentation"],
    unit: "EA",
    materialCost: 45.00,  // form material + concrete for recessed indentation
    category: "concrete",
    description: "Concrete Tire Switch Indentation (form + concrete material)",
  },
  {
    id: "concrete-bollard-fill",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["bollard", "pipe fill", "concrete fill"],
    excludeKeywords: ["footing", "foundation", "formwork", "rebar"],
    unit: "CY",
    materialCost: 175.00,
    category: "concrete",
    description: "Concrete Fill for Bollard (ready-mix per CY)",
  },
  {
    id: "non-shrink-grout",
    csiDivision: "03", csiCode: "03 60 00",
    keywords: ["non-shrink grout", "grout", "column grout", "anchor grout"],
    unit: "EA",
    materialCost: 35.00,  // bag of non-shrink grout per anchor location
    category: "accessories",
    description: "Non-Shrink Grout at Column Anchor (material per location)",
  },

  // ── Enclosure Foundations (vacuum, dumpster, etc.) ──
  {
    id: "enclosure-foundation-cy",
    csiDivision: "03", csiCode: "03 30 00",
    keywords: ["enclosure", "vacuum", "dumpster", "foundation"],
    excludeKeywords: ["formwork", "rebar", "reinforc", "excavat", "backfill"],
    unit: "CY",
    materialCost: 175.00,
    category: "concrete",
    description: "Enclosure Foundation (concrete material per CY)",
  },
];

// ─── CSI 03 10: Formwork ──────────────────────────────────────────────────────

const FORMWORK_ITEMS: CostTableEntry[] = [
  {
    id: "formwork-footing",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form", "footing"],
    unit: "SFCA",
    materialCost: 3.50,  // plywood + lumber + hardware + ties, reusable
    category: "formwork",
    description: "Formwork for Footings (lumber/plywood material)",
  },
  {
    id: "formwork-wall",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form", "wall", "stem"],
    unit: "SFCA",
    materialCost: 4.50,  // taller forms need more bracing
    category: "formwork",
    description: "Formwork for Walls (lumber/plywood material)",
  },
  {
    id: "formwork-slab-edge",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form", "slab", "edge"],
    unit: "LF",
    materialCost: 2.75,  // edge form lumber
    category: "formwork",
    description: "Formwork for Slab Edge (lumber material)",
  },
  {
    id: "formwork-pit",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form", "pit", "trench"],
    unit: "SFCA",
    materialCost: 5.00,  // complex forming
    category: "formwork",
    description: "Formwork for Pits/Trenches (lumber/plywood material)",
  },
  {
    id: "formwork-pier",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form", "pier", "column", "sonotube"],
    unit: "SFCA",
    materialCost: 4.00,  // sonotube or round forms
    category: "formwork",
    description: "Formwork for Piers/Columns (tube/form material)",
  },
  {
    id: "formwork-generic",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form"],
    unit: "SFCA",
    materialCost: 3.75,
    category: "formwork",
    description: "Formwork (generic, lumber/plywood material)",
  },
  {
    id: "formwork-lf",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form"],
    unit: "LF",
    materialCost: 5.50,  // per LF of form run
    category: "formwork",
    description: "Formwork per LF (material)",
  },
  {
    id: "formwork-ea",
    csiDivision: "03", csiCode: "03 11 00",
    keywords: ["formwork", "form"],
    unit: "EA",
    materialCost: 25.00,  // small footing form set
    category: "formwork",
    description: "Formwork per EA (bollard/post form material)",
  },
];

// ─── CSI 03 20: Reinforcing ──────────────────────────────────────────────────

const REBAR_ITEMS: CostTableEntry[] = [
  // Rebar prices: fabricated, delivered to site (2025 avg)
  // #3 = 0.376 lb/ft × $0.85/lb = $0.32/LF material... but with fab + delivery ~$0.85/LF
  {
    id: "rebar-3",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#3", "rebar", "reinforc"],
    unit: "LF",
    materialCost: 0.85,
    category: "rebar",
    description: "#3 Rebar (fabricated, delivered)",
  },
  {
    id: "rebar-4",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#4", "rebar", "reinforc"],
    unit: "LF",
    materialCost: 1.15,
    category: "rebar",
    description: "#4 Rebar (fabricated, delivered)",
  },
  {
    id: "rebar-5",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#5", "rebar", "reinforc"],
    unit: "LF",
    materialCost: 1.50,
    category: "rebar",
    description: "#5 Rebar (fabricated, delivered)",
  },
  {
    id: "rebar-6",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["#6", "rebar", "reinforc"],
    unit: "LF",
    materialCost: 2.00,
    category: "rebar",
    description: "#6 Rebar (fabricated, delivered)",
  },
  {
    id: "rebar-generic",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["rebar", "reinforc", "steel"],
    excludeKeywords: ["#3", "#4", "#5", "#6", "structural", "mesh", "fiber", "macro"],
    unit: "LF",
    materialCost: 1.25,
    category: "rebar",
    description: "Rebar (generic size, fabricated delivered)",
  },
  {
    id: "rebar-lb",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["rebar", "reinforc", "steel"],
    unit: "LB",
    materialCost: 0.85,  // per pound fabricated delivered
    category: "rebar",
    description: "Rebar per LB (fabricated, delivered)",
  },
  {
    id: "rebar-ea",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["rebar", "reinforc", "steel"],
    unit: "EA",
    materialCost: 35.00,  // rebar cage for small footing
    category: "rebar",
    description: "Rebar cage per EA (bollard/post)",
  },
  {
    id: "wwf-mesh",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["mesh", "wwf", "welded wire", "wire fabric"],
    unit: "SF",
    materialCost: 0.35,
    category: "rebar",
    description: "Welded Wire Fabric / Mesh (material)",
  },
  {
    id: "fiber-reinforcing",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["fiber", "macro-synthetic", "micro-synthetic", "polypropylene"],
    unit: "SF",
    materialCost: 0.45,  // fiber additive per SF of slab
    category: "rebar",
    description: "Fiber Reinforcing (macro/micro synthetic, per SF of slab)",
  },
  {
    id: "fiber-reinforcing-lb",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["fiber", "macro-synthetic", "micro-synthetic", "polypropylene"],
    unit: "LB",
    materialCost: 1.25,  // per pound of fiber
    category: "rebar",
    description: "Fiber Reinforcing (per LB)",
  },
  {
    id: "rebar-ties",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["ties", "stirrup"],
    unit: "LF",
    materialCost: 0.75,
    category: "rebar",
    description: "Rebar Ties/Stirrups (material)",
  },
  {
    id: "dowels",
    csiDivision: "03", csiCode: "03 20 00",
    keywords: ["dowel"],
    unit: "LF",
    materialCost: 1.10,
    category: "rebar",
    description: "Rebar Dowels (material)",
  },
];

// ─── CSI 03 05: Concrete Accessories ──────────────────────────────────────────

const CONCRETE_ACCESSORIES: CostTableEntry[] = [
  {
    id: "vapor-barrier",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["vapor barrier", "vapor", "moisture barrier", "poly", "6 mil", "10 mil", "15 mil"],
    unit: "SF",
    materialCost: 0.12,  // polyethylene sheeting
    category: "accessories",
    description: "Vapor Barrier (6-15 mil poly sheeting)",
  },
  {
    id: "base-course-sf",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["base course", "compacted base", "crushed stone", "aggregate base", "abc"],
    excludeKeywords: ["trench", "pit", "drain"],
    unit: "SF",
    materialCost: 0.85,  // 4-6" crushed stone material per SF
    category: "accessories",
    description: "Compacted Base Course 4\"-6\" (aggregate material per SF)",
  },
  {
    id: "base-course-ea",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["base course", "compacted base"],
    unit: "EA",
    materialCost: 125.00,  // base course for a small pit/trench section
    category: "accessories",
    description: "Compacted Base Course (lump material for small area)",
  },
  {
    id: "base-course-ls",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["base course", "compacted base"],
    unit: "LS",
    materialCost: 500.00,  // lump sum base course for misc areas
    category: "accessories",
    description: "Compacted Base Course (lump sum)",
  },
  {
    id: "curing-compound",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["curing", "cure", "compound"],
    unit: "SF",
    materialCost: 0.12,
    category: "accessories",
    description: "Curing Compound (material)",
  },
  {
    id: "concrete-sealer",
    csiDivision: "03", csiCode: "03 05 00",
    keywords: ["sealer", "seal"],
    excludeKeywords: ["joint", "expansion", "tire"],
    unit: "SF",
    materialCost: 0.25,
    category: "accessories",
    description: "Concrete Sealer (material)",
  },
];

// ─── CSI 31: Earthwork ────────────────────────────────────────────────────────

const EARTHWORK_ITEMS: CostTableEntry[] = [
  // Earthwork = equipment + fuel + operator (no separate labor line)
  // Excavation: $8-15/CY depending on depth and access
  {
    id: "excavation-footing",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["excavation", "excavat", "dig", "trench"],
    excludeKeywords: ["backfill", "compact", "grade"],
    unit: "CY",
    materialCost: 12.00,  // equipment + fuel for foundation excavation
    category: "earthwork",
    description: "Excavation for Foundations (equipment cost per CY)",
  },
  {
    id: "excavation-pit",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["excavation", "excavat", "pit"],
    excludeKeywords: ["backfill"],
    unit: "CY",
    materialCost: 15.00,  // deeper/more complex
    category: "earthwork",
    description: "Excavation for Pits (equipment cost per CY)",
  },
  {
    id: "excavation-ea",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["excavation", "excavat"],
    unit: "EA",
    materialCost: 125.00,
    category: "earthwork",
    description: "Excavation per EA (small footing)",
  },
  {
    id: "backfill-cy",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["backfill", "fill"],
    excludeKeywords: ["excavat", "compact", "base course"],
    unit: "CY",
    materialCost: 10.00,  // fill material + equipment
    category: "earthwork",
    description: "Backfill (material + equipment per CY)",
  },
  {
    id: "backfill-ea",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["backfill"],
    unit: "EA",
    materialCost: 35.00,
    category: "earthwork",
    description: "Backfill per EA (small footing)",
  },
  {
    id: "compaction",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["compact", "compaction"],
    excludeKeywords: ["base course", "backfill"],
    unit: "CY",
    materialCost: 4.00,  // equipment rental per CY
    category: "earthwork",
    description: "Compaction (equipment cost per CY)",
  },
  {
    id: "grading",
    csiDivision: "31", csiCode: "31 22 00",
    keywords: ["grading", "grade", "fine grade", "rough grade"],
    excludeKeywords: ["beam", "slab"],
    unit: "SF",
    materialCost: 0.40,
    category: "earthwork",
    description: "Grading (equipment cost per SF)",
  },
  {
    id: "subgrade-prep",
    csiDivision: "31", csiCode: "31 20 00",
    keywords: ["subgrade", "sub-grade", "preparation"],
    unit: "SF",
    materialCost: 0.40,
    category: "earthwork",
    description: "Subgrade Preparation (equipment cost per SF)",
  },
  {
    id: "base-course-31",
    csiDivision: "31", csiCode: "31 20 00",
    keywords: ["base course", "compacted base", "crushed stone", "aggregate base"],
    unit: "SF",
    materialCost: 0.85,
    category: "earthwork",
    description: "Compacted Base Course (aggregate material per SF)",
  },
  {
    id: "vapor-barrier-31",
    csiDivision: "31", csiCode: "31 20 00",
    keywords: ["vapor barrier", "vapor", "moisture barrier", "poly"],
    unit: "SF",
    materialCost: 0.12,
    category: "earthwork",
    description: "Vapor Barrier (poly sheeting material)",
  },
  {
    id: "dewatering",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["dewater", "pump"],
    unit: "LS",
    materialCost: 1500.00,
    category: "earthwork",
    description: "Dewatering (equipment rental lump sum)",
  },
  {
    id: "hauling-disposal",
    csiDivision: "31", csiCode: "31 23 00",
    keywords: ["haul", "disposal", "spoil", "waste"],
    unit: "CY",
    materialCost: 18.00,  // trucking + dump fees
    category: "earthwork",
    description: "Hauling & Disposal (trucking + dump fees per CY)",
  },
  {
    id: "geotextile-fabric",
    csiDivision: "31", csiCode: "31 05 19",
    keywords: ["geotextile", "filter fabric", "woven fabric", "non-woven", "separation fabric"],
    unit: "SF",
    materialCost: 0.60,  // woven/non-woven geotextile material per SF
    category: "earthwork",
    description: "Geotextile Fabric (separation/filter fabric material per SF)",
  },
  {
    id: "erosion-control",
    csiDivision: "31", csiCode: "31 25 00",
    keywords: ["erosion control", "silt fence", "hay bale", "straw wattle"],
    unit: "LF",
    materialCost: 2.50,
    category: "earthwork",
    description: "Erosion Control (silt fence material per LF)",
  },
];

// ─── CSI 02: Existing Conditions ──────────────────────────────────────────────

const EXISTING_CONDITIONS: CostTableEntry[] = [
  {
    id: "demolition-concrete",
    csiDivision: "02", csiCode: "02 41 00",
    keywords: ["demolition", "demo", "remove", "concrete"],
    unit: "SF",
    materialCost: 2.50,  // equipment cost for concrete removal
    category: "demolition",
    description: "Concrete Demolition (equipment cost per SF)",
  },
  {
    id: "demolition-cy",
    csiDivision: "02", csiCode: "02 41 00",
    keywords: ["demolition", "demo", "remove"],
    unit: "CY",
    materialCost: 40.00,
    category: "demolition",
    description: "Demolition per CY (equipment cost)",
  },
  {
    id: "clearing",
    csiDivision: "02", csiCode: "02 41 00",
    keywords: ["clearing", "grubbing", "clear"],
    unit: "SF",
    materialCost: 0.20,
    category: "demolition",
    description: "Site Clearing (equipment cost per SF)",
  },
];

// ─── CSI 32: Exterior Improvements ───────────────────────────────────────────

const EXTERIOR_ITEMS: CostTableEntry[] = [
  {
    id: "asphalt-paving",
    csiDivision: "32", csiCode: "32 12 00",
    keywords: ["asphalt", "paving", "blacktop"],
    unit: "SF",
    materialCost: 2.50,  // asphalt material per SF
    category: "exterior",
    description: "Asphalt Paving (material per SF)",
  },
  {
    id: "concrete-sidewalk",
    csiDivision: "32", csiCode: "32 13 00",
    keywords: ["sidewalk", "walkway"],
    unit: "SF",
    materialCost: 4.50,  // concrete material for 4" sidewalk
    category: "exterior",
    description: "Concrete Sidewalk (material per SF)",
  },
  {
    id: "curb-exterior",
    csiDivision: "32", csiCode: "32 16 00",
    keywords: ["curb", "curbing"],
    unit: "LF",
    materialCost: 8.50,  // concrete material for curb
    category: "exterior",
    description: "Concrete Curb (material per LF)",
  },
  {
    id: "expansion-joint-ext",
    csiDivision: "32", csiCode: "32 13 00",
    keywords: ["expansion joint", "compressible filler", "joint"],
    unit: "LF",
    materialCost: 2.50,
    category: "exterior",
    description: "Expansion Joint (filler material per LF)",
  },
];

// ─── CSI 01: General Requirements ────────────────────────────────────────────
const GENERAL_REQUIREMENTS: CostTableEntry[] = [
  { id: "temp-fence", csiDivision: "01", csiCode: "01 50 00", keywords: ["temporary fence", "temp fence", "chain link fence temp"], unit: "LF", materialCost: 4.50, category: "general", description: "Temporary Chain Link Fence (material per LF)" },
  { id: "temp-toilet", csiDivision: "01", csiCode: "01 50 00", keywords: ["portable toilet", "porta potty", "temporary toilet", "sanitary facility"], unit: "MO", materialCost: 185.00, category: "general", description: "Portable Toilet Rental (per month)" },
  { id: "temp-power", csiDivision: "01", csiCode: "01 50 00", keywords: ["temporary power", "temp power", "construction power"], unit: "MO", materialCost: 350.00, category: "general", description: "Temporary Power Service (per month)" },
  { id: "temp-water", csiDivision: "01", csiCode: "01 50 00", keywords: ["temporary water", "temp water", "construction water"], unit: "MO", materialCost: 120.00, category: "general", description: "Temporary Water Service (per month)" },
  { id: "dumpster", csiDivision: "01", csiCode: "01 74 00", keywords: ["dumpster", "debris box", "waste container", "trash haul"], unit: "EA", materialCost: 450.00, category: "general", description: "Dumpster Rental/Haul (per pull)" },
  { id: "construction-sign", csiDivision: "01", csiCode: "01 50 00", keywords: ["construction sign", "project sign", "job sign"], unit: "EA", materialCost: 275.00, category: "general", description: "Construction Sign (material per EA)" },
  { id: "safety-netting", csiDivision: "01", csiCode: "01 50 00", keywords: ["safety net", "debris net", "fall protection net"], unit: "SF", materialCost: 0.85, category: "general", description: "Safety/Debris Netting (material per SF)" },
  { id: "barricade", csiDivision: "01", csiCode: "01 50 00", keywords: ["barricade", "jersey barrier", "concrete barrier", "k-rail"], unit: "LF", materialCost: 18.00, category: "general", description: "Concrete Barricade/K-Rail (material per LF)" },
];

// ─── CSI 04: Masonry ──────────────────────────────────────────────────────────
const MASONRY_ITEMS: CostTableEntry[] = [
  { id: "cmu-8in", csiDivision: "04", csiCode: "04 22 00", keywords: ["cmu", "concrete masonry", "block wall", "8\" block", "8 inch block", "concrete block"], unit: "SF", materialCost: 3.85, category: "masonry", description: "8\" CMU Block Wall (material per SF)" },
  { id: "cmu-12in", csiDivision: "04", csiCode: "04 22 00", keywords: ["12\" cmu", "12 inch block", "12\" block"], unit: "SF", materialCost: 5.25, category: "masonry", description: "12\" CMU Block Wall (material per SF)" },
  { id: "cmu-6in", csiDivision: "04", csiCode: "04 22 00", keywords: ["6\" cmu", "6 inch block", "6\" block"], unit: "SF", materialCost: 3.10, category: "masonry", description: "6\" CMU Block Wall (material per SF)" },
  { id: "brick-veneer", csiDivision: "04", csiCode: "04 21 00", keywords: ["brick veneer", "face brick", "brick wall", "brick facade"], unit: "SF", materialCost: 8.50, category: "masonry", description: "Brick Veneer (material per SF)" },
  { id: "mortar", csiDivision: "04", csiCode: "04 05 00", keywords: ["mortar", "grout", "masonry grout"], unit: "CF", materialCost: 12.00, category: "masonry", description: "Mortar/Grout (material per CF)" },
  { id: "masonry-reinforcing", csiDivision: "04", csiCode: "04 05 00", keywords: ["masonry reinforc", "horizontal rebar", "joint reinforc", "ladder wire"], unit: "LF", materialCost: 0.65, category: "masonry", description: "Masonry Joint Reinforcing (material per LF)" },
  { id: "cmu-fill-grout", csiDivision: "04", csiCode: "04 22 00", keywords: ["cmu fill", "grout fill", "solid grout", "fill cells"], unit: "CF", materialCost: 14.50, category: "masonry", description: "CMU Cell Grout Fill (material per CF)" },
  { id: "stone-veneer", csiDivision: "04", csiCode: "04 43 00", keywords: ["stone veneer", "natural stone", "cultured stone", "stone cladding"], unit: "SF", materialCost: 22.00, category: "masonry", description: "Stone Veneer (material per SF)" },
  { id: "lintel", csiDivision: "04", csiCode: "04 05 00", keywords: ["lintel", "masonry lintel", "steel lintel"], unit: "LF", materialCost: 18.50, category: "masonry", description: "Steel Lintel for Masonry (material per LF)" },
];

// ─── CSI 05: Metals ───────────────────────────────────────────────────────────
const METALS_ITEMS: CostTableEntry[] = [
  { id: "structural-steel", csiDivision: "05", csiCode: "05 12 00", keywords: ["structural steel", "wide flange", "w-beam", "steel beam", "steel column", "hss"], unit: "LB", materialCost: 1.45, category: "metals", description: "Structural Steel (material per LB)" },
  { id: "steel-joist", csiDivision: "05", csiCode: "05 21 00", keywords: ["steel joist", "open web joist", "bar joist", "lh joist", "dlh joist"], unit: "LB", materialCost: 1.65, category: "metals", description: "Steel Joist (material per LB)" },
  { id: "metal-deck", csiDivision: "05", csiCode: "05 31 00", keywords: ["metal deck", "steel deck", "roof deck", "floor deck", "composite deck"], unit: "SF", materialCost: 3.85, category: "metals", description: "Metal Deck (material per SF)" },
  { id: "steel-stud-framing", csiDivision: "05", csiCode: "05 41 00", keywords: ["steel stud", "metal stud", "light gauge", "cold formed"], unit: "SF", materialCost: 2.25, category: "metals", description: "Light Gauge Steel Stud Framing (material per SF)" },
  { id: "anchor-bolt", csiDivision: "05", csiCode: "05 05 00", keywords: ["anchor bolt", "anchor rod", "embed", "cast-in anchor"], unit: "EA", materialCost: 8.50, category: "metals", description: "Anchor Bolt (material per EA)" },
  { id: "steel-angle", csiDivision: "05", csiCode: "05 12 00", keywords: ["steel angle", "angle iron", "angle support"], unit: "LB", materialCost: 1.35, category: "metals", description: "Steel Angle (material per LB)" },
  { id: "steel-plate", csiDivision: "05", csiCode: "05 12 00", keywords: ["steel plate", "base plate", "bearing plate", "gusset plate"], unit: "LB", materialCost: 1.55, category: "metals", description: "Steel Plate (material per LB)" },
  { id: "metal-railing", csiDivision: "05", csiCode: "05 52 00", keywords: ["metal railing", "steel railing", "pipe railing", "handrail", "guardrail"], unit: "LF", materialCost: 38.00, category: "metals", description: "Metal Pipe Railing (material per LF)" },
  { id: "metal-stair", csiDivision: "05", csiCode: "05 51 00", keywords: ["metal stair", "steel stair", "prefab stair"], unit: "RISER", materialCost: 185.00, category: "metals", description: "Metal Stair (material per riser)" },
  { id: "grating", csiDivision: "05", csiCode: "05 53 00", keywords: ["grating", "bar grating", "steel grating", "floor grating"], unit: "SF", materialCost: 28.00, category: "metals", description: "Steel Bar Grating (material per SF)" },
];

// ─── CSI 06: Wood, Plastics & Composites ─────────────────────────────────────
const WOOD_ITEMS: CostTableEntry[] = [
  { id: "lumber-framing", csiDivision: "06", csiCode: "06 11 00", keywords: ["lumber", "wood framing", "stud framing", "2x4", "2x6", "2x8", "dimensional lumber"], unit: "BF", materialCost: 1.15, category: "wood", description: "Framing Lumber (material per BF)" },
  { id: "plywood-sheathing", csiDivision: "06", csiCode: "06 16 00", keywords: ["plywood", "sheathing", "osb", "oriented strand board"], unit: "SF", materialCost: 1.45, category: "wood", description: "Plywood/OSB Sheathing (material per SF)" },
  { id: "engineered-lumber", csiDivision: "06", csiCode: "06 17 00", keywords: ["lvl", "lsl", "psl", "engineered lumber", "laminated veneer", "glulam", "glued laminated"], unit: "LF", materialCost: 18.50, category: "wood", description: "Engineered Lumber/LVL (material per LF)" },
  { id: "wood-blocking", csiDivision: "06", csiCode: "06 11 00", keywords: ["blocking", "wood blocking", "nailer", "wood nailer"], unit: "LF", materialCost: 1.85, category: "wood", description: "Wood Blocking/Nailer (material per LF)" },
  { id: "wood-trusses", csiDivision: "06", csiCode: "06 17 53", keywords: ["wood truss", "roof truss", "floor truss", "pre-engineered truss"], unit: "SF", materialCost: 4.25, category: "wood", description: "Wood Roof/Floor Truss (material per SF)" },
  { id: "wood-decking", csiDivision: "06", csiCode: "06 15 00", keywords: ["wood decking", "timber decking", "heavy timber deck"], unit: "SF", materialCost: 6.50, category: "wood", description: "Wood Decking (material per SF)" },
  { id: "finish-carpentry", csiDivision: "06", csiCode: "06 22 00", keywords: ["finish carpentry", "trim", "millwork", "casing", "base molding"], unit: "LF", materialCost: 3.50, category: "wood", description: "Finish Carpentry/Trim (material per LF)" },
  { id: "wood-door-frame", csiDivision: "06", csiCode: "06 22 00", keywords: ["door frame", "door buck", "wood door frame"], unit: "EA", materialCost: 85.00, category: "wood", description: "Wood Door Frame (material per EA)" },
];

// ─── CSI 07: Thermal & Moisture Protection ────────────────────────────────────
const THERMAL_ITEMS: CostTableEntry[] = [
  { id: "batt-insulation", csiDivision: "07", csiCode: "07 21 00", keywords: ["batt insulation", "fiberglass batt", "r-13", "r-19", "r-21", "r-30", "r-38", "wall insulation"], unit: "SF", materialCost: 0.85, category: "thermal", description: "Batt Insulation (material per SF)" },
  { id: "rigid-insulation", csiDivision: "07", csiCode: "07 21 00", keywords: ["rigid insulation", "foam board", "xps", "eps", "polyiso", "rigid foam"], unit: "SF", materialCost: 1.25, category: "thermal", description: "Rigid Foam Insulation (material per SF)" },
  { id: "spray-foam", csiDivision: "07", csiCode: "07 21 29", keywords: ["spray foam", "spray polyurethane", "spf", "closed cell", "open cell foam"], unit: "SF", materialCost: 2.85, category: "thermal", description: "Spray Foam Insulation (material per SF)" },
  { id: "waterproofing-membrane", csiDivision: "07", csiCode: "07 13 00", keywords: ["waterproofing", "waterproof membrane", "below grade waterproof", "foundation waterproof"], unit: "SF", materialCost: 1.85, category: "thermal", description: "Waterproofing Membrane (material per SF)" },
  { id: "roofing-tpo", csiDivision: "07", csiCode: "07 54 00", keywords: ["tpo", "tpo roofing", "thermoplastic roofing", "single ply roof"], unit: "SF", materialCost: 2.25, category: "thermal", description: "TPO Roofing Membrane (material per SF)" },
  { id: "roofing-epdm", csiDivision: "07", csiCode: "07 53 00", keywords: ["epdm", "epdm roofing", "rubber roofing"], unit: "SF", materialCost: 1.95, category: "thermal", description: "EPDM Roofing Membrane (material per SF)" },
  { id: "roofing-asphalt-shingle", csiDivision: "07", csiCode: "07 31 13", keywords: ["asphalt shingle", "composition shingle", "shingle roofing", "architectural shingle"], unit: "SQ", materialCost: 145.00, category: "thermal", description: "Asphalt Shingles (material per SQ = 100 SF)" },
  { id: "roofing-metal", csiDivision: "07", csiCode: "07 41 00", keywords: ["metal roofing", "standing seam", "metal roof panel", "corrugated metal roof"], unit: "SF", materialCost: 4.50, category: "thermal", description: "Metal Roofing (material per SF)" },
  { id: "flashing", csiDivision: "07", csiCode: "07 62 00", keywords: ["flashing", "sheet metal flashing", "counterflashing", "base flashing"], unit: "LF", materialCost: 8.50, category: "thermal", description: "Sheet Metal Flashing (material per LF)" },
  { id: "vapor-retarder", csiDivision: "07", csiCode: "07 26 00", keywords: ["vapor barrier", "vapor retarder", "poly sheeting", "6 mil poly"], unit: "SF", materialCost: 0.18, category: "thermal", description: "Vapor Retarder/Poly Sheeting (material per SF)" },
  { id: "building-wrap", csiDivision: "07", csiCode: "07 25 00", keywords: ["building wrap", "house wrap", "weather barrier", "tyvek"], unit: "SF", materialCost: 0.22, category: "thermal", description: "Building Wrap/House Wrap (material per SF)" },
  { id: "sealant-caulk", csiDivision: "07", csiCode: "07 92 00", keywords: ["sealant", "caulk", "joint sealant", "silicone sealant", "urethane sealant"], unit: "LF", materialCost: 1.85, category: "thermal", description: "Joint Sealant/Caulk (material per LF)" },
  { id: "roof-drain", csiDivision: "07", csiCode: "07 72 00", keywords: ["roof drain", "overflow drain", "area drain"], unit: "EA", materialCost: 185.00, category: "thermal", description: "Roof Drain (material per EA)" },
];

// ─── CSI 08: Openings ─────────────────────────────────────────────────────────
const OPENINGS_ITEMS: CostTableEntry[] = [
  { id: "hollow-metal-door", csiDivision: "08", csiCode: "08 11 13", keywords: ["hollow metal door", "hm door", "steel door", "metal door"], unit: "EA", materialCost: 485.00, category: "openings", description: "Hollow Metal Door (material per EA)" },
  { id: "wood-door", csiDivision: "08", csiCode: "08 14 00", keywords: ["wood door", "solid core door", "flush door", "interior door"], unit: "EA", materialCost: 285.00, category: "openings", description: "Wood Flush Door (material per EA)" },
  { id: "storefront", csiDivision: "08", csiCode: "08 44 00", keywords: ["storefront", "curtain wall", "aluminum storefront", "glass storefront"], unit: "SF", materialCost: 85.00, category: "openings", description: "Aluminum Storefront System (material per SF)" },
  { id: "aluminum-window", csiDivision: "08", csiCode: "08 51 13", keywords: ["aluminum window", "window", "casement window", "double hung", "fixed window"], unit: "SF", materialCost: 45.00, category: "openings", description: "Aluminum Window (material per SF)" },
  { id: "overhead-door", csiDivision: "08", csiCode: "08 36 13", keywords: ["overhead door", "garage door", "roll-up door", "sectional door"], unit: "EA", materialCost: 1850.00, category: "openings", description: "Overhead Sectional Door (material per EA)" },
  { id: "door-hardware", csiDivision: "08", csiCode: "08 71 00", keywords: ["door hardware", "lockset", "door knob", "lever handle", "panic bar", "exit device"], unit: "EA", materialCost: 185.00, category: "openings", description: "Door Hardware Set (material per EA)" },
  { id: "door-frame-hm", csiDivision: "08", csiCode: "08 11 13", keywords: ["hollow metal frame", "hm frame", "steel door frame", "metal door frame"], unit: "EA", materialCost: 225.00, category: "openings", description: "Hollow Metal Door Frame (material per EA)" },
  { id: "glass-glazing", csiDivision: "08", csiCode: "08 81 00", keywords: ["glass", "glazing", "insulated glass", "igi", "tempered glass", "laminated glass"], unit: "SF", materialCost: 18.50, category: "openings", description: "Insulated Glass Unit (material per SF)" },
  { id: "skylight", csiDivision: "08", csiCode: "08 62 00", keywords: ["skylight", "roof window", "roof light"], unit: "EA", materialCost: 850.00, category: "openings", description: "Skylight Unit (material per EA)" },
];

// ─── CSI 09: Finishes ─────────────────────────────────────────────────────────
const FINISHES_ITEMS: CostTableEntry[] = [
  { id: "drywall-5-8", csiDivision: "09", csiCode: "09 29 00", keywords: ["drywall", "gypsum board", "gypsum wallboard", "gwb", "sheetrock", "5/8"], unit: "SF", materialCost: 0.65, category: "finishes", description: "5/8\" Gypsum Wallboard (material per SF)" },
  { id: "drywall-1-2", csiDivision: "09", csiCode: "09 29 00", keywords: ["1/2\" drywall", "1/2 inch drywall", "half inch drywall"], unit: "SF", materialCost: 0.52, category: "finishes", description: "1/2\" Gypsum Wallboard (material per SF)" },
  { id: "ceramic-tile", csiDivision: "09", csiCode: "09 30 00", keywords: ["ceramic tile", "floor tile", "wall tile", "tile"], unit: "SF", materialCost: 4.50, category: "finishes", description: "Ceramic Tile (material per SF)" },
  { id: "porcelain-tile", csiDivision: "09", csiCode: "09 30 00", keywords: ["porcelain tile", "porcelain floor", "large format tile"], unit: "SF", materialCost: 7.50, category: "finishes", description: "Porcelain Tile (material per SF)" },
  { id: "carpet", csiDivision: "09", csiCode: "09 68 00", keywords: ["carpet", "broadloom", "carpet tile", "carpet flooring"], unit: "SY", materialCost: 28.00, category: "finishes", description: "Carpet (material per SY)" },
  { id: "vct", csiDivision: "09", csiCode: "09 65 13", keywords: ["vct", "vinyl composition tile", "vinyl tile"], unit: "SF", materialCost: 1.85, category: "finishes", description: "VCT Flooring (material per SF)" },
  { id: "lvp-flooring", csiDivision: "09", csiCode: "09 65 00", keywords: ["lvp", "luxury vinyl plank", "vinyl plank", "lvt", "luxury vinyl tile"], unit: "SF", materialCost: 3.50, category: "finishes", description: "Luxury Vinyl Plank (material per SF)" },
  { id: "epoxy-floor", csiDivision: "09", csiCode: "09 67 23", keywords: ["epoxy floor", "epoxy coating", "floor coating", "epoxy topping"], unit: "SF", materialCost: 2.85, category: "finishes", description: "Epoxy Floor Coating (material per SF)" },
  { id: "paint", csiDivision: "09", csiCode: "09 91 00", keywords: ["paint", "painting", "interior paint", "exterior paint", "primer"], unit: "SF", materialCost: 0.35, category: "finishes", description: "Paint (material per SF)" },
  { id: "acoustical-ceiling", csiDivision: "09", csiCode: "09 51 00", keywords: ["acoustical ceiling", "acoustic tile", "ceiling tile", "suspended ceiling", "drop ceiling", "act"], unit: "SF", materialCost: 2.25, category: "finishes", description: "Acoustical Ceiling Tile (material per SF)" },
  { id: "gypsum-plaster", csiDivision: "09", csiCode: "09 22 00", keywords: ["plaster", "gypsum plaster", "stucco", "exterior stucco"], unit: "SF", materialCost: 1.85, category: "finishes", description: "Gypsum Plaster/Stucco (material per SF)" },
  { id: "tile-setting", csiDivision: "09", csiCode: "09 30 00", keywords: ["tile setting", "tile adhesive", "thinset", "mortar bed", "grout"], unit: "SF", materialCost: 1.25, category: "finishes", description: "Tile Setting Materials/Thinset (material per SF)" },
];

// ─── CSI 10: Specialties ──────────────────────────────────────────────────────
const SPECIALTIES_ITEMS: CostTableEntry[] = [
  { id: "toilet-partition", csiDivision: "10", csiCode: "10 21 13", keywords: ["toilet partition", "bathroom partition", "restroom partition", "toilet stall"], unit: "EA", materialCost: 650.00, category: "specialties", description: "Toilet Partition (material per stall)" },
  { id: "fire-extinguisher", csiDivision: "10", csiCode: "10 44 13", keywords: ["fire extinguisher", "extinguisher cabinet", "fire cabinet"], unit: "EA", materialCost: 85.00, category: "specialties", description: "Fire Extinguisher & Cabinet (material per EA)" },
  { id: "signage", csiDivision: "10", csiCode: "10 14 00", keywords: ["signage", "sign", "building sign", "room sign", "exit sign"], unit: "EA", materialCost: 125.00, category: "specialties", description: "Signage (material per EA)" },
  { id: "flagpole", csiDivision: "10", csiCode: "10 75 00", keywords: ["flagpole", "flag pole"], unit: "EA", materialCost: 1850.00, category: "specialties", description: "Flagpole (material per EA)" },
  { id: "louver", csiDivision: "10", csiCode: "10 71 00", keywords: ["louver", "wall louver", "ventilation louver", "aluminum louver"], unit: "SF", materialCost: 28.00, category: "specialties", description: "Aluminum Louver (material per SF)" },
];

// ─── CSI 12: Furnishings ──────────────────────────────────────────────────────
const FURNISHINGS_ITEMS: CostTableEntry[] = [
  { id: "window-blind", csiDivision: "12", csiCode: "12 21 13", keywords: ["blind", "window blind", "roller shade", "window shade"], unit: "SF", materialCost: 8.50, category: "furnishings", description: "Window Blind/Shade (material per SF)" },
  { id: "casework", csiDivision: "12", csiCode: "12 32 00", keywords: ["casework", "cabinet", "millwork cabinet", "base cabinet", "upper cabinet"], unit: "LF", materialCost: 185.00, category: "furnishings", description: "Casework/Cabinets (material per LF)" },
  { id: "countertop", csiDivision: "12", csiCode: "12 36 00", keywords: ["countertop", "counter top", "laminate counter", "granite counter", "quartz counter"], unit: "SF", materialCost: 45.00, category: "furnishings", description: "Countertop (material per SF)" },
];

// ─── CSI 21: Fire Suppression ─────────────────────────────────────────────────
const FIRE_SUPPRESSION_ITEMS: CostTableEntry[] = [
  { id: "sprinkler-head", csiDivision: "21", csiCode: "21 13 13", keywords: ["sprinkler head", "fire sprinkler", "sprinkler"], unit: "EA", materialCost: 18.50, category: "fire", description: "Sprinkler Head (material per EA)" },
  { id: "sprinkler-pipe", csiDivision: "21", csiCode: "21 13 13", keywords: ["sprinkler pipe", "fire pipe", "schedule 40 pipe fire"], unit: "LF", materialCost: 8.50, category: "fire", description: "Sprinkler Pipe (material per LF)" },
  { id: "fire-riser", csiDivision: "21", csiCode: "21 13 00", keywords: ["fire riser", "sprinkler riser", "fire main"], unit: "EA", materialCost: 2850.00, category: "fire", description: "Fire Sprinkler Riser Assembly (material per EA)" },
];

// ─── CSI 22: Plumbing ─────────────────────────────────────────────────────────
const PLUMBING_ITEMS: CostTableEntry[] = [
  { id: "pvc-pipe-4in", csiDivision: "22", csiCode: "22 11 16", keywords: ["pvc pipe", "4\" pvc", "4 inch pvc", "drain pipe", "sanitary pipe"], unit: "LF", materialCost: 8.50, category: "plumbing", description: "4\" PVC Drain Pipe (material per LF)" },
  { id: "copper-pipe", csiDivision: "22", csiCode: "22 11 16", keywords: ["copper pipe", "copper tubing", "type l copper", "type k copper"], unit: "LF", materialCost: 12.50, category: "plumbing", description: "Copper Pipe (material per LF)" },
  { id: "water-closet", csiDivision: "22", csiCode: "22 42 13", keywords: ["water closet", "toilet", "wc", "flush valve toilet"], unit: "EA", materialCost: 485.00, category: "plumbing", description: "Water Closet/Toilet (material per EA)" },
  { id: "lavatory", csiDivision: "22", csiCode: "22 42 16", keywords: ["lavatory", "sink", "hand sink", "wash basin"], unit: "EA", materialCost: 285.00, category: "plumbing", description: "Lavatory/Sink (material per EA)" },
  { id: "floor-drain", csiDivision: "22", csiCode: "22 42 00", keywords: ["floor drain", "area drain", "trench drain"], unit: "EA", materialCost: 125.00, category: "plumbing", description: "Floor Drain (material per EA)" },
  { id: "water-heater", csiDivision: "22", csiCode: "22 33 00", keywords: ["water heater", "hot water heater", "tankless water heater"], unit: "EA", materialCost: 850.00, category: "plumbing", description: "Water Heater (material per EA)" },
  { id: "backflow-preventer", csiDivision: "22", csiCode: "22 11 00", keywords: ["backflow preventer", "backflow", "rpz", "double check valve"], unit: "EA", materialCost: 485.00, category: "plumbing", description: "Backflow Preventer (material per EA)" },
];

// ─── CSI 23: HVAC ─────────────────────────────────────────────────────────────
const HVAC_ITEMS: CostTableEntry[] = [
  { id: "ductwork", csiDivision: "23", csiCode: "23 31 00", keywords: ["ductwork", "duct", "sheet metal duct", "hvac duct", "supply duct", "return duct"], unit: "LB", materialCost: 3.85, category: "hvac", description: "Sheet Metal Ductwork (material per LB)" },
  { id: "rooftop-unit", csiDivision: "23", csiCode: "23 74 00", keywords: ["rooftop unit", "rtu", "packaged unit", "hvac unit"], unit: "TON", materialCost: 1850.00, category: "hvac", description: "Rooftop HVAC Unit (material per TON)" },
  { id: "split-system", csiDivision: "23", csiCode: "23 81 26", keywords: ["split system", "mini split", "ductless", "heat pump"], unit: "TON", materialCost: 1450.00, category: "hvac", description: "Split System/Mini-Split (material per TON)" },
  { id: "diffuser", csiDivision: "23", csiCode: "23 37 00", keywords: ["diffuser", "supply diffuser", "air diffuser", "ceiling diffuser", "grille", "register"], unit: "EA", materialCost: 45.00, category: "hvac", description: "Supply Diffuser/Register (material per EA)" },
  { id: "exhaust-fan", csiDivision: "23", csiCode: "23 34 00", keywords: ["exhaust fan", "bathroom fan", "kitchen exhaust", "ventilation fan"], unit: "EA", materialCost: 185.00, category: "hvac", description: "Exhaust Fan (material per EA)" },
  { id: "insulated-duct", csiDivision: "23", csiCode: "23 07 00", keywords: ["insulated duct", "duct insulation", "duct wrap", "duct liner"], unit: "SF", materialCost: 1.85, category: "hvac", description: "Duct Insulation (material per SF)" },
];

// ─── CSI 26: Electrical ───────────────────────────────────────────────────────
const ELECTRICAL_ITEMS: CostTableEntry[] = [
  { id: "conduit-emt", csiDivision: "26", csiCode: "26 05 33", keywords: ["emt", "conduit", "electrical conduit", "emt conduit", "rigid conduit"], unit: "LF", materialCost: 3.85, category: "electrical", description: "EMT Conduit (material per LF)" },
  { id: "wire-12awg", csiDivision: "26", csiCode: "26 05 19", keywords: ["12 awg", "12 gauge wire", "thhn wire", "electrical wire", "branch circuit wire"], unit: "LF", materialCost: 0.55, category: "electrical", description: "12 AWG THHN Wire (material per LF)" },
  { id: "panel-board", csiDivision: "26", csiCode: "26 24 16", keywords: ["panel board", "electrical panel", "distribution panel", "load center", "breaker panel"], unit: "EA", materialCost: 1850.00, category: "electrical", description: "Electrical Panel Board (material per EA)" },
  { id: "light-fixture", csiDivision: "26", csiCode: "26 51 00", keywords: ["light fixture", "lighting", "led fixture", "troffer", "downlight", "recessed light"], unit: "EA", materialCost: 125.00, category: "electrical", description: "Light Fixture (material per EA)" },
  { id: "receptacle", csiDivision: "26", csiCode: "26 27 26", keywords: ["receptacle", "outlet", "duplex outlet", "gfci outlet", "electrical outlet"], unit: "EA", materialCost: 18.50, category: "electrical", description: "Electrical Receptacle/Outlet (material per EA)" },
  { id: "switch", csiDivision: "26", csiCode: "26 27 26", keywords: ["switch", "light switch", "toggle switch", "dimmer switch"], unit: "EA", materialCost: 12.50, category: "electrical", description: "Electrical Switch (material per EA)" },
  { id: "transformer", csiDivision: "26", csiCode: "26 22 00", keywords: ["transformer", "dry type transformer", "step down transformer"], unit: "KVA", materialCost: 85.00, category: "electrical", description: "Dry-Type Transformer (material per KVA)" },
  { id: "generator", csiDivision: "26", csiCode: "26 32 00", keywords: ["generator", "standby generator", "emergency generator", "diesel generator"], unit: "KW", materialCost: 850.00, category: "electrical", description: "Standby Generator (material per KW)" },
];

// ─── CSI 27: Communications ───────────────────────────────────────────────────
const COMMUNICATIONS_ITEMS: CostTableEntry[] = [
  { id: "data-cable", csiDivision: "27", csiCode: "27 15 00", keywords: ["data cable", "cat6", "cat 6", "network cable", "ethernet cable", "low voltage"], unit: "LF", materialCost: 0.45, category: "communications", description: "Cat6 Data Cable (material per LF)" },
  { id: "data-outlet", csiDivision: "27", csiCode: "27 15 00", keywords: ["data outlet", "network outlet", "data port", "rj45 outlet"], unit: "EA", materialCost: 28.00, category: "communications", description: "Data Outlet (material per EA)" },
  { id: "telecom-conduit", csiDivision: "27", csiCode: "27 05 28", keywords: ["telecom conduit", "low voltage conduit", "communications conduit"], unit: "LF", materialCost: 2.85, category: "communications", description: "Telecom/Low Voltage Conduit (material per LF)" },
];

// ─── CSI 28: Electronic Safety & Security ────────────────────────────────────
const SECURITY_ITEMS: CostTableEntry[] = [
  { id: "fire-alarm-device", csiDivision: "28", csiCode: "28 31 00", keywords: ["fire alarm", "smoke detector", "heat detector", "pull station", "horn strobe"], unit: "EA", materialCost: 85.00, category: "security", description: "Fire Alarm Device (material per EA)" },
  { id: "security-camera", csiDivision: "28", csiCode: "28 23 00", keywords: ["security camera", "cctv", "surveillance camera", "ip camera"], unit: "EA", materialCost: 285.00, category: "security", description: "Security Camera (material per EA)" },
  { id: "access-control", csiDivision: "28", csiCode: "28 13 00", keywords: ["access control", "card reader", "keypad entry", "door access"], unit: "EA", materialCost: 485.00, category: "security", description: "Access Control Device (material per EA)" },
];

// ─── CSI 33: Utilities ────────────────────────────────────────────────────────
const UTILITIES_ITEMS: CostTableEntry[] = [
  { id: "storm-drain-pipe", csiDivision: "33", csiCode: "33 41 00", keywords: ["storm drain", "storm pipe", "rcp", "reinforced concrete pipe", "hdpe storm", "corrugated metal pipe"], unit: "LF", materialCost: 28.00, category: "utilities", description: "Storm Drain Pipe (material per LF)" },
  { id: "sanitary-sewer-pipe", csiDivision: "33", csiCode: "33 31 00", keywords: ["sanitary sewer", "sewer pipe", "pvc sewer", "8\" sewer", "gravity sewer"], unit: "LF", materialCost: 18.50, category: "utilities", description: "Sanitary Sewer Pipe (material per LF)" },
  { id: "water-main", csiDivision: "33", csiCode: "33 11 00", keywords: ["water main", "water line", "water pipe", "ductile iron pipe", "pvc water main"], unit: "LF", materialCost: 22.00, category: "utilities", description: "Water Main Pipe (material per LF)" },
  { id: "manhole", csiDivision: "33", csiCode: "33 44 00", keywords: ["manhole", "catch basin", "storm manhole", "sewer manhole"], unit: "EA", materialCost: 2850.00, category: "utilities", description: "Manhole/Catch Basin (material per EA)" },
  { id: "fire-hydrant", csiDivision: "33", csiCode: "33 11 00", keywords: ["fire hydrant", "hydrant"], unit: "EA", materialCost: 2250.00, category: "utilities", description: "Fire Hydrant (material per EA)" },
  { id: "underground-conduit", csiDivision: "33", csiCode: "33 71 00", keywords: ["underground conduit", "duct bank", "underground electric", "buried conduit"], unit: "LF", materialCost: 4.50, category: "utilities", description: "Underground Electrical Conduit (material per LF)" },
  { id: "cleanout", csiDivision: "33", csiCode: "33 31 00", keywords: ["cleanout", "sewer cleanout", "co", "clean out"], unit: "EA", materialCost: 85.00, category: "utilities", description: "Sewer Cleanout (material per EA)" },
  { id: "gate-valve", csiDivision: "33", csiCode: "33 11 00", keywords: ["gate valve", "valve box", "water valve", "curb stop"], unit: "EA", materialCost: 285.00, category: "utilities", description: "Gate Valve (material per EA)" },
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
  ...GENERAL_REQUIREMENTS,
  ...MASONRY_ITEMS,
  ...METALS_ITEMS,
  ...WOOD_ITEMS,
  ...THERMAL_ITEMS,
  ...OPENINGS_ITEMS,
  ...FINISHES_ITEMS,
  ...SPECIALTIES_ITEMS,
  ...FURNISHINGS_ITEMS,
  ...FIRE_SUPPRESSION_ITEMS,
  ...PLUMBING_ITEMS,
  ...HVAC_ITEMS,
  ...ELECTRICAL_ITEMS,
  ...COMMUNICATIONS_ITEMS,
  ...SECURITY_ITEMS,
  ...UTILITIES_ITEMS,
];

export function getEntriesForDivision(division: string): CostTableEntry[] {
  return COST_TABLE.filter(e => e.csiDivision === division);
}

export function getEntriesForCategory(category: string): CostTableEntry[] {
  return COST_TABLE.filter(e => e.category === category);
}
