/**
 * Estimate Router — markup configuration and estimate summary for takeoff projects.
 */
import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getEstimateMarkup, upsertEstimateMarkup } from "./estimateDb";
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
});
