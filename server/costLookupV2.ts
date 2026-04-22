/**
 * Cost Lookup Engine V2 — Synonym-First Matching
 * 
 * Replaces the old keyword-based costLookup.ts with a synonym-powered engine.
 * 
 * How it works:
 * 1. On first call, loads the expanded_cost_library and expanded_labor_library
 *    from the database (677+ cost items, 271+ labor items, 8,600+ synonyms).
 * 2. Builds an in-memory index: every synonym → library entry reference.
 * 3. For each takeoff item, tokenizes the description and scores against all
 *    synonyms using n-gram overlap + CSI division + unit compatibility.
 * 4. Returns bifurcated pricing: material cost + labor cost + combined.
 * 
 * Priority chain:
 *   1. Contractor's personal cost library (highest — never overridden)
 *   2. Expanded synonym match (RS Means + LLM-generated items)
 *   3. Unit-based defaults (fallback)
 * 
 * This engine is 100% programmatic — ZERO LLM calls at runtime.
 */

import { getDb } from "./db";
import { expandedCostLibrary, expandedLaborLibrary } from "../drizzle/schema";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface TakeoffItem {
  description: string;
  csiCode?: string;
  csiDivision?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  extendedCost?: number;
  materialCost?: number;
  laborCost?: number;
  confidence?: number;
  notes?: string;
  [key: string]: any;
}

export interface UserLibraryEntry {
  description: string;
  unit: string;
  unitCost: number; // dollars
  csiDivision?: string;
}

interface ExpandedCostEntry {
  id: number;
  costItemId: string;
  csiDivision: string;
  csiCode: string;
  description: string;
  unit: string;
  materialCost: number; // cents in DB
  category: string;
  keywords: string[] | null;
  excludeKeywords: string[] | null;
  synonyms: string[];
  isOriginal: boolean;
}

interface ExpandedLaborEntry {
  id: number;
  laborItemId: string;
  csiDivision: string;
  csiCode: string;
  description: string;
  unit: string;
  baseLaborCost: number; // cents in DB
  crewSize: number;
  productivity: number;
  category: string;
  synonyms: string[];
  isOriginal: boolean;
}

interface SynonymIndexEntry {
  /** The normalized synonym text */
  synonym: string;
  /** Tokenized words of the synonym (for fast overlap) */
  tokens: Set<string>;
  /** Reference to the library entry */
  entryId: number;
  /** CSI division for quick filtering */
  csiDivision: string;
  /** Unit for compatibility check */
  unit: string;
}

// ─── In-Memory Cache ────────────────────────────────────────────────────────────

let costEntries: ExpandedCostEntry[] = [];
let laborEntries: ExpandedLaborEntry[] = [];
let costSynonymIndex: SynonymIndexEntry[] = [];
let laborSynonymIndex: SynonymIndexEntry[] = [];
let costEntryMap: Map<number, ExpandedCostEntry> = new Map();
let laborEntryMap: Map<number, ExpandedLaborEntry> = new Map();
let isLoaded = false;

/**
 * Load the expanded library from the database into memory.
 * Called once on first pricing call, then cached.
 */
