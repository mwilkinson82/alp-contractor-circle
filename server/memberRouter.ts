/**
 * Member-specific tRPC router for the Contractor Circle portal.
 * Uses Discord session (member_session cookie) instead of Manus auth.
 */
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { stripe } from "./stripe";
import { drizzle } from "drizzle-orm/mysql2";
import { desc, eq } from "drizzle-orm";
import { replays, members, callQuestions } from "../drizzle/schema";
import type { Member } from "../drizzle/schema";
import { z } from "zod";
import { sendQuestionNotification } from "./email";

let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

/**
 * Middleware that extracts the member from the Discord session cookie.
 * Returns null if not authenticated (for public queries).
 */
async function getMemberFromRequest(req: any): Promise<Member | null> {
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (!session) return null;
  const member = await getMemberById(session.memberId);
  return member || null;
}

export const memberRouter = router({
  /**
   * Get current member info from Discord session.
   */
  me: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) return null;

    const avatarUrl = member.discordAvatar
      ? `https://cdn.discordapp.com/avatars/${member.discordId}/${member.discordAvatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(member.discordId) % 5}.png`;

    return {
      id: member.id,
      discordId: member.discordId,
      discordUsername: member.discordUsername,
      displayName: member.discordDisplayName || member.discordUsername,
      avatarUrl,
      email: member.email,
      subscriptionStatus: member.subscriptionStatus,
      memberRole: member.memberRole,
      createdAt: member.createdAt,
    };
  }),

  /**
   * Get subscription details from Stripe for the current member.
   */
  subscription: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }

    if (!member.stripeSubscriptionId || !stripe) {
      return {
        status: member.subscriptionStatus || "none",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: "The Contractor Circle",
        amount: 497_00,
        currency: "usd",
        interval: "month",
      };
    }

    try {
      const sub = await stripe.subscriptions.retrieve(member.stripeSubscriptionId) as any;
      const price = sub.items?.data?.[0]?.price;

      return {
        status: sub.status,
        currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
        cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
        plan: "The Contractor Circle",
        amount: price?.unit_amount || 497_00,
        currency: price?.currency || "usd",
        interval: (price?.recurring?.interval as string) || "month",
      };
    } catch (err) {
      console.warn("[Member] Failed to fetch subscription:", err);
      return {
        status: member.subscriptionStatus || "none",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        plan: "The Contractor Circle",
        amount: 497_00,
        currency: "usd",
        interval: "month",
      };
    }
  }),

  /**
   * Get all published replays from the database (Cloudflare Stream videos).
   * Returns replays ordered by call date descending.
   */
  replays: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }

    const db = getDb();
    if (!db) return { replays: [] };

    const rows = await db
      .select()
      .from(replays)
      .where(eq(replays.published, true))
      .orderBy(desc(replays.callDate));

    return {
      replays: rows.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        cloudflareStreamId: r.cloudflareStreamId,
        duration: r.duration,
        callDate: r.callDate,
        featured: r.featured,
        // Cloudflare Stream embed and thumbnail URLs
        embedUrl: `https://iframe.videodelivery.net/${r.cloudflareStreamId}`,
        thumbnailUrl: `https://videodelivery.net/${r.cloudflareStreamId}/thumbnails/thumbnail.jpg`,
      })),
    };
  }),

  /**
   * Admin: Add a new replay (Cloudflare Stream video).
   * Only accessible to members with memberRole === 'admin'.
   */
  addReplay: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(["weekly_calls", "bootcamp", "masterclass", "q_and_a"]),
        cloudflareStreamId: z.string().min(1),
        duration: z.string().optional(),
        callDate: z.date(),
        featured: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      if (member.memberRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not configured" });

      await db.insert(replays).values({
        title: input.title,
        description: input.description,
        category: input.category,
        cloudflareStreamId: input.cloudflareStreamId,
        duration: input.duration,
        callDate: input.callDate,
        featured: input.featured,
        published: true,
      });

      return { success: true };
    }),

  /**
   * Admin: Delete a replay.
   */
  deleteReplay: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      if (member.memberRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not configured" });

      await db.delete(replays).where(eq(replays.id, input.id));
      return { success: true };
    }),

  /**
   * Public: Get count of active members (for social proof on landing page).
   */
  count: publicProcedure.query(async () => {
    const db = getDb();
    if (!db) return { count: 0 };
    const rows = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.subscriptionStatus, "active"));
    return { count: rows.length };
  }),

  /**
   * Submit a question for the next bi-weekly call.
   */
  submitQuestion: publicProcedure
    .input(
      z.object({
        question: z.string().min(10).max(1000),
        context: z.string().max(2000).optional(),
        callCycle: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not configured" });
      await db.insert(callQuestions).values({
        memberId: member.id,
        question: input.question,
        context: input.context,
        callCycle: input.callCycle,
        status: "pending",
      });

      // Send email notification to Marshall
      sendQuestionNotification({
        memberName: member.discordUsername || member.email || "A member",
        question: input.question,
        context: input.context ?? undefined,
        callCycle: input.callCycle ?? undefined,
      }).catch((err) => console.error("[Email] Question notification failed:", err));

      return { success: true };
    }),

  /**
   * Get questions submitted by the current member.
   */
  myQuestions: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }
    const db = getDb();
    if (!db) return { questions: [] };
    const rows = await db
      .select()
      .from(callQuestions)
      .where(eq(callQuestions.memberId, member.id))
      .orderBy(desc(callQuestions.createdAt));
    return { questions: rows };
  }),

  /**
   * Admin: Get all questions with member info for review.
   */
  adminQuestions: publicProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      if (member.memberRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = getDb();
      if (!db) return { questions: [] };
      const rows = await db
        .select({
          id: callQuestions.id,
          memberId: callQuestions.memberId,
          question: callQuestions.question,
          context: callQuestions.context,
          status: callQuestions.status,
          adminNotes: callQuestions.adminNotes,
          callCycle: callQuestions.callCycle,
          createdAt: callQuestions.createdAt,
          memberName: members.discordDisplayName,
          memberUsername: members.discordUsername,
        })
        .from(callQuestions)
        .leftJoin(members, eq(callQuestions.memberId, members.id))
        .orderBy(desc(callQuestions.createdAt));
      return { questions: rows };
    }),

  /**
   * Admin: Update question status.
   */
  updateQuestionStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "selected_for_call", "selected_for_bootcamp", "answered", "archived"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      if (member.memberRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not configured" });
      await db
        .update(callQuestions)
        .set({ status: input.status, adminNotes: input.adminNotes })
        .where(eq(callQuestions.id, input.id));
      return { success: true };
    }),

  /**
   * Get payment history from Stripe for the current member.
   */
  payments: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }

    if (!member.stripeCustomerId || !stripe) {
      return { payments: [] };
    }

    try {
      const charges = await stripe.charges.list({
        customer: member.stripeCustomerId,
        limit: 20,
      });

      return {
        payments: charges.data.map(charge => ({
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          description: charge.description || "The Contractor Circle",
          createdAt: new Date(charge.created * 1000),
          receiptUrl: charge.receipt_url,
        })),
      };
    } catch (err) {
      console.warn("[Member] Failed to fetch payments:", err);
      return { payments: [] };
    }
  }),
});
