import { Resend } from "resend";
import * as dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";

const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Contractor Circle Access Is Live</title>
</head>
<body style="margin:0;padding:0;background-color:#08090D;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#C9A84C;">
                ALP · THE CONTRACTOR CIRCLE
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 0 32px;">
              <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#F5F0E8;line-height:1.3;">
                Your Contractor Circle Access Is Live
              </h1>

              <p style="margin:0 0 20px;font-size:16px;color:rgba(245,240,232,0.75);line-height:1.7;">
                Hey [First Name],
              </p>

              <p style="margin:0 0 20px;font-size:16px;color:rgba(245,240,232,0.75);line-height:1.7;">
                Quick note — your full Contractor Circle portal access is now live.
              </p>

              <p style="margin:0 0 20px;font-size:16px;color:rgba(245,240,232,0.75);line-height:1.7;">
                If you tried logging in earlier and things looked locked down, that's been resolved. You now have complete access to:
              </p>

              <!-- Access list -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="padding:16px 20px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.15);border-radius:10px;">
                    <p style="margin:0 0 10px;font-size:14px;color:#C9A84C;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;">What You Have Access To</p>
                    <p style="margin:0 0 8px;font-size:15px;color:rgba(245,240,232,0.85);line-height:1.6;">✦ &nbsp;Full member portal at alpcontractorcircle.com/portal</p>
                    <p style="margin:0 0 8px;font-size:15px;color:rgba(245,240,232,0.85);line-height:1.6;">✦ &nbsp;All replay recordings</p>
                    <p style="margin:0 0 8px;font-size:15px;color:rgba(245,240,232,0.85);line-height:1.6;">✦ &nbsp;Templates &amp; resources library</p>
                    <p style="margin:0;font-size:15px;color:rgba(245,240,232,0.85);line-height:1.6;">✦ &nbsp;Bi-weekly live Zoom calls — Sundays at 5 PM ET</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 32px;font-size:16px;color:rgba(245,240,232,0.75);line-height:1.7;">
                Just log in with your Discord account and everything will be there.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#C9A84C;border-radius:8px;">
                    <a href="https://alpcontractorcircle.com/portal"
                       style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#08090D;text-decoration:none;letter-spacing:0.04em;">
                      Access Your Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px;font-size:16px;color:rgba(245,240,232,0.75);line-height:1.7;">
                If you have any issues, reply to this email and I'll get it sorted.
              </p>

              <p style="margin:0;font-size:16px;color:rgba(245,240,232,0.75);line-height:1.7;">
                Welcome to the Circle.
              </p>
            </td>
          </tr>

          <!-- Signature -->
          <tr>
            <td style="padding-top:32px;border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#F5F0E8;">Marshall Wilkinson</p>
              <p style="margin:0;font-size:13px;color:rgba(245,240,232,0.45);letter-spacing:0.06em;text-transform:uppercase;">Founder, ALP</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:32px;">
              <p style="margin:0;font-size:11px;color:rgba(245,240,232,0.25);text-align:center;line-height:1.6;">
                ⚠️ DRAFT PREVIEW — This email will go to Michael E and Joaquin Lescano after your approval.<br/>
                ALP · The Contractor Circle · alpcontractorcircle.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const result = await resend.emails.send({
  from: FROM_ADDRESS,
  to: ["marshall@marshallwilkinson.com"],
  subject: "⚠️ DRAFT PREVIEW: Your Contractor Circle Access Is Live",
  html,
});

console.log("Draft preview sent:", result);
