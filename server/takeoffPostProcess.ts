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
import { invokeLLM, type Message } from "./_core/llm";
import { applyPricing, validateRebarQuantities, type TakeoffItem as CostTakeoffItem } from "./costLookup.js";
import {
  getTakeoffItemsByProject,
  getTakeoffProject,
  getDrawingSheetsByProject,
  createTakeoffItemsBatch,
  recalculateProjectTotal,
} from "./takeoffDb";
import { getDb } from "./db";
import { takeoffItems } from "../drizzle/schema";
import { eq } from "drizzle-orm";
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
  unitCost: number; // cents
  extendedCost: number; // cents
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

// ─── Priority 1: Cross-Sheet Consolidation ────────────────────────────────────

/**
 * Groups items that refer to the same physical element across multiple sheets
 * and merges them, keeping the most specific (non-LS) quantity.
 * Now processes items in batches by CSI division for better LLM accuracy.
 */
async function consolidateItems(
  items: RawItem[],
  sheets: SheetContext[],
  currency: string | null,
  scopeText: string | null
): Promise<ConsolidatedItem[]> {
  if (items.length === 0) return [];

  // ─── Step 0: Programmatic pre-dedup ───────────────────────────────────────
  const deduped = programmaticDedup(items);
  console.log(`[PostProcess] Pre-dedup: ${items.length} → ${deduped.length} items`);

  // ─── Step 0.5: Batch by CSI division for better LLM accuracy ──────────────
  // Group items by 2-digit CSI division
  const divisionGroups = new Map<string, RawItem[]>();
  for (const item of deduped) {
    const div = (item.csiDivision || item.csiCode?.substring(0, 2) || "99").trim();
    if (!divisionGroups.has(div)) divisionGroups.set(div, []);
    divisionGroups.get(div)!.push(item);
  }

  console.log(`[PostProcess] Batching consolidation by ${divisionGroups.size} CSI divisions: ${Array.from(divisionGroups.keys()).join(", ")}`);

  // Process each division batch separately
  const allResults: ConsolidatedItem[] = [];
  const divEntries = Array.from(divisionGroups.entries());
  for (const [div, divItems] of divEntries) {
    console.log(`[PostProcess] Consolidating CSI ${div}: ${divItems.length} items...`);
    const batchResult = await consolidateBatch(divItems, sheets, currency, scopeText);
    allResults.push(...batchResult);
    console.log(`[PostProcess] CSI ${div}: ${divItems.length} → ${batchResult.length} items`);
  }

  console.log(`[PostProcess] Total after batched consolidation: ${deduped.length} → ${allResults.length} items`);
  return allResults;
}

/**
 * Consolidate a single batch of items (typically one CSI division).
 */
