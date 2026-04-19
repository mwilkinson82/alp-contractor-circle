/**
 * Estimate Router — markup configuration and estimate summary for takeoff projects.
 */
import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getEstimateMarkup, upsertEstimateMarkup } from "./estimateDb";
import { inferLaborForItems } from "./laborInference";
import { getDb as _getDb } from "./db";
import { crewDefinitions } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { parseMemberCookie, verifyMemberSession, getMemberById } from "./discord";
import { getBetaUserFromRequest } from "./betaAuth";
import type { Member } from "../drizzle/schema";

const BETA_MEMBER_OFFSET = 10_000_000;
async function getMemberFromReq(req: any): Promise<Member | null> {
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
  const member = await getMemberFromReq(ctx.req);
  if (!member) throw new Error("Not a member");
  return member;
}

export const estimateRouter = router({
  getMarkups: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const markup = await getEstimateMarkup(input.projectId, member.id);
      return markup || {
        overheadPct: 1000,
        profitPct: 1000,
        contingencyPct: 500,
        bondPct: 150,
        taxPct: 0,
        generalConditionsPct: 0,
        customMarkups: null,
      };
    }),

  saveMarkups: publicProcedure
    .input(z.object({
      projectId: z.number(),
      overheadPct: z.number().min(0).max(10000),
      profitPct: z.number().min(0).max(10000),
      contingencyPct: z.number().min(0).max(10000),
      bondPct: z.number().min(0).max(10000),
      taxPct: z.number().min(0).max(10000),
      generalConditionsPct: z.number().min(0).max(10000),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const { projectId, ...markups } = input;
      const id = await upsertEstimateMarkup(projectId, member.id, markups);
      return { success: true, id };
    }),

  inferLabor: publicProcedure
    .input(z.object({
      projectId: z.number(),
      items: z.array(z.object({
        description: z.string(),
        unit: z.string(),
        quantity: z.number(),
        csiDivision: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const db = await _getDb();
      if (!db) throw new Error("Database not available");
      const crews = await db.select().from(crewDefinitions).where(eq(crewDefinitions.memberId, member.id));
      if (crews.length === 0) {
        return { success: false, message: "No crew definitions found. Please set up your crews in the Trade Rate Library first.", assignments: [] };
      }
      const assignments = await inferLaborForItems(member.id, input.items, crews);
      return {
        success: true,
        message: `AI matched ${assignments.filter(a => a.crewId !== null).length} of ${assignments.length} items to crews`,
        assignments,
      };
    }),
});
