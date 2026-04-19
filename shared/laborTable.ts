/**
 * ConstructLine Labor Reference Table
 *
 * LABOR-ONLY unit costs for construction items (2025 pricing).
 * Sources: RS Means Labor Rates, BLS Occupational Employment data, industry averages.
 *
 * PRICING PHILOSOPHY:
 * - ALL costs are LABOR ONLY — no material, no equipment rental, no overhead
 * - Rates represent all-in crew cost per unit of output (wages + burden)
 * - Burden includes: FICA, workers comp, health insurance, pension/401k, vacation/holiday
 * - Four labor types with different rate structures:
 *   1. Residential Open Shop (baseline)
 *   2. Residential Union (~15-25% above residential open shop)
 *   3. Commercial Open Shop (~20-35% above residential open shop)
 *   4. Commercial Union (~40-65% above residential open shop)
 *
 * All costs are US National Average. Regional multipliers are applied separately.
 * Rates are in dollars per unit of output.
 */

export type LaborType = "res_open" | "res_union" | "com_open" | "com_union";

export const LABOR_TYPE_LABELS: Record<LaborType, string> = {
  res_open: "Residential — Open Shop",
  res_union: "Residential — Union",
  com_open: "Commercial — Open Shop",
  com_union: "Commercial — Union",
};

export const LABOR_TYPE_SHORT: Record<LaborType, string> = {
  res_open: "Res / Open",
  res_union: "Res / Union",
  com_open: "Com / Open",
  com_union: "Com / Union",
};

/** Multiplier from residential open shop baseline to each labor type */
export const LABOR_TYPE_MULTIPLIERS: Record<LaborType, number> = {
  res_open: 1.00,
  res_union: 1.22,
  com_open: 1.28,
  com_union: 1.55,
};

export interface LaborTableEntry {
  id: string;
  csiDivision: string;
  csiCode: string;
  unit: string;
  /** Base labor cost per unit — Residential Open Shop (national avg) */
  baseLaborCost: number;
  /** Typical crew size for this task */
  crewSize: number;
  /** Productivity: units per crew-hour */
  productivity: number;
  category: string;
  description: string;
}

// ─── CSI 01: General Requirements ─────────────────────────────────────────────
const GENERAL_ITEMS: LaborTableEntry[] = [
  { id: "labor-temp-fence", csiDivision: "01", csiCode: "01 56 00", unit: "LF", baseLaborCost: 3.50, crewSize: 2, productivity: 80, category: "general", description: "Temporary Chain Link Fence Installation" },
  { id: "labor-temp-toilet", csiDivision: "01", csiCode: "01 52 00", unit: "MO", baseLaborCost: 45.00, crewSize: 1, productivity: 4, category: "general", description: "Portable Toilet Service/Maintenance" },
  { id: "labor-dumpster", csiDivision: "01", csiCode: "01 74 00", unit: "EA", baseLaborCost: 85.00, crewSize: 1, productivity: 2, category: "general", description: "Dumpster Rental/Haul Coordination" },
  { id: "labor-cleanup", csiDivision: "01", csiCode: "01 74 00", unit: "SF", baseLaborCost: 0.15, crewSize: 3, productivity: 2000, category: "general", description: "Final Construction Cleanup" },
  { id: "labor-layout", csiDivision: "01", csiCode: "01 71 00", unit: "SF", baseLaborCost: 0.08, crewSize: 2, productivity: 5000, category: "general", description: "Building Layout & Staking" },
];

// ─── CSI 02: Existing Conditions ──────────────────────────────────────────────
const EXISTING_ITEMS: LaborTableEntry[] = [
  { id: "labor-demo-interior", csiDivision: "02", csiCode: "02 41 00", unit: "SF", baseLaborCost: 2.50, crewSize: 3, productivity: 200, category: "demo", description: "Interior Selective Demolition" },
  { id: "labor-demo-concrete", csiDivision: "02", csiCode: "02 41 00", unit: "SF", baseLaborCost: 4.50, crewSize: 3, productivity: 100, category: "demo", description: "Concrete Demolition & Removal" },
  { id: "labor-abatement", csiDivision: "02", csiCode: "02 82 00", unit: "SF", baseLaborCost: 6.00, crewSize: 4, productivity: 150, category: "demo", description: "Asbestos Abatement" },
];

