/**
 * tRPC router for the CPM Schedule Builder.
 * Uses Discord member auth (same as memberRouter).
 */
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { z } from "zod";
import type { Member } from "../drizzle/schema";
import {
  calculateCPM,
  generateNextActivityId,
  getUSConstructionHolidays,
  type CpmCalendar,
  type CpmActivity,
  type CpmRelationship,
} from "../shared/cpmEngine";
import * as sdb from "./scheduleDb";

// ─── Auth Helper ─────────────────────────────────────────────────────────────

async function requireMember(req: any): Promise<Member> {
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
  const member = await getMemberById(session.memberId);
  if (!member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Member not found" });
  return member;
}

async function requireScheduleOwner(req: any, scheduleId: number) {
  const member = await requireMember(req);
  const schedule = await sdb.getScheduleById(scheduleId);
  if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });
  if (schedule.memberId !== member.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your schedule" });
  return { member, schedule };
}

// ─── Build CpmCalendar objects from DB data ──────────────────────────────────

async function buildCalendarsForSchedule(scheduleId: number): Promise<{ calendars: Map<number, CpmCalendar>; defaultCalendarId: number }> {
  const cals = await sdb.getCalendarsBySchedule(scheduleId);
  const calMap = new Map<number, CpmCalendar>();
  let defaultCalId = 0;

  for (const cal of cals) {
    const exceptions = await sdb.getCalendarExceptions(cal.id);
    const holidays = new Set<string>();
    const workdayOverrides = new Set<string>();

    for (const ex of exceptions) {
      const key = ex.exceptionDate.toISOString().slice(0, 10);
      if (ex.exceptionType === "holiday") {
        holidays.add(key);
      } else {
        workdayOverrides.add(key);
      }
    }

    calMap.set(cal.id, {
      id: cal.id,
      name: cal.name,
      workDaysMask: cal.workDaysMask,
      holidays,
      workdayOverrides,
    });

    if (cal.isDefault) defaultCalId = cal.id;
  }

  // If no default found, use the first calendar or create a fallback
  if (defaultCalId === 0 && cals.length > 0) {
    defaultCalId = cals[0].id;
  }

  return { calendars: calMap, defaultCalendarId: defaultCalId };
}

// ─── Recalculate CPM and persist results ─────────────────────────────────────

async function recalculateAndPersist(scheduleId: number) {
  const schedule = await sdb.getScheduleById(scheduleId);
  if (!schedule) return;

  const acts = await sdb.getActivitiesBySchedule(scheduleId);
  const rels = await sdb.getRelationshipsBySchedule(scheduleId);
  const { calendars, defaultCalendarId } = await buildCalendarsForSchedule(scheduleId);

  const cpmActivities: CpmActivity[] = acts.map((a) => ({
    id: a.id,
    activityId: a.activityId,
    name: a.name,
    duration: a.duration,
    sortOrder: a.sortOrder,
    wbs: a.wbs,
    percentComplete: parseFloat(String(a.percentComplete)),
    actualStart: a.actualStart,
    actualFinish: a.actualFinish,
    calendarId: a.calendarId,
  }));

  const cpmRels: CpmRelationship[] = rels.map((r) => ({
    id: r.id,
    predecessorId: r.predecessorId,
    successorId: r.successorId,
    relationshipType: r.relationshipType,
    lagDays: r.lagDays,
  }));

  const output = calculateCPM(
    cpmActivities,
    cpmRels,
    schedule.projectStartDate,
    calendars,
    defaultCalendarId,
  );

  // Persist computed values
  const updates: Array<{ id: number; data: any }> = [];
  for (const act of acts) {
    const result = output.results.get(act.id);
    if (result) {
      updates.push({
        id: act.id,
        data: {
          earlyStart: result.earlyStart,
          earlyFinish: result.earlyFinish,
          lateStart: result.lateStart,
          lateFinish: result.lateFinish,
          totalFloat: result.totalFloat,
          freeFloat: result.freeFloat,
          isCritical: result.isCritical,
        },
      });
    }
  }

  if (updates.length > 0) {
    await sdb.bulkUpdateActivities(updates);
  }

  return output;
}

// ─── Schedule Templates ──────────────────────────────────────────────────────

