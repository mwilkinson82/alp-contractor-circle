/**
 * Cost Library DB helpers — CRUD for user-uploaded unit cost data.
 */
import { getDb as _getDb } from "./db";
import { userCostLibrary, type UserCostLibraryEntry, type InsertUserCostLibraryEntry } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function db() {
  const d = await _getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getCostLibraryByMember(memberId: number): Promise<UserCostLibraryEntry[]> {
  const d = await db();
  return d.select().from(userCostLibrary).where(eq(userCostLibrary.memberId, memberId));
}

export async function upsertCostLibraryEntries(
  memberId: number,
  entries: Array<{ description: string; unit: string; unitCost: number; csiDivision?: string; notes?: string }>
): Promise<number> {
  if (entries.length === 0) return 0;
  const d = await db();
  // Delete existing entries for this member and re-insert (full replace on upload)
  await d.delete(userCostLibrary).where(eq(userCostLibrary.memberId, memberId));
  const rows: InsertUserCostLibraryEntry[] = entries.map((e) => ({
    memberId,
    description: e.description.slice(0, 512),
    unit: e.unit.slice(0, 32),
    unitCost: Math.round(e.unitCost),
    csiDivision: e.csiDivision?.slice(0, 8),
    notes: e.notes,
  }));
  await d.insert(userCostLibrary).values(rows);
  return rows.length;
}

export async function deleteCostLibraryEntry(memberId: number, entryId: number): Promise<void> {
  const d = await db();
  await d.delete(userCostLibrary).where(
    and(eq(userCostLibrary.id, entryId), eq(userCostLibrary.memberId, memberId))
  );
}

export async function clearCostLibrary(memberId: number): Promise<void> {
  const d = await db();
  await d.delete(userCostLibrary).where(eq(userCostLibrary.memberId, memberId));
}
