/**
 * Emergency fix:
 * 1. Reset kevhes (kevin.hessam@gmail.com) to subscriptionStatus="none" so they're blocked
 * 2. Recreate Julian Hache's comped placeholder record
 */
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, like } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, boolean } from "drizzle-orm/mysql-core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const db = drizzle(process.env.DATABASE_URL);

const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  discordId: varchar("discordId", { length: 64 }).notNull().unique(),
  discordUsername: varchar("discordUsername", { length: 128 }),
  discordDisplayName: text("discordDisplayName"),
  discordAvatar: varchar("discordAvatar", { length: 256 }),
  email: varchar("email", { length: 320 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", [
    "active", "canceled", "past_due", "trialing", "incomplete", "none",
  ]).default("none").notNull(),
  memberRole: mysqlEnum("memberRole", ["member", "founding_member", "admin"]).default("member").notNull(),
  preferredCurrency: varchar("preferredCurrency", { length: 8 }),
  companyName: varchar("companyName", { length: 255 }),
  companyLogo: varchar("companyLogo", { length: 512 }),
  cpmOnboardingDone: boolean("cpmOnboardingDone").default(false).notNull(),
  scheduleSeeded: boolean("scheduleSeeded").default(false).notNull(),
  lastScaleIdx: int("lastScaleIdx").default(0),
  lastPaperIdx: int("lastPaperIdx").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

async function main() {
  // Step 1: Find kevhes's record (the one that stole Julian's placeholder)
  console.log("\n=== Step 1: Find and deactivate kevhes ===\n");
  
  const kevhesRecords = await db.select().from(members)
    .where(eq(members.email, "kevin.hessam@gmail.com"))
    .limit(5);
  
  // Also search by discord username pattern
  const byUsername = await db.select().from(members)
    .where(eq(members.discordUsername, "kevhes"))
    .limit(5);
  
  const allKevhes = [...kevhesRecords, ...byUsername];
  const uniqueIds = new Set();
  const deduped = allKevhes.filter(m => {
    if (uniqueIds.has(m.id)) return false;
    uniqueIds.add(m.id);
    return true;
  });
  
  if (deduped.length === 0) {
    console.log("  No records found for kevhes — checking by ID 1650002 (Julian's original)");
    const byId = await db.select().from(members).where(eq(members.id, 1650002)).limit(1);
    if (byId.length > 0) {
      console.log(`  Found record ID 1650002:`, {
        discordId: byId[0].discordId,
        discordUsername: byId[0].discordUsername,
        email: byId[0].email,
        subscriptionStatus: byId[0].subscriptionStatus,
      });
      // This is Julian's record that got merged with kevhes
      // Reset it to none and unlink Discord
      await db.update(members).set({
        subscriptionStatus: "none",
        discordId: `blocked:${byId[0].discordId}`,
        updatedAt: new Date(),
      }).where(eq(members.id, 1650002));
      console.log("  [OK] Reset ID 1650002 to subscriptionStatus=none and unlinked Discord");
    }
  } else {
    for (const record of deduped) {
      console.log(`  Found: ID=${record.id}, discordId=${record.discordId}, email=${record.email}, status=${record.subscriptionStatus}, username=${record.discordUsername}`);
      // Reset to none
      await db.update(members).set({
        subscriptionStatus: "none",
        memberRole: "member",
        updatedAt: new Date(),
      }).where(eq(members.id, record.id));
      console.log(`  [OK] Reset ID ${record.id} to subscriptionStatus=none`);
    }
  }

  // Step 2: Check if Julian's placeholder still exists or needs recreation
  console.log("\n=== Step 2: Recreate Julian Hache's comped placeholder ===\n");
  
  const julianRecords = await db.select().from(members)
    .where(eq(members.email, "hacheconstruction@gmail.com"))
    .limit(5);
  
  if (julianRecords.length > 0) {
    // Julian's record exists but may have been corrupted
    const julian = julianRecords[0];
    console.log(`  Existing record: ID=${julian.id}, discordId=${julian.discordId}, status=${julian.subscriptionStatus}`);
    
    if (julian.subscriptionStatus !== "active") {
      await db.update(members).set({
        subscriptionStatus: "active",
        memberRole: "founding_member",
        discordId: `email:hacheconstruction@gmail.com`,
        discordDisplayName: "Julian Hache",
        updatedAt: new Date(),
      }).where(eq(members.id, julian.id));
      console.log(`  [OK] Restored Julian's record to active/founding_member`);
    } else {
      console.log(`  Julian's record is already active — no changes needed`);
    }
  } else {
    // Create fresh placeholder
    await db.insert(members).values({
      discordId: `email:hacheconstruction@gmail.com`,
      email: "hacheconstruction@gmail.com",
      discordDisplayName: "Julian Hache",
      subscriptionStatus: "active",
      memberRole: "founding_member",
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`  [OK] Created new comped placeholder for Julian Hache (hacheconstruction@gmail.com)`);
  }

  // Verify final state
  console.log("\n=== Verification ===\n");
  const finalJulian = await db.select().from(members)
    .where(eq(members.email, "hacheconstruction@gmail.com"))
    .limit(1);
  if (finalJulian.length > 0) {
    console.log(`  Julian: ID=${finalJulian[0].id}, discordId=${finalJulian[0].discordId}, status=${finalJulian[0].subscriptionStatus}, role=${finalJulian[0].memberRole}`);
  }
  
  const finalKevhes = await db.select().from(members)
    .where(eq(members.discordUsername, "kevhes"))
    .limit(1);
  if (finalKevhes.length > 0) {
    console.log(`  kevhes: ID=${finalKevhes[0].id}, discordId=${finalKevhes[0].discordId}, status=${finalKevhes[0].subscriptionStatus}, role=${finalKevhes[0].memberRole}`);
  } else {
    console.log(`  kevhes: no record found by username`);
  }

  console.log("\n=== Done ===\n");
  process.exit(0);
}

main().catch(err => {
  console.error("[FATAL]", err);
  process.exit(1);
});
