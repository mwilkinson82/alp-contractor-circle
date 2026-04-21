/**
 * AI Pricing Refinement Pass
 * 
 * After RS Means + cost library pricing, this module identifies items that likely
 * have inaccurate pricing (low match scores, specific brand/model products, or
 * unit cost outliers) and asks the LLM to provide better estimates.
 * 
 * The AI sees each item's description, quantity, unit, and current price — and
 * either confirms it or provides a corrected material + labor cost.
 * 
 * Priority chain (silent — no source labels shown to user):
 *   1. Contractor's own cost library (highest priority — never overridden)
 *   2. AI-refined pricing for specific/branded products
 *   3. RS Means generic rates (foundation/fallback)
 */

import { invokeLLM } from "./_core/llm";

export interface PricedItem {
  index?: number;
  description: string;
  csiCode?: string;
  csiDivision?: string;
  quantity: number;
  unit: string;
  materialCost?: number;  // current material cost in dollars
  laborCost?: number;     // current labor cost in dollars
  unitCost?: number;      // current combined unit cost in dollars
  _costMatch?: string;
  _costMatchScore?: number;
  [key: string]: any;
}

interface AiPriceResult {
  index: number;
  materialCost: number;
  laborCost: number;
  confidence: string; // "high" | "medium" | "low"
}

/**
 * Determine if an item needs AI pricing refinement.
 * 
 * Criteria:
 * - Low RS Means match score (< 40) — fuzzy match was weak
 * - DEFAULT match (no RS Means entry found at all)
 * - Item description contains brand names or specific model numbers
 * - Unit cost seems unreasonably low for the item type (e.g., $18 for an impact window)
 * - EA items with very low unit cost (likely matched to a per-SF entry)
 */
function needsRefinement(item: PricedItem): boolean {
  const matchId = item._costMatch || "";
  const matchScore = item._costMatchScore || 0;
  const desc = (item.description || "").toLowerCase();
  const unit = (item.unit || "").toUpperCase();
  
  // Already priced from contractor's library — never override
  if (matchId === "LIBRARY") return false;
  
  // DEFAULT match = no RS Means entry found
  if (matchId === "DEFAULT") return true;
  
  // Low match score = weak fuzzy match
  if (matchScore < 40) return true;
  
  // Specific product indicators: brand names, model numbers, specific specs
  const brandIndicators = [
    // Windows/Doors
    "pgt", "winguard", "andersen", "marvin", "pella", "milgard", "jeld-wen",
    "impact rated", "impact-rated", "hurricane rated",
    // Appliances
    "ge profile", "whirlpool", "samsung", "lg ", "bosch", "kitchenaid", "sub-zero", "wolf",
    "thermador", "viking", "miele", "frigidaire",
    // HVAC
    "trane", "carrier", "lennox", "rheem", "goodman", "daikin", "mitsubishi",
    // Plumbing fixtures
    "kohler", "moen", "delta", "grohe", "toto", "american standard", "hansgrohe",
    // Roofing
    "eagle roofing", "boral", "monier",
    // Elevators
    "elevator", "luxury lift", "hoistway",
    // Specific products
    "proflex", "durock", "hardiboard", "hardiplank", "trex",
    "energyshield", "low-e", "argon fill",
    // Electrical panels/specific
    "panel", "breaker", "generator",
  ];
  
  for (const brand of brandIndicators) {
    if (desc.includes(brand)) return true;
  }
  
  // Model numbers pattern (alphanumeric sequences like "SGD 9000", "XR15")
  if (/[a-z]{2,}\s*\d{3,}/i.test(item.description) || /\d{3,}\s*[a-z]{2,}/i.test(item.description)) {
    return true;
  }
  
  // EA items with suspiciously low unit cost (< $50 for an "each" item)
  // Many EA items are fixtures, equipment, doors, windows — rarely under $50 installed
  if (unit === "EA" && (item.unitCost || 0) < 50 && item.quantity <= 50) {
    return true;
  }
  
  return false;
}

/**
 * Batch items into groups for AI pricing (max ~15 items per LLM call to keep
 * response quality high and avoid token limits).
 */
