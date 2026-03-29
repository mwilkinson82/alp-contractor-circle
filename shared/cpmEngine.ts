/**
 * CPM (Critical Path Method) Scheduling Engine
 *
 * Pure computation module — no database dependencies.
 * Runs forward pass, backward pass, calculates float, and identifies the critical path.
 * Supports all four relationship types: FS, SS, FF, SF with lag/lead.
 * Supports custom calendars with work-day bitmasks and holiday exceptions.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type RelationshipType = "FS" | "SS" | "FF" | "SF";

/** Bitmask for work days: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64 */
export const DAY_BITS = {
  Mon: 1,
  Tue: 2,
  Wed: 4,
  Thu: 8,
  Fri: 16,
  Sat: 32,
  Sun: 64,
} as const;

/** Standard 5-day (Mon-Fri) = 31, 7-day = 127 */
export const PRESET_MASKS = {
  "5day": 31,   // Mon+Tue+Wed+Thu+Fri
  "6day": 63,   // Mon-Sat
  "7day": 127,  // All days
} as const;

/**
 * Calendar definition used by the CPM engine.
 * Built from project_calendars + calendar_exceptions tables.
 */
export interface CpmCalendar {
  id: number;
  name: string;
  /** Bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64 */
  workDaysMask: number;
  /** Set of date strings (YYYY-MM-DD) that are holidays (non-work) */
  holidays: Set<string>;
  /** Set of date strings (YYYY-MM-DD) that override to work days */
  workdayOverrides: Set<string>;
}

export interface CpmActivity {
  id: number;
  activityId: string;
  name: string;
  duration: number; // work days
  sortOrder: number;
  wbs?: string | null;
  percentComplete?: number;
  actualStart?: Date | null;
  actualFinish?: Date | null;
  /** Calendar ID for this activity (null = use default) */
  calendarId?: number | null;
}

export interface CpmRelationship {
  id: number;
  predecessorId: number;
  successorId: number;
  relationshipType: RelationshipType;
  lagDays: number;
}

export interface CpmResult {
  id: number;
  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
  isOnLongestPath: boolean;
}

export interface CpmOutput {
  results: Map<number, CpmResult>;
  projectFinish: Date;
  criticalPath: number[];
  longestPath: number[];
}

// ─── Calendar Helpers ────────────────────────────────────────────────────────

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Map JS getDay() (0=Sun..6=Sat) to our bitmask */
function dayToBit(jsDay: number): number {
  // JS: 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
  const map = [64, 1, 2, 4, 8, 16, 32]; // Sun=64,Mon=1,...,Sat=32
  return map[jsDay];
}

/**
 * Check if a date is a work day on the given calendar.
 */
export function isWorkDay(date: Date, calendar: CpmCalendar): boolean {
  const key = toDateKey(date);

  // Explicit workday override wins (e.g., Saturday OT)
  if (calendar.workdayOverrides.has(key)) return true;

  // Explicit holiday wins
  if (calendar.holidays.has(key)) return false;

  // Check the weekly bitmask
  const bit = dayToBit(date.getDay());
  return (calendar.workDaysMask & bit) !== 0;
}

/**
 * Add work days to a date, respecting the calendar.
 * Duration of 0 returns the same date.
 */
export function addWorkDays(start: Date, workDays: number, calendar: CpmCalendar): Date {
  if (workDays === 0) return new Date(start);

  const result = new Date(start);
  let remaining = Math.abs(workDays);
  const direction = workDays > 0 ? 1 : -1;

  // Safety: max 10,000 iterations to prevent infinite loops
  let iterations = 0;
  while (remaining > 0 && iterations < 10000) {
    result.setDate(result.getDate() + direction);
    if (isWorkDay(result, calendar)) {
      remaining--;
    }
    iterations++;
  }

  return result;
}

/**
 * Calculate work days between two dates on a given calendar.
 */
export function workDaysBetween(start: Date, end: Date, calendar: CpmCalendar): number {
  if (start.getTime() === end.getTime()) return 0;

  let count = 0;
  const current = new Date(start);
  const direction = end >= start ? 1 : -1;
  let iterations = 0;

  while (iterations < 10000) {
    current.setDate(current.getDate() + direction);
    if (isWorkDay(current, calendar)) {
      count += direction;
    }
    // Check if we've reached or passed the end
    if (direction > 0 && current >= end) break;
    if (direction < 0 && current <= end) break;
    iterations++;
  }

  return count;
}

