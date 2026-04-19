/**
 * AI Quantity Takeoff Pipeline — processes construction drawing sheets
 * using GPT-4o vision to extract quantities organized by CSI division.
 *
 * Prompt Engineering v3:
 * - Division scoping: only extract items for selected CSI divisions
 * - Few-shot examples per sheet type
 * - Structured JSON output schema with strict validation
 * - Multi-pass verification (extract → verify → reconcile)
 * - Confidence scores per line item
 * - Sheet-type detection (floor plan, elevation, structural, MEP, etc.)
 */
import { invokeLLM } from "./_core/llm";
import {
  updateDrawingSheet,
  createTakeoffItemsBatch,
  deleteTakeoffItemsBySheet,
  updateTakeoffProject,
  recalculateProjectTotal,
  getPendingSheets,
  getTakeoffProject,
  getDrawingSheetsByProject,
} from "./takeoffDb";
import { postProcessTakeoff, hardScopeFilter } from "./takeoffPostProcess";
import { indexAllSheets, type ProjectContext } from "./takeoffSheetIndex";
import type { InsertTakeoffItem } from "../drizzle/schema";
import { TAKEOFF_DIVISION_MAP, ALL_TAKEOFF_DIVISION_CODES } from "../shared/csiDivisions";
import { buildSpecialtyPromptInjection, TRADE_SPECIALTIES, getSpecialtiesForDivision } from "../shared/tradeSpecialties";

// ─── CSI Division Reference ────────────────────────────────────────────────────

const CSI_DIVISIONS_FULL = `
DIVISION 01 - General Requirements (mobilization, temp facilities, project management)
DIVISION 02 - Existing Conditions (demolition, site clearing, hazmat abatement)
DIVISION 03 - Concrete (footings, slabs, walls, piers — measure in CY or SF)
DIVISION 04 - Masonry (CMU block, brick, stone — measure in SF or EA)
DIVISION 05 - Metals (structural steel, misc metals — measure in TON or LF)
DIVISION 06 - Wood, Plastics & Composites (framing, sheathing, millwork — measure in BF, LF, SF)
DIVISION 07 - Thermal & Moisture Protection (roofing, insulation, waterproofing — measure in SF or SQ)
DIVISION 08 - Openings (doors, windows, hardware — measure in EA)
DIVISION 09 - Finishes (drywall, flooring, paint, tile — measure in SF or SY)
DIVISION 10 - Specialties (toilet accessories, signage, lockers — measure in EA or LS)
DIVISION 11 - Equipment (appliances, kitchen equipment — measure in EA)
DIVISION 12 - Furnishings (casework, window treatments — measure in LF or EA)
DIVISION 13 - Special Construction (pools, clean rooms — measure in LS or SF)
DIVISION 14 - Conveying Equipment (elevators, escalators — measure in EA or STOP)
DIVISION 21 - Fire Suppression (sprinkler heads, pipes — measure in EA or LF)
DIVISION 22 - Plumbing (fixtures, pipes, water heater — measure in EA or LF)
DIVISION 23 - HVAC (equipment, ductwork, diffusers — measure in EA, TON, or LF)
DIVISION 26 - Electrical (panels, devices, conduit, fixtures — measure in EA or LF)
DIVISION 27 - Communications (data, phone, AV — measure in EA or LF)
DIVISION 28 - Electronic Safety & Security (cameras, access control — measure in EA)
DIVISION 31 - Earthwork (grading, excavation, fill — measure in CY or AC)
DIVISION 32 - Exterior Improvements (paving, landscaping, curbs — measure in SF, LF, or SY)
DIVISION 33 - Utilities (underground piping, manholes — measure in LF or EA)
`.trim();

/**
 * Build a filtered CSI divisions reference string for the AI prompt.
 * When divisions are scoped, only include those divisions in the reference.
 */
function buildDivisionReference(selectedDivisions: string[] | null): string {
  if (!selectedDivisions || selectedDivisions.length === 0) {
    return CSI_DIVISIONS_FULL;
  }
  const lines = CSI_DIVISIONS_FULL.split("\n");
  return lines
    .filter((line) => {
      const match = line.match(/DIVISION (\d{2})/);
      return match && selectedDivisions.includes(match[1]);
    })
    .join("\n");
}

/**
 * Build a scoping instruction for the AI when divisions are filtered.
 */
function buildScopingInstruction(selectedDivisions: string[] | null): string {
  if (!selectedDivisions || selectedDivisions.length === 0) {
    return "";
  }
  const divNames = selectedDivisions
    .map((code) => `Division ${code} - ${TAKEOFF_DIVISION_MAP[code] || "Unknown"}`)
    .join(", ");
  return `\n\n## SCOPE RESTRICTION — IMPORTANT
This takeoff is scoped to ONLY the following CSI divisions: ${divNames}.
Do NOT extract items from any other divisions. If you see items on the drawing that belong to divisions outside this scope, SKIP them entirely. Only return items that fall within the specified divisions.`;
}

// ─── Few-Shot Examples ─────────────────────────────────────────────────────────

