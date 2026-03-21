import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createCircleCheckoutSession, stripe } from "./stripe";
import { memberRouter } from "./memberRouter";
import { z } from "zod";

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

  stripe: router({
    /**
     * Create a Stripe Checkout Session for The Contracting Circle subscription.
     * This is a public procedure — no login required to start checkout.
     * Stripe handles all payment collection and customer creation.
     */
    createCircleCheckout: publicProcedure.mutation(async ({ ctx }) => {
      const origin = ctx.req.headers.origin || ctx.req.headers.referer?.replace(/\/$/, "") || "https://localhost:3000";

      const checkoutUrl = await createCircleCheckoutSession({
        origin,
        userId: ctx.user?.id,
        userEmail: ctx.user?.email ?? undefined,
        userName: ctx.user?.name ?? undefined,
      });

      return { checkoutUrl };
    }),

    /**
     * Verify a completed checkout session and return customer details.
     * Used by the welcome page to show personalized confirmation.
     */
    verifyCheckout: publicProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        if (!stripe) {
          return { verified: false, customerName: null, customerEmail: null };
        }

        try {
          const session = await stripe.checkout.sessions.retrieve(input.sessionId);

          if (session.payment_status !== "paid") {
            return { verified: false, customerName: null, customerEmail: null };
          }

          return {
            verified: true,
            customerName: session.metadata?.customer_name || session.customer_details?.name || null,
            customerEmail: session.customer_email || session.customer_details?.email || null,
          };
        } catch (err) {
          console.warn("[Stripe] Failed to verify checkout session:", err);
          return { verified: false, customerName: null, customerEmail: null };
        }
      }),
  }),

  member: memberRouter,
});

export type AppRouter = typeof appRouter;