export async function loadExpandedLibrary(): Promise<void> {
  if (isLoaded) return;

  const db = await getDb();
  if (!db) {
    console.warn("[CostLookupV2] Database not available, falling back to defaults");
    isLoaded = true;
    return;
  }

  try {
    // Load cost entries
    const rawCost = await db.select().from(expandedCostLibrary);
    costEntries = rawCost.map((r: any) => ({
      id: r.id,
      costItemId: r.costItemId,
      csiDivision: r.csiDivision,
      csiCode: r.csiCode,
      description: r.description,
      unit: r.unit,
      materialCost: r.materialCost, // cents
      category: r.category,
      keywords: parseJsonField(r.keywords),
      excludeKeywords: parseJsonField(r.excludeKeywords),
      synonyms: parseJsonField(r.synonyms) || [],
      isOriginal: r.isOriginal,
    }));

    // Load labor entries
    const rawLabor = await db.select().from(expandedLaborLibrary);
    laborEntries = rawLabor.map((r: any) => ({
      id: r.id,
      laborItemId: r.laborItemId,
      csiDivision: r.csiDivision,
      csiCode: r.csiCode,
      description: r.description,
      unit: r.unit,
      baseLaborCost: r.baseLaborCost, // cents
      crewSize: r.crewSize,
      productivity: r.productivity,
      category: r.category,
      synonyms: parseJsonField(r.synonyms) || [],
      isOriginal: r.isOriginal,
    }));

    // Build entry maps
    costEntryMap = new Map(costEntries.map(e => [e.id, e]));
    laborEntryMap = new Map(laborEntries.map(e => [e.id, e]));

    // Build synonym indices
    costSynonymIndex = buildSynonymIndex(costEntries, "cost");
    laborSynonymIndex = buildSynonymIndex(laborEntries, "labor");

    isLoaded = true;
    console.log(`[CostLookupV2] Loaded ${costEntries.length} cost entries (${costSynonymIndex.length} synonym index entries)`);
    console.log(`[CostLookupV2] Loaded ${laborEntries.length} labor entries (${laborSynonymIndex.length} synonym index entries)`);
  } catch (err) {
    console.error("[CostLookupV2] Failed to load expanded library:", err);
    isLoaded = true; // Don't retry on every call
  }
}

/** Force reload (useful after re-expansion) */
export function resetCache(): void {
  isLoaded = false;
  costEntries = [];
  laborEntries = [];
  costSynonymIndex = [];
  laborSynonymIndex = [];
  costEntryMap = new Map();
  laborEntryMap = new Map();
}

// ─── Synonym Index Builder ──────────────────────────────────────────────────────

function buildSynonymIndex(
  entries: (ExpandedCostEntry | ExpandedLaborEntry)[],
  type: "cost" | "labor"
): SynonymIndexEntry[] {
  const index: SynonymIndexEntry[] = [];

  for (const entry of entries) {
    // Index the canonical description as a synonym too
    const descNorm = normalize(entry.description);
    const descTokens = tokenize(descNorm);
    index.push({
      synonym: descNorm,
      tokens: descTokens,
      entryId: entry.id,
      csiDivision: entry.csiDivision,
      unit: entry.unit,
    });

    // Index all explicit synonyms
    for (const syn of entry.synonyms) {
      const synNorm = normalize(syn);
      if (!synNorm || synNorm === descNorm) continue;
      index.push({
        synonym: synNorm,
        tokens: tokenize(synNorm),
        entryId: entry.id,
        csiDivision: entry.csiDivision,
        unit: entry.unit,
      });
    }

    // Index keywords (from original entries) as additional synonyms
    if ("keywords" in entry && entry.keywords) {
      const kwPhrase = normalize(entry.keywords.join(" "));
      if (kwPhrase && kwPhrase !== descNorm) {
        index.push({
          synonym: kwPhrase,
          tokens: tokenize(kwPhrase),
          entryId: entry.id,
          csiDivision: entry.csiDivision,
          unit: entry.unit,
        });
      }
    }
  }

  return index;
}

