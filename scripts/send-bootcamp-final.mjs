import { Resend } from "resend";
import mysql from "mysql2/promise";

const resend = new Resend(process.env.RESEND_API_KEY);

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/favicon-192x192_f43344e4.png";
const PORTAL_URL = "https://app.alpcontractorcircle.com/login";
const TEMPLATES_URL = "https://app.alpcontractorcircle.com/login";
const DISCORD_INVITE = "https://discord.gg/rsK5HZcF";

const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const SUBJECT = "Bootcamp This Sunday — Here's the Agenda";

function buildHtml(firstName) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body,table,td{margin:0;padding:0;}
  body{background-color:#08090D;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;}
  a{text-decoration:none;}
</style>
</head>
<body style="margin:0;padding:0;background-color:#08090D;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Gold accent bar -->
  <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>

  <!-- Logo -->
  <tr><td align="center" style="padding:32px 0 16px 0;">
    <img src="${LOGO_URL}" alt="ALP Contractor Circle" width="48" height="48" style="display:block;width:48px;height:48px;border-radius:12px;" />
  </td></tr>

  <!-- Header -->
  <tr><td align="center" style="padding:0 24px 8px 24px;">
    <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">The Contractor Circle</span>
  </td></tr>
  <tr><td align="center" style="color:#EDE6DB;font-size:28px;font-weight:700;line-height:1.2;padding:0 24px 8px 24px;">
    Sunday Bootcamp — Here's the Agenda
  </td></tr>
  <tr><td align="center" style="padding:8px 24px 32px 24px;">
    <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div>
  </td></tr>

  <!-- Body -->
  <tr><td style="background-color:#0F1117;border-radius:16px;padding:32px 28px;">

    <p style="color:#A8A29E;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
      Quick reminder — <strong style="color:#EDE6DB;">Sunday is the Bootcamp.</strong> Come with water, coffee, and whatever keeps you locked in. We're going to squeeze the most out of this one.
    </p>

    <!-- Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,145,92,0.3),transparent);"></td></tr>
    </table>

    <!-- Agenda Section -->
    <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin:0 0 16px 0;">Agenda</p>

    <!-- Item 1 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="36" valign="top" style="padding-top:2px;">
          <div style="width:28px;height:28px;border-radius:8px;background:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);text-align:center;line-height:28px;color:#D4915C;font-size:13px;font-weight:700;">1</div>
        </td>
        <td style="padding-left:12px;">
          <p style="color:#EDE6DB;font-size:16px;font-weight:600;margin:0 0 4px 0;">EOS Deliverables Review</p>
          <p style="color:#A8A29E;font-size:14px;line-height:1.6;margin:0;">We're starting with a check-in on the deliverables from the last Contractor Circle call. Everyone should have their EOS work done. Come ready to share where you're at.</p>
        </td>
      </tr>
    </table>

    <!-- Item 2 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td width="36" valign="top" style="padding-top:2px;">
          <div style="width:28px;height:28px;border-radius:8px;background:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);text-align:center;line-height:28px;color:#D4915C;font-size:13px;font-weight:700;">2</div>
        </td>
        <td style="padding-left:12px;">
          <p style="color:#EDE6DB;font-size:16px;font-weight:600;margin:0 0 4px 0;">The Three Critical Silos: Attention, People & Process</p>
          <p style="color:#A8A29E;font-size:14px;line-height:1.6;margin:0;">We're going deeper into the fundamental silos that make or break your business. These aren't optional — they're the infrastructure underneath everything else you're building.</p>
        </td>
      </tr>
    </table>

    <!-- Item 3 -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td width="36" valign="top" style="padding-top:2px;">
          <div style="width:28px;height:28px;border-radius:8px;background:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);text-align:center;line-height:28px;color:#D4915C;font-size:13px;font-weight:700;">3</div>
        </td>
        <td style="padding-left:12px;">
          <p style="color:#EDE6DB;font-size:16px;font-weight:600;margin:0 0 4px 0;">Member-Submitted Topics</p>
          <p style="color:#A8A29E;font-size:14px;line-height:1.6;margin:0;">These came directly from the group:</p>
        </td>
      </tr>
    </table>

    <!-- Sub-topics -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="padding:12px 16px;background-color:rgba(212,145,92,0.06);border-left:2px solid rgba(212,145,92,0.4);border-radius:0 8px 8px 0;">
        <p style="color:#EDE6DB;font-size:14px;font-weight:600;margin:0 0 4px 0;">How to structure and execute cost plus contracts properly</p>
        <p style="color:#78716C;font-size:13px;margin:0;">Submitted by Dan — different people do it differently. We'll nail down the right way.</p>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>
      <tr><td style="padding:12px 16px;background-color:rgba(212,145,92,0.06);border-left:2px solid rgba(212,145,92,0.4);border-radius:0 8px 8px 0;">
        <p style="color:#EDE6DB;font-size:14px;font-weight:600;margin:0 0 4px 0;">CM Issues — Change orders not getting processed on time</p>
        <p style="color:#78716C;font-size:13px;margin:0;">Submitted by Jake — subs screaming for money while COs drag. We'll break down how to handle it.</p>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>
      <tr><td style="padding:12px 16px;background-color:rgba(212,145,92,0.06);border-left:2px solid rgba(212,145,92,0.4);border-radius:0 8px 8px 0;">
        <p style="color:#EDE6DB;font-size:14px;font-weight:600;margin:0 0 4px 0;">Transition between subcontractors' work</p>
        <p style="color:#78716C;font-size:13px;margin:0;">Submitted by Jake — what the GC needs to be doing at every handoff point.</p>
      </td></tr>
    </table>

    <p style="color:#78716C;font-size:13px;font-style:italic;margin:0 0 8px 0;">
      If time allows, we may also get into SOVs, transitioning to development, and subcontractor financials.
    </p>

    <!-- Divider -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr><td style="height:1px;background:linear-gradient(90deg,transparent,rgba(212,145,92,0.3),transparent);"></td></tr>
    </table>

    <!-- Discord Reminder - BIGGER -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td style="background:rgba(212,145,92,0.1);border:1px solid rgba(212,145,92,0.25);border-radius:12px;padding:24px;">
        <p style="color:#D4915C;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin:0 0 8px 0;">⚡ Important — Join Discord</p>
        <p style="color:#EDE6DB;font-size:15px;line-height:1.7;margin:0 0 16px 0;">
          There are a few members who haven't joined the Discord yet or introduced themselves to the group. <strong>We want to meet you.</strong> We want you to get the most out of this opportunity. If you haven't already — get in there and introduce yourself. That's where the real-time conversations happen between calls.
        </p>
        <a href="${DISCORD_INVITE}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:700;">Join the Discord →</a>
      </td></tr>
    </table>

    <!-- Template Library Reminder -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr><td style="background:rgba(212,145,92,0.06);border:1px solid rgba(212,145,92,0.15);border-radius:12px;padding:20px 24px;">
        <p style="color:#D4915C;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;margin:0 0 8px 0;">📋 Template Library — Updated Weekly</p>
        <p style="color:#A8A29E;font-size:14px;line-height:1.7;margin:0 0 16px 0;">
          The portal template library is updated weekly with detailed, high-level resources — frameworks, checklists, playbooks, scripts. That's what you're here to get. Log in and take advantage of everything in there.
        </p>
        <a href="${TEMPLATES_URL}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;">Browse Templates →</a>
      </td></tr>
    </table>

  </td></tr>

  <!-- Closing -->
  <tr><td style="padding:32px 24px 16px 24px;">
    <p style="color:#A8A29E;font-size:15px;line-height:1.7;margin:0 0 4px 0;">Looking forward to seeing everybody Sunday. Let's get after it.</p>
    <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0;">— Marshall</p>
  </td></tr>

  <!-- Footer -->
  <tr><td align="center" style="padding:24px 0 0 0;">
    <div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,rgba(212,145,92,0.3),transparent);margin-bottom:16px;"></div>
    <p style="color:#57534E;font-size:12px;margin:0;">The Contractor Circle by ALP</p>
    <p style="color:#57534E;font-size:11px;margin:4px 0 0 0;">You're receiving this because you're a member of The Contractor Circle.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;
}

