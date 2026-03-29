import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createCircleCheckoutSession, stripe } from "./stripe";
import { memberRouter } from "./memberRouter";
import { subscribeEmail } from "./db";
import { sendSubscriberNotification } from "./email";
import { getSupabaseClient, insertSupabaseLead, insertTemplateRequest } from "./supabaseClient";
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
     * Submit a template or SOP request from a member.
     */
    submitTemplateRequest: publicProcedure
      .input(z.object({
        memberName: z.string().min(1, "Name is required"),
        memberEmail: z.string().email("Valid email required"),
        templateTitle: z.string().min(3, "Template title is required"),
        description: z.string().min(10, "Please provide a brief description"),
      }))
      .mutation(async ({ input }) => {
        const result = await insertTemplateRequest({
          memberName: input.memberName,
          memberEmail: input.memberEmail,
          templateTitle: input.templateTitle,
          description: input.description,
        });

        if (!result.success) {
          throw new Error(result.error || "Failed to submit template request");
        }

        return { success: true };
      }),

    /**
     * Get the current active member count from Supabase.
     * Public endpoint — used by the landing page to show dynamic founding member counts.
     * Cached for 60s on the client via staleTime.
     */
    memberCount: publicProcedure.query(async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        return { count: 10, total: 50 }; // Fallback if Supabase not configured
      }

      try {
        const { count, error } = await supabase
          .from("members")
          .select("*", { count: "exact", head: true })
          .eq("subscription_status", "active");

        if (error) {
          console.warn("[Circle] Failed to get member count from Supabase:", error.message);
          return { count: 10, total: 50 };
        }

        return { count: count ?? 10, total: 50 };
      } catch (err) {
        console.warn("[Circle] Error querying Supabase member count:", err);
        return { count: 10, total: 50 };
      }
    }),
  }),

  email: router({
    subscribe: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        // 1. Insert into local MySQL subscribers table
        const result = await subscribeEmail(input.email);
        
        // 2. Insert into Supabase leads table (fire-and-forget, don't block the response)
        insertSupabaseLead({
          email: input.email,
          source: "contractor-circle-subscribe",
        }).catch((err) => console.error("[Leads] Failed to insert Supabase lead:", err));

        // 3. Send notification email to Marshall
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
