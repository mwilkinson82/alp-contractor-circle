/**
 * Takeoff Cost Router — tRPC procedures for the Cost Library and Re-pricing features.
 * Split from takeoffRouter to keep procedure counts under tRPC's type inference limit.
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { getBetaUserFromRequest } from "./betaAuth";
import type { Member } from "../drizzle/schema";
import {
  getTakeoffProject,
  getTakeoffItemsByProject,
  updateTakeoffItem,
  updateTakeoffProject,
  recalculateProjectTotal,
} from "./takeoffDb";
import { applyPricingV2, applyPricingWithLibraryV2, type TakeoffItem as CostTakeoffItem, type UserLibraryEntry } from "./costLookupV2";
import { COST_TABLE } from "../shared/costTable";
import {
  getCostLibraryByMember,
  upsertCostLibraryEntries,
  addCostLibraryEntry,
  updateCostLibraryEntry,
  deleteCostLibraryEntry,
  clearCostLibrary,
} from "./costLibraryDb";

const BETA_MEMBER_OFFSET = 10_000_000;

/** Whitelisted member IDs — bypass subscription check. Daniel G (1320007), alpteambot (360002). */
const WHITELISTED_MEMBER_IDS = new Set([1320007, 360002]);

async function getMemberFromRequest(req: any): Promise<Member | null> {
  const cookie = parseMemberCookie(req);
  const session = await verifyMemberSession(cookie);
  if (session) {
    const member = await getMemberById(session.memberId);
    if (member) return member;
  }
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

async function requireMember(req: any) {
  const member = await getMemberFromRequest(req);
  if (!member) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in as a member to access takeoffs." });
  }
  // Beta users bypass subscription check
  if (member.id >= BETA_MEMBER_OFFSET) return member;
  // Whitelisted members bypass subscription check
  if (WHITELISTED_MEMBER_IDS.has(member.id)) return member;
  // Everyone else must have an active subscription
  if (member.subscriptionStatus !== "active") {
    throw new TRPCError({ code: "FORBIDDEN", message: "An active Contractor Circle subscription is required." });
  }
  return member;
}

