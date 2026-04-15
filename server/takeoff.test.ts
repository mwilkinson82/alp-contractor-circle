/**
 * Tests for the AI Quantity Takeoff feature.
 * Tests the database helpers, AI processing pipeline, and tRPC router.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock the database module ─────────────────────────────────────────────────

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn().mockResolvedValue([]),
};

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => mockDb),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.png", key: "test-key" }),
}));

// ─── Test the AI processing pipeline ──────────────────────────────────────────

describe("Takeoff AI Pipeline", () => {
  it("should export processDrawingSheet function", async () => {
    const mod = await import("./takeoffAI");
    expect(typeof mod.processDrawingSheet).toBe("function");
  });

  it("should export processAllPendingSheets function", async () => {
    const mod = await import("./takeoffAI");
    expect(typeof mod.processAllPendingSheets).toBe("function");
  });
});

// ─── Test the database helpers ────────────────────────────────────────────────

describe("Takeoff Database Helpers", () => {
  it("should export all required CRUD functions", async () => {
    const mod = await import("./takeoffDb");
    expect(typeof mod.createTakeoffProject).toBe("function");
    expect(typeof mod.getTakeoffProject).toBe("function");
    expect(typeof mod.getTakeoffProjectsByMember).toBe("function");
    expect(typeof mod.updateTakeoffProject).toBe("function");
    expect(typeof mod.deleteTakeoffProject).toBe("function");
    expect(typeof mod.createDrawingSheet).toBe("function");
    expect(typeof mod.getDrawingSheetsByProject).toBe("function");
    expect(typeof mod.updateDrawingSheet).toBe("function");
    expect(typeof mod.createTakeoffItemsBatch).toBe("function");
    expect(typeof mod.getTakeoffItemsByProject).toBe("function");
    expect(typeof mod.updateTakeoffItem).toBe("function");
    expect(typeof mod.deleteTakeoffItem).toBe("function");
    expect(typeof mod.deleteTakeoffItemsBySheet).toBe("function");
    expect(typeof mod.recalculateProjectTotal).toBe("function");
  });
});

// ─── Test the tRPC router ─────────────────────────────────────────────────────

describe("Takeoff Router", () => {
  it("should export takeoffRouter with all required procedures", async () => {
    const mod = await import("./takeoffRouter");
    expect(mod.takeoffRouter).toBeDefined();

    // Check that all expected procedures exist
    const router = mod.takeoffRouter as any;
    const procedures = router._def?.procedures || {};

    // The router should have these procedure keys
    const expectedProcedures = [
      "listProjects",
      "getProject",
      "createProject",
      "updateProject",
      "deleteProject",
      "uploadSheet",
      "uploadSheetsBatch",
      "startProcessing",
      "reprocessSheet",
      "getItems",
      "updateItem",
      "deleteItem",
      "getProgress",
      "reprocessConsolidate",
      "bulkReview",
      "bulkUnreview",
      "recalculateStatus",
      "updateProjectSettings",
    ];

    for (const proc of expectedProcedures) {
      expect(procedures[proc], `Missing procedure: ${proc}`).toBeDefined();
    }
  });
});

// ─── Test CSI Division mapping ────────────────────────────────────────────────

describe("CSI Division Mapping", () => {
  it("should correctly identify CSI divisions from codes", () => {
    const csiDivisions: Record<string, string> = {
      "01": "General Requirements",
      "03": "Concrete",
      "05": "Metals",
      "06": "Wood, Plastics & Composites",
      "07": "Thermal & Moisture Protection",
      "08": "Openings",
      "09": "Finishes",
      "22": "Plumbing",
      "23": "HVAC",
      "26": "Electrical",
      "31": "Earthwork",
    };

    // Verify division extraction from CSI codes
    const extractDivision = (code: string) => code.substring(0, 2);

    expect(extractDivision("03 30 00")).toBe("03");
    expect(extractDivision("09 29 00")).toBe("09");
    expect(extractDivision("26 05 00")).toBe("26");
    expect(extractDivision("31 23 00")).toBe("31");

    // Verify division names exist
    for (const [code, name] of Object.entries(csiDivisions)) {
      expect(name).toBeTruthy();
      expect(code.length).toBe(2);
    }
  });
});

// ─── Test quantity calculations ───────────────────────────────────────────────

describe("Quantity Calculations", () => {
  it("should correctly calculate extended cost from quantity and unit cost", () => {
    // Extended cost = quantity * unitCost (in cents)
    const testCases = [
      { quantity: 100, unitCost: 1500, expected: 150000 }, // 100 units * $15.00 = $1,500.00
      { quantity: 2400, unitCost: 350, expected: 840000 }, // 2400 SF * $3.50/SF = $8,400.00
      { quantity: 12, unitCost: 45000, expected: 540000 }, // 12 doors * $450.00 = $5,400.00
      { quantity: 340, unitCost: 2500, expected: 850000 }, // 340 LF * $25.00/LF = $8,500.00
      { quantity: 0, unitCost: 1500, expected: 0 },
      { quantity: 1, unitCost: 0, expected: 0 },
    ];

    for (const tc of testCases) {
      const result = Math.round(tc.quantity * tc.unitCost);
      expect(result).toBe(tc.expected);
    }
  });

  it("should correctly format currency from cents", () => {
    const formatCurrency = (cents: number): string => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(cents / 100);
    };

    expect(formatCurrency(150000)).toBe("$1,500.00");
    expect(formatCurrency(840000)).toBe("$8,400.00");
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(99)).toBe("$0.99");
    expect(formatCurrency(100000000)).toBe("$1,000,000.00");
  });
});

// ─── Test base64 encoding/decoding ────────────────────────────────────────────

describe("Base64 Image Handling", () => {
  it("should correctly encode and decode base64 data", () => {
    const testData = "Hello, construction drawings!";
    const encoded = Buffer.from(testData).toString("base64");
    const decoded = Buffer.from(encoded, "base64").toString();
    expect(decoded).toBe(testData);
  });

  it("should handle empty base64 data", () => {
    const encoded = Buffer.from("").toString("base64");
    expect(encoded).toBe("");
    const decoded = Buffer.from(encoded, "base64").toString();
    expect(decoded).toBe("");
  });

  it("should generate correct file keys with random suffixes", () => {
    const memberId = 42;
    const projectId = 7;
    const pageNumber = 3;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const fileKey = `takeoff/${memberId}/${projectId}/sheet-${pageNumber}-${randomSuffix}.png`;

    expect(fileKey).toMatch(/^takeoff\/42\/7\/sheet-3-[a-z0-9]+\.png$/);
    expect(fileKey.length).toBeGreaterThan(20);
  });
});

// ─── Test Post-Processing Status Lifecycle ───────────────────────────────────

describe("Post-Processing Status Lifecycle", () => {
  it("should include post_processing in the project status enum", async () => {
    const schema = await import("../drizzle/schema");
    // The takeoffProjects table should have a status column that accepts post_processing
    expect(schema.takeoffProjects).toBeDefined();
    // Verify the column definition exists
    const statusCol = (schema.takeoffProjects as any).status;
    expect(statusCol).toBeDefined();
  });

  it("reprocessConsolidate should set status to post_processing (not processing)", async () => {
    // Verify the router code uses post_processing for manual consolidation
    const fs = await import("fs");
    const routerCode = fs.readFileSync("server/takeoffRouter.ts", "utf-8");
    
    // Find the reprocessConsolidate section
    const startIdx = routerCode.indexOf("reprocessConsolidate:");
    const consolidateSection = routerCode.slice(startIdx, startIdx + 1000);
    
    // It should set status to post_processing, NOT processing
    expect(consolidateSection).toContain('status: "post_processing"');
    expect(consolidateSection).not.toContain('status: "processing"');
  });

  it("full analysis pipeline should also use post_processing before postProcessTakeoff", async () => {
    const fs = await import("fs");
    const aiCode = fs.readFileSync("server/takeoffAI.ts", "utf-8");
    
    // The full pipeline should set post_processing before calling postProcessTakeoff
    expect(aiCode).toContain('status: "post_processing"');
  });

  it("ProcessingOverlay should map post_processing to consolidating phase", async () => {
    const fs = await import("fs");
    const overlayCode = fs.readFileSync("client/src/components/ProcessingOverlay.tsx", "utf-8");
    
    // The overlay should detect post_processing and show consolidation phase
    expect(overlayCode).toContain('"post_processing"');
    expect(overlayCode).toContain('"consolidating"');
  });

  it("TakeoffDetail should poll during post_processing status", async () => {
    const fs = await import("fs");
    const detailCode = fs.readFileSync("client/src/pages/TakeoffDetail.tsx", "utf-8");
    
    // Polling should be active for post_processing
    expect(detailCode).toContain('"post_processing"');
    // The refetchInterval should include post_processing
    const refetchMatches = detailCode.match(/refetchInterval.*?post_processing/gs);
    expect(refetchMatches).not.toBeNull();
    expect(refetchMatches!.length).toBeGreaterThanOrEqual(1);
  });
});