const FEW_SHOT_FLOOR_PLAN = `
EXAMPLE — Floor Plan (A1.1 First Floor Plan, 2,400 SF house):
{
  "sheetName": "A1.1 - First Floor Plan",
  "sheetType": "floor_plan",
  "items": [
    {"csiDivision":"03","csiCode":"03 30 00","description":"Concrete Slab-on-Grade 4\\" thick","quantity":2400,"unit":"SF","unitCost":8.50,"confidence":85,"notes":"Total first floor area from plan dimensions 40'x60'"},
    {"csiDivision":"06","csiCode":"06 11 00","description":"Wood Stud Framing 2x6 @ 16\\" OC Exterior Walls","quantity":480,"unit":"LF","unitCost":12.00,"confidence":80,"notes":"Perimeter 2*(40+60)=200 LF x 8' plate height, converted to LF of wall"},
    {"csiDivision":"06","csiCode":"06 11 00","description":"Wood Stud Framing 2x4 @ 16\\" OC Interior Partitions","quantity":320,"unit":"LF","unitCost":8.50,"confidence":70,"notes":"Estimated interior partition LF from room layout"},
    {"csiDivision":"08","csiCode":"08 11 13","description":"Hollow Metal Exterior Door 3'-0\\" x 6'-8\\"","quantity":3,"unit":"EA","unitCost":850.00,"confidence":90,"notes":"3 exterior door openings visible on plan"},
    {"csiDivision":"08","csiCode":"08 11 16","description":"Interior Wood Door 2'-8\\" x 6'-8\\"","quantity":12,"unit":"EA","unitCost":450.00,"confidence":85,"notes":"12 interior door openings counted on plan"},
    {"csiDivision":"08","csiCode":"08 51 13","description":"Aluminum Casement Window 3'-0\\" x 4'-0\\"","quantity":18,"unit":"EA","unitCost":650.00,"confidence":80,"notes":"18 window openings counted on plan"},
    {"csiDivision":"09","csiCode":"09 21 16","description":"Gypsum Board 5/8\\" Type X Walls","quantity":7680,"unit":"SF","unitCost":2.25,"confidence":75,"notes":"Estimated wall SF: 800 LF perimeter x 8' height x 2 sides, less openings"}
  ]
}
`.trim();

const FEW_SHOT_STRUCTURAL = `
EXAMPLE — Structural Plan (S1.0 Foundation Plan):
{
  "sheetName": "S1.0 - Foundation Plan",
  "sheetType": "structural",
  "items": [
    {"csiDivision":"03","csiCode":"03 30 00","description":"Concrete Continuous Footing 24\\"W x 12\\"D","quantity":200,"unit":"LF","unitCost":45.00,"confidence":88,"notes":"Perimeter footing from foundation plan dimensions"},
    {"csiDivision":"03","csiCode":"03 30 00","description":"Concrete Pier 18\\" diameter x 4'-0\\" deep","quantity":16,"unit":"EA","unitCost":350.00,"confidence":90,"notes":"16 pier locations shown on foundation plan"},
    {"csiDivision":"03","csiCode":"03 20 00","description":"Reinforcing Steel #5 Rebar in Footings","quantity":1200,"unit":"LF","unitCost":1.85,"confidence":75,"notes":"Estimated from footing schedule: 2 bars continuous + stirrups"},
    {"csiDivision":"03","csiCode":"03 30 00","description":"Concrete Grade Beam 12\\"W x 18\\"D","quantity":150,"unit":"LF","unitCost":55.00,"confidence":82,"notes":"Grade beams shown between piers on foundation plan"},
    {"csiDivision":"31","csiCode":"31 23 00","description":"Excavation for Continuous Footing","quantity":148,"unit":"CY","unitCost":18.00,"confidence":78,"notes":"200 LF x 2' wide x 1' deep = 400 CF / 27 = 14.8 CY, x10 for full depth"}
  ]
}
`.trim();

const FEW_SHOT_MEP = `
EXAMPLE — MEP Plan (M1.0 HVAC Floor Plan):
{
  "sheetName": "M1.0 - HVAC Floor Plan",
  "sheetType": "mep",
  "items": [
    {"csiDivision":"23","csiCode":"23 74 00","description":"Packaged Rooftop Unit 5-Ton Split System","quantity":2,"unit":"EA","unitCost":8500.00,"confidence":85,"notes":"2 RTU units shown on roof plan with equipment schedule"},
    {"csiDivision":"23","csiCode":"23 31 00","description":"Sheet Metal Supply Ductwork 14\\"x10\\"","quantity":280,"unit":"LF","unitCost":28.00,"confidence":72,"notes":"Main trunk ductwork measured from plan"},
    {"csiDivision":"23","csiCode":"23 31 00","description":"Flexible Duct 6\\" diameter Branch Runs","quantity":420,"unit":"LF","unitCost":8.50,"confidence":70,"notes":"Estimated flex duct to each diffuser"},
    {"csiDivision":"23","csiCode":"23 37 00","description":"Supply Air Diffuser 24\\"x24\\" Ceiling","quantity":24,"unit":"EA","unitCost":185.00,"confidence":88,"notes":"24 supply diffusers shown on plan"},
    {"csiDivision":"23","csiCode":"23 37 00","description":"Return Air Grille 24\\"x24\\" Ceiling","quantity":8,"unit":"EA","unitCost":145.00,"confidence":88,"notes":"8 return grilles shown on plan"}
  ]
}
`.trim();

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildCurrencyInstruction(currency: string | null): string {
  if (!currency || currency === "USD") return "";
  if (currency === "GBP") {
    return `\n\n## CURRENCY — IMPORTANT\nAll unit costs MUST be in British Pounds Sterling (£ GBP). Use current UK construction market rates (2024-2025 pricing). Think in terms of UK material suppliers, UK labour rates, and UK market conditions. Do NOT convert from USD — price directly in GBP as a UK-based estimator would.`;
  }
  if (currency === "AUD") {
    return `\n\n## CURRENCY — IMPORTANT\nAll unit costs MUST be in Australian Dollars (A$ AUD). Use current Australian construction market rates (2024-2025 pricing). Think in terms of Australian material suppliers, Australian labour rates, and Australian market conditions. Do NOT convert from USD — price directly in AUD as an Australian-based estimator would.`;
  }
  return "";
}

