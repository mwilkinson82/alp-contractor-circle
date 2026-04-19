/**
 * Takeoff Router — tRPC procedures for the AI Quantity Takeoff feature.
 * Uses Discord member auth (same as scheduleRouter pattern).
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { getBetaUserFromRequest } from "./betaAuth";
import type { Member } from "../drizzle/schema";
import { storagePut } from "./storage";
import {
  updateMemberPreferredCurrency,
  getMemberPreferredCurrency} from "./memberDb";
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
  recalculateItemCosts,
  bulkReviewItems,
  bulkUnreviewItems,
  getOrCreateManualSheet,
  createTakeoffItem,
  getSheetMarkup,
  saveSheetMarkup,
  deleteSheetMarkup,
  getProjectMarkups,
  logMeasurementApply,
  getItemMeasurementHistory,
  getItemsWithMeasurementHistory,
} from "./takeoffDb";
import { processAllPendingSheets, processDrawingSheet } from "./takeoffAI";
import { postProcessTakeoff } from "./takeoffPostProcess";
import { ALL_TAKEOFF_DIVISION_CODES } from "../shared/csiDivisions";
import { COST_REGIONS, getRegionMultiplier } from "../shared/costRegions";
import { getCostLibraryByMember, upsertCostLibraryEntries, deleteCostLibraryEntry, clearCostLibrary } from "./costLibraryDb";

/** Virtual member ID offset for beta users — keeps their data isolated from Discord members */
const BETA_MEMBER_OFFSET = 10_000_000;

