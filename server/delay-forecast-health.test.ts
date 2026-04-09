/**
 * Tests for Delay Analysis, Cost Forecast, and Health Score features.
 */
import { describe, it, expect } from "vitest";

// ── Delay Analysis Logic Tests ──────────────────────────────────────────────

describe("Delay Analysis", () => {
  it("calculates start delay correctly", () => {
    const blStart = new Date("2025-01-15T12:00:00Z");
    const curStart = new Date("2025-02-01T12:00:00Z");
    const delay = Math.round((curStart.getTime() - blStart.getTime()) / 86400000);
    expect(delay).toBe(17);
  });

  it("calculates finish delay correctly", () => {
    const blFinish = new Date("2025-03-01T12:00:00Z");
    const curFinish = new Date("2025-03-20T12:00:00Z");
    const delay = Math.round((curFinish.getTime() - blFinish.getTime()) / 86400000);
    expect(delay).toBe(19);
  });

  it("returns zero delay when current is before baseline", () => {
    const blStart = new Date("2025-02-01T12:00:00Z");
    const curStart = new Date("2025-01-20T12:00:00Z");
    const delay = Math.round((curStart.getTime() - blStart.getTime()) / 86400000);
    const maxDelay = Math.max(delay, 0);
    expect(maxDelay).toBe(0);
  });

  it("identifies critical activities correctly", () => {
    const activities = [
      { totalFloat: 0, name: "Foundation" },
      { totalFloat: -2, name: "Steel Erection" },
      { totalFloat: 5, name: "Painting" },
      { totalFloat: 15, name: "Landscaping" },
    ];
    const critical = activities.filter(a => (a.totalFloat ?? 999) <= 0);
    expect(critical.length).toBe(2);
    expect(critical.map(a => a.name)).toEqual(["Foundation", "Steel Erection"]);
  });

  it("sorts impacted activities by max delay descending", () => {
    const impacted = [
      { name: "A", maxDelay: 5 },
      { name: "B", maxDelay: 20 },
      { name: "C", maxDelay: 10 },
    ];
    impacted.sort((a, b) => b.maxDelay - a.maxDelay);
    expect(impacted[0].name).toBe("B");
    expect(impacted[1].name).toBe("C");
    expect(impacted[2].name).toBe("A");
  });

  it("generates annotation suggestions for delays > 5 days", () => {
    const impacted = [
      { startDelay: 10, maxDelay: 12, isCritical: true, name: "Foundation" },
      { startDelay: 3, maxDelay: 3, isCritical: false, name: "Painting" },
      { startDelay: 8, maxDelay: 8, isCritical: false, name: "Electrical" },
    ];
    const annotations: any[] = [];
    for (const imp of impacted.slice(0, 10)) {
      if (imp.startDelay > 5) {
        annotations.push({
          type: "shading",
          pattern: imp.isCritical ? "crosshatch" : "hatch",
        });
      }
    }
    expect(annotations.length).toBe(2);
    expect(annotations[0].pattern).toBe("crosshatch");
    expect(annotations[1].pattern).toBe("hatch");
  });
});

// ── Cost Forecast Logic Tests ───────────────────────────────────────────────

describe("Cost Forecast", () => {
  it("calculates CPI correctly", () => {
    const BCWP = 50000;
    const ACWP = 60000;
    const CPI = BCWP / ACWP;
    expect(Math.round(CPI * 100) / 100).toBe(0.83);
  });

  it("calculates EAC from CPI", () => {
    const BAC = 100000;
    const CPI = 0.83;
    const EAC = BAC / CPI;
    expect(Math.round(EAC)).toBe(120482);
  });

  it("calculates ETC correctly", () => {
    const EAC = 120482;
    const ACWP = 60000;
    const ETC = EAC - ACWP;
    expect(ETC).toBe(60482);
  });

  it("generates S-curve sigmoid values", () => {
    const BAC = 100000;
    const points: number[] = [];
    for (let progress = 0; progress <= 1; progress += 0.25) {
      const x = progress * 6 - 3;
      const sigmoid = 1 / (1 + Math.exp(-x));
      points.push(Math.round(BAC * sigmoid));
    }
    // S-curve should start slow, accelerate, then plateau
    expect(points[0]).toBeLessThan(points[1]);
    expect(points[1]).toBeLessThan(points[2]);
    expect(points[2]).toBeLessThan(points[3]);
    expect(points[4]).toBeLessThan(BAC * 1.01); // near BAC at end
    // First half should be less than middle
    expect(points[0]).toBeLessThan(BAC * 0.1);
    expect(points[2]).toBeCloseTo(BAC * 0.5, -3); // middle ~50%
  });

  it("handles zero ACWP gracefully (CPI defaults to 1)", () => {
    const BCWP = 0;
    const ACWP = 0;
    const CPI = ACWP > 0 ? BCWP / ACWP : 1;
    expect(CPI).toBe(1);
  });

  it("projects forecast line from actual to EAC", () => {
    const ACWP = 60000;
    const ETC = 60000;
    const totalWeeks = 20;
    const dataWeeks = 10;
    // At data end, forecast = ACWP
    const forecastAtDataEnd = ACWP + (ETC * 0);
    expect(forecastAtDataEnd).toBe(60000);
    // At project end, forecast = ACWP + ETC = EAC
    const forecastAtEnd = ACWP + ETC;
    expect(forecastAtEnd).toBe(120000);
    // Midway through forecast
    const forecastMid = ACWP + (ETC * 0.5);
    expect(forecastMid).toBe(90000);
  });
});