function batchItems(items: PricedItem[], batchSize: number = 15): PricedItem[][] {
  const batches: PricedItem[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Ask the LLM to provide better pricing for a batch of items.
 */
async function refineBatch(batch: PricedItem[]): Promise<AiPriceResult[]> {
  const itemList = batch.map((item, i) => {
    return `${i + 1}. [Index ${item.index}] "${item.description}" — ${item.quantity} ${item.unit} — CSI ${item.csiCode || item.csiDivision || 'N/A'} — Current: Material $${(item.materialCost || 0).toFixed(2)}/${item.unit}, Labor $${(item.laborCost || 0).toFixed(2)}/${item.unit}, Total $${(item.unitCost || 0).toFixed(2)}/${item.unit}`;
  }).join("\n");

  const systemPrompt = `You are a senior construction cost estimator with 25+ years of experience in residential, commercial, and public works projects. You have deep knowledge of RS Means, current material pricing, labor rates, and installed costs across all CSI divisions.

Your task: Review each construction line item below. The current pricing came from a generic cost database and may be inaccurate for specific products, brands, or specialized items. For each item, provide your best estimate of the UNIT material cost and UNIT labor cost in US dollars.

CRITICAL RULES:
- Costs are PER UNIT (per SF, per EA, per LF, per CY, etc.) — NOT total cost
- Material cost = material/product cost only (no labor)
- Labor cost = installation labor only (no material)
- Use 2025 national average pricing
- For branded/specific products, use typical dealer/distributor pricing
- For generic items where the current price seems reasonable, confirm it (return the same values)
- For EA items: think about what the actual product costs installed (e.g., a sliding glass door EA is $2,000-5,000, not $18)
- For SF/LF items: these are per square foot or linear foot rates
- Be realistic — don't inflate prices, but don't lowball specific products either

Return ONLY a JSON array with one object per item:
[
  { "index": <original_index>, "materialCost": <dollars>, "laborCost": <dollars>, "confidence": "high"|"medium"|"low" },
  ...
]`;

  const userPrompt = `Review and refine pricing for these ${batch.length} construction items:\n\n${itemList}\n\nReturn the JSON array with your best material and labor cost estimates per unit.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "pricing_refinement",
          strict: true,
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "integer", description: "Original item index" },
                    materialCost: { type: "number", description: "Material unit cost in dollars" },
                    laborCost: { type: "number", description: "Labor unit cost in dollars" },
                    confidence: { type: "string", description: "Confidence level: high, medium, or low" },
                  },
                  required: ["index", "materialCost", "laborCost", "confidence"],
                  additionalProperties: false,
                },
              },
            },
            required: ["items"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') return [];
    
    const parsed = JSON.parse(content);
    return parsed.items || [];
  } catch (err) {
    console.error(`[AiPricingRefine] Batch failed:`, err);
    return [];
  }
}

/**
 * Main entry point: Refine pricing for items that need it.
 * 
 * Takes the full list of priced items (after RS Means + cost library),
 * identifies which ones need refinement, batches them to the LLM,
 * and returns the updated items with better pricing where available.
 * 
 * Items priced from the contractor's cost library are NEVER modified.
 */
export async function refineWithAiPricing(
  items: PricedItem[],
  regionalMultiplier: number = 1.0
): Promise<PricedItem[]> {
  // Tag each item with its index for tracking
  const indexed = items.map((item, i) => ({ ...item, index: i }));
  
  // Filter items that need refinement
  const needsRefine = indexed.filter(needsRefinement);
  
  if (needsRefine.length === 0) {
    console.log(`[AiPricingRefine] No items need refinement — all well-matched`);
    return items;
  }
  
  console.log(`[AiPricingRefine] ${needsRefine.length} of ${items.length} items flagged for AI pricing refinement`);
  
  // Batch and process
  const batches = batchItems(needsRefine, 15);
  const allResults: AiPriceResult[] = [];
  
  for (let b = 0; b < batches.length; b++) {
    console.log(`[AiPricingRefine] Processing batch ${b + 1}/${batches.length} (${batches[b].length} items)`);
    const results = await refineBatch(batches[b]);
    allResults.push(...results);
    
    // Small delay between batches to avoid rate limiting
    if (b < batches.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // Apply refined prices back to items
  const resultMap = new Map<number, AiPriceResult>();
  for (const r of allResults) {
    resultMap.set(r.index, r);
  }
  
  let refined = 0;
  let confirmed = 0;
  let skipped = 0;
  
  const output = items.map((item, i) => {
    const aiResult = resultMap.get(i);
    if (!aiResult) return item; // Not in refinement set
    
    // Sanity checks on AI response
    if (aiResult.materialCost < 0 || aiResult.laborCost < 0) {
      skipped++;
      return item;
    }
    
    // Check if AI result is significantly different from current
    const currentTotal = (item.materialCost || 0) + (item.laborCost || 0);
    const aiTotal = aiResult.materialCost + aiResult.laborCost;
    
    // If AI confirms current pricing (within 30%), keep current
    if (currentTotal > 0 && Math.abs(aiTotal - currentTotal) / currentTotal < 0.3) {
      confirmed++;
      return item;
    }
    
    // Apply AI pricing with regional multiplier
    const matCost = Math.round(aiResult.materialCost * regionalMultiplier * 100) / 100;
    const labCost = Math.round(aiResult.laborCost * regionalMultiplier * 100) / 100;
    const combinedUC = Math.round((matCost + labCost) * 100) / 100;
    
    refined++;
    return {
      ...item,
      materialCost: matCost,
      laborCost: labCost,
      unitCost: combinedUC,
      extendedCost: Math.round(combinedUC * item.quantity * 100) / 100,
    };
  });
  
  console.log(`[AiPricingRefine] Results: ${refined} refined, ${confirmed} confirmed, ${skipped} skipped`);
  
  return output;
}
