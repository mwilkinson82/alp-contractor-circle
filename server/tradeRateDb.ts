/**
 * Trade Rate Library DB helpers.
 * CRUD for trade_rates, burden_configs, crew_definitions, activity_productivity.
 */
import { getDb as _getDb } from "./db";
import {
  tradeRates,
  burdenConfigs,
  crewDefinitions,
  activityProductivity,
  type TradeRate,
  type BurdenConfig,
  type CrewDefinition,
  type ActivityProductivity,
} from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";

async function db() {
  const d = await _getDb();
  if (!d) throw new Error("Database not available");
  return d;
}

// ─── Trade Rates ──────────────────────────────────────────────────────────────

export async function getTradeRatesByMember(memberId: number): Promise<TradeRate[]> {
  const d = await db();
  return d.select().from(tradeRates).where(eq(tradeRates.memberId, memberId));
}

export async function getTradeRatesByMemberAndType(memberId: number, laborType: string): Promise<TradeRate[]> {
  const d = await db();
  return d.select().from(tradeRates).where(
    and(eq(tradeRates.memberId, memberId), eq(tradeRates.laborType, laborType))
  );
}

export async function upsertTradeRate(data: {
  memberId: number;
  tradeName: string;
  csiDivision?: string;
  classification: string;
  laborType: string;
  baseWageCents: number;
  regionCode?: string;
  notes?: string;
}): Promise<number> {
  const d = await db();
  const existing = await d.select().from(tradeRates).where(
    and(
      eq(tradeRates.memberId, data.memberId),
      eq(tradeRates.tradeName, data.tradeName),
      eq(tradeRates.classification, data.classification),
      eq(tradeRates.laborType, data.laborType)
    )
  );
  if (existing.length > 0) {
    await d.update(tradeRates)
      .set({ baseWageCents: data.baseWageCents, regionCode: data.regionCode, notes: data.notes })
      .where(eq(tradeRates.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await d.insert(tradeRates).values(data as any);
  return result.insertId;
}

export async function bulkUpsertTradeRates(memberId: number, rates: Array<{
  tradeName: string;
  csiDivision?: string;
  classification: string;
  laborType: string;
  baseWageCents: number;
  regionCode?: string;
  notes?: string;
}>): Promise<number> {
  let count = 0;
  for (const rate of rates) {
    await upsertTradeRate({ memberId, ...rate });
    count++;
  }
  return count;
}

export async function deleteTradeRate(id: number, memberId: number): Promise<boolean> {
  const d = await db();
  const [result] = await d.delete(tradeRates).where(
    and(eq(tradeRates.id, id), eq(tradeRates.memberId, memberId))
  );
  return (result as any).affectedRows > 0;
}

// ─── Burden Configs ───────────────────────────────────────────────────────────

export async function getBurdenConfigs(memberId: number): Promise<BurdenConfig[]> {
  const d = await db();
  return d.select().from(burdenConfigs).where(eq(burdenConfigs.memberId, memberId));
}

export async function getBurdenConfigByType(memberId: number, laborType: string, tradeName?: string): Promise<BurdenConfig | null> {
  const d = await db();
  // If tradeName specified, look for trade-specific override first
  if (tradeName) {
    const tradeSpecific = await d.select().from(burdenConfigs).where(
      and(
        eq(burdenConfigs.memberId, memberId),
        eq(burdenConfigs.laborType, laborType),
        eq(burdenConfigs.tradeName, tradeName)
      )
    );
    if (tradeSpecific.length > 0) return tradeSpecific[0];
  }
  // Fall back to default for this labor type (tradeName is null)
  const results = await d.select().from(burdenConfigs).where(
    and(
      eq(burdenConfigs.memberId, memberId),
      eq(burdenConfigs.laborType, laborType),
      isNull(burdenConfigs.tradeName)
    )
  );
  return results[0] || null;
}

export async function upsertBurdenConfig(data: {
  memberId: number;
  laborType: string;
  tradeName?: string | null;
  ficaPct: number;
  futaPct: number;
  sutaPct: number;
  workersCompPct: number;
  generalLiabilityPct: number;
  healthInsuranceCentsPerHr: number;
  pensionPct: number;
  vacationPct: number;
  trainingPct: number;
  unionFringeCentsPerHr: number;
  otherCentsPerHr: number;
  otherDescription?: string;
}): Promise<number> {
  const d = await db();
  const conditions = data.tradeName
    ? and(
        eq(burdenConfigs.memberId, data.memberId),
        eq(burdenConfigs.laborType, data.laborType),
        eq(burdenConfigs.tradeName, data.tradeName)
      )
    : and(
        eq(burdenConfigs.memberId, data.memberId),
        eq(burdenConfigs.laborType, data.laborType),
        isNull(burdenConfigs.tradeName)
      );

  const existing = await d.select().from(burdenConfigs).where(conditions);

  if (existing.length > 0) {
    const { memberId, laborType, tradeName, ...updates } = data;
    await d.update(burdenConfigs).set(updates).where(eq(burdenConfigs.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await d.insert(burdenConfigs).values(data as any);
  return result.insertId;
}

// ─── Crew Definitions ─────────────────────────────────────────────────────────

export async function getCrewsByMember(memberId: number): Promise<CrewDefinition[]> {
  const d = await db();
  return d.select().from(crewDefinitions).where(eq(crewDefinitions.memberId, memberId));
}

export async function createCrew(data: {
  memberId: number;
  crewName: string;
  laborType: string;
  crewMembers: string;
  notes?: string;
}): Promise<number> {
  const d = await db();
  const [result] = await d.insert(crewDefinitions).values(data as any);
  return result.insertId;
}

export async function updateCrew(id: number, memberId: number, data: {
  crewName?: string;
  laborType?: string;
  crewMembers?: string;
  notes?: string;
}): Promise<boolean> {
  const d = await db();
  const [result] = await d.update(crewDefinitions).set(data).where(
    and(eq(crewDefinitions.id, id), eq(crewDefinitions.memberId, memberId))
  );
  return (result as any).affectedRows > 0;
}

export async function deleteCrew(id: number, memberId: number): Promise<boolean> {
  const d = await db();
  const [result] = await d.delete(crewDefinitions).where(
    and(eq(crewDefinitions.id, id), eq(crewDefinitions.memberId, memberId))
  );
  return (result as any).affectedRows > 0;
}

// ─── Activity Productivity ────────────────────────────────────────────────────

export async function getActivityProductivityByMember(memberId: number): Promise<ActivityProductivity[]> {
  const d = await db();
  return d.select().from(activityProductivity).where(eq(activityProductivity.memberId, memberId));
}

export async function upsertActivityProductivity(data: {
  memberId: number;
  csiDivision?: string;
  description: string;
  unit: string;
  crewId?: number;
  productivityPerCrewHr: string;
  source?: string;
  notes?: string;
}): Promise<number> {
  const d = await db();
  const existing = await d.select().from(activityProductivity).where(
    and(
      eq(activityProductivity.memberId, data.memberId),
      eq(activityProductivity.description, data.description),
      eq(activityProductivity.unit, data.unit)
    )
  );
  if (existing.length > 0) {
    const { memberId, ...updates } = data;
    await d.update(activityProductivity).set(updates).where(eq(activityProductivity.id, existing[0].id));
    return existing[0].id;
  }
  const [result] = await d.insert(activityProductivity).values(data as any);
  return result.insertId;
}

export async function deleteActivityProductivity(id: number, memberId: number): Promise<boolean> {
  const d = await db();
  const [result] = await d.delete(activityProductivity).where(
    and(eq(activityProductivity.id, id), eq(activityProductivity.memberId, memberId))
  );
  return (result as any).affectedRows > 0;
}

// ─── Rate Profiles ────────────────────────────────────────────────────────────

import { rateProfiles, type RateProfile, type InsertRateProfile } from "../drizzle/schema";

export async function getRateProfilesByMember(memberId: number): Promise<RateProfile[]> {
  const d = await db();
  return d.select().from(rateProfiles).where(eq(rateProfiles.memberId, memberId));
}

export async function getRateProfileById(id: number, memberId: number): Promise<RateProfile | null> {
  const d = await db();
  const rows = await d.select().from(rateProfiles).where(
    and(eq(rateProfiles.id, id), eq(rateProfiles.memberId, memberId))
  );
  return rows[0] ?? null;
}

export async function createRateProfile(data: Omit<InsertRateProfile, "id" | "createdAt" | "updatedAt">): Promise<number> {
  const d = await db();
  const result = await d.insert(rateProfiles).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function updateRateProfile(id: number, memberId: number, data: Partial<Omit<InsertRateProfile, "id" | "memberId" | "createdAt" | "updatedAt">>): Promise<void> {
  const d = await db();
  await d.update(rateProfiles).set(data).where(
    and(eq(rateProfiles.id, id), eq(rateProfiles.memberId, memberId))
  );
}

export async function deleteRateProfile(id: number, memberId: number): Promise<void> {
  const d = await db();
  await d.delete(rateProfiles).where(
    and(eq(rateProfiles.id, id), eq(rateProfiles.memberId, memberId))
  );
}
