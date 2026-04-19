/**
 * Estimate Markup DB helpers — CRUD for per-project markup configuration.
 */
import { getDb as _getDb } from "./db";
import { estimateMarkups, type EstimateMarkup } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function db() {
  const d = await _getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getEstimateMarkup(projectId: number, memberId: number): Promise<EstimateMarkup | null> {
  const d = await db();
  const rows = await d
    .select()
    .from(estimateMarkups)
    .where(and(eq(estimateMarkups.projectId, projectId), eq(estimateMarkups.memberId, memberId)))
    .limit(1);
  return rows[0] || null;
}

export async function upsertEstimateMarkup(
  projectId: number,
  memberId: number,
  data: {
    overheadPct?: number;
    profitPct?: number;
    contingencyPct?: number;
    bondPct?: number;
    taxPct?: number;
    generalConditionsPct?: number;
    customMarkups?: string;
  }
) {
  const d = await db();
  const existing = await getEstimateMarkup(projectId, memberId);
  if (existing) {
    await d
      .update(estimateMarkups)
      .set(data)
      .where(eq(estimateMarkups.id, existing.id));
    return existing.id;
  } else {
    const result = await d.insert(estimateMarkups).values({
      projectId,
      memberId,
      overheadPct: data.overheadPct ?? 1000,
      profitPct: data.profitPct ?? 1000,
      contingencyPct: data.contingencyPct ?? 500,
      bondPct: data.bondPct ?? 150,
      taxPct: data.taxPct ?? 0,
      generalConditionsPct: data.generalConditionsPct ?? 0,
      customMarkups: data.customMarkups || null,
    });
    return Number(result[0].insertId);
  }
}
