import "dotenv/config";
import { Resend } from "resend";
import mysql from "mysql2/promise";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const PORTAL_URL = "https://alpcontractorcircle.com/portal";
const REPLAY_URL = "https://alpcontractorcircle.com/portal/replays";

const BASE_STYLES = `
  background-color:#08090D;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
`;

function buildReplayAnnouncementHtml(name) {
  const firstName = name.split(" ")[0] || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Call Recording Now Available</title>
</head>
<body style="margin:0;padding:0;${BASE_STYLES}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gradient Bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Badge -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);border-radius:50px;padding:6px 16px;">
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Replay Now Available</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:28px;font-weight:700;line-height:1.3;">
              ${firstName}, the recording is live.
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:16px;line-height:1.6;padding:0 20px;">
              The full recording of today's <strong style="color:#EDE6DB;">EOS for Contractors</strong> inaugural call is now in the <strong style="color:#D4915C;">Replay Library</strong>.
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">🎬</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Inaugural Call Recording</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">EOS for Contractors — Full Session</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    Watch the complete session at your own pace. Everything we covered:
                  </p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                  ✓ Vision/Traction Organizer (VITO)<br/>
                  ✓ Rocks &mdash; 90-day priority setting<br/>
                  ✓ Scorecard with leading &amp; lagging indicators<br/>
                  ✓ L10 Meeting structure<br/>
                  ✓ IDS Process &mdash; Identify, Discuss, Solve<br/>
                  ✓ Core Processes &amp; People Analyzer
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center">
              <a href="${REPLAY_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Watch the Replay →
              </a>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Log in to the portal → Replay Library
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Closing note -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              If you missed the live call or want to revisit anything, the full recording is ready. Watch it, take notes, and start implementing.
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:#D4915C;font-size:14px;font-weight:600;">
              — Marshall
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Footer -->
          <tr><td style="height:1px;background-color:rgba(255,255,255,0.06);"></td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.3);font-size:12px;line-height:1.6;">
              <p style="margin:0;">Altitude Logic Pressure</p>
              <p style="margin:4px 0 0 0;">
                <a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.5);text-decoration:none;">Instagram</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.5);text-decoration:none;">Website</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.5);text-decoration:none;">Member Portal</a>
              </p>
            </td>
          </tr>
          <tr><td style="height:40px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function buildReplayAnnouncementText(name) {
  const firstName = name.split(" ")[0] || "there";
  return `REPLAY NOW AVAILABLE

${firstName}, the recording is live.

The full recording of today's EOS for Contractors inaugural call is now in the Replay Library.

Watch it here: ${REPLAY_URL}

─────────────────────────────────────

Inaugural Call Recording
EOS for Contractors — Full Session

Watch the complete session at your own pace. Everything we covered:

✓ Vision/Traction Organizer (VITO)
✓ Rocks — 90-day priority setting
✓ Scorecard with leading & lagging indicators
✓ L10 Meeting structure
✓ IDS Process — Identify, Discuss, Solve
✓ Core Processes & People Analyzer

→ Watch: ${REPLAY_URL}
  Log in to the portal → Replay Library

─────────────────────────────────────

If you missed the live call or want to revisit anything, the full recording is ready. Watch it, take notes, and start implementing.

— Marshall

─────────────────────────────────────
Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorschool.com
Portal: ${PORTAL_URL}`.trim();
}

async function main() {
  // Get all active members from DB
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    "SELECT discordDisplayName AS name, email FROM members WHERE email IS NOT NULL AND email != '' AND subscriptionStatus = 'active'"
  );
  await conn.end();

  const members = rows;
  console.log(`Sending replay announcement to ${members.length} members...`);

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: member.email,
        subject: "Inaugural Call Recording Now in the Replay Library",
        html: buildReplayAnnouncementHtml(member.name),
        text: buildReplayAnnouncementText(member.name),
      });

      if (error) {
        console.error(`❌ ${member.name} (${member.email}) — ${error.message}`);
        failed++;
      } else {
        console.log(`✅ ${member.name} (${member.email}) — ID: ${data?.id}`);
        sent++;
      }
    } catch (err) {
      console.error(`❌ ${member.name} (${member.email}) — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Sent: ${sent} | Failed: ${failed}`);
}

main();
