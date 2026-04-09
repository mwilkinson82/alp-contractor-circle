/**
 * XER Import Service — converts Primavera P6 XER files into our schedule format.
 * Uses the xer-parser library for parsing, then maps to our DB schema.
 */
import { XER } from "xer-parser";
import * as sdb from "./scheduleDb";
import { getUSConstructionHolidays } from "../shared/cpmEngine";

// ─── P6 Constraint Type Mapping ─────────────────────────────────────────────

const P6_CONSTRAINT_MAP: Record<string, string> = {
  CS_ALAP: "ALAP",
  CS_MEO: "MSO",       // Mandatory Start On
  CS_MSO: "MSO",       // Mandatory Start On (alternate code)
  CS_MEOA: "SNET",     // Start No Earlier Than
  CS_MEOB: "SNLT",     // Start No Later Than
  CS_MEFOA: "FNET",    // Finish No Earlier Than
  CS_MEFOB: "FNLT",    // Finish No Later Than
  CS_MFO: "MFO",       // Mandatory Finish On
};

// ─── P6 Relationship Type Mapping ───────────────────────────────────────────

const P6_REL_MAP: Record<string, "FS" | "SS" | "FF" | "SF"> = {
  PR_FS: "FS",
  PR_SS: "SS",
  PR_FF: "FF",
  PR_SF: "SF",
};

// ─── Calendar work-day detection from P6 clndr_data ─────────────────────────

function parseP6CalendarWorkDays(cal: any): { workDaysMask: number; workWeek: "5day" | "7day" } {
  // P6 calendar dayHrCnt tells us hours per day
  // We'll try to detect from the clndr_data string which days are work days
  // Default to 5-day if we can't parse
  const data = cal.clndrData || "";

  // P6 clndr_data format: contains day definitions like "d|1|Y|..." for each weekday
  // Day numbers: 1=Sunday, 2=Monday, ..., 7=Saturday
  // We'll look for patterns like "(0||d|1)(0||)" for non-work and "(8.0||d|2)(s|08:00|f|16:00)" for work
  let mask = 0;
  const dayRegex = /\(([^)]*)\|\|d\|(\d)\)/g;
  let match;
  while ((match = dayRegex.exec(data)) !== null) {
    const hours = parseFloat(match[1]);
    const dayNum = parseInt(match[2]); // 1=Sun, 2=Mon, ..., 7=Sat
    if (hours > 0) {
      // Map P6 day numbers to our bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
      const maskMap: Record<number, number> = { 2: 1, 3: 2, 4: 4, 5: 8, 6: 16, 7: 32, 1: 64 };
      mask |= maskMap[dayNum] || 0;
    }
  }

  // If we couldn't parse, try a simpler approach based on weekHrCnt
  if (mask === 0) {
    const weekHrs = cal.weekHrCnt || 40;
    const dayHrs = cal.dayHrCnt || 8;
    const workDays = Math.round(weekHrs / dayHrs);
    if (workDays >= 7) {
      mask = 127; // all days
    } else if (workDays >= 6) {
      mask = 63; // Mon-Sat
    } else {
      mask = 31; // Mon-Fri
    }
  }

  const workWeek = mask === 127 ? "7day" : "5day";
  return { workDaysMask: mask, workWeek };
}

// ─── Main Import Function ───────────────────────────────────────────────────

export interface XerImportResult {
  scheduleName: string;
  scheduleId: number;
  activitiesImported: number;
  relationshipsImported: number;
  wbsNodesImported: number;
  calendarsImported: number;
  warnings: string[];
}

