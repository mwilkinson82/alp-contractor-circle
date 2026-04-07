/**
 * Drip Campaign Auto-Enrollment
 *
 * Automatically enrolls new leads into the correct drip sequence when they
 * submit a lead magnet form or subscribe via the homepage.
 *
 * Key logic:
 * - CC members are never enrolled
 * - Double-dippers (grabbed both lead magnets) get moved to double_dipper sequence
 * - Each person can only be in ONE active sequence at a time
 * - Day 0 (PDF delivery) is already sent by the lead capture code, so we enroll at step 0
 *   with nextSendAt set for the next day at 8 AM ET
 */

import { getNextSendDate } from "./dripEmails";

let _pool: any = null;

async function getPool() {
  if (!_pool) {
    const mysql = await import("mysql2/promise");
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 3,
    });
  }
  return _pool;
}

// Lead magnet source → drip sequence mapping
const SOURCE_TO_SEQUENCE: Record<string, string> = {
  "estimating-checklist": "estimating_single",
  "q1-q2-framework": "q1q2_single",
};

// The opposite sequence for double-dipper detection
const OPPOSITE_SEQUENCE: Record<string, string> = {
  estimating_single: "q1q2_single",
  q1q2_single: "estimating_single",
};

/**
 * Auto-enroll a lead magnet download into the correct drip sequence.
 * Called from the leads.capture route after the PDF delivery email is sent.
 */
export async function autoEnrollLeadMagnet(params: {
  email: string;
  firstName: string;
  source: string; // e.g. "estimating-checklist" or "q1-q2-framework"
}): Promise<{ enrolled: boolean; sequenceId?: string; reason?: string }> {
  const pool = await getPool();
  const email = params.email.toLowerCase().trim();
  const sequenceId = SOURCE_TO_SEQUENCE[params.source];

  if (!sequenceId) {
    console.warn(`[DripAutoEnroll] Unknown lead magnet source: ${params.source}`);
    return { enrolled: false, reason: `Unknown source: ${params.source}` };
  }

  try {
    // 1. Check if they're an active CC member — skip drip entirely
    const [members] = await pool.execute(
      `SELECT id FROM members WHERE email = ? AND subscriptionStatus = 'active' LIMIT 1`,
      [email]
    ) as [any[], any];

    if (members.length > 0) {
      console.log(`[DripAutoEnroll] ${email} is an active CC member — skipping drip`);
      return { enrolled: false, reason: "Active CC member" };
    }

    // 2. Check if they already have any active drip enrollment
    const [existing] = await pool.execute(
      `SELECT id, sequenceId, currentStep, status FROM drip_enrollments
       WHERE email = ? AND status = 'active'`,
      [email]
    ) as [any[], any];

    if (existing.length > 0) {
      const currentEnrollment = existing[0];

      // If they're already in this exact sequence, skip
      if (currentEnrollment.sequenceId === sequenceId) {
        console.log(`[DripAutoEnroll] ${email} already in ${sequenceId} — skipping`);
        return { enrolled: false, reason: `Already enrolled in ${sequenceId}` };
      }

      // If they're already in the double_dipper sequence, skip
      if (currentEnrollment.sequenceId === "double_dipper") {
        console.log(`[DripAutoEnroll] ${email} already a double-dipper — skipping`);
        return { enrolled: false, reason: "Already in double_dipper sequence" };
      }

      // They're in the OPPOSITE single-dipper sequence → they're a double-dipper!
      const oppositeSeq = OPPOSITE_SEQUENCE[sequenceId];
      if (currentEnrollment.sequenceId === oppositeSeq) {
        console.log(`[DripAutoEnroll] ${email} is a double-dipper! Moving from ${oppositeSeq} to double_dipper`);

        // Pause the old enrollment
        await pool.execute(
          `UPDATE drip_enrollments SET status = 'paused', nextSendAt = NULL WHERE id = ?`,
          [currentEnrollment.id]
        );

        // Create new double_dipper enrollment
        // They've already received their Day 0 emails for both lead magnets,
        // so start at step 0 (Day 0 marked as done) with next email = step 1 tomorrow
        const nextSendAt = getNextSendDate("double_dipper", 1);
        await pool.execute(
          `INSERT INTO drip_enrollments (email, firstName, sequenceId, currentStep, status, nextSendAt)
           VALUES (?, ?, 'double_dipper', 0, 'active', ?)`,
          [email, params.firstName, nextSendAt]
        );

        // Log the Day 0 as "sent" for the double_dipper sequence (they got both lead magnet emails)
        const [newEnrollment] = await pool.execute(
          `SELECT id FROM drip_enrollments WHERE email = ? AND sequenceId = 'double_dipper' AND status = 'active' LIMIT 1`,
          [email]
        ) as [any[], any];

        if (newEnrollment.length > 0) {
          // Check if step 0 already logged to avoid duplicate
          const [existingSent] = await pool.execute(
            `SELECT id FROM drip_sent_emails WHERE email = ? AND sequenceId = 'double_dipper' AND stepNumber = 0 LIMIT 1`,
            [email]
          ) as [any[], any];

          if (existingSent.length === 0) {
            await pool.execute(
              `INSERT INTO drip_sent_emails (enrollmentId, email, sequenceId, stepNumber, status)
               VALUES (?, ?, 'double_dipper', 0, 'sent')`,
              [newEnrollment[0].id, email]
            );
          }
        }

        return { enrolled: true, sequenceId: "double_dipper" };
      }

      // They're in homepage_only or some other sequence — upgrade to the lead magnet sequence
      console.log(`[DripAutoEnroll] ${email} upgrading from ${currentEnrollment.sequenceId} to ${sequenceId}`);
      await pool.execute(
        `UPDATE drip_enrollments SET status = 'paused', nextSendAt = NULL WHERE id = ?`,
        [currentEnrollment.id]
      );

      // Fall through to create new enrollment below
    }

    // 3. Create new enrollment for this sequence
    const nextSendAt = getNextSendDate(sequenceId, 1);
    await pool.execute(
      `INSERT INTO drip_enrollments (email, firstName, sequenceId, currentStep, status, nextSendAt)
       VALUES (?, ?, ?, 0, 'active', ?)`,
      [email, params.firstName, sequenceId, nextSendAt]
    );

    // Log Day 0 as sent (the PDF delivery email was just sent by the lead capture code)
    const [newEnrollment] = await pool.execute(
      `SELECT id FROM drip_enrollments WHERE email = ? AND sequenceId = ? AND status = 'active' ORDER BY id DESC LIMIT 1`,
      [email, sequenceId]
    ) as [any[], any];

    if (newEnrollment.length > 0) {
      // Check if step 0 already logged to avoid duplicate
      const [existingSent] = await pool.execute(
        `SELECT id FROM drip_sent_emails WHERE email = ? AND sequenceId = ? AND stepNumber = 0 LIMIT 1`,
        [email, sequenceId]
      ) as [any[], any];

      if (existingSent.length === 0) {
        await pool.execute(
          `INSERT INTO drip_sent_emails (enrollmentId, email, sequenceId, stepNumber, status)
           VALUES (?, ?, ?, 0, 'sent')`,
          [newEnrollment[0].id, email, sequenceId]
        );
      }
    }

    console.log(`[DripAutoEnroll] ${email} enrolled in ${sequenceId}, next email at ${nextSendAt}`);
    return { enrolled: true, sequenceId };

  } catch (err: any) {
    console.error(`[DripAutoEnroll] Error enrolling ${email}:`, err);
    return { enrolled: false, reason: err.message || "Unknown error" };
  }
}

