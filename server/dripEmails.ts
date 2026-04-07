/**
 * Drip Campaign Email Templates
 * 
 * 4 sequences × up to 5 emails each = 16 total emails
 * Elevated personal style — Georgia serif, 15px, subtle brand touches.
 * Looks like a personal email from a high-end executive, not a marketing blast.
 */

import { Resend } from "resend";
import { generateUnsubscribeUrl } from "./unsubscribe";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>";
const CIRCLE_URL = "https://alpcontractorcircle.com";

// ─── Elevated personal email wrapper ────────────────────────────────────────

function wrapEmail(bodyHtml: string): string {
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
                  <td style="color:#2d2d2d;font-size:18px;line-height:1.8;font-family:Georgia,'Times New Roman',serif;">
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
              {{UNSUB_PLACEHOLDER}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Convert paragraphs into styled HTML with generous spacing */
function p(text: string): string {
  return `<p style="margin:0 0 18px 0;color:#2d2d2d;">${text}</p>`;
}

function sig(): string {
  return `<div style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e8e4df;">
    <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#2d2d2d;">Marshall</p>
  </div>`;
}

function sigFull(): string {
  return `<div style="margin:28px 0 0 0;padding-top:20px;border-top:1px solid #e8e4df;">
    <p style="margin:0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:#2d2d2d;">Marshall Wilkinson</p>
    <p style="margin:4px 0 0 0;font-family:'Inter',Helvetica,Arial,sans-serif;font-size:12px;color:#999;letter-spacing:0.5px;">Founder &amp; CEO, ALP</p>
  </div>`;
}

function link(text: string, url: string): string {
  return `<a href="${url}" style="color:#D4915C;text-decoration:none;border-bottom:1px solid rgba(212,145,92,0.3);">${text}</a>`;
}

// ─── Email Content Definitions ───────────────────────────────────────────────

export interface DripEmailDef {
  sequenceId: string;
  stepNumber: number;
  subject: (firstName: string) => string;
  buildHtml: (firstName: string) => string;
  buildText: (firstName: string) => string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE 1: ESTIMATING CHECKLIST SINGLE-DIPPERS (5 emails)
// ═══════════════════════════════════════════════════════════════════════════════

const EST_1: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, one thing most estimators get wrong`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Hope you've had a chance to dig into the Estimating Checklist. If you haven't yet, do it today — it's built from $2.5 billion in actual construction, not a textbook.`) +
    p(`Here's the one thing I see most contractors get wrong with estimating: they treat it like math. It's not math. It's risk management.`) +
    p(`Every line item on your estimate is a bet. You're betting that the material costs hold, that your labor production rates are accurate, that the sub who gave you a number will actually honor it, and that nothing in the field is going to surprise you.`) +
    p(`The contractors who consistently win profitable work aren't better at math — they're better at identifying where the risk lives and pricing for it.`) +
    p(`That's what the checklist is designed to do. It forces you through every phase so you're not just calculating — you're evaluating.`) +
    p(`Go back through Phase 3 (Exclusions &amp; Clarifications) and Phase 10 (The Sanity Check) one more time. Those two phases alone will save you more money than anything else in that document.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nHope you've had a chance to dig into the Estimating Checklist. If you haven't yet, do it today — it's built from $2.5 billion in actual construction, not a textbook.\n\nHere's the one thing I see most contractors get wrong with estimating: they treat it like math. It's not math. It's risk management.\n\nEvery line item on your estimate is a bet. You're betting that the material costs hold, that your labor production rates are accurate, that the sub who gave you a number will actually honor it, and that nothing in the field is going to surprise you.\n\nThe contractors who consistently win profitable work aren't better at math — they're better at identifying where the risk lives and pricing for it.\n\nThat's what the checklist is designed to do. It forces you through every phase so you're not just calculating — you're evaluating.\n\nGo back through Phase 3 (Exclusions & Clarifications) and Phase 10 (The Sanity Check) one more time. Those two phases alone will save you more money than anything else in that document.\n\nMarshall`,
};

const EST_2: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 2,
  subject: (_fn) => `The $340K mistake I caught before it was too late`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Let me tell you about a job that almost went sideways.`) +
    p(`A contractor I was advising had a $4.2M bid ready to submit. Everything looked right. The takeoffs were solid, the sub numbers were in, the markup was reasonable. He was ready to hit send.`) +
    p(`I asked him one question: "Did you scope-level the mechanical sub?"`) +
    p(`He hadn't. He had two quotes — one at $680K and one at $410K. He was going to use the $410K number because it was lower. The problem? The $410K sub had excluded all ductwork insulation, all testing and balancing, and the building automation tie-in. That's $340K in missing scope.`) +
    p(`If he had submitted that bid with the $410K number, he would have won the job — and lost $340K on it. He would have been underwater before the first shovel hit the ground.`) +
    p(`That's Phase 6 in the checklist. Scope-leveling isn't optional. It's the difference between a profitable job and a disaster.`) +
    p(`How many of your sub bids have you actually scope-leveled line by line?`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nLet me tell you about a job that almost went sideways.\n\nA contractor I was advising had a $4.2M bid ready to submit. Everything looked right. The takeoffs were solid, the sub numbers were in, the markup was reasonable. He was ready to hit send.\n\nI asked him one question: "Did you scope-level the mechanical sub?"\n\nHe hadn't. He had two quotes — one at $680K and one at $410K. He was going to use the $410K number because it was lower. The problem? The $410K sub had excluded all ductwork insulation, all testing and balancing, and the building automation tie-in. That's $340K in missing scope.\n\nIf he had submitted that bid with the $410K number, he would have won the job — and lost $340K on it. He would have been underwater before the first shovel hit the ground.\n\nThat's Phase 6 in the checklist. Scope-leveling isn't optional. It's the difference between a profitable job and a disaster.\n\nHow many of your sub bids have you actually scope-leveled line by line?\n\nMarshall`,
};

const EST_3: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 3,
  subject: (_fn) => `Unpopular opinion about estimating`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Here's something that's going to piss off a lot of people: the reason most contractors lose money isn't because they're bad at building. It's because they're desperate.`) +
    p(`They underbid work because they need the revenue. They skip the exclusions because they're afraid of losing the job. They don't scope-level subs because they don't have time. They use last job's numbers because it's faster.`) +
    p(`And then they wonder why their margins are razor thin and they're working 70 hours a week with nothing to show for it.`) +
    p(`The best job you'll ever get might be the one you don't take.`) +
    p(`Every underbid job steals bandwidth from the projects that actually have margin. You're robbing your good jobs to babysit your bad ones. And the cycle never stops until you decide it stops.`) +
    p(`The checklist I gave you isn't just a process for estimating. It's a filter. It forces you to be disciplined about what you pursue, how you price it, and whether it's worth your time.`) +
    p(`Use it as a filter, not just a calculator.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nHere's something that's going to piss off a lot of people: the reason most contractors lose money isn't because they're bad at building. It's because they're desperate.\n\nThey underbid work because they need the revenue. They skip the exclusions because they're afraid of losing the job. They don't scope-level subs because they don't have time. They use last job's numbers because it's faster.\n\nAnd then they wonder why their margins are razor thin and they're working 70 hours a week with nothing to show for it.\n\nThe best job you'll ever get might be the one you don't take.\n\nEvery underbid job steals bandwidth from the projects that actually have margin. You're robbing your good jobs to babysit your bad ones. And the cycle never stops until you decide it stops.\n\nThe checklist I gave you isn't just a process for estimating. It's a filter. It forces you to be disciplined about what you pursue, how you price it, and whether it's worth your time.\n\nUse it as a filter, not just a calculator.\n\nMarshall`,
};

const EST_4: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 4,
  subject: (_fn) => `You've got the checklist — now what?`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`The Estimating Checklist is a tool. A good one. But a tool without a system around it is just a piece of paper.`) +
    p(`Here's what I mean: estimating doesn't exist in a vacuum. It connects to everything — your sales pipeline, your project management, your cash flow, your schedule, your team structure.`) +
    p(`You can have the most accurate estimate in the world, but if your billing is 60 days behind and your schedule of values isn't front-loaded, you're still going to have a cash flow problem. If your PM doesn't understand how you priced the job, they're going to manage it differently than you estimated it. If you don't have a weekly scorecard tracking your win rate, your margins, and your backlog, you're flying blind.`) +
    p(`That's what I teach in the Contractor Circle — not just individual tools, but the full operating system for running a construction business. Estimating, planning, accountability, execution, measurement — all of it connected.`) +
    p(`If you've gotten value from the checklist and you're ready to go deeper, I want to hear from you. Reply to this email with "CIRCLE" and I'll tell you how it works.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThe Estimating Checklist is a tool. A good one. But a tool without a system around it is just a piece of paper.\n\nHere's what I mean: estimating doesn't exist in a vacuum. It connects to everything — your sales pipeline, your project management, your cash flow, your schedule, your team structure.\n\nYou can have the most accurate estimate in the world, but if your billing is 60 days behind and your schedule of values isn't front-loaded, you're still going to have a cash flow problem. If your PM doesn't understand how you priced the job, they're going to manage it differently than you estimated it. If you don't have a weekly scorecard tracking your win rate, your margins, and your backlog, you're flying blind.\n\nThat's what I teach in the Contractor Circle — not just individual tools, but the full operating system for running a construction business. Estimating, planning, accountability, execution, measurement — all of it connected.\n\nIf you've gotten value from the checklist and you're ready to go deeper, I want to hear from you. Reply to this email with "CIRCLE" and I'll tell you how it works.\n\nMarshall`,
};

const EST_5: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 5,
  subject: (_fn) => `Last thing from me on this`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I've sent you a few emails since you downloaded the Estimating Checklist. I hope they've been useful. This is the last one in this series.`) +
    p(`Here's where I'll leave it:`) +
    p(`If you're a contractor doing $2M–$15M and you feel like you're stuck — working harder but not growing, winning work but not making money, running the company but the company is also running you — that's not a construction problem. That's an entrepreneurial problem. And it's fixable.`) +
    p(`I work with contractors in two ways:`) +
    p(`Contractor Circle — $497/mo. The full system. Live coaching, frameworks, templates, and a community of operators who are actually building. Founding rate locks in forever. ${link("alpcontractorcircle.com", CIRCLE_URL)}`) +
    p(`1-on-1 Strategy Session — $1,000. We roll up the sleeves, dig into your specific situation, and build a plan. Reply "SESSION" and I'll send the application.`) +
    p(`Either way, the only thing that matters to me is that you win.`) +
    p(`You're in my ecosystem now. Welcome to the NFL.`) +
    sigFull()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI've sent you a few emails since you downloaded the Estimating Checklist. I hope they've been useful. This is the last one in this series.\n\nHere's where I'll leave it:\n\nIf you're a contractor doing $2M-$15M and you feel like you're stuck — working harder but not growing, winning work but not making money, running the company but the company is also running you — that's not a construction problem. That's an entrepreneurial problem. And it's fixable.\n\nI work with contractors in two ways:\n\nContractor Circle — $497/mo. The full system. Live coaching, frameworks, templates, and a community of operators who are actually building. Founding rate locks in forever. alpcontractorcircle.com\n\n1-on-1 Strategy Session — $1,000. We roll up the sleeves, dig into your specific situation, and build a plan. Reply "SESSION" and I'll send the application.\n\nEither way, the only thing that matters to me is that you win.\n\nYou're in my ecosystem now. Welcome to the NFL.\n\nMarshall Wilkinson\nFounder & CEO, ALP`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE 2: Q1/Q2 FRAMEWORK SINGLE-DIPPERS (5 emails)
// ═══════════════════════════════════════════════════════════════════════════════

const Q1Q2_1: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, the planning trap most contractors fall into`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`You downloaded the Q1/Q2 Planning Framework, which tells me you're thinking about your business at a higher level than most contractors. Good.`) +
    p(`But here's the trap: planning without accountability is just wishful thinking.`) +
    p(`I've watched contractors sit down every January, set revenue goals, talk about hiring, sketch out project targets — and by March, the plan is buried under a pile of change orders and daily fires.`) +
    p(`The reason isn't that the plan was bad. The reason is there was no system to execute it. No weekly check-in. No scorecard. No one owning the deliverables. No mechanism to catch problems before they become crises.`) +
    p(`The Q1/Q2 framework I gave you is designed to fix that. But only if you actually build the accountability structure around it.`) +
    p(`Start with this: take your top 3 goals from the framework and assign one owner to each one. Not a team. Not "we." One name. That person reports on progress every week. That's it. That's where it starts.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nYou downloaded the Q1/Q2 Planning Framework, which tells me you're thinking about your business at a higher level than most contractors. Good.\n\nBut here's the trap: planning without accountability is just wishful thinking.\n\nI've watched contractors sit down every January, set revenue goals, talk about hiring, sketch out project targets — and by March, the plan is buried under a pile of change orders and daily fires.\n\nThe reason isn't that the plan was bad. The reason is there was no system to execute it. No weekly check-in. No scorecard. No one owning the deliverables. No mechanism to catch problems before they become crises.\n\nThe Q1/Q2 framework I gave you is designed to fix that. But only if you actually build the accountability structure around it.\n\nStart with this: take your top 3 goals from the framework and assign one owner to each one. Not a team. Not "we." One name. That person reports on progress every week. That's it. That's where it starts.\n\nMarshall`,
};

const Q1Q2_2: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 2,
  subject: (_fn) => `The contractor who went from chaos to $12M`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I worked with a contractor last year who was doing $6M in revenue and drowning. Every decision came back to him. Every problem landed on his desk. He was the estimator, the project manager, the HR department, and the firefighter — all at once.`) +
    p(`His business didn't have a revenue problem. It had a structure problem.`) +
    p(`We implemented three things: an accountability chart (who owns what), a weekly scorecard (5 numbers that tell you if you had a good week), and a 90-minute weekly leadership meeting with a fixed agenda.`) +
    p(`Within 6 months, he stopped being the bottleneck. His team started solving problems without him. He got his weekends back. And his revenue hit $12M because he finally had the bandwidth to pursue better work instead of just surviving the work he had.`) +
    p(`None of that required new technology. None of it required hiring 10 people. It required structure.`) +
    p(`That's what the Q1/Q2 framework is the beginning of. But it's just the beginning.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI worked with a contractor last year who was doing $6M in revenue and drowning. Every decision came back to him. Every problem landed on his desk. He was the estimator, the project manager, the HR department, and the firefighter — all at once.\n\nHis business didn't have a revenue problem. It had a structure problem.\n\nWe implemented three things: an accountability chart (who owns what), a weekly scorecard (5 numbers that tell you if you had a good week), and a 90-minute weekly leadership meeting with a fixed agenda.\n\nWithin 6 months, he stopped being the bottleneck. His team started solving problems without him. He got his weekends back. And his revenue hit $12M because he finally had the bandwidth to pursue better work instead of just surviving the work he had.\n\nNone of that required new technology. None of it required hiring 10 people. It required structure.\n\nThat's what the Q1/Q2 framework is the beginning of. But it's just the beginning.\n\nMarshall`,
};

const Q1Q2_3: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 3,
  subject: (_fn) => `"We're too small for structure"`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I hear this all the time: "Marshall, we're a small company. We don't need all that structure. We just need to do the work."`) +
    p(`Let me ask you something: do NFL teams say "we're too small for a playbook"? Do they say "we'll figure out the plays when we get to the game"?`) +
    p(`No. The playbook IS the reason they win. And the smaller your team, the more important the playbook becomes — because every person is wearing multiple hats and the margin for error is zero.`) +
    p(`When you have 5 people doing the jobs of 15, the only way to know things are getting done is to define who owns what, measure it, and review it every single week.`) +
    p(`Structure isn't bureaucracy. Bureaucracy is when you create systems to justify people's jobs. Structure is when you create systems to make sure the work gets done and nothing falls through the cracks.`) +
    p(`You can overlap roles. You can wear multiple hats. But every hat needs an owner, a measurable, and a weekly checkpoint.`) +
    p(`That's the difference between a $5M company that feels like chaos and a $15M company that runs like a machine.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI hear this all the time: "Marshall, we're a small company. We don't need all that structure. We just need to do the work."\n\nLet me ask you something: do NFL teams say "we're too small for a playbook"? Do they say "we'll figure out the plays when we get to the game"?\n\nNo. The playbook IS the reason they win. And the smaller your team, the more important the playbook becomes — because every person is wearing multiple hats and the margin for error is zero.\n\nWhen you have 5 people doing the jobs of 15, the only way to know things are getting done is to define who owns what, measure it, and review it every single week.\n\nStructure isn't bureaucracy. Bureaucracy is when you create systems to justify people's jobs. Structure is when you create systems to make sure the work gets done and nothing falls through the cracks.\n\nYou can overlap roles. You can wear multiple hats. But every hat needs an owner, a measurable, and a weekly checkpoint.\n\nThat's the difference between a $5M company that feels like chaos and a $15M company that runs like a machine.\n\nMarshall`,
};

const Q1Q2_4: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 4,
  subject: (_fn) => `Your P&L is lying to you`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Your P&amp;L tells you what already happened. It's a rearview mirror.`) +
    p(`By the time your financials show a problem, the problem happened 60–90 days ago. If your margins are thin this quarter, the estimating mistakes that caused it were made last quarter. If cash flow is tight this month, the billing delays that caused it started two months ago.`) +
    p(`That's why the most important tool in the Q1/Q2 framework isn't the goal-setting section. It's the scorecard.`) +
    p(`A scorecard is 5–15 weekly numbers that tell you whether your business is on track BEFORE the P&amp;L shows it. Leading indicators, not lagging ones.`) +
    p(`Proposals sent — not revenue closed.<br/>Jobs started — not backlog total.<br/>AR over 60 days — not total collections.<br/>Estimates turned around in 48 hours — not win rate.`) +
    p(`If you could only look at 5 numbers every Monday morning to know if your business had a good week, what would they be?`) +
    p(`Answer that question, and you've built the foundation of a real operating system.`) +
    p(`Reply "SCORECARD" if you want me to walk you through how to build one for your company.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nYour P&L tells you what already happened. It's a rearview mirror.\n\nBy the time your financials show a problem, the problem happened 60-90 days ago. If your margins are thin this quarter, the estimating mistakes that caused it were made last quarter. If cash flow is tight this month, the billing delays that caused it started two months ago.\n\nThat's why the most important tool in the Q1/Q2 framework isn't the goal-setting section. It's the scorecard.\n\nA scorecard is 5-15 weekly numbers that tell you whether your business is on track BEFORE the P&L shows it. Leading indicators, not lagging ones.\n\nProposals sent — not revenue closed.\nJobs started — not backlog total.\nAR over 60 days — not total collections.\nEstimates turned around in 48 hours — not win rate.\n\nIf you could only look at 5 numbers every Monday morning to know if your business had a good week, what would they be?\n\nAnswer that question, and you've built the foundation of a real operating system.\n\nReply "SCORECARD" if you want me to walk you through how to build one for your company.\n\nMarshall`,
};

