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
// SEQUENCE 1: ESTIMATING CHECKLIST → CONTRACTOR CIRCLE (9 emails)
// Strategy: Controlled escalation from estimating pain → operator problems → Circle
// Cadence: Day 0,1,2,3,4,5,6,8,10 (7 daily then 2 spaced)
// ═══════════════════════════════════════════════════════════════════════════════

// Email 1 (Day 0): Deliver the checklist and frame the problem correctly
const EST_1: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, your checklist is ready`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Your Estimating Checklist is attached. But before you file it away, I need to tell you something most people won't.`) +
    p(`The reason most contractors lose money on jobs isn't because they can't estimate. It's because they estimate casually.`) +
    p(`They pull numbers from memory. They skip the exclusions. They don't scope-level subs. They round down because they're afraid of losing the bid. And then they wonder why they're working 60-hour weeks with nothing to show for it.`) +
    p(`This checklist is built from $2.5 billion in actual construction. Every phase exists because I've watched a contractor lose money by skipping it.`) +
    p(`Here's what I want you to do: pull up your last estimate — the one you already submitted — and run it against this checklist. Not your next bid. Your last one. See what you missed.`) +
    p(`That exercise alone will tell you more about your business than any YouTube video or podcast ever will.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nYour Estimating Checklist is attached. But before you file it away, I need to tell you something most people won't.\n\nThe reason most contractors lose money on jobs isn't because they can't estimate. It's because they estimate casually.\n\nThey pull numbers from memory. They skip the exclusions. They don't scope-level subs. They round down because they're afraid of losing the bid. And then they wonder why they're working 60-hour weeks with nothing to show for it.\n\nThis checklist is built from $2.5 billion in actual construction. Every phase exists because I've watched a contractor lose money by skipping it.\n\nHere's what I want you to do: pull up your last estimate — the one you already submitted — and run it against this checklist. Not your next bid. Your last one. See what you missed.\n\nThat exercise alone will tell you more about your business than any YouTube video or podcast ever will.\n\nMarshall`,
};

// Email 2 (Day 1): Agitate the cost of estimating from memory
const EST_2: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 2,
  subject: (_fn) => `your estimate is leaking margin`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Quick question: on your last bid, how many line items did you price from memory?`) +
    p(`Be honest. I'm not judging. I'm diagnosing.`) +
    p(`Because here's what happens when you estimate from memory: you use last job's numbers. You round labor hours. You assume the sub's price includes things it doesn't. You skip the general conditions because "we always figure that out." You forget to account for mobilization, winter conditions, or the fact that the job site has no laydown area.`) +
    p(`Every one of those shortcuts is margin leakage. Not dramatic, blow-up-the-job leakage. Slow, invisible, death-by-a-thousand-cuts leakage. The kind where you finish a job and think "we should have made more on that" but you can't point to exactly where it went.`) +
    p(`It went into the gaps between what you assumed and what actually happened.`) +
    p(`Pull up your last estimate. Open the checklist. Run Phase 3 (Exclusions &amp; Clarifications) and Phase 6 (Subcontractor Scope Leveling) against it.`) +
    p(`I guarantee you'll find money you left on the table.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nQuick question: on your last bid, how many line items did you price from memory?\n\nBe honest. I'm not judging. I'm diagnosing.\n\nBecause here's what happens when you estimate from memory: you use last job's numbers. You round labor hours. You assume the sub's price includes things it doesn't. You skip the general conditions because "we always figure that out." You forget to account for mobilization, winter conditions, or the fact that the job site has no laydown area.\n\nEvery one of those shortcuts is margin leakage. Not dramatic, blow-up-the-job leakage. Slow, invisible, death-by-a-thousand-cuts leakage. The kind where you finish a job and think "we should have made more on that" but you can't point to exactly where it went.\n\nIt went into the gaps between what you assumed and what actually happened.\n\nPull up your last estimate. Open the checklist. Run Phase 3 (Exclusions & Clarifications) and Phase 6 (Subcontractor Scope Leveling) against it.\n\nI guarantee you'll find money you left on the table.\n\nMarshall`,
};

