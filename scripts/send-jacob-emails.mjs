import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "jake@nciconstruction.com";
const NAME = "Jacob Nichter";

// ─── Email 1: EOS Scorecard Template Announcement ──────────────────────────

console.log("Sending Email 1: EOS Scorecard Template Announcement...");
try {
  const { data, error } = await resend.emails.send({
    from: "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>",
    to: TO,
    subject: "New in the Portal — ALP/EOS Scorecard Guidelines (Download Now)",
    html: buildEosScorecardHtml(NAME),
    text: buildEosScorecardText(NAME),
  });
  if (error) console.error("❌ EOS Scorecard email failed:", error);
  else console.log(`✅ EOS Scorecard email sent — id: ${data?.id}`);
} catch (err) {
  console.error("❌ EOS Scorecard email error:", err);
}

// Small delay between emails
await new Promise(r => setTimeout(r, 2000));

// ─── Email 2: Bootcamp Topic Submission ─────────────────────────────────────

console.log("Sending Email 2: Bootcamp Topic Submission...");
try {
  const { data, error } = await resend.emails.send({
    from: "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>",
    to: TO,
    subject: "Contractor Circle Monthly Bootcamp — Submit Your Topic (April 26)",
    html: buildBootcampHtml(NAME),
    text: buildBootcampText(NAME),
  });
  if (error) console.error("❌ Bootcamp email failed:", error);
  else console.log(`✅ Bootcamp email sent — id: ${data?.id}`);
} catch (err) {
  console.error("❌ Bootcamp email error:", err);
}

console.log("\n✅ Done — both emails sent to jake@nciconstruction.com");

// ─── HTML Builders ──────────────────────────────────────────────────────────

function buildEosScorecardHtml(name) {
  const firstName = name.split(" ")[0];
  const TEMPLATE_URL = "https://app.alpcontractorcircle.com/login";
  const PORTAL_URL = "https://app.alpcontractorcircle.com/login";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#08090D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:20px;"></td></tr>
          <tr><td align="center"><img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/favicon-192x192_f43344e4.png" alt="ALP" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;" /></td></tr>
          <tr><td style="height:16px;"></td></tr>
          <tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);border-radius:50px;padding:6px 16px;"><span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Contractor Circle — New Template</span></td></tr></table></td></tr>
          <tr><td style="height:18px;"></td></tr>
          <tr><td align="center" style="color:#EDE6DB;font-size:26px;font-weight:700;line-height:1.3;padding:0 10px;">${firstName}, the ALP/EOS Scorecard is live.</td></tr>
          <tr><td style="height:14px;"></td></tr>
          <tr><td align="center" style="color:rgba(237,230,219,0.7);font-size:15px;line-height:1.6;padding:0 16px;">A new template has been added to your <strong style="color:#EDE6DB;">Contractor Circle</strong> member library. Your one-page reference for the <strong style="color:#EDE6DB;">ALP/EOS Data Component</strong> — know your numbers, run your business — is now under <strong style="color:#D4915C;">Operations</strong>.</td></tr>
          <tr><td style="height:28px;"></td></tr>
          <tr><td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="48" valign="top"><div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">📊</div></td>
              <td style="padding-left:16px;">
                <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Quick Reference — 1 Page</p>
                <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">ALP/EOS Scorecard Guidelines</p>
                <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">Everything you need to build and maintain an effective weekly Scorecard:</p>
              </td>
            </tr></table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
              <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                ✓ The Scorecard — 5-15 numbers max, one owner per number<br/>
                ✓ Leading vs. Lagging — track activities, not just results<br/>
                ✓ Find Your One Number — for contractors: backlog in months<br/>
                ✓ Everyone Gets a Measurable — cascade to every seat<br/>
                ✓ Red Flags — signs your Scorecard is broken<br/>
                ✓ Sample Scorecard Structure with weekly tracking
              </td></tr>
            </table>
          </td></tr>
          <tr><td style="height:28px;"></td></tr>
          <tr><td align="center"><a href="${TEMPLATE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">Download the Scorecard Guide →</a></td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">Log in to the portal → Templates → Operations</td></tr>
          <tr><td style="height:32px;"></td></tr>
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr><td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">This template is exclusive to Contractor Circle members. Data doesn't replace your gut. It confirms it or challenges it. Either way, you make better decisions. Download the guide, build your Scorecard, and start running your business by the numbers.</td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td align="center" style="color:#D4915C;font-size:14px;font-weight:600;">— Marshall</td></tr>
          <tr><td style="height:32px;"></td></tr>
          <tr><td style="height:1px;background-color:rgba(255,255,255,0.06);"></td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr><td align="center" style="color:rgba(237,230,219,0.3);font-size:12px;line-height:1.6;">
            <p style="margin:0;">Altitude Logic Pressure</p>
            <p style="margin:4px 0 0 0;"><a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.5);text-decoration:none;">Instagram</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.5);text-decoration:none;">Website</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.5);text-decoration:none;">Member Portal</a></p>
          </td></tr>
          <tr><td style="height:40px;"></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildEosScorecardText(name) {
  const firstName = name.split(" ")[0];
  return `CONTRACTOR CIRCLE — NEW TEMPLATE\n\n${firstName}, the ALP/EOS Scorecard is live.\n\nA new template has been added to your Contractor Circle member library. Your one-page reference for the ALP/EOS Data Component is now under Operations.\n\n✓ The Scorecard — 5-15 numbers max, one owner per number\n✓ Leading vs. Lagging — track activities, not just results\n✓ Find Your One Number — for contractors: backlog in months\n✓ Everyone Gets a Measurable — cascade to every seat\n✓ Red Flags — signs your Scorecard is broken\n✓ Sample Scorecard Structure with weekly tracking\n\n→ Download: https://app.alpcontractorcircle.com/login\n\nData doesn't replace your gut. It confirms it or challenges it.\n\n— Marshall`;
}

