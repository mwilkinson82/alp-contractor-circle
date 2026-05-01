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
  getProjectMarkups,
} from "./takeoffDb";
import { postProcessTakeoff } from "./takeoffPostProcess";
import { indexAllSheets } from "./takeoffSheetIndex";
import type { InsertTakeoffItem } from "../drizzle/schema";

// CSI Division Reference removed from prompts — V2 pricing engine assigns CSI codes programmatically.
// Keeping a minimal reference for the schema only.
const CSI_DIVISIONS_REFERENCE = ""; // No longer injected into prompts

// ─── Pass 1: Extraction System Prompt ─────────────────────────────────────────

const EXTRACTION_SYSTEM_PROMPT = `You are a senior construction estimator performing a quantity takeoff from a construction drawing.

## TASK
Extract every measurable item visible on this sheet. Be thorough — include everything a contractor would need to price and build.

## PROCESS:
1. Read the title block: sheet name, number, drawing type
2. Classify: floor_plan, elevation, section, detail, schedule, site_plan, structural, mep, electrical, plumbing, hvac, landscape, cover, or other
3. Work systematically — area by area, element by element
4. For each item: description, quantity, unit, and show your math in notes
5. Set unitCost to 1 for ALL items (pricing applied separately)
6. For csiDivision: use your best guess (2-digit, e.g. "03" for concrete). If unsure, use "99"
7. For csiCode: use your best guess (e.g. "03 30 00"). If unsure, use "99 00 00"

## UNITS:
SF (area), LF (linear), CY (volume — always convert CF÷27), EA (count), TON (steel), SQ (roofing 100SF)
Do NOT use LS if you can calculate a real quantity.

## KEY RULES:
- Slabs: extract with area (SF) AND thickness — 4" and 6" slabs are DIFFERENT items
- Footings: total LF from plan view; detail sheets show cross-sections, NOT additional length
- Earthwork: CY only, never CF
- Concrete: specify thickness and application
- Show math in notes (e.g., "110.33' × 82.17' = 9,067 SF")

## CONFIDENCE: 90-100 = labeled dimension, 75-89 = measurable, 60-74 = estimated, 40-59 = inferred, <40 = guess

## DO NOT EXTRACT: spec notes, general notes, code requirements, material specs, construction methods, nailing schedules. Only extract items with measurable physical quantity > 0.`;

// ─── Pass 2: Verification System Prompt ───────────────────────────────────────

const VERIFICATION_SYSTEM_PROMPT = `You are a QA estimator reviewing a quantity takeoff against a construction drawing.

## TASK:
Compare the extracted takeoff to the drawing. Find:
- MISSING items (visible on drawing but not extracted)
- WRONG quantities or units
- Items that should NOT be there (spec notes, not quantities)

## RULES:
- Keep correct items unchanged
- Fix clear quantity/unit errors
- Add missing items you can identify
- Remove only clear spec notes or non-measurable text
- Set unitCost to 1 for ALL items
- For csiDivision/csiCode: keep original values or use best guess
- Show reasoning in notes

## IMPORTANT:
- If extraction looks correct, return it unchanged
- Do NOT reduce item count by more than 30%
- Prefer keeping uncertain items over removing them`;

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

