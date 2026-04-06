/**
 * Send Monthly Bootcamp announcement to ALL active members.
 * Deduplication: tracks sent emails to prevent double-sends.
 * Run ONCE only.
 */
import { sendBootcampAnnouncementEmail } from "./server/email.ts";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get all active members with real emails (no nulls, no placeholders)
  const [rows] = await conn.execute(
    `SELECT id, email, discordDisplayName, discordUsername 
     FROM members 
     WHERE subscriptionStatus = 'active' 
       AND email IS NOT NULL 
       AND email != ''
       AND email NOT LIKE 'placeholder_%'
     ORDER BY id`
  );
  
  console.log(`Found ${rows.length} active members with valid emails.`);
  
  // Deduplicate by email address (in case of any remaining duplicates)
  const sentEmails = new Set();
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const member of rows) {
    const email = member.email.toLowerCase().trim();
    
    if (sentEmails.has(email)) {
      console.log(`⏭️  SKIP duplicate email: ${email} (member id=${member.id})`);
      skipped++;
      continue;
    }
    
    const name = member.discordDisplayName || member.discordUsername || "Member";
    const firstName = name.split(/[\s_]/)[0];
    
    try {
      const result = await sendBootcampAnnouncementEmail({
        to: email,
        name: firstName,
      });
      
      if (result.success) {
        sentEmails.add(email);
        sent++;
        console.log(`✅ ${sent}. ${firstName} <${email}> — Resend ID: ${result.id}`);
      } else {
        failed++;
        console.error(`❌ FAILED: ${email} — ${result.error}`);
      }
    } catch (err) {
      failed++;
      console.error(`❌ ERROR: ${email} — ${err.message}`);
    }
    
    // Small delay between sends
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n=== DONE ===`);
  console.log(`Sent: ${sent} | Skipped (duplicate): ${skipped} | Failed: ${failed}`);
  console.log(`Total unique emails sent: ${sentEmails.size}`);
  
  await conn.end();
}

main().catch(console.error);
