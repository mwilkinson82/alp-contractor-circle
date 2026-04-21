/**
 * Cost Lookup Engine
 * 
 * Matches extracted takeoff items to BOTH the material cost table and the labor cost table,
 * returning bifurcated pricing: material cost, labor cost, and combined installed cost.
 * 
 * - Material costs come from costTable.ts (RS Means material-only pricing)
 * - Labor costs come from laborTable.ts (RS Means labor-only pricing with crew/productivity data)
 * - Combined unitCost = materialCost + laborCost
 * 
 * Self-performing contractors use the labor column as a benchmark, then fine-tune
 * with their own crews/burden rates in the Trade Rate Library.
 * GCs use it to compare against sub bids for buyout negotiations.
 * 
 * Also applies regional cost multipliers.
 */

import { COST_TABLE, type CostTableEntry } from "../shared/costTable.js";
import { LABOR_TABLE, type LaborTableEntry } from "../shared/laborTable.js";

export interface TakeoffItem {
  description: string;
  csiCode?: string;
  csiDivision?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  extendedCost?: number;
  /** Material-only unit cost (dollars) */
  materialCost?: number;
  /** Labor-only unit cost (dollars) */
  laborCost?: number;
  confidence?: number;
  notes?: string;
  [key: string]: any;
}

interface CostMatch {
  entry: CostTableEntry;
  score: number;
  unitCost: number;
}

interface LaborMatch {
  entry: LaborTableEntry;
  score: number;
  laborCost: number;
}

/**
 * Normalize a description for matching: lowercase, strip extra whitespace, remove special chars
 */
function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s#'"\/\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the CSI division from a CSI code string
 * "03 30 00" → "03", "31 23 00" → "31"
 */
function extractDivision(csiCode: string): string {
  const match = csiCode.match(/^(\d{2})/);
  return match ? match[1] : "";
}

/**
 * Score how well a cost table entry matches a takeoff item.
 * Higher score = better match. Returns 0 if no match.
 */
function scoreMatch(item: TakeoffItem, entry: CostTableEntry): number {
  const desc = normalizeForMatch(item.description);
  const itemUnit = (item.unit || "").toUpperCase().trim();
  const entryUnit = entry.unit.toUpperCase().trim();
  
  // Unit must match (or be compatible)
  const unitCompatible = 
    itemUnit === entryUnit ||
    (itemUnit === "SY" && entryUnit === "SF") ||
    (itemUnit === "SF" && entryUnit === "SY") ||
    (itemUnit === "CF" && entryUnit === "CY") ||
    (itemUnit === "CY" && entryUnit === "CF");
  
  if (!unitCompatible) return 0;
  
  // Check exclude keywords first
  if (entry.excludeKeywords) {
    for (const kw of entry.excludeKeywords) {
      if (desc.includes(kw.toLowerCase())) return 0;
    }
  }
  
  // Count keyword matches
  let keywordMatches = 0;
  const totalKeywords = entry.keywords.length;
  
  for (const kw of entry.keywords) {
    if (desc.includes(kw.toLowerCase())) {
      keywordMatches++;
    }
  }
  
  if (keywordMatches === 0) return 0;
  
  // Base score: percentage of keywords matched
  let score = (keywordMatches / totalKeywords) * 100;
  
  // Bonus for CSI division match
  const itemDiv = item.csiDivision || extractDivision(item.csiCode || "");
  if (itemDiv === entry.csiDivision) {
    score += 20;
  }
  
  // Bonus for exact unit match (not just compatible)
  if (itemUnit === entryUnit) {
    score += 10;
  }
  
  // Bonus for more specific entries (more keywords = more specific)
  if (totalKeywords >= 3 && keywordMatches >= 2) {
    score += 15;
  }
  
  return score;
}

/**
 * Score how well a labor table entry matches a takeoff item.
 * Uses description word overlap + CSI division + unit matching.
 */
