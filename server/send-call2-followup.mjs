import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Marshall Wilkinson | ALP <marshall@notifications.marshallwilkinson.com>";
const REPLY_TO = "marshall@marshallwilkinson.com";
const PORTAL_URL = "https://app.alpcontractorcircle.com/login";
const TEMPLATE_URL = "https://app.alpcontractorcircle.com/login";
const REPLAY_URL = "https://app.alpcontractorcircle.com/login";
const DISCORD_INVITE = "https://discord.gg/2pagscG2Np";
const BASE_STYLES = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#08090D;";

// Set to true to send only to Marshall's gmail for preview
const PREVIEW_MODE = false;
const PREVIEW_EMAIL = "wilkinson.marshall@gmail.com";

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Call #2 Recap — Your Business is Your Biggest Asset</title>
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
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Call #2 Recap</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:28px;font-weight:700;line-height:1.3;padding:0 16px;">
              The deck and replay from Call #2 are now live in the portal.
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:16px;line-height:1.6;padding:0 20px;">
              The presentation deck from <strong style="color:#EDE6DB;">Call #2: Your Business is Your Biggest Asset</strong> is now live in the Templates Library, and the full recording is in the Replay Library.
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- Two CTA Buttons Side by Side -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="padding-right:8px;">
                  <a href="${TEMPLATE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
                    Get the Deck &rarr;
                  </a>
                </td>
                <td style="padding-left:8px;">
                  <a href="${REPLAY_URL}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;letter-spacing:0.5px;">
                    Watch the Replay &rarr;
                  </a>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Log in to the portal &rarr; Templates &rarr; Circle Presentations
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Deliverables Header -->
          <tr>
            <td align="center" style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">
              Action Items from Call #2
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:22px;font-weight:700;line-height:1.3;">
              Here's what you need to execute this week.
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- All Members Section -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
              <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px 0;font-weight:600;">All Members</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 16px 0;">01</td>
                  <td style="padding:0 0 16px 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Complete the V/TO (Vision/Traction Organizer)</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">Fill it out and drop it in the Discord so the group can see it and give feedback.</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 16px 0;">02</td>
                  <td style="padding:0 0 16px 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Draw Your Accountability Chart</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">All five functions, with names in seats. Identify where you are sitting in multiple seats.</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 16px 0;">03</td>
                  <td style="padding:0 0 16px 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Run the People Analyzer on Your Top 5</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">Score them on core values and GWC (Get it, Want it, Capacity to do it).</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 16px 0;">04</td>
                  <td style="padding:0 0 16px 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Calculate Your Owner Dependency Score</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">What percentage of your revenue comes from personal relationships? That number is your vulnerability.</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 0 0;">05</td>
                  <td style="padding:0 0 0 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Submit a Boot Camp Question</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">If you haven't already, submit one question or topic for the upcoming Boot Camp.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Individual Assignments -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
              <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px 0;font-weight:600;">Individual Assignments</p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 16px 0;">06</td>
                  <td style="padding:0 0 16px 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Joey: Post Org Structure in Discord</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">Post your organization structure in the Discord this week.</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 16px 0;">07</td>
                  <td style="padding:0 0 16px 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Marshall: CPM Scheduler Scope Functionality</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">Add scope-specific functionality to the CPM scheduler &mdash; ability to specify divisions like &ldquo;only foundation of Division 3.&rdquo;</p>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="color:#D4915C;font-size:16px;font-weight:700;padding:0 0 0 0;">08</td>
                  <td style="padding:0 0 0 8px;">
                    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Marshall: Open CPM Scheduler &amp; QTO Tool</p>
                    <p style="color:rgba(237,230,219,0.6);font-size:13px;line-height:1.5;margin:0;">Open the CPM scheduler and quantity takeoff tool for group access.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- Discord CTA -->
          <tr>
            <td align="center">
              <a href="${DISCORD_INVITE}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:600;">
                Post Your Work in Discord &rarr;
              </a>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Closing -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              Execute this week. Don't just consume the content &mdash; put it to work. Drop your V/TO, your accountability chart, and your People Analyzer scores in the Discord. Let's see what you've got.
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:#D4915C;font-size:14px;font-weight:600;">
              &mdash; Marshall
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
                &nbsp;&nbsp;&middot;&nbsp;&nbsp;
                <a href="https://alpcontractorcircle.com" style="color:rgba(212,145,92,0.5);text-decoration:none;">Website</a>
                &nbsp;&nbsp;&middot;&nbsp;&nbsp;
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
</html>`;
}

function buildText(firstName) {
  return `CALL #2 RECAP — YOUR BUSINESS IS YOUR BIGGEST ASSET

${firstName}, yesterday's call is now in the portal.

