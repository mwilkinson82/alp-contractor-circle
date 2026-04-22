/**
 * Post-Processing Pipeline for ConstructLine Takeoff
 * 
 * Runs AFTER all sheets are individually processed to:
 * 1. Consolidate duplicate items across sheets (Priority 1)
 * 2. Enhance lump-sum items using plan-view dimensions (Priority 2)
 * 3. Enforce scope text as a hard filter (Priority 3)
 * 4. Generate formwork items for concrete members (Priority 4)
 * 5. Enhance rebar quantities by combining plan dims with section callouts (Priority 5)
 */
import { invokeLLMWithTimeout, type Message } from "./_core/llm";

// Hard per-call timeout for all post-processing LLM calls (60 seconds — reduced from 90s)
const PP_LLM_TIMEOUT_MS = 60_000;
// Max concurrent LLM calls across the entire post-processing pipeline
const PP_MAX_CONCURRENCY = 3;
// Total pipeline timeout — if exceeded, save what we have and finish
const PP_PIPELINE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Simple concurrency limiter (no external dependency needed)
function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) {
      await new Promise<void>(resolve => queue.push(resolve));
    }
    active++;
    try {
      return await fn();
    } finally {
      active--;
      if (queue.length > 0) queue.shift()!();
    }
  };
}

const ppLimiter = createLimiter(PP_MAX_CONCURRENCY);
import { applyPricingV2, applyPricingWithLibraryV2, validateRebarQuantities, loadExpandedLibrary, findBestMatchV2, type TakeoffItem as CostTakeoffItem, type UserLibraryEntry } from "./costLookupV2";
import { getCostLibraryByMember } from "./costLibraryDb";
import {
  getTakeoffItemsByProject,
  getTakeoffProject,
  getDrawingSheetsByProject,
  createTakeoffItemsBatch,
  recalculateProjectTotal,
  updateTakeoffProject,
} from "./takeoffDb";
import { getDb } from "./db";
import { takeoffItems } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import type { InsertTakeoffItem } from "../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawItem {
  id: number;
  projectId: number;
  sheetId: number;
  csiDivision: string | null;
  csiCode: string | null;
  description: string;
  quantity: string; // decimal stored as string
  unit: string;
  unitCost: number;
  extendedCost: number;
  confidence: number;
  notes: string | null;
  reviewed: boolean;
}

interface ConsolidatedItem {
  csiDivision: string;
  csiCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number; // cents (material + labor combined)
  extendedCost: number; // cents
  materialCost: number; // cents (material only)
  laborCost: number; // cents (labor only)
  confidence: number;
  notes: string;
  sourceSheetIds: number[];
  sourceItemIds: number[];
  wasConsolidated: boolean;
  wasEnhanced: boolean;
  isGenerated: boolean; // formwork, etc.
}

interface SheetContext {
  id: number;
  sheetName: string | null;
  sheetType: string | null;
  imageUrl: string | null;
}

// ─── Pre-Consolidation: Programmatic Dedup ──────────────────────────────────

/**
 * Normalize a description for fuzzy matching:
 * lowercase, strip dimensions/parentheticals, collapse whitespace
 */
function normalizeDesc(desc: string): string {
  return desc
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")          // remove parentheticals
    .replace(/\d+['"-]\s*\d*['"-]?/g, "") // remove dimensions like 2'-0"
    .replace(/[^a-z0-9\s]/g, " ")        // strip special chars
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract the "core element" from a description by removing common prefixes/suffixes.
 * E.g., "Earthwork Excavation for Trench Pit" → "excavation trench pit"
 */
function extractCoreElement(desc: string): string {
  const norm = normalizeDesc(desc);
  // Remove common prefixes that don't change the element identity
  return norm
    .replace(/^(earthwork|concrete|reinforced|structural|cast in place|cip)\s+/g, "")
    .replace(/\b(for|the|of|at|in|on|to|and|with|from|by)\b/g, "")
    .replace(/\b(w|x|d|h|l|thick|deep|wide|high|long)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate word overlap ratio between two normalized descriptions.
 * Returns a value between 0 and 1.
 */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 1));
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 1));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let overlap = 0;
  Array.from(wordsA).forEach(w => {
    if (wordsB.has(w)) overlap++;
  });
  const unionSet = new Set(Array.from(wordsA).concat(Array.from(wordsB)));
  const union = unionSet.size;
  return union > 0 ? overlap / union : 0;
}

/**
 * Programmatic pre-dedup: merge items with same CSI division + very similar description + same unit.
 * Uses both exact-match grouping AND fuzzy word-overlap matching to catch near-duplicates.
 * Keeps the item with the highest confidence; uses max quantity (safer than summing).
 */
function programmaticDedup(items: RawItem[]): RawItem[] {
  // Phase 1: Exact-match grouping by CSI code + normalized description + unit
  const groups = new Map<string, RawItem[]>();
  
  for (const item of items) {
    const norm = normalizeDesc(item.description);
    const key = `${item.csiCode || item.csiDivision}|${norm}|${item.unit.toUpperCase()}`;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(item);
  }
  
  // Merge exact matches first
  const exactMerged: RawItem[] = [];
  let exactMergedCount = 0;
  
  for (const [_key, group] of Array.from(groups.entries())) {
    if (group.length === 1) {
      exactMerged.push(group[0]);
      continue;
    }
    exactMergedCount += group.length - 1;
    group.sort((a: RawItem, b: RawItem) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return parseFloat(b.quantity) - parseFloat(a.quantity);
    });
    const best = group[0];
    const finalQty = Math.max(...group.map((g: RawItem) => parseFloat(g.quantity)));
    exactMerged.push({
      ...best,
      quantity: finalQty.toFixed(2),
      notes: `${best.notes || ""} [Merged ${group.length} exact duplicates]`.trim(),
    });
  }
  
  console.log(`[PreDedup] Phase 1 (exact match): ${items.length} → ${exactMerged.length} items (${exactMergedCount} merged)`);
  
  // Phase 2: Fuzzy matching within same CSI division + same unit
  // Group by division + unit
  const divUnitGroups = new Map<string, RawItem[]>();
  for (const item of exactMerged) {
    const div = (item.csiDivision || item.csiCode?.substring(0, 2) || "99").trim();
    const key = `${div}|${item.unit.toUpperCase()}`;
    if (!divUnitGroups.has(key)) divUnitGroups.set(key, []);
    divUnitGroups.get(key)!.push(item);
  }
  
  const result: RawItem[] = [];
  let fuzzyMergedCount = 0;
  
  for (const [_key, divItems] of Array.from(divUnitGroups.entries())) {
    const used = new Set<number>();
    
    for (let i = 0; i < divItems.length; i++) {
      if (used.has(i)) continue;
      
      const cluster: RawItem[] = [divItems[i]];
      const coreA = extractCoreElement(divItems[i].description);
      
      for (let j = i + 1; j < divItems.length; j++) {
        if (used.has(j)) continue;
        
        const coreB = extractCoreElement(divItems[j].description);
        const overlap = wordOverlap(coreA, coreB);
        
        // Merge if ≥75% word overlap on core elements
        if (overlap >= 0.75) {
          cluster.push(divItems[j]);
          used.add(j);
        }
      }
      
      used.add(i);
      
      if (cluster.length === 1) {
        result.push(cluster[0]);
      } else {
        fuzzyMergedCount += cluster.length - 1;
        cluster.sort((a: RawItem, b: RawItem) => {
          if (b.confidence !== a.confidence) return b.confidence - a.confidence;
          return parseFloat(b.quantity) - parseFloat(a.quantity);
        });
        const best = cluster[0];
        const finalQty = Math.max(...cluster.map((g: RawItem) => parseFloat(g.quantity)));
        result.push({
          ...best,
          quantity: finalQty.toFixed(2),
          notes: `${best.notes || ""} [Fuzzy-merged ${cluster.length} similar items]`.trim(),
        });
      }
    }
  }
  
  console.log(`[PreDedup] Phase 2 (fuzzy match): ${exactMerged.length} → ${result.length} items (${fuzzyMergedCount} merged)`);
  console.log(`[PreDedup] Total dedup: ${items.length} → ${result.length} items`);
  return result;
}