function scoreLaborMatch(item: TakeoffItem, entry: LaborTableEntry): number {
  const desc = normalizeForMatch(item.description);
  const entryDesc = normalizeForMatch(entry.description);
  const itemUnit = (item.unit || "").toUpperCase().trim();
  const entryUnit = entry.unit.toUpperCase().trim();

  // Unit must match (or be compatible)
  const unitCompatible =
    itemUnit === entryUnit ||
    (itemUnit === "SY" && entryUnit === "SF") ||
    (itemUnit === "SF" && entryUnit === "SY") ||
    (itemUnit === "CF" && entryUnit === "CY") ||
    (itemUnit === "CY" && entryUnit === "CF");

  if (!unitCompatible) return 0;

  // Word overlap scoring
  const wordsItem = new Set(desc.split(/\s+/).filter(w => w.length > 2));
  const wordsEntry = new Set(entryDesc.split(/\s+/).filter(w => w.length > 2));
  if (wordsItem.size === 0 || wordsEntry.size === 0) return 0;

  let overlap = 0;
  wordsItem.forEach(w => { if (wordsEntry.has(w)) overlap++; });
  if (overlap === 0) return 0;

  const union = new Set([...Array.from(wordsItem), ...Array.from(wordsEntry)]).size;
  let score = (overlap / union) * 100;

  // Bonus for CSI division match
  const itemDiv = item.csiDivision || extractDivision(item.csiCode || "");
  if (itemDiv === entry.csiDivision) {
    score += 25;
  }

  // Bonus for exact unit match
  if (itemUnit === entryUnit) {
    score += 10;
  }

  return score;
}

/**
 * Enrich item description with standard keywords to improve cost table matching.
 * E.g., "Concrete Slab" → "Concrete Slab 4 inch" if we can infer thickness from notes.
 */
