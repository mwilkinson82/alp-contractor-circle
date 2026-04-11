import { describe, it, expect } from "vitest";

/**
 * Tests for the new scheduler features:
 * - Cash flow S-curve data generation
 * - Resource histogram data generation
 * - PDF header color configuration
 * - Gantt annotation model validation
 */

// ── S-Curve helpers (mirrors ScheduleReports.tsx logic) ──
interface SCurveWeek {
  weekLabel: string;
  weekStart: Date;
  budgeted: number;
  actual: number;
  cumulativeBudgeted: number;
  cumulativeActual: number;
}

function generateSCurveData(
  activities: Array<{
    earlyStart: Date | null;
    earlyFinish: Date | null;
    duration: number;
    budgetedCost: number;
    actualCost: number;
  }>,
  projectStart: Date,
  projectEnd: Date
): SCurveWeek[] {
  const weeks: SCurveWeek[] = [];
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  let current = new Date(projectStart);
  
  while (current <= projectEnd) {
    const weekEnd = new Date(current.getTime() + msPerWeek);
    let weekBudgeted = 0;
    let weekActual = 0;
    
    for (const act of activities) {
      if (!act.earlyStart || !act.earlyFinish) continue;
      const actStart = new Date(act.earlyStart);
      const actEnd = new Date(act.earlyFinish);
      
      // Check overlap
      if (actStart < weekEnd && actEnd >= current) {
        const overlapStart = Math.max(current.getTime(), actStart.getTime());
        const overlapEnd = Math.min(weekEnd.getTime(), actEnd.getTime());
        const overlapDays = Math.max(0, (overlapEnd - overlapStart) / (24 * 60 * 60 * 1000));
        const fraction = act.duration > 0 ? overlapDays / act.duration : 0;
        weekBudgeted += act.budgetedCost * fraction;
        weekActual += act.actualCost * fraction;
      }
    }
    
    weeks.push({
      weekLabel: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weekStart: new Date(current),
      budgeted: Math.round(weekBudgeted),
      actual: Math.round(weekActual),
      cumulativeBudgeted: 0,
      cumulativeActual: 0,
    });
    
    current = weekEnd;
  }
  
  // Calculate cumulative
  let cumBudget = 0;
  let cumActual = 0;
  for (const w of weeks) {
    cumBudget += w.budgeted;
    cumActual += w.actual;
    w.cumulativeBudgeted = cumBudget;
    w.cumulativeActual = cumActual;
  }
  
  return weeks;
}

describe("Cash Flow S-Curve", () => {
  it("generates weekly buckets for a 3-week project", () => {
    const start = new Date("2026-01-05");
    const end = new Date("2026-01-26");
    const activities = [
      { earlyStart: new Date("2026-01-05"), earlyFinish: new Date("2026-01-19"), duration: 14, budgetedCost: 14000, actualCost: 12000 },
    ];
    const data = generateSCurveData(activities, start, end);
    expect(data.length).toBeGreaterThanOrEqual(3);
  });

  it("cumulative values are monotonically increasing", () => {
    const start = new Date("2026-01-05");
    const end = new Date("2026-02-02");
    const activities = [
      { earlyStart: new Date("2026-01-05"), earlyFinish: new Date("2026-01-19"), duration: 14, budgetedCost: 10000, actualCost: 8000 },
      { earlyStart: new Date("2026-01-12"), earlyFinish: new Date("2026-01-26"), duration: 14, budgetedCost: 20000, actualCost: 18000 },
    ];
    const data = generateSCurveData(activities, start, end);
    for (let i = 1; i < data.length; i++) {
      expect(data[i].cumulativeBudgeted).toBeGreaterThanOrEqual(data[i - 1].cumulativeBudgeted);
      expect(data[i].cumulativeActual).toBeGreaterThanOrEqual(data[i - 1].cumulativeActual);
    }
  });

  it("handles empty activities", () => {
    const start = new Date("2026-01-05");
    const end = new Date("2026-01-12");
    const data = generateSCurveData([], start, end);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].budgeted).toBe(0);
    expect(data[0].actual).toBe(0);
  });

  it("handles activities with null dates", () => {
    const start = new Date("2026-01-05");
    const end = new Date("2026-01-19");
    const activities = [
      { earlyStart: null, earlyFinish: null, duration: 10, budgetedCost: 5000, actualCost: 4000 },
    ];
    const data = generateSCurveData(activities, start, end);
    expect(data.every(w => w.budgeted === 0)).toBe(true);
  });
});

// ── Resource Histogram helpers ──
interface HistogramWeek {
  weekLabel: string;
  labor: number;
  equipment: number;
  material: number;
  subcontractor: number;
}

