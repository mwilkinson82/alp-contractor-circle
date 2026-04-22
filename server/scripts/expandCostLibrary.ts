/**
 * Cost Library Expansion Tool
 * 
 * ONE-TIME OFFLINE SCRIPT — run via: npx tsx server/scripts/expandCostLibrary.ts
 * 
 * For each CSI division, sends existing cost table entries to the LLM and asks:
 * 1. For each existing item, generate all synonyms/aliases an LLM would use when reading drawings
 * 2. What items are MISSING for residential ($100K-$10M), commercial ($500K-$100M), 
 *    renovation, and industrial projects?
 * 3. For each new item, provide synonyms + RS Means-level material cost estimate
 * 
 * Stores everything in the expanded_cost_library and expanded_labor_library tables.
 * The live pipeline then matches against synonyms instead of keywords.
 */

import { config } from "dotenv";
config();

import { COST_TABLE, type CostTableEntry } from "../../shared/costTable.js";
import { LABOR_TABLE, type LaborTableEntry } from "../../shared/laborTable.js";
import { invokeLLM } from "../_core/llm.js";
import { createConnection } from "mysql2/promise";

// ─── Configuration ──────────────────────────────────────────────────────────────

const BATCH_DELAY_MS = 2000; // Delay between LLM calls to avoid rate limiting

// CSI divisions to process
const CSI_DIVISIONS = [
  { code: "01", name: "General Requirements" },
  { code: "02", name: "Existing Conditions / Demolition" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood, Plastics & Composites" },
  { code: "07", name: "Thermal & Moisture Protection" },
  { code: "08", name: "Openings (Doors & Windows)" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "14", name: "Conveying Equipment" },
  { code: "21", name: "Fire Suppression" },
  { code: "22", name: "Plumbing" },
  { code: "23", name: "HVAC" },
  { code: "26", name: "Electrical" },
  { code: "27", name: "Communications" },
  { code: "28", name: "Electronic Safety & Security" },
  { code: "31", name: "Earthwork" },
  { code: "32", name: "Exterior Improvements" },
  { code: "33", name: "Utilities" },
];

// ─── LLM Prompt for Synonym Generation + Gap Fill ───────────────────────────────

function buildExpansionPrompt(
  divCode: string,
  divName: string,
  existingItems: { id: string; description: string; unit: string; materialCost: number; keywords: string[] }[]
): string {
  const itemList = existingItems
    .map((e, i) => `  ${i + 1}. [${e.id}] "${e.description}" — ${e.unit} @ $${e.materialCost} (keywords: ${e.keywords.join(", ")})`)
    .join("\n");

  return `You are a senior construction estimator with 20+ years of experience using RS Means data.

I have a cost reference library for CSI Division ${divCode} — ${divName}. Below are the EXISTING entries:

${itemList || "  (No existing entries)"}

## TASK 1: SYNONYMS FOR EXISTING ITEMS
For EACH existing item above, provide ALL synonyms and aliases that a vision AI model would use when reading construction drawings. Think about:
- How architects label it on drawings (abbreviations, shorthand)
- How contractors describe it in bids
- Regional terminology variations
- Common misspellings or alternate phrasings
- Technical vs. colloquial names
- Manufacturer-specific terms (e.g., "HardiPlank" for fiber cement siding)

## TASK 2: MISSING ITEMS
What construction items are MISSING from this division that commonly appear in:
- Residential projects ($100K – $10M)
- Commercial projects ($500K – $100M)
- Renovation/remodel projects
- Industrial/warehouse projects

For each missing item, provide:
- A clear description
- The correct unit (SF, LF, CY, EA, SQ, etc.)
- A realistic 2025 RS Means MATERIAL-ONLY cost per unit (national average)
- The full 6-digit CSI code
- A category name
- All synonyms/aliases (same criteria as Task 1)

## OUTPUT FORMAT (strict JSON):
{
  "existingSynonyms": [
    {
      "id": "slab-4in",
      "synonyms": ["4 inch concrete slab", "4in slab on grade", "4\" SOG", "concrete slab 4\"", "4 inch SOG", "slab on grade 4 inch"]
    }
  ],
  "newItems": [
    {
      "id": "new-item-id-slug",
      "description": "Clear canonical description",
      "csiCode": "03 30 00",
      "unit": "SF",
      "materialCost": 5.25,
      "category": "concrete",
      "synonyms": ["synonym 1", "synonym 2", "synonym 3"]
    }
  ]
}

RULES:
- Synonyms should be LOWERCASE
- Include at least 5-10 synonyms per item (more for common items)
- Include abbreviations (SOG, CMU, GWB, T&G, etc.)
- Include dimension variations (4", 4 inch, 4-inch, 4 in.)
- Do NOT include the canonical description as a synonym (it's stored separately)
- For new items, use realistic RS Means 2025 material-only pricing
- New item IDs should be kebab-case slugs (e.g., "concrete-topping-slab-2in")
- Only add items that would realistically appear on construction drawings
- Return VALID JSON only, no markdown fences`;
}

function buildLaborExpansionPrompt(
  divCode: string,
  divName: string,
  existingItems: { id: string; description: string; unit: string; baseLaborCost: number }[]
): string {
  const itemList = existingItems
    .map((e, i) => `  ${i + 1}. [${e.id}] "${e.description}" — ${e.unit} @ $${e.baseLaborCost}/unit`)
    .join("\n");

  return `You are a senior construction estimator specializing in labor productivity and crew rates.

I have a LABOR cost reference library for CSI Division ${divCode} — ${divName}. Below are the EXISTING entries:

${itemList || "  (No existing entries)"}

## TASK 1: SYNONYMS FOR EXISTING ITEMS
For EACH existing item, provide ALL synonyms and aliases that describe this labor activity. Think about:
- How the work is described on drawings vs. in the field
- Verb variations (install, place, set, erect, lay, apply)
- Regional terminology
- Trade-specific jargon

## TASK 2: MISSING LABOR ITEMS
What labor activities are MISSING from this division? For each:
- Description (verb + noun, e.g., "Install Hollow Metal Door Frame")
- Unit (same as the material item it corresponds to)
- Base labor cost per unit (Residential Open Shop, 2025 national average, ALL-IN crew cost including burden)
- Crew size (typical)
- Productivity (units per crew-hour)
- CSI code (6-digit)
- Category
- Synonyms

## OUTPUT FORMAT (strict JSON):
{
  "existingSynonyms": [
    {
      "id": "labor-slab-4in",
      "synonyms": ["pour 4 inch slab", "place and finish 4in concrete", "slab placement 4\""]
    }
  ],
  "newItems": [
    {
      "id": "labor-new-item-slug",
      "description": "Clear description of labor activity",
      "csiCode": "03 30 00",
      "unit": "SF",
      "baseLaborCost": 4.50,
      "crewSize": 4,
      "productivity": 200,
      "category": "concrete",
      "synonyms": ["synonym 1", "synonym 2"]
    }
  ]
}

RULES:
- Synonyms LOWERCASE
- At least 5 synonyms per item
- Labor costs are ALL-IN (wages + burden: FICA, workers comp, health, pension)
- Residential Open Shop rates (baseline)
- Return VALID JSON only, no markdown fences`;
}

// ─── Database helpers ────────────────────────────────────────────────────────────

async function getDbConnection() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL not set");
  return createConnection(dbUrl);
}

