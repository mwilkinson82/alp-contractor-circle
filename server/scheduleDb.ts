/**
 * Database helpers for the CPM Schedule Builder.
 * All queries return raw Drizzle rows — business logic lives in the router.
 */
import { and, eq, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  schedules,
  activities,
  activityRelationships,
  activityCodeCategories,
  activityCodeValues,
  activityCodeAssignments,
  scheduleBaselines,
  projectCalendars,
  calendarExceptions,
  scheduleWbs,
  scheduleLayouts,
  type InsertSchedule,
  type InsertActivity,
  type InsertActivityRelationship,
  type InsertActivityCodeCategory,
  type InsertActivityCodeValue,
  type InsertActivityCodeAssignment,
  type InsertScheduleBaseline,
  type InsertProjectCalendar,
  type InsertCalendarException,
  type InsertScheduleWbs,
  type InsertScheduleLayout,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

function requireDb() {
  const db = getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function createSchedule(data: InsertSchedule) {
  const db = requireDb();
  const result = await db.insert(schedules).values(data);
  const id = result[0].insertId;
  return { id };
}

export async function getScheduleById(id: number) {
  const db = requireDb();
  const rows = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
  return rows[0] || null;
}

export async function getSchedulesByMember(memberId: number) {
  const db = requireDb();
  return db
    .select()
    .from(schedules)
    .where(eq(schedules.memberId, memberId))
    .orderBy(desc(schedules.updatedAt));
}

export async function updateSchedule(id: number, data: Partial<InsertSchedule>) {
  const db = requireDb();
  await db.update(schedules).set(data).where(eq(schedules.id, id));
}

export async function deleteSchedule(id: number) {
  const db = requireDb();
  // Delete all related data first
  await deleteAllScheduleData(db, id);
  await db.delete(schedules).where(eq(schedules.id, id));
}

async function deleteAllScheduleData(db: ReturnType<typeof drizzle>, scheduleId: number) {
  // Get all activities to delete their code assignments
  const acts = await db.select({ id: activities.id }).from(activities).where(eq(activities.scheduleId, scheduleId));
  for (const act of acts) {
    await db.delete(activityCodeAssignments).where(eq(activityCodeAssignments.activityId, act.id));
  }
  // Get all code categories to delete their values
  const cats = await db.select({ id: activityCodeCategories.id }).from(activityCodeCategories).where(eq(activityCodeCategories.scheduleId, scheduleId));
  for (const cat of cats) {
    await db.delete(activityCodeValues).where(eq(activityCodeValues.categoryId, cat.id));
  }
  // Get all calendars to delete their exceptions
  const cals = await db.select({ id: projectCalendars.id }).from(projectCalendars).where(eq(projectCalendars.scheduleId, scheduleId));
  for (const cal of cals) {
    await db.delete(calendarExceptions).where(eq(calendarExceptions.calendarId, cal.id));
  }
  await db.delete(activityRelationships).where(eq(activityRelationships.scheduleId, scheduleId));
  await db.delete(activityCodeCategories).where(eq(activityCodeCategories.scheduleId, scheduleId));
  await db.delete(scheduleBaselines).where(eq(scheduleBaselines.scheduleId, scheduleId));
  await db.delete(projectCalendars).where(eq(projectCalendars.scheduleId, scheduleId));
  await db.delete(activities).where(eq(activities.scheduleId, scheduleId));
}

// ─── Activities ──────────────────────────────────────────────────────────────

export async function createActivity(data: InsertActivity) {
  const db = requireDb();
  const result = await db.insert(activities).values(data);
  return { id: result[0].insertId };
}

export async function getActivitiesBySchedule(scheduleId: number) {
  const db = requireDb();
  return db
    .select()
    .from(activities)
    .where(eq(activities.scheduleId, scheduleId))
    .orderBy(asc(activities.sortOrder));
}

export async function updateActivity(id: number, data: Partial<InsertActivity>) {
  const db = requireDb();
  await db.update(activities).set(data).where(eq(activities.id, id));
}

export async function deleteActivity(id: number) {
  const db = requireDb();
  // Delete code assignments for this activity
  await db.delete(activityCodeAssignments).where(eq(activityCodeAssignments.activityId, id));
  // Delete relationships involving this activity
  await db.delete(activityRelationships).where(eq(activityRelationships.predecessorId, id));
  await db.delete(activityRelationships).where(eq(activityRelationships.successorId, id));
  await db.delete(activities).where(eq(activities.id, id));
}

export async function bulkUpdateActivities(
  updates: Array<{ id: number; data: Partial<InsertActivity> }>
) {
  const db = requireDb();
  for (const u of updates) {
    await db.update(activities).set(u.data).where(eq(activities.id, u.id));
  }
}

// ─── Relationships ───────────────────────────────────────────────────────────

export async function createRelationship(data: InsertActivityRelationship) {
  const db = requireDb();
  const result = await db.insert(activityRelationships).values(data);
  return { id: result[0].insertId };
}

export async function getRelationshipsBySchedule(scheduleId: number) {
  const db = requireDb();
  return db
    .select()
    .from(activityRelationships)
    .where(eq(activityRelationships.scheduleId, scheduleId));
}

export async function deleteRelationship(id: number) {
  const db = requireDb();
  await db.delete(activityRelationships).where(eq(activityRelationships.id, id));
}

export async function updateRelationship(id: number, data: Partial<InsertActivityRelationship>) {
  const db = requireDb();
  await db.update(activityRelationships).set(data).where(eq(activityRelationships.id, id));
}

// ─── Activity Code Categories ────────────────────────────────────────────────

export async function createCodeCategory(data: InsertActivityCodeCategory) {
  const db = requireDb();
  const result = await db.insert(activityCodeCategories).values(data);
  return { id: result[0].insertId };
}

export async function getCodeCategoriesBySchedule(scheduleId: number) {
  const db = requireDb();
  return db
    .select()
    .from(activityCodeCategories)
    .where(eq(activityCodeCategories.scheduleId, scheduleId))
    .orderBy(asc(activityCodeCategories.sortOrder));
}

export async function updateCodeCategory(id: number, data: Partial<InsertActivityCodeCategory>) {
  const db = requireDb();
  await db.update(activityCodeCategories).set(data).where(eq(activityCodeCategories.id, id));
}

export async function deleteCodeCategory(id: number) {
  const db = requireDb();
  // Delete all values in this category first
  const values = await db.select({ id: activityCodeValues.id }).from(activityCodeValues).where(eq(activityCodeValues.categoryId, id));
  for (const v of values) {
    await db.delete(activityCodeAssignments).where(eq(activityCodeAssignments.codeValueId, v.id));
  }
  await db.delete(activityCodeValues).where(eq(activityCodeValues.categoryId, id));
  await db.delete(activityCodeCategories).where(eq(activityCodeCategories.id, id));
}

// ─── Activity Code Values ────────────────────────────────────────────────────

export async function createCodeValue(data: InsertActivityCodeValue) {
  const db = requireDb();
  const result = await db.insert(activityCodeValues).values(data);
  return { id: result[0].insertId };
}

export async function getCodeValuesByCategory(categoryId: number) {
  const db = requireDb();
  return db
    .select()
    .from(activityCodeValues)
    .where(eq(activityCodeValues.categoryId, categoryId))
    .orderBy(asc(activityCodeValues.sortOrder));
}

export async function updateCodeValue(id: number, data: Partial<InsertActivityCodeValue>) {
  const db = requireDb();
  await db.update(activityCodeValues).set(data).where(eq(activityCodeValues.id, id));
}

export async function deleteCodeValue(id: number) {
  const db = requireDb();
  await db.delete(activityCodeAssignments).where(eq(activityCodeAssignments.codeValueId, id));
  await db.delete(activityCodeValues).where(eq(activityCodeValues.id, id));
}

// ─── Activity Code Assignments ───────────────────────────────────────────────

export async function assignCodeToActivity(data: InsertActivityCodeAssignment) {
  const db = requireDb();
  const result = await db.insert(activityCodeAssignments).values(data);
  return { id: result[0].insertId };
}

export async function getCodeAssignmentsByActivity(activityId: number) {
  const db = requireDb();
  return db
    .select()
    .from(activityCodeAssignments)
    .where(eq(activityCodeAssignments.activityId, activityId));
}

export async function getCodeAssignmentsBySchedule(scheduleId: number) {
  const db = requireDb();
  // Get all activities for this schedule, then their assignments
  const acts = await db.select({ id: activities.id }).from(activities).where(eq(activities.scheduleId, scheduleId));
  if (acts.length === 0) return [];
  
  const allAssignments = [];
  for (const act of acts) {
    const assignments = await db
      .select()
      .from(activityCodeAssignments)
      .where(eq(activityCodeAssignments.activityId, act.id));
    allAssignments.push(...assignments);
  }
  return allAssignments;
}

export async function removeCodeFromActivity(activityId: number, codeValueId: number) {
  const db = requireDb();
  await db
    .delete(activityCodeAssignments)
    .where(
      and(
        eq(activityCodeAssignments.activityId, activityId),
        eq(activityCodeAssignments.codeValueId, codeValueId),
      ),
    );
}

export async function setActivityCodes(activityId: number, codeValueIds: number[]) {
  const db = requireDb();
  // Remove all existing assignments
  await db.delete(activityCodeAssignments).where(eq(activityCodeAssignments.activityId, activityId));
  // Insert new assignments
  for (const codeValueId of codeValueIds) {
    await db.insert(activityCodeAssignments).values({ activityId, codeValueId });
  }
}

// ─── Baselines ───────────────────────────────────────────────────────────────

export async function createBaseline(data: InsertScheduleBaseline) {
  const db = requireDb();
  const result = await db.insert(scheduleBaselines).values(data);
  return { id: result[0].insertId };
}

export async function getBaselinesBySchedule(scheduleId: number) {
  const db = requireDb();
  return db
    .select()
    .from(scheduleBaselines)
    .where(eq(scheduleBaselines.scheduleId, scheduleId))
    .orderBy(desc(scheduleBaselines.createdAt));
}

export async function getBaselineById(id: number) {
  const db = requireDb();
  const rows = await db.select().from(scheduleBaselines).where(eq(scheduleBaselines.id, id)).limit(1);
  return rows[0] || null;
}

export async function deleteBaseline(id: number) {
  const db = requireDb();
  await db.delete(scheduleBaselines).where(eq(scheduleBaselines.id, id));
}

// ─── Calendars ───────────────────────────────────────────────────────────────

export async function createCalendar(data: InsertProjectCalendar) {
  const db = requireDb();
  const result = await db.insert(projectCalendars).values(data);
  return { id: result[0].insertId };
}

export async function getCalendarsBySchedule(scheduleId: number) {
  const db = requireDb();
  return db
    .select()
    .from(projectCalendars)
    .where(eq(projectCalendars.scheduleId, scheduleId));
}

export async function updateCalendar(id: number, data: Partial<InsertProjectCalendar>) {
  const db = requireDb();
  await db.update(projectCalendars).set(data).where(eq(projectCalendars.id, id));
}

export async function deleteCalendar(id: number) {
  const db = requireDb();
  await db.delete(calendarExceptions).where(eq(calendarExceptions.calendarId, id));
  await db.delete(projectCalendars).where(eq(projectCalendars.id, id));
}

export async function getCalendarExceptions(calendarId: number) {
  const db = requireDb();
  return db
    .select()
    .from(calendarExceptions)
    .where(eq(calendarExceptions.calendarId, calendarId))
    .orderBy(asc(calendarExceptions.exceptionDate));
}

export async function addCalendarException(data: InsertCalendarException) {
  const db = requireDb();
  const result = await db.insert(calendarExceptions).values(data);
  return { id: result[0].insertId };
}

export async function deleteCalendarException(id: number) {
  const db = requireDb();
  await db.delete(calendarExceptions).where(eq(calendarExceptions.id, id));
}

// ─── WBS (Work Breakdown Structure) ─────────────────────────────────────────

export async function createWbsNode(data: InsertScheduleWbs) {
  const db = requireDb();
  const result = await db.insert(scheduleWbs).values(data);
  return { id: result[0].insertId };
}

export async function getWbsBySchedule(scheduleId: number) {
  const db = requireDb();
  return db
    .select()
    .from(scheduleWbs)
    .where(eq(scheduleWbs.scheduleId, scheduleId))
    .orderBy(asc(scheduleWbs.sortOrder));
}

export async function updateWbsNode(id: number, data: Partial<InsertScheduleWbs>) {
  const db = requireDb();
  await db.update(scheduleWbs).set(data).where(eq(scheduleWbs.id, id));
}

export async function deleteWbsNode(id: number) {
  const db = requireDb();
  // Unlink activities from this WBS node
  await db.update(activities).set({ wbsId: null }).where(eq(activities.wbsId, id));
  // Delete child WBS nodes recursively
  const children = await db.select({ id: scheduleWbs.id }).from(scheduleWbs).where(eq(scheduleWbs.parentId, id));
  for (const child of children) {
    await deleteWbsNode(child.id);
  }
  await db.delete(scheduleWbs).where(eq(scheduleWbs.id, id));
}

export async function deleteWbsBySchedule(scheduleId: number) {
  const db = requireDb();
  await db.delete(scheduleWbs).where(eq(scheduleWbs.scheduleId, scheduleId));
}

// ─── Layouts ────────────────────────────────────────────────────────────────

export async function createLayout(data: InsertScheduleLayout) {
  const db = requireDb();
  const result = await db.insert(scheduleLayouts).values(data);
  return { id: result[0].insertId };
}

export async function getLayoutsBySchedule(scheduleId: number) {
  const db = requireDb();
  return db
    .select()
    .from(scheduleLayouts)
    .where(eq(scheduleLayouts.scheduleId, scheduleId))
    .orderBy(asc(scheduleLayouts.name));
}

export async function getLayoutById(id: number) {
  const db = requireDb();
  const rows = await db.select().from(scheduleLayouts).where(eq(scheduleLayouts.id, id)).limit(1);
  return rows[0] || null;
}

export async function updateLayout(id: number, data: Partial<InsertScheduleLayout>) {
  const db = requireDb();
  await db.update(scheduleLayouts).set({ ...data, updatedAt: new Date() }).where(eq(scheduleLayouts.id, id));
}

export async function deleteLayout(id: number) {
  const db = requireDb();
  await db.delete(scheduleLayouts).where(eq(scheduleLayouts.id, id));
}

export async function clearDefaultLayouts(scheduleId: number) {
  const db = requireDb();
  await db.update(scheduleLayouts).set({ isDefault: false }).where(eq(scheduleLayouts.scheduleId, scheduleId));
}

export async function deleteLayoutsBySchedule(scheduleId: number) {
  const db = requireDb();
  await db.delete(scheduleLayouts).where(eq(scheduleLayouts.scheduleId, scheduleId));
}
