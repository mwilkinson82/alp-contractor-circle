/**
 * Labor Library DB helpers — CRUD for user labor rate data.
 * Mirrors costLibraryDb.ts structure.
 */
import { getDb as _getDb } from "./db";
import { userLaborLibrary, type UserLaborLibraryEntry, type InsertUserLaborLibraryEntry } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

async function db() {
  const d = await _getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

export async function getLaborLibraryByMember(memberId: number): Promise<UserLaborLibraryEntry[]> {
  const d = await db();
  return d.select().from(userLaborLibrary).where(eq(userLaborLibrary.memberId, memberId));
}

export async function upsertLaborLibraryEntries(
  memberId: number,
  entries: Array<{ description: string; unit: string; laborRate: number; crewSize?: string; productivity?: string; csiDivision?: string; notes?: string }>
): Promise<number> {
  if (entries.length === 0) return 0;
  const d = await db();
  await d.delete(userLaborLibrary).where(eq(userLaborLibrary.memberId, memberId));
  const rows: InsertUserLaborLibraryEntry[] = entries.map((e) => ({
    memberId,
    description: e.description.slice(0, 512),
    unit: e.unit.slice(0, 32),
    laborRate: Math.round(e.laborRate),
    crewSize: e.crewSize || null,
    productivity: e.productivity || null,
    csiDivision: e.csiDivision?.slice(0, 8),
    notes: e.notes,
  }));
  await d.insert(userLaborLibrary).values(rows);
  return rows.length;
}

export async function addLaborLibraryEntry(
  memberId: number,
  entry: { description: string; unit: string; laborRate: number; crewSize?: string; productivity?: string; csiDivision?: string; notes?: string }
): Promise<number> {
  const d = await db();
  const result = await d.insert(userLaborLibrary).values({
    memberId,
    description: entry.description.slice(0, 512),
    unit: entry.unit.slice(0, 32),
    laborRate: Math.round(entry.laborRate),
    crewSize: entry.crewSize || null,
    productivity: entry.productivity || null,
    csiDivision: entry.csiDivision?.slice(0, 8),
    notes: entry.notes,
  });
  return (result as any).insertId;
}

export async function updateLaborLibraryEntry(
  memberId: number,
  entryId: number,
  updates: { description?: string; unit?: string; laborRate?: number; crewSize?: string; productivity?: string; csiDivision?: string; notes?: string }
): Promise<void> {
  const d = await db();
  await d.update(userLaborLibrary)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(userLaborLibrary.id, entryId), eq(userLaborLibrary.memberId, memberId)));
}

export async function deleteLaborLibraryEntry(memberId: number, entryId: number): Promise<void> {
  const d = await db();
  await d.delete(userLaborLibrary).where(
    and(eq(userLaborLibrary.id, entryId), eq(userLaborLibrary.memberId, memberId))
  );
}

export async function clearLaborLibrary(memberId: number): Promise<void> {
  const d = await db();
  await d.delete(userLaborLibrary).where(eq(userLaborLibrary.memberId, memberId));
}
