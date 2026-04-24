/**
 * Member-specific tRPC router for the Contractor Circle portal.
 * Uses Discord session (member_session cookie) instead of Manus auth.
 */
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { stripe } from "./stripe";
import { drizzle } from "drizzle-orm/mysql2";
import { and, desc, eq } from "drizzle-orm";
import { replays, members, callQuestions, bootcampTopics } from "../drizzle/schema";
import type { Member } from "../drizzle/schema";
import { z } from "zod";
import { sendQuestionNotification, sendBootcampTopicNotification, sendTopicSelectedEmail } from "./email";
import { emailSubscribers, webhookEvents } from "../drizzle/schema";
import { upsertMemberByEmail } from "./memberDb";
import { storagePut } from "./storage";

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
      companyName: member.companyName,
      companyLogo: member.companyLogo,
      cpmOnboardingDone: member.cpmOnboardingDone,
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
   * Admin: Get all email subscribers.
   */
  adminSubscribers: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }
    if (member.memberRole !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = getDb();
    if (!db) return { subscribers: [] };

    try {
      const rows = await db
        .select()
        .from(emailSubscribers)
        .orderBy(desc(emailSubscribers.createdAt));

      return {
        subscribers: rows.map(row => ({
          id: row.id,
          email: row.email,
          source: row.source,
          verified: row.verified,
          createdAt: row.createdAt,
        })),
      };
    } catch (err) {
      console.warn("[Member] Failed to fetch subscribers:", err);
      return { subscribers: [] };
    }
  }),

  /**
   * Cancel the current member's subscription at period end.
   */
  cancelSubscription: publicProcedure.mutation(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }
    if (!member.stripeSubscriptionId || !stripe) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
    }

    try {
      const sub = await stripe.subscriptions.update(member.stripeSubscriptionId, {
        cancel_at_period_end: true,
      }) as any;
      return {
        success: true,
        cancelAtPeriodEnd: true,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
      };
    } catch (err: any) {
      console.error("[Member] Failed to cancel subscription:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to cancel subscription. Please try again or contact support.",
      });
    }
  }),

  /**
   * Reactivate a subscription that was set to cancel at period end.
   */
  reactivateSubscription: publicProcedure.mutation(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }
    if (!member.stripeSubscriptionId || !stripe) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
    }

    try {
      const sub = await stripe.subscriptions.update(member.stripeSubscriptionId, {
        cancel_at_period_end: false,
      }) as any;
      return {
        success: true,
        cancelAtPeriodEnd: false,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null,
      };
    } catch (err: any) {
      console.error("[Member] Failed to reactivate subscription:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reactivate subscription. Please try again or contact support.",
      });
    }
  }),

  /**
   * Admin: Get all members with subscription and Discord status.
   */
  adminMembers: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }
    if (member.memberRole !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = getDb();
    if (!db) return { members: [] };

    const rows = await db
      .select()
      .from(members)
      .orderBy(desc(members.createdAt));

    return {
      members: rows.map(m => ({
        id: m.id,
        discordId: m.discordId,
        discordUsername: m.discordUsername,
        displayName: m.discordDisplayName || m.discordUsername,
        email: m.email,
        subscriptionStatus: m.subscriptionStatus,
        memberRole: m.memberRole,
        stripeCustomerId: m.stripeCustomerId,
        stripeSubscriptionId: m.stripeSubscriptionId,
        hasDiscord: !m.discordId?.startsWith("email:"),
        avatarUrl: m.discordAvatar
          ? `https://cdn.discordapp.com/avatars/${m.discordId}/${m.discordAvatar}.png?size=64`
          : null,
        createdAt: m.createdAt,
        lastSignedIn: m.lastSignedIn,
      })),
    };
  }),

  /**
   * Create a Stripe Customer Portal session for the current member to manage billing.
   */
  createBillingPortal: publicProcedure.mutation(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }
    if (!member.stripeCustomerId || !stripe) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe customer found. If you were granted access manually, billing management is not available." });
    }

    try {
      const origin = ctx.req.headers.origin || "https://alpcontractorcircle.com";
      const session = await stripe.billingPortal.sessions.create({
        customer: member.stripeCustomerId,
        return_url: `${origin}/portal/account`,
      });
      return { url: session.url };
    } catch (err: any) {
      console.error("[Member] Failed to create billing portal session:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to open billing portal. Please try again.",
      });
    }
  }),

  /**
   * Admin: Get analytics data — paying vs comped breakdown, MRR, growth.
   */
  adminAnalytics: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }
    if (member.memberRole !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    const db = getDb();
    if (!db) return { paying: 0, comped: 0, total: 0, mrr: 0, members: [] };

    const allMembers = await db
      .select({
        id: members.id,
        displayName: members.discordDisplayName,
        username: members.discordUsername,
        email: members.email,
        subscriptionStatus: members.subscriptionStatus,
        stripeCustomerId: members.stripeCustomerId,
        stripeSubscriptionId: members.stripeSubscriptionId,
        memberRole: members.memberRole,
        createdAt: members.createdAt,
      })
      .from(members)
      .where(eq(members.subscriptionStatus, "active"))
      .orderBy(desc(members.createdAt));

    const paying = allMembers.filter(m => m.stripeCustomerId && m.stripeSubscriptionId);
    const comped = allMembers.filter(m => !m.stripeCustomerId || !m.stripeSubscriptionId);

    // MRR = paying members * $497/mo
    const mrr = paying.length * 497;

    // Try to get Stripe balance/revenue if available
    let totalCollected = 0;
    if (stripe) {
      try {
        const balance = await stripe.balance.retrieve();
        const usdAvailable = balance.available.find(b => b.currency === "usd");
        const usdPending = balance.pending.find(b => b.currency === "usd");
        totalCollected = ((usdAvailable?.amount || 0) + (usdPending?.amount || 0));
      } catch (err) {
        console.warn("[Analytics] Failed to fetch Stripe balance:", err);
      }
    }

    return {
      paying: paying.length,
      comped: comped.length,
      total: allMembers.length,
      mrr,
      totalCollected,
      members: allMembers.map(m => ({
        id: m.id,
        name: m.displayName || m.username || m.email || "Unknown",
        email: m.email,
        type: (m.stripeCustomerId && m.stripeSubscriptionId) ? "paying" as const : "comped" as const,
        joinedAt: m.createdAt,
      })),
    };
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

  // ─── Bootcamp Topics ──────────────────────────────────────────────────────

  /**
   * Submit a bootcamp topic suggestion.
   */
  submitBootcampTopic: publicProcedure
    .input(z.object({
      topic: z.string().min(5).max(512),
      reason: z.string().max(2000).optional(),
      bootcampDate: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      if (member.subscriptionStatus !== "active" && member.subscriptionStatus !== "trialing") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Active subscription required" });
      }

      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.insert(bootcampTopics).values({
        memberId: member.id,
        topic: input.topic,
        reason: input.reason || null,
        bootcampDate: input.bootcampDate,
      });

      // Notify Marshall about the new topic submission
      sendBootcampTopicNotification({
        memberName: (member as any).discordDisplayName || member.discordUsername || "A member",
        topic: input.topic,
        reason: input.reason || undefined,
        bootcampDate: input.bootcampDate,
      }).catch(err => console.error("[Email] Failed to send bootcamp topic notification:", err));

      return { success: true };
    }),

  /**
   * Get the current member's submitted bootcamp topics.
   */
  myBootcampTopics: publicProcedure.query(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
    }

    const db = getDb();
    if (!db) return { topics: [] };

    const rows = await db
      .select()
      .from(bootcampTopics)
      .where(eq(bootcampTopics.memberId, member.id))
      .orderBy(desc(bootcampTopics.createdAt));

    return { topics: rows };
  }),

  /**
   * Admin: Get all bootcamp topic submissions for a given date.
   */
  adminBootcampTopics: publicProcedure
    .input(z.object({ bootcampDate: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      if (member.memberRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = getDb();
      if (!db) return { topics: [] };

      let query = db
        .select({
          id: bootcampTopics.id,
          memberId: bootcampTopics.memberId,
          topic: bootcampTopics.topic,
          reason: bootcampTopics.reason,
          bootcampDate: bootcampTopics.bootcampDate,
          status: bootcampTopics.status,
          createdAt: bootcampTopics.createdAt,
          memberName: members.discordDisplayName,
          memberUsername: members.discordUsername,
        })
        .from(bootcampTopics)
        .leftJoin(members, eq(bootcampTopics.memberId, members.id))
        .orderBy(desc(bootcampTopics.createdAt));

      if (input?.bootcampDate) {
        query = query.where(eq(bootcampTopics.bootcampDate, input.bootcampDate)) as typeof query;
      }

      const rows = await query;
      return { topics: rows };
    }),

  /**
   * Admin: Update a bootcamp topic status (select/deselect).
   */
  updateBootcampTopicStatus: publicProcedure
    .input(z.object({
      topicId: z.number(),
      status: z.enum(["submitted", "selected", "not_selected"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      if (member.memberRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db
        .update(bootcampTopics)
        .set({ status: input.status })
        .where(eq(bootcampTopics.id, input.topicId));

      // If topic was selected, email the member who submitted it
      if (input.status === "selected") {
        const [topicRow] = await db
          .select({
            topic: bootcampTopics.topic,
            bootcampDate: bootcampTopics.bootcampDate,
            memberId: bootcampTopics.memberId,
          })
          .from(bootcampTopics)
          .where(eq(bootcampTopics.id, input.topicId));

        if (topicRow) {
          const [submitter] = await db
            .select({
              email: members.email,
              displayName: members.discordDisplayName,
              username: members.discordUsername,
            })
            .from(members)
            .where(eq(members.id, topicRow.memberId));

          if (submitter?.email) {
            const name = submitter.displayName || submitter.username || "Member";
            const firstName = name.split(/[\s_]/)[0];
            sendTopicSelectedEmail({
              to: submitter.email,
              name: firstName,
              topic: topicRow.topic,
              bootcampDate: topicRow.bootcampDate,
            }).catch(err => console.error("[Email] Failed to send topic selected notification:", err));
          }
        }
      }

      return { success: true };
    }),

  /**
   * Update the current member's profile (company name, etc.).
   */
  updateProfile: publicProcedure
    .input(
      z.object({
        companyName: z.string().max(255).optional(),
        companyLogo: z.string().max(512).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not configured" });

      const updates: Record<string, any> = {};
      if (input.companyName !== undefined) updates.companyName = input.companyName;
      if (input.companyLogo !== undefined) updates.companyLogo = input.companyLogo;

      if (Object.keys(updates).length > 0) {
        await db.update(members).set(updates).where(eq(members.id, member.id));
      }

      return { success: true };
    }),

  /**
   * Upload company logo to S3 and save URL to member profile.
   */
  uploadLogo: publicProcedure
    .input(
      z.object({
        imageData: z.string(), // base64
        contentType: z.string().default("image/png"),
        filename: z.string().default("logo.png"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in" });
      }
      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not configured" });

      const buffer = Buffer.from(input.imageData, "base64");
      if (buffer.length > 2 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Logo must be under 2MB" });
      }

      const ext = input.contentType === "image/jpeg" ? "jpg" : input.contentType === "image/svg+xml" ? "svg" : "png";
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `logos/${member.id}/company-logo-${randomSuffix}.${ext}`;

      const { url } = await storagePut(fileKey, buffer, input.contentType);

      await db.update(members).set({ companyLogo: url }).where(eq(members.id, member.id));

      return { url };
    }),

  /**
   * Get selected bootcamp topics for a given date (visible to all members).
   */
  selectedBootcampTopics: publicProcedure
    .input(z.object({ bootcampDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberFromRequest(ctx.req);
      if (!member) {
        return { topics: [] };
      }

      const db = getDb()!;
      const rows = await db
        .select({
          id: bootcampTopics.id,
          topic: bootcampTopics.topic,
          memberName: members.discordDisplayName,
          memberUsername: members.discordUsername,
        })
        .from(bootcampTopics)
        .leftJoin(members, eq(bootcampTopics.memberId, members.id))
        .where(and(
          eq(bootcampTopics.bootcampDate, input.bootcampDate),
          eq(bootcampTopics.status, "selected")
        ));

      return { topics: rows };
    }),

  /**
   * Mark CPM Scheduler onboarding as completed for the current member.
   */
  completeCpmOnboarding: publicProcedure.mutation(async ({ ctx }) => {
    const member = await getMemberFromRequest(ctx.req);
    if (!member) throw new TRPCError({ code: "UNAUTHORIZED" });
    await getDb()!.update(members).set({ cpmOnboardingDone: true }).where(eq(members.id, member.id));
    return { success: true };
  }),

  /**
   * Admin: Manually verify a member's Stripe subscription status.
   * Checks Stripe directly by email and updates the member record.
   */
  verifySubscription: publicProcedure
    .input(z.object({ memberId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const admin = await getMemberFromRequest(ctx.req);
      if (!admin || admin.memberRole !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const db = getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not configured" });

      const [target] = await db.select().from(members).where(eq(members.id, input.memberId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Member not found" });
      if (!target.email) throw new TRPCError({ code: "BAD_REQUEST", message: "Member has no email — cannot verify with Stripe" });
      if (!stripe) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });

      const customers = await stripe.customers.list({ email: target.email, limit: 1 });
      if (customers.data.length === 0) {
        await db.insert(webhookEvents).values({
          eventType: "manual_verify",
          email: target.email,
          details: `Admin manual verify: No Stripe customer found for ${target.email}`,
          success: false,
        });
        return {
          status: "no_customer" as const,
          message: `No Stripe customer found for ${target.email}`,
          previousStatus: target.subscriptionStatus,
          newStatus: target.subscriptionStatus,
        };
      }

      const customer = customers.data[0];
      const activeSubs = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
      const trialingSubs = await stripe.subscriptions.list({ customer: customer.id, status: "trialing", limit: 1 });
      const sub = activeSubs.data[0] || trialingSubs.data[0];
      const previousStatus = target.subscriptionStatus;

      if (sub) {
        const newStatus = sub.status === "trialing" ? "trialing" : "active";
        await upsertMemberByEmail({
          email: target.email,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: newStatus as any,
        });
        await db.insert(webhookEvents).values({
          eventType: "manual_verify",
          email: target.email,
          stripeId: sub.id,
          details: `Admin manual verify: Found ${sub.status} subscription. Updated from "${previousStatus}" to "${newStatus}". Customer: ${customer.id}`,
          success: true,
        });
        return {
          status: "updated" as const,
          message: `Subscription verified: ${newStatus} (was: ${previousStatus})`,
          previousStatus,
          newStatus,
          stripeCustomerId: customer.id,
          stripeSubscriptionId: sub.id,
        };
      } else {
        const canceledSubs = await stripe.subscriptions.list({ customer: customer.id, status: "canceled", limit: 1 });
        const newStatus = canceledSubs.data.length > 0 ? "canceled" : "none";
        if (previousStatus !== newStatus) {
          await upsertMemberByEmail({
            email: target.email,
            stripeCustomerId: customer.id,
            subscriptionStatus: newStatus as any,
          });
        }
        await db.insert(webhookEvents).values({
          eventType: "manual_verify",
          email: target.email,
          stripeId: customer.id,
          details: `Admin manual verify: No active subscription. Status: ${newStatus} (was: ${previousStatus}). Customer: ${customer.id}`,
          success: false,
        });
        return {
          status: "no_subscription" as const,
          message: `No active subscription found (status: ${newStatus}, was: ${previousStatus})`,
          previousStatus,
          newStatus,
          stripeCustomerId: customer.id,
        };
      }
    }),
});
