/**
 * Two-Pass Sheet Indexing System for ConstructLine
 *
 * Pass 1: Quick scan of every sheet to classify type and extract key dimensions.
 * Builds a structured "project context" that gets injected into Pass 2 analysis.
 *
 * This solves the core accuracy problem: when analyzing a structural section,
 * the AI now KNOWS the building dimensions from the plan views.
 */
import { getDrawingSheetsByProject, updateDrawingSheet } from "./takeoffDb";
import { storageUrlToDataUrl } from "./storage";
import {
  TAKEOFF_PROMPT_VERSIONS,
  invokeTrackedTakeoffLLM,
} from "./takeoffAiAudit";

const DEFAULT_SHEET_INDEX_TIMEOUT_MS = 90_000;
const DEFAULT_SHEET_INDEX_HEARTBEAT_MS = 30_000;
const DEFAULT_SHEET_INDEX_CONCURRENCY = 3;
type ImageDetail = "auto" | "low" | "high" | "original";

function positiveNumberFromEnv(names: string[]): number | null {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function getSheetIndexTimeoutMs(): number {
  return (
    positiveNumberFromEnv([
      "CONSTRUCTLINE_SHEET_INDEX_TIMEOUT_MS",
      "TAKEOFF_SHEET_INDEX_TIMEOUT_MS",
    ]) || DEFAULT_SHEET_INDEX_TIMEOUT_MS
  );
}

function getSheetIndexHeartbeatMs(): number {
  return (
    positiveNumberFromEnv([
      "CONSTRUCTLINE_SHEET_INDEX_HEARTBEAT_MS",
      "TAKEOFF_SHEET_INDEX_HEARTBEAT_MS",
    ]) || DEFAULT_SHEET_INDEX_HEARTBEAT_MS
  );
}

function getSheetIndexConcurrency(): number {
  return (
    positiveNumberFromEnv([
      "CONSTRUCTLINE_SHEET_INDEX_CONCURRENCY",
      "TAKEOFF_SHEET_INDEX_CONCURRENCY",
    ]) || DEFAULT_SHEET_INDEX_CONCURRENCY
  );
}

function getImageDetailFromEnv(
  names: string[],
  fallback: ImageDetail
): ImageDetail {
  const allowed = new Set<ImageDetail>(["auto", "low", "high", "original"]);
  for (const name of names) {
    const value = process.env[name]?.trim().toLowerCase() as ImageDetail;
    if (allowed.has(value)) return value;
  }
  return fallback;
}

function getSheetIndexImageDetail(): ImageDetail {
  return getImageDetailFromEnv(
    [
      "CONSTRUCTLINE_SHEET_INDEX_IMAGE_DETAIL",
      "TAKEOFF_SHEET_INDEX_IMAGE_DETAIL",
    ],
    "high"
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

async function withProgressHeartbeat<T>(
  promise: Promise<T>,
  heartbeat: () => void | Promise<void>,
  intervalMs: number,
  label: string
): Promise<T> {
  let heartbeatInFlight = false;
  const timer = setInterval(() => {
    if (heartbeatInFlight) return;
    heartbeatInFlight = true;
    Promise.resolve(heartbeat())
      .catch(error => {
        console.warn(
          `[Sheet Index] Progress heartbeat failed during ${label}:`,
          error?.message || error
        );
      })
      .finally(() => {
        heartbeatInFlight = false;
      });
  }, intervalMs);
  if (typeof (timer as any).unref === "function") {
    (timer as any).unref();
  }

  try {
    return await promise;
  } finally {
    clearInterval(timer);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SheetIndexEntry {
  sheetId: number;
  pageNumber: number;
  sheetName: string;
  sheetType: string;
  discipline: string; // architectural, structural, mep, civil, etc.
  /** Key dimensions and measurements visible on this sheet */
  dimensions: DimensionEntry[];
  /** Elements identified on this sheet (footings, slabs, pits, etc.) */
  elements: ElementEntry[];
  /** General notes about what this sheet shows */
  summary: string;
}

export interface SheetIndexProgress {
  totalSheets: number;
  completedSheets: number;
  failedSheets: number;
  skippedSheets: number;
  currentBatch: number;
  totalBatches: number;
  currentPage?: number | null;
  currentSheetName?: string | null;
  statusText: string;
}

type SheetIndexProgressCallback = (
  progress: SheetIndexProgress
) => void | Promise<void>;

export interface DimensionEntry {
  /** What is being measured: "building_footprint", "footing_run", "slab_area", "pit", "wall_height", etc. */
  type: string;
  /** Human-readable label, e.g. "Building footprint along Grid A" */
  label: string;
  /** Raw dimension string from drawing, e.g. "110'-4\"" */
  rawValue: string;
  /** Converted to decimal feet for calculation */
  valueFeet: number;
  /** Secondary dimension if applicable (e.g. width for area calc) */
  secondaryValueFeet: number | null;
  /** Depth in feet if applicable (for volume calc) */
  depthFeet: number | null;
}

export interface ElementEntry {
  /** Element type: "continuous_footing", "spread_footing", "pier", "grade_beam", "slab", "pit", "column", "wall", etc. */
  type: string;
  /** Description, e.g. "24\"W x 12\"D continuous footing along Grid A" */
  description: string;
  /** Count if applicable */
  count: number | null;
  /** Associated dimension labels from the dimensions array */
  dimensionRefs: string[];
  /** Rebar callouts visible for this element */
  rebarCallouts: string[];
  /** Concrete strength if noted */
  concreteStrength: string | null;
}

export interface ProjectContext {
  projectId: number;
  /** All indexed sheets */
  sheets: SheetIndexEntry[];
  /** Aggregated building dimensions */
  buildingFootprint: {
    lengthFt: number | null;
    widthFt: number | null;
    areaSF: number | null;
    perimeterLF: number | null;
  };
  /** All unique elements found across sheets */
  allElements: ElementEntry[];
  /** All dimensions organized by type */
  dimensionsByType: Record<string, DimensionEntry[]>;
  /** Summary text for injection into Pass 2 prompts */
  contextSummary: string;
}

// ─── Pass 1: Sheet Index Prompt ───────────────────────────────────────────────

const SHEET_INDEX_SYSTEM_PROMPT = `You are a senior construction estimator performing a QUICK INDEX SCAN of a construction drawing sheet.

## YOUR TASK
DO NOT do a full quantity takeoff. Instead, quickly scan this sheet to:
1. Identify the sheet name, number, type, and discipline
2. Extract ALL DIMENSIONS visible on the drawing (lengths, widths, depths, areas, spacings)
3. Identify ALL STRUCTURAL/ARCHITECTURAL ELEMENTS shown (footings, slabs, pits, beams, columns, walls, etc.)
4. Note any rebar callouts, concrete strengths, or material specifications
5. Write a brief summary of what this sheet shows

## DIMENSION EXTRACTION RULES:
- Read EVERY dimension line, callout, and notation on the drawing
- Convert all dimensions to decimal feet (e.g., 110'-4" = 110.33 ft, 8" = 0.67 ft)
- For plan views: extract the OVERALL building dimensions (length x width)
- For plan views: trace and measure each footing run, grade beam run, wall run
- For sections/details: extract member sizes (width x depth), rebar sizes, spacing
- For pit details: extract length x width x depth
- Label each dimension clearly so it can be referenced later

## ELEMENT IDENTIFICATION RULES:
- Name each element specifically (e.g., "24\"W x 12\"D continuous footing" not just "footing")
- Count elements where possible (e.g., "16 piers", "4 spread footings")
- Note which dimensions apply to which elements
- Record ALL rebar callouts (e.g., "#5 @ 12\" OC EW", "3-#6 continuous top & bottom")
- Record concrete strength callouts (e.g., "4000 PSI", "3000 PSI")

## IMPORTANT:
- Be THOROUGH with dimensions — every number on the drawing matters
- This is a quick index, not a full takeoff — focus on measurements and identification
- Plan views are the MOST VALUABLE sheets — extract every dimension you can see
- Even partial dimensions help (e.g., "room appears to be approximately 20' wide based on grid spacing")`;

const SHEET_INDEX_SCHEMA = {
  type: "json_schema" as const,
  json_schema: {
    name: "sheet_index",
    strict: true,
    schema: {
      type: "object",
      properties: {
        sheetName: {
          type: "string",
          description: "Sheet name/number from title block",
        },
        sheetType: {
          type: "string",
          enum: [
            "floor_plan",
            "foundation_plan",
            "roof_plan",
            "site_plan",
            "elevation",
            "section",
            "detail",
            "schedule",
            "structural_plan",
            "structural_section",
            "structural_detail",
            "mep_plan",
            "electrical_plan",
            "plumbing_plan",
            "cover",
            "general_notes",
            "other",
          ],
          description: "Specific type of drawing sheet",
        },
        discipline: {
          type: "string",
          enum: [
            "architectural",
            "structural",
            "mechanical",
            "electrical",
            "plumbing",
            "civil",
            "landscape",
            "general",
          ],
          description: "Engineering discipline of this sheet",
        },
        dimensions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description:
                  "Dimension category: building_footprint, footing_run, slab_thickness, pit_dimension, member_size, spacing, wall_height, beam_span, column_size, rebar_spacing, overall_length, overall_width, depth, etc.",
              },
              label: {
                type: "string",
                description:
                  "Human-readable label, e.g. 'Building length along Grid A' or 'Continuous footing width'",
              },
              rawValue: {
                type: "string",
                description:
                  'Raw dimension as shown on drawing, e.g. "110\'-4\\"" or "24\\""',
              },
              valueFeet: {
                type: "number",
                description:
                  "Primary dimension converted to decimal feet (e.g., 110'-4\" = 110.33)",
              },
              secondaryValueFeet: {
                type: ["number", "null"],
                description:
                  "Secondary dimension in feet if applicable (e.g., width for area calculation)",
              },
              depthFeet: {
                type: ["number", "null"],
                description:
                  "Depth in feet if applicable (for volume calculation)",
              },
            },
            required: [
              "type",
              "label",
              "rawValue",
              "valueFeet",
              "secondaryValueFeet",
              "depthFeet",
            ],
            additionalProperties: false,
          },
        },
        elements: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description:
                  "Element type: continuous_footing, spread_footing, pier, grade_beam, slab_on_grade, pit, trench, column, wall, beam, curb, enclosure_foundation, bollard_foundation, etc.",
              },
              description: {
                type: "string",
                description:
                  "Detailed description including sizes, e.g. '24\"W x 12\"D continuous footing along building perimeter'",
              },
              count: {
                type: ["integer", "null"],
                description:
                  "Number of this element if countable, null if linear/area",
              },
              dimensionRefs: {
                type: "array",
                items: { type: "string" },
                description: "Labels of dimensions that apply to this element",
              },
              rebarCallouts: {
                type: "array",
                items: { type: "string" },
                description:
                  "Rebar specifications for this element, e.g. '#5 @ 12\" OC EW'",
              },
              concreteStrength: {
                type: ["string", "null"],
                description: "Concrete strength if specified, e.g. '4000 PSI'",
              },
            },
            required: [
              "type",
              "description",
              "count",
              "dimensionRefs",
              "rebarCallouts",
              "concreteStrength",
            ],
            additionalProperties: false,
          },
        },
        summary: {
          type: "string",
          description:
            "Brief 1-2 sentence summary of what this sheet shows and its key information",
        },
      },
      required: [
        "sheetName",
        "sheetType",
        "discipline",
        "dimensions",
        "elements",
        "summary",
      ],
      additionalProperties: false,
    },
  },
};

