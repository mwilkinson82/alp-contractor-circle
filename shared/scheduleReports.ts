/**
 * Schedule Reports Engine
 * Generates tabular report data for CPM schedules.
 * All reports return structured arrays suitable for table rendering and PDF export.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ReportActivity {
  id: number;
  activityId: string;
  name: string;
  duration: number;
  percentComplete: number;
  earlyStart: Date | null;
  earlyFinish: Date | null;
  lateStart: Date | null;
  lateFinish: Date | null;
  totalFloat: number | null;
  freeFloat: number | null;
  isCritical: boolean;
  isOnLongestPath: boolean;
  actualStart: Date | null;
  actualFinish: Date | null;
  wbsId: number | null;
  wbsName?: string;
  wbsCode?: string;
  constraintType: string;
  constraintDate: Date | null;
  calendarId: number | null;
}

export interface BaselineActivity {
  activityId: string;
  name: string;
  duration: number;
  earlyStart: Date | null;
  earlyFinish: Date | null;
  lateStart: Date | null;
  lateFinish: Date | null;
  totalFloat: number | null;
}

export interface ReportFilters {
  wbsId?: number | null;
  floatThreshold?: number | null;
  dateRangeStart?: Date | null;
  dateRangeEnd?: Date | null;
  activityCodeCategory?: string | null;
  activityCodeValue?: string | null;
  showOnlyCritical?: boolean;
}

// ── Filter Helper ────────────────────────────────────────────────────────────

function applyFilters(activities: ReportActivity[], filters?: ReportFilters): ReportActivity[] {
  if (!filters) return activities;
  let result = [...activities];

  if (filters.wbsId != null) {
    result = result.filter(a => a.wbsId === filters.wbsId);
  }
  if (filters.showOnlyCritical) {
    result = result.filter(a => a.isCritical);
  }
  if (filters.floatThreshold != null) {
    result = result.filter(a => (a.totalFloat ?? 999) <= filters.floatThreshold!);
  }
  if (filters.dateRangeStart) {
    result = result.filter(a => a.earlyStart && a.earlyStart >= filters.dateRangeStart!);
  }
  if (filters.dateRangeEnd) {
    result = result.filter(a => a.earlyFinish && a.earlyFinish <= filters.dateRangeEnd!);
  }

  return result;
}

// ── Date Formatting ──────────────────────────────────────────────────────────

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysDiff(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  const msPerDay = 86400000;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

// ── 1. Total Float Report ────────────────────────────────────────────────────

export interface TotalFloatRow {
  activityId: string;
  name: string;
  duration: number;
  earlyStart: string;
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
  wbsName: string;
}

export function generateTotalFloatReport(
  activities: ReportActivity[],
  filters?: ReportFilters,
  sortBy: "float_asc" | "float_desc" | "activity_id" = "float_asc"
): TotalFloatRow[] {
  const filtered = applyFilters(activities, filters);

  const rows: TotalFloatRow[] = filtered.map(a => ({
    activityId: a.activityId,
    name: a.name,
    duration: a.duration,
    earlyStart: fmtDate(a.earlyStart),
    earlyFinish: fmtDate(a.earlyFinish),
    lateStart: fmtDate(a.lateStart),
    lateFinish: fmtDate(a.lateFinish),
    totalFloat: a.totalFloat ?? 0,
    freeFloat: a.freeFloat ?? 0,
    isCritical: a.isCritical,
    wbsName: a.wbsName || "—",
  }));

  switch (sortBy) {
    case "float_asc":
      rows.sort((a, b) => a.totalFloat - b.totalFloat);
      break;
    case "float_desc":
      rows.sort((a, b) => b.totalFloat - a.totalFloat);
      break;
    case "activity_id":
      rows.sort((a, b) => a.activityId.localeCompare(b.activityId));
      break;
  }

  return rows;
}

// ── 2. Early Start Report ────────────────────────────────────────────────────

export interface EarlyStartRow {
  activityId: string;
  name: string;
  duration: number;
  earlyStart: string;
  earlyFinish: string;
  totalFloat: number;
  percentComplete: number;
  isCritical: boolean;
  wbsName: string;
  status: "Not Started" | "In Progress" | "Complete";
}

export function generateEarlyStartReport(
  activities: ReportActivity[],
  filters?: ReportFilters,
): EarlyStartRow[] {
  const filtered = applyFilters(activities, filters);

  const rows: EarlyStartRow[] = filtered.map(a => {
    let status: EarlyStartRow["status"] = "Not Started";
    if (a.percentComplete >= 100 || a.actualFinish) status = "Complete";
    else if (a.percentComplete > 0 || a.actualStart) status = "In Progress";

    return {
      activityId: a.activityId,
      name: a.name,
      duration: a.duration,
      earlyStart: fmtDate(a.earlyStart),
      earlyFinish: fmtDate(a.earlyFinish),
      totalFloat: a.totalFloat ?? 0,
      percentComplete: a.percentComplete,
      isCritical: a.isCritical,
      wbsName: a.wbsName || "—",
      status,
    };
  });

  // Sort by early start date ascending
  rows.sort((a, b) => {
    if (a.earlyStart === "—") return 1;
    if (b.earlyStart === "—") return -1;
    return new Date(a.earlyStart).getTime() - new Date(b.earlyStart).getTime();
  });

  return rows;
}

// ── 3. Critical Path Report ──────────────────────────────────────────────────

export interface CriticalPathRow {
  activityId: string;
  name: string;
  duration: number;
  earlyStart: string;
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
  totalFloat: number;
  isOnLongestPath: boolean;
  wbsName: string;
  predecessors: string;
  successors: string;
}

export function generateCriticalPathReport(
  activities: ReportActivity[],
  relationships: Array<{ predecessorId: number; successorId: number; relationshipType: string; lagDays: number }>,
  filters?: ReportFilters,
): CriticalPathRow[] {
  // Only critical activities
  let criticalActs = activities.filter(a => a.isCritical);
  criticalActs = applyFilters(criticalActs, filters);

  // Build predecessor/successor lookup
  const actIdMap = new Map(activities.map(a => [a.id, a.activityId]));

  const predMap = new Map<number, string[]>();
  const succMap = new Map<number, string[]>();
  for (const rel of relationships) {
    const predLabel = `${actIdMap.get(rel.predecessorId) || "?"} (${rel.relationshipType}${rel.lagDays ? ` +${rel.lagDays}d` : ""})`;
    const succLabel = `${actIdMap.get(rel.successorId) || "?"} (${rel.relationshipType}${rel.lagDays ? ` +${rel.lagDays}d` : ""})`;

    if (!succMap.has(rel.predecessorId)) succMap.set(rel.predecessorId, []);
    succMap.get(rel.predecessorId)!.push(succLabel);

    if (!predMap.has(rel.successorId)) predMap.set(rel.successorId, []);
    predMap.get(rel.successorId)!.push(predLabel);
  }

  const rows: CriticalPathRow[] = criticalActs.map(a => ({
    activityId: a.activityId,
    name: a.name,
    duration: a.duration,
    earlyStart: fmtDate(a.earlyStart),
    earlyFinish: fmtDate(a.earlyFinish),
    lateStart: fmtDate(a.lateStart),
    lateFinish: fmtDate(a.lateFinish),
    totalFloat: a.totalFloat ?? 0,
    isOnLongestPath: a.isOnLongestPath,
    wbsName: a.wbsName || "—",
    predecessors: predMap.get(a.id)?.join(", ") || "—",
    successors: succMap.get(a.id)?.join(", ") || "—",
  }));

  // Sort by early start
  rows.sort((a, b) => {
    if (a.earlyStart === "—") return 1;
    if (b.earlyStart === "—") return -1;
    return new Date(a.earlyStart).getTime() - new Date(b.earlyStart).getTime();
  });

  return rows;
}

// ── 4. Duration Report ───────────────────────────────────────────────────────

export interface DurationRow {
  activityId: string;
  name: string;
  originalDuration: number;
  remainingDuration: number;
  percentComplete: number;
  earlyStart: string;
  earlyFinish: string;
  totalFloat: number;
  isCritical: boolean;
  wbsName: string;
  status: "Not Started" | "In Progress" | "Complete";
}

export function generateDurationReport(
  activities: ReportActivity[],
  filters?: ReportFilters,
): DurationRow[] {
  const filtered = applyFilters(activities, filters);

  const rows: DurationRow[] = filtered.map(a => {
    let status: DurationRow["status"] = "Not Started";
    if (a.percentComplete >= 100 || a.actualFinish) status = "Complete";
    else if (a.percentComplete > 0 || a.actualStart) status = "In Progress";

    const remaining = Math.max(0, Math.round(a.duration * (1 - a.percentComplete / 100)));

    return {
      activityId: a.activityId,
      name: a.name,
      originalDuration: a.duration,
      remainingDuration: remaining,
      percentComplete: a.percentComplete,
      earlyStart: fmtDate(a.earlyStart),
      earlyFinish: fmtDate(a.earlyFinish),
      totalFloat: a.totalFloat ?? 0,
      isCritical: a.isCritical,
      wbsName: a.wbsName || "—",
      status,
    };
  });

  // Sort by activity ID
  rows.sort((a, b) => a.activityId.localeCompare(b.activityId));

  return rows;
}

// ── 5. Schedule Comparison Report ────────────────────────────────────────────

export interface ComparisonRow {
  activityId: string;
  name: string;
  // Current
  currentDuration: number;
  currentEarlyStart: string;
  currentEarlyFinish: string;
  currentTotalFloat: number;
  // Baseline
  baselineDuration: number;
  baselineEarlyStart: string;
  baselineEarlyFinish: string;
  baselineTotalFloat: number;
  // Variances
  durationVariance: number;
  startVarianceDays: number | null;
  finishVarianceDays: number | null;
  floatVariance: number;
  isCritical: boolean;
  wbsName: string;
}

export function generateComparisonReport(
  currentActivities: ReportActivity[],
  baselineActivities: BaselineActivity[],
  filters?: ReportFilters,
): ComparisonRow[] {
  const filtered = applyFilters(currentActivities, filters);
  const baselineMap = new Map(baselineActivities.map(b => [b.activityId, b]));

  const rows: ComparisonRow[] = [];

  for (const curr of filtered) {
    const base = baselineMap.get(curr.activityId);
    if (!base) continue; // Skip activities not in baseline

    const startVar = daysDiff(base.earlyStart, curr.earlyStart);
    const finishVar = daysDiff(base.earlyFinish, curr.earlyFinish);

    rows.push({
      activityId: curr.activityId,
      name: curr.name,
      currentDuration: curr.duration,
      currentEarlyStart: fmtDate(curr.earlyStart),
      currentEarlyFinish: fmtDate(curr.earlyFinish),
      currentTotalFloat: curr.totalFloat ?? 0,
      baselineDuration: base.duration,
      baselineEarlyStart: fmtDate(base.earlyStart),
      baselineEarlyFinish: fmtDate(base.earlyFinish),
      baselineTotalFloat: base.totalFloat ?? 0,
      durationVariance: curr.duration - base.duration,
      startVarianceDays: startVar,
      finishVarianceDays: finishVar,
      floatVariance: (curr.totalFloat ?? 0) - (base.totalFloat ?? 0),
      isCritical: curr.isCritical,
      wbsName: curr.wbsName || "—",
    });
  }

  // Sort by finish variance (most delayed first)
  rows.sort((a, b) => (b.finishVarianceDays ?? 0) - (a.finishVarianceDays ?? 0));

  return rows;
}

// ── Report Summary Stats ─────────────────────────────────────────────────────

export interface ReportSummary {
  totalActivities: number;
  criticalActivities: number;
  completedActivities: number;
  inProgressActivities: number;
  notStartedActivities: number;
  averageFloat: number;
  negativeFloatCount: number;
  projectDuration: number | null;
  earliestStart: string;
  latestFinish: string;
}

export function generateReportSummary(activities: ReportActivity[]): ReportSummary {
  const total = activities.length;
  const critical = activities.filter(a => a.isCritical).length;
  const completed = activities.filter(a => a.percentComplete >= 100 || a.actualFinish).length;
  const inProgress = activities.filter(a => (a.percentComplete > 0 && a.percentComplete < 100) && !a.actualFinish).length;
  const notStarted = total - completed - inProgress;

  const floats = activities.map(a => a.totalFloat ?? 0);
  const avgFloat = floats.length > 0 ? Math.round(floats.reduce((s, f) => s + f, 0) / floats.length) : 0;
  const negFloat = floats.filter(f => f < 0).length;

  const starts = activities.filter(a => a.earlyStart).map(a => new Date(a.earlyStart!).getTime());
  const finishes = activities.filter(a => a.earlyFinish).map(a => new Date(a.earlyFinish!).getTime());

  const earliest = starts.length > 0 ? new Date(Math.min(...starts)) : null;
  const latest = finishes.length > 0 ? new Date(Math.max(...finishes)) : null;

  const projDuration = earliest && latest ? daysDiff(earliest, latest) : null;

  return {
    totalActivities: total,
    criticalActivities: critical,
    completedActivities: completed,
    inProgressActivities: inProgress,
    notStartedActivities: notStarted,
    averageFloat: avgFloat,
    negativeFloatCount: negFloat,
    projectDuration: projDuration,
    earliestStart: fmtDate(earliest),
    latestFinish: fmtDate(latest),
  };
}
