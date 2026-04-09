/**
 * CPM Engine Tests
 *
 * Tests the core scheduling algorithm: forward/backward pass, float calculation,
 * critical path identification, calendar support, relationship types, and utilities.
 */
import { describe, it, expect } from "vitest";
import {
  calculateCPM,
  createDefaultCalendar,
  addWorkDays,
  workDaysBetween,
  isWorkDay,
  getUSConstructionHolidays,
  generateNextActivityId,
  generateNextActivityIdFromExisting,
  DAY_BITS,
  PRESET_MASKS,
  type CpmActivity,
  type CpmRelationship,
  type CpmCalendar,
} from "../shared/cpmEngine";

// ─── Timezone-safe date helper ───────────────────────────────────────────────
// new Date("2026-03-30") parses as UTC midnight, which can shift to previous day
// in local timezone. Use this helper to create dates in local time.
function localDate(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d); // month is 0-indexed
}

// ─── Helper: create calendars ────────────────────────────────────────────────
function make5DayCal(id = 0): CpmCalendar {
  return createDefaultCalendar();
}

function make7DayCal(id = 1): CpmCalendar {
  return {
    id,
    name: "7-Day",
    workDaysMask: PRESET_MASKS["7day"],
    holidays: new Set(),
    workdayOverrides: new Set(),
  };
}

function makeCalendars(...cals: CpmCalendar[]): Map<number, CpmCalendar> {
  const map = new Map<number, CpmCalendar>();
  for (const c of cals) map.set(c.id, c);
  return map;
}

// ─── Calendar Helpers ────────────────────────────────────────────────────────

describe("Calendar Helpers", () => {
  it("isWorkDay returns true for Mon-Fri on 5-day calendar", () => {
    const cal = make5DayCal();
    // 2026-03-30 is a Monday
    const mon = localDate(2026, 3, 30);
    expect(mon.getDay()).toBe(1); // sanity check: Monday
    expect(isWorkDay(mon, cal)).toBe(true);

    // Tuesday
    expect(isWorkDay(localDate(2026, 3, 31), cal)).toBe(true);

    // Saturday
    const sat = localDate(2026, 4, 4);
    expect(sat.getDay()).toBe(6); // sanity check: Saturday
    expect(isWorkDay(sat, cal)).toBe(false);

    // Sunday
    const sun = localDate(2026, 4, 5);
    expect(sun.getDay()).toBe(0); // sanity check: Sunday
    expect(isWorkDay(sun, cal)).toBe(false);
  });

  it("isWorkDay returns true for all days on 7-day calendar", () => {
    const cal = make7DayCal();
    expect(isWorkDay(localDate(2026, 4, 4), cal)).toBe(true); // Saturday
    expect(isWorkDay(localDate(2026, 4, 5), cal)).toBe(true); // Sunday
  });

  it("holidays override work days", () => {
    const mon = localDate(2026, 3, 30);
    const cal: CpmCalendar = {
      ...make5DayCal(),
      holidays: new Set(["2026-03-30"]),
    };
    expect(isWorkDay(mon, cal)).toBe(false);
  });

  it("workday overrides override non-work days", () => {
    const sat = localDate(2026, 4, 4);
    const cal: CpmCalendar = {
      ...make5DayCal(),
      workdayOverrides: new Set(["2026-04-04"]),
    };
    expect(isWorkDay(sat, cal)).toBe(true);
  });

  it("workday override takes precedence over holiday on same date", () => {
    const cal: CpmCalendar = {
      ...make5DayCal(),
      holidays: new Set(["2026-04-04"]),
      workdayOverrides: new Set(["2026-04-04"]),
    };
    expect(isWorkDay(localDate(2026, 4, 4), cal)).toBe(true);
  });

  it("addWorkDays skips weekends on 5-day calendar", () => {
    const cal = make5DayCal();
    // Start Friday Apr 3, add 1 work day → Monday Apr 6
    const fri = localDate(2026, 4, 3);
    expect(fri.getDay()).toBe(5); // sanity: Friday
    const result = addWorkDays(fri, 1, cal);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(6);
  });

  it("addWorkDays counts all days on 7-day calendar", () => {
    const cal = make7DayCal();
    // Start Friday Apr 3, add 1 work day → Saturday Apr 4
    const fri = localDate(2026, 4, 3);
    const result = addWorkDays(fri, 1, cal);
    expect(result.getDate()).toBe(4);
  });

  it("addWorkDays with 0 returns same date", () => {
    const cal = make5DayCal();
    const start = localDate(2026, 4, 1);
    const result = addWorkDays(start, 0, cal);
    expect(result.getTime()).toBe(start.getTime());
  });

  it("addWorkDays skips holidays", () => {
    const cal: CpmCalendar = {
      ...make5DayCal(),
      holidays: new Set(["2026-04-06"]), // Monday is holiday
    };
    // Start Friday Apr 3, add 1 work day → skip Sat, Sun, Mon (holiday) → Tue Apr 7
    const fri = localDate(2026, 4, 3);
    const result = addWorkDays(fri, 1, cal);
    expect(result.getDate()).toBe(7);
    expect(result.getDay()).toBe(2); // Tuesday
  });

  it("addWorkDays negative goes backward", () => {
    const cal = make5DayCal();
    // Start Monday Apr 6, subtract 1 work day → Friday Apr 3
    const mon = localDate(2026, 4, 6);
    const result = addWorkDays(mon, -1, cal);
    expect(result.getDate()).toBe(3);
    expect(result.getDay()).toBe(5); // Friday
  });

  it("workDaysBetween calculates correct work days", () => {
    const cal = make5DayCal();
    // Monday to Friday = 4 work days (Tue, Wed, Thu, Fri)
    const count = workDaysBetween(localDate(2026, 3, 30), localDate(2026, 4, 3), cal);
    expect(count).toBe(4);
  });

  it("workDaysBetween returns 0 for same date", () => {
    const cal = make5DayCal();
    const count = workDaysBetween(localDate(2026, 3, 30), localDate(2026, 3, 30), cal);
    expect(count).toBe(0);
  });
});