export const takeoffCostRouter = router({
  /** Re-price existing items using the cost lookup table without re-running AI extraction. */
  repriceItems: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const project = await getTakeoffProject(input.projectId);
      if (!project || project.memberId !== member.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }
      if (project.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Project must be in completed state to re-price items." });
      }
      const items = await getTakeoffItemsByProject(input.projectId);
      if (!items || items.length === 0) {
        return { success: true, updated: 0, message: "No items to re-price." };
      }
      const costItems: CostTakeoffItem[] = items.map((item: any) => ({
        description: item.description,
        csiCode: item.csiCode || "",
        csiDivision: item.csiDivision || "",
        quantity: parseFloat(item.quantity) || 0,
        unit: item.unit || "",
        unitCost: (item.unitCost || 0) / 100,
        confidence: item.confidence || 0,
        notes: item.notes || "",
      }));
      const multiplier = project.costMultiplier ? project.costMultiplier / 10000 : 1.0;
      const memberLibraryRaw = await getCostLibraryByMember(member.id).catch(() => []);
      const memberOverrides: UserLibraryEntry[] = memberLibraryRaw.map((e: any) => ({
        description: e.description,
        unit: e.unit,
        unitCost: e.unitCost / 100,
        csiDivision: e.csiDivision || "",
      }));
      // V2: Uses expanded synonym library (8,600+ synonyms) — ZERO LLM calls
      let pricedItems = memberOverrides.length > 0
        ? await applyPricingWithLibraryV2(costItems, memberOverrides, multiplier)
        : await applyPricingV2(costItems, multiplier);
      let updated = 0;
      for (let i = 0; i < items.length; i++) {
        const priced = pricedItems[i];
        const dbItem = items[i] as any;
        if (!priced) continue;
        const uc = priced.unitCost ?? 0;
        const matC = priced.materialCost ?? 0;
        const labC = priced.laborCost ?? 0;
        const newUnitCost = Math.round(uc * 100);
        const newExtCost = Math.round(uc * (parseFloat(dbItem.quantity) || 0) * 100);
        const newMatCost = Math.round(matC * 100);
        const newLabCost = Math.round(labC * 100);
        if (newUnitCost !== dbItem.unitCost || newExtCost !== dbItem.extendedCost || newMatCost !== dbItem.materialCost || newLabCost !== dbItem.laborCost) {
          await updateTakeoffItem(dbItem.id, { unitCost: newUnitCost, extendedCost: newExtCost, materialCost: newMatCost, laborCost: newLabCost });
          updated++;
        }
      }
      await recalculateProjectTotal(input.projectId);
      await updateTakeoffProject(input.projectId, { processingTimedOut: false } as any);
      return { success: true, updated, message: `Re-priced ${updated} items successfully.` };
    }),

  /** Get the current member's cost library entries */
  getCostLibrary: publicProcedure.query(async ({ ctx }) => {
    const member = await requireMember(ctx.req);
    return getCostLibraryByMember(member.id);
  }),

  /** Upload/replace the member's cost library from parsed CSV/Excel data. */
  uploadCostLibrary: publicProcedure
    .input(z.object({
      entries: z.array(z.object({
        description: z.string().min(1).max(512),
        unit: z.string().min(1).max(32),
        unitCost: z.number().min(0),
        csiDivision: z.string().max(8).optional(),
        notes: z.string().max(1000).optional(),
      })).min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const entries = input.entries.map(e => ({ ...e, unitCost: Math.round(e.unitCost * 100) }));
      const count = await upsertCostLibraryEntries(member.id, entries);
      return { success: true, count };
    }),

  /** Delete a single cost library entry */
  deleteCostLibraryEntry: publicProcedure
    .input(z.object({ entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      await deleteCostLibraryEntry(member.id, input.entryId);
      return { success: true };
    }),

  /** Add a single cost library entry manually */
  addCostLibraryEntry: publicProcedure
    .input(z.object({
      description: z.string().min(1).max(512),
      unit: z.string().min(1).max(32),
      unitCost: z.number().min(0),
      csiDivision: z.string().max(8).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const id = await addCostLibraryEntry(member.id, { ...input, unitCost: Math.round(input.unitCost * 100) });
      return { success: true, id };
    }),

  /** Update a single cost library entry (inline edit) */
  updateCostLibraryEntry: publicProcedure
    .input(z.object({
      entryId: z.number(),
      description: z.string().min(1).max(512).optional(),
      unit: z.string().min(1).max(32).optional(),
      unitCost: z.number().min(0).optional(),
      csiDivision: z.string().max(8).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const { entryId, unitCost, ...rest } = input;
      await updateCostLibraryEntry(member.id, entryId, {
        ...rest,
        ...(unitCost !== undefined ? { unitCost: Math.round(unitCost * 100) } : {}),
      });
      return { success: true };
    }),

  /** Clear all cost library entries for the current member */
  clearCostLibrary: publicProcedure.mutation(async ({ ctx }) => {
    const member = await requireMember(ctx.req);
    await clearCostLibrary(member.id);
    return { success: true };
  }),

  /**
   * Load ConstructLine baseline pricing into the member's cost library.
   * Converts the global COST_TABLE into personal library entries so members
   * can see and edit all baseline prices.
   */
  loadDefaults: publicProcedure.mutation(async ({ ctx }) => {
    const member = await requireMember(ctx.req);
    // Get existing entries so we only ADD missing ones (don't overwrite customized prices)
    const existing = await getCostLibraryByMember(member.id);
    const existingDescSet = new Set(existing.map(e => e.description.toLowerCase().trim()));
    const newEntries = COST_TABLE
      .filter(e => !existingDescSet.has(e.description.toLowerCase().trim()))
      .map(e => ({
        description: e.description,
        unit: e.unit,
        unitCost: Math.round(e.materialCost * 100),
        csiDivision: e.csiDivision,
        notes: `ConstructLine Pricing — ${e.category}`,
      }));
    if (newEntries.length > 0) {
      // Use addCostLibraryEntry for each new entry (don't delete existing)
      for (const entry of newEntries) {
        await addCostLibraryEntry(member.id, entry);
      }
    }
    return { success: true, count: existing.length + newEntries.length, added: newEntries.length };
  }),
});