async function consolidateBatch(
  items: RawItem[],
  sheets: SheetContext[],
  currency: string | null,
  scopeText: string | null
): Promise<ConsolidatedItem[]> {
  if (items.length === 0) return [];

  // Build a summary of all items for the LLM
  const itemSummaries = items.map((item, idx) => {
    const sheet = sheets.find(s => s.id === item.sheetId);
    return {
      idx,
      id: item.id,
      sheetId: item.sheetId,
      sheetName: sheet?.sheetName || `Sheet ${item.sheetId}`,
      sheetType: sheet?.sheetType || "unknown",
      csiDivision: item.csiDivision || "",
      csiCode: item.csiCode || "",
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      unitCost: item.unitCost / 100, // convert cents to dollars for LLM
      confidence: item.confidence,
      notes: item.notes || "",
    };
  });

  const currencyLabel = currency === "GBP" ? "GBP" : currency === "AUD" ? "AUD" : "USD";

  const consolidationPrompt = `You are a senior construction estimator performing a post-processing consolidation on a quantity takeoff.

The takeoff was extracted from ${sheets.length} drawing sheets independently. As a result, the SAME physical element may appear multiple times — once from each sheet that shows it. Your job is to:

1. **IDENTIFY DUPLICATES**: Find items that refer to the same physical building element (e.g., "Concrete Slab-on-Grade" appearing from multiple sheets)
2. **MERGE DUPLICATES**: Combine them into ONE consolidated item, keeping:
   - The MOST SPECIFIC quantity (measured > counted > lump sum)
   - The BEST description (most detailed)
   - The HIGHEST confidence score
   - Combined notes explaining the consolidation
3. **KEEP UNIQUE ITEMS**: Items that are genuinely different (e.g., "Footing Type A" vs "Footing Type B") should remain separate
4. **CONVERT LUMP SUMS**: Where possible, if one instance has a measured quantity and another has LS, use the measured quantity
5. **FLAG REMAINING LUMP SUMS**: For items that are still LS after consolidation, note in the description that plan measurement is needed

${scopeText ? `## SCOPE FILTER — CRITICAL (CSI-Division-Aware)
The scope of work is: "${scopeText}"

Use these CSI division rules:
- CSI 03: Concrete (usually IN scope)
- CSI 04: Masonry (exclude if foundation/none-of-vertical/concrete-only)
- CSI 05: Metals (exclude if foundation/none-of-vertical/concrete-only)
- CSI 06: Wood (exclude if foundation/none-of-vertical/concrete-only)
- CSI 08: Openings/Doors/Windows (exclude if foundation/none-of-vertical)
- CSI 09: Finishes (exclude if foundation/concrete-only)
- CSI 23: HVAC (exclude if foundation/concrete-only)
- CSI 26: Electrical (exclude if foundation/concrete-only)
- CSI 27: Communications (exclude if foundation/concrete-only)
- CSI 28: Electronic Safety (exclude if foundation/concrete-only)
- CSI 31: Earthwork (usually IN scope for foundation)
- CSI 32: Exterior Improvements (usually IN scope)

Keyword exclusions (regardless of CSI):
- If scope says "foundation up" or "none of vertical": exclude wall, column, roof, door, window, frame, finish, paint, flooring, hvac, electrical, plumbing
- If scope says "concrete only": exclude everything except concrete items
- If scope says "structural only": exclude finishes, hvac, electrical, communications, safety systems

Example: If scope says "foundation through SOG only, none of the vertical":
- REMOVE: CMU grout (masonry), finishes, paint, doors, windows, HVAC, electrical
- KEEP: Concrete footings, slabs, excavation, backfill` : ""}

## ITEMS TO CONSOLIDATE (${items.length} items from ${sheets.length} sheets):
${JSON.stringify(itemSummaries, null, 2)}

## OUTPUT FORMAT
Return a JSON array of consolidated items. Each item must have:
- groupedItemIndices: array of original item indices (idx field) that were merged into this item
- csiDivision: 2-digit code
- csiCode: full 6-digit code
- description: consolidated description (be specific about dimensions, locations)
- quantity: best available quantity
- unit: unit of measure
- unitCost: set to 1 for all items (pricing applied from cost database after consolidation)
- confidence: confidence score 0-100
- notes: explanation of consolidation decisions
- outOfScope: boolean — true if this item should be REMOVED because it's outside the defined scope

IMPORTANT RULES:
- AGGRESSIVELY merge duplicates — the input has already been pre-filtered, so most items in this batch refer to the same physical elements seen from different drawing sheets
- Prefer measured quantities (SF, LF, CY, EA) over lump sums (LS)
- If ALL instances of an item are LS, keep it as LS but note it needs plan measurement
- Do NOT sum quantities from different sheets for the same element — keep the LARGEST measured quantity (the plan view is most accurate)
- TARGET: A typical foundation takeoff should have 30-60 consolidated items, NOT 100+. If you're outputting more than 80 items, you're not merging aggressively enough.

## MERGE AGGRESSIVELY — THESE ARE THE SAME ITEM:
- "Excavation for Trench Pit" and "Earthwork Excavation for Trench Pit" → MERGE (keep max qty)
- "Concrete Footing for Bollard" and "Concrete Bollard Foundation" → MERGE
- "Concrete Gate Post Foundation" and "Concrete for Gate Post Foundations" → MERGE
- "Concrete Trench Pit" and "Concrete Carwash Trench Pit" → MERGE
- "Excavation for Bollard Footings" appearing 3x with different quantities → MERGE (keep max qty)
- Items with the same element name but different dimension callouts → MERGE (keep the most detailed description)
- "Compacted Base Course below X" and "Compacted Base Course below Y" for adjacent areas → MERGE into one base course item with combined area

## CRITICAL DEDUPLICATION RULES:

### CONTINUOUS FOOTINGS (WF-1, WF-2, WF-3, etc.):
- The SAME footing appears on multiple sheets (foundation plan, details, sections)
- Do NOT add footing lengths from different sheets — the plan view has the most accurate total LF
- If WF-1 appears as 175 LF on one sheet and 320 LF on another, keep the value from the FOUNDATION PLAN (the plan view measurement is most accurate)
- Footing detail sheets show cross-sections, NOT additional length

### SLABS (Slab-on-Grade, Concrete Slab):
- NEVER drop or merge slab items unless they are truly the same slab area
- 4" slabs and 6" slabs are DIFFERENT items — do not merge them
- Slab areas from the PLAN VIEW are the most accurate measurements
- If a slab appears on multiple sheets, keep the plan view quantity
- CRITICAL: If no slab items exist in the input but the drawings show slabs, this is an extraction gap — do NOT create new items, but note it

### CONSTRUCTION JOINTS:
- Construction joints are measured in LINEAR FEET (LF), not EA
- If an item says "construction joints" with a quantity in EA, check if the notes have LF measurements
- Typical construction joint spacing is every 15-20 feet in slabs

### BOLLARDS vs POLE FOUNDATIONS:
- Bollard footings and gate post footings are SEPARATE items from the bollards/posts themselves
- Do NOT merge "Concrete Filled Pipe Bollard" (2 EA) with "Bollard Footing" (2 EA) — they are different scope items
- Count bollards and gate posts EXACTLY as shown on the plan (typically 2 bollards, 4 gate posts for a car wash)`;

  const responseSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "consolidation_result",
      strict: true,
      schema: {
        type: "object",
        properties: {
          consolidatedItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                groupedItemIndices: {
                  type: "array",
                  items: { type: "integer" },
                  description: "Original item indices merged into this consolidated item",
                },
                csiDivision: { type: "string" },
                csiCode: { type: "string" },
                description: { type: "string" },
                quantity: { type: "number" },
                unit: { type: "string" },
                unitCost: { type: "number", description: "Set to 1 for all items" },
                confidence: { type: "integer" },
                notes: { type: "string" },
                outOfScope: { type: "boolean" },
              },
              required: [
                "groupedItemIndices", "csiDivision", "csiCode", "description",
                "quantity", "unit", "unitCost", "confidence", "notes", "outOfScope",
              ],
              additionalProperties: false,
            },
          },
        },
        required: ["consolidatedItems"],
        additionalProperties: false,
      },
    },
  };

  try {
    console.log(`[PostProcess] Consolidating ${items.length} items from ${sheets.length} sheets...`);
    
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a senior construction estimator. Consolidate duplicate takeoff items and enforce scope compliance. Return JSON." },
        { role: "user", content: consolidationPrompt },
      ],
      response_format: responseSchema,
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) throw new Error("No content in consolidation response");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content) as {
      consolidatedItems: Array<{
        groupedItemIndices: number[];
        csiDivision: string;
        csiCode: string;
        description: string;
        quantity: number;
        unit: string;
        unitCost: number;
        confidence: number;
        notes: string;
        outOfScope: boolean;
      }>;
    };

    // Convert to ConsolidatedItem format
    const result: ConsolidatedItem[] = [];
    for (const ci of parsed.consolidatedItems) {
      // Skip out-of-scope items (Priority 3: Scope Enforcement)
      if (ci.outOfScope) {
        console.log(`[PostProcess] Removing out-of-scope item: ${ci.description}`);
        continue;
      }

      const sourceItemIds = ci.groupedItemIndices
        .map(idx => itemSummaries[idx]?.id)
        .filter((id): id is number => id !== undefined);
      const sheetIdSet = new Set(
        ci.groupedItemIndices
          .map(idx => itemSummaries[idx]?.sheetId)
          .filter((id): id is number => id !== undefined)
      );
      const sourceSheetIds = Array.from(sheetIdSet);

      result.push({
        csiDivision: ci.csiDivision.trim(),
        csiCode: ci.csiCode.trim(),
        description: ci.description,
        quantity: ci.quantity,
        unit: ci.unit.toUpperCase().trim(),
        unitCost: Math.round(ci.unitCost * 100), // back to cents
        extendedCost: Math.round(ci.quantity * ci.unitCost * 100),
        confidence: Math.min(100, Math.max(0, ci.confidence)),
        notes: ci.notes,
        sourceSheetIds,
        sourceItemIds,
        wasConsolidated: ci.groupedItemIndices.length > 1,
        wasEnhanced: false,
        isGenerated: false,
      });
    }

    console.log(`[PostProcess] Consolidated ${items.length} items → ${result.length} items (${items.length - result.length} removed/merged)`);
    return result;
  } catch (error) {
    console.error("[PostProcess] Consolidation failed, returning original items:", error);
    // Fallback: return items as-is
    return items.map(item => ({
      csiDivision: item.csiDivision || "",
      csiCode: item.csiCode || "",
      description: item.description,
      quantity: parseFloat(item.quantity),
      unit: item.unit,
      unitCost: item.unitCost,
      extendedCost: item.extendedCost,
      confidence: item.confidence,
      notes: item.notes || "",
      sourceSheetIds: [item.sheetId],
      sourceItemIds: [item.id],
      wasConsolidated: false,
      wasEnhanced: false,
      isGenerated: false,
    }));
  }
}

