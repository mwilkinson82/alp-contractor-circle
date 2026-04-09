/**
 * Tests for: Baseline EVM Comparison, Report PDF Export, Resource Calendar Integration
 */
import { describe, it, expect } from "vitest";

// ── Baseline EVM Comparison ─────────────────────────────────────────────────────

describe("Baseline EVM Comparison", () => {
  it("should compute delta between current and baseline CPI", () => {
    const current = { CPI: 1.15, SPI: 0.92, CV: 5000, SV: -3000, EAC: 87000, TCPI: 1.08 };
    const baseline = { CPI: 1.05, SPI: 0.88, CV: 2000, SV: -5000, EAC: 95000, TCPI: 1.12 };

    const deltaCPI = current.CPI - baseline.CPI;
    const deltaSPI = current.SPI - baseline.SPI;
    const deltaCV = current.CV - baseline.CV;
    const deltaSV = current.SV - baseline.SV;
    const deltaEAC = current.EAC - baseline.EAC;
    const deltaTCPI = current.TCPI - baseline.TCPI;

    expect(deltaCPI).toBeCloseTo(0.10, 2);
    expect(deltaSPI).toBeCloseTo(0.04, 2);
    expect(deltaCV).toBe(3000);
    expect(deltaSV).toBe(2000);
    expect(deltaEAC).toBe(-8000); // EAC decreased = good
    expect(deltaTCPI).toBeCloseTo(-0.04, 2);
  });

  it("should classify improvement correctly for each metric", () => {
    // CPI, SPI, CV, SV: higher = better (good = "above")
    // EAC, TCPI: lower = better (good = "below")
    const metrics = [
      { label: "CPI", delta: 0.10, good: "above" },
      { label: "SPI", delta: 0.04, good: "above" },
      { label: "CV", delta: 3000, good: "above" },
      { label: "SV", delta: 2000, good: "above" },
      { label: "EAC", delta: -8000, good: "below" },
      { label: "TCPI", delta: -0.04, good: "below" },
    ];

    for (const m of metrics) {
      const improved = m.good === "above" ? m.delta > 0 : m.delta < 0;
      expect(improved).toBe(true);
    }
  });

  it("should handle zero delta (no change)", () => {
    const delta = 0;
    const improved = delta > 0;
    const declined = delta < 0;
    expect(improved).toBe(false);
    expect(declined).toBe(false);
  });

  it("should format delta strings correctly", () => {
    const fmtMoney = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    expect(fmtMoney(5000)).toBe("$50");
    expect(fmtMoney(-3000)).toBe("$-30");
    expect(fmtMoney(0)).toBe("$0");
    expect(fmtMoney(125000)).toBe("$1,250");
  });
});

// ── Report PDF Generation ───────────────────────────────────────────────────────