// Email 3 (Day 2): This is not just an estimating problem — widen the diagnosis
const EST_3: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 3,
  subject: (_fn) => `this is not just an estimating issue`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I want to be straight with you about something.`) +
    p(`If your estimating is sloppy, your estimating is probably not the only thing that's sloppy.`) +
    p(`When I work with contractors, I almost never find that estimating is an isolated problem. It's a symptom. If a contractor is estimating from memory, they're usually also selling without a process, handing off jobs without a formal turnover, running projects without weekly cost tracking, and billing late because nobody owns the schedule of values.`) +
    p(`The estimate is just the first place the cracks show up — because that's where the money enters the business. But the same lack of discipline that produces a sloppy estimate produces sloppy ops, sloppy project management, and sloppy financials.`) +
    p(`Here's a quick diagnostic. Answer honestly:`) +
    p(`Do you have a documented sales process, or do you just "talk to people"?<br/>Do your PMs get a formal job turnover with the estimate backup, or do they figure it out?<br/>Do you track job costs weekly against the estimate, or just at the end?<br/>Is your billing current within 30 days, or are you always chasing money?`) +
    p(`If you answered "no" to more than one of those, the checklist helped — but the checklist isn't enough.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI want to be straight with you about something.\n\nIf your estimating is sloppy, your estimating is probably not the only thing that's sloppy.\n\nWhen I work with contractors, I almost never find that estimating is an isolated problem. It's a symptom. If a contractor is estimating from memory, they're usually also selling without a process, handing off jobs without a formal turnover, running projects without weekly cost tracking, and billing late because nobody owns the schedule of values.\n\nThe estimate is just the first place the cracks show up — because that's where the money enters the business. But the same lack of discipline that produces a sloppy estimate produces sloppy ops, sloppy project management, and sloppy financials.\n\nHere's a quick diagnostic. Answer honestly:\n\nDo you have a documented sales process, or do you just "talk to people"?\nDo your PMs get a formal job turnover with the estimate backup, or do they figure it out?\nDo you track job costs weekly against the estimate, or just at the end?\nIs your billing current within 30 days, or are you always chasing money?\n\nIf you answered "no" to more than one of those, the checklist helped — but the checklist isn't enough.\n\nMarshall`,
};

