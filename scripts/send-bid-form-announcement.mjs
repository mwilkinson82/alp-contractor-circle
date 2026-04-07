import { Resend } from "resend";
import mysql from "mysql2/promise";

const resend = new Resend(process.env.RESEND_API_KEY);
const pool = mysql.createPool(process.env.DATABASE_URL);

const FROM_ADDRESS = "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>";
const TEMPLATE_URL = "https://alpcontractorcircle.com/portal/templates";
const PORTAL_URL = "https://alpcontractorcircle.com/portal";
const BASE_STYLES = "font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;";

function buildHtml(name) {
  const firstName = name.split(" ")[0] || "there";
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Template Available — Subcontractor Bid Submittal Form</title>
</head>
<body style="margin:0;padding:0;${BASE_STYLES}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gradient Bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:20px;"></td></tr>

          <!-- CC Logo -->
          <tr>
            <td align="center">
              <img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/favicon-192x192_f43344e4.png" alt="ALP Contractor Circle" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;" />
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Badge -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);border-radius:50px;padding:6px 16px;">
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Contractor Circle — New Template</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:18px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:26px;font-weight:700;line-height:1.3;padding:0 10px;">
              ${firstName}, new form in your library.
            </td>
          </tr>
          <tr><td style="height:14px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:15px;line-height:1.6;padding:0 16px;">
              A new template has been added to your <strong style="color:#EDE6DB;">Contractor Circle</strong> member library. The <strong style="color:#EDE6DB;">Subcontractor Bid Submittal Form</strong> is now available under <strong style="color:#D4915C;">Estimating</strong>.
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">📋</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Editable Form — 2 Pages</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">Subcontractor Bid Submittal Form</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    Standardize how your subs submit bids. Level the playing field and compare apples to apples:
                  </p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                  ✓ Subcontractor info — license, insurance, contact<br/>
                  ✓ Bid pricing — material vs. labor breakdown<br/>
                  ✓ Schedule of work — phase durations with dates<br/>
                  ✓ Scope description — detailed tasks & deliverables<br/>
                  ✓ Exclusions & clarifications — what's NOT included<br/>
                  ✓ Terms, warranty, and authorization signatures
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center">
              <a href="${TEMPLATE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Get the Bid Form →
              </a>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Log in to the portal → Templates → Estimating
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Closing note -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              This template is exclusive to Contractor Circle members. Stop chasing subs for missing info. Send them this form and get clean, comparable bids every time. Make a copy, brand it with your company name, and send it out with your next bid package.
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

function buildText(name) {
  const firstName = name.split(" ")[0] || "there";
  return `
CONTRACTOR CIRCLE — NEW TEMPLATE

${firstName}, new form in your library.

A new template has been added to your Contractor Circle member library. The Subcontractor Bid Submittal Form is now available under Estimating.

─────────────────────────────────────

Subcontractor Bid Submittal Form (2 Pages)

Standardize how your subs submit bids. Level the playing field and compare apples to apples:

✓ Subcontractor info — license, insurance, contact
✓ Bid pricing — material vs. labor breakdown
✓ Schedule of work — phase durations with dates
✓ Scope description — detailed tasks & deliverables
✓ Exclusions & clarifications — what's NOT included
✓ Terms, warranty, and authorization signatures

→ Download: https://alpcontractorcircle.com/portal/templates
  Log in to the portal → Templates → Estimating

─────────────────────────────────────

Stop chasing subs for missing info. Send them this form and get clean, comparable bids every time. Make a copy, brand it with your company name, and send it out with your next bid package.

— Marshall

─────────────────────────────────────
Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorschool.com
Portal: https://alpcontractorcircle.com/portal`.trim();
}

// Get all active CC members
const [members] = await pool.query(
  "SELECT DISTINCT discordDisplayName AS name, email FROM members WHERE subscriptionStatus = 'active' AND email IS NOT NULL AND email != ''"
);

console.log(`Found ${members.length} active CC members to notify`);

let sent = 0;
let failed = 0;

for (const m of members) {
  // Skip test emails
  if (m.email.includes("test") || m.email.includes("example.com")) {
    console.log(`  SKIP (test): ${m.email}`);
    continue;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: m.email,
      subject: "New in the Portal — Subcontractor Bid Submittal Form (Download Now)",
      html: buildHtml(m.name || "there"),
      text: buildText(m.name || "there"),
    });

    if (error) {
      console.log(`  FAIL: ${m.email} — ${error.message}`);
      failed++;
    } else {
      console.log(`  SENT: ${m.email} — id: ${data?.id}`);
      sent++;
    }
  } catch (err) {
    console.log(`  ERROR: ${m.email} — ${err.message}`);
    failed++;
  }

  // Small delay between sends
  await new Promise(r => setTimeout(r, 200));
}

console.log(`\nDone: ${sent} sent, ${failed} failed`);
await pool.end();