// ─── US Construction Holidays ────────────────────────────────────────────────

describe("US Construction Holidays", () => {
  it("returns all standard holidays for a year", () => {
    const holidays = getUSConstructionHolidays(2026);
    expect(holidays.length).toBeGreaterThanOrEqual(12);

    const dates = holidays.map((h) => h.date);
    expect(dates).toContain("2026-01-01"); // New Year's
    expect(dates).toContain("2026-07-04"); // Independence Day
    expect(dates).toContain("2026-12-25"); // Christmas
  });

  it("Memorial Day is last Monday of May", () => {
    const holidays = getUSConstructionHolidays(2026);
    const memorial = holidays.find((h) => h.description === "Memorial Day");
    expect(memorial).toBeDefined();
    const d = localDate(
      parseInt(memorial!.date.slice(0, 4)),
      parseInt(memorial!.date.slice(5, 7)),
      parseInt(memorial!.date.slice(8, 10)),
    );
    expect(d.getDay()).toBe(1); // Monday
    expect(d.getMonth()).toBe(4); // May (0-indexed)
  });

  it("Thanksgiving is 4th Thursday of November", () => {
    const holidays = getUSConstructionHolidays(2026);
    const tg = holidays.find((h) => h.description === "Thanksgiving");
    expect(tg).toBeDefined();
    const d = localDate(
      parseInt(tg!.date.slice(0, 4)),
      parseInt(tg!.date.slice(5, 7)),
      parseInt(tg!.date.slice(8, 10)),
    );
    expect(d.getDay()).toBe(4); // Thursday
    expect(d.getMonth()).toBe(10); // November (0-indexed)
  });

  it("Labor Day is 1st Monday of September", () => {
    const holidays = getUSConstructionHolidays(2026);
    const labor = holidays.find((h) => h.description === "Labor Day");
    expect(labor).toBeDefined();
    const d = localDate(
      parseInt(labor!.date.slice(0, 4)),
      parseInt(labor!.date.slice(5, 7)),
      parseInt(labor!.date.slice(8, 10)),
    );
    expect(d.getDay()).toBe(1); // Monday
    expect(d.getMonth()).toBe(8); // September (0-indexed)
  });
});

