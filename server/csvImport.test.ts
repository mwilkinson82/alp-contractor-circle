/**
 * CSV Import Tests
 *
 * Tests the importActivitiesCsv procedure input parsing and the predecessor
 * string parsing regex used in the CSV import feature.
 */
import { describe, it, expect } from "vitest";

// ─── Predecessor Parsing ────────────────────────────────────────────────────
// This regex is used in the importActivitiesCsv procedure to parse predecessor strings
// like "A1010FS", "A1020SS+2", "A1030FF-1"
function parsePredecessor(part: string) {
  const match = part.trim().match(/^([A-Za-z0-9]+?)\s*(FS|FF|SS|SF)?\s*([+-]\d+)?$/);
  if (!match) return null;
  return {
    activityId: match[1],
    relType: (match[2] || "FS") as "FS" | "SS" | "FF" | "SF",
    lag: parseInt(match[3] || "0"),
  };
}

describe("Predecessor string parsing", () => {
  it("parses simple FS relationship", () => {
    const result = parsePredecessor("A1010FS");
    expect(result).toEqual({ activityId: "A1010", relType: "FS", lag: 0 });
  });

  it("parses relationship with no type (defaults to FS)", () => {
    const result = parsePredecessor("A1010");
    expect(result).toEqual({ activityId: "A1010", relType: "FS", lag: 0 });
  });

  it("parses SS relationship with positive lag", () => {
    const result = parsePredecessor("A1020SS+2");
    expect(result).toEqual({ activityId: "A1020", relType: "SS", lag: 2 });
  });

  it("parses FF relationship with negative lag", () => {
    const result = parsePredecessor("A1030FF-1");
    expect(result).toEqual({ activityId: "A1030", relType: "FF", lag: -1 });
  });

  it("parses SF relationship", () => {
    const result = parsePredecessor("B200SF");
    expect(result).toEqual({ activityId: "B200", relType: "SF", lag: 0 });
  });

  it("returns null for invalid input", () => {
    expect(parsePredecessor("")).toBeNull();
    expect(parsePredecessor("---")).toBeNull();
  });

  it("handles numeric-only activity IDs", () => {
    const result = parsePredecessor("1010FS");
    expect(result).toEqual({ activityId: "1010", relType: "FS", lag: 0 });
  });
});

// ─── CSV Row Parsing ────────────────────────────────────────────────────────
// Simulates the client-side CSV parsing logic
function parseCsvLine(line: string): string[] {
  const vals: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { vals.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  vals.push(current.trim());
  return vals;
}

describe("CSV line parsing", () => {
  it("parses simple comma-separated values", () => {
    const result = parseCsvLine("A1010,Site Survey,3,1.0,task,");
    expect(result).toEqual(["A1010", "Site Survey", "3", "1.0", "task", ""]);
  });

  it("handles quoted fields with commas", () => {
    const result = parseCsvLine('A1020,"Demolition, Site Clearing",5,1.0,task,A1010FS');
    expect(result).toEqual(["A1020", "Demolition, Site Clearing", "5", "1.0", "task", "A1010FS"]);
  });

  it("handles empty fields", () => {
    const result = parseCsvLine("A1030,Excavation,7,,task,");
    expect(result).toEqual(["A1030", "Excavation", "7", "", "task", ""]);
  });

  it("handles milestone type", () => {
    const result = parseCsvLine("M1000,Project Complete,0,,milestone,A1030FS");
    expect(result).toEqual(["M1000", "Project Complete", "0", "", "milestone", "A1030FS"]);
  });

  it("handles multiple predecessors", () => {
    const result = parseCsvLine('A1050,Foundation,"10",2.0,task,"A1030FS,A1040SS+2"');
    expect(result).toEqual(["A1050", "Foundation", "10", "2.0", "task", "A1030FS,A1040SS+2"]);
  });
});

// ─── Header Column Matching ─────────────────────────────────────────────────
function findColumnIndex(headers: string[], ...aliases: string[]): number {
  const normalized = headers.map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  return normalized.findIndex(h => aliases.includes(h));
}

describe("CSV header column matching", () => {
  it("finds Name column", () => {
    const headers = ["Activity ID", "Name", "Duration", "WBS", "Type", "Predecessors"];
    expect(findColumnIndex(headers, "name", "activityname", "description")).toBe(1);
  });

  it("finds Activity Name column", () => {
    const headers = ["ID", "Activity Name", "Dur", "WBS Code"];
    expect(findColumnIndex(headers, "name", "activityname", "description")).toBe(1);
  });

  it("finds Duration column with alias", () => {
    const headers = ["Name", "Dur", "WBS"];
    expect(findColumnIndex(headers, "duration", "dur", "days")).toBe(1);
  });

  it("finds Predecessors column with alias", () => {
    const headers = ["Name", "Duration", "Pred"];
    expect(findColumnIndex(headers, "predecessors", "predecessor", "pred", "preds")).toBe(2);
  });

  it("returns -1 for missing column", () => {
    const headers = ["Name", "Duration"];
    expect(findColumnIndex(headers, "wbs", "wbscode")).toBe(-1);
  });
});