/**
 * Ensure a date falls on a work day. If not, move forward to the next work day.
 */
function ensureWorkDay(date: Date, calendar: CpmCalendar): Date {
  const result = new Date(date);
  let iterations = 0;
  while (!isWorkDay(result, calendar) && iterations < 365) {
    result.setDate(result.getDate() + 1);
    iterations++;
  }
  return result;
}

/**
 * Create a simple default calendar (5-day Mon-Fri, no holidays).
 */
export function createDefaultCalendar(): CpmCalendar {
  return {
    id: 0,
    name: "Standard 5-Day",
    workDaysMask: PRESET_MASKS["5day"],
    holidays: new Set(),
    workdayOverrides: new Set(),
  };
}

/**
 * Pre-load US construction holidays for a given year.
 * Returns an array of { date: string (YYYY-MM-DD), description: string }.
 */
export function getUSConstructionHolidays(year: number): Array<{ date: string; description: string }> {
  const holidays: Array<{ date: string; description: string }> = [];

  // New Year's Day — Jan 1
  holidays.push({ date: `${year}-01-01`, description: "New Year's Day" });

  // Martin Luther King Jr. Day — 3rd Monday of January
  holidays.push({ date: getNthWeekday(year, 0, 1, 3), description: "MLK Day" });

  // Presidents' Day — 3rd Monday of February
  holidays.push({ date: getNthWeekday(year, 1, 1, 3), description: "Presidents' Day" });

  // Memorial Day — last Monday of May
  holidays.push({ date: getLastWeekday(year, 4, 1), description: "Memorial Day" });

  // Independence Day — July 4
  holidays.push({ date: `${year}-07-04`, description: "Independence Day" });

  // Labor Day — 1st Monday of September
  holidays.push({ date: getNthWeekday(year, 8, 1, 1), description: "Labor Day" });

  // Columbus Day — 2nd Monday of October
  holidays.push({ date: getNthWeekday(year, 9, 1, 2), description: "Columbus Day" });

  // Veterans Day — Nov 11
  holidays.push({ date: `${year}-11-11`, description: "Veterans Day" });

  // Thanksgiving — 4th Thursday of November
  holidays.push({ date: getNthWeekday(year, 10, 4, 4), description: "Thanksgiving" });

  // Day after Thanksgiving
  const thanksgivingDate = getNthWeekday(year, 10, 4, 4);
  const tgDate = new Date(thanksgivingDate + "T00:00:00");
  tgDate.setDate(tgDate.getDate() + 1);
  holidays.push({ date: toDateKey(tgDate), description: "Day After Thanksgiving" });

  // Christmas Eve — Dec 24
  holidays.push({ date: `${year}-12-24`, description: "Christmas Eve" });

  // Christmas Day — Dec 25
  holidays.push({ date: `${year}-12-25`, description: "Christmas Day" });

  // New Year's Eve — Dec 31
  holidays.push({ date: `${year}-12-31`, description: "New Year's Eve" });

  return holidays;
}

/** Get the Nth occurrence of a weekday in a month. weekday: 0=Sun..6=Sat, month: 0-indexed */
function getNthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(year, month, 1);
  let dayOfWeek = first.getDay();
  let diff = weekday - dayOfWeek;
  if (diff < 0) diff += 7;
  const firstOccurrence = 1 + diff;
  const nthDay = firstOccurrence + (n - 1) * 7;
  const d = new Date(year, month, nthDay);
  return toDateKey(d);
}

/** Get the last occurrence of a weekday in a month */
function getLastWeekday(year: number, month: number, weekday: number): string {
  const last = new Date(year, month + 1, 0); // last day of month
  let dayOfWeek = last.getDay();
  let diff = dayOfWeek - weekday;
  if (diff < 0) diff += 7;
  const d = new Date(year, month + 1, -diff);
  return toDateKey(d);
}

// ─── CPM Engine ──────────────────────────────────────────────────────────────

/**
 * Run the full CPM calculation.
 *
 * @param activities - All activities in the schedule
 * @param relationships - All logic ties between activities
 * @param projectStartDate - The project data date / start date
 * @param calendars - Map of calendar ID to CpmCalendar
 * @param defaultCalendarId - The default calendar ID for the schedule
 * @returns CpmOutput with computed dates, float, and critical path
 */
