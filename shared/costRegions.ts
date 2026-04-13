/**
 * Regional Cost Factors — city cost index multipliers by country.
 *
 * Multipliers are stored as integer basis points (10000 = 1.00x).
 * Example: 10500 = 1.05x, 8700 = 0.87x
 *
 * Base costs represent national/country average (1.00x = 10000 basis points).
 * Regional multipliers adjust base costs up or down based on local market conditions.
 *
 * US Sources: RSMeans City Cost Index data, ENR Construction Cost Index
 * UK Sources: BCIS Location Factor data (Royal Institution of Chartered Surveyors)
 * AUS Sources: Rawlinsons Construction Cost Guide, ASEstimation data
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
  /** Country code this group belongs to: "US", "UK", "AU" */
  country?: string;
  metros: CostRegion[];
}

// ─── United States ──────────────────────────────────────────────────────────

const US_REGION_GROUPS: CostRegionGroup[] = [
  {
    region: "National",
    country: "US",
    metros: [
      { code: "national", name: "National Average", description: "US national average — no adjustment", multiplier: 10000, displayMultiplier: "1.00x" },
    ],
  },
  {
    region: "Northeast",
    country: "US",
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
    country: "US",
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
    country: "US",
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
    country: "US",
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
    country: "US",
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
    country: "US",
    metros: [
      { code: "pnw-seattle", name: "Seattle", description: "Seattle metro area", multiplier: 11000, displayMultiplier: "1.10x" },
      { code: "pnw-portland", name: "Portland", description: "Portland, OR metro area", multiplier: 10500, displayMultiplier: "1.05x" },
      { code: "pnw-anchorage", name: "Anchorage", description: "Anchorage, AK", multiplier: 12000, displayMultiplier: "1.20x" },
    ],
  },
];

// ─── United Kingdom ─────────────────────────────────────────────────────────
// Source: BCIS Location Factor data (Royal Institution of Chartered Surveyors), 2026
// East Midlands used as baseline (1.00x), other regions adjusted relative to it.

const UK_REGION_GROUPS: CostRegionGroup[] = [
  {
    region: "UK National",
    country: "UK",
    metros: [
      { code: "uk-national", name: "UK National Average", description: "UK national average — no adjustment", multiplier: 10000, displayMultiplier: "1.00x" },
    ],
  },
  {
    region: "Greater London",
    country: "UK",
    metros: [
      { code: "uk-inner-london", name: "Inner London", description: "Central London (Zone 1–2), City of London, Westminster", multiplier: 13300, displayMultiplier: "1.33x" },
      { code: "uk-outer-london", name: "Outer London", description: "Greater London boroughs outside Zone 2", multiplier: 11800, displayMultiplier: "1.18x" },
    ],
  },
  {
    region: "South England",
    country: "UK",
    metros: [
      { code: "uk-southeast", name: "South East", description: "Surrey, Kent, Sussex, Hampshire, Berkshire", multiplier: 11750, displayMultiplier: "1.18x" },
      { code: "uk-southwest", name: "South West", description: "Bristol, Bath, Devon, Cornwall, Dorset", multiplier: 11000, displayMultiplier: "1.10x" },
      { code: "uk-east", name: "East of England", description: "Cambridge, Essex, Norfolk, Suffolk, Hertfordshire", multiplier: 10700, displayMultiplier: "1.07x" },
    ],
  },
  {
    region: "Midlands",
    country: "UK",
    metros: [
      { code: "uk-west-midlands", name: "West Midlands", description: "Birmingham, Coventry, Wolverhampton", multiplier: 10500, displayMultiplier: "1.05x" },
      { code: "uk-east-midlands", name: "East Midlands", description: "Nottingham, Leicester, Derby", multiplier: 10000, displayMultiplier: "1.00x" },
    ],
  },
  {
    region: "North England",
    country: "UK",
    metros: [
      { code: "uk-northwest", name: "North West", description: "Manchester, Liverpool, Lancashire, Cheshire", multiplier: 9800, displayMultiplier: "0.98x" },
      { code: "uk-yorkshire", name: "Yorkshire & Humber", description: "Leeds, Sheffield, York, Hull", multiplier: 10000, displayMultiplier: "1.00x" },
      { code: "uk-northeast", name: "North East", description: "Newcastle, Sunderland, Durham", multiplier: 9500, displayMultiplier: "0.95x" },
    ],
  },
  {
    region: "Scotland & Wales",
    country: "UK",
    metros: [
      { code: "uk-scotland-central", name: "Central Scotland", description: "Edinburgh, Glasgow, Stirling", multiplier: 10800, displayMultiplier: "1.08x" },
      { code: "uk-scotland-north", name: "Northern Scotland", description: "Aberdeen, Highlands, Islands", multiplier: 11200, displayMultiplier: "1.12x" },
      { code: "uk-wales", name: "Wales", description: "Cardiff, Swansea, Newport, rural Wales", multiplier: 9500, displayMultiplier: "0.95x" },
    ],
  },
  {
    region: "Islands",
    country: "UK",
    metros: [
      { code: "uk-channel", name: "Channel Islands", description: "Jersey, Guernsey", multiplier: 12000, displayMultiplier: "1.20x" },
      { code: "uk-northern-ireland", name: "Northern Ireland", description: "Belfast, Derry, Antrim", multiplier: 9200, displayMultiplier: "0.92x" },
    ],
  },
];

