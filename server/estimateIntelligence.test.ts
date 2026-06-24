import { describe, expect, it } from "vitest";
import { buildEstimateIntelligenceFindings } from "../shared/estimateIntelligence";

describe("buildEstimateIntelligenceFindings", () => {
  it("flags thin full-GC coverage and allowance checkpoints", () => {
    const findings = buildEstimateIntelligenceFindings({
      project: {
        name: "Retail buildout with specialty equipment",
        bidMode: "full_gc",
        allowances: [],
      },
      sheets: [
        { sheetName: "E-100 Electrical Plans", sheetType: "electrical" },
        { sheetName: "P-100 Plumbing Plans", sheetType: "plumbing" },
      ],
      items: [
        {
          id: 1,
          csiDivision: "03 Concrete",
          description: "Concrete slab and foundations",
          extendedCost: 700_000_00,
        },
        {
          id: 2,
          csiDivision: "07 Thermal & Moisture Protection",
          description: "Roofing and envelope",
          extendedCost: 150_000_00,
        },
        {
          id: 3,
          csiDivision: "01 General Requirements",
          description: "Closeout documents",
          extendedCost: 5_000_00,
        },
        {
          id: 4,
          csiDivision: "11 Equipment",
          description: "Specialty equipment package placeholder",
          extendedCost: 3_500_00,
        },
      ],
    });

    const ids = findings.map(finding => finding.id);
    expect(ids).toContain("full-gc-general-conditions-thin");
    expect(ids).toContain("full-gc-mep-coverage-thin");
    expect(ids).toContain("vendor-allowance-scope-needs-pricing-basis");
    expect(ids).toContain("full-gc-allowance-log-empty");
  });

  it("does not create broad coverage warnings for focused trade packages", () => {
    const findings = buildEstimateIntelligenceFindings({
      project: {
        name: "Concrete package",
        bidMode: "trade_package",
        selectedDivisions: ["03"],
      },
      items: [
        {
          id: 1,
          csiDivision: "03 Concrete",
          description: "Concrete slab and foundations",
          extendedCost: 700_000_00,
        },
      ],
    });

    expect(findings.map(finding => finding.id)).not.toContain(
      "full-gc-mep-coverage-thin"
    );
    expect(findings.map(finding => finding.id)).not.toContain(
      "full-gc-general-conditions-thin"
    );
    expect(findings).toHaveLength(0);
  });
});