function buildScopeTextInstruction(scopeText: string | null): string {
  if (!scopeText || scopeText.trim().length === 0) return "";
  return `\n\n## SPECIFIC SCOPE FILTER — CRITICAL (HARD FILTER)
The user has specified a PRECISE scope of work. This is a HARD FILTER — you MUST ONLY extract items that match this scope:

"${scopeText.trim()}"

RULES:
- ONLY return items that are EXPLICITLY within this scope description
- If the scope says "foundation through SOG only, none of the vertical" — do NOT include above-grade walls, columns, beams, or any vertical structure
- If the scope says specific elements are "included" (e.g., "vacuum enclosure foundations included") — include those
- If the scope says specific elements are "excluded" (e.g., "20 foot drive slab excluded") — do NOT include those
- When in doubt about whether an item is in scope, EXCLUDE it
- This scope filter overrides the CSI division selection — even if a CSI division is selected, only items matching the scope text should be returned`;
}

function buildSystemPrompt(selectedDivisions: string[] | null, currency?: string | null, scopeText?: string | null, projectContext?: string | null, specialtyIds?: string[] | null): string {
  const divisionRef = buildDivisionReference(selectedDivisions);
  const scopeInstruction = buildScopingInstruction(selectedDivisions);
  const currencyInstruction = buildCurrencyInstruction(currency || null);
  const scopeTextInstruction = buildScopeTextInstruction(scopeText || null);

  const currencyLabel = currency === "GBP" ? "GBP" : currency === "AUD" ? "AUD" : "USD";
  const currencyPricingNote = currency === "GBP"
    ? "Use current UK market rates (2024-2025 pricing) in British Pounds (£)"
    : currency === "AUD"
      ? "Use current Australian market rates (2024-2025 pricing) in Australian Dollars (A$)"
      : "Use current US market rates (2024-2025 pricing)";

  const contextBlock = projectContext
    ? `\n\n${projectContext}`
    : "";

  const specialtyInjection = buildSpecialtyPromptInjection(specialtyIds || []);

  return `You are a senior construction estimator with 20+ years of experience performing quantity takeoffs from construction drawings. You work for a general contractor and produce accurate, detailed quantity takeoffs that will be used for bidding.

## YOUR TASK
Analyze the provided construction drawing image and extract a complete, accurate quantity takeoff.
${scopeInstruction}${currencyInstruction}${scopeTextInstruction}${specialtyInjection}${contextBlock}

## PROCESS (follow exactly):
1. **Identify the drawing**: Read the title block to get the sheet name, number, and project info
2. **Classify the sheet type**: floor_plan, elevation, section, detail, schedule, site_plan, structural, mep, electrical, plumbing, hvac, landscape, cover, or other
3. **Measure systematically**: Work through the drawing area by area, room by room, or system by system
4. **Apply correct units**: Use industry-standard units (SF for area, LF for linear, CY for volume, EA for each, TON for steel, SQ for roofing, etc.)
5. **Assign CSI codes**: Every item gets a 2-digit division code AND a full 6-digit CSI code
6. **Unit costs**: Set unitCost to 1 for all items — pricing will be applied separately from a cost database. Focus ALL your effort on accurate QUANTITIES and DESCRIPTIONS, not pricing.
7. **Score confidence**: Rate 0-100 based on how clearly the quantity can be read from the drawing

## CONFIDENCE SCORING GUIDE:
- 90-100: Dimension is explicitly labeled on the drawing
- 75-89: Can be measured from scaled drawing or counted directly
- 60-74: Estimated from typical construction ratios or partial information
- 40-59: Inferred from context, drawing is unclear
- Below 40: Best guess, drawing is very unclear or item is partially visible

## MEASUREMENT RULES:
- Floor areas: measure net interior dimensions, not gross building footprint
- Wall lengths: measure centerline of walls
- Doors/windows: count each opening as 1 EA; note size in description
- Concrete: always specify thickness and application
- Framing: specify member size, spacing, and orientation
- Roofing: measure in SQ (100 SF) for shingles/membrane, SF for metal
- Earthwork: calculate CY (cubic yards), not CF

## PLAN VIEW MEASUREMENT — CRITICAL:
When analyzing a PLAN VIEW (floor plan, foundation plan, site plan, structural plan):
- ALWAYS extract overall building dimensions from the plan (e.g., 110'-4" x 82'-2")
- CALCULATE areas: length × width = SF for slabs, foundations, etc.
- CALCULATE volumes: SF × thickness / 27 = CY for concrete
- TRACE perimeters: add up all footing/wall runs for total LF
- COUNT elements: piers, columns, footings, openings — count each one individually
- MEASURE pit dimensions: read length × width × depth from the plan
- For SLAB-ON-GRADE: calculate total SF from building footprint minus excluded areas
- For FOOTINGS: trace the continuous footing line on the plan and sum total LF
- For GRADE BEAMS: trace each beam run and measure LF
- Show your calculation in the notes field (e.g., "110.33' × 82.17' = 9,067 SF")

## SLAB EXTRACTION — HIGHEST PRIORITY:
Slabs are the LARGEST concrete items by volume. Missing a slab is a critical error.
- ALWAYS extract slab-on-grade items with their AREA in SF and THICKNESS
- 4" slabs and 6" slabs are DIFFERENT items — extract them separately
- Calculate slab area from plan dimensions: length × width = SF
- If the plan shows color-coded areas (green for 4" slab, yellow for 6" slab), extract EACH separately
- Include the slab thickness in the description (e.g., "4\" Concrete Slab-on-Grade" or "6\" Concrete Slab-on-Grade")
- If you see slab callouts on the plan (e.g., "4\" CONC. SLAB" or "6\" CONC. SLAB"), these are slabs
- Slabs are CSI 03 30 00 and measured in SF

## FOOTING MEASUREMENT — AVOID DOUBLE-COUNTING:
- Each continuous footing (WF-1, WF-2, WF-3, etc.) has ONE total length
- Measure the footing run from the PLAN VIEW only — do NOT add lengths from detail sheets
- Detail sheets show cross-sections and reinforcing, NOT additional footing length
- If a footing schedule shows dimensions (width x depth), use those for the description but get the LENGTH from the plan
- Include footing type in description (e.g., "WF-1 Continuous Footing 2'-0\" W x 1'-0\" D")
- **SPREAD FOOTINGS (F-1, F-2, etc.):** These are isolated pad footings at column locations. Extract them as EA (each) with dimensions in the description. Calculate CY if dimensions are given: length × width × depth ÷ 27 = CY. Example: "F-1 Spread Footing 5'-0\" × 9'-0\" × 1'-6\" D — 2 EA"

## EARTHWORK — BACKFILL REQUIRED:
- ALWAYS extract building backfill / structural backfill as a separate CSI 31 line item
- Backfill = material placed back against foundation walls after concrete cures
- Estimate backfill as: (Excavation CY) - (Concrete CY placed) = Backfill CY
- If you extracted excavation, you MUST also extract backfill (typically 15-25% of excavation volume)
- Description: "Building Backfill / Structural Fill" unit: CY, CSI: 31 23 00

## CONSTRUCTION JOINTS & EXPANSION JOINTS — CRITICAL:
- Construction joints AND expansion joints are measured in LINEAR FEET (LF), not EA
- Calculate total LF from the PLAN VIEW only — count the joint lines and measure their lengths
- Detail sheets (sections, enlargements) show the joint PROFILE/CROSS-SECTION — do NOT use cross-section dimensions as joint length
- Typical construction joint spacing is every 15-20 feet in slabs — use this to verify your count
- Expansion joints (CSI 03 15 00 or 07 95 00) follow the same rule: LF from plan, NOT from detail sheets

## WIRE MESH / WELDED WIRE REINFORCEMENT — CRITICAL:
- Wire mesh / WWR / WWF specifications MUST be read from the SAME sheet you are analyzing
- Do NOT use rebar or mesh callouts from the project context block — those may belong to different elements or sheets
- For slab reinforcement, read the wire mesh spec directly from the slab callout or general notes ON THIS SHEET
- Common specs: 6x6-W1.4xW1.4, 6x6-W2.9xW2.9, 6x6-W4.0xW4.0 — verify against what is actually written on the drawing
- If the project context mentions a different mesh spec than what you see on this sheet, ALWAYS use what is on THIS sheet
- Wire mesh is measured in SF (same area as the slab it reinforces)

## ANTI-LUMP-SUM RULE — CRITICAL:
- NEVER use "LS" (Lump Sum) as a unit if you can calculate a measured quantity
- If you can see ANY dimension on the drawing, USE IT to calculate a real quantity
- Only use LS as an absolute last resort when NO dimensions are available
- Every LS item MUST include a note explaining WHY it couldn't be measured
- Contractors CANNOT bid from lump sums — measured quantities are essential

## IMPORTANT:
- Do NOT make up items that aren't visible in the drawing
- If a dimension is not shown, estimate from scale or typical construction
- For cover sheets or title-only sheets, return an empty items array
- Include ALL visible MEASURABLE items — be thorough, not selective
- ALWAYS show your math in the notes field — this builds contractor confidence

## DO NOT EXTRACT THESE — CRITICAL:
The following are NOT takeoff items. Do NOT create line items for:
- **Specification notes** (e.g., "Grade 60 KSI yield strength", "ASTM A36", "2000 PSI minimum")
- **General notes** (e.g., "All dimensions shall be verified", "Provide lateral bracing")
- **Code requirements** (e.g., "Staples not permitted", "Conform to AISC")
- **Material specifications** (e.g., "Southern Pine No. 2 Grade", "LVL Fb=2600 PSI")
- **Design criteria** (e.g., "Soil bearing pressure: 2,000 PSF", "f'm of 2000 PSI")
- **Construction methods** (e.g., "Trusses shall be cambered", "Provide floor bridging")
- **Nailing/fastening schedules** (e.g., "4 rows of 1/2" bolts @ 12" o.c.")
- **Truss design notes** (e.g., "Truss designer shall be a PE")
- **Any text that describes HOW to build rather than WHAT to build**

A valid takeoff item MUST have a MEASURABLE physical quantity (SF, LF, CY, EA, etc.) that a contractor can order or install. If you cannot assign a real measured quantity > 0, do NOT include it.

## CSI DIVISIONS REFERENCE:
${divisionRef}

## EXAMPLES OF CORRECT OUTPUT:
${FEW_SHOT_FLOOR_PLAN}

${FEW_SHOT_STRUCTURAL}

${FEW_SHOT_MEP}`;
}

