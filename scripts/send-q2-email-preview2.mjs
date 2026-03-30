import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const PDF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Q1_Q2_Framework_ALP_Contractor_Circle_8578e990.pdf";

async function main() {
  try {
    const result = await resend.emails.send({
      from: 'Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>',
      to: 'marshall@marshallwilkinson.com',
      subject: '[PREVIEW] Your Q1→Q2 Framework Is Ready',
      html: buildHtml('Marshall'),
      text: `Marshall, here's your Q1→Q2 Framework.\n\nDownload it here: ${PDF_URL}\n\n— Marshall Wilkinson\nALP Contractor Circle`,
    });
    console.log('Full result:', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', JSON.stringify(err, null, 2));
    console.error('Message:', err.message);
  }
}

function buildHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#08090D;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="height:4px;background:linear-gradient(90deg,#8B5E34,#C4813B,#D4A574);border-radius:4px 4px 0 0;"></td></tr>
<tr><td style="background-color:#0F1117;padding:40px 32px 32px;border-radius:0 0 12px 12px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:24px;">
<span style="display:inline-block;padding:6px 16px;border-radius:20px;background-color:rgba(196,129,59,0.12);border:1px solid rgba(196,129,59,0.25);color:#C4813B;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;">YOUR FRAMEWORK IS READY</span>
</td></tr></table>
<h1 style="color:#F5F0E8;font-size:26px;font-weight:700;text-align:center;margin:0 0 16px;line-height:1.3;">${firstName}, here's your<br>Q1&#8594;Q2 Framework.</h1>
<p style="color:#9B9A97;font-size:15px;text-align:center;line-height:1.6;margin:0 0 28px;">The 6-page playbook built from $2.5B+ in construction experience. Review your Q1 data, decide what to kill, double, and fix &#8212; then execute.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:32px;">
<a href="${PDF_URL}" target="_blank" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#C4813B,#8B5E34);color:#08090D;font-size:15px;font-weight:700;text-decoration:none;border-radius:12px;letter-spacing:0.5px;">Download the Framework</a>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background-color:rgba(196,129,59,0.12);"></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;"><tr><td>
<p style="color:#C4813B;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">WHAT'S INSIDE</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:6px 0;color:#9B9A97;font-size:14px;line-height:1.5;"><span style="color:#C4813B;font-weight:600;">01</span>&nbsp;&nbsp;Q1 Audit &#8212; Revenue, margins, pipeline, capacity</td></tr>
<tr><td style="padding:6px 0;color:#9B9A97;font-size:14px;line-height:1.5;"><span style="color:#C4813B;font-weight:600;">02</span>&nbsp;&nbsp;Kill / Double / Fix &#8212; The decision framework</td></tr>
<tr><td style="padding:6px 0;color:#9B9A97;font-size:14px;line-height:1.5;"><span style="color:#C4813B;font-weight:600;">03</span>&nbsp;&nbsp;Q2 Commitment Page &#8212; Your 90-day execution plan</td></tr>
</table>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="height:1px;background-color:rgba(196,129,59,0.12);"></td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr><td style="padding:20px;background-color:rgba(196,129,59,0.06);border:1px solid rgba(196,129,59,0.12);border-radius:12px;">
<p style="color:#F5F0E8;font-size:15px;font-weight:600;margin:0 0 8px;text-align:center;">Want more frameworks like this?</p>
<p style="color:#9B9A97;font-size:13px;text-align:center;line-height:1.5;margin:0 0 16px;">The Contractor Circle gives you live coaching, battle-tested templates, and a network of operators building real businesses.</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<a href="https://alpcontractorcircle.com" target="_blank" style="display:inline-block;padding:10px 24px;border:1px solid rgba(196,129,59,0.3);border-radius:10px;color:#C4813B;font-size:13px;font-weight:600;text-decoration:none;">Explore The Contractor Circle &#8594;</a>
</td></tr></table>
</td></tr></table>
</td></tr>
<tr><td style="padding:24px 32px;text-align:center;">
<p style="color:#9B9A97;font-size:12px;margin:0 0 4px;"><span style="color:#C4813B;font-weight:700;">ALP</span>&nbsp;&nbsp;|&nbsp;&nbsp;Contractor Circle</p>
<p style="color:#555;font-size:11px;margin:0;">&copy; 2026 ALP. All rights reserved.</p>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

main();
