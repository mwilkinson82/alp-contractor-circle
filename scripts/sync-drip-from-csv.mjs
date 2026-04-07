/**
 * Sync Drip Database from Claude Code's CSV Send History
 * 
 * This script:
 * 1. Reads the CSV of what was actually sent by Claude Code
 * 2. Clears the placeholder enrollments/sent records we inserted earlier
 * 3. Re-creates enrollments with the CORRECT currentStep based on actual sends
 * 4. Logs every actual send into drip_sent_emails with real Resend IDs
 * 5. Identifies today's new leads who haven't been sent anything yet
 * 6. Sets nextSendAt correctly for each person based on where they are
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

// Map CSV sequence names to our DB enum values
const SEQ_MAP = {
  "Estimating Checklist": "estimating_single",
  "Q1/Q2 Framework": "q1q2_single",
  "Double-Dipper": "double_dipper",
  "Homepage-Only": "homepage_only",
};

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // ─── Parse CSV ────────────────────────────────────────────────────────
  const csvPath = "/home/ubuntu/upload/drip_send_history.csv";
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split("\n").slice(1); // skip header

  // Parse CSV properly (handles quoted fields with commas)
  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  }

  // Build per-email send history
  const sendHistory = {}; // email -> { firstName, sequence, sends: [{emailNum, subject, sentDate, resendId}] }

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = parseCSVLine(line);
    const [email, firstName, _segment, sequence, emailNum, subject, sentDate, resendId] = fields;

    const seqId = SEQ_MAP[sequence];
    if (!seqId) {
      console.warn(`Unknown sequence: "${sequence}" for ${email}`);
      continue;
    }

    if (!sendHistory[email]) {
      sendHistory[email] = { firstName, sequenceId: seqId, sends: [] };
    }

    sendHistory[email].sends.push({
      emailNum: parseInt(emailNum),
      subject,
      sentDate,
      resendId,
    });
  }

  // ─── CC Members to exclude from future sends ─────────────────────────
  const [members] = await conn.execute(
    `SELECT email FROM members WHERE subscriptionStatus = 'active'`
  );
  const ccEmails = new Set(members.map((m) => m.email.toLowerCase()));
  const testEmails = new Set([
    "test@example.com",
    "marshall@marshallwilkinson.com",
    "wilkinson.marshall@gmail.com",
  ]);

  // ─── Analyze the data ─────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("  CSV SEND HISTORY ANALYSIS");
  console.log("═══════════════════════════════════════════");
  console.log(`  Total unique emails in CSV: ${Object.keys(sendHistory).length}`);

  // Find max email # per sequence
  const maxBySeq = {};
  for (const [email, data] of Object.entries(sendHistory)) {
    if (!maxBySeq[data.sequenceId]) maxBySeq[data.sequenceId] = 0;
    const maxNum = Math.max(...data.sends.map((s) => s.emailNum));
    if (maxNum > maxBySeq[data.sequenceId]) maxBySeq[data.sequenceId] = maxNum;
  }
  console.log("\n  Max email # sent per sequence:");
  for (const [seq, max] of Object.entries(maxBySeq)) {
    console.log(`    ${seq}: up to email #${max}`);
  }

  // Count by sequence and max step reached
  const stepCounts = {};
  for (const [email, data] of Object.entries(sendHistory)) {
    const maxStep = Math.max(...data.sends.map((s) => s.emailNum));
    const key = `${data.sequenceId}:step${maxStep}`;
    stepCounts[key] = (stepCounts[key] || 0) + 1;
  }
  console.log("\n  Distribution of max step reached:");
  for (const [key, count] of Object.entries(stepCounts).sort()) {
    console.log(`    ${key}: ${count} people`);
  }

  // CC members who got drip emails (shouldn't have!)
  const ccGotDrip = [];
  for (const [email, data] of Object.entries(sendHistory)) {
    if (ccEmails.has(email.toLowerCase())) {
      ccGotDrip.push({ email, sends: data.sends.length });
    }
  }
  if (ccGotDrip.length > 0) {
    console.log("\n  ⚠️  CC MEMBERS WHO GOT DRIP EMAILS (will be marked 'converted'):");
    ccGotDrip.forEach((c) => console.log(`    ${c.email} (${c.sends} emails)`));
  }

  // ─── Clear old placeholder data ───────────────────────────────────────
  if (!DRY_RUN) {
    console.log("\n📝 Clearing old placeholder enrollments...");
    await conn.execute("DELETE FROM drip_sent_emails");
    await conn.execute("DELETE FROM drip_enrollments");
    console.log("  ✅ Old data cleared.");
  }

  // ─── Insert real enrollments from CSV ─────────────────────────────────
  console.log("\n📝 Creating enrollments from actual send history...");

  let inserted = 0;
  let sentLogged = 0;

  // Today's new leads who came in today and need to be added
  // (they're in the leads table but NOT in the CSV because Claude Code didn't send to them)
  const csvEmails = new Set(Object.keys(sendHistory).map((e) => e.toLowerCase()));

  for (const [email, data] of Object.entries(sendHistory)) {
    const maxStep = Math.max(...data.sends.map((s) => s.emailNum));
    const isCC = ccEmails.has(email.toLowerCase());
    const isTest = testEmails.has(email.toLowerCase());

    // Determine status
    let status = "active";
    if (isCC) status = "converted"; // CC members shouldn't get more emails
    if (isTest) status = "paused"; // Test emails paused

    // Calculate nextSendAt: tomorrow at 10 AM ET for active leads
    const tomorrowAt10am = new Date("2026-04-07T14:00:00.000Z");
    const nextSendAt = status === "active" ? tomorrowAt10am : null;

    if (!DRY_RUN) {
      const [result] = await conn.execute(
        `INSERT INTO drip_enrollments (email, firstName, sequenceId, currentStep, status, nextSendAt, enrolledAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          email,
          data.firstName,
          data.sequenceId,
          maxStep,
          status,
          nextSendAt,
          data.sends[0].sentDate, // enrolled when first email was sent
        ]
      );

      const enrollmentId = result.insertId;

      // Log each actual send
      for (const send of data.sends) {
        await conn.execute(
          `INSERT INTO drip_sent_emails (enrollmentId, email, sequenceId, stepNumber, resendId, status, sentAt)
           VALUES (?, ?, ?, ?, ?, 'sent', ?)`,
          [enrollmentId, email, data.sequenceId, send.emailNum, send.resendId, send.sentDate]
        );
        sentLogged++;
      }

      inserted++;
    } else {
      console.log(
        `  ${status.padEnd(10)} ${data.sequenceId.padEnd(20)} step=${maxStep} ${email}`
      );
      inserted++;
      sentLogged += data.sends.length;
    }
  }

  // ─── Now find leads NOT in CSV (today's new signups) ──────────────────
  console.log("\n📝 Checking for leads NOT in CSV (today's new signups)...");

  const [allLeads] = await conn.execute(`
    SELECT email, MAX(firstName) as firstName,
           GROUP_CONCAT(DISTINCT source ORDER BY source) as sources
    FROM leads
    WHERE createdAt >= '2026-04-06 00:00:00'
    GROUP BY email
  `);

  const newLeads = [];
  for (const lead of allLeads) {
    const email = lead.email.toLowerCase();
    if (ccEmails.has(email) || testEmails.has(email)) continue;
    if (csvEmails.has(email)) continue; // already in CSV

    const sources = lead.sources.split(",");
    const hasEstimating = sources.includes("estimating-checklist");
    const hasQ1Q2 = sources.includes("q1-q2-framework");

    let sequenceId;
    if (hasEstimating && hasQ1Q2) {
      sequenceId = "double_dipper";
    } else if (hasEstimating) {
      sequenceId = "estimating_single";
    } else if (hasQ1Q2) {
      sequenceId = "q1q2_single";
    } else {
      continue;
    }

    newLeads.push({ email: lead.email, firstName: lead.firstName, sequenceId });
  }

  if (newLeads.length > 0) {
    console.log(`\n  Found ${newLeads.length} NEW leads from today not in CSV:`);
    for (const nl of newLeads) {
      console.log(`    ${nl.sequenceId.padEnd(20)} ${nl.email} (${nl.firstName})`);

      if (!DRY_RUN) {
        // These people haven't received ANY drip emails yet
        // They need to start at step 0 (no emails sent)
        // But they DID get the lead magnet delivery email (that's separate from drip)
        // So start them at step 0, next email is step 1 tomorrow
        const tomorrowAt10am = new Date("2026-04-07T14:00:00.000Z");
        await conn.execute(
          `INSERT INTO drip_enrollments (email, firstName, sequenceId, currentStep, status, nextSendAt)
           VALUES (?, ?, ?, 0, 'active', ?)`,
          [nl.email, nl.firstName, nl.sequenceId, tomorrowAt10am]
        );
        inserted++;
      }
    }
  } else {
    console.log("  No new leads found outside CSV.");
  }

  // Also add tony.a.munoz@gmail.com (homepage-only from today, not in CSV)
  const [hpToday] = await conn.execute(`
    SELECT es.email FROM email_subscribers es
    WHERE es.source = 'homepage_capture'
    AND es.createdAt >= '2026-04-06 00:00:00'
    AND es.email NOT IN (SELECT email FROM leads)
  `);
  for (const hp of hpToday) {
    if (csvEmails.has(hp.email.toLowerCase())) continue;
    if (ccEmails.has(hp.email.toLowerCase()) || testEmails.has(hp.email.toLowerCase())) continue;
    console.log(`  NEW homepage-only from today: ${hp.email}`);
    if (!DRY_RUN) {
      const tomorrowAt10am = new Date("2026-04-07T14:00:00.000Z");
      await conn.execute(
        `INSERT INTO drip_enrollments (email, firstName, sequenceId, currentStep, status, nextSendAt)
         VALUES (?, ?, 'homepage_only', 0, 'active', ?)`,
        [hp.email, "there", tomorrowAt10am]
      );
      inserted++;
    }
  }

  // ─── Final Summary ────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════");
  console.log("  SYNC COMPLETE");
  console.log("═══════════════════════════════════════════");
  console.log(`  Enrollments created: ${inserted}`);
  console.log(`  Send records logged: ${sentLogged}`);
  if (DRY_RUN) console.log("\n  🔶 DRY RUN — no database changes made.");
  else console.log("  ✅ Database synced with actual send history.");

  // ─── Verify final state ───────────────────────────────────────────────
  if (!DRY_RUN) {
    const [enrollCounts] = await conn.execute(`
      SELECT sequenceId, status, currentStep, COUNT(*) as cnt
      FROM drip_enrollments
      GROUP BY sequenceId, status, currentStep
      ORDER BY sequenceId, status, currentStep
    `);
    console.log("\n  FINAL ENROLLMENT STATE:");
    for (const row of enrollCounts) {
      console.log(
        `    ${row.sequenceId.padEnd(20)} ${row.status.padEnd(12)} step=${row.currentStep} : ${row.cnt} people`
      );
    }

    const [sentCounts] = await conn.execute(`
      SELECT sequenceId, stepNumber, COUNT(*) as cnt
      FROM drip_sent_emails
      GROUP BY sequenceId, stepNumber
      ORDER BY sequenceId, stepNumber
    `);
    console.log("\n  SENT EMAIL LOG:");
    for (const row of sentCounts) {
      console.log(`    ${row.sequenceId.padEnd(20)} email #${row.stepNumber}: ${row.cnt} sent`);
    }
  }

  await conn.end();
}

main().catch(console.error);
