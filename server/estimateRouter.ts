/**
 * Estimate Router — markup configuration and estimate summary for takeoff projects.
 */
import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getEstimateMarkup, upsertEstimateMarkup } from "./estimateDb";
import { inferLaborForItemsPreview } from "./laborInference";
import { getDb as _getDb } from "./db";
import { crewDefinitions, activityProductivity } from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
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

  /**
   * inferLabor — calls LLM to analyze items and returns assignments for REVIEW.
   * Does NOT save to database. User reviews, overrides if needed, then calls confirmLaborAssignments.
   */
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
        return {
          success: false,
          message: "No crew definitions found. Please set up your crews in the Trade Rate Library first.",
          assignments: [] as Array<{
            description: string; unit: string; csiDivision: string;
            crewId: number | null; crewName: string;
            productivityPerCrewHr: number; reasoning: string;
          }>,
        };
      }
      // Returns assignments WITHOUT saving — user reviews first
      const assignments = await inferLaborForItemsPreview(input.items, crews);
      return {
        success: true,
        message: `AI analyzed ${assignments.length} items`,
        assignments,
      };
    }),

  /**
   * confirmLaborAssignments — saves user-approved AI assignments to activity_productivity.
   * Called after user reviews and optionally overrides the AI suggestions.
   */
  confirmLaborAssignments: publicProcedure
    .input(z.object({
      projectId: z.number(),
      assignments: z.array(z.object({
        description: z.string(),
        unit: z.string(),
        csiDivision: z.string(),
        crewId: z.number(),
        productivityPerCrewHr: z.number(),
        notes: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const db = await _getDb();
      if (!db) throw new Error("Database not available");

      // Delete existing AI-inferred entries for these descriptions
      const descs = input.assignments.map(a => a.description);
      if (descs.length > 0) {
        for (let i = 0; i < descs.length; i += 50) {
          const batch = descs.slice(i, i + 50);
          await db.delete(activityProductivity).where(
            and(
              eq(activityProductivity.memberId, member.id),
              eq(activityProductivity.source, "ai_inferred"),
              inArray(activityProductivity.description, batch)
            )
          );
        }
      }

      // Insert confirmed assignments
      const toInsert = input.assignments.map(a => ({
        memberId: member.id,
        csiDivision: a.csiDivision,
        description: a.description,
        unit: a.unit,
        crewId: a.crewId,
        productivityPerCrewHr: String(a.productivityPerCrewHr),
        source: "ai_inferred" as const,
        notes: a.notes || null,
      }));

      for (let i = 0; i < toInsert.length; i += 50) {
        await db.insert(activityProductivity).values(toInsert.slice(i, i + 50));
      }

      return {
        success: true,
        message: `Saved ${toInsert.length} labor assignments`,
      };
    }),
});
