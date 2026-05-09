import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const MEMBER_EMAIL = "Andy.j.ramirez@outlook.com";
const MEMBER_NAME = "Andy";

// ─── Email 1: Welcome / Getting Started ─────────────────────────────────────
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
              <p style="margin:0 0 16px 0;">You're a founding member. That means you're in from the ground floor — as we add more resources, frameworks, and coaching, you get it all.</p>
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

// ─── Email 2: What to Expect ────────────────────────────────────────────────
const expectHtml = `<!DOCTYPE html>
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
              <p style="margin:0 0 16px 0;">Now that you're in, here's what to expect inside The Contractor Circle:</p>
              <p style="margin:0 0 16px 0;"><strong>Live Calls (Every Other Sunday, 5 PM ET)</strong><br/>These aren't webinars. They're working sessions. Bring your bids, your problems, your wins. We go deep on estimating, operations, hiring, cash flow — whatever's most relevant to the group.</p>
              <p style="margin:0 0 16px 0;"><strong>Discord Community</strong><br/>This is where the daily action happens. Post wins, ask questions, share deals. I'm in there every day. So are other contractors doing real work.</p>
              <p style="margin:0 0 16px 0;"><strong>Member Portal (alpcontractorcircle.com)</strong><br/>Your hub for call replays, templates, resources, and ConstructLine — our AI-powered estimating and scheduling tools built specifically for contractors.</p>
              <p style="margin:0 0 16px 0;"><strong>ConstructLine Tools</strong><br/>You have access to Basis (AI takeoff and estimating) and Baseline (CPM scheduling). Upload your drawings, get line items in minutes. Build schedules that actually work.</p>
              <p style="margin:0 0 16px 0;">The goal is simple: give you the systems, tools, and network to scale your business faster than you could on your own.</p>
              <p style="margin:0 0 16px 0;">Jump into Discord and introduce yourself. Let's get to work.</p>
              <p style="margin:16px 0 0 0;">Marshall Wilkinson<br/>Founder & CEO, ALP</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

async function send() {
  // Email 1: Welcome
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: MEMBER_EMAIL,
      subject: `${MEMBER_NAME}, welcome to The Contractor Circle`,
      html: welcomeHtml,
    });
    if (error) {
      console.error("❌ Welcome email failed:", error.message);
    } else {
      console.log(`✅ Email 1 (Welcome) sent — ID: ${data.id}`);
    }
  } catch (err) {
    console.error("❌ Welcome email error:", err.message);
  }

  // Small delay between emails
  await new Promise(r => setTimeout(r, 1000));

  // Email 2: What to Expect
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: MEMBER_EMAIL,
      subject: `${MEMBER_NAME}, here's what to expect inside The Contractor Circle`,
      html: expectHtml,
    });
    if (error) {
      console.error("❌ What to Expect email failed:", error.message);
    } else {
      console.log(`✅ Email 2 (What to Expect) sent — ID: ${data.id}`);
    }
  } catch (err) {
    console.error("❌ What to Expect email error:", err.message);
  }

  console.log(`\n✅ Done — Andy Ramirez onboarding emails sent to ${MEMBER_EMAIL}`);
}

send();
