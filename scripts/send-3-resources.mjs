import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/favicon-192x192_f43344e4.png";
const TEMPLATE_URL = "https://alpcontractorcircle.com/portal/templates";
const PORTAL_URL = "https://alpcontractorcircle.com/portal";
const BASE_STYLES = "background-color:#08090D;font-family:Georgia,'Times New Roman',serif;";
const FROM = "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>";

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>3 New Resources Live in the Portal</title>
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
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Contractor Circle — New Resources</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:18px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:26px;font-weight:700;line-height:1.3;padding:0 10px;">
              ${firstName}, 3 new resources just dropped.
            </td>
          </tr>
          <tr><td style="height:14px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:15px;line-height:1.6;padding:0 16px;">
              We uploaded three new templates to your <strong style="color:#EDE6DB;">Contractor Circle</strong> member library today. Here's what's waiting for you.
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- ═══ Resource 1: ALP/EOS Scorecard ═══ -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#x1F4CA;</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Operations — Quick Reference</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">ALP/EOS Scorecard Guidelines</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    Your one-page reference for the ALP/EOS Data Component — know your numbers, run your business.
                  </p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                  &#x2713; The Scorecard — 5-15 numbers max, one owner per number<br/>
                  &#x2713; Leading vs. Lagging — track activities, not just results<br/>
                  &#x2713; Find Your One Number — for contractors: backlog in months<br/>
                  &#x2713; Everyone Gets a Measurable — cascade to every seat<br/>
                  &#x2713; Red Flags — signs your Scorecard is broken
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:20px;"></td></tr>

          <!-- ═══ Resource 2: Subcontractor Bid Submittal Form ═══ -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#x1F4CB;</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Estimating — Ready to Use</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">Subcontractor Bid Submittal Form</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    Stop chasing subs for missing info. Hand them this form and get clean, comparable numbers back every time.
                  </p>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:20px;"></td></tr>

          <!-- ═══ Resource 3: Bootcamp Topic Submission ═══ -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">&#x1F3AF;</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Monthly Bootcamp</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">Bootcamp Topic Submission</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    Submit the topic you want covered in the next monthly bootcamp. Your business, your questions — we build the agenda around what you actually need.
                  </p>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center">
              <a href="${TEMPLATE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Browse the Template Library &#x2192;
              </a>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Log in to the portal &#x2192; Templates
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Closing note -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              These are exclusive to Contractor Circle members. Log in, download what you need, and put them to work this week.
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
  return `CONTRACTOR CIRCLE — NEW RESOURCES

${firstName}, 3 new resources just dropped.

We uploaded three new templates to your Contractor Circle member library today. Here's what's waiting for you.

---

1. ALP/EOS Scorecard Guidelines (Operations)
Your one-page reference for the ALP/EOS Data Component — know your numbers, run your business.

- The Scorecard — 5-15 numbers max, one owner per number
- Leading vs. Lagging — track activities, not just results
- Find Your One Number — for contractors: backlog in months
- Everyone Gets a Measurable — cascade to every seat
- Red Flags — signs your Scorecard is broken

2. Subcontractor Bid Submittal Form (Estimating)
Stop chasing subs for missing info. Hand them this form and get clean, comparable numbers back every time.

3. Bootcamp Topic Submission (Monthly Bootcamp)
Submit the topic you want covered in the next monthly bootcamp. Your business, your questions — we build the agenda around what you actually need.

---

Browse the Template Library: https://alpcontractorcircle.com/portal/templates
Log in to the portal -> Templates

These are exclusive to Contractor Circle members. Log in, download what you need, and put them to work this week.

— Marshall

---
Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorschool.com
Portal: https://alpcontractorcircle.com/portal`;
}

const recipients = [
  { email: "jake@nciconstruction.com", name: "Jake Nichter" },
  { email: "intricatehvac@gmail.com", name: "Intricate Tech Solutions" },
];

for (const r of recipients) {
  const firstName = r.name.split(" ")[0];
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: r.email,
    subject: "3 New Resources Live in the Portal",
    html: buildHtml(firstName),
    text: buildText(firstName),
  });

  if (error) {
    console.log(`FAILED for ${r.email}: ${error.message}`);
  } else {
    console.log(`SENT to ${r.email} — id: ${data?.id}`);
  }
}