function buildText(firstName) {
  return `Bootcamp This Sunday — Here's the Agenda

Quick reminder — Sunday is the Bootcamp. Come with water, coffee, and whatever keeps you locked in. We're going to squeeze the most out of this one.

AGENDA:

1. EOS Deliverables Review
We're starting with a check-in on the deliverables from the last Contractor Circle call. Everyone should have their EOS work done. Come ready to share where you're at.

2. The Three Critical Silos: Attention, People & Process
We're going deeper into the fundamental silos that make or break your business. These aren't optional — they're the infrastructure underneath everything else you're building.

3. Member-Submitted Topics
These came directly from the group:

- How to structure and execute cost plus contracts properly (Dan)
- CM Issues — Change orders not getting processed on time (Jake)
- Transition between subcontractors' work (Jake)

If time allows, we may also get into SOVs, transitioning to development, and subcontractor financials.

---

JOIN DISCORD: There are a few members who haven't joined the Discord yet or introduced themselves. We want to meet you. We want you to get the most out of this opportunity. Get in there and introduce yourself: https://discord.gg/rsK5HZcF

TEMPLATE LIBRARY: Updated weekly with detailed, high-level resources. Log into the portal and take advantage of everything in there: https://app.alpcontractorcircle.com/login

---

Looking forward to seeing everybody Sunday. Let's get after it.

— Marshall
`;
}

async function main() {
  // Get active members from database
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [members] = await conn.execute(
    "SELECT id, email, discordDisplayName, discordUsername FROM members WHERE email IS NOT NULL AND email != '' AND subscriptionStatus IN ('active', 'trialing')"
  );
  await conn.end();

  console.log(`Sending Bootcamp email to ${members.length} active members...`);

  let sent = 0;
  let failed = 0;

  for (const member of members) {
    const firstName = (member.discordDisplayName || member.discordUsername || "").split(" ")[0] || "there";
    try {
      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: member.email,
        subject: SUBJECT,
        html: buildHtml(firstName),
        text: buildText(firstName),
      });

      if (error) {
        console.error(`FAILED: ${member.email} — ${error.message}`);
        failed++;
      } else {
        console.log(`SENT: ${member.email} (${firstName}) — id: ${data?.id}`);
        sent++;
      }

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`ERROR: ${member.email} — ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${sent} sent, ${failed} failed out of ${members.length} members`);
}

main().catch(e => { console.error(e); process.exit(1); });
