/**
 * User Activity Log DB helpers — records user actions for the admin activity feed.
 * Provides fire-and-forget logging and paginated retrieval for the admin panel.
 */
import { getDb } from "./db";
import { userActivityLog } from "../drizzle/schema";
import { desc, sql } from "drizzle-orm";

/**
 * Log a user action. Fire-and-forget — errors are swallowed silently.
 */
export async function logActivity(
  memberId: number,
  displayName: string | null,
  action: string,
  description: string,
  refPath?: string | null
): Promise<void> {
  try {
    const d = await getDb();
    if (!d) return;
    await d.insert(userActivityLog).values({
      memberId,
      displayName,
      action,
      description,
      refPath: refPath ?? null,
    });
  } catch (err) {
    // Swallow — activity logging should never break the main flow
    console.warn("[ActivityLog] Failed to log:", err);
  }
}

/**
 * Get recent activity entries for the admin feed.
 */
export async function getRecentActivity(limit = 50) {
  const d = await getDb();
  if (!d) return [];
  return d
    .select()
    .from(userActivityLog)
    .orderBy(desc(userActivityLog.createdAt))
    .limit(limit);
}

/**
 * Prune old activity logs (older than 30 days) to keep the table lean.
 */
export async function pruneOldActivity(): Promise<number> {
  const d = await getDb();
  if (!d) return 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await d
    .delete(userActivityLog)
    .where(sql`${userActivityLog.createdAt} < ${thirtyDaysAgo}`);
  return (result as any)[0]?.affectedRows ?? 0;
}