describe("Report PDF Generation", () => {
  it("should format EVM metrics for PDF table rows", () => {
    const fmtMoney = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    
    const metrics = {
      BAC: 10000000, BCWP: 4500000, BCWS: 5000000, ACWP: 4000000,
      CPI: 1.125, SPI: 0.9, CV: 500000, SV: -500000,
      EAC: 8888889, ETC: 4888889, VAC: 1111111, TCPI: 0.85,
    };

    const rows = [
      ["BAC (Budget at Completion)", fmtMoney(metrics.BAC)],
      ["CPI (Cost Performance Index)", metrics.CPI.toFixed(2)],
      ["SPI (Schedule Performance Index)", metrics.SPI.toFixed(2)],
    ];

    expect(rows[0]).toEqual(["BAC (Budget at Completion)", "$100,000"]);
    expect(rows[1]).toEqual(["CPI (Cost Performance Index)", "1.13"]);
    expect(rows[2]).toEqual(["SPI (Schedule Performance Index)", "0.90"]);
  });

  it("should generate performance assessment text", () => {
    const metrics = { CPI: 1.15, SPI: 0.92, TCPI: 0.85 };
    const assessments: string[] = [];

    if (metrics.CPI >= 1) assessments.push("UNDER BUDGET");
    else assessments.push("OVER BUDGET");

    if (metrics.SPI >= 1) assessments.push("AHEAD OF SCHEDULE");
    else assessments.push("BEHIND SCHEDULE");

    if (metrics.TCPI <= 1) assessments.push("ACHIEVABLE");
    else assessments.push("DIFFICULT TO ACHIEVE");

    expect(assessments).toEqual(["UNDER BUDGET", "BEHIND SCHEDULE", "ACHIEVABLE"]);
  });

  it("should map leveling data to PDF-compatible format", () => {
    const backendData = {
      weekLabel: "Apr 7, 25",
      resourceId: 1,
      resourceName: "Carpenter",
      resourceType: "labor",
      allocated: 12,
      capacity: 8,
      overBy: 4,
      activities: ["A1010", "A1020"],
    };

    const pct = backendData.overBy / backendData.capacity;
    const pdfRow = {
      resourceName: backendData.resourceName,
      resourceType: backendData.resourceType,
      week: backendData.weekLabel,
      allocated: backendData.allocated,
      capacity: backendData.capacity,
      overBy: backendData.overBy,
      severity: pct > 0.5 ? "critical" : pct > 0.25 ? "high" : "medium",
    };

    expect(pdfRow.week).toBe("Apr 7, 25");
    expect(pdfRow.severity).toBe("high"); // 4/8 = 50%, not > 50% so high
  });

  it("should classify severity correctly for PDF", () => {
    // > 50% = critical, > 25% = high, else medium
    expect(6 / 8 > 0.5).toBe(true); // 75% → critical
    expect(3 / 8 > 0.5).toBe(false);
    expect(3 / 8 > 0.25).toBe(true); // 37.5% → high
    expect(1 / 8 > 0.25).toBe(false); // 12.5% → medium
  });
});

// ── Resource Calendar Integration ───────────────────────────────────────────────