// Email 4 (Day 3): Why most contractors stay stuck — introduce the bigger worldview
const EST_4: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 4,
  subject: (_fn) => `why most contractors stay stuck`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I've worked with hundreds of contractors. Built over $2.5 billion in construction. And I can tell you the number one reason contractors stay stuck:`) +
    p(`They keep looking for the one thing.`) +
    p(`One better spreadsheet. One new estimator. One hire that'll fix everything. One piece of software. One trick from a YouTube video.`) +
    p(`And every time they find it, it helps for a week. Maybe two. Then they're back to the same problems — because the problem was never the tool. The problem is they don't have an operating system.`) +
    p(`An operating system is the full machine: how you sell, how you estimate, how you hand off, how you manage projects, how you track money, how you hold people accountable, how you make decisions. All of it connected. All of it measured. All of it reviewed every single week.`) +
    p(`That's what I built the ${link("Contractor Circle", CIRCLE_URL)} to deliver. Not one tool. Not one trick. The full system — with live coaching, frameworks, templates, and a room full of contractors who are actually building.`) +
    p(`If you're tired of collecting tools and ready to build the machine, take a look: ${link("alpcontractorcircle.com", CIRCLE_URL)}`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI've worked with hundreds of contractors. Built over $2.5 billion in construction. And I can tell you the number one reason contractors stay stuck:\n\nThey keep looking for the one thing.\n\nOne better spreadsheet. One new estimator. One hire that'll fix everything. One piece of software. One trick from a YouTube video.\n\nAnd every time they find it, it helps for a week. Maybe two. Then they're back to the same problems — because the problem was never the tool. The problem is they don't have an operating system.\n\nAn operating system is the full machine: how you sell, how you estimate, how you hand off, how you manage projects, how you track money, how you hold people accountable, how you make decisions. All of it connected. All of it measured. All of it reviewed every single week.\n\nThat's what I built the Contractor Circle to deliver. Not one tool. Not one trick. The full system — with live coaching, frameworks, templates, and a room full of contractors who are actually building.\n\nIf you're tired of collecting tools and ready to build the machine, take a look: alpcontractorcircle.com\n\nMarshall`,
};

// Email 5 (Day 4): Proof and transformation
const EST_5: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 5,
  subject: (_fn) => `$600K to $20M in 18 months`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I don't talk theory. I don't sell motivation. So let me just show you what happens when contractors stop guessing and start operating.`) +
    p(`<strong>CNY Group</strong> — went from $600K to $20M in 18 months. Not because they found some magic marketing hack. Because they built systems for estimating, selling, and delivering work that actually scaled.`) +
    p(`<strong>Trojan Roofing</strong> — $300K to $10M in their first year working with me. They had the talent. They had the work ethic. What they didn't have was structure. We built it.`) +
    p(`<strong>Davis Contracting</strong> — $1M to $4M in 6 months. The owner went from doing everything himself to running a company with clear roles, weekly accountability, and real financial visibility.`) +
    p(`<strong>Sage Construction</strong> — $2M revenue in their first year as a contractor. Not because the market was easy. Because they started with the operating system instead of trying to bolt one on later.`) +
    p(`These aren't unicorns. These are regular contractors who decided to stop running their business from their truck and start running it like a real company.`) +
    p(`That's what the ${link("Contractor Circle", CIRCLE_URL)} is built to do. See what's inside: ${link("alpcontractorcircle.com", CIRCLE_URL)}`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI don't talk theory. I don't sell motivation. So let me just show you what happens when contractors stop guessing and start operating.\n\nCNY Group — went from $600K to $20M in 18 months. Not because they found some magic marketing hack. Because they built systems for estimating, selling, and delivering work that actually scaled.\n\nTrojan Roofing — $300K to $10M in their first year working with me. They had the talent. They had the work ethic. What they didn't have was structure. We built it.\n\nDavis Contracting — $1M to $4M in 6 months. The owner went from doing everything himself to running a company with clear roles, weekly accountability, and real financial visibility.\n\nSage Construction — $2M revenue in their first year as a contractor. Not because the market was easy. Because they started with the operating system instead of trying to bolt one on later.\n\nThese aren't unicorns. These are regular contractors who decided to stop running their business from their truck and start running it like a real company.\n\nThat's what the Contractor Circle is built to do. See what's inside: alpcontractorcircle.com\n\nMarshall`,
};

// Email 6 (Day 5): Handle "I can get this free" / Instagram objection
const EST_6: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 6,
  subject: (_fn) => `free content won't fix this`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I know what you might be thinking: "I already follow Marshall on Instagram. I watch the videos. I downloaded the checklist. I'm getting what I need for free."`) +
    p(`And you're right — you are getting something. You're getting awareness. You're getting ideas. You're getting motivated for about 15 minutes while you scroll on the toilet.`) +
    p(`But here's what free content does not give you:`) +
    p(`It doesn't give you pressure. Nobody is checking whether you actually implemented anything.<br/>It doesn't give you proximity. You're watching from the stands, not playing on the field.<br/>It doesn't give you repetition. You see a post, nod your head, and forget it by lunch.<br/>It doesn't give you accountability. There's no one asking "did you do it?"`) +
    p(`The contractors who are actually scaling — the ones I showed you yesterday — they're not just consuming content. They're in a room. They're on calls. They're being pushed. They're implementing, reporting back, and getting coached on what's not working.`) +
    p(`That's the difference between information and transformation. And that difference is worth more than $497 a month.`) +
    p(`${link("See what's inside the Contractor Circle", CIRCLE_URL)}`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI know what you might be thinking: "I already follow Marshall on Instagram. I watch the videos. I downloaded the checklist. I'm getting what I need for free."\n\nAnd you're right — you are getting something. You're getting awareness. You're getting ideas. You're getting motivated for about 15 minutes while you scroll on the toilet.\n\nBut here's what free content does not give you:\n\nIt doesn't give you pressure. Nobody is checking whether you actually implemented anything.\nIt doesn't give you proximity. You're watching from the stands, not playing on the field.\nIt doesn't give you repetition. You see a post, nod your head, and forget it by lunch.\nIt doesn't give you accountability. There's no one asking "did you do it?"\n\nThe contractors who are actually scaling — the ones I showed you yesterday — they're not just consuming content. They're in a room. They're on calls. They're being pushed. They're implementing, reporting back, and getting coached on what's not working.\n\nThat's the difference between information and transformation. And that difference is worth more than $497 a month.\n\nSee what's inside the Contractor Circle: alpcontractorcircle.com\n\nMarshall`,
};

// Email 7 (Day 6): Handle "I don't have time / I'm not ready" objection
const EST_7: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 7,
  subject: (_fn) => `you don't need more time — you need structure`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`The number one thing I hear from contractors who don't join is: "I don't have time right now."`) +
    p(`I get it. You're buried. You're running jobs, chasing subs, answering calls, putting out fires, trying to get billing done, and somewhere in there you're supposed to also grow the business.`) +
    p(`But here's the thing: you don't have a time problem. You have a structure problem.`) +
    p(`The reason you don't have time is because everything runs through you. Every decision. Every problem. Every question. You're the bottleneck — and the bottleneck never has time.`) +
    p(`The guys who say "later" are almost never less busy later. They're the same level of buried six months from now, twelve months from now, three years from now. Because nothing changes until the system changes.`) +
    p(`Contractor Circle is two calls a month. 90 minutes each. Plus a Discord community and a template library you access on your own time. That's it. It's not a second job. It's the thing that makes your actual job stop eating you alive.`) +
    p(`You can keep saying "later." Or you can get in the room and start building the structure that gives you your time back.`) +
    p(`${link("Join the Contractor Circle", CIRCLE_URL + "/join")} — $497/mo. Founding rate locked while active. Cancel anytime.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThe number one thing I hear from contractors who don't join is: "I don't have time right now."\n\nI get it. You're buried. You're running jobs, chasing subs, answering calls, putting out fires, trying to get billing done, and somewhere in there you're supposed to also grow the business.\n\nBut here's the thing: you don't have a time problem. You have a structure problem.\n\nThe reason you don't have time is because everything runs through you. Every decision. Every problem. Every question. You're the bottleneck — and the bottleneck never has time.\n\nThe guys who say "later" are almost never less busy later. They're the same level of buried six months from now, twelve months from now, three years from now. Because nothing changes until the system changes.\n\nContractor Circle is two calls a month. 90 minutes each. Plus a Discord community and a template library you access on your own time. That's it. It's not a second job. It's the thing that makes your actual job stop eating you alive.\n\nYou can keep saying "later." Or you can get in the room and start building the structure that gives you your time back.\n\nJoin the Contractor Circle — $497/mo. Founding rate locked while active. Cancel anytime.\nalpcontractorcircle.com/join\n\nMarshall`,
};