// ─── CSI 03: Concrete ─────────────────────────────────────────────────────────
const CONCRETE_ITEMS: LaborTableEntry[] = [
  { id: "labor-slab-4in", csiDivision: "03", csiCode: "03 30 00", unit: "SF", baseLaborCost: 3.85, crewSize: 6, productivity: 250, category: "concrete", description: "4\" Concrete Slab — Place & Finish" },
  { id: "labor-slab-6in", csiDivision: "03", csiCode: "03 30 00", unit: "SF", baseLaborCost: 4.25, crewSize: 6, productivity: 220, category: "concrete", description: "6\" Concrete Slab — Place & Finish" },
  { id: "labor-footing", csiDivision: "03", csiCode: "03 30 00", unit: "CY", baseLaborCost: 65.00, crewSize: 4, productivity: 8, category: "concrete", description: "Continuous Footing — Form, Pour, Strip" },
  { id: "labor-wall-concrete", csiDivision: "03", csiCode: "03 30 00", unit: "SF", baseLaborCost: 12.50, crewSize: 5, productivity: 80, category: "concrete", description: "Concrete Wall — Form, Pour, Strip" },
  { id: "labor-rebar", csiDivision: "03", csiCode: "03 21 00", unit: "LB", baseLaborCost: 0.45, crewSize: 3, productivity: 400, category: "concrete", description: "Rebar — Place & Tie" },
  { id: "labor-formwork", csiDivision: "03", csiCode: "03 11 00", unit: "SFCA", baseLaborCost: 5.50, crewSize: 4, productivity: 120, category: "concrete", description: "Formwork — Build, Set, Strip" },
  { id: "labor-wire-mesh", csiDivision: "03", csiCode: "03 22 00", unit: "SF", baseLaborCost: 0.25, crewSize: 2, productivity: 800, category: "concrete", description: "Welded Wire Mesh — Place" },
  { id: "labor-concrete-pump", csiDivision: "03", csiCode: "03 30 00", unit: "CY", baseLaborCost: 18.00, crewSize: 2, productivity: 25, category: "concrete", description: "Concrete Pumping" },
  { id: "labor-curb-gutter", csiDivision: "03", csiCode: "03 30 00", unit: "LF", baseLaborCost: 8.50, crewSize: 4, productivity: 100, category: "concrete", description: "Curb & Gutter — Form, Pour, Finish" },
];

// ─── CSI 04: Masonry ──────────────────────────────────────────────────────────
const MASONRY_ITEMS: LaborTableEntry[] = [
  { id: "labor-cmu-8in", csiDivision: "04", csiCode: "04 22 00", unit: "SF", baseLaborCost: 8.50, crewSize: 3, productivity: 80, category: "masonry", description: "8\" CMU Block Wall — Lay & Grout" },
  { id: "labor-cmu-12in", csiDivision: "04", csiCode: "04 22 00", unit: "SF", baseLaborCost: 10.50, crewSize: 3, productivity: 65, category: "masonry", description: "12\" CMU Block Wall — Lay & Grout" },
  { id: "labor-brick-veneer", csiDivision: "04", csiCode: "04 21 00", unit: "SF", baseLaborCost: 12.00, crewSize: 3, productivity: 50, category: "masonry", description: "Brick Veneer — Lay" },
  { id: "labor-stone-veneer", csiDivision: "04", csiCode: "04 42 00", unit: "SF", baseLaborCost: 18.00, crewSize: 2, productivity: 30, category: "masonry", description: "Stone Veneer — Install" },
];