// ─── Verification Prompt ───────────────────────────────────────────────────────

const VERIFICATION_PROMPT = `You are a senior QA estimator reviewing a quantity takeoff for accuracy and completeness.

Review the following quantity takeoff extracted from a construction drawing. Your job is to:
1. Check for obvious errors (wrong units, unrealistic quantities, missing items)
2. Verify CSI codes are correct for each item
3. Flag any items with suspiciously high or low quantities
4. Add any items that appear to be missing based on the sheet type
5. Adjust confidence scores if needed

Return the corrected and verified takeoff in the same JSON format. Keep all items that look correct. Fix items with errors. Add missing items if you can identify them from context.

ORIGINAL TAKEOFF:
{ORIGINAL_JSON}

Return the verified takeoff as JSON with the same schema. If the original looks correct, return it unchanged.`;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface TakeoffItem {
  csiDivision: string;
  csiCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  confidence: number;
  notes: string;
}

interface TakeoffExtractionResult {
  sheetName: string;
  sheetType: string;
  items: TakeoffItem[];
}

const RESPONSE_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "takeoff_extraction",
    strict: true,
    schema: {
      type: "object",
      properties: {
        sheetName: {
          type: "string",
          description: "Sheet name/number from title block, e.g. 'A1.1 - First Floor Plan'",
        },
        sheetType: {
          type: "string",
          enum: [
            "floor_plan", "elevation", "section", "detail", "schedule",
            "site_plan", "structural", "mep", "electrical", "plumbing",
            "hvac", "landscape", "cover", "other",
          ],
          description: "Type of drawing sheet",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              csiDivision: { type: "string", description: "2-digit CSI division code, e.g. '03'" },
              csiCode: { type: "string", description: "Full 6-digit CSI code e.g. '03 30 00'" },
              description: { type: "string", description: "Detailed item description including size, type, material" },
              quantity: { type: "number", description: "Numeric quantity value" },
              unit: { type: "string", description: "Unit of measure: SF, LF, CY, EA, TON, SQ, BF, LB, LS, etc." },
              unitCost: { type: "number", description: "Set to 1 for all items (pricing applied from cost database)" },
              confidence: { type: "integer", description: "Confidence score 0-100 in quantity accuracy" },
              notes: { type: "string", description: "Brief explanation of how quantity was measured or estimated" },
            },
            required: ["csiDivision", "csiCode", "description", "quantity", "unit", "unitCost", "confidence", "notes"],
            additionalProperties: false,
          },
        },
      },
      required: ["sheetName", "sheetType", "items"],
      additionalProperties: false,
    },
  },
};

