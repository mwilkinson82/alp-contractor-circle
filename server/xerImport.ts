/**
 * XER Import Service — converts Primavera P6 XER files into our schedule format.
 * Uses a lean table parser for the P6 tables Baseline imports, then maps to our DB schema.
 * 
 * Optimized for large files (14MB+, 2000+ activities) with:
 * - Bulk DB inserts (batched) instead of one-at-a-time
 * - Two-pass WBS import (create all, then update parent references)
 * - Lightweight XER table parsing without full third-party entity hydration
 * - Detailed error messages
 */
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

type XerProject = {
  projId: number;
  projShortName?: string;
  clndrId?: number;
  lastRecalcDate?: Date;
  planStartDate?: Date;
};

type XerCalendar = {
  clndrId: number;
  defaultFlag: boolean;
  clndrName?: string;
  dayHrCnt?: number;
  weekHrCnt?: number;
  clndrData?: string;
};

type XerWbs = {
  wbsId: number;
  projId: number;
  seqNum?: number;
  projNodeFlag: boolean;
  wbsShortName?: string;
  wbsName?: string;
  parentWbsId?: number;
};

type XerTask = {
  taskId: number;
  projId: number;
  wbsId?: number;
  clndrId?: number;
  physCompletePct?: number;
  taskType?: string;
  taskCode?: string;
  taskName?: string;
  targetDrtnHrCnt?: number;
  cstrDate?: Date;
  cstrType?: string;
  actStartDate?: Date;
  actEndDate?: Date;
};

type XerTaskPred = {
  taskId: number;
  predTaskId: number;
  projId: number;
  predType?: string;
  lagHrCnt?: number;
};

type ParsedXer = {
  projects: XerProject[];
  calendars: XerCalendar[];
  projWBS: XerWbs[];
  tasks: XerTask[];
  taskPredecessors: XerTaskPred[];
};

const TARGET_TABLES = new Set(["PROJECT", "CALENDAR", "PROJWBS", "TASK", "TASKPRED"]);

