/**
 * Trade Rate Library Router — CRUD for trade rates, burden configs, crews, and activity productivity.
 */
import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { getBetaUserFromRequest } from "./betaAuth";
import type { Member } from "../drizzle/schema";
import {
  getTradeRatesByMember,
  getTradeRatesByMemberAndType,
  upsertTradeRate,
  bulkUpsertTradeRates,
  deleteTradeRate,
  getBurdenConfigs,
  getBurdenConfigByType,
  upsertBurdenConfig,
  getCrewsByMember,
  createCrew,
  updateCrew,
  deleteCrew,
  getActivityProductivityByMember,
  upsertActivityProductivity,
  deleteActivityProductivity,
} from "./tradeRateDb";
import {
  TRADES,
  DEFAULT_BURDENS,
  DEFAULT_CREWS,
  calculateBurdenedRate,
  type LaborType,
  type BurdenDefaults,
} from "../shared/tradeRates";

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

async function requireMember(ctx: any) {
  const member = await getMemberFromRequest(ctx.req);
  if (!member) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not a member" });
  return member;
}

export const tradeRateRouter = router({
  // ─── Trade Rates ──────────────────────────────────────────────────────

  /** Get all trade rates for the current member (optionally filtered by labor type) */
  getTradeRates: publicProcedure
    .input(z.object({ laborType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      if (input?.laborType) {
        return getTradeRatesByMemberAndType(member.id, input.laborType);
      }
      return getTradeRatesByMember(member.id);
    }),

  /** Get baseline trade rates (from seed data, not user-specific) */
  getBaselineRates: publicProcedure
    .input(z.object({ laborType: z.string() }))
    .query(async ({ input }) => {
      const lt = input.laborType as LaborType;
      return TRADES.map((trade) => ({
        tradeName: trade.tradeName,
        csiDivision: trade.csiDivision,
        roles: trade.roles.map((role) => ({
          roleKey: role.roleKey,
          roleLabel: role.roleLabel,
          baseWageCents: role.rates[lt],
        })),
      }));
    }),

  /** Seed the member's trade rates from baseline data for a specific labor type */
  seedFromBaseline: publicProcedure
    .input(z.object({ laborType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const lt = input.laborType as LaborType;
      const rates: Array<{
        tradeName: string;
        csiDivision: string;
        classification: string;
        laborType: string;
        baseWageCents: number;
        notes: string;
      }> = [];

      for (const trade of TRADES) {
        for (const role of trade.roles) {
          rates.push({
            tradeName: trade.tradeName,
            csiDivision: trade.csiDivision,
            classification: role.roleKey,
            laborType: lt,
            baseWageCents: role.rates[lt],
            notes: "RS Means baseline",
          });
        }
      }

      const count = await bulkUpsertTradeRates(member.id, rates);
      return { success: true, count };
    }),

  /** Update a single trade rate */
  updateTradeRate: publicProcedure
    .input(z.object({
      tradeName: z.string(),
      classification: z.string(),
      laborType: z.string(),
      baseWageCents: z.number().min(0),
      csiDivision: z.string().optional(),
      regionCode: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const id = await upsertTradeRate({ memberId: member.id, ...input });
      return { success: true, id };
    }),

  /** Delete a trade rate */
  deleteTradeRate: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const ok = await deleteTradeRate(input.id, member.id);
      return { success: ok };
    }),

  /** Configure all trade rates from wizard: applies labor type + region + specialty multipliers */
  configureRates: publicProcedure
    .input(z.object({
      laborType: z.string(),
      regionCode: z.string().nullable(),
      regionMultiplier: z.number().default(10000), // basis points, 10000 = 1.00x
      specialtyMultiplier: z.number().default(10000), // basis points, 10000 = 1.00x
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const lt = input.laborType as LaborType;
      const regionMult = input.regionMultiplier;
      const specMult = input.specialtyMultiplier;
      const rates: Array<{
        tradeName: string;
        csiDivision: string;
        classification: string;
        laborType: string;
        baseWageCents: number;
        regionCode?: string;
        notes: string;
      }> = [];

      for (const trade of TRADES) {
        for (const role of trade.roles) {
          const baseline = role.rates[lt] || 0;
          // Apply region and specialty multipliers
          const adjusted = Math.round((baseline * regionMult * specMult) / (10000 * 10000));
          rates.push({
            tradeName: trade.tradeName,
            csiDivision: trade.csiDivision,
            classification: role.roleKey,
            laborType: lt,
            baseWageCents: adjusted > 0 ? adjusted : baseline,
            regionCode: input.regionCode || undefined,
            notes: `Wizard: ${lt}${input.regionCode ? ` · ${input.regionCode}` : ''} · region ${(regionMult/10000).toFixed(2)}x · specialty ${(specMult/10000).toFixed(2)}x`,
          });
        }
      }

      const count = await bulkUpsertTradeRates(member.id, rates);
      return { success: true, count };
    }),

  // ─── Burden Configuration ─────────────────────────────────────────────

  /** Get all burden configs for the current member */
  getBurdenConfigs: publicProcedure.query(async ({ ctx }) => {
    const member = await requireMember(ctx);
    return getBurdenConfigs(member.id);
  }),

  /** Get burden config for a specific labor type (with optional trade override) */
  getBurdenForType: publicProcedure
    .input(z.object({ laborType: z.string(), tradeName: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const config = await getBurdenConfigByType(member.id, input.laborType, input.tradeName);
      if (config) return config;
      // Return defaults if no saved config
      const lt = input.laborType as LaborType;
      return DEFAULT_BURDENS[lt] || DEFAULT_BURDENS.com_open;
    }),

  /** Save burden config for a labor type */
  saveBurdenConfig: publicProcedure
    .input(z.object({
      laborType: z.string(),
      tradeName: z.string().optional(),
      ficaPct: z.number(),
      futaPct: z.number(),
      sutaPct: z.number(),
      workersCompPct: z.number(),
      generalLiabilityPct: z.number(),
      healthInsuranceCentsPerHr: z.number(),
      pensionPct: z.number(),
      vacationPct: z.number(),
      trainingPct: z.number(),
      unionFringeCentsPerHr: z.number(),
      otherCentsPerHr: z.number(),
      otherDescription: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const id = await upsertBurdenConfig({ memberId: member.id, ...input });
      return { success: true, id };
    }),

  /** Calculate fully burdened rate for a trade/classification/labor type */
  calculateBurdened: publicProcedure
    .input(z.object({
      baseWageCents: z.number(),
      laborType: z.string(),
      tradeName: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const config = await getBurdenConfigByType(member.id, input.laborType, input.tradeName);
      const burden: BurdenDefaults = config || DEFAULT_BURDENS[input.laborType as LaborType] || DEFAULT_BURDENS.com_open;
      const burdenedRate = calculateBurdenedRate(input.baseWageCents, burden);
      return { baseWageCents: input.baseWageCents, burdenedRateCents: burdenedRate };
    }),

  // ─── Crew Definitions ─────────────────────────────────────────────────

  /** Get all crews for the current member */
  getCrews: publicProcedure.query(async ({ ctx }) => {
    const member = await requireMember(ctx);
    return getCrewsByMember(member.id);
  }),

  /** Create a new crew */
  createCrew: publicProcedure
    .input(z.object({
      crewName: z.string().min(1),
      laborType: z.string(),
      crewMembers: z.string(), // JSON array
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const id = await createCrew({ memberId: member.id, ...input });
      return { success: true, id };
    }),

  /** Update a crew */
  updateCrew: publicProcedure
    .input(z.object({
      id: z.number(),
      crewName: z.string().optional(),
      laborType: z.string().optional(),
      crewMembers: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const { id, ...data } = input;
      const ok = await updateCrew(id, member.id, data);
      return { success: ok };
    }),

  /** Delete a crew */
  deleteCrew: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const ok = await deleteCrew(input.id, member.id);
      return { success: ok };
    }),

  /** Seed default crews for all CSI divisions */
  seedDefaultCrews: publicProcedure
    .input(z.object({ laborType: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const lt = input.laborType as LaborType;
      let created = 0;
      for (const dc of DEFAULT_CREWS) {
        await createCrew({
          memberId: member.id,
          crewName: dc.crewName,
          laborType: lt,
          crewMembers: JSON.stringify(dc.members.map(m => ({
            tradeName: m.tradeName,
            classification: m.roleKey,
            count: m.count,
          }))),
          notes: dc.description,
        });
        created++;
      }
      return { success: true, count: created };
    }),

  // ─── Activity Productivity ────────────────────────────────────────────

  /** Get all activity productivity factors for the current member */
  getActivityProductivity: publicProcedure.query(async ({ ctx }) => {
    const member = await requireMember(ctx);
    return getActivityProductivityByMember(member.id);
  }),

  /** Upsert an activity productivity factor */
  saveActivityProductivity: publicProcedure
    .input(z.object({
      csiDivision: z.string().optional(),
      description: z.string(),
      unit: z.string(),
      crewId: z.number().optional(),
      productivityPerCrewHr: z.string(),
      source: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const id = await upsertActivityProductivity({ memberId: member.id, ...input });
      return { success: true, id };
    }),

  /** Delete an activity productivity factor */
  deleteActivityProductivity: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const ok = await deleteActivityProductivity(input.id, member.id);
      return { success: ok };
    }),
});