// ─── CSI 05: Metals ───────────────────────────────────────────────────────────
const METALS_ITEMS: LaborTableEntry[] = [
  { id: "labor-struct-steel", csiDivision: "05", csiCode: "05 12 00", unit: "TON", baseLaborCost: 850.00, crewSize: 4, productivity: 1.5, category: "metals", description: "Structural Steel Erection" },
  { id: "labor-steel-joist", csiDivision: "05", csiCode: "05 21 00", unit: "LF", baseLaborCost: 6.50, crewSize: 4, productivity: 120, category: "metals", description: "Steel Joist Installation" },
  { id: "labor-metal-deck", csiDivision: "05", csiCode: "05 31 00", unit: "SF", baseLaborCost: 2.25, crewSize: 4, productivity: 400, category: "metals", description: "Metal Deck Installation" },
  { id: "labor-misc-metals", csiDivision: "05", csiCode: "05 50 00", unit: "LB", baseLaborCost: 1.50, crewSize: 2, productivity: 100, category: "metals", description: "Miscellaneous Metals — Fabricate & Install" },
  { id: "labor-handrail", csiDivision: "05", csiCode: "05 52 00", unit: "LF", baseLaborCost: 22.00, crewSize: 2, productivity: 30, category: "metals", description: "Metal Handrail Installation" },
];

// ─── CSI 06: Wood & Plastics ──────────────────────────────────────────────────
const WOOD_ITEMS: LaborTableEntry[] = [
  { id: "labor-framing-wall", csiDivision: "06", csiCode: "06 11 00", unit: "SF", baseLaborCost: 3.50, crewSize: 3, productivity: 200, category: "wood", description: "Wood Wall Framing" },
  { id: "labor-framing-floor", csiDivision: "06", csiCode: "06 11 00", unit: "SF", baseLaborCost: 3.25, crewSize: 3, productivity: 220, category: "wood", description: "Wood Floor Framing" },
  { id: "labor-framing-roof", csiDivision: "06", csiCode: "06 11 00", unit: "SF", baseLaborCost: 4.00, crewSize: 3, productivity: 180, category: "wood", description: "Wood Roof Framing" },
  { id: "labor-trusses", csiDivision: "06", csiCode: "06 17 53", unit: "SF", baseLaborCost: 2.50, crewSize: 4, productivity: 300, category: "wood", description: "Truss Installation (pre-engineered)" },
  { id: "labor-sheathing", csiDivision: "06", csiCode: "06 16 00", unit: "SF", baseLaborCost: 1.25, crewSize: 2, productivity: 500, category: "wood", description: "Plywood/OSB Sheathing" },
  { id: "labor-blocking", csiDivision: "06", csiCode: "06 11 00", unit: "LF", baseLaborCost: 2.00, crewSize: 1, productivity: 100, category: "wood", description: "Wood Blocking/Nailer" },
  { id: "labor-trim-finish", csiDivision: "06", csiCode: "06 22 00", unit: "LF", baseLaborCost: 3.50, crewSize: 1, productivity: 60, category: "wood", description: "Finish Carpentry / Trim" },
  { id: "labor-cabinets", csiDivision: "06", csiCode: "06 41 00", unit: "LF", baseLaborCost: 45.00, crewSize: 2, productivity: 8, category: "wood", description: "Cabinet Installation" },
  { id: "labor-countertop", csiDivision: "06", csiCode: "06 65 00", unit: "LF", baseLaborCost: 35.00, crewSize: 2, productivity: 10, category: "wood", description: "Countertop Installation" },
];

