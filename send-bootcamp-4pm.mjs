import mysql from 'mysql2/promise';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ZOOM_LINK = "https://us06web.zoom.us/j/87028206220?pwd=k2YtkNdLz7y1nnkZt0HFSe0obntSnl.1";
const FROM = "Marshall Wilkinson | ALP <notifications@alpcontractorcircle.com>";

function buildHtml(name) {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:600px;margin:0 auto;background:#0a0a0a;">

<div style="text-align:center;padding:40px 30px 20px;">
  <div style="display:inline-block;background:#dc2626;color:#fff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:2px;padding:8px 20px;border-radius:4px;">⚡ 1 HOUR WARNING</div>
</div>

<div style="text-align:center;padding:0 30px 20px;">
  <h1 style="color:#e8dcc8;font-size:32px;margin:0 0 8px;font-weight:700;">Bootcamp Starts in 1 Hour</h1>
  <p style="color:#c9a84c;font-size:18px;margin:0;font-weight:600;">5:00 PM ET — Today</p>
</div>

<div style="margin:0 30px 25px;padding:20px;background:#1a1510;border:1px solid #2a2015;border-radius:8px;">
  <p style="color:#e8dcc8;font-size:16px;margin:0 0 15px;line-height:1.6;">${firstName},</p>
  <p style="color:#b8a88a;font-size:15px;margin:0 0 15px;line-height:1.7;">We're <strong style="color:#c9a84c;">60 minutes out</strong>. Make sure you've got your Zoom ready and tested.</p>
  <p style="color:#b8a88a;font-size:15px;margin:0;line-height:1.7;">This is the real deal — live coaching, real strategies, real results. Don't miss it.</p>
</div>

<div style="text-align:center;padding:0 30px 25px;">
  <div style="background:#1a1510;border:1px solid #2a2015;border-radius:8px;padding:15px;">
    <p style="color:#b8a88a;font-size:13px;margin:0 0 5px;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;">Test your connection now</p>
    <p style="color:#e8dcc8;font-size:14px;margin:0;">Click below to make sure Zoom is working before we go live.</p>
  </div>
</div>

<div style="text-align:center;padding:0 30px 30px;">
  <a href="${ZOOM_LINK}" style="display:inline-block;background:#c9a84c;color:#0a0a0a;font-family:Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:6px;letter-spacing:0.5px;">TEST ZOOM LINK NOW</a>
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

  console.log(`Sending 4 PM 1-hour warning to ${members.length} members...`);
  let sent = 0, failed = 0;

  for (const m of members) {
    try {
      await resend.emails.send({
        from: FROM,
        to: m.email,
        subject: "⚡ 1 Hour Until Bootcamp — Test Your Zoom Now",
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
