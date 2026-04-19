/**
 * ConstructLine Trade Rate Reference Data
 *
 * Baseline hourly wage rates (BEFORE burden) by trade, classification, and labor type.
 * Sources: RS Means 2025 Labor Rates, BLS Occupational Employment & Wage Statistics,
 * Associated Builders & Contractors (ABC), union CBAs for major metro areas.
 *
 * All rates are US National Average in cents per hour.
 * Regional multipliers from costRegions.ts are applied separately.
 * Burden is calculated separately using the user's burden configuration.
 *
 * Classification scale (typical):
 *   Foreman:          ~115-120% of Journeyman
 *   Journeyman:       100% (base)
 *   4th Year Apprentice: 75-80%
 *   3rd Year Apprentice: 65-70%
 *   2nd Year Apprentice: 55-60%
 *   1st Year Apprentice: 45-50%
 */

export type Classification =
  | "foreman"
  | "journeyman"
  | "apprentice_4"
  | "apprentice_3"
  | "apprentice_2"
  | "apprentice_1";

export const CLASSIFICATION_LABELS: Record<Classification, string> = {
  foreman: "Foreman",
  journeyman: "Journeyman",
  apprentice_4: "4th Year Apprentice",
  apprentice_3: "3rd Year Apprentice",
  apprentice_2: "2nd Year Apprentice",
  apprentice_1: "1st Year Apprentice",
};

export const CLASSIFICATION_ORDER: Classification[] = [
  "foreman",
  "journeyman",
  "apprentice_4",
  "apprentice_3",
  "apprentice_2",
  "apprentice_1",
];

export type LaborType = "res_open" | "res_union" | "com_open" | "com_union";

export const LABOR_TYPE_LABELS: Record<LaborType, string> = {
  res_open: "Residential — Open Shop",
  res_union: "Residential — Union",
  com_open: "Commercial — Open Shop",
  com_union: "Commercial — Union",
};

export interface TradeDefinition {
  tradeName: string;
  /** Primary CSI division */
  csiDivision: string;
  /** Base journeyman rates in cents/hr for each labor type */
  journeymanRates: Record<LaborType, number>;
}

/**
 * Baseline trades with journeyman rates. Other classifications are derived
 * using the CLASSIFICATION_MULTIPLIERS below.
 */