/**
 * Auto-enroll a homepage email subscriber into the homepage_only drip sequence.
 * Called from the email.subscribe route.
 */
export async function autoEnrollHomepageSubscriber(params: {
  email: string;
}): Promise<{ enrolled: boolean; reason?: string }> {
  const pool = await getPool();
  const email = params.email.toLowerCase().trim();

  try {
    // 1. Check if they're an active CC member
    const [members] = await pool.execute(
      `SELECT id FROM members WHERE email = ? AND subscriptionStatus = 'active' LIMIT 1`,
      [email]
    ) as [any[], any];

    if (members.length > 0) {
      return { enrolled: false, reason: "Active CC member" };
    }

    // 2. Check if they already have any active drip enrollment (lead magnet or otherwise)
    const [existing] = await pool.execute(
      `SELECT id, sequenceId FROM drip_enrollments WHERE email = ? AND status = 'active'`,
      [email]
    ) as [any[], any];

    if (existing.length > 0) {
      // They're already in a drip sequence (probably a lead magnet one) — don't downgrade to homepage
      console.log(`[DripAutoEnroll] ${email} already in ${existing[0].sequenceId} — not adding to homepage_only`);
      return { enrolled: false, reason: `Already in ${existing[0].sequenceId}` };
    }

    // 3. Create homepage_only enrollment
    const nextSendAt = getNextSendDate("homepage_only", 1);
    await pool.execute(
      `INSERT INTO drip_enrollments (email, firstName, sequenceId, currentStep, status, nextSendAt)
       VALUES (?, ?, 'homepage_only', 0, 'active', ?)`,
      [email, "there", nextSendAt] // "there" as fallback firstName since homepage form only collects email
    );

    console.log(`[DripAutoEnroll] ${email} enrolled in homepage_only, next email at ${nextSendAt}`);
    return { enrolled: true };

  } catch (err: any) {
    console.error(`[DripAutoEnroll] Error enrolling homepage subscriber ${email}:`, err);
    return { enrolled: false, reason: err.message || "Unknown error" };
  }
}

/**
 * Mark a drip enrollment as converted when someone becomes a CC member.
 * Called from the Stripe webhook when a checkout completes.
 */
export async function markDripConverted(email: string): Promise<void> {
  const pool = await getPool();
  const normalizedEmail = email.toLowerCase().trim();

  try {
    await pool.execute(
      `UPDATE drip_enrollments
       SET status = 'converted', nextSendAt = NULL, convertedAt = NOW()
       WHERE email = ? AND status = 'active'`,
      [normalizedEmail]
    );
    console.log(`[DripAutoEnroll] Marked ${normalizedEmail} as converted (CC member)`);
  } catch (err) {
    console.error(`[DripAutoEnroll] Error marking ${normalizedEmail} as converted:`, err);
  }
}
