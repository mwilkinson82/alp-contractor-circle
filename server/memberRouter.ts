/**
 * Member-specific tRPC router for the Contracting Circle portal.
 * Uses Discord session (member_session cookie) instead of Manus auth.
 */
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { stripe } from "./stripe";
import { drizzle } from "drizzle-orm/mysql2";
import { desc, eq } from "drizzle-orm";
import { replays, members } from "../drizzle/schema";
import type { Member } from "../drizzle/schema";
import { z } from "zod";

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
        plan: "The Contracting Circle",
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
        plan: "The Contracting Circle",
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
        plan: "The Contracting Circle",
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
          description: charge.description || "The Contracting Circle",
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