const Q1Q2_5: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 5,
  subject: (_fn) => `Last thing from me on this`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I've sent you a few emails since you downloaded the Q1/Q2 Planning Framework. Hope they've given you something to think about. This is the last one in this series.`) +
    p(`Here's the bottom line:`) +
    p(`If you downloaded a planning framework, it's because you know your business needs more structure. You're right — it does. But a framework on its own doesn't change anything. Implementation does. Accountability does. Having someone in your corner who's done this at a $2.5 billion level does.`) +
    p(`I work with contractors in two ways:`) +
    p(`Contractor Circle — $497/mo. The full operating system. Live coaching, EOS implementation, accountability frameworks, and a community of contractors who are building real companies. Founding rate locks in forever. ${link("alpcontractorcircle.com", CIRCLE_URL)}`) +
    p(`1-on-1 Strategy Session — $1,000. We dig into your specific business — org chart, cash flow, estimating, scaling — and build a plan built for you. Reply "SESSION" and I'll send the application.`) +
    p(`Either way, the only thing that matters to me is that you win.`) +
    p(`You're in my ecosystem now. Welcome to the NFL.`) +
    sigFull()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI've sent you a few emails since you downloaded the Q1/Q2 Planning Framework. Hope they've given you something to think about. This is the last one in this series.\n\nHere's the bottom line:\n\nIf you downloaded a planning framework, it's because you know your business needs more structure. You're right — it does. But a framework on its own doesn't change anything. Implementation does. Accountability does. Having someone in your corner who's done this at a $2.5 billion level does.\n\nI work with contractors in two ways:\n\nContractor Circle — $497/mo. The full operating system. Live coaching, EOS implementation, accountability frameworks, and a community of contractors who are building real companies. Founding rate locks in forever. alpcontractorcircle.com\n\n1-on-1 Strategy Session — $1,000. We dig into your specific business — org chart, cash flow, estimating, scaling — and build a plan built for you. Reply "SESSION" and I'll send the application.\n\nEither way, the only thing that matters to me is that you win.\n\nYou're in my ecosystem now. Welcome to the NFL.\n\nMarshall Wilkinson\nFounder & CEO, ALP`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE 3: DOUBLE-DIPPERS (3 emails)
