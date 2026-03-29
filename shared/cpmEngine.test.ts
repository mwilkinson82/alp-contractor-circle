import { describe, it, expect } from "vitest";
import { calculateCPM, type CpmActivity, type CpmRelationship, type CpmCalendar } from "./cpmEngine";

function makeCalendar(): Map<number, CpmCalendar> {
  const cal: CpmCalendar = {
    id: 1,
    workDays: [false, true, true, true, true, true, false], // Mon-Fri
    exceptions: new Map(),
  };
  return new Map([[1, cal]]);
}

describe("CPM Engine - Longest Path", () => {
  it("should identify the longest path through a simple linear schedule", () => {
    const activities: CpmActivity[] = [
      { id: 1, duration: 5, calendarId: 1 },
      { id: 2, duration: 10, calendarId: 1 },
      { id: 3, duration: 3, calendarId: 1 },
    ];
    const relationships: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
      { predecessorId: 2, successorId: 3, relationshipType: "FS", lagDays: 0 },
    ];

    const result = calculateCPM(activities, relationships, new Date("2026-03-30"), makeCalendar(), 1);

    expect(result.longestPath).toBeDefined();
    expect(result.longestPath.length).toBe(3);
    // All activities should be on the longest path in a linear schedule
    expect(result.longestPath).toContain(1);
    expect(result.longestPath).toContain(2);
    expect(result.longestPath).toContain(3);

    // All should be marked isOnLongestPath
    for (const [, r] of Array.from(result.results.entries())) {
      expect(r.isOnLongestPath).toBe(true);
    }
  });

  it("should identify the longest path when there are parallel paths", () => {
    // Path A: 1 -> 2 (5d) -> 4 (3d) = 8 days total from act 1
    // Path B: 1 -> 3 (10d) -> 4 (3d) = 13 days total from act 1
    // Longest path should follow Path B (1 -> 3 -> 4)
    const activities: CpmActivity[] = [
      { id: 1, duration: 2, calendarId: 1 },
      { id: 2, duration: 5, calendarId: 1 },
      { id: 3, duration: 10, calendarId: 1 },
      { id: 4, duration: 3, calendarId: 1 },
    ];
    const relationships: CpmRelationship[] = [
      { predecessorId: 1, successorId: 2, relationshipType: "FS", lagDays: 0 },
      { predecessorId: 1, successorId: 3, relationshipType: "FS", lagDays: 0 },
      { predecessorId: 2, successorId: 4, relationshipType: "FS", lagDays: 0 },
      { predecessorId: 3, successorId: 4, relationshipType: "FS", lagDays: 0 },
    ];

    const result = calculateCPM(activities, relationships, new Date("2026-03-30"), makeCalendar(), 1);

    expect(result.longestPath).toBeDefined();
    // The longest path should include activity 3 (the longer parallel branch)
    expect(result.longestPath).toContain(3);
    // Activity 3 should be on longest path
    expect(result.results.get(3)?.isOnLongestPath).toBe(true);
    // Activity 4 (terminal) should be on longest path
    expect(result.results.get(4)?.isOnLongestPath).toBe(true);
  });

  it("should return empty longest path for empty schedule", () => {
    const result = calculateCPM([], [], new Date("2026-03-30"), makeCalendar(), 1);
    expect(result.longestPath).toEqual([]);
  });

  it("should handle single activity schedule", () => {
    const activities: CpmActivity[] = [
      { id: 1, duration: 5, calendarId: 1 },
    ];

    const result = calculateCPM(activities, [], new Date("2026-03-30"), makeCalendar(), 1);

    expect(result.longestPath.length).toBe(1);
    expect(result.longestPath[0]).toBe(1);
    expect(result.results.get(1)?.isOnLongestPath).toBe(true);
  });
});