// ─── Priority 1: Cross-Sheet Consolidation (Programmatic — ZERO LLM calls) ────

/**
 * Groups items that refer to the same physical element across multiple sheets
 * and merges them, keeping the most specific (non-LS) quantity.
 * 
 * V2: 100% programmatic using the expanded synonym library.
 * Items that match the same costItemId in the synonym library are treated as
 * the same element and merged. No LLM calls.
 */
async function consolidateItems(
  items: RawItem[],
  sheets: SheetContext[],
  _currency: string | null,
  _scopeText: string | null
): Promise<ConsolidatedItem[]> {
  if (items.length === 0) return [];

  // ─── Step 0: Programmatic pre-dedup (exact + fuzzy word overlap) ──────────
  const deduped = programmaticDedup(items);
  console.log(`[PostProcess] Pre-dedup: ${items.length} → ${deduped.length} items`);

  // ─── Step 1: Synonym-based consolidation ──────────────────────────────────
  // Load the expanded library and match each item to a costItemId.
  // Items sharing the same costItemId + compatible unit = same physical element.
  await loadExpandedLibrary();

  // Match each item to its best synonym entry
  interface TaggedItem {
    item: RawItem;
    matchId: string | null; // costItemId from expanded library, or null
    matchScore: number;
  }
  const tagged: TaggedItem[] = [];
  for (const item of deduped) {
    const match = await findBestMatchV2({
      description: item.description,
      csiCode: item.csiCode || undefined,
      csiDivision: item.csiDivision || undefined,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
    });
    tagged.push({
      item,
      matchId: match ? match.entry.id : null,
      matchScore: match ? match.score : 0,
    });
  }

  const matchedCount = tagged.filter(t => t.matchId !== null).length;
  console.log(`[PostProcess] Synonym matching: ${matchedCount}/${deduped.length} items matched to library entries`);

  // ─── Step 2: Group by (matchId + unit) for items with matches ─────────────
  // Items with the same matchId + same unit are the same physical element.
  // Unmatched items stay as singletons.
  const groups = new Map<string, TaggedItem[]>();
  let singletonIdx = 0;
  for (const t of tagged) {
    const unit = t.item.unit.toUpperCase().trim();
    const key = t.matchId
      ? `match:${t.matchId}|${unit}`
      : `solo:${singletonIdx++}`; // unmatched items never merge
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  // ─── Step 3: Merge each group into a single ConsolidatedItem ──────────────
  const result: ConsolidatedItem[] = [];
  let synonymMergedCount = 0;

  for (const [_key, group] of Array.from(groups.entries())) {
    // Sort: prefer measured (non-LS) over lump sum, then highest confidence, then largest qty
    group.sort((a, b) => {
      const aIsLS = a.item.unit.toUpperCase() === "LS" ? 1 : 0;
      const bIsLS = b.item.unit.toUpperCase() === "LS" ? 1 : 0;
      if (aIsLS !== bIsLS) return aIsLS - bIsLS; // non-LS first
      if (b.item.confidence !== a.item.confidence) return b.item.confidence - a.item.confidence;
      return parseFloat(b.item.quantity) - parseFloat(a.item.quantity);
    });

    const best = group[0];
    const wasConsolidated = group.length > 1;
    if (wasConsolidated) synonymMergedCount += group.length - 1;

    // For quantities: keep the MAX measured quantity (plan view is most accurate)
    // Don't sum — the same element appears on multiple sheets
    const quantities = group.map(t => parseFloat(t.item.quantity));
    const bestQty = Math.max(...quantities);

    // Collect source info
    const sourceItemIds = group.map(t => t.item.id);
    const sourceSheetIds = Array.from(new Set(group.map(t => t.item.sheetId)));

    // Build notes
    let notes = best.item.notes || "";
    if (wasConsolidated) {
      const sheetNames = group.map(t => {
        const sheet = sheets.find(s => s.id === t.item.sheetId);
        return sheet?.sheetName || `Sheet ${t.item.sheetId}`;
      });
      notes = `[Consolidated ${group.length} items from: ${sheetNames.join(", ")}] ${notes}`.trim();
    }

    result.push({
      csiDivision: (best.item.csiDivision || best.item.csiCode?.substring(0, 2) || "").trim(),
      csiCode: (best.item.csiCode || "").trim(),
      description: best.item.description,
      quantity: bestQty,
      unit: best.item.unit.toUpperCase().trim(),
      unitCost: best.item.unitCost, // will be overwritten by pricing step
      extendedCost: Math.round(bestQty * best.item.unitCost),
      materialCost: 0,
      laborCost: 0,
      confidence: Math.min(100, Math.max(0, best.item.confidence)),
      notes,
      sourceSheetIds,
      sourceItemIds,
      wasConsolidated,
      wasEnhanced: false,
      isGenerated: false,
    });
  }

  console.log(`[PostProcess] Synonym consolidation: ${deduped.length} → ${result.length} items (${synonymMergedCount} merged via synonym match)`);
  return result;
}

// NOTE: consolidateBatch (LLM-based) has been REMOVED.
// Consolidation is now 100% programmatic in consolidateItems() above.
// The old function sent each CSI division to the LLM for merging.
// Now, items matching the same expanded library costItemId are merged automatically.

// ─── LEGACY CONSOLIDATION REMOVED ────────────────────────────────────────────
// The following function was removed to eliminate LLM calls from consolidation:
//   async function consolidateBatch(items, sheets, currency, scopeText)
// It has been replaced by synonym-based grouping in consolidateItems().

// Keeping the fallback conversion as a standalone helper for edge cases:
function rawItemToConsolidated(item: RawItem, sheets: SheetContext[]): ConsolidatedItem {
  return {
    csiDivision: item.csiDivision || "",
    csiCode: item.csiCode || "",
    description: item.description,
    quantity: parseFloat(item.quantity),
    unit: item.unit,
    unitCost: item.unitCost,
    extendedCost: item.extendedCost,
    materialCost: 0,
    laborCost: 0,
    confidence: item.confidence,
    notes: item.notes || "",
    sourceSheetIds: [item.sheetId],
    sourceItemIds: [item.id],
    wasConsolidated: false,
    wasEnhanced: false,
    isGenerated: false,
  };
}

// ─── Priority 2: Lump-Sum Resolution ───────────────────────────────────────────────────

/**
 * Takes consolidated items that are still lump-sum and resolves them
 * to proper units using the expanded synonym library (no LLM call).
 */
async function enhanceLumpSums(
  items: ConsolidatedItem[],
  _sheets: SheetContext[],
  _currency: string | null,
  _scopeText: string | null
): Promise<ConsolidatedItem[]> {
  // Programmatic lump-sum resolution using the expanded synonym library.
  // For each LS item, find the correct unit from the cost library and re-price.
  // Items that don't match stay as LS for manual contractor review.

  const lumpSumItems = items.filter(item => item.unit === "LS");
  if (lumpSumItems.length === 0) {
    console.log("[PostProcess] No lump-sum items to enhance");
    return items;
  }

  console.log(`[PostProcess] Resolving ${lumpSumItems.length} lump-sum items via synonym library...`);
  await loadExpandedLibrary();

  let enhancedCount = 0;
  for (const lsItem of lumpSumItems) {
    // Try to find a match in the expanded cost library
    const match = await findBestMatchV2({
      description: lsItem.description,
      quantity: lsItem.quantity,
      unit: "LS", // current unit
      csiDivision: lsItem.csiDivision,
      csiCode: lsItem.csiCode,
    });

    if (!match || match.score < 40) continue; // No confident match

    const correctUnit = match.entry.unit.toUpperCase().trim();
    // Only enhance if the library has a real measurable unit (not LS)
    if (correctUnit === "LS") continue;

    // Find this item in the main items array
    const mainIdx = items.indexOf(lsItem);
    if (mainIdx === -1) continue;

    // Convert to the correct unit with quantity=1 (flagged for manual update)
    // Re-price using the library's unit cost
    const unitCostCents = Math.round(match.entry.materialCost * 100);
    items[mainIdx] = {
      ...items[mainIdx],
      unit: correctUnit,
      quantity: 1, // Placeholder — contractor updates with real measurement
      unitCost: unitCostCents,
      extendedCost: unitCostCents, // 1 * unitCost
      materialCost: unitCostCents,
      laborCost: 0,
      confidence: Math.min(lsItem.confidence, 50), // Lower confidence since qty is placeholder
      notes: `[LS→${correctUnit}] Unit resolved from cost library (matched: ${match.entry.description}, score: ${match.score}). Quantity set to 1 — update with actual measurement. Original: 1 LS @ $${(lsItem.extendedCost / 100).toFixed(2)}`,
      wasEnhanced: true,
    };
    enhancedCount++;
  }

  console.log(`[PostProcess] Resolved ${enhancedCount} of ${lumpSumItems.length} lump-sum items to measured units (qty=1, needs manual update)`);
  return items;
}

// ─── Priority 4: Formwork Generation ──────────────────────────────────────────

/**
 * Generates formwork items for concrete members that need forms.
 * Calculates SFCA (square feet of contact area) based on concrete dimensions.
 */
async function generateFormwork(
  items: ConsolidatedItem[],
  currency: string | null,
  scopeText: string | null
): Promise<ConsolidatedItem[]> {
  // Only generate formwork if concrete items exist
  const concreteItems = items.filter(item =>
    item.csiDivision === "03" && item.unit !== "LS" && item.quantity > 0 &&
    !item.description.toLowerCase().includes("formwork") &&
    !item.description.toLowerCase().includes("form ") &&
    !item.csiCode?.startsWith("03 11")
  );

  if (concreteItems.length === 0) {
    console.log("[PostProcess] No measured concrete items, skipping formwork generation");
    return items;
  }

  // Check for EXISTING formwork items already extracted from sheets
  // Use strict matching: must start with 'formwork' or 'form for' or have CSI 03 11
  // Do NOT match items that merely contain 'form' as part of a word (e.g. 'information', 'platform')
  const existingFormwork = items.filter(item => {
    const desc = item.description.toLowerCase();
    return (
      desc.startsWith("formwork") ||
      desc.startsWith("form for") ||
      desc.startsWith("forms for") ||
      desc.includes(" formwork") ||
      item.csiCode?.startsWith("03 11")
    );
  });
  const existingFormworkDescs = existingFormwork.map(f => f.description.toLowerCase());
  console.log(`[PostProcess] Found ${existingFormwork.length} existing formwork items, ${concreteItems.length} concrete items needing formwork`);

  // Only skip formwork generation if we have a substantial number of existing formwork items
  // (at least 5 items AND covers ≥80% of concrete items) — be conservative about skipping
  if (existingFormwork.length >= 5 && existingFormwork.length >= concreteItems.length * 0.8) {
    console.log(`[PostProcess] Extracted formwork (${existingFormwork.length}) already covers ≥80% of concrete items (${concreteItems.length}) — skipping formwork generation`);
    return items;
  }

  // Check if scope includes formwork (CSI 03 11 00 series)
  // Formwork is always part of concrete work, so if concrete is in scope, formwork is too

  const currencyLabel = currency === "GBP" ? "GBP" : currency === "AUD" ? "AUD" : "USD";

  const formworkPrompt = `You are a senior construction estimator. Generate formwork quantities for the following concrete items.

For each concrete member, calculate the formwork needed:
- FOOTINGS: 2 sides × depth × length = SFCA. Also estimate form boards (2×12 or 2×10), stakes, and kickers.
- WALLS/STEM WALLS: 2 sides × height × length = SFCA. Estimate plywood sheets, walers, and ties.
- SLABS (edges only): perimeter × slab thickness = SFCA for edge forms. Estimate form boards and stakes.
- PITS: calculate all formed surfaces (walls + any formed bottom edges)
- GRADE BEAMS: 2 sides × depth × length = SFCA

${scopeText ? `SCOPE: "${scopeText}"` : ""}

## CONCRETE ITEMS:
${JSON.stringify(concreteItems.map(item => ({
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  notes: item.notes,
})), null, 2)}

## OUTPUT FORMAT
Return formwork items as a JSON array. Each item should be:
- csiCode: "03 11 00" (Concrete Forming)
- description: specific formwork description (e.g., "Formwork for Continuous Footing 24\"W × 12\"D")
- quantity: SFCA (square feet of contact area)
- unit: "SFCA"
- unitCost: set to 1 (pricing applied from cost database)
- confidence: 0-100
- notes: calculation breakdown
- forConcreteItem: description of the concrete item this formwork is for

Only generate formwork for items that actually need forms (not for slabs-on-grade interior, vapor barriers, etc.)`;

  const formworkSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "formwork_result",
      strict: true,
      schema: {
        type: "object",
        properties: {
          formworkItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                csiCode: { type: "string" },
                description: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                unitCost: { type: "number" },
                confidence: { type: "integer" },
                notes: { type: "string" },
                forConcreteItem: { type: "string" },
              },
              required: ["csiCode", "description", "quantity", "unit", "unitCost", "confidence", "notes", "forConcreteItem"],
              additionalProperties: false,
            },
          },
        },
        required: ["formworkItems"],
        additionalProperties: false,
      },
    },
  };

  try {
    console.log(`[PostProcess] Generating formwork for ${concreteItems.length} concrete items...`);

    const response = await ppLimiter(() => invokeLLMWithTimeout({
      messages: [
        { role: "system", content: "You are a senior construction estimator. Calculate formwork quantities for concrete members. Return JSON." },
        { role: "user", content: formworkPrompt },
      ],
      response_format: formworkSchema,
    }, PP_LLM_TIMEOUT_MS));

    const rawContent3 = response.choices[0]?.message?.content;
    if (!rawContent3) throw new Error("No content in formwork response");
    const content = typeof rawContent3 === "string" ? rawContent3 : JSON.stringify(rawContent3);

    const parsed = JSON.parse(content) as {
      formworkItems: Array<{
        csiCode: string;
        description: string;
        quantity: number;
        unit: string;
        unitCost: number;
        confidence: number;
        notes: string;
        forConcreteItem: string;
      }>;
    };

    // Add formwork items to the consolidated list, but DEDUPLICATE against existing formwork
    let addedCount = 0;
    let skippedCount = 0;
    const formworkConsolidated: ConsolidatedItem[] = [];

    for (const fw of parsed.formworkItems) {
      const newDesc = fw.description.toLowerCase();
      // Check if a similar formwork item already exists
      const isDuplicate = existingFormworkDescs.some(existingDesc => {
        // Fuzzy match: check if they refer to the same concrete element
        const newWords = newDesc.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
        const existWords = existingDesc.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2);
        // Count matching keywords (excluding common words like "for", "the", "formwork")
        const skipWords = new Set(["for", "the", "and", "formwork", "form", "forms", "concrete"]);
        const meaningfulNew = newWords.filter(w => !skipWords.has(w));
        const meaningfulExist = existWords.filter(w => !skipWords.has(w));
        const matches = meaningfulNew.filter(w => meaningfulExist.some(e => e.includes(w) || w.includes(e)));
        const matchRatio = meaningfulNew.length > 0 ? matches.length / meaningfulNew.length : 0;
        return matchRatio >= 0.4; // 40% keyword overlap = same element (tightened to catch more duplicates)
      });

      if (isDuplicate) {
        skippedCount++;
        console.log(`[PostProcess] Skipping duplicate formwork: ${fw.description}`);
        continue;
      }

      formworkConsolidated.push({
        csiDivision: "03",
        csiCode: fw.csiCode.trim(),
        description: fw.description,
        quantity: fw.quantity,
        unit: fw.unit.toUpperCase().trim(),
        unitCost: Math.round(fw.unitCost * 100),
        extendedCost: Math.round(fw.quantity * fw.unitCost * 100),
        materialCost: 0,
        laborCost: 0,
        confidence: fw.confidence,
        notes: `[Generated] ${fw.notes}. For: ${fw.forConcreteItem}`,
        sourceSheetIds: [],
        sourceItemIds: [],
        wasConsolidated: false,
        wasEnhanced: false,
        isGenerated: true,
      });
      addedCount++;
    }

    console.log(`[PostProcess] Formwork: ${parsed.formworkItems.length} generated, ${skippedCount} duplicates skipped, ${addedCount} new items added`);
    return [...items, ...formworkConsolidated];
  } catch (error) {
    console.error("[PostProcess] Formwork generation failed:", error);
    return items;
  }
}