// Email 8 (Day 8): Make the offer direct and concrete
const EST_8: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 8,
  subject: (_fn) => `what Contractor Circle actually does`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I've been talking about the Contractor Circle for a few days now. Let me just tell you exactly what it is and what you get.`) +
    p(`<strong>Bi-weekly live coaching calls</strong> — 90 minutes, every other Sunday at 5 PM ET. I teach frameworks, answer questions, and coach contractors through real problems in real time. These are not webinars. These are working sessions.`) +
    p(`<strong>Private Discord community</strong> — a room full of contractors who are actually building. Not lurkers. Not tire-kickers. Operators who share wins, ask hard questions, and hold each other accountable.`) +
    p(`<strong>Template &amp; framework library</strong> — estimating checklists, job costing sheets, org charts, sales scripts, SOPs, financial dashboards. Battle-tested tools from $2.5B in construction.`) +
    p(`<strong>Direct access to me</strong> — not a coaching assistant, not a community manager. Me. Marshall Wilkinson. The guy who's built this, lived this, and is still in the trenches every day.`) +
    p(`<strong>$497/month.</strong> Founding rate locks in as long as you're active. Cancel anytime. No contracts. No commitments beyond this month.`) +
    p(`The contractors in this room went from $600K to $20M, from $300K to $10M, from chaos to clarity. Not because they're smarter than you. Because they got in a room that forced better decisions.`) +
    p(`${link("Join the Contractor Circle", CIRCLE_URL + "/join")}`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI've been talking about the Contractor Circle for a few days now. Let me just tell you exactly what it is and what you get.\n\nBi-weekly live coaching calls — 90 minutes, every other Sunday at 5 PM ET. I teach frameworks, answer questions, and coach contractors through real problems in real time. These are not webinars. These are working sessions.\n\nPrivate Discord community — a room full of contractors who are actually building. Not lurkers. Not tire-kickers. Operators who share wins, ask hard questions, and hold each other accountable.\n\nTemplate & framework library — estimating checklists, job costing sheets, org charts, sales scripts, SOPs, financial dashboards. Battle-tested tools from $2.5B in construction.\n\nDirect access to me — not a coaching assistant, not a community manager. Me. Marshall Wilkinson. The guy who's built this, lived this, and is still in the trenches every day.\n\n$497/month. Founding rate locks in as long as you're active. Cancel anytime. No contracts. No commitments beyond this month.\n\nThe contractors in this room went from $600K to $20M, from $300K to $10M, from chaos to clarity. Not because they're smarter than you. Because they got in a room that forced better decisions.\n\nJoin the Contractor Circle: alpcontractorcircle.com/join\n\nMarshall`,
};

// Email 9 (Day 10): Final push with consequence framing
const EST_9: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 9,
  subject: (_fn) => `you already know enough`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`This is the last email in this series. I'm not going to pitch you again after this.`) +
    p(`Here's where I'll leave it:`) +
    p(`You downloaded the Estimating Checklist because something in your business isn't working the way you want it to. Maybe it's margins. Maybe it's volume. Maybe it's the feeling that you're working harder than you should be for what you're getting.`) +
    p(`I've shown you that estimating is just the surface. The real issue is deeper — it's how you run the business. And I've shown you that contractors who fix the system, not just the symptoms, get dramatically different results.`) +
    p(`You have two options from here:`) +
    p(`<strong>Option 1:</strong> Keep collecting free resources. Save the checklist. Maybe download another PDF next month. Watch some more Instagram content. Hope that eventually something clicks and the business starts running itself.`) +
    p(`<strong>Option 2:</strong> Get in a room with contractors who are actually building. Get on calls where someone pushes you. Get the systems, the frameworks, and the accountability that turns a contracting company into a real business.`) +
    p(`That room is the ${link("Contractor Circle", CIRCLE_URL + "/join")}. $497/mo. Founding rate locked. Cancel anytime.`) +
    p(`You either want to grow, or you want to stay where you are. I can't make that decision for you. But if you're ready, the door is open.`) +
    sigFull()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThis is the last email in this series. I'm not going to pitch you again after this.\n\nHere's where I'll leave it:\n\nYou downloaded the Estimating Checklist because something in your business isn't working the way you want it to. Maybe it's margins. Maybe it's volume. Maybe it's the feeling that you're working harder than you should be for what you're getting.\n\nI've shown you that estimating is just the surface. The real issue is deeper — it's how you run the business. And I've shown you that contractors who fix the system, not just the symptoms, get dramatically different results.\n\nYou have two options from here:\n\nOption 1: Keep collecting free resources. Save the checklist. Maybe download another PDF next month. Watch some more Instagram content. Hope that eventually something clicks and the business starts running itself.\n\nOption 2: Get in a room with contractors who are actually building. Get on calls where someone pushes you. Get the systems, the frameworks, and the accountability that turns a contracting company into a real business.\n\nThat room is the Contractor Circle. $497/mo. Founding rate locked. Cancel anytime.\n\nYou either want to grow, or you want to stay where you are. I can't make that decision for you. But if you're ready, the door is open.\n\nalpcontractorcircle.com/join\n\nMarshall Wilkinson\nFounder & CEO, ALP`,
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

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE 5: THREE SILOS FRAMEWORK SINGLE-DIPPERS (5 emails)
// ═══════════════════════════════════════════════════════════════════════════════

const TS_1: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, which silo is broken?`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`Hope you've had a chance to read through the Three Silos Framework. If you haven't yet, do it today — it's 5 pages and it will change how you think about your business.`) +
    p(`Here's the question I want you to sit with: which silo is your weakest?`) +
    p(`Most contractors I work with think their problem is "not enough work" — that's an Attention problem. But when I dig in, it's almost never that. It's usually a People problem disguised as a revenue problem. They can't scale because they can't delegate. They can't delegate because they don't have the right people. And they don't have the right people because nobody knows who they are.`) +
    p(`See how the silos connect? That's the flywheel. When one breaks, they all slow down.`) +
    p(`Go back to the diagnostic checklist on page 4. Be brutally honest. The boxes you can't check — that's where the real work is.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nHope you've had a chance to read through the Three Silos Framework. If you haven't yet, do it today — it's 5 pages and it will change how you think about your business.\n\nHere's the question I want you to sit with: which silo is your weakest?\n\nMost contractors I work with think their problem is "not enough work" — that's an Attention problem. But when I dig in, it's almost never that. It's usually a People problem disguised as a revenue problem.\n\nGo back to the diagnostic checklist on page 4. Be brutally honest. The boxes you can't check — that's where the real work is.\n\nMarshall`,
};

