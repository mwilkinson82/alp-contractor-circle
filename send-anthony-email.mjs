import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const emailHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0e27; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #0f1428; border: 1px solid rgba(229, 124, 62, 0.15); border-radius: 12px; padding: 40px; color: #e8e4d9;">
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid rgba(229, 124, 62, 0.1); padding-bottom: 20px;">
      <div style="font-size: 14px; font-weight: 600; color: #e57c3e; letter-spacing: 0.1em; text-transform: uppercase;">ALP Team</div>
    </div>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">Anthony,</p>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">Hope you're doing well and that business is moving in the right direction.</p>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">We wanted to reach out personally regarding your Power Hour access. You originally purchased a one-month package back on January 28th, which meant your access was set to end on February 28th.</p>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">Marshall asked us to keep your access active and give you an extra free month &mdash; no charge &mdash; because of the relationship you two have built. We were happy to do it.</p>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">That said, we do want to let you know that by <span style="color: #e57c3e; font-weight: 600;">March 28th</span>, your Power Hour access will officially come to a close.</p>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">We hope the additional time has been valuable and that you've been able to put what you've learned into action.</p>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">If you're looking to keep the momentum going, here are a few options:</p>
    
    <div style="background: rgba(229, 124, 62, 0.08); border: 1px solid rgba(229, 124, 62, 0.15); border-radius: 8px; padding: 20px; margin: 25px 0;">
      <div style="font-size: 14px; font-weight: 600; color: #e57c3e; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 15px;">Renew Power Hour:</div>
      <a href="https://buy.stripe.com/7sYdRacWd9L8gMocTEeQM10" style="display: inline-block; padding: 10px 16px; background: rgba(229, 124, 62, 0.12); border: 1px solid rgba(229, 124, 62, 0.3); border-radius: 6px; color: #e57c3e; text-decoration: none; font-size: 14px; font-weight: 500; margin: 8px 0;">Power Hour &mdash; 1 Month</a><br>
      <a href="https://buy.stripe.com/8x25kE7BT5uS53Gf1MeQM11" style="display: inline-block; padding: 10px 16px; background: rgba(229, 124, 62, 0.12); border: 1px solid rgba(229, 124, 62, 0.3); border-radius: 6px; color: #e57c3e; text-decoration: none; font-size: 14px; font-weight: 500; margin: 8px 0;">Power Hour &mdash; 3 Months (Quarterly, Best Value)</a>
    </div>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">Either way, we appreciate you being part of ALP. If you have any questions or want to talk through your options, don't hesitate to reach out.</p>
    
    <p style="font-size: 15px; line-height: 1.6; color: #c9c5b8; margin: 15px 0;">Talk soon,<br><span style="color: #ffffff; font-weight: 600;">The ALP Team</span></p>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(229, 124, 62, 0.1); font-size: 13px; color: #8b8680;">
      <p>&copy; 2026 ALP. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

(async () => {
  try {
    console.log("Sending Power Hour expiration email to Anthony Lozado...");
    const response = await resend.emails.send({
      from: 'ALP Team <team@notifications.marshallwilkinson.com>',
      to: 'anthony@lozadocontracting.com',
      subject: 'Anthony — Your Power Hour Access Update',
      html: emailHTML,
    });
    
    if (response.data?.id) {
      console.log('✅ SUCCESS - Email sent to anthony@lozadocontracting.com');
      console.log(`   Email ID: ${response.data.id}`);
      console.log(`   Status: Queued for delivery`);
    } else {
      console.log('❌ Error:', response.error || 'Unknown error');
    }
  } catch (error) {
    console.error('❌ ERROR sending email:', error);
  }
})();
