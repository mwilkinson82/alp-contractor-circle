import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createFeedback,
  getAllFeedback,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
} from "./feedbackDb";
import { storagePut } from "./storage";
import { sendFeedbackNotification } from "./email";

export const feedbackRouter = router({
  /** Submit feedback (any authenticated member) */
  submit: publicProcedure
    .input(
      z.object({
        message: z.string().min(1).max(5000),
        category: z.enum(["bug", "feature", "general", "other"]).default("general"),
        page: z.string().optional(),
        userAgent: z.string().optional(),
        screenshotBase64: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in to submit feedback" });
      }

      let screenshotUrl: string | undefined;
      if (input.screenshotBase64) {
        try {
          // Strip data URL prefix if present
          const base64Data = input.screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");
          const key = `feedback/${ctx.user.id}-${Date.now()}.png`;
          const result = await storagePut(key, buffer, "image/png");
          screenshotUrl = result.url;
        } catch (err) {
          console.error("[Feedback] Screenshot upload failed:", err);
          // Continue without screenshot
        }
      }

      const memberName = ctx.user.name || `User ${ctx.user.id}`;

      const id = await createFeedback({
        memberId: ctx.user.id,
        memberName,
        message: input.message,
        screenshotUrl,
        page: input.page,
        userAgent: input.userAgent,
        category: input.category,
      });

      // Send email notification to Marshall (fire-and-forget)
      sendFeedbackNotification({
        memberName,
        category: input.category,
        message: input.message,
        page: input.page || "Unknown",
        hasScreenshot: !!screenshotUrl,
      }).catch((err) => {
        console.error("[Feedback] Email notification failed:", err);
      });

      return { id, success: true };
    }),

  /** List all feedback (admin only) */
  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    return getAllFeedback();
  }),

  /** Get single feedback (admin only) */
  get: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const item = await getFeedbackById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND" });
      return item;
    }),

  /** Update feedback status and admin notes (admin only) */
  updateStatus: publicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "reviewed", "in_progress", "resolved", "wont_fix"]),
        adminNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await updateFeedbackStatus(input.id, input.status, input.adminNotes);
      return { success: true };
    }),

  /** Delete feedback (admin only) */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) throw new TRPCError({ code: "UNAUTHORIZED" });
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await deleteFeedback(input.id);
      return { success: true };
    }),
});
