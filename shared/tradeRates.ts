/**
 * ConstructLine Trade Rate Reference Data
 *
 * Baseline hourly wage rates (BEFORE burden) by trade, role, and labor type.
 * Sources: RS Means 2025 Labor Rates, BLS Occupational Employment & Wage Statistics,
 * Associated Builders & Contractors (ABC), union CBAs for major metro areas.
 *
 * All rates are US National Average in cents per hour.
 * Regional multipliers from costRegions.ts are applied separately.
 * Burden is calculated separately using the user's burden configuration.
 *
 * Each trade has its own set of roles with trade-specific nomenclature.
 * Users can add, rename, or remove roles per trade.
 */

export type LaborType = "res_open" | "res_union" | "com_open" | "com_union";

export const LABOR_TYPE_LABELS: Record<LaborType, string> = {
  res_open: "Residential — Open Shop",
  res_union: "Residential — Union",
  com_open: "Commercial — Open Shop",
  com_union: "Commercial — Union",
};

/** A role within a trade — trade-specific nomenclature */
export interface TradeRole {
  roleKey: string;       // unique key within the trade (e.g., "foreman", "mason_tender")
  roleLabel: string;     // display name (e.g., "Foreman", "Mason Tender")
  /** Hourly rates in cents for each labor type */
  rates: Record<LaborType, number>;
}

export interface TradeDefinition {
  tradeName: string;
  /** Primary CSI division */
  csiDivision: string;
  /** Ordered list of roles for this trade */
  roles: TradeRole[];
}

/**
 * Baseline trades with trade-specific roles and rates.
 * Users can customize roles, add new ones, or change rates.
 */
