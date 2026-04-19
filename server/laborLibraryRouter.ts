/**
 * Labor Library Router — CRUD for user labor rate data.
 * Mirrors takeoffCostRouter pattern for cost library.
 */
import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { getBetaUserFromRequest } from "./betaAuth";
import type { Member } from "../drizzle/schema";
import {
  getLaborLibraryByMember,
  upsertLaborLibraryEntries,
  addLaborLibraryEntry,
  updateLaborLibraryEntry,
  deleteLaborLibraryEntry,
  clearLaborLibrary,
} from "./laborLibraryDb";
import { LABOR_TABLE, LABOR_TYPE_MULTIPLIERS, type LaborType } from "../shared/laborTable";

const BETA_MEMBER_OFFSET = 10_000_000;

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
    throw new TRPCError({ code: "UNAUTHORIZED", message: "You must be logged in as a member." });
  }
  return member;
}

export const laborLibraryRouter = router({
  /** Get the current member's labor library entries */
  getLaborLibrary: publicProcedure.query(async ({ ctx }) => {
    const member = await requireMember(ctx.req);
    return getLaborLibraryByMember(member.id);
  }),

  /** Upload/replace the member's labor library from parsed CSV/Excel data */
  uploadLaborLibrary: publicProcedure
    .input(z.object({
      entries: z.array(z.object({
        description: z.string().min(1).max(512),
        unit: z.string().min(1).max(32),
        laborRate: z.number().min(0),
        crewSize: z.string().optional(),
        productivity: z.string().optional(),
        csiDivision: z.string().max(8).optional(),
        notes: z.string().max(1000).optional(),
      })).min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const entries = input.entries.map(e => ({ ...e, laborRate: Math.round(e.laborRate * 100) }));
      const count = await upsertLaborLibraryEntries(member.id, entries);
      return { success: true, count };
    }),

  /** Add a single labor library entry manually */
  addLaborLibraryEntry: publicProcedure
    .input(z.object({
      description: z.string().min(1).max(512),
      unit: z.string().min(1).max(32),
      laborRate: z.number().min(0),
      crewSize: z.string().optional(),
      productivity: z.string().optional(),
      csiDivision: z.string().max(8).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const id = await addLaborLibraryEntry(member.id, { ...input, laborRate: Math.round(input.laborRate * 100) });
      return { success: true, id };
    }),

  /** Update a single labor library entry (inline edit) */
  updateLaborLibraryEntry: publicProcedure
    .input(z.object({
      entryId: z.number(),
      description: z.string().min(1).max(512).optional(),
      unit: z.string().min(1).max(32).optional(),
      laborRate: z.number().min(0).optional(),
      crewSize: z.string().optional(),
      productivity: z.string().optional(),
      csiDivision: z.string().max(8).optional(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const { entryId, laborRate, ...rest } = input;
      await updateLaborLibraryEntry(member.id, entryId, {
        ...rest,
        ...(laborRate !== undefined ? { laborRate: Math.round(laborRate * 100) } : {}),
      });
      return { success: true };
    }),

  /** Delete a single labor library entry */
  deleteLaborLibraryEntry: publicProcedure
    .input(z.object({ entryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      await deleteLaborLibraryEntry(member.id, input.entryId);
      return { success: true };
    }),

  /** Clear all labor library entries */
  clearLaborLibrary: publicProcedure.mutation(async ({ ctx }) => {
    const member = await requireMember(ctx.req);
    await clearLaborLibrary(member.id);
    return { success: true };
  }),

  /**
   * Load ConstructLine baseline labor rates into the member's library.
   * Applies the selected labor type multiplier to base rates.
   */
  loadDefaults: publicProcedure
    .input(z.object({
      laborType: z.enum(["res_open", "res_union", "com_open", "com_union"]).default("com_open"),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx.req);
      const existing = await getLaborLibraryByMember(member.id);
      const existingDescSet = new Set(existing.map(e => e.description.toLowerCase().trim()));
      const multiplier = LABOR_TYPE_MULTIPLIERS[input.laborType as LaborType];

      const newEntries = LABOR_TABLE
        .filter(e => !existingDescSet.has(e.description.toLowerCase().trim()))
        .map(e => ({
          description: e.description,
          unit: e.unit,
          laborRate: Math.round(e.baseLaborCost * multiplier * 100), // cents
          crewSize: e.crewSize.toString(),
          productivity: e.productivity.toString(),
          csiDivision: e.csiDivision,
          notes: `ConstructLine Labor — ${e.category} (${input.laborType})`,
        }));

      if (newEntries.length > 0) {
        for (const entry of newEntries) {
          await addLaborLibraryEntry(member.id, entry);
        }
      }
      return { success: true, count: existing.length + newEntries.length, added: newEntries.length };
    }),
});
