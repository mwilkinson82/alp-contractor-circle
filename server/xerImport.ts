/**
 * XER Import Service — converts Primavera P6 XER files into our schedule format.
 * Uses the xer-parser library for parsing, then maps to our DB schema.
 * 
 * Optimized for large files (14MB+, 2000+ activities) with:
 * - Bulk DB inserts (batched) instead of one-at-a-time
 * - Two-pass WBS import (create all, then update parent references)
 * - Streaming-capable XER parser
 * - Detailed error messages
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
  const data = cal.clndrData || "";

  // P6 clndr_data format: contains day definitions like "d|1|Y|..." for each weekday
  // Day numbers: 1=Sunday, 2=Monday, ..., 7=Saturday
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

type XerImportProgress = (message: string) => Promise<void> | void;

async function* chunkXerText(xerText: string, chunkSize = 256 * 1024) {
  for (let offset = 0; offset < xerText.length; offset += chunkSize) {
    yield xerText.slice(offset, offset + chunkSize);
  }
}

export async function importXerFile(
  xerText: string,
  memberId: number,
  overrideName?: string,
  onProgress?: XerImportProgress,
): Promise<XerImportResult> {
  const warnings: string[] = [];
  const t0 = Date.now();
  const progress = async (message: string) => {
    await onProgress?.(message);
  };

  // ─── Parse the XER file ──────────────────────────────────────────────────
  console.log(`[XER Import] Parsing XER file (${(xerText.length / 1024 / 1024).toFixed(1)} MB)...`);
  await progress(`Streaming parse for XER file (${(xerText.length / 1024 / 1024).toFixed(1)} MB)...`);
  let xer: InstanceType<typeof XER>;
  try {
    xer = await XER.fromStream(chunkXerText(xerText));
  } catch (e: any) {
    throw new Error(`Failed to parse XER file: ${e.message}. Make sure this is a valid Primavera P6 XER export.`);
  }
  console.log(`[XER Import] Parsed in ${Date.now() - t0}ms — ${xer.projects.length} projects, ${xer.tasks.length} tasks, ${xer.taskPredecessors.length} predecessors`);
  await progress(`Parsed ${xer.tasks.length.toLocaleString()} tasks, ${xer.taskPredecessors.length.toLocaleString()} relationships, ${xer.projWBS.length.toLocaleString()} WBS nodes.`);

  if (xer.projects.length === 0) {
    throw new Error("No projects found in XER file. Make sure you exported at least one project from P6.");
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
  console.log(`[XER Import] Created schedule #${scheduleId}: "${scheduleName}"`);
  await progress(`Created Baseline schedule "${scheduleName}" — importing calendars...`);

  // ─── Import Calendars ──────────────────────────────────────────────────────

  const calendarIdMap = new Map<number, number>(); // P6 clndr_id → our calendar id
  let defaultCalendarId: number | null = null;

  for (const cal of xer.calendars) {
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
  console.log(`[XER Import] Imported ${calendarIdMap.size} calendars`);
  await progress(`Imported ${calendarIdMap.size.toLocaleString()} calendars — importing WBS structure...`);

  // Add US construction holidays (bulk insert)
  const startYear = projectStart.getFullYear();
  const holidays = [
    ...getUSConstructionHolidays(startYear),
    ...getUSConstructionHolidays(startYear + 1),
  ];
  const holidayRows = holidays.map(h => ({
    calendarId: defaultCalendarId!,
    exceptionDate: new Date(h.date + "T00:00:00"),
    exceptionType: "holiday" as const,
    description: h.description,
  }));
  await sdb.bulkCreateCalendarExceptions(holidayRows);

  // ─── Import WBS (two-pass for parent references) ──────────────────────────

  const wbsIdMap = new Map<number, number>(); // P6 wbs_id → our wbs id
  const WBS_COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
    "#14B8A6", "#E11D48", "#0EA5E9", "#A855F7", "#D97706",
  ];

  // Filter WBS nodes for this project
  const projectWbs = xer.projWBS
    .filter(w => w.projId === project.projId)
    .sort((a, b) => {
      // Root nodes first (no parent), then by sequence
      if (!a.parentWbsId && b.parentWbsId) return -1;
      if (a.parentWbsId && !b.parentWbsId) return 1;
      return (a.seqNum || 0) - (b.seqNum || 0);
    });

  // Pass 1: Create all WBS nodes without parent references
  let colorIdx = 0;
  const wbsInsertOrder: { p6Id: number; p6ParentId: number | undefined }[] = [];
  
  for (const wbs of projectWbs) {
    // Skip the project-level WBS node (projNodeFlag)
    if (wbs.projNodeFlag) {
      wbsIdMap.set(wbs.wbsId, -1); // sentinel
      continue;
    }

    const { id: wbsId } = await sdb.createWbsNode({
      scheduleId,
      parentId: undefined, // set in pass 2
      code: wbs.wbsShortName || `WBS-${wbs.wbsId}`,
      name: wbs.wbsName || wbs.wbsShortName || "Unnamed WBS",
      sortOrder: wbs.seqNum || 0,
      groupColor: WBS_COLORS[colorIdx % WBS_COLORS.length],
      groupTextColor: "#FFFFFF",
    });

    wbsIdMap.set(wbs.wbsId, wbsId);
    wbsInsertOrder.push({ p6Id: wbs.wbsId, p6ParentId: wbs.parentWbsId || undefined });
    colorIdx++;
  }

  // Pass 2: Update parent references
  for (const { p6Id, p6ParentId } of wbsInsertOrder) {
    if (!p6ParentId) continue;
    const ourId = wbsIdMap.get(p6Id);
    const parentOurId = wbsIdMap.get(p6ParentId);
    if (ourId && ourId > 0 && parentOurId && parentOurId > 0) {
      await sdb.updateWbsNode(ourId, { parentId: parentOurId });
    }
  }

  const wbsCount = wbsInsertOrder.length;
  console.log(`[XER Import] Imported ${wbsCount} WBS nodes`);
  await progress(`Imported ${wbsCount.toLocaleString()} WBS nodes — preparing activities...`);

  // ─── Import Activities (bulk insert) ──────────────────────────────────────

  const activityIdMap = new Map<number, number>(); // P6 task_id → our activity DB id
  const projectTasks = xer.tasks.filter(t => t.project?.projId === project.projId);

  // Sort by P6 sequence / task_code
  const sortedTasks = [...projectTasks].sort((a, b) => {
    return (a.taskCode || "").localeCompare(b.taskCode || "");
  });

  // Build all activity rows first, then bulk insert
  const activityRows: Parameters<typeof sdb.bulkCreateActivities>[0] = [];
  const taskIdOrder: number[] = []; // P6 task_id in insert order
  let skippedWbsSummary = 0;

  let sortOrder = 0;
  for (const task of sortedTasks) {
    // Skip WBS summary tasks
    if ((task.taskType as string) === "TT_WBS") {
      skippedWbsSummary++;
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

    activityRows.push({
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

    taskIdOrder.push(task.taskId);
  }

  console.log(`[XER Import] Inserting ${activityRows.length} activities (skipped ${skippedWbsSummary} WBS summaries)...`);
  await progress(`Inserting ${activityRows.length.toLocaleString()} activities...`);
  const actIds = await sdb.bulkCreateActivities(activityRows);

  // Map P6 task IDs to our DB IDs
  for (let i = 0; i < taskIdOrder.length; i++) {
    activityIdMap.set(taskIdOrder[i], actIds[i].id);
  }
  console.log(`[XER Import] Inserted ${actIds.length} activities`);
  await progress(`Inserted ${actIds.length.toLocaleString()} activities — preparing logic relationships...`);

  // ─── Import Relationships (bulk insert) ────────────────────────────────────

  const relRows: Parameters<typeof sdb.bulkCreateRelationships>[0] = [];

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

    relRows.push({
      scheduleId,
      predecessorId: predecessorDbId,
      successorId: successorDbId,
      relationshipType: relType,
      lagDays,
    });
  }

  console.log(`[XER Import] Inserting ${relRows.length} relationships...`);
  await progress(`Inserting ${relRows.length.toLocaleString()} logic relationships...`);
  await sdb.bulkCreateRelationships(relRows);
  console.log(`[XER Import] Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  await progress(`Finalizing import — ${activityIdMap.size.toLocaleString()} activities and ${relRows.length.toLocaleString()} relationships imported.`);

  return {
    scheduleName,
    scheduleId,
    activitiesImported: activityIdMap.size,
    relationshipsImported: relRows.length,
    wbsNodesImported: wbsCount,
    calendarsImported: calendarIdMap.size,
    warnings,
  };
}
