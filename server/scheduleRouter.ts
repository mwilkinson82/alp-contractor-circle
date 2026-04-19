/**
 * tRPC router for the CPM Schedule Builder.
 * Uses Discord member auth (same as memberRouter).
 */
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { getBetaUserFromRequest } from "./betaAuth";
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
import { CSI_DIVISIONS, WBS_GROUP_COLORS } from "../shared/csiDivisions";
import { commercialTiTemplate, renovationTemplate, hospitalTemplate, waterTreatmentTemplate, electricalTemplate, hvacTemplate, civilTemplate } from "./scheduleTemplates";

/** Virtual member ID offset for beta users — keeps their data isolated from Discord members */
const BETA_MEMBER_OFFSET = 10_000_000;

// ─── Auth Helper ─────────────────────────────────────────────────────────────

/**
 * Returns a Member-shaped object for either a Discord member or a ConstructLine (beta) user.
 * Beta users get a virtual memberId = BETA_MEMBER_OFFSET + betaUser.id so their data is isolated.
 */
async function requireMember(req: any): Promise<Member> {
  // Try Discord member first
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (session) {
    const member = await getMemberById(session.memberId);
    if (member) return member;
  }
  // Fall back to ConstructLine (beta) user
  const betaUser = await getBetaUserFromRequest(req);
  if (betaUser) {
    return {
      id: BETA_MEMBER_OFFSET + betaUser.id,
      discordId: `beta_${betaUser.id}`,
      discordUsername: betaUser.name,
      displayName: betaUser.name,
      email: betaUser.email,
      avatarUrl: null,
      memberRole: "member",
      subscriptionStatus: "active",
      subscriptionId: null,
      stripeCustomerId: null,
      companyName: betaUser.companyName ?? null,
      companyLogo: null,
      cpmOnboardingDone: true,
      takeoffOnboardingDone: true,
      createdAt: betaUser.createdAt,
      updatedAt: betaUser.updatedAt,
    } as unknown as Member;
  }
  throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
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

export async function recalculateAndPersist(scheduleId: number) {
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
    constraintType: (a.constraintType as CpmActivity["constraintType"]) || "ASAP",
    constraintDate: a.constraintDate || null,
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
          isOnLongestPath: result.isOnLongestPath,
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
      // ── 1. General Conditions ──
      { activityId: "A1010", name: "Site Survey & Layout", duration: 2, wbs: "1.0" },
      { activityId: "A1300", name: "Final Cleaning", duration: 2, wbs: "1.0" },
      { activityId: "A1310", name: "Punch List", duration: 5, wbs: "1.0" },
      { activityId: "A1320", name: "Final Inspections & CO", duration: 3, wbs: "1.0" },
      // ── 2. Submittals ──
      { activityId: "FAB-001", name: "Submit Steel Shop Drawings", duration: 10, wbs: "2.1" },
      { activityId: "FAB-010", name: "Submit Window & Door Schedule", duration: 5, wbs: "2.1" },
      { activityId: "FAB-020", name: "Submit Millwork & Cabinet Drawings", duration: 7, wbs: "2.1" },
      { activityId: "FAB-002", name: "Steel Shop Drawing Review & Approval", duration: 14, wbs: "2.2" },
      { activityId: "FAB-011", name: "Window & Door Approval", duration: 10, wbs: "2.2" },
      { activityId: "FAB-021", name: "Millwork Drawing Review & Approval", duration: 14, wbs: "2.2" },
      // ── 3. Fabrication (by CSI trade) ──
      { activityId: "FAB-003", name: "Fabricate Structural Steel", duration: 21, wbs: "3.1" },
      { activityId: "FAB-004", name: "Deliver Structural Steel to Site", duration: 2, wbs: "3.1" },
      { activityId: "FAB-012", name: "Manufacture Windows & Exterior Doors", duration: 35, wbs: "3.2" },
      { activityId: "FAB-013", name: "Deliver Windows & Doors to Site", duration: 2, wbs: "3.2" },
      { activityId: "FAB-022", name: "Fabricate Custom Cabinetry & Millwork", duration: 42, wbs: "3.3" },
      { activityId: "FAB-023", name: "Deliver Millwork to Site", duration: 2, wbs: "3.3" },
      { activityId: "FAB-030", name: "Order HVAC Equipment & Ductwork", duration: 3, wbs: "3.4" },
      { activityId: "FAB-031", name: "HVAC Equipment Lead Time / Delivery", duration: 28, wbs: "3.4" },
      { activityId: "FAB-032", name: "Order Plumbing Fixtures & Equipment", duration: 3, wbs: "3.4" },
      // ── 4. Construction (by CSI trade) ──
      { activityId: "A1020", name: "Demolition / Site Clearing", duration: 3, wbs: "4.1" },
      { activityId: "A1030", name: "Excavation & Grading", duration: 5, wbs: "4.1" },
      { activityId: "A1040", name: "Foundation Footings", duration: 5, wbs: "4.2" },
      { activityId: "A1050", name: "Foundation Walls & Waterproofing", duration: 7, wbs: "4.2" },
      { activityId: "A1060", name: "Slab on Grade / Basement Slab", duration: 3, wbs: "4.2" },
      { activityId: "A1070", name: "Backfill & Compaction", duration: 2, wbs: "4.2" },
      { activityId: "A1080", name: "Underground Plumbing Rough-In", duration: 3, wbs: "4.2" },
      { activityId: "A1090", name: "Framing \u2014 First Floor", duration: 10, wbs: "4.3" },
      { activityId: "A1100", name: "Framing \u2014 Second Floor", duration: 8, wbs: "4.3" },
      { activityId: "A1110", name: "Roof Framing & Sheathing", duration: 7, wbs: "4.3" },
      { activityId: "A1120", name: "Roofing (Shingles / Metal)", duration: 5, wbs: "4.4" },
      { activityId: "A1130", name: "Windows & Exterior Doors", duration: 3, wbs: "4.4" },
      { activityId: "A1140", name: "Exterior Siding / Masonry", duration: 10, wbs: "4.4" },
      { activityId: "A1150", name: "Electrical Rough-In", duration: 8, wbs: "4.5" },
      { activityId: "A1160", name: "Plumbing Rough-In", duration: 7, wbs: "4.5" },
      { activityId: "A1170", name: "HVAC Rough-In", duration: 7, wbs: "4.5" },
      { activityId: "A1180", name: "Insulation", duration: 4, wbs: "4.5" },
      { activityId: "A1190", name: "Drywall Hang & Finish", duration: 12, wbs: "4.6" },
      { activityId: "A1200", name: "Interior Trim & Doors", duration: 8, wbs: "4.6" },
      { activityId: "A1210", name: "Cabinets & Countertops", duration: 5, wbs: "4.6" },
      { activityId: "A1220", name: "Interior Paint", duration: 7, wbs: "4.6" },
      { activityId: "A1230", name: "Flooring (Tile, Hardwood, Carpet)", duration: 8, wbs: "4.6" },
      { activityId: "A1240", name: "Electrical Trim-Out", duration: 3, wbs: "4.7" },
      { activityId: "A1250", name: "Plumbing Trim-Out", duration: 3, wbs: "4.7" },
      { activityId: "A1260", name: "HVAC Trim-Out & Startup", duration: 2, wbs: "4.7" },
      { activityId: "A1270", name: "Appliance Installation", duration: 2, wbs: "4.7" },
      { activityId: "A1280", name: "Landscaping & Hardscape", duration: 7, wbs: "4.8" },
      { activityId: "A1290", name: "Driveway & Walkways", duration: 4, wbs: "4.8" },
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
      // ── Submittal & Fabrication relationships ──
      { pred: "A1030", succ: "FAB-001", type: "FS" as const, lag: 0 },
      { pred: "FAB-001", succ: "FAB-002", type: "FS" as const, lag: 0 },
      { pred: "FAB-002", succ: "FAB-003", type: "FS" as const, lag: 0 },
      { pred: "FAB-003", succ: "FAB-004", type: "FS" as const, lag: 0 },
      { pred: "FAB-004", succ: "A1090", type: "FS" as const, lag: 0 },
      { pred: "A1100", succ: "FAB-010", type: "SS" as const, lag: 0 },
      { pred: "FAB-010", succ: "FAB-011", type: "FS" as const, lag: 0 },
      { pred: "FAB-011", succ: "FAB-012", type: "FS" as const, lag: 0 },
      { pred: "FAB-012", succ: "FAB-013", type: "FS" as const, lag: 0 },
      { pred: "FAB-013", succ: "A1130", type: "FS" as const, lag: 0 },
      { pred: "A1190", succ: "FAB-020", type: "SS" as const, lag: 0 },
      { pred: "FAB-020", succ: "FAB-021", type: "FS" as const, lag: 0 },
      { pred: "FAB-021", succ: "FAB-022", type: "FS" as const, lag: 0 },
      { pred: "FAB-022", succ: "FAB-023", type: "FS" as const, lag: 0 },
      { pred: "FAB-023", succ: "A1210", type: "FS" as const, lag: 0 },
      { pred: "A1130", succ: "FAB-030", type: "SS" as const, lag: 0 },
      { pred: "FAB-030", succ: "FAB-031", type: "FS" as const, lag: 0 },
      { pred: "FAB-031", succ: "A1170", type: "FS" as const, lag: 0 },
      { pred: "A1130", succ: "FAB-032", type: "SS" as const, lag: 0 },
    ],
    wbsNodes: [
      // 1. General Conditions — milestones, mobilization, permits, closeout
      { code: "1.0", name: "General Conditions", parentCode: null, sortOrder: 10, color: "#f59e0b", textColor: "#ffffff" },
      // 2. Submittals — prepare & submit, review & approve
      { code: "2.0", name: "Submittals", parentCode: null, sortOrder: 20, color: "#f97316", textColor: "#ffffff" },
      { code: "2.1", name: "Prepare & Submit", parentCode: "2.0", sortOrder: 21, color: "#fb923c", textColor: "#000000" },
      { code: "2.2", name: "Review & Approve", parentCode: "2.0", sortOrder: 22, color: "#fdba74", textColor: "#000000" },
      // 3. Fabrication — by CSI trade
      { code: "3.0", name: "Fabrication", parentCode: null, sortOrder: 30, color: "#06b6d4", textColor: "#ffffff" },
      { code: "3.1", name: "Structural Steel", parentCode: "3.0", sortOrder: 31, color: "#22d3ee", textColor: "#000000" },
      { code: "3.2", name: "Openings (Windows & Doors)", parentCode: "3.0", sortOrder: 32, color: "#67e8f9", textColor: "#000000" },
      { code: "3.3", name: "Millwork & Cabinetry", parentCode: "3.0", sortOrder: 33, color: "#a5f3fc", textColor: "#000000" },
      { code: "3.4", name: "MEP Equipment", parentCode: "3.0", sortOrder: 34, color: "#cffafe", textColor: "#000000" },
      // 4. Construction — by CSI trade
      { code: "4.0", name: "Construction", parentCode: null, sortOrder: 40, color: "#10b981", textColor: "#ffffff" },
      { code: "4.1", name: "Sitework & Civil", parentCode: "4.0", sortOrder: 41, color: "#34d399", textColor: "#000000" },
      { code: "4.2", name: "Concrete & Foundation", parentCode: "4.0", sortOrder: 42, color: "#6366f1", textColor: "#ffffff" },
      { code: "4.3", name: "Structural Framing", parentCode: "4.0", sortOrder: 43, color: "#818cf8", textColor: "#000000" },
      { code: "4.4", name: "Enclosure", parentCode: "4.0", sortOrder: 44, color: "#ec4899", textColor: "#ffffff" },
      { code: "4.5", name: "MEP Rough-In", parentCode: "4.0", sortOrder: 45, color: "#3b82f6", textColor: "#ffffff" },
      { code: "4.6", name: "Interior Finishes", parentCode: "4.0", sortOrder: 46, color: "#8b5cf6", textColor: "#ffffff" },
      { code: "4.7", name: "MEP Trim & Startup", parentCode: "4.0", sortOrder: 47, color: "#14b8a6", textColor: "#ffffff" },
      { code: "4.8", name: "Exterior & Landscaping", parentCode: "4.0", sortOrder: 48, color: "#84cc16", textColor: "#ffffff" },
      { code: "4.9", name: "Closeout", parentCode: "4.0", sortOrder: 49, color: "#ef4444", textColor: "#ffffff" },
    ],
    codeCategories: [
      { name: "Phase", values: ["Sitework", "Foundation", "Structure", "Enclosure", "MEP Rough-In", "Finishes", "MEP Trim", "Exterior", "Closeout", "Submittals", "Fabrication"] },
      { name: "Trade", values: ["General", "Concrete", "Framing", "Roofing", "Electrical", "Plumbing", "HVAC", "Drywall", "Paint", "Flooring", "Landscaping"] },
    ],
  },
  commercial_ti: commercialTiTemplate,
  renovation: renovationTemplate,
  hospital: hospitalTemplate,
  water_treatment: waterTreatmentTemplate,
  electrical: electricalTemplate,
  hvac: hvacTemplate,
  civil: civilTemplate,
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
      const rawCodeAssignments = await sdb.getCodeAssignmentsBySchedule(input.id);
      // Enrich assignments with categoryId (derived from codeValueId → activityCodeValues.categoryId)
      const valueIdToCategoryId = new Map<number, number>();
      for (const cat of codeCategories) {
        for (const val of (cat as any).values || []) {
          valueIdToCategoryId.set(val.id, cat.id);
        }
      }
      const codeAssignments = rawCodeAssignments.map((a) => ({
        ...a,
        valueId: a.codeValueId,
        categoryId: valueIdToCategoryId.get(a.codeValueId) ?? 0,
      }));

      // Get calendar exceptions
      const calendarsWithExceptions = [];
      for (const cal of cals) {
        const exceptions = await sdb.getCalendarExceptions(cal.id);
        calendarsWithExceptions.push({ ...cal, exceptions });
      }

      // Get WBS nodes
      const wbsNodes = await sdb.getWbsBySchedule(input.id);

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
        wbsNodes,
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

        // Create WBS nodes from template
        if ((template as any).wbsNodes) {
          const wbsCodeToId = new Map<string, number>();
          // First pass: create all nodes without parent links
          for (const wn of (template as any).wbsNodes) {
            const { id: wbsId } = await sdb.createWbsNode({
              scheduleId,
              code: wn.code,
              name: wn.name,
              sortOrder: wn.sortOrder,
              groupColor: wn.color,
              groupTextColor: wn.textColor,
            });
            wbsCodeToId.set(wn.code, wbsId);
          }
          // Second pass: set parent links
          for (const wn of (template as any).wbsNodes) {
            if (wn.parentCode) {
              const parentId = wbsCodeToId.get(wn.parentCode);
              const nodeId = wbsCodeToId.get(wn.code);
              if (parentId && nodeId) {
                await sdb.updateWbsNode(nodeId, { parentId });
              }
            }
          }
          // Third pass: link activities to WBS nodes via wbsId
          for (const a of template.activities) {
            if (a.wbs) {
              const wbsNodeId = wbsCodeToId.get(a.wbs);
              const actDbId = actIdMap.get(a.activityId);
              if (wbsNodeId && actDbId) {
                await sdb.updateActivity(actDbId, { wbsId: wbsNodeId });
              }
            }
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

        // Create a default layout with WBS grouping for template schedules
        const defaultLayoutConfig = JSON.stringify({
          visibleColumns: ["activityId", "name", "duration", "earlyStart", "earlyFinish", "totalFloat"],
          groupBy: "wbs",
          sortState: null,
          zoom: "month",
          showArrows: true,
          showDataDateLine: true,
          showTodayLine: true,
        });
        await sdb.createLayout({
          scheduleId,
          name: "WBS View (Default)",
          config: defaultLayoutConfig,
          isDefault: true,
        });

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
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(256),
      /** Optional new data date (for schedule updates). If omitted, copies the source data date. */
      dataDate: z.date().optional(),
      /** Whether to copy annotations (default: true) */
      copyAnnotations: z.boolean().optional().default(true),
      /** Whether to copy layouts (default: true) */
      copyLayouts: z.boolean().optional().default(true),
      /** Whether to copy resources (default: true) */
      copyResources: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const { member, schedule } = await requireScheduleOwner(ctx.req, input.id);

      // ── 1. Create new schedule (full field copy) ─────────────────────────
      const { id: newId } = await sdb.createSchedule({
        memberId: member.id,
        name: input.name,
        description: schedule.description,
        projectStartDate: schedule.projectStartDate,
        dataDate: input.dataDate ?? schedule.dataDate ?? undefined,
        activityIdPrefix: schedule.activityIdPrefix,
        activityIdStart: schedule.activityIdStart,
        activityIdInterval: schedule.activityIdInterval,
        activityIdNext: schedule.activityIdNext,
        criticalBarColor: schedule.criticalBarColor ?? undefined,
        normalBarColor: schedule.normalBarColor ?? undefined,
        projectName: schedule.projectName ?? undefined,
        clientName: schedule.clientName ?? undefined,
        contractNumber: schedule.contractNumber ?? undefined,
        companyNameOverride: schedule.companyNameOverride ?? undefined,
        companyLogoOverride: schedule.companyLogoOverride ?? undefined,
      });

      // ── 2. Copy calendars + exceptions ───────────────────────────────────
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
      if (schedule.defaultCalendarId && calIdMap.has(schedule.defaultCalendarId)) {
        await sdb.updateSchedule(newId, { defaultCalendarId: calIdMap.get(schedule.defaultCalendarId)! });
      }

      // ── 3. Copy WBS nodes (preserve hierarchy via parentId remap) ────────
      const wbsNodes = await sdb.getWbsBySchedule(input.id);
      const wbsIdMap = new Map<number, number>();
      // Insert in sort order so parents always come before children
      const wbsRows = wbsNodes.map(w => ({
        scheduleId: newId,
        parentId: null as number | null, // will be remapped after insert
        code: w.code,
        name: w.name,
        sortOrder: w.sortOrder,
        groupColor: w.groupColor ?? undefined,
        groupTextColor: w.groupTextColor ?? undefined,
        _origId: w.id,
        _origParentId: w.parentId,
      }));
      for (const w of wbsRows) {
        const { id: newWbsId } = await sdb.createWbsNode({
          scheduleId: newId,
          parentId: w._origParentId ? (wbsIdMap.get(w._origParentId) ?? null) : null,
          code: w.code,
          name: w.name,
          sortOrder: w.sortOrder,
          groupColor: w.groupColor,
          groupTextColor: w.groupTextColor,
        });
        wbsIdMap.set(w._origId, newWbsId);
      }

      // ── 4. Copy activities (all fields) ──────────────────────────────────
      const acts = await sdb.getActivitiesBySchedule(input.id);
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

      // ── 5. Copy relationships ─────────────────────────────────────────────
      const rels = await sdb.getRelationshipsBySchedule(input.id);
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

      // ── 6. Copy activity code categories, values, and assignments ─────────
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
      const assignments = await sdb.getCodeAssignmentsBySchedule(input.id);
      const codeAssignRows = assignments
        .map(asgn => ({
          activityId: actIdMap.get(asgn.activityId)!,
          codeValueId: codeValueIdMap.get(asgn.codeValueId)!,
        }))
        .filter(r => r.activityId && r.codeValueId);
      await sdb.bulkCreateCodeAssignments(codeAssignRows);

      // ── 7. Copy resources + activity assignments ──────────────────────────
      if (input.copyResources !== false) {
        const resources = await sdb.getResourcesBySchedule(input.id);
        const resIdMap = new Map<number, number>();
        for (const res of resources) {
          const { id: newResId } = await sdb.createResource({
            scheduleId: newId,
            name: res.name,
            resourceType: res.resourceType,
            unit: res.unit,
            costRate: res.costRate,
            maxUnitsPerDay: res.maxUnitsPerDay,
            notes: res.notes ?? undefined,
          });
          resIdMap.set(res.id, newResId);
        }
        const resAssignments = await sdb.getResourceAssignmentsBySchedule(input.id);
        for (const ra of resAssignments) {
          const newActId = actIdMap.get(ra.activityId);
          const newResId = resIdMap.get(ra.resourceId);
          if (newActId && newResId) {
            await sdb.assignResourceToActivity({
              scheduleId: newId,
              activityId: newActId,
              resourceId: newResId,
              unitsPerDay: ra.unitsPerDay,
              costRateOverride: ra.costRateOverride ?? undefined,
              budgetedCost: ra.budgetedCost,
              actualCost: ra.actualCost,
            });
          }
        }
      }

      // ── 8. Copy cost accounts ─────────────────────────────────────────────
      const costAccts = await sdb.getCostAccountsBySchedule(input.id);
      const costAcctIdMap = new Map<number, number>();
      for (const ca of costAccts) {
        const { id: newCaId } = await sdb.createCostAccount({
          scheduleId: newId,
          code: ca.code,
          name: ca.name,
          parentId: ca.parentId ? (costAcctIdMap.get(ca.parentId) ?? null) : null,
          budget: ca.budget,
        });
        costAcctIdMap.set(ca.id, newCaId);
      }

      // ── 9. Copy layouts ───────────────────────────────────────────────────
      if (input.copyLayouts !== false) {
        const layouts = await sdb.getLayoutsBySchedule(input.id);
        for (const layout of layouts) {
          await sdb.createLayout({
            scheduleId: newId,
            name: layout.name,
            isDefault: layout.isDefault,
            config: layout.config,
          });
        }
      }

      // ── 10. Copy annotations ──────────────────────────────────────────────
      if (input.copyAnnotations !== false) {
        const annotations = await sdb.getAnnotationsBySchedule(input.id);
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
      }

      // ── 11. Recalculate CPM ───────────────────────────────────────────────
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
        activityType: z.enum(["task", "milestone"]).default("task"),
        activityId: z.string().optional(), // manual override for activity ID
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { schedule } = await requireScheduleOwner(ctx.req, input.scheduleId);

      // Generate next activity ID using schedule settings
      const activityId = generateNextActivityId(
        schedule.activityIdPrefix,
        schedule.activityIdNext,
        schedule.activityIdInterval
      );
      const nextNumber = schedule.activityIdNext + schedule.activityIdInterval;

      // Update schedule's activityIdNext for next time
      await sdb.updateSchedule(input.scheduleId, { activityIdNext: nextNumber });

      // Get existing activities for sort order
      const existingActs = await sdb.getActivitiesBySchedule(input.scheduleId);

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

      // Use manual activityId if provided, otherwise auto-generated
      const finalActivityId = input.activityId || activityId;

      const { id } = await sdb.createActivity({
        scheduleId: input.scheduleId,
        activityId: finalActivityId,
        name: input.name,
        duration: input.activityType === "milestone" ? 0 : input.duration,
        wbs: input.wbs,
        calendarId: input.calendarId || null,
        notes: input.notes,
        sortOrder,
        activityType: input.activityType,
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
        activityId: z.string().nullable().optional(),
        barColor: z.string().nullable().optional(),
        wbsId: z.number().nullable().optional(),
        activityType: z.enum(["task", "milestone"]).optional(),
        constraintType: z.enum(["ASAP", "ALAP", "SNET", "SNLT", "FNET", "FNLT", "MSO", "MFO"]).optional(),
        constraintDate: z.date().nullable().optional(),
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
      if (data.activityId !== undefined) updateData.activityId = data.activityId;
      if (data.barColor !== undefined) updateData.barColor = data.barColor;
      if (data.wbsId !== undefined) updateData.wbsId = data.wbsId;
      if (data.activityType !== undefined) updateData.activityType = data.activityType;
      if (data.constraintType !== undefined) updateData.constraintType = data.constraintType;
      if (data.constraintDate !== undefined) updateData.constraintDate = data.constraintDate;

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

  bulkAddActivities: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        count: z.number().min(1).max(500),
        namePrefix: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { schedule } = await requireScheduleOwner(ctx.req, input.scheduleId);
      const existingActs = await sdb.getActivitiesBySchedule(input.scheduleId);
      let currentNext = schedule.activityIdNext;
      const createdIds: { id: number; activityId: string }[] = [];

      for (let i = 0; i < input.count; i++) {
        const activityId = generateNextActivityId(
          schedule.activityIdPrefix,
          currentNext,
          schedule.activityIdInterval
        );
        currentNext += schedule.activityIdInterval;
        const name = input.namePrefix ? `${input.namePrefix} ${i + 1}` : `Activity ${i + 1}`;
        const sortOrder = existingActs.length + i;
        const { id } = await sdb.createActivity({
          scheduleId: input.scheduleId,
          activityId,
          name,
          duration: 1,
          sortOrder,
        });
        createdIds.push({ id, activityId });
      }

      await sdb.updateSchedule(input.scheduleId, { activityIdNext: currentNext });
      await recalculateAndPersist(input.scheduleId);
      return { createdIds, count: createdIds.length };
    }),

  updateScheduleIdSettings: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        activityIdPrefix: z.string().min(1).max(10).optional(),
        activityIdStart: z.number().min(1).optional(),
        activityIdInterval: z.number().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, ...settings } = input;
      await requireScheduleOwner(ctx.req, scheduleId);
      const updates: any = {};
      if (settings.activityIdPrefix !== undefined) updates.activityIdPrefix = settings.activityIdPrefix;
      if (settings.activityIdStart !== undefined) {
        updates.activityIdStart = settings.activityIdStart;
        updates.activityIdNext = settings.activityIdStart;
      }
      if (settings.activityIdInterval !== undefined) updates.activityIdInterval = settings.activityIdInterval;
      await sdb.updateSchedule(scheduleId, updates);
      return { success: true };
    }),

  /** Update per-schedule Gantt bar colors */
  updateScheduleBarColors: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        criticalBarColor: z.string().max(16).nullable().optional(),
        normalBarColor: z.string().max(16).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, ...colors } = input;
      await requireScheduleOwner(ctx.req, scheduleId);
      const updates: any = {};
      if (colors.criticalBarColor !== undefined) updates.criticalBarColor = colors.criticalBarColor;
      if (colors.normalBarColor !== undefined) updates.normalBarColor = colors.normalBarColor;
      await sdb.updateSchedule(scheduleId, updates);
      return { success: true };
    }),

  // ── Schedule Settings (per-schedule overrides) ───────────────────────────────────

  updateScheduleSettings: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        projectName: z.string().max(256).nullable().optional(),
        clientName: z.string().max(256).nullable().optional(),
        contractNumber: z.string().max(128).nullable().optional(),
        companyNameOverride: z.string().max(255).nullable().optional(),
        companyLogoOverride: z.string().max(512).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { scheduleId, ...fields } = input;
      await requireScheduleOwner(ctx.req, scheduleId);
      const updates: any = {};
      if (fields.projectName !== undefined) updates.projectName = fields.projectName;
      if (fields.clientName !== undefined) updates.clientName = fields.clientName;
      if (fields.contractNumber !== undefined) updates.contractNumber = fields.contractNumber;
      if (fields.companyNameOverride !== undefined) updates.companyNameOverride = fields.companyNameOverride;
      if (fields.companyLogoOverride !== undefined) updates.companyLogoOverride = fields.companyLogoOverride;
      if (Object.keys(updates).length > 0) {
        await sdb.updateSchedule(scheduleId, updates);
      }
      return { success: true };
    }),

  // ── Relationships ────────────────────────────────────────────────────────────

  addRelationship:publicProcedure
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
          isOnLongestPath: a.isOnLongestPath,
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

  // ── WBS (Work Breakdown Structure) ──────────────────────────────────────

  getWbs: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      return sdb.getWbsBySchedule(input.scheduleId);
    }),

  createWbsNode: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        parentId: z.number().nullable().optional(),
        code: z.string().min(1).max(32),
        name: z.string().min(1).max(256),
        sortOrder: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const { id } = await sdb.createWbsNode({
        scheduleId: input.scheduleId,
        parentId: input.parentId ?? null,
        code: input.code,
        name: input.name,
        sortOrder: input.sortOrder,
      });
      return { id };
    }),

  updateWbsNode: publicProcedure
    .input(
      z.object({
        id: z.number(),
        scheduleId: z.number(),
        parentId: z.number().nullable().optional(),
        code: z.string().min(1).max(32).optional(),
        name: z.string().min(1).max(256).optional(),
        sortOrder: z.number().optional(),
        groupColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        groupTextColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const { id, scheduleId, ...data } = input;
      await sdb.updateWbsNode(id, data);
      return { success: true };
    }),

  deleteWbsNode: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteWbsNode(input.id);
      return { success: true };
    }),

  // ── Schedule Health / Open Ends ─────────────────────────────────────────

  getScheduleHealth: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const acts = await sdb.getActivitiesBySchedule(input.scheduleId);
      const rels = await sdb.getRelationshipsBySchedule(input.scheduleId);

      const actIds = new Set(acts.map((a) => a.id));
      const hasPredecessor = new Set<number>();
      const hasSuccessor = new Set<number>();

      for (const r of rels) {
        if (actIds.has(r.successorId)) hasPredecessor.add(r.successorId);
        if (actIds.has(r.predecessorId)) hasSuccessor.add(r.predecessorId);
      }

      const openStarts = acts.filter((a) => !hasPredecessor.has(a.id)).map((a) => ({
        id: a.id,
        activityId: a.activityId,
        name: a.name,
      }));

      const openFinishes = acts.filter((a) => !hasSuccessor.has(a.id)).map((a) => ({
        id: a.id,
        activityId: a.activityId,
        name: a.name,
      }));

      const criticalCount = acts.filter((a) => a.isCritical).length;
      const negativeFloat = acts.filter((a) => (a.totalFloat ?? 0) < 0).map((a) => ({
        id: a.id,
        activityId: a.activityId,
        name: a.name,
        totalFloat: a.totalFloat,
      }));

      return {
        totalActivities: acts.length,
        criticalActivities: criticalCount,
        criticalPercentage: acts.length > 0 ? Math.round((criticalCount / acts.length) * 100) : 0,
        openStarts,
        openFinishes,
        negativeFloat,
        relationshipCount: rels.length,
      };
    }),

  // ── Templates ────────────────────────────────────────────────────────────

  templates: publicProcedure.query(() => {
    const TEMPLATE_THUMBNAILS: Record<string, string> = {
      residential: "/manus-storage/template-residential_07e22e24.png",
      commercial_ti: "/manus-storage/template-commercial_ti_01d2586d.png",
      renovation: "/manus-storage/template-renovation_8b10087f.png",
      hospital: "/manus-storage/template-hospital_801321ea.png",
      water_treatment: "/manus-storage/template-water_treatment_e13d6d06.png",
      electrical: "/manus-storage/template-electrical_abd64de7.png",
      hvac: "/manus-storage/template-hvac_e8a62c16.png",
      civil: "/manus-storage/template-civil_f0116eb6.png",
    };
    return Object.entries(SCHEDULE_TEMPLATES).map(([id, t]) => ({
      id,
      name: t.name,
      description: t.description,
      activityCount: t.activities.length,
      wbsNodeCount: (t as any).wbsNodes?.length ?? 0,
      thumbnail: TEMPLATE_THUMBNAILS[id] ?? null,
    }));
  }),

  // ── CSV Import ──────────────────────────────────────────────────────────

  importActivitiesCsv: publicProcedure
    .input(
      z.object({
        scheduleId: z.number(),
        rows: z.array(
          z.object({
            activityId: z.string().optional(),
            name: z.string().min(1).max(256),
            duration: z.number().min(0).default(1),
            wbs: z.string().optional(),
            activityType: z.enum(["task", "milestone"]).default("task"),
            predecessors: z.string().optional(), // comma-separated predecessor activity IDs with type, e.g. "A1010FS,A1020SS"
          }),
        ).min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { schedule } = await requireScheduleOwner(ctx.req, input.scheduleId);
      const existingActs = await sdb.getActivitiesBySchedule(input.scheduleId);
      let currentNext = schedule.activityIdNext;
      const createdActivities: { id: number; activityId: string; csvActivityId?: string }[] = [];

      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        // Generate activity ID if not provided
        const autoId = generateNextActivityId(
          schedule.activityIdPrefix,
          currentNext,
          schedule.activityIdInterval
        );
        currentNext += schedule.activityIdInterval;
        const finalActivityId = row.activityId?.trim() || autoId;
        const sortOrder = existingActs.length + i;

        const { id } = await sdb.createActivity({
          scheduleId: input.scheduleId,
          activityId: finalActivityId,
          name: row.name,
          duration: row.activityType === "milestone" ? 0 : row.duration,
          wbs: row.wbs || undefined,
          sortOrder,
          activityType: row.activityType,
        });
        createdActivities.push({ id, activityId: finalActivityId, csvActivityId: row.activityId });
      }

      // Now create relationships from predecessors column
      // Build a map of activityId -> database id (including existing activities)
      const actIdMap = new Map<string, number>();
      for (const ea of existingActs) actIdMap.set(ea.activityId, ea.id);
      for (const ca of createdActivities) actIdMap.set(ca.activityId, ca.id);

      let relsCreated = 0;
      for (let i = 0; i < input.rows.length; i++) {
        const row = input.rows[i];
        if (!row.predecessors) continue;
        const successorDbId = createdActivities[i].id;
        const predParts = row.predecessors.split(",").map(s => s.trim()).filter(Boolean);
        for (const part of predParts) {
          // Parse "A1010FS", "A1010", "A1010SS+2", etc.
          const match = part.match(/^([A-Za-z0-9]+?)\s*(FS|FF|SS|SF)?\s*([+-]\d+)?$/);
          if (!match) continue;
          const predActId = match[1];
          const relType = (match[2] || "FS") as "FS" | "SS" | "FF" | "SF";
          const lag = parseInt(match[3] || "0");
          const predDbId = actIdMap.get(predActId);
          if (predDbId) {
            try {
              await sdb.createRelationship({
                scheduleId: input.scheduleId,
                predecessorId: predDbId,
                successorId: successorDbId,
                relationshipType: relType,
                lagDays: lag,
              });
              relsCreated++;
            } catch (e) {
              // Skip duplicate or invalid relationships
            }
          }
        }
      }

      await sdb.updateSchedule(input.scheduleId, { activityIdNext: currentNext });
      await recalculateAndPersist(input.scheduleId);

      return {
        activitiesCreated: createdActivities.length,
        relationshipsCreated: relsCreated,
      };
    }),

  // ── CSI MasterFormat WBS Library ─────────────────────────────────────────

  csiDivisions: publicProcedure.query(() => {
    return CSI_DIVISIONS;
  }),

  importCsiDivisions: publicProcedure
    .input(z.object({
      scheduleId: z.number(),
      divisionCodes: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const existing = await sdb.getWbsBySchedule(input.scheduleId);
      const existingCodes = new Set(existing.map(w => w.code));
      let created = 0;
      for (let i = 0; i < input.divisionCodes.length; i++) {
        const code = input.divisionCodes[i];
        const div = CSI_DIVISIONS.find(d => d.code === code);
        if (!div || existingCodes.has(code)) continue;
        const colors = WBS_GROUP_COLORS[div.group];
        await sdb.createWbsNode({
          scheduleId: input.scheduleId,
          code: div.code,
          name: div.name,
          sortOrder: parseInt(div.code) * 10,
          groupColor: colors.border,
          groupTextColor: colors.text,
        });
        created++;
      }
      return { created };
    }),

  // ── Saved Layouts ──────────────────────────────────────────────────────

  listLayouts: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      return sdb.getLayoutsBySchedule(input.scheduleId);
    }),

  saveLayout: publicProcedure
    .input(z.object({
      scheduleId: z.number(),
      name: z.string().min(1).max(128),
      config: z.string(), // JSON string
      isDefault: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      if (input.isDefault) {
        await sdb.clearDefaultLayouts(input.scheduleId);
      }
      const { id } = await sdb.createLayout({
        scheduleId: input.scheduleId,
        name: input.name,
        config: input.config,
        isDefault: input.isDefault,
      });
      return { id };
    }),

  updateLayout: publicProcedure
    .input(z.object({
      id: z.number(),
      scheduleId: z.number(),
      name: z.string().min(1).max(128).optional(),
      config: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      if (input.isDefault) {
        await sdb.clearDefaultLayouts(input.scheduleId);
      }
      const { id, scheduleId, ...data } = input;
      await sdb.updateLayout(id, data);
      return { success: true };
    }),

  deleteLayout: publicProcedure
    .input(z.object({ id: z.number(), scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      await sdb.deleteLayout(input.id);
      return { success: true };
    }),

  // ── Reports ─────────────────────────────────────────────────────────────
  getReport: publicProcedure
    .input(z.object({
      scheduleId: z.number(),
      reportType: z.enum(["totalFloat", "earlyStart", "criticalPath", "duration", "comparison", "cashFlowSCurve", "resourceHistogram"]),
      baselineId: z.number().optional(),
      filters: z.object({
        wbsId: z.number().nullish(),
        floatThreshold: z.number().nullish(),
        dateRangeStart: z.string().nullish(),
        dateRangeEnd: z.string().nullish(),
        showOnlyCritical: z.boolean().optional(),
      }).optional(),
      sortBy: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const reports = await import("../shared/scheduleReports");

      const rawActivities = await sdb.getActivitiesBySchedule(input.scheduleId);
      const wbsNodes = await sdb.getWbsBySchedule(input.scheduleId);
      const wbsMap = new Map(wbsNodes.map(w => [w.id, { name: w.name, code: w.code }]));

      const activities = rawActivities.map(a => ({
        id: a.id,
        activityId: a.activityId,
        name: a.name,
        duration: a.duration,
        percentComplete: parseFloat(String(a.percentComplete)),
        earlyStart: a.earlyStart,
        earlyFinish: a.earlyFinish,
        lateStart: a.lateStart,
        lateFinish: a.lateFinish,
        totalFloat: a.totalFloat,
        freeFloat: a.freeFloat,
        isCritical: a.isCritical,
        isOnLongestPath: a.isOnLongestPath,
        actualStart: a.actualStart,
        actualFinish: a.actualFinish,
        wbsId: a.wbsId,
        wbsName: a.wbsId ? wbsMap.get(a.wbsId)?.name : undefined,
        wbsCode: a.wbsId ? wbsMap.get(a.wbsId)?.code : undefined,
        constraintType: a.constraintType,
        constraintDate: a.constraintDate,
        calendarId: a.calendarId,
      })) as any[];

      const filters = input.filters ? {
        wbsId: input.filters.wbsId ?? undefined,
        floatThreshold: input.filters.floatThreshold ?? undefined,
        dateRangeStart: input.filters.dateRangeStart ? new Date(input.filters.dateRangeStart) : undefined,
        dateRangeEnd: input.filters.dateRangeEnd ? new Date(input.filters.dateRangeEnd) : undefined,
        showOnlyCritical: input.filters.showOnlyCritical,
      } : undefined;

      const summary = reports.generateReportSummary(activities);

      switch (input.reportType) {
        case "totalFloat":
          return { type: "totalFloat" as const, rows: reports.generateTotalFloatReport(activities, filters, (input.sortBy as any) || "float_asc"), summary };
        case "earlyStart":
          return { type: "earlyStart" as const, rows: reports.generateEarlyStartReport(activities, filters), summary };
        case "criticalPath": {
          const rels = await sdb.getRelationshipsBySchedule(input.scheduleId);
          return { type: "criticalPath" as const, rows: reports.generateCriticalPathReport(activities, rels, filters), summary };
        }
        case "duration":
          return { type: "duration" as const, rows: reports.generateDurationReport(activities, filters), summary };
        case "comparison": {
          if (!input.baselineId) throw new Error("Baseline ID required for comparison report");
          const baseline = await sdb.getBaselineById(input.baselineId);
          if (!baseline) throw new Error("Baseline not found");
          const snap = baseline.activitiesSnapshot as any[];
          const baselineActs = snap.map((s: any) => ({
            activityId: s.activityId,
            name: s.name,
            duration: s.duration,
            earlyStart: s.earlyStart ? new Date(s.earlyStart) : null,
            earlyFinish: s.earlyFinish ? new Date(s.earlyFinish) : null,
            lateStart: s.lateStart ? new Date(s.lateStart) : null,
            lateFinish: s.lateFinish ? new Date(s.lateFinish) : null,
            totalFloat: s.totalFloat ?? null,
          }));
          return { type: "comparison" as const, rows: reports.generateComparisonReport(activities, baselineActs, filters), summary };
        }
        case "cashFlowSCurve": {
          // Build weekly cost distribution from resource assignments
          const assignments = await sdb.getResourceAssignmentsBySchedule(input.scheduleId);
          const resources = await sdb.getResourcesBySchedule(input.scheduleId);
          const resourceMap = new Map(resources.map(r => [r.id, r]));
          // Map each assignment to its activity's date range and cost
          const costByWeek: Record<string, { budgeted: number; actual: number }> = {};
          for (const asn of assignments) {
            const act = rawActivities.find(a => a.id === asn.activityId);
            if (!act || !act.earlyStart || !act.earlyFinish) continue;
            const start = new Date(act.earlyStart);
            const finish = new Date(act.earlyFinish);
            const dur = Math.max(1, Math.ceil((finish.getTime() - start.getTime()) / 86400000));
            const weeklyBudget = (asn.budgetedCost || 0) / Math.ceil(dur / 7);
            const weeklyActual = (asn.actualCost || 0) / Math.ceil(dur / 7);
            for (let d = new Date(start); d <= finish; d.setDate(d.getDate() + 7)) {
              const weekKey = d.toISOString().split("T")[0];
              if (!costByWeek[weekKey]) costByWeek[weekKey] = { budgeted: 0, actual: 0 };
              costByWeek[weekKey].budgeted += weeklyBudget;
              costByWeek[weekKey].actual += weeklyActual;
            }
          }
          // Build cumulative S-curve data
          const weeks = Object.keys(costByWeek).sort();
          let cumBudget = 0, cumActual = 0;
          const scurveData = weeks.map(w => {
            cumBudget += costByWeek[w].budgeted;
            cumActual += costByWeek[w].actual;
            return {
              week: w,
              weeklyBudgeted: Math.round(costByWeek[w].budgeted),
              weeklyActual: Math.round(costByWeek[w].actual),
              cumulativeBudgeted: Math.round(cumBudget),
              cumulativeActual: Math.round(cumActual),
            };
          });
          return {
            type: "cashFlowSCurve" as const,
            rows: scurveData,
            summary: {
              ...summary,
              totalBudgetedCost: Math.round(cumBudget),
              totalActualCost: Math.round(cumActual),
              totalWeeks: weeks.length,
            },
          };
        }
        case "resourceHistogram": {
          const assignments = await sdb.getResourceAssignmentsBySchedule(input.scheduleId);
          const resources = await sdb.getResourcesBySchedule(input.scheduleId);
          const resourceMap = new Map(resources.map(r => [r.id, r]));
          // Build weekly resource loading
          const loadingByWeek: Record<string, Record<string, number>> = {};
          for (const asn of assignments) {
            const act = rawActivities.find(a => a.id === asn.activityId);
            if (!act || !act.earlyStart || !act.earlyFinish) continue;
            const res = resourceMap.get(asn.resourceId);
            const resName = res?.name || `Resource ${asn.resourceId}`;
            const resType = res?.resourceType || "labor";
            const start = new Date(act.earlyStart);
            const finish = new Date(act.earlyFinish);
            const unitsPerDay = parseFloat(asn.unitsPerDay || "8");
            for (let d = new Date(start); d <= finish; d.setDate(d.getDate() + 7)) {
              const weekKey = d.toISOString().split("T")[0];
              if (!loadingByWeek[weekKey]) loadingByWeek[weekKey] = {};
              const key = `${resType}:${resName}`;
              loadingByWeek[weekKey][key] = (loadingByWeek[weekKey][key] || 0) + unitsPerDay * 5; // 5 workdays
            }
          }
          const weeks = Object.keys(loadingByWeek).sort();
          // Collect all resource keys
          const allResourceKeys = new Set<string>();
          Object.values(loadingByWeek).forEach(wk => Object.keys(wk).forEach(k => allResourceKeys.add(k)));
          const histogramData = weeks.map(w => {
            const row: any = { week: w };
            allResourceKeys.forEach(k => { row[k] = Math.round(loadingByWeek[w][k] || 0); });
            return row;
          });
          return {
            type: "resourceHistogram" as const,
            rows: histogramData,
            summary: {
              ...summary,
              totalResources: resources.length,
              totalAssignments: assignments.length,
              totalWeeks: weeks.length,
              resourceKeys: Array.from(allResourceKeys),
            },
          };
        }
      }
    }),

  // ── XER Import ──────────────────────────────────────────────────────────
  importXer: protectedProcedure
    .input(z.object({
      xerText: z.string().min(10),
      scheduleName: z.string().min(1).max(256).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { importXerFile } = await import("./xerImport");
      const result = await importXerFile(
        input.xerText,
        ctx.user.id,
        input.scheduleName,
      );
      return result;
    }),

  // ── Resources ──────────────────────────────────────────────────────────
  listResources: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      return sdb.getResourcesBySchedule(input.scheduleId);
    }),

  createResource: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      name: z.string().min(1).max(256),
      resourceType: z.enum(["labor", "equipment", "material", "subcontractor"]).default("labor"),
      unit: z.string().max(32).default("hr"),
      costRate: z.number().int().min(0).default(0),
      maxUnitsPerDay: z.string().default("8.00"),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return sdb.createResource(input);
    }),

  updateResource: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).max(256).optional(),
      resourceType: z.enum(["labor", "equipment", "material", "subcontractor"]).optional(),
      unit: z.string().max(32).optional(),
      costRate: z.number().int().min(0).optional(),
      maxUnitsPerDay: z.string().optional(),
      notes: z.string().nullable().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await sdb.updateResource(id, data);
    }),

  deleteResource: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await sdb.deleteResource(input.id);
    }),

  // ── Activity Resource Assignments ─────────────────────────────────────
  listResourceAssignments: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      return sdb.getResourceAssignmentsBySchedule(input.scheduleId);
    }),

  assignResource: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      activityId: z.number(),
      resourceId: z.number(),
      unitsPerDay: z.string().default("8.00"),
      costRateOverride: z.number().int().nullable().optional(),
      budgetedCost: z.number().int().default(0),
    }))
    .mutation(async ({ input }) => {
      return sdb.assignResourceToActivity(input);
    }),

  updateResourceAssignment: protectedProcedure
    .input(z.object({
      id: z.number(),
      unitsPerDay: z.string().optional(),
      costRateOverride: z.number().int().nullable().optional(),
      budgetedCost: z.number().int().optional(),
      actualCost: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await sdb.updateResourceAssignment(id, data);
    }),

  removeResourceAssignment: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await sdb.deleteResourceAssignment(input.id);
    }),

  // ── Cost Accounts ─────────────────────────────────────────────────────
  listCostAccounts: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      return sdb.getCostAccountsBySchedule(input.scheduleId);
    }),

  createCostAccount: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      code: z.string().min(1).max(64),
      name: z.string().min(1).max(256),
      parentId: z.number().nullable().optional(),
      budget: z.number().int().default(0),
    }))
    .mutation(async ({ input }) => {
      return sdb.createCostAccount(input);
    }),

  updateCostAccount: protectedProcedure
    .input(z.object({
      id: z.number(),
      code: z.string().min(1).max(64).optional(),
      name: z.string().min(1).max(256).optional(),
      parentId: z.number().nullable().optional(),
      budget: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await sdb.updateCostAccount(id, data);
    }),

  deleteCostAccount: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await sdb.deleteCostAccount(input.id);
    }),

  // ── Annotations ────────────────────────────────────────────────────────────
  getAnnotations: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      return sdb.getAnnotationsBySchedule(input.scheduleId);
    }),
  saveAnnotations: protectedProcedure
    .input(z.object({
      scheduleId: z.number(),
      annotations: z.array(z.object({
        scheduleId: z.number(),
        annotationType: z.enum(["text", "arrow", "shading"]),
        data: z.any(),
        sortOrder: z.number().default(0),
      })),
    }))
    .mutation(async ({ input }) => {
      await sdb.saveAnnotations(input.scheduleId, input.annotations);
    }),

  // ── Resource Leveling ──────────────────────────────────────────────────────
  resourceLeveling: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      const acts = await sdb.getActivitiesBySchedule(input.scheduleId);
      const resources = await sdb.getResourcesBySchedule(input.scheduleId);
      const assignments = await sdb.getResourceAssignmentsBySchedule(input.scheduleId);

      // ── Calendar integration: fetch calendars + exceptions ──
      const calendars = await sdb.getCalendarsBySchedule(input.scheduleId);
      const defaultCal = calendars.find(c => c.isDefault) || calendars[0];

      // Build calendar lookup: calendarId → { workDaysMask, exceptions }
      const calendarData: Record<number, { workDaysMask: number; exceptions: Map<string, string> }> = {};
      for (const cal of calendars) {
        const exceptions = await sdb.getCalendarExceptions(cal.id);
        const exMap = new Map<string, string>();
        for (const ex of exceptions) {
          const dateKey = new Date(ex.exceptionDate).toISOString().slice(0, 10);
          exMap.set(dateKey, ex.exceptionType);
        }
        calendarData[cal.id] = { workDaysMask: cal.workDaysMask, exceptions: exMap };
      }

      // Helper: count work days in a date range for a given calendar
      // workDaysMask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
      const dayBits = [64, 1, 2, 4, 8, 16, 32]; // JS getDay: 0=Sun,1=Mon,...,6=Sat
      function countWorkDaysInWeek(weekStart: Date, weekEnd: Date, calId: number | null): number {
        const cal = calId && calendarData[calId] ? calendarData[calId] : (defaultCal ? calendarData[defaultCal.id] : null);
        if (!cal) return 5; // fallback: 5-day week
        const mask = cal.workDaysMask;
        let count = 0;
        const d = new Date(weekStart);
        while (d < weekEnd) {
          const dateKey = d.toISOString().slice(0, 10);
          const exception = cal.exceptions.get(dateKey);
          if (exception === "holiday") {
            // Explicitly non-work, even if normally a work day
          } else if (exception === "workday") {
            // Explicitly work, even if normally a non-work day
            count++;
          } else {
            // Check the bitmask for this day of week
            const dayOfWeek = d.getDay(); // 0=Sun
            if (mask & dayBits[dayOfWeek]) count++;
          }
          d.setDate(d.getDate() + 1);
        }
        return count;
      }

      const capacityMap: Record<number, { name: string; maxUnitsPerDay: number; resourceType: string }> = {};
      for (const r of resources) {
        capacityMap[r.id] = { name: r.name, maxUnitsPerDay: parseFloat(String(r.maxUnitsPerDay)), resourceType: r.resourceType };
      }

      // Build activity → calendarId map
      const actCalMap = new Map<number, number | null>();
      for (const a of acts) {
        actCalMap.set(a.id, a.calendarId || null);
      }

      let minDate = Infinity, maxDate = -Infinity;
      for (const a of acts) {
        if (a.earlyStart) minDate = Math.min(minDate, new Date(a.earlyStart).getTime());
        if (a.earlyFinish) maxDate = Math.max(maxDate, new Date(a.earlyFinish).getTime());
      }
      if (minDate === Infinity) return { overAllocations: [], suggestions: [], calendarInfo: { calendarsUsed: 0, exceptionsApplied: 0 } };

      const msPerWeek = 7 * 24 * 60 * 60 * 1000;
      const actMap = new Map(acts.map(a => [a.id, a]));

      type WeekBucket = { weekStart: Date; weekEnd: Date; weekLabel: string; resourceLoading: Record<number, { allocated: number; capacity: number; workDays: number; activities: string[] }> };
      const weeks: WeekBucket[] = [];
      let current = new Date(minDate);

      while (current.getTime() <= maxDate) {
        const weekEnd = new Date(current.getTime() + msPerWeek);
        const bucket: WeekBucket = { weekStart: new Date(current), weekEnd, weekLabel: current.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }), resourceLoading: {} };

        for (const asgn of assignments) {
          const act = actMap.get(asgn.activityId);
          if (!act || !act.earlyStart || !act.earlyFinish) continue;
          const aStart = new Date(act.earlyStart).getTime();
          const aEnd = new Date(act.earlyFinish).getTime();
          if (aStart < weekEnd.getTime() && aEnd >= current.getTime()) {
            if (!bucket.resourceLoading[asgn.resourceId]) {
              const cap = capacityMap[asgn.resourceId];
              // Calendar-adjusted capacity: work days in this week × max units/day
              const calId = actCalMap.get(asgn.activityId) || null;
              const workDays = countWorkDaysInWeek(bucket.weekStart, weekEnd, calId);
              const dailyCap = cap ? cap.maxUnitsPerDay : 8;
              bucket.resourceLoading[asgn.resourceId] = { allocated: 0, capacity: dailyCap, workDays, activities: [] };
            }
            bucket.resourceLoading[asgn.resourceId].allocated += parseFloat(String(asgn.unitsPerDay));
            bucket.resourceLoading[asgn.resourceId].activities.push(act.activityId);
          }
        }
        weeks.push(bucket);
        current = weekEnd;
      }

      // Count total exceptions applied for reporting
      let totalExceptionsApplied = 0;
      for (const cal of Object.values(calendarData)) {
        totalExceptionsApplied += cal.exceptions.size;
      }

      const overAllocations: Array<{ weekLabel: string; resourceId: number; resourceName: string; resourceType: string; allocated: number; capacity: number; overBy: number; activities: string[]; workDays: number; calendarAdjusted: boolean }> = [];
      for (const week of weeks) {
        for (const [ridStr, loading] of Object.entries(week.resourceLoading)) {
          const rid = Number(ridStr);
          const cap = capacityMap[rid];
          if (!cap) continue;
          // Calendar-adjusted: if work days < 5 (standard), capacity is effectively reduced
          const effectiveCapacity = loading.workDays < 5 ? loading.capacity * (loading.workDays / 5) : loading.capacity;
          const calendarAdjusted = loading.workDays < 5;
          if (loading.allocated > effectiveCapacity) {
            overAllocations.push({
              weekLabel: week.weekLabel, resourceId: rid, resourceName: cap.name, resourceType: cap.resourceType,
              allocated: loading.allocated, capacity: Math.round(effectiveCapacity * 100) / 100,
              overBy: Math.round((loading.allocated - effectiveCapacity) * 100) / 100,
              activities: loading.activities, workDays: loading.workDays, calendarAdjusted,
            });
          }
        }
      }

      const suggestions: Array<{ type: string; message: string; resourceName: string; weekLabel: string; severity: "high" | "medium" | "low"; calendarNote?: string }> = [];
      for (const oa of overAllocations) {
        const pct = Math.round((oa.overBy / (oa.capacity || 1)) * 100);
        const severity = pct > 50 ? "high" : pct > 25 ? "medium" : "low";
        const calNote = oa.calendarAdjusted ? ` (${oa.workDays} work days this week due to calendar)` : "";
        if (oa.activities.length > 1) {
          suggestions.push({ type: "split", message: `${oa.resourceName} is over-allocated by ${oa.overBy} units/day in week of ${oa.weekLabel}${calNote}. Consider staggering activities ${oa.activities.join(", ")} to reduce concurrent demand.`, resourceName: oa.resourceName, weekLabel: oa.weekLabel, severity, calendarNote: calNote || undefined });
        } else {
          suggestions.push({ type: "reduce", message: `${oa.resourceName} is over-allocated by ${oa.overBy} units/day in week of ${oa.weekLabel}${calNote} on activity ${oa.activities[0]}. Consider reducing units or extending duration.`, resourceName: oa.resourceName, weekLabel: oa.weekLabel, severity, calendarNote: calNote || undefined });
        }
      }

      return {
        overAllocations,
        suggestions,
        calendarInfo: {
          calendarsUsed: calendars.length,
          exceptionsApplied: totalExceptionsApplied,
          defaultCalendar: defaultCal?.name || null,
        },
      };
    }),

  // ── Earned Value Management ────────────────────────────────────────────────
  evmMetrics: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input }) => {
      const acts = await sdb.getActivitiesBySchedule(input.scheduleId);
      const assignments = await sdb.getResourceAssignmentsBySchedule(input.scheduleId);
      const schedule = await sdb.getScheduleById(input.scheduleId);
      if (!schedule) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found" });

      const BAC = assignments.reduce((sum, a) => sum + a.budgetedCost, 0);
      const ACWP = assignments.reduce((sum, a) => sum + a.actualCost, 0);

      const actBudgetMap: Record<number, number> = {};
      for (const a of assignments) { actBudgetMap[a.activityId] = (actBudgetMap[a.activityId] || 0) + a.budgetedCost; }

      let BCWP = 0;
      for (const act of acts) {
        const budget = actBudgetMap[act.id] || 0;
        BCWP += budget * (parseFloat(String(act.percentComplete)) / 100);
      }

      const dataDate = schedule.dataDate ? new Date(schedule.dataDate) : new Date();
      let BCWS = 0;
      for (const act of acts) {
        const budget = actBudgetMap[act.id] || 0;
        if (!act.earlyStart || !act.earlyFinish) continue;
        const es = new Date(act.earlyStart).getTime();
        const ef = new Date(act.earlyFinish).getTime();
        const dd = dataDate.getTime();
        if (dd >= ef) { BCWS += budget; }
        else if (dd > es) { const totalDur = ef - es; BCWS += budget * (totalDur > 0 ? (dd - es) / totalDur : 0); }
      }

      const CPI = ACWP > 0 ? BCWP / ACWP : 0;
      const SPI = BCWS > 0 ? BCWP / BCWS : 0;
      const CV = BCWP - ACWP;
      const SV = BCWP - BCWS;
      const EAC = CPI > 0 ? BAC / CPI : BAC;
      const ETC = EAC - ACWP;
      const VAC = BAC - EAC;
      const TCPI = (BAC - ACWP) > 0 ? (BAC - BCWP) / (BAC - ACWP) : 0;

      const activityEvm = acts.map(act => {
        const budget = actBudgetMap[act.id] || 0;
        const pctComplete = parseFloat(String(act.percentComplete)) / 100;
        const actBCWP = budget * pctComplete;
        const actACWP = assignments.filter(a => a.activityId === act.id).reduce((s, a) => s + a.actualCost, 0);
        const actCPI = actACWP > 0 ? actBCWP / actACWP : 0;
        return { activityId: act.activityId, name: act.name, budget, earnedValue: Math.round(actBCWP), actualCost: actACWP, cpi: Math.round(actCPI * 100) / 100, percentComplete: parseFloat(String(act.percentComplete)) };
      }).filter(a => a.budget > 0);

      // Trend data
      let minDate = Infinity, maxDate = -Infinity;
      for (const a of acts) {
        if (a.earlyStart) minDate = Math.min(minDate, new Date(a.earlyStart).getTime());
        if (a.earlyFinish) maxDate = Math.max(maxDate, new Date(a.earlyFinish).getTime());
      }
      const trendData: Array<{ weekLabel: string; bcws: number; bcwp: number; acwp: number }> = [];
      if (minDate !== Infinity) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        let cur = new Date(minDate);
        let cumBCWS = 0;
        while (cur.getTime() <= maxDate + msPerWeek) {
          const weekEnd = new Date(cur.getTime() + msPerWeek);
          let weekBCWS = 0;
          for (const act of acts) {
            const budget = actBudgetMap[act.id] || 0;
            if (!act.earlyStart || !act.earlyFinish) continue;
            const es = new Date(act.earlyStart).getTime();
            const ef = new Date(act.earlyFinish).getTime();
            const overlapStart = Math.max(cur.getTime(), es);
            const overlapEnd = Math.min(weekEnd.getTime(), ef);
            if (overlapEnd > overlapStart) {
              const totalDur = ef - es;
              weekBCWS += budget * (totalDur > 0 ? (overlapEnd - overlapStart) / totalDur : 0);
            }
          }
          cumBCWS += weekBCWS;
          const ddRatio = dataDate.getTime() > minDate ? Math.min(1, (weekEnd.getTime() - minDate) / (dataDate.getTime() - minDate)) : 0;
          trendData.push({ weekLabel: cur.toLocaleDateString("en-US", { month: "short", day: "numeric" }), bcws: Math.round(cumBCWS), bcwp: Math.round(BCWP * Math.min(1, ddRatio)), acwp: Math.round(ACWP * Math.min(1, ddRatio)) });
          cur = weekEnd;
        }
      }

      return {
        BAC: Math.round(BAC), BCWP: Math.round(BCWP), BCWS: Math.round(BCWS), ACWP: Math.round(ACWP),
        CPI: Math.round(CPI * 100) / 100, SPI: Math.round(SPI * 100) / 100,
        CV: Math.round(CV), SV: Math.round(SV),
        EAC: Math.round(EAC), ETC: Math.round(ETC), VAC: Math.round(VAC),
        TCPI: Math.round(TCPI * 100) / 100,
        activityEvm, trendData,
      };
    }),

  // ── EVM Baseline Comparison ──────────────────────────────────────────────
  evmBaseline: protectedProcedure
    .input(z.object({ scheduleId: z.number(), baselineId: z.number() }))
    .query(async ({ input }) => {
      const baseline = await sdb.getBaselineById(input.baselineId);
      if (!baseline) throw new TRPCError({ code: "NOT_FOUND", message: "Baseline not found" });

      const blActs = (typeof baseline.activitiesSnapshot === "string" ? JSON.parse(baseline.activitiesSnapshot) : baseline.activitiesSnapshot) as any[];

      // Get current resource assignments to build budget map
      const currentAssignments = await sdb.getResourceAssignmentsBySchedule(input.scheduleId);
      // For baseline, we use the same budget mapping (resources don't change between snapshots)
      const actBudgetMap: Record<number, number> = {};
      for (const a of currentAssignments) { actBudgetMap[a.activityId] = (actBudgetMap[a.activityId] || 0) + a.budgetedCost; }

      const BAC = Object.values(actBudgetMap).reduce((s, v) => s + v, 0);
      const ACWP = currentAssignments.reduce((s, a) => s + a.actualCost, 0);

      // Compute BCWP from baseline activities (using their percent complete at snapshot time)
      let BCWP = 0;
      for (const act of blActs) {
        const budget = actBudgetMap[act.id] || 0;
        BCWP += budget * (parseFloat(String(act.percentComplete || 0)) / 100);
      }

      // Compute BCWS from baseline schedule using baseline data date
      const dataDate = baseline.dataDate ? new Date(baseline.dataDate) : new Date();
      let BCWS = 0;
      for (const act of blActs) {
        const budget = actBudgetMap[act.id] || 0;
        if (!act.earlyStart || !act.earlyFinish) continue;
        const es = new Date(act.earlyStart).getTime();
        const ef = new Date(act.earlyFinish).getTime();
        const dd = dataDate.getTime();
        if (dd >= ef) { BCWS += budget; }
        else if (dd > es) { const totalDur = ef - es; BCWS += budget * (totalDur > 0 ? (dd - es) / totalDur : 0); }
      }

      const CPI = ACWP > 0 ? BCWP / ACWP : 0;
      const SPI = BCWS > 0 ? BCWP / BCWS : 0;
      const CV = BCWP - ACWP;
      const SV = BCWP - BCWS;
      const EAC = CPI > 0 ? BAC / CPI : BAC;
      const ETC = EAC - ACWP;
      const VAC = BAC - EAC;
      const TCPI = (BAC - ACWP) > 0 ? (BAC - BCWP) / (BAC - ACWP) : 0;

      // Trend data from baseline schedule
      let minDate = Infinity, maxDate = -Infinity;
      for (const a of blActs) {
        if (a.earlyStart) minDate = Math.min(minDate, new Date(a.earlyStart).getTime());
        if (a.earlyFinish) maxDate = Math.max(maxDate, new Date(a.earlyFinish).getTime());
      }
      const trendData: Array<{ weekLabel: string; bcws: number; bcwp: number; acwp: number }> = [];
      if (minDate !== Infinity) {
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        let cur = new Date(minDate);
        let cumBCWS = 0;
        while (cur.getTime() <= maxDate + msPerWeek) {
          const weekEnd = new Date(cur.getTime() + msPerWeek);
          let weekBCWS = 0;
          for (const act of blActs) {
            const budget = actBudgetMap[act.id] || 0;
            if (!act.earlyStart || !act.earlyFinish) continue;
            const es = new Date(act.earlyStart).getTime();
            const ef = new Date(act.earlyFinish).getTime();
            const overlapStart = Math.max(cur.getTime(), es);
            const overlapEnd = Math.min(weekEnd.getTime(), ef);
            if (overlapEnd > overlapStart) {
              const totalDur = ef - es;
              weekBCWS += budget * (totalDur > 0 ? (overlapEnd - overlapStart) / totalDur : 0);
            }
          }
          cumBCWS += weekBCWS;
          const ddRatio = dataDate.getTime() > minDate ? Math.min(1, (weekEnd.getTime() - minDate) / (dataDate.getTime() - minDate)) : 0;
          trendData.push({ weekLabel: cur.toLocaleDateString("en-US", { month: "short", day: "numeric" }), bcws: Math.round(cumBCWS), bcwp: Math.round(BCWP * Math.min(1, ddRatio)), acwp: Math.round(ACWP * Math.min(1, ddRatio)) });
          cur = weekEnd;
        }
      }

      return {
        baselineName: baseline.name,
        baselineDataDate: baseline.dataDate?.toISOString() || null,
        BAC: Math.round(BAC), BCWP: Math.round(BCWP), BCWS: Math.round(BCWS), ACWP: Math.round(ACWP),
        CPI: Math.round(CPI * 100) / 100, SPI: Math.round(SPI * 100) / 100,
        CV: Math.round(CV), SV: Math.round(SV),
        EAC: Math.round(EAC), ETC: Math.round(ETC), VAC: Math.round(VAC),
        TCPI: Math.round(TCPI * 100) / 100,
        trendData,
      };
    }),

  // ─── Delay Analysis Wizard ──────────────────────────────────────────────
  delayAnalysis: publicProcedure
    .input(z.object({ scheduleId: z.number(), baselineId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireMember(ctx.req);
      const activities = await sdb.getActivitiesBySchedule(input.scheduleId);
      const baseline = await sdb.getBaselineById(input.baselineId);
      if (!baseline) throw new TRPCError({ code: "NOT_FOUND", message: "Baseline not found" });
      const blSnap: any[] = typeof baseline.activitiesSnapshot === "string" ? JSON.parse(baseline.activitiesSnapshot) : (baseline.activitiesSnapshot as any[]) || [];
      const blMap = new Map<string, any>();
      for (const s of blSnap) blMap.set(s.activityId || `A${s.id}`, s);

      const impacted: any[] = [];
      let totalDelayDays = 0;
      let criticalDelays = 0;
      let earliestImpactDate: Date | null = null;
      let latestImpactDate: Date | null = null;

      for (const act of activities) {
        const actId = act.activityId || `A${act.id}`;
        const bl = blMap.get(actId);
        if (!bl) continue;
        const curES = act.earlyStart ? new Date(act.earlyStart) : null;
        const blES = bl.earlyStart ? new Date(bl.earlyStart) : null;
        const curEF = act.earlyFinish ? new Date(act.earlyFinish) : null;
        const blEF = bl.earlyFinish ? new Date(bl.earlyFinish) : null;
        if (!curES || !blES) continue;
        const startDelay = Math.round((curES.getTime() - blES.getTime()) / 86400000);
        const finishDelay = curEF && blEF ? Math.round((curEF.getTime() - blEF.getTime()) / 86400000) : 0;
        const maxDelay = Math.max(startDelay, finishDelay);
        if (maxDelay <= 0) continue;
        const isCritical = (act.totalFloat ?? 999) <= 0;
        if (isCritical) criticalDelays++;
        totalDelayDays += maxDelay;
        if (!earliestImpactDate || blES < earliestImpactDate) earliestImpactDate = blES;
        if (!latestImpactDate || (curEF && curEF > latestImpactDate)) latestImpactDate = curEF;
        impacted.push({
          activityId: actId,
          name: act.name,
          wbs: act.wbs || "",
          isCritical,
          totalFloat: act.totalFloat ?? null,
          baselineStart: blES.toISOString(),
          baselineFinish: blEF?.toISOString() || null,
          currentStart: curES.toISOString(),
          currentFinish: curEF?.toISOString() || null,
          startDelay,
          finishDelay,
          maxDelay,
        });
      }
      impacted.sort((a, b) => b.maxDelay - a.maxDelay);

      // Auto-generate annotation suggestions
      const annotations: any[] = [];
      // Group by delay periods for shading
      if (impacted.length > 0) {
        const topImpacted = impacted.slice(0, 10);
        for (const imp of topImpacted) {
          if (imp.startDelay > 5) {
            annotations.push({
              type: "shading",
              label: `Delay: ${imp.name} (+${imp.maxDelay}d)`,
              startDate: imp.baselineStart,
              endDate: imp.currentStart,
              color: imp.isCritical ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
              pattern: imp.isCritical ? "crosshatch" : "hatch",
            });
          }
        }
        // Add a text annotation for the summary
        annotations.push({
          type: "text",
          label: `Delay Impact: ${impacted.length} activities, ${criticalDelays} critical, avg ${Math.round(totalDelayDays / impacted.length)}d delay`,
          x: 50, y: 30,
        });
      }

      return {
        summary: {
          totalImpacted: impacted.length,
          criticalDelays,
          avgDelay: impacted.length > 0 ? Math.round(totalDelayDays / impacted.length) : 0,
          maxDelay: impacted.length > 0 ? impacted[0].maxDelay : 0,
          earliestImpact: earliestImpactDate?.toISOString() || null,
          latestImpact: latestImpactDate?.toISOString() || null,
        },
        impactedActivities: impacted,
        suggestedAnnotations: annotations,
        baselineName: baseline.name,
        baselineDate: baseline.dataDate?.toISOString() || baseline.createdAt?.toISOString() || null,
      };
    }),

  // ─── Cost Forecasting ──────────────────────────────────────────────────
  costForecast: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireMember(ctx.req);
      const activities = await sdb.getActivitiesBySchedule(input.scheduleId);
      const assignments = await sdb.getResourceAssignmentsBySchedule(input.scheduleId);

      // Build cost per activity
      const actCostMap = new Map<number, { budgeted: number; actual: number }>();
      for (const a of assignments) {
        const prev = actCostMap.get(a.activityId) || { budgeted: 0, actual: 0 };
        prev.budgeted += Number(a.budgetedCost) || 0;
        prev.actual += Number(a.actualCost) || 0;
        actCostMap.set(a.activityId, prev);
      }

      const BAC = Array.from(actCostMap.values()).reduce((s, v) => s + v.budgeted, 0);
      const ACWP = Array.from(actCostMap.values()).reduce((s, v) => s + v.actual, 0);

      // Compute earned value
      let BCWP = 0;
      for (const act of activities) {
        const pct = parseFloat(act.percentComplete as any) || 0;
        const cost = actCostMap.get(act.id);
        if (cost) BCWP += cost.budgeted * (pct / 100);
      }

      const CPI = ACWP > 0 ? BCWP / ACWP : 1;
      const SPI = BAC > 0 ? BCWP / (BAC * 0.5) : 1; // simplified

      // Build weekly cumulative forecast
      const allDates = activities.flatMap(a => [
        a.earlyStart ? new Date(a.earlyStart).getTime() : null,
        a.earlyFinish ? new Date(a.earlyFinish).getTime() : null,
      ]).filter(Boolean) as number[];
      if (allDates.length === 0) return { forecast: [], BAC, ACWP, BCWP, CPI, SPI, EAC: BAC, ETC: BAC - ACWP };

      const minDate = new Date(Math.min(...allDates));
      const maxDate = new Date(Math.max(...allDates));
      // Extend forecast 25% beyond current end
      const projectDuration = maxDate.getTime() - minDate.getTime();
      const forecastEnd = new Date(maxDate.getTime() + projectDuration * 0.25);

      const EAC = CPI > 0 ? BAC / CPI : BAC * 2;
      const ETC = EAC - ACWP;

      // Generate weekly data points
      const forecast: { week: string; planned: number; earned: number; actual: number; forecastEAC: number }[] = [];
      const weekMs = 7 * 86400000;
      let cumPlanned = 0;
      let cumEarned = 0;
      let cumActual = 0;

      const totalWeeks = Math.ceil((forecastEnd.getTime() - minDate.getTime()) / weekMs);
      const dataWeeks = Math.ceil((maxDate.getTime() - minDate.getTime()) / weekMs) || 1;

      for (let w = 0; w <= totalWeeks; w++) {
        const weekDate = new Date(minDate.getTime() + w * weekMs);
        const weekStr = weekDate.toISOString().split("T")[0];
        const progress = Math.min(w / dataWeeks, 1);

        // S-curve (sigmoid) for planned value
        const x = progress * 6 - 3; // map to [-3, 3]
        const sigmoid = 1 / (1 + Math.exp(-x));
        cumPlanned = BAC * sigmoid;

        // Earned follows actual progress (CPI-adjusted)
        if (w <= dataWeeks) {
          cumEarned = BCWP * progress;
          cumActual = ACWP * progress;
        }

        // Forecast line: from current actual, project to EAC using CPI
        const forecastVal = w <= dataWeeks
          ? cumActual
          : ACWP + (ETC * ((w - dataWeeks) / (totalWeeks - dataWeeks)));

        forecast.push({
          week: weekStr,
          planned: Math.round(cumPlanned),
          earned: Math.round(cumEarned),
          actual: Math.round(cumActual),
          forecastEAC: Math.round(forecastVal),
        });
      }

      return { forecast, BAC: Math.round(BAC), ACWP: Math.round(ACWP), BCWP: Math.round(BCWP), CPI: Math.round(CPI * 100) / 100, SPI: Math.round(SPI * 100) / 100, EAC: Math.round(EAC), ETC: Math.round(ETC) };
    }),

  // ─── Schedule Health Score ─────────────────────────────────────────────
  healthScore: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ input, ctx }) => {
      await requireMember(ctx.req);
      const activities = await sdb.getActivitiesBySchedule(input.scheduleId);
      const assignments = await sdb.getResourceAssignmentsBySchedule(input.scheduleId);
      const rels = await sdb.getRelationshipsBySchedule(input.scheduleId);

      if (activities.length === 0) {
        return {
          overallScore: 0, grade: "N/A", components: [],
          recommendations: ["Import or add activities to generate a health score."],
        };
      }

      const components: { name: string; score: number; weight: number; details: string }[] = [];

      // 1. Float Distribution (25%) — healthy schedules have varied float, not all zero or all huge
      const floats = activities.map(a => a.totalFloat ?? 0);
      const avgFloat = floats.reduce((s, f) => s + f, 0) / floats.length;
      const criticalCount = floats.filter(f => f <= 0).length;
      const criticalRatio = criticalCount / activities.length;
      // Ideal: 10-20% critical, avg float 10-30d
      let floatScore = 100;
      if (criticalRatio > 0.5) floatScore -= (criticalRatio - 0.5) * 100;
      if (criticalRatio < 0.05 && activities.length > 10) floatScore -= 20; // suspiciously few critical
      if (avgFloat > 60) floatScore -= 15; // too much float = loose schedule
      if (avgFloat < 3) floatScore -= 20; // too tight
      floatScore = Math.max(0, Math.min(100, floatScore));
      components.push({
        name: "Float Distribution",
        score: Math.round(floatScore),
        weight: 25,
        details: `${criticalCount}/${activities.length} critical (${Math.round(criticalRatio * 100)}%), avg float ${Math.round(avgFloat)}d`,
      });

      // 2. Critical Path Integrity (25%) — critical path should be continuous and logical
      const criticalActs = activities.filter(a => (a.totalFloat ?? 999) <= 0);
      const criticalIds = new Set(criticalActs.map(a => a.id));
      // Check if critical activities have relationships
      const critWithRels = criticalActs.filter(a => rels.some(r => r.predecessorId === a.id || r.successorId === a.id));
      const cpConnectivity = criticalActs.length > 0 ? critWithRels.length / criticalActs.length : 0;
      let cpScore = cpConnectivity * 100;
      // Penalize if no critical path exists
      if (criticalActs.length === 0 && activities.length > 5) cpScore = 40;
      cpScore = Math.max(0, Math.min(100, cpScore));
      components.push({
        name: "Critical Path Integrity",
        score: Math.round(cpScore),
        weight: 25,
        details: `${criticalActs.length} critical activities, ${Math.round(cpConnectivity * 100)}% connected`,
      });

      // 3. Logic Density (20%) — activities should have predecessors and successors
      const actWithPred = new Set(rels.map(r => r.successorId));
      const actWithSucc = new Set(rels.map(r => r.predecessorId));
      const openEnds = activities.filter(a => !actWithPred.has(a.id) && !actWithSucc.has(a.id)).length;
      const dangling = activities.filter(a => !actWithPred.has(a.id) || !actWithSucc.has(a.id)).length;
      const logicRatio = activities.length > 0 ? 1 - (openEnds / activities.length) : 0;
      const danglingRatio = activities.length > 0 ? dangling / activities.length : 0;
      let logicScore = logicRatio * 80 + 20;
      if (danglingRatio > 0.3) logicScore -= (danglingRatio - 0.3) * 50;
      logicScore = Math.max(0, Math.min(100, logicScore));
      components.push({
        name: "Logic Density",
        score: Math.round(logicScore),
        weight: 20,
        details: `${openEnds} open-ended, ${dangling} missing pred/succ, ${rels.length} relationships`,
      });

      // 4. Resource Balance (15%) — activities should have resource assignments
      const actsWithResources = new Set(assignments.map(a => a.activityId));
      const resourceCoverage = activities.length > 0 ? actsWithResources.size / activities.length : 0;
      let resourceScore = resourceCoverage * 100;
      if (assignments.length === 0) resourceScore = 30; // no resources loaded
      resourceScore = Math.max(0, Math.min(100, resourceScore));
      components.push({
        name: "Resource Balance",
        score: Math.round(resourceScore),
        weight: 15,
        details: `${actsWithResources.size}/${activities.length} activities resourced (${Math.round(resourceCoverage * 100)}%)`,
      });

      // 5. Schedule Progress (15%) — actual progress vs planned
      const totalPct = activities.reduce((s, a) => s + (parseFloat(a.percentComplete as any) || 0), 0);
      const avgPct = totalPct / activities.length;
      let progressScore = 100;
      // Check for stale schedule (all 0% or all 100%)
      if (avgPct === 0 && activities.length > 5) progressScore = 50;
      else if (avgPct === 100) progressScore = 100;
      else progressScore = 60 + avgPct * 0.4; // scale 60-100
      progressScore = Math.max(0, Math.min(100, progressScore));
      components.push({
        name: "Schedule Progress",
        score: Math.round(progressScore),
        weight: 15,
        details: `Average completion: ${Math.round(avgPct)}%`,
      });

      // Weighted overall score
      const overallScore = Math.round(
        components.reduce((s, c) => s + c.score * (c.weight / 100), 0)
      );

      // Grade
      let grade = "F";
      if (overallScore >= 90) grade = "A";
      else if (overallScore >= 80) grade = "B";
      else if (overallScore >= 70) grade = "C";
      else if (overallScore >= 60) grade = "D";

      // Recommendations
      const recommendations: string[] = [];
      if (floatScore < 70) recommendations.push(criticalRatio > 0.5 ? "Too many critical activities — review logic ties and add buffer." : "Float distribution is unusual — verify schedule logic.");
      if (cpScore < 70) recommendations.push("Critical path connectivity is weak — ensure all critical activities have logical ties.");
      if (logicScore < 70) recommendations.push(`${openEnds} activities have no relationships — add predecessors and successors.`);
      if (resourceScore < 70) recommendations.push("Resource loading is incomplete — assign resources to improve cost tracking.");
      if (progressScore < 60) recommendations.push("Schedule appears stale — update percent complete values.");
      if (recommendations.length === 0) recommendations.push("Schedule is in good health. Continue regular updates.");

      return { overallScore, grade, components, recommendations };
    }),

  // ── Auto-Assign WBS for Submittal/Fabrication Activities ──────────────────

  autoAssignSubmittalWbs: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const acts = await sdb.getActivitiesBySchedule(input.scheduleId);
      const wbsNodes = await sdb.getWbsBySchedule(input.scheduleId);

      // Find or create the Submittals and Fabrication WBS hierarchy
      const existingCodes = new Set(wbsNodes.map(w => w.code));

      // Ensure parent nodes exist
      const ensureNode = async (code: string, name: string, parentCode: string | null, sortOrder: number, color: string, textColor: string) => {
        if (existingCodes.has(code)) return;
        const parentId = parentCode ? wbsNodes.find(w => w.code === parentCode)?.id ?? null : null;
        const { id } = await sdb.createWbsNode({
          scheduleId: input.scheduleId,
          code,
          name,
          sortOrder,
          groupColor: color,
          groupTextColor: textColor,
          parentId,
        });
        wbsNodes.push({ id, scheduleId: input.scheduleId, code, name, sortOrder, groupColor: color, groupTextColor: textColor, parentId, createdAt: new Date() } as any);
        existingCodes.add(code);
      };

      // 1. General Conditions
      await ensureNode("1.0", "General Conditions", null, 10, "#f59e0b", "#ffffff");
      // 2. Submittals
      await ensureNode("2.0", "Submittals", null, 20, "#f97316", "#ffffff");
      await ensureNode("2.1", "Prepare & Submit", "2.0", 21, "#fb923c", "#000000");
      await ensureNode("2.2", "Review & Approve", "2.0", 22, "#fdba74", "#000000");
      // 3. Fabrication (by CSI trade)
      await ensureNode("3.0", "Fabrication", null, 30, "#06b6d4", "#ffffff");
      await ensureNode("3.1", "Structural Steel", "3.0", 31, "#22d3ee", "#000000");
      await ensureNode("3.2", "Openings (Windows & Doors)", "3.0", 32, "#67e8f9", "#000000");
      await ensureNode("3.3", "Millwork & Cabinetry", "3.0", 33, "#a5f3fc", "#000000");
      await ensureNode("3.4", "MEP Equipment", "3.0", 34, "#cffafe", "#000000");
      // 4. Construction (by CSI trade)
      await ensureNode("4.0", "Construction", null, 40, "#10b981", "#ffffff");
      await ensureNode("4.1", "Sitework & Civil", "4.0", 41, "#34d399", "#000000");
      await ensureNode("4.2", "Concrete & Foundation", "4.0", 42, "#6366f1", "#ffffff");
      await ensureNode("4.3", "Structural Framing", "4.0", 43, "#818cf8", "#000000");
      await ensureNode("4.4", "Enclosure", "4.0", 44, "#ec4899", "#ffffff");
      await ensureNode("4.5", "MEP Rough-In", "4.0", 45, "#3b82f6", "#ffffff");
      await ensureNode("4.6", "Interior Finishes", "4.0", 46, "#8b5cf6", "#ffffff");
      await ensureNode("4.7", "MEP Trim & Startup", "4.0", 47, "#14b8a6", "#ffffff");
      await ensureNode("4.8", "Exterior & Landscaping", "4.0", 48, "#84cc16", "#ffffff");
      await ensureNode("4.9", "Closeout", "4.0", 49, "#ef4444", "#ffffff");

      // Auto-assign unassigned activities based on name patterns
      let assigned = 0;
      for (const act of acts) {
        if (act.wbs) continue; // already assigned
        const n = act.name.toLowerCase();
        let wbsCode: string | null = null;

        // ── 2. Submittals ──
        // Prepare & Submit
        if (n.includes("submit") || n.includes("submittal")) {
          wbsCode = "2.1";
        }
        // Review & Approve
        else if (n.includes("review") || n.includes("approval") || n.includes("approve")) {
          wbsCode = "2.2";
        }
        // ── 3. Fabrication (match to CSI trade) ──
        else if (n.includes("fabricat") || n.includes("manufactur") || n.includes("deliver") || n.includes("order ") || n.includes("lead time") || n.includes("procurement")) {
          // Match to specific fabrication sub-WBS by trade
          if (n.includes("steel") || n.includes("iron") || n.includes("metal")) {
            wbsCode = "3.1"; // Structural Steel
          } else if (n.includes("window") || n.includes("door") || n.includes("opening") || n.includes("glass") || n.includes("glazing")) {
            wbsCode = "3.2"; // Openings
          } else if (n.includes("millwork") || n.includes("cabinet") || n.includes("casework") || n.includes("woodwork")) {
            wbsCode = "3.3"; // Millwork & Cabinetry
          } else if (n.includes("hvac") || n.includes("plumb") || n.includes("electric") || n.includes("mechanic") || n.includes("duct") || n.includes("fixture") || n.includes("equipment")) {
            wbsCode = "3.4"; // MEP Equipment
          } else {
            wbsCode = "3.0"; // General Fabrication
          }
        }
        // ── 4. Construction (match to CSI trade) ──
        // General Conditions / milestones
        else if (n.includes("survey") || n.includes("mobiliz") || n.includes("permit") || n.includes("pre-construction") || n.includes("punch list") || n.includes("final inspect") || n.includes("final clean") || n.includes("certificate") || n.includes("closeout") || n.includes("substantial completion")) {
          wbsCode = "1.0"; // General Conditions
        }
        else if (n.includes("demol") || n.includes("site clear") || n.includes("excavat") || n.includes("grading") || n.includes("earthwork") || n.includes("backfill") || n.includes("compact")) {
          wbsCode = "4.1"; // Sitework & Civil
        }
        else if (n.includes("foundation") || n.includes("footing") || n.includes("slab") || n.includes("concrete") || n.includes("rebar") || n.includes("formwork") || n.includes("underground plumb")) {
          wbsCode = "4.2"; // Concrete & Foundation
        }
        else if (n.includes("framing") || n.includes("structural") || n.includes("sheathing") || n.includes("truss") || n.includes("joist")) {
          wbsCode = "4.3"; // Structural Framing
        }
        else if (n.includes("roof") || n.includes("window") || n.includes("door") || n.includes("siding") || n.includes("masonry") || n.includes("exterior") || n.includes("enclosure") || n.includes("waterproof") || n.includes("flashing")) {
          wbsCode = "4.4"; // Enclosure
        }
        else if (n.includes("electrical rough") || n.includes("plumbing rough") || n.includes("hvac rough") || n.includes("rough-in") || n.includes("insulation") || n.includes("fire protect") || n.includes("sprinkler")) {
          wbsCode = "4.5"; // MEP Rough-In
        }
        else if (n.includes("drywall") || n.includes("paint") || n.includes("floor") || n.includes("tile") || n.includes("carpet") || n.includes("hardwood") || n.includes("trim") || n.includes("cabinet") || n.includes("countertop") || n.includes("finish")) {
          wbsCode = "4.6"; // Interior Finishes
        }
        else if (n.includes("electrical trim") || n.includes("plumbing trim") || n.includes("hvac trim") || n.includes("startup") || n.includes("appliance") || n.includes("commission")) {
          wbsCode = "4.7"; // MEP Trim & Startup
        }
        else if (n.includes("landscape") || n.includes("hardscape") || n.includes("driveway") || n.includes("walkway") || n.includes("paving") || n.includes("fence") || n.includes("irrigation")) {
          wbsCode = "4.8"; // Exterior & Landscaping
        }

        if (wbsCode) {
          await sdb.updateActivity(act.id, { wbs: wbsCode });
          assigned++;
        }
      }

      return { assigned, message: `Auto-assigned ${assigned} activities to proper construction WBS (General Conditions / Submittals / Fabrication / Construction)` };
    }),

  // ── Schedule Update Comparison ───────────────────────────────────────────
  /**
   * Compare two schedules side-by-side by matching activities on activityId.
   * Returns per-activity variance rows plus summary statistics.
   * Used for the Update Comparison View and the Schedule Variance Report.
   */
  compareSchedules: publicProcedure
    .input(z.object({
      baselineScheduleId: z.number(),
      updateScheduleId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      // Verify ownership of both schedules
      await requireScheduleOwner(ctx.req, input.baselineScheduleId);
      await requireScheduleOwner(ctx.req, input.updateScheduleId);

      const [baseSched, updSched] = await Promise.all([
        sdb.getScheduleById(input.baselineScheduleId),
        sdb.getScheduleById(input.updateScheduleId),
      ]);
      if (!baseSched || !updSched) throw new Error("Schedule not found");

      const [baseActs, updActs] = await Promise.all([
        sdb.getActivitiesBySchedule(input.baselineScheduleId),
        sdb.getActivitiesBySchedule(input.updateScheduleId),
      ]);

      const baseMap = new Map(baseActs.map(a => [a.activityId, a]));
      const updMap = new Map(updActs.map(a => [a.activityId, a]));

      const daysDiff = (a: Date | null | undefined, b: Date | null | undefined): number | null => {
        if (!a || !b) return null;
        return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
      };
      const fmt = (d: Date | null | undefined) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

      // All unique activity IDs across both schedules
      const allIds = Array.from(new Set([...Array.from(baseMap.keys()), ...Array.from(updMap.keys())]));
      const rows: any[] = [];

      for (const actId of allIds) {
        const base = baseMap.get(actId);
        const upd = updMap.get(actId);

        const startVar = daysDiff(base?.earlyStart, upd?.earlyStart);
        const finishVar = daysDiff(base?.earlyFinish, upd?.earlyFinish);
        const floatVar = upd && base ? ((upd.totalFloat ?? 0) - (base.totalFloat ?? 0)) : null;
        const durVar = upd && base ? upd.duration - base.duration : null;

        let status: string;
        if (!base) status = "added";
        else if (!upd) status = "removed";
        else if ((finishVar ?? 0) > 0) status = "delayed";
        else if ((finishVar ?? 0) < 0) status = "ahead";
        else status = "on-time";

        // Critical path change detection
        const wasOnCritical = base?.isCritical ?? false;
        const isOnCritical = upd?.isCritical ?? false;
        const criticalChange = wasOnCritical !== isOnCritical
          ? (isOnCritical ? "became-critical" : "left-critical")
          : null;

        rows.push({
          activityId: actId,
          name: upd?.name ?? base?.name ?? actId,
          // Baseline
          baselineStart: fmt(base?.earlyStart),
          baselineFinish: fmt(base?.earlyFinish),
          baselineDuration: base?.duration ?? null,
          baselineFloat: base?.totalFloat ?? null,
          baselineIsCritical: wasOnCritical,
          // Current (update)
          currentStart: fmt(upd?.earlyStart),
          currentFinish: fmt(upd?.earlyFinish),
          currentDuration: upd?.duration ?? null,
          currentFloat: upd?.totalFloat ?? null,
          currentIsCritical: isOnCritical,
          currentPercentComplete: upd ? parseFloat(String(upd.percentComplete)) : null,
          actualStart: fmt(upd?.actualStart),
          actualFinish: fmt(upd?.actualFinish),
          // Variances
          startVariance: startVar,
          finishVariance: finishVar,
          durationVariance: durVar,
          floatVariance: floatVar,
          criticalChange,
          status,
        });
      }

      // Sort: delayed first, then on-time, then ahead, then added/removed
      const statusOrder: Record<string, number> = { delayed: 0, "on-time": 1, ahead: 2, added: 3, removed: 4 };
      rows.sort((a, b) => {
        const so = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
        if (so !== 0) return so;
        return (b.finishVariance ?? 0) - (a.finishVariance ?? 0);
      });

      // Summary statistics
      const matched = rows.filter(r => r.status !== "added" && r.status !== "removed");
      const delayed = rows.filter(r => r.status === "delayed");
      const ahead = rows.filter(r => r.status === "ahead");
      const onTime = rows.filter(r => r.status === "on-time");
      const added = rows.filter(r => r.status === "added");
      const removed = rows.filter(r => r.status === "removed");
      const becameCritical = rows.filter(r => r.criticalChange === "became-critical");
      const leftCritical = rows.filter(r => r.criticalChange === "left-critical");
      const maxSlippage = delayed.length > 0 ? Math.max(...delayed.map(r => r.finishVariance ?? 0)) : 0;
      const avgSlippage = delayed.length > 0 ? Math.round(delayed.reduce((s, r) => s + (r.finishVariance ?? 0), 0) / delayed.length) : 0;

      // Project-level finish variance (compare latest finish dates)
      const baseLatestFinish = baseActs.reduce((max, a) => {
        if (!a.earlyFinish) return max;
        return !max || new Date(a.earlyFinish) > new Date(max) ? a.earlyFinish : max;
      }, null as Date | null | undefined);
      const updLatestFinish = updActs.reduce((max, a) => {
        if (!a.earlyFinish) return max;
        return !max || new Date(a.earlyFinish) > new Date(max) ? a.earlyFinish : max;
      }, null as Date | null | undefined);
      const projectSlippage = daysDiff(baseLatestFinish, updLatestFinish);

      return {
        rows,
        summary: {
          totalActivities: allIds.length,
          matchedActivities: matched.length,
          delayedCount: delayed.length,
          aheadCount: ahead.length,
          onTimeCount: onTime.length,
          addedCount: added.length,
          removedCount: removed.length,
          becameCriticalCount: becameCritical.length,
          leftCriticalCount: leftCritical.length,
          maxSlippageDays: maxSlippage,
          avgSlippageDays: avgSlippage,
          projectSlippageDays: projectSlippage,
          baselineScheduleName: baseSched.name,
          updateScheduleName: updSched.name,
          baselineDataDate: baseSched.dataDate ? fmt(baseSched.dataDate) : null,
          updateDataDate: updSched.dataDate ? fmt(updSched.dataDate) : null,
        },
      };
    }),

  // Fetch activities from another schedule for Gantt baseline overlay
  // Returns only the fields needed to draw baseline bars on the Gantt canvas
  getBaselineOverlayActivities: publicProcedure
    .input(z.object({ scheduleId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireScheduleOwner(ctx.req, input.scheduleId);
      const sched = await sdb.getScheduleById(input.scheduleId);
      if (!sched) throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found' });
      const acts = await sdb.getActivitiesBySchedule(input.scheduleId);
      return {
        scheduleName: sched.name,
        dataDate: sched.dataDate,
        activities: acts.map((a) => ({
          id: a.id,
          activityId: a.activityId,
          earlyStart: a.earlyStart,
          earlyFinish: a.earlyFinish,
          isCritical: a.isCritical,
          duration: a.duration,
        })),
      };
    }),
});