export function shouldVerifyExtraction(
  extracted: TakeoffExtractionResult,
  scaleRatio?: number | null
): { shouldVerify: boolean; reason: string } {
  if (extracted.sheetType === "cover") {
    return { shouldVerify: false, reason: "cover sheet" };
  }
  if (!Array.isArray(extracted.items) || extracted.items.length === 0) {
    return { shouldVerify: false, reason: "no extracted items" };
  }

  const confidences = extracted.items.map((item) => item.confidence || 0);
  const minConfidence = Math.min(...confidences);
  const avgConfidence = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
  const units = extracted.items.map((item) => item.unit.toUpperCase().trim());
  const hasLumpSum = units.includes("LS");
  const hasInvalidQuantity = extracted.items.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0);
  const hasSavedScale = Number.isFinite(scaleRatio) && !!scaleRatio && scaleRatio > 0;
  const hasDetectedScale = !!extracted.detectedScale?.found && extracted.detectedScale.drawingUnitsPerRealUnit > 0;
  const hasScale = hasSavedScale || hasDetectedScale;
  const measurementUnits = new Set(["SF", "LF", "CY", "CF", "SY", "SQ", "BF"]);
  const hasMeasuredQuantities = units.some((unit) => measurementUnits.has(unit));
  const isCountOnly = units.every((unit) => unit === "EA");

  if (hasInvalidQuantity) return { shouldVerify: true, reason: "invalid quantity" };
  if (hasLumpSum) return { shouldVerify: true, reason: "lump-sum quantity needs QA" };
  if (minConfidence < 70) return { shouldVerify: true, reason: "low-confidence item" };
  if (avgConfidence < 85) return { shouldVerify: true, reason: "average confidence below threshold" };
  if (hasMeasuredQuantities && !hasScale) {
    return { shouldVerify: true, reason: "measured quantities without scale context" };
  }
  if (extracted.items.length > 60) {
    return { shouldVerify: true, reason: "large item set needs QA" };
  }
  if (isCountOnly && avgConfidence >= 85 && minConfidence >= 75) {
    return { shouldVerify: false, reason: "high-confidence count-only extraction" };
  }
  if (hasScale && avgConfidence >= 88 && minConfidence >= 75) {
    return { shouldVerify: false, reason: "high-confidence extraction with scale context" };
  }

  return { shouldVerify: true, reason: "standard QA required" };
}

// ─── JSON Repair Helper ────────────────────────────────────────────────────────────────

/**
 * Attempt to repair truncated JSON from LLM responses.
 * Common issue: LLM hits output token limit mid-JSON, producing
 * unterminated strings, missing brackets, etc.
 */
function repairTruncatedJSON(raw: string): any | null {
  // Strategy 1: Try parsing as-is (maybe it's fine)
  try {
    return JSON.parse(raw);
  } catch (_) {}

  // Strategy 2: Find the last complete item in the items array
  // Look for the last valid closing brace before the truncation
  try {
    // Find the items array
    const itemsStart = raw.indexOf('"items"');
    if (itemsStart === -1) return null;

    const arrayStart = raw.indexOf('[', itemsStart);
    if (arrayStart === -1) return null;

    // Walk backwards from end to find the last complete object
    let lastGoodPos = -1;
    let braceDepth = 0;
    let inString = false;
    let escaped = false;

    for (let i = arrayStart; i < raw.length; i++) {
      const ch = raw[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') braceDepth++;
      if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0) {
          lastGoodPos = i;
        }
      }
    }

    if (lastGoodPos > arrayStart) {
      // Truncate after the last complete item, close the array and object
      const repaired = raw.substring(0, lastGoodPos + 1) + '],"detectedScale":{"found":false,"notation":"","drawingUnitsPerRealUnit":0,"realUnit":""}}';
      const parsed = JSON.parse(repaired);
      if (parsed && Array.isArray(parsed.items)) {
        console.log(`[Takeoff AI] JSON repair successful: recovered ${parsed.items.length} items from truncated response`);
        return parsed;
      }
    }
  } catch (_) {}

  // Strategy 3: Try to extract just the items we can find with regex
  try {
    // Extract the portion before truncation and close it
    const trimmed = raw.replace(/,[\s]*$/, ''); // remove trailing comma
    const closers = ']}'; // try closing array + object
    for (let i = 0; i < 5; i++) {
      try {
        const attempt = trimmed + closers.substring(0, i + 1).split('').join('');
        const parsed = JSON.parse(attempt);
        if (parsed) return parsed;
      } catch (_) {}
    }
  } catch (_) {}

  return null;
}

// ─── Pass 1: Extract ─────────────────────────────────────────────────────────────────────

function truncateContext(context: string, maxChars: number): string {
  if (context.length <= maxChars) return context;
  return `${context.slice(0, maxChars)}\n\n[Context truncated to keep the AI request within limits.]`;
}

