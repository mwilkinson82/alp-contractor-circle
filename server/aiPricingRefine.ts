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

// Max items to send for AI refinement — keeps total time under 60s
const MAX_REFINE_ITEMS = 60;
// Items per LLM call — larger batches = fewer calls = faster
const BATCH_SIZE = 20;
// Max concurrent LLM calls
const MAX_CONCURRENCY = 3;

/**
 * Determine if an item needs AI pricing refinement.
 * Returns a priority score (higher = more likely to be mispriced).
 */
function refinementPriority(item: PricedItem): number {
  const matchId = item._costMatch || "";
  const matchScore = item._costMatchScore || 0;
  const desc = (item.description || "").toLowerCase();
  const unit = (item.unit || "").toUpperCase();
  
  // Already priced from contractor's library — never override
  if (matchId === "LIBRARY") return -1;
  
  let priority = 0;
  
  // DEFAULT match = no RS Means entry found — highest priority
  if (matchId === "DEFAULT") priority += 100;
  
  // Low match score = weak fuzzy match
  if (matchScore < 30) priority += 80;
  else if (matchScore < 40) priority += 50;
  else if (matchScore < 60) priority += 20;
  
  // Specific product indicators: brand names, model numbers
  const brandIndicators = [
    "pgt", "winguard", "andersen", "marvin", "pella", "milgard", "jeld-wen",
    "impact rated", "impact-rated", "hurricane rated",
    "ge profile", "whirlpool", "samsung", "bosch", "kitchenaid", "sub-zero", "wolf",
    "thermador", "viking", "miele", "frigidaire",
    "trane", "carrier", "lennox", "rheem", "goodman", "daikin", "mitsubishi",
    "kohler", "moen", "delta", "grohe", "toto", "american standard", "hansgrohe",
    "eagle roofing", "boral", "monier",
    "elevator", "luxury lift", "hoistway",
    "proflex", "durock", "hardiboard", "hardiplank", "trex",
    "energyshield", "low-e", "argon fill",
    "generator",
  ];
  
  for (const brand of brandIndicators) {
    if (desc.includes(brand)) { priority += 60; break; }
  }
  
  // Model numbers pattern
  if (/[a-z]{2,}\s*\d{3,}/i.test(item.description) || /\d{3,}\s*[a-z]{2,}/i.test(item.description)) {
    priority += 40;
  }
  
  // EA items with suspiciously low unit cost
  if (unit === "EA" && (item.unitCost || 0) < 50 && item.quantity <= 50) {
    priority += 70;
  }
  
  return priority;
}

/**
 * Ask the LLM to provide better pricing for a batch of items.
 */
async function refineBatch(batch: PricedItem[]): Promise<AiPriceResult[]> {
  const itemList = batch.map((item, i) => {
    return `${i + 1}. [Index ${item.index}] "${item.description}" — ${item.quantity} ${item.unit} — CSI ${item.csiCode || item.csiDivision || 'N/A'} — Current: Material $${(item.materialCost || 0).toFixed(2)}/${item.unit}, Labor $${(item.laborCost || 0).toFixed(2)}/${item.unit}, Total $${(item.unitCost || 0).toFixed(2)}/${item.unit}`;
  }).join("\n");

  const systemPrompt = `You are a senior construction cost estimator with 25+ years of experience. Review each line item below. The current pricing came from a generic cost database and may be inaccurate for specific products or brands.

For each item, provide your best estimate of the UNIT material cost and UNIT labor cost in US dollars.

RULES:
- Costs are PER UNIT (per SF, per EA, per LF, per CY, etc.) — NOT total cost
- Material cost = material/product cost only (no labor)
- Labor cost = installation labor only (no material)
- Use 2025 national average pricing
- For branded/specific products, use typical dealer/distributor pricing
- For generic items where the current price seems reasonable, return the same values
- For EA items: think about what the actual product costs (e.g., a sliding glass door is $2,000-5,000 EA, not $18)
- Be realistic — don't inflate or lowball

Return ONLY a JSON array with one object per item:
[{ "index": <original_index>, "materialCost": <dollars>, "laborCost": <dollars>, "confidence": "high"|"medium"|"low" }]`;

  const userPrompt = `Review and refine pricing for these ${batch.length} construction items:\n\n${itemList}\n\nReturn the JSON array.`;

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
                    confidence: { type: "string", description: "high, medium, or low" },
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
 * Run multiple batches concurrently with a concurrency limit.
 */
async function runBatchesConcurrently(
  batches: PricedItem[][],
  concurrency: number
): Promise<AiPriceResult[]> {
  const allResults: AiPriceResult[] = [];
  
  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);
    console.log(`[AiPricingRefine] Running ${chunk.length} batch(es) concurrently (${i + 1}-${Math.min(i + concurrency, batches.length)} of ${batches.length})`);
    
    const results = await Promise.all(chunk.map(batch => refineBatch(batch)));
    for (const r of results) {
      allResults.push(...r);
    }
  }
  
  return allResults;
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
  
  // Score and filter items that need refinement, sorted by priority (highest first)
  const scored = indexed
    .map(item => ({ item, priority: refinementPriority(item) }))
    .filter(s => s.priority > 0)
    .sort((a, b) => b.priority - a.priority);
  
  if (scored.length === 0) {
    console.log(`[AiPricingRefine] No items need refinement — all well-matched`);
    return items;
  }
  
  // Cap the number of items to refine to stay within timeout
  const toRefine = scored.slice(0, MAX_REFINE_ITEMS).map(s => s.item);
  
  console.log(`[AiPricingRefine] ${toRefine.length} of ${items.length} items selected for AI pricing refinement (${scored.length} flagged, capped at ${MAX_REFINE_ITEMS})`);
  
  // Batch items
  const batches: PricedItem[][] = [];
  for (let i = 0; i < toRefine.length; i += BATCH_SIZE) {
    batches.push(toRefine.slice(i, i + BATCH_SIZE));
  }
  
  // Process batches concurrently
  const allResults = await runBatchesConcurrently(batches, MAX_CONCURRENCY);
  
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
    
    // If AI total is zero or unreasonably low, skip
    const aiTotal = aiResult.materialCost + aiResult.laborCost;
    if (aiTotal <= 0) {
      skipped++;
      return item;
    }
    
    // Check if AI result is significantly different from current
    const currentTotal = (item.materialCost || 0) + (item.laborCost || 0);
    
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