function enrichDescription(item: TakeoffItem): string {
  let desc = item.description || "";
  const notes = (item.notes || "").toLowerCase();
  
  // If it's a concrete slab and we don't have thickness, try to infer from notes
  const descLower = desc.toLowerCase();
  if (descLower.includes("slab") && !/\d+["']/.test(desc) && !/\d+\s*inch/.test(descLower)) {
    if (notes.includes("4") || notes.includes("inch")) desc += " 4 inch";
    else if (notes.includes("6")) desc += " 6 inch";
    else if (notes.includes("8")) desc += " 8 inch";
  }
  
  // If it's a footing and we don't have dimensions, add generic keyword
  if (descLower.includes("footing") && !/\d+\s*x\s*\d+/.test(desc)) {
    if (!descLower.includes("continuous")) desc += " continuous";
  }
  
  return desc;
}

/**
 * Find the best matching cost table entry for a takeoff item (material cost).
 */
export function findBestMatch(item: TakeoffItem): CostMatch | null {
  // Enrich the description before matching
  const enrichedItem = { ...item, description: enrichDescription(item) };
  let bestEntry: CostTableEntry | null = null;
  let bestScore = 0;
  
  for (const entry of COST_TABLE) {
    const score = scoreMatch(enrichedItem, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }
  
  if (!bestEntry || bestScore < 10) {
    return null; // No good match found (lowered threshold to allow partial matches)
  }
  
  return {
    entry: bestEntry,
    score: bestScore,
    unitCost: bestEntry.materialCost,
  };
}

/**
 * Find the best matching labor table entry for a takeoff item.
 * Returns the base labor cost (residential open shop national average).
 */
function findBestLaborMatch(item: TakeoffItem): LaborMatch | null {
  const enrichedItem = { ...item, description: enrichDescription(item) };
  let bestEntry: LaborTableEntry | null = null;
  let bestScore = 0;

  for (const entry of LABOR_TABLE) {
    const score = scoreLaborMatch(enrichedItem, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }

  // Require a minimum score for labor match
  if (!bestEntry || bestScore < 15) {
    return null;
  }

  return {
    entry: bestEntry,
    score: bestScore,
    laborCost: bestEntry.baseLaborCost,
  };
}

// ─── Default fallback costs ──────────────────────────────────────────────────

/** Sensible material-only defaults when no cost table match exists */
const MATERIAL_DEFAULTS: Record<string, number> = {
  "SF":   3.50,   // generic surface material
  "LF":   8.00,   // generic linear material
  "CY":  150.00,  // generic volumetric (concrete-range)
  "EA":  25.00,   // generic each item
  "SFCA": 4.50,   // formwork material
  "SY":  12.00,   // surface yard
  "LS":  500.00,  // lump sum
  "LB":   1.50,   // per pound
  "GAL": 18.00,   // per gallon (form release, sealers, etc.)
  "TON": 85.00,   // per ton
  "CWT":  8.50,   // per hundredweight
  "MSF": 45.00,   // per thousand square feet
  "SQ":  75.00,   // per square (100 SF)
};

/** Sensible labor-only defaults when no labor table match exists (RS Means avg) */
const LABOR_DEFAULTS: Record<string, number> = {
  "SF":   2.00,   // generic surface labor
  "LF":   5.00,   // generic linear labor
  "CY":  65.00,   // generic volumetric labor
  "EA":  35.00,   // generic each item labor
  "SFCA": 5.50,   // formwork labor
  "SY":   8.00,   // surface yard labor
  "LS":  750.00,  // lump sum labor
  "LB":   0.45,   // per pound labor
  "GAL":  8.00,   // per gallon labor
  "TON": 850.00,  // per ton labor (steel erection range)
  "CWT":  4.00,   // per hundredweight labor
  "MSF": 25.00,   // per thousand SF labor
  "SQ":  100.00,  // per square labor
};

/** Sanity caps by unit type (material-only max) */
const MATERIAL_CAPS: Record<string, number> = {
  "SF": 25, "LF": 150, "CY": 400, "EA": 2500,
  "SFCA": 15, "SY": 100, "LS": 50000, "LB": 10,
  "GAL": 80, "TON": 300,
};

/**
 * Apply cost table pricing to all items in a takeoff.
 * Returns the items with materialCost, laborCost, and combined unitCost/extendedCost.
 * 
 * @param items - The takeoff items to price
 * @param regionalMultiplier - Regional cost multiplier (e.g., 0.97 for Miami)
 */
export function applyPricing(
  items: TakeoffItem[],
  regionalMultiplier: number = 1.0
): TakeoffItem[] {
  const results: TakeoffItem[] = [];
  let matMatchCount = 0;
  let laborMatchCount = 0;
  let noMatchCount = 0;
  
  for (const item of items) {
    const matMatch = findBestMatch(item);
    const laborMatch = findBestLaborMatch(item);
    const unit = (item.unit || "").toUpperCase();
    const llmCost = item.unitCost || 0;
    const isPlaceholder = llmCost <= 1; // 1 cent = LLM placeholder

    // ── Material cost ──
    let matCost: number;
    let costMatchId: string;
    let costMatchScore: number;
    if (matMatch) {
      matCost = matMatch.unitCost;
      costMatchId = matMatch.entry.id;
      costMatchScore = matMatch.score;
      matMatchCount++;
    } else {
      if (isPlaceholder) {
        matCost = MATERIAL_DEFAULTS[unit] ?? 10.00;
      } else {
        matCost = llmCost;
        if (MATERIAL_CAPS[unit] && matCost > MATERIAL_CAPS[unit]) matCost = MATERIAL_CAPS[unit];
      }
      costMatchId = "DEFAULT";
      costMatchScore = 0;
      noMatchCount++;
    }

    // ── Labor cost ──
    let labCost: number;
    if (laborMatch) {
      labCost = laborMatch.laborCost;
      laborMatchCount++;
    } else {
      labCost = LABOR_DEFAULTS[unit] ?? 5.00;
    }

    // Apply regional multiplier to both
    matCost = Math.round(matCost * regionalMultiplier * 100) / 100;
    labCost = Math.round(labCost * regionalMultiplier * 100) / 100;

    // Combined installed cost
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
  
  console.log(`[CostLookup] Material: ${matMatchCount} matched, Labor: ${laborMatchCount} matched, ${noMatchCount} defaults — out of ${items.length} items`);
  
  return results;
}

/** A single entry from the member's personal cost library */
export interface UserLibraryEntry {
  description: string;
  unit: string;
  unitCost: number;  // dollars
  csiDivision?: string;
}

/**
 * Match a takeoff item against the member's personal cost library.
 * Uses simple keyword overlap — member library entries are exact user-entered descriptions.
 */
function findLibraryMatch(item: TakeoffItem, library: UserLibraryEntry[]): UserLibraryEntry | null {
  const desc = normalizeForMatch(item.description);
  const unit = (item.unit || "").toUpperCase().trim();
  let bestMatch: UserLibraryEntry | null = null;
  let bestScore = 0;
  for (const entry of library) {
    // Unit must match
    if (entry.unit.toUpperCase().trim() !== unit) continue;
    const entryDesc = normalizeForMatch(entry.description);
    // Score by word overlap
    const wordsItem = new Set(desc.split(/\s+/).filter(w => w.length > 2));
    const wordsEntry = new Set(entryDesc.split(/\s+/).filter(w => w.length > 2));
    if (wordsItem.size === 0 || wordsEntry.size === 0) continue;
    let overlap = 0;
    wordsItem.forEach(w => { if (wordsEntry.has(w)) overlap++; });
    const union = new Set([...Array.from(wordsItem), ...Array.from(wordsEntry)]).size;
    const score = union > 0 ? overlap / union : 0;
    if (score >= 0.5 && score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  return bestMatch;
}

/**
 * Apply pricing using member's personal library first, falling back to RSMeans cost table.
 * Member library entries always take priority over the global cost table for MATERIAL costs.
 * Labor costs always come from the labor table (member customizes via Trade Rate Library separately).
 */
export function applyPricingWithLibrary(
  items: TakeoffItem[],
  library: UserLibraryEntry[],
  regionalMultiplier: number = 1.0
): TakeoffItem[] {
  if (!library || library.length === 0) return applyPricing(items, regionalMultiplier);
  const results: TakeoffItem[] = [];
  let libraryHits = 0;
  let tableHits = 0;
  let defaultHits = 0;
  for (const item of items) {
    const unit = (item.unit || "").toUpperCase();
    const laborMatch = findBestLaborMatch(item);
    let labCost = laborMatch ? laborMatch.laborCost : (LABOR_DEFAULTS[unit] ?? 5.00);
    labCost = Math.round(labCost * regionalMultiplier * 100) / 100;

    // 1. Try member's personal library first (material cost override)
    const libMatch = findLibraryMatch(item, library);
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
    // 2. Fall back to RSMeans cost table (material)
    const tableMatch = findBestMatch(item);
    if (tableMatch) {
      const matCost = Math.round(tableMatch.unitCost * regionalMultiplier * 100) / 100;
      const combinedUC = Math.round((matCost + labCost) * 100) / 100;
      results.push({
        ...item,
        unitCost: combinedUC,
        extendedCost: Math.round(combinedUC * item.quantity * 100) / 100,
        materialCost: matCost,
        laborCost: labCost,
        _costMatch: tableMatch.entry.id,
        _costMatchScore: tableMatch.score,
      });
      tableHits++;
      continue;
    }
    // 3. Default fallback by unit
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
  console.log(`[CostLookup+Library] ${libraryHits} library, ${tableHits} table, ${defaultHits} default out of ${items.length} items`);
  return results;
}

/**
 * Validate and fix rebar quantities based on the associated concrete area.
 * 
 * Rule: For slab rebar at 12" O.C. both ways, max LF ≈ slab SF × 2.2
 * For footing rebar, max LF ≈ footing LF × 8 (4 bars top + 4 bars bottom)
 */
export function validateRebarQuantities(items: TakeoffItem[]): TakeoffItem[] {
  // Find slab area
  const slabItems = items.filter(i => {
    const desc = normalizeForMatch(i.description);
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
    const desc = normalizeForMatch(item.description);
    const unit = (item.unit || "").toUpperCase();
    
    // Only check rebar items measured in LF that reference the slab
    if (unit === "LF" && (desc.includes("rebar") || desc.includes("reinforc")) && desc.includes("slab")) {
      if (item.quantity > maxSlabRebarLF) {
        const correctedQty = Math.round(maxSlabRebarLF);
        console.log(`[CostLookup] Rebar quantity corrected: ${item.quantity} LF → ${correctedQty} LF (max for ${totalSlabSF} SF slab)`);
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