// ─── Extraction Pass ───────────────────────────────────────────────────────────

async function extractQuantities(
  imageUrl: string,
  selectedDivisions: string[] | null,
  currency?: string | null,
  scopeText?: string | null,
  projectContext?: string | null,
  specialtyIds?: string[] | null
): Promise<TakeoffExtractionResult> {
  const systemPrompt = buildSystemPrompt(selectedDivisions, currency, scopeText, projectContext, specialtyIds);
  const scopeNote = selectedDivisions && selectedDivisions.length > 0
    ? ` Only extract items for the specified CSI divisions: ${selectedDivisions.join(", ")}.`
    : "";

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this construction drawing sheet carefully. Extract ALL measurable quantities visible on the drawing, organized by CSI division.${scopeNote} Be thorough — include every item you can identify within scope. Return your analysis as JSON matching the schema exactly.`,
          },
          {
            type: "image_url",
            image_url: { url: imageUrl, detail: "high" },
          },
        ],
      },
    ],
    response_format: RESPONSE_SCHEMA,
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No content in AI extraction response");
  }

  const result = JSON.parse(content) as TakeoffExtractionResult;

  // Post-filter: ensure only selected divisions are included (belt-and-suspenders)
  if (selectedDivisions && selectedDivisions.length > 0) {
    result.items = result.items.filter((item) =>
      selectedDivisions.includes(item.csiDivision.trim())
    );
  }

  return result;
}

// ─── Verification Pass ─────────────────────────────────────────────────────────

async function verifyQuantities(
  original: TakeoffExtractionResult,
  imageUrl: string,
  selectedDivisions: string[] | null
): Promise<TakeoffExtractionResult> {
  // Skip verification for cover sheets or very small takeoffs
  if (original.sheetType === "cover" || original.items.length === 0) {
    return original;
  }

  const originalJson = JSON.stringify(original, null, 2);
  let verificationUserPrompt = VERIFICATION_PROMPT.replace("{ORIGINAL_JSON}", originalJson);

  // Add scope reminder to verification
  if (selectedDivisions && selectedDivisions.length > 0) {
    verificationUserPrompt += `\n\nIMPORTANT: This takeoff is scoped to divisions ${selectedDivisions.join(", ")} only. Do NOT add items from other divisions.`;
  }

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a senior QA construction estimator. Review and verify the provided quantity takeoff for accuracy. Return corrected JSON in the same format.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: verificationUserPrompt },
            {
              type: "image_url",
              image_url: { url: imageUrl, detail: "high" },
            },
          ],
        },
      ],
      response_format: RESPONSE_SCHEMA,
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      // If verification fails, return original
      return original;
    }
    let verified = JSON.parse(content) as TakeoffExtractionResult;

    // Post-filter verified results too
    if (selectedDivisions && selectedDivisions.length > 0) {
      verified.items = verified.items.filter((item) =>
        selectedDivisions.includes(item.csiDivision.trim())
      );
    }

    // Sanity check: verified result should have at least as many items as original
    if (verified.items.length < Math.floor(original.items.length * 0.5)) {
      console.warn(`[Takeoff AI] Verification reduced items from ${original.items.length} to ${verified.items.length} — using original`);
      return original;
    }
    return verified;
  } catch (err) {
    console.warn("[Takeoff AI] Verification pass failed, using original extraction:", err);
    return original;
  }
}

// ─── Auto-Detect Trade Specialties ───────────────────────────────────────────────────────

/**
 * Auto-detect trade specialties from the project context summary.
 * Uses keyword matching against detection signals — fast, no extra LLM call.
 */
async function autoDetectSpecialties(
  contextSummary: string,
  selectedDivisions: string[] | null
): Promise<string[]> {
  const contextLower = contextSummary.toLowerCase();
  const detected: string[] = [];

  // Determine which divisions to scan for specialties
  const divisionsToScan = selectedDivisions || Object.keys(
    Object.values(TRADE_SPECIALTIES).reduce((acc, s) => {
      acc[s.divisionCode] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  for (const divCode of divisionsToScan) {
    const specialties = getSpecialtiesForDivision(divCode);
    for (const spec of specialties) {
      // Count how many detection signals match in the context
      let matchCount = 0;
      for (const signal of spec.detectionSignals) {
        if (contextLower.includes(signal.toLowerCase())) {
          matchCount++;
        }
      }
      // Require at least 2 signal matches to avoid false positives
      if (matchCount >= 2) {
        detected.push(spec.id);
        console.log(`[Specialty Detection] Detected "${spec.name}" (${matchCount} signal matches)`);
      }
    }
  }

  return detected;
}

// ─── Main Processing Function ──────────────────────────────────────────────────────────────

/**
 * Process a single drawing sheet through the AI vision pipeline. two-pass approach: extract → verify.
 * @param selectedDivisions - Array of CSI division codes to scope extraction, or null for all
 */
export async function processDrawingSheet(
  sheetId: number,
  imageUrl: string,
  projectId: number,
  selectedDivisions: string[] | null = null,
  currency?: string | null,
  scopeText?: string | null,
  projectContext?: string | null,
  specialtyIds?: string[] | null
): Promise<TakeoffExtractionResult | null> {
  try {
    // Mark sheet as processing
    await updateDrawingSheet(sheetId, { status: "processing" as any });

    // Extraction pass: Extract quantities (scoped to selected divisions, with project context)
    const hasContext = projectContext ? " [with project context]" : "";
    console.log(`[Takeoff AI] Extracting quantities for sheet ${sheetId}${selectedDivisions ? ` (scoped to divisions: ${selectedDivisions.join(",")})` : " (all divisions)"}${hasContext}`);
    const extracted = await extractQuantities(imageUrl, selectedDivisions, currency, scopeText, projectContext, specialtyIds);

    // Verification pass REMOVED for speed optimization.
    // The verification was adding N extra LLM calls (~7-10 min for 15 sheets)
    // but often returned the same or worse results. Accuracy is now handled by:
    // - Better extraction prompts (anti-spec-note rules, scope awareness)
    // - Hard programmatic scope filter in post-processing
    // - 2-phase programmatic dedup + LLM consolidation
    let result = extracted;

    // Delete any existing items for this sheet (for reprocessing)
    await deleteTakeoffItemsBySheet(sheetId);

    // Apply hard scope filter at extraction time — remove out-of-scope divisions before saving to DB
    let itemsToSave = result.items;
    if (scopeText) {
      const rawForFilter = result.items.map((item, idx) => ({
        id: idx,
        projectId,
        sheetId,
        csiDivision: item.csiDivision.trim(),
        csiCode: item.csiCode.trim(),
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unit: item.unit,
        unitCost: Math.round(item.unitCost * 100),
        extendedCost: Math.round(item.quantity * item.unitCost * 100),
        confidence: item.confidence,
        notes: item.notes || null,
        reviewed: false,
      }));
      const filtered = hardScopeFilter(rawForFilter, scopeText);
      const filteredIds = new Set(filtered.map((r: any) => r.id));
      const before = itemsToSave.length;
      itemsToSave = itemsToSave.filter((_: any, idx: number) => filteredIds.has(idx));
      if (before !== itemsToSave.length) {
        console.log(`[Takeoff AI] Scope filter: removed ${before - itemsToSave.length} out-of-scope items from sheet ${sheetId}`);
      }
    }

    // Save extracted items to DB
    if (itemsToSave.length > 0) {
      const itemsToInsert: InsertTakeoffItem[] = itemsToSave.map((item) => ({
        projectId,
        sheetId,
        csiDivision: item.csiDivision.trim(),
        csiCode: item.csiCode.trim(),
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unit: item.unit.toUpperCase().trim(),
        unitCost: Math.round(item.unitCost * 100), // Convert dollars to cents
        extendedCost: Math.round(item.quantity * item.unitCost * 100), // cents
        confidence: Math.min(100, Math.max(0, item.confidence)),
        notes: item.notes,
        reviewed: false,
      }));

      await createTakeoffItemsBatch(itemsToInsert);
    }

    // Update sheet status
    await updateDrawingSheet(sheetId, {
      status: "completed" as any,
      sheetName: result.sheetName,
      sheetType: result.sheetType as any,
      aiRawResponse: JSON.stringify(result),
    });

    console.log(`[Takeoff AI] Sheet ${sheetId} complete: ${result.items.length} items extracted (type: ${result.sheetType})`);
    return result;
  } catch (error: any) {
    console.error(`[Takeoff AI] Error processing sheet ${sheetId}:`, error);
    await updateDrawingSheet(sheetId, {
      status: "error" as any,
      errorMessage: error.message || "Unknown error during AI processing",
    });
    return null;
  }
}

/**
 * Process all pending sheets for a takeoff project.
 * Processes sequentially to avoid rate limiting.
 * Reads selectedDivisions from the project record to scope AI extraction.
 */
export async function processAllPendingSheets(projectId: number): Promise<void> {
  const project = await getTakeoffProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  // Parse selected divisions from project record
  let selectedDivisions: string[] | null = null;
  if (project.selectedDivisions) {
    try {
      const parsed = JSON.parse(project.selectedDivisions);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // If all divisions are selected, treat as null (no scoping)
        if (parsed.length < ALL_TAKEOFF_DIVISION_CODES.length) {
          selectedDivisions = parsed;
        }
      }
    } catch {
      // Invalid JSON — treat as all divisions
    }
  }

  // Parse selected trade specialties from project record
  let specialtyIds: string[] | null = null;
  if (project.selectedSpecialties) {
    try {
      const parsed = JSON.parse(project.selectedSpecialties);
      if (Array.isArray(parsed) && parsed.length > 0) {
        specialtyIds = parsed;
      }
    } catch {
      // Invalid JSON — no specialties
    }
  }

  // If no specialties manually selected, we'll try auto-detection after indexing
  const shouldAutoDetect = !specialtyIds || specialtyIds.length === 0;

  await updateTakeoffProject(projectId, { status: "processing" });

  // ─── TIMING INSTRUMENTATION ──────────────────────────────────────────────
  const pipelineStart = Date.now();
  const timings: Record<string, number> = {};

  // ─── PASS 1: Index All Sheets ──────────────────────────────────────────────
  let projectContextText: string | null = null;
  try {
    const pass1Start = Date.now();
    console.log(`[Takeoff AI] === PASS 1: Indexing all sheets for project ${projectId} ===`);
    const projectContext = await indexAllSheets(projectId);
    timings.pass1_indexing_sec = Math.round((Date.now() - pass1Start) / 1000);
    console.log(`[Takeoff AI] ⏱ Pass 1 (indexing): ${timings.pass1_indexing_sec}s`);
    if (projectContext.contextSummary && projectContext.allElements.length > 0) {
      projectContextText = projectContext.contextSummary;
      console.log(`[Takeoff AI] Pass 1 complete: ${projectContext.sheets.length} sheets indexed, ${projectContext.allElements.length} elements found`);
      if (projectContext.buildingFootprint.areaSF) {
        console.log(`[Takeoff AI] Building footprint: ${projectContext.buildingFootprint.lengthFt?.toFixed(1)}' × ${projectContext.buildingFootprint.widthFt?.toFixed(1)}' = ${projectContext.buildingFootprint.areaSF?.toFixed(0)} SF`);
      }
    } else {
      console.log(`[Takeoff AI] Pass 1 complete but no significant context extracted — proceeding without context`);
    }
  } catch (indexError: any) {
    timings.pass1_indexing_sec = Math.round((Date.now() - pipelineStart) / 1000);
    console.warn(`[Takeoff AI] Pass 1 (indexing) failed — proceeding without context:`, indexError.message);
  }

  // ─── PASS 1.5: Auto-Detect Trade Specialties ───────────────────────────────
  if (shouldAutoDetect && projectContextText) {
    try {
      const detected = await autoDetectSpecialties(projectContextText, selectedDivisions);
      if (detected.length > 0) {
        specialtyIds = detected;
        console.log(`[Takeoff AI] Auto-detected specialties: ${detected.join(", ")}`);
        await updateTakeoffProject(projectId, {
          detectedSpecialties: JSON.stringify(detected),
          selectedSpecialties: JSON.stringify(detected),
        });
      } else {
        console.log(`[Takeoff AI] No specialties auto-detected from context`);
      }
    } catch (detectError: any) {
      console.warn(`[Takeoff AI] Specialty auto-detection failed:`, detectError.message);
    }
  }

  //  // ─── PASS 2: Extract Quantities with Context (PARALLEL) ───────────────
  const pass2Start = Date.now();
  console.log(`[Takeoff AI] === PASS 2: Extracting quantities for project ${projectId} ${projectContextText ? '[with project context]' : '[no context]'} (parallel, concurrency=3) ===`);

  const pendingSheets = await getPendingSheets(projectId);
  let processedCount = project.processedSheets || 0;
  let hasError = false;

  // Skip sheets without images first
  const sheetsToProcess = [];
  for (const sheet of pendingSheets) {
    if (!sheet.imageUrl) {
      await updateDrawingSheet(sheet.id, {
        status: "skipped" as any,
        errorMessage: "No image URL available",
      });
      processedCount++;
    } else {
      sheetsToProcess.push(sheet);
    }
  }

  // Process sheets in parallel batches of 3
  const EXTRACT_CONCURRENCY = 3;
  for (let batchStart = 0; batchStart < sheetsToProcess.length; batchStart += EXTRACT_CONCURRENCY) {
    const batch = sheetsToProcess.slice(batchStart, batchStart + EXTRACT_CONCURRENCY);
    console.log(`[Takeoff AI] Extraction batch ${Math.floor(batchStart / EXTRACT_CONCURRENCY) + 1}: sheets ${batch.map(s => s.id).join(", ")}`);

    const results = await Promise.allSettled(
      batch.map(sheet =>
        processDrawingSheet(sheet.id, sheet.imageUrl!, projectId, selectedDivisions, project.currency, project.scopeText, projectContextText, specialtyIds)
      )
    );

    for (const result of results) {
      processedCount++;
      if (result.status === "rejected" || (result.status === "fulfilled" && !result.value)) {
        hasError = true;
      }
    }

    // Update progress after each batch
    await updateTakeoffProject(projectId, {
      processedSheets: processedCount,
    });
  }

  timings.pass2_extraction_sec = Math.round((Date.now() - pass2Start) / 1000);
  console.log(`[Takeoff AI] ⏱ Pass 2 (extraction): ${timings.pass2_extraction_sec}s`);

  // ─── Post-Processing Pipeline ─────────────────────────────────────────────
  const postProcStart = Date.now();
  const allSheets = await getDrawingSheetsByProject(projectId);
  const completedSheets = allSheets.filter((s: any) => s.status === "completed");
  const errorSheets = allSheets.filter((s: any) => s.status === "error");

  if (completedSheets.length > 0) {
    try {
      console.log(`[Takeoff AI] Starting post-processing pipeline for project ${projectId}...`);
      await updateTakeoffProject(projectId, { status: "post_processing" as any });
      // 10-minute timeout to prevent infinite hangs
      const PP_TIMEOUT_MS = 10 * 60 * 1000;
      const ppTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Post-processing timed out after 10 minutes")), PP_TIMEOUT_MS)
      );
      const ppStats = await Promise.race([postProcessTakeoff(projectId), ppTimeout]);
      timings.pass3_postprocess_sec = Math.round((Date.now() - postProcStart) / 1000);
      console.log(`[Takeoff AI] ⏱ Pass 3 (post-processing): ${timings.pass3_postprocess_sec}s`);
      console.log(`[Takeoff AI] Post-processing complete:`, ppStats);
    } catch (ppError: any) {
      const isTimeout = ppError?.message?.includes("timed out");
      console.error(`[Takeoff AI] Post-processing ${isTimeout ? "timed out" : "failed"} (items preserved from per-sheet extraction):`, ppError.message);
      // If post-processing fails/times out, items from per-sheet extraction are still in DB
      // Recalculate totals and mark timedOut so the frontend can show a warning
      await recalculateProjectTotal(projectId);
      if (isTimeout) {
        await updateTakeoffProject(projectId, { processingTimedOut: true } as any);
      }
    }
  } else {
    // No completed sheets — just recalculate from whatever we have
    await recalculateProjectTotal(projectId);
  }

  // ─── TIMING SUMMARY ──────────────────────────────────────────────────────
  timings.total_sec = Math.round((Date.now() - pipelineStart) / 1000);
  const totalMin = (timings.total_sec / 60).toFixed(1);
  console.log(`[Takeoff AI] ═══════════════════════════════════════════════`);
  console.log(`[Takeoff AI] ⏱ TIMING SUMMARY for project ${projectId}:`);
  console.log(`[Takeoff AI]   Pass 1 (indexing):       ${timings.pass1_indexing_sec || 0}s`);
  console.log(`[Takeoff AI]   Pass 2 (extraction):     ${timings.pass2_extraction_sec || 0}s`);
  console.log(`[Takeoff AI]   Pass 3 (post-processing): ${timings.pass3_postprocess_sec || 0}s`);
  console.log(`[Takeoff AI]   TOTAL:                   ${timings.total_sec}s (${totalMin} min)`);
  console.log(`[Takeoff AI] ═══════════════════════════════════════════════`);

  // Update final status
  const finalStatus = completedSheets.length > 0 ? "completed" : (errorSheets.length > 0 ? "error" : "completed");
  await updateTakeoffProject(projectId, {
    status: finalStatus,
    processedSheets: processedCount,
  });
}
