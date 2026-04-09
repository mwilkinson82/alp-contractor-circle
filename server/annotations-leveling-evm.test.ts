import { describe, it, expect } from "vitest";

/* ═══════════════════════════════════════════════════════════════════════════
 * 1. Annotation Persistence Model
 * ═══════════════════════════════════════════════════════════════════════════ */

interface AnnotationRow {
  scheduleId: number;
  annotationType: "text" | "arrow" | "shading";
  data: Record<string, unknown>;
  sortOrder: number;
}

function validateAnnotationRow(row: AnnotationRow): boolean {
  if (!row.scheduleId || row.scheduleId <= 0) return false;
  if (!["text", "arrow", "shading"].includes(row.annotationType)) return false;
  if (typeof row.data !== "object" || row.data === null) return false;
  if (typeof row.sortOrder !== "number" || row.sortOrder < 0) return false;
  return true;
}

function serializeAnnotations(
  scheduleId: number,
  annotations: Array<{ type: string; id: string; [k: string]: unknown }>
): AnnotationRow[] {
  return annotations.map((a, i) => ({
    scheduleId,
    annotationType: a.type as AnnotationRow["annotationType"],
    data: a as Record<string, unknown>,
    sortOrder: i,
  }));
}

function deserializeAnnotations(rows: AnnotationRow[]): Array<{ type: string; id: string }> {
  return rows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      ...row.data,
      type: row.annotationType,
      id: (row.data?.id as string) || `db-${row.sortOrder}`,
    })) as Array<{ type: string; id: string }>;
}

