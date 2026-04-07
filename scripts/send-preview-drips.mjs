/**
 * Send preview drip emails to Marshall — one from each sequence
 * showing the next email that would go out tomorrow.
 */
import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const TO = "marshall@marshallwilkinson.com";
const FROM = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
const CIRCLE_URL = "https://alpcontractorcircle.com";

// ─── Elevated personal email wrapper ─────────────────────────────────────────

function wrapEmail(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background-color:#f7f5f2;font-family:'Inter',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f5f2;">
    <tr>
      <td style="padding:32px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin:0 auto;">
          <!-- Subtle brand accent line -->
          <tr>
            <td style="padding-bottom:24px;">
              <div style="width:40px;height:3px;background:linear-gradient(90deg,#D4915C,#C9A96E);border-radius:2px;"></div>
            </td>
          </tr>
          <!-- Email body -->
          <tr>
            <td style="background-color:#ffffff;border-radius:8px;padding:36px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color:#2d2d2d;font-size:15px;line-height:1.8;font-family:Georgia,'Times New Roman',serif;">
${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;text-align:center;">
              <span style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:1.5px;color:#999;text-transform:uppercase;">ALP</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function p(text) {
  return `<p style="margin:0 0 18px 0;color:#2d2d2d;">${text}</p>`;
}

function sig() {
  return `<div style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e8e4df;">
    <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#2d2d2d;">Marshall</p>
  </div>`;
}

function sigFull() {
  return `<div style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e8e4df;">
    <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#2d2d2d;">Marshall Wilkinson</p>
    <p style="margin:4px 0 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:#999;letter-spacing:0.5px;">Founder &amp; CEO, ALP</p>
  </div>`;
}

function link(text, url) {
  return `<a href="${url}" style="color:#D4915C;text-decoration:none;border-bottom:1px solid rgba(212,145,92,0.3);">${text}</a>`;
}

// ─── The 4 preview emails (next email in each sequence) ──────────────────────

const previews = [
  {
    label: "ESTIMATING SINGLE — Step 2 (most common next email, 62 people)",
    subject: "[PREVIEW] The $340K mistake I caught before it was too late",
    html: wrapEmail(
      p(`Hey Marshall —`) +
      p(`Let me tell you about a job that almost went sideways.`) +
      p(`A contractor I was advising had a $4.2M bid ready to submit. Everything looked right. The takeoffs were solid, the sub numbers were in, the markup was reasonable. He was ready to hit send.`) +
      p(`I asked him one question: "Did you scope-level the mechanical sub?"`) +
      p(`He hadn't. He had two quotes — one at $680K and one at $410K. He was going to use the $410K number because it was lower. The problem? The $410K sub had excluded all ductwork insulation, all testing and balancing, and the building automation tie-in. That's $340K in missing scope.`) +
      p(`If he had submitted that bid with the $410K number, he would have won the job — and lost $340K on it. He would have been underwater before the first shovel hit the ground.`) +
      p(`That's Phase 6 in the checklist. Scope-leveling isn't optional. It's the difference between a profitable job and a disaster.`) +
      p(`How many of your sub bids have you actually scope-leveled line by line?`) +
      sig()
    ),
  },
  {
    label: "Q1/Q2 SINGLE — Step 2 (next for 4 people at step 1)",
    subject: "[PREVIEW] The contractor who went from chaos to $12M",
    html: wrapEmail(
      p(`Hey Marshall —`) +
      p(`I worked with a contractor last year who was doing $6M in revenue and drowning. Every decision came back to him. Every problem landed on his desk. He was the estimator, the project manager, the HR department, and the firefighter — all at once.`) +
      p(`His business didn't have a revenue problem. It had a structure problem.`) +
      p(`We implemented three things: an accountability chart (who owns what), a weekly scorecard (5 numbers that tell you if you had a good week), and a 90-minute weekly leadership meeting with a fixed agenda.`) +
      p(`Within 6 months, he stopped being the bottleneck. His team started solving problems without him. He got his weekends back. And his revenue hit $12M because he finally had the bandwidth to pursue better work instead of just surviving the work he had.`) +
      p(`None of that required new technology. None of it required hiring 10 people. It required structure.`) +
      p(`That's what the Q1/Q2 framework is the beginning of. But it's just the beginning.`) +
      sig()
    ),
  },
  {
    label: "DOUBLE-DIPPER — Step 2 (next for Ventura, Mike, Nathan)",
    subject: "[PREVIEW] Marshall, quick question",
    html: wrapEmail(
      p(`Hey Marshall —`) +
      p(`You grabbed both the Estimating Checklist and the Q1/Q2 Planning Framework. That tells me you're serious about building a real business, not just running a crew.`) +
      p(`Quick question: what's the single biggest problem in your business right now? Cash flow? Scaling? Team? Estimating? Just reply with one word and I'll point you in the right direction.`) +
      sig()
    ),
  },
  {
    label: "HOMEPAGE-ONLY — Step 1 (next for 1 person at step 0)",
    subject: "[PREVIEW] Marshall, welcome — here's what I've got for you",
    html: wrapEmail(
      p(`Hey Marshall —`) +
      p(`Thanks for signing up. I'm Marshall Wilkinson — I've spent my career in heavy construction, $2.5 billion worth, and now I help contractors build companies that don't depend on one person to survive.`) +
      p(`I've got two free resources that are getting a lot of attention right now:`) +
      p(`The Estimating Checklist — a 12-phase, 7-page system for building accurate, reviewable estimates. This isn't theory — it's how I was trained and how I ran my business.`) +
      p(`The Q1/Q2 Planning Framework — a quarterly planning system that actually gets implemented, not just talked about in January and forgotten by March.`) +
      p(`Both are free. Reply "ESTIMATING" or "PLANNING" and I'll send you the one that fits where you are right now.`) +
      sig()
    ),
  },
];

// ─── Send all 4 previews ────────────────────────────────────────────────────

async function main() {
  for (const preview of previews) {
    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        to: TO,
        subject: preview.subject,
        html: preview.html,
      });
      if (error) {
        console.error(`FAILED: ${preview.label}`, error);
      } else {
        console.log(`SENT: ${preview.label} — id: ${data?.id}`);
      }
    } catch (err) {
      console.error(`ERROR: ${preview.label}`, err.message);
    }
    // Small delay between sends
    await new Promise(r => setTimeout(r, 500));
  }
  console.log("\nAll 4 preview emails sent to marshall@marshallwilkinson.com");
}

main();
