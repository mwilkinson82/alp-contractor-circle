/**
 * Drip Campaign Enrollment Script
 * 
 * Enrolls all leads into the correct drip sequences:
 * 1. estimating_single — Estimating Checklist single-dippers
 * 2. q1q2_single — Q1/Q2 Framework single-dippers
 * 3. double_dipper — Grabbed both lead magnets
 * 4. homepage_only — Homepage email capture only (no lead magnet)
 * 
 * Rules:
 * - Excludes active CC members
 * - Excludes test/Marshall emails
 * - Today's 3 double-dippers (Ventura, Mike/Grind, Nathan/Brighter) skip Day 0
 * - Everyone who got Day 0 yesterday advances to step 1 with next email tomorrow
 * - Logs everything sent to drip_sent_emails to prevent duplicates
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  // ─── Active CC member emails (EXCLUDE from all drip sequences) ────────
  const [members] = await conn.execute(
    `SELECT email FROM members WHERE subscriptionStatus = 'active'`
  );
  const ccEmails = new Set(members.map((m) => m.email.toLowerCase()));

  // Test / internal emails to exclude
  const excludeEmails = new Set([
    "test@example.com",
    "marshall@marshallwilkinson.com",
    "wilkinson.marshall@gmail.com",
  ]);

  // ─── Get all leads grouped by email ───────────────────────────────────
  const [allLeads] = await conn.execute(`
    SELECT email, MAX(firstName) as firstName,
           GROUP_CONCAT(DISTINCT source ORDER BY source) as sources,
           COUNT(DISTINCT source) as sourceCount,
           MIN(createdAt) as firstEntry,
           MAX(createdAt) as latestEntry
    FROM leads
    GROUP BY email
    ORDER BY email
  `);

  // ─── Get homepage-only subscribers (in email_subscribers but NOT in leads) ─
  const [homepageOnly] = await conn.execute(`
    SELECT es.email, es.createdAt
    FROM email_subscribers es
    WHERE es.source = 'homepage_capture'
    AND es.email NOT IN (SELECT email FROM leads)
    ORDER BY es.createdAt
  `);

  // ─── Today's 3 double-dippers who should SKIP Day 0 ──────────────────
  const todayDoubleDippers = new Set([
    "arq.venturamendoza@gmail.com",
    "mike@grindconstructionservices.com",
    "nathan@brighterhometiling.com.au",
  ]);

  // ─── Check existing enrollments to avoid duplicates ───────────────────
  const [existingEnrollments] = await conn.execute(
    `SELECT email, sequenceId FROM drip_enrollments`
  );
  const alreadyEnrolled = new Set(
    existingEnrollments.map((e) => `${e.email.toLowerCase()}:${e.sequenceId}`)
  );

  // ─── Categorize leads ────────────────────────────────────────────────
  const enrollments = [];

  for (const lead of allLeads) {
    const email = lead.email.toLowerCase();
    if (ccEmails.has(email) || excludeEmails.has(email)) continue;

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
      // homepage_capture entries in leads table — these people later grabbed a lead magnet
      // so they're already categorized above. Skip if no lead magnet source.
      continue;
    }

    if (alreadyEnrolled.has(`${email}:${sequenceId}`)) {
      console.log(`  SKIP (already enrolled): ${email} → ${sequenceId}`);
      continue;
    }

    // Everyone already got Day 0 (step 1).
    // Today's double-dippers also got Day 0 (even if doubled up by Claude Code).
    // So everyone starts at currentStep=1 (Day 0 done), next email is step 2.
    // Next send: tomorrow at 10 AM ET (April 7, 2026)
    const tomorrowAt10am = new Date("2026-04-07T14:00:00.000Z"); // 10 AM ET = 14:00 UTC

    enrollments.push({
      email: lead.email,
      firstName: lead.firstName || "there",
      sequenceId,
      currentStep: 1, // Day 0 already sent
      status: "active",
      nextSendAt: tomorrowAt10am,
    });
  }

  // ─── Homepage-only leads ──────────────────────────────────────────────
  for (const hp of homepageOnly) {
    const email = hp.email.toLowerCase();
    if (ccEmails.has(email) || excludeEmails.has(email)) continue;
    if (alreadyEnrolled.has(`${email}:homepage_only`)) {
      console.log(`  SKIP (already enrolled): ${email} → homepage_only`);
      continue;
    }

    const tomorrowAt10am = new Date("2026-04-07T14:00:00.000Z");

    enrollments.push({
      email: hp.email,
      firstName: "there", // homepage captures don't have firstName
      sequenceId: "homepage_only",
      currentStep: 1, // Day 0 already sent
      status: "active",
      nextSendAt: tomorrowAt10am,
    });
  }

  // ─── Summary ──────────────────────────────────────────────────────────
  const counts = {
    estimating_single: 0,
    q1q2_single: 0,
    double_dipper: 0,
    homepage_only: 0,
  };
  enrollments.forEach((e) => counts[e.sequenceId]++);

  console.log("\n═══════════════════════════════════════════");
  console.log("  DRIP CAMPAIGN ENROLLMENT SUMMARY");
  console.log("═══════════════════════════════════════════");
  console.log(`  Estimating single-dippers: ${counts.estimating_single}`);
  console.log(`  Q1/Q2 single-dippers:      ${counts.q1q2_single}`);
  console.log(`  Double-dippers:             ${counts.double_dipper}`);
  console.log(`  Homepage-only:              ${counts.homepage_only}`);
  console.log(`  ─────────────────────────────────────────`);
  console.log(`  TOTAL ENROLLMENTS:          ${enrollments.length}`);
  console.log(`  All start at Step 1 (Day 0 done)`);
  console.log(`  Next email: April 7, 2026 at 10 AM ET`);
  console.log("═══════════════════════════════════════════\n");

  // ─── Print all enrollments ────────────────────────────────────────────
  console.log("ENROLLMENTS:");
  for (const e of enrollments) {
    console.log(
      `  ${e.sequenceId.padEnd(20)} | ${e.email.padEnd(45)} | ${e.firstName}`
    );
  }

  // ─── Log Day 0 as already sent for everyone ──────────────────────────
  if (DRY_RUN) {
    console.log("\n🔶 DRY RUN — no database changes made.");
    await conn.end();
    return;
  }

  console.log("\n📝 Inserting enrollments into database...");
  let inserted = 0;
  for (const e of enrollments) {
    const [result] = await conn.execute(
      `INSERT INTO drip_enrollments (email, firstName, sequenceId, currentStep, status, nextSendAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [e.email, e.firstName, e.sequenceId, e.currentStep, e.status, e.nextSendAt]
    );

    // Log Day 0 (step 1) as already sent
    await conn.execute(
      `INSERT INTO drip_sent_emails (enrollmentId, email, sequenceId, stepNumber, status, sentAt)
       VALUES (?, ?, ?, 1, 'sent', NOW())`,
      [result.insertId, e.email, e.sequenceId]
    );

    inserted++;
  }

  console.log(`✅ Inserted ${inserted} enrollments with Day 0 marked as sent.`);
  console.log("✅ No emails will be sent today. Next batch: April 7 at 10 AM ET.");

  await conn.end();
}

main().catch(console.error);
