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
import { indexAllSheets, type SheetIndexEntry } from "./takeoffSheetIndex";
import type { InsertTakeoffItem } from "../drizzle/schema";
import {
  buildScopeIntent,
  buildScopeIntentPrompt,
} from "../shared/scopeIntent";
import { TRADE_SPECIALTIES } from "../shared/tradeSpecialties";
import { getBidModeBehavior } from "../shared/bidMode";
import { storageUrlToDataUrl } from "./storage";
import {
  TAKEOFF_PROMPT_VERSIONS,
  getTakeoffModelProfile,
  invokeTrackedTakeoffLLM,
} from "./takeoffAiAudit";
import {
  createTakeoffAnalysisRun,
  summarizeTakeoffAnalysisRun,
  updateTakeoffAnalysisRun,
} from "./takeoffObservabilityDb";
import { refreshTakeoffQaFindings } from "./takeoffQaFindings";

// CSI Division Reference removed from prompts — V2 pricing engine assigns CSI codes programmatically.
// Keeping a minimal reference for the schema only.
const CSI_DIVISIONS_REFERENCE = ""; // No longer injected into prompts
const DEFAULT_INDEX_PASS_TIMEOUT_MS = 12 * 60 * 1000;

function positiveNumberFromEnv(names: string[]): number | null {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function getIndexPassTimeoutMs(): number {
  return (
    positiveNumberFromEnv([
      "CONSTRUCTLINE_INDEX_PASS_TIMEOUT_MS",
      "TAKEOFF_INDEX_PASS_TIMEOUT_MS",
    ]) || DEFAULT_INDEX_PASS_TIMEOUT_MS
  );
}

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        new Error(`${label} timed out after ${Math.round(timeoutMs / 1000)}s`)
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

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
          description:
            "Sheet name/number from title block, e.g. 'A1.1 - First Floor Plan'",
        },
        sheetType: {
          type: "string",
          enum: [
            "floor_plan",
            "elevation",
            "section",
            "detail",
            "schedule",
            "site_plan",
            "structural",
            "mep",
            "electrical",
            "plumbing",
            "hvac",
            "landscape",
            "cover",
            "other",
          ],
          description: "Type of drawing sheet",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              csiDivision: {
                type: "string",
                description: "2-digit CSI division code, e.g. '03'",
              },
              csiCode: {
                type: "string",
                description: "Full 6-digit CSI code e.g. '03 30 00'",
              },
              description: {
                type: "string",
                description:
                  "Detailed item description including size, type, material",
              },
              quantity: {
                type: "number",
                description: "Numeric quantity value",
              },
              unit: {
                type: "string",
                description:
                  "Unit of measure: SF, LF, CY, EA, TON, SQ, BF, LB, LS, etc.",
              },
              unitCost: {
                type: "number",
                description:
                  "Set to 1 for all items (pricing applied from cost database)",
              },
              confidence: {
                type: "integer",
                description: "Confidence score 0-100 in quantity accuracy",
              },
              notes: {
                type: "string",
                description:
                  "How quantity was measured or estimated. Show math.",
              },
            },
            required: [
              "csiDivision",
              "csiCode",
              "description",
              "quantity",
              "unit",
              "unitCost",
              "confidence",
              "notes",
            ],
            additionalProperties: false,
          },
        },
        detectedScale: {
          type: "object",
          description: "Scale notation found on the drawing, if any.",
          properties: {
            found: { type: "boolean" },
            notation: {
              type: "string",
              description:
                "Exact scale text, e.g. '1/4\" = 1'-0\"'. Empty if not found.",
            },
            drawingUnitsPerRealUnit: {
              type: "number",
              description:
                "Ratio of drawing units to real-world units. 0 if not found.",
            },
            realUnit: {
              type: "string",
              description:
                "Real-world unit: 'ft', 'm', 'in'. Empty if not found.",
            },
          },
          required: [
            "found",
            "notation",
            "drawingUnitsPerRealUnit",
            "realUnit",
          ],
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

type TakeoffTraceContext = {
  projectId: number;
  sheetId: number;
  runId?: number | null;
  retryAttempt?: number;
};

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

  const confidences = extracted.items.map(item => item.confidence || 0);
  const minConfidence = Math.min(...confidences);
  const avgConfidence =
    confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
  const units = extracted.items.map(item => item.unit.toUpperCase().trim());
  const hasLumpSum = units.includes("LS");
  const hasInvalidQuantity = extracted.items.some(
    item => !Number.isFinite(item.quantity) || item.quantity <= 0
  );
  const hasSavedScale =
    Number.isFinite(scaleRatio) && !!scaleRatio && scaleRatio > 0;
  const hasDetectedScale =
    !!extracted.detectedScale?.found &&
    extracted.detectedScale.drawingUnitsPerRealUnit > 0;
  const hasScale = hasSavedScale || hasDetectedScale;
  const measurementUnits = new Set(["SF", "LF", "CY", "CF", "SY", "SQ", "BF"]);
  const hasMeasuredQuantities = units.some(unit => measurementUnits.has(unit));
  const isCountOnly = units.every(unit => unit === "EA");

  if (hasInvalidQuantity)
    return { shouldVerify: true, reason: "invalid quantity" };
  if (hasLumpSum)
    return { shouldVerify: true, reason: "lump-sum quantity needs QA" };
  if (minConfidence < 70)
    return { shouldVerify: true, reason: "low-confidence item" };
  if (avgConfidence < 85)
    return { shouldVerify: true, reason: "average confidence below threshold" };
  if (hasMeasuredQuantities && !hasScale) {
    return {
      shouldVerify: true,
      reason: "measured quantities without scale context",
    };
  }
  if (extracted.items.length > 60) {
    return { shouldVerify: true, reason: "large item set needs QA" };
  }
  if (isCountOnly && avgConfidence >= 85 && minConfidence >= 75) {
    return {
      shouldVerify: false,
      reason: "high-confidence count-only extraction",
    };
  }
  if (hasScale && avgConfidence >= 88 && minConfidence >= 75) {
    return {
      shouldVerify: false,
      reason: "high-confidence extraction with scale context",
    };
  }

  return { shouldVerify: true, reason: "standard QA required" };
}