async function clearExpandedTables(conn: any) {
  await conn.execute("DELETE FROM expanded_cost_library");
  await conn.execute("DELETE FROM expanded_labor_library");
  console.log("🗑️  Cleared existing expanded library data");
}

async function insertCostItem(conn: any, item: {
  costItemId: string;
  csiDivision: string;
  csiCode: string;
  description: string;
  unit: string;
  materialCost: number; // dollars
  category: string;
  keywords: string[] | null;
  excludeKeywords: string[] | null;
  synonyms: string[];
  isOriginal: boolean;
}) {
  await conn.execute(
    `INSERT INTO expanded_cost_library (costItemId, csiDivision, csiCode, description, unit, materialCost, category, keywords, excludeKeywords, synonyms, isOriginal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.costItemId,
      item.csiDivision,
      item.csiCode,
      item.description,
      item.unit,
      Math.round(item.materialCost * 100), // store as cents
      item.category,
      item.keywords ? JSON.stringify(item.keywords) : null,
      item.excludeKeywords ? JSON.stringify(item.excludeKeywords) : null,
      JSON.stringify(item.synonyms),
      item.isOriginal,
    ]
  );
}

async function insertLaborItem(conn: any, item: {
  laborItemId: string;
  csiDivision: string;
  csiCode: string;
  description: string;
  unit: string;
  baseLaborCost: number; // dollars
  crewSize: number;
  productivity: number;
  category: string;
  synonyms: string[];
  isOriginal: boolean;
}) {
  await conn.execute(
    `INSERT INTO expanded_labor_library (laborItemId, csiDivision, csiCode, description, unit, baseLaborCost, crewSize, productivity, category, synonyms, isOriginal)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.laborItemId,
      item.csiDivision,
      item.csiCode,
      item.description,
      item.unit,
      Math.round(item.baseLaborCost * 100), // store as cents
      item.crewSize,
      item.productivity,
      item.category,
      JSON.stringify(item.synonyms),
      item.isOriginal,
    ]
  );
}