// ─── Priority 2: Plan-View Enhancement ────────────────────────────────────────

/**
 * Takes consolidated items that are still lump-sum and attempts to convert them
 * to measured quantities using plan-view context from the drawing sheets.
 */
async function enhanceLumpSums(
  items: ConsolidatedItem[],
  sheets: SheetContext[],
  currency: string | null,
  scopeText: string | null
): Promise<ConsolidatedItem[]> {
  // Find plan-view sheets that can provide dimensions
  const planSheets = sheets.filter(s =>
    s.sheetType && ["floor_plan", "structural", "site_plan"].includes(s.sheetType) && s.imageUrl
  );

  if (planSheets.length === 0) {
    console.log("[PostProcess] No plan-view sheets found, skipping lump-sum enhancement");
    return items;
  }

  // Find items that are still lump sums
  const lumpSumItems = items.filter(item => item.unit === "LS");
  if (lumpSumItems.length === 0) {
    console.log("[PostProcess] No lump-sum items to enhance");
    return items;
  }

  console.log(`[PostProcess] Attempting to enhance ${lumpSumItems.length} lump-sum items using ${planSheets.length} plan sheets...`);

  const currencyLabel = currency === "GBP" ? "GBP" : currency === "AUD" ? "AUD" : "USD";

  // Send plan images with lump-sum items to get measured quantities
  // Process up to 3 plan sheets (most relevant ones)
  const relevantPlans = planSheets.slice(0, 3);
  
  const imageContent = relevantPlans.map(sheet => ({
    type: "image_url" as const,
    image_url: { url: sheet.imageUrl!, detail: "high" as const },
  }));

  const lumpSumDescriptions = lumpSumItems.map((item, idx) => ({
    idx,
    description: item.description,
    csiCode: item.csiCode,
    currentCost: item.extendedCost / 100,
    notes: item.notes,
  }));

  const enhancementPrompt = `You are a senior construction estimator. I have ${lumpSumItems.length} line items from a quantity takeoff that are currently marked as "Lump Sum" (LS) because the AI couldn't measure them from the individual sheet it was looking at.

I'm now showing you the PLAN VIEW drawings for this project. Your job is to:
1. Look at each lump-sum item below
2. Find the corresponding element on the plan drawings
3. MEASURE the actual quantity (area in SF, length in LF, volume in CY, count in EA)
4. Return the measured quantity with the correct unit

${scopeText ? `SCOPE: "${scopeText}"` : ""}

## LUMP-SUM ITEMS TO ENHANCE:
${JSON.stringify(lumpSumDescriptions, null, 2)}

## PLAN SHEETS PROVIDED:
${relevantPlans.map(s => `- ${s.sheetName || 'Unknown'} (${s.sheetType})`).join('\n')}

## MEASUREMENT INSTRUCTIONS:
- For SLABS: measure the plan area in SF. Look for overall building dimensions, room dimensions, or area callouts. Calculate: length × width = SF. Then convert to CY: SF × thickness(ft) / 27
- For FOOTINGS: trace the footing lines on the plan. Measure total linear feet. Look for footing schedules that show width and depth.
- For WALLS: measure wall lengths from plan. Multiply by height (from sections/elevations) for SF.
- For PITS: measure plan dimensions (length × width). Multiply by depth for volume.
- For FOUNDATIONS: count the number of foundations on plan, measure typical dimensions.

## OUTPUT FORMAT
Return a JSON array. For each lump-sum item, return:
- originalIdx: the idx from the input
- canMeasure: boolean — true if you can determine a measured quantity from the plans
- measuredQuantity: number (0 if canMeasure is false)
- measuredUnit: string (the correct unit: SF, LF, CY, EA, etc.)
- unitCost: set to 1 (pricing applied from cost database)
- confidence: 0-100
- measurementNotes: how you measured it (reference specific plan dimensions)

If you CANNOT measure an item from the available plans, set canMeasure to false.`;

  const enhancementSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "enhancement_result",
      strict: true,
      schema: {
        type: "object",
        properties: {
          enhancedItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                originalIdx: { type: "integer" },
                canMeasure: { type: "boolean" },
                measuredQuantity: { type: "number" },
                measuredUnit: { type: "string" },
                unitCost: { type: "number" },
                confidence: { type: "integer" },
                measurementNotes: { type: "string" },
              },
              required: ["originalIdx", "canMeasure", "measuredQuantity", "measuredUnit", "unitCost", "confidence", "measurementNotes"],
              additionalProperties: false,
            },
          },
        },
        required: ["enhancedItems"],
        additionalProperties: false,
      },
    },
  };

  try {
    const enhanceMessages: Message[] = [
      {
        role: "system",
        content: "You are a senior construction estimator. Measure quantities from plan drawings to replace lump-sum estimates. Return JSON.",
      },
      {
        role: "user",
        content: [
          { type: "text", text: enhancementPrompt },
          ...imageContent,
        ],
      },
    ];

    const response = await invokeLLM({
      messages: enhanceMessages,
      response_format: enhancementSchema,
    });

    const rawContent2 = response.choices[0]?.message?.content;
    if (!rawContent2) throw new Error("No content in enhancement response");
    const content = typeof rawContent2 === "string" ? rawContent2 : JSON.stringify(rawContent2);

    const parsed = JSON.parse(content) as {
      enhancedItems: Array<{
        originalIdx: number;
        canMeasure: boolean;
        measuredQuantity: number;
        measuredUnit: string;
        unitCost: number;
        confidence: number;
        measurementNotes: string;
      }>;
    };

    // Apply enhancements
    let enhancedCount = 0;
    for (const enhancement of parsed.enhancedItems) {
      if (!enhancement.canMeasure) continue;
      
      const lsItem = lumpSumItems[enhancement.originalIdx];
      if (!lsItem) continue;

      // Find this item in the main items array and update it
      const mainIdx = items.indexOf(lsItem);
      if (mainIdx === -1) continue;

      items[mainIdx] = {
        ...items[mainIdx],
        quantity: enhancement.measuredQuantity,
        unit: enhancement.measuredUnit.toUpperCase().trim(),
        unitCost: Math.round(enhancement.unitCost * 100),
        extendedCost: Math.round(enhancement.measuredQuantity * enhancement.unitCost * 100),
        confidence: enhancement.confidence,
        notes: `[Enhanced from plan] ${enhancement.measurementNotes}. Original: 1 LS @ ${(lsItem.extendedCost / 100).toFixed(2)}`,
        wasEnhanced: true,
      };
      enhancedCount++;
    }

    console.log(`[PostProcess] Enhanced ${enhancedCount} of ${lumpSumItems.length} lump-sum items with measured quantities`);
    return items;
  } catch (error) {
    console.error("[PostProcess] Lump-sum enhancement failed:", error);
    return items;
  }
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
  const existingFormwork = items.filter(item =>
    item.description.toLowerCase().includes("formwork") ||
    item.description.toLowerCase().includes("form ") ||
    item.csiCode?.startsWith("03 11")
  );
  const existingFormworkDescs = existingFormwork.map(f => f.description.toLowerCase());
  console.log(`[PostProcess] Found ${existingFormwork.length} existing formwork items, ${concreteItems.length} concrete items needing formwork`);

  // If extracted formwork already covers most concrete items, skip generation entirely
  // This prevents the LLM from generating duplicate formwork that inflates item count
  if (existingFormwork.length >= concreteItems.length * 0.6) {
    console.log(`[PostProcess] Extracted formwork (${existingFormwork.length}) already covers ≥60% of concrete items (${concreteItems.length}) — skipping formwork generation`);
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

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a senior construction estimator. Calculate formwork quantities for concrete members. Return JSON." },
        { role: "user", content: formworkPrompt },
      ],
      response_format: formworkSchema,
    });

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

    const response = await invokeLLM({
      messages: rebarMessages,
      response_format: rebarSchema,
    });

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
function hardScopeFilter(items: RawItem[], scopeText: string | null): RawItem[] {
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
  let consolidated = await consolidateItems(filteredItems, sheetContexts, project.currency, project.scopeText);
  const consolidatedCount = consolidated.length;
  const outOfScopeRemoved = originalCount - consolidatedCount; // approximate

  // Step 2: Enhance lump sums with plan-view measurements
  const lsBeforeEnhance = consolidated.filter(i => i.unit === "LS").length;
  consolidated = await enhanceLumpSums(consolidated, sheetContexts, project.currency, project.scopeText);
  const lsAfterEnhance = consolidated.filter(i => i.unit === "LS").length;
  const lumpSumsConverted = lsBeforeEnhance - lsAfterEnhance;

  // Step 3: Generate formwork items
  const beforeFormwork = consolidated.length;
  consolidated = await generateFormwork(consolidated, project.currency, project.scopeText);
  const formworkAdded = consolidated.length - beforeFormwork;

  // Step 4: Enhance rebar quantities
  const rebarBefore = consolidated.filter(i =>
    i.csiCode?.startsWith("03 20") || i.description.toLowerCase().includes("rebar")
  ).length;
  consolidated = await enhanceRebar(consolidated, sheetContexts, project.currency);
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

  // Apply cost table (returns items with dollar-denominated costs)
  let pricedItems = applyPricing(costTableItems, 1.0); // national average first
  
  // Validate rebar quantities
  pricedItems = validateRebarQuantities(pricedItems);

  // Write prices back to consolidated items (convert dollars back to cents)
  for (let i = 0; i < consolidated.length; i++) {
    const priced = pricedItems[i];
    if (priced) {
      const uc = priced.unitCost ?? 0;
      consolidated[i].unitCost = Math.round(uc * 100); // dollars to cents
      consolidated[i].extendedCost = Math.round(priced.quantity * uc * 100); // dollars to cents
      consolidated[i].quantity = priced.quantity; // may have been adjusted by rebar validation
      if (priced.notes && priced.notes !== consolidated[i].notes) {
        consolidated[i].notes = priced.notes;
      }
    }
  }

  console.log(`[PostProcess] Cost table pricing applied to ${consolidated.length} items`);

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
  // This ensures all newly consolidated/enhanced items have correct regional pricing
  if (project.costMultiplier && project.costMultiplier !== 10000) {
    console.log(`[PostProcess] Recalculating costs with regional multiplier ${(project.costMultiplier / 10000).toFixed(2)}x...`);
    const { recalculateItemCosts } = await import('./takeoffDb');
    await recalculateItemCosts(projectId, 10000, project.costMultiplier);
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