// ─── Text Processing ────────────────────────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#'"\/\-]/g, " ")
    .replace(/(\d+)["']/g, "$1 inch") // 4" → 4 inch
    .replace(/(\d+)\s*in\b/g, "$1 inch") // 4in → 4 inch
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  return new Set(
    text.split(/\s+/).filter(w => w.length > 1) // keep 2+ char words
  );
}

/** Parse a JSON field that might be a string or already parsed */
function parseJsonField(val: any): string[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

// ─── Unit Compatibility ─────────────────────────────────────────────────────────

const UNIT_COMPAT: Record<string, string[]> = {
  "SF": ["SF", "SY"],
  "SY": ["SY", "SF"],
  "LF": ["LF"],
  "CY": ["CY", "CF"],
  "CF": ["CF", "CY"],
  "EA": ["EA"],
  "LS": ["LS", "EA"],
  "LB": ["LB", "CWT", "TON"],
  "TON": ["TON", "LB"],
  "CWT": ["CWT", "LB"],
  "GAL": ["GAL"],
  "SQ": ["SQ"],
  "MO": ["MO"],
  "SFCA": ["SFCA", "SF"],
  "MSF": ["MSF"],
};

function unitsCompatible(itemUnit: string, entryUnit: string): boolean {
  const iu = itemUnit.toUpperCase().trim();
  const eu = entryUnit.toUpperCase().trim();
  if (iu === eu) return true;
  return (UNIT_COMPAT[iu] || []).includes(eu);
}

// ─── Scoring Engine ─────────────────────────────────────────────────────────────

interface MatchResult {
  entryId: number;
  score: number;
  matchedSynonym: string;
}

/**
 * Score a takeoff item against the synonym index.
 * Returns the best match (highest score) or null.
 * 
 * Scoring formula:
 *   base = (overlapping tokens / max(itemTokens, synTokens)) * 100
 *   + 25 if CSI division matches
 *   + 10 if unit matches exactly
 *   + 15 if ≥3 tokens overlap (specificity bonus)
 *   + 10 if synonym contains a dimension that matches item (e.g., "4 inch")
 */
function findBestSynonymMatch(
  item: TakeoffItem,
  index: SynonymIndexEntry[],
  entryMap: Map<number, ExpandedCostEntry | ExpandedLaborEntry>
): MatchResult | null {
  const descNorm = normalize(item.description);
  const itemTokens = tokenize(descNorm);
  const itemUnit = (item.unit || "").toUpperCase().trim();
  const itemDiv = (item.csiDivision || item.csiCode?.substring(0, 2) || "").trim();

  if (itemTokens.size === 0) return null;

  let bestScore = 0;
  let bestEntryId = -1;
  let bestSynonym = "";

  for (const synEntry of index) {
    // Quick unit filter
    if (!unitsCompatible(itemUnit, synEntry.unit)) continue;

    // Check exclude keywords for cost entries
    const entry = entryMap.get(synEntry.entryId);
    if (entry && "excludeKeywords" in entry && entry.excludeKeywords) {
      let excluded = false;
      for (const kw of entry.excludeKeywords) {
        if (descNorm.includes(kw.toLowerCase())) { excluded = true; break; }
      }
      if (excluded) continue;
    }

    // Token overlap scoring
    const synTokens = synEntry.tokens;
    let overlap = 0;
    itemTokens.forEach(token => {
      if (synTokens.has(token)) overlap++;
    });
    if (overlap === 0) continue;

    // Also check reverse: how many synonym tokens appear in item
    let reverseOverlap = 0;
    synTokens.forEach(token => {
      if (itemTokens.has(token)) reverseOverlap++;
    });

    // Use the better of forward/reverse coverage
    const forwardCoverage = overlap / itemTokens.size;
    const reverseCoverage = synTokens.size > 0 ? reverseOverlap / synTokens.size : 0;
    const coverage = Math.max(forwardCoverage, reverseCoverage);
    
    let score = coverage * 100;

    // CSI division bonus
    if (itemDiv && synEntry.csiDivision === itemDiv) {
      score += 25;
    }

    // Exact unit bonus
    if (itemUnit === synEntry.unit.toUpperCase()) {
      score += 10;
    }

    // Specificity bonus: more overlapping tokens = more confident
    if (overlap >= 3) score += 15;
    if (overlap >= 5) score += 10;

    // Dimension match bonus: if both have a number + "inch", and they match
    const itemDims: string[] = descNorm.match(/(\d+)\s*inch/g) || [];
    const synDims: string[] = synEntry.synonym.match(/(\d+)\s*inch/g) || [];
    if (itemDims.length > 0 && synDims.length > 0) {
      const hasMatchingDim = itemDims.some((d: string) => synDims.includes(d));
      if (hasMatchingDim) score += 10;
      else score -= 15; // Penalize dimension mismatch (4" slab vs 6" slab)
    }

    if (score > bestScore) {
      bestScore = score;
      bestEntryId = synEntry.entryId;
      bestSynonym = synEntry.synonym;
    }
  }

  if (bestEntryId < 0 || bestScore < 20) return null;

  return { entryId: bestEntryId, score: bestScore, matchedSynonym: bestSynonym };
}

// ─── Default Fallbacks ──────────────────────────────────────────────────────────

const MATERIAL_DEFAULTS: Record<string, number> = {
  "SF": 3.50, "LF": 8.00, "CY": 150.00, "EA": 25.00,
  "SFCA": 4.50, "SY": 12.00, "LS": 500.00, "LB": 1.50,
  "GAL": 18.00, "TON": 85.00, "CWT": 8.50, "MSF": 45.00, "SQ": 75.00,
};

const LABOR_DEFAULTS: Record<string, number> = {
  "SF": 2.00, "LF": 5.00, "CY": 65.00, "EA": 35.00,
  "SFCA": 5.50, "SY": 8.00, "LS": 750.00, "LB": 0.45,
  "GAL": 8.00, "TON": 850.00, "CWT": 4.00, "MSF": 25.00, "SQ": 100.00,
};

const MATERIAL_CAPS: Record<string, number> = {
  "SF": 25, "LF": 150, "CY": 400, "EA": 2500,
  "SFCA": 15, "SY": 100, "LS": 50000, "LB": 10,
  "GAL": 80, "TON": 300,
};

// ─── User Library Matching ──────────────────────────────────────────────────────

function findUserLibraryMatch(item: TakeoffItem, library: UserLibraryEntry[]): UserLibraryEntry | null {
  const desc = normalize(item.description);
  // Also split on hyphens for better matching ("slab-on-grade" → "slab", "on", "grade")
  const descExpanded = desc.replace(/-/g, " ");
  const unit = (item.unit || "").toUpperCase().trim();
  let bestMatch: UserLibraryEntry | null = null;
  let bestScore = 0;

  for (const entry of library) {
    if (entry.unit.toUpperCase().trim() !== unit) continue;
    const entryDesc = normalize(entry.description).replace(/-/g, " ");
    const wordsItem = tokenize(descExpanded);
    const wordsEntry = tokenize(entryDesc);
    if (wordsItem.size === 0 || wordsEntry.size === 0) continue;
    let overlap = 0;
    wordsItem.forEach(w => { if (wordsEntry.has(w)) overlap++; });
    const union = new Set([...Array.from(wordsItem), ...Array.from(wordsEntry)]).size;
    const score = union > 0 ? overlap / union : 0;
    // Lower threshold to 0.4 — user library entries are manually entered and should be trusted
    if (score >= 0.4 && score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  return bestMatch;
}

// ─── Main Pricing Functions ─────────────────────────────────────────────────────

/**
 * Apply pricing using the expanded synonym library.
 * ZERO LLM calls — purely programmatic.
 */
export async function applyPricingV2(
  items: TakeoffItem[],
  regionalMultiplier: number = 1.0
): Promise<TakeoffItem[]> {
  await loadExpandedLibrary();

  const results: TakeoffItem[] = [];
  let synMatchCount = 0;
  let laborMatchCount = 0;
  let defaultCount = 0;

  for (const item of items) {
    const unit = (item.unit || "").toUpperCase();

    // ── Material cost via synonym match ──
    const costMatch = findBestSynonymMatch(item, costSynonymIndex, costEntryMap as any);
    let matCost: number;
    let costMatchId: string;
    let costMatchScore: number;

    if (costMatch) {
      const entry = costEntryMap.get(costMatch.entryId)!;
      matCost = entry.materialCost / 100; // cents → dollars
      costMatchId = entry.costItemId;
      costMatchScore = costMatch.score;
      synMatchCount++;
    } else {
      // Fallback
      const llmCost = item.unitCost || 0;
      const isPlaceholder = llmCost <= 1;
      matCost = isPlaceholder ? (MATERIAL_DEFAULTS[unit] ?? 10.00) : llmCost;
      if (MATERIAL_CAPS[unit] && matCost > MATERIAL_CAPS[unit]) matCost = MATERIAL_CAPS[unit];
      costMatchId = "DEFAULT";
      costMatchScore = 0;
      defaultCount++;
    }

    // ── Labor cost via synonym match ──
    const laborMatch = findBestSynonymMatch(item, laborSynonymIndex, laborEntryMap as any);
    let labCost: number;

    if (laborMatch) {
      const entry = laborEntryMap.get(laborMatch.entryId)!;
      labCost = entry.baseLaborCost / 100; // cents → dollars
      laborMatchCount++;
    } else {
      labCost = LABOR_DEFAULTS[unit] ?? 5.00;
    }

    // Apply regional multiplier
    matCost = Math.round(matCost * regionalMultiplier * 100) / 100;
    labCost = Math.round(labCost * regionalMultiplier * 100) / 100;

    // Combined
    const combinedUC = Math.round((matCost + labCost) * 100) / 100;
    const extCost = Math.round(combinedUC * item.quantity * 100) / 100;

    results.push({
      ...item,
      unitCost: combinedUC,
      extendedCost: extCost,
      materialCost: matCost,
      laborCost: labCost,
      _costMatch: costMatchId,
      _costMatchScore: costMatchScore,
    });
  }

  console.log(`[CostLookupV2] Material: ${synMatchCount} synonym-matched, Labor: ${laborMatchCount} matched, ${defaultCount} defaults — out of ${items.length} items`);
  return results;
}

/**
 * Apply pricing with user's personal library taking priority.
 * Priority: User Library → Expanded Synonym → Defaults
 */
export async function applyPricingWithLibraryV2(
  items: TakeoffItem[],
  library: UserLibraryEntry[],
  regionalMultiplier: number = 1.0
): Promise<TakeoffItem[]> {
  if (!library || library.length === 0) return applyPricingV2(items, regionalMultiplier);

  await loadExpandedLibrary();

  const results: TakeoffItem[] = [];
  let libraryHits = 0;
  let synHits = 0;
  let defaultHits = 0;

  for (const item of items) {
    const unit = (item.unit || "").toUpperCase();

    // Labor cost (always from expanded library or defaults)
    const laborMatch = findBestSynonymMatch(item, laborSynonymIndex, laborEntryMap as any);
    let labCost = laborMatch
      ? (laborEntryMap.get(laborMatch.entryId)!.baseLaborCost / 100)
      : (LABOR_DEFAULTS[unit] ?? 5.00);
    labCost = Math.round(labCost * regionalMultiplier * 100) / 100;

    // 1. Try user's personal library first
    const libMatch = findUserLibraryMatch(item, library);
    if (libMatch) {
      const matCost = Math.round(libMatch.unitCost * regionalMultiplier * 100) / 100;
      const combinedUC = Math.round((matCost + labCost) * 100) / 100;
      results.push({
        ...item,
        unitCost: combinedUC,
        extendedCost: Math.round(combinedUC * item.quantity * 100) / 100,
        materialCost: matCost,
        laborCost: labCost,
        _costMatch: "LIBRARY",
        _costMatchScore: 100,
      });
      libraryHits++;
      continue;
    }

    // 2. Expanded synonym library
    const costMatch = findBestSynonymMatch(item, costSynonymIndex, costEntryMap as any);
    if (costMatch) {
      const entry = costEntryMap.get(costMatch.entryId)!;
      const matCost = Math.round((entry.materialCost / 100) * regionalMultiplier * 100) / 100;
      const combinedUC = Math.round((matCost + labCost) * 100) / 100;
      results.push({
        ...item,
        unitCost: combinedUC,
        extendedCost: Math.round(combinedUC * item.quantity * 100) / 100,
        materialCost: matCost,
        laborCost: labCost,
        _costMatch: entry.costItemId,
        _costMatchScore: costMatch.score,
      });
      synHits++;
      continue;
    }

    // 3. Default fallback
    const llmCost = item.unitCost || 0;
    const isPlaceholder = llmCost <= 1;
    let matCost = isPlaceholder ? (MATERIAL_DEFAULTS[unit] ?? 10.00) : llmCost;
    matCost = Math.round(matCost * regionalMultiplier * 100) / 100;
    const combinedUC = Math.round((matCost + labCost) * 100) / 100;
    results.push({
      ...item,
      unitCost: combinedUC,
      extendedCost: Math.round(combinedUC * item.quantity * 100) / 100,
      materialCost: matCost,
      laborCost: labCost,
      _costMatch: "DEFAULT",
      _costMatchScore: 0,
    });
    defaultHits++;
  }

  console.log(`[CostLookupV2] ${libraryHits} library, ${synHits} synonym, ${defaultHits} default out of ${items.length} items`);
  return results;
}

// ─── Rebar Quantity Validation (moved from costLookup.ts) ─────────────────────

function normalizeForRebarCheck(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s#'"\/-]/g, " ").replace(/\s+/g, " ").trim();
}

export function validateRebarQuantities(items: TakeoffItem[]): TakeoffItem[] {
  // Find slab area
  const slabItems = items.filter(i => {
    const desc = normalizeForRebarCheck(i.description);
    return desc.includes("slab") && !desc.includes("rebar") && !desc.includes("formwork");
  });
  const totalSlabSF = slabItems.reduce((sum, i) => {
    const unit = (i.unit || "").toUpperCase();
    if (unit === "SF") return sum + (i.quantity || 0);
    return sum;
  }, 0);
  if (totalSlabSF === 0) return items;
  // Max rebar for slab: SF × 2.2 (12" O.C. both ways with 10% lap)
  const maxSlabRebarLF = totalSlabSF * 2.2;
  return items.map(item => {
    const desc = normalizeForRebarCheck(item.description);
    const unit = (item.unit || "").toUpperCase();
    if (unit === "LF" && (desc.includes("rebar") || desc.includes("reinforc")) && desc.includes("slab")) {
      if (item.quantity > maxSlabRebarLF) {
        const correctedQty = Math.round(maxSlabRebarLF);
        console.log(`[CostLookupV2] Rebar quantity corrected: ${item.quantity} LF → ${correctedQty} LF (max for ${totalSlabSF} SF slab)`);
        const newExt = Math.round(correctedQty * (item.unitCost || 0) * 100) / 100;
        return {
          ...item,
          quantity: correctedQty,
          extendedCost: newExt,
          notes: `${item.notes || ""} [Qty adjusted: was ${item.quantity} LF, capped at 2.2x slab SF]`.trim(),
        };
      }
    }
    return item;
  });
}

/**
 * Legacy compatibility: findBestMatch wrapper for modules that import it directly.
 * Returns a compatible shape but uses the synonym engine under the hood.
 */
export async function findBestMatchV2(item: TakeoffItem): Promise<{
  entry: { id: string; description: string; unit: string; materialCost: number };
  score: number;
  unitCost: number;
} | null> {
  await loadExpandedLibrary();
  const match = findBestSynonymMatch(item, costSynonymIndex, costEntryMap as any);
  if (!match) return null;
  const entry = costEntryMap.get(match.entryId)!;
  return {
    entry: {
      id: entry.costItemId,
      description: entry.description,
      unit: entry.unit,
      materialCost: entry.materialCost / 100,
    },
    score: match.score,
    unitCost: entry.materialCost / 100,
  };
}