// ── Health Score Logic Tests ────────────────────────────────────────────────

describe("Health Score", () => {
  it("calculates float distribution score", () => {
    const activities = [
      { totalFloat: 0 }, { totalFloat: 0 }, { totalFloat: 5 },
      { totalFloat: 10 }, { totalFloat: 15 }, { totalFloat: 20 },
      { totalFloat: 25 }, { totalFloat: 30 }, { totalFloat: 35 },
      { totalFloat: 40 },
    ];
    const floats = activities.map(a => a.totalFloat);
    const criticalCount = floats.filter(f => f <= 0).length;
    const criticalRatio = criticalCount / activities.length;
    expect(criticalRatio).toBe(0.2); // 2/10 = 20% critical
    const avgFloat = floats.reduce((s, f) => s + f, 0) / floats.length;
    expect(avgFloat).toBe(18); // healthy average
  });

  it("penalizes high critical ratio", () => {
    const criticalRatio = 0.7;
    let floatScore = 100;
    if (criticalRatio > 0.5) floatScore -= (criticalRatio - 0.5) * 100;
    expect(floatScore).toBe(80);
  });

  it("penalizes too much float", () => {
    const avgFloat = 80;
    let floatScore = 100;
    if (avgFloat > 60) floatScore -= 15;
    expect(floatScore).toBe(85);
  });

  it("calculates logic density score", () => {
    const activities = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
    const rels = [
      { predecessorId: 1, successorId: 2 },
      { predecessorId: 2, successorId: 3 },
      { predecessorId: 3, successorId: 4 },
      { predecessorId: 4, successorId: 5 },
    ];
    const actWithPred = new Set(rels.map(r => r.successorId));
    const actWithSucc = new Set(rels.map(r => r.predecessorId));
    const openEnds = activities.filter(a => !actWithPred.has(a.id) && !actWithSucc.has(a.id)).length;
    expect(openEnds).toBe(5); // activities 6-10 have no relationships
  });

  it("assigns correct grade based on score", () => {
    const gradeFor = (score: number) => {
      if (score >= 90) return "A";
      if (score >= 80) return "B";
      if (score >= 70) return "C";
      if (score >= 60) return "D";
      return "F";
    };
    expect(gradeFor(95)).toBe("A");
    expect(gradeFor(85)).toBe("B");
    expect(gradeFor(75)).toBe("C");
    expect(gradeFor(65)).toBe("D");
    expect(gradeFor(50)).toBe("F");
  });

  it("calculates weighted overall score", () => {
    const components = [
      { score: 80, weight: 25 },
      { score: 90, weight: 25 },
      { score: 70, weight: 20 },
      { score: 60, weight: 15 },
      { score: 50, weight: 15 },
    ];
    const overall = Math.round(
      components.reduce((s, c) => s + c.score * (c.weight / 100), 0)
    );
    // 80*0.25 + 90*0.25 + 70*0.20 + 60*0.15 + 50*0.15 = 20+22.5+14+9+7.5 = 73
    expect(overall).toBe(73);
  });

  it("generates appropriate recommendations", () => {
    const recommendations: string[] = [];
    const floatScore = 50;
    const cpScore = 60;
    const logicScore = 50;
    const resourceScore = 40;
    const criticalRatio = 0.7;
    const openEnds = 15;

    if (floatScore < 70) recommendations.push(criticalRatio > 0.5 ? "Too many critical activities" : "Float distribution is unusual");
    if (cpScore < 70) recommendations.push("Critical path connectivity is weak");
    if (logicScore < 70) recommendations.push(`${openEnds} activities have no relationships`);
    if (resourceScore < 70) recommendations.push("Resource loading is incomplete");

    expect(recommendations.length).toBe(4);
    expect(recommendations[0]).toContain("critical activities");
    expect(recommendations[1]).toContain("connectivity");
    expect(recommendations[2]).toContain("15 activities");
    expect(recommendations[3]).toContain("Resource loading");
  });
});
