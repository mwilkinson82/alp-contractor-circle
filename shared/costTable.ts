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

export function getEntriesForDivision(division: string): CostTableEntry[] {
  return COST_TABLE.filter(e => e.csiDivision === division);
}

export function getEntriesForCategory(category: string): CostTableEntry[] {
  return COST_TABLE.filter(e => e.category === category);
}
