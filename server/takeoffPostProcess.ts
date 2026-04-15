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

// ─── Priority 1: Cross-Sheet Consolidation ────────────────────────────────────

/**
 * Groups items that refer to the same physical element across multiple sheets
 * and merges them, keeping the most specific (non-LS) quantity.
 */
async function consolidateItems(
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
- unitCost: unit cost in ${currencyLabel}
- confidence: confidence score 0-100
- notes: explanation of consolidation decisions
- outOfScope: boolean — true if this item should be REMOVED because it's outside the defined scope

IMPORTANT RULES:
- Never lose a genuinely unique item — only merge true duplicates
- Prefer measured quantities (SF, LF, CY, EA) over lump sums (LS)
- If ALL instances of an item are LS, keep it as LS but note it needs plan measurement
- Combine quantities when items are additive (e.g., slab area from room A + room B)
- Do NOT combine quantities when items are the same element seen from different views (keep the most accurate one)`;

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
                unitCost: { type: "number" },
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
- unitCost: number in ${currencyLabel} (appropriate for the measured unit)
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
  console.log(`[PostProcess] Found ${existingFormwork.length} existing formwork items — will deduplicate after generation`);

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
- unitCost: cost per SFCA in ${currencyLabel} (typically $4-8/SFCA for footings, $8-15/SFCA for walls)
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
        return matchRatio >= 0.5; // 50% keyword overlap = same element
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
- unitCost: cost per LF in ${currencyLabel}
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
async function calculateConcreteVolumes(
  items: ConsolidatedItem[],
  currency: string | null,
  scopeText: string | null
): Promise<ConsolidatedItem[]> {
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

  // Items already in CY
  const alreadyCY = concreteItems.filter(i => i.unit === "CY");
  // Items NOT in CY that might need volume calculation
  const needsConversion = concreteItems.filter(i => 
    i.unit !== "CY" && i.quantity > 0
  );

  const currencyLabel = currency === "GBP" ? "GBP" : currency === "AUD" ? "AUD" : "USD";

  const volumePrompt = `You are a senior construction estimator. Your job is to calculate CONCRETE VOLUME in CUBIC YARDS (CY) for each concrete item in this takeoff.

Many items have dimensions in their descriptions or notes but are measured in LF, SF, EA, or LS instead of CY. You must:

1. **Parse dimensions** from the description and notes (e.g., "2'-0" W x 1'-0" T" means 2 ft wide x 1 ft thick)
2. **Calculate volume** using the formula: Length × Width × Thickness / 27 = CY
3. **For items already in CY**, verify the calculation is reasonable
4. **For items in LF** (linear feet), you need width and depth to calculate: LF × Width(ft) × Depth(ft) / 27 = CY
5. **For items in SF** (square feet), you need thickness to calculate: SF × Thickness(ft) / 27 = CY
6. **For items in EA** (each), you need all three dimensions: L × W × D × count / 27 = CY
7. **Add 5% waste factor** to all concrete volumes

## COMMON DIMENSION PATTERNS:
- Footings: width × depth × length (e.g., WF-1: 2'-0" wide × 1'-0" thick, measured in LF)
- Slabs: area × thickness (e.g., 2,308 SF × 4" thick or 6" thick)
- Pits: length × width × depth (dimensions in description)
- Stem walls: height × thickness × length
- Grade beams: width × depth × length

## CONCRETE ITEMS TO CALCULATE:
${JSON.stringify(concreteItems.map((item, idx) => ({
  idx,
  description: item.description,
  quantity: item.quantity,
  unit: item.unit,
  unitCost: item.unitCost / 100,
  notes: item.notes,
})), null, 2)}

${scopeText ? `SCOPE: "${scopeText}"` : ""}

## OUTPUT FORMAT
Return a JSON object with:
- volumeItems: array of concrete volume calculations, one per item above. Each must have:
  - originalIdx: the idx from the input
  - description: description of the concrete element
  - volumeCY: calculated volume in cubic yards (including 5% waste). Use 0 if volume cannot be calculated.
  - calculation: show your math step by step (e.g., "320 LF × 2.0' W × 1.0' D / 27 = 23.7 CY + 5% waste = 24.9 CY")
  - psiStrength: concrete strength if mentioned (e.g., "3000 PSI", "4000 PSI") or "not specified"
  - canCalculate: boolean - true if you have enough dimensions to calculate volume

IMPORTANT: Show ALL math. Every CY value must have a calculation breakdown. If you don't have enough dimensions, set canCalculate to false and volumeCY to 0.`;

  const volumeSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "volume_result",
      strict: true,
      schema: {
        type: "object",
        properties: {
          volumeItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                originalIdx: { type: "integer" },
                description: { type: "string" },
                volumeCY: { type: "number" },
                calculation: { type: "string" },
                psiStrength: { type: "string" },
                canCalculate: { type: "boolean" },
              },
              required: ["originalIdx", "description", "volumeCY", "calculation", "psiStrength", "canCalculate"],
              additionalProperties: false,
            },
          },
        },
        required: ["volumeItems"],
        additionalProperties: false,
      },
    },
  };

  try {
    console.log(`[PostProcess] Calculating CY volumes for ${concreteItems.length} concrete items...`);

    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a senior construction estimator. Calculate concrete volumes in cubic yards from dimensions. Show all math. Return JSON." },
        { role: "user", content: volumePrompt },
      ],
      response_format: volumeSchema,
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) throw new Error("No content in volume response");
    const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);

    const parsed = JSON.parse(content) as {
      volumeItems: Array<{
        originalIdx: number;
        description: string;
        volumeCY: number;
        calculation: string;
        psiStrength: string;
        canCalculate: boolean;
      }>;
    };

    // Build a map of CY calculations
    const cyMap = new Map<number, { cy: number; calc: string; psi: string }>();
    let calculatedCount = 0;
    for (const vol of parsed.volumeItems) {
      if (vol.canCalculate && vol.volumeCY > 0) {
        cyMap.set(vol.originalIdx, {
          cy: vol.volumeCY,
          calc: vol.calculation,
          psi: vol.psiStrength,
        });
        calculatedCount++;
      }
    }

    console.log(`[PostProcess] Calculated CY for ${calculatedCount} of ${concreteItems.length} concrete items`);

    // Update items with CY volume in their notes, and add summary CY items
    const updatedItems = [...items];
    const cyItems: ConsolidatedItem[] = [];
    let totalCY = 0;

    // Group by PSI strength for concrete ordering
    const byPsi = new Map<string, { cy: number; items: string[] }>();

    for (let i = 0; i < concreteItems.length; i++) {
      const volData = cyMap.get(i);
      if (!volData) continue;

      // Find this item in the main array and append CY info to notes
      const mainIdx = updatedItems.findIndex(item => 
        item.description === concreteItems[i].description && 
        item.quantity === concreteItems[i].quantity
      );
      if (mainIdx !== -1) {
        const existingNotes = updatedItems[mainIdx].notes || "";
        updatedItems[mainIdx] = {
          ...updatedItems[mainIdx],
          notes: `${existingNotes}${existingNotes ? " | " : ""}[Volume: ${volData.cy.toFixed(2)} CY] ${volData.calc}${volData.psi !== "not specified" ? " (" + volData.psi + ")" : ""}`,
        };
      }

      totalCY += volData.cy;

      // Group by PSI
      const psiKey = volData.psi === "not specified" ? "Unspecified" : volData.psi;
      if (!byPsi.has(psiKey)) {
        byPsi.set(psiKey, { cy: 0, items: [] });
      }
      const group = byPsi.get(psiKey)!;
      group.cy += volData.cy;
      group.items.push(concreteItems[i].description);
    }

    // Log summary by PSI strength (informational only — no summary line items to avoid double-counting)
    for (const [psi, data] of Array.from(byPsi.entries())) {
      console.log(`[PostProcess] CY by PSI: ${psi} = ${data.cy.toFixed(1)} CY (${data.items.length} items)`);
    }

    console.log(`[PostProcess] CY volume: ${totalCY.toFixed(1)} CY total across ${byPsi.size} PSI groups (volumes annotated in item notes, no summary line items)`);
    return updatedItems;
  } catch (error) {
    console.error("[PostProcess] CY volume calculation failed:", error);
    return items;
  }
}

// ─── Main Post-Processing Pipeline ────────────────────────────────────────────

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

  // Step 1: Consolidate items across sheets (also handles scope enforcement)
  let consolidated = await consolidateItems(rawItems, sheetContexts, project.currency, project.scopeText);
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
  consolidated = await calculateConcreteVolumes(consolidated, project.currency, project.scopeText);
  const cyAfter = consolidated.filter(i => i.unit === "CY" && i.csiDivision === "03").length;
  const cyItemsAdded = cyAfter - cyBefore;
  console.log(`[PostProcess] CY calculation: ${cyItemsAdded} summary CY items added`);

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