export function buildScaleCalibrationContext(
  scaleRatio?: number | null,
  scaleUnit?: string | null
): string | null {
  if (!Number.isFinite(scaleRatio) || !scaleRatio || scaleRatio <= 0) return null;

  const unit = scaleUnit?.trim() || "ft";
  const roundedRatio = Number(scaleRatio.toFixed(2));
  return [
    "## USER-CALIBRATED DRAWING SCALE:",
    `The user calibrated this sheet at ${roundedRatio} image pixels per 1 ${unit}.`,
    `Use this calibration when estimating unlabeled lengths and areas: real length = image pixels / ${roundedRatio} ${unit}; real area = image square pixels / ${roundedRatio}^2 ${unit}^2.`,
    "Prefer explicit dimension labels on the drawing when they are available. Use calibration as the fallback for visible but unlabeled measurable quantities.",
  ].join("\n");
}

async function extractPass(
  imageUrl: string,
  scopeText?: string | null,
  projectContext?: string | null,
  scaleRatio?: number | null,
  scaleUnit?: string | null
): Promise<TakeoffExtractionResult> {
  let EXTRACT_PROMPT = "Analyze this construction drawing. Extract every measurable quantity you can see. Be thorough — include every item visible on this sheet. Return your analysis as JSON.";

  if (projectContext && projectContext.trim().length > 0) {
    EXTRACT_PROMPT += `\n\n${truncateContext(projectContext.trim(), 8000)}`;
  }

  // Inject scope context so the AI prioritizes relevant work
  if (scopeText && scopeText.trim().length > 0) {
    EXTRACT_PROMPT += `\n\n## PROJECT SCOPE CONTEXT:\nThe user described this project's scope as: "${scopeText.trim()}"\nPrioritize extracting items that match this scope. Still extract all visible items, but pay special attention to items within the described scope and flag items that may be outside it in the notes field.`;
    console.log(`[Takeoff AI] Scope injected into extraction prompt: "${scopeText.trim().substring(0, 80)}..."`);
  }

  const scaleContext = buildScaleCalibrationContext(scaleRatio, scaleUnit);
  if (scaleContext) {
    EXTRACT_PROMPT += `\n\n${scaleContext}`;
  }

  // Try high detail first, fall back to low detail on 500 (token limit exceeded)
  for (const detail of ["high", "low"] as const) {
    try {
      if (detail === "low") {
        console.log(`[Takeoff AI] Retrying extraction with detail:low (high detail exceeded token limit)`);
      }
      const response = await invokeLLM({
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACT_PROMPT },
              { type: "image_url", image_url: { url: imageUrl, detail } },
            ],
          },
        ],
        response_format: RESPONSE_SCHEMA,
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new Error("No content in extraction response");
      }

      // Try normal parse first, then repair if truncated
      let result: TakeoffExtractionResult;
      try {
        result = JSON.parse(content) as TakeoffExtractionResult;
      } catch (parseErr: any) {
        console.warn(`[Takeoff AI] JSON parse failed (detail:${detail}): ${parseErr.message.slice(0, 100)}`);
        const repaired = repairTruncatedJSON(content);
        if (repaired && Array.isArray(repaired.items)) {
          result = repaired as TakeoffExtractionResult;
        } else {
          throw parseErr; // Can't repair — let the retry logic handle it
        }
      }
      if (!Array.isArray(result.items)) result.items = [];
      return result;
    } catch (err: any) {
      // Detect any error that suggests the image was too large for the LLM:
      // - HTTP 500 / Internal Server Error
      // - gRPC code 13 ("received bad response")
      // - JSON parse failures (LLM returned garbage due to overload)
      // - "bad response" or "token" mentions
      const msg = err?.message || "";
      const isRetryable = 
        msg.includes("500") || 
        msg.includes("Internal Server Error") || 
        msg.includes("code\":13") ||
        msg.includes("code:13") ||
        msg.includes("bad response") ||
        msg.includes("received bad") ||
        msg.includes("token") ||
        msg.includes("Unterminated") ||
        msg.includes("JSON") ||
        err?.status === 500;
      if (detail === "high" && isRetryable) {
        console.log(`[Takeoff AI] Retryable error on high detail: ${msg.slice(0, 120)}`);
        // Will retry with low detail on next loop iteration
        continue;
      }
      throw err;
    }
  }

  // Should never reach here
  throw new Error("extractPass exhausted all detail levels");
}

