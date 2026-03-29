/**
 * Tests for the WBS hierarchical grouping logic used in the Scheduler.
 * This validates that the depth-first tree traversal produces correct
 * nested groups with proper depth, ordering, and activity assignment.
 */
import { describe, it, expect } from "vitest";

// Reproduce the core grouping logic from Scheduler.tsx
interface WbsNode {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  sortOrder: number;
  groupColor?: string;
  groupTextColor?: string;
}

interface Activity {
  id: number;
  activityId: string;
  name: string;
  wbs: string | null;
}

interface GroupEntry {
  group: string | null;
  activities: Activity[];
  depth: number;
  wbsColor?: string;
  wbsTextColor?: string;
}

function buildWbsGroupedActivities(
  activities: Activity[],
  wbsNodes: WbsNode[]
): GroupEntry[] {
  // Build a map of WBS code -> activities
  const actsByWbs = new Map<string, Activity[]>();
  for (const act of activities) {
    const code = act.wbs || "";
    if (!actsByWbs.has(code)) actsByWbs.set(code, []);
    actsByWbs.get(code)!.push(act);
  }

  const result: GroupEntry[] = [];

  const walkTree = (parentId: number | null, depth: number) => {
    const children = wbsNodes
      .filter((n) => (n.parentId || null) === parentId)
      .sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.code.localeCompare(b.code, undefined, { numeric: true })
      );

    for (const node of children) {
      const label = `${node.code} \u2014 ${node.name}`;
      // Collect descendant codes
      const childCodes = new Set<string>();
      const collectChildCodes = (pid: number) => {
        for (const c of wbsNodes) {
          if ((c.parentId || null) === pid) {
            childCodes.add(c.code);
            collectChildCodes(c.id);
          }
        }
      };
      collectChildCodes(node.id);

      // Activities for this node only (not descendants)
      const directActs = (actsByWbs.get(node.code) || []).filter(
        (a) => !childCodes.has(a.wbs || "")
      );

      const hasDescendantActs = Array.from(childCodes).some(
        (code) => (actsByWbs.get(code) || []).length > 0
      );

      if (directActs.length > 0 || hasDescendantActs) {
        result.push({
          group: label,
          activities: directActs,
          depth,
          wbsColor: node.groupColor || undefined,
          wbsTextColor: node.groupTextColor || undefined,
        });
      }

      walkTree(node.id, depth + 1);
    }
  };

  walkTree(null, 0);

  // Add "No WBS" group for unassigned activities
  const noWbsActs = actsByWbs.get("") || [];
  if (noWbsActs.length > 0) {
    result.push({ group: "No WBS", activities: noWbsActs, depth: 0 });
  }

  return result;
}