export const TRADES: TradeDefinition[] = [
  // ─── Div 02: Existing Conditions ──────────────────────────────
  { tradeName: "Demolition Worker", csiDivision: "02", journeymanRates: { res_open: 2200, res_union: 2850, com_open: 2750, com_union: 3500 } },
  // ─── Div 03: Concrete ────────────────────────────────────────
  { tradeName: "Cement Mason / Finisher", csiDivision: "03", journeymanRates: { res_open: 2600, res_union: 3400, com_open: 3200, com_union: 4200 } },
  { tradeName: "Concrete Laborer", csiDivision: "03", journeymanRates: { res_open: 2100, res_union: 2750, com_open: 2650, com_union: 3400 } },
  // ─── Div 04: Masonry ─────────────────────────────────────────
  { tradeName: "Bricklayer / Mason", csiDivision: "04", journeymanRates: { res_open: 2800, res_union: 3600, com_open: 3400, com_union: 4500 } },
  // ─── Div 05: Metals ──────────────────────────────────────────
  { tradeName: "Structural Iron Worker", csiDivision: "05", journeymanRates: { res_open: 2900, res_union: 3800, com_open: 3600, com_union: 4800 } },
  { tradeName: "Welder", csiDivision: "05", journeymanRates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
  // ─── Div 06: Wood, Plastics & Composites ─────────────────────
  { tradeName: "Carpenter", csiDivision: "06", journeymanRates: { res_open: 2500, res_union: 3300, com_open: 3100, com_union: 4100 } },
  { tradeName: "Framer", csiDivision: "06", journeymanRates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
  // ─── Div 07: Thermal & Moisture Protection ───────────────────
  { tradeName: "Roofer", csiDivision: "07", journeymanRates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
  { tradeName: "Insulation Worker", csiDivision: "07", journeymanRates: { res_open: 2200, res_union: 2900, com_open: 2700, com_union: 3500 } },
  { tradeName: "Waterproofer", csiDivision: "07", journeymanRates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
  // ─── Div 08: Openings ────────────────────────────────────────
  { tradeName: "Glazier", csiDivision: "08", journeymanRates: { res_open: 2600, res_union: 3400, com_open: 3200, com_union: 4200 } },
  // ─── Div 09: Finishes ────────────────────────────────────────
  { tradeName: "Drywall Installer / Finisher", csiDivision: "09", journeymanRates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
  { tradeName: "Painter", csiDivision: "09", journeymanRates: { res_open: 2200, res_union: 2900, com_open: 2700, com_union: 3600 } },
  { tradeName: "Tile Setter", csiDivision: "09", journeymanRates: { res_open: 2500, res_union: 3300, com_open: 3100, com_union: 4000 } },
  { tradeName: "Flooring Installer", csiDivision: "09", journeymanRates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
  // ─── Div 10: Specialties ─────────────────────────────────────
  { tradeName: "Specialty Installer", csiDivision: "10", journeymanRates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
  // ─── Div 21: Fire Suppression ────────────────────────────────
  { tradeName: "Sprinkler Fitter", csiDivision: "21", journeymanRates: { res_open: 2800, res_union: 3700, com_open: 3500, com_union: 4600 } },
  // ─── Div 22: Plumbing ────────────────────────────────────────
  { tradeName: "Plumber / Pipefitter", csiDivision: "22", journeymanRates: { res_open: 2900, res_union: 3800, com_open: 3600, com_union: 4700 } },
  // ─── Div 23: HVAC ────────────────────────────────────────────
  { tradeName: "HVAC Mechanic", csiDivision: "23", journeymanRates: { res_open: 2800, res_union: 3700, com_open: 3500, com_union: 4600 } },
  { tradeName: "Sheet Metal Worker", csiDivision: "23", journeymanRates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
  // ─── Div 26: Electrical ──────────────────────────────────────
  { tradeName: "Electrician", csiDivision: "26", journeymanRates: { res_open: 2800, res_union: 3700, com_open: 3500, com_union: 4700 } },
  // ─── Div 27: Communications ──────────────────────────────────
  { tradeName: "Low Voltage Technician", csiDivision: "27", journeymanRates: { res_open: 2400, res_union: 3100, com_open: 2900, com_union: 3800 } },
  // ─── Div 31: Earthwork ───────────────────────────────────────
  { tradeName: "Equipment Operator", csiDivision: "31", journeymanRates: { res_open: 2700, res_union: 3500, com_open: 3300, com_union: 4400 } },
  { tradeName: "General Laborer", csiDivision: "31", journeymanRates: { res_open: 1900, res_union: 2500, com_open: 2400, com_union: 3100 } },
  // ─── Div 32: Exterior Improvements ───────────────────────────
  { tradeName: "Landscape Laborer", csiDivision: "32", journeymanRates: { res_open: 1800, res_union: 2400, com_open: 2200, com_union: 2900 } },
  { tradeName: "Paving Worker", csiDivision: "32", journeymanRates: { res_open: 2200, res_union: 2900, com_open: 2700, com_union: 3500 } },
  // ─── Div 33: Utilities ───────────────────────────────────────
  { tradeName: "Pipe Layer", csiDivision: "33", journeymanRates: { res_open: 2300, res_union: 3000, com_open: 2800, com_union: 3700 } },
];

/**
 * Classification multipliers relative to Journeyman (1.00).
 * Applied to the journeyman base wage to derive other classification rates.
 */
export const CLASSIFICATION_MULTIPLIERS: Record<Classification, number> = {
  foreman: 1.17,
  journeyman: 1.00,
  apprentice_4: 0.78,
  apprentice_3: 0.68,
  apprentice_2: 0.58,
  apprentice_1: 0.48,
};

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
    workersCompPct: 900, // higher WC for commercial
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
  // Percentage-based burdens (applied to base wage)
  const pctBurden =
    burden.ficaPct +
    burden.futaPct +
    burden.sutaPct +
    burden.workersCompPct +
    burden.generalLiabilityPct +
    burden.pensionPct +
    burden.vacationPct +
    burden.trainingPct;

  // Base wage + percentage burden
  const wageWithPctBurden = Math.round(baseWageCents * (1 + pctBurden / 10000));

  // Add fixed $/hr burdens
  const totalBurdened =
    wageWithPctBurden +
    burden.healthInsuranceCentsPerHr +
    burden.unionFringeCentsPerHr +
    burden.otherCentsPerHr;

  return totalBurdened;
}

/**
 * Get the base wage for a trade + classification + labor type.
 * Looks up the journeyman rate and applies the classification multiplier.
 */
export function getBaseWage(
  tradeName: string,
  classification: Classification,
  laborType: LaborType
): number | null {
  const trade = TRADES.find((t) => t.tradeName === tradeName);
  if (!trade) return null;
  const journeymanRate = trade.journeymanRates[laborType];
  const multiplier = CLASSIFICATION_MULTIPLIERS[classification];
  return Math.round(journeymanRate * multiplier);
}
