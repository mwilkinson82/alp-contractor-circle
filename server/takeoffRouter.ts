/**
 * Takeoff Router — tRPC procedures for the AI Quantity Takeoff feature.
 * Uses Discord member auth (same as scheduleRouter pattern).
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import type { Member } from "../drizzle/schema";
import { storagePut } from "./storage";
import {
  createTakeoffProject,
  getTakeoffProjectsByMember,
  getTakeoffProject,
  updateTakeoffProject,
  deleteTakeoffProject,
  createDrawingSheet,
  getDrawingSheetsByProject,
  getTakeoffItemsByProject,
  getTakeoffItemsBySheet,
  updateTakeoffItem,
  deleteTakeoffItem,
  recalculateProjectTotal,
  updateDrawingSheet,
  deleteTakeoffItemsBySheet,
} from "./takeoffDb";
import { processAllPendingSheets, processDrawingSheet } from "./takeoffAI";

/** Helper: extract member from Discord session cookie */
async function getMemberFromRequest(req: any): Promise<Member | null> {
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (!session) return null;
  const member = await getMemberById(session.memberId);
  return member || null;
}

/** Helper: require Discord member auth */
async function requireMember(req: any) {
  const member = await getMemberFromRequest(req);
  if (!member) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in as a member to access takeoffs.",
    });
  }
  return member;
}

