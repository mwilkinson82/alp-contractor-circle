/**
 * laborInference.ts — AI-powered auto-matching of takeoff items to crews + productivity.
 *
 * Two entry points:
 *   inferLaborForItemsPreview  — runs LLM, returns assignments WITHOUT saving (for review panel)
 *   inferLaborForItems         — legacy: runs LLM AND saves to DB immediately
 */
import { invokeLLM } from "./_core/llm";
import { getDb as _getDb } from "./db";
import { activityProductivity } from "../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";

interface TakeoffItem {
  description: string;
  unit: string;
  quantity: number;
  csiDivision: string;
}

interface CrewDef {
  id: number;
  crewName: string;
  laborType: string;
  crewMembers: string; // JSON array of { tradeName, classification, count }
}

export interface LaborAssignment {
  description: string;
  unit: string;
  csiDivision: string;
  crewId: number | null;
  crewName: string;
  productivityPerCrewHr: number;
  reasoning: string;
}

// ─── Core LLM inference (no DB writes) ───────────────────────────────────────

/**
 * Run LLM inference and return assignments WITHOUT saving to DB.
 * The caller (review panel) is responsible for calling confirmLaborAssignments.
 */
export async function inferLaborForItemsPreview(
  items: TakeoffItem[],
  crews: CrewDef[],
): Promise<LaborAssignment[]> {
  if (items.length === 0 || crews.length === 0) return [];

  const crewSummaries = crews.map(c => {
    const members = JSON.parse(c.crewMembers || "[]");
    const memberDesc = members.map((m: any) => `${m.count}x ${m.classification} (${m.tradeName})`).join(", ");
    const primaryTrade = members.length > 0 ? members[0].tradeName : c.crewName;
    return {
      id: c.id,
      name: c.crewName,
      trade: primaryTrade,
      laborType: c.laborType,
      composition: memberDesc,
    };
  });

  const allAssignments: LaborAssignment[] = [];
  const BATCH_SIZE = 30;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    const prompt = `You are an expert construction estimator. Given these takeoff line items and available crew definitions, assign the most appropriate crew to each item and estimate the productivity rate (units of output per crew-hour).

AVAILABLE CREWS:
${JSON.stringify(crewSummaries, null, 2)}

TAKEOFF ITEMS TO ASSIGN:
${JSON.stringify(batch.map((item, idx) => ({
  index: idx,
  description: item.description,
  unit: item.unit,
  quantity: item.quantity,
  csiDivision: item.csiDivision,
})), null, 2)}

RULES:
- Match each item to the most appropriate crew based on trade, CSI division, and work type
- If no crew is a good match, set crewId to null and crewName to "unassigned"
- Productivity is in units per crew-hour (e.g., if a concrete crew can form and pour 50 SF per hour, productivity = 50)
- Use RS Means-style productivity rates as your baseline
- Consider the unit of measure when estimating productivity (SF/hr is different from CY/hr)
- For items that are material-only (e.g., "Concrete Sealer"), set a reasonable installation productivity
- Be conservative — slightly lower productivity is better than over-estimating

Return a JSON array with one object per item, in the same order as the input.`;

    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a construction estimating expert. Return only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "labor_assignments",
            strict: true,
            schema: {
              type: "object",
              properties: {
                assignments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      index: { type: "integer", description: "Index of the takeoff item" },
                      crewId: { type: ["integer", "null"], description: "ID of the assigned crew, or null if no match" },
                      crewName: { type: "string", description: "Name of the assigned crew" },
                      productivityPerCrewHr: { type: "number", description: "Units of output per crew-hour" },
                      reasoning: { type: "string", description: "Brief explanation of the assignment" },
                    },
                    required: ["index", "crewId", "crewName", "productivityPerCrewHr", "reasoning"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["assignments"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content as string | undefined;
      if (content) {
        const parsed = JSON.parse(content);
        const assignments = parsed.assignments || [];

        for (const a of assignments) {
          const item = batch[a.index];
          if (!item) continue;

          const validCrewId = a.crewId && crews.some(c => c.id === a.crewId) ? a.crewId : null;

          allAssignments.push({
            description: item.description,
            unit: item.unit,
            csiDivision: item.csiDivision,
            crewId: validCrewId,
            crewName: validCrewId ? a.crewName : "unassigned",
            productivityPerCrewHr: Math.max(0.1, a.productivityPerCrewHr || 1),
            reasoning: a.reasoning || "",
          });
        }
      }
    } catch (err) {
      console.error("[LaborInference] Batch error:", err);
      for (const item of batch) {
        allAssignments.push({
          description: item.description,
          unit: item.unit,
          csiDivision: item.csiDivision,
          crewId: null,
          crewName: "unassigned",
          productivityPerCrewHr: 1,
          reasoning: "AI inference failed for this item",
        });
      }
    }
  }

  return allAssignments;
}

// ─── Legacy: infer + save immediately ────────────────────────────────────────

/**
 * @deprecated Use inferLaborForItemsPreview + confirmLaborAssignments instead.
 * Kept for any callers that still use the old auto-save pattern.
 */
export async function inferLaborForItems(
  memberId: number,
  items: TakeoffItem[],
  crews: CrewDef[],
): Promise<LaborAssignment[]> {
  const allAssignments = await inferLaborForItemsPreview(items, crews);

  const db = await _getDb();
  if (!db) throw new Error("Database not available");

  const existingDescs = allAssignments.map(a => a.description);
  if (existingDescs.length > 0) {
    for (let i = 0; i < existingDescs.length; i += 50) {
      const batchDescs = existingDescs.slice(i, i + 50);
      await db.delete(activityProductivity).where(
        and(
          eq(activityProductivity.memberId, memberId),
          eq(activityProductivity.source, "ai_inferred"),
          inArray(activityProductivity.description, batchDescs),
        )
      );
    }
  }

  const toInsert = allAssignments
    .filter(a => a.crewId !== null && a.productivityPerCrewHr > 0)
    .map(a => ({
      memberId,
      csiDivision: a.csiDivision,
      description: a.description,
      unit: a.unit,
      crewId: a.crewId,
      productivityPerCrewHr: String(a.productivityPerCrewHr),
      source: "ai_inferred" as const,
      notes: a.reasoning,
    }));

  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 50) {
      await db.insert(activityProductivity).values(toInsert.slice(i, i + 50));
    }
  }

  return allAssignments;
}