// ─── CSI 07: Thermal & Moisture Protection ────────────────────────────────────
const THERMAL_ITEMS: LaborTableEntry[] = [
  { id: "labor-insulation-batt", csiDivision: "07", csiCode: "07 21 00", unit: "SF", baseLaborCost: 0.65, crewSize: 2, productivity: 600, category: "thermal", description: "Batt Insulation Installation" },
  { id: "labor-insulation-rigid", csiDivision: "07", csiCode: "07 21 00", unit: "SF", baseLaborCost: 1.25, crewSize: 2, productivity: 400, category: "thermal", description: "Rigid Insulation Installation" },
  { id: "labor-insulation-spray", csiDivision: "07", csiCode: "07 21 00", unit: "SF", baseLaborCost: 1.85, crewSize: 2, productivity: 300, category: "thermal", description: "Spray Foam Insulation" },
  { id: "labor-roofing-shingle", csiDivision: "07", csiCode: "07 31 00", unit: "SQ", baseLaborCost: 85.00, crewSize: 4, productivity: 5, category: "thermal", description: "Asphalt Shingle Roofing" },
  { id: "labor-roofing-tpo", csiDivision: "07", csiCode: "07 54 00", unit: "SQ", baseLaborCost: 120.00, crewSize: 3, productivity: 4, category: "thermal", description: "TPO/Single-Ply Roofing" },
  { id: "labor-roofing-metal", csiDivision: "07", csiCode: "07 61 00", unit: "SQ", baseLaborCost: 150.00, crewSize: 3, productivity: 3, category: "thermal", description: "Standing Seam Metal Roofing" },
  { id: "labor-flashing", csiDivision: "07", csiCode: "07 62 00", unit: "LF", baseLaborCost: 6.50, crewSize: 2, productivity: 60, category: "thermal", description: "Sheet Metal Flashing" },
  { id: "labor-waterproofing", csiDivision: "07", csiCode: "07 13 00", unit: "SF", baseLaborCost: 2.50, crewSize: 2, productivity: 300, category: "thermal", description: "Waterproofing Membrane Application" },
  { id: "labor-siding-vinyl", csiDivision: "07", csiCode: "07 46 00", unit: "SF", baseLaborCost: 2.25, crewSize: 2, productivity: 250, category: "thermal", description: "Vinyl Siding Installation" },
  { id: "labor-siding-fiber", csiDivision: "07", csiCode: "07 46 00", unit: "SF", baseLaborCost: 3.50, crewSize: 2, productivity: 180, category: "thermal", description: "Fiber Cement Siding (HardiPlank)" },
  { id: "labor-gutter", csiDivision: "07", csiCode: "07 71 00", unit: "LF", baseLaborCost: 4.50, crewSize: 2, productivity: 100, category: "thermal", description: "Gutter & Downspout Installation" },
];

// ─── CSI 08: Openings ─────────────────────────────────────────────────────────
const OPENINGS_ITEMS: LaborTableEntry[] = [
  { id: "labor-door-wood", csiDivision: "08", csiCode: "08 14 00", unit: "EA", baseLaborCost: 185.00, crewSize: 2, productivity: 4, category: "openings", description: "Wood Door & Frame Installation" },
  { id: "labor-door-hm", csiDivision: "08", csiCode: "08 11 00", unit: "EA", baseLaborCost: 250.00, crewSize: 2, productivity: 3, category: "openings", description: "Hollow Metal Door & Frame" },
  { id: "labor-door-glass", csiDivision: "08", csiCode: "08 41 00", unit: "EA", baseLaborCost: 650.00, crewSize: 2, productivity: 1.5, category: "openings", description: "Glass Storefront Door" },
  { id: "labor-window-vinyl", csiDivision: "08", csiCode: "08 52 00", unit: "EA", baseLaborCost: 125.00, crewSize: 2, productivity: 6, category: "openings", description: "Vinyl Window Installation" },
  { id: "labor-window-aluminum", csiDivision: "08", csiCode: "08 51 00", unit: "SF", baseLaborCost: 15.00, crewSize: 2, productivity: 40, category: "openings", description: "Aluminum Window Installation" },
  { id: "labor-curtainwall", csiDivision: "08", csiCode: "08 44 00", unit: "SF", baseLaborCost: 25.00, crewSize: 3, productivity: 30, category: "openings", description: "Curtain Wall Installation" },
  { id: "labor-hardware", csiDivision: "08", csiCode: "08 71 00", unit: "EA", baseLaborCost: 85.00, crewSize: 1, productivity: 6, category: "openings", description: "Door Hardware Installation" },
  { id: "labor-overhead-door", csiDivision: "08", csiCode: "08 36 00", unit: "EA", baseLaborCost: 450.00, crewSize: 2, productivity: 1.5, category: "openings", description: "Overhead/Sectional Door" },
];