// ─── Priority 5: Rebar Enhancement ────────────────────────────────────────────

/**
 * Enhances rebar quantities by combining plan dimensions with section callouts.
 * For items like "#4 @ 16" OC T&B each way" that have a callout but no total LF,
 * this uses the measured slab/footing/wall dimensions to calculate total rebar.
 */
async function enhanceRebar(
  items: ConsolidatedItem[],
  sheets: SheetContext[],
  currency: string | null
): Promise<ConsolidatedItem[]> {
  // Find rebar items (CSI 03 20 00) that are LS or have low quantities
  const rebarItems = items.filter(item =>
    item.csiCode?.startsWith("03 20") || 
    item.description.toLowerCase().includes("rebar") ||
    item.description.toLowerCase().includes("reinforc") ||
    item.description.toLowerCase().includes("#3 ") ||
    item.description.toLowerCase().includes("#4 ") ||
    item.description.toLowerCase().includes("#5 ") ||
    item.description.toLowerCase().includes("#6 ")
  );

  // Find concrete items with measured quantities (these provide dimensions)
  const measuredConcrete = items.filter(item =>
    item.csiDivision === "03" && 
    item.unit !== "LS" && 
    item.quantity > 0 &&
    !item.description.toLowerCase().includes("rebar") &&
    !item.description.toLowerCase().includes("reinforc")
  );

  if (rebarItems.length === 0 || measuredConcrete.length === 0) {
    console.log("[PostProcess] Insufficient data for rebar enhancement");
    return items;
  }

  // Find structural section sheets for rebar callout details
  const sectionSheets = sheets.filter(s =>
    s.sheetType && ["section", "detail", "structural"].includes(s.sheetType) && s.imageUrl
  );

  const currencyLabel = currency === "GBP" ? "GBP" : currency === "AUD" ? "AUD" : "USD";

  const rebarPrompt = `You are a senior construction estimator specializing in reinforcing steel. 

I have rebar items from a takeoff that need quantity enhancement. Some are lump sums, some have partial quantities. I also have the MEASURED concrete member dimensions that these rebar items belong to.

Your job: Calculate total rebar quantities (in LF and LBS) by combining the rebar callouts with the concrete member dimensions.

## REBAR CALCULATION RULES:
- Spacing callout (e.g., "#4 @ 16" OC"): bars per foot = 12 / spacing_inches
- "Each way" means bars in both directions
- "T&B" (top & bottom) means two layers
- Add 10% for lap splices and waste
- Convert LF to LBS using standard weights: #3=0.376, #4=0.668, #5=1.043, #6=1.502 lbs/ft

## REBAR PRICING (2026 RSMeans + Regional Adjustment):
Base unit costs per LF (includes material + labor + equipment for placement):
- #3 Rebar: $0.85-1.10 per LF
- #4 Rebar: $1.10-1.45 per LF
- #5 Rebar: $1.45-1.85 per LF
- #6 Rebar: $1.85-2.25 per LF
- Stirrups/Ties (#3 or #4): $0.95-1.35 per LF
- Dowels: $1.20-1.60 per LF
For this project, apply regional multiplier: 1.00x (or adjust based on local market conditions)

## CURRENT REBAR ITEMS:
${JSON.stringify(rebarItems.map(item => ({
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  notes: item.notes,
})), null, 2)}

## MEASURED CONCRETE MEMBERS (use these dimensions):
${JSON.stringify(measuredConcrete.map(item => ({
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  notes: item.notes,
})), null, 2)}

## OUTPUT FORMAT
Return enhanced rebar items as a JSON array. For each rebar item:
- description: specific description with bar size, spacing, and member
- quantity: total LF of rebar
- unit: "LF"
- weightLbs: total weight in pounds
- unitCost: set to 1 (pricing applied from cost database)
- confidence: 0-100
- notes: calculation breakdown (show the math)
- replacesOriginal: description of the original item this replaces (or "new" if it's a new item)`;

  const rebarSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "rebar_result",
      strict: true,
      schema: {
        type: "object",
        properties: {
          enhancedRebarItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                weightLbs: { type: "number" },
                unitCost: { type: "number" },
                confidence: { type: "integer" },
                notes: { type: "string" },
                replacesOriginal: { type: "string" },
              },
              required: ["description", "quantity", "unit", "weightLbs", "unitCost", "confidence", "notes", "replacesOriginal"],
              additionalProperties: false,
            },
          },
        },
        required: ["enhancedRebarItems"],
        additionalProperties: false,
      },
    },
  };

  try {
    console.log(`[PostProcess] Enhancing ${rebarItems.length} rebar items using ${measuredConcrete.length} concrete member dimensions...`);

    // Include section sheet images if available for rebar callout details
    const userContent: Array<{type: "text"; text: string} | {type: "image_url"; image_url: {url: string; detail: "high"}}> = [{ type: "text", text: rebarPrompt }];
    
    // Add up to 2 section sheet images for rebar callout reference
    const rebarSections = sectionSheets.slice(0, 2);
    for (const sheet of rebarSections) {
      if (sheet.imageUrl) {
        userContent.push({
          type: "image_url",
          image_url: { url: sheet.imageUrl, detail: "high" },
        });
      }
    }

    const rebarMessages: Message[] = [
      {
        role: "system",
        content: "You are a senior construction estimator specializing in reinforcing steel. Calculate rebar quantities from callouts and member dimensions. Return JSON.",
      },
      { role: "user", content: userContent },
    ];

    const response = await ppLimiter(() => invokeLLMWithTimeout({
      messages: rebarMessages,
      response_format: rebarSchema,
    }, PP_LLM_TIMEOUT_MS));

    const rawContent4 = response.choices[0]?.message?.content;
    if (!rawContent4) throw new Error("No content in rebar enhancement response");
    const content = typeof rawContent4 === "string" ? rawContent4 : JSON.stringify(rawContent4);

    const parsed = JSON.parse(content) as {
      enhancedRebarItems: Array<{
        description: string;
        quantity: number;
        unit: string;
        weightLbs: number;
        unitCost: number;
        confidence: number;
        notes: string;
        replacesOriginal: string;
      }>;
    };

    // Remove original rebar items that are being replaced
    const enhancedItems = items.filter(item => !rebarItems.includes(item));

    // Add enhanced rebar items
    for (const rebar of parsed.enhancedRebarItems) {
      enhancedItems.push({
        csiDivision: "03",
        csiCode: "03 20 00",
        description: rebar.description,
        quantity: rebar.quantity,
        unit: rebar.unit.toUpperCase().trim(),
        unitCost: Math.round(rebar.unitCost * 100),
        extendedCost: Math.round(rebar.quantity * rebar.unitCost * 100),
        materialCost: 0,
        laborCost: 0,
        confidence: rebar.confidence,
        notes: `[Enhanced] ${rebar.notes}. Weight: ${rebar.weightLbs.toFixed(0)} lbs. ${rebar.replacesOriginal !== "new" ? `Replaces: ${rebar.replacesOriginal}` : ""}`,
        sourceSheetIds: [],
        sourceItemIds: [],
        wasConsolidated: false,
        wasEnhanced: true,
        isGenerated: rebar.replacesOriginal === "new",
      });
    }

    console.log(`[PostProcess] Enhanced rebar: ${rebarItems.length} original → ${parsed.enhancedRebarItems.length} enhanced items`);
    return enhancedItems;
  } catch (error) {
    console.error("[PostProcess] Rebar enhancement failed:", error);
    return items;
  }
}

