import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f7f5f2;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f5f2;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<tr><td style="height:3px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
<tr><td style="height:32px;"></td></tr>

<tr><td style="background-color:#ffffff;border-radius:12px;padding:40px 36px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">

<p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;color:#1a1a1a;margin:0 0 20px 0;">
Hey Jake,
</p>

<p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;color:#1a1a1a;margin:0 0 20px 0;">
Welcome aboard. Glad to have you in the Contractor Circle.
</p>

<p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;color:#1a1a1a;margin:0 0 20px 0;">
Quick ask — when you get a minute, hop into the Discord and drop a quick intro in the <strong>#introduce-yourself</strong> channel. Just your name, what kind of work you do, where you're based, and what you're looking to get out of this. Doesn't have to be fancy.
</p>

<p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;color:#1a1a1a;margin:0 0 20px 0;">
It helps the other guys know who you are, and it's how we start building the network around you.
</p>

<p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;color:#1a1a1a;margin:0 0 20px 0;">
Here's the invite link if you haven't joined yet:<br/>
<a href="https://discord.gg/2pagscG2Np" style="color:#D4915C;text-decoration:underline;">Join the Contractor Circle Discord</a>
</p>

<p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.8;color:#1a1a1a;margin:0 0 4px 0;">
Talk soon,
</p>

<div style="border-top:1px solid #e8e4df;margin-top:24px;padding-top:20px;">
<p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;color:#1a1a1a;margin:0;font-weight:600;">Marshall</p>
<p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#8a8580;margin:4px 0 0 0;">Founder & CEO, ALP</p>
</div>

</td></tr>

<tr><td style="height:24px;"></td></tr>
<tr><td align="center" style="font-family:Georgia,serif;font-size:11px;color:#b0aaa4;letter-spacing:2px;text-transform:uppercase;">ALP</td></tr>
<tr><td style="height:32px;"></td></tr>

</table>
</td></tr>
</table>
</body></html>`;

const text = `Hey Jake,

Welcome aboard. Glad to have you in the Contractor Circle.

Quick ask — when you get a minute, hop into the Discord and drop a quick intro in the #introduce-yourself channel. Just your name, what kind of work you do, where you're based, and what you're looking to get out of this. Doesn't have to be fancy.

It helps the other guys know who you are, and it's how we start building the network around you.

Here's the invite link if you haven't joined yet:
https://discord.gg/2pagscG2Np

Talk soon,
Marshall
Founder & CEO, ALP`;

const { data, error } = await resend.emails.send({
  from: "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>",
  to: "jake@nciconstruction.com",
  subject: "Jake — hop into the Discord when you get a sec",
  html,
  text,
});

if (error) {
  console.log("FAILED:", error.message);
} else {
  console.log("SENT to jake@nciconstruction.com — id:", data?.id);
}