// ─── CSI 09: Finishes ─────────────────────────────────────────────────────────
const FINISHES_ITEMS: LaborTableEntry[] = [
  { id: "labor-drywall-hang", csiDivision: "09", csiCode: "09 29 00", unit: "SF", baseLaborCost: 1.25, crewSize: 2, productivity: 400, category: "finishes", description: "Drywall — Hang" },
  { id: "labor-drywall-tape", csiDivision: "09", csiCode: "09 29 00", unit: "SF", baseLaborCost: 0.85, crewSize: 1, productivity: 500, category: "finishes", description: "Drywall — Tape & Finish (Level 4)" },
  { id: "labor-paint-interior", csiDivision: "09", csiCode: "09 91 00", unit: "SF", baseLaborCost: 0.75, crewSize: 2, productivity: 600, category: "finishes", description: "Interior Painting (2 coats)" },
  { id: "labor-paint-exterior", csiDivision: "09", csiCode: "09 91 00", unit: "SF", baseLaborCost: 1.10, crewSize: 2, productivity: 400, category: "finishes", description: "Exterior Painting (2 coats)" },
  { id: "labor-tile-floor", csiDivision: "09", csiCode: "09 30 00", unit: "SF", baseLaborCost: 6.50, crewSize: 2, productivity: 80, category: "finishes", description: "Ceramic/Porcelain Floor Tile" },
  { id: "labor-tile-wall", csiDivision: "09", csiCode: "09 30 00", unit: "SF", baseLaborCost: 8.00, crewSize: 2, productivity: 60, category: "finishes", description: "Ceramic/Porcelain Wall Tile" },
  { id: "labor-carpet", csiDivision: "09", csiCode: "09 68 00", unit: "SF", baseLaborCost: 0.85, crewSize: 2, productivity: 500, category: "finishes", description: "Carpet Installation" },
  { id: "labor-lvp", csiDivision: "09", csiCode: "09 65 00", unit: "SF", baseLaborCost: 1.50, crewSize: 2, productivity: 350, category: "finishes", description: "LVP/LVT Flooring Installation" },
  { id: "labor-hardwood", csiDivision: "09", csiCode: "09 64 00", unit: "SF", baseLaborCost: 3.50, crewSize: 2, productivity: 150, category: "finishes", description: "Hardwood Flooring Installation" },
  { id: "labor-act-ceiling", csiDivision: "09", csiCode: "09 51 00", unit: "SF", baseLaborCost: 1.75, crewSize: 2, productivity: 300, category: "finishes", description: "Acoustical Ceiling Tile (ACT)" },
  { id: "labor-stucco", csiDivision: "09", csiCode: "09 24 00", unit: "SF", baseLaborCost: 5.50, crewSize: 3, productivity: 120, category: "finishes", description: "Stucco / Plaster Application" },
];

// ─── CSI 10-14: Specialties ───────────────────────────────────────────────────
const SPECIALTIES_ITEMS: LaborTableEntry[] = [
  { id: "labor-toilet-partition", csiDivision: "10", csiCode: "10 21 00", unit: "EA", baseLaborCost: 250.00, crewSize: 2, productivity: 3, category: "specialties", description: "Toilet Partition Installation" },
  { id: "labor-signage", csiDivision: "10", csiCode: "10 14 00", unit: "EA", baseLaborCost: 125.00, crewSize: 1, productivity: 6, category: "specialties", description: "Interior Signage Installation" },
  { id: "labor-lockers", csiDivision: "10", csiCode: "10 51 00", unit: "EA", baseLaborCost: 65.00, crewSize: 2, productivity: 8, category: "specialties", description: "Locker Installation" },
  { id: "labor-elevator", csiDivision: "14", csiCode: "14 21 00", unit: "STOP", baseLaborCost: 8500.00, crewSize: 4, productivity: 0.1, category: "specialties", description: "Elevator Installation (per stop)" },
];