// ═══════════════════════════════════════════════════════════════════════════════

const DD_1: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 1,
  subject: (fn) => `${fn} — I noticed something`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`That Estimating Checklist is the real deal — it's how I was trained and comes directly from $2.5 billion in construction. If you've checked it out, you already know it's not fluff. Use it and start benefiting.`) +
    p(`When you're ready to get in the saddle and truly fix and optimize the business, I want to welcome you to the Contractor Circle group or roll up my sleeves with you on some serious 1-on-1 deep dives. If you want to learn more about these, reply "Contractor Circle" or "Session" and I'll get you more information.`) +
    p(`The only thing that matters to me is that you win. You're in my ecosystem now. Welcome to the NFL.`) +
    sigFull()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThat Estimating Checklist is the real deal — it's how I was trained and comes directly from $2.5 billion in construction. If you've checked it out, you already know it's not fluff. Use it and start benefiting.\n\nWhen you're ready to get in the saddle and truly fix and optimize the business, I want to welcome you to the Contractor Circle group or roll up my sleeves with you on some serious 1-on-1 deep dives. If you want to learn more about these, reply "Contractor Circle" or "Session" and I'll get you more information.\n\nThe only thing that matters to me is that you win. You're in my ecosystem now. Welcome to the NFL.\n\nMarshall Wilkinson\nFounder & CEO, ALP`,
};

const DD_2: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 2,
  subject: (fn) => `${fn}, quick question`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`You grabbed both the Estimating Checklist and the Q1/Q2 Planning Framework. That tells me you're serious about building a real business, not just running a crew.`) +
    p(`Quick question: what's the single biggest problem in your business right now? Cash flow? Scaling? Team? Estimating? Just reply with one word and I'll point you in the right direction.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nYou grabbed both the Estimating Checklist and the Q1/Q2 Planning Framework. That tells me you're serious about building a real business, not just running a crew.\n\nQuick question: what's the single biggest problem in your business right now? Cash flow? Scaling? Team? Estimating? Just reply with one word and I'll point you in the right direction.\n\nMarshall`,
};

