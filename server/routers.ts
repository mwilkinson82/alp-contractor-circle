import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure, adminProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { createCheckoutSession } from "./stripe";
import { getMemberByDiscordId } from "./db";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  member: router({
    me: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      // Try to get member by Discord ID (openId for Discord OAuth)
      const member = await getMemberByDiscordId(ctx.user.openId);
      return member || null;
    }),

    subscription: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return null;
      const member = await getMemberByDiscordId(ctx.user.openId);
      if (!member) return null;
      return {
        status: member.subscriptionStatus,
        customerId: member.stripeCustomerId,
        subscriptionId: member.stripeSubscriptionId,
      };
    }),

    payments: publicProcedure.query(async ({ ctx }) => {
      if (!ctx.user) return [];
      const member = await getMemberByDiscordId(ctx.user.openId);
      if (!member || !member.stripeCustomerId) return [];
      // In a real app, fetch from Stripe API
      return [];
    }),
  }),

  replays: router({
    list: publicProcedure.query(async () => {
      return db.getPublishedReplays();
    }),

    all: adminProcedure.query(async () => {
      return db.getAllReplays();
    }),

    create: adminProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        videoUrl: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        duration: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createReplay({
          title: input.title,
          description: input.description,
          videoUrl: input.videoUrl,
          thumbnailUrl: input.thumbnailUrl,
          duration: input.duration,
          category: input.category,
          isPublished: 1,
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteReplay(input.id);
        return { success: true };
      }),
  }),

  stripe: router({
    createCircleCheckout: publicProcedure
      .input(z.object({
        origin: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        
        const member = await getMemberByDiscordId(ctx.user.openId);
        if (!member) throw new Error("Member not found");

        const session = await createCheckoutSession(
          member.id,
          member.email,
          input.origin
        );

        return {
          sessionId: session.id,
          url: session.url,
        };
      }),

    verifyCheckout: publicProcedure
      .input(z.object({
        sessionId: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) return null;
        // In a real app, verify with Stripe API
        const member = await getMemberByDiscordId(ctx.user.openId);
        return member ? { status: member.subscriptionStatus } : null;
      }),
  }),
});

export type AppRouter = typeof appRouter;
