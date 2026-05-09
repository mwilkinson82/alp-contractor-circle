import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const html = `
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
      <h1 style="font-size:26px;font-weight:700;color:#f5f0e8;margin:0 0 8px;line-height:1.3;">Tonight at 5 PM</h1>
      <p style="font-size:14px;color:#c4783e;margin:0 0 24px;letter-spacing:1px;text-transform:uppercase;">Contractor Circle Live Call</p>
      
      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:0 0 24px;">Hey — quick reminder that tonight's call is at <strong style="color:#f5f0e8;">5 PM</strong>. The link is in the portal.</p>

      <!-- Agenda -->
      <div style="background:rgba(196,120,62,0.12);border:1px solid rgba(196,120,62,0.3);border-radius:12px;padding:24px;margin-bottom:24px;">
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#c4783e;margin:0 0 16px;">Tonight's Agenda</p>
        
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;font-size:16px;color:#f5f0e8;border-bottom:1px solid rgba(196,120,62,0.15);">
              <strong>1.</strong>&nbsp; Complete the ALP Operating System walkthrough
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:16px;color:#f5f0e8;">
              <strong>2.</strong>&nbsp; Special Guest Speaker — <strong style="color:#c4783e;">Managing Partner from ICV Partners Private Equity</strong>
              <br/><span style="font-size:14px;color:rgba(245,240,232,0.7);margin-top:4px;display:inline-block;">Topic: Building Market Value as a Contractor and Exiting</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="font-size:15px;color:rgba(245,240,232,0.7);line-height:1.6;margin:0 0 24px;font-style:italic;">This is a rare opportunity to hear directly from the buy side — what private equity looks for in contracting companies, how they value them, and what it means for your exit strategy.</p>

      <!-- CTA -->
      <div style="text-align:center;margin:32px 0 16px;">
        <a href="https://alpcontractorcircle.com" style="display:inline-block;background:linear-gradient(135deg,#c4783e,#a0622f);color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">Open the Portal</a>
      </div>

      <p style="font-size:16px;color:rgba(245,240,232,0.85);line-height:1.7;margin:24px 0 0;">See you tonight.</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:24px;border-top:1px solid rgba(196,120,62,0.15);">
      <p style="font-size:12px;color:rgba(245,240,232,0.3);margin:0;">ALP Contractor Circle</p>
    </div>
  </div>
</body>
</html>`;

async function send() {
  const { data, error } = await resend.emails.send({
    from: "ALP Team <notifications@notifications.marshallwilkinson.com>",
    to: "marshall@marshallwilkinson.com",
    subject: "Tonight at 5 PM — Contractor Circle Call",
    html,
  });

  if (error) {
    console.error("FAILED:", error.message);
    process.exit(1);
  }
  console.log("SENT to marshall@marshallwilkinson.com — ID:", data.id);
}

send();
