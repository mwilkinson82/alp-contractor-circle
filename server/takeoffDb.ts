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

import { getDb as _getDb } from "./db";

async function getDb() {
  return await _getDb();
}

// ─── Takeoff Projects ─────────────────────────────────────────────────────────

export async function createTakeoffProject(data: InsertTakeoffProject) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(takeoffProjects).values(data);
  return result.insertId;
}

export async function getTakeoffProjectsByMember(memberId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(takeoffProjects)
    .where(eq(takeoffProjects.memberId, memberId))
    .orderBy(desc(takeoffProjects.createdAt));
}

export async function getTakeoffProject(id: number) {
  const db = await getDb();
  if (!db) return null;
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
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(takeoffProjects)
    .set(data)
    .where(eq(takeoffProjects.id, id));
}

export async function deleteTakeoffProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  // Cascade: delete items → sheets → project
  await db.delete(takeoffItems).where(eq(takeoffItems.projectId, id));
  await db.delete(drawingSheets).where(eq(drawingSheets.projectId, id));
  await db.delete(takeoffProjects).where(eq(takeoffProjects.id, id));
}

// ─── Drawing Sheets ───────────────────────────────────────────────────────────

export async function createDrawingSheet(data: InsertDrawingSheet) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(drawingSheets).values(data);
  return result.insertId;
}

export async function createDrawingSheetsBatch(data: InsertDrawingSheet[]) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (data.length === 0) return;
  await db.insert(drawingSheets).values(data);
}

export async function getDrawingSheetsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(drawingSheets)
    .where(eq(drawingSheets.projectId, projectId))
    .orderBy(asc(drawingSheets.pageNumber));
}

export async function getDrawingSheet(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(drawingSheets)
    .where(eq(drawingSheets.id, id));
  return rows[0] || null;
}

export async function updateDrawingSheet(
  id: number,
  data: Partial<InsertDrawingSheet>
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(drawingSheets)
    .set(data)
    .where(eq(drawingSheets.id, id));
}

export async function getPendingSheets(projectId: number) {
  const db = await getDb();
  if (!db) return [];
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
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (data.length === 0) return;
  await db.insert(takeoffItems).values(data);
}

export async function getTakeoffItemsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(takeoffItems)
    .where(eq(takeoffItems.projectId, projectId))
    .orderBy(asc(takeoffItems.csiDivision), asc(takeoffItems.csiCode));
}

export async function getTakeoffItemsBySheet(sheetId: number) {
  const db = await getDb();
  if (!db) return [];
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
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(takeoffItems)
    .set(data)
    .where(eq(takeoffItems.id, id));
}

export async function deleteTakeoffItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(takeoffItems).where(eq(takeoffItems.id, id));
}

export async function deleteTakeoffItemsBySheet(sheetId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(takeoffItems).where(eq(takeoffItems.sheetId, sheetId));
}

export async function recalculateProjectTotal(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const items = await getTakeoffItemsByProject(projectId);
  const total = items.reduce((sum: number, item: { extendedCost: number | null }) => sum + (item.extendedCost || 0), 0);
  await db
    .update(takeoffProjects)
    .set({ totalEstimatedCost: total })
    .where(eq(takeoffProjects.id, projectId));
  return total;
}

/**
 * Recalculate all item costs for a project based on a new cost multiplier.
 * 
 * When a region changes, this function:
 * 1. Gets all items for the project
 * 2. For each item, recalculates unitCost and extendedCost using the new multiplier
 * 3. Updates each item in the database
 * 4. Recalculates the project total
 * 
 * @param projectId - The project ID
 * @param oldMultiplier - The previous multiplier (basis points, e.g., 10000 = 1.00x)
 * @param newMultiplier - The new multiplier (basis points)
 * @returns The new project total in cents
 */
export async function recalculateItemCosts(
  projectId: number,
  oldMultiplier: number,
  newMultiplier: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  // Get all items for this project
  const items = await getTakeoffItemsByProject(projectId);
  
  if (items.length === 0) {
    // No items to recalculate, just return current total
    return await recalculateProjectTotal(projectId);
  }

  // Calculate adjustment ratio: newMultiplier / oldMultiplier
  // This converts costs from old region to new region
  const adjustmentRatio = newMultiplier / oldMultiplier;

  // Update each item
  for (const item of items) {
    // Recalculate unit cost: old unit cost * adjustment ratio
    const newUnitCost = item.unitCost ? Math.round(item.unitCost * adjustmentRatio) : 0;
    
    // Recalculate extended cost: new unit cost * quantity
    const quantity = parseFloat(item.quantity || "0");
    const newExtendedCost = Math.round(newUnitCost * quantity);

    await updateTakeoffItem(item.id, {
      unitCost: newUnitCost,
      extendedCost: newExtendedCost,
    });
  }

  // Recalculate project total
  return await recalculateProjectTotal(projectId);
}

/** Bulk mark all items in a division (or all items) as reviewed */
export async function bulkReviewItems(
  projectId: number,
  csiDivision?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (csiDivision) {
    await db
      .update(takeoffItems)
      .set({ reviewed: true })
      .where(
        and(
          eq(takeoffItems.projectId, projectId),
          eq(takeoffItems.csiDivision, csiDivision)
        )
      );
  } else {
    await db
      .update(takeoffItems)
      .set({ reviewed: true })
      .where(eq(takeoffItems.projectId, projectId));
  }
}

/** Bulk mark all items in a division (or all items) as unreviewed */
export async function bulkUnreviewItems(
  projectId: number,
  csiDivision?: string | null
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  if (csiDivision) {
    await db
      .update(takeoffItems)
      .set({ reviewed: false })
      .where(
        and(
          eq(takeoffItems.projectId, projectId),
          eq(takeoffItems.csiDivision, csiDivision)
        )
      );
  } else {
    await db
      .update(takeoffItems)
      .set({ reviewed: false })
      .where(eq(takeoffItems.projectId, projectId));
  }
}
