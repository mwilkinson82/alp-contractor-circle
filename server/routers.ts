import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createCircleCheckoutSession, stripe } from "./stripe";
import { memberRouter } from "./memberRouter";
import { scheduleRouter } from "./scheduleRouter";
import { takeoffRouter } from "./takeoffRouter";
import { subscribeEmail, getAllActiveMembers, createLead } from "./db";
import { processDripSends } from "./dripEngine";
import { autoEnrollLeadMagnet, autoEnrollHomepageSubscriber } from "./dripAutoEnroll";
import { sendSubscriberNotification, sendEosDeckAnnouncementEmail, sendQ2FrameworkEmail, sendLeadMagnetNotification, sendEstimatingChecklistEmail } from "./email";
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
  schedule: scheduleRouter,
  takeoff: takeoffRouter,

  templates: router({
    /**
     * List all published templates, optionally filtered by category.
     */
    list: publicProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input }) => {
        try {
          const db = getSupabaseClient();
          if (!db) return [];
          let query = db.from("templates").select("*").eq("published", true);
          
          if (input?.category) {
            query = query.eq("category", input.category);
          }
          
          const { data, error } = await query.order("featured", { ascending: false }).order("createdAt", { ascending: false });
          
          if (error) {
            console.error("[Templates] Failed to fetch templates:", error);
            return [];
          }
          
          return (data || []).map((t: any) => ({
            id: t.id.toString(),
            title: t.name,
            description: t.description || "",
            category: (t.category || "operations").toLowerCase(),
            fileType: (t.fileType || "pdf") as "pdf" | "docx" | "xlsx",
            downloadUrl: t.url,
            featured: t.featured || false,
          }));
        } catch (err) {
          console.error("[Templates] Error:", err);
          return [];
        }
      }),
  }),

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

  leads: router({
    /**
     * Capture a lead from a lead magnet landing page.
     * Public — no auth required.
     */
    capture: publicProcedure
      .input(z.object({
        firstName: z.string().min(1, "First name is required"),
        email: z.string().email("Valid email is required"),
        source: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const result = await createLead({
          firstName: input.firstName,
          email: input.email,
          source: input.source,
        });

        // Also insert into Supabase leads (fire-and-forget)
        insertSupabaseLead({
          email: input.email,
          source: `lead_magnet_${input.source}`,
        }).catch((err) => console.error("[Leads] Failed to insert Supabase lead:", err));

        // Send the Q2 framework PDF delivery email
        if (input.source === "q1-q2-framework") {
          sendQ2FrameworkEmail({
            to: input.email,
            firstName: input.firstName,
          }).catch((err) => console.error("[Leads] Failed to send Q2 framework email:", err));
        }

        // Send the Estimating Checklist PDF delivery email
        if (input.source === "estimating-checklist") {
          sendEstimatingChecklistEmail({
            to: input.email,
            firstName: input.firstName,
          }).catch((err) => console.error("[Leads] Failed to send estimating checklist email:", err));
        }

        // Notify Marshall of every lead magnet download
        sendLeadMagnetNotification({
          email: input.email,
          firstName: input.firstName,
          source: input.source,
        }).catch((err) => console.error("[Leads] Failed to send lead magnet notification:", err));

        // Auto-enroll into drip sequence (fire-and-forget)
        autoEnrollLeadMagnet({
          email: input.email,
          firstName: input.firstName,
          source: input.source,
        }).catch((err) => console.error("[Leads] Failed to auto-enroll in drip:", err));

        return {
          success: true,
          alreadyExists: result.alreadyExists,
        };
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
        
        // Auto-enroll new homepage subscribers into drip (fire-and-forget)
        if (result.isNew) {
          autoEnrollHomepageSubscriber({ email: input.email })
            .catch((err) => console.error("[Email] Failed to auto-enroll homepage subscriber in drip:", err));
        }

        return {
          success: result.success,
          isNew: result.isNew,
          error: result.error,
        };
      }),
  }),

  // ─── Drip Campaign Admin ─────────────────────────────────────────────────
  drip: router({
    /** Get dashboard overview stats */
    status: publicProcedure.query(async () => {
      const mysql = await import("mysql2/promise");
      const conn = await mysql.createConnection(process.env.DATABASE_URL!);
      try {
        // Summary by sequence
        const [bySequence] = await conn.execute(
          `SELECT sequenceId, status, COUNT(*) as cnt
           FROM drip_enrollments
           GROUP BY sequenceId, status
           ORDER BY sequenceId, status`
        ) as [any[], any];

        // Step distribution for active enrollments
        const [stepDistribution] = await conn.execute(
          `SELECT sequenceId, currentStep, COUNT(*) as cnt
           FROM drip_enrollments
           WHERE status = 'active'
           GROUP BY sequenceId, currentStep
           ORDER BY sequenceId, currentStep`
        ) as [any[], any];

        // Pending right now
        const [pending] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM drip_enrollments
           WHERE status = 'active' AND nextSendAt IS NOT NULL AND nextSendAt <= NOW()`
        ) as [any[], any];

        // Total emails sent
        const [totalSent] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM drip_sent_emails WHERE status = 'sent'`
        ) as [any[], any];

        // Recent sends (last 20)
        const [recentSends] = await conn.execute(
          `SELECT ds.id, de.email, de.firstName, de.sequenceId, ds.stepNumber, ds.resendId, ds.sentAt
           FROM drip_sent_emails ds
           JOIN drip_enrollments de ON ds.enrollmentId = de.id
           WHERE ds.status = 'sent'
           ORDER BY ds.sentAt DESC
           LIMIT 20`
        ) as [any[], any];

        // Unsubscribed count
        const [unsubscribed] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM drip_enrollments WHERE status = 'unsubscribed'`
        ) as [any[], any];

        // Completed count
        const [completed] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM drip_enrollments WHERE status = 'completed'`
        ) as [any[], any];

        // Converted (became CC members)
        const [converted] = await conn.execute(
          `SELECT COUNT(*) as cnt FROM drip_enrollments WHERE status = 'converted'`
        ) as [any[], any];

        return {
          bySequence,
          stepDistribution,
          pendingNow: pending[0]?.cnt ?? 0,
          totalEmailsSent: totalSent[0]?.cnt ?? 0,
          unsubscribedCount: unsubscribed[0]?.cnt ?? 0,
          completedCount: completed[0]?.cnt ?? 0,
          convertedCount: converted[0]?.cnt ?? 0,
          recentSends,
        };
      } finally {
        await conn.end();
      }
    }),

    /** Get all enrollments with details for the table view */
    enrollments: publicProcedure
      .input(z.object({
        sequenceId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        const mysql = await import("mysql2/promise");
        const conn = await mysql.createConnection(process.env.DATABASE_URL!);
        try {
          let where = "1=1";
          const params: any[] = [];
          if (input.sequenceId) { where += " AND sequenceId = ?"; params.push(input.sequenceId); }
          if (input.status) { where += " AND status = ?"; params.push(input.status); }

          const [rows] = await conn.execute(
            `SELECT id, email, firstName, sequenceId, currentStep, status, nextSendAt, enrolledAt, convertedAt
             FROM drip_enrollments
             WHERE ${where}
             ORDER BY enrolledAt DESC
             LIMIT ? OFFSET ?`,
            [...params, input.limit, input.offset]
          ) as [any[], any];

          const [countResult] = await conn.execute(
            `SELECT COUNT(*) as total FROM drip_enrollments WHERE ${where}`,
            params
          ) as [any[], any];

          return { rows, total: countResult[0]?.total ?? 0 };
        } finally {
          await conn.end();
        }
      }),

    /** Pause or resume a specific enrollment */
    togglePause: publicProcedure
      .input(z.object({ enrollmentId: z.number(), action: z.enum(["pause", "resume"]) }))
      .mutation(async ({ input }) => {
        const mysql = await import("mysql2/promise");
        const conn = await mysql.createConnection(process.env.DATABASE_URL!);
        try {
          if (input.action === "pause") {
            await conn.execute(
              `UPDATE drip_enrollments SET status = 'paused', nextSendAt = NULL WHERE id = ? AND status = 'active'`,
              [input.enrollmentId]
            );
          } else {
            // Resume: set back to active with next send tomorrow 8 AM ET
            const tomorrow = new Date();
            tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
            const pad = (n: number) => String(n).padStart(2, '0');
            const dateStr = `${tomorrow.getUTCFullYear()}-${pad(tomorrow.getUTCMonth() + 1)}-${pad(tomorrow.getUTCDate())} 12:00:00`;
            await conn.execute(
              `UPDATE drip_enrollments SET status = 'active', nextSendAt = ? WHERE id = ? AND status = 'paused'`,
              [dateStr, input.enrollmentId]
            );
          }
          return { success: true };
        } finally {
          await conn.end();
        }
      }),

    /** Manually trigger drip processing (dry run or real) */
    trigger: publicProcedure
      .input(z.object({ dryRun: z.boolean().default(true) }))
      .mutation(async ({ input }) => {
        const result = await processDripSends({ dryRun: input.dryRun });
        return result;
      }),
  }),
});

export type AppRouter = typeof appRouter;