// ─── Pass 2: Verify / QA ───────────────────────────────────────────────────────

async function verifyPass(
  imageUrl: string,
  extracted: TakeoffExtractionResult,
  scaleRatio?: number | null,
  scaleUnit?: string | null
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
  const scaleContext = buildScaleCalibrationContext(scaleRatio, scaleUnit);

  // Try high detail first, fall back to low detail on 500/token errors
  for (const detail of ["high", "low"] as const) {
    try {
      if (detail === "low") {
        console.log(`[Takeoff AI] Retrying verification with detail:low`);
      }
      const response = await invokeLLM({
        messages: [
          { role: "system", content: VERIFICATION_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Sheet: ${extracted.sheetName} (${extracted.sheetType})${scaleContext ? `\n\n${scaleContext}` : ""}\n\nHere are the ${extracted.items.length} items extracted from this drawing:\n\n${compactSummary}\n\nCompare this list to the drawing. What's missing? What quantities are wrong? Return the full corrected takeoff as JSON.`,
              },
              {
                type: "image_url",
                image_url: { url: imageUrl, detail },
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

      // Try normal parse first, then repair if truncated
      let verified: TakeoffExtractionResult;
      try {
        verified = JSON.parse(content) as TakeoffExtractionResult;
      } catch (parseErr: any) {
        console.warn(`[Takeoff AI] Verify JSON parse failed (detail:${detail}): ${parseErr.message.slice(0, 100)}`);
        const repaired = repairTruncatedJSON(content);
        if (repaired && Array.isArray(repaired.items)) {
          verified = repaired as TakeoffExtractionResult;
        } else if (detail === "high") {
          // Try low detail next
          continue;
        } else {
          // Both details failed — use extraction result
          console.warn("[Takeoff AI] Verification JSON repair failed — using extraction result");
          return extracted;
        }
      }
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
    } catch (err: any) {
      const msg = err?.message || "";
      const isRetryable =
        msg.includes("500") ||
        msg.includes("Internal Server Error") ||
        msg.includes("code\":13") ||
        msg.includes("code:13") ||
        msg.includes("bad response") ||
        msg.includes("received bad") ||
        msg.includes("token") ||
        msg.includes("Unterminated") ||
        msg.includes("JSON") ||
        err?.status === 500;
      if (detail === "high" && isRetryable) {
        console.log(`[Takeoff AI] Verify retryable error on high detail: ${msg.slice(0, 120)}`);
        continue;
      }
      console.warn("[Takeoff AI] Verification pass failed — using extraction result:", err);
      return extracted;
    }
  }
  // Exhausted both detail levels
  console.warn("[Takeoff AI] Verification exhausted all detail levels — using extraction result");
  return extracted;
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
  _alreadyExtracted?: string | null,
  _retryAttempt: number = 0
): Promise<TakeoffExtractionResult | null> {
  const MAX_AUTO_RETRIES = 1; // Auto-retry once on transient 500 errors
  try {
    await updateDrawingSheet(sheetId, { status: "processing" as any });

    console.log(`[Takeoff AI] Pass 1 — Extracting sheet ${sheetId}${_retryAttempt > 0 ? ` (auto-retry #${_retryAttempt})` : ''}...`);
    const extracted = await extractPass(imageUrl, _scopeText, _projectContext, _scaleRatio, _scaleUnit);
    console.log(`[Takeoff AI] Pass 1 complete: ${extracted.items.length} items (type: ${extracted.sheetType})`);

    const verificationDecision = shouldVerifyExtraction(extracted, _scaleRatio);
    let result = extracted;
    if (verificationDecision.shouldVerify) {
      console.log(`[Takeoff AI] Pass 2 — Verifying sheet ${sheetId} (${verificationDecision.reason})...`);
      result = await verifyPass(imageUrl, extracted, _scaleRatio, _scaleUnit);
      console.log(`[Takeoff AI] Pass 2 complete: ${result.items.length} items final`);
    } else {
      console.log(`[Takeoff AI] Pass 2 skipped for sheet ${sheetId}: ${verificationDecision.reason}`);
    }

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
    // Auto-retry on transient 500/LLM errors before marking as error
    const msg = error?.message || "";
    const isTransient =
      msg.includes("500") ||
      msg.includes("Internal Server Error") ||
      msg.includes("code\":13") ||
      msg.includes("code:13") ||
      msg.includes("bad response") ||
      msg.includes("received bad");
    if (isTransient && _retryAttempt < MAX_AUTO_RETRIES) {
      console.log(`[Takeoff AI] Transient error on sheet ${sheetId} — auto-retrying in 5s (attempt ${_retryAttempt + 1}/${MAX_AUTO_RETRIES})...`);
      await new Promise((r) => setTimeout(r, 5000)); // 5s backoff
      return processDrawingSheet(
        sheetId, imageUrl, projectId,
        _selectedDivisions, _currency, _scopeText, _projectContext,
        _specialtyIds, _scaleRatio, _scaleUnit, _projectType,
        _workType, _region, _alreadyExtracted,
        _retryAttempt + 1
      );
    }
    console.error(`[Takeoff AI] Error processing sheet ${sheetId}${_retryAttempt > 0 ? ' (after auto-retry)' : ''}:`, error);
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
  const pendingSheets = await getPendingSheets(projectId);

  // ─── PASS 1: Index All Sheets (classify types, detect cover sheets) ──────────
  // We run indexing to classify sheet types, skip cover sheets, and provide
  // compact project context to each sheet extraction.
  let projectContextSummary: string | null = null;
  if (pendingSheets.length > 0) {
    try {
      const pass1Start = Date.now();
      console.log(`[Takeoff AI] === PASS 1: Indexing sheets for project ${projectId} (type classification only) ===`);
      const projectContext = await indexAllSheets(projectId);
      projectContextSummary = projectContext.contextSummary;
      timings.pass1_indexing_sec = Math.round((Date.now() - pass1Start) / 1000);
      console.log(`[Takeoff AI] ⏱ Pass 1 (indexing): ${timings.pass1_indexing_sec}s`);
    } catch (indexError: any) {
      timings.pass1_indexing_sec = Math.round((Date.now() - pipelineStart) / 1000);
      console.warn(`[Takeoff AI] Pass 1 (indexing) failed — proceeding without sheet type classification:`, indexError.message);
    }
  } else {
    timings.pass1_indexing_sec = 0;
    console.log(`[Takeoff AI] No pending sheets for project ${projectId}; skipping indexing/extraction and running post-processing only.`);
  }

  // ─── PASS 2: Extract + Verify (parallel, concurrency=6) ──────────────────────
  const pass2Start = Date.now();
  console.log(`[Takeoff AI] === PASS 2: Two-pass extraction for project ${projectId} (parallel, concurrency=6) ===`);

  let processedCount = project.processedSheets || 0;
  let hasError = false;
  const savedScalesBySheetId = new Map<number, { ratio: number; unit: string }>();
  if (project.memberId) {
    try {
      const markups = await getProjectMarkups(projectId, project.memberId);
      for (const markup of markups) {
        const ratio = parseFloat(markup.scaleRatio as unknown as string);
        if (Number.isFinite(ratio) && ratio > 0) {
          savedScalesBySheetId.set(markup.sheetId, {
            ratio,
            unit: markup.scaleUnit || "ft",
          });
        }
      }
      if (savedScalesBySheetId.size > 0) {
        console.log(`[Takeoff AI] Loaded saved scale calibration for ${savedScalesBySheetId.size} sheet(s).`);
      }
    } catch (scaleError: any) {
      console.warn(`[Takeoff AI] Failed to load saved scale calibration — proceeding without it:`, scaleError.message);
    }
  }

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
      batch.map((sheet) => {
        const savedScale = savedScalesBySheetId.get(sheet.id);
        return processDrawingSheet(
          sheet.id,
          sheet.imageUrl!,
          projectId,
          null, // selectedDivisions — filtering done in post-processing
          null, // currency
          project.scopeText || null, // scopeText — injected into extraction prompt
          projectContextSummary,
          null, // specialtyIds
          savedScale?.ratio ?? null,
          savedScale?.unit ?? null
        );
      })
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