// ─── Priority 6: Concrete Volume (CY) Calculation ───────────────────────────

/**
 * Calculates concrete volume in CY for items that have dimensions in their
 * descriptions/notes but are measured in LF, SF, or SFCA instead of CY.
 * Also adds a summary CY item for the total concrete pour.
 */
function calculateConcreteVolumes(
  items: ConsolidatedItem[],
  _currency: string | null,
  _scopeText: string | null
): ConsolidatedItem[] {
  // Find concrete items (CSI 03) that are NOT already in CY and NOT formwork/rebar/earthwork
  const concreteItems = items.filter(item => {
    const desc = item.description.toLowerCase();
    const div = item.csiDivision;
    
    // Must be CSI 03 (Concrete)
    if (div !== "03") return false;
    
    // Exclude formwork/rebar/non-concrete materials
    if (item.csiCode?.startsWith("03 11")) return false; // formwork
    if (item.csiCode?.startsWith("03 20")) return false; // rebar
    if (desc.includes("formwork")) return false;
    if (desc.includes("rebar")) return false;
    if (desc.includes("reinforc")) return false;
    if (desc.includes("vapor")) return false;
    if (desc.includes("curing")) return false;
    if (desc.includes("waterstop")) return false;
    if (desc.includes("admixture")) return false;
    if (desc.includes("sealant")) return false;
    if (desc.includes("epoxy")) return false;
    
    // CRITICAL FIX: Exclude earthwork items (excavation, backfill, fill, aggregate)
    // These are measured in CY but are NOT concrete volumes
    if (desc.includes("excavation")) return false;
    if (desc.includes("backfill")) return false;
    if (desc.includes("fill") && !desc.includes("filler")) return false;
    if (desc.includes("aggregate")) return false;
    if (desc.includes("base course")) return false;
    if (desc.includes("compacted")) return false;
    if (desc.includes("granular")) return false;
    if (desc.includes("gravel")) return false;
    
    return true;
  });

  if (concreteItems.length === 0) {
    console.log("[PostProcess] No concrete items for CY calculation");
    return items;
  }

  // Programmatic CY calculation — no LLM call needed
  console.log(`[PostProcess] Calculating CY volumes programmatically for ${concreteItems.length} concrete items...`);

  const updatedItems = [...items];
  let totalCY = 0;
  let calculatedCount = 0;

  for (const cItem of concreteItems) {
    const combined = `${cItem.description} ${cItem.notes || ""}`.toLowerCase();
    let volumeCY = 0;
    let calculation = "";

    // Parse dimensions from description/notes
    // Pattern: N'-N" or just N" for widths/depths
    const parseFtIn = (s: string): number | null => {
      // Match N'-N"
      const ftIn = s.match(/(\d+)['’][-\s]*(\d+)["\u201D]/);
      if (ftIn) return parseInt(ftIn[1]) + parseInt(ftIn[2]) / 12;
      // Match N'
      const ftOnly = s.match(/(\d+)['’]/);
      if (ftOnly) return parseInt(ftOnly[1]);
      // Match N"
      const inOnly = s.match(/(\d+)["\u201D]/);
      if (inOnly) return parseInt(inOnly[1]) / 12;
      return null;
    };

    const unit = cItem.unit.toUpperCase();
    const qty = cItem.quantity;

    if (unit === "CY" && qty > 0) {
      // Already in CY
      volumeCY = qty;
      calculation = `Already in CY: ${qty.toFixed(2)} CY`;
    } else if (unit === "LF" && qty > 0) {
      // LF items: need width and depth from description
      // Look for patterns like "24\"W x 12\"D" or "2'-0\" W x 1'-0\" D"
      const wxd = combined.match(/(\d+)["\u201D'’]?[-\s]*(\d*)["\u201D]?\s*[wW]\s*[x××]\s*(\d+)["\u201D'’]?[-\s]*(\d*)["\u201D]?\s*[dDtT]/);
      if (wxd) {
        const wInches = parseInt(wxd[1]) * (wxd[1].length <= 2 && !combined.includes("'") ? 1 : 12) + parseInt(wxd[2] || "0");
        const dInches = parseInt(wxd[3]) * (wxd[3].length <= 2 && !combined.includes("'") ? 1 : 12) + parseInt(wxd[4] || "0");
        // Heuristic: if values > 24, likely inches; if <= 24, check context
        let wFt = wInches <= 120 ? wInches / 12 : wInches;
        let dFt = dInches <= 120 ? dInches / 12 : dInches;
        // Simple heuristic: values in description are usually inches for footings
        wFt = parseInt(wxd[1]) / 12;
        dFt = parseInt(wxd[3]) / 12;
        volumeCY = (qty * wFt * dFt) / 27 * 1.05;
        calculation = `${qty.toFixed(0)} LF × ${wFt.toFixed(2)}' W × ${dFt.toFixed(2)}' D / 27 × 1.05 waste = ${volumeCY.toFixed(2)} CY`;
      } else {
        // Try to find any two dimension numbers
        const dims = combined.match(/(\d+)["\u201D]\s*[x××]\s*(\d+)["\u201D]/);
        if (dims) {
          const wFt = parseInt(dims[1]) / 12;
          const dFt = parseInt(dims[2]) / 12;
          volumeCY = (qty * wFt * dFt) / 27 * 1.05;
          calculation = `${qty.toFixed(0)} LF × ${wFt.toFixed(2)}' × ${dFt.toFixed(2)}' / 27 × 1.05 = ${volumeCY.toFixed(2)} CY`;
        }
      }
    } else if (unit === "SF" && qty > 0) {
      // SF items: need thickness
      const thickMatch = combined.match(/(\d+)["\u201D]?\s*(thick|thk|slab|deep)/i);
      if (thickMatch) {
        const thickFt = parseInt(thickMatch[1]) / 12;
        volumeCY = (qty * thickFt) / 27 * 1.05;
        calculation = `${qty.toFixed(0)} SF × ${thickFt.toFixed(3)}' thick / 27 × 1.05 = ${volumeCY.toFixed(2)} CY`;
      } else {
        // Default 4" thick for slabs if no thickness specified
        const defaultThick = 4 / 12;
        volumeCY = (qty * defaultThick) / 27 * 1.05;
        calculation = `${qty.toFixed(0)} SF × ${defaultThick.toFixed(3)}' thick (assumed 4\") / 27 × 1.05 = ${volumeCY.toFixed(2)} CY`;
      }
    } else if (unit === "EA" && qty > 0) {
      // EA items: try to parse L x W x D
      const lwd = combined.match(/(\d+)['’"\u201D]?\s*[x××]\s*(\d+)['’"\u201D]?\s*[x××]\s*(\d+)['’"\u201D]?/);
      if (lwd) {
        // Assume inches if values are reasonable
        const l = parseInt(lwd[1]) / 12;
        const w = parseInt(lwd[2]) / 12;
        const d = parseInt(lwd[3]) / 12;
        volumeCY = (qty * l * w * d) / 27 * 1.05;
        calculation = `${qty.toFixed(0)} EA × ${l.toFixed(2)}' × ${w.toFixed(2)}' × ${d.toFixed(2)}' / 27 × 1.05 = ${volumeCY.toFixed(2)} CY`;
      }
    }

    if (volumeCY > 0) {
      calculatedCount++;
      totalCY += volumeCY;

      // Find this item in the main array and append CY info to notes
      const mainIdx = updatedItems.findIndex(item =>
        item.description === cItem.description &&
        item.quantity === cItem.quantity
      );
      if (mainIdx !== -1) {
        const existingNotes = updatedItems[mainIdx].notes || "";
        updatedItems[mainIdx] = {
          ...updatedItems[mainIdx],
          notes: `${existingNotes}${existingNotes ? " | " : ""}[Volume: ${volumeCY.toFixed(2)} CY] ${calculation}`,
        };
      }
    }
  }

  console.log(`[PostProcess] CY volume: calculated ${calculatedCount} of ${concreteItems.length} items, total ${totalCY.toFixed(1)} CY`);
  return updatedItems;
}

// ─── Hard Programmatic Filters ──────────────────────────────────────

/**
 * Hard scope filter: programmatically remove items from CSI divisions
 * that are clearly out of scope based on the scope text.
 * This runs BEFORE LLM consolidation to reduce item count.
 */
export function hardScopeFilter(items: RawItem[], scopeText: string | null): RawItem[] {
  if (!scopeText || scopeText.trim().length === 0) return items;

  const scope = scopeText.toLowerCase();
  
  // Detect scope patterns
  const isFoundationOnly = /foundation|footing|slab.on.grade|sog|below.grade/i.test(scope) && 
    /only|up.through|none.of.the.vertical|no.vertical/i.test(scope);
  const isConcreteOnly = /concrete.only/i.test(scope);
  const isStructuralOnly = /structural.only/i.test(scope);
  const noVertical = /none.of.the.vertical|no.vertical|not.vertical/i.test(scope);
  
  if (!isFoundationOnly && !isConcreteOnly && !isStructuralOnly && !noVertical) {
    console.log(`[HardFilter] No restrictive scope pattern detected, skipping hard filter`);
    return items;
  }
  
  // Define which divisions to EXCLUDE based on scope
  const excludeDivisions = new Set<string>();
  
  if (isFoundationOnly || noVertical) {
    // Foundation/SOG scope: exclude above-grade divisions
    excludeDivisions.add("04"); // Masonry
    excludeDivisions.add("05"); // Metals (structural steel)
    excludeDivisions.add("06"); // Wood/Plastics
    excludeDivisions.add("07"); // Thermal/Moisture
    excludeDivisions.add("08"); // Openings (doors/windows)
    excludeDivisions.add("09"); // Finishes
    excludeDivisions.add("10"); // Specialties
    excludeDivisions.add("11"); // Equipment
    excludeDivisions.add("12"); // Furnishings
    excludeDivisions.add("13"); // Special Construction
    excludeDivisions.add("14"); // Conveying
    excludeDivisions.add("21"); // Fire Suppression
    excludeDivisions.add("22"); // Plumbing
    excludeDivisions.add("23"); // HVAC
    excludeDivisions.add("26"); // Electrical
    excludeDivisions.add("27"); // Communications
    excludeDivisions.add("28"); // Electronic Safety
    excludeDivisions.add("33"); // Utilities
  }
  
  if (isConcreteOnly) {
    // Only keep 03 and 31
    for (const div of ["01","02","04","05","06","07","08","09","10","11","12","13","14","21","22","23","26","27","28","32","33"]) {
      excludeDivisions.add(div);
    }
  }
  
  if (excludeDivisions.size === 0) return items;
  
  const before = items.length;
  const filtered = items.filter(item => {
    const div = (item.csiDivision || item.csiCode?.substring(0, 2) || "").trim();
    if (excludeDivisions.has(div)) {
      return false;
    }
    return true;
  });
  
  const removed = before - filtered.length;
  console.log(`[HardFilter] Scope: "${scope.substring(0, 80)}..." → removed ${removed} items from excluded divisions: ${Array.from(excludeDivisions).join(", ")}`);
  return filtered;
}

/**
 * Remove specification notes that were incorrectly extracted as line items.
 * These are items with $0-$1 cost, LS unit, and descriptions that read like spec notes.
 */
function removeSpecNotes(items: RawItem[]): RawItem[] {
  const before = items.length;
  
  const filtered = items.filter(item => {
    const cost = item.extendedCost; // in cents
    const unit = item.unit.toUpperCase();
    const desc = item.description.toLowerCase();
    const qty = parseFloat(item.quantity);
    
    // Remove items that are clearly spec notes:
    // - $0-$1 cost (0-100 cents) AND LS unit AND qty <= 1
    if (cost <= 100 && unit === "LS" && qty <= 1) {
      // Check if description looks like a spec note
      const specPatterns = [
        /shall\s+(be|conform|not|provide|exceed)/,
        /minimum\s+(compressive|ultimate|yield|strength|prism)/,
        /psi\s+(minimum|maximum)/,
        /astm\s+[a-z]/,
        /conform\s+to/,
        /unless\s+noted/,
        /per\s+table/,
        /licensed\s+in/,
        /not\s+permitted/,
        /shall\s+be\s+(a\s+pe|licensed|designed|cambered|adequately|spaced)/,
        /provide\s+(floor|lateral|galvanized)/,
        /moisture\s+content/,
        /delivery.*handling/,
        /dimensions\s+shall/,
        /manufacturer/,
        /fastened\s+together/,
        /multiple\s+lvl/,
        /nails\s+@/,
        /bolts\s+@/,
        /rows\s+of/,
        /grade\s+\d+\s+ksi/,
        /yield\s+strength/,
        /\bply\b.*\bmembers\b/,
      ];
      
      const isSpecNote = specPatterns.some(p => p.test(desc));
      if (isSpecNote) {
        console.log(`[SpecFilter] Removing spec note: "${desc.substring(0, 80)}..."`);
        return false;
      }
      
      // Also remove items with very generic descriptions at $1
      if (cost <= 100 && desc.length > 60) {
        // Long descriptions at $1 are almost always spec notes
        console.log(`[SpecFilter] Removing likely spec note ($${(cost/100).toFixed(0)}, ${unit}): "${desc.substring(0, 80)}..."`);
        return false;
      }
    }
    
    return true;
  });
  
  const removed = before - filtered.length;
  if (removed > 0) {
    console.log(`[SpecFilter] Removed ${removed} spec notes / $0-$1 items`);
  }
  return filtered;
}
// ─── Cross-Division Dedup ──────────────────────────────────────────────────────

/**
 * Remove items that appear in multiple CSI divisions (e.g., base course in both 03 and 31).
 * Keeps the item in its most natural division.
 */
function crossDivisionDedup(items: ConsolidatedItem[]): ConsolidatedItem[] {
  const crossDivPatterns = [
    { keywords: ["base course", "compacted base", "aggregate base", "crushed stone base", "abc base"], preferDivision: "31" },
    { keywords: ["vapor barrier", "vapor retarder", "moisture barrier", "poly barrier", "polyethylene"], preferDivision: "07" },
    { keywords: ["backfill", "compacted fill", "structural fill"], preferDivision: "31" },
    { keywords: ["gravel", "crushed stone", "aggregate"], preferDivision: "31" },
    { keywords: ["geotextile", "filter fabric", "weed barrier"], preferDivision: "31" },
    { keywords: ["waterproofing", "dampproofing"], preferDivision: "07" },
  ];

  const toRemove = new Set<number>();

  for (const pattern of crossDivPatterns) {
    // Find all items matching this pattern
    const matches: { index: number; item: ConsolidatedItem }[] = [];
    for (let i = 0; i < items.length; i++) {
      const desc = items[i].description.toLowerCase();
      if (pattern.keywords.some(kw => desc.includes(kw))) {
        matches.push({ index: i, item: items[i] });
      }
    }

    if (matches.length <= 1) continue;

    // Group by division
    const byDiv = new Map<string, { index: number; item: ConsolidatedItem }[]>();
    for (const m of matches) {
      const div = m.item.csiDivision;
      if (!byDiv.has(div)) byDiv.set(div, []);
      byDiv.get(div)!.push(m);
    }

    if (byDiv.size <= 1) continue;

    // Keep items in preferred division, remove from others
    for (const [div, divMatches] of Array.from(byDiv.entries())) {
      if (div !== pattern.preferDivision) {
        for (const m of divMatches) {
          console.log(`[CrossDivDedup] Removing "${m.item.description}" from CSI ${div} (keeping in ${pattern.preferDivision})`);
          toRemove.add(m.index);
        }
      }
    }
  }

  if (toRemove.size > 0) {
    console.log(`[CrossDivDedup] Removed ${toRemove.size} cross-division duplicates`);
  }

  return items.filter((_, i) => !toRemove.has(i));
}

// ─── Main Post-Processing Pipeline ────────────────────────────────────────────────

/**
 * Run the full post-processing pipeline on a completed takeoff project.
 * This should be called AFTER all sheets have been individually processed.
 */
export async function postProcessTakeoff(projectId: number): Promise<{
  originalCount: number;
  consolidatedCount: number;
  lumpSumsConverted: number;
  outOfScopeRemoved: number;
  formworkAdded: number;
  rebarEnhanced: number;
}> {
  const project = await getTakeoffProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const sheets = await getDrawingSheetsByProject(projectId);
  const sheetContexts: SheetContext[] = sheets.map((s: any) => ({
    id: s.id,
    sheetName: s.sheetName,
    sheetType: s.sheetType,
    imageUrl: s.imageUrl,
  }));

  // Load all current items
  const rawItems = await getTakeoffItemsByProject(projectId) as unknown as RawItem[];
  const originalCount = rawItems.length;

  // ─── Snapshot pre-consolidation items for diff tracking ───────────────────
  const preConsolidationSnapshot = rawItems.map(item => ({
    id: item.id,
    csiDivision: item.csiDivision,
    csiCode: item.csiCode,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitCost: item.unitCost,
    extendedCost: item.extendedCost,
    confidence: item.confidence,
    notes: item.notes,
    sheetId: item.sheetId,
  }));
  try {
    await updateTakeoffProject(projectId, { consolidationSnapshot: preConsolidationSnapshot } as any);
    console.log(`[PostProcess] Saved pre-consolidation snapshot: ${preConsolidationSnapshot.length} items`);
  } catch (snapErr) {
    console.error(`[PostProcess] Failed to save consolidation snapshot:`, snapErr);
    // Non-fatal — continue with consolidation even if snapshot fails
  }

  if (originalCount === 0) {
    console.log("[PostProcess] No items to process");
    return { originalCount: 0, consolidatedCount: 0, lumpSumsConverted: 0, outOfScopeRemoved: 0, formworkAdded: 0, rebarEnhanced: 0 };
  }

  const lsBefore = rawItems.filter(i => i.unit === "LS").length;

  console.log(`[PostProcess] Starting post-processing pipeline for project ${projectId} (${originalCount} items, ${lsBefore} LS)...`);

  // Step 0: Hard programmatic filters BEFORE LLM consolidation
  let filteredItems = hardScopeFilter(rawItems, project.scopeText);
  filteredItems = removeSpecNotes(filteredItems);
  console.log(`[PostProcess] After hard filters: ${originalCount} → ${filteredItems.length} items (${originalCount - filteredItems.length} removed)`);

  // Step 1: Consolidate items across sheets (also handles scope enforcement)
  console.log(`[PostProcess] Step 1/6: Consolidating items...`);
  await updateTakeoffProject(projectId, { postProcessStep: 'consolidating' } as any).catch(() => {});
  let consolidated = await consolidateItems(filteredItems, sheetContexts, project.currency, project.scopeText);
  const consolidatedCount = consolidated.length;
  const outOfScopeRemoved = originalCount - consolidatedCount; // approximate

  // Steps 2, 3, 4 run IN PARALLEL — they operate on separate item subsets
  console.log(`[PostProcess] Steps 2-4: Lump sums + Formwork + Rebar (parallel)...`);
  await updateTakeoffProject(projectId, { postProcessStep: 'enhancing' } as any).catch(() => {});

  const lsBeforeEnhance = consolidated.filter(i => i.unit === "LS").length;
  const rebarBefore = consolidated.filter(i =>
    i.csiCode?.startsWith("03 20") || i.description.toLowerCase().includes("rebar")
  ).length;

  // Run all three enhancement passes in parallel
  const [lumpSumResult, formworkResult, rebarResult] = await Promise.all([
    // Step 2: Enhance lump sums
    enhanceLumpSums([...consolidated], sheetContexts, project.currency, project.scopeText),
    // Step 3: Generate formwork items
    generateFormwork([...consolidated], project.currency, project.scopeText),
    // Step 4: Enhance rebar quantities
    enhanceRebar([...consolidated], sheetContexts, project.currency),
  ]);

  // Merge results: start with lump-sum-enhanced items as base
  consolidated = lumpSumResult;
  const lsAfterEnhance = consolidated.filter(i => i.unit === "LS").length;
  const lumpSumsConverted = lsBeforeEnhance - lsAfterEnhance;

  // Merge formwork: add any NEW items generated by formwork pass
  const originalDescs = new Set(consolidated.map(i => i.description));
  const newFormworkItems = formworkResult.filter(i => i.isGenerated && !originalDescs.has(i.description));
  consolidated = [...consolidated, ...newFormworkItems];
  const formworkAdded = newFormworkItems.length;

  // Merge rebar: replace rebar items with enhanced versions
  const rebarDescSet = new Set(
    rebarResult
      .filter(i => i.csiCode?.startsWith("03 20") || i.description.toLowerCase().includes("rebar"))
      .map(i => i.description)
  );
  // Replace matching rebar items with enhanced versions
  const enhancedRebarMap = new Map(
    rebarResult
      .filter(i => i.wasEnhanced && (i.csiCode?.startsWith("03 20") || i.description.toLowerCase().includes("rebar")))
      .map(i => [i.description, i])
  );
  consolidated = consolidated.map(item => {
    const enhanced = enhancedRebarMap.get(item.description);
    return enhanced || item;
  });
  const rebarAfter = consolidated.filter(i =>
    i.csiCode?.startsWith("03 20") || i.description.toLowerCase().includes("rebar")
  ).length;
  const rebarEnhanced = Math.abs(rebarAfter - rebarBefore);

  // Step 5: Calculate concrete volumes in CY
  const cyBefore = consolidated.filter(i => i.unit === "CY" && i.csiDivision === "03").length;
  consolidated = calculateConcreteVolumes(consolidated, project.currency, project.scopeText);
  const cyAfter = consolidated.filter(i => i.unit === "CY" && i.csiDivision === "03").length;
  const cyItemsAdded = cyAfter - cyBefore;
  console.log(`[PostProcess] CY calculation: ${cyItemsAdded} summary CY items added`);

  // Step 5.5: Cross-division dedup (base course, vapor barrier can appear in CSI 03 AND 31)
  consolidated = crossDivisionDedup(consolidated);
  console.log(`[PostProcess] After cross-division dedup: ${consolidated.length} items`);

  // Step 6: Apply cost table pricing
  console.log(`[PostProcess] Step 5/6: Applying pricing...`);
  await updateTakeoffProject(projectId, { postProcessStep: 'pricing' } as any).catch(() => {});
  const costTableItems: CostTakeoffItem[] = consolidated.map(item => ({
    description: item.description,
    csiCode: item.csiCode,
    csiDivision: item.csiDivision,
    quantity: item.quantity,
    unit: item.unit,
    unitCost: item.unitCost / 100, // cents to dollars for lookup
    confidence: item.confidence,
    notes: item.notes,
  }));

  // Load member's personal cost library overrides (cents → dollars)
  const memberLibraryRaw = await getCostLibraryByMember(project.memberId).catch(() => []);
  const memberOverrides: UserLibraryEntry[] = memberLibraryRaw.map((e: any) => ({
    description: e.description,
    unit: e.unit,
    unitCost: e.unitCost / 100,
    csiDivision: e.csiDivision || "",
  }));
  // Apply cost table with member overrides taking priority over RSMeans defaults
  // V2: Uses expanded synonym library (8,600+ synonyms) — ZERO LLM calls
  let pricedItems = memberOverrides.length > 0
    ? await applyPricingWithLibraryV2(costTableItems, memberOverrides, 1.0)
    : await applyPricingV2(costTableItems, 1.0); // national average first
  
  // Validate rebar quantities
  pricedItems = validateRebarQuantities(pricedItems);

  // NOTE: AI pricing refinement step REMOVED — the expanded synonym library
  // with 8,600+ synonyms provides better coverage than the old LLM-based
  // refinement pass, and runs in <1ms instead of 30-60 seconds.
  console.log(`[PostProcess] Synonym-based pricing complete (no AI refinement needed)`);

  // Write prices back to consolidated items (convert dollars back to cents)
  for (let i = 0; i < consolidated.length; i++) {
    const priced = pricedItems[i];
    if (priced) {
      const uc = priced.unitCost ?? 0;
      const matC = priced.materialCost ?? 0;
      const labC = priced.laborCost ?? 0;
      consolidated[i].unitCost = Math.round(uc * 100); // dollars to cents
      consolidated[i].extendedCost = Math.round(priced.quantity * uc * 100); // dollars to cents
      consolidated[i].materialCost = Math.round(matC * 100); // dollars to cents
      consolidated[i].laborCost = Math.round(labC * 100); // dollars to cents
      consolidated[i].quantity = priced.quantity; // may have been adjusted by rebar validation
      if (priced.notes && priced.notes !== consolidated[i].notes) {
        consolidated[i].notes = priced.notes;
      }
    }
  }

  console.log(`[PostProcess] Cost table pricing applied to ${consolidated.length} items`);

  console.log(`[PostProcess] Step 6/6: Saving results...`);
  await updateTakeoffProject(projectId, { postProcessStep: 'saving' } as any).catch(() => {});
  // ─── Save Results ─────────────────────────────────────────────────────────────
  // Delete all existing items and replace with consolidated ones
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all items for this project
  await db.delete(takeoffItems).where(eq(takeoffItems.projectId, projectId));

  // Insert consolidated items
  if (consolidated.length > 0) {
    const itemsToInsert: InsertTakeoffItem[] = consolidated.map(item => ({
      projectId,
      // Use first source sheet ID, or 0 for generated items
      sheetId: item.sourceSheetIds[0] || (sheets[0] as any)?.id || 0,
      csiDivision: item.csiDivision,
      csiCode: item.csiCode,
      description: item.description,
      quantity: item.quantity.toFixed(2),
      unit: item.unit,
      unitCost: item.unitCost,
      extendedCost: item.extendedCost,
      materialCost: item.materialCost,
      laborCost: item.laborCost,
      confidence: item.confidence,
      notes: item.notes,
      reviewed: false,
    }));

    // Insert in batches of 50 to avoid query size limits
    for (let i = 0; i < itemsToInsert.length; i += 50) {
      const batch = itemsToInsert.slice(i, i + 50);
      await createTakeoffItemsBatch(batch);
    }
  }

  // Step 6: Recalculate costs with regional multiplier
  // After all post-processing, reapply the project's regional cost multiplier
  // Uses a single batch SQL UPDATE instead of per-item updates for speed
  if (project.costMultiplier && project.costMultiplier !== 10000) {
    const ratio = project.costMultiplier / 10000;
    console.log(`[PostProcess] Applying regional multiplier ${ratio.toFixed(2)}x via batch SQL...`);
    try {
      await db.execute(sql`
        UPDATE takeoff_items
        SET
          unit_cost = ROUND(unit_cost * ${ratio}),
          material_cost = ROUND(material_cost * ${ratio}),
          labor_cost = ROUND(labor_cost * ${ratio}),
          extended_cost = ROUND(ROUND(unit_cost * ${ratio}) * CAST(quantity AS DECIMAL(20,2)))
        WHERE project_id = ${projectId}
      `);
      console.log(`[PostProcess] Batch regional multiplier applied`);
    } catch (batchErr) {
      console.error(`[PostProcess] Batch SQL failed, falling back to per-item:`, batchErr);
      const { recalculateItemCosts } = await import('./takeoffDb');
      await recalculateItemCosts(projectId, 10000, project.costMultiplier);
    }
    await recalculateProjectTotal(projectId);
  } else {
    // No regional multiplier or default, just recalculate totals
    await recalculateProjectTotal(projectId);
  }

  const stats = {
    originalCount,
    consolidatedCount: consolidated.length,
    lumpSumsConverted,
    outOfScopeRemoved: Math.max(0, originalCount - consolidatedCount),
    formworkAdded,
    rebarEnhanced,
  };

  console.log(`[PostProcess] Pipeline complete:`, stats);
  return stats;
}
