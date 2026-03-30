import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn("[Email] RESEND_API_KEY not set — email features will be unavailable");
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

// ─── Constants ────────────────────────────────────────────────────────────────
const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const PORTAL_URL = "https://alpcontractorcircle.com/portal";
const DISCORD_INVITE = "https://discord.gg/jnwDPTY6D3";
const ZOOM_URL = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";

// ─── Add-to-Calendar links for recurring Sunday 5 PM ET bi-weekly meeting ────────
// First occurrence: Sunday March 29, 2026 at 5 PM ET = 21:00 UTC
// Recurring every 2 weeks on Sundays (FREQ=WEEKLY;INTERVAL=2;BYDAY=SU)
const GOOGLE_CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=The+Contractor+Circle+%E2%80%94+Bi-Weekly+Call+with+Marshall" +
  "&details=Bi-weekly+group+call+with+Marshall+Wilkinson.+Join+here%3A+" + encodeURIComponent(ZOOM_URL) +
  "&location=" + encodeURIComponent(ZOOM_URL) +
  "&recur=RRULE:FREQ%3DWEEKLY%3BINTERVAL%3D2%3BBYDAY%3DSU" +
  "&dates=20260329T210000Z/20260329T223000Z"; // Sunday 5 PM ET = 21:00 UTC

const APPLE_CALENDAR_URL =
  "https://alpcontractorcircle.com/api/calendar/circle-biweekly.ics";

const OUTLOOK_CALENDAR_URL =
  "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
  "&subject=The+Contractor+Circle+%E2%80%94+Bi-Weekly+Call+with+Marshall" +
  "&body=" + encodeURIComponent("Bi-weekly Sunday group call with Marshall Wilkinson.\n\nJoin Zoom: " + ZOOM_URL) +
  "&location=" + encodeURIComponent(ZOOM_URL) +
  "&startdt=2026-03-29T21:00:00Z&enddt=2026-03-29T22:30:00Z";

// ─── Shared email styles ──────────────────────────────────────────────────────
const BASE_STYLES = `
  background-color:#08090D;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;
`;