const TS_2: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 2,
  subject: (_fn) => `The $6M contractor who couldn't leave for a week`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I worked with a contractor doing $6M a year. Profitable on paper. But he couldn't take a week off without the whole thing falling apart.`) +
    p(`His Attention silo was strong — he had a reputation, referrals came in. His People silo was decent — good crews, loyal guys. But his Process silo was nonexistent. Nothing was documented. Nothing was systematized. Every decision ran through him.`) +
    p(`He was the bottleneck. And he didn't even realize it because he was too busy being the bottleneck.`) +
    p(`We spent 90 days building three things: a documented estimating process, a project handoff system, and a weekly accountability rhythm. That's it. Three processes.`) +
    p(`Within 6 months he took two weeks off and revenue didn't dip. Within a year he was at $9M. Not because he worked harder — because the system worked without him.`) +
    p(`That's what Process does. It's the silo that sets you free.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI worked with a contractor doing $6M a year. Profitable on paper. But he couldn't take a week off without the whole thing falling apart.\n\nHis Process silo was nonexistent. Nothing was documented. Every decision ran through him.\n\nWe spent 90 days building three things: a documented estimating process, a project handoff system, and a weekly accountability rhythm.\n\nWithin 6 months he took two weeks off and revenue didn't dip. Within a year he was at $9M.\n\nThat's what Process does. It's the silo that sets you free.\n\nMarshall`,
};

