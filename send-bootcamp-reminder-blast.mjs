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

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bootcamp Is Today</title>
</head>
<body style="margin:0;padding:0;${BASE_STYLES}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="${LOGO_URL}" alt="ALP Contractor Circle" width="36" height="36" style="display:block;width:36px;height:36px;border-radius:8px;" />
            </td>
          </tr>
          <tr>
            <td style="border-radius:20px;overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:6px;background:linear-gradient(90deg,#D4915C,#D4915C,#C9A96E,#D4915C,#D4915C);"></td></tr>
                <tr>
                  <td style="background-color:#111318;padding:40px 32px 28px 32px;text-align:center;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr><td align="center">
                        <span style="display:inline-block;background-color:#D4915C;color:#FFFFFF;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;padding:8px 20px;border-radius:4px;">TODAY</span>
                      </td></tr>
                      <tr><td style="height:20px;"></td></tr>
                      <tr><td align="center" style="color:#EDE6DB;font-size:32px;font-weight:800;line-height:1.15;letter-spacing:-0.5px;">
                        Bootcamp Is Today
                      </td></tr>
                      <tr><td style="height:12px;"></td></tr>
                      <tr><td align="center" style="color:rgba(237,230,219,0.5);font-size:13px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
                        5:00 PM Eastern — Be There
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:0;border-bottom:2px dashed rgba(255,255,255,0.1);background-color:#111318;"></td></tr>
                <tr>
                  <td style="background-color:#111318;padding:24px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="33%" style="text-align:center;border-right:1px solid rgba(255,255,255,0.08);">
                          <p style="color:#D4915C;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;font-weight:700;">Date</p>
                          <p style="color:#EDE6DB;font-size:20px;font-weight:700;margin:0;">APR 26</p>
                          <p style="color:rgba(237,230,219,0.5);font-size:12px;margin:4px 0 0 0;">Saturday</p>
                        </td>
                        <td width="33%" style="text-align:center;border-right:1px solid rgba(255,255,255,0.08);">
                          <p style="color:#D4915C;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;font-weight:700;">Time</p>
                          <p style="color:#EDE6DB;font-size:20px;font-weight:700;margin:0;">5:00 PM</p>
                          <p style="color:rgba(237,230,219,0.5);font-size:12px;margin:4px 0 0 0;">Eastern Time</p>
                        </td>
                        <td width="33%" style="text-align:center;">
                          <p style="color:#D4915C;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;font-weight:700;">Format</p>
                          <p style="color:#EDE6DB;font-size:20px;font-weight:700;margin:0;">LIVE</p>
                          <p style="color:rgba(237,230,219,0.5);font-size:12px;margin:4px 0 0 0;">Zoom Meeting</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td style="height:0;border-bottom:2px dashed rgba(255,255,255,0.1);background-color:#111318;"></td></tr>
                <tr>
                  <td style="background-color:#111318;padding:28px 32px 20px 32px;">
                    <p style="color:rgba(237,230,219,0.75);font-size:15px;line-height:1.7;margin:0;">
                      ${firstName}, today's the day. The Contractor Circle Monthly Bootcamp is happening this afternoon at 5 PM ET. Block it off, clear your schedule, and come ready to work. This isn't a webinar — it's a working session.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#111318;padding:0 32px 28px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(184,69,28,0.08);border:1px solid rgba(184,69,28,0.2);border-radius:12px;">
                      <tr><td style="padding:24px;">
                        <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 18px 0;font-weight:700;">Today's Agenda</p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                          <tr>
                            <td width="24" valign="top" style="padding-top:2px;">
                              <span style="display:inline-block;width:8px;height:8px;background-color:#D4915C;border-radius:50;"></span>
                            </td>
                            <td>
                              <p style="color:#EDE6DB;font-size:14px;font-weight:700;line-height:1.4;margin:0;">How to structure and execute cost plus contracts properly</p>
                              <p style="color:rgba(237,230,219,0.4);font-size:11px;margin:4px 0 0 0;">Submitted by danbillingsley</p>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                          <tr>
                            <td width="24" valign="top" style="padding-top:2px;">
                              <span style="display:inline-block;width:8px;height:8px;background-color:#D4915C;border-radius:50;"></span>
                            </td>
                            <td>
                              <p style="color:#EDE6DB;font-size:14px;font-weight:700;line-height:1.4;margin:0;">Private Equity — Does it focus more on the retail and residential space or is there a place for it in the commercial channel</p>
                              <p style="color:rgba(237,230,219,0.4);font-size:11px;margin:4px 0 0 0;">Submitted by Tony Mu&#241;oz</p>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
                          <tr>
                            <td width="24" valign="top" style="padding-top:2px;">
                              <span style="display:inline-block;width:8px;height:8px;background-color:#D4915C;border-radius:50;"></span>
                            </td>
                            <td>
                              <p style="color:#EDE6DB;font-size:14px;font-weight:700;line-height:1.4;margin:0;">CM Issues — Not processing change orders in a timely fashion</p>
                              <p style="color:rgba(237,230,219,0.4);font-size:11px;margin:4px 0 0 0;">Submitted by Jake Nichter</p>
                            </td>
                          </tr>
                        </table>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td width="24" valign="top" style="padding-top:2px;">
                              <span style="display:inline-block;width:8px;height:8px;background-color:#D4915C;border-radius:50;"></span>
                            </td>
                            <td>
                              <p style="color:#EDE6DB;font-size:14px;font-weight:700;line-height:1.4;margin:0;">Transition between subcontractors work</p>
                              <p style="color:rgba(237,230,219,0.4);font-size:11px;margin:4px 0 0 0;">Submitted by Jake Nichter</p>
                            </td>
                          </tr>
                        </table>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#111318;padding:0 32px 28px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;">
                      <tr><td style="padding:20px 24px;">
                        <p style="color:rgba(237,230,219,0.4);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px 0;font-weight:700;">Come Prepared</p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr><td style="padding:4px 0;color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;">
                            <span style="color:#B8451C;font-weight:700;margin-right:8px;">&#9632;</span> 90+ minutes — a deep dive, not a surface skim
                          </td></tr>
                          <tr><td style="padding:4px 0;color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;">
                            <span style="color:#B8451C;font-weight:700;margin-right:8px;">&#9632;</span> Audience participation expected — come ready to engage
                          </td></tr>
                          <tr><td style="padding:4px 0;color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;">
                            <span style="color:#B8451C;font-weight:700;margin-right:8px;">&#9632;</span> Water, coffee, pen and paper
                          </td></tr>
                        </table>
                      </td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#111318;padding:0 32px 28px 32px;text-align:center;">
                    <a href="${PORTAL_URL}" style="display:inline-block;background:#D4915C;color:#FFFFFF;text-decoration:none;padding:18px 48px;border-radius:8px;font-size:16px;font-weight:800;letter-spacing:0.5px;">
                      Open Portal → Join Zoom at 5 PM
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#111318;padding:0 32px 8px 32px;text-align:center;">
                    <p style="color:rgba(237,230,219,0.35);font-size:11px;margin:0;">
                      Zoom: <a href="${BOOTCAMP_ZOOM_LINK}" style="color:rgba(212,145,92,0.5);text-decoration:none;">${BOOTCAMP_ZOOM_LINK.split("?")[0]}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color:#111318;padding:20px 32px 32px 32px;text-align:center;">
                    <p style="color:rgba(237,230,219,0.5);font-size:13px;line-height:1.6;margin:0 0 8px 0;font-style:italic;">
                      "Block the time. Show up prepared. That's how you get the most out of this."
                    </p>
                    <p style="color:#D4915C;font-size:13px;font-weight:700;margin:0;">— Marshall</p>
                  </td>
                </tr>
                <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#D4915C,#C9A96E,#D4915C,#D4915C);"></td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.25);font-size:11px;line-height:1.6;">
              <p style="margin:0;">Altitude Logic Pressure</p>
              <p style="margin:4px 0 0 0;">
                <a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.4);text-decoration:none;">Instagram</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.4);text-decoration:none;">Website</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.4);text-decoration:none;">Member Portal</a>
              </p>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildText(firstName) {
  return `BOOTCAMP IS TODAY — 5:00 PM Eastern

${firstName}, today's the day. The Contractor Circle Monthly Bootcamp is happening this afternoon at 5 PM ET. Block it off, clear your schedule, and come ready to work. This isn't a webinar — it's a working session.

━━━━━━━━━━━━━━━━━━━━━━━━━━━
TODAY'S AGENDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━

• How to structure and execute cost plus contracts properly
  — Submitted by danbillingsley

• Private Equity — Does it focus more on the retail and residential space or is there a place for it in the commercial channel
  — Submitted by Tony Muñoz

• CM Issues — Not processing change orders in a timely fashion
  — Submitted by Jake Nichter

• Transition between subcontractors work
  — Submitted by Jake Nichter

━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 Saturday, April 26
⏰ 5:00 PM Eastern Time
📍 Zoom Meeting
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Come prepared: 90+ minutes, audience participation, pen & paper.

Zoom Link: ${BOOTCAMP_ZOOM_LINK}

Portal: ${PORTAL_URL}

"Block the time. Show up prepared. That's how you get the most out of this."
— Marshall

Altitude Logic Pressure`;
}

async function main() {
  const pool = mysql2.createPool(process.env.DATABASE_URL);

  const [members] = await pool.query(
    'SELECT id, email, discordDisplayName FROM members WHERE subscriptionStatus IN ("active", "trialing") ORDER BY discordDisplayName'
  );

  console.log(`Found ${members.length} active/trialing members. Sending...`);

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    const firstName = (member.discordDisplayName || "there").split(" ")[0];
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: member.email,
        subject: "🔥 Bootcamp Is Today — 5 PM ET",
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

    // Small delay between sends to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\nDone! Sent: ${sent}, Failed: ${failed}, Total: ${members.length}`);
  await pool.end();
}

main();