// ─── Welcome Email #1 — Getting Started ──────────────────────────────────────
export function buildWelcomeEmailHtml(params: { name: string }): string {
  const firstName = params.name.split(" ")[0] || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to The Contractor Circle</title>
</head>
<body style="margin:0;padding:0;${BASE_STYLES}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gradient Bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Badge -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);border-radius:50px;padding:6px 16px;">
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Founding Member</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:32px;font-weight:700;line-height:1.2;">
              Welcome to The Circle, ${firstName}.
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:16px;line-height:1.6;padding:0 20px;">
              You just made a decision that will change the trajectory of your business. Here's everything you need to get started right now.
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Primary CTA: Access Your Portal -->
          <tr>
            <td align="center">
              <a href="${PORTAL_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Access Your Member Portal →
              </a>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Create your account at alpcontractorcircle.com/portal — templates, replays, and your Zoom link are all inside.
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Step 1: Join Discord -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">💬</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Step 1</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 8px 0;">Join the Discord Community</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0 0 16px 0;">
                    This is where the magic happens. Head to the <strong style="color:#EDE6DB;">#welcome</strong> channel first — read through it, then you'll have access to <strong style="color:#EDE6DB;">#general-chat</strong> and the exclusive <strong style="color:#EDE6DB;">#circle-chat</strong> thread.
                  </p>
                  <a href="${DISCORD_INVITE}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;">
                    Join Discord →
                  </a>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Step 2: Add to Calendar (Zoom) -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">📅</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Step 2</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 8px 0;">Add the Bi-Weekly Call to Your Calendar</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0 0 16px 0;">
                    Every <strong style="color:#EDE6DB;">Sunday at 5 PM ET</strong> — group call with Marshall. Come with deals you're working, questions, or challenges. Add it now so you never miss one.
                  </p>
                  <!-- Calendar buttons -->
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="padding-right:8px;">
                      <a href="${GOOGLE_CALENDAR_URL}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;">+ Google</a>
                    </td>
                    <td style="padding-right:8px;">
                      <a href="${APPLE_CALENDAR_URL}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;">+ Apple</a>
                    </td>
                    <td>
                      <a href="${OUTLOOK_CALENDAR_URL}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:600;">+ Outlook</a>
                    </td>
                  </tr></table>
                  <p style="color:rgba(237,230,219,0.4);font-size:12px;margin:12px 0 0 0;">
                    Zoom link: <a href="${ZOOM_URL}" style="color:rgba(212,145,92,0.6);text-decoration:none;">Join Meeting</a>
                  </p>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Step 3: Access Portal -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">🚀</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Step 3</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 8px 0;">Start Executing in the Portal</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0 0 16px 0;">
                    Create your account and log in to access the full template library, past call recordings, and your Zoom link. The contractors in this room don't just learn — they execute.
                  </p>
                  <a href="${PORTAL_URL}" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;">
                    Go to Member Portal →
                  </a>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- What's Included -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(212,145,92,0.08),rgba(201,169,110,0.04));border:1px solid rgba(212,145,92,0.15);border-radius:16px;padding:24px;">
              <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px 0;font-weight:600;text-align:center;">Your Membership Includes</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px;">
                  ✓ Bi-weekly Sunday group calls with Marshall (5 PM ET)<br/>
                  ✓ Monthly deal reviews<br/>
                  ✓ Monthly bootcamp sessions<br/>
                  ✓ Complete template library<br/>
                  ✓ Private Discord community<br/>
                  ✓ Full replay library of past sessions
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Quote -->
          <tr>
            <td align="center" style="padding:0 20px;">
              <p style="color:rgba(237,230,219,0.4);font-size:14px;font-style:italic;line-height:1.6;margin:0 0 8px 0;">
                "The future is bright. The value is real. Welcome to a world where anything is possible."
              </p>
              <p style="color:#D4915C;font-size:13px;font-weight:600;margin:0;">— Marshall Wilkinson</p>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Footer -->
          <tr><td style="height:1px;background-color:rgba(255,255,255,0.06);"></td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.3);font-size:12px;line-height:1.6;">
              <p style="margin:0;">Altitude Logic Pressure</p>
              <p style="margin:4px 0 0 0;">
                <a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.5);text-decoration:none;">Instagram</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.5);text-decoration:none;">Website</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.5);text-decoration:none;">Member Portal</a>
              </p>
            </td>
          </tr>
          <tr><td style="height:40px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildWelcomeEmailText(params: { name: string }): string {
  const firstName = params.name.split(" ")[0] || "there";
  return `
FOUNDING MEMBER

Welcome to The Circle, ${firstName}.

You just made a decision that will change the trajectory of your business.

─────────────────────────────────────

ACCESS YOUR MEMBER PORTAL
Create your account and log in at: ${PORTAL_URL}
Templates, replays, and your Zoom link are all inside.

─────────────────────────────────────

STEP 1: Join the Discord Community
Head to the #welcome channel first — read through it, then you'll have access to #general-chat and the exclusive #circle-chat thread.
→ Join Discord: ${DISCORD_INVITE}

STEP 2: Add the Bi-Weekly Call to Your Calendar
Every Sunday at 5 PM ET — group call with Marshall.
→ Zoom link: ${ZOOM_URL}
→ Add to Google Calendar: ${GOOGLE_CALENDAR_URL}
→ Add to Apple Calendar: ${APPLE_CALENDAR_URL}
→ Add to Outlook: ${OUTLOOK_CALENDAR_URL}

STEP 3: Start Executing in the Portal
Browse the template library, review past call recordings, and start implementing.
→ Member Portal: ${PORTAL_URL}

─────────────────────────────────────

YOUR MEMBERSHIP INCLUDES:
✓ Bi-weekly Sunday group calls with Marshall (5 PM ET)
✓ Monthly deal reviews
✓ Monthly bootcamp sessions
✓ Complete template library
✓ Private Discord community
✓ Full replay library of past sessions

─────────────────────────────────────

"The future is bright. The value is real. Welcome to a world where anything is possible."
— Marshall Wilkinson

Altitude Logic Pressure
https://alpcontractorschool.com
  `.trim();
}