describe("Resource Calendar Integration", () => {
  // workDaysMask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
  const dayBits = [64, 1, 2, 4, 8, 16, 32]; // JS getDay: 0=Sun,1=Mon,...,6=Sat

  function countWorkDaysInWeek(
    weekStart: Date,
    weekEnd: Date,
    mask: number,
    exceptions: Map<string, string>
  ): number {
    let count = 0;
    const d = new Date(weekStart);
    while (d < weekEnd) {
      const dateKey = d.toISOString().slice(0, 10);
      const exception = exceptions.get(dateKey);
      if (exception === "holiday") {
        // non-work
      } else if (exception === "workday") {
        count++;
      } else {
        const dayOfWeek = d.getDay();
        if (mask & dayBits[dayOfWeek]) count++;
      }
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  // Note: new Date('YYYY-MM-DD') parses as UTC midnight.
  // In UTC, 2025-04-07 getDay() = 0 (Sunday) due to timezone offset.
  // We use toISOString().slice(0,10) for date keys, so we need dates
  // where the UTC day-of-week matches our expectations.
  // 2025-04-07 UTC = Monday in local but Sunday in getDay() for UTC midnight.
  // Use T12:00:00Z to ensure correct day-of-week in UTC.

  it("should count work days correctly for a 7-day span", () => {
    const mask = 31; // Mon-Fri = 1+2+4+8+16
    // Use a span where we know the UTC days
    const weekStart = new Date("2025-04-07T12:00:00Z"); // Monday UTC
    const weekEnd = new Date("2025-04-14T12:00:00Z"); // Next Monday UTC
    const exceptions = new Map<string, string>();

    // Count how many Mon-Fri days are in this range
    const result = countWorkDaysInWeek(weekStart, weekEnd, mask, exceptions);
    expect(result).toBe(5); // Mon-Fri
  });

  it("should count 7 work days for 7-day week with no exceptions", () => {
    const mask = 127; // All days = 1+2+4+8+16+32+64
    const weekStart = new Date("2025-04-07T12:00:00Z");
    const weekEnd = new Date("2025-04-14T12:00:00Z");
    const exceptions = new Map<string, string>();

    expect(countWorkDaysInWeek(weekStart, weekEnd, mask, exceptions)).toBe(7);
  });

  it("should reduce work days when a holiday exception is present", () => {
    const mask = 31; // Mon-Fri
    const weekStart = new Date("2025-04-07T12:00:00Z");
    const weekEnd = new Date("2025-04-14T12:00:00Z");
    const exceptions = new Map<string, string>();
    exceptions.set("2025-04-09", "holiday"); // Wednesday is a holiday

    const result = countWorkDaysInWeek(weekStart, weekEnd, mask, exceptions);
    expect(result).toBe(4); // 5 - 1 holiday
  });

  it("should add a work day when a Saturday workday exception is present", () => {
    const mask = 31; // Mon-Fri
    const weekStart = new Date("2025-04-07T12:00:00Z");
    const weekEnd = new Date("2025-04-14T12:00:00Z");
    const exceptions = new Map<string, string>();
    exceptions.set("2025-04-12", "workday"); // Saturday overtime

    const result = countWorkDaysInWeek(weekStart, weekEnd, mask, exceptions);
    expect(result).toBe(6); // 5 weekdays + 1 Saturday OT
  });

  it("should handle multiple exceptions in the same week", () => {
    const mask = 31; // Mon-Fri
    const weekStart = new Date("2025-04-07T12:00:00Z");
    const weekEnd = new Date("2025-04-14T12:00:00Z");
    const exceptions = new Map<string, string>();
    exceptions.set("2025-04-07", "holiday"); // Monday holiday
    exceptions.set("2025-04-08", "holiday"); // Tuesday holiday
    exceptions.set("2025-04-12", "workday"); // Saturday OT

    const result = countWorkDaysInWeek(weekStart, weekEnd, mask, exceptions);
    expect(result).toBe(4); // 5 - 2 holidays + 1 Saturday = 4
  });

  it("should calculate effective capacity based on work days", () => {
    const maxUnitsPerDay = 8;
    const workDays = 3; // Holiday week
    const standardDays = 5;
    const effectiveCapacity = maxUnitsPerDay * (workDays / standardDays);

    expect(effectiveCapacity).toBeCloseTo(4.8, 1);
  });

  it("should detect over-allocation with calendar-adjusted capacity", () => {
    const allocated = 6; // units/day
    const maxUnitsPerDay = 8;
    const workDays = 3; // Short week
    const effectiveCapacity = maxUnitsPerDay * (workDays / 5);

    // effectiveCapacity = 4.8, allocated = 6 → over by 1.2
    expect(allocated > effectiveCapacity).toBe(true);
    expect(allocated - effectiveCapacity).toBeCloseTo(1.2, 1);
  });

  it("should NOT flag over-allocation when calendar-adjusted capacity is sufficient", () => {
    const allocated = 4;
    const maxUnitsPerDay = 8;
    const workDays = 5;
    const effectiveCapacity = maxUnitsPerDay * (workDays / 5);

    expect(allocated > effectiveCapacity).toBe(false);
  });

  it("should add calendar note to suggestion when calendar-adjusted", () => {
    const workDays = 3;
    const calendarAdjusted = workDays < 5;
    const calNote = calendarAdjusted ? ` (${workDays} work days this week due to calendar)` : "";

    expect(calNote).toBe(" (3 work days this week due to calendar)");
  });

  it("should handle 6-day work week (Mon-Sat)", () => {
    const mask = 63; // Mon-Sat = 1+2+4+8+16+32
    const weekStart = new Date("2025-04-07T12:00:00Z");
    const weekEnd = new Date("2025-04-14T12:00:00Z");
    const exceptions = new Map<string, string>();

    expect(countWorkDaysInWeek(weekStart, weekEnd, mask, exceptions)).toBe(6);
  });
});
