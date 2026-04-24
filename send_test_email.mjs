// Send test email for new templates announcement
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const PORTAL_URL = "https://alpcontractorcircle.com/portal";
const BASE_STYLES = `
  background-color:#08090D;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  color:#EDE6DB;
`;
const TEMPLATE_URL = "https://alpcontractorcircle.com/portal/templates";
const firstName = "Marshall";

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>2 New Templates — The Three Silos Framework + EOS Component Connection Map</title>
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
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Contractor Circle — 2 New Templates</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:18px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:26px;font-weight:700;line-height:1.3;padding:0 10px;">
              ${firstName}, two new frameworks just dropped.
            </td>
          </tr>
          <tr><td style="height:14px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:15px;line-height:1.6;padding:0 16px;">
              Two new templates have been added to your <strong style="color:#EDE6DB;">Contractor Circle</strong> member library under <strong style="color:#D4915C;">Operations</strong>. Both are ready to download now.
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- Template 1 Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">🏗️</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Strategic Framework — 5 Pages</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">The Three Silos Framework</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    The diagnostic tool that reveals why most contractors stay stuck. Every contracting business runs on three silos:
                  </p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                  ✓ Sales & Marketing — how you get work<br/>
                  ✓ Operations & Production — how you deliver work<br/>
                  ✓ Finance & Admin — how you keep the money<br/>
                  ✓ 82% of construction businesses fail due to cash flow<br/>
                  ✓ 70% of contractors undercharge by 15-30%<br/>
                  ✓ The Warren Buffett test for your business
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Template 2 Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">🔗</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Operating System Architecture — 5 Pages</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">EOS Component Connection Map</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    Why we build the operating system in this exact sequence — and what breaks when you skip a step:
                  </p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                  ✓ The Parent/Child Framework — V/TO is the foundation<br/>
                  ✓ Six components in sequence — Vision → People → Data → Issues → Process → Traction<br/>
                  ✓ How each component locks into the next<br/>
                  ✓ What happens when you skip Vision, People, Data, or Traction<br/>
                  ✓ The bottom line: build the V/TO first, never skip ahead
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center">
              <a href="${TEMPLATE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Download Both Templates →
              </a>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Log in to the portal → Templates → Operations
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Closing note -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              These templates are exclusive to Contractor Circle members. The Three Silos Framework shows you where your business is breaking. The Connection Map shows you how to build the system that fixes it. Download both, study them, and bring your questions to the next call.
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
</html>
`.trim();

const text = `CONTRACTOR CIRCLE — 2 NEW TEMPLATES

Marshall, two new frameworks just dropped.

Two new templates have been added to your Contractor Circle member library under Operations. Both are ready to download now.

─────────────────────────────────────

1. THE THREE SILOS FRAMEWORK (5 Pages)

The diagnostic tool that reveals why most contractors stay stuck:

✓ Sales & Marketing — how you get work
✓ Operations & Production — how you deliver work
✓ Finance & Admin — how you keep the money
✓ 82% of construction businesses fail due to cash flow
✓ 70% of contractors undercharge by 15-30%
✓ The Warren Buffett test for your business

─────────────────────────────────────

2. EOS COMPONENT CONNECTION MAP (5 Pages)

Why we build the operating system in this exact sequence:

✓ The Parent/Child Framework — V/TO is the foundation
✓ Six components: Vision → People → Data → Issues → Process → Traction
✓ How each component locks into the next
✓ What happens when you skip a step
✓ The bottom line: build the V/TO first, never skip ahead

─────────────────────────────────────

→ Download Both: https://alpcontractorcircle.com/portal/templates
  Log in to the portal → Templates → Operations

─────────────────────────────────────

The Three Silos Framework shows you where your business is breaking. The Connection Map shows you how to build the system that fixes it. Download both, study them, and bring your questions to the next call.

— Marshall

─────────────────────────────────────
Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorschool.com
Portal: https://alpcontractorcircle.com/portal`;

async function main() {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "marshall@marshallwilkinson.com",
      subject: "2 New Templates in the Portal — Three Silos Framework + EOS Connection Map",
      html,
      text,
    });

    if (error) {
      console.error("Failed:", error);
      process.exit(1);
    }

    console.log("Test email sent successfully! ID:", data?.id);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

main();