// ─── Activity ID Generation ──────────────────────────────────────────────────

describe("generateNextActivityId", () => {
  it("generates ID with prefix and interval", () => {
    expect(generateNextActivityId("E", 100, 5)).toBe("E100");
  });

  it("works with different prefixes", () => {
    expect(generateNextActivityId("P", 1, 1)).toBe("P1");
  });

  it("handles large intervals", () => {
    expect(generateNextActivityId("A", 1000, 10)).toBe("A1000");
  });
});

describe("generateNextActivityIdFromExisting (legacy)", () => {
  it("returns A1010 for empty list", () => {
    expect(generateNextActivityIdFromExisting([])).toBe("A1010");
  });

  it("increments by 10 from max", () => {
    expect(generateNextActivityIdFromExisting(["A1010", "A1020"])).toBe("A1030");
  });

  it("handles non-standard IDs gracefully", () => {
    expect(generateNextActivityIdFromExisting(["A1010", "custom", "A1050"])).toBe("A1060");
  });

  it("returns A1010 when no valid IDs exist", () => {
    expect(generateNextActivityIdFromExisting(["custom", "xyz"])).toBe("A1010");
  });
});

// ─── CPM Calculation ─────────────────────────────────────────────────────────

describe("CPM Calculation", () => {
  const cal = make5DayCal();
  const calendars = makeCalendars(cal);

  it("handles empty activities", () => {
    const result = calculateCPM([], [], localDate(2026, 4, 6), calendars, 0);
    expect(result.results.size).toBe(0);
    expect(result.criticalPath).toEqual([]);
  });

  it("single activity — ES=LS, EF=LF, TF=0, critical", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Task A", duration: 5, sortOrder: 1 },
    ];
    const result = calculateCPM(activities, [], localDate(2026, 4, 6), calendars, 0);
    const r = result.results.get(1)!;

    expect(r.isCritical).toBe(true);
    expect(r.totalFloat).toBe(0);
    expect(r.earlyStart.getTime()).toBe(r.lateStart.getTime());
    expect(r.earlyFinish.getTime()).toBe(r.lateFinish.getTime());
  });

  it("two activities FS — sequential chain is critical", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Foundation", duration: 5, sortOrder: 1 },
      { id: 2, activityId: "A1020", name: "Framing", duration: 3, sortOrder: 2 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), calendars, 0);

    expect(result.results.get(1)!.isCritical).toBe(true);
    expect(result.results.get(2)!.isCritical).toBe(true);
    expect(result.criticalPath).toContain(1);
    expect(result.criticalPath).toContain(2);
  });

  it("parallel paths — shorter path has float, longer is critical", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Long Task", duration: 5, sortOrder: 1 },
      { id: 2, activityId: "A1020", name: "Short Task", duration: 2, sortOrder: 2 },
      { id: 3, activityId: "A1030", name: "Final Task", duration: 5, sortOrder: 3 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 3, relationshipType: "FS", lagDays: 0 },
      { id: 2, predecessorId: 2, successorId: 3, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), calendars, 0);

    expect(result.results.get(1)!.isCritical).toBe(true);
    expect(result.results.get(2)!.totalFloat).toBeGreaterThan(0);
    expect(result.results.get(2)!.isCritical).toBe(false);
    expect(result.results.get(3)!.isCritical).toBe(true);
  });

  it("FS with lag — successor starts after lag", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Pour Concrete", duration: 2, sortOrder: 1 },
      { id: 2, activityId: "A1020", name: "Strip Forms", duration: 1, sortOrder: 2 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 3 },
    ];
    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), calendars, 0);

    const r1 = result.results.get(1)!;
    const r2 = result.results.get(2)!;

    const gapDays = workDaysBetween(r1.earlyFinish, r2.earlyStart, cal);
    expect(gapDays).toBe(3);
  });

  it("SS relationship — successor starts relative to predecessor start", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Excavation", duration: 10, sortOrder: 1 },
      { id: 2, activityId: "A1020", name: "Shoring", duration: 8, sortOrder: 2 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 2, relationshipType: "SS", lagDays: 2 },
    ];
    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), calendars, 0);

    const r1 = result.results.get(1)!;
    const r2 = result.results.get(2)!;

    const gapDays = workDaysBetween(r1.earlyStart, r2.earlyStart, cal);
    expect(gapDays).toBe(2);
  });

  it("FF relationship — successor finish tied to predecessor finish", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "MEP Rough-In", duration: 10, sortOrder: 1 },
      { id: 2, activityId: "A1020", name: "Insulation", duration: 5, sortOrder: 2 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 2, relationshipType: "FF", lagDays: 0 },
    ];
    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), calendars, 0);

    const r1 = result.results.get(1)!;
    const r2 = result.results.get(2)!;

    expect(r2.earlyFinish.getTime()).toBeGreaterThanOrEqual(r1.earlyFinish.getTime());
  });

  it("zero-duration milestone", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Construction", duration: 5, sortOrder: 1 },
      { id: 2, activityId: "A1020", name: "Substantial Completion", duration: 0, sortOrder: 2 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), calendars, 0);

    const milestone = result.results.get(2)!;
    expect(milestone.earlyStart.getTime()).toBe(milestone.earlyFinish.getTime());
  });

  it("uses activity-specific calendar", () => {
    const cal5 = make5DayCal(0);
    const cal7 = make7DayCal(1);
    const cals = makeCalendars(cal5, cal7);

    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "5-Day Task", duration: 5, sortOrder: 1, calendarId: 0 },
      { id: 2, activityId: "A1020", name: "7-Day Task", duration: 5, sortOrder: 2, calendarId: 1 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];

    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), cals, 0);

    const r1 = result.results.get(1)!;
    const r2 = result.results.get(2)!;

    // Both are critical (sequential chain)
    expect(r1.isCritical).toBe(true);
    expect(r2.isCritical).toBe(true);
    expect(r2.earlyFinish.getTime()).toBeGreaterThan(r1.earlyFinish.getTime());
  });

  it("handles calendar with holidays correctly", () => {
    const cal: CpmCalendar = {
      id: 0,
      name: "With Holiday",
      workDaysMask: PRESET_MASKS["5day"],
      holidays: new Set(["2026-04-08"]), // Wednesday is holiday
      workdayOverrides: new Set(),
    };
    const cals = makeCalendars(cal);

    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Task", duration: 5, sortOrder: 1 },
    ];

    // Start Monday Apr 6. 5 work days: Mon(6), Tue(7), skip Wed(8 holiday), Thu(9), Fri(10), Mon(13)
    const result = calculateCPM(activities, [], localDate(2026, 4, 6), cals, 0);
    const r = result.results.get(1)!;

    // Should take 7 calendar days instead of 5 due to holiday + weekend
    const calDays = Math.round((r.earlyFinish.getTime() - r.earlyStart.getTime()) / (1000 * 60 * 60 * 24));
    expect(calDays).toBeGreaterThan(5);
  });

  it("complex network with multiple relationship types", () => {
    const activities: CpmActivity[] = [
      { id: 1, activityId: "A1010", name: "Mobilization", duration: 3, sortOrder: 1 },
      { id: 2, activityId: "A1020", name: "Excavation", duration: 5, sortOrder: 2 },
      { id: 3, activityId: "A1030", name: "Foundation", duration: 8, sortOrder: 3 },
      { id: 4, activityId: "A1040", name: "Backfill", duration: 2, sortOrder: 4 },
      { id: 5, activityId: "A1050", name: "Framing", duration: 10, sortOrder: 5 },
    ];
    const relationships: CpmRelationship[] = [
      { id: 1, predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
      { id: 2, predecessorId: 2, successorId: 3, relationshipType: "FS", lagDays: 0 },
      { id: 3, predecessorId: 3, successorId: 4, relationshipType: "SS", lagDays: 5 },
      { id: 4, predecessorId: 3, successorId: 5, relationshipType: "FS", lagDays: 0 },
      { id: 5, predecessorId: 4, successorId: 5, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, relationships, localDate(2026, 4, 6), calendars, 0);

    // All activities should have results
    expect(result.results.size).toBe(5);

    // Project should have a finish date after start
    expect(result.projectFinish.getTime()).toBeGreaterThan(localDate(2026, 4, 6).getTime());

    // Critical path should exist
    expect(result.criticalPath.length).toBeGreaterThan(0);

    // Every activity should have valid dates
    for (const [, r] of Array.from(result.results.entries())) {
      expect(r.earlyStart.getTime()).toBeLessThanOrEqual(r.earlyFinish.getTime());
      expect(r.lateStart.getTime()).toBeLessThanOrEqual(r.lateFinish.getTime());
      expect(r.totalFloat).toBeGreaterThanOrEqual(0);
      expect(r.freeFloat).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── DAY_BITS and PRESET_MASKS ───────────────────────────────────────────────

describe("Constants", () => {
  it("DAY_BITS covers all 7 days", () => {
    expect(Object.keys(DAY_BITS)).toHaveLength(7);
    const sum = Object.values(DAY_BITS).reduce((a, b) => a + b, 0);
    expect(sum).toBe(127);
  });

  it("PRESET_MASKS are correct", () => {
    expect(PRESET_MASKS["5day"]).toBe(31);
    expect(PRESET_MASKS["7day"]).toBe(127);
    expect(PRESET_MASKS["6day"]).toBe(63);
  });
});

// ─── Constraint Enforcement Tests ─────────────────────────────────────────────
describe("Constraint Enforcement", () => {
  const cal = createDefaultCalendar();
  const calendars = new Map<number, CpmCalendar>([[0, cal]]);

  it("SNET pushes early start forward when ES < constraint date", () => {
    // Activity A (5d) -> Activity B (3d, SNET 2026-04-13)
    // Without constraint, B would start right after A
    const startDate = localDate(2026, 4, 6); // Monday
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 5, calendarId: 0 },
      { id: 2, name: "B", duration: 3, calendarId: 0, constraintType: "SNET", constraintDate: localDate(2026, 4, 20) },
    ];
    const rels: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, rels, startDate, calendars, 0);
    const bResult = result.results.get(2)!;
    // B should start on Apr 20 (the SNET date) since that's later than the FS-driven date
    expect(bResult.earlyStart.getFullYear()).toBe(2026);
    expect(bResult.earlyStart.getMonth()).toBe(3); // April (0-indexed)
    expect(bResult.earlyStart.getDate()).toBe(20);
  });

  it("SNET does not push ES back when ES > constraint date", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 10, calendarId: 0 },
      { id: 2, name: "B", duration: 3, calendarId: 0, constraintType: "SNET", constraintDate: localDate(2026, 4, 7) },
    ];
    const rels: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, rels, startDate, calendars, 0);
    const bResult = result.results.get(2)!;
    // A finishes after Apr 7, so B should start after A, not on Apr 7
    expect(bResult.earlyStart > localDate(2026, 4, 7)).toBe(true);
  });

  it("SNLT caps late finish in backward pass", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 3, calendarId: 0, constraintType: "SNLT", constraintDate: localDate(2026, 4, 8) },
      { id: 2, name: "B", duration: 5, calendarId: 0 },
    ];
    const rels: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, rels, startDate, calendars, 0);
    const aResult = result.results.get(1)!;
    // SNLT should cap the late start at or before Apr 8
    expect(aResult.lateStart <= localDate(2026, 4, 8)).toBe(true);
  });

  it("FNET pushes early start to satisfy finish constraint", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 3, calendarId: 0, constraintType: "FNET", constraintDate: localDate(2026, 4, 20) },
    ];
    const result = calculateCPM(activities, [], startDate, calendars, 0);
    const aResult = result.results.get(1)!;
    // EF should be >= Apr 20 since FNET says finish no earlier than Apr 20
    expect(aResult.earlyFinish >= localDate(2026, 4, 20)).toBe(true);
  });

  it("FNLT caps late finish in backward pass", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 3, calendarId: 0, constraintType: "FNLT", constraintDate: localDate(2026, 4, 10) },
      { id: 2, name: "B", duration: 5, calendarId: 0 },
    ];
    const rels: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, rels, startDate, calendars, 0);
    const aResult = result.results.get(1)!;
    // FNLT should cap late finish at Apr 10
    expect(aResult.lateFinish <= localDate(2026, 4, 10)).toBe(true);
  });

  it("MSO forces exact start date (hard constraint)", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 5, calendarId: 0 },
      { id: 2, name: "B", duration: 3, calendarId: 0, constraintType: "MSO", constraintDate: localDate(2026, 4, 20) },
    ];
    const rels: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, rels, startDate, calendars, 0);
    const bResult = result.results.get(2)!;
    // MSO forces ES to Apr 20 regardless of predecessor
    expect(bResult.earlyStart.getDate()).toBe(20);
    expect(bResult.earlyStart.getMonth()).toBe(3); // April
    // LS should also be Apr 20 (hard constraint)
    expect(bResult.lateStart.getDate()).toBe(20);
  });

  it("MFO forces exact finish date (hard constraint)", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 3, calendarId: 0, constraintType: "MFO", constraintDate: localDate(2026, 4, 10) },
    ];
    const result = calculateCPM(activities, [], startDate, calendars, 0);
    const aResult = result.results.get(1)!;
    // MFO forces EF to Apr 10
    expect(aResult.earlyFinish.getDate()).toBe(10);
    expect(aResult.earlyFinish.getMonth()).toBe(3); // April
    // LF should also be Apr 10
    expect(aResult.lateFinish.getDate()).toBe(10);
  });

  it("ASAP (default) does not alter scheduling", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 5, calendarId: 0, constraintType: "ASAP" },
    ];
    const result = calculateCPM(activities, [], startDate, calendars, 0);
    const aResult = result.results.get(1)!;
    // Should start on the project start date
    expect(aResult.earlyStart.getDate()).toBe(6);
  });

  it("ALAP does not alter forward pass", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 3, calendarId: 0, constraintType: "ALAP" },
      { id: 2, name: "B", duration: 5, calendarId: 0 },
    ];
    const rels: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
    ];
    const result = calculateCPM(activities, rels, startDate, calendars, 0);
    const aResult = result.results.get(1)!;
    // Forward pass: ES should still be project start
    expect(aResult.earlyStart.getDate()).toBe(6);
  });

  it("constraint with no constraintDate is treated as ASAP", () => {
    const startDate = localDate(2026, 4, 6);
    const activities: CpmActivity[] = [
      { id: 1, name: "A", duration: 5, calendarId: 0, constraintType: "SNET" },
    ];
    const result = calculateCPM(activities, [], startDate, calendars, 0);
    const aResult = result.results.get(1)!;
    // Without a date, SNET should not change anything
    expect(aResult.earlyStart.getDate()).toBe(6);
  });
});

