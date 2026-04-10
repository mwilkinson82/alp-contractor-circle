/**
 * Takeoff database helpers — CRUD for takeoff projects, drawing sheets, and items.
 */
import { eq, and, desc, asc, sql } from "drizzle-orm";
import {
  takeoffProjects,
  drawingSheets,
  takeoffItems,
  type InsertTakeoffProject,
  type InsertDrawingSheet,
  type InsertTakeoffItem,
} from "../drizzle/schema";

function getDb() {
  const { getDb: _getDb } = require("./_core/db");
  return _getDb();
}

// ─── Takeoff Projects ─────────────────────────────────────────────────────────

export async function createTakeoffProject(data: InsertTakeoffProject) {
  const db = getDb();
  const [result] = await db.insert(takeoffProjects).values(data);
  return result.insertId;
}

export async function getTakeoffProjectsByMember(memberId: number) {
  const db = getDb();
  return db
    .select()
    .from(takeoffProjects)
    .where(eq(takeoffProjects.memberId, memberId))
    .orderBy(desc(takeoffProjects.createdAt));
}

export async function getTakeoffProject(id: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(takeoffProjects)
    .where(eq(takeoffProjects.id, id));
  return rows[0] || null;
}

export async function updateTakeoffProject(
  id: number,
  data: Partial<InsertTakeoffProject>
) {
  const db = getDb();
  await db
    .update(takeoffProjects)
    .set(data)
    .where(eq(takeoffProjects.id, id));
}

export async function deleteTakeoffProject(id: number) {
  const db = getDb();
  // Cascade: delete items → sheets → project
  await db.delete(takeoffItems).where(eq(takeoffItems.projectId, id));
  await db.delete(drawingSheets).where(eq(drawingSheets.projectId, id));
  await db.delete(takeoffProjects).where(eq(takeoffProjects.id, id));
}

// ─── Drawing Sheets ───────────────────────────────────────────────────────────

export async function createDrawingSheet(data: InsertDrawingSheet) {
  const db = getDb();
  const [result] = await db.insert(drawingSheets).values(data);
  return result.insertId;
}

export async function createDrawingSheetsBatch(data: InsertDrawingSheet[]) {
  const db = getDb();
  if (data.length === 0) return [];
  const [result] = await db.insert(drawingSheets).values(data);
  // Return the first inserted ID; caller can infer subsequent IDs
  return result.insertId;
}

export async function getDrawingSheetsByProject(projectId: number) {
  const db = getDb();
  return db
    .select()
    .from(drawingSheets)
    .where(eq(drawingSheets.projectId, projectId))
    .orderBy(asc(drawingSheets.pageNumber));
}

export async function getDrawingSheet(id: number) {
  const db = getDb();
  const rows = await db
    .select()
    .from(drawingSheets)
    .where(eq(drawingSheets.id, id));
  return rows[0] || null;
}

export async function updateDrawingSheet(
  id: number,
  data: Partial<InsertDrawingSheet & { status: string; errorMessage: string | null; aiRawResponse: string | null; sheetName: string | null; sheetType: string }>
) {
  const db = getDb();
  await db
    .update(drawingSheets)
    .set(data)
    .where(eq(drawingSheets.id, id));
}

export async function getPendingSheets(projectId: number) {
  const db = getDb();
  return db
    .select()
    .from(drawingSheets)
    .where(
      and(
        eq(drawingSheets.projectId, projectId),
        eq(drawingSheets.status, "pending")
      )
    )
    .orderBy(asc(drawingSheets.pageNumber));
}

// ─── Takeoff Items ────────────────────────────────────────────────────────────

export async function createTakeoffItemsBatch(data: InsertTakeoffItem[]) {
  const db = getDb();
  if (data.length === 0) return;
  await db.insert(takeoffItems).values(data);
}

export async function getTakeoffItemsByProject(projectId: number) {
  const db = getDb();
  return db
    .select()
    .from(takeoffItems)
    .where(eq(takeoffItems.projectId, projectId))
    .orderBy(asc(takeoffItems.csiDivision), asc(takeoffItems.csiCode));
}

export async function getTakeoffItemsBySheet(sheetId: number) {
  const db = getDb();
  return db
    .select()
    .from(takeoffItems)
    .where(eq(takeoffItems.sheetId, sheetId))
    .orderBy(asc(takeoffItems.csiDivision));
}

export async function updateTakeoffItem(
  id: number,
  data: Partial<InsertTakeoffItem & { reviewed: boolean }>
) {
  const db = getDb();
  await db
    .update(takeoffItems)
    .set(data)
    .where(eq(takeoffItems.id, id));
}

export async function deleteTakeoffItem(id: number) {
  const db = getDb();
  await db.delete(takeoffItems).where(eq(takeoffItems.id, id));
}

export async function deleteTakeoffItemsBySheet(sheetId: number) {
  const db = getDb();
  await db.delete(takeoffItems).where(eq(takeoffItems.sheetId, sheetId));
}

export async function recalculateProjectTotal(projectId: number) {
  const db = getDb();
  const items = await getTakeoffItemsByProject(projectId);
  const total = items.reduce((sum: number, item: { extendedCost: number | null }) => sum + (item.extendedCost || 0), 0);
  await db
    .update(takeoffProjects)
    .set({ totalEstimatedCost: total })
    .where(eq(takeoffProjects.id, projectId));
  return total;
}
