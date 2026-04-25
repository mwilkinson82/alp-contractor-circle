import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>";

const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#1a1a1a;">

<!-- Logo / Header -->
<tr><td style="text-align:center;padding:0 0 24px 0;">
  <span style="font-size:28px;font-weight:800;color:#e8dcc8;letter-spacing:-0.5px;">ALP</span>
  <span style="color:#555;font-size:14px;margin-left:8px;">Contractor Circle</span>
</td></tr>

<!-- Divider -->
<tr><td style="padding:0 0 32px 0;">
  <div style="width:40px;height:3px;background:#c97a3a;margin:0 auto;border-radius:2px;"></div>
</td></tr>

<!-- Main Content -->
<tr><td style="color:#e8dcc8;font-size:16px;line-height:1.7;">

<p style="margin:0 0 20px 0;">Hey Dan,</p>

<p style="margin:0 0 20px 0;">Quick heads up — your monthly Contractor Circle payment of <strong style="color:#c97a3a;">$497.00</strong> on April 25th didn't go through. Your card on file was declined.</p>

<p style="margin:0 0 20px 0;">No stress — this happens. You can update your payment details through Stripe's customer portal and it'll retry automatically:</p>

<!-- CTA Button -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
<tr><td align="center">
  <a href="https://alpcontractorcircle.com/portal/account" 
     style="display:inline-block;padding:14px 36px;background:#c97a3a;color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:8px;letter-spacing:0.3px;">
    Update Payment Details
  </a>
</td></tr>
</table>

<p style="margin:0 0 20px 0;">If you have any questions or need help, just reply to this email and I'll get back to you.</p>

<p style="margin:0 0 4px 0;">Talk soon,</p>
<p style="margin:0;font-weight:700;color:#c97a3a;">Marshall</p>

</td></tr>

<!-- Footer Divider -->
<tr><td style="padding:40px 0 0 0;">
  <div style="width:100%;height:1px;background:#333;"></div>
</td></tr>

<!-- Footer -->
<tr><td style="padding:20px 0 0 0;text-align:center;">
  <p style="margin:0;color:#666;font-size:12px;">The Contractor Circle — ALP</p>
  <p style="margin:8px 0 0 0;color:#555;font-size:11px;">You're receiving this because you're a member of The Contractor Circle.</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

async function main() {
  const result = await resend.emails.send({
    from: FROM,
    to: "marshall@marshallwilkinson.com",
    subject: "PREVIEW — Failed Payment Email for Dan Billingsley (Review Before Sending)",
    html,
  });
  console.log("Preview sent:", result);
}

main().catch(console.error);
