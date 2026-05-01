import { describe, expect, it } from "vitest";
import { analyzeResidentialEstimateQa, reviewResidentialLaborMatch } from "../shared/residentialEstimateQa";

describe("analyzeResidentialEstimateQa", () => {
  it("flags missing residential allowance categories", () => {
    const findings = analyzeResidentialEstimateQa({
      items: [
        { csiDivision: "03", description: "Concrete Slab", quantity: 1000, unitCost: 1200 },
        { csiDivision: "22", description: "Plumbing rough-in", quantity: 1, unitCost: 5000000 },
      ],
      byDivision: {
        "03": { materialTotal: 1200000, laborTotal: 800000 },
        "22": { materialTotal: 5000000, laborTotal: 5000000 },
      },
      directCostCents: 12000000,
      allowances: [],
    });

    expect(findings.some(f => f.id === "missing-cabinets")).toBe(true);
    expect(findings.some(f => f.id === "missing-appliances")).toBe(true);
  });

  it("does not flag categories covered by allowances", () => {
    const findings = analyzeResidentialEstimateQa({
      items: [
        { csiDivision: "09", description: "Paint walls and ceilings", quantity: 7000, unitCost: 800 },
      ],
      byDivision: {
        "09": { materialTotal: 5600000, laborTotal: 2000000 },
      },
      directCostCents: 7600000,
      allowances: [
        { description: "Kitchen Cabinets", amount: 1500000 },
        { description: "Countertops", amount: 800000 },
        { description: "Appliances", amount: 1000000 },
        { description: "Flooring", amount: 1200000 },
        { description: "Final clean and punch", amount: 500000 },
      ],
    });

    expect(findings.some(f => f.id === "missing-cabinets")).toBe(false);
    expect(findings.some(f => f.id === "missing-countertops")).toBe(false);
    expect(findings.some(f => f.id === "missing-appliances")).toBe(false);
  });

  it("flags inferred demolition and detail-derived quantities", () => {
    const findings = analyzeResidentialEstimateQa({
      items: [
        {
          csiDivision: "02",
          description: "Demolition of existing structures/vegetation",
          quantity: 23522,
          unitCost: 637,
          notes: "implied by vacant property",
        },
        {
          csiDivision: "06",
          description: "Hardie Boys Elements Rafter Tails",
          quantity: 2800,
          unitCost: 6006,
          notes: "24 inch O.C. Typical detail",
        },
      ],
      byDivision: {
        "02": { materialTotal: 15000000, laborTotal: 600000 },
        "06": { materialTotal: 16800000, laborTotal: 0 },
      },
      directCostCents: 25000000,
      allowances: [],
    });

    expect(findings.some(f => f.id === "scope-risk-inferred-demo")).toBe(true);
    expect(findings.some(f => f.kind === "detail_anchor")).toBe(true);
  });

  it("marks inferred and detail-derived items as review before labor", () => {
    const inferred = reviewResidentialLaborMatch({
      csiDivision: "02",
      description: "Site clearing / demolition",
      quantity: 1,
      unitCost: 3500000,
      notes: "inferred from vacant lot",
    });
    const detail = reviewResidentialLaborMatch({
      csiDivision: "03",
      description: "Rebar at grade beam per detail",
      quantity: 5000,
      unitCost: 900,
      notes: "typical detail spacing 12 inch O.C.",
    });
    const safe = reviewResidentialLaborMatch({
      csiDivision: "06",
      description: "Wood wall framing",
      quantity: 1000,
      unitCost: 450,
    });

    expect(inferred.blockAutomaticLabor).toBe(true);
    expect(detail.blockAutomaticLabor).toBe(true);
    expect(safe.status).toBe("safe_to_match");
  });

  it("adds per-square-foot benchmark findings when project size is available", () => {
    const findings = analyzeResidentialEstimateQa({
      items: [
        { csiDivision: "03", description: "Concrete Slab", quantity: 1, unitCost: 100000000 },
      ],
      byDivision: {
        "03": { materialTotal: 100000000, laborTotal: 0 },
      },
      directCostCents: 100000000,
      livingSf: 1200,
      allowances: [],
    });

    expect(findings.some(f => f.id === "benchmark-direct-cost-high-per-sf")).toBe(true);
  });
});