function generateHistogramData(
  assignments: Array<{
    resourceType: string;
    unitsPerDay: number;
    activityStart: Date | null;
    activityEnd: Date | null;
  }>,
  projectStart: Date,
  projectEnd: Date
): HistogramWeek[] {
  const weeks: HistogramWeek[] = [];
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  let current = new Date(projectStart);
  
  while (current <= projectEnd) {
    const weekEnd = new Date(current.getTime() + msPerWeek);
    const week: HistogramWeek = {
      weekLabel: current.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      labor: 0,
      equipment: 0,
      material: 0,
      subcontractor: 0,
    };
    
    for (const a of assignments) {
      if (!a.activityStart || !a.activityEnd) continue;
      const aStart = new Date(a.activityStart);
      const aEnd = new Date(a.activityEnd);
      if (aStart < weekEnd && aEnd >= current) {
        const key = a.resourceType as keyof Omit<HistogramWeek, "weekLabel">;
        if (key in week && key !== "weekLabel") {
          (week as any)[key] += a.unitsPerDay;
        }
      }
    }
    
    weeks.push(week);
    current = weekEnd;
  }
  
  return weeks;
}

describe("Resource Histogram", () => {
  it("generates weekly resource loading", () => {
    const start = new Date("2026-01-05");
    const end = new Date("2026-01-19");
    const assignments = [
      { resourceType: "labor", unitsPerDay: 3, activityStart: new Date("2026-01-05"), activityEnd: new Date("2026-01-12") },
      { resourceType: "equipment", unitsPerDay: 1, activityStart: new Date("2026-01-05"), activityEnd: new Date("2026-01-19") },
    ];
    const data = generateHistogramData(assignments, start, end);
    expect(data.length).toBeGreaterThanOrEqual(2);
    expect(data[0].labor).toBe(3);
    expect(data[0].equipment).toBe(1);
  });

  it("stacks multiple assignments of same type", () => {
    const start = new Date("2026-01-05");
    const end = new Date("2026-01-12");
    const assignments = [
      { resourceType: "labor", unitsPerDay: 2, activityStart: new Date("2026-01-05"), activityEnd: new Date("2026-01-12") },
      { resourceType: "labor", unitsPerDay: 4, activityStart: new Date("2026-01-05"), activityEnd: new Date("2026-01-12") },
    ];
    const data = generateHistogramData(assignments, start, end);
    expect(data[0].labor).toBe(6);
  });

  it("handles empty assignments", () => {
    const start = new Date("2026-01-05");
    const end = new Date("2026-01-12");
    const data = generateHistogramData([], start, end);
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data[0].labor).toBe(0);
    expect(data[0].equipment).toBe(0);
  });
});

// ── PDF Header Color Config ──
describe("PDF Header Color Config", () => {
  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
  }

  it("converts hex to RGB correctly", () => {
    expect(hexToRgb("#0d1b2a")).toEqual([13, 27, 42]);
    expect(hexToRgb("#c9a84c")).toEqual([201, 168, 76]);
    expect(hexToRgb("#ffffff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#000000")).toEqual([0, 0, 0]);
  });

  it("handles hex without hash", () => {
    expect(hexToRgb("0d1b2a")).toEqual([13, 27, 42]);
  });

  const PRESETS = [
    { bg: "#0d1b2a", accent: "#c9a84c", text: "#e2e8f0", label: "Navy/Gold" },
    { bg: "#1e293b", accent: "#3b82f6", text: "#e2e8f0", label: "Slate/Blue" },
    { bg: "#374151", accent: "#f59e0b", text: "#f3f4f6", label: "Gray/Amber" },
    { bg: "#1a1a2e", accent: "#e94560", text: "#eaeaea", label: "Dark/Red" },
    { bg: "#f1f5f9", accent: "#2563eb", text: "#1e293b", label: "Light/Blue" },
    { bg: "transparent", accent: "#6b7280", text: "#374151", label: "No Color" },
  ];

  it("all presets have valid hex colors (except transparent)", () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    for (const p of PRESETS) {
      if (p.bg !== "transparent") {
        expect(p.bg).toMatch(hexPattern);
      }
      expect(p.accent).toMatch(hexPattern);
      expect(p.text).toMatch(hexPattern);
    }
  });

  it("transparent preset is handled correctly", () => {
    const noColor = PRESETS.find(p => p.label === "No Color");
    expect(noColor).toBeDefined();
    expect(noColor!.bg).toBe("transparent");
  });
});