function parseNumber(value: string | undefined): number | undefined {
  if (value == null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFlag(value: string | undefined) {
  return value === "Y";
}

function parseXerDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value.replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function read(row: string[], index: Map<string, number>, key: string) {
  const column = index.get(key);
  return column == null ? undefined : row[column];
}

function parseXerTables(xerText: string): ParsedXer {
  const parsed: ParsedXer = {
    projects: [],
    calendars: [],
    projWBS: [],
    tasks: [],
    taskPredecessors: [],
  };

  let activeTable = "";
  let headers: string[] = [];
  let headerIndex = new Map<string, number>();
  let start = 0;

  const processLine = (line: string) => {
    if (!line) return;
    const row = line.split("\t");
    const marker = row[0];

    if (marker === "%T") {
      activeTable = TARGET_TABLES.has(row[1]) ? row[1] : "";
      headers = [];
      headerIndex = new Map();
      return;
    }

    if (!activeTable) return;

    if (marker === "%F") {
      headers = row.slice(1);
      headerIndex = new Map(headers.map((header, index) => [header, index]));
      return;
    }

    if (marker !== "%R" || headers.length === 0) return;

    const values = row.slice(1);
    switch (activeTable) {
      case "PROJECT": {
        const projId = parseNumber(read(values, headerIndex, "proj_id"));
        if (projId == null) return;
        parsed.projects.push({
          projId,
          projShortName: read(values, headerIndex, "proj_short_name"),
          clndrId: parseNumber(read(values, headerIndex, "clndr_id")),
          lastRecalcDate: parseXerDate(read(values, headerIndex, "last_recalc_date")),
          planStartDate: parseXerDate(read(values, headerIndex, "plan_start_date")),
        });
        break;
      }
      case "CALENDAR": {
        const clndrId = parseNumber(read(values, headerIndex, "clndr_id"));
        if (clndrId == null) return;
        parsed.calendars.push({
          clndrId,
          defaultFlag: parseFlag(read(values, headerIndex, "default_flag")),
          clndrName: read(values, headerIndex, "clndr_name"),
          dayHrCnt: parseNumber(read(values, headerIndex, "day_hr_cnt")),
          weekHrCnt: parseNumber(read(values, headerIndex, "week_hr_cnt")),
          clndrData: read(values, headerIndex, "clndr_data"),
        });
        break;
      }
      case "PROJWBS": {
        const wbsId = parseNumber(read(values, headerIndex, "wbs_id"));
        const projId = parseNumber(read(values, headerIndex, "proj_id"));
        if (wbsId == null || projId == null) return;
        parsed.projWBS.push({
          wbsId,
          projId,
          seqNum: parseNumber(read(values, headerIndex, "seq_num")),
          projNodeFlag: parseFlag(read(values, headerIndex, "proj_node_flag")),
          wbsShortName: read(values, headerIndex, "wbs_short_name"),
          wbsName: read(values, headerIndex, "wbs_name"),
          parentWbsId: parseNumber(read(values, headerIndex, "parent_wbs_id")),
        });
        break;
      }
      case "TASK": {
        const taskId = parseNumber(read(values, headerIndex, "task_id"));
        const projId = parseNumber(read(values, headerIndex, "proj_id"));
        if (taskId == null || projId == null) return;
        parsed.tasks.push({
          taskId,
          projId,
          wbsId: parseNumber(read(values, headerIndex, "wbs_id")),
          clndrId: parseNumber(read(values, headerIndex, "clndr_id")),
          physCompletePct: parseNumber(read(values, headerIndex, "phys_complete_pct")),
          taskType: read(values, headerIndex, "task_type"),
          taskCode: read(values, headerIndex, "task_code"),
          taskName: read(values, headerIndex, "task_name"),
          targetDrtnHrCnt: parseNumber(read(values, headerIndex, "target_drtn_hr_cnt")),
          cstrDate: parseXerDate(read(values, headerIndex, "cstr_date")),
          cstrType: read(values, headerIndex, "cstr_type"),
          actStartDate: parseXerDate(read(values, headerIndex, "act_start_date")),
          actEndDate: parseXerDate(read(values, headerIndex, "act_end_date")),
        });
        break;
      }
      case "TASKPRED": {
        const taskId = parseNumber(read(values, headerIndex, "task_id"));
        const predTaskId = parseNumber(read(values, headerIndex, "pred_task_id"));
        const projId = parseNumber(read(values, headerIndex, "proj_id"));
        if (taskId == null || predTaskId == null || projId == null) return;
        parsed.taskPredecessors.push({
          taskId,
          predTaskId,
          projId,
          predType: read(values, headerIndex, "pred_type"),
          lagHrCnt: parseNumber(read(values, headerIndex, "lag_hr_cnt")),
        });
        break;
      }
    }
  };

  for (let i = 0; i <= xerText.length; i++) {
    if (i === xerText.length || xerText.charCodeAt(i) === 10) {
      const end = i > start && xerText.charCodeAt(i - 1) === 13 ? i - 1 : i;
      processLine(xerText.slice(start, end));
      start = i + 1;
    }
  }

  return parsed;
}

function selectImportProject(xer: ParsedXer, overrideName?: string) {
  const taskCounts = new Map<number, number>();
  for (const task of xer.tasks) {
    taskCounts.set(task.projId, (taskCounts.get(task.projId) || 0) + 1);
  }

  const normalizedOverride = overrideName?.trim().toLowerCase();
  if (normalizedOverride) {
    const exactMatch = xer.projects.find((project) => project.projShortName?.trim().toLowerCase() === normalizedOverride);
    if (exactMatch) return exactMatch;
  }

  return [...xer.projects].sort((a, b) => {
    const taskDelta = (taskCounts.get(b.projId) || 0) - (taskCounts.get(a.projId) || 0);
    if (taskDelta !== 0) return taskDelta;
    return a.projId - b.projId;
  })[0];
}

export async function importXerFile(
  xerText: string,
  memberId: number,
  overrideName?: string,
  onProgress?: XerImportProgress,
): Promise<XerImportResult> {
  const warnings: string[] = [];
  const t0 = Date.now();
  let createdScheduleId: number | null = null;
  const progress = async (message: string) => {
    await onProgress?.(message);
  };

  try {
    // ─── Parse the XER file ──────────────────────────────────────────────────
    console.log(`[XER Import] Parsing XER file (${(xerText.length / 1024 / 1024).toFixed(1)} MB)...`);
    await progress(`Reading P6 tables from XER file (${(xerText.length / 1024 / 1024).toFixed(1)} MB)...`);
    let xer: ParsedXer;
    xer = parseXerTables(xerText);
    console.log(`[XER Import] Parsed in ${Date.now() - t0}ms — ${xer.projects.length} projects, ${xer.tasks.length} tasks, ${xer.taskPredecessors.length} predecessors`);
    await progress(`Parsed ${xer.tasks.length.toLocaleString()} tasks, ${xer.taskPredecessors.length.toLocaleString()} relationships, ${xer.projWBS.length.toLocaleString()} WBS nodes.`);

    if (xer.projects.length === 0) {
      throw new Error("No projects found in XER file. Make sure you exported at least one project from P6.");
    }

  // P6 exports can include baseline/related projects. Import the project with the real task set.
  const project = selectImportProject(xer, overrideName);
  const selectedProjectTaskCount = xer.tasks.filter(t => t.projId === project.projId).length;
  const scheduleName = overrideName || project.projShortName || "Imported Schedule";
  console.log(`[XER Import] Selected project ${project.projId}: "${project.projShortName}" (${selectedProjectTaskCount} tasks)`);
  await progress(`Selected P6 project "${project.projShortName || project.projId}" with ${selectedProjectTaskCount.toLocaleString()} tasks.`);

  // Get data date from project
  const dataDate = project.lastRecalcDate || new Date();
  const projectStart = project.planStartDate || new Date();

  // Create the schedule
  const { id: scheduleId } = await sdb.createSchedule({
    memberId,
    name: scheduleName,
    description: `Imported from P6 XER file. Original project: ${project.projShortName}`,
    projectStartDate: projectStart,
    dataDate,
  });
  createdScheduleId = scheduleId;
  console.log(`[XER Import] Created schedule #${scheduleId}: "${scheduleName}"`);
  await progress(`Created Baseline schedule "${scheduleName}" — importing calendars...`);

  // ─── Import Calendars ──────────────────────────────────────────────────────

  const calendarIdMap = new Map<number, number>(); // P6 clndr_id → our calendar id
  const calendarByP6Id = new Map(xer.calendars.map((cal) => [cal.clndrId, cal]));
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
  const wbsByP6Id = new Map(xer.projWBS.map((wbs) => [wbs.wbsId, wbs]));
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
  const wbsRows: Parameters<typeof sdb.bulkCreateWbsNodes>[0] = [];

  for (const wbs of projectWbs) {
    // Skip the project-level WBS node (projNodeFlag)
    if (wbs.projNodeFlag) {
      wbsIdMap.set(wbs.wbsId, -1); // sentinel
      continue;
    }

    wbsRows.push({
      scheduleId,
      parentId: undefined, // set in pass 2
      code: wbs.wbsShortName || `WBS-${wbs.wbsId}`,
      name: wbs.wbsName || wbs.wbsShortName || "Unnamed WBS",
      sortOrder: wbs.seqNum || 0,
      groupColor: WBS_COLORS[colorIdx % WBS_COLORS.length],
      groupTextColor: "#FFFFFF",
    });
    wbsInsertOrder.push({ p6Id: wbs.wbsId, p6ParentId: wbs.parentWbsId || undefined });
    colorIdx++;
  }

  const wbsIds = await sdb.bulkCreateWbsNodes(wbsRows);
  for (let i = 0; i < wbsInsertOrder.length; i++) {
    wbsIdMap.set(wbsInsertOrder[i].p6Id, wbsIds[i].id);
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
  const projectTasks = xer.tasks.filter(t => t.projId === project.projId);

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
    const taskCalendar = task.clndrId ? calendarByP6Id.get(task.clndrId) : undefined;
    const dayHrCnt = taskCalendar?.dayHrCnt || 8;
    const durationDays = isMilestone ? 0 : Math.max(1, Math.round((task.targetDrtnHrCnt || 0) / dayHrCnt));

    // Map constraint type
    let constraintType = "ASAP";
    if (task.cstrType) {
      constraintType = P6_CONSTRAINT_MAP[task.cstrType] || "ASAP";
    }

    // Map constraint date
    let constraintDate: Date | undefined;
    if (task.cstrDate) {
      constraintDate = task.cstrDate;
    }

    // Map percent complete
    const percentComplete = (task.physCompletePct ?? 0).toFixed(2);

    // Map actual dates
    const actualStart = task.actStartDate || undefined;
    const actualFinish = task.actEndDate || undefined;

    // Map WBS
    const wbsNode = task.wbsId ? wbsByP6Id.get(task.wbsId) : undefined;
    const ourWbsId = wbsNode ? wbsIdMap.get(wbsNode.wbsId) : undefined;

    // Map calendar
    const calId = task.clndrId ? calendarIdMap.get(task.clndrId) : undefined;

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
    const relType = (pred.predType ? P6_REL_MAP[pred.predType] : undefined) || "FS";

    // Convert lag from hours to days
    const dayHrCnt = 8; // default
    const lagDays = Math.round((pred.lagHrCnt || 0) / dayHrCnt);

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
  } catch (e: any) {
    if (createdScheduleId) {
      try {
        await sdb.deleteSchedule(createdScheduleId);
      } catch (cleanupErr) {
        console.error(`[XER Import] Failed to clean up partial schedule #${createdScheduleId}:`, cleanupErr);
      }
    }
    if (e?.message?.startsWith("Failed to parse XER file:")) throw e;
    if (e?.message?.includes("No projects found in XER file")) throw e;
    throw new Error(`Failed to import XER file: ${e.message || "Unknown error"}`);
  }
}