// ─── Main expansion logic ────────────────────────────────────────────────────────

async function expandDivisionCosts(
  conn: any,
  divCode: string,
  divName: string
): Promise<{ origCount: number; newCount: number; totalSynonyms: number }> {
  const existing = COST_TABLE.filter(e => e.csiDivision === divCode);
  
  const prompt = buildExpansionPrompt(
    divCode,
    divName,
    existing.map(e => ({
      id: e.id,
      description: e.description,
      unit: e.unit,
      materialCost: e.materialCost,
      keywords: e.keywords,
    }))
  );

  console.log(`  📦 Sending ${existing.length} cost items to LLM for div ${divCode}...`);

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a construction cost data expert. Return ONLY valid JSON, no markdown." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cost_expansion",
        strict: false,
        schema: {
          type: "object",
          properties: {
            existingSynonyms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  synonyms: { type: "array", items: { type: "string" } },
                },
                required: ["id", "synonyms"],
              },
            },
            newItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  description: { type: "string" },
                  csiCode: { type: "string" },
                  unit: { type: "string" },
                  materialCost: { type: "number" },
                  category: { type: "string" },
                  synonyms: { type: "array", items: { type: "string" } },
                },
                required: ["id", "description", "csiCode", "unit", "materialCost", "category", "synonyms"],
              },
            },
          },
          required: ["existingSynonyms", "newItems"],
        },
      },
    },
  });

  const content = String(response.choices?.[0]?.message?.content || "{}");
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // Try to extract JSON from markdown fences
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      console.error(`  ❌ Failed to parse LLM response for div ${divCode}`);
      return { origCount: 0, newCount: 0, totalSynonyms: 0 };
    }
  }

  let totalSynonyms = 0;

  // Insert existing items with their new synonyms
  const synonymMap = new Map<string, string[]>();
  for (const syn of (parsed.existingSynonyms || [])) {
    synonymMap.set(syn.id, syn.synonyms || []);
  }

  for (const entry of existing) {
    const synonyms = synonymMap.get(entry.id) || [];
    totalSynonyms += synonyms.length;
    await insertCostItem(conn, {
      costItemId: entry.id,
      csiDivision: entry.csiDivision,
      csiCode: entry.csiCode,
      description: entry.description,
      unit: entry.unit,
      materialCost: entry.materialCost,
      category: entry.category,
      keywords: entry.keywords,
      excludeKeywords: entry.excludeKeywords || null,
      synonyms,
      isOriginal: true,
    });
  }

  // Insert new items
  const newItems = parsed.newItems || [];
  for (const item of newItems) {
    totalSynonyms += (item.synonyms || []).length;
    await insertCostItem(conn, {
      costItemId: item.id,
      csiDivision: divCode,
      csiCode: item.csiCode || `${divCode} 00 00`,
      description: item.description,
      unit: item.unit,
      materialCost: item.materialCost,
      category: item.category || divName.toLowerCase(),
      keywords: null,
      excludeKeywords: null,
      synonyms: item.synonyms || [],
      isOriginal: false,
    });
  }

  return { origCount: existing.length, newCount: newItems.length, totalSynonyms };
}