export async function importXerFile(
  xerText: string,
  memberId: number,
  overrideName?: string,
): Promise<XerImportResult> {
  const warnings: string[] = [];

  // Parse the XER file
  const xer = new XER(xerText);

  if (xer.projects.length === 0) {
    throw new Error("No projects found in XER file");
  }

  // Use the first project
  const project = xer.projects[0];
  const scheduleName = overrideName || project.projShortName || "Imported Schedule";

  // Get data date from project
  const dataDate = project.lastRecalcDate?.toDate() || new Date();
  const projectStart = project.planStartDate?.toDate() || new Date();

  // Create the schedule
  const { id: scheduleId } = await sdb.createSchedule({
    memberId,
    name: scheduleName,
    description: `Imported from P6 XER file. Original project: ${project.projShortName}`,
    projectStartDate: projectStart,
    dataDate,
  });

  // ─── Import Calendars ──────────────────────────────────────────────────────

  const calendarIdMap = new Map<number, number>(); // P6 clndr_id → our calendar id
  let defaultCalendarId: number | null = null;

  for (const cal of xer.calendars) {
    // Only import calendars used by this project or global calendars
    const { workDaysMask, workWeek } = parseP6CalendarWorkDays(cal);

    const { id: calId } = await sdb.createCalendar({
      scheduleId,
      name: cal.clndrName || "Imported Calendar",
      workWeek,
      workDaysMask,
      isDefault: cal.defaultFlag || false,
    });

    calendarIdMap.set(cal.clndrId, calId);

    if (cal.defaultFlag || (project.clndrId === cal.clndrId)) {
      defaultCalendarId = calId;
    }
  }

  // If no default calendar was found, create one
  if (!defaultCalendarId) {
    const { id: calId } = await sdb.createCalendar({
      scheduleId,
      name: "Standard 5-Day",
      workWeek: "5day",
      workDaysMask: 31,
      isDefault: true,
    });
    defaultCalendarId = calId;
  }

  // Add US construction holidays
  const startYear = projectStart.getFullYear();
  const holidays = [
    ...getUSConstructionHolidays(startYear),
    ...getUSConstructionHolidays(startYear + 1),
  ];
  for (const h of holidays) {
    await sdb.addCalendarException({
      calendarId: defaultCalendarId,
      exceptionDate: new Date(h.date + "T00:00:00"),
      exceptionType: "holiday",
      description: h.description,
    });
  }

  // ─── Import WBS ────────────────────────────────────────────────────────────

  const wbsIdMap = new Map<number, number>(); // P6 wbs_id → our wbs id
  const WBS_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
    "#14B8A6", "#E11D48", "#0EA5E9", "#A855F7", "#D97706",
  ];
  const WBS_TEXT_COLORS = ["#FFFFFF"];

  // Filter WBS nodes for this project, sort by parent to ensure parents are created first
  const projectWbs = xer.projWBS
    .filter(w => w.projId === project.projId)
    .sort((a, b) => {
      // Root nodes first (no parent), then by sequence
      if (!a.parentWbsId && b.parentWbsId) return -1;
      if (a.parentWbsId && !b.parentWbsId) return 1;
      return (a.seqNum || 0) - (b.seqNum || 0);
    });

  // Multi-pass: first create nodes without parents, then update parent references
  let colorIdx = 0;
  for (const wbs of projectWbs) {
    // Skip the project-level WBS node (projNodeFlag)
    if (wbs.projNodeFlag) {
      // Still map it so children can reference it
      wbsIdMap.set(wbs.wbsId, -1); // sentinel
      continue;
    }

    const parentOurId = wbs.parentWbsId ? wbsIdMap.get(wbs.parentWbsId) : undefined;

    const { id: wbsId } = await sdb.createWbsNode({
      scheduleId,
      parentId: parentOurId && parentOurId > 0 ? parentOurId : undefined,
      code: wbs.wbsShortName || `WBS-${wbs.wbsId}`,
      name: wbs.wbsName || wbs.wbsShortName || "Unnamed WBS",
      sortOrder: wbs.seqNum || 0,
      groupColor: WBS_COLORS[colorIdx % WBS_COLORS.length],
      groupTextColor: "#FFFFFF",
    });

    wbsIdMap.set(wbs.wbsId, wbsId);
    colorIdx++;
  }

  // ─── Import Activities ─────────────────────────────────────────────────────

  const activityIdMap = new Map<number, number>(); // P6 task_id → our activity DB id
  const projectTasks = xer.tasks.filter(t => t.project?.projId === project.projId);

  // Sort by P6 sequence / task_code
  const sortedTasks = [...projectTasks].sort((a, b) => {
    return (a.taskCode || "").localeCompare(b.taskCode || "");
  });

  let sortOrder = 0;
  for (const task of sortedTasks) {
    // Skip WBS summary tasks
    if ((task.taskType as string) === "TT_WBS") {
      warnings.push(`Skipped WBS summary task: ${task.taskCode} - ${task.taskName}`);
      continue;
    }

    // Determine activity type
    const isMilestone = task.taskType === "TT_Mile" || task.taskType === "TT_FinMile";

    // Convert duration from hours to days
    const dayHrCnt = task.calendar?.dayHrCnt || 8;
    const durationDays = isMilestone ? 0 : Math.max(1, Math.round((task.targetDrtn?.hours || 0) / dayHrCnt));

    // Map constraint type
    let constraintType = "ASAP";
    if (task.cstrType) {
      constraintType = P6_CONSTRAINT_MAP[task.cstrType] || "ASAP";
    }

    // Map constraint date
    let constraintDate: Date | undefined;
    if (task.cstrDate) {
      constraintDate = task.cstrDate.toDate();
    }

    // Map percent complete
    const percentComplete = (task.physCompletePct ?? 0).toFixed(2);

    // Map actual dates
    const actualStart = task.actStartDate?.toDate() || undefined;
    const actualFinish = task.actEndDate?.toDate() || undefined;

    // Map WBS
    const wbsNode = task.wbs;
    const ourWbsId = wbsNode ? wbsIdMap.get(wbsNode.wbsId) : undefined;

    // Map calendar
    const calId = task.calendar ? calendarIdMap.get(task.calendar.clndrId) : undefined;

    const { id: actId } = await sdb.createActivity({
      scheduleId,
      activityId: task.taskCode || `IMP-${sortOrder}`,
      name: task.taskName || "Unnamed Activity",
      duration: durationDays,
      percentComplete,
      actualStart: actualStart || undefined,
      actualFinish: actualFinish || undefined,
      sortOrder: sortOrder++,
      calendarId: calId || undefined,
      wbsId: ourWbsId && ourWbsId > 0 ? ourWbsId : undefined,
      activityType: isMilestone ? "milestone" : "task",
      constraintType,
      constraintDate: constraintDate || undefined,
    });

    activityIdMap.set(task.taskId, actId);
  }

  // ─── Import Relationships ──────────────────────────────────────────────────

  let relsImported = 0;
  for (const pred of xer.taskPredecessors) {
    // Only import relationships within this project
    if (pred.projId !== project.projId) continue;

    const successorDbId = activityIdMap.get(pred.taskId);
    const predecessorDbId = activityIdMap.get(pred.predTaskId);

    if (!successorDbId || !predecessorDbId) {
      warnings.push(`Skipped relationship: predecessor ${pred.predTaskId} → successor ${pred.taskId} (activity not found)`);
      continue;
    }

    // Map relationship type
    const relType = P6_REL_MAP[pred.predType] || "FS";

    // Convert lag from hours to days
    const dayHrCnt = 8; // default
    const lagDays = Math.round((pred.lag?.hours || 0) / dayHrCnt);

    await sdb.createRelationship({
      scheduleId,
      predecessorId: predecessorDbId,
      successorId: successorDbId,
      relationshipType: relType,
      lagDays,
    });

    relsImported++;
  }

  return {
    scheduleName,
    scheduleId,
    activitiesImported: activityIdMap.size,
    relationshipsImported: relsImported,
    wbsNodesImported: wbsIdMap.size - (projectWbs.some(w => w.projNodeFlag) ? 1 : 0),
    calendarsImported: calendarIdMap.size,
    warnings,
  };
}