export function shouldVerifyExtractionForBidMode(
  extracted: TakeoffExtractionResult,
  bidMode?: string | null,
  scaleRatio?: number | null
): { shouldVerify: boolean; reason: string } {
  const behavior = getBidModeBehavior(bidMode);
  const base = shouldVerifyExtraction(extracted, scaleRatio);

  if (behavior.verification === "standard") return base;

  if (behavior.verification === "fast_default") {
    const hasInvalidQuantity = extracted.items.some(
      item => !Number.isFinite(item.quantity) || item.quantity <= 0
    );
    if (hasInvalidQuantity) return base;
    return {
      shouldVerify: false,
      reason: `${behavior.label} fast default; scope safety runs in post-processing`,
    };
  }

  const hasInvalidQuantity = extracted.items.some(
    item => !Number.isFinite(item.quantity) || item.quantity <= 0
  );
  const hasLumpSum = extracted.items.some(
    item => item.unit.toUpperCase().trim() === "LS"
  );
  const minConfidence =
    extracted.items.length > 0
      ? Math.min(...extracted.items.map(item => item.confidence || 0))
      : 0;
  if (hasInvalidQuantity || hasLumpSum || minConfidence < 60) return base;
  return { shouldVerify: false, reason: "fast scope check minimal QA" };
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

    const arrayStart = raw.indexOf("[", itemsStart);
    if (arrayStart === -1) return null;

    // Walk backwards from end to find the last complete object
    let lastGoodPos = -1;
    let braceDepth = 0;
    let inString = false;
    let escaped = false;

    for (let i = arrayStart; i < raw.length; i++) {
      const ch = raw[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{") braceDepth++;
      if (ch === "}") {
        braceDepth--;
        if (braceDepth === 0) {
          lastGoodPos = i;
        }
      }
    }

    if (lastGoodPos > arrayStart) {
      // Truncate after the last complete item, close the array and object
      const repaired =
        raw.substring(0, lastGoodPos + 1) +
        '],"detectedScale":{"found":false,"notation":"","drawingUnitsPerRealUnit":0,"realUnit":""}}';
      const parsed = JSON.parse(repaired);
      if (parsed && Array.isArray(parsed.items)) {
        console.log(
          `[Takeoff AI] JSON repair successful: recovered ${parsed.items.length} items from truncated response`
        );
        return parsed;
      }
    }
  } catch (_) {}

  // Strategy 3: Try to extract just the items we can find with regex
  try {
    // Extract the portion before truncation and close it
    const trimmed = raw.replace(/,[\s]*$/, ""); // remove trailing comma
    const closers = "]}"; // try closing array + object
    for (let i = 0; i < 5; i++) {
      try {
        const attempt =
          trimmed +
          closers
            .substring(0, i + 1)
            .split("")
            .join("");
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
  if (!Number.isFinite(scaleRatio) || !scaleRatio || scaleRatio <= 0)
    return null;

  const unit = scaleUnit?.trim() || "ft";
  const roundedRatio = Number(scaleRatio.toFixed(2));
  return [
    "## USER-CALIBRATED DRAWING SCALE:",
    `The user calibrated this sheet at ${roundedRatio} image pixels per 1 ${unit}.`,
    `Use this calibration when estimating unlabeled lengths and areas: real length = image pixels / ${roundedRatio} ${unit}; real area = image square pixels / ${roundedRatio}^2 ${unit}^2.`,
    "Prefer explicit dimension labels on the drawing when they are available. Use calibration as the fallback for visible but unlabeled measurable quantities.",
  ].join("\n");
}

function isRetryableLlmError(err: any): boolean {
  const msg = err?.message || "";
  const status = Number(err?.status);
  return (
    [408, 500, 502, 503, 504].includes(status) ||
    /\b(408|500|502|503|504)\b/.test(msg) ||
    msg.includes("Internal Server Error") ||
    msg.includes("Bad Gateway") ||
    msg.includes("Service Unavailable") ||
    msg.includes("Gateway Timeout") ||
    msg.includes("<!DOCTYPE") ||
    msg.includes("<html") ||
    msg.includes('code":13') ||
    msg.includes("code:13") ||
    msg.includes("bad response") ||
    msg.includes("received bad") ||
    msg.includes("token") ||
    msg.includes("Unterminated") ||
    msg.includes("JSON")
  );
}

async function extractPass(
  imageUrl: string,
  scopeText?: string | null,
  projectContext?: string | null,
  scaleRatio?: number | null,
  scaleUnit?: string | null,
  selectedDivisions?: string[] | null,
  specialtyIds?: string[] | null,
  bidMode?: string | null,
  trace?: TakeoffTraceContext
): Promise<TakeoffExtractionResult> {
  const behavior = getBidModeBehavior(bidMode);
  const scopeIntent = buildScopeIntent(
    scopeText,
    selectedDivisions,
    behavior.bidMode
  );
  let EXTRACT_PROMPT =
    "Analyze this construction drawing for a contractor's bid package. Extract measurable quantities that fit the configured scope. Return your analysis as JSON.";
  EXTRACT_PROMPT += `\n\n## BID MODE\n${behavior.label}: ${behavior.description}\n${behavior.reviewSurface}`;

  if (behavior.extractionStrategy === "broad") {
    EXTRACT_PROMPT +=
      "\nExtract broad GC coverage across visible trades. Use selected CSI divisions only when provided as an explicit package filter.";
  } else if (behavior.extractionStrategy === "speed_first") {
    EXTRACT_PROMPT +=
      "\nPrioritize the highest-signal scope, quantity, and risk items. Keep the output lean: likely bid items, obvious alternates, and visible boundary risks.";
  } else {
    EXTRACT_PROMPT +=
      "\nExtract the trade package scope tightly. Boundary and adjacent work should remain visible in notes as review/excluded, not counted as active scope.";
  }

  if (projectContext && projectContext.trim().length > 0) {
    EXTRACT_PROMPT += `\n\n${truncateContext(projectContext.trim(), 8000)}`;
  }

  if (scopeIntent.hasScope || selectedDivisions?.length) {
    EXTRACT_PROMPT += `\n\n## BID SCOPE INTENT:\n${buildScopeIntentPrompt(scopeIntent, selectedDivisions)}`;
    console.log(`[Takeoff AI] Scope intent injected: "${scopeIntent.summary}"`);
  }

  const selectedSpecialties = (specialtyIds || [])
    .map(id => TRADE_SPECIALTIES[id])
    .filter(Boolean);
  if (selectedSpecialties.length > 0) {
    EXTRACT_PROMPT += `\n\n## TRADE SPECIALTY FOCUS:\nThe user selected these specialty scopes. Think like these subcontractors and prioritize their scope:\n${selectedSpecialties
      .map(s => {
        const signals = s.detectionSignals.slice(0, 10).join(", ");
        const notes = s.constructionNotes.slice(0, 4).join(" ");
        return `- ${s.name} (${s.csiSubCode || s.divisionCode}): ${s.description}. Signals: ${signals}. ${notes}`;
      })
      .join("\n")}`;
  }

  const scaleContext = buildScaleCalibrationContext(scaleRatio, scaleUnit);
  if (scaleContext) {
    EXTRACT_PROMPT += `\n\n${scaleContext}`;
  }

  // Try high detail first, fall back to low detail on 500 (token limit exceeded)
  for (const detail of ["high", "low"] as const) {
    try {
      if (detail === "low") {
        console.log(
          `[Takeoff AI] Retrying extraction with detail:low (high detail exceeded token limit)`
        );
      }
      const response = await invokeTrackedTakeoffLLM({
        projectId: trace?.projectId || 0,
        sheetId: trace?.sheetId || null,
        runId: trace?.runId || null,
        passType: "takeoff_extract",
        promptVersion: TAKEOFF_PROMPT_VERSIONS.takeoff_extract,
        detail,
        retryAttempt: trace?.retryAttempt || 0,
        metadata: {
          bidMode: behavior.bidMode,
          selectedDivisionCount: selectedDivisions?.length || 0,
          specialtyCount: specialtyIds?.length || 0,
          hasScopeText: !!scopeText,
          hasProjectContext: !!projectContext,
        },
        params: {
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
        },
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
        console.warn(
          `[Takeoff AI] JSON parse failed (detail:${detail}): ${parseErr.message.slice(0, 100)}`
        );
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
      // Detect errors that suggest either an oversized image/prompt or a
      // transient provider gateway response:
      // - HTTP 500/502/503/504
      // - gRPC code 13 ("received bad response")
      // - HTML error pages returned by an upstream gateway
      // - JSON parse failures (LLM returned garbage due to overload)
      // - "bad response" or "token" mentions
      const msg = err?.message || "";
      const isRetryable = isRetryableLlmError(err);
      if (detail === "high" && isRetryable) {
        console.log(
          `[Takeoff AI] Retryable error on high detail: ${msg.slice(0, 120)}`
        );
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
  scaleUnit?: string | null,
  trace?: TakeoffTraceContext
): Promise<TakeoffExtractionResult> {
  // Skip verification for cover sheets or empty extractions
  if (extracted.sheetType === "cover" || extracted.items.length === 0) {
    return extracted;
  }

  // Build a compact summary — just description + quantity + unit per item.
  // Sending the full JSON with notes/csiCode/confidence bloats the prompt and
  // causes LLM 500 errors on large sheets (image + JSON exceeds token limit).
  const compactSummary = extracted.items
    .map(
      (item, i) =>
        `${i + 1}. [${item.csiDivision}] ${item.description} — ${item.quantity} ${item.unit}`
    )
    .join("\n");
  const scaleContext = buildScaleCalibrationContext(scaleRatio, scaleUnit);

  // Try high detail first, fall back to low detail on 500/token errors
  for (const detail of ["high", "low"] as const) {
    try {
      if (detail === "low") {
        console.log(`[Takeoff AI] Retrying verification with detail:low`);
      }
      const response = await invokeTrackedTakeoffLLM({
        projectId: trace?.projectId || 0,
        sheetId: trace?.sheetId || null,
        runId: trace?.runId || null,
        passType: "takeoff_verify",
        promptVersion: TAKEOFF_PROMPT_VERSIONS.takeoff_verify,
        detail,
        retryAttempt: trace?.retryAttempt || 0,
        metadata: {
          sheetName: extracted.sheetName,
          sheetType: extracted.sheetType,
          extractedItemCount: extracted.items.length,
          hasScaleContext: !!scaleContext,
        },
        params: {
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
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") {
        console.warn(
          "[Takeoff AI] Verification pass returned no content — using extraction result"
        );
        return extracted;
      }

      // Try normal parse first, then repair if truncated
      let verified: TakeoffExtractionResult;
      try {
        verified = JSON.parse(content) as TakeoffExtractionResult;
      } catch (parseErr: any) {
        console.warn(
          `[Takeoff AI] Verify JSON parse failed (detail:${detail}): ${parseErr.message.slice(0, 100)}`
        );
        const repaired = repairTruncatedJSON(content);
        if (repaired && Array.isArray(repaired.items)) {
          verified = repaired as TakeoffExtractionResult;
        } else if (detail === "high") {
          // Try low detail next
          continue;
        } else {
          // Both details failed — use extraction result
          console.warn(
            "[Takeoff AI] Verification JSON repair failed — using extraction result"
          );
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
      const isRetryable = isRetryableLlmError(err);
      if (detail === "high" && isRetryable) {
        console.log(
          `[Takeoff AI] Verify retryable error on high detail: ${msg.slice(0, 120)}`
        );
        continue;
      }
      console.warn(
        "[Takeoff AI] Verification pass failed — using extraction result:",
        err
      );
      return extracted;
    }
  }
  // Exhausted both detail levels
  console.warn(
    "[Takeoff AI] Verification exhausted all detail levels — using extraction result"
  );
  return extracted;
}

// ─── Main Sheet Processing Function ───────────────────────────────────────────

/**
 * Process a single drawing sheet through the default fast AI pipeline.
 * Pass 1: Extract quantities from the drawing image.
 * Optional Pass 2: Verify and QA only for bid modes that explicitly require it.
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
  _bidMode?: string | null,
  _workType?: string | null,
  _region?: string | null,
  _alreadyExtracted?: string | null,
  _retryAttempt: number = 0,
  _runId?: number | null
): Promise<TakeoffExtractionResult | null> {
  const MAX_AUTO_RETRIES = 1; // Auto-retry once on transient 500 errors
  const trace: TakeoffTraceContext = {
    projectId,
    sheetId,
    runId: _runId || null,
    retryAttempt: _retryAttempt,
  };
  try {
    await updateDrawingSheet(sheetId, { status: "processing" as any });
    const llmImageUrl = (await storageUrlToDataUrl(imageUrl)) || imageUrl;

    console.log(
      `[Takeoff AI] Pass 1 — Extracting sheet ${sheetId}${_retryAttempt > 0 ? ` (auto-retry #${_retryAttempt})` : ""}...`
    );
    const extracted = await extractPass(
      llmImageUrl,
      _scopeText,
      _projectContext,
      _scaleRatio,
      _scaleUnit,
      _selectedDivisions,
      _specialtyIds,
      _bidMode,
      trace
    );
    console.log(
      `[Takeoff AI] Pass 1 complete: ${extracted.items.length} items (type: ${extracted.sheetType})`
    );

    const verificationDecision = shouldVerifyExtractionForBidMode(
      extracted,
      _bidMode,
      _scaleRatio
    );
    let result = extracted;
    if (verificationDecision.shouldVerify) {
      console.log(
        `[Takeoff AI] Pass 2 — Verifying sheet ${sheetId} (${verificationDecision.reason})...`
      );
      result = await verifyPass(
        llmImageUrl,
        extracted,
        _scaleRatio,
        _scaleUnit,
        trace
      );
      console.log(
        `[Takeoff AI] Pass 2 complete: ${result.items.length} items final`
      );
    } else {
      console.log(
        `[Takeoff AI] Pass 2 skipped for sheet ${sheetId}: ${verificationDecision.reason}`
      );
    }

    // Delete any existing items for this sheet (reprocessing)
    await deleteTakeoffItemsBySheet(sheetId);

    // Save items to DB
    if (result.items.length > 0) {
      const itemsToInsert: InsertTakeoffItem[] = result.items.map(item => ({
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
    if (
      result.detectedScale?.found &&
      result.detectedScale.drawingUnitsPerRealUnit > 0
    ) {
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

    console.log(
      `[Takeoff AI] Sheet ${sheetId} done: ${result.items.length} items`
    );
    return result;
  } catch (error: any) {
    // Auto-retry on transient LLM/provider errors before marking as error.
    const isTransient = isRetryableLlmError(error);
    if (isTransient && _retryAttempt < MAX_AUTO_RETRIES) {
      console.log(
        `[Takeoff AI] Transient error on sheet ${sheetId} — auto-retrying in 5s (attempt ${_retryAttempt + 1}/${MAX_AUTO_RETRIES})...`
      );
      await new Promise(r => setTimeout(r, 5000)); // 5s backoff
      return processDrawingSheet(
        sheetId,
        imageUrl,
        projectId,
        _selectedDivisions,
        _currency,
        _scopeText,
        _projectContext,
        _specialtyIds,
        _scaleRatio,
        _scaleUnit,
        _projectType,
        _bidMode,
        _workType,
        _region,
        _alreadyExtracted,
        _retryAttempt + 1,
        _runId || null
      );
    }
    console.error(
      `[Takeoff AI] Error processing sheet ${sheetId}${_retryAttempt > 0 ? " (after auto-retry)" : ""}:`,
      error
    );
    await updateDrawingSheet(sheetId, {
      status: "error" as any,
      errorMessage: error.message || "Unknown error during AI processing",
    });
    return null;
  }
}

// ─── Batch Processing ──────────────────────────────────────────────────────────

function sheetText(entry: SheetIndexEntry): string {
  return [
    entry.sheetName,
    entry.sheetType,
    entry.discipline,
    entry.summary,
    ...entry.elements.map(
      element =>
        `${element.type} ${element.description} ${element.rebarCallouts.join(" ")}`
    ),
    ...entry.dimensions.map(
      dimension => `${dimension.type} ${dimension.label}`
    ),
  ]
    .join(" ")
    .toLowerCase();
}

function divisionDisciplineSignals(divisions: string[] | null): string[] {
  const signals = new Set<string>();
  for (const division of divisions || []) {
    if (["03", "04", "05"].includes(division)) signals.add("structural");
    if (
      ["06", "07", "08", "09", "10", "11", "12", "13", "14"].includes(division)
    )
      signals.add("architectural");
    if (["21", "22", "23", "26", "27", "28"].includes(division))
      signals.add("mep");
    if (["22"].includes(division)) signals.add("plumbing");
    if (["23"].includes(division)) signals.add("mechanical");
    if (["26", "27", "28"].includes(division)) signals.add("electrical");
    if (["31", "32", "33"].includes(division)) signals.add("civil");
    if (["32"].includes(division)) signals.add("landscape");
  }
  return Array.from(signals);
}

export function scoreSheetForBidMode(
  entry: SheetIndexEntry,
  bidMode?: string | null,
  scopeText?: string | null,
  selectedDivisions?: string[] | null
): number {
  const behavior = getBidModeBehavior(bidMode);
  if (entry.sheetType === "cover" || entry.sheetType === "general_notes")
    return 0;
  if (behavior.sheetTriage === "all_buildable") return 100;

  const text = sheetText(entry);
  const scopeIntent = buildScopeIntent(
    scopeText,
    selectedDivisions,
    behavior.bidMode
  );
  const signals = [
    ...divisionDisciplineSignals(
      scopeIntent.focusDivisions.length > 0
        ? scopeIntent.focusDivisions
        : selectedDivisions || null
    ),
    ...scopeIntent.includeKeywords,
    ...scopeIntent.tradeFocus,
    ...(scopeText || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(word => word.length >= 5),
  ];

  let score = 0;
  if (
    [
      "floor_plan",
      "foundation_plan",
      "site_plan",
      "structural_plan",
      "mep_plan",
      "electrical_plan",
      "plumbing_plan",
    ].includes(entry.sheetType)
  )
    score += 25;
  if (
    [
      "structural",
      "architectural",
      "civil",
      "mechanical",
      "electrical",
      "plumbing",
    ].includes(entry.discipline)
  )
    score += 15;
  for (const signal of Array.from(new Set(signals))) {
    if (signal && text.includes(signal.toLowerCase())) score += 12;
  }
  if (entry.dimensions.length > 0)
    score += Math.min(20, entry.dimensions.length * 2);
  if (entry.elements.length > 0)
    score += Math.min(20, entry.elements.length * 3);

  if (!scopeIntent.hasScope && !selectedDivisions?.length) {
    score += [
      "floor_plan",
      "site_plan",
      "structural_plan",
      "foundation_plan",
    ].includes(entry.sheetType)
      ? 25
      : 5;
  }

  return score;
}

function selectSheetsForBidMode(
  entries: SheetIndexEntry[],
  pendingSheetIds: Set<number>,
  bidMode?: string | null,
  scopeText?: string | null,
  selectedDivisions?: string[] | null
): Set<number> | null {
  const behavior = getBidModeBehavior(bidMode);
  if (behavior.sheetTriage === "all_buildable") return null;

  const scored = entries
    .filter(entry => pendingSheetIds.has(entry.sheetId))
    .map(entry => ({
      sheetId: entry.sheetId,
      score: scoreSheetForBidMode(
        entry,
        behavior.bidMode,
        scopeText,
        selectedDivisions
      ),
    }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  const threshold = behavior.sheetTriage === "highest_signal" ? 35 : 20;
  const selected = scored.filter(entry => entry.score >= threshold);
  const fallback =
    selected.length > 0
      ? selected
      : scored.slice(0, Math.min(scored.length, behavior.maxFastSheets || 12));
  const limited = behavior.maxFastSheets
    ? fallback.slice(0, behavior.maxFastSheets)
    : fallback;
  return new Set(limited.map(entry => entry.sheetId));
}

/**
 * Process all pending sheets for a takeoff project.
 * Uses parallel batches of 6 for maximum throughput.
 * Pass 1 (sheet indexing) still runs to classify sheet types and detect cover sheets.
 */
export async function processAllPendingSheets(
  projectId: number
): Promise<void> {
  const project = await getTakeoffProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  await updateTakeoffProject(projectId, { status: "processing" });

  const parseJsonArray = (raw: string | null | undefined): string[] | null => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter(value => typeof value === "string")
        : null;
    } catch {
      return null;
    }
  };
  const selectedDivisions = parseJsonArray(project.selectedDivisions);
  const selectedSpecialties = parseJsonArray(project.selectedSpecialties);
  const bidModeBehavior = getBidModeBehavior(project.bidMode);

  const pipelineStart = Date.now();
  const timings: Record<string, number> = {};
  const pendingSheets = await getPendingSheets(projectId);
  const pendingSheetIds = new Set(pendingSheets.map((sheet: any) => sheet.id));
  const runId = await createTakeoffAnalysisRun({
    projectId,
    runType: "full_analysis",
    status: "running",
    modelProfile: getTakeoffModelProfile(),
    sheetCount: pendingSheets.length,
    startedAt: new Date(),
  } as any);

  try {
    // ─── PASS 1: Index All Sheets (classify types, detect cover sheets) ──────────
    // We run indexing to classify sheet types, skip cover sheets, and provide
    // compact project context to each sheet extraction.
    let projectContextSummary: string | null = null;
    let triagedSheetIds: Set<number> | null = null;
    let contextOnlySheetIds = new Set<number>();
    if (pendingSheets.length > 0) {
      try {
        const pass1Start = Date.now();
        console.log(
          `[Takeoff AI] === PASS 1: Indexing sheets for project ${projectId} (${bidModeBehavior.label}) ===`
        );
        const projectContext = await withTimeout(
          indexAllSheets(projectId, runId),
          getIndexPassTimeoutMs(),
          `Sheet indexing pass for project ${projectId}`
        );
        projectContextSummary = projectContext.contextSummary;
        contextOnlySheetIds = new Set(
          projectContext.sheets
            .filter(
              entry =>
                entry.sheetType === "cover" ||
                entry.sheetType === "general_notes"
            )
            .map(entry => entry.sheetId)
        );
        triagedSheetIds = selectSheetsForBidMode(
          projectContext.sheets,
          pendingSheetIds,
          bidModeBehavior.bidMode,
          project.scopeText || null,
          selectedDivisions
        );
        if (triagedSheetIds) {
          console.log(
            `[Takeoff AI] Sheet triage selected ${triagedSheetIds.size}/${pendingSheets.length} sheet(s) for deep extraction (${bidModeBehavior.sheetTriage}).`
          );
        }
        timings.pass1_indexing_sec = Math.round(
          (Date.now() - pass1Start) / 1000
        );
        console.log(
          `[Takeoff AI] ⏱ Pass 1 (indexing): ${timings.pass1_indexing_sec}s`
        );
      } catch (indexError: any) {
        timings.pass1_indexing_sec = Math.round(
          (Date.now() - pipelineStart) / 1000
        );
        console.warn(
          `[Takeoff AI] Pass 1 (indexing) failed — proceeding without sheet type classification:`,
          indexError.message
        );
      }
    } else {
      timings.pass1_indexing_sec = 0;
      console.log(
        `[Takeoff AI] No pending sheets for project ${projectId}; skipping indexing/extraction and running post-processing only.`
      );
    }

    // ─── PASS 2: Extract (plus optional verification for standard QA modes) ──────
    const pass2Start = Date.now();
    console.log(
      `[Takeoff AI] === PASS 2: Fast extraction for project ${projectId} (parallel, concurrency=6; verification=${bidModeBehavior.verification}) ===`
    );

    let processedCount = project.processedSheets || 0;
    let hasError = false;
    const savedScalesBySheetId = new Map<
      number,
      { ratio: number; unit: string }
    >();
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
          console.log(
            `[Takeoff AI] Loaded saved scale calibration for ${savedScalesBySheetId.size} sheet(s).`
          );
        }
      } catch (scaleError: any) {
        console.warn(
          `[Takeoff AI] Failed to load saved scale calibration — proceeding without it:`,
          scaleError.message
        );
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
      } else if (
        CONTEXT_ONLY_SHEET_TYPES.has(sheet.sheetType) ||
        contextOnlySheetIds.has(sheet.id)
      ) {
        console.log(
          `[Takeoff AI] Skipping cover sheet ${sheet.id} (${sheet.sheetName}) — no measurable quantities`
        );
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
        await updateTakeoffProject(projectId, {
          processedSheets: processedCount,
        });
      } else if (triagedSheetIds && !triagedSheetIds.has(sheet.id)) {
        console.log(
          `[Takeoff AI] Holding sheet ${sheet.id} (${sheet.sheetName || sheet.pageNumber}) out of deep extraction for ${bidModeBehavior.label}`
        );
        await updateDrawingSheet(sheet.id, {
          status: "skipped" as any,
          errorMessage: `${bidModeBehavior.label}: sheet held out by relevance triage.`,
          aiRawResponse: JSON.stringify({
            contextOnly: true,
            reason: `${bidModeBehavior.label}: sheet held out by relevance triage.`,
            items: [],
          }),
        });
        processedCount++;
        await updateTakeoffProject(projectId, {
          processedSheets: processedCount,
        });
      } else {
        sheetsToProcess.push(sheet);
      }
    }

    const skippedCount = pendingSheets.length - sheetsToProcess.length;
    if (skippedCount > 0) {
      console.log(
        `[Takeoff AI] ${skippedCount} sheet(s) skipped. ${sheetsToProcess.length} sheets queued for extraction.`
      );
    }

    // Process in parallel batches of 6
    const EXTRACT_CONCURRENCY = 6;
    for (
      let batchStart = 0;
      batchStart < sheetsToProcess.length;
      batchStart += EXTRACT_CONCURRENCY
    ) {
      const batch = sheetsToProcess.slice(
        batchStart,
        batchStart + EXTRACT_CONCURRENCY
      );
      console.log(
        `[Takeoff AI] Extraction batch ${Math.floor(batchStart / EXTRACT_CONCURRENCY) + 1}: sheets ${batch.map(s => s.id).join(", ")}`
      );

      const results = await Promise.allSettled(
        batch.map(sheet => {
          const savedScale = savedScalesBySheetId.get(sheet.id);
          return processDrawingSheet(
            sheet.id,
            sheet.imageUrl!,
            projectId,
            selectedDivisions,
            null, // currency
            project.scopeText || null, // scopeText — injected into extraction prompt
            projectContextSummary,
            selectedSpecialties,
            savedScale?.ratio ?? null,
            savedScale?.unit ?? null,
            project.projectType || "commercial",
            bidModeBehavior.bidMode,
            null,
            null,
            null,
            0,
            runId
          );
        })
      );

      for (const result of results) {
        processedCount++;
        if (
          result.status === "rejected" ||
          (result.status === "fulfilled" && !result.value)
        ) {
          hasError = true;
        }
      }

      await updateTakeoffProject(projectId, {
        processedSheets: processedCount,
      });
    }

    timings.pass2_extraction_sec = Math.round((Date.now() - pass2Start) / 1000);
    console.log(
      `[Takeoff AI] ⏱ Pass 2 (extraction + optional verification): ${timings.pass2_extraction_sec}s`
    );

    // ─── Post-Processing Pipeline ─────────────────────────────────────────────────
    const postProcStart = Date.now();
    const allSheets = await getDrawingSheetsByProject(projectId);
    const completedSheets = allSheets.filter(
      (s: any) => s.status === "completed"
    );
    const errorSheets = allSheets.filter((s: any) => s.status === "error");

    if (completedSheets.length > 0) {
      try {
        console.log(
          `[Takeoff AI] Starting post-processing for project ${projectId}...`
        );
        await updateTakeoffProject(projectId, {
          status: "post_processing" as any,
        });

        // Keep the estimator moving: final organization is useful, but extracted
        // rows are already preserved and can be reviewed if this takes too long.
        const PP_TIMEOUT_MS = 3 * 60 * 1000;
        const ppTimeout = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Post-processing timed out after 3 minutes")),
            PP_TIMEOUT_MS
          )
        );
        const ppStats = await Promise.race([
          postProcessTakeoff(projectId),
          ppTimeout,
        ]);
        timings.pass3_postprocess_sec = Math.round(
          (Date.now() - postProcStart) / 1000
        );
        console.log(
          `[Takeoff AI] ⏱ Post-processing: ${timings.pass3_postprocess_sec}s`
        );
        console.log(`[Takeoff AI] Post-processing complete:`, ppStats);
      } catch (ppError: any) {
        const isTimeout = ppError?.message?.includes("timed out");
        console.error(
          `[Takeoff AI] Post-processing ${isTimeout ? "timed out" : "failed"} (per-sheet items preserved):`,
          ppError.message
        );
        await recalculateProjectTotal(projectId);
        if (isTimeout) {
          await updateTakeoffProject(projectId, {
            processingTimedOut: true,
          } as any);
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
    console.log(
      `[Takeoff AI]   Pass 1 (indexing):          ${timings.pass1_indexing_sec || 0}s`
    );
    console.log(
      `[Takeoff AI]   Pass 2 (extract+verify):    ${timings.pass2_extraction_sec || 0}s`
    );
    console.log(
      `[Takeoff AI]   Pass 3 (post-processing):   ${timings.pass3_postprocess_sec || 0}s`
    );
    console.log(
      `[Takeoff AI]   TOTAL:                      ${timings.total_sec}s (${totalMin} min)`
    );
    console.log(`[Takeoff AI] ═══════════════════════════════════════════════`);

    const finalStatus =
      completedSheets.length > 0
        ? "completed"
        : errorSheets.length > 0
          ? "error"
          : "completed";
    await updateTakeoffProject(projectId, {
      status: finalStatus,
      processedSheets: processedCount,
      lastAnalyzedAt: new Date(),
    } as any);
    const qaFindings = await refreshTakeoffQaFindings(projectId, runId);
    await updateTakeoffAnalysisRun(runId, {
      status: "completed",
      completedAt: new Date(),
      durationMs: Date.now() - pipelineStart,
      summary: {
        timings,
        finalStatus,
        processedSheets: processedCount,
        qaFindingCount: qaFindings.length,
      },
    } as any);
    await summarizeTakeoffAnalysisRun(runId);
  } catch (error: any) {
    await updateTakeoffAnalysisRun(runId, {
      status: "error",
      completedAt: new Date(),
      durationMs: Date.now() - pipelineStart,
      errorMessage: error?.message || "Unknown analysis error",
      summary: { timings },
    } as any);
    await summarizeTakeoffAnalysisRun(runId);
    throw error;
  }
}
