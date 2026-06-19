/**
 * ConstructLine observability helpers.
 *
 * These tables let us compare analysis runs, model choices, duration, and QA
 * findings without changing the estimator workflow.
 */
import { eq, desc, sql } from "drizzle-orm";
import {
  takeoffAnalysisRuns,
  takeoffLlmAttempts,
  takeoffQaFindings,
  type InsertTakeoffAnalysisRun,
  type InsertTakeoffLlmAttempt,
  type InsertTakeoffQaFinding,
} from "../drizzle/schema";
import { getDb as _getDb } from "./db";

async function getDb() {
  return await _getDb();
}

export async function createTakeoffAnalysisRun(
  data: InsertTakeoffAnalysisRun
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(takeoffAnalysisRuns).values(data);
  return result.insertId;
}

export async function updateTakeoffAnalysisRun(
  id: number | null | undefined,
  data: Partial<InsertTakeoffAnalysisRun>
): Promise<void> {
  if (!id) return;
  const db = await getDb();
  if (!db) return;
  await db
    .update(takeoffAnalysisRuns)
    .set(data)
    .where(eq(takeoffAnalysisRuns.id, id));
}

export async function getLatestTakeoffAnalysisRun(projectId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(takeoffAnalysisRuns)
    .where(eq(takeoffAnalysisRuns.projectId, projectId))
    .orderBy(desc(takeoffAnalysisRuns.createdAt))
    .limit(1);
  return rows[0] || null;
}

export async function createTakeoffLlmAttempt(
  data: InsertTakeoffLlmAttempt
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(takeoffLlmAttempts).values(data);
  return result.insertId;
}

export async function summarizeTakeoffAnalysisRun(
  runId: number | null | undefined
): Promise<void> {
  if (!runId) return;
  const db = await getDb();
  if (!db) return;
  const attempts = await db
    .select()
    .from(takeoffLlmAttempts)
    .where(eq(takeoffLlmAttempts.runId, runId));
  const existingRows = await db
    .select()
    .from(takeoffAnalysisRuns)
    .where(eq(takeoffAnalysisRuns.id, runId))
    .limit(1);
  const existingSummary =
    existingRows[0]?.summary &&
    typeof existingRows[0].summary === "object" &&
    !Array.isArray(existingRows[0].summary)
      ? (existingRows[0].summary as Record<string, unknown>)
      : {};

  const summary = attempts.reduce(
    (acc, attempt) => {
      acc.totalPromptTokens += attempt.promptTokens || 0;
      acc.totalCompletionTokens += attempt.completionTokens || 0;
      acc.totalTokens += attempt.totalTokens || 0;
      acc.estimatedCostCents += attempt.estimatedCostCents || 0;
      acc.attemptCount += 1;
      if (attempt.status === "error") acc.errorCount += 1;
      return acc;
    },
    {
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      totalTokens: 0,
      estimatedCostCents: 0,
      attemptCount: 0,
      errorCount: 0,
    }
  );

  await db
    .update(takeoffAnalysisRuns)
    .set({
      totalPromptTokens: summary.totalPromptTokens,
      totalCompletionTokens: summary.totalCompletionTokens,
      totalTokens: summary.totalTokens,
      estimatedCostCents:
        summary.estimatedCostCents > 0 ? summary.estimatedCostCents : null,
      summary: {
        ...existingSummary,
        ...(attempts.length > 0 ? { llmAttempts: attempts.length } : {}),
        errorCount: summary.errorCount,
      },
    } as any)
    .where(eq(takeoffAnalysisRuns.id, runId));
}

export async function getTakeoffQaFindings(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(takeoffQaFindings)
    .where(eq(takeoffQaFindings.projectId, projectId))
    .orderBy(desc(takeoffQaFindings.createdAt));
}

export async function replaceOpenTakeoffQaFindings(
  projectId: number,
  runId: number | null | undefined,
  findings: InsertTakeoffQaFinding[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(takeoffQaFindings)
    .where(
      sql`${takeoffQaFindings.projectId} = ${projectId} AND ${takeoffQaFindings.status} = 'open'`
    );

  if (findings.length === 0) return;
  await db.insert(takeoffQaFindings).values(
    findings.map(finding => ({
      ...finding,
      projectId,
      runId: runId || null,
      status: finding.status || "open",
    }))
  );
}
