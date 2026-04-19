/**
 * Presence Router — heartbeat-based online user tracking.
 *
 * Frontend sends a heartbeat every 30s with current page.
 * Admin panel can query who's online and what they're doing.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { upsertHeartbeat, getOnlineUsers, removePresence, cleanupStalePresence } from "./presenceDb";
import { logActivity, getRecentActivity } from "./activityLogDb";
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
        /** If true, this is the first heartbeat after a page change — log it */
        isPageChange: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) return { ok: false };
      const memberId = (user as any).memberId ?? (user as any).id;
      const displayName = (user as any).discordDisplayName || (user as any).discordUsername || (user as any).name || "Unknown";
      await upsertHeartbeat(memberId, displayName, input.currentPage ?? null);
      // Log page visit on navigation (not every heartbeat)
      if (input.isPageChange && input.currentPage) {
        logActivity(memberId, displayName, "page_visit", `navigated to ${input.currentPage}`, input.currentPage);
      }
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
   * Log a user action — called from frontend on key events.
   */
  logActivity: publicProcedure
    .input(
      z.object({
        action: z.string().max(128),
        description: z.string().max(512),
        refPath: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) return { ok: false };
      const memberId = (user as any).memberId ?? (user as any).id;
      const displayName = (user as any).discordDisplayName || (user as any).discordUsername || (user as any).name || "Unknown";
      await logActivity(memberId, displayName, input.action, input.description, input.refPath);
      return { ok: true };
    }),

  /**
   * Get recent activity feed — admin only.
   */
  getRecentActivity: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
      const isAdmin = (user as any).role === "admin" || (user as any).memberRole === "admin";
      if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN" });
      const entries = await getRecentActivity(input?.limit ?? 50);
      return entries;
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
