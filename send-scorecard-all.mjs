/**
 * Send ALP/EOS Scorecard announcement to ALL active members.
 */
import mysql from "mysql2/promise";
import { sendEosScorecardAnnouncementEmail } from "./server/email.ts";

async function main() {
  const c = await mysql.createConnection(process.env.DATABASE_URL);

  // Get all active members with real emails (not null, not placeholder)
  const [rows] = await c.execute(
    "SELECT id, email, discordDisplayName, discordUsername FROM members WHERE subscriptionStatus = 'active' AND email IS NOT NULL AND email != ''"
  );

  console.log(`Found ${rows.length} active members with emails:\n`);
  for (const m of rows) {
    console.log(`  ${m.id} | ${m.discordDisplayName || m.discordUsername} | ${m.email}`);
  }
  console.log("");

  let sent = 0;
  let failed = 0;

  for (const m of rows) {
    const name = m.discordDisplayName || m.discordUsername || "there";
    console.log(`Sending to ${name} (${m.email})...`);
    const result = await sendEosScorecardAnnouncementEmail({
      to: m.email,
      name,
    });
    if (result.success) {
      sent++;
      console.log(`  ✅ Sent — id: ${result.id}`);
    } else {
      failed++;
      console.log(`  ❌ Failed — ${result.error}`);
    }
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Done. Sent: ${sent} | Failed: ${failed} | Total: ${rows.length}`);

  await c.end();
}

main().catch(console.error);
