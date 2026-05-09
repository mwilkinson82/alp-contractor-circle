import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function buildCallReminderHtml(firstName) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;color:#f5f0e8;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c4783e;">Contractor Circle</span>
    </div>

    <!-- Main Card -->
    <div style="background:linear-gradient(135deg,rgba(196,120,62,0.08),transparent);border:1px solid rgba(196,120,62,0.2);border-radius:16px;padding:32px;margin-bottom:24px;">
      <h1 style="font-size:24px;font-weight:700;color:#f5f0e8;margin:0 0 16px;line-height:1.3;">Tomorrow's Call — Special Guest + New Tools Live</h1>
      
      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 24px;">Hey ${firstName},</p>
      
      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 24px;">Quick reminder — tomorrow is our Contractor Circle live call.</p>

      <!-- Special Guest Section -->
      <div style="background:rgba(196,120,62,0.12);border:1px solid rgba(196,120,62,0.3);border-radius:12px;padding:24px;margin-bottom:24px;">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c4783e;margin:0 0 12px;">Special Guest Speaker</p>
        <p style="font-size:16px;color:#f5f0e8;line-height:1.7;margin:0;">We have a senior partner from <strong style="color:#c4783e;">ICV Partners</strong> joining us. ICV is a hedge fund actively acquiring contracting companies. He's going to break down what they look for, how they value businesses, and what it means for contractors thinking about scale, exit, or positioning their company for acquisition.</p>
        <p style="font-size:15px;color:rgba(245,240,232,0.7);line-height:1.6;margin:16px 0 0;font-style:italic;">This is a rare, direct conversation with the buy side — don't miss it.</p>
      </div>

      <!-- ConstructLine 2.0 Section -->
      <div style="margin-bottom:24px;">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c4783e;margin:0 0 12px;">ConstructLine 2.0 Is Live</p>
        <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 12px;">Both tools are online in the portal right now:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;font-size:15px;color:#f5f0e8;"><strong style="color:#c4783e;">Basis</strong> — Estimating and bid desk</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:15px;color:#f5f0e8;"><strong style="color:#c4783e;">Baseline</strong> — CPM scheduling (P6-style, in the browser)</td>
          </tr>
        </table>
      </div>

      <!-- ALP OS Section -->
      <div style="margin-bottom:24px;">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c4783e;margin:0 0 12px;">ALP Operating System Is Live</p>
        <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 16px;">The ALP OS is now open to all Contractor Circle members. It's a paint-by-numbers system for building and running your company:</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:15px;color:rgba(245,240,232,0.85);">&#x2022; Your Vision (V/TO)</td></tr>
          <tr><td style="padding:6px 0;font-size:15px;color:rgba(245,240,232,0.85);">&#x2022; Accountability Chart</td></tr>
          <tr><td style="padding:6px 0;font-size:15px;color:rgba(245,240,232,0.85);">&#x2022; Rocks (quarterly priorities)</td></tr>
          <tr><td style="padding:6px 0;font-size:15px;color:rgba(245,240,232,0.85);">&#x2022; Issues list</td></tr>
          <tr><td style="padding:6px 0;font-size:15px;color:rgba(245,240,232,0.85);">&#x2022; To-Dos</td></tr>
          <tr><td style="padding:6px 0;font-size:15px;color:rgba(245,240,232,0.85);">&#x2022; How to run the L10 weekly meeting</td></tr>
        </table>
        <p style="font-size:15px;color:rgba(245,240,232,0.7);line-height:1.6;margin:16px 0 0;">Structure, rhythm, and accountability — all in one place. Open it from your dashboard.</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0 16px;">
        <a href="https://alpcontractorcircle.com" style="display:inline-block;background:linear-gradient(135deg,#c4783e,#a0622f);color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Open the Portal</a>
      </div>

      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:24px 0 0;">See you tomorrow.</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(196,120,62,0.15);">
      <p style="font-size:12px;color:rgba(245,240,232,0.3);margin:0;">ALP Contractor Circle</p>
    </div>
  </div>
</body>
</html>`;
}

async function sendTestEmail() {
  const to = process.argv[2] || "marshall@marshallwilkinson.com";
  const firstName = process.argv[3] || "Marshall";

  console.log(`Sending test email to ${to}...`);

  const { data, error } = await resend.emails.send({
    from: "ALP Contractor Circle <notifications@notifications.marshallwilkinson.com>",
    to,
    subject: "Tomorrow's Call — Special Guest + New Tools Live in the Portal",
    html: buildCallReminderHtml(firstName),
  });

  if (error) {
    console.error("Failed:", error);
    process.exit(1);
  }

  console.log(`Sent! ID: ${data.id}`);
}

sendTestEmail();