async function expandDivisionLabor(
  conn: any,
  divCode: string,
  divName: string
): Promise<{ origCount: number; newCount: number; totalSynonyms: number }> {
  const existing = LABOR_TABLE.filter(e => e.csiDivision === divCode);
  
  // Skip divisions with no labor entries and no cost entries (nothing to expand from)
  if (existing.length === 0 && COST_TABLE.filter(e => e.csiDivision === divCode).length === 0) {
    return { origCount: 0, newCount: 0, totalSynonyms: 0 };
  }

  const prompt = buildLaborExpansionPrompt(
    divCode,
    divName,
    existing.map(e => ({
      id: e.id,
      description: e.description,
      unit: e.unit,
      baseLaborCost: e.baseLaborCost,
    }))
  );

  console.log(`  👷 Sending ${existing.length} labor items to LLM for div ${divCode}...`);

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a construction labor productivity expert. Return ONLY valid JSON, no markdown." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "labor_expansion",
        strict: false,
        schema: {
          type: "object",
          properties: {
            existingSynonyms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  synonyms: { type: "array", items: { type: "string" } },
                },
                required: ["id", "synonyms"],
              },
            },
            newItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  description: { type: "string" },
                  csiCode: { type: "string" },
                  unit: { type: "string" },
                  baseLaborCost: { type: "number" },
                  crewSize: { type: "number" },
                  productivity: { type: "number" },
                  category: { type: "string" },
                  synonyms: { type: "array", items: { type: "string" } },
                },
                required: ["id", "description", "csiCode", "unit", "baseLaborCost", "category", "synonyms"],
              },
            },
          },
          required: ["existingSynonyms", "newItems"],
        },
      },
    },
  });

  const content = String(response.choices?.[0]?.message?.content || "{}");
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      console.error(`  ❌ Failed to parse labor LLM response for div ${divCode}`);
      return { origCount: 0, newCount: 0, totalSynonyms: 0 };
    }
  }

  let totalSynonyms = 0;

  const synonymMap = new Map<string, string[]>();
  for (const syn of (parsed.existingSynonyms || [])) {
    synonymMap.set(syn.id, syn.synonyms || []);
  }

  for (const entry of existing) {
    const synonyms = synonymMap.get(entry.id) || [];
    totalSynonyms += synonyms.length;
    await insertLaborItem(conn, {
      laborItemId: entry.id,
      csiDivision: entry.csiDivision,
      csiCode: entry.csiCode,
      description: entry.description,
      unit: entry.unit,
      baseLaborCost: entry.baseLaborCost,
      crewSize: entry.crewSize,
      productivity: entry.productivity,
      category: entry.category,
      synonyms,
      isOriginal: true,
    });
  }

  const newItems = parsed.newItems || [];
  for (const item of newItems) {
    totalSynonyms += (item.synonyms || []).length;
    await insertLaborItem(conn, {
      laborItemId: item.id,
      csiDivision: divCode,
      csiCode: item.csiCode || `${divCode} 00 00`,
      description: item.description,
      unit: item.unit,
      baseLaborCost: item.baseLaborCost,
      crewSize: item.crewSize || 2,
      productivity: item.productivity || 100,
      category: item.category || divName.toLowerCase(),
      synonyms: item.synonyms || [],
      isOriginal: false,
    });
  }

  return { origCount: existing.length, newCount: newItems.length, totalSynonyms };
}

// ─── Main ────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  ConstructLine Cost Library Expansion Tool                  ║");
  console.log("║  Generating synonyms + missing items for all CSI divisions  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const conn = await getDbConnection();
  await clearExpandedTables(conn);

  let totalCostOrig = 0, totalCostNew = 0, totalCostSynonyms = 0;
  let totalLaborOrig = 0, totalLaborNew = 0, totalLaborSynonyms = 0;

  for (const div of CSI_DIVISIONS) {
    console.log(`\n━━━ Division ${div.code}: ${div.name} ━━━`);

    // Expand cost items
    try {
      const costResult = await expandDivisionCosts(conn, div.code, div.name);
      totalCostOrig += costResult.origCount;
      totalCostNew += costResult.newCount;
      totalCostSynonyms += costResult.totalSynonyms;
      console.log(`  ✅ Cost: ${costResult.origCount} original + ${costResult.newCount} new = ${costResult.origCount + costResult.newCount} items, ${costResult.totalSynonyms} synonyms`);
    } catch (err: any) {
      console.error(`  ❌ Cost expansion failed for div ${div.code}: ${err.message}`);
    }

    // Small delay between calls
    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));

    // Expand labor items
    try {
      const laborResult = await expandDivisionLabor(conn, div.code, div.name);
      totalLaborOrig += laborResult.origCount;
      totalLaborNew += laborResult.newCount;
      totalLaborSynonyms += laborResult.totalSynonyms;
      console.log(`  ✅ Labor: ${laborResult.origCount} original + ${laborResult.newCount} new = ${laborResult.origCount + laborResult.newCount} items, ${laborResult.totalSynonyms} synonyms`);
    } catch (err: any) {
      console.error(`  ❌ Labor expansion failed for div ${div.code}: ${err.message}`);
    }

    // Delay between divisions
    await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  EXPANSION COMPLETE                                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log(`  Cost Library:  ${totalCostOrig} original + ${totalCostNew} new = ${totalCostOrig + totalCostNew} items, ${totalCostSynonyms} synonyms`);
  console.log(`  Labor Library: ${totalLaborOrig} original + ${totalLaborNew} new = ${totalLaborOrig + totalLaborNew} items, ${totalLaborSynonyms} synonyms`);
  console.log(`  Total synonyms: ${totalCostSynonyms + totalLaborSynonyms}`);

  await conn.end();
  console.log("\nDone! The expanded library is ready for the new matching engine.");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