const TS_3: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 3,
  subject: (_fn) => `"We don't need marketing — we get all our work from referrals"`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I hear this constantly. And every time I hear it, I know exactly what's going to happen next.`) +
    p(`Referrals dry up. A big client moves on. The phone stops ringing for two months. And suddenly you're scrambling, cutting prices, taking bad jobs just to keep the lights on.`) +
    p(`Referrals are great. But they're not a system. They're a byproduct of doing good work — and they're completely outside your control.`) +
    p(`The Attention silo isn't about running ads or posting on social media. It's about building a predictable, repeatable way to generate interest in your company. So that when referrals slow down — and they will — you're not starting from zero.`) +
    p(`The data backs this up: 35% of business failures come from having no market demand. Translation: nobody knew they existed.`) +
    p(`You don't need to become a marketing guru. You need one consistent channel that works. That's it.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI hear this constantly: "We don't need marketing — we get all our work from referrals."\n\nReferrals are great. But they're not a system. They're completely outside your control.\n\nThe Attention silo isn't about running ads. It's about building a predictable way to generate interest. So when referrals slow down, you're not starting from zero.\n\n35% of business failures come from having no market demand. Translation: nobody knew they existed.\n\nYou don't need to become a marketing guru. You need one consistent channel that works.\n\nMarshall`,
};

