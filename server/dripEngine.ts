/**
 * Drip Campaign Engine
 * 
 * Runs on a 15-minute interval. For each active enrollment whose nextSendAt <= now:
 *   1. Check if this step was already sent (duplicate guard)
 *   2. Send the email via Resend
 *   3. Log the send in drip_sent_emails
 *   4. Advance the enrollment to the next step (or mark completed)
 * 
 * Also provides a manual trigger endpoint for admin use.
 */

import { sendDripEmail, getDripEmail, getMaxStep, getNextSendDate } from "./dripEmails";

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

interface Enrollment {
  id: number;
  email: string;
  firstName: string;
  sequenceId: string;
  currentStep: number;
  status: string;
  nextSendAt: Date | null;
}

/**
 * Process all pending drip sends. Returns a summary of what happened.
 */
export async function processDripSends(options?: { dryRun?: boolean }): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  completed: number;
  details: string[];
}> {
  const dryRun = options?.dryRun ?? false;
  const pool = await getPool();
  const details: string[] = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let completed = 0;

  // Find all active enrollments whose next send time has passed
  const [rows] = await pool.execute(
    `SELECT id, email, firstName, sequenceId, currentStep, status, nextSendAt
     FROM drip_enrollments
     WHERE status = 'active'
       AND nextSendAt IS NOT NULL
       AND nextSendAt <= NOW()
     ORDER BY nextSendAt ASC
     LIMIT 500`
  ) as [Enrollment[], any];

  console.log(`[DripEngine] Found ${rows.length} enrollments due for sending${dryRun ? " (DRY RUN)" : ""}`);

  for (const enrollment of rows) {
    const nextStep = enrollment.currentStep + 1;
    const maxStep = getMaxStep(enrollment.sequenceId);

    // If they've already completed the sequence, mark as completed
    if (nextStep > maxStep) {
      if (!dryRun) {
        await pool.execute(
          `UPDATE drip_enrollments SET status = 'completed', nextSendAt = NULL WHERE id = ?`,
          [enrollment.id]
        );
      }
      details.push(`COMPLETED: ${enrollment.email} (${enrollment.sequenceId}) — all ${maxStep} emails sent`);
      completed++;
      continue;
    }

    // Check if this step was already sent (duplicate guard)
    const [existing] = await pool.execute(
      `SELECT id FROM drip_sent_emails
       WHERE email = ? AND sequenceId = ? AND stepNumber = ? AND status = 'sent'
       LIMIT 1`,
      [enrollment.email, enrollment.sequenceId, nextStep]
    ) as [any[], any];

    if (existing.length > 0) {
      // Already sent — advance without re-sending
      details.push(`SKIP (already sent): ${enrollment.email} ${enrollment.sequenceId}#${nextStep}`);
      if (!dryRun) {
        const furtherStep = nextStep + 1;
        if (furtherStep > maxStep) {
          await pool.execute(
            `UPDATE drip_enrollments SET currentStep = ?, status = 'completed', nextSendAt = NULL WHERE id = ?`,
            [nextStep, enrollment.id]
          );
        } else {
          const nextDate = getNextSendDate(enrollment.sequenceId, furtherStep);
          await pool.execute(
            `UPDATE drip_enrollments SET currentStep = ?, nextSendAt = ? WHERE id = ?`,
            [nextStep, nextDate, enrollment.id]
          );
        }
      }
      skipped++;
      continue;
    }

    // Verify the email template exists
    const emailDef = getDripEmail(enrollment.sequenceId, nextStep);
    if (!emailDef) {
      details.push(`SKIP (no template): ${enrollment.email} ${enrollment.sequenceId}#${nextStep}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      details.push(`WOULD SEND: ${enrollment.email} ${enrollment.sequenceId}#${nextStep} — "${emailDef.subject(enrollment.firstName)}"`);
      sent++;
      continue;
    }

    // Send the email
    const result = await sendDripEmail({
      to: enrollment.email,
      firstName: enrollment.firstName,
      sequenceId: enrollment.sequenceId,
      stepNumber: nextStep,
    });

    if (result.success) {
      // Log the send
      await pool.execute(
        `INSERT INTO drip_sent_emails (enrollmentId, email, sequenceId, stepNumber, resendId, status)
         VALUES (?, ?, ?, ?, ?, 'sent')`,
        [enrollment.id, enrollment.email, enrollment.sequenceId, nextStep, result.resendId || null]
      );

      // Advance the enrollment
      const furtherStep = nextStep + 1;
      if (furtherStep > maxStep) {
        await pool.execute(
          `UPDATE drip_enrollments SET currentStep = ?, status = 'completed', nextSendAt = NULL WHERE id = ?`,
          [nextStep, enrollment.id]
        );
        details.push(`SENT + COMPLETED: ${enrollment.email} ${enrollment.sequenceId}#${nextStep}`);
        completed++;
      } else {
        const nextDate = getNextSendDate(enrollment.sequenceId, furtherStep);
        await pool.execute(
          `UPDATE drip_enrollments SET currentStep = ?, nextSendAt = ? WHERE id = ?`,
          [nextStep, nextDate, enrollment.id]
        );
        details.push(`SENT: ${enrollment.email} ${enrollment.sequenceId}#${nextStep} — next at ${nextDate}`);
      }
      sent++;
    } else {
      // Log the failure
      await pool.execute(
        `INSERT INTO drip_sent_emails (enrollmentId, email, sequenceId, stepNumber, status, errorMessage)
         VALUES (?, ?, ?, ?, 'failed', ?)`,
        [enrollment.id, enrollment.email, enrollment.sequenceId, nextStep, result.error || "Unknown"]
      );
      details.push(`FAILED: ${enrollment.email} ${enrollment.sequenceId}#${nextStep} — ${result.error}`);
      failed++;
    }
  }

  const summary = {
    processed: rows.length,
    sent,
    skipped,
    failed,
    completed,
    details,
  };

  console.log(`[DripEngine] Done: ${sent} sent, ${skipped} skipped, ${failed} failed, ${completed} completed`);
  return summary;
}

/**
 * Start the drip engine interval timer.
 * Runs every 15 minutes to check for pending sends.
 */
export function startDripEngine(): void {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

  console.log("[DripEngine] Starting drip engine (15-minute interval)");

  // Run once on startup after a short delay (let DB connections settle)
  setTimeout(async () => {
    try {
      await processDripSends();
    } catch (err) {
      console.error("[DripEngine] Error on initial run:", err);
    }
  }, 10_000);

  // Then run every 15 minutes
  setInterval(async () => {
    try {
      await processDripSends();
    } catch (err) {
      console.error("[DripEngine] Error on interval run:", err);
    }
  }, INTERVAL_MS);
}
