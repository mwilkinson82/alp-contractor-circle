import { describe, expect, it } from "vitest";
import {
  activityOverlapsWindow,
  activityStartsInRange,
  getLookaheadDays,
} from "../shared/schedulerFilters";

describe("scheduler filters", () => {
  const dataDate = new Date("2026-03-01T00:00:00");
  const oneWeekOut = new Date("2026-03-08T23:59:59");

  it("includes activities that start inside the lookahead window", () => {
    expect(activityOverlapsWindow({
      earlyStart: "2026-03-04",
      earlyFinish: "2026-03-06",
    }, dataDate, oneWeekOut)).toBe(true);
  });

  it("includes in-progress activities that overlap the data date", () => {
    expect(activityOverlapsWindow({
      earlyStart: "2026-02-24",
      earlyFinish: "2026-03-03",
    }, dataDate, oneWeekOut)).toBe(true);
  });

  it("excludes finished activities before the lookahead window", () => {
    expect(activityOverlapsWindow({
      earlyStart: "2026-02-20",
      earlyFinish: "2026-02-28",
    }, dataDate, oneWeekOut)).toBe(false);
  });

  it("excludes future activities that start after the lookahead window", () => {
    expect(activityOverlapsWindow({
      earlyStart: "2026-03-10",
      earlyFinish: "2026-03-12",
    }, dataDate, oneWeekOut)).toBe(false);
  });

  it("uses early start for both start-date boundaries", () => {
    const rangeStart = new Date("2026-03-05T00:00:00");
    const rangeEnd = new Date("2026-03-07T23:59:59");

    expect(activityStartsInRange({
      earlyStart: "2026-03-06",
      earlyFinish: "2026-03-20",
    }, rangeStart, rangeEnd)).toBe(true);

    expect(activityStartsInRange({
      earlyStart: "2026-03-08",
      earlyFinish: "2026-03-08",
    }, rangeStart, rangeEnd)).toBe(false);
  });

  it("maps lookahead choices to calendar-day windows", () => {
    expect(getLookaheadDays("1week")).toBe(7);
    expect(getLookaheadDays("2week")).toBe(14);
    expect(getLookaheadDays("4week")).toBe(28);
    expect(getLookaheadDays("none")).toBeNull();
  });
});
