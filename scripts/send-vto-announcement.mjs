import { Resend } from "resend";
import mysql from "mysql2/promise";

const resend = new Resend(process.env.RESEND_API_KEY);

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/favicon-192x192_f43344e4.png";
const TEMPLATE_URL = "https://app.alpcontractorcircle.com/login";
const PORTAL_URL = "https://app.alpcontractorcircle.com/login";
const BASE_STYLES = "background-color:#08090D;font-family:Georgia,'Times New Roman',serif;";
const FROM = "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>";

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Template Available — ALP/EOS Vision/Traction Organizer</title>
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
              <img src="${LOGO_URL}" alt="ALP Contractor Circle" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;" />
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Badge -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);border-radius:50px;padding:6px 16px;">
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Contractor Circle &#x2014; New Template</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:18px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:26px;font-weight:700;line-height:1.3;padding:0 10px;">
              ${firstName}, the ALP/EOS V/TO is live.
            </td>
          </tr>
          <tr><td style="height:14px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:15px;line-height:1.6;padding:0 16px;">
              A new template has been added to your <strong style="color:#EDE6DB;">Contractor Circle</strong> member library. The <strong style="color:#EDE6DB;">Vision/Traction Organizer</strong> &#x2014; the two-page document that captures your company's entire strategic plan &#x2014; is now under <strong style="color:#D4915C;">Operations</strong>.
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#x1F3AF;</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Strategic Planning &#x2014; 2 Pages</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">ALP/EOS Vision/Traction Organizer (V/TO)</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    The two-page strategic tool that aligns your entire leadership team on where you're going and how you're going to get there. Includes a completed example for a mid-size GC.
                  </p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                  &#x2713; Core Values &#x2014; the 3-5 non-negotiables you hire, fire, and reward on<br/>
                  &#x2713; Core Focus &#x2014; your Purpose and Niche that stop you from chasing shiny objects<br/>
                  &#x2713; 10-Year Target &#x2014; one big measurable goal the whole team rallies behind<br/>
                  &#x2713; Marketing Strategy &#x2014; target market, three uniques, proven process, guarantee<br/>
                  &#x2713; 3-Year Picture &amp; 1-Year Plan &#x2014; revenue, profit, employees, key capabilities<br/>
                  &#x2713; Quarterly Rocks &amp; Issues List &#x2014; 90-day priorities and the IDS process<br/>
                  &#x2713; Complete example V/TO for a mid-size general contractor
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center">
              <a href="${TEMPLATE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Download the V/TO Toolkit &#x2192;
              </a>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Log in to the portal &#x2192; Templates &#x2192; Operations
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Closing note -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              This template is exclusive to Contractor Circle members. Without a V/TO, every person on your leadership team has a different version of where the company is going. The V/TO eliminates that. Download it, fill it out with your team, and get everyone on the same page.
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:#D4915C;font-size:14px;font-weight:600;">
              &#x2014; Marshall
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
                &nbsp;&nbsp;&#xB7;&nbsp;&nbsp;
                <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.5);text-decoration:none;">Website</a>
                &nbsp;&nbsp;&#xB7;&nbsp;&nbsp;
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
  return `CONTRACTOR CIRCLE — NEW TEMPLATE

${firstName}, the ALP/EOS V/TO is live.

A new template has been added to your Contractor Circle member library. The Vision/Traction Organizer — the two-page document that captures your company's entire strategic plan — is now under Operations.

---

ALP/EOS Vision/Traction Organizer (V/TO) — 2 Pages

The two-page strategic tool that aligns your entire leadership team on where you're going and how you're going to get there. Includes a completed example for a mid-size GC.

- Core Values — the 3-5 non-negotiables you hire, fire, and reward on
- Core Focus — your Purpose and Niche that stop you from chasing shiny objects
- 10-Year Target — one big measurable goal the whole team rallies behind
- Marketing Strategy — target market, three uniques, proven process, guarantee
- 3-Year Picture & 1-Year Plan — revenue, profit, employees, key capabilities
- Quarterly Rocks & Issues List — 90-day priorities and the IDS process
- Complete example V/TO for a mid-size general contractor

-> Download: https://app.alpcontractorcircle.com/login
   Log in to the portal -> Templates -> Operations

---

Without a V/TO, every person on your leadership team has a different version of where the company is going. The V/TO eliminates that. Download it, fill it out with your team, and get everyone on the same page.

— Marshall

---
Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorschool.com
Portal: https://app.alpcontractorcircle.com/login`;
}

// ─── Send to all active members ─────────────────────────────────────────────
const conn = await mysql.createConnection(process.env.DATABASE_URL);
const [members] = await conn.execute(
  "SELECT email, discordDisplayName, discordUsername FROM members WHERE subscriptionStatus = 'active'"
);
await conn.end();

let sent = 0;
let failed = 0;

for (const m of members) {
  const displayName = m.discordDisplayName || m.discordUsername || "there";
  const firstName = displayName.split(" ")[0];

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: m.email,
    subject: "New in the Portal — ALP/EOS Vision/Traction Organizer (Download Now)",
    html: buildHtml(firstName),
    text: buildText(firstName),
  });

  if (error) {
    console.log(`FAILED: ${m.email} — ${error.message}`);
    failed++;
  } else {
    console.log(`SENT: ${m.email} — id: ${data?.id}`);
    sent++;
  }
}

console.log(`\nDone. ${sent} sent, ${failed} failed out of ${members.length} active members.`);