// ─── Welcome Email #2 — Founding Member Announcement ─────────────────────────
export function buildFoundingMemberEmailHtml(params: { name: string }): string {
  const firstName = params.name.split(" ")[0] || "there";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're a Founding Member — The Contractor Circle</title>
</head>
<body style="margin:0;padding:0;${BASE_STYLES}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gradient Bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Founding Member Badge -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background:linear-gradient(135deg,rgba(212,145,92,0.2),rgba(201,169,110,0.1));border:1px solid rgba(212,145,92,0.4);border-radius:50px;padding:8px 20px;">
                  <span style="color:#D4915C;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">⚡ Founding Member</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:30px;font-weight:700;line-height:1.3;padding:0 16px;">
              ${firstName}, you're one of the first.<br/>
              <span style="color:#D4915C;">That means something.</span>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Body copy -->
          <tr>
            <td style="color:rgba(237,230,219,0.75);font-size:15px;line-height:1.8;padding:0 8px;">
              <p style="margin:0 0 16px 0;">
                The Contractor Circle wasn't born in a boardroom. It was born from contractors — real ones, in the field — who kept asking the same question: <em style="color:#EDE6DB;">"Marshall, how do we get access to you and your team without the full coaching investment?"</em>
              </p>
              <p style="margin:0 0 16px 0;">
                They wanted the balance: <strong style="color:#EDE6DB;">affordability</strong> without sacrificing the depth, accuracy, and real-world execution that ALP and Marshall Wilkinson are known for. $2.5 billion in construction doesn't lie. And neither does the community we're building.
              </p>
              <p style="margin:0 0 16px 0;">
                So we built The Contractor Circle. And you got in first.
              </p>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Founding Member Benefits Box -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(212,145,92,0.1),rgba(201,169,110,0.05));border:1px solid rgba(212,145,92,0.25);border-radius:16px;padding:28px;">
              <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px 0;font-weight:600;text-align:center;">What Your Founding Member Status Means</p>

              <!-- Benefit 1 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
                <td width="32" valign="top" style="color:#D4915C;font-size:18px;padding-top:2px;">🔒</td>
                <td style="padding-left:12px;">
                  <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Price Locked. Forever.</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    You are grandfathered in at the founding rate. As the community grows and the price increases, your rate stays exactly where it is — for as long as your membership stays active.
                  </p>
                </td>
              </tr></table>

              <!-- Benefit 2 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;"><tr>
                <td width="32" valign="top" style="color:#D4915C;font-size:18px;padding-top:2px;">🎯</td>
                <td style="padding-left:12px;">
                  <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">Limited Spots. You Got One.</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    Founding membership is capped. We're not filling seats — we're building a room of serious contractors who execute. You earned your spot.
                  </p>
                </td>
              </tr></table>

              <!-- Benefit 3 -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="32" valign="top" style="color:#D4915C;font-size:18px;padding-top:2px;">🏗️</td>
                <td style="padding-left:12px;">
                  <p style="color:#EDE6DB;font-size:15px;font-weight:600;margin:0 0 4px 0;">You're Shaping What This Becomes.</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    As a founding member, your feedback, your deals, your wins and challenges directly influence how The Circle evolves. This is your community as much as it is ours.
                  </p>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Marshall direct message -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.03);border-left:3px solid #D4915C;border-radius:0 12px 12px 0;padding:20px 24px;">
              <p style="color:rgba(237,230,219,0.5);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px 0;font-weight:600;">From Marshall</p>
              <p style="color:#EDE6DB;font-size:15px;line-height:1.8;margin:0 0 12px 0;font-style:italic;">
                "I've done over $2.5 billion in construction. I've seen what separates the contractors who scale from the ones who stay stuck. It's not talent. It's access to the right information, the right community, and someone who's been in the trenches. That's what The Circle is. I'm glad you're in it."
              </p>
              <p style="color:#D4915C;font-size:13px;font-weight:600;margin:0;">— Marshall Wilkinson, Founder of ALP</p>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- CTA -->
          <tr>
            <td align="center">
              <a href="${PORTAL_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Access Your Member Portal →
              </a>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Footer -->
          <tr><td style="height:1px;background-color:rgba(255,255,255,0.06);"></td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.3);font-size:12px;line-height:1.6;">
              <p style="margin:0;">Altitude Logic Pressure</p>
              <p style="margin:4px 0 0 0;">
                <a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.5);text-decoration:none;">Instagram</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.5);text-decoration:none;">Website</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.5);text-decoration:none;">Member Portal</a>
              </p>
            </td>
          </tr>
          <tr><td style="height:40px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function buildFoundingMemberEmailText(params: { name: string }): string {
  const firstName = params.name.split(" ")[0] || "there";
  return `
⚡ FOUNDING MEMBER

${firstName}, you're one of the first. That means something.

─────────────────────────────────────

The Contractor Circle wasn't born in a boardroom. It was born from contractors — real ones, in the field — who kept asking: "Marshall, how do we get access to you and your team without the full coaching investment?"

They wanted the balance: affordability without sacrificing the depth, accuracy, and real-world execution that ALP and Marshall Wilkinson are known for. $2.5 billion in construction doesn't lie. And neither does the community we're building.

So we built The Contractor Circle. And you got in first.

─────────────────────────────────────

WHAT YOUR FOUNDING MEMBER STATUS MEANS:

🔒 Price Locked. Forever.
You are grandfathered in at the founding rate. As the community grows and the price increases, your rate stays exactly where it is — for as long as your membership stays active.

🎯 Limited Spots. You Got One.
Founding membership is capped. We're not filling seats — we're building a room of serious contractors who execute. You earned your spot.

🏗️ You're Shaping What This Becomes.
Your feedback, your deals, your wins and challenges directly influence how The Circle evolves.

─────────────────────────────────────

FROM MARSHALL:

"I've done over $2.5 billion in construction. I've seen what separates the contractors who scale from the ones who stay stuck. It's not talent. It's access to the right information, the right community, and someone who's been in the trenches. That's what The Circle is. I'm glad you're in it."
— Marshall Wilkinson, Founder of ALP

─────────────────────────────────────

Access your member portal: ${PORTAL_URL}

Altitude Logic Pressure
https://alpcontractorschool.com
  `.trim();
}

