/**
 * AI Quantity Takeoff Pipeline — Two-Pass Per Sheet
 *
 * Pass 1 — Extraction:
 *   Clean, simple prompt. "What needs to be built here? Give me every item and quantity."
 *   No cross-sheet context, no scope injection, no rate profile, no specialty library.
 *   The AI reads the drawing holistically and returns a raw itemized takeoff.
 *
 * Pass 2 — Verification / QA:
 *   Send the same drawing image AGAIN with the Pass 1 results.
 *   "Here's what was extracted. Compare to the drawing. What's missing? What's wrong?"
 *   The AI acts as its own QA checker. Corrections are merged back into the final result.
 *
 * Post-processing (separate step, not in these prompts):
 *   - Programmatic dedup
 *   - LLM consolidation across sheets
 *   - Lump-sum enhancement
 *   - Formwork generation
 *   - Rebar enhancement
 *   - RS Means / cost table pricing
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
import { postProcessTakeoff } from "./takeoffPostProcess";
import { indexAllSheets } from "./takeoffSheetIndex";
import type { InsertTakeoffItem } from "../drizzle/schema";

// ─── CSI Division Reference (compact — for classification only) ────────────────

const CSI_DIVISIONS_REFERENCE = `
CSI DIVISION REFERENCE (for classification):
01 - General Requirements (mobilization, temp facilities, project management)
02 - Existing Conditions (demolition, site clearing, hazmat abatement)
03 - Concrete (footings, slabs, walls, piers — SF, LF, CY, EA)
04 - Masonry (CMU block, brick, stone — SF, EA)
05 - Metals (structural steel, misc metals — TON, LF)
06 - Wood, Plastics & Composites (framing, sheathing, millwork — BF, LF, SF)
07 - Thermal & Moisture Protection (roofing, insulation, waterproofing — SF, SQ)
08 - Openings (doors, windows, hardware — EA)
09 - Finishes (drywall, flooring, paint, tile — SF, SY)
10 - Specialties (toilet accessories, signage, lockers — EA, LS)
11 - Equipment (appliances, kitchen equipment — EA)
12 - Furnishings (casework, window treatments — LF, EA)
13 - Special Construction (pools, clean rooms — LS, SF)
14 - Conveying Equipment (elevators, escalators — EA)
21 - Fire Suppression (sprinkler heads, pipes — EA, LF)
22 - Plumbing (fixtures, pipes, water heater — EA, LF)
23 - HVAC (equipment, ductwork, diffusers — EA, TON, LF)
26 - Electrical (panels, devices, conduit, fixtures — EA, LF)
27 - Communications (data, phone, AV — EA, LF)
28 - Electronic Safety & Security (cameras, access control — EA)
31 - Earthwork (grading, excavation, fill — CY, AC)
32 - Exterior Improvements (paving, landscaping, curbs — SF, LF, SY)
33 - Utilities (underground piping, manholes — LF, EA)
`.trim();

// ─── Pass 1: Extraction System Prompt ─────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a senior construction estimator with 20+ years of experience performing quantity takeoffs from construction drawings. You work for a general contractor and produce accurate, detailed quantity takeoffs used for bidding.

## YOUR TASK
Look at this construction drawing holistically — the notes, the details, the dimensions, the construction processes required to build what's shown. Give back an itemized takeoff of every measurable quantity visible on this sheet.

## PROCESS:
1. Read the title block: get the sheet name, number, and drawing type
2. Classify the sheet type: floor_plan, elevation, section, detail, schedule, site_plan, structural, mep, electrical, plumbing, hvac, landscape, cover, or other
3. Work through the drawing systematically — area by area, room by room, or system by system
4. Extract EVERY measurable item — be thorough, not selective
5. Assign CSI codes: every item gets a 2-digit division code AND a full 6-digit CSI code
6. Set unitCost to 1 for ALL items — pricing is applied separately after extraction
7. Show your math in the notes field (e.g., "110.33' × 82.17' = 9,067 SF")

## UNITS — USE INDUSTRY STANDARD:
- Area: SF (square feet)
- Linear: LF (linear feet)
- Volume: CY (cubic yards) — always convert CF to CY (divide by 27)
- Count: EA (each)
- Steel: TON
- Roofing: SQ (100 SF) for shingles/membrane, SF for metal
- Do NOT use LS (lump sum) if you can calculate a real quantity

## MEASUREMENT RULES:
- Floor areas: net interior dimensions, not gross footprint
- Wall lengths: centerline measurement
- Concrete: always specify thickness and application
- Framing: specify member size, spacing, and orientation
- Earthwork: CY only, never CF
- Slabs: ALWAYS extract with area (SF) and thickness — 4" and 6" slabs are DIFFERENT items
- Footings: get total LF from plan view; detail sheets show cross-sections, NOT additional length
- Spread footings: EA with dimensions, calculate CY if dimensions given

## CONFIDENCE SCORING:
- 90-100: Dimension explicitly labeled on drawing
- 75-89: Can be measured from scaled drawing or counted directly
- 60-74: Estimated from typical construction ratios or partial information
- 40-59: Inferred from context, drawing is unclear
- Below 40: Best guess, drawing very unclear

## DO NOT EXTRACT:
- Specification notes (e.g., "Grade 60 KSI yield strength", "ASTM A36")
- General notes (e.g., "All dimensions shall be verified")
- Code requirements (e.g., "Conform to AISC")
- Material specifications (e.g., "Southern Pine No. 2 Grade")
- Construction methods (e.g., "Trusses shall be cambered")
- Nailing/fastening schedules
- Any text describing HOW to build rather than WHAT to build

A valid takeoff item MUST have a measurable physical quantity > 0 that a contractor can order or install.

${CSI_DIVISIONS_REFERENCE}`;

// ─── Pass 2: Verification System Prompt ───────────────────────────────────────

const VERIFICATION_SYSTEM_PROMPT = `You are a senior QA construction estimator reviewing a quantity takeoff for accuracy and completeness.

## YOUR TASK
You are given:
1. A construction drawing image
2. A quantity takeoff that was extracted from this drawing

Compare the takeoff to what you see in the drawing. Your job:
- Find items that are MISSING from the takeoff (visible on the drawing but not extracted)
- Find items with WRONG quantities (quantity doesn't match what's shown)
- Find items with WRONG units (e.g., should be CY not SF)
- Find items that should NOT be there (spec notes, not actual quantities)
- DO NOT remove items just because you're unsure — only remove clear errors

## RULES:
- Keep all items that look correct — do not change them
- Fix quantities and units where you can see a clear error
- Add missing items you can identify from the drawing
- Remove items that are clearly spec notes or non-measurable text
- Set unitCost to 1 for ALL items
- Show your reasoning in the notes field

## IMPORTANT:
- If the original extraction looks correct, return it unchanged
- Do not reduce the item count by more than 30% — if you're removing that many items, you're being too aggressive
- Prefer keeping items with lower confidence over removing them — the post-processor will handle dedup

${CSI_DIVISIONS_REFERENCE}`;

// ─── Response Schema (shared for both passes) ─────────────────────────────────

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
              notes: { type: "string", description: "How quantity was measured or estimated. Show math." },
            },
            required: ["csiDivision", "csiCode", "description", "quantity", "unit", "unitCost", "confidence", "notes"],
            additionalProperties: false,
          },
        },
        detectedScale: {
          type: "object",
          description: "Scale notation found on the drawing, if any.",
          properties: {
            found: { type: "boolean" },
            notation: { type: "string", description: "Exact scale text, e.g. '1/4\" = 1'-0\"'. Empty if not found." },
            drawingUnitsPerRealUnit: { type: "number", description: "Ratio of drawing units to real-world units. 0 if not found." },
            realUnit: { type: "string", description: "Real-world unit: 'ft', 'm', 'in'. Empty if not found." },
          },
          required: ["found", "notation", "drawingUnitsPerRealUnit", "realUnit"],
          additionalProperties: false,
        },
      },
      required: ["sheetName", "sheetType", "items", "detectedScale"],
      additionalProperties: false,
    },
  },
};

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

interface DetectedScale {
  found: boolean;
  notation: string;
  drawingUnitsPerRealUnit: number;
  realUnit: string;
}

interface TakeoffExtractionResult {
  sheetName: string;
  sheetType: string;
  items: TakeoffItem[];
  detectedScale?: DetectedScale;
}

// ─── Pass 1: Extract ───────────────────────────────────────────────────────────

async function extractPass(imageUrl: string): Promise<TakeoffExtractionResult> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this construction drawing. Extract every measurable quantity you can see. Be thorough — include every item visible on this sheet. Return your analysis as JSON.",
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
    throw new Error("No content in extraction response");
  }

  const result = JSON.parse(content) as TakeoffExtractionResult;
  if (!Array.isArray(result.items)) result.items = [];
  return result;
}

// ─── Pass 2: Verify / QA ───────────────────────────────────────────────────────

async function verifyPass(
  imageUrl: string,
  extracted: TakeoffExtractionResult
): Promise<TakeoffExtractionResult> {
  // Skip verification for cover sheets or empty extractions
  if (extracted.sheetType === "cover" || extracted.items.length === 0) {
    return extracted;
  }

  // Build a compact summary — just description + quantity + unit per item.
  // Sending the full JSON with notes/csiCode/confidence bloats the prompt and
  // causes LLM 500 errors on large sheets (image + JSON exceeds token limit).
  const compactSummary = extracted.items
    .map((item, i) => `${i + 1}. [${item.csiDivision}] ${item.description} — ${item.quantity} ${item.unit}`)
    .join("\n");

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: VERIFICATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Sheet: ${extracted.sheetName} (${extracted.sheetType})\n\nHere are the ${extracted.items.length} items extracted from this drawing:\n\n${compactSummary}\n\nCompare this list to the drawing. What's missing? What quantities are wrong? Return the full corrected takeoff as JSON.`,
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
      console.warn("[Takeoff AI] Verification pass returned no content — using extraction result");
      return extracted;
    }

    const verified = JSON.parse(content) as TakeoffExtractionResult;
    if (!Array.isArray(verified.items)) verified.items = [];

    // Safety check: if verification removes more than 40% of items, something went wrong — use original
    if (verified.items.length < extracted.items.length * 0.6) {
      console.warn(
        `[Takeoff AI] Verification reduced items from ${extracted.items.length} to ${verified.items.length} (>40% drop) — using extraction result`
      );
      return extracted;
    }

    const added = verified.items.length - extracted.items.length;
    console.log(
      `[Takeoff AI] Verification: ${extracted.items.length} → ${verified.items.length} items (${added >= 0 ? "+" : ""}${added} changes)`
    );
    return verified;
  } catch (err) {
    console.warn("[Takeoff AI] Verification pass failed — using extraction result:", err);
    return extracted;
  }
}

// ─── Main Sheet Processing Function ───────────────────────────────────────────

/**
 * Process a single drawing sheet through the two-pass AI pipeline.
 * Pass 1: Extract quantities from the drawing image.
 * Pass 2: Verify and QA the extraction against the same image.
 */
