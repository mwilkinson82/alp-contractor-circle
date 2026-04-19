/**
 * seedSmithResidence.ts
 *
 * Auto-seeds a personal copy of the Smith Residence CPM schedule (ID 1)
 * into a new member's account on their first login.
 *
 * This runs once per member (guarded by members.scheduleSeeded flag).
 * The copy is fully independent — the member owns it and can edit it freely.
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { members } from "../drizzle/schema";
import * as sdb from "./scheduleDb";
import { recalculateAndPersist } from "./scheduleRouter";

/** The canonical Smith Residence template schedule ID */
const SMITH_RESIDENCE_TEMPLATE_ID = 1;

let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

/**
 * Deep-copies the Smith Residence template schedule into the given member's account.
 * Marks members.scheduleSeeded = true after success so it never runs again.
 *
 * Safe to call multiple times — idempotent via the scheduleSeeded flag.
 */
export async function seedSmithResidenceForMember(memberId: number): Promise<void> {
  const db = getDb();
  if (!db) return;

  // Check if already seeded
  const rows = await db.select({ scheduleSeeded: members.scheduleSeeded })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!rows.length || rows[0].scheduleSeeded) {
    return; // Already seeded or member not found
  }

  try {
    // Load the template schedule
    const template = await sdb.getScheduleById(SMITH_RESIDENCE_TEMPLATE_ID);
    if (!template) {
      console.warn(`[SeedSmith] Template schedule ID ${SMITH_RESIDENCE_TEMPLATE_ID} not found — skipping seed for member ${memberId}`);
      return;
    }

    // ── 1. Create new schedule ────────────────────────────────────────────────
    const { id: newId } = await sdb.createSchedule({
      memberId,
      name: "Smith Residence",
      description: template.description,
      projectStartDate: template.projectStartDate,
      dataDate: template.dataDate ?? undefined,
      activityIdPrefix: template.activityIdPrefix,
      activityIdStart: template.activityIdStart,
      activityIdInterval: template.activityIdInterval,
      activityIdNext: template.activityIdNext,
      criticalBarColor: template.criticalBarColor ?? undefined,
      normalBarColor: template.normalBarColor ?? undefined,
      projectName: template.projectName ?? undefined,
      clientName: template.clientName ?? undefined,
      contractNumber: template.contractNumber ?? undefined,
      companyNameOverride: template.companyNameOverride ?? undefined,
      companyLogoOverride: template.companyLogoOverride ?? undefined,
    });

    // ── 2. Copy calendars + exceptions ────────────────────────────────────────
    const cals = await sdb.getCalendarsBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    const calIdMap = new Map<number, number>();
    for (const cal of cals) {
      const { id: newCalId } = await sdb.createCalendar({
        scheduleId: newId,
        name: cal.name,
        workWeek: cal.workWeek,
        workDaysMask: cal.workDaysMask,
        isDefault: cal.isDefault,
      });
      calIdMap.set(cal.id, newCalId);
      const exceptions = await sdb.getCalendarExceptions(cal.id);
      if (exceptions.length > 0) {
        await sdb.bulkCreateCalendarExceptions(
          exceptions.map(ex => ({
            calendarId: newCalId,
            exceptionDate: ex.exceptionDate,
            exceptionType: ex.exceptionType,
            description: ex.description ?? undefined,
          }))
        );
      }
    }
    if (template.defaultCalendarId && calIdMap.has(template.defaultCalendarId)) {
      await sdb.updateSchedule(newId, { defaultCalendarId: calIdMap.get(template.defaultCalendarId)! });
    }

    // ── 3. Copy WBS nodes (preserve hierarchy via parentId remap) ─────────────
    const wbsNodes = await sdb.getWbsBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    const wbsIdMap = new Map<number, number>();
    for (const w of wbsNodes) {
      const { id: newWbsId } = await sdb.createWbsNode({
        scheduleId: newId,
        parentId: w.parentId ? (wbsIdMap.get(w.parentId) ?? null) : null,
        code: w.code,
        name: w.name,
        sortOrder: w.sortOrder,
        groupColor: w.groupColor ?? undefined,
        groupTextColor: w.groupTextColor ?? undefined,
      });
      wbsIdMap.set(w.id, newWbsId);
    }

    // ── 4. Copy activities ────────────────────────────────────────────────────
    const acts = await sdb.getActivitiesBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    const actRows = acts.map(act => ({
      scheduleId: newId,
      activityId: act.activityId,
      name: act.name,
      duration: act.duration,
      wbs: act.wbs ?? undefined,
      percentComplete: act.percentComplete,
      actualStart: act.actualStart ?? undefined,
      actualFinish: act.actualFinish ?? undefined,
      sortOrder: act.sortOrder,
      calendarId: act.calendarId ? (calIdMap.get(act.calendarId) ?? null) : null,
      barColor: act.barColor ?? undefined,
      wbsId: act.wbsId ? (wbsIdMap.get(act.wbsId) ?? null) : null,
      activityType: (act.activityType as "task" | "milestone") ?? "task",
      constraintType: (act.constraintType as any) ?? "ASAP",
      constraintDate: act.constraintDate ?? undefined,
      notes: act.notes ?? undefined,
    }));
    const newActIds = await sdb.bulkCreateActivities(actRows);
    const actIdMap = new Map<number, number>();
    acts.forEach((act, i) => actIdMap.set(act.id, newActIds[i].id));

    // ── 5. Copy relationships ─────────────────────────────────────────────────
    const rels = await sdb.getRelationshipsBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    const relRows = rels
      .map(rel => ({
        scheduleId: newId,
        predecessorId: actIdMap.get(rel.predecessorId)!,
        successorId: actIdMap.get(rel.successorId)!,
        relationshipType: rel.relationshipType,
        lagDays: rel.lagDays,
      }))
      .filter(r => r.predecessorId && r.successorId);
    await sdb.bulkCreateRelationships(relRows);

    // ── 6. Copy activity code categories, values, and assignments ─────────────
    const categories = await sdb.getCodeCategoriesBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    const codeValueIdMap = new Map<number, number>();
    for (const cat of categories) {
      const { id: newCatId } = await sdb.createCodeCategory({
        scheduleId: newId,
        name: cat.name,
        sortOrder: cat.sortOrder,
      });
      const values = await sdb.getCodeValuesByCategory(cat.id);
      for (const val of values) {
        const { id: newValId } = await sdb.createCodeValue({
          categoryId: newCatId,
          value: val.value,
          color: val.color,
          sortOrder: val.sortOrder,
        });
        codeValueIdMap.set(val.id, newValId);
      }
    }
    const assignments = await sdb.getCodeAssignmentsBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    const codeAssignRows = assignments
      .map(asgn => ({
        activityId: actIdMap.get(asgn.activityId)!,
        codeValueId: codeValueIdMap.get(asgn.codeValueId)!,
      }))
      .filter(r => r.activityId && r.codeValueId);
    await sdb.bulkCreateCodeAssignments(codeAssignRows);

    // ── 7. Copy layouts ───────────────────────────────────────────────────────
    const layouts = await sdb.getLayoutsBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    for (const layout of layouts) {
      await sdb.createLayout({
        scheduleId: newId,
        name: layout.name,
        isDefault: layout.isDefault,
        config: layout.config,
      });
    }

    // ── 8. Copy annotations ───────────────────────────────────────────────────
    const annotations = await sdb.getAnnotationsBySchedule(SMITH_RESIDENCE_TEMPLATE_ID);
    if (annotations.length > 0) {
      await sdb.saveAnnotations(
        newId,
        annotations.map((ann, i) => ({
          scheduleId: newId,
          annotationType: ann.annotationType,
          data: ann.data,
          sortOrder: i,
        }))
      );
    }

    // ── 9. Recalculate CPM ────────────────────────────────────────────────────
    await recalculateAndPersist(newId);

    // ── 10. Mark as seeded ────────────────────────────────────────────────────
    await db.update(members)
      .set({ scheduleSeeded: true })
      .where(eq(members.id, memberId));

    console.log(`[SeedSmith] Seeded Smith Residence (new ID: ${newId}) for member ${memberId}`);
  } catch (err: any) {
    console.error(`[SeedSmith] Failed to seed Smith Residence for member ${memberId}:`, err?.message);
    // Don't throw — seed failure should not block login
  }
}