const TS_4: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 4,
  subject: (_fn) => `The flywheel is either spinning or it's not`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`By now you've had the Three Silos Framework for about a week. Let me ask you something direct:`) +
    p(`Is your flywheel spinning?`) +
    p(`More Attention brings more revenue and attracts better talent. Better People deliver a superior product and build more effective processes. Stronger Processes create the capacity to handle more attention and onboard more people. And the cycle repeats.`) +
    p(`If any one of those three is broken, the whole thing stalls. And here's what most people don't realize: you can't fix all three at once. You pick the weakest one and you fix that first.`) +
    p(`If nobody knows you exist → fix Attention.`) +
    p(`If you can't keep good people → fix People.`) +
    p(`If everything depends on you → fix Process.`) +
    p(`One silo. One quarter. Full focus. That's how you get the flywheel moving.`) +
    sig()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nIs your flywheel spinning?\n\nMore Attention → Better People → Stronger Processes → cycle repeats.\n\nIf any one is broken, the whole thing stalls. You can't fix all three at once. Pick the weakest one first.\n\nIf nobody knows you exist → fix Attention.\nIf you can't keep good people → fix People.\nIf everything depends on you → fix Process.\n\nOne silo. One quarter. Full focus.\n\nMarshall`,
};

const TS_5: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 5,
  subject: (_fn) => `Last thing from me on this`,
  buildHtml: (fn) => wrapEmail(
    p(`Hey ${fn} —`) +
    p(`I've sent you a few emails since you downloaded the Three Silos Framework. I hope they've been useful. This is the last one in this series.`) +
    p(`Here's what I know after $2.5 billion in construction: the contractors who win aren't the ones with the most talent, the best equipment, or the lowest prices. They're the ones who build a system that works without them.`) +
    p(`Attention. People. Process. That's the whole game.`) +
    p(`If you're ready to stop being the bottleneck and actually build the system, I've got two ways to help:`) +
    p(`<strong>The Contractor Circle</strong> — live coaching, battle-tested frameworks, and a community of operators who are actually building. $497/mo, founding rate locked forever.`) +
    p(link("alpcontractorcircle.com", CIRCLE_URL)) +
    p(`Or reply to this email and tell me what you're working on. I read every reply.`) +
    p(`The only thing that matters to me is that you win.`) +
    sigFull()
  ),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI've sent you a few emails since you downloaded the Three Silos Framework. I hope they've been useful. This is the last one in this series.\n\nHere's what I know after $2.5 billion in construction: the contractors who win aren't the ones with the most talent, the best equipment, or the lowest prices. They're the ones who build a system that works without them.\n\nAttention. People. Process. That's the whole game.\n\nIf you're ready to stop being the bottleneck:\n\nThe Contractor Circle — live coaching, battle-tested frameworks, $497/mo founding rate locked forever.\nalpcontractorcircle.com\n\nOr reply to this email and tell me what you're working on. I read every reply.\n\nMarshall Wilkinson\nFounder & CEO, ALP`,
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const ALL_DRIP_EMAILS: DripEmailDef[] = [
  EST_1, EST_2, EST_3, EST_4, EST_5, EST_6, EST_7, EST_8, EST_9,
  Q1Q2_1, Q1Q2_2, Q1Q2_3, Q1Q2_4, Q1Q2_5,
  TS_1, TS_2, TS_3, TS_4, TS_5,
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
  // Estimating: Day 0, 1, 1, 1, 1, 1, 1, 2, 2 (daily for 7, then spaced)
  estimating_single: [0, 1, 1, 1, 1, 1, 1, 2, 2, 2], // Day 0,1,2,3,4,5,6,8,10
  q1q2_single: [0, 2, 2, 3, 3, 4],       // same
  three_silos_single: [0, 2, 2, 3, 3, 4], // Day 0, 2, 4, 7, 10, 14
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
