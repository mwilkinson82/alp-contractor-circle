import mysql from 'mysql2/promise';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ZOOM_LINK = "https://us06web.zoom.us/j/87028206220?pwd=k2YtkNdLz7y1nnkZt0HFSe0obntSnl.1";
const FROM = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";

function buildHtml(name) {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:600px;margin:0 auto;background:#0a0a0a;">

<div style="text-align:center;padding:40px 30px 10px;">
  <div style="display:inline-block;background:#dc2626;color:#fff;font-family:Arial,sans-serif;font-size:16px;font-weight:700;letter-spacing:3px;padding:12px 30px;border-radius:4px;">🔴 WE ARE LIVE</div>
</div>

<div style="text-align:center;padding:15px 30px 20px;">
  <h1 style="color:#e8dcc8;font-size:40px;margin:0 0 8px;font-weight:700;">Bootcamp Is Happening NOW</h1>
  <p style="color:#dc2626;font-size:22px;margin:0;font-weight:700;">GET IN HERE.</p>
</div>

<div style="margin:0 30px 25px;padding:20px;background:#1a0a0a;border:2px solid #dc2626;border-radius:8px;text-align:center;">
  <p style="color:#e8dcc8;font-size:18px;margin:0;line-height:1.7;font-weight:600;">${firstName} — we're live right now. Click the button and join us.</p>
</div>

<div style="text-align:center;padding:0 30px 15px;">
  <a href="${ZOOM_LINK}" style="display:inline-block;background:#dc2626;color:#ffffff;font-family:Arial,sans-serif;font-size:22px;font-weight:700;text-decoration:none;padding:22px 70px;border-radius:6px;letter-spacing:1px;">JOIN NOW</a>
</div>

<div style="text-align:center;padding:10px 30px 30px;">
  <p style="color:#b8a88a;font-size:13px;margin:0;">Zoom link: <a href="${ZOOM_LINK}" style="color:#c9a84c;">${ZOOM_LINK}</a></p>
</div>

<div style="padding:20px 30px;border-top:1px solid #1a1510;text-align:center;">
  <p style="color:#5a4a3a;font-size:12px;margin:0;font-family:Arial,sans-serif;">ALP Contractor Circle — Build. Scale. Exit. Repeat.</p>
</div>

</div></body></html>`;
}

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [members] = await conn.execute(
    "SELECT id, discordDisplayName, email FROM members WHERE subscriptionStatus IN ('active','trialing') AND email IS NOT NULL AND email != ''"
  );
  await conn.end();

  console.log(`Sending WE ARE LIVE to ${members.length} members from ${FROM}...`);
  let sent = 0, failed = 0;

  for (const m of members) {
    try {
      await resend.emails.send({
        from: FROM,
        to: m.email,
        subject: "🔴 WE ARE LIVE — Join Bootcamp NOW",
        html: buildHtml(m.discordDisplayName),
      });
      sent++;
      console.log(`✓ ${m.discordDisplayName} (${m.email})`);
    } catch (err) {
      failed++;
      console.error(`✗ ${m.email}: ${err.message}`);
    }
  }
  console.log(`\nDone: ${sent} sent, ${failed} failed`);
}

run();
