/**
 * Presence Router — heartbeat-based online user tracking.
 *
 * Frontend sends a heartbeat every 30s with current page.
 * Admin panel can query who's online and what they're doing.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { upsertHeartbeat, getOnlineUsers, removePresence, cleanupStalePresence } from "./presenceDb";
import { TRPCError } from "@trpc/server";

export const presenceRouter = router({
  /**
   * Heartbeat — called every 30s by the frontend.
   * Upserts the user's presence row with current page.
   */
  heartbeat: publicProcedure
    .input(
      z.object({
        currentPage: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) return { ok: false };
      const memberId = (user as any).memberId ?? (user as any).id;
      const displayName = (user as any).discordDisplayName || (user as any).discordUsername || (user as any).name || "Unknown";
      await upsertHeartbeat(memberId, displayName, input.currentPage ?? null);
      return { ok: true };
    }),

  /**
   * Get all currently online users — admin only.
   */
  getOnlineUsers: publicProcedure.query(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    // Allow any authenticated user to see online count, but only admin sees details
    const isAdmin = (user as any).role === "admin" || (user as any).memberRole === "admin";
    const onlineUsers = await getOnlineUsers();

    if (isAdmin) {
      return {
        count: onlineUsers.length,
        users: onlineUsers.map((u) => ({
          memberId: u.memberId,
          displayName: u.displayName,
          currentPage: u.currentPage,
          lastSeen: u.lastSeen,
          sessionStart: u.sessionStart,
        })),
      };
    }

    // Non-admin: just the count
    return {
      count: onlineUsers.length,
      users: [] as any[],
    };
  }),

  /**
   * Remove presence on explicit logout.
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    const user = ctx.user;
    if (!user) return { ok: false };
    const memberId = (user as any).memberId ?? (user as any).id;
    await removePresence(memberId);
    return { ok: true };
  }),
});
