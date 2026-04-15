/**
 * Cost Lookup Engine
 * 
 * Matches extracted takeoff items to the cost reference table
 * and applies the correct unit cost based on context (material-only vs installed).
 * 
 * Also applies regional cost multipliers.
 */

import { COST_TABLE, type CostTableEntry } from "../shared/costTable.js";

export interface TakeoffItem {
  description: string;
  csiCode?: string;
  csiDivision?: string;
  quantity: number;
  unit: string;
  unitCost?: number;
  extendedCost?: number;
  confidence?: number;
  notes?: string;
  [key: string]: any;
}

interface CostMatch {
  entry: CostTableEntry;
  score: number;
  priceUsed: "materialOnly" | "installed";
  unitCost: number;
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
  let totalKeywords = entry.keywords.length;
  
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
 * Determine whether to use materialOnly or installed pricing.
 * 
 * Logic: If the item is a concrete element AND there are separate formwork/rebar
 * line items for the same element, use materialOnly pricing.
 * Otherwise use installed pricing.
 */
function determinePriceType(
  item: TakeoffItem,
  entry: CostTableEntry,
  allItems: TakeoffItem[]
): "materialOnly" | "installed" {
  // Formwork and rebar items always use their own cost (materialOnly = installed for these)
  if (entry.category === "formwork" || entry.category === "rebar") {
    return "materialOnly";
  }
  
  // Earthwork, accessories, demolition, exterior — always use installed
  if (entry.category !== "concrete") {
    return "installed";
  }
  
  // For concrete items: check if there are companion formwork/rebar items
  const desc = normalizeForMatch(item.description);
  
  // Extract the element name (e.g., "footing", "slab", "stem wall", "trench pit")
  const elementPatterns = [
    "slab", "footing", "stem wall", "stemwall", "grade beam", "pier",
    "trench pit", "trench drain", "correlator", "drainage pit", "bollard",
    "gate post", "pole foundation", "shearwall", "shear wall", "enclosure"
  ];
  
  let elementName = "";
  for (const pat of elementPatterns) {
    if (desc.includes(pat)) {
      elementName = pat;
      break;
    }
  }
  
  if (!elementName) {
    // Can't determine element — use installed as safe default
    return "installed";
  }
  
  // Check if there are formwork or rebar items for the same element
  const hasCompanionFormwork = allItems.some(other => {
    if (other === item) return false;
    const otherDesc = normalizeForMatch(other.description);
    return (otherDesc.includes("formwork") || otherDesc.includes("form ")) &&
           otherDesc.includes(elementName);
  });
  
  const hasCompanionRebar = allItems.some(other => {
    if (other === item) return false;
    const otherDesc = normalizeForMatch(other.description);
    return (otherDesc.includes("rebar") || otherDesc.includes("reinforc")) &&
           otherDesc.includes(elementName);
  });
  
  // Also check for generic rebar items (e.g., "Reinforcing Steel #4 Rebar in Slab-on-Grade")
  const hasAnyRebar = allItems.some(other => {
    if (other === item) return false;
    const otherDesc = normalizeForMatch(other.description);
    return (otherDesc.includes("rebar") || otherDesc.includes("reinforc")) &&
           !otherDesc.includes("formwork");
  });
  
  const hasAnyFormwork = allItems.some(other => {
    if (other === item) return false;
    const otherDesc = normalizeForMatch(other.description);
    return (otherDesc.includes("formwork") || otherDesc.includes("form ")) &&
           !otherDesc.includes("rebar");
  });
  
  // If there are BOTH formwork AND rebar as separate items → use materialOnly
  if ((hasCompanionFormwork || hasAnyFormwork) && (hasCompanionRebar || hasAnyRebar)) {
    return "materialOnly";
  }
  
  // If there's either formwork OR rebar → use a middle ground (materialOnly is closer)
  if (hasCompanionFormwork || hasCompanionRebar || hasAnyFormwork || hasAnyRebar) {
    return "materialOnly";
  }
  
  // No companions → use installed (all-in)
  return "installed";
}

/**
 * Find the best matching cost table entry for a takeoff item.
 */
export function findBestMatch(
  item: TakeoffItem,
  allItems: TakeoffItem[]
): CostMatch | null {
  let bestEntry: CostTableEntry | null = null;
  let bestScore = 0;
  
  for (const entry of COST_TABLE) {
    const score = scoreMatch(item, entry);
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  }
  
  if (!bestEntry || bestScore < 20) {
    return null; // No good match found
  }
  
  const priceType = determinePriceType(item, bestEntry, allItems);
  const unitCost = priceType === "materialOnly" 
    ? bestEntry.materialOnlyCost 
    : bestEntry.installedCost;
  
  return {
    entry: bestEntry,
    score: bestScore,
    priceUsed: priceType,
    unitCost,
  };
}

/**
 * Apply cost table pricing to all items in a takeoff.
 * Returns the items with updated unitCost and extendedCost.
 * 
 * @param items - The takeoff items to price
 * @param regionalMultiplier - Regional cost multiplier (e.g., 0.97 for Miami)
 */
export function applyPricing(
  items: TakeoffItem[],
  regionalMultiplier: number = 1.0
): TakeoffItem[] {
  const results: TakeoffItem[] = [];
  let matchCount = 0;
  let noMatchCount = 0;
  
  for (const item of items) {
    const match = findBestMatch(item, items);
    
    if (match) {
      const adjustedCost = Math.round(match.unitCost * regionalMultiplier * 100) / 100;
      const extCost = Math.round(adjustedCost * item.quantity * 100) / 100;
      
      results.push({
        ...item,
        unitCost: adjustedCost,
        extendedCost: extCost,
        _costMatch: match.entry.id,
        _costMatchScore: match.score,
        _priceType: match.priceUsed,
      });
      matchCount++;
    } else {
      // No match — keep the LLM-generated cost but flag it
      // Apply a sanity cap: no single item should exceed $100/unit for common units
      let uc = item.unitCost || 0;
      const unit = (item.unit || "").toUpperCase();
      
      // Sanity caps by unit type
      const caps: Record<string, number> = {
        "SF": 25, "LF": 150, "CY": 350, "EA": 2000,
        "SFCA": 15, "SY": 100, "LS": 50000,
      };
      
      if (caps[unit] && uc > caps[unit]) {
        uc = caps[unit];
      }
      
      uc = Math.round(uc * regionalMultiplier * 100) / 100;
      const extCost = Math.round(uc * item.quantity * 100) / 100;
      
      results.push({
        ...item,
        unitCost: uc,
        extendedCost: extCost,
        _costMatch: "NONE",
        _costMatchScore: 0,
        _priceType: "llm-fallback",
      });
      noMatchCount++;
    }
  }
  
  console.log(`[CostLookup] Matched ${matchCount}/${items.length} items from cost table (${noMatchCount} used LLM fallback)`);
  
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
          notes: `${item.notes || ""} [Qty adjusted: was ${item.quantity} LF, capped at 2.2× slab SF]`.trim(),
        };
      }
    }
    
    return item;
  });
}