// ─── CSI 21: Fire Suppression ─────────────────────────────────────────────────
const FIRE_ITEMS: LaborTableEntry[] = [
  { id: "labor-sprinkler-head", csiDivision: "21", csiCode: "21 13 00", unit: "EA", baseLaborCost: 45.00, crewSize: 2, productivity: 12, category: "mechanical", description: "Fire Sprinkler Head Installation" },
  { id: "labor-sprinkler-pipe", csiDivision: "21", csiCode: "21 13 00", unit: "LF", baseLaborCost: 8.50, crewSize: 2, productivity: 60, category: "mechanical", description: "Fire Sprinkler Piping" },
  { id: "labor-fire-alarm", csiDivision: "21", csiCode: "21 30 00", unit: "EA", baseLaborCost: 125.00, crewSize: 1, productivity: 4, category: "mechanical", description: "Fire Alarm Device Installation" },
];

// ─── CSI 22: Plumbing ─────────────────────────────────────────────────────────
const PLUMBING_ITEMS: LaborTableEntry[] = [
  { id: "labor-plumbing-rough", csiDivision: "22", csiCode: "22 11 00", unit: "EA", baseLaborCost: 450.00, crewSize: 2, productivity: 2, category: "mechanical", description: "Plumbing Rough-In (per fixture)" },
  { id: "labor-plumbing-fixture", csiDivision: "22", csiCode: "22 40 00", unit: "EA", baseLaborCost: 185.00, crewSize: 1, productivity: 3, category: "mechanical", description: "Plumbing Fixture Set (toilet/sink/faucet)" },
  { id: "labor-water-heater", csiDivision: "22", csiCode: "22 33 00", unit: "EA", baseLaborCost: 350.00, crewSize: 2, productivity: 1.5, category: "mechanical", description: "Water Heater Installation" },
  { id: "labor-pipe-copper", csiDivision: "22", csiCode: "22 11 00", unit: "LF", baseLaborCost: 12.00, crewSize: 1, productivity: 30, category: "mechanical", description: "Copper Pipe — Cut, Solder, Install" },
  { id: "labor-pipe-pvc", csiDivision: "22", csiCode: "22 11 00", unit: "LF", baseLaborCost: 6.50, crewSize: 1, productivity: 50, category: "mechanical", description: "PVC Pipe — Cut, Glue, Install" },
];

// ─── CSI 23: HVAC ─────────────────────────────────────────────────────────────
const HVAC_ITEMS: LaborTableEntry[] = [
  { id: "labor-ductwork", csiDivision: "23", csiCode: "23 31 00", unit: "LB", baseLaborCost: 3.50, crewSize: 2, productivity: 80, category: "mechanical", description: "Sheet Metal Ductwork — Fabricate & Install" },
  { id: "labor-ahu", csiDivision: "23", csiCode: "23 73 00", unit: "TON", baseLaborCost: 350.00, crewSize: 3, productivity: 1, category: "mechanical", description: "Air Handling Unit Installation" },
  { id: "labor-rtu", csiDivision: "23", csiCode: "23 74 00", unit: "TON", baseLaborCost: 250.00, crewSize: 3, productivity: 1.5, category: "mechanical", description: "Rooftop Unit Installation" },
  { id: "labor-diffuser", csiDivision: "23", csiCode: "23 37 00", unit: "EA", baseLaborCost: 65.00, crewSize: 1, productivity: 8, category: "mechanical", description: "Air Diffuser/Register Installation" },
  { id: "labor-residential-hvac", csiDivision: "23", csiCode: "23 81 00", unit: "EA", baseLaborCost: 2500.00, crewSize: 2, productivity: 0.3, category: "mechanical", description: "Residential HVAC System (furnace + AC)" },
];

