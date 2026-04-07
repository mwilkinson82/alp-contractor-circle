import mysql from "mysql2/promise";
import { Resend } from "resend";

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Also add to Supabase via MCP ───────────────────────────────────────────
// We'll handle this separately if needed

// ─── Send Welcome Email #1: Getting Started ─────────────────────────────────
const FROM = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const MEMBER_EMAIL = "jae@nciconstruction.com";
const MEMBER_NAME = "Jacob";

// Read the welcome email function from email.ts - replicate the same content
const welcomeHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr>
      <td style="padding:24px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="color:#1a1a1a;font-size:14px;line-height:1.75;font-family:Helvetica,Arial,sans-serif;">
              <p style="margin:0 0 16px 0;">Hey ${MEMBER_NAME} —</p>
              <p style="margin:0 0 16px 0;">Welcome to The Contractor Circle. You just made a decision that's going to change the trajectory of your business. I don't say that lightly.</p>
              <p style="margin:0 0 16px 0;">Here's what happens next:</p>
              <p style="margin:0 0 16px 0;"><strong>1. Join the Discord Community</strong><br/>This is where the action happens — daily conversations, wins, questions, and direct access to me. Click the link below to join:</p>
              <p style="margin:0 0 16px 0;"><a href="https://discord.gg/Bq2xCYgBaM" style="color:#1a73e8;text-decoration:underline;">Join The Contractor Circle Discord</a></p>
              <p style="margin:0 0 16px 0;"><strong>2. Bi-Weekly Live Calls</strong><br/>Every other Sunday at 5 PM ET on Zoom. This is where we dig into your business — estimating, scaling, team building, cash flow, all of it. Bring your real problems.</p>
              <p style="margin:0 0 16px 0;"><strong>3. Access the Member Portal</strong><br/>Your portal is at <a href="https://alpcontractorcircle.com" style="color:#1a73e8;text-decoration:underline;">alpcontractorcircle.com</a> — log in with Discord to access resources, call schedules, and your account.</p>
              <p style="margin:0 0 16px 0;">You're a founding member. That means your rate is locked at $497/mo forever — it will never go up. As we add more resources, frameworks, and coaching, you get it all at this rate.</p>
              <p style="margin:0 0 16px 0;">The only thing that matters to me is that you win. Welcome to the NFL.</p>
              <p style="margin:16px 0 0 0;">Marshall Wilkinson<br/>Founder & CEO, ALP</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

try {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: MEMBER_EMAIL,
    subject: `${MEMBER_NAME}, welcome to The Contractor Circle`,
    html: welcomeHtml,
    text: `Hey ${MEMBER_NAME} —\n\nWelcome to The Contractor Circle. You just made a decision that's going to change the trajectory of your business.\n\nHere's what happens next:\n\n1. Join the Discord Community — https://discord.gg/Bq2xCYgBaM\n2. Bi-Weekly Live Calls — Every other Sunday at 5 PM ET on Zoom\n3. Access the Member Portal — https://alpcontractorcircle.com\n\nYou're a founding member. Your rate is locked at $497/mo forever.\n\nThe only thing that matters to me is that you win. Welcome to the NFL.\n\nMarshall Wilkinson\nFounder & CEO, ALP`,
  });
  if (error) {
    console.error("❌ Welcome email failed:", error);
  } else {
    console.log(`✅ Welcome email sent to ${MEMBER_EMAIL} — id: ${data?.id}`);
  }
} catch (err) {
  console.error("❌ Welcome email error:", err);
}

// ─── Also mark him as converted in drip enrollments if he was a lead ────────
const [drip] = await conn.execute(
  "SELECT * FROM drip_enrollments WHERE email = ?",
  [MEMBER_EMAIL]
);
if (drip.length > 0) {
  await conn.execute(
    "UPDATE drip_enrollments SET status = 'converted', convertedAt = NOW() WHERE email = ?",
    [MEMBER_EMAIL]
  );
  console.log("✅ Drip enrollment marked as converted");
} else {
  console.log("ℹ️  No drip enrollment found for this email (not a previous lead)");
}

await conn.end();
console.log("\n✅ Done — Jacob Nichter is set up as a founding member");