// ─── Australia ──────────────────────────────────────────────────────────────
// Source: Rawlinsons Construction Cost Guide, ASEstimation 2025 data
// Adelaide/Hobart used as baseline (1.00x), other cities adjusted relative.

const AU_REGION_GROUPS: CostRegionGroup[] = [
  {
    region: "AU National",
    country: "AU",
    metros: [
      { code: "au-national", name: "AU National Average", description: "Australian national average — no adjustment", multiplier: 10000, displayMultiplier: "1.00x" },
    ],
  },
  {
    region: "New South Wales",
    country: "AU",
    metros: [
      { code: "au-sydney", name: "Sydney", description: "Sydney metro area, Greater Western Sydney", multiplier: 13500, displayMultiplier: "1.35x" },
      { code: "au-regional-nsw", name: "Regional NSW", description: "Newcastle, Wollongong, Central Coast, rural NSW", multiplier: 9700, displayMultiplier: "0.97x" },
    ],
  },
  {
    region: "Victoria",
    country: "AU",
    metros: [
      { code: "au-melbourne", name: "Melbourne", description: "Melbourne metro area", multiplier: 11800, displayMultiplier: "1.18x" },
      { code: "au-regional-vic", name: "Regional Victoria", description: "Geelong, Ballarat, Bendigo, rural VIC", multiplier: 9700, displayMultiplier: "0.97x" },
    ],
  },
  {
    region: "Queensland",
    country: "AU",
    metros: [
      { code: "au-brisbane", name: "Brisbane", description: "Brisbane metro area, Gold Coast", multiplier: 10700, displayMultiplier: "1.07x" },
      { code: "au-regional-qld", name: "Regional Queensland", description: "Cairns, Townsville, Sunshine Coast, rural QLD", multiplier: 9200, displayMultiplier: "0.92x" },
    ],
  },
  {
    region: "Western Australia & SA",
    country: "AU",
    metros: [
      { code: "au-perth", name: "Perth", description: "Perth metro area", multiplier: 11500, displayMultiplier: "1.15x" },
      { code: "au-adelaide", name: "Adelaide", description: "Adelaide metro area", multiplier: 10000, displayMultiplier: "1.00x" },
    ],
  },
  {
    region: "Territories & Tasmania",
    country: "AU",
    metros: [
      { code: "au-canberra", name: "Canberra", description: "ACT / Canberra metro area", multiplier: 11500, displayMultiplier: "1.15x" },
      { code: "au-darwin", name: "Darwin", description: "Darwin, Northern Territory", multiplier: 11500, displayMultiplier: "1.15x" },
      { code: "au-hobart", name: "Hobart", description: "Hobart, Tasmania", multiplier: 10000, displayMultiplier: "1.00x" },
    ],
  },
];

// ─── Combined Exports ───────────────────────────────────────────────────────

/**
 * All available cost regions organized by geographic area.
 * Includes US, UK, and Australian regions.
 */
export const COST_REGION_GROUPS: CostRegionGroup[] = [
  ...US_REGION_GROUPS,
  ...UK_REGION_GROUPS,
  ...AU_REGION_GROUPS,
];

/** Country-specific region groups for filtered display */
export const COST_REGION_GROUPS_BY_COUNTRY: Record<string, CostRegionGroup[]> = {
  US: US_REGION_GROUPS,
  UK: UK_REGION_GROUPS,
  AU: AU_REGION_GROUPS,
};

/** Map currency code to country code for region filtering */
export const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: "US",
  GBP: "UK",
  AUD: "AU",
};

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

/**
 * Get region groups filtered by currency code.
 * Returns US regions for USD, UK for GBP, AU for AUD.
 */
export function getRegionGroupsForCurrency(currencyCode: string): CostRegionGroup[] {
  const country = CURRENCY_TO_COUNTRY[currencyCode];
  return country ? (COST_REGION_GROUPS_BY_COUNTRY[country] || []) : US_REGION_GROUPS;
}