const SCHEDULE_TEMPLATES = {
  residential: {
    name: "Residential New Build",
    description: "Standard residential construction schedule with typical phases",
    activities: [
      { activityId: "A1010", name: "Site Survey & Layout", duration: 2, wbs: "1.0" },
      { activityId: "A1020", name: "Demolition / Site Clearing", duration: 3, wbs: "1.0" },
      { activityId: "A1030", name: "Excavation & Grading", duration: 5, wbs: "1.0" },
      { activityId: "A1040", name: "Foundation Footings", duration: 5, wbs: "2.0" },
      { activityId: "A1050", name: "Foundation Walls & Waterproofing", duration: 7, wbs: "2.0" },
      { activityId: "A1060", name: "Slab on Grade / Basement Slab", duration: 3, wbs: "2.0" },
      { activityId: "A1070", name: "Backfill & Compaction", duration: 2, wbs: "2.0" },
      { activityId: "A1080", name: "Underground Plumbing Rough-In", duration: 3, wbs: "3.0" },
      { activityId: "A1090", name: "Framing — First Floor", duration: 10, wbs: "3.0" },
      { activityId: "A1100", name: "Framing — Second Floor", duration: 8, wbs: "3.0" },
      { activityId: "A1110", name: "Roof Framing & Sheathing", duration: 7, wbs: "3.0" },
      { activityId: "A1120", name: "Roofing (Shingles / Metal)", duration: 5, wbs: "3.0" },
      { activityId: "A1130", name: "Windows & Exterior Doors", duration: 3, wbs: "4.0" },
      { activityId: "A1140", name: "Exterior Siding / Masonry", duration: 10, wbs: "4.0" },
      { activityId: "A1150", name: "Electrical Rough-In", duration: 8, wbs: "5.0" },
      { activityId: "A1160", name: "Plumbing Rough-In", duration: 7, wbs: "5.0" },
      { activityId: "A1170", name: "HVAC Rough-In", duration: 7, wbs: "5.0" },
      { activityId: "A1180", name: "Insulation", duration: 4, wbs: "5.0" },
      { activityId: "A1190", name: "Drywall Hang & Finish", duration: 12, wbs: "6.0" },
      { activityId: "A1200", name: "Interior Trim & Doors", duration: 8, wbs: "6.0" },
      { activityId: "A1210", name: "Cabinets & Countertops", duration: 5, wbs: "6.0" },
      { activityId: "A1220", name: "Interior Paint", duration: 7, wbs: "6.0" },
      { activityId: "A1230", name: "Flooring (Tile, Hardwood, Carpet)", duration: 8, wbs: "6.0" },
      { activityId: "A1240", name: "Electrical Trim-Out", duration: 3, wbs: "7.0" },
      { activityId: "A1250", name: "Plumbing Trim-Out", duration: 3, wbs: "7.0" },
      { activityId: "A1260", name: "HVAC Trim-Out & Startup", duration: 2, wbs: "7.0" },
      { activityId: "A1270", name: "Appliance Installation", duration: 2, wbs: "7.0" },
      { activityId: "A1280", name: "Landscaping & Hardscape", duration: 7, wbs: "8.0" },
      { activityId: "A1290", name: "Driveway & Walkways", duration: 4, wbs: "8.0" },
      { activityId: "A1300", name: "Final Cleaning", duration: 2, wbs: "9.0" },
      { activityId: "A1310", name: "Punch List", duration: 5, wbs: "9.0" },
      { activityId: "A1320", name: "Final Inspections & CO", duration: 3, wbs: "9.0" },
    ],
    relationships: [
      { pred: "A1010", succ: "A1020", type: "FS" as const, lag: 0 },
      { pred: "A1020", succ: "A1030", type: "FS" as const, lag: 0 },
      { pred: "A1030", succ: "A1040", type: "FS" as const, lag: 0 },
      { pred: "A1040", succ: "A1050", type: "FS" as const, lag: 0 },
      { pred: "A1050", succ: "A1060", type: "FS" as const, lag: 0 },
      { pred: "A1060", succ: "A1070", type: "FS" as const, lag: 0 },
      { pred: "A1060", succ: "A1080", type: "FS" as const, lag: 0 },
      { pred: "A1070", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1080", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1090", succ: "A1100", type: "FS" as const, lag: 0 },
      { pred: "A1100", succ: "A1110", type: "FS" as const, lag: 0 },
      { pred: "A1110", succ: "A1120", type: "FS" as const, lag: 0 },
      { pred: "A1110", succ: "A1130", type: "FS" as const, lag: 0 },
      { pred: "A1120", succ: "A1140", type: "FS" as const, lag: 0 },
      { pred: "A1130", succ: "A1150", type: "FS" as const, lag: 0 },
      { pred: "A1130", succ: "A1160", type: "FS" as const, lag: 0 },
      { pred: "A1130", succ: "A1170", type: "FS" as const, lag: 0 },
      { pred: "A1150", succ: "A1180", type: "FS" as const, lag: 0 },
      { pred: "A1160", succ: "A1180", type: "FS" as const, lag: 0 },
      { pred: "A1170", succ: "A1180", type: "FS" as const, lag: 0 },
      { pred: "A1180", succ: "A1190", type: "FS" as const, lag: 0 },
      { pred: "A1190", succ: "A1200", type: "FS" as const, lag: 0 },
      { pred: "A1190", succ: "A1210", type: "FS" as const, lag: 0 },
      { pred: "A1190", succ: "A1220", type: "FS" as const, lag: 0 },
      { pred: "A1220", succ: "A1230", type: "FS" as const, lag: 0 },
      { pred: "A1200", succ: "A1230", type: "FS" as const, lag: 0 },
      { pred: "A1210", succ: "A1240", type: "FS" as const, lag: 0 },
      { pred: "A1230", succ: "A1240", type: "FS" as const, lag: 0 },
      { pred: "A1240", succ: "A1250", type: "SS" as const, lag: 0 },
      { pred: "A1250", succ: "A1260", type: "SS" as const, lag: 0 },
      { pred: "A1260", succ: "A1270", type: "FS" as const, lag: 0 },
      { pred: "A1140", succ: "A1280", type: "FS" as const, lag: 0 },
      { pred: "A1280", succ: "A1290", type: "SS" as const, lag: 2 },
      { pred: "A1270", succ: "A1300", type: "FS" as const, lag: 0 },
      { pred: "A1290", succ: "A1300", type: "FS" as const, lag: 0 },
      { pred: "A1300", succ: "A1310", type: "FS" as const, lag: 0 },
      { pred: "A1310", succ: "A1320", type: "FS" as const, lag: 0 },
    ],
    codeCategories: [
      { name: "Phase", values: ["Sitework", "Foundation", "Structure", "Enclosure", "MEP Rough-In", "Finishes", "MEP Trim", "Exterior", "Closeout"] },
      { name: "Trade", values: ["General", "Concrete", "Framing", "Roofing", "Electrical", "Plumbing", "HVAC", "Drywall", "Paint", "Flooring", "Landscaping"] },
    ],
  },
  commercial_ti: {
    name: "Commercial Tenant Improvement",
    description: "Standard commercial TI schedule for office/retail buildout",
    activities: [
      { activityId: "A1010", name: "Pre-Construction Meeting", duration: 1, wbs: "1.0" },
      { activityId: "A1020", name: "Permits & Submittals", duration: 10, wbs: "1.0" },
      { activityId: "A1030", name: "Selective Demolition", duration: 5, wbs: "2.0" },
      { activityId: "A1040", name: "Rough Framing", duration: 8, wbs: "2.0" },
      { activityId: "A1050", name: "Electrical Rough-In", duration: 7, wbs: "3.0" },
      { activityId: "A1060", name: "Plumbing Rough-In", duration: 5, wbs: "3.0" },
      { activityId: "A1070", name: "HVAC Modifications", duration: 6, wbs: "3.0" },
      { activityId: "A1080", name: "Fire Sprinkler Modifications", duration: 4, wbs: "3.0" },
      { activityId: "A1090", name: "Insulation", duration: 3, wbs: "4.0" },
      { activityId: "A1100", name: "Drywall", duration: 8, wbs: "4.0" },
      { activityId: "A1110", name: "Taping & Finishing", duration: 5, wbs: "4.0" },
      { activityId: "A1120", name: "Prime & Paint", duration: 5, wbs: "5.0" },
      { activityId: "A1130", name: "Ceiling Grid & Tile", duration: 4, wbs: "5.0" },
      { activityId: "A1140", name: "Flooring", duration: 5, wbs: "5.0" },
      { activityId: "A1150", name: "Millwork & Casework", duration: 4, wbs: "5.0" },
      { activityId: "A1160", name: "Electrical Trim-Out", duration: 3, wbs: "6.0" },
      { activityId: "A1170", name: "Plumbing Trim-Out", duration: 2, wbs: "6.0" },
      { activityId: "A1180", name: "HVAC Startup & Balance", duration: 3, wbs: "6.0" },
      { activityId: "A1190", name: "Final Clean", duration: 2, wbs: "7.0" },
      { activityId: "A1200", name: "Punch List", duration: 3, wbs: "7.0" },
      { activityId: "A1210", name: "Final Inspection", duration: 2, wbs: "7.0" },
    ],
    relationships: [
      { pred: "A1010", succ: "A1020", type: "FS" as const, lag: 0 },
      { pred: "A1020", succ: "A1030", type: "FS" as const, lag: 0 },
      { pred: "A1030", succ: "A1040", type: "FS" as const, lag: 0 },
      { pred: "A1040", succ: "A1050", type: "FS" as const, lag: 0 },
      { pred: "A1040", succ: "A1060", type: "FS" as const, lag: 0 },
      { pred: "A1040", succ: "A1070", type: "FS" as const, lag: 0 },
      { pred: "A1040", succ: "A1080", type: "FS" as const, lag: 0 },
      { pred: "A1050", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1060", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1070", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1080", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1090", succ: "A1100", type: "FS" as const, lag: 0 },
      { pred: "A1100", succ: "A1110", type: "FS" as const, lag: 0 },
      { pred: "A1110", succ: "A1120", type: "FS" as const, lag: 0 },
      { pred: "A1110", succ: "A1130", type: "FS" as const, lag: 0 },
      { pred: "A1120", succ: "A1140", type: "FS" as const, lag: 0 },
      { pred: "A1130", succ: "A1140", type: "FS" as const, lag: 0 },
      { pred: "A1120", succ: "A1150", type: "FS" as const, lag: 0 },
      { pred: "A1140", succ: "A1160", type: "FS" as const, lag: 0 },
      { pred: "A1150", succ: "A1160", type: "FS" as const, lag: 0 },
      { pred: "A1160", succ: "A1170", type: "SS" as const, lag: 0 },
      { pred: "A1170", succ: "A1180", type: "FS" as const, lag: 0 },
      { pred: "A1180", succ: "A1190", type: "FS" as const, lag: 0 },
      { pred: "A1190", succ: "A1200", type: "FS" as const, lag: 0 },
      { pred: "A1200", succ: "A1210", type: "FS" as const, lag: 0 },
    ],
    codeCategories: [
      { name: "Phase", values: ["Pre-Con", "Demo", "MEP Rough", "Drywall", "Finishes", "MEP Trim", "Closeout"] },
      { name: "Trade", values: ["General", "Electrical", "Plumbing", "HVAC", "Fire Protection", "Drywall", "Paint", "Flooring", "Millwork"] },
    ],
  },
  renovation: {
    name: "Renovation / Remodel",
    description: "General renovation schedule for existing structures",
    activities: [
      { activityId: "A1010", name: "Pre-Construction Walkthrough", duration: 1, wbs: "1.0" },
      { activityId: "A1020", name: "Permits", duration: 7, wbs: "1.0" },
      { activityId: "A1030", name: "Protection & Containment", duration: 2, wbs: "2.0" },
      { activityId: "A1040", name: "Selective Demolition", duration: 5, wbs: "2.0" },
      { activityId: "A1050", name: "Structural Modifications", duration: 7, wbs: "3.0" },
      { activityId: "A1060", name: "Electrical Rough-In", duration: 6, wbs: "3.0" },
      { activityId: "A1070", name: "Plumbing Rough-In", duration: 5, wbs: "3.0" },
      { activityId: "A1080", name: "HVAC Modifications", duration: 5, wbs: "3.0" },
      { activityId: "A1090", name: "Insulation & Vapor Barrier", duration: 3, wbs: "4.0" },
      { activityId: "A1100", name: "Drywall & Plaster Repair", duration: 7, wbs: "4.0" },
      { activityId: "A1110", name: "Tile Work", duration: 5, wbs: "5.0" },
      { activityId: "A1120", name: "Cabinets & Countertops", duration: 4, wbs: "5.0" },
      { activityId: "A1130", name: "Interior Paint", duration: 5, wbs: "5.0" },
      { activityId: "A1140", name: "Flooring", duration: 5, wbs: "5.0" },
      { activityId: "A1150", name: "Electrical Trim", duration: 3, wbs: "6.0" },
      { activityId: "A1160", name: "Plumbing Trim", duration: 2, wbs: "6.0" },
      { activityId: "A1170", name: "Hardware & Accessories", duration: 2, wbs: "6.0" },
      { activityId: "A1180", name: "Final Clean", duration: 2, wbs: "7.0" },
      { activityId: "A1190", name: "Punch List", duration: 3, wbs: "7.0" },
      { activityId: "A1200", name: "Final Inspection", duration: 1, wbs: "7.0" },
    ],
    relationships: [
      { pred: "A1010", succ: "A1020", type: "FS" as const, lag: 0 },
      { pred: "A1020", succ: "A1030", type: "FS" as const, lag: 0 },
      { pred: "A1030", succ: "A1040", type: "FS" as const, lag: 0 },
      { pred: "A1040", succ: "A1050", type: "FS" as const, lag: 0 },
      { pred: "A1050", succ: "A1060", type: "FS" as const, lag: 0 },
      { pred: "A1050", succ: "A1070", type: "FS" as const, lag: 0 },
      { pred: "A1050", succ: "A1080", type: "FS" as const, lag: 0 },
      { pred: "A1060", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1070", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1080", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1090", succ: "A1100", type: "FS" as const, lag: 0 },
      { pred: "A1100", succ: "A1110", type: "FS" as const, lag: 0 },
      { pred: "A1100", succ: "A1120", type: "FS" as const, lag: 0 },
      { pred: "A1100", succ: "A1130", type: "FS" as const, lag: 0 },
      { pred: "A1130", succ: "A1140", type: "FS" as const, lag: 0 },
      { pred: "A1110", succ: "A1140", type: "FS" as const, lag: 0 },
      { pred: "A1120", succ: "A1150", type: "FS" as const, lag: 0 },
      { pred: "A1140", succ: "A1150", type: "FS" as const, lag: 0 },
      { pred: "A1150", succ: "A1160", type: "SS" as const, lag: 0 },
      { pred: "A1160", succ: "A1170", type: "FS" as const, lag: 0 },
      { pred: "A1170", succ: "A1180", type: "FS" as const, lag: 0 },
      { pred: "A1180", succ: "A1190", type: "FS" as const, lag: 0 },
      { pred: "A1190", succ: "A1200", type: "FS" as const, lag: 0 },
    ],
    codeCategories: [
      { name: "Phase", values: ["Pre-Con", "Demo", "Rough-In", "Drywall", "Finishes", "Trim", "Closeout"] },
      { name: "Trade", values: ["General", "Structural", "Electrical", "Plumbing", "HVAC", "Drywall", "Tile", "Paint", "Flooring"] },
    ],
  },
};

// ─── Router ──────────────────────────────────────────────────────────────────

export const scheduleRouter = router({
  // ── Schedule CRUD ────────────────────────────────────────────────────────

  list: publicProcedure.query(async ({ ctx }) => {
    const member = await requireMember(ctx.req);
    return sdb.getSchedulesByMember(member.id);
  }),

  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const { schedule } = await requireScheduleOwner(ctx.req, input.id);
      const [acts, rels, cals] = await Promise.all([
        sdb.getActivitiesBySchedule(input.id),
        sdb.getRelationshipsBySchedule(input.id),
        sdb.getCalendarsBySchedule(input.id),
      ]);

      // Get code categories with their values
      const categories = await sdb.getCodeCategoriesBySchedule(input.id);
      const codeCategories = [];
      for (const cat of categories) {
        const values = await sdb.getCodeValuesByCategory(cat.id);
        codeCategories.push({ ...cat, values });
      }

      // Get all code assignments
      const codeAssignments = await sdb.getCodeAssignmentsBySchedule(input.id);

      // Get calendar exceptions
      const calendarsWithExceptions = [];
      for (const cal of cals) {
        const exceptions = await sdb.getCalendarExceptions(cal.id);
        calendarsWithExceptions.push({ ...cal, exceptions });
      }

      // Get baselines/updates (metadata only, not full snapshots)
      const baselines = await sdb.getBaselinesBySchedule(input.id);
      const baselineMeta = baselines.map((b) => ({
        id: b.id,
        name: b.name,
        snapshotType: b.snapshotType,
        updateNumber: b.updateNumber,
        dataDate: b.dataDate,
        projectStartDate: b.projectStartDate,
        notes: b.notes,
        createdAt: b.createdAt,
      }));

      return {
        schedule,
        activities: acts,
        relationships: rels,
        calendars: calendarsWithExceptions,
        codeCategories,
        codeAssignments,
        baselines: baselineMeta,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        description: z.string().optional(),
        projectStartDate: z.date(),
        templateId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);

      // Create the schedule
      const { id: scheduleId } = await sdb.createSchedule({
        memberId: member.id,
        name: input.name,
        description: input.description,
        projectStartDate: input.projectStartDate,
      });

      // Create default calendar with US construction holidays
      const startYear = input.projectStartDate.getFullYear();
      const { id: calendarId } = await sdb.createCalendar({
        scheduleId,
        name: "Standard 5-Day",
        workWeek: "5day",
        workDaysMask: 31,
        isDefault: true,
      });

      // Add US construction holidays for the project year and next year
      const holidays = [
        ...getUSConstructionHolidays(startYear),
        ...getUSConstructionHolidays(startYear + 1),
      ];
      for (const h of holidays) {
        await sdb.addCalendarException({
          calendarId,
          exceptionDate: new Date(h.date + "T00:00:00"),
          exceptionType: "holiday",
          description: h.description,
        });
      }

      // Update schedule with default calendar
      await sdb.updateSchedule(scheduleId, { defaultCalendarId: calendarId });

      // If template, populate activities and relationships
      if (input.templateId && input.templateId in SCHEDULE_TEMPLATES) {
        const template = SCHEDULE_TEMPLATES[input.templateId as keyof typeof SCHEDULE_TEMPLATES];
        const actIdMap = new Map<string, number>(); // activityId -> DB id

        for (let i = 0; i < template.activities.length; i++) {
          const a = template.activities[i];
          const { id } = await sdb.createActivity({
            scheduleId,
            activityId: a.activityId,
            name: a.name,
            duration: a.duration,
            wbs: a.wbs,
            sortOrder: i,
          });
          actIdMap.set(a.activityId, id);
        }

        for (const r of template.relationships) {
          const predId = actIdMap.get(r.pred);
          const succId = actIdMap.get(r.succ);
          if (predId && succId) {
            await sdb.createRelationship({
              scheduleId,
              predecessorId: predId,
              successorId: succId,
              relationshipType: r.type,
              lagDays: r.lag,
            });
          }
        }

        // Create code categories and values
        if (template.codeCategories) {
          for (let i = 0; i < template.codeCategories.length; i++) {
            const cat = template.codeCategories[i];
            const { id: catId } = await sdb.createCodeCategory({
              scheduleId,
              name: cat.name,
              sortOrder: i,
            });
            for (let j = 0; j < cat.values.length; j++) {
              await sdb.createCodeValue({
                categoryId: catId,
                value: cat.values[j],
                sortOrder: j,
              });
            }
          }
        }

        // Run CPM calculation
        await recalculateAndPersist(scheduleId);
      }

      return { id: scheduleId };
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
        description: z.string().optional(),
        projectStartDate: z.date().optional(),
        dataDate: z.date().nullable().optional(),
        status: z.enum(["active", "archived"]).optional(),
        defaultCalendarId: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await requireScheduleOwner(ctx.req, id);
      await sdb.updateSchedule(id, data);

      // Recalculate if start date or calendar changed
      if (data.projectStartDate || data.defaultCalendarId) {
        await recalculateAndPersist(id);
      }

      return { success: true };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.id);
      await sdb.deleteSchedule(input.id);
      return { success: true };
    }),

  duplicate: publicProcedure
    .input(z.object({ id: z.number(), name: z.string().min(1).max(256) }))
    .mutation(async ({ ctx, input }) => {
      const { member, schedule } = await requireScheduleOwner(ctx.req, input.id);

      // Create new schedule
      const { id: newId } = await sdb.createSchedule({
        memberId: member.id,
        name: input.name,
        description: schedule.description,
        projectStartDate: schedule.projectStartDate,
      });

      // Copy calendars
      const cals = await sdb.getCalendarsBySchedule(input.id);
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

        // Copy exceptions
        const exceptions = await sdb.getCalendarExceptions(cal.id);
        for (const ex of exceptions) {
          await sdb.addCalendarException({
            calendarId: newCalId,
            exceptionDate: ex.exceptionDate,
            exceptionType: ex.exceptionType,
            description: ex.description,
          });
        }
      }

      // Update default calendar reference
      if (schedule.defaultCalendarId && calIdMap.has(schedule.defaultCalendarId)) {
        await sdb.updateSchedule(newId, { defaultCalendarId: calIdMap.get(schedule.defaultCalendarId)! });
      }

      // Copy activities
      const acts = await sdb.getActivitiesBySchedule(input.id);
      const actIdMap = new Map<number, number>();
      for (const act of acts) {
        const newCalId = act.calendarId ? calIdMap.get(act.calendarId) : undefined;
        const { id: newActId } = await sdb.createActivity({
          scheduleId: newId,
          activityId: act.activityId,
          name: act.name,
          duration: act.duration,
          wbs: act.wbs,
          percentComplete: act.percentComplete,
          sortOrder: act.sortOrder,
          calendarId: newCalId || null,
          notes: act.notes,
        });
        actIdMap.set(act.id, newActId);
      }

      // Copy relationships
      const rels = await sdb.getRelationshipsBySchedule(input.id);
      for (const rel of rels) {
        const newPred = actIdMap.get(rel.predecessorId);
        const newSucc = actIdMap.get(rel.successorId);
        if (newPred && newSucc) {
          await sdb.createRelationship({
            scheduleId: newId,
            predecessorId: newPred,
            successorId: newSucc,
            relationshipType: rel.relationshipType,
            lagDays: rel.lagDays,
          });
        }
      }

      // Copy code categories, values, and assignments
      const categories = await sdb.getCodeCategoriesBySchedule(input.id);
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

      // Copy code assignments
      const assignments = await sdb.getCodeAssignmentsBySchedule(input.id);
      for (const asgn of assignments) {
        const newActId = actIdMap.get(asgn.activityId);
        const newValId = codeValueIdMap.get(asgn.codeValueId);
        if (newActId && newValId) {
          await sdb.assignCodeToActivity({ activityId: newActId, codeValueId: newValId });
        }
      }

      // Recalculate
      await recalculateAndPersist(newId);

      return { id: newId };
    }),

  // ── Activities ───────────────────────────────────────────────────────────

  addActivity: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        name: z.string().min(1).max(256),
        duration: z.number().min(0).default(1),
        wbs: z.string().optional(),
        calendarId: z.number().optional(),
        notes: z.string().optional(),
        afterActivityId: z.number().optional(), // insert after this activity
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);

      // Generate next activity ID
      const existingActs = await sdb.getActivitiesBySchedule(input.scheduleId);
      const existingIds = existingActs.map((a) => a.activityId);
      const activityId = generateNextActivityId(existingIds);

      // Determine sort order
      let sortOrder = existingActs.length;
      if (input.afterActivityId) {
        const afterAct = existingActs.find((a) => a.id === input.afterActivityId);
        if (afterAct) {
          sortOrder = afterAct.sortOrder + 1;
          // Shift subsequent activities
          const toShift = existingActs.filter((a) => a.sortOrder >= sortOrder);
          for (const a of toShift) {
            await sdb.updateActivity(a.id, { sortOrder: a.sortOrder + 1 });
          }
        }
      }

      const { id } = await sdb.createActivity({
        scheduleId: input.scheduleId,
        activityId,
        name: input.name,
        duration: input.duration,
        wbs: input.wbs,
        calendarId: input.calendarId || null,
        notes: input.notes,
        sortOrder,
      });

      // Recalculate CPM
      await recalculateAndPersist(input.scheduleId);

      return { id, activityId };
    }),

  updateActivity: publicProcedure
    .input(
      z.object({
        id: z.number(),
        scheduleId: z.number(),
        name: z.string().min(1).max(256).optional(),
        duration: z.number().min(0).optional(),
        wbs: z.string().nullable().optional(),
        percentComplete: z.number().min(0).max(100).optional(),
        actualStart: z.date().nullable().optional(),
        actualFinish: z.date().nullable().optional(),
        calendarId: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, scheduleId, ...data } = input;
      await requireScheduleOwner(ctx.req, scheduleId);

      const updateData: any = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.duration !== undefined) updateData.duration = data.duration;
      if (data.wbs !== undefined) updateData.wbs = data.wbs;
      if (data.percentComplete !== undefined) updateData.percentComplete = String(data.percentComplete);
      if (data.actualStart !== undefined) updateData.actualStart = data.actualStart;
      if (data.actualFinish !== undefined) updateData.actualFinish = data.actualFinish;
      if (data.calendarId !== undefined) updateData.calendarId = data.calendarId;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await sdb.updateActivity(id, updateData);
      await recalculateAndPersist(scheduleId);

      return { success: true };
    }),

  deleteActivity: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteActivity(input.id);
      await recalculateAndPersist(input.scheduleId);
      return { success: true };
    }),

  reorderActivities: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        activityIds: z.array(z.number()), // ordered list of activity DB IDs
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const updates = input.activityIds.map((id, i) => ({ id, data: { sortOrder: i } }));
      await sdb.bulkUpdateActivities(updates);
      return { success: true };
    }),

  // ── Relationships ────────────────────────────────────────────────────────

  addRelationship: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        predecessorId: z.number(),
        successorId: z.number(),
        relationshipType: z.enum(["FS", "SS", "FF", "SF"]).default("FS"),
        lagDays: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const { id } = await sdb.createRelationship(input);
      await recalculateAndPersist(input.scheduleId);
      return { id };
    }),

  updateRelationship: publicProcedure
    .input(
      z.object({
        id: z.number(),
        scheduleId: z.number(),
        relationshipType: z.enum(["FS", "SS", "FF", "SF"]).optional(),
        lagDays: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, scheduleId, ...data } = input;
      await requireScheduleOwner(ctx.req, scheduleId);
      await sdb.updateRelationship(id, data);
      await recalculateAndPersist(scheduleId);
      return { success: true };
    }),

  deleteRelationship: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteRelationship(input.id);
      await recalculateAndPersist(input.scheduleId);
      return { success: true };
    }),

  // ── Recalculate ──────────────────────────────────────────────────────────

  recalculate: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const output = await recalculateAndPersist(input.scheduleId);

      // Record run date (last calculated timestamp)
      await sdb.updateSchedule(input.scheduleId, { lastCalculatedAt: new Date() });

      return {
        projectFinish: output?.projectFinish || null,
        criticalPathCount: output?.criticalPath.length || 0,
        lastCalculatedAt: new Date(),
      };
    }),

  // ── Activity Codes ───────────────────────────────────────────────────────

  addCodeCategory: publicProcedure
    .input(z.object({ scheduleId: z.number(), name: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const existing = await sdb.getCodeCategoriesBySchedule(input.scheduleId);
      const { id } = await sdb.createCodeCategory({
        scheduleId: input.scheduleId,
        name: input.name,
        sortOrder: existing.length,
      });
      return { id };
    }),

  updateCodeCategory: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number(), name: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.updateCodeCategory(input.id, { name: input.name });
      return { success: true };
    }),

  deleteCodeCategory: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteCodeCategory(input.id);
      return { success: true };
    }),

  addCodeValue: publicProcedure
    .input(z.object({ categoryId: z.number(), scheduleId: z.number(), value: z.string().min(1).max(128), color: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const existing = await sdb.getCodeValuesByCategory(input.categoryId);
      const { id } = await sdb.createCodeValue({
        categoryId: input.categoryId,
        value: input.value,
        color: input.color,
        sortOrder: existing.length,
      });
      return { id };
    }),

  updateCodeValue: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number(), value: z.string().min(1).max(128).optional(), color: z.string().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const data: any = {};
      if (input.value !== undefined) data.value = input.value;
      if (input.color !== undefined) data.color = input.color;
      await sdb.updateCodeValue(input.id, data);
      return { success: true };
    }),

  deleteCodeValue: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteCodeValue(input.id);
      return { success: true };
    }),

  setActivityCodes: publicProcedure
    .input(z.object({ activityId: z.number(), scheduleId: z.number(), codeValueIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.setActivityCodes(input.activityId, input.codeValueIds);
      return { success: true };
    }),

  // ── Baselines ────────────────────────────────────────────────────────────

  saveBaseline: publicProcedure
    .input(z.object({
      scheduleId: z.number(),
      name: z.string().min(1).max(256),
      snapshotType: z.enum(["baseline", "update"]).default("baseline"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { schedule } = await requireScheduleOwner(ctx.req, input.scheduleId);

      const acts = await sdb.getActivitiesBySchedule(input.scheduleId);
      const rels = await sdb.getRelationshipsBySchedule(input.scheduleId);

      // Auto-calculate update number for updates
      let updateNumber: number | null = null;
      if (input.snapshotType === "update") {
        const existing = await sdb.getBaselinesBySchedule(input.scheduleId);
        const updates = existing.filter((b) => b.snapshotType === "update");
        updateNumber = updates.length + 1;
      }

      const { id } = await sdb.createBaseline({
        scheduleId: input.scheduleId,
        name: input.snapshotType === "update" ? `Update ${updateNumber}` : input.name,
        snapshotType: input.snapshotType,
        updateNumber,
        dataDate: schedule.dataDate || schedule.projectStartDate,
        projectStartDate: schedule.projectStartDate,
        activitiesSnapshot: JSON.stringify(acts),
        relationshipsSnapshot: JSON.stringify(rels),
        notes: input.notes,
      });

      return { id, updateNumber };
    }),

  /** Save a schedule update (convenience wrapper) */
  saveUpdate: publicProcedure
    .input(z.object({
      scheduleId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { schedule } = await requireScheduleOwner(ctx.req, input.scheduleId);

      const acts = await sdb.getActivitiesBySchedule(input.scheduleId);
      const rels = await sdb.getRelationshipsBySchedule(input.scheduleId);

      const existing = await sdb.getBaselinesBySchedule(input.scheduleId);
      const updates = existing.filter((b) => b.snapshotType === "update");
      const updateNumber = updates.length + 1;

      const { id } = await sdb.createBaseline({
        scheduleId: input.scheduleId,
        name: `Update ${updateNumber}`,
        snapshotType: "update",
        updateNumber,
        dataDate: schedule.dataDate || schedule.projectStartDate,
        projectStartDate: schedule.projectStartDate,
        activitiesSnapshot: JSON.stringify(acts),
        relationshipsSnapshot: JSON.stringify(rels),
        notes: input.notes,
      });

      return { id, updateNumber, name: `Update ${updateNumber}` };
    }),

  getBaseline: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const baseline = await sdb.getBaselineById(input.id);
      if (!baseline) throw new TRPCError({ code: "NOT_FOUND", message: "Baseline not found" });
      return baseline;
    }),

  /** Get activities from a baseline/update for comparison overlay */
  getSnapshotActivities: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const baseline = await sdb.getBaselineById(input.id);
      if (!baseline) throw new TRPCError({ code: "NOT_FOUND", message: "Snapshot not found" });

      const activities = typeof baseline.activitiesSnapshot === "string"
        ? JSON.parse(baseline.activitiesSnapshot)
        : baseline.activitiesSnapshot;

      return {
        id: baseline.id,
        name: baseline.name,
        snapshotType: baseline.snapshotType,
        updateNumber: baseline.updateNumber,
        dataDate: baseline.dataDate,
        activities: activities.map((a: any) => ({
          id: a.id,
          activityId: a.activityId,
          name: a.name,
          duration: a.duration,
          earlyStart: a.earlyStart,
          earlyFinish: a.earlyFinish,
          lateStart: a.lateStart,
          lateFinish: a.lateFinish,
          totalFloat: a.totalFloat,
          isCritical: a.isCritical,
        })),
      };
    }),

  deleteBaseline: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteBaseline(input.id);
      return { success: true };
    }),

  // ── Calendars ────────────────────────────────────────────────────────────

  addCalendar: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        name: z.string().min(1).max(128),
        workWeek: z.enum(["5day", "7day"]).default("5day"),
        workDaysMask: z.number().min(0).max(127).default(31),
        isDefault: z.boolean().default(false),
        addUSHolidays: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { schedule } = await requireScheduleOwner(ctx.req, input.scheduleId);

      // If setting as default, unset existing default
      if (input.isDefault) {
        const existing = await sdb.getCalendarsBySchedule(input.scheduleId);
        for (const cal of existing) {
          if (cal.isDefault) {
            await sdb.updateCalendar(cal.id, { isDefault: false });
          }
        }
      }

      const { id } = await sdb.createCalendar({
        scheduleId: input.scheduleId,
        name: input.name,
        workWeek: input.workWeek,
        workDaysMask: input.workDaysMask,
        isDefault: input.isDefault,
      });

      // Add US holidays if requested
      if (input.addUSHolidays) {
        const year = schedule.projectStartDate.getFullYear();
        const holidays = [
          ...getUSConstructionHolidays(year),
          ...getUSConstructionHolidays(year + 1),
        ];
        for (const h of holidays) {
          await sdb.addCalendarException({
            calendarId: id,
            exceptionDate: new Date(h.date + "T00:00:00"),
            exceptionType: "holiday",
            description: h.description,
          });
        }
      }

      // If default, update schedule reference and recalculate
      if (input.isDefault) {
        await sdb.updateSchedule(input.scheduleId, { defaultCalendarId: id });
        await recalculateAndPersist(input.scheduleId);
      }

      return { id };
    }),

  updateCalendar: publicProcedure
    .input(
      z.object({
        id: z.number(),
        scheduleId: z.number(),
        name: z.string().min(1).max(128).optional(),
        workWeek: z.enum(["5day", "7day"]).optional(),
        workDaysMask: z.number().min(0).max(127).optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, scheduleId, ...data } = input;
      await requireScheduleOwner(ctx.req, scheduleId);

      if (data.isDefault) {
        const existing = await sdb.getCalendarsBySchedule(scheduleId);
        for (const cal of existing) {
          if (cal.isDefault && cal.id !== id) {
            await sdb.updateCalendar(cal.id, { isDefault: false });
          }
        }
        await sdb.updateSchedule(scheduleId, { defaultCalendarId: id });
      }

      await sdb.updateCalendar(id, data);
      await recalculateAndPersist(scheduleId);
      return { success: true };
    }),

  deleteCalendar: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      // Don't allow deleting the last calendar
      const cals = await sdb.getCalendarsBySchedule(input.scheduleId);
      if (cals.length <= 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete the last calendar" });
      }
      await sdb.deleteCalendar(input.id);
      await recalculateAndPersist(input.scheduleId);
      return { success: true };
    }),

  addCalendarException: publicProcedure
    .input(
      z.object({
        calendarId: z.number(),
        scheduleId: z.number(),
        exceptionDate: z.date(),
        exceptionType: z.enum(["holiday", "workday"]).default("holiday"),
        description: z.string().max(256).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const { id } = await sdb.addCalendarException({
        calendarId: input.calendarId,
        exceptionDate: input.exceptionDate,
        exceptionType: input.exceptionType,
        description: input.description,
      });
      await recalculateAndPersist(input.scheduleId);
      return { id };
    }),

  deleteCalendarException: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteCalendarException(input.id);
      await recalculateAndPersist(input.scheduleId);
      return { success: true };
    }),

  // ── Templates ────────────────────────────────────────────────────────────

  templates: publicProcedure.query(() => {
    return Object.entries(SCHEDULE_TEMPLATES).map(([id, t]) => ({
      id,
      name: t.name,
      description: t.description,
      activityCount: t.activities.length,
    }));
  }),
});
