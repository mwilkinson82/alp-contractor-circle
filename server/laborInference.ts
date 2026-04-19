/**
 * laborInference.ts — AI-powered auto-matching of takeoff items to crews + productivity.
 *
 * Three entry points:
 *   inferLaborByTasks            — NEW: clusters items into installation tasks, assigns one crew per task
 *   inferLaborForItemsPreview    — legacy item-level: runs LLM, returns assignments WITHOUT saving (for review panel)
 *   inferLaborForItems           — legacy: runs LLM AND saves to DB immediately
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

// ─── Task-based grouping types ────────────────────────────────────────────────

export interface TaskGroup {
  taskName: string;
  taskDescription: string;
  crewId: number | null;
  crewName: string;
  items: Array<{
    description: string;
    unit: string;
    csiDivision: string;
    productivityPerCrewHr: number;
  }>;
  reasoning: string;
}

// ─── Task-based inference (new) ───────────────────────────────────────────────

/**
 * Cluster takeoff items into named installation tasks, then assign one crew per task.
 * Returns task groups that the review panel can display with inline crew editing.
 */
export async function inferLaborByTasks(
  items: TakeoffItem[],
  crews: CrewDef[],
): Promise<TaskGroup[]> {
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
      composition: memberDesc || c.crewName,
    };
  });

  const prompt = `You are an expert construction estimator. Your job is to organize takeoff line items into logical installation tasks, then assign the most appropriate crew to each task.

AVAILABLE CREWS:
${JSON.stringify(crewSummaries, null, 2)}

TAKEOFF ITEMS:
${JSON.stringify(items.map((item, idx) => ({
  index: idx,
  description: item.description,
  unit: item.unit,
  quantity: item.quantity,
  csiDivision: item.csiDivision,
})), null, 2)}

INSTRUCTIONS:
1. Group related line items into logical installation tasks (e.g., "Concrete Slab on Grade", "Exterior Framing", "Drywall Installation").
2. Each task should represent a distinct scope of work that one crew would perform.
3. Assign the most appropriate crew to each task based on trade and CSI division.
4. For each item within a task, estimate the productivity rate (units of output per crew-hour).
5. Use RS Means-style productivity rates as your baseline.
6. Items that cannot be logically grouped should each form their own single-item task.
7. Every item must appear in exactly one task.

Return a JSON object with a "tasks" array.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a construction estimating expert. Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "task_groups",
          strict: true,
          schema: {
            type: "object",
            properties: {
              tasks: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    taskName: { type: "string", description: "Short name for this installation task" },
                    taskDescription: { type: "string", description: "One-sentence description of the scope" },
                    crewId: { type: ["integer", "null"], description: "ID of the assigned crew, or null if no match" },
                    crewName: { type: "string", description: "Name of the assigned crew" },
                    reasoning: { type: "string", description: "Why this crew was selected for this task" },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "integer", description: "Index of the takeoff item from the input list" },
                          productivityPerCrewHr: { type: "number", description: "Units of output per crew-hour for this specific item" },
                        },
                        required: ["index", "productivityPerCrewHr"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["taskName", "taskDescription", "crewId", "crewName", "reasoning", "items"],
                  additionalProperties: false,
                },
              },
            },
            required: ["tasks"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content as string | undefined;
    if (!content) return fallbackToItemLevel(items, crews);

    const parsed = JSON.parse(content);
    const rawTasks = parsed.tasks || [];

    const taskGroups: TaskGroup[] = [];

    for (const task of rawTasks) {
      const validCrewId = task.crewId && crews.some(c => c.id === task.crewId) ? task.crewId : null;
      const crewName = validCrewId ? task.crewName : "unassigned";

      const taskItems = (task.items || [])
        .map((ti: any) => {
          const item = items[ti.index];
          if (!item) return null;
          return {
            description: item.description,
            unit: item.unit,
            csiDivision: item.csiDivision,
            productivityPerCrewHr: Math.max(0.1, ti.productivityPerCrewHr || 1),
          };
        })
        .filter(Boolean);

      if (taskItems.length === 0) continue;

      taskGroups.push({
        taskName: task.taskName || "Unnamed Task",
        taskDescription: task.taskDescription || "",
        crewId: validCrewId,
        crewName,
        items: taskItems,
        reasoning: task.reasoning || "",
      });
    }

    // Safety: ensure all items are covered
    const coveredDescs = new Set(taskGroups.flatMap(t => t.items.map(i => i.description)));
    const uncovered = items.filter(item => !coveredDescs.has(item.description));
    if (uncovered.length > 0) {
      taskGroups.push({
        taskName: "Unassigned Items",
        taskDescription: "Items not matched to an installation task",
        crewId: null,
        crewName: "unassigned",
        items: uncovered.map(item => ({
          description: item.description,
          unit: item.unit,
          csiDivision: item.csiDivision,
          productivityPerCrewHr: 1,
        })),
        reasoning: "These items could not be grouped automatically",
      });
    }

    return taskGroups;
  } catch (err) {
    console.error("[LaborInference] Task grouping error:", err);
    return fallbackToItemLevel(items, crews);
  }
}

/** Fallback: create one task per item if task grouping fails */
function fallbackToItemLevel(items: TakeoffItem[], _crews: CrewDef[]): TaskGroup[] {
  return items.map(item => ({
    taskName: item.description.slice(0, 60),
    taskDescription: "",
    crewId: null,
    crewName: "unassigned",
    items: [{
      description: item.description,
      unit: item.unit,
      csiDivision: item.csiDivision,
      productivityPerCrewHr: 1,
    }],
    reasoning: "Task grouping failed — please assign a crew manually",
  }));
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