export const TRADES: TradeDefinition[] = [
  // ─── Div 02: Existing Conditions ──────────────────────────────
  {
    tradeName: "Demolition Worker", csiDivision: "02",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2575, res_union: 3338, com_open: 3219, com_union: 4095 } },
      { roleKey: "operator", roleLabel: "Equipment Operator", rates: { res_open: 2420, res_union: 3135, com_open: 3025, com_union: 3850 } },
      { roleKey: "laborer", roleLabel: "Laborer", rates: { res_open: 2200, res_union: 2850, com_open: 2750, com_union: 3500 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1760, res_union: 2280, com_open: 2200, com_union: 2800 } },
    ],
  },
  // ─── Div 03: Concrete ────────────────────────────────────────
  {
    tradeName: "Concrete", csiDivision: "03",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3042, res_union: 3978, com_open: 3744, com_union: 4914 } },
      { roleKey: "finisher", roleLabel: "Cement Finisher", rates: { res_open: 2600, res_union: 3400, com_open: 3200, com_union: 4200 } },
      { roleKey: "form_carpenter", roleLabel: "Form Carpenter", rates: { res_open: 2500, res_union: 3300, com_open: 3100, com_union: 4100 } },
      { roleKey: "laborer", roleLabel: "Concrete Laborer", rates: { res_open: 2100, res_union: 2750, com_open: 2650, com_union: 3400 } },
      { roleKey: "mason_tender", roleLabel: "Mason Tender", rates: { res_open: 1900, res_union: 2500, com_open: 2400, com_union: 3100 } },
      { roleKey: "pump_operator", roleLabel: "Pump Operator", rates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
    ],
  },
  // ─── Div 04: Masonry ─────────────────────────────────────────
  {
    tradeName: "Masonry", csiDivision: "04",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3276, res_union: 4212, com_open: 3978, com_union: 5265 } },
      { roleKey: "bricklayer", roleLabel: "Bricklayer", rates: { res_open: 2800, res_union: 3600, com_open: 3400, com_union: 4500 } },
      { roleKey: "block_layer", roleLabel: "Block Layer", rates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4350 } },
      { roleKey: "stone_mason", roleLabel: "Stone Mason", rates: { res_open: 2900, res_union: 3750, com_open: 3500, com_union: 4650 } },
      { roleKey: "mason_tender", roleLabel: "Mason Tender", rates: { res_open: 1900, res_union: 2500, com_open: 2400, com_union: 3100 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1680, res_union: 2160, com_open: 2040, com_union: 2700 } },
    ],
  },
  // ─── Div 05: Metals ──────────────────────────────────────────
  {
    tradeName: "Structural Steel / Iron Work", csiDivision: "05",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3393, res_union: 4446, com_open: 4212, com_union: 5616 } },
      { roleKey: "iron_worker", roleLabel: "Iron Worker", rates: { res_open: 2900, res_union: 3800, com_open: 3600, com_union: 4800 } },
      { roleKey: "connector", roleLabel: "Connector", rates: { res_open: 3050, res_union: 4000, com_open: 3800, com_union: 5050 } },
      { roleKey: "rigger", roleLabel: "Rigger", rates: { res_open: 2750, res_union: 3600, com_open: 3400, com_union: 4550 } },
      { roleKey: "welder", roleLabel: "Welder", rates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 2030, res_union: 2660, com_open: 2520, com_union: 3360 } },
    ],
  },
  // ─── Div 06: Wood, Plastics & Composites ─────────────────────
  {
    tradeName: "Carpentry", csiDivision: "06",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2925, res_union: 3861, com_open: 3627, com_union: 4797 } },
      { roleKey: "journeyman", roleLabel: "Journeyman Carpenter", rates: { res_open: 2500, res_union: 3300, com_open: 3100, com_union: 4100 } },
      { roleKey: "framer", roleLabel: "Framer", rates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
      { roleKey: "finish_carpenter", roleLabel: "Finish Carpenter", rates: { res_open: 2600, res_union: 3400, com_open: 3200, com_union: 4200 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1750, res_union: 2310, com_open: 2170, com_union: 2870 } },
    ],
  },
  // ─── Div 07: Thermal & Moisture Protection ───────────────────
  {
    tradeName: "Roofing", csiDivision: "07",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2808, res_union: 3627, com_open: 3393, com_union: 4446 } },
      { roleKey: "journeyman", roleLabel: "Journeyman Roofer", rates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
      { roleKey: "insulation_worker", roleLabel: "Insulation Worker", rates: { res_open: 2200, res_union: 2900, com_open: 2700, com_union: 3500 } },
      { roleKey: "waterproofer", roleLabel: "Waterproofer", rates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1680, res_union: 2170, com_open: 2030, com_union: 2660 } },
    ],
  },
  // ─── Div 08: Openings ────────────────────────────────────────
  {
    tradeName: "Glazing / Openings", csiDivision: "08",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3042, res_union: 3978, com_open: 3744, com_union: 4914 } },
      { roleKey: "glazier", roleLabel: "Glazier", rates: { res_open: 2600, res_union: 3400, com_open: 3200, com_union: 4200 } },
      { roleKey: "door_installer", roleLabel: "Door/Hardware Installer", rates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1820, res_union: 2380, com_open: 2240, com_union: 2940 } },
    ],
  },
  // ─── Div 09: Finishes ────────────────────────────────────────
  {
    tradeName: "Drywall", csiDivision: "09",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2808, res_union: 3627, com_open: 3393, com_union: 4446 } },
      { roleKey: "hanger", roleLabel: "Drywall Hanger", rates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
      { roleKey: "taper", roleLabel: "Taper / Finisher", rates: { res_open: 2500, res_union: 3200, com_open: 3000, com_union: 3900 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1680, res_union: 2170, com_open: 2030, com_union: 2660 } },
    ],
  },
  {
    tradeName: "Painting", csiDivision: "09",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2574, res_union: 3393, com_open: 3159, com_union: 4212 } },
      { roleKey: "journeyman", roleLabel: "Journeyman Painter", rates: { res_open: 2200, res_union: 2900, com_open: 2700, com_union: 3600 } },
      { roleKey: "spray_painter", roleLabel: "Spray Painter", rates: { res_open: 2350, res_union: 3050, com_open: 2850, com_union: 3750 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1540, res_union: 2030, com_open: 1890, com_union: 2520 } },
    ],
  },
  {
    tradeName: "Tile & Flooring", csiDivision: "09",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2925, res_union: 3861, com_open: 3627, com_union: 4680 } },
      { roleKey: "tile_setter", roleLabel: "Tile Setter", rates: { res_open: 2500, res_union: 3300, com_open: 3100, com_union: 4000 } },
      { roleKey: "flooring_installer", roleLabel: "Flooring Installer", rates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1750, res_union: 2310, com_open: 2170, com_union: 2590 } },
    ],
  },
  // ─── Div 10: Specialties ─────────────────────────────────────
  {
    tradeName: "Specialties", csiDivision: "10",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2808, res_union: 3627, com_open: 3393, com_union: 4446 } },
      { roleKey: "installer", roleLabel: "Specialty Installer", rates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
      { roleKey: "helper", roleLabel: "Helper", rates: { res_open: 1680, res_union: 2170, com_open: 2030, com_union: 2660 } },
    ],
  },
  // ─── Div 21: Fire Suppression ────────────────────────────────
  {
    tradeName: "Fire Suppression", csiDivision: "21",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3276, res_union: 4329, com_open: 4095, com_union: 5382 } },
      { roleKey: "sprinkler_fitter", roleLabel: "Sprinkler Fitter", rates: { res_open: 2800, res_union: 3700, com_open: 3500, com_union: 4600 } },
      { roleKey: "apprentice", roleLabel: "Apprentice", rates: { res_open: 1960, res_union: 2590, com_open: 2450, com_union: 3220 } },
    ],
  },
  // ─── Div 22: Plumbing ────────────────────────────────────────
  {
    tradeName: "Plumbing", csiDivision: "22",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3393, res_union: 4446, com_open: 4212, com_union: 5499 } },
      { roleKey: "journeyman", roleLabel: "Journeyman Plumber", rates: { res_open: 2900, res_union: 3800, com_open: 3600, com_union: 4700 } },
      { roleKey: "pipefitter", roleLabel: "Pipefitter", rates: { res_open: 2800, res_union: 3700, com_open: 3500, com_union: 4600 } },
      { roleKey: "apprentice_4", roleLabel: "4th Year Apprentice", rates: { res_open: 2262, res_union: 2964, com_open: 2808, com_union: 3666 } },
      { roleKey: "apprentice_3", roleLabel: "3rd Year Apprentice", rates: { res_open: 1972, res_union: 2584, com_open: 2448, com_union: 3196 } },
      { roleKey: "apprentice_2", roleLabel: "2nd Year Apprentice", rates: { res_open: 1682, res_union: 2204, com_open: 2088, com_union: 2726 } },
      { roleKey: "apprentice_1", roleLabel: "1st Year Apprentice", rates: { res_open: 1392, res_union: 1824, com_open: 1728, com_union: 2256 } },
    ],
  },
  // ─── Div 23: HVAC ────────────────────────────────────────────
  {
    tradeName: "HVAC", csiDivision: "23",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3276, res_union: 4329, com_open: 4095, com_union: 5382 } },
      { roleKey: "mechanic", roleLabel: "HVAC Mechanic", rates: { res_open: 2800, res_union: 3700, com_open: 3500, com_union: 4600 } },
      { roleKey: "sheet_metal", roleLabel: "Sheet Metal Worker", rates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
      { roleKey: "apprentice_4", roleLabel: "4th Year Apprentice", rates: { res_open: 2184, res_union: 2886, com_open: 2730, com_union: 3588 } },
      { roleKey: "apprentice_3", roleLabel: "3rd Year Apprentice", rates: { res_open: 1904, res_union: 2516, com_open: 2380, com_union: 3128 } },
      { roleKey: "apprentice_2", roleLabel: "2nd Year Apprentice", rates: { res_open: 1624, res_union: 2146, com_open: 2030, com_union: 2668 } },
      { roleKey: "apprentice_1", roleLabel: "1st Year Apprentice", rates: { res_open: 1344, res_union: 1776, com_open: 1680, com_union: 2208 } },
    ],
  },
  // ─── Div 26: Electrical ──────────────────────────────────────
  {
    tradeName: "Electrical", csiDivision: "26",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3276, res_union: 4329, com_open: 4095, com_union: 5499 } },
      { roleKey: "journeyman", roleLabel: "Journeyman Electrician", rates: { res_open: 2800, res_union: 3700, com_open: 3500, com_union: 4700 } },
      { roleKey: "apprentice_4", roleLabel: "4th Year Apprentice", rates: { res_open: 2184, res_union: 2886, com_open: 2730, com_union: 3666 } },
      { roleKey: "apprentice_3", roleLabel: "3rd Year Apprentice", rates: { res_open: 1904, res_union: 2516, com_open: 2380, com_union: 3196 } },
      { roleKey: "apprentice_2", roleLabel: "2nd Year Apprentice", rates: { res_open: 1624, res_union: 2146, com_open: 2030, com_union: 2726 } },
      { roleKey: "apprentice_1", roleLabel: "1st Year Apprentice", rates: { res_open: 1344, res_union: 1776, com_open: 1680, com_union: 2256 } },
    ],
  },
  // ─── Div 27: Communications ──────────────────────────────────
  {
    tradeName: "Low Voltage / Communications", csiDivision: "27",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2808, res_union: 3627, com_open: 3393, com_union: 4446 } },
      { roleKey: "technician", roleLabel: "Low Voltage Technician", rates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
      { roleKey: "apprentice", roleLabel: "Apprentice", rates: { res_open: 1680, res_union: 2170, com_open: 2030, com_union: 2660 } },
    ],
  },
  // ─── Div 31: Earthwork ───────────────────────────────────────
  {
    tradeName: "Earthwork / Sitework", csiDivision: "31",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 3159, res_union: 4095, com_open: 3861, com_union: 5148 } },
      { roleKey: "heavy_operator", roleLabel: "Heavy Equipment Operator", rates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
      { roleKey: "light_operator", roleLabel: "Light Equipment Operator", rates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3850 } },
      { roleKey: "laborer", roleLabel: "General Laborer", rates: { res_open: 1900, res_union: 2500, com_open: 2400, com_union: 3100 } },
      { roleKey: "teamster", roleLabel: "Teamster / Truck Driver", rates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
    ],
  },
  // ─── Div 32: Exterior Improvements ───────────────────────────
  {
    tradeName: "Landscaping & Paving", csiDivision: "32",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2340, res_union: 3042, com_open: 2808, com_union: 3627 } },
      { roleKey: "landscape_worker", roleLabel: "Landscape Worker", rates: { res_open: 1800, res_union: 2400, com_open: 2200, com_union: 2900 } },
      { roleKey: "paving_operator", roleLabel: "Paving Operator", rates: { res_open: 2500, res_union: 3250, com_open: 3050, com_union: 3950 } },
      { roleKey: "paving_worker", roleLabel: "Paving Worker", rates: { res_open: 2200, res_union: 2900, com_open: 2700, com_union: 3500 } },
      { roleKey: "laborer", roleLabel: "Laborer", rates: { res_open: 1700, res_union: 2200, com_open: 2100, com_union: 2750 } },
    ],
  },
  // ─── Div 33: Utilities ───────────────────────────────────────
  {
    tradeName: "Utilities", csiDivision: "33",
    roles: [
      { roleKey: "foreman", roleLabel: "Foreman", rates: { res_open: 2691, res_union: 3510, com_open: 3276, com_union: 4329 } },
      { roleKey: "pipe_layer", roleLabel: "Pipe Layer", rates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
      { roleKey: "operator", roleLabel: "Equipment Operator", rates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
      { roleKey: "laborer", roleLabel: "Laborer", rates: { res_open: 1900, res_union: 2500, com_open: 2400, com_union: 3100 } },
    ],
  },
];

/**
 * Default crew compositions for each CSI division.
 * Pre-built so GCs have a starting point — they can tweak compositions and rates.
 */
export interface DefaultCrewMember {
  tradeName: string;
  roleKey: string;
  count: number;
}

export interface DefaultCrew {
  crewName: string;
  csiDivision: string;
  description: string;
  members: DefaultCrewMember[];
}

export const DEFAULT_CREWS: DefaultCrew[] = [
  // Div 02 — Demolition
  { crewName: "Demo Crew", csiDivision: "02", description: "Interior/exterior demolition",
    members: [
      { tradeName: "Demolition Worker", roleKey: "foreman", count: 1 },
      { tradeName: "Demolition Worker", roleKey: "operator", count: 1 },
      { tradeName: "Demolition Worker", roleKey: "laborer", count: 3 },
    ] },
  // Div 03 — Concrete
  { crewName: "Concrete Crew — Flatwork", csiDivision: "03", description: "Slabs, sidewalks, flatwork",
    members: [
      { tradeName: "Concrete", roleKey: "foreman", count: 1 },
      { tradeName: "Concrete", roleKey: "finisher", count: 2 },
      { tradeName: "Concrete", roleKey: "laborer", count: 2 },
    ] },
  { crewName: "Concrete Crew — Structural", csiDivision: "03", description: "Foundations, walls, columns",
    members: [
      { tradeName: "Concrete", roleKey: "foreman", count: 1 },
      { tradeName: "Concrete", roleKey: "form_carpenter", count: 2 },
      { tradeName: "Concrete", roleKey: "finisher", count: 1 },
      { tradeName: "Concrete", roleKey: "laborer", count: 3 },
      { tradeName: "Concrete", roleKey: "pump_operator", count: 1 },
    ] },
  // Div 04 — Masonry
  { crewName: "Brick Crew", csiDivision: "04", description: "Brick veneer, structural brick",
    members: [
      { tradeName: "Masonry", roleKey: "foreman", count: 1 },
      { tradeName: "Masonry", roleKey: "bricklayer", count: 3 },
      { tradeName: "Masonry", roleKey: "mason_tender", count: 2 },
    ] },
  { crewName: "Block Crew", csiDivision: "04", description: "CMU block walls",
    members: [
      { tradeName: "Masonry", roleKey: "foreman", count: 1 },
      { tradeName: "Masonry", roleKey: "block_layer", count: 2 },
      { tradeName: "Masonry", roleKey: "mason_tender", count: 2 },
    ] },
  // Div 05 — Metals
  { crewName: "Steel Erection Crew", csiDivision: "05", description: "Structural steel erection",
    members: [
      { tradeName: "Structural Steel / Iron Work", roleKey: "foreman", count: 1 },
      { tradeName: "Structural Steel / Iron Work", roleKey: "iron_worker", count: 2 },
      { tradeName: "Structural Steel / Iron Work", roleKey: "connector", count: 1 },
      { tradeName: "Structural Steel / Iron Work", roleKey: "rigger", count: 1 },
    ] },
  { crewName: "Welding Crew", csiDivision: "05", description: "Field welding, misc metals",
    members: [
      { tradeName: "Structural Steel / Iron Work", roleKey: "foreman", count: 1 },
      { tradeName: "Structural Steel / Iron Work", roleKey: "welder", count: 2 },
      { tradeName: "Structural Steel / Iron Work", roleKey: "helper", count: 1 },
    ] },
  // Div 06 — Carpentry
  { crewName: "Framing Crew", csiDivision: "06", description: "Wood framing, rough carpentry",
    members: [
      { tradeName: "Carpentry", roleKey: "foreman", count: 1 },
      { tradeName: "Carpentry", roleKey: "framer", count: 3 },
      { tradeName: "Carpentry", roleKey: "helper", count: 1 },
    ] },
  { crewName: "Finish Carpentry Crew", csiDivision: "06", description: "Trim, casework, millwork",
    members: [
      { tradeName: "Carpentry", roleKey: "foreman", count: 1 },
      { tradeName: "Carpentry", roleKey: "finish_carpenter", count: 2 },
      { tradeName: "Carpentry", roleKey: "helper", count: 1 },
    ] },
  // Div 07 — Roofing
  { crewName: "Roofing Crew", csiDivision: "07", description: "Roof installation and repair",
    members: [
      { tradeName: "Roofing", roleKey: "foreman", count: 1 },
      { tradeName: "Roofing", roleKey: "journeyman", count: 3 },
      { tradeName: "Roofing", roleKey: "helper", count: 1 },
    ] },
  { crewName: "Waterproofing Crew", csiDivision: "07", description: "Below-grade waterproofing, insulation",
    members: [
      { tradeName: "Roofing", roleKey: "foreman", count: 1 },
      { tradeName: "Roofing", roleKey: "waterproofer", count: 2 },
      { tradeName: "Roofing", roleKey: "insulation_worker", count: 1 },
      { tradeName: "Roofing", roleKey: "helper", count: 1 },
    ] },
  // Div 08 — Openings
  { crewName: "Glazing Crew", csiDivision: "08", description: "Windows, curtain wall, storefront",
    members: [
      { tradeName: "Glazing / Openings", roleKey: "foreman", count: 1 },
      { tradeName: "Glazing / Openings", roleKey: "glazier", count: 2 },
      { tradeName: "Glazing / Openings", roleKey: "helper", count: 1 },
    ] },
  // Div 09 — Finishes
  { crewName: "Drywall Crew", csiDivision: "09", description: "Hang and finish drywall",
    members: [
      { tradeName: "Drywall", roleKey: "foreman", count: 1 },
      { tradeName: "Drywall", roleKey: "hanger", count: 2 },
      { tradeName: "Drywall", roleKey: "taper", count: 2 },
      { tradeName: "Drywall", roleKey: "helper", count: 1 },
    ] },
  { crewName: "Paint Crew", csiDivision: "09", description: "Interior/exterior painting",
    members: [
      { tradeName: "Painting", roleKey: "foreman", count: 1 },
      { tradeName: "Painting", roleKey: "journeyman", count: 2 },
      { tradeName: "Painting", roleKey: "spray_painter", count: 1 },
      { tradeName: "Painting", roleKey: "helper", count: 1 },
    ] },
  { crewName: "Tile Crew", csiDivision: "09", description: "Tile installation",
    members: [
      { tradeName: "Tile & Flooring", roleKey: "foreman", count: 1 },
      { tradeName: "Tile & Flooring", roleKey: "tile_setter", count: 2 },
      { tradeName: "Tile & Flooring", roleKey: "helper", count: 1 },
    ] },
  { crewName: "Flooring Crew", csiDivision: "09", description: "VCT, carpet, LVP, hardwood",
    members: [
      { tradeName: "Tile & Flooring", roleKey: "foreman", count: 1 },
      { tradeName: "Tile & Flooring", roleKey: "flooring_installer", count: 2 },
      { tradeName: "Tile & Flooring", roleKey: "helper", count: 1 },
    ] },
  // Div 10 — Specialties
  { crewName: "Specialty Install Crew", csiDivision: "10", description: "Toilet accessories, signage, lockers",
    members: [
      { tradeName: "Specialties", roleKey: "installer", count: 2 },
      { tradeName: "Specialties", roleKey: "helper", count: 1 },
    ] },
  // Div 21 — Fire Suppression
  { crewName: "Sprinkler Crew", csiDivision: "21", description: "Fire sprinkler installation",
    members: [
      { tradeName: "Fire Suppression", roleKey: "foreman", count: 1 },
      { tradeName: "Fire Suppression", roleKey: "sprinkler_fitter", count: 2 },
      { tradeName: "Fire Suppression", roleKey: "apprentice", count: 1 },
    ] },
  // Div 22 — Plumbing
  { crewName: "Plumbing Rough-In Crew", csiDivision: "22", description: "Underground and rough-in plumbing",
    members: [
      { tradeName: "Plumbing", roleKey: "foreman", count: 1 },
      { tradeName: "Plumbing", roleKey: "journeyman", count: 2 },
      { tradeName: "Plumbing", roleKey: "apprentice_3", count: 1 },
      { tradeName: "Plumbing", roleKey: "apprentice_1", count: 1 },
    ] },
  { crewName: "Plumbing Trim Crew", csiDivision: "22", description: "Fixture trim and testing",
    members: [
      { tradeName: "Plumbing", roleKey: "foreman", count: 1 },
      { tradeName: "Plumbing", roleKey: "journeyman", count: 2 },
      { tradeName: "Plumbing", roleKey: "apprentice_2", count: 1 },
    ] },
  // Div 23 — HVAC
  { crewName: "HVAC Install Crew", csiDivision: "23", description: "Ductwork and equipment installation",
    members: [
      { tradeName: "HVAC", roleKey: "foreman", count: 1 },
      { tradeName: "HVAC", roleKey: "mechanic", count: 1 },
      { tradeName: "HVAC", roleKey: "sheet_metal", count: 2 },
      { tradeName: "HVAC", roleKey: "apprentice_2", count: 1 },
    ] },
  // Div 26 — Electrical
  { crewName: "Electrical Rough-In Crew", csiDivision: "26", description: "Conduit, wire, panel installation",
    members: [
      { tradeName: "Electrical", roleKey: "foreman", count: 1 },
      { tradeName: "Electrical", roleKey: "journeyman", count: 2 },
      { tradeName: "Electrical", roleKey: "apprentice_3", count: 1 },
      { tradeName: "Electrical", roleKey: "apprentice_1", count: 1 },
    ] },
  { crewName: "Electrical Trim Crew", csiDivision: "26", description: "Device trim, fixtures, testing",
    members: [
      { tradeName: "Electrical", roleKey: "foreman", count: 1 },
      { tradeName: "Electrical", roleKey: "journeyman", count: 2 },
      { tradeName: "Electrical", roleKey: "apprentice_2", count: 1 },
    ] },
  // Div 27 — Communications
  { crewName: "Low Voltage Crew", csiDivision: "27", description: "Data, fire alarm, security",
    members: [
      { tradeName: "Low Voltage / Communications", roleKey: "foreman", count: 1 },
      { tradeName: "Low Voltage / Communications", roleKey: "technician", count: 2 },
      { tradeName: "Low Voltage / Communications", roleKey: "apprentice", count: 1 },
    ] },
  // Div 31 — Earthwork
  { crewName: "Excavation Crew", csiDivision: "31", description: "Site excavation, grading, backfill",
    members: [
      { tradeName: "Earthwork / Sitework", roleKey: "foreman", count: 1 },
      { tradeName: "Earthwork / Sitework", roleKey: "heavy_operator", count: 2 },
      { tradeName: "Earthwork / Sitework", roleKey: "laborer", count: 2 },
      { tradeName: "Earthwork / Sitework", roleKey: "teamster", count: 1 },
    ] },
  { crewName: "Grading Crew", csiDivision: "31", description: "Fine grading, compaction",
    members: [
      { tradeName: "Earthwork / Sitework", roleKey: "foreman", count: 1 },
      { tradeName: "Earthwork / Sitework", roleKey: "light_operator", count: 1 },
      { tradeName: "Earthwork / Sitework", roleKey: "laborer", count: 2 },
    ] },
  // Div 32 — Exterior Improvements
  { crewName: "Paving Crew", csiDivision: "32", description: "Asphalt/concrete paving",
    members: [
      { tradeName: "Landscaping & Paving", roleKey: "foreman", count: 1 },
      { tradeName: "Landscaping & Paving", roleKey: "paving_operator", count: 1 },
      { tradeName: "Landscaping & Paving", roleKey: "paving_worker", count: 2 },
      { tradeName: "Landscaping & Paving", roleKey: "laborer", count: 2 },
    ] },
  { crewName: "Landscape Crew", csiDivision: "32", description: "Planting, irrigation, hardscape",
    members: [
      { tradeName: "Landscaping & Paving", roleKey: "foreman", count: 1 },
      { tradeName: "Landscaping & Paving", roleKey: "landscape_worker", count: 3 },
      { tradeName: "Landscaping & Paving", roleKey: "laborer", count: 1 },
    ] },
  // Div 33 — Utilities
  { crewName: "Utility Crew", csiDivision: "33", description: "Underground utilities, storm/sanitary/water",
    members: [
      { tradeName: "Utilities", roleKey: "foreman", count: 1 },
      { tradeName: "Utilities", roleKey: "pipe_layer", count: 2 },
      { tradeName: "Utilities", roleKey: "operator", count: 1 },
      { tradeName: "Utilities", roleKey: "laborer", count: 2 },
    ] },
];

/**
 * Default burden rates by labor type (basis points unless noted).
 * These are starting defaults — users customize with their actual numbers.
 */
export interface BurdenDefaults {
  ficaPct: number;
  futaPct: number;
  sutaPct: number;
  workersCompPct: number;
  generalLiabilityPct: number;
  healthInsuranceCentsPerHr: number;
  pensionPct: number;
  vacationPct: number;
  trainingPct: number;
  unionFringeCentsPerHr: number;
  otherCentsPerHr: number;
}

export const DEFAULT_BURDENS: Record<LaborType, BurdenDefaults> = {
  res_open: {
    ficaPct: 765,       // 7.65%
    futaPct: 60,        // 0.60%
    sutaPct: 270,       // 2.70%
    workersCompPct: 700, // 7.00%
    generalLiabilityPct: 150, // 1.50%
    healthInsuranceCentsPerHr: 650, // $6.50/hr
    pensionPct: 200,    // 2.00%
    vacationPct: 350,   // 3.50%
    trainingPct: 0,
    unionFringeCentsPerHr: 0,
    otherCentsPerHr: 0,
  },
  res_union: {
    ficaPct: 765,
    futaPct: 60,
    sutaPct: 270,
    workersCompPct: 750,
    generalLiabilityPct: 175,
    healthInsuranceCentsPerHr: 1200, // $12.00/hr
    pensionPct: 500,    // 5.00%
    vacationPct: 400,
    trainingPct: 150,   // 1.50%
    unionFringeCentsPerHr: 450, // $4.50/hr
    otherCentsPerHr: 0,
  },
  com_open: {
    ficaPct: 765,
    futaPct: 60,
    sutaPct: 270,
    workersCompPct: 900,
    generalLiabilityPct: 200,
    healthInsuranceCentsPerHr: 850, // $8.50/hr
    pensionPct: 300,
    vacationPct: 400,
    trainingPct: 50,
    unionFringeCentsPerHr: 0,
    otherCentsPerHr: 0,
  },
  com_union: {
    ficaPct: 765,
    futaPct: 60,
    sutaPct: 270,
    workersCompPct: 1000,
    generalLiabilityPct: 225,
    healthInsuranceCentsPerHr: 1400, // $14.00/hr
    pensionPct: 600,
    vacationPct: 450,
    trainingPct: 200,
    unionFringeCentsPerHr: 650, // $6.50/hr
    otherCentsPerHr: 0,
  },
};

/**
 * Calculate fully burdened rate from base wage and burden config.
 * @param baseWageCents - Base hourly wage in cents
 * @param burden - Burden configuration
 * @returns Fully burdened rate in cents per hour
 */
export function calculateBurdenedRate(baseWageCents: number, burden: BurdenDefaults): number {
  const pctBurden =
    burden.ficaPct +
    burden.futaPct +
    burden.sutaPct +
    burden.workersCompPct +
    burden.generalLiabilityPct +
    burden.pensionPct +
    burden.vacationPct +
    burden.trainingPct;

  const wageWithPctBurden = Math.round(baseWageCents * (1 + pctBurden / 10000));

  const totalBurdened =
    wageWithPctBurden +
    burden.healthInsuranceCentsPerHr +
    burden.unionFringeCentsPerHr +
    burden.otherCentsPerHr;

  return totalBurdened;
}

// ─── Legacy compatibility ──────────────────────────────────────
// Keep these exports so existing code that imports Classification still works
export type Classification = string;
export const CLASSIFICATION_LABELS: Record<string, string> = {};
export const CLASSIFICATION_ORDER: string[] = [];
export const CLASSIFICATION_MULTIPLIERS: Record<string, number> = {};

/** Get base wage for a trade + role + labor type */
export function getBaseWage(
  tradeName: string,
  roleKey: string,
  laborType: LaborType
): number | null {
  const trade = TRADES.find((t) => t.tradeName === tradeName);
  if (!trade) return null;
  const role = trade.roles.find((r) => r.roleKey === roleKey);
  if (!role) return null;
  return role.rates[laborType];
}

const LEGACY_ROLE_FALLBACKS: Record<string, string[]> = {
  journeyman: [
    "journeyman",
    "finisher",
    "bricklayer",
    "block_layer",
    "form_carpenter",
    "operator",
    "installer",
    "technician",
    "mechanic",
    "laborer",
  ],
  apprentice: ["apprentice", "apprentice_2", "helper", "laborer"],
  apprentice_1: ["apprentice_1", "apprentice", "helper", "laborer"],
  apprentice_2: ["apprentice_2", "apprentice", "helper", "laborer"],
  apprentice_3: ["apprentice_3", "apprentice", "helper", "laborer"],
  apprentice_4: ["apprentice_4", "apprentice", "helper", "laborer"],
  helper: ["helper", "apprentice", "laborer"],
  operator: ["operator", "equipment_operator", "pump_operator", "laborer"],
};

/**
 * Resolve legacy or generic crew role keys to a valid role for the selected trade.
 * Older seeded crews used generic classifications like journeyman/apprentice_2
 * even when a trade has more specific roles such as finisher or laborer.
 */
export function resolveTradeRoleKey(tradeName: string, roleKey: string): string | null {
  const trade = TRADES.find((t) => t.tradeName === tradeName);
  if (!trade) return null;

  const available = new Set(trade.roles.map((r) => r.roleKey));
  if (available.has(roleKey)) return roleKey;

  for (const candidate of LEGACY_ROLE_FALLBACKS[roleKey] || []) {
    if (available.has(candidate)) return candidate;
  }

  return trade.roles[0]?.roleKey ?? null;
}

export function getResolvedBaseWage(
  tradeName: string,
  roleKey: string,
  laborType: LaborType,
  userRateMap?: Map<string, number>
): number | null {
  const exactUserRate = userRateMap?.get(`${tradeName}|${roleKey}`);
  if (exactUserRate !== undefined) return exactUserRate;

  const exactBase = getBaseWage(tradeName, roleKey, laborType);
  if (exactBase !== null) return exactBase;

  const resolvedRoleKey = resolveTradeRoleKey(tradeName, roleKey);
  if (!resolvedRoleKey || resolvedRoleKey === roleKey) return null;

  const resolvedUserRate = userRateMap?.get(`${tradeName}|${resolvedRoleKey}`);
  if (resolvedUserRate !== undefined) return resolvedUserRate;

  return getBaseWage(tradeName, resolvedRoleKey, laborType);
}
