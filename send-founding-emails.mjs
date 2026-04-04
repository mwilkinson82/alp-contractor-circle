/**
 * Send welcome emails to all 4 founding members.
 * Run with: node send-founding-emails.mjs
 */
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
if (!resendApiKey) {
  console.error("RESEND_API_KEY not set");
  process.exit(1);
}

const resend = new Resend(resendApiKey);
const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const PORTAL_URL = "https://alpcontractorcircle.com/portal";
const DISCORD_INVITE = "https://discord.gg/jnwDPTY6D3";
const ZOOM_URL = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";

const GOOGLE_CALENDAR_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE" +
  "&text=The+Contractor+Circle+%E2%80%94+Bi-Weekly+Call+with+Marshall" +
  "&details=Bi-weekly+group+call+with+Marshall+Wilkinson.+Join+here%3A+" + encodeURIComponent(ZOOM_URL) +
  "&location=" + encodeURIComponent(ZOOM_URL) +
  "&recur=RRULE:FREQ%3DWEEKLY%3BINTERVAL%3D2%3BBYDAY%3DSU" +
  "&dates=20250330T210000Z/20250330T223000Z";

const APPLE_CALENDAR_URL = "https://alpcontractorcircle.com/api/calendar/circle-biweekly.ics";

const OUTLOOK_CALENDAR_URL =
  "https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent" +
  "&subject=The+Contractor+Circle+%E2%80%94+Bi-Weekly+Call+with+Marshall" +
  "&body=" + encodeURIComponent("Bi-weekly Sunday group call with Marshall Wilkinson.\n\nJoin Zoom: " + ZOOM_URL) +
  "&location=" + encodeURIComponent(ZOOM_URL) +
  "&startdt=2025-03-30T21:00:00Z&enddt=2025-03-30T22:30:00Z";

const BASE_STYLES = `background-color:#08090D;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;`;

function buildWelcomeEmailHtml(name) {
  const firstName = name.split(" ")[0] || "there";
  return `<!DOCTYPE html>
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
</html>`;
}

function buildFoundingMemberEmailHtml(name) {
  const firstName = name.split(" ")[0] || "there";
  return `<!DOCTYPE html>
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
</html>`;
}

const FOUNDING_MEMBERS = [
  { name: "AJ Hoover", email: "ajhoover@mac.com" },
  { name: "Ronnie Silva", email: "office@sageconstructiondevelopment.com" },
  { name: "Nathan Oliveira", email: "nathan@olivetreebuilds.ca" },
  { name: "Dan Del Monte", email: "dan@delmontebuilders.com" },
];

async function sendEmails() {
  console.log("Sending welcome emails to all 4 founding members...\n");

  for (const member of FOUNDING_MEMBERS) {
    // Email #1: Welcome / Getting Started
    try {
      const welcomeHtml = buildWelcomeEmailHtml(member.name);
      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: member.email,
        subject: "Welcome to The Contractor Circle — Here's How to Get Started",
        html: welcomeHtml,
        text: `Welcome to The Circle, ${member.name.split(" ")[0]}! Access your member portal at ${PORTAL_URL}. Join Discord: ${DISCORD_INVITE}. Bi-weekly calls every Sunday at 5 PM ET via Zoom: ${ZOOM_URL}`,
      });

      if (error) {
        console.error(`❌ Welcome email to ${member.name} (${member.email}) FAILED:`, error);
      } else {
        console.log(`✅ Welcome email sent to ${member.name} (${member.email}) — ID: ${data?.id}`);
      }
    } catch (err) {
      console.error(`❌ Welcome email to ${member.name} ERROR:`, err.message);
    }

    // Small delay between emails
    await new Promise(r => setTimeout(r, 1000));

    // Email #2: Founding Member
    try {
      const foundingHtml = buildFoundingMemberEmailHtml(member.name);
      const { data, error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: member.email,
        subject: "You're a Founding Member of The Contractor Circle — What That Means",
        html: foundingHtml,
        text: `${member.name.split(" ")[0]}, you're one of the first. That means something. Your founding member rate is locked forever. Access your portal: ${PORTAL_URL}`,
      });

      if (error) {
        console.error(`❌ Founding member email to ${member.name} (${member.email}) FAILED:`, error);
      } else {
        console.log(`✅ Founding member email sent to ${member.name} (${member.email}) — ID: ${data?.id}`);
      }
    } catch (err) {
      console.error(`❌ Founding member email to ${member.name} ERROR:`, err.message);
    }

    // Delay between members
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\nDone! All emails sent.");
}

sendEmails();