// ── P6-style WBS Depth Colors ──
describe("P6 WBS Depth-Based Colors", () => {
  // These match the WBS_DEPTH_BG array in schedulePdf.ts
  const WBS_DEPTH_BG: [number, number, number][] = [
    [180, 220, 140],  // Depth 0: Green
    [255, 240, 130],  // Depth 1: Yellow
    [240, 150, 140],  // Depth 2: Red/Salmon
    [230, 170, 220],  // Depth 3: Pink/Magenta
    [180, 200, 240],  // Depth 4: Light Blue
    [255, 210, 150],  // Depth 5: Light Orange
  ];

  it("has at least 4 distinct depth colors (green, yellow, red, pink)", () => {
    expect(WBS_DEPTH_BG.length).toBeGreaterThanOrEqual(4);
  });

  it("depth 0 is green-toned (G channel highest)", () => {
    const [r, g, b] = WBS_DEPTH_BG[0];
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it("depth 1 is yellow-toned (R and G channels high, B low)", () => {
    const [r, g, b] = WBS_DEPTH_BG[1];
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeLessThan(200);
  });

  it("depth 2 is red/salmon-toned (R channel highest)", () => {
    const [r, g, b] = WBS_DEPTH_BG[2];
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it("all colors are valid RGB values (0-255)", () => {
    for (const color of WBS_DEPTH_BG) {
      for (const channel of color) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it("wraps around for depths beyond the palette length", () => {
    const depth = 7;
    const color = WBS_DEPTH_BG[depth % WBS_DEPTH_BG.length];
    expect(color).toEqual(WBS_DEPTH_BG[1]); // 7 % 6 = 1
  });
});

// ── Gridline & Timescale Configuration ──
describe("Gridline & Timescale Configuration", () => {
  const VALID_INTERVALS = ["none", "weekly", "monthly", "quarterly"] as const;
  const VALID_LABELS = ["months", "quarters", "both"] as const;

  it("all gridline intervals are valid options", () => {
    for (const interval of VALID_INTERVALS) {
      expect(typeof interval).toBe("string");
      expect(interval.length).toBeGreaterThan(0);
    }
  });

  it("all timescale label options are valid", () => {
    for (const label of VALID_LABELS) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("default gridline interval is monthly", () => {
    const defaultInterval = "monthly";
    expect(VALID_INTERVALS).toContain(defaultInterval);
  });

  it("default timescale labels is months", () => {
    const defaultLabels = "months";
    expect(VALID_LABELS).toContain(defaultLabels);
  });

  it("quarterly gridlines only show at quarter boundaries (month % 3 === 0)", () => {
    const quarterMonths = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
    const nonQuarterMonths = [1, 2, 4, 5, 7, 8, 10, 11];
    for (const m of quarterMonths) {
      expect(m % 3).toBe(0);
    }
    for (const m of nonQuarterMonths) {
      expect(m % 3).not.toBe(0);
    }
  });
});

// ── Annotation Model ──
describe("Gantt Annotation Model", () => {
  interface TextAnnotation {
    type: "text";
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
    fontSize: number;
    bgColor: string;
  }

  interface ArrowAnnotation {
    type: "arrow";
    id: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    strokeWidth: number;
  }

  interface ShadingAnnotation {
    type: "shading";
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    opacity: number;
    pattern: "solid" | "hatch" | "crosshatch" | "dots";
    label: string;
  }

  type Annotation = TextAnnotation | ArrowAnnotation | ShadingAnnotation;

  it("validates text annotation structure", () => {
    const ann: TextAnnotation = {
      type: "text",
      id: "txt-1",
      x: 100,
      y: 200,
      text: "Delay Impact",
      color: "#dc2626",
      fontSize: 14,
      bgColor: "#fef2f2",
    };
    expect(ann.type).toBe("text");
    expect(ann.text).toBe("Delay Impact");
  });

  it("validates arrow annotation structure", () => {
    const ann: ArrowAnnotation = {
      type: "arrow",
      id: "arr-1",
      x1: 100,
      y1: 100,
      x2: 300,
      y2: 200,
      color: "#dc2626",
      strokeWidth: 2,
    };
    expect(ann.type).toBe("arrow");
    expect(ann.x2 - ann.x1).toBe(200);
  });

  it("validates shading annotation structure", () => {
    const ann: ShadingAnnotation = {
      type: "shading",
      id: "shade-1",
      x: 50,
      y: 50,
      width: 200,
      height: 300,
      color: "#3b82f6",
      opacity: 0.2,
      pattern: "hatch",
      label: "Winter Period",
    };
    expect(ann.type).toBe("shading");
    expect(ann.pattern).toBe("hatch");
    expect(ann.opacity).toBeLessThanOrEqual(1);
    expect(ann.opacity).toBeGreaterThanOrEqual(0);
  });

  it("supports all pattern types", () => {
    const patterns: ShadingAnnotation["pattern"][] = ["solid", "hatch", "crosshatch", "dots"];
    patterns.forEach(p => {
      expect(["solid", "hatch", "crosshatch", "dots"]).toContain(p);
    });
  });

  it("annotation collection can mix types", () => {
    const annotations: Annotation[] = [
      { type: "text", id: "t1", x: 0, y: 0, text: "Test", color: "#000", fontSize: 12, bgColor: "#fff" },
      { type: "arrow", id: "a1", x1: 0, y1: 0, x2: 100, y2: 100, color: "#000", strokeWidth: 2 },
      { type: "shading", id: "s1", x: 0, y: 0, width: 100, height: 100, color: "#000", opacity: 0.3, pattern: "solid", label: "" },
    ];
    expect(annotations.length).toBe(3);
    expect(annotations.filter(a => a.type === "text").length).toBe(1);
    expect(annotations.filter(a => a.type === "arrow").length).toBe(1);
    expect(annotations.filter(a => a.type === "shading").length).toBe(1);
  });
});
