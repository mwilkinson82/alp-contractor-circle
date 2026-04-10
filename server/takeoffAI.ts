/**
 * AI Quantity Takeoff Pipeline — processes construction drawing sheets
 * using GPT-4o vision to extract quantities organized by CSI division.
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
} from "./takeoffDb";
import type { InsertTakeoffItem } from "../drizzle/schema";

// CSI Division reference for the AI prompt
const CSI_DIVISIONS = `
01 - General Requirements
02 - Existing Conditions  
03 - Concrete
04 - Masonry
05 - Metals
06 - Wood, Plastics & Composites
07 - Thermal & Moisture Protection
08 - Openings (Doors & Windows)
09 - Finishes
10 - Specialties
11 - Equipment
12 - Furnishings
13 - Special Construction
14 - Conveying Equipment
21 - Fire Suppression
22 - Plumbing
23 - HVAC
26 - Electrical
27 - Communications
28 - Electronic Safety & Security
31 - Earthwork
32 - Exterior Improvements
33 - Utilities
`;

const SYSTEM_PROMPT = `You are an expert construction estimator and quantity surveyor. You analyze construction drawings and extract accurate quantity takeoffs.

When analyzing a drawing sheet:
1. Identify the sheet type (floor plan, elevation, section, detail, schedule, site plan, structural, MEP, etc.)
2. Identify the sheet name/number from the title block
3. Extract ALL measurable quantities visible on the drawing
4. Organize items by CSI MasterFormat division
5. Provide realistic unit costs based on current US residential/commercial construction pricing

For each item, provide:
- CSI division code (2-digit, e.g. "03" for Concrete)
- CSI subdivision code (e.g. "03 30 00" for Cast-in-Place Concrete)
- Clear description of the item
- Quantity with appropriate unit of measure (SF, LF, CY, EA, LS, etc.)
- Estimated unit cost in USD (reasonable market rate)
- Confidence level (0-100) in the accuracy of the quantity
- Brief notes explaining how you derived the quantity

Common measurements to extract:
- Floor areas (SF)
- Wall lengths and heights (LF, SF)
- Door and window counts and sizes (EA)
- Structural members (LF, EA)
- Roof area (SF, SQ)
- Foundation dimensions (LF, CY)
- Plumbing fixtures (EA)
- Electrical devices (EA)
- HVAC equipment (EA, TON)
- Earthwork volumes (CY)
- Concrete volumes (CY)
- Framing lumber (BF, LF)

CSI Divisions reference:
${CSI_DIVISIONS}

If the sheet is a cover page, title sheet, or contains no measurable quantities, return an empty items array and set sheetType to "cover".
If you cannot determine quantities with reasonable confidence, still list what you can identify with lower confidence scores.`;

interface TakeoffExtractionResult {
  sheetName: string;
  sheetType: string;
  items: Array<{
    csiDivision: string;
    csiCode: string;
    description: string;
    quantity: number;
    unit: string;
    unitCost: number;
    confidence: number;
    notes: string;
  }>;
}

/**
 * Process a single drawing sheet through the AI vision pipeline.
 */
export async function processDrawingSheet(
  sheetId: number,
  imageUrl: string,
  projectId: number
): Promise<TakeoffExtractionResult | null> {
  try {
    // Mark sheet as processing
    await updateDrawingSheet(sheetId, { status: "processing" as any });

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this construction drawing sheet. Extract all measurable quantities and organize them by CSI division. Return your analysis as JSON matching the schema.",
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
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
                    csiDivision: { type: "string", description: "2-digit CSI division code" },
                    csiCode: { type: "string", description: "Full CSI code e.g. '03 30 00'" },
                    description: { type: "string", description: "Item description" },
                    quantity: { type: "number", description: "Quantity value" },
                    unit: { type: "string", description: "Unit of measure (SF, LF, CY, EA, etc.)" },
                    unitCost: { type: "number", description: "Unit cost in USD dollars" },
                    confidence: { type: "integer", description: "Confidence 0-100" },
                    notes: { type: "string", description: "How the quantity was derived" },
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
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("No content in AI response");
    }

    const result: TakeoffExtractionResult = JSON.parse(content);

    // Delete any existing items for this sheet (for reprocessing)
    await deleteTakeoffItemsBySheet(sheetId);

    // Save extracted items to DB
    if (result.items.length > 0) {
      const itemsToInsert: InsertTakeoffItem[] = result.items.map((item) => ({
        projectId,
        sheetId,
        csiDivision: item.csiDivision,
        csiCode: item.csiCode,
        description: item.description,
        quantity: item.quantity.toFixed(2),
        unit: item.unit,
        unitCost: Math.round(item.unitCost * 100), // Convert dollars to cents
        extendedCost: Math.round(item.quantity * item.unitCost * 100), // cents
        confidence: item.confidence,
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
      aiRawResponse: content,
    });

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
 */
export async function processAllPendingSheets(projectId: number): Promise<void> {
  const project = await getTakeoffProject(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  await updateTakeoffProject(projectId, { status: "processing" });

  const pendingSheets = await getPendingSheets(projectId);
  let processedCount = project.processedSheets || 0;
  let hasError = false;

  for (const sheet of pendingSheets) {
    if (!sheet.imageUrl) {
      await updateDrawingSheet(sheet.id, {
        status: "skipped" as any,
        errorMessage: "No image URL available",
      });
      processedCount++;
      continue;
    }

    const result = await processDrawingSheet(sheet.id, sheet.imageUrl, projectId);
    processedCount++;

    if (!result) {
      hasError = true;
    }

    // Update progress
    await updateTakeoffProject(projectId, {
      processedSheets: processedCount,
    });
  }

  // Recalculate total cost
  await recalculateProjectTotal(projectId);

  // Update final status
  await updateTakeoffProject(projectId, {
    status: hasError ? "error" : "completed",
    processedSheets: processedCount,
  });
}