// ─── CSI 26: Electrical ───────────────────────────────────────────────────────
const ELECTRICAL_ITEMS: LaborTableEntry[] = [
  { id: "labor-conduit", csiDivision: "26", csiCode: "26 05 33", unit: "LF", baseLaborCost: 6.50, crewSize: 2, productivity: 60, category: "electrical", description: "EMT Conduit — Cut, Bend, Install" },
  { id: "labor-wire-pull", csiDivision: "26", csiCode: "26 05 19", unit: "LF", baseLaborCost: 1.25, crewSize: 2, productivity: 200, category: "electrical", description: "Wire Pulling (per conductor LF)" },
  { id: "labor-receptacle", csiDivision: "26", csiCode: "26 27 26", unit: "EA", baseLaborCost: 65.00, crewSize: 1, productivity: 8, category: "electrical", description: "Receptacle/Outlet Installation" },
  { id: "labor-switch", csiDivision: "26", csiCode: "26 27 26", unit: "EA", baseLaborCost: 55.00, crewSize: 1, productivity: 10, category: "electrical", description: "Light Switch Installation" },
  { id: "labor-light-fixture", csiDivision: "26", csiCode: "26 51 00", unit: "EA", baseLaborCost: 85.00, crewSize: 1, productivity: 6, category: "electrical", description: "Light Fixture Installation" },
  { id: "labor-panel", csiDivision: "26", csiCode: "26 24 00", unit: "EA", baseLaborCost: 650.00, crewSize: 2, productivity: 1, category: "electrical", description: "Electrical Panel Installation" },
  { id: "labor-transformer", csiDivision: "26", csiCode: "26 22 00", unit: "EA", baseLaborCost: 1200.00, crewSize: 2, productivity: 0.5, category: "electrical", description: "Transformer Installation" },
  { id: "labor-fire-alarm-device", csiDivision: "26", csiCode: "26 31 00", unit: "EA", baseLaborCost: 95.00, crewSize: 1, productivity: 5, category: "electrical", description: "Fire Alarm Device Wiring" },
];

// ─── CSI 27-28: Communications & Safety ───────────────────────────────────────
const COMMS_ITEMS: LaborTableEntry[] = [
  { id: "labor-data-drop", csiDivision: "27", csiCode: "27 15 00", unit: "EA", baseLaborCost: 125.00, crewSize: 1, productivity: 4, category: "electrical", description: "Data/Network Drop Installation" },
  { id: "labor-security-camera", csiDivision: "28", csiCode: "28 23 00", unit: "EA", baseLaborCost: 185.00, crewSize: 1, productivity: 3, category: "electrical", description: "Security Camera Installation" },
  { id: "labor-access-control", csiDivision: "28", csiCode: "28 13 00", unit: "EA", baseLaborCost: 250.00, crewSize: 1, productivity: 2, category: "electrical", description: "Access Control Device Installation" },
];

// ─── CSI 31: Earthwork ────────────────────────────────────────────────────────
const EARTHWORK_ITEMS: LaborTableEntry[] = [
  { id: "labor-excavation", csiDivision: "31", csiCode: "31 23 00", unit: "CY", baseLaborCost: 4.50, crewSize: 2, productivity: 80, category: "sitework", description: "Bulk Excavation (equipment + operator)" },
  { id: "labor-backfill", csiDivision: "31", csiCode: "31 23 00", unit: "CY", baseLaborCost: 5.50, crewSize: 2, productivity: 60, category: "sitework", description: "Backfill & Compaction" },
  { id: "labor-grading", csiDivision: "31", csiCode: "31 22 00", unit: "SF", baseLaborCost: 0.35, crewSize: 2, productivity: 3000, category: "sitework", description: "Fine Grading" },
  { id: "labor-trench", csiDivision: "31", csiCode: "31 23 00", unit: "LF", baseLaborCost: 8.50, crewSize: 2, productivity: 80, category: "sitework", description: "Trench Excavation (utility)" },
];

