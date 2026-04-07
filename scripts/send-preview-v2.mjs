/**
 * Send updated preview drip email to Marshall — showing 16px font, new FROM, and unsubscribe link
 */
import { Resend } from "resend";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "marshall@marshallwilkinson.com";
const FROM = "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>";
const SECRET = process.env.JWT_SECRET || "fallback-secret";

function generateUnsubUrl(email) {
  const token = crypto.createHmac("sha256", SECRET).update(email.toLowerCase().trim()).digest("hex");
  return `https://alpcontractorcircle.com/api/drip/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

function wrapEmail(bodyHtml, unsubUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#f7f5f2;font-family:'Inter',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f5f2;">
    <tr>
      <td style="padding:32px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;">
          <!-- Subtle brand accent line -->
          <tr>
            <td style="padding-bottom:24px;">
              <div style="width:40px;height:3px;background:linear-gradient(90deg,#D4915C,#C9A96E);border-radius:2px;"></div>
            </td>
          </tr>
          <!-- Email body -->
          <tr>
            <td style="background-color:#ffffff;border-radius:8px;padding:36px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#2d2d2d;font-size:18px;line-height:1.8;font-family:Georgia,'Times New Roman',serif;">
${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;text-align:center;">
              <span style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#999;text-transform:uppercase;">ALP</span>
              <br><a href="${unsubUrl}" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#bbb;text-decoration:none;">Unsubscribe</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function p(text) {
  return `<p style="margin:0 0 18px 0;color:#2d2d2d;">${text}</p>`;
}

function sig() {
  return `<div style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e8e4df;">
    <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#2d2d2d;">Marshall</p>
  </div>`;
}

async function main() {
  const unsubUrl = generateUnsubUrl(TO);
  
  const html = wrapEmail(
    p(`Hey Marshall —`) +
    p(`Let me tell you about a job that almost went sideways.`) +
    p(`A contractor I was advising had a $4.2M bid ready to submit. Everything looked right. The takeoffs were solid, the sub numbers were in, the markup was reasonable. He was ready to hit send.`) +
    p(`I asked him one question: "Did you scope-level the mechanical sub?"`) +
    p(`He hadn't. He had two quotes — one at $680K and one at $410K. He was going to use the $410K number because it was lower. The problem? The $410K sub had excluded all ductwork insulation, all testing and balancing, and the building automation tie-in. That's $340K in missing scope.`) +
    p(`If he had submitted that bid with the $410K number, he would have won the job — and lost $340K on it. He would have been underwater before the first shovel hit the ground.`) +
    p(`That's Phase 6 in the checklist. Scope-leveling isn't optional. It's the difference between a profitable job and a disaster.`) +
    p(`How many of your sub bids have you actually scope-leveled line by line?`) +
    sig(),
    unsubUrl
  );

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: TO,
    subject: "[PREVIEW v3] The $340K mistake I caught before it was too late",
    html,
  });

  if (error) {
    console.error("Failed:", error);
  } else {
    console.log("Sent preview v2 — id:", data?.id);
    console.log("FROM:", FROM);
    console.log("Font: 16px Georgia");
    console.log("Unsubscribe link included in footer");
  }
}

main();
