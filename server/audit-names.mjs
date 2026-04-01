import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { members } from "../drizzle/schema.ts";
import { isNotNull, eq, and } from "drizzle-orm";

const connection = await mysql.createPool(process.env.DATABASE_URL);
const db = drizzle(connection);

const rows = await db
  .select({
    id: members.id,
    discordDisplayName: members.discordDisplayName,
    email: members.email,
    subscriptionStatus: members.subscriptionStatus,
  })
  .from(members)
  .where(
    and(
      isNotNull(members.email),
      eq(members.subscriptionStatus, "active")
    )
  );

console.log("\n=== FULL MEMBER AUDIT — What each person received ===\n");
console.log("Email                                  | DB Name (discordDisplayName)    | First Name Used in Email | ISSUE?");
console.log("---------------------------------------|---------------------------------|--------------------------|-------");

for (const r of rows) {
  if (!r.email || !r.discordDisplayName) continue;
  const firstName = r.discordDisplayName.split(" ")[0] || "there";
  const looksLikeUsername = /[0-9]/.test(r.discordDisplayName) || r.discordDisplayName === r.discordDisplayName.toLowerCase() || r.discordDisplayName.includes("_");
  const issue = looksLikeUsername ? "⚠️  LOOKS LIKE USERNAME" : "OK";
  console.log(`${r.email.padEnd(38)} | ${r.discordDisplayName.padEnd(31)} | ${firstName.padEnd(24)} | ${issue}`);
}

console.log("\n=== RAW DATA ===\n");
for (const r of rows) {
  console.log(JSON.stringify({ id: r.id, email: r.email, discordDisplayName: r.discordDisplayName, firstName: (r.discordDisplayName || "").split(" ")[0] }));
}

await connection.end();
