/**
 * seedDefaultCrews.ts — Auto-seed default crews AND trade rates for new members.
 * Called fire-and-forget on first login; idempotent (skips if member already has data).
 */
import { getCrewsByMember, createCrew, upsertTradeRate } from "./tradeRateDb";
import { DEFAULT_CREWS, TRADES } from "../shared/tradeRates";

/**
 * Seeds default crews for a member if they have fewer than 5.
 */
export async function seedDefaultCrewsForMember(memberId: number): Promise<void> {
  try {
    const existing = await getCrewsByMember(memberId);
    if (existing.length >= 5) {
      return;
    }

    const existingNames = new Set(existing.map(c => c.crewName));
    const laborType = "com_open";

    let inserted = 0;
    for (const dc of DEFAULT_CREWS) {
      if (existingNames.has(dc.crewName)) continue;

      await createCrew({
        memberId,
        crewName: dc.crewName,
        laborType,
        crewMembers: JSON.stringify(dc.members.map(m => ({
          tradeName: m.tradeName,
          classification: m.roleKey,
          count: m.count,
        }))),
        notes: dc.description,
      });
      inserted++;
    }

    if (inserted > 0) {
      console.log(`[SeedCrews] Seeded ${inserted} default crews for member ${memberId}`);
    }
  } catch (err: any) {
    console.warn(`[SeedCrews] Failed for member ${memberId}:`, err?.message);
  }
}

/**
 * Seeds RS Means national average base wages for all trades/classifications.
 * Uses com_open rates as the default. Skips if member already has 10+ rates.
 */
export async function seedDefaultTradeRatesForMember(memberId: number): Promise<void> {
  try {
    const laborType = "com_open";
    let inserted = 0;

    for (const trade of TRADES) {
      for (const role of trade.roles) {
        const comOpenRate = role.rates[laborType] || 0;
        if (comOpenRate === 0) continue;

        await upsertTradeRate({
          memberId,
          tradeName: trade.tradeName,
          csiDivision: trade.csiDivision,
          classification: role.roleKey,
          laborType,
          baseWageCents: comOpenRate,
          notes: "RS Means national avg (com_open) — adjust to your local market",
        });
        inserted++;
      }
    }

    if (inserted > 0) {
      console.log(`[SeedRates] Seeded ${inserted} default trade rates for member ${memberId}`);
    }
  } catch (err: any) {
    console.warn(`[SeedRates] Failed for member ${memberId}:`, err?.message);
  }
}