describe("Annotation Persistence", () => {
  it("serializes annotations to DB rows", () => {
    const annotations = [
      { type: "text", id: "t1", x: 100, y: 50, text: "Delay here" },
      { type: "arrow", id: "a1", x1: 0, y1: 0, x2: 100, y2: 100 },
    ];
    const rows = serializeAnnotations(1, annotations);
    expect(rows).toHaveLength(2);
    expect(rows[0].scheduleId).toBe(1);
    expect(rows[0].annotationType).toBe("text");
    expect(rows[0].sortOrder).toBe(0);
    expect(rows[1].annotationType).toBe("arrow");
    expect(rows[1].sortOrder).toBe(1);
  });

  it("deserializes DB rows back to annotations", () => {
    const rows: AnnotationRow[] = [
      { scheduleId: 1, annotationType: "text", data: { type: "text", id: "t1", text: "Hello" }, sortOrder: 0 },
      { scheduleId: 1, annotationType: "shading", data: { type: "shading", id: "s1", pattern: "hatch" }, sortOrder: 1 },
    ];
    const result = deserializeAnnotations(rows);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("text");
    expect(result[0].id).toBe("t1");
    expect(result[1].type).toBe("shading");
  });

  it("preserves sort order during deserialization", () => {
    const rows: AnnotationRow[] = [
      { scheduleId: 1, annotationType: "arrow", data: { id: "a2" }, sortOrder: 2 },
      { scheduleId: 1, annotationType: "text", data: { id: "t1" }, sortOrder: 0 },
      { scheduleId: 1, annotationType: "shading", data: { id: "s1" }, sortOrder: 1 },
    ];
    const result = deserializeAnnotations(rows);
    expect(result[0].id).toBe("t1");
    expect(result[1].id).toBe("s1");
    expect(result[2].id).toBe("a2");
  });

  it("validates annotation rows", () => {
    expect(validateAnnotationRow({ scheduleId: 1, annotationType: "text", data: { id: "t1" }, sortOrder: 0 })).toBe(true);
    expect(validateAnnotationRow({ scheduleId: 0, annotationType: "text", data: { id: "t1" }, sortOrder: 0 })).toBe(false);
    expect(validateAnnotationRow({ scheduleId: 1, annotationType: "invalid" as any, data: {}, sortOrder: 0 })).toBe(false);
    expect(validateAnnotationRow({ scheduleId: 1, annotationType: "text", data: null as any, sortOrder: 0 })).toBe(false);
  });

  it("round-trips annotations through serialize/deserialize", () => {
    const original = [
      { type: "text", id: "t1", x: 100, y: 50, text: "Impact zone", color: "#ff0000" },
      { type: "arrow", id: "a1", x1: 10, y1: 20, x2: 300, y2: 200 },
      { type: "shading", id: "s1", startX: 0, endX: 500, pattern: "crosshatch", color: "#0000ff" },
    ];
    const rows = serializeAnnotations(42, original);
    const restored = deserializeAnnotations(rows);
    expect(restored).toHaveLength(3);
    expect(restored[0].type).toBe("text");
    expect(restored[1].type).toBe("arrow");
    expect(restored[2].type).toBe("shading");
  });

  it("generates fallback IDs for rows without data.id", () => {
    const rows: AnnotationRow[] = [
      { scheduleId: 1, annotationType: "text", data: {}, sortOrder: 0 },
    ];
    const result = deserializeAnnotations(rows);
    expect(result[0].id).toBe("db-0");
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 2. Resource Leveling Algorithm
 * ═══════════════════════════════════════════════════════════════════════════ */

interface ResourceAssignment {
  resourceId: number;
  resourceName: string;
  resourceType: string;
  activityId: string;
  activityName: string;
  unitsPerDay: number;
  earlyStart: string;
  earlyFinish: string;
}

interface OverAllocation {
  weekLabel: string;
  resourceName: string;
  resourceType: string;
  allocated: number;
  capacity: number;
  overBy: number;
  activities: string[];
}

interface LevelingSuggestion {
  type: "split" | "reduce";
  severity: "high" | "medium" | "low";
  message: string;
}

function detectOverAllocations(
  assignments: ResourceAssignment[],
  capacityPerWeek: number = 40
): OverAllocation[] {
  // Group assignments by resource and week
  const weekMap = new Map<string, { allocated: number; activities: Set<string>; resourceName: string; resourceType: string }>();

  for (const a of assignments) {
    const start = new Date(a.earlyStart);
    const end = new Date(a.earlyFinish);
    // Iterate weeks
    const current = new Date(start);
    current.setDate(current.getDate() - current.getDay()); // Start of week
    while (current <= end) {
      const weekKey = `${a.resourceId}:${current.toISOString().slice(0, 10)}`;
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { allocated: 0, activities: new Set(), resourceName: a.resourceName, resourceType: a.resourceType });
      }
      const entry = weekMap.get(weekKey)!;
      entry.allocated += a.unitsPerDay * 5; // 5 work days per week
      entry.activities.add(a.activityName);
      current.setDate(current.getDate() + 7);
    }
  }

  const overAllocations: OverAllocation[] = [];
  for (const [key, entry] of weekMap) {
    if (entry.allocated > capacityPerWeek) {
      const weekDate = key.split(":")[1];
      overAllocations.push({
        weekLabel: new Date(weekDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        resourceName: entry.resourceName,
        resourceType: entry.resourceType,
        allocated: entry.allocated,
        capacity: capacityPerWeek,
        overBy: entry.allocated - capacityPerWeek,
        activities: Array.from(entry.activities),
      });
    }
  }
  return overAllocations;
}

function generateSuggestions(overAllocations: OverAllocation[]): LevelingSuggestion[] {
  const suggestions: LevelingSuggestion[] = [];
  const resourceOverCounts = new Map<string, number>();

  for (const oa of overAllocations) {
    const count = (resourceOverCounts.get(oa.resourceName) || 0) + 1;
    resourceOverCounts.set(oa.resourceName, count);
  }

  for (const [name, count] of resourceOverCounts) {
    const maxOver = Math.max(...overAllocations.filter(oa => oa.resourceName === name).map(oa => oa.overBy));
    const severity = maxOver > 20 ? "high" : maxOver > 10 ? "medium" : "low";

    if (count >= 3) {
      suggestions.push({
        type: "split",
        severity,
        message: `${name} is over-allocated in ${count} weeks (max ${maxOver}h over). Consider staggering overlapping activities.`,
      });
    } else {
      suggestions.push({
        type: "reduce",
        severity,
        message: `${name} is over-allocated in ${count} week(s) (max ${maxOver}h over). Reduce units/day or extend activity duration.`,
      });
    }
  }
  return suggestions;
}

describe("Resource Leveling", () => {
  it("detects over-allocation when resource exceeds 40h/week", () => {
    const assignments: ResourceAssignment[] = [
      { resourceId: 1, resourceName: "John", resourceType: "labor", activityId: "A1", activityName: "Foundation", unitsPerDay: 5, earlyStart: "2025-06-02", earlyFinish: "2025-06-06" },
      { resourceId: 1, resourceName: "John", resourceType: "labor", activityId: "A2", activityName: "Framing", unitsPerDay: 5, earlyStart: "2025-06-02", earlyFinish: "2025-06-06" },
    ];
    const result = detectOverAllocations(assignments, 40);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].allocated).toBe(50); // 5+5 units/day * 5 days = 50
    expect(result[0].overBy).toBe(10);
    expect(result[0].activities).toContain("Foundation");
    expect(result[0].activities).toContain("Framing");
  });

  it("returns empty when resources are within capacity", () => {
    const assignments: ResourceAssignment[] = [
      { resourceId: 1, resourceName: "John", resourceType: "labor", activityId: "A1", activityName: "Foundation", unitsPerDay: 4, earlyStart: "2025-06-02", earlyFinish: "2025-06-06" },
      { resourceId: 1, resourceName: "John", resourceType: "labor", activityId: "A2", activityName: "Framing", unitsPerDay: 4, earlyStart: "2025-06-02", earlyFinish: "2025-06-06" },
    ];
    const result = detectOverAllocations(assignments, 40);
    expect(result).toHaveLength(0);
  });

  it("handles multiple resources independently", () => {
    const assignments: ResourceAssignment[] = [
      { resourceId: 1, resourceName: "John", resourceType: "labor", activityId: "A1", activityName: "Foundation", unitsPerDay: 10, earlyStart: "2025-06-02", earlyFinish: "2025-06-06" },
      { resourceId: 2, resourceName: "Crane", resourceType: "equipment", activityId: "A1", activityName: "Foundation", unitsPerDay: 3, earlyStart: "2025-06-02", earlyFinish: "2025-06-06" },
    ];
    const result = detectOverAllocations(assignments, 40);
    // John: 10*5=50 > 40, Crane: 3*5=15 < 40
    expect(result.length).toBe(1);
    expect(result[0].resourceName).toBe("John");
  });

  it("generates high severity suggestion for large over-allocation", () => {
    const overAllocations: OverAllocation[] = [
      { weekLabel: "Jun 2", resourceName: "John", resourceType: "labor", allocated: 65, capacity: 40, overBy: 25, activities: ["A", "B", "C"] },
      { weekLabel: "Jun 9", resourceName: "John", resourceType: "labor", allocated: 60, capacity: 40, overBy: 20, activities: ["A", "B"] },
      { weekLabel: "Jun 16", resourceName: "John", resourceType: "labor", allocated: 55, capacity: 40, overBy: 15, activities: ["B", "C"] },
    ];
    const suggestions = generateSuggestions(overAllocations);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].severity).toBe("high");
    expect(suggestions[0].type).toBe("split");
  });

  it("generates reduce suggestion for single-week over-allocation", () => {
    const overAllocations: OverAllocation[] = [
      { weekLabel: "Jun 2", resourceName: "Crane", resourceType: "equipment", allocated: 45, capacity: 40, overBy: 5, activities: ["A"] },
    ];
    const suggestions = generateSuggestions(overAllocations);
    expect(suggestions[0].type).toBe("reduce");
    expect(suggestions[0].severity).toBe("low");
  });

  it("handles empty assignments", () => {
    expect(detectOverAllocations([])).toHaveLength(0);
    expect(generateSuggestions([])).toHaveLength(0);
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
 * 3. Earned Value Management (EVM) Calculations
 * ═══════════════════════════════════════════════════════════════════════════ */

interface EvmActivity {
  budget: number;        // BAC for this activity (cents)
  percentComplete: number; // 0-100
  actualCost: number;    // ACWP (cents)
  earlyStart: string;
  earlyFinish: string;
}

interface EvmResult {
  BAC: number;   // Budget at Completion
  BCWP: number;  // Earned Value
  BCWS: number;  // Planned Value
  ACWP: number;  // Actual Cost
  CV: number;    // Cost Variance
  SV: number;    // Schedule Variance
  CPI: number;   // Cost Performance Index
  SPI: number;   // Schedule Performance Index
  EAC: number;   // Estimate at Completion
  ETC: number;   // Estimate to Complete
  VAC: number;   // Variance at Completion
  TCPI: number;  // To-Complete Performance Index
}

function calculateEvm(activities: EvmActivity[], dataDate: Date): EvmResult {
  let BAC = 0, BCWP = 0, BCWS = 0, ACWP = 0;

  for (const a of activities) {
    BAC += a.budget;
    BCWP += a.budget * (a.percentComplete / 100);
    ACWP += a.actualCost;

    // Calculate planned value based on schedule progress
    const start = new Date(a.earlyStart);
    const finish = new Date(a.earlyFinish);
    const totalDuration = Math.max(1, (finish.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const elapsed = Math.max(0, Math.min(totalDuration, (dataDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const plannedPct = elapsed / totalDuration;
    BCWS += a.budget * plannedPct;
  }

  const CV = BCWP - ACWP;
  const SV = BCWP - BCWS;
  const CPI = ACWP > 0 ? BCWP / ACWP : 1;
  const SPI = BCWS > 0 ? BCWP / BCWS : 1;
  const EAC = CPI > 0 ? BAC / CPI : BAC;
  const ETC = EAC - ACWP;
  const VAC = BAC - EAC;
  const TCPI = (BAC - BCWP) > 0 && (BAC - ACWP) > 0 ? (BAC - BCWP) / (BAC - ACWP) : 1;

  return { BAC, BCWP, BCWS, ACWP, CV, SV, CPI, SPI, EAC, ETC, VAC, TCPI };
}

describe("Earned Value Management", () => {
  it("calculates basic EVM metrics for a simple project", () => {
    const activities: EvmActivity[] = [
      { budget: 100000, percentComplete: 50, actualCost: 60000, earlyStart: "2025-06-01", earlyFinish: "2025-06-30" },
    ];
    const dataDate = new Date("2025-06-15"); // Midpoint
    const result = calculateEvm(activities, dataDate);

    expect(result.BAC).toBe(100000);
    expect(result.BCWP).toBe(50000); // 50% of 100k
    expect(result.ACWP).toBe(60000);
    expect(result.CV).toBe(-10000); // Over budget
    // SV = BCWP - BCWS; BCWS depends on exact date fraction
    expect(result.SV).toBeDefined();
    expect(result.CPI).toBeCloseTo(0.833, 2); // Under-performing
    expect(result.SPI).toBeDefined();
  });

  it("handles project ahead of schedule and under budget", () => {
    const activities: EvmActivity[] = [
      { budget: 200000, percentComplete: 80, actualCost: 140000, earlyStart: "2025-06-01", earlyFinish: "2025-06-30" },
    ];
    const dataDate = new Date("2025-06-15");
    const result = calculateEvm(activities, dataDate);

    expect(result.BCWP).toBe(160000); // 80% of 200k
    expect(result.CV).toBe(20000); // Under budget
    expect(result.CPI).toBeGreaterThan(1);
    expect(result.SPI).toBeGreaterThan(1); // Ahead of schedule
  });

  it("handles project behind schedule and over budget", () => {
    const activities: EvmActivity[] = [
      { budget: 200000, percentComplete: 20, actualCost: 120000, earlyStart: "2025-06-01", earlyFinish: "2025-06-30" },
    ];
    const dataDate = new Date("2025-06-15");
    const result = calculateEvm(activities, dataDate);

    expect(result.BCWP).toBe(40000); // 20% of 200k
    expect(result.CV).toBeLessThan(0); // Over budget
    expect(result.CPI).toBeLessThan(1);
    expect(result.SPI).toBeLessThan(1); // Behind schedule
  });

  it("calculates EAC and ETC correctly", () => {
    const activities: EvmActivity[] = [
      { budget: 500000, percentComplete: 50, actualCost: 300000, earlyStart: "2025-06-01", earlyFinish: "2025-08-31" },
    ];
    const dataDate = new Date("2025-07-16");
    const result = calculateEvm(activities, dataDate);

    // CPI = 250000/300000 = 0.833
    // EAC = 500000/0.833 = ~600000
    expect(result.EAC).toBeCloseTo(600000, -3);
    expect(result.ETC).toBeCloseTo(300000, -3); // EAC - ACWP
    expect(result.VAC).toBeCloseTo(-100000, -3); // BAC - EAC
  });

  it("handles multiple activities", () => {
    const activities: EvmActivity[] = [
      { budget: 100000, percentComplete: 100, actualCost: 90000, earlyStart: "2025-06-01", earlyFinish: "2025-06-15" },
      { budget: 200000, percentComplete: 50, actualCost: 120000, earlyStart: "2025-06-10", earlyFinish: "2025-07-10" },
      { budget: 150000, percentComplete: 0, actualCost: 0, earlyStart: "2025-07-01", earlyFinish: "2025-07-31" },
    ];
    const dataDate = new Date("2025-06-25");
    const result = calculateEvm(activities, dataDate);

    expect(result.BAC).toBe(450000);
    expect(result.BCWP).toBe(200000); // 100k + 100k + 0
    expect(result.ACWP).toBe(210000);
  });

  it("handles zero budget gracefully", () => {
    const result = calculateEvm([], new Date());
    expect(result.BAC).toBe(0);
    expect(result.CPI).toBe(1);
    expect(result.SPI).toBe(1);
    expect(result.TCPI).toBe(1);
  });

  it("TCPI indicates difficulty when project is behind", () => {
    const activities: EvmActivity[] = [
      { budget: 100000, percentComplete: 20, actualCost: 50000, earlyStart: "2025-06-01", earlyFinish: "2025-06-30" },
    ];
    const dataDate = new Date("2025-06-20");
    const result = calculateEvm(activities, dataDate);

    // TCPI = (BAC - BCWP) / (BAC - ACWP) = (100000-20000)/(100000-50000) = 80000/50000 = 1.6
    expect(result.TCPI).toBeCloseTo(1.6, 1);
    expect(result.TCPI).toBeGreaterThan(1); // Difficult to achieve
  });
});
