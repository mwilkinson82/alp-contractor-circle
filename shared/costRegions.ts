/**
 * Regional Cost Factors — RSMeans-style city cost index multipliers.
 *
 * Multipliers are stored as integer basis points (10000 = 1.00x).
 * Example: 10500 = 1.05x, 8700 = 0.87x
 *
 * Base costs represent national average (1.00x = 10000 basis points).
 * Regional multipliers adjust base costs up or down based on local market conditions.
 *
 * Sources: RSMeans City Cost Index data, ENR Construction Cost Index,
 * and industry experience across US construction markets.
 */

export interface CostRegion {
  code: string;
  name: string;
  description: string;
  /** Multiplier in basis points (10000 = 1.00x) */
  multiplier: number;
  /** Display multiplier as percentage string */
  displayMultiplier: string;
}

export interface CostRegionGroup {
  region: string;
  metros: CostRegion[];
}

/**
 * All available cost regions organized by geographic area.
 * Each metro area has its own multiplier based on RSMeans data.
 */
export const COST_REGION_GROUPS: CostRegionGroup[] = [
  {
    region: "National",
    metros: [
      { code: "national", name: "National Average", description: "US national average — no adjustment", multiplier: 10000, displayMultiplier: "1.00x" },
    ],
  },
  {
    region: "Northeast",
    metros: [
      { code: "ne-nyc", name: "New York City", description: "NYC metro area (Manhattan, Brooklyn, Queens)", multiplier: 13400, displayMultiplier: "1.34x" },
      { code: "ne-boston", name: "Boston", description: "Boston metro area", multiplier: 12200, displayMultiplier: "1.22x" },
      { code: "ne-philly", name: "Philadelphia", description: "Philadelphia metro area", multiplier: 11500, displayMultiplier: "1.15x" },
      { code: "ne-hartford", name: "Hartford", description: "Hartford / Connecticut", multiplier: 11200, displayMultiplier: "1.12x" },
      { code: "ne-newark", name: "Newark / N. New Jersey", description: "Northern New Jersey", multiplier: 12000, displayMultiplier: "1.20x" },
      { code: "ne-pittsburgh", name: "Pittsburgh", description: "Pittsburgh metro area", multiplier: 10300, displayMultiplier: "1.03x" },
      { code: "ne-dc", name: "Washington D.C.", description: "DC metro area (includes NoVA, MD suburbs)", multiplier: 10800, displayMultiplier: "1.08x" },
      { code: "ne-baltimore", name: "Baltimore", description: "Baltimore metro area", multiplier: 10200, displayMultiplier: "1.02x" },
    ],
  },
  {
    region: "Southeast",
    metros: [
      { code: "se-atlanta", name: "Atlanta", description: "Atlanta metro area", multiplier: 9400, displayMultiplier: "0.94x" },
      { code: "se-miami", name: "Miami", description: "South Florida (Miami-Dade, Broward)", multiplier: 9700, displayMultiplier: "0.97x" },
      { code: "se-tampa", name: "Tampa", description: "Tampa Bay area", multiplier: 9200, displayMultiplier: "0.92x" },
      { code: "se-orlando", name: "Orlando", description: "Central Florida", multiplier: 9100, displayMultiplier: "0.91x" },
      { code: "se-charlotte", name: "Charlotte", description: "Charlotte metro area", multiplier: 9000, displayMultiplier: "0.90x" },
      { code: "se-raleigh", name: "Raleigh-Durham", description: "Research Triangle, NC", multiplier: 9000, displayMultiplier: "0.90x" },
      { code: "se-nashville", name: "Nashville", description: "Nashville metro area", multiplier: 9300, displayMultiplier: "0.93x" },
      { code: "se-charleston", name: "Charleston", description: "Charleston, SC", multiplier: 8800, displayMultiplier: "0.88x" },
      { code: "se-jacksonville", name: "Jacksonville", description: "Jacksonville, FL", multiplier: 8900, displayMultiplier: "0.89x" },
    ],
  },
  {
    region: "Midwest",
    metros: [
      { code: "mw-chicago", name: "Chicago", description: "Chicago metro area", multiplier: 11200, displayMultiplier: "1.12x" },
      { code: "mw-detroit", name: "Detroit", description: "Detroit metro area", multiplier: 10500, displayMultiplier: "1.05x" },
      { code: "mw-minneapolis", name: "Minneapolis", description: "Twin Cities metro area", multiplier: 10800, displayMultiplier: "1.08x" },
      { code: "mw-stlouis", name: "St. Louis", description: "St. Louis metro area", multiplier: 10200, displayMultiplier: "1.02x" },
      { code: "mw-columbus", name: "Columbus", description: "Columbus, OH", multiplier: 9700, displayMultiplier: "0.97x" },
      { code: "mw-indianapolis", name: "Indianapolis", description: "Indianapolis metro area", multiplier: 9600, displayMultiplier: "0.96x" },
      { code: "mw-kansascity", name: "Kansas City", description: "KC metro area (MO/KS)", multiplier: 9800, displayMultiplier: "0.98x" },
      { code: "mw-milwaukee", name: "Milwaukee", description: "Milwaukee metro area", multiplier: 10300, displayMultiplier: "1.03x" },
      { code: "mw-cincinnati", name: "Cincinnati", description: "Cincinnati metro area", multiplier: 9500, displayMultiplier: "0.95x" },
    ],
  },
  {
    region: "Southwest",
    metros: [
      { code: "sw-dallas", name: "Dallas-Fort Worth", description: "DFW metro area", multiplier: 9200, displayMultiplier: "0.92x" },
      { code: "sw-houston", name: "Houston", description: "Houston metro area", multiplier: 9300, displayMultiplier: "0.93x" },
      { code: "sw-sanantonio", name: "San Antonio", description: "San Antonio metro area", multiplier: 8800, displayMultiplier: "0.88x" },
      { code: "sw-austin", name: "Austin", description: "Austin metro area", multiplier: 9100, displayMultiplier: "0.91x" },
      { code: "sw-phoenix", name: "Phoenix", description: "Phoenix metro area", multiplier: 9200, displayMultiplier: "0.92x" },
      { code: "sw-denver", name: "Denver", description: "Denver metro area", multiplier: 9800, displayMultiplier: "0.98x" },
      { code: "sw-lasvegas", name: "Las Vegas", description: "Las Vegas metro area", multiplier: 10100, displayMultiplier: "1.01x" },
      { code: "sw-albuquerque", name: "Albuquerque", description: "Albuquerque, NM", multiplier: 9000, displayMultiplier: "0.90x" },
    ],
  },
  {
    region: "West Coast",
    metros: [
      { code: "wc-la", name: "Los Angeles", description: "LA metro area", multiplier: 11500, displayMultiplier: "1.15x" },
      { code: "wc-sf", name: "San Francisco", description: "SF Bay Area", multiplier: 13200, displayMultiplier: "1.32x" },
      { code: "wc-sanjose", name: "San Jose / Silicon Valley", description: "South Bay / Silicon Valley", multiplier: 12800, displayMultiplier: "1.28x" },
      { code: "wc-sandiego", name: "San Diego", description: "San Diego metro area", multiplier: 10800, displayMultiplier: "1.08x" },
      { code: "wc-sacramento", name: "Sacramento", description: "Sacramento metro area", multiplier: 10600, displayMultiplier: "1.06x" },
      { code: "wc-honolulu", name: "Honolulu", description: "Hawaii (Oahu)", multiplier: 12500, displayMultiplier: "1.25x" },
    ],
  },
  {
    region: "Pacific Northwest",
    metros: [
      { code: "pnw-seattle", name: "Seattle", description: "Seattle metro area", multiplier: 11000, displayMultiplier: "1.10x" },
      { code: "pnw-portland", name: "Portland", description: "Portland, OR metro area", multiplier: 10500, displayMultiplier: "1.05x" },
      { code: "pnw-anchorage", name: "Anchorage", description: "Anchorage, AK", multiplier: 12000, displayMultiplier: "1.20x" },
    ],
  },
];

/** Flat list of all cost regions for easy lookup */
export const COST_REGIONS: CostRegion[] = COST_REGION_GROUPS.flatMap((g) => g.metros);

/** Lookup map: code → CostRegion */
const REGION_MAP = new Map<string, CostRegion>(
  COST_REGIONS.map((r) => [r.code, r])
);

/**
 * Get the multiplier (basis points) for a region code.
 * Returns null if the code is not found.
 */
export function getRegionMultiplier(code: string): number | null {
  const region = REGION_MAP.get(code);
  return region ? region.multiplier : null;
}

/**
 * Get the full CostRegion object for a code.
 */
export function getRegion(code: string): CostRegion | null {
  return REGION_MAP.get(code) || null;
}

/**
 * Apply a regional multiplier to a base cost (in cents).
 * Returns the adjusted cost in cents.
 */
export function applyRegionalMultiplier(baseCostCents: number, multiplierBasisPoints: number): number {
  return Math.round((baseCostCents * multiplierBasisPoints) / 10000);
}