export function calculateCPM(
  activities: CpmActivity[],
  relationships: CpmRelationship[],
  projectStartDate: Date,
  calendars: Map<number, CpmCalendar>,
  defaultCalendarId: number,
): CpmOutput {
  if (activities.length === 0) {
    return { results: new Map(), projectFinish: projectStartDate, criticalPath: [], longestPath: [] };
  }

  // Resolve calendar for an activity
  function getCalendar(act: CpmActivity): CpmCalendar {
    if (act.calendarId && calendars.has(act.calendarId)) {
      return calendars.get(act.calendarId)!;
    }
    return calendars.get(defaultCalendarId) || createDefaultCalendar();
  }

  // For relationship lag calculations, use the successor's calendar
  function getRelCalendar(successorId: number): CpmCalendar {
    const act = activityMap.get(successorId);
    return act ? getCalendar(act) : createDefaultCalendar();
  }

  // Build adjacency lists
  const activityMap = new Map<number, CpmActivity>();
  const predecessors = new Map<number, CpmRelationship[]>();
  const successorsMap = new Map<number, CpmRelationship[]>();

  for (const act of activities) {
    activityMap.set(act.id, act);
    predecessors.set(act.id, []);
    successorsMap.set(act.id, []);
  }

  for (const rel of relationships) {
    if (activityMap.has(rel.predecessorId) && activityMap.has(rel.successorId)) {
      predecessors.get(rel.successorId)!.push(rel);
      successorsMap.get(rel.predecessorId)!.push(rel);
    }
  }

  // Topological sort (Kahn's algorithm)
  const inDegree = new Map<number, number>();
  for (const act of activities) {
    inDegree.set(act.id, 0);
  }
  for (const rel of relationships) {
    if (activityMap.has(rel.successorId) && activityMap.has(rel.predecessorId)) {
      inDegree.set(rel.successorId, (inDegree.get(rel.successorId) || 0) + 1);
    }
  }

  const queue: number[] = [];
  const entries = Array.from(inDegree.entries());
  for (let i = 0; i < entries.length; i++) {
    if (entries[i][1] === 0) queue.push(entries[i][0]);
  }

  const topoOrder: number[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    topoOrder.push(current);
    const succs = successorsMap.get(current) || [];
    for (let i = 0; i < succs.length; i++) {
      const rel = succs[i];
      if (activityMap.has(rel.successorId)) {
        const newDegree = (inDegree.get(rel.successorId) || 1) - 1;
        inDegree.set(rel.successorId, newDegree);
        if (newDegree === 0) queue.push(rel.successorId);
      }
    }
  }

  // Handle cycles: add remaining activities
  if (topoOrder.length < activities.length) {
    for (const act of activities) {
      if (topoOrder.indexOf(act.id) === -1) {
        topoOrder.push(act.id);
      }
    }
  }

  // ─── Forward Pass ────────────────────────────────────────────────────────
  const earlyStart = new Map<number, Date>();
  const earlyFinish = new Map<number, Date>();

  const defaultCal = calendars.get(defaultCalendarId) || createDefaultCalendar();
  const startDate = ensureWorkDay(projectStartDate, defaultCal);

  for (let t = 0; t < topoOrder.length; t++) {
    const actId = topoOrder[t];
    const act = activityMap.get(actId)!;
    const cal = getCalendar(act);
    const preds = predecessors.get(actId) || [];

    let es: Date;

    if (preds.length === 0) {
      es = ensureWorkDay(new Date(startDate), cal);
    } else {
      es = ensureWorkDay(new Date(startDate), cal);
      for (let p = 0; p < preds.length; p++) {
        const rel = preds[p];
        const predES = earlyStart.get(rel.predecessorId)!;
        const predEF = earlyFinish.get(rel.predecessorId)!;
        const relCal = getRelCalendar(rel.successorId);
        let constraintDate: Date;

        switch (rel.relationshipType) {
          case "FS":
            constraintDate = addWorkDays(predEF, rel.lagDays, relCal);
            break;
          case "SS":
            constraintDate = addWorkDays(predES, rel.lagDays, relCal);
            break;
          case "FF":
            constraintDate = addWorkDays(
              addWorkDays(predEF, rel.lagDays, relCal),
              -act.duration,
              cal,
            );
            break;
          case "SF":
            constraintDate = addWorkDays(
              addWorkDays(predES, rel.lagDays, relCal),
              -act.duration,
              cal,
            );
            break;
        }

        if (constraintDate > es) {
          es = constraintDate;
        }
      }
    }

    es = ensureWorkDay(es, cal);
    const ef = act.duration === 0 ? new Date(es) : addWorkDays(es, act.duration, cal);

    earlyStart.set(actId, es);
    earlyFinish.set(actId, ef);
  }

  // Project finish = max of all early finishes
  let projectFinish = new Date(startDate);
  const efValues = Array.from(earlyFinish.values());
  for (let i = 0; i < efValues.length; i++) {
    if (efValues[i] > projectFinish) projectFinish = new Date(efValues[i]);
  }

  // ─── Backward Pass ───────────────────────────────────────────────────────
  const lateStart = new Map<number, Date>();
  const lateFinish = new Map<number, Date>();

  for (let t = topoOrder.length - 1; t >= 0; t--) {
    const actId = topoOrder[t];
    const act = activityMap.get(actId)!;
    const cal = getCalendar(act);
    const succs = successorsMap.get(actId) || [];

    let lf: Date;

    if (succs.length === 0) {
      lf = new Date(projectFinish);
    } else {
      lf = new Date(projectFinish);
      let first = true;
      for (let s = 0; s < succs.length; s++) {
        const rel = succs[s];
        const succLS = lateStart.get(rel.successorId)!;
        const succLF = lateFinish.get(rel.successorId)!;
        const relCal = getRelCalendar(rel.successorId);
        let constraintDate: Date;

        switch (rel.relationshipType) {
          case "FS":
            constraintDate = addWorkDays(succLS, -rel.lagDays, relCal);
            break;
          case "SS":
            constraintDate = addWorkDays(
              addWorkDays(succLS, -rel.lagDays, relCal),
              act.duration,
              cal,
            );
            break;
          case "FF":
            constraintDate = addWorkDays(succLF, -rel.lagDays, relCal);
            break;
          case "SF":
            constraintDate = addWorkDays(
              addWorkDays(succLF, -rel.lagDays, relCal),
              act.duration,
              cal,
            );
            break;
        }

        if (first || constraintDate < lf) {
          lf = constraintDate;
          first = false;
        }
      }
    }

    const ls = act.duration === 0 ? new Date(lf) : addWorkDays(lf, -act.duration, cal);

    lateStart.set(actId, ls);
    lateFinish.set(actId, lf);
  }

  // ─── Float & Critical Path ───────────────────────────────────────────────
  const results = new Map<number, CpmResult>();
  const criticalPath: number[] = [];

  for (let t = 0; t < topoOrder.length; t++) {
    const actId = topoOrder[t];
    const act = activityMap.get(actId)!;
    const cal = getCalendar(act);
    const es = earlyStart.get(actId)!;
    const ef = earlyFinish.get(actId)!;
    const ls = lateStart.get(actId)!;
    const lf = lateFinish.get(actId)!;

    const totalFloat = workDaysBetween(es, ls, cal);

    // Free float
    let freeFloat = totalFloat;
    const succs = successorsMap.get(actId) || [];
    if (succs.length > 0) {
      let minSlack = Infinity;
      for (let s = 0; s < succs.length; s++) {
        const rel = succs[s];
        const succES = earlyStart.get(rel.successorId)!;
        const relCal = getRelCalendar(rel.successorId);
        let gap: number;

        switch (rel.relationshipType) {
          case "FS":
            gap = workDaysBetween(ef, succES, relCal) - rel.lagDays;
            break;
          case "SS":
            gap = workDaysBetween(es, succES, relCal) - rel.lagDays;
            break;
          case "FF":
            gap = workDaysBetween(ef, earlyFinish.get(rel.successorId)!, relCal) - rel.lagDays;
            break;
          case "SF":
            gap = workDaysBetween(es, earlyFinish.get(rel.successorId)!, relCal) - rel.lagDays;
            break;
        }

        if (gap < minSlack) minSlack = gap;
      }
      freeFloat = Math.max(0, minSlack);
    }

    const isCritical = Math.abs(totalFloat) < 0.5;

    if (isCritical) {
      criticalPath.push(actId);
    }

    results.set(actId, {
      id: actId,
      earlyStart: es,
      earlyFinish: ef,
      lateStart: ls,
      lateFinish: lf,
      totalFloat,
      freeFloat,
      isCritical,
      isOnLongestPath: false, // will be set below
    });
  }

  // ─── Longest Path Calculation ──────────────────────────────────────────
  // The longest path traces backward from the activity with the latest early finish,
  // following the driving predecessor (the one that actually determines the early start)
  // at each step. This differs from critical path when multiple paths have zero float.
  const longestPath: number[] = [];
  const longestPathSet = new Set<number>();

  // Build a "distance from project start" map using early finish dates
  // Find the terminal activity (latest early finish)
  let terminalActId = -1;
  let latestEF = new Date(0);
  const resultEntries = Array.from(results.entries());
  for (let i = 0; i < resultEntries.length; i++) {
    const [actId, result] = resultEntries[i];
    if (result.earlyFinish >= latestEF) {
      latestEF = result.earlyFinish;
      terminalActId = actId;
    }
  }

  if (terminalActId >= 0) {
    // Trace backward from terminal, always following the driving predecessor
    // (the predecessor whose constraint date equals this activity's early start)
    const visited = new Set<number>();
    const stack = [terminalActId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (visited.has(current)) continue;
      visited.add(current);
      longestPathSet.add(current);
      longestPath.push(current);

      const preds = predecessors.get(current) || [];
      if (preds.length === 0) continue;

      // Find the driving predecessor: the one whose constraint pushed ES the latest
      let drivingPredId = -1;
      let drivingDate = new Date(0);
      for (const rel of preds) {
        const predES = earlyStart.get(rel.predecessorId);
        const predEF = earlyFinish.get(rel.predecessorId);
        if (!predES || !predEF) continue;
        const relCal = getRelCalendar(rel.successorId);
        const predAct = activityMap.get(rel.predecessorId);
        if (!predAct) continue;
        const predCal = getCalendar(predAct);
        let constraintDate: Date;
        switch (rel.relationshipType) {
          case "FS":
            constraintDate = addWorkDays(predEF, rel.lagDays, relCal);
            break;
          case "SS":
            constraintDate = addWorkDays(predES, rel.lagDays, relCal);
            break;
          case "FF":
            constraintDate = addWorkDays(
              addWorkDays(predEF, rel.lagDays, relCal),
              -(activityMap.get(current)?.duration || 0),
              predCal,
            );
            break;
          case "SF":
            constraintDate = addWorkDays(
              addWorkDays(predES, rel.lagDays, relCal),
              -(activityMap.get(current)?.duration || 0),
              predCal,
            );
            break;
        }
        if (constraintDate >= drivingDate) {
          drivingDate = constraintDate;
          drivingPredId = rel.predecessorId;
        }
      }
      if (drivingPredId >= 0) {
        stack.push(drivingPredId);
      }
    }

    // Mark activities on the longest path
    const lpArr = Array.from(longestPathSet);
    for (let i = 0; i < lpArr.length; i++) {
      const r = results.get(lpArr[i]);
      if (r) r.isOnLongestPath = true;
    }
  }

  // Reverse longest path so it goes from start to finish
  longestPath.reverse();

  return {
    results,
    projectFinish,
    criticalPath,
    longestPath,
  };
}

// ─── Utility: Generate next activity ID ──────────────────────────────────────

/**
 * Generate the next Activity ID for a schedule based on its ID settings.
 * For example: prefix="E", nextNumber=100, interval=5 → "E100", then next is 105
 */
export function generateNextActivityId(
  prefix: string,
  nextNumber: number,
  interval: number
): string {
  return `${prefix}${nextNumber}`;
}

/**
 * Legacy function: generate Activity ID from existing IDs (for backward compatibility)
 * Kept for templates and other legacy code paths
 */
export function generateNextActivityIdFromExisting(existingIds: string[]): string {
  if (existingIds.length === 0) return "A1010";

  const numbers = existingIds
    .filter((id) => /^A\d+$/.test(id))
    .map((id) => parseInt(id.slice(1), 10))
    .filter((n) => !isNaN(n));

  if (numbers.length === 0) return "A1010";

  const max = Math.max(...numbers);
  const next = Math.ceil((max + 1) / 10) * 10;
  return `A${next}`;
}
