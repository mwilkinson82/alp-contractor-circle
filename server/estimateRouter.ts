/**
 * Estimate Router — markup configuration and estimate summary for takeoff projects.
 */
import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getEstimateMarkup, upsertEstimateMarkup } from "./estimateDb";
import {
  inferLaborForItemsPreview,
  inferLaborByTasks,
  type TaskGroup,
} from "./laborInference";
import { getDb as _getDb } from "./db";
import { crewDefinitions, activityProductivity } from "../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import {
  parseMemberCookie,
  verifyMemberSession,
  getMemberById,
} from "./discord";
import { getBetaUserFromRequest } from "./betaAuth";
import type { Member } from "../drizzle/schema";
import { logActivity } from "./activityLogDb";

const BETA_MEMBER_OFFSET = 10_000_000;

/** Whitelisted member IDs — bypass subscription check. Daniel G (1320007), alpteambot (360002). */
const WHITELISTED_MEMBER_IDS = new Set([1320007, 360002]);

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
  // Beta users bypass subscription check
  if (member.id >= BETA_MEMBER_OFFSET) return member;
  // Whitelisted members bypass subscription check
  if (WHITELISTED_MEMBER_IDS.has(member.id)) return member;
  // Everyone else must have an active subscription
  if (member.subscriptionStatus !== "active") {
    throw new Error(
      "An active Contractor Circle subscription is required to access this feature."
    );
  }
  return member;
}

export const estimateRouter = router({
  getMarkups: publicProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const markup = await getEstimateMarkup(input.projectId, member.id);
      return (
        markup || {
          overheadPct: 1000,
          profitPct: 1000,
          contingencyPct: 500,
          bondPct: 150,
          taxPct: 0,
          generalConditionsPct: 0,
          customMarkups: null,
        }
      );
    }),

  saveMarkups: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        overheadPct: z.number().min(0).max(10000),
        profitPct: z.number().min(0).max(10000),
        contingencyPct: z.number().min(0).max(10000),
        bondPct: z.number().min(0).max(10000),
        taxPct: z.number().min(0).max(10000),
        generalConditionsPct: z.number().min(0).max(10000),
      })
    )
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
    .input(
      z.object({
        projectId: z.number(),
        items: z.array(
          z.object({
            description: z.string(),
            unit: z.string(),
            quantity: z.number(),
            csiDivision: z.string(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const db = await _getDb();
      if (!db) throw new Error("Database not available");
      const crews = await db
        .select()
        .from(crewDefinitions)
        .where(eq(crewDefinitions.memberId, member.id));
      if (crews.length === 0) {
        return {
          success: false,
          message:
            "No crew definitions found. Please set up your crews in the Trade Rate Library first.",
          assignments: [] as Array<{
            description: string;
            unit: string;
            csiDivision: string;
            crewId: number | null;
            crewName: string;
            productivityPerCrewHr: number;
            reasoning: string;
          }>,
        };
      }
      // Returns assignments WITHOUT saving — user reviews first
      const assignments = await inferLaborForItemsPreview(input.items, crews, {
        projectId: input.projectId,
      });
      return {
        success: true,
        message: `AI analyzed ${assignments.length} items`,
        assignments,
      };
    }),

  /**
   * inferLaborByTasks — clusters items into installation tasks, assigns one crew per task.
   * Returns task groups for the review panel with inline crew editing.
   */
  inferLaborByTasks: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        items: z.array(
          z.object({
            description: z.string(),
            unit: z.string(),
            quantity: z.number(),
            csiDivision: z.string(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const db = await _getDb();
      if (!db) throw new Error("Database not available");
      const crews = await db
        .select()
        .from(crewDefinitions)
        .where(eq(crewDefinitions.memberId, member.id));
      if (crews.length === 0) {
        return {
          success: false,
          message:
            "No crew definitions found. Please set up your crews in the Trade Rate Library first.",
          tasks: [] as TaskGroup[],
        };
      }
      const tasks = await inferLaborByTasks(input.items, crews, {
        projectId: input.projectId,
      });
      // Log activity
      const displayName =
        member.discordDisplayName || member.discordUsername || "Unknown";
      logActivity(
        member.id,
        displayName,
        "labor_inferred",
        `ran labor AI on ${input.items.length} items`,
        `/portal/takeoff/${input.projectId}`
      );
      return {
        success: true,
        message: `ConstructLine grouped ${input.items.length} items into ${tasks.length} installation tasks`,
        tasks,
      };
    }),

  /**
   * confirmTaskAssignments — saves user-approved task-based assignments to activity_productivity.
   */
  confirmTaskAssignments: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        tasks: z.array(
          z.object({
            crewId: z.number().nullable(),
            items: z.array(
              z.object({
                description: z.string(),
                unit: z.string(),
                csiDivision: z.string(),
                productivityPerCrewHr: z.number(),
              })
            ),
            reasoning: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const db = await _getDb();
      if (!db) throw new Error("Database not available");

      // Flatten tasks into individual assignments (only tasks with a crew)
      const assignments = input.tasks
        .filter(t => t.crewId !== null)
        .flatMap(t =>
          t.items.map(item => ({
            memberId: member.id,
            csiDivision: item.csiDivision,
            description: item.description,
            unit: item.unit,
            crewId: t.crewId as number,
            productivityPerCrewHr: String(item.productivityPerCrewHr),
            source: "ai_inferred" as const,
            notes: t.reasoning || null,
          }))
        );

      // Delete existing AI-inferred entries for these descriptions
      const descs = assignments.map(a => a.description);
      if (descs.length > 0) {
        for (let i = 0; i < descs.length; i += 50) {
          const batch = descs.slice(i, i + 50);
          await db
            .delete(activityProductivity)
            .where(
              and(
                eq(activityProductivity.memberId, member.id),
                eq(activityProductivity.source, "ai_inferred"),
                inArray(activityProductivity.description, batch)
              )
            );
        }
      }

      for (let i = 0; i < assignments.length; i += 50) {
        await db
          .insert(activityProductivity)
          .values(assignments.slice(i, i + 50));
      }

      // Log activity
      const displayName2 =
        member.discordDisplayName || member.discordUsername || "Unknown";
      logActivity(
        member.id,
        displayName2,
        "estimate_confirmed",
        `confirmed ${assignments.length} labor assignments`,
        `/portal/takeoff/${input.projectId}`
      );
      return {
        success: true,
        message: `Saved ${assignments.length} labor assignments from ${input.tasks.filter(t => t.crewId !== null).length} tasks`,
      };
    }),

  /**
   * confirmLaborAssignments — saves user-approved AI assignments to activity_productivity.
   * Called after user reviews and optionally overrides the AI suggestions.
   */
  confirmLaborAssignments: publicProcedure
    .input(
      z.object({
        projectId: z.number(),
        assignments: z.array(
          z.object({
            description: z.string(),
            unit: z.string(),
            csiDivision: z.string(),
            crewId: z.number(),
            productivityPerCrewHr: z.number(),
            notes: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await requireMember(ctx);
      const db = await _getDb();
      if (!db) throw new Error("Database not available");

      // Delete existing AI-inferred entries for these descriptions
      const descs = input.assignments.map(a => a.description);
      if (descs.length > 0) {
        for (let i = 0; i < descs.length; i += 50) {
          const batch = descs.slice(i, i + 50);
          await db
            .delete(activityProductivity)
            .where(
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
