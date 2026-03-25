import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createCircleCheckoutSession, stripe } from "./stripe";
import { memberRouter } from "./memberRouter";
import { subscribeEmail } from "./db";
import { sendSubscriberNotification } from "./email";
import { getSupabaseClient } from "./supabaseClient";
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
     * Create a Stripe Checkout Session for The Contractor Circle subscription.
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

  circle: router({
    /**
     * Get the current active member count from Supabase.
     * Public endpoint — used by the landing page to show dynamic founding member counts.
     * Cached for 60s on the client via staleTime.
     */
    memberCount: publicProcedure.query(async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { count: 9, total: 50 }; // Fallback if Supabase not configured
      }

      try {
        const { count, error } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("subscription_status", "active");

        if (error) {
          console.warn("[Circle] Failed to get member count from Supabase:", error.message);
          return { count: 9, total: 50 };
        }

        return { count: count ?? 9, total: 50 };
      } catch (err) {
        console.warn("[Circle] Error querying Supabase member count:", err);
        return { count: 9, total: 50 };
      }
    }),
  }),

  email: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const result = await subscribeEmail(input.email);
        
        if (result.success) {
          await sendSubscriberNotification({
            email: input.email,
            isNew: result.isNew,
          });
        }
        
        return {
          success: result.success,
          isNew: result.isNew,
          error: result.error,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