describe("WBS Hierarchical Grouping", () => {
  const wbsNodes: WbsNode[] = [
    { id: 1, code: "1.0", name: "Smith Residence", parentId: null, sortOrder: 0, groupColor: "#3B82F6", groupTextColor: "#FFFFFF" },
    { id: 2, code: "1.1", name: "General Conditions", parentId: 1, sortOrder: 0 },
    { id: 4, code: "2.0", name: "Construction", parentId: 1, sortOrder: 1, groupColor: "#10B981" },
    { id: 6, code: "2.1", name: "Sitework", parentId: 4, sortOrder: 0 },
  ];

  const activities: Activity[] = [
    { id: 1, activityId: "A1000", name: "Mobilization", wbs: "1.1" },
    { id: 2, activityId: "A1010", name: "Permits", wbs: "1.1" },
    { id: 3, activityId: "A2000", name: "Excavation", wbs: "2.1" },
    { id: 4, activityId: "A2010", name: "Grading", wbs: "2.1" },
    { id: 5, activityId: "A1500", name: "Project Kickoff", wbs: "1.0" },
  ];

  it("should produce groups in depth-first tree order", () => {
    const groups = buildWbsGroupedActivities(activities, wbsNodes);
    const groupLabels = groups.map((g) => g.group);
    expect(groupLabels).toEqual([
      "1.0 \u2014 Smith Residence",
      "1.1 \u2014 General Conditions",
      "2.0 \u2014 Construction",
      "2.1 \u2014 Sitework",
    ]);
  });

  it("should assign correct depth levels", () => {
    const groups = buildWbsGroupedActivities(activities, wbsNodes);
    const depths = groups.map((g) => ({ group: g.group, depth: g.depth }));
    expect(depths).toEqual([
      { group: "1.0 \u2014 Smith Residence", depth: 0 },
      { group: "1.1 \u2014 General Conditions", depth: 1 },
      { group: "2.0 \u2014 Construction", depth: 1 },
      { group: "2.1 \u2014 Sitework", depth: 2 },
    ]);
  });

  it("should assign activities to their direct WBS group only", () => {
    const groups = buildWbsGroupedActivities(activities, wbsNodes);
    // "1.0 — Smith Residence" should only have "Project Kickoff" (directly assigned to 1.0)
    const root = groups.find((g) => g.group?.startsWith("1.0"));
    expect(root?.activities.map((a) => a.activityId)).toEqual(["A1500"]);

    // "1.1 — General Conditions" should have Mobilization and Permits
    const gc = groups.find((g) => g.group?.startsWith("1.1"));
    expect(gc?.activities.map((a) => a.activityId)).toEqual(["A1000", "A1010"]);

    // "2.0 — Construction" should have NO direct activities (all are in 2.1)
    const construction = groups.find((g) => g.group?.startsWith("2.0"));
    expect(construction?.activities).toEqual([]);

    // "2.1 — Sitework" should have Excavation and Grading
    const sitework = groups.find((g) => g.group?.startsWith("2.1"));
    expect(sitework?.activities.map((a) => a.activityId)).toEqual(["A2000", "A2010"]);
  });

  it("should propagate custom colors from WBS nodes", () => {
    const groups = buildWbsGroupedActivities(activities, wbsNodes);
    const root = groups.find((g) => g.group?.startsWith("1.0"));
    expect(root?.wbsColor).toBe("#3B82F6");
    expect(root?.wbsTextColor).toBe("#FFFFFF");

    const construction = groups.find((g) => g.group?.startsWith("2.0"));
    expect(construction?.wbsColor).toBe("#10B981");
  });

  it("should add 'No WBS' group for unassigned activities", () => {
    const actsWithUnassigned = [
      ...activities,
      { id: 10, activityId: "A9999", name: "Unassigned Task", wbs: null },
    ];
    const groups = buildWbsGroupedActivities(actsWithUnassigned, wbsNodes);
    const noWbs = groups.find((g) => g.group === "No WBS");
    expect(noWbs).toBeDefined();
    expect(noWbs?.activities.length).toBe(1);
    expect(noWbs?.activities[0].activityId).toBe("A9999");
    expect(noWbs?.depth).toBe(0);
  });

  it("should not create groups for WBS nodes with no activities or descendants", () => {
    const emptyWbs: WbsNode[] = [
      { id: 1, code: "1.0", name: "Root", parentId: null, sortOrder: 0 },
      { id: 2, code: "1.1", name: "Empty Child", parentId: 1, sortOrder: 0 },
      { id: 3, code: "2.0", name: "Has Activities", parentId: null, sortOrder: 1 },
    ];
    const acts: Activity[] = [
      { id: 1, activityId: "A100", name: "Task A", wbs: "2.0" },
    ];
    const groups = buildWbsGroupedActivities(acts, emptyWbs);
    // "1.0 Root" and "1.1 Empty Child" should NOT appear (no activities)
    expect(groups.map((g) => g.group)).toEqual(["2.0 \u2014 Has Activities"]);
  });

  it("should handle deep nesting (3+ levels)", () => {
    const deepWbs: WbsNode[] = [
      { id: 1, code: "1.0", name: "Project", parentId: null, sortOrder: 0 },
      { id: 2, code: "1.1", name: "Phase 1", parentId: 1, sortOrder: 0 },
      { id: 3, code: "1.1.1", name: "Sub-Phase A", parentId: 2, sortOrder: 0 },
      { id: 4, code: "1.1.1.1", name: "Detail Work", parentId: 3, sortOrder: 0 },
    ];
    const acts: Activity[] = [
      { id: 1, activityId: "A1", name: "Deep Task", wbs: "1.1.1.1" },
    ];
    const groups = buildWbsGroupedActivities(acts, deepWbs);
    expect(groups.map((g) => ({ label: g.group, depth: g.depth }))).toEqual([
      { label: "1.0 \u2014 Project", depth: 0 },
      { label: "1.1 \u2014 Phase 1", depth: 1 },
      { label: "1.1.1 \u2014 Sub-Phase A", depth: 2 },
      { label: "1.1.1.1 \u2014 Detail Work", depth: 3 },
    ]);
  });

  it("should sort siblings by sortOrder then by code", () => {
    const sortedWbs: WbsNode[] = [
      { id: 1, code: "A", name: "Alpha", parentId: null, sortOrder: 2 },
      { id: 2, code: "B", name: "Beta", parentId: null, sortOrder: 1 },
      { id: 3, code: "C", name: "Charlie", parentId: null, sortOrder: 1 },
    ];
    const acts: Activity[] = [
      { id: 1, activityId: "T1", name: "Task 1", wbs: "A" },
      { id: 2, activityId: "T2", name: "Task 2", wbs: "B" },
      { id: 3, activityId: "T3", name: "Task 3", wbs: "C" },
    ];
    const groups = buildWbsGroupedActivities(acts, sortedWbs);
    // B and C have sortOrder=1 (sorted by code), A has sortOrder=2
    expect(groups.map((g) => g.group)).toEqual([
      "B \u2014 Beta",
      "C \u2014 Charlie",
      "A \u2014 Alpha",
    ]);
  });
});