export const takeoffRouter = router({
  // ─── Projects ─────────────────────────────────────────────────────────────

  /** List all takeoff projects for the current member */
  listProjects: publicProcedure.query(async ({ ctx }) => {
    const member = await requireMember(ctx.req);
    return getTakeoffProjectsByMember(member.id);
  }),

  /** Get a single takeoff project with sheets and summary */
  getProject: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.id);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      const sheets = await getDrawingSheetsByProject(input.id);
      return { ...project, sheets };
    }),

  /** Create a new takeoff project */
  createProject: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const id = await createTakeoffProject({
        memberId: member.id,
        name: input.name,
        description: input.description || null,
      });
      return { id };
    }),

  /** Update project name/description */
  updateProject: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
        description: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.id);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      await updateTakeoffProject(input.id, updates);
      return { success: true };
    }),

  /** Delete a takeoff project and all related data */
  deleteProject: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.id);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await deleteTakeoffProject(input.id);
      return { success: true };
    }),

  // ─── Drawing Upload ───────────────────────────────────────────────────────

  /** Upload a drawing sheet image (base64 encoded) */
  uploadSheet: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        filename: z.string(),
        pageNumber: z.number().min(1),
        /** Base64-encoded image data */
        imageData: z.string(),
        contentType: z.string().default("image/png"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Upload to S3
      const buffer = Buffer.from(input.imageData, "base64");
      const ext = input.contentType === "image/jpeg" ? "jpg" : "png";
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `takeoff/${member.id}/${input.projectId}/sheet-${input.pageNumber}-${randomSuffix}.${ext}`;

      const { url, key } = await storagePut(fileKey, buffer, input.contentType);

      // Create drawing sheet record
      const sheetId = await createDrawingSheet({
        projectId: input.projectId,
        originalFilename: input.filename,
        pageNumber: input.pageNumber,
        imageUrl: url,
        imageKey: key,
        status: "pending",
      });

      // Update project sheet count
      await updateTakeoffProject(input.projectId, {
        totalSheets: (project.totalSheets || 0) + 1,
        status: "uploading",
      });

      return { sheetId, imageUrl: url };
    }),

  /** Upload multiple sheets at once (batch) */
  uploadSheetsBatch: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        sheets: z.array(
          z.object({
            filename: z.string(),
            pageNumber: z.number().min(1),
            imageData: z.string(),
            contentType: z.string().default("image/png"),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const results: Array<{ sheetId: number; pageNumber: number; imageUrl: string }> = [];

      for (const sheet of input.sheets) {
        const buffer = Buffer.from(sheet.imageData, "base64");
        const ext = sheet.contentType === "image/jpeg" ? "jpg" : "png";
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const fileKey = `takeoff/${member.id}/${input.projectId}/sheet-${sheet.pageNumber}-${randomSuffix}.${ext}`;

        const { url, key } = await storagePut(fileKey, buffer, sheet.contentType);

        const sheetId = await createDrawingSheet({
          projectId: input.projectId,
          originalFilename: sheet.filename,
          pageNumber: sheet.pageNumber,
          imageUrl: url,
          imageKey: key,
          status: "pending",
        });

        results.push({ sheetId, pageNumber: sheet.pageNumber, imageUrl: url });
      }

      await updateTakeoffProject(input.projectId, {
        totalSheets: (project.totalSheets || 0) + input.sheets.length,
        status: "uploading",
      });

      return { sheets: results };
    }),

  // ─── AI Processing ────────────────────────────────────────────────────────

  /** Start AI processing for all pending sheets in a project */
  startProcessing: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (project.status === "processing") {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Project is already being processed.",
        });
      }

      // Start processing in background (don't await)
      processAllPendingSheets(input.projectId).catch((err) => {
        console.error(`[Takeoff] Background processing error for project ${input.projectId}:`, err);
      });

      return { success: true, message: "Processing started" };
    }),

  /** Reprocess a single sheet */
  reprocessSheet: publicProcedure
    .input(z.object({ sheetId: z.number(), projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const sheets = await getDrawingSheetsByProject(input.projectId);
      const sheet = sheets.find((s: any) => s.id === input.sheetId);
      if (!sheet || !sheet.imageUrl) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sheet not found or has no image" });
      }

      // Reset sheet status
      await updateDrawingSheet(input.sheetId, { status: "pending" as any });

      // Process in background
      processDrawingSheet(input.sheetId, sheet.imageUrl, input.projectId)
        .then(() => recalculateProjectTotal(input.projectId))
        .catch((err) => {
          console.error(`[Takeoff] Reprocess error for sheet ${input.sheetId}:`, err);
        });

      return { success: true };
    }),

  // ─── Takeoff Items ────────────────────────────────────────────────────────

  /** Get all takeoff items for a project */
  getItems: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return getTakeoffItemsByProject(input.projectId);
    }),

  /** Get items for a specific sheet */
  getItemsBySheet: publicProcedure
    .input(z.object({ sheetId: z.number(), projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return getTakeoffItemsBySheet(input.sheetId);
    }),

  /** Update a takeoff item (edit quantity, cost, description, mark reviewed) */
  updateItem: publicProcedure
    .input(
      z.object({
        id: z.number(),
        projectId: z.number(),
        description: z.string().optional(),
        quantity: z.string().optional(),
        unit: z.string().optional(),
        unitCost: z.number().optional(),
        csiDivision: z.string().optional(),
        csiCode: z.string().optional(),
        notes: z.string().optional(),
        reviewed: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updates: any = {};
      if (input.description !== undefined) updates.description = input.description;
      if (input.quantity !== undefined) updates.quantity = input.quantity;
      if (input.unit !== undefined) updates.unit = input.unit;
      if (input.unitCost !== undefined) updates.unitCost = input.unitCost;
      if (input.csiDivision !== undefined) updates.csiDivision = input.csiDivision;
      if (input.csiCode !== undefined) updates.csiCode = input.csiCode;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.reviewed !== undefined) updates.reviewed = input.reviewed;

      // Recalculate extended cost if quantity or unitCost changed
      if (input.quantity !== undefined || input.unitCost !== undefined) {
        const qty = input.quantity ? parseFloat(input.quantity) : 0;
        const cost = input.unitCost ?? 0;
        updates.extendedCost = Math.round(qty * cost);
      }

      await updateTakeoffItem(input.id, updates);
      await recalculateProjectTotal(input.projectId);
      return { success: true };
    }),

  /** Delete a takeoff item */
  deleteItem: publicProcedure
    .input(z.object({ id: z.number(), projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await deleteTakeoffItem(input.id);
      await recalculateProjectTotal(input.projectId);
      return { success: true };
    }),

  /** Get processing progress for a project */
  getProgress: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const sheets = await getDrawingSheetsByProject(input.projectId);
      return {
        status: project.status,
        totalSheets: project.totalSheets,
        processedSheets: project.processedSheets,
        totalEstimatedCost: project.totalEstimatedCost,
        sheets: sheets.map((s: any) => ({
          id: s.id,
          pageNumber: s.pageNumber,
          sheetName: s.sheetName,
          sheetType: s.sheetType,
          status: s.status,
          errorMessage: s.errorMessage,
        })),
      };
    }),
});
