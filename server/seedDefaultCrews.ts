/**
 * seedDefaultCrews.ts — Auto-seed default crews for new members.
 * Called fire-and-forget on first login; idempotent (skips if member already has crews).
 */
import { getCrewsByMember, createCrew } from "./tradeRateDb";
import { DEFAULT_CREWS } from "../shared/tradeRates";

export async function seedDefaultCrewsForMember(memberId: number): Promise<void> {
  try {
    const existing = await getCrewsByMember(memberId);
    if (existing.length >= 5) {
      // Member already has a meaningful set of crews — skip
      return;
    }

    const existingNames = new Set(existing.map(c => c.crewName));
    const laborType = "com_open"; // default; user can change per crew later

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