// ─── CSI Divisions Tests ──────────────────────────────────────────────────────
import { CSI_DIVISIONS, CSI_ACTIVE_DIVISIONS, WBS_GROUP_COLORS } from "../shared/csiDivisions";

describe("CSI MasterFormat Library", () => {
  it("has all 50 divisions (00-49)", () => {
    expect(CSI_DIVISIONS.length).toBe(50);
  });

  it("each division has required fields", () => {
    for (const div of CSI_DIVISIONS) {
      expect(div.code).toBeTruthy();
      expect(div.name).toBeTruthy();
      expect(div.fullName).toBeTruthy();
      expect(div.group).toBeTruthy();
    }
  });

  it("active divisions exclude reserved ones", () => {
    const reservedCodes = CSI_DIVISIONS.filter(d => d.reserved).map(d => d.code);
    for (const code of reservedCodes) {
      expect(CSI_ACTIVE_DIVISIONS.find(d => d.code === code)).toBeUndefined();
    }
  });

  it("WBS_GROUP_COLORS has entries for all groups", () => {
    const groups = new Set(CSI_DIVISIONS.map(d => d.group));
    for (const group of groups) {
      expect(WBS_GROUP_COLORS[group]).toBeDefined();
      expect(WBS_GROUP_COLORS[group].bg).toBeTruthy();
      expect(WBS_GROUP_COLORS[group].text).toBeTruthy();
      expect(WBS_GROUP_COLORS[group].border).toBeTruthy();
    }
  });

  it("division codes are unique", () => {
    const codes = CSI_DIVISIONS.map(d => d.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