export async function processDrawingSheet(
  sheetId: number,
  imageUrl: string,
  projectId: number,
  // Legacy params kept for API compatibility — not used in prompts
  _selectedDivisions?: string[] | null,
  _currency?: string | null,
  _scopeText?: string | null,
  _projectContext?: string | null,
  _specialtyIds?: string[] | null,
  _scaleRatio?: number | null,
  _scaleUnit?: string | null,
  _projectType?: string | null,
  _workType?: string | null,
  _region?: string | null,
  _alreadyExtracted?: string | null
): Promise<TakeoffExtractionResult | null> {
  try {
    await updateDrawingSheet(sheetId, { status: "processing" as any });

    console.log(`[Takeoff AI] Pass 1 — Extracting sheet ${sheetId}...`);
    const extracted = await extractPass(imageUrl);
    console.log(`[Takeoff AI] Pass 1 complete: ${extracted.items.length} items (type: ${extracted.sheetType})`);

    console.log(`[Takeoff AI] Pass 2 — Verifying sheet ${sheetId}...`);
    const result = await verifyPass(imageUrl, extracted);
    console.log(`[Takeoff AI] Pass 2 complete: ${result.items.length} items final`);

    // Delete any existing items for this sheet (reprocessing)
    await deleteTakeoffItemsBySheet(sheetId);

    // Save items to DB
    if (result.items.length > 0) {
      const itemsToInsert: InsertTakeoffItem[] = result.items.map((item) => ({
        projectId,
        sheetId,
        csiDivision: item.csiDivision.trim(),
        csiCode: item.csiCode.trim(),
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unit: item.unit.toUpperCase().trim(),
        unitCost: Math.round(item.unitCost * 100), // dollars to cents
        extendedCost: Math.round(item.quantity * item.unitCost * 100), // cents
        confidence: Math.min(100, Math.max(0, item.confidence)),
        notes: item.notes,
        reviewed: false,
      }));
      await createTakeoffItemsBatch(itemsToInsert);
    }

    // Log detected scale if found
    if (result.detectedScale?.found && result.detectedScale.drawingUnitsPerRealUnit > 0) {
      console.log(
        `[Takeoff AI] Auto-detected scale on sheet ${sheetId}: ${result.detectedScale.notation} (${result.detectedScale.drawingUnitsPerRealUnit} ${result.detectedScale.realUnit})`
      );
    }

    // Mark sheet complete — clear any previous error
    await updateDrawingSheet(sheetId, {
      status: "completed" as any,
      sheetName: result.sheetName,
      sheetType: result.sheetType as any,
      aiRawResponse: JSON.stringify(result),
      errorMessage: null,
    });

    console.log(`[Takeoff AI] Sheet ${sheetId} done: ${result.items.length} items`);
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

// ─── Batch Processing ──────────────────────────────────────────────────────────

/**
 * Process all pending sheets for a takeoff project.
 * Uses parallel batches of 6 for maximum throughput.
 * Pass 1 (sheet indexing) still runs to classify sheet types and detect cover sheets.
 */
export async function processAllPendingSheets(projectId: number): Promise<void> {
  const project = await getTakeoffProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  await updateTakeoffProject(projectId, { status: "processing" });

  const pipelineStart = Date.now();
  const timings: Record<string, number> = {};

  // ─── PASS 1: Index All Sheets (classify types, detect cover sheets) ──────────
  // We still run indexing to classify sheet types so we can skip cover sheets.
  // The context summary is NOT injected into extraction prompts.
  try {
    const pass1Start = Date.now();
    console.log(`[Takeoff AI] === PASS 1: Indexing sheets for project ${projectId} (type classification only) ===`);
    await indexAllSheets(projectId);
    timings.pass1_indexing_sec = Math.round((Date.now() - pass1Start) / 1000);
    console.log(`[Takeoff AI] ⏱ Pass 1 (indexing): ${timings.pass1_indexing_sec}s`);
  } catch (indexError: any) {
    timings.pass1_indexing_sec = Math.round((Date.now() - pipelineStart) / 1000);
    console.warn(`[Takeoff AI] Pass 1 (indexing) failed — proceeding without sheet type classification:`, indexError.message);
  }

  // ─── PASS 2: Extract + Verify (parallel, concurrency=6) ──────────────────────
  const pass2Start = Date.now();
  console.log(`[Takeoff AI] === PASS 2: Two-pass extraction for project ${projectId} (parallel, concurrency=6) ===`);

  const pendingSheets = await getPendingSheets(projectId);
  let processedCount = project.processedSheets || 0;
  let hasError = false;

  // Skip cover sheets — they have no measurable quantities
  const CONTEXT_ONLY_SHEET_TYPES = new Set(["cover"]);

  const sheetsToProcess = [];
  for (const sheet of pendingSheets) {
    if (!sheet.imageUrl) {
      await updateDrawingSheet(sheet.id, {
        status: "skipped" as any,
        errorMessage: "No image URL available",
      });
      processedCount++;
    } else if (CONTEXT_ONLY_SHEET_TYPES.has(sheet.sheetType)) {
      console.log(`[Takeoff AI] Skipping cover sheet ${sheet.id} (${sheet.sheetName}) — no measurable quantities`);
      await updateDrawingSheet(sheet.id, {
        status: "completed" as any,
        errorMessage: null,
        aiRawResponse: JSON.stringify({
          contextOnly: true,
          reason: `Cover sheet — no measurable quantities.`,
          items: [],
        }),
      });
      processedCount++;
      await updateTakeoffProject(projectId, { processedSheets: processedCount });
    } else {
      sheetsToProcess.push(sheet);
    }
  }

  const skippedCount = pendingSheets.length - sheetsToProcess.length;
  if (skippedCount > 0) {
    console.log(`[Takeoff AI] ${skippedCount} sheet(s) skipped. ${sheetsToProcess.length} sheets queued for extraction.`);
  }

  // Process in parallel batches of 6
  const EXTRACT_CONCURRENCY = 6;
  for (let batchStart = 0; batchStart < sheetsToProcess.length; batchStart += EXTRACT_CONCURRENCY) {
    const batch = sheetsToProcess.slice(batchStart, batchStart + EXTRACT_CONCURRENCY);
    console.log(
      `[Takeoff AI] Extraction batch ${Math.floor(batchStart / EXTRACT_CONCURRENCY) + 1}: sheets ${batch.map((s) => s.id).join(", ")}`
    );

    const results = await Promise.allSettled(
      batch.map((sheet) =>
        processDrawingSheet(
          sheet.id,
          sheet.imageUrl!,
          projectId
          // No context params passed — clean two-pass extraction
        )
      )
    );

    for (const result of results) {
      processedCount++;
      if (result.status === "rejected" || (result.status === "fulfilled" && !result.value)) {
        hasError = true;
      }
    }

    await updateTakeoffProject(projectId, { processedSheets: processedCount });
  }

  timings.pass2_extraction_sec = Math.round((Date.now() - pass2Start) / 1000);
  console.log(`[Takeoff AI] ⏱ Pass 2 (extraction + verification): ${timings.pass2_extraction_sec}s`);

  // ─── Post-Processing Pipeline ─────────────────────────────────────────────────
  const postProcStart = Date.now();
  const allSheets = await getDrawingSheetsByProject(projectId);
  const completedSheets = allSheets.filter((s: any) => s.status === "completed");
  const errorSheets = allSheets.filter((s: any) => s.status === "error");

  if (completedSheets.length > 0) {
    try {
      console.log(`[Takeoff AI] Starting post-processing for project ${projectId}...`);
      await updateTakeoffProject(projectId, { status: "post_processing" as any });

      // 10-minute timeout to prevent infinite hangs
      const PP_TIMEOUT_MS = 10 * 60 * 1000;
      const ppTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Post-processing timed out after 10 minutes")), PP_TIMEOUT_MS)
      );
      const ppStats = await Promise.race([postProcessTakeoff(projectId), ppTimeout]);
      timings.pass3_postprocess_sec = Math.round((Date.now() - postProcStart) / 1000);
      console.log(`[Takeoff AI] ⏱ Post-processing: ${timings.pass3_postprocess_sec}s`);
      console.log(`[Takeoff AI] Post-processing complete:`, ppStats);
    } catch (ppError: any) {
      const isTimeout = ppError?.message?.includes("timed out");
      console.error(
        `[Takeoff AI] Post-processing ${isTimeout ? "timed out" : "failed"} (per-sheet items preserved):`,
        ppError.message
      );
      await recalculateProjectTotal(projectId);
      if (isTimeout) {
        await updateTakeoffProject(projectId, { processingTimedOut: true } as any);
      }
    }
  } else {
    await recalculateProjectTotal(projectId);
  }

  // ─── Timing Summary ───────────────────────────────────────────────────────────
  timings.total_sec = Math.round((Date.now() - pipelineStart) / 1000);
  const totalMin = (timings.total_sec / 60).toFixed(1);
  console.log(`[Takeoff AI] ═══════════════════════════════════════════════`);
  console.log(`[Takeoff AI] ⏱ TIMING SUMMARY for project ${projectId}:`);
  console.log(`[Takeoff AI]   Pass 1 (indexing):          ${timings.pass1_indexing_sec || 0}s`);
  console.log(`[Takeoff AI]   Pass 2 (extract+verify):    ${timings.pass2_extraction_sec || 0}s`);
  console.log(`[Takeoff AI]   Pass 3 (post-processing):   ${timings.pass3_postprocess_sec || 0}s`);
  console.log(`[Takeoff AI]   TOTAL:                      ${timings.total_sec}s (${totalMin} min)`);
  console.log(`[Takeoff AI] ═══════════════════════════════════════════════`);

  const finalStatus =
    completedSheets.length > 0 ? "completed" : errorSheets.length > 0 ? "error" : "completed";
  await updateTakeoffProject(projectId, {
    status: finalStatus,
    processedSheets: processedCount,
    lastAnalyzedAt: new Date(),
  } as any);
}