/** Helper: extract member from Discord session cookie, or fall back to ConstructLine beta user */
async function getMemberFromRequest(req: any): Promise<Member | null> {
  // Try Discord member first
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (session) {
    const member = await getMemberById(session.memberId);
    if (member) return member;
  }
  // Fall back to ConstructLine (beta) user
  const betaUser = await getBetaUserFromRequest(req);
  if (betaUser) {
    return {
      id: BETA_MEMBER_OFFSET + betaUser.id,
      discordId: `beta_${betaUser.id}`,
      discordUsername: betaUser.name,
      displayName: betaUser.name,
      email: betaUser.email,
      avatarUrl: null,
      memberRole: "member",
      subscriptionStatus: "active",
      subscriptionId: null,
      stripeCustomerId: null,
      companyName: betaUser.companyName ?? null,
      companyLogo: null,
      cpmOnboardingDone: true,
      takeoffOnboardingDone: true,
      createdAt: betaUser.createdAt,
      updatedAt: betaUser.updatedAt,
    } as unknown as Member;
  }
  return null;
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

/**
 * Helper: require active Contractor Circle member.
 * All members (founding_member, admin, member) have access to ConstructLine.
 */
async function requireAdminMember(req: any) {
  // All authenticated Contractor Circle members have access — no role restriction
  // Access opened Apr 18 2026: founding_member, admin, member roles all allowed
  return requireMember(req);
}

export const takeoffRouter = router({
  // ─── Projects ─────────────────────────────────────────────────────────────

  /** List all takeoff projects for the current member */
  listProjects: publicProcedure.query(async ({ ctx }) => {
    const member = await requireAdminMember(ctx.req);
    return getTakeoffProjectsByMember(member.id);
  }),

  /** Get a single takeoff project with sheets and summary */
  getProject: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
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
        /** Currency code: USD, GBP, or AUD */
        currency: z.enum(["USD", "GBP", "AUD"]).optional(),
        /** JSON array of selected CSI division codes, or null/empty for all */
        selectedDivisions: z.array(z.string()).optional(),
        /** Cost region code */
        costRegion: z.string().max(64).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);

      // Validate and serialize divisions
      let divisionsJson: string | null = null;
      if (input.selectedDivisions && input.selectedDivisions.length > 0) {
        // Validate all codes are valid
        const validCodes = input.selectedDivisions.filter((c) =>
          ALL_TAKEOFF_DIVISION_CODES.includes(c)
        );
        if (validCodes.length > 0) {
          divisionsJson = JSON.stringify(validCodes);
        }
      }

      // Validate and look up cost region multiplier
      let costRegion: string | null = null;
      let costMultiplier: number | null = null;
      if (input.costRegion) {
        const multiplier = getRegionMultiplier(input.costRegion);
        if (multiplier !== null) {
          costRegion = input.costRegion;
          costMultiplier = multiplier;
        }
      }

      const id = await createTakeoffProject({
        memberId: member.id,
        name: input.name,
        description: input.description || null,
        currency: input.currency || "USD",
        selectedDivisions: divisionsJson,
        costRegion,
        costMultiplier,
      });
      return { id };
    }),

  /** Update project name/description/divisions/region */
  updateProject: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(256).optional(),
        description: z.string().max(2000).optional(),
        selectedDivisions: z.array(z.string()).optional(),
        costRegion: z.string().max(64).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.id);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;

      // Handle division update
      if (input.selectedDivisions !== undefined) {
        if (input.selectedDivisions.length === 0) {
          updates.selectedDivisions = null;
        } else {
          const validCodes = input.selectedDivisions.filter((c) =>
            ALL_TAKEOFF_DIVISION_CODES.includes(c)
          );
          updates.selectedDivisions = validCodes.length > 0 ? JSON.stringify(validCodes) : null;
        }
      }

      // Handle region update
      if (input.costRegion !== undefined) {
        if (input.costRegion === null) {
          updates.costRegion = null;
          updates.costMultiplier = null;
        } else {
          const multiplier = getRegionMultiplier(input.costRegion);
          if (multiplier !== null) {
            updates.costRegion = input.costRegion;
            updates.costMultiplier = multiplier;
          }
        }
      }

      await updateTakeoffProject(input.id, updates);
      return { success: true };
    }),

  /** Delete a takeoff project and all related data */
  deleteProject: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
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
      const member = await requireAdminMember(ctx.req);
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
      const member = await requireAdminMember(ctx.req);
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
    .input(z.object({
      projectId: z.number(),
      /** Optional pre-analysis modal settings */
      currency: z.enum(["USD", "GBP", "AUD"]).optional(),
      costRegion: z.string().max(64).nullable().optional(),
      selectedDivisions: z.array(z.string()).optional(),
      scopeText: z.string().max(2000).nullable().optional(),
      selectedSpecialties: z.array(z.string()).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
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

      // Apply pre-analysis modal settings to project before processing
      const updates: any = {};

      if (input.currency !== undefined) {
        updates.currency = input.currency;
      }

      if (input.scopeText !== undefined) {
        updates.scopeText = input.scopeText;
      }

      if (input.selectedSpecialties !== undefined) {
        updates.selectedSpecialties = input.selectedSpecialties && input.selectedSpecialties.length > 0
          ? JSON.stringify(input.selectedSpecialties)
          : null;
      }

      if (input.selectedDivisions !== undefined) {
        if (input.selectedDivisions.length === 0) {
          updates.selectedDivisions = null;
        } else {
          const validCodes = input.selectedDivisions.filter((c: string) =>
            ALL_TAKEOFF_DIVISION_CODES.includes(c)
          );
          updates.selectedDivisions = validCodes.length > 0 ? JSON.stringify(validCodes) : null;
        }
      }

      if (input.costRegion !== undefined) {
        if (input.costRegion === null) {
          updates.costRegion = null;
          updates.costMultiplier = 10000;
        } else {
          const multiplier = getRegionMultiplier(input.costRegion);
          if (multiplier !== null) {
            updates.costRegion = input.costRegion;
            updates.costMultiplier = multiplier;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        await updateTakeoffProject(input.projectId, updates);
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
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const sheets = await getDrawingSheetsByProject(input.projectId);
      const sheet = sheets.find((s: any) => s.id === input.sheetId);
      if (!sheet || !sheet.imageUrl) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Sheet not found or has no image" });
      }

      // Parse selected divisions from project
      let selectedDivisions: string[] | null = null;
      if (project.selectedDivisions) {
        try {
          const parsed = JSON.parse(project.selectedDivisions);
          if (Array.isArray(parsed) && parsed.length > 0 && parsed.length < ALL_TAKEOFF_DIVISION_CODES.length) {
            selectedDivisions = parsed;
          }
        } catch { /* ignore */ }
      }

      // Reset sheet status
      await updateDrawingSheet(input.sheetId, { status: "pending" as any });

      // Process in background
      processDrawingSheet(input.sheetId, sheet.imageUrl, input.projectId, selectedDivisions)
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
      const member = await requireAdminMember(ctx.req);
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
      const member = await requireAdminMember(ctx.req);
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
      const member = await requireAdminMember(ctx.req);
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
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await deleteTakeoffItem(input.id);
      await recalculateProjectTotal(input.projectId);
      return { success: true };
    }),

  /** Bulk mark all items in a division as reviewed */
  bulkReview: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        csiDivision: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await bulkReviewItems(input.projectId, input.csiDivision);
      return { success: true };
    }),

  /** Bulk mark all items in a division as unreviewed */
  bulkUnreview: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        csiDivision: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      await bulkUnreviewItems(input.projectId, input.csiDivision);
      return { success: true };
    }),

  /** Get processing progress for a project */
  getProgress: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
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

  /** Recalculate project status based on current sheet statuses */
  recalculateStatus: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const sheets = await getDrawingSheetsByProject(input.projectId);
      const completedSheets = sheets.filter((s: any) => s.status === "completed");
      const errorSheets = sheets.filter((s: any) => s.status === "error");
      const processingSheets = sheets.filter((s: any) => s.status === "processing");
      let finalStatus: string;
      if (processingSheets.length > 0) {
        finalStatus = "processing";
      } else if (completedSheets.length > 0) {
        finalStatus = "completed";
      } else if (errorSheets.length > 0) {
        finalStatus = "error";
      } else if (sheets.length === 0) {
        finalStatus = "draft";
      } else {
        finalStatus = "completed";
      }
      await updateTakeoffProject(input.projectId, {
        status: finalStatus as "draft" | "uploading" | "processing" | "completed" | "error",
        processedSheets: completedSheets.length,
      });
      await recalculateProjectTotal(input.projectId);
      return { status: finalStatus, processedSheets: completedSheets.length };
    }),

  /** Get the current member's preferred currency */
  getPreferredCurrency: publicProcedure.query(async ({ ctx }) => {
    const member = await requireAdminMember(ctx.req);
    const currency = await getMemberPreferredCurrency(member.id);
    return { currency: currency || "USD" };
  }),

  /** Save the current member's preferred currency */
  savePreferredCurrency: publicProcedure
    .input(z.object({ currency: z.enum(["USD", "GBP", "AUD"]) }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      await updateMemberPreferredCurrency(member.id, input.currency);
      return { success: true };
    }),

  /** Get available cost regions */
  getCostRegions: publicProcedure.query(async () => {
    return COST_REGIONS;
  }),

  /** Update project settings (divisions and/or region) after creation */
  updateProjectSettings: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        selectedDivisions: z.array(z.string()).optional(),
        costRegion: z.string().max(64).nullable().optional(),
        currency: z.enum(["USD", "GBP", "AUD"]).optional(),
        selectedSpecialties: z.array(z.string()).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const updates: any = {};
      let regionChanged = false;
      let oldMultiplier = project.costMultiplier || 10000;
      let newMultiplier = oldMultiplier;

      // Handle currency update
      if (input.currency !== undefined) {
        updates.currency = input.currency;
      }

      // Handle division update (only affects future extractions, not existing items)
      if (input.selectedDivisions !== undefined) {
        if (input.selectedDivisions.length === 0) {
          updates.selectedDivisions = null;
        } else {
          const validCodes = input.selectedDivisions.filter((c) =>
            ALL_TAKEOFF_DIVISION_CODES.includes(c)
          );
          updates.selectedDivisions = validCodes.length > 0 ? JSON.stringify(validCodes) : null;
        }
      }

      // Handle specialty update (only affects future extractions)
      if (input.selectedSpecialties !== undefined) {
        updates.selectedSpecialties = input.selectedSpecialties && input.selectedSpecialties.length > 0
          ? JSON.stringify(input.selectedSpecialties)
          : null;
      }

      // Handle region update (recalculates all existing item costs)
      if (input.costRegion !== undefined) {
        if (input.costRegion === null) {
          updates.costRegion = null;
          updates.costMultiplier = 10000; // Reset to national average
          newMultiplier = 10000;
        } else {
          const multiplier = getRegionMultiplier(input.costRegion);
          if (multiplier !== null) {
            updates.costRegion = input.costRegion;
            updates.costMultiplier = multiplier;
            newMultiplier = multiplier;
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Invalid cost region: ${input.costRegion}`,
            });
          }
        }
        regionChanged = newMultiplier !== oldMultiplier;
      }

      // Update project settings
      await updateTakeoffProject(input.projectId, updates);

      // If region changed, recalculate all item costs
      if (regionChanged) {
        await recalculateItemCosts(input.projectId, oldMultiplier, newMultiplier);
      }

      return { success: true, regionChanged };
    }),

  /** Run post-processing pipeline on an existing completed project */
  reprocessConsolidate: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      if (project.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Project must be completed before running consolidation.",
        });
      }
      // Run post-processing in background — use post_processing status so frontend shows consolidation overlay
      await updateTakeoffProject(input.projectId, { status: "post_processing" as any });
      // Wrap in a 10-minute timeout to prevent infinite hangs
      const CONSOLIDATION_TIMEOUT_MS = 10 * 60 * 1000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Consolidation timed out after 5 minutes")), CONSOLIDATION_TIMEOUT_MS)
      );
      Promise.race([postProcessTakeoff(input.projectId), timeoutPromise])
        .then(async (stats) => {
          console.log(`[Takeoff Router] Consolidation complete for project ${input.projectId}:`, stats);
          await updateTakeoffProject(input.projectId, { status: "completed" });
        })
        .catch(async (err) => {
          console.error(`[Takeoff Router] Consolidation failed for project ${input.projectId}:`, err);
          await updateTakeoffProject(input.projectId, { status: "completed" });
        });
      return { success: true, message: "Post-processing started. Items will be consolidated shortly." };
    }),

  // ─── User Cost Library ────────────────────────────────────────────────────

  /** Get the current member's cost library entries */
  getCostLibrary: publicProcedure.query(async ({ ctx }) => {
    const member = await requireAdminMember(ctx.req);
    return getCostLibraryByMember(member.id);
  }),

  /**
   * Upload/replace the member's cost library from parsed CSV/Excel data.
   * Entries are provided as dollar-denominated unit costs (converted to cents server-side).
   */
  uploadCostLibrary: publicProcedure
    .input(z.object({
      entries: z.array(z.object({
        description: z.string().min(1).max(512),
        unit: z.string().min(1).max(32),
        unitCost: z.number().min(0),  // dollars — converted to cents server-side
        csiDivision: z.string().max(8).optional(),
        notes: z.string().max(1000).optional(),
      })).min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const entries = input.entries.map(e => ({
        ...e,
        unitCost: Math.round(e.unitCost * 100),  // dollars → cents
      }));
      const count = await upsertCostLibraryEntries(member.id, entries);
      return { success: true, count };
    }),

  /** Delete a single cost library entry */
  deleteCostLibraryEntry: publicProcedure
    .input(z.object({ entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      await deleteCostLibraryEntry(member.id, input.entryId);
      return { success: true };
    }),

  /** Manually add a single takeoff line item under a CSI division */
  addItem: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        csiDivision: z.string().max(8),
        csiCode: z.string().max(16).optional(),
        description: z.string().min(1).max(512),
        quantity: z.string(),
        unit: z.string().max(16).default("EA"),
        unitCost: z.number().min(0),  // cents
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireAdminMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      const sheetId = await getOrCreateManualSheet(input.projectId);
      const qty = parseFloat(input.quantity) || 0;
      const extendedCost = Math.round(qty * input.unitCost);
      const id = await createTakeoffItem({
        projectId: input.projectId,
        sheetId,
        csiDivision: input.csiDivision,
        csiCode: input.csiCode || null,
        description: input.description,
        quantity: input.quantity,
        unit: input.unit,
        unitCost: input.unitCost,
        extendedCost,
        confidence: 100,  // manually entered = full confidence
        notes: input.notes || null,
        reviewed: true,  // manually entered = already reviewed
      });
      await recalculateProjectTotal(input.projectId);
      return { id, success: true };
    }),

  /** Clear all cost library entries for the current member */
  clearCostLibrary: publicProcedure.mutation(async ({ ctx }) => {
    const member = await requireAdminMember(ctx.req);
    await clearCostLibrary(member.id);
    return { success: true };
  }),

  // ── Sheet Markup Persistence ─────────────────────────────────────

  getSheetMarkup: publicProcedure
    .input(z.object({ sheetId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const markup = await getSheetMarkup(input.sheetId, member.id);
      if (!markup) return null;
      return {
        shapesJson: markup.shapesJson,
        scaleRatio: parseFloat(markup.scaleRatio as unknown as string) || 0,
        scaleUnit: markup.scaleUnit,
      };
    }),

  saveSheetMarkup: publicProcedure
    .input(
      z.object({
        sheetId: z.number(),
        projectId: z.number(),
        shapesJson: z.string(),
        scaleRatio: z.number(),
        scaleUnit: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const id = await saveSheetMarkup({
        sheetId: input.sheetId,
        memberId: member.id,
        projectId: input.projectId,
        shapesJson: input.shapesJson,
        scaleRatio: input.scaleRatio.toString(),
        scaleUnit: input.scaleUnit,
      });
      return { success: true, id };
    }),

  deleteSheetMarkup: publicProcedure
    .input(z.object({ sheetId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      await deleteSheetMarkup(input.sheetId, member.id);
      return { success: true };
    }),
  // ── Multi-Sheet Measurement Rollup ────────────────────────────────
  getProjectMarkups: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const rows = await getProjectMarkups(input.projectId, member.id);
      return rows.map((r) => ({
        sheetId: r.sheetId,
        sheetName: r.sheetName || `Page ${r.pageNumber}`,
        pageNumber: r.pageNumber,
        shapesJson: r.shapesJson,
        scaleRatio: parseFloat(r.scaleRatio as unknown as string) || 0,
        scaleUnit: r.scaleUnit,
      }));
    }),

  // ── Measurement History ─────────────────────────────────────────
  logMeasurementApply: publicProcedure
    .input(z.object({
      itemId: z.number(),
      projectId: z.number(),
      sheetId: z.number(),
      measurementType: z.enum(["line", "area", "count"]),
      rawValue: z.number(),
      unit: z.string(),
      sheetName: z.string().optional(),
      itemDescription: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const id = await logMeasurementApply({
        itemId: input.itemId,
        projectId: input.projectId,
        sheetId: input.sheetId,
        measurementType: input.measurementType,
        rawValue: input.rawValue.toFixed(4),
        unit: input.unit,
        memberId: member.id,
        sheetName: input.sheetName || null,
        itemDescription: input.itemDescription || null,
      });
      return { success: true, id };
    }),

  getItemMeasurementHistory: publicProcedure
    .input(z.object({ itemId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireMember(ctx.req);
      const rows = await getItemMeasurementHistory(input.itemId);
      return rows.map((r) => ({
        id: r.id,
        itemId: r.itemId,
        sheetId: r.sheetId,
        measurementType: r.measurementType,
        rawValue: parseFloat(r.rawValue as unknown as string),
        unit: r.unit,
        sheetName: r.sheetName,
        itemDescription: r.itemDescription,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

  getItemsWithMeasurements: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      await requireMember(ctx.req);
      return getItemsWithMeasurementHistory(input.projectId);
    }),

  // ─── Excel Re-Import ────────────────────────────────────────────────────────
  /**
   * Import items from an Excel file that was previously exported.
   * Matches rows by description + CSI code to existing items, updates changed fields,
   * creates new items for unmatched rows, and optionally removes items not in the import.
   */
  importExcel: publicProcedure
    .input(z.object({
      projectId: z.number(),
      /** Array of row objects parsed from Excel on the client */
      rows: z.array(z.object({
        csiCode: z.string().optional(),
        description: z.string(),
        quantity: z.number(),
        unit: z.string(),
        unitCost: z.number(), // in dollars (will be converted to cents)
        confidence: z.number().optional(),
        reviewed: z.boolean().optional(),
        notes: z.string().optional(),
      })),
      /** If true, items not present in the import will be deleted */
      removeUnmatched: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      // Get existing items for matching
      const existingItems = await getTakeoffItemsByProject(input.projectId);
      
      // Get or create a manual sheet for new items
      const manualSheetId = await getOrCreateManualSheet(input.projectId);

      let updated = 0;
      let created = 0;
      let removed = 0;
      let errors: string[] = [];
      const matchedIds = new Set<number>();

      for (const row of input.rows) {
        try {
          // Try to match by description (case-insensitive) + CSI code
          const match = existingItems.find(item => {
            const descMatch = item.description.toLowerCase().trim() === row.description.toLowerCase().trim();
            const csiMatch = !row.csiCode || !item.csiCode || 
              item.csiCode.replace(/\s/g, '') === row.csiCode.replace(/\s/g, '');
            return descMatch && csiMatch && !matchedIds.has(item.id);
          });

          const unitCostCents = Math.round(row.unitCost * 100);
          const quantityNum = row.quantity;
          const extendedCostCents = Math.round(unitCostCents * quantityNum);

          if (match) {
            matchedIds.add(match.id);
            // Check if anything changed
            const hasChanges = 
              parseFloat(String(match.quantity)) !== quantityNum ||
              match.unitCost !== unitCostCents ||
              match.unit !== row.unit ||
              (row.notes !== undefined && match.notes !== row.notes) ||
              (row.reviewed !== undefined && match.reviewed !== row.reviewed);

            if (hasChanges) {
              await updateTakeoffItem(match.id, {
                quantity: String(quantityNum),
                unitCost: unitCostCents,
                extendedCost: extendedCostCents,
                unit: row.unit,
                ...(row.notes !== undefined ? { notes: row.notes } : {}),
                ...(row.reviewed !== undefined ? { reviewed: row.reviewed } : {}),
              });
              updated++;
            }
          } else {
            // Create new item
            const csiDiv = row.csiCode ? row.csiCode.substring(0, 2) : "00";
            await createTakeoffItem({
              projectId: input.projectId,
              sheetId: manualSheetId,
              csiDivision: csiDiv,
              csiCode: row.csiCode || null,
              description: row.description,
              quantity: String(quantityNum),
              unit: row.unit,
              unitCost: unitCostCents,
              extendedCost: extendedCostCents,
              confidence: row.confidence || 100,
              notes: row.notes || "Imported from Excel",
              reviewed: row.reviewed ?? true,
            });
            created++;
          }
        } catch (err: any) {
          errors.push(`Row "${row.description}": ${err.message}`);
        }
      }

      // Optionally remove items not in the import
      if (input.removeUnmatched) {
        for (const item of existingItems) {
          if (!matchedIds.has(item.id)) {
            await deleteTakeoffItem(item.id);
            removed++;
          }
        }
      }

      // Recalculate project total
      const newTotal = await recalculateProjectTotal(input.projectId);

      return {
        updated,
        created,
        removed,
        errors,
        newTotal,
        totalRows: input.rows.length,
      };
    }),
});