// ─── Send Welcome Email (Email #1) ────────────────────────────────────────────
export async function sendWelcomeEmail(params: {
  to: string;
  name: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping welcome email");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: "Welcome to The Contractor Circle — Here's How to Get Started",
      html: buildWelcomeEmailHtml({ name: params.name }),
      text: buildWelcomeEmailText({ name: params.name }),
    });

    if (error) {
      console.error("[Email] Failed to send welcome email:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Welcome email sent to ${params.to} — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending welcome email:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ─── Send Founding Member Email (Email #2) ────────────────────────────────────
export async function sendFoundingMemberEmail(params: {
  to: string;
  name: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping founding member email");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: "You're a Founding Member of The Contractor Circle — What That Means",
      html: buildFoundingMemberEmailHtml({ name: params.name }),
      text: buildFoundingMemberEmailText({ name: params.name }),
    });

    if (error) {
      console.error("[Email] Failed to send founding member email:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Founding member email sent to ${params.to} — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending founding member email:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ─── Question Notification Email to Marshall ─────────────────────────────────

function buildQuestionNotificationHtml(params: { memberName: string; question: string; context?: string; callCycle?: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;color:#f5f0e8;">
  <div style="max-width:600px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <span style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c4783e;">New Question Submitted</span>
    </div>
    <div style="background:linear-gradient(135deg,rgba(196,120,62,0.08),transparent);border:1px solid rgba(196,120,62,0.2);border-radius:16px;padding:32px;margin-bottom:24px;">
      <p style="font-size:14px;color:rgba(245,240,232,0.5);margin:0 0 8px;">From</p>
      <p style="font-size:18px;font-weight:700;color:#f5f0e8;margin:0 0 24px;">${params.memberName}</p>
      ${params.callCycle ? `<p style="font-size:12px;color:rgba(245,240,232,0.4);margin:0 0 16px;">Call Cycle: ${params.callCycle}</p>` : ''}
      <p style="font-size:14px;color:rgba(245,240,232,0.5);margin:0 0 8px;">Question</p>
      <p style="font-size:16px;color:#f5f0e8;line-height:1.7;margin:0 0 16px;">${params.question}</p>
      ${params.context ? `
      <p style="font-size:14px;color:rgba(245,240,232,0.5);margin:16px 0 8px;">Additional Context</p>
      <p style="font-size:14px;color:rgba(245,240,232,0.7);line-height:1.6;margin:0;">${params.context}</p>
      ` : ''}
    </div>
    <div style="text-align:center;">
      <a href="${PORTAL_URL}" style="display:inline-block;padding:12px 32px;background:#c4783e;color:#0a0a0f;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">View in Admin Panel</a>
    </div>
    <p style="text-align:center;font-size:12px;color:rgba(245,240,232,0.25);margin-top:32px;">ALP Contractor Circle · Question Notification</p>
  </div>
</body>
</html>`;
}

export async function sendQuestionNotification(params: {
  memberName: string;
  question: string;
  context?: string;
  callCycle?: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping question notification");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "marshall@marshallwilkinson.com",
      subject: `New Question from ${params.memberName} — Contractor Circle`,
      html: buildQuestionNotificationHtml(params),
      text: `New question from ${params.memberName}:\n\n${params.question}${params.context ? `\n\nContext: ${params.context}` : ''}${params.callCycle ? `\n\nCall Cycle: ${params.callCycle}` : ''}`,
    });

    if (error) {
      console.error("[Email] Failed to send question notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Question notification sent to marshall@marshallwilkinson.com — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending question notification:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ─── Purchase Notification Email to Marshall ────────────────────────────────

function buildPurchaseNotificationHtml(params: { memberName: string; memberEmail: string; amount: string; product: string; sessionId: string }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;color:#f5f0e8;">
  <div style="max-width:600px;margin:0 auto;padding:48px 24px;">
    <div style="width:60px;height:3px;background:linear-gradient(90deg,#c4783e,#d4944e);border-radius:2px;margin:0 auto 40px;"></div>
    <div style="text-align:center;margin-bottom:40px;">
      <span style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c4783e;font-weight:600;">New Purchase</span>
    </div>
    <div style="background:linear-gradient(135deg,rgba(196,120,62,0.06),rgba(196,120,62,0.02));border:1px solid rgba(196,120,62,0.18);border-radius:20px;padding:40px 32px;">
      <p style="font-size:22px;font-weight:700;color:#f5f0e8;margin:0 0 28px;line-height:1.3;">New Member Purchased!</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(196,120,62,0.1);">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Name</span><br/>
            <span style="font-size:16px;font-weight:600;color:#f5f0e8;">${params.memberName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(196,120,62,0.1);">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
            <span style="font-size:16px;color:#f5f0e8;">${params.memberEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(196,120,62,0.1);">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Amount Paid</span><br/>
            <span style="font-size:24px;font-weight:700;color:#c4783e;">${params.amount}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Product</span><br/>
            <span style="font-size:16px;font-weight:600;color:#f5f0e8;">${params.product}</span>
          </td>
        </tr>
      </table>
      <div style="width:40px;height:2px;background:linear-gradient(90deg,#c4783e,transparent);border-radius:1px;margin:24px 0;"></div>
      <p style="font-size:12px;color:rgba(245,240,232,0.3);margin:0;">Session: ${params.sessionId}</p>
    </div>
    <div style="text-align:center;margin-top:32px;">
      <a href="https://alpcontractorcircle.com/portal" style="display:inline-block;padding:12px 32px;background:#c4783e;color:#0a0a0f;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">View in Admin Panel</a>
    </div>
    <p style="text-align:center;font-size:11px;color:rgba(245,240,232,0.2);margin-top:32px;">ALP Contractor Circle &middot; Purchase Notification</p>
  </div>
</body>
</html>`;
}

export async function sendPurchaseNotification(params: {
  memberName: string;
  memberEmail: string;
  amount: string;
  product: string;
  sessionId: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping purchase notification");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "marshall@marshallwilkinson.com",
      subject: `New Purchase: ${params.memberName} — ${params.amount} (${params.product})`,
      html: buildPurchaseNotificationHtml(params),
      text: `New purchase!\n\nName: ${params.memberName}\nEmail: ${params.memberEmail}\nAmount: ${params.amount}\nProduct: ${params.product}\nSession: ${params.sessionId}`,
    });

    if (error) {
      console.error("[Email] Failed to send purchase notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Purchase notification sent to marshall@marshallwilkinson.com — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending purchase notification:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ─── New Member Signup Notification to Marshall ──────────────────────────────

function buildNewMemberSignupNotificationHtml(params: {
  memberName: string;
  memberEmail: string;
  discordUsername: string;
  signupTime: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;color:#f5f0e8;">
  <div style="max-width:600px;margin:0 auto;padding:48px 24px;">
    <div style="width:60px;height:3px;background:linear-gradient(90deg,#c4783e,#d4944e);border-radius:2px;margin:0 auto 40px;"></div>
    <div style="text-align:center;margin-bottom:40px;">
      <span style="font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#c4783e;font-weight:600;">New Member Created Account</span>
    </div>
    <div style="background:linear-gradient(135deg,rgba(196,120,62,0.06),rgba(196,120,62,0.02));border:1px solid rgba(196,120,62,0.18);border-radius:20px;padding:40px 32px;">
      <p style="font-size:22px;font-weight:700;color:#f5f0e8;margin:0 0 28px;line-height:1.3;">New Member Signup!</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(196,120,62,0.1);">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Name</span><br/>
            <span style="font-size:16px;font-weight:600;color:#f5f0e8;">${params.memberName}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(196,120,62,0.1);">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
            <span style="font-size:16px;color:#f5f0e8;">${params.memberEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid rgba(196,120,62,0.1);">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Discord Username</span><br/>
            <span style="font-size:16px;color:#f5f0e8;">${params.discordUsername}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 0;">
            <span style="font-size:12px;color:rgba(245,240,232,0.4);text-transform:uppercase;letter-spacing:1px;">Signup Time</span><br/>
            <span style="font-size:16px;color:#f5f0e8;">${params.signupTime}</span>
          </td>
        </tr>
      </table>
      <div style="width:40px;height:2px;background:linear-gradient(90deg,#c4783e,transparent);border-radius:1px;margin:24px 0;"></div>
      <p style="font-size:12px;color:rgba(245,240,232,0.3);margin:0;">Member created their account and logged in for the first time.</p>
    </div>
    <div style="text-align:center;margin-top:32px;">
      <a href="${PORTAL_URL}/subscribers" style="display:inline-block;padding:12px 32px;background:#c4783e;color:#0a0a0f;font-weight:700;font-size:14px;text-decoration:none;border-radius:8px;">View All Members</a>
    </div>
    <p style="text-align:center;font-size:11px;color:rgba(245,240,232,0.2);margin-top:32px;">ALP Contractor Circle &middot; Member Signup Notification</p>
  </div>
</body>
</html>`;
}

export async function sendNewMemberSignupNotification(params: {
  memberName: string;
  memberEmail: string;
  discordUsername: string;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping new member signup notification");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const signupTime = new Date().toLocaleString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "marshall@marshallwilkinson.com",
      subject: `New Member Created Account: ${params.memberName}`,
      html: buildNewMemberSignupNotificationHtml({
        memberName: params.memberName,
        memberEmail: params.memberEmail,
        discordUsername: params.discordUsername,
        signupTime,
      }),
      text: `New member created their account!\n\nName: ${params.memberName}\nEmail: ${params.memberEmail}\nDiscord: ${params.discordUsername}\nTime: ${signupTime}`,
    });

    if (error) {
      console.error("[Email] Failed to send new member signup notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] New member signup notification sent to marshall@marshallwilkinson.com — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending new member signup notification:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

// Export template builders for testing
export { buildWelcomeEmailHtml as default };

// ─── Email Subscriber Notification to Marshall ──────────────────────────────
export async function sendSubscriberNotification(params: {
  email: string;
  isNew: boolean;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping subscriber notification");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const subject = params.isNew 
      ? `New Email Subscriber — ${params.email}`
      : `Email Already Subscribed — ${params.email}`;

    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: "marshall@marshallwilkinson.com",
      subject,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#08090D;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:32px;"></td></tr>
          
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:24px;font-weight:700;">
              ${params.isNew ? '✓ New Subscriber' : '→ Already Subscribed'}
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>
          
          <tr>
            <td style="color:rgba(237,230,219,0.75);font-size:15px;line-height:1.8;padding:0 8px;">
              <p style="margin:0;">
                <strong style="color:#D4915C;">Email:</strong> ${params.email}
              </p>
              <p style="margin:16px 0 0 0;color:rgba(237,230,219,0.6);font-size:13px;">
                ${params.isNew 
                  ? 'This email was just added to your subscriber list from the homepage email capture form.' 
                  : 'This email was already in your subscriber list.'}
              </p>
            </td>
          </tr>
          
          <tr><td style="height:32px;"></td></tr>
          <tr><td style="height:1px;background:rgba(237,230,219,0.1);"></td></tr>
          <tr><td style="height:16px;"></td></tr>
          
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.5);font-size:12px;">
              The Contractor Circle | ALP
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `${subject}\n\nEmail: ${params.email}\n\n${params.isNew ? 'New subscriber from homepage email capture.' : 'Email was already subscribed.'}`,
    });

    if (error) {
      console.error("[Email] Failed to send subscriber notification:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Subscriber notification sent to marshall@marshallwilkinson.com — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending subscriber notification:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

// ─── EOS Inaugural Call Deck Announcement Email ─────────────────────────────

function buildEosDeckAnnouncementHtml(params: { name: string }): string {
  const firstName = params.name.split(" ")[0] || "there";
  const TEMPLATE_URL = "https://alpcontractorcircle.com/portal/templates";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Template Available — EOS for Contractors</title>
</head>
<body style="margin:0;padding:0;${BASE_STYLES}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gradient Bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Badge -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);border-radius:50px;padding:6px 16px;">
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">New Template Available</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:28px;font-weight:700;line-height:1.2;">
              ${firstName}, today's EOS deck is<br/>ready for download.
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:16px;line-height:1.6;padding:0 20px;">
              The full inaugural call presentation — <strong style="color:#EDE6DB;">EOS for Contractors</strong> — is now in the template library under <strong style="color:#D4915C;">Operations</strong>.
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Content Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td width="48" valign="top">
                  <div style="width:40px;height:40px;background-color:rgba(212,145,92,0.15);border-radius:10px;text-align:center;line-height:40px;font-size:20px;">📄</div>
                </td>
                <td style="padding-left:16px;">
                  <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 4px 0;font-weight:600;">Full Presentation Deck</p>
                  <p style="color:#EDE6DB;font-size:18px;font-weight:600;margin:0 0 12px 0;">EOS for Contractors — Inaugural Call Deck</p>
                  <p style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;margin:0;">
                    The complete EOS operating system breakdown tailored for contractors. Everything we covered today:
                  </p>
                </td>
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                <tr><td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:2;padding:0 8px 0 64px;">
                  ✓ Vision/Traction Organizer (VITO)<br/>
                  ✓ Rocks — 90-day priority setting<br/>
                  ✓ Scorecard with leading &amp; lagging indicators<br/>
                  ✓ L10 Meeting structure<br/>
                  ✓ IDS Process — Identify, Discuss, Solve<br/>
                  ✓ Core Processes &amp; People Analyzer
                </td></tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:28px;"></td></tr>

          <!-- CTA Button -->
          <tr>
            <td align="center">
              <a href="${TEMPLATE_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Download the Deck →
              </a>
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.4);font-size:12px;">
              Log in to the portal → Templates → Operations
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Closing note -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              Great call today. Download this, review it, and start implementing. The operators in this room don't just learn — they execute.
            </td>
          </tr>
          <tr><td style="height:8px;"></td></tr>
          <tr>
            <td align="center" style="color:#D4915C;font-size:14px;font-weight:600;">
              — Marshall
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Footer -->
          <tr><td style="height:1px;background-color:rgba(255,255,255,0.06);"></td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.3);font-size:12px;line-height:1.6;">
              <p style="margin:0;">Altitude Logic Pressure</p>
              <p style="margin:4px 0 0 0;">
                <a href="https://instagram.com/realmarshallwilkinson" style="color:rgba(212,145,92,0.5);text-decoration:none;">Instagram</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.5);text-decoration:none;">Website</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${PORTAL_URL}" style="color:rgba(212,145,92,0.5);text-decoration:none;">Member Portal</a>
              </p>
            </td>
          </tr>
          <tr><td style="height:40px;"></td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function buildEosDeckAnnouncementText(params: { name: string }): string {
  const firstName = params.name.split(" ")[0] || "there";
  return `
NEW TEMPLATE AVAILABLE

${firstName}, today's EOS deck is ready for download.

The full inaugural call presentation — EOS for Contractors — is now in the template library under Operations.

─────────────────────────────────────

EOS for Contractors — Inaugural Call Deck

The complete EOS operating system breakdown tailored for contractors:

✓ Vision/Traction Organizer (VITO)
✓ Rocks — 90-day priority setting
✓ Scorecard with leading & lagging indicators
✓ L10 Meeting structure
✓ IDS Process — Identify, Discuss, Solve
✓ Core Processes & People Analyzer

→ Download: https://alpcontractorcircle.com/portal/templates
  Log in to the portal → Templates → Operations

─────────────────────────────────────

Great call today. Download this, review it, and start implementing.

— Marshall

─────────────────────────────────────
Altitude Logic Pressure
Instagram: https://instagram.com/realmarshallwilkinson
Website: https://alpcontractorschool.com
Portal: https://alpcontractorcircle.com/portal
  `.trim();
}

export async function sendEosDeckAnnouncementEmail(params: {
  to: string;
  name: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping EOS deck announcement");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: "New in the Portal — EOS for Contractors Deck (Download Now)",
      html: buildEosDeckAnnouncementHtml({ name: params.name }),
      text: buildEosDeckAnnouncementText({ name: params.name }),
    });

    if (error) {
      console.error("[Email] Failed to send EOS deck announcement:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] EOS deck announcement sent to ${params.to} — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending EOS deck announcement:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}


// ─── Q2 Framework Lead Magnet Delivery Email ─────────────────────────────────
const Q2_PDF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Q1_Q2_Framework_ALP_Contractor_Circle_cead240b.pdf";

function buildQ2FrameworkEmailHtml(params: { firstName: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Q2 Framework</title>
</head>
<body style="margin:0;padding:0;${BASE_STYLES}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#08090D;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Gradient Bar -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#D4915C,#C9A96E,#D4915C);border-radius:2px;"></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Badge -->
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);border-radius:50px;padding:6px 16px;">
                  <span style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">Your Q2 Framework</span>
                </td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Headline -->
          <tr>
            <td align="center" style="color:#EDE6DB;font-size:28px;font-weight:700;line-height:1.2;">
              ${params.firstName}, here's your framework.
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>

          <!-- Subtitle -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.7);font-size:16px;line-height:1.6;padding:0 20px;">
              Q1 is your data. Q2 is your decision. This 6-page framework will help you turn first-quarter lessons into second-quarter momentum.
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Download CTA -->
          <tr>
            <td align="center">
              <a href="${Q2_PDF_URL}" style="display:inline-block;background:linear-gradient(135deg,#D4915C,#C9A96E);color:#08090D;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.5px;">
                Download the Framework →
              </a>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- What's Inside Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
              <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px 0;font-weight:600;">Inside the Framework</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#EDE6DB;font-size:14px;line-height:2;padding:0;">
                    ✓ The Q1 Audit — read your own scorecard<br/>
                    ✓ Kill, Double, Fix — three tactical moves<br/>
                    ✓ Revenue & pipeline analysis<br/>
                    ✓ Operational bottleneck diagnosis<br/>
                    ✓ The Q2 Commitment — your action plan<br/>
                    ✓ Built from $2.5B+ in construction experience
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Next Steps Card -->
          <tr>
            <td style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;">
              <p style="color:#D4915C;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:0 0 16px 0;font-weight:600;">Your Next 3 Moves</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td width="28" valign="top" style="color:#D4915C;font-size:14px;font-weight:700;">1.</td>
                      <td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:1.5;">
                        <strong style="color:#EDE6DB;">Read the framework.</strong> It's 6 pages. Takes 10 minutes.
                      </td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:12px;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td width="28" valign="top" style="color:#D4915C;font-size:14px;font-weight:700;">2.</td>
                      <td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:1.5;">
                        <strong style="color:#EDE6DB;">Fill out the Q2 Commitment page.</strong> Name what you're killing, doubling, and fixing.
                      </td>
                    </tr></table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td width="28" valign="top" style="color:#D4915C;font-size:14px;font-weight:700;">3.</td>
                      <td style="color:rgba(237,230,219,0.7);font-size:14px;line-height:1.5;">
                        <strong style="color:#EDE6DB;">Execute this week.</strong> Q2 starts Wednesday. Don't wait.
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Divider -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Contractor Circle CTA -->
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.6);font-size:14px;line-height:1.6;padding:0 20px;">
              Want more frameworks, live coaching, and a community of operators building 7- and 8-figure contracting businesses?
            </td>
          </tr>
          <tr><td style="height:16px;"></td></tr>
          <tr>
            <td align="center">
              <a href="https://alpcontractorcircle.com" style="display:inline-block;background-color:rgba(212,145,92,0.15);border:1px solid rgba(212,145,92,0.3);color:#D4915C;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">
                Explore The Contractor Circle →
              </a>
            </td>
          </tr>
          <tr><td style="height:32px;"></td></tr>

          <!-- Signature -->
          <tr><td align="center"><div style="width:60px;height:2px;background:linear-gradient(90deg,transparent,#D4915C,transparent);"></div></td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr>
            <td align="center" style="color:rgba(237,230,219,0.5);font-size:13px;line-height:1.6;">
              — Marshall Wilkinson<br/>
              <span style="color:rgba(237,230,219,0.3);font-size:12px;">Founder, ALP | $2.5B+ in Construction</span>
            </td>
          </tr>
          <tr><td style="height:24px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="border-top:1px solid rgba(255,255,255,0.05);padding-top:24px;">
              <p style="color:rgba(237,230,219,0.25);font-size:11px;margin:0;">
                Altitude Logic Pressure &middot; <a href="https://alpcontractorschool.com" style="color:rgba(212,145,92,0.4);text-decoration:none;">alpcontractorschool.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function buildQ2FrameworkEmailText(params: { firstName: string }): string {
  return `
${params.firstName}, here's your Q2 Framework.

Q1 is your data. Q2 is your decision.

Download the framework here:
${Q2_PDF_URL}

─────────────────────────────────────

Inside the Framework:

✓ The Q1 Audit — read your own scorecard
✓ Kill, Double, Fix — three tactical moves
✓ Revenue & pipeline analysis
✓ Operational bottleneck diagnosis
✓ The Q2 Commitment — your action plan
✓ Built from $2.5B+ in construction experience

─────────────────────────────────────

Your Next 3 Moves:

1. Read the framework. It's 6 pages. Takes 10 minutes.
2. Fill out the Q2 Commitment page. Name what you're killing, doubling, and fixing.
3. Execute this week. Q2 starts Wednesday. Don't wait.

─────────────────────────────────────

Want more frameworks, live coaching, and a community of operators?
→ https://alpcontractorcircle.com

— Marshall Wilkinson
Founder, ALP | $2.5B+ in Construction

─────────────────────────────────────
Altitude Logic Pressure
Website: https://alpcontractorschool.com
  `.trim();
}

export async function sendQ2FrameworkEmail(params: {
  to: string;
  firstName: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[Email] Resend not configured — skipping Q2 framework delivery");
    return { success: false, error: "Resend not configured" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject: "Your Q2 Framework — Download Inside",
      html: buildQ2FrameworkEmailHtml({ firstName: params.firstName }),
      text: buildQ2FrameworkEmailText({ firstName: params.firstName }),
    });

    if (error) {
      console.error("[Email] Failed to send Q2 framework:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Q2 framework sent to ${params.to} — id: ${data?.id}`);
    return { success: true, id: data?.id };
  } catch (err: any) {
    console.error("[Email] Unexpected error sending Q2 framework:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}
