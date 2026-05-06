export type ScheduleFilterActivity = {
  earlyStart?: Date | string | null;
  earlyFinish?: Date | string | null;
};

export type LookaheadFilter = "none" | "1week" | "2week" | "4week";

export function parseScheduleDate(value: unknown): Date | null {
  if (!value) return null;
  const date = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getLookaheadDays(value: LookaheadFilter): number | null {
  if (value === "1week") return 7;
  if (value === "2week") return 14;
  if (value === "4week") return 28;
  return null;
}

export function activityOverlapsWindow(
  activity: ScheduleFilterActivity,
  windowStart: Date,
  windowEnd: Date
): boolean {
  const earlyStart = parseScheduleDate(activity.earlyStart);
  if (!earlyStart) return false;

  const earlyFinish = parseScheduleDate(activity.earlyFinish) ?? earlyStart;
  return earlyStart <= windowEnd && earlyFinish >= windowStart;
}

export function activityStartsInRange(
  activity: ScheduleFilterActivity,
  rangeStart?: Date | null,
  rangeEnd?: Date | null
): boolean {
  const earlyStart = parseScheduleDate(activity.earlyStart);
  if (!earlyStart) return false;
  if (rangeStart && earlyStart < rangeStart) return false;
  if (rangeEnd && earlyStart > rangeEnd) return false;
  return true;
}

export function activityFinishesInRange(
  activity: ScheduleFilterActivity,
  rangeStart?: Date | null,
  rangeEnd?: Date | null
): boolean {
  const earlyFinish = parseScheduleDate(activity.earlyFinish);
  if (!earlyFinish) return false;
  if (rangeStart && earlyFinish < rangeStart) return false;
  if (rangeEnd && earlyFinish > rangeEnd) return false;
  return true;
}
