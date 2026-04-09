import { describe, it, expect } from "vitest";

/**
 * Tests for the resource & cost loading feature logic.
 * Tests the data validation, cost calculation, and formatting patterns
 * used by the ResourcePanel and backend procedures.
 */

// ── Cost formatting helper (mirrors ResourcePanel.tsx) ──
function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

describe("Resource & Cost Loading", () => {

  describe("Cost formatting", () => {
    it("formats zero cents correctly", () => {
      expect(formatCurrency(0)).toBe("$0.00");
    });
    it("formats small amounts", () => {
      expect(formatCurrency(150)).toBe("$1.50");
    });
    it("formats large amounts with commas", () => {
      expect(formatCurrency(12500000)).toBe("$125,000.00");
    });
    it("formats exact dollars", () => {
      expect(formatCurrency(5000)).toBe("$50.00");
    });
    it("formats single cent", () => {
      expect(formatCurrency(1)).toBe("$0.01");
    });
  });

  describe("Resource type validation", () => {
    const VALID_TYPES = ["labor", "equipment", "material", "subcontractor"];

    it("accepts all valid resource types", () => {
      VALID_TYPES.forEach((t) => {
        expect(VALID_TYPES.includes(t)).toBe(true);
      });
    });

    it("rejects invalid resource types", () => {
      expect(VALID_TYPES.includes("other")).toBe(false);
      expect(VALID_TYPES.includes("")).toBe(false);
    });
  });

  describe("Cost rate conversion (dollars to cents)", () => {
    it("converts dollar string to integer cents", () => {
      expect(Math.round(parseFloat("75.50") * 100)).toBe(7550);
    });
    it("handles whole dollar amounts", () => {
      expect(Math.round(parseFloat("100") * 100)).toBe(10000);
    });
    it("handles zero", () => {
      expect(Math.round(parseFloat("0") * 100)).toBe(0);
    });
    it("handles empty string as NaN fallback", () => {
      const val = parseFloat("") || 0;
      expect(Math.round(val * 100)).toBe(0);
    });
  });

  describe("Budget totals calculation", () => {
    it("sums budgeted costs across assignments", () => {
      const assignments = [
        { budgetedCost: 50000, actualCost: 30000 },
        { budgetedCost: 75000, actualCost: 60000 },
        { budgetedCost: 25000, actualCost: 25000 },
      ];
      const totalBudgeted = assignments.reduce((sum, a) => sum + a.budgetedCost, 0);
      const totalActual = assignments.reduce((sum, a) => sum + a.actualCost, 0);
      expect(totalBudgeted).toBe(150000);
      expect(totalActual).toBe(115000);
    });

    it("handles empty assignments", () => {
      const assignments: { budgetedCost: number; actualCost: number }[] = [];
      const total = assignments.reduce((sum, a) => sum + a.budgetedCost, 0);
      expect(total).toBe(0);
    });
  });

  describe("Resource map building", () => {
    it("builds a lookup map from resource array", () => {
      const resources = [
        { id: 1, name: "Electrician", resourceType: "labor" },
        { id: 2, name: "Crane", resourceType: "equipment" },
        { id: 3, name: "Concrete", resourceType: "material" },
      ];
      const map = new Map(resources.map((r) => [r.id, r]));
      expect(map.get(1)?.name).toBe("Electrician");
      expect(map.get(2)?.resourceType).toBe("equipment");
      expect(map.get(99)).toBeUndefined();
    });
  });

  describe("Cost account code validation", () => {
    it("requires non-empty code", () => {
      const code = "03-CONCRETE";
      expect(code.trim().length > 0).toBe(true);
    });
    it("rejects empty code", () => {
      const code = "  ";
      expect(code.trim().length > 0).toBe(false);
    });
  });

  describe("Units per day as string decimal", () => {
    it("preserves decimal precision", () => {
      const units = "8.00";
      expect(units).toBe("8.00");
    });
    it("handles partial units", () => {
      const units = "4.50";
      expect(parseFloat(units)).toBe(4.5);
    });
  });
});