The presentation deck from Call #2: Your Business is Your Biggest Asset is now live in the Templates Library, and the full recording is in the Replay Library.

→ Get the Deck: ${TEMPLATE_URL}
→ Watch the Replay: ${REPLAY_URL}

Log in to the portal → Templates → Circle Presentations

─────────────────────────────────────

ACTION ITEMS FROM CALL #2

Here's what you need to execute this week.

ALL MEMBERS:

01. Complete the V/TO (Vision/Traction Organizer)
    Fill it out and drop it in the Discord so the group can see it and give feedback.

02. Draw Your Accountability Chart
    All five functions, with names in seats. Identify where you are sitting in multiple seats.

03. Run the People Analyzer on Your Top 5
    Score them on core values and GWC (Get it, Want it, Capacity to do it).

04. Calculate Your Owner Dependency Score
    What percentage of your revenue comes from personal relationships? That number is your vulnerability.

05. Submit a Boot Camp Question
    If you haven't already, submit one question or topic for the upcoming Boot Camp.

INDIVIDUAL ASSIGNMENTS:

06. Joey: Post Org Structure in Discord
    Post your organization structure in the Discord this week.

07. Marshall: CPM Scheduler Scope Functionality
    Add scope-specific functionality to the CPM scheduler — ability to specify divisions like "only foundation of Division 3."

08. Marshall: Open CPM Scheduler & QTO Tool
    Open the CPM scheduler and quantity takeoff tool for group access.

─────────────────────────────────────

Execute this week. Don't just consume the content — put it to work. Drop your V/TO, your accountability chart, and your People Analyzer scores in the Discord. Let's see what you've got.

— Marshall

─────────────────────────────────────
Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorcircle.com
Portal: https://app.alpcontractorcircle.com/login`;
}

async function main() {
  if (PREVIEW_MODE) {
    console.log("PREVIEW MODE — sending only to", PREVIEW_EMAIL);
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to: PREVIEW_EMAIL,
      subject: "Call #2 Recap — Your Business is Your Biggest Asset",
      html: buildHtml("Marshall"),
      text: buildText("Marshall"),
    });
    if (result.error) {
      console.error("FAILED:", result.error.message);
    } else {
      console.log("SENT preview to", PREVIEW_EMAIL, "— id:", result.data?.id);
    }
    process.exit(0);
  }

  // Production mode: pull from MySQL
  console.log("Fetching active members from MySQL...");
  const { drizzle } = await import("drizzle-orm/mysql2");
  const mysql = await import("mysql2/promise");
  const { createRequire } = await import("module");
  const require = createRequire(import.meta.url);
  // Use the server's compiled schema via the running process env
  const { members } = await import("../drizzle/schema.js").catch(() => import("../drizzle/schema.ts"));
  const { isNotNull, eq, and, ne } = await import("drizzle-orm");

  const connection = await mysql.createPool(process.env.DATABASE_URL);
  const db = drizzle(connection);

  const rows = await db
    .select({
      id: members.id,
      name: members.discordDisplayName,
      email: members.email,
      username: members.discordUsername,
    })
    .from(members)
    .where(
      and(
        isNotNull(members.email),
        eq(members.subscriptionStatus, "active")
      )
    );

  // Filter out bot accounts and Marshall's own record
  const activeMembers = rows
    .filter(r => !!r.email && !!r.name)
    .filter(r => r.username !== "alpteambot")
    .map(r => ({ id: r.id, name: r.name, email: r.email }));

  console.log(`Found ${activeMembers.length} active members with emails.`);

  if (activeMembers.length === 0) {
    console.log("No active members found. Exiting.");
    await connection.end();
    process.exit(0);
  }

  for (const m of activeMembers) {
    console.log(`  - ${m.name} <${m.email}>`);
  }

  let sent = 0;
  let failed = 0;

  for (const member of activeMembers) {
    const firstName = member.name.split(" ")[0] || "there";
    try {
      const result = await resend.emails.send({
        from: FROM_ADDRESS,
        replyTo: REPLY_TO,
        to: member.email,
        subject: "Call #2 Recap — Your Business is Your Biggest Asset",
        html: buildHtml(firstName),
        text: buildText(firstName),
      });

      if (result.error) {
        console.error(`  FAILED: ${member.email} — ${result.error.message}`);
        failed++;
      } else {
        console.log(`  SENT: ${member.email} — id: ${result.data?.id}`);
        sent++;
      }
    } catch (err) {
      console.error(`  ERROR: ${member.email} — ${err.message}`);
      failed++;
    }

    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\nDone. Sent: ${sent}, Failed: ${failed}, Total: ${activeMembers.length}`);
  await connection.end();
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