// ─── Pass 1: Index a Single Sheet ─────────────────────────────────────────────

async function indexSingleSheet(
  imageUrl: string,
  pageNumber: number,
  projectId: number,
  sheetId: number,
  runId?: number | null
): Promise<Omit<SheetIndexEntry, "sheetId" | "pageNumber">> {
  const llmImageUrl = (await storageUrlToDataUrl(imageUrl)) || imageUrl;
  const imageDetail = getSheetIndexImageDetail();
  const response = await invokeTrackedTakeoffLLM({
    projectId,
    sheetId,
    runId,
    passType: "sheet_index",
    promptVersion: TAKEOFF_PROMPT_VERSIONS.sheet_index,
    detail: imageDetail,
    metadata: { pageNumber },
    params: {
      messages: [
        { role: "system", content: SHEET_INDEX_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Quickly scan this construction drawing (page ${pageNumber}) and extract all dimensions, elements, and key information. Focus on MEASUREMENTS — every dimension line, callout, and notation matters. Return your index as JSON.`,
            },
            {
              type: "image_url",
              image_url: { url: llmImageUrl, detail: imageDetail },
            },
          ],
        },
      ],
      response_format: SHEET_INDEX_SCHEMA,
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No content in sheet index response");
  }

  const result = JSON.parse(content);
  return {
    sheetName: result.sheetName || `Page ${pageNumber}`,
    sheetType: result.sheetType || "other",
    discipline: result.discipline || "general",
    dimensions: result.dimensions || [],
    elements: result.elements || [],
    summary: result.summary || "",
  };
}

// ─── Build Project Context ────────────────────────────────────────────────────

function buildProjectContext(
  projectId: number,
  indexEntries: SheetIndexEntry[]
): ProjectContext {
  // Aggregate all elements
  const allElements: ElementEntry[] = [];
  const dimensionsByType: Record<string, DimensionEntry[]> = {};

  for (const entry of indexEntries) {
    for (const el of entry.elements) {
      allElements.push(el);
    }
    for (const dim of entry.dimensions) {
      if (!dimensionsByType[dim.type]) {
        dimensionsByType[dim.type] = [];
      }
      dimensionsByType[dim.type].push(dim);
    }
  }

  // Try to determine building footprint from plan views
  let lengthFt: number | null = null;
  let widthFt: number | null = null;

  const footprintDims = dimensionsByType["building_footprint"] || [];
  const overallLengths = dimensionsByType["overall_length"] || [];
  const overallWidths = dimensionsByType["overall_width"] || [];

  // Use building_footprint dimensions first
  if (footprintDims.length > 0) {
    const sorted = [...footprintDims].sort((a, b) => b.valueFeet - a.valueFeet);
    lengthFt = sorted[0]?.valueFeet || null;
    if (sorted[0]?.secondaryValueFeet) {
      widthFt = sorted[0].secondaryValueFeet;
    } else if (sorted.length > 1) {
      widthFt = sorted[1]?.valueFeet || null;
    }
  }

  // Fall back to overall_length / overall_width
  if (!lengthFt && overallLengths.length > 0) {
    lengthFt = Math.max(...overallLengths.map(d => d.valueFeet));
  }
  if (!widthFt && overallWidths.length > 0) {
    widthFt = Math.max(...overallWidths.map(d => d.valueFeet));
  }

  const areaSF = lengthFt && widthFt ? lengthFt * widthFt : null;
  const perimeterLF = lengthFt && widthFt ? 2 * (lengthFt + widthFt) : null;

  // Build context summary text
  const contextSummary = buildContextSummaryText(
    indexEntries,
    {
      lengthFt,
      widthFt,
      areaSF,
      perimeterLF,
    },
    allElements,
    dimensionsByType
  );

  return {
    projectId,
    sheets: indexEntries,
    buildingFootprint: { lengthFt, widthFt, areaSF, perimeterLF },
    allElements,
    dimensionsByType,
    contextSummary,
  };
}

function buildContextSummaryText(
  sheets: SheetIndexEntry[],
  footprint: {
    lengthFt: number | null;
    widthFt: number | null;
    areaSF: number | null;
    perimeterLF: number | null;
  },
  allElements: ElementEntry[],
  dimensionsByType: Record<string, DimensionEntry[]>
): string {
  const lines: string[] = [];

  lines.push("## PROJECT DIMENSIONS CONTEXT (from Pass 1 sheet indexing)");
  lines.push(
    "The following dimensions and elements were extracted from ALL drawing sheets in this project."
  );
  lines.push(
    "USE THESE DIMENSIONS when calculating quantities — do NOT guess or use lump sums when real measurements are available.\n"
  );

  // Building footprint
  if (footprint.lengthFt || footprint.widthFt) {
    lines.push("### BUILDING FOOTPRINT:");
    if (footprint.lengthFt)
      lines.push(`  Length: ${footprint.lengthFt.toFixed(2)} ft`);
    if (footprint.widthFt)
      lines.push(`  Width: ${footprint.widthFt.toFixed(2)} ft`);
    if (footprint.areaSF)
      lines.push(`  Area: ${footprint.areaSF.toFixed(0)} SF`);
    if (footprint.perimeterLF)
      lines.push(`  Perimeter: ${footprint.perimeterLF.toFixed(0)} LF`);
    lines.push("");
  }

  // All dimensions by type
  lines.push("### ALL EXTRACTED DIMENSIONS:");
  for (const [type, dims] of Object.entries(dimensionsByType)) {
    for (const dim of dims) {
      let dimStr = `  ${dim.label}: ${dim.rawValue} (${dim.valueFeet.toFixed(2)} ft)`;
      if (dim.secondaryValueFeet)
        dimStr += ` × ${dim.secondaryValueFeet.toFixed(2)} ft`;
      if (dim.depthFeet) dimStr += ` × ${dim.depthFeet.toFixed(2)} ft deep`;
      lines.push(dimStr);
    }
  }
  lines.push("");

  // All elements
  lines.push("### IDENTIFIED STRUCTURAL ELEMENTS:");
  for (const el of allElements) {
    let elStr = `  - ${el.description}`;
    if (el.count) elStr += ` (count: ${el.count})`;
    if (el.rebarCallouts.length > 0)
      elStr += ` | Rebar: ${el.rebarCallouts.join(", ")}`;
    if (el.concreteStrength) elStr += ` | Concrete: ${el.concreteStrength}`;
    lines.push(elStr);
  }
  lines.push("");

  // Sheet index
  lines.push("### SHEET INDEX:");
  for (const sheet of sheets) {
    lines.push(
      `  Page ${sheet.pageNumber}: ${sheet.sheetName} (${sheet.sheetType}, ${sheet.discipline}) — ${sheet.summary}`
    );
  }
  lines.push("");

  lines.push("### INSTRUCTIONS FOR USING THIS CONTEXT:");
  lines.push(
    "- When you see a footing section detail, use the PLAN DIMENSIONS above to calculate total LF"
  );
  lines.push(
    "- When you see rebar callouts in a section, use the footing/slab LF from plans to calculate total rebar LF"
  );
  lines.push(
    "- When calculating slab-on-grade, use the BUILDING FOOTPRINT area above"
  );
  lines.push(
    "- When calculating formwork, use the dimensions above to compute contact area (SFCA)"
  );
  lines.push(
    "- NEVER use Lump Sum when you can calculate from these dimensions"
  );
  lines.push(
    "- SHOW YOUR MATH: reference which dimension you used (e.g., 'Building perimeter 384.5 LF x 2 footing depth = 769 SFCA')"
  );
  lines.push(
    "- WARNING: WIRE MESH / WWR: Do NOT use mesh specs from this context block. Always read wire mesh specs from the SHEET you are currently analyzing. Context rebar callouts are for structural elements only."
  );
  lines.push(
    "- WARNING: EXPANSION JOINTS: Measure expansion joint LF from PLAN VIEWS only. Detail sheets show joint profiles/cross-sections, NOT lengths."
  );

  return lines.join("\n");
}

// ─── Main Export: Index All Sheets ────────────────────────────────────────────

/**
 * Pass 1: Index all sheets in a project to build a project context.
 * This runs BEFORE the main extraction pass.
 * Returns a ProjectContext that gets injected into Pass 2 prompts.
 */
export async function indexAllSheets(
  projectId: number,
  runId?: number | null,
  onProgress?: SheetIndexProgressCallback
): Promise<ProjectContext> {
  const sheets = await getDrawingSheetsByProject(projectId);

  if (sheets.length === 0) {
    return buildProjectContext(projectId, []);
  }

  const indexEntries: SheetIndexEntry[] = [];
  let failedIndexCount = 0;

  console.log(
    `[Sheet Index] Pass 1: Indexing ${sheets.length} sheets for project ${projectId} (parallel, concurrency=${getSheetIndexConcurrency()})...`
  );

  const CONCURRENCY = getSheetIndexConcurrency();
  const sheetsWithImages = sheets.filter((s: any) => s.imageUrl);
  const sheetIndexTimeoutMs = getSheetIndexTimeoutMs();
  const skipped = sheets.length - sheetsWithImages.length;
  const totalBatches = Math.max(
    1,
    Math.ceil(sheetsWithImages.length / CONCURRENCY)
  );
  const emitProgress = async (patch: Partial<SheetIndexProgress>) => {
    if (!onProgress) return;
    await onProgress({
      totalSheets: sheets.length,
      completedSheets: indexEntries.length + failedIndexCount + skipped,
      failedSheets: failedIndexCount,
      skippedSheets: skipped,
      currentBatch: 1,
      totalBatches,
      statusText: "Preparing sheet index...",
      ...patch,
    });
  };

  if (skipped > 0)
    console.log(`[Sheet Index] Skipping ${skipped} sheets without images`);

  await emitProgress({
    completedSheets: skipped,
    statusText:
      sheetsWithImages.length > 0
        ? `Preparing to index ${sheetsWithImages.length} sheet image(s)...`
        : "No sheet images available to index.",
  });

  for (
    let batchStart = 0;
    batchStart < sheetsWithImages.length;
    batchStart += CONCURRENCY
  ) {
    const batch = sheetsWithImages.slice(batchStart, batchStart + CONCURRENCY);
    const currentBatch = Math.floor(batchStart / CONCURRENCY) + 1;
    const batchPages = batch.map((s: any) => s.pageNumber).join(", ");
    console.log(
      `[Sheet Index] Processing batch ${currentBatch}: pages ${batchPages}`
    );
    await emitProgress({
      currentBatch,
      currentPage: batch[0]?.pageNumber ?? null,
      currentSheetName: batch[0]?.sheetName ?? null,
      statusText: `Indexing batch ${currentBatch} of ${totalBatches}: pages ${batchPages}`,
    });

    const results = await withProgressHeartbeat(
      Promise.all(
        batch.map(async (sheet: any) => {
          console.log(
            `[Sheet Index] Indexing page ${sheet.pageNumber} (sheet ${sheet.id})...`
          );
          await emitProgress({
            currentBatch,
            currentPage: sheet.pageNumber,
            currentSheetName: sheet.sheetName || null,
            statusText: `Indexing page ${sheet.pageNumber}${sheet.sheetName ? ` — ${sheet.sheetName}` : ""}`,
          });
          try {
            const indexResult = await withTimeout(
              indexSingleSheet(
                sheet.imageUrl,
                sheet.pageNumber,
                projectId,
                sheet.id,
                runId
              ),
              sheetIndexTimeoutMs,
              `Sheet index page ${sheet.pageNumber}`
            );
            return { ok: true as const, sheet, indexResult };
          } catch (error: any) {
            return { ok: false as const, sheet, error };
          }
        })
      ),
      () =>
        emitProgress({
          currentBatch,
          currentPage: batch[0]?.pageNumber ?? null,
          currentSheetName: batch[0]?.sheetName ?? null,
          statusText: `Still indexing batch ${currentBatch} of ${totalBatches}: pages ${batchPages}`,
        }),
      getSheetIndexHeartbeatMs(),
      `batch ${currentBatch}`
    );

    for (const result of results) {
      if (result.ok) {
        const { sheet, indexResult } = result;
        const entry: SheetIndexEntry = {
          sheetId: sheet.id,
          pageNumber: sheet.pageNumber,
          ...indexResult,
        };
        indexEntries.push(entry);

        if (sheet.sheetType === "other" || !sheet.sheetName) {
          const dbSheetType = mapToDbSheetType(indexResult.sheetType);
          await updateDrawingSheet(sheet.id, {
            sheetName: indexResult.sheetName,
            sheetType: dbSheetType as any,
          });
        }
        console.log(
          `[Sheet Index] Page ${sheet.pageNumber}: ${indexResult.sheetName} (${indexResult.sheetType}) — ${indexResult.dimensions.length} dims, ${indexResult.elements.length} elements`
        );
        await emitProgress({
          currentBatch,
          currentPage: sheet.pageNumber,
          currentSheetName: indexResult.sheetName || sheet.sheetName || null,
          statusText: `Indexed page ${sheet.pageNumber}: ${indexResult.sheetName}`,
        });
      } else {
        failedIndexCount++;
        const message = `Sheet index failed for page ${result.sheet.pageNumber}: ${result.error?.message || "unknown error"}`;
        console.error(
          `[Sheet Index] ${message}`,
          result.error?.stack || result.error
        );
        await updateDrawingSheet(result.sheet.id, {
          errorMessage: message,
        });
        await emitProgress({
          currentBatch,
          currentPage: result.sheet.pageNumber,
          currentSheetName: result.sheet.sheetName || null,
          statusText: `Indexing failed for page ${result.sheet.pageNumber}; continuing with the rest of the set.`,
        });
      }
    }
  }

  if (sheetsWithImages.length > 0 && indexEntries.length === 0) {
    throw new Error(
      `Sheet indexing failed for all ${sheetsWithImages.length} uploaded sheet image(s).`
    );
  }

  const context = buildProjectContext(projectId, indexEntries);

  console.log(
    `[Sheet Index] Pass 1 complete: ${indexEntries.length}/${sheets.length} sheets indexed${failedIndexCount > 0 ? ` (${failedIndexCount} failed)` : ""}`
  );
  await emitProgress({
    completedSheets: sheets.length,
    currentBatch: totalBatches,
    currentPage: null,
    currentSheetName: null,
    statusText: `Sheet index complete: ${indexEntries.length}/${sheets.length} indexed${failedIndexCount > 0 ? `, ${failedIndexCount} failed` : ""}.`,
  });
  if (context.buildingFootprint.areaSF) {
    console.log(
      `[Sheet Index] Building footprint: ${context.buildingFootprint.lengthFt?.toFixed(1)}' × ${context.buildingFootprint.widthFt?.toFixed(1)}' = ${context.buildingFootprint.areaSF?.toFixed(0)} SF`
    );
  }
  console.log(
    `[Sheet Index] Found ${context.allElements.length} elements, ${Object.keys(context.dimensionsByType).length} dimension types`
  );

  return context;
}

/**
 * Map our detailed sheet types back to the DB enum values.
 */
function mapToDbSheetType(detailedType: string): string {
  const mapping: Record<string, string> = {
    floor_plan: "floor_plan",
    foundation_plan: "structural",
    roof_plan: "floor_plan",
    site_plan: "site_plan",
    elevation: "elevation",
    section: "section",
    detail: "detail",
    schedule: "schedule",
    structural_plan: "structural",
    structural_section: "section",
    structural_detail: "detail",
    mep_plan: "mep",
    electrical_plan: "electrical",
    plumbing_plan: "plumbing",
    cover: "cover",
    general_notes: "other",
    other: "other",
  };
  return mapping[detailedType] || "other";
}
