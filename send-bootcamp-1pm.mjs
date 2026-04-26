import { Resend } from "resend";
import mysql2 from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const PORTAL_URL = "https://alpcontractorcircle.com/portal";
const BOOTCAMP_ZOOM_LINK = "https://us06web.zoom.us/j/87028206220?pwd=k2YtkNdLz7y1nnkZt0HFSe0obntSnl.1";
const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/favicon-192x192_f43344e4.png";
const BASE_STYLES = `background-color:#08090D;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;`;

const SUBJECT = "⏰ 4 Hours Until Bootcamp — 5 PM ET";

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;${BASE_STYLES}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <tr><td align="center" style="padding-bottom:24px;">
    <img src="${LOGO_URL}" alt="ALP" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;" />
  </td></tr>

  <tr><td style="border-radius:20px;overflow:hidden;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <!-- Top gradient bar -->
      <tr><td style="height:6px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);"></td></tr>

      <!-- Header -->
      <tr><td style="background-color:#111318;padding:40px 32px 20px 32px;text-align:center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <span style="display:inline-block;background-color:rgba(184,69,28,0.2);border:1px solid rgba(184,69,28,0.4);color:#D4915C;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;padding:8px 20px;border-radius:4px;">4 HOURS TO GO</span>
          </td></tr>
          <tr><td style="height:20px;"></td></tr>
          <tr><td align="center" style="color:#EDE6DB;font-size:30px;font-weight:800;line-height:1.2;letter-spacing:-0.5px;">
            Lock In Your Afternoon
          </td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td align="center" style="color:rgba(237,230,219,0.5);font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
            Bootcamp at 5:00 PM Eastern
          </td></tr>
        </table>
      </td></tr>

      <tr><td style="height:0;border-bottom:2px dashed rgba(255,255,255,0.1);background-color:#111318;"></td></tr>

      <!-- Body -->
      <tr><td style="background-color:#111318;padding:28px 32px;">
        <p style="color:rgba(237,230,219,0.75);font-size:15px;line-height:1.7;margin:0;">
          ${firstName}, this is your afternoon heads-up. The bootcamp kicks off in 4 hours. If you haven't blocked your calendar yet, do it now.
        </p>
        <p style="color:rgba(237,230,219,0.75);font-size:15px;line-height:1.7;margin:16px 0 0 0;">
          We're going deep on real topics submitted by members — cost plus contracts, private equity in construction, change order velocity, and trade transitions. This is the stuff that moves the needle.
        </p>
      </td></tr>

      <!-- Quick Details -->
      <tr><td style="background-color:#111318;padding:0 32px 28px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(212,145,92,0.06);border:1px solid rgba(212,145,92,0.15);border-radius:12px;">
          <tr><td style="padding:20px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:4px 0;color:rgba(237,230,219,0.6);font-size:14px;">
                  <span style="color:#D4915C;font-weight:700;">&#128197;</span>&nbsp; Saturday, April 26
                </td>
                <td width="50%" style="padding:4px 0;color:rgba(237,230,219,0.6);font-size:14px;">
                  <span style="color:#D4915C;font-weight:700;">&#9201;</span>&nbsp; 5:00 PM ET
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding:4px 0;color:rgba(237,230,219,0.6);font-size:14px;">
                  <span style="color:#D4915C;font-weight:700;">&#128187;</span>&nbsp; Zoom Meeting
                </td>
                <td width="50%" style="padding:4px 0;color:rgba(237,230,219,0.6);font-size:14px;">
                  <span style="color:#D4915C;font-weight:700;">&#128338;</span>&nbsp; 90+ minutes
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td style="background-color:#111318;padding:0 32px 28px 32px;text-align:center;">
        <a href="${PORTAL_URL}" style="display:inline-block;background:#D4915C;color:#FFFFFF;text-decoration:none;padding:18px 48px;border-radius:8px;font-size:16px;font-weight:800;letter-spacing:0.5px;">
          Open Portal — See You at 5 PM
        </a>
      </td></tr>

      <!-- Zoom link -->
      <tr><td style="background-color:#111318;padding:0 32px 8px 32px;text-align:center;">
        <p style="color:rgba(237,230,219,0.35);font-size:11px;margin:0;">
          Zoom: <a href="${BOOTCAMP_ZOOM_LINK}" style="color:rgba(212,145,92,0.5);text-decoration:none;">${BOOTCAMP_ZOOM_LINK.split("?")[0]}</a>
        </p>
      </td></tr>

      <!-- Quote -->
      <tr><td style="background-color:#111318;padding:20px 32px 32px 32px;text-align:center;">
        <p style="color:rgba(237,230,219,0.5);font-size:13px;line-height:1.6;margin:0 0 8px 0;font-style:italic;">
          "Clear the deck. This afternoon is about your business."
        </p>
        <p style="color:#D4915C;font-size:13px;font-weight:700;margin:0;">— Marshall</p>
      </td></tr>

      <tr><td style="height:3px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);"></td></tr>
    </table>
  </td></tr>

  <tr><td style="height:28px;"></td></tr>
  <tr><td align="center" style="color:rgba(237,230,219,0.25);font-size:11px;line-height:1.6;">
    <p style="margin:0;">Altitude Logic Pressure</p>
    <p style="margin:4px 0 0 0;">
      <a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.4);text-decoration:none;">Instagram</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.4);text-decoration:none;">Website</a>
      &nbsp;&nbsp;·&nbsp;&nbsp;
      <a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.4);text-decoration:none;">Member Portal</a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildText(firstName) {
  return `4 HOURS UNTIL BOOTCAMP — 5:00 PM Eastern

${firstName}, this is your afternoon heads-up. The bootcamp kicks off in 4 hours. If you haven't blocked your calendar yet, do it now.

We're going deep on real topics submitted by members — cost plus contracts, private equity in construction, change order velocity, and trade transitions. This is the stuff that moves the needle.

Saturday, April 26 | 5:00 PM ET | Zoom | 90+ minutes

Zoom Link: ${BOOTCAMP_ZOOM_LINK}
Portal: ${PORTAL_URL}

"Clear the deck. This afternoon is about your business."
— Marshall

Altitude Logic Pressure`;
}

async function main() {
  const pool = mysql2.createPool(process.env.DATABASE_URL);
  const [members] = await pool.query(
    'SELECT id, email, discordDisplayName FROM members WHERE subscriptionStatus IN ("active", "trialing") ORDER BY discordDisplayName'
  );

  console.log(`Found ${members.length} active/trialing members. Sending 1 PM reminder...`);

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    const firstName = (member.discordDisplayName || "there").split(" ")[0];
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: member.email,
        subject: SUBJECT,
        html: buildHtml(firstName),
        text: buildText(firstName),
      });

      if (error) {
        console.error(`  ✗ ${member.discordDisplayName} (${member.email}): ${error.message}`);
        failed++;
      } else {
        console.log(`  ✓ ${member.discordDisplayName} (${member.email}) — id: ${data?.id}`);
        sent++;
      }
    } catch (err) {
      console.error(`  ✗ ${member.discordDisplayName} (${member.email}): ${err.message}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone! Sent: ${sent}, Failed: ${failed}, Total: ${members.length}`);
  await pool.end();
}

main();