// ─── CSI 32: Exterior Improvements ────────────────────────────────────────────
const EXTERIOR_ITEMS: LaborTableEntry[] = [
  { id: "labor-asphalt-paving", csiDivision: "32", csiCode: "32 12 00", unit: "SF", baseLaborCost: 1.50, crewSize: 6, productivity: 1000, category: "sitework", description: "Asphalt Paving" },
  { id: "labor-concrete-sidewalk", csiDivision: "32", csiCode: "32 16 00", unit: "SF", baseLaborCost: 4.50, crewSize: 4, productivity: 200, category: "sitework", description: "Concrete Sidewalk — Form, Pour, Finish" },
  { id: "labor-landscaping", csiDivision: "32", csiCode: "32 90 00", unit: "SF", baseLaborCost: 1.25, crewSize: 3, productivity: 500, category: "sitework", description: "Landscaping — Planting & Grading" },
  { id: "labor-fence-chain", csiDivision: "32", csiCode: "32 31 00", unit: "LF", baseLaborCost: 8.00, crewSize: 2, productivity: 80, category: "sitework", description: "Chain Link Fence Installation" },
  { id: "labor-fence-wood", csiDivision: "32", csiCode: "32 32 00", unit: "LF", baseLaborCost: 12.00, crewSize: 2, productivity: 50, category: "sitework", description: "Wood Privacy Fence Installation" },
];

// ─── CSI 33: Utilities ────────────────────────────────────────────────────────
const UTILITIES_ITEMS: LaborTableEntry[] = [
  { id: "labor-storm-pipe", csiDivision: "33", csiCode: "33 40 00", unit: "LF", baseLaborCost: 18.00, crewSize: 3, productivity: 40, category: "sitework", description: "Storm Drain Pipe Installation" },
  { id: "labor-sanitary-pipe", csiDivision: "33", csiCode: "33 30 00", unit: "LF", baseLaborCost: 22.00, crewSize: 3, productivity: 35, category: "sitework", description: "Sanitary Sewer Pipe Installation" },
  { id: "labor-water-main", csiDivision: "33", csiCode: "33 11 00", unit: "LF", baseLaborCost: 25.00, crewSize: 3, productivity: 30, category: "sitework", description: "Water Main Installation" },
  { id: "labor-manhole", csiDivision: "33", csiCode: "33 40 00", unit: "EA", baseLaborCost: 1500.00, crewSize: 3, productivity: 0.5, category: "sitework", description: "Manhole/Catch Basin Installation" },
];

// ─── Combined Export ──────────────────────────────────────────────────────────

export const LABOR_TABLE: LaborTableEntry[] = [
  ...GENERAL_ITEMS,
  ...EXISTING_ITEMS,
  ...CONCRETE_ITEMS,
  ...MASONRY_ITEMS,
  ...METALS_ITEMS,
  ...WOOD_ITEMS,
  ...THERMAL_ITEMS,
  ...OPENINGS_ITEMS,
  ...FINISHES_ITEMS,
  ...SPECIALTIES_ITEMS,
  ...FIRE_ITEMS,
  ...PLUMBING_ITEMS,
  ...HVAC_ITEMS,
  ...ELECTRICAL_ITEMS,
  ...COMMS_ITEMS,
  ...EARTHWORK_ITEMS,
  ...EXTERIOR_ITEMS,
  ...UTILITIES_ITEMS,
].sort((a, b) => a.csiDivision.localeCompare(b.csiDivision) || a.description.localeCompare(b.description));

/**
 * Get the adjusted labor cost for a given entry and labor type.
 * Returns cost in dollars per unit.
 */
export function getAdjustedLaborCost(entry: LaborTableEntry, laborType: LaborType): number {
  return +(entry.baseLaborCost * LABOR_TYPE_MULTIPLIERS[laborType]).toFixed(2);
}
