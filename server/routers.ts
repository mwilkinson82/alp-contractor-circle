import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router, mergeRouters } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { createCircleCheckoutSession, stripe } from "./stripe";
import { memberRouter } from "./memberRouter";
import { scheduleRouter } from "./scheduleRouter";
import { takeoffRouter } from "./takeoffRouter";
import { takeoffCostRouter } from "./takeoffCostRouter";
import { laborLibraryRouter } from "./laborLibraryRouter";
import { estimateRouter } from "./estimateRouter";
import { tradeRateRouter } from "./tradeRateRouter";
import { feedbackRouter } from "./feedbackRouter";
import { presenceRouter } from "./presenceRouter";
import { subscribeEmail, getAllActiveMembers, createLead, saveSheetMarkup, getSheetMarkup, deleteSheetMarkup } from "./db";
import { processDripSends } from "./dripEngine";
import { getDripEmail, getMaxStep, ALL_DRIP_EMAILS } from "./dripEmails";
import { autoEnrollLeadMagnet, autoEnrollHomepageSubscriber } from "./dripAutoEnroll";
import { sendSubscriberNotification, sendEosDeckAnnouncementEmail, sendQ2FrameworkEmail, sendLeadMagnetNotification, sendEstimatingChecklistEmail, sendThreeSilosEmail } from "./email";
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
  takeoff: mergeRouters(takeoffRouter, takeoffCostRouter),
  labor: laborLibraryRouter,
  estimate: estimateRouter,
  tradeRates: tradeRateRouter,
  feedback: feedbackRouter,
  presence: presenceRouter,

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

        // DISABLED: All emails and drip campaigns ceased per owner request (2026-06-12)
        // sendQ2FrameworkEmail, sendEstimatingChecklistEmail, sendThreeSilosEmail,
        // sendLeadMagnetNotification, autoEnrollLeadMagnet — ALL DISABLED

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

        // DISABLED: All emails and drip campaigns ceased per owner request (2026-06-12)
        // sendSubscriberNotification and autoEnrollHomepageSubscriber — ALL DISABLED

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

    /** Preview a single drip email (rendered HTML + metadata) */
    preview: publicProcedure
      .input(z.object({
        sequenceId: z.string(),
        stepNumber: z.number(),
        firstName: z.string().default("Contractor"),
      }))
      .query(({ input }) => {
        const emailDef = getDripEmail(input.sequenceId, input.stepNumber);
        if (!emailDef) {
          return { found: false as const, html: "", text: "", subject: "" };
        }
        return {
          found: true as const,
          subject: emailDef.subject(input.firstName),
          html: emailDef.buildHtml(input.firstName),
          text: emailDef.buildText(input.firstName),
        };
      }),

    /** Re-enroll all contacts back to Day 1 of their sequences */
    reEnrollAll: protectedProcedure
      .input(z.object({
        sequenceId: z.string().optional(), // if omitted, re-enroll ALL sequences
        dryRun: z.boolean().default(true),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const mysql = await import("mysql2/promise");
        const conn = await mysql.createConnection(process.env.DATABASE_URL!);
        try {
          // Find all enrollments to re-enroll (completed, paused, or active past step 1)
          let where = "(status IN ('completed', 'paused', 'converted') OR (status = 'active' AND currentStep > 1))";
          const params: any[] = [];
          if (input.sequenceId) {
            where += " AND sequenceId = ?";
            params.push(input.sequenceId);
          }
          const [rows] = await conn.execute(
            `SELECT id, email, firstName, sequenceId, currentStep, status FROM drip_enrollments WHERE ${where}`,
            params
          ) as [any[], any];

          if (input.dryRun) {
            return {
              success: true,
              dryRun: true,
              count: rows.length,
              preview: rows.slice(0, 20).map((r: any) => ({
                email: r.email,
                firstName: r.firstName,
                sequenceId: r.sequenceId,
                currentStep: r.currentStep,
                status: r.status,
              })),
            };
          }

          // Reset all matched enrollments to step 1 with next send tomorrow 8 AM ET
          const tomorrow = new Date();
          tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
          const pad = (n: number) => String(n).padStart(2, '0');
          const dateStr = `${tomorrow.getUTCFullYear()}-${pad(tomorrow.getUTCMonth() + 1)}-${pad(tomorrow.getUTCDate())} 12:00:00`;

          const ids = rows.map((r: any) => r.id);
          if (ids.length > 0) {
            // Batch update in chunks of 500
            for (let i = 0; i < ids.length; i += 500) {
              const chunk = ids.slice(i, i + 500);
              const placeholders = chunk.map(() => '?').join(',');
              await conn.execute(
                `UPDATE drip_enrollments SET currentStep = 1, status = 'active', nextSendAt = ? WHERE id IN (${placeholders})`,
                [dateStr, ...chunk]
              );
            }
          }

          return {
            success: true,
            dryRun: false,
            count: ids.length,
            message: `Re-enrolled ${ids.length} contacts back to Day 1. First emails will send tomorrow at 8 AM ET.`,
          };
        } finally {
          await conn.end();
        }
      }),

    /** List all available drip email definitions (for the admin preview panel) */
    listEmails: publicProcedure.query(() => {
      const sequences = new Map<string, { stepNumber: number; subject: string }[]>();
      for (const def of ALL_DRIP_EMAILS) {
        if (!sequences.has(def.sequenceId)) {
          sequences.set(def.sequenceId, []);
        }
        sequences.get(def.sequenceId)!.push({
          stepNumber: def.stepNumber,
          subject: def.subject("{{firstName}}"),
        });
      }
      const result: { sequenceId: string; emails: { stepNumber: number; subject: string }[] }[] = [];
      sequences.forEach((emails, sequenceId) => {
        result.push({ sequenceId, emails: emails.sort((a: { stepNumber: number }, b: { stepNumber: number }) => a.stepNumber - b.stepNumber) });
      });
      return result;
    }),
   }),

  // ─── Sheet Markups (Drawing Annotations) ─────────────────────────────────────
  markup: router({
    save: publicProcedure
      .input(z.object({
        sheetId: z.number(),
        projectId: z.number(),
        shapes: z.array(z.any()),
        scaleRatio: z.number(),
        scaleUnit: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new Error("Not authenticated");
        }
        // Get member ID from user context (assuming member table has user/auth link)
        // For now, use user.id as memberId (adjust if needed)
        const memberId = ctx.user.id;
        const result = await saveSheetMarkup(
          input.sheetId,
          memberId,
          input.projectId,
          input.shapes,
          input.scaleRatio,
          input.scaleUnit,
        );
        return { success: true, id: result.id };
      }),

    load: publicProcedure
      .input(z.object({ sheetId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          return { shapes: [], scaleRatio: 0, scaleUnit: "px" };
        }
        const memberId = ctx.user.id;
        const markup = await getSheetMarkup(input.sheetId, memberId);
        if (!markup) {
          return { shapes: [], scaleRatio: 0, scaleUnit: "px" };
        }
        return {
          shapes: JSON.parse(markup.shapesJson),
          scaleRatio: parseFloat(markup.scaleRatio as any),
          scaleUnit: markup.scaleUnit,
        };
      }),

    delete: publicProcedure
      .input(z.object({ sheetId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) {
          throw new Error("Not authenticated");
        }
        const memberId = ctx.user.id;
        await deleteSheetMarkup(input.sheetId, memberId);
        return { success: true };
      }),
  }),
  webhookMonitor: router({
    getEvents: publicProcedure
      .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
      .query(async ({ input }) => {
        const mysql2 = await import("mysql2/promise");
        const { drizzle } = await import("drizzle-orm/mysql2");
        const { desc } = await import("drizzle-orm");
        const { webhookEvents } = await import("../drizzle/schema");
        const pool = mysql2.createPool(process.env.DATABASE_URL!);
        const db = drizzle(pool);
        const limit = input?.limit ?? 50;
        const events = await db.select().from(webhookEvents).orderBy(desc(webhookEvents.createdAt)).limit(limit);
        await pool.end();
        const fallbackCount = events.filter(e => e.eventType === "stripe_fallback").length;
        const blockedCount = events.filter(e => e.eventType === "gate_blocked").length;
        const webhookCount = events.filter(e => e.eventType === "webhook_received").length;
        return { events, summary: { fallbackCount, blockedCount, webhookCount, total: events.length } };
      }),
  }),
});
export type AppRouter = typeof appRouter;