const DD_3: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 3,
  subject: (_fn) => `The offer stands`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Just circling back. The tools I gave you are good — but tools without implementation are just PDFs sitting in a downloads folder.`) +
    p(`If you're ready to actually build the system:`) +
    p(`Reply "CIRCLE" for Contractor Circle — $497/mo, founding rate locked forever.`) +
    p(`Reply "SESSION" for a 1-on-1 strategy call — $1,000, we roll up the sleeves.`) +
    p(`Either way, I'm here when you're ready.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nJust circling back. The tools I gave you are good — but tools without implementation are just PDFs sitting in a downloads folder.\n\nIf you're ready to actually build the system:\n\nReply "CIRCLE" for Contractor Circle — $497/mo, founding rate locked forever.\nReply "SESSION" for a 1-on-1 strategy call — $1,000, we roll up the sleeves.\n\nEither way, I'm here when you're ready.\n\nMarshall`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE 4: HOMEPAGE-ONLY SIGNUPS (3 emails)
// ═══════════════════════════════════════════════════════════════════════════════

const HP_1: DripEmailDef = {
  sequenceId: "homepage_only",
  stepNumber: 1,
  subject: (fn) => `${fn}, welcome — here's what I've got for you`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Thanks for signing up. I'm Marshall Wilkinson — I've spent my career in heavy construction, $2.5 billion worth, and now I help contractors build companies that don't depend on one person to survive.`) +
    p(`I've got two free resources that are getting a lot of attention right now:`) +
    p(`The Estimating Checklist — a 12-phase, 7-page system for building accurate, reviewable estimates. This isn't theory — it's how I was trained and how I ran my business.`) +
    p(`The Q1/Q2 Planning Framework — a quarterly planning system that actually gets implemented, not just talked about in January and forgotten by March.`) +
    p(`Both are free. Reply "ESTIMATING" or "PLANNING" and I'll send you the one that fits where you are right now.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThanks for signing up. I'm Marshall Wilkinson — I've spent my career in heavy construction, $2.5 billion worth, and now I help contractors build companies that don't depend on one person to survive.\n\nI've got two free resources that are getting a lot of attention right now:\n\nThe Estimating Checklist — a 12-phase, 7-page system for building accurate, reviewable estimates. This isn't theory — it's how I was trained and how I ran my business.\n\nThe Q1/Q2 Planning Framework — a quarterly planning system that actually gets implemented, not just talked about in January and forgotten by March.\n\nBoth are free. Reply "ESTIMATING" or "PLANNING" and I'll send you the one that fits where you are right now.\n\nMarshall`,
};

const HP_2: DripEmailDef = {
  sequenceId: "homepage_only",
  stepNumber: 2,
  subject: (_fn) => `Which one are you?`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`In my experience, contractors fall into one of two categories:`) +
    p(`Category 1: You're good at building but your business is chaos. You win work, but you're not sure if you're making money on it. You're the bottleneck for every decision. The company doesn't run without you.`) +
    p(`Category 2: You've got some structure, but you've hit a ceiling. You're doing $3–10M and can't figure out how to get to $15–20M without burning out or blowing up.`) +
    p(`Either way, the answer is the same: you need a system.`) +
    p(`If you haven't grabbed the Estimating Checklist or the Q1/Q2 Framework yet, reply "SEND IT" and I'll get both to you.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nIn my experience, contractors fall into one of two categories:\n\nCategory 1: You're good at building but your business is chaos. You win work, but you're not sure if you're making money on it. You're the bottleneck for every decision. The company doesn't run without you.\n\nCategory 2: You've got some structure, but you've hit a ceiling. You're doing $3-10M and can't figure out how to get to $15-20M without burning out or blowing up.\n\nEither way, the answer is the same: you need a system.\n\nIf you haven't grabbed the Estimating Checklist or the Q1/Q2 Framework yet, reply "SEND IT" and I'll get both to you.\n\nMarshall`,
};

const HP_3: DripEmailDef = {
  sequenceId: "homepage_only",
  stepNumber: 3,
  subject: (_fn) => `The door's open`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I've sent you a couple emails. If they resonated, great — I'd love to hear from you. If not, no hard feelings.`) +
    p(`But if you're a contractor who's serious about scaling and you want the full system — estimating, planning, accountability, execution — here's where to go:`) +
    p(link("alpcontractorcircle.com", CIRCLE_URL)) +
    p(`That's my Contractor Circle. Live coaching, battle-tested frameworks, and a community of operators who are actually building. $497/mo, founding rate locked forever.`) +
    p(`The only thing that matters to me is that you win.`) +
    sigFull()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI've sent you a couple emails. If they resonated, great — I'd love to hear from you. If not, no hard feelings.\n\nBut if you're a contractor who's serious about scaling and you want the full system — estimating, planning, accountability, execution — here's where to go:\n\nalpcontractorcircle.com\n\nThat's my Contractor Circle. Live coaching, battle-tested frameworks, and a community of operators who are actually building. $497/mo, founding rate locked forever.\n\nThe only thing that matters to me is that you win.\n\nMarshall Wilkinson\nFounder & CEO, ALP`,
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const ALL_DRIP_EMAILS: DripEmailDef[] = [
  EST_1, EST_2, EST_3, EST_4, EST_5,
  Q1Q2_1, Q1Q2_2, Q1Q2_3, Q1Q2_4, Q1Q2_5,
  DD_1, DD_2, DD_3,
  HP_1, HP_2, HP_3,
];

export function getDripEmail(
  sequenceId: string,
  stepNumber: number
): DripEmailDef | undefined {
  return ALL_DRIP_EMAILS.find(
    (e) => e.sequenceId === sequenceId && e.stepNumber === stepNumber
  );
}

export function getMaxStep(sequenceId: string): number {
  const steps = ALL_DRIP_EMAILS.filter((e) => e.sequenceId === sequenceId).map(
    (e) => e.stepNumber
  );
  return steps.length > 0 ? Math.max(...steps) : 0;
}

// ─── Scheduling ──────────────────────────────────────────────────────────────

/** Day gaps between emails for each sequence (index = step number) */
const SCHEDULE: Record<string, number[]> = {
  // index 0 = delivery email (step 0), index 1 = step 1, etc.
  estimating_single: [0, 2, 2, 3, 3, 4], // Day 0, 2, 4, 7, 10, 14
  q1q2_single: [0, 2, 2, 3, 3, 4],       // same
  double_dipper: [0, 0, 3, 3],            // Day 0, 0(immediate), 3, 6
  homepage_only: [0, 1, 2, 2],            // Day 0, 1, 3, 5
};

export function getNextSendDate(
  sequenceId: string,
  nextStep: number,
  fromDate: Date = new Date()
): string | null {
  const sched = SCHEDULE[sequenceId];
  if (!sched || nextStep > getMaxStep(sequenceId)) return null; // sequence complete

  const daysGap = sched[nextStep] ?? 2;
  const next = new Date(fromDate);
  next.setUTCDate(next.getUTCDate() + daysGap);

  // Return a raw MySQL DATETIME string in UTC.
  // 12:00:00 UTC = 8:00 AM ET (Eastern Time).
  // By returning a string (not a Date), we bypass mysql2's timezone conversion
  // and ensure the exact value '12:00:00' is stored in MySQL.
  // The engine query `nextSendAt <= NOW()` compares in MySQL where NOW() is UTC.
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = next.getUTCFullYear();
  const m = pad(next.getUTCMonth() + 1);
  const d = pad(next.getUTCDate());
  return `${y}-${m}-${d} 12:00:00`;
}

// ─── Send function ───────────────────────────────────────────────────────────

export async function sendDripEmail(params: {
  to: string;
  firstName: string;
  sequenceId: string;
  stepNumber: number;
}): Promise<{ success: boolean; resendId?: string; error?: string }> {
  if (!resend) {
    console.warn("[Drip] Resend not configured — skipping drip email");
    return { success: false, error: "Resend not configured" };
  }

  const emailDef = getDripEmail(params.sequenceId, params.stepNumber);
  if (!emailDef) {
    return {
      success: false,
      error: `No email template for ${params.sequenceId} step ${params.stepNumber}`,
    };
  }

  const subject = emailDef.subject(params.firstName);
  let html = emailDef.buildHtml(params.firstName);
  const text = emailDef.buildText(params.firstName);

  // Inject unsubscribe link into the email footer
  const unsubUrl = generateUnsubscribeUrl(params.to);
  const fullUnsubUrl = `https://alpcontractorcircle.com${unsubUrl}`;
  const unsubHtml = `<br><a href="${fullUnsubUrl}" style="font-family:'Inter',Helvetica,Arial,sans-serif;font-size:11px;color:#bbb;text-decoration:none;">Unsubscribe</a>`;
  html = html.replace('{{UNSUB_PLACEHOLDER}}', unsubHtml);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: params.to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error(`[Drip] Failed to send ${params.sequenceId}#${params.stepNumber} to ${params.to}:`, error);
      return { success: false, error: error.message };
    }

    console.log(
      `[Drip] Sent ${params.sequenceId}#${params.stepNumber} to ${params.to} — id: ${data?.id}`
    );
    return { success: true, resendId: data?.id };
  } catch (err: any) {
    console.error(`[Drip] Unexpected error:`, err);
    return { success: false, error: err.message || "Unknown error" };
  }
}
