/**
 * User Presence DB helpers — heartbeat-based online tracking.
 * Users send a heartbeat every 30s; anyone not seen in 2 minutes is considered offline.
 */
import { getDb } from "./db";
import { userPresence } from "../drizzle/schema";
import { eq, gte, sql } from "drizzle-orm";

export const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Upsert a heartbeat for a member — creates or updates their presence row.
 */
export async function upsertHeartbeat(
  memberId: number,
  displayName: string | null,
  currentPage: string | null
): Promise<void> {
  const d = await getDb();
  if (!d) return;
  const existing = await d
    .select()
    .from(userPresence)
    .where(eq(userPresence.memberId, memberId))
    .limit(1);

  if (existing.length > 0) {
    await d
      .update(userPresence)
      .set({
        displayName: displayName || existing[0].displayName,
        currentPage: currentPage || existing[0].currentPage,
        lastSeen: new Date(),
      })
      .where(eq(userPresence.memberId, memberId));
  } else {
    await d.insert(userPresence).values({
      memberId,
      displayName,
      currentPage,
      lastSeen: new Date(),
      sessionStart: new Date(),
    });
  }
}

/**
 * Get all currently online users (seen within the last 2 minutes).
 */
export async function getOnlineUsers() {
  const d = await getDb();
  if (!d) return [];
  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MS);
  return d
    .select()
    .from(userPresence)
    .where(gte(userPresence.lastSeen, threshold));
}

/**
 * Remove a member's presence row (on explicit logout).
 */
export async function removePresence(memberId: number): Promise<void> {
  const d = await getDb();
  if (!d) return;
  await d.delete(userPresence).where(eq(userPresence.memberId, memberId));
}

/**
 * Clean up stale presence rows (older than 10 minutes).
 */
export async function cleanupStalePresence(): Promise<number> {
  const d = await getDb();
  if (!d) return 0;
  const result = await d
    .delete(userPresence)
    .where(sql`${userPresence.lastSeen} < ${new Date(Date.now() - 10 * 60 * 1000)}`);
  return (result as any)[0]?.affectedRows ?? 0;
}