function buildBootcampHtml(name) {
  const firstName = name.split(" ")[0];
  const PORTAL_URL = "https://app.alpcontractorcircle.com/login";
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#08090D;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr><td style="height:4px;background:linear-gradient(90deg,#B8451C,#D4915C,#C9A96E,#D4915C,#B8451C);border-radius:2px;"></td></tr>
          <tr><td style="height:20px;"></td></tr>
          <tr><td align="center"><img src="https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/favicon-192x192_f43344e4.png" alt="ALP" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;" /></td></tr>
          <tr><td style="height:16px;"></td></tr>
          <tr><td align="center"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background-color:rgba(184,69,28,0.15);border:1px solid rgba(184,69,28,0.3);border-radius:50px;padding:6px 16px;"><span style="color:#B8451C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Monthly Bootcamp</span></td></tr></table></td></tr>
          <tr><td style="height:18px;"></td></tr>
          <tr><td align="center" style="color:#EDE6DB;font-size:26px;font-weight:700;line-height:1.3;padding:0 10px;">Your topic. Your bootcamp.</td></tr>
          <tr><td style="height:14px;"></td></tr>
          <tr><td align="center" style="color:rgba(237,230,219,0.7);font-size:15px;line-height:1.6;padding:0 16px;">The next <strong style="color:#EDE6DB;">Contractor Circle Monthly Bootcamp</strong> is coming up — and we're building the agenda around <strong style="color:#D4915C;">you</strong>.</td></tr>
          <tr><td style="height:28px;"></td></tr>
          <!-- Ticket Card -->
          <tr><td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
              <tr><td style="background-color:#111318;padding:28px 32px 20px 32px;text-align:center;">
                <p style="color:#B8451C;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px 0;font-weight:700;">Contractor Circle</p>
                <p style="color:#EDE6DB;font-size:22px;font-weight:800;margin:0;">Monthly Bootcamp</p>
              </td></tr>
              <tr><td style="height:0;border-bottom:2px dashed rgba(255,255,255,0.1);background-color:#111318;"></td></tr>
              <tr><td style="background-color:#111318;padding:24px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                  <td width="50%" style="text-align:center;border-right:1px solid rgba(255,255,255,0.08);">
                    <p style="color:#D4915C;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;font-weight:700;">Date</p>
                    <p style="color:#EDE6DB;font-size:20px;font-weight:700;margin:0;">APR 26</p>
                    <p style="color:rgba(237,230,219,0.5);font-size:12px;margin:4px 0 0 0;">Saturday</p>
                  </td>
                  <td width="50%" style="text-align:center;">
                    <p style="color:#D4915C;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 6px 0;font-weight:700;">Time</p>
                    <p style="color:#EDE6DB;font-size:20px;font-weight:700;margin:0;">5:00 PM</p>
                    <p style="color:rgba(237,230,219,0.5);font-size:12px;margin:4px 0 0 0;">Eastern Time</p>
                  </td>
                </tr></table>
              </td></tr>
              <tr><td style="height:0;border-bottom:2px dashed rgba(255,255,255,0.1);background-color:#111318;"></td></tr>
              <tr><td style="background-color:#111318;padding:28px 32px 20px 32px;">
                <p style="color:#EDE6DB;font-size:18px;font-weight:700;margin:0 0 12px 0;">${firstName}, we want your input.</p>
                <p style="color:rgba(237,230,219,0.65);font-size:14px;line-height:1.7;margin:0;">The next Contractor Circle Monthly Bootcamp is coming up. Marshall will choose one or multiple topics submitted by members for a deep dive together as a community. Log into the portal and submit the topic you want us to go deep on.</p>
              </td></tr>
              <tr><td style="background-color:#111318;padding:0 32px 28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(184,69,28,0.08);border:1px solid rgba(184,69,28,0.2);border-radius:12px;padding:20px;"><tr><td style="padding:20px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px 0;font-weight:700;">What to Expect</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:6px 0;color:rgba(237,230,219,0.7);font-size:14px;line-height:1.5;"><span style="color:#B8451C;font-weight:700;margin-right:8px;">&#9632;</span> 90+ minutes — a deep dive, not a surface skim</td></tr>
                    <tr><td style="padding:6px 0;color:rgba(237,230,219,0.7);font-size:14px;line-height:1.5;"><span style="color:#B8451C;font-weight:700;margin-right:8px;">&#9632;</span> Audience participation expected — come ready to engage</td></tr>
                    <tr><td style="padding:6px 0;color:rgba(237,230,219,0.7);font-size:14px;line-height:1.5;"><span style="color:#B8451C;font-weight:700;margin-right:8px;">&#9632;</span> Be prepared: water, coffee, pen and paper</td></tr>
                    <tr><td style="padding:6px 0;color:rgba(237,230,219,0.7);font-size:14px;line-height:1.5;"><span style="color:#B8451C;font-weight:700;margin-right:8px;">&#9632;</span> Your topic could be the one we go deep on</td></tr>
                  </table>
                </td></tr></table>
              </td></tr>
              <tr><td style="background-color:#111318;padding:0 32px 16px 32px;text-align:center;">
                <a href="${PORTAL_URL}" style="display:inline-block;background:#B8451C;color:#FFFFFF;text-decoration:none;padding:18px 48px;border-radius:8px;font-size:16px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">Submit Your Topic</a>
              </td></tr>
              <tr><td style="background-color:#111318;padding:0 32px 8px 32px;text-align:center;"><p style="color:rgba(237,230,219,0.35);font-size:11px;margin:0;">Log in → Dashboard → Monthly Bootcamp</p></td></tr>
              <tr><td style="background-color:#111318;padding:20px 32px 28px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
                  <p style="color:rgba(237,230,219,0.4);font-size:10px;letter-spacing:2px;text-transform:uppercase;margin:0 0 14px 0;font-weight:600;">How It Works</p>
                </td></tr><tr><td>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                    <td width="25%" style="text-align:center;padding:8px 4px;"><div style="width:32px;height:32px;border-radius:50%;background-color:rgba(184,69,28,0.15);color:#D4915C;font-size:14px;font-weight:800;line-height:32px;margin:0 auto 8px auto;">1</div><p style="color:rgba(237,230,219,0.6);font-size:11px;line-height:1.4;margin:0;">Submit your topic</p></td>
                    <td width="25%" style="text-align:center;padding:8px 4px;"><div style="width:32px;height:32px;border-radius:50%;background-color:rgba(184,69,28,0.15);color:#D4915C;font-size:14px;font-weight:800;line-height:32px;margin:0 auto 8px auto;">2</div><p style="color:rgba(237,230,219,0.6);font-size:11px;line-height:1.4;margin:0;">Tell us why it matters</p></td>
                    <td width="25%" style="text-align:center;padding:8px 4px;"><div style="width:32px;height:32px;border-radius:50%;background-color:rgba(184,69,28,0.15);color:#D4915C;font-size:14px;font-weight:800;line-height:32px;margin:0 auto 8px auto;">3</div><p style="color:rgba(237,230,219,0.6);font-size:11px;line-height:1.4;margin:0;">Marshall picks the agenda</p></td>
                    <td width="25%" style="text-align:center;padding:8px 4px;"><div style="width:32px;height:32px;border-radius:50%;background-color:rgba(184,69,28,0.15);color:#D4915C;font-size:14px;font-weight:800;line-height:32px;margin:0 auto 8px auto;">4</div><p style="color:rgba(237,230,219,0.6);font-size:11px;line-height:1.4;margin:0;">Show up ready to work</p></td>
                  </tr></table>
                </td></tr></table>
              </td></tr>
              <tr><td style="background-color:#111318;padding:0 32px 32px 32px;text-align:center;">
                <p style="color:rgba(237,230,219,0.5);font-size:13px;line-height:1.6;margin:0 0 8px 0;font-style:italic;">"This is your community. The bootcamp is built around what you need right now. Don't sit on the sidelines."</p>
                <p style="color:#D4915C;font-size:13px;font-weight:700;margin:0;">— Marshall</p>
              </td></tr>
              <tr><td style="height:4px;background:linear-gradient(90deg,#B8451C,#D4915C,#C9A96E,#D4915C,#B8451C);"></td></tr>
            </table>
          </td></tr>
          <tr><td style="height:28px;"></td></tr>
          <tr><td align="center" style="color:rgba(237,230,219,0.25);font-size:11px;line-height:1.6;">
            <p style="margin:0;">Altitude Logic Pressure</p>
            <p style="margin:4px 0 0 0;"><a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.4);text-decoration:none;">Instagram</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.4);text-decoration:none;">Website</a>&nbsp;&nbsp;·&nbsp;&nbsp;<a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.4);text-decoration:none;">Member Portal</a></p>
          </td></tr>
          <tr><td style="height:32px;"></td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildBootcampText(name) {
  const firstName = name.split(" ")[0];
  return `CONTRACTOR CIRCLE — MONTHLY BOOTCAMP\n\n${firstName}, we want your input.\n\nThe next Contractor Circle Monthly Bootcamp is coming up.\n\nSaturday, April 26 at 5 PM Eastern\n\nMarshall will choose one or multiple topics submitted by members for a deep dive together as a community.\n\n✓ 90+ minutes — a deep dive, not a surface skim\n✓ Audience participation expected — come ready to engage\n✓ Be prepared: water, coffee, pen and paper\n✓ Your topic could be the one we go deep on\n\n→ Submit Your Topic: https://app.alpcontractorcircle.com/login\n  Log in → Dashboard → Monthly Bootcamp\n\nThis is your community. The bootcamp is built around what you need right now. Don't sit on the sidelines — submit your topic and let's get to work.\n\n— Marshall`;
}
