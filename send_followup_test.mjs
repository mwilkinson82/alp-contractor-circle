// Send follow-up email to TEST (Marshall) — acknowledging first email was for CC members, offering Three Silos direct download
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const PDF_URL = "https://alpcontractorcircle.com/manus-storage/ALP_Three_Silos_Framework_v3_fixed_1add3fd9.pdf";
const COACHING_URL = "https://altitudelogicpressure.com/coaching";

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Quick note + a free framework for you</title>
</head>
<body style="margin:0;padding:0;background-color:#08090D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#EDE6DB;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gradient Bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Greeting -->
          <tr>
            <td style="color:#EDE6DB;font-size:22px;font-weight:700;line-height:1.3;">
              Hey ${firstName},
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Body -->
          <tr>
            <td style="color:rgba(237,230,219,0.8);font-size:15px;line-height:1.7;">
              You may have gotten an email from me earlier about new templates in the Contractor Circle portal. That was meant for our Contractor Circle members — my mistake for sending it your way.
            </td>
          </tr>
          <tr><td style="height:14px;"></td></tr>

          <tr>
            <td style="color:rgba(237,230,219,0.8);font-size:15px;line-height:1.7;">
              But since you're here — I do want to make sure you have <strong style="color:#EDE6DB;">The Three Silos Framework</strong>. It's the diagnostic tool I use with every contractor I work with to figure out exactly where their business is breaking down.
            </td>
          </tr>
          <tr><td style="height:14px;"></td></tr>

          <tr>
            <td style="color:rgba(237,230,219,0.8);font-size:15px;line-height:1.7;">
              Every contracting business runs on three silos — <strong style="color:#D4915C;">Sales & Marketing</strong>, <strong style="color:#D4915C;">Operations & Production</strong>, and <strong style="color:#D4915C;">Finance & Admin</strong>. Most contractors are strong in one, decent in another, and completely ignoring the third. That's where the bleeding happens.
            </td>
          </tr>
          <tr><td style="height:14px;"></td></tr>

          <tr>
            <td style="color:rgba(237,230,219,0.8);font-size:15px;line-height:1.7;">
              The framework walks you through all three and shows you which one is costing you the most money right now.
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center">
              <a href="${PDF_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Download The Three Silos Framework →
              </a>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Coaching plug -->
          <tr>
            <td style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.7;">
              If you go through it and realize you need help fixing what's broken — <a href="${COACHING_URL}" style="color:#D4915C;text-decoration:underline;">book a strategy call</a> and we'll figure it out together.
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>

          <!-- Sign off -->
          <tr>
            <td style="color:#D4915C;font-size:15px;font-weight:600;padding-top:16px;">
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

function buildText(firstName) {
  return `Hey ${firstName},

You may have gotten an email from me earlier about new templates in the Contractor Circle portal. That was meant for our Contractor Circle members — my mistake for sending it your way.

But since you're here — I do want to make sure you have The Three Silos Framework. It's the diagnostic tool I use with every contractor I work with to figure out exactly where their business is breaking down.

Every contracting business runs on three silos — Sales & Marketing, Operations & Production, and Finance & Admin. Most contractors are strong in one, decent in another, and completely ignoring the third. That's where the bleeding happens.

The framework walks you through all three and shows you which one is costing you the most money right now.

→ Download The Three Silos Framework: ${PDF_URL}

If you go through it and realize you need help fixing what's broken — book a strategy call and we'll figure it out together: ${COACHING_URL}

— Marshall

Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorschool.com`.trim();
}

async function main() {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "marshall@marshallwilkinson.com",
      subject: "Quick note + a free framework for you",
      html: buildHtml("Marshall"),
      text: buildText("Marshall"),
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
