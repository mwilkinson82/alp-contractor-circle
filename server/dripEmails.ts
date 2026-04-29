/**
 * Drip Campaign Email Templates
 * 
 * 5 sequences × up to 9 emails each = 36 total emails
 * Elevated personal style — Georgia serif, 15px, subtle brand touches.
 * Looks like a personal email from a high-end executive, not a marketing blast.
 */

import { Resend } from "resend";
import { generateUnsubscribeUrl } from "./unsubscribe";
import {
  buildCCEmail,
  buildCCSimpleEmail,
  p, pShort, pMuted, b, gold, link, sig, sigFull,
  bulletList, offerItem, pullQuoteModule, heroModule, bodyModule, ctaModule,
} from "./emailTemplate";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = "Marshall Wilkinson | ALP <marshall@notifications.marshallwilkinson.com>";
const CIRCLE_URL = "https://alpcontractorcircle.com";

// ─── Backward-compat wrapper for non-estimating sequences ────────────────────
// These will be migrated to the new CC template in a future pass.
function wrapEmail(bodyContent: string): string {
  return buildCCSimpleEmail({ bodyHtml: bodyContent });
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
// ─── Estimating Sequence (Marshall's revised copy — April 2026) ─────────

const ESTIMATING_PDF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Construction_Estimating_Checklist_8888fab8.pdf";
const Q2_PDF_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Q1_Q2_Framework_ALP_Contractor_Circle_8578e990.pdf";
const THREE_SILOS_PDF_URL = "https://alpcontractorcircle.com/manus-storage/ALP_Three_Silos_Framework_v3_fixed_1add3fd9.pdf";

const EST_1: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, your checklist is ready`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "Use this on your last estimate before you use it on your next one.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Your Estimating Checklist is ready.`) +
      ctaModule({ headline: "Download Your Checklist", subtext: "The Estimator's Checklist — use it on your last estimate before you use it on your next one.", buttonText: "DOWNLOAD CHECKLIST →", buttonUrl: ESTIMATING_PDF_URL }) +
      p(`But before you file it away, I need to tell you something most people won't.`) +
      p(`The reason most contractors lose money on jobs is not because they can't estimate.`) +
      p(`It's because they estimate casually.`) +
      pShort(`They pull numbers from memory.`) +
      pShort(`They skip exclusions.`) +
      pShort(`They don't scope-level subs.`) +
      pShort(`They round down because they're afraid of losing the bid.`) +
      pShort(`They forget general conditions.`) +
      p(`They trust assumptions that should have been verified.`) +
      p(`Then they wonder why they're working 60-hour weeks with less profit than they expected.`) +
      p(`This checklist exists to force discipline into the estimating process.`) +
      p(`Here's what I want you to do:`) +
      p(`Do ${b("not")} wait for your next bid.`) +
      p(`Pull up your last estimate — the one you already submitted — and run it against the checklist.`) +
      pShort(`See what you missed.`) +
      pShort(`See where you guessed.`) +
      p(`See where the money may have leaked before the job even started.`) +
      p(`That exercise alone will tell you more about your business than another YouTube video ever will.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nYour Estimating Checklist is ready.\n\nDownload it here: ${ESTIMATING_PDF_URL}\n\nBut before you file it away, I need to tell you something most people won't.\n\nThe reason most contractors lose money on jobs is not because they can't estimate.\n\nIt's because they estimate casually.\n\nThey pull numbers from memory.\nThey skip exclusions.\nThey don't scope-level subs.\nThey round down because they're afraid of losing the bid.\nThey forget general conditions.\nThey trust assumptions that should have been verified.\n\nThen they wonder why they're working 60-hour weeks with less profit than they expected.\n\nThis checklist exists to force discipline into the estimating process.\n\nHere's what I want you to do:\n\nDo not wait for your next bid.\n\nPull up your last estimate — the one you already submitted — and run it against the checklist.\n\nSee what you missed.\nSee where you guessed.\nSee where the money may have leaked before the job even started.\n\nThat exercise alone will tell you more about your business than another YouTube video ever will.\n\nMarshall`,
};

const EST_2: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 2,
  subject: (_fn) => `your estimate is leaking margin`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "The expensive mistakes usually hide in the assumptions.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Quick question:`) +
      p(`On your last bid, how many numbers did you price from memory?`) +
      p(`Be honest.`) +
      p(`I'm not judging. I'm diagnosing.`) +
      p(`Because here's what happens when you estimate from memory:`) +
      pShort(`You use numbers from the last job.`) +
      pShort(`You round labor hours.`) +
      pShort(`You assume the sub included something they did not.`) +
      pShort(`You skip general conditions because "we'll figure that out."`) +
      pShort(`You forget mobilization.`) +
      pShort(`You underprice supervision.`) +
      p(`You fail to account for site restrictions, weather, staging, access, or schedule constraints.`) +
      p(`Every one of those shortcuts is margin leakage.`) +
      p(`Not always dramatic.`) +
      p(`Usually slow.`) +
      p(`Invisible.`) +
      p(`Death by a thousand cuts.`) +
      p(`The kind where the job finishes and you say:`) +
      p(`"We made money… but we should have made more."`) +
      p(`That money usually disappeared in the gap between what you assumed and what actually happened.`) +
      p(`So today, do this:`) +
      p(`Open the checklist and run your last bid against these sections:`) +
      bulletList([
        "Exclusions &amp; Clarifications",
        "Subcontractor Management",
        "General Conditions",
        "Escalation &amp; Market Conditions",
        "Estimate Review Meeting Protocol",
      ]) +
      p(`I promise you'll find something.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nQuick question:\n\nOn your last bid, how many numbers did you price from memory?\n\nBe honest.\n\nI'm not judging. I'm diagnosing.\n\nBecause here's what happens when you estimate from memory:\n\nYou use numbers from the last job.\nYou round labor hours.\nYou assume the sub included something they did not.\nYou skip general conditions because "we'll figure that out."\nYou forget mobilization.\nYou underprice supervision.\nYou fail to account for site restrictions, weather, staging, access, or schedule constraints.\n\nEvery one of those shortcuts is margin leakage.\n\nNot always dramatic.\n\nUsually slow.\n\nInvisible.\n\nDeath by a thousand cuts.\n\nThe kind where the job finishes and you say:\n\n"We made money… but we should have made more."\n\nThat money usually disappeared in the gap between what you assumed and what actually happened.\n\nSo today, do this:\n\nOpen the checklist and run your last bid against these sections:\n\n• Exclusions & Clarifications\n• Subcontractor Management\n• General Conditions\n• Escalation & Market Conditions\n• Estimate Review Meeting Protocol\n\nI promise you'll find something.\n\nMarshall`,
};

const EST_3: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 3,
  subject: (_fn) => `this is not just an estimating issue`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "Your estimate is usually the first place the deeper problem shows up.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`I want to be straight with you.`) +
      p(`If your estimating is sloppy, estimating is probably not the only sloppy part of the business.`) +
      p(`That sounds harsh, but it's true.`) +
      p(`When I work with contractors, I rarely find that estimating is an isolated issue.`) +
      p(`It is usually a symptom.`) +
      p(`If a contractor is estimating from memory, they are usually also:`) +
      pShort(`Selling without a real process.`) +
      pShort(`Handing off jobs without a formal turnover.`) +
      pShort(`Running projects without weekly cost tracking.`) +
      pShort(`Billing late because nobody owns the schedule of values.`) +
      pShort(`Managing people through conversations instead of accountability.`) +
      p(`Trying to scale with everything still trapped in the owner's head.`) +
      p(`The estimate is just where the cracks show first because that's where the money enters the business.`) +
      p(`But the same lack of discipline that creates a weak estimate usually shows up everywhere else.`) +
      p(`Here's a quick diagnostic:`) +
      pShort(`Do you have a documented sales process?`) +
      pShort(`Do your PMs get a formal handoff with estimate backup?`) +
      pShort(`Do you track job costs weekly against the estimate?`) +
      pShort(`Do you have a standard estimate review meeting before bid day?`) +
      p(`Is your billing current, or are you always chasing money?`) +
      p(`If you answered "no" to more than one of those, the checklist will help.`) +
      p(`But the checklist is not enough.`) +
      p(`Because the real issue is not the document.`) +
      p(`The real issue is the operating system behind it.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI want to be straight with you.\n\nIf your estimating is sloppy, estimating is probably not the only sloppy part of the business.\n\nThat sounds harsh, but it's true.\n\nWhen I work with contractors, I rarely find that estimating is an isolated issue.\n\nIt is usually a symptom.\n\nIf a contractor is estimating from memory, they are usually also:\n\nSelling without a real process.\nHanding off jobs without a formal turnover.\nRunning projects without weekly cost tracking.\nBilling late because nobody owns the schedule of values.\nManaging people through conversations instead of accountability.\nTrying to scale with everything still trapped in the owner's head.\n\nThe estimate is just where the cracks show first because that's where the money enters the business.\n\nBut the same lack of discipline that creates a weak estimate usually shows up everywhere else.\n\nHere's a quick diagnostic:\n\nDo you have a documented sales process?\nDo your PMs get a formal handoff with estimate backup?\nDo you track job costs weekly against the estimate?\nDo you have a standard estimate review meeting before bid day?\nIs your billing current, or are you always chasing money?\n\nIf you answered "no" to more than one of those, the checklist will help.\n\nBut the checklist is not enough.\n\nBecause the real issue is not the document.\n\nThe real issue is the operating system behind it.\n\nMarshall`,
};

const EST_4: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 4,
  subject: (_fn) => `why most contractors stay stuck`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "They keep looking for one tool when they need the whole machine.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`I've worked with hundreds of contractors.`) +
      p(`I've been involved in over $2.5 billion in construction.`) +
      p(`And I can tell you one of the biggest reasons contractors stay stuck:`) +
      p(`They keep looking for ${b("one thing")}.`) +
      pShort(`One better spreadsheet.`) +
      pShort(`One better estimator.`) +
      pShort(`One new software.`) +
      pShort(`One new hire.`) +
      pShort(`One YouTube trick.`) +
      p(`One template that will finally fix the mess.`) +
      p(`And sometimes, that one thing helps for a week.`) +
      p(`Maybe two.`) +
      p(`Then the same problems come back.`) +
      p(`Because the problem was never just the tool.`) +
      p(`The problem is that there is no operating system.`) +
      p(`An operating system is the full machine:`) +
      pShort(`How you sell.`) +
      pShort(`How you estimate.`) +
      pShort(`How you hand off.`) +
      pShort(`How you manage jobs.`) +
      pShort(`How you track money.`) +
      pShort(`How you hold people accountable.`) +
      pShort(`How you make decisions.`) +
      p(`How you review performance every single week.`) +
      p(`That is what Contractor Circle is built around.`) +
      p(`Not one checklist.`) +
      p(`The full system.`) +
      pShort(`Live calls.`) +
      pShort(`Monthly implementation bootcamps.`) +
      pShort(`Templates.`) +
      pShort(`Replays.`) +
      pShort(`Private Discord.`) +
      pShort(`Real contractor conversations.`) +
      p(`Direct access to my thinking.`) +
      p(`The Estimating Checklist is a piece.`) +
      p(`Contractor Circle is where the pieces get connected.`) +
      p(`When you're ready to stop collecting tools and start building the machine, go here:`) +
      sig(),
    pullQuote: "The checklist is the tool. Contractor Circle is the operating system.",
    cta: {
      headline: "Ready to build the machine?",
      buttonText: "JOIN CONTRACTOR CIRCLE →",
    },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI've worked with hundreds of contractors.\n\nI've been involved in over $2.5 billion in construction.\n\nAnd I can tell you one of the biggest reasons contractors stay stuck:\n\nThey keep looking for one thing.\n\nOne better spreadsheet.\nOne better estimator.\nOne new software.\nOne new hire.\nOne YouTube trick.\nOne template that will finally fix the mess.\n\nAnd sometimes, that one thing helps for a week.\n\nMaybe two.\n\nThen the same problems come back.\n\nBecause the problem was never just the tool.\n\nThe problem is that there is no operating system.\n\nAn operating system is the full machine:\n\nHow you sell.\nHow you estimate.\nHow you hand off.\nHow you manage jobs.\nHow you track money.\nHow you hold people accountable.\nHow you make decisions.\nHow you review performance every single week.\n\nThat is what Contractor Circle is built around.\n\nNot one checklist.\n\nThe full system.\n\nLive calls.\nMonthly implementation bootcamps.\nTemplates.\nReplays.\nPrivate Discord.\nReal contractor conversations.\nDirect access to my thinking.\n\nThe Estimating Checklist is a piece.\n\nContractor Circle is where the pieces get connected.\n\nWhen you're ready to stop collecting tools and start building the machine, go here:\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const EST_5: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 5,
  subject: (_fn) => `real contractors, real movement`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "This is what happens when contractors stop guessing and start operating.",
    hero: {
      eyebrow: "REAL RESULTS",
      headline: "Real contractors, real movement.",
      subheadline: "This is what happens when contractors stop guessing and start operating with structure.",
    },
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`I don't want to sell you theory.`) +
      p(`I want to show you the kind of movement that becomes possible when a contractor stops guessing and starts operating with structure.`) +
      p(`Inside my ecosystem, I've worked with contractors who made serious jumps:`) +
      pShort(`CNY Group moved from roughly ${b("$600K to $20M")}.`) +
      pShort(`Trojan Roofing moved from roughly ${b("$300K to $10M")}.`) +
      pShort(`Davis Contracting moved from roughly ${b("$1M to $4M")}.`) +
      pShort(`Sage Construction reached roughly ${b("$2M in their first year")}.`) +
      p(`ARC Construction Group reached roughly ${b("$2M")}.`) +
      p(`Now listen carefully.`) +
      p(`Those results did not happen because someone downloaded a PDF and magically transformed their company.`) +
      p(`They happened because the owner started operating differently.`) +
      pShort(`Better decisions.`) +
      pShort(`Better structure.`) +
      pShort(`Better accountability.`) +
      pShort(`Better systems.`) +
      p(`Better standards.`) +
      p(`That is the difference between information and implementation.`) +
      p(`The checklist you downloaded is valuable.`) +
      p(`But the real leverage is what happens when you bring the business into a live environment where the numbers, systems, people, processes, and decisions are under pressure.`) +
      p(`That environment is Contractor Circle.`) +
      sig(),
    cta: {
      headline: "See what's inside",
      subtext: "$497/month.<br/>Founding rate locked while active. Cancel anytime.",
      buttonText: "JOIN CONTRACTOR CIRCLE →",
    },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI don't want to sell you theory.\n\nI want to show you the kind of movement that becomes possible when a contractor stops guessing and starts operating with structure.\n\nInside my ecosystem, I've worked with contractors who made serious jumps:\n\nCNY Group moved from roughly $600K to $20M.\nTrojan Roofing moved from roughly $300K to $10M.\nDavis Contracting moved from roughly $1M to $4M.\nSage Construction reached roughly $2M in their first year.\nARC Construction Group reached roughly $2M.\n\nNow listen carefully.\n\nThose results did not happen because someone downloaded a PDF and magically transformed their company.\n\nThey happened because the owner started operating differently.\n\nBetter decisions.\nBetter structure.\nBetter accountability.\nBetter systems.\nBetter standards.\n\nThat is the difference between information and implementation.\n\nThe checklist you downloaded is valuable.\n\nBut the real leverage is what happens when you bring the business into a live environment where the numbers, systems, people, processes, and decisions are under pressure.\n\nThat environment is Contractor Circle.\n\nIf you want to see what is inside and claim founding access, go here:\n\nhttps://alpcontractorcircle.com/join\n\n$497/month.\nFounding rate locked while active.\nCancel anytime.\n\nMarshall`,
};

const EST_6: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 6,
  subject: (_fn) => `free content won't fix this`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "Watching me is not the same thing as working inside the room.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`I know what you might be thinking.`) +
      pShort(`"I already follow Marshall on Instagram."`) +
      pShort(`"I watch the videos."`) +
      pShort(`"I downloaded the checklist."`) +
      p(`"I'm getting what I need for free."`) +
      p(`And you are getting something.`) +
      pShort(`You are getting awareness.`) +
      pShort(`You are getting ideas.`) +
      pShort(`You are getting moments of clarity.`) +
      p(`You are getting the occasional punch in the face when a reel tells the truth.`) +
      p(`But free content has limits.`) +
      p(`It does not give you pressure.<br/>Nobody is checking whether you implemented.`) +
      p(`It does not give you proximity.<br/>You are watching from the stands, not working inside the room.`) +
      p(`It does not give you repetition.<br/>You see a post, nod your head, and forget it by lunch.`) +
      p(`It does not give you accountability.<br/>There is no one asking, "Did you actually do it?"`) +
      p(`The contractors who change are not just consuming content.`) +
      p(`They are in a room.`) +
      pShort(`They are bringing real problems.`) +
      pShort(`They are asking real questions.`) +
      pShort(`They are being challenged.`) +
      pShort(`They are installing systems.`) +
      p(`They are getting around other contractors who are trying to build real companies.`) +
      p(`That is what Contractor Circle is.`) +
      p(`Free content is the doorway.`) +
      p(`Contractor Circle is the room.`) +
      p(`If you are ready for the room, go here:`) +
      sig(),
    pullQuote: "You are watching from the stands, not working inside the room.",
    cta: {
      headline: "Ready for the room?",
      buttonText: "JOIN CONTRACTOR CIRCLE →",
    },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI know what you might be thinking.\n\n"I already follow Marshall on Instagram."\n"I watch the videos."\n"I downloaded the checklist."\n"I'm getting what I need for free."\n\nAnd you are getting something.\n\nYou are getting awareness.\nYou are getting ideas.\nYou are getting moments of clarity.\nYou are getting the occasional punch in the face when a reel tells the truth.\n\nBut free content has limits.\n\nIt does not give you pressure.\nNobody is checking whether you implemented.\n\nIt does not give you proximity.\nYou are watching from the stands, not working inside the room.\n\nIt does not give you repetition.\nYou see a post, nod your head, and forget it by lunch.\n\nIt does not give you accountability.\nThere is no one asking, "Did you actually do it?"\n\nThe contractors who change are not just consuming content.\n\nThey are in a room.\n\nThey are bringing real problems.\nThey are asking real questions.\nThey are being challenged.\nThey are installing systems.\nThey are getting around other contractors who are trying to build real companies.\n\nThat is what Contractor Circle is.\n\nFree content is the doorway.\n\nContractor Circle is the room.\n\nIf you are ready for the room, go here:\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const EST_7: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 7,
  subject: (_fn) => `you don't need more time — you need structure`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "Busy is not a strategy.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`The number one thing contractors say before they avoid the thing they need is:`) +
      p(`"I don't have time right now."`) +
      p(`I get it.`) +
      p(`You are buried.`) +
      pShort(`Running jobs.`) +
      pShort(`Chasing subs.`) +
      pShort(`Answering calls.`) +
      pShort(`Pricing work.`) +
      pShort(`Solving field problems.`) +
      pShort(`Trying to get billing done.`) +
      pShort(`Trying to keep customers happy.`) +
      p(`Trying to grow the business while the business eats your day alive.`) +
      p(`But here is the truth:`) +
      p(`Most contractors do not have a time problem.`) +
      p(`They have a structure problem.`) +
      p(`The reason you do not have time is because everything runs through you.`) +
      pShort(`Every decision.`) +
      pShort(`Every question.`) +
      pShort(`Every issue.`) +
      pShort(`Every fire.`) +
      p(`Every exception.`) +
      p(`You are the bottleneck.`) +
      p(`And the bottleneck never has time.`) +
      p(`That is why saying "later" usually does nothing.`) +
      p(`Six months later, the same contractor is still buried.`) +
      p(`Twelve months later, same problems.`) +
      p(`Three years later, same patterns — just with more revenue and more stress.`) +
      p(`Contractor Circle is not a second job.`) +
      p(`It is the room that helps you build the structure so your real job stops eating you alive.`) +
      pShort(`Live calls.`) +
      pShort(`Monthly bootcamps.`) +
      pShort(`Discord.`) +
      pShort(`Templates.`) +
      pShort(`Replays.`) +
      p(`A serious contractor environment.`) +
      p(`If this is relevant, trust that.`) +
      sig(),
    cta: {
      subtext: "$497/month.<br/>Founding rate locked while active. Cancel anytime.",
      buttonText: "JOIN CONTRACTOR CIRCLE →",
    },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThe number one thing contractors say before they avoid the thing they need is:\n\n"I don't have time right now."\n\nI get it.\n\nYou are buried.\n\nRunning jobs.\nChasing subs.\nAnswering calls.\nPricing work.\nSolving field problems.\nTrying to get billing done.\nTrying to keep customers happy.\nTrying to grow the business while the business eats your day alive.\n\nBut here is the truth:\n\nMost contractors do not have a time problem.\n\nThey have a structure problem.\n\nThe reason you do not have time is because everything runs through you.\n\nEvery decision.\nEvery question.\nEvery issue.\nEvery fire.\nEvery exception.\n\nYou are the bottleneck.\n\nAnd the bottleneck never has time.\n\nThat is why saying "later" usually does nothing.\n\nSix months later, the same contractor is still buried.\n\nTwelve months later, same problems.\n\nThree years later, same patterns — just with more revenue and more stress.\n\nContractor Circle is not a second job.\n\nIt is the room that helps you build the structure so your real job stops eating you alive.\n\nLive calls.\nMonthly bootcamps.\nDiscord.\nTemplates.\nReplays.\nA serious contractor environment.\n\n$497/month.\nFounding rate locked while active.\nCancel anytime.\n\nIf this is relevant, trust that.\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const EST_8: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 8,
  subject: (_fn) => `what Contractor Circle actually is`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "Here is exactly what you are joining.",
    hero: {
      eyebrow: "THE OFFER",
      headline: "What Contractor Circle actually is.",
      subheadline: "A live implementation environment for contractors who want to scale with more control, sharper decisions, and stronger systems.",
    },
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Let me make this very clear.`) +
      p(`Contractor Circle is not just "a community."`) +
      p(`That word is too soft for what this is.`) +
      p(`Contractor Circle is a live implementation environment for contractors who want to scale with more control, sharper decisions, and stronger systems.`) +
      p(`Here is what you get:`) +
      offerItem("Bi-weekly live calls with me", "Real teaching, real questions, real business problems, real-time direction.") +
      offerItem("Monthly implementation bootcamps", "Deep work on the systems that actually move a contracting company forward.") +
      offerItem("Private Discord community", "A room full of contractors asking questions, sharing wins, solving issues, and staying close to the work.") +
      offerItem("Template and framework library", "Estimating tools, operating documents, SOPs, meeting structures, scorecards, frameworks, and business-building resources.") +
      offerItem("Replay library", "If you miss a call or want to revisit a framework, the work is organized and available.") +
      offerItem("Direct access to my thinking", "Not a generic business coach. Not theory. Construction operating experience applied to real contractor problems.") +
      p(`The price is simple:`) +
      p(`${b("$497/month.")}`) +
      p(`Founding rate locked while active.`) +
      p(`Cancel anytime.`) +
      p(`No long-term contract.`) +
      p(`If one better estimate, one better hire, one better process, or one better decision can create thousands — or tens of thousands — in value, then $497/month is not the risk.`) +
      p(`Staying loose is the risk.`) +
      p(`If you are ready, join here:`) +
      sig(),
    cta: {
      headline: "The door is open.",
      subtext: "$497/month. Founding rate locked while active. Cancel anytime.",
      buttonText: "JOIN CONTRACTOR CIRCLE →",
    },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nLet me make this very clear.\n\nContractor Circle is not just "a community."\n\nThat word is too soft for what this is.\n\nContractor Circle is a live implementation environment for contractors who want to scale with more control, sharper decisions, and stronger systems.\n\nHere is what you get:\n\nBi-weekly live calls with me\nReal teaching, real questions, real business problems, real-time direction.\n\nMonthly implementation bootcamps\nDeep work on the systems that actually move a contracting company forward.\n\nPrivate Discord community\nA room full of contractors asking questions, sharing wins, solving issues, and staying close to the work.\n\nTemplate and framework library\nEstimating tools, operating documents, SOPs, meeting structures, scorecards, frameworks, and business-building resources.\n\nReplay library\nIf you miss a call or want to revisit a framework, the work is organized and available.\n\nDirect access to my thinking\nNot a generic business coach. Not theory. Construction operating experience applied to real contractor problems.\n\nThe price is simple:\n\n$497/month.\n\nFounding rate locked while active.\n\nCancel anytime.\n\nNo long-term contract.\n\nIf one better estimate, one better hire, one better process, or one better decision can create thousands — or tens of thousands — in value, then $497/month is not the risk.\n\nStaying loose is the risk.\n\nIf you are ready, join here:\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const EST_9: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 9,
  subject: (_fn) => `you already know enough`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "At some point, the issue is no longer information. It is decision.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`This is the last email in this sequence.`) +
      p(`So I'll leave it plain.`) +
      p(`You probably do not need another free resource.`) +
      p(`You probably do not need another saved reel.`) +
      p(`You probably do not need another moment where you say, "That's so true," and then go right back to the same patterns.`) +
      p(`You downloaded the Estimating Checklist because some part of you knows the business needs to tighten up.`) +
      pShort(`Maybe it's margin.`) +
      pShort(`Maybe it's estimating.`) +
      pShort(`Maybe it's people.`) +
      pShort(`Maybe it's process.`) +
      p(`Maybe it's the fact that everything still depends too heavily on you.`) +
      p(`Whatever it is, the issue is probably not lack of information.`) +
      p(`The issue is decision.`) +
      p(`You have two options.`) +
      p(`${b("Option 1:")}<br/>Keep collecting free tools. Save the checklist. Watch more content. Download another PDF. Hope that eventually the business starts operating differently.`) +
      p(`${b("Option 2:")}<br/>Get in the room. Bring the real business under pressure. Install the systems, frameworks, accountability, and operating rhythm that help contractors stop guessing.`) +
      p(`That room is Contractor Circle.`) +
      p(`If not, no problem.`) +
      p(`Use the checklist.`) +
      p(`Tighten the estimate.`) +
      p(`Keep watching the content.`) +
      p(`But if you are ready for the full operating system, you know the next move.`) +
      sigFull(),
    pullQuote: "You either want to grow, or you want to stay where you are.",
    cta: {
      headline: "The door is here.",
      subtext: "$497/month. Founding rate locked while active. Cancel anytime.",
      buttonText: "JOIN CONTRACTOR CIRCLE →",
    },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThis is the last email in this sequence.\n\nSo I'll leave it plain.\n\nYou probably do not need another free resource.\n\nYou probably do not need another saved reel.\n\nYou probably do not need another moment where you say, "That's so true," and then go right back to the same patterns.\n\nYou downloaded the Estimating Checklist because some part of you knows the business needs to tighten up.\n\nMaybe it's margin.\nMaybe it's estimating.\nMaybe it's people.\nMaybe it's process.\nMaybe it's the fact that everything still depends too heavily on you.\n\nWhatever it is, the issue is probably not lack of information.\n\nThe issue is decision.\n\nYou have two options.\n\nOption 1:\nKeep collecting free tools. Save the checklist. Watch more content. Download another PDF. Hope that eventually the business starts operating differently.\n\nOption 2:\nGet in the room. Bring the real business under pressure. Install the systems, frameworks, accountability, and operating rhythm that help contractors stop guessing.\n\nThat room is Contractor Circle.\n\n$497/month.\nFounding rate locked while active.\nCancel anytime.\n\nIf you are ready, the door is here:\n\nhttps://alpcontractorcircle.com/join\n\nIf not, no problem.\n\nUse the checklist.\n\nTighten the estimate.\n\nKeep watching the content.\n\nBut if you are ready for the full operating system, you know the next move.\n\nMarshall Wilkinson\nFounder, ALP`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE 2: Q1/Q2 FRAMEWORK → CONTRACTOR CIRCLE (9 emails)
// Strategy: Quarter exposed something — truth, correction, momentum, stop repeating
// Cadence: Day 0,1,2,3,4,5,6,8,10 (daily for 7, then spaced)
// ═══════════════════════════════════════════════════════════════════════════════

const Q1Q2_1: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, your framework is here`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "The quarter already told you what is working and what is broken.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Your Q1/Q2 Framework is ready.`) +
      ctaModule({ headline: "Download Your Framework", subtext: "The Q1/Q2 Framework — use it to diagnose what the quarter actually told you.", buttonText: "DOWNLOAD FRAMEWORK →", buttonUrl: Q2_PDF_URL }) +
      p(`You downloaded this because the quarter gave you information.`) +
      p(`Maybe not the information you wanted.`) +
      p(`But information.`) +
      p(`That is what most contractors miss.`) +
      p(`They treat the end of a quarter like a calendar event.`) +
      p(`It is not.`) +
      p(`It is a diagnostic event.`) +
      p(`Q1 gave you data.`) +
      p(`Q2 demands a decision.`) +
      pShort(`What worked?`) +
      pShort(`What stalled?`) +
      pShort(`What got ignored?`) +
      pShort(`What should have been killed?`) +
      pShort(`What should have been doubled down on?`) +
      p(`What system stayed broken because nobody forced the correction?`) +
      p(`That is what this framework is for.`) +
      p(`Not motivation.`) +
      p(`Not theory.`) +
      p(`Correction.`) +
      p(`Read it honestly.`) +
      p(`Not like content.`) +
      p(`Like a mirror.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nYour Q1/Q2 Framework is ready.\n\nDownload it here: ${Q2_PDF_URL}\n\nYou downloaded this because the quarter gave you information.\n\nMaybe not the information you wanted.\nBut information.\n\nThat is what most contractors miss.\n\nThey treat the end of a quarter like a calendar event.\nIt is not.\nIt is a diagnostic event.\n\nQ1 gave you data.\nQ2 demands a decision.\n\nWhat worked?\nWhat stalled?\nWhat got ignored?\nWhat should have been killed?\nWhat should have been doubled down on?\nWhat system stayed broken because nobody forced the correction?\n\nThat is what this framework is for.\n\nNot motivation.\nNot theory.\nCorrection.\n\nRead it honestly.\nNot like content.\nLike a mirror.\n\nMarshall`,
};

const Q1Q2_2: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 2,
  subject: (_fn) => `the quarter told on you`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "The numbers are usually clearer than the story you are telling yourself.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Most owners do not need more optimism.`) +
      p(`They need a more honest scorecard.`) +
      p(`The quarter already exposed a lot:`) +
      pShort(`where the bottlenecks are`) +
      pShort(`which priorities were fake`) +
      pShort(`which systems are weak`) +
      pShort(`which people are carrying weight`) +
      pShort(`which people are not`) +
      pShort(`what the market responded to`) +
      p(`what it ignored`) +
      p(`The problem is not usually lack of data.`) +
      p(`The problem is that most business owners reinterpret the data in a way that protects their ego.`) +
      p(`They say:`) +
      pShort(`"We made progress."`) +
      pShort(`"We were close."`) +
      pShort(`"We had a weird month."`) +
      p(`"We just need a little more time."`) +
      p(`Maybe.`) +
      p(`Or maybe the quarter gave you a very clean message and you are refusing to hear it.`) +
      p(`That is why this framework matters.`) +
      p(`It forces you to stop narrating and start diagnosing.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nMost owners do not need more optimism.\n\nThey need a more honest scorecard.\n\nThe quarter already exposed a lot:\nwhere the bottlenecks are\nwhich priorities were fake\nwhich systems are weak\nwhich people are carrying weight\nwhich people are not\nwhat the market responded to\nwhat it ignored\n\nThe problem is not usually lack of data.\n\nThe problem is that most business owners reinterpret the data in a way that protects their ego.\n\nThey say:\n"We made progress."\n"We were close."\n"We had a weird month."\n"We just need a little more time."\n\nMaybe.\n\nOr maybe the quarter gave you a very clean message and you are refusing to hear it.\n\nThat is why this framework matters.\n\nIt forces you to stop narrating and start diagnosing.\n\nMarshall`,
};

const Q1Q2_3: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 3,
  subject: (_fn) => `kill one thing`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "Most owners enter the new quarter still dragging the last one behind them.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`One of the most important ideas in the framework is simple:`) +
      p(`Kill one thing.`) +
      p(`Every contractor is carrying something that should already be dead.`) +
      pShort(`A bad process.`) +
      pShort(`A weak offer.`) +
      pShort(`A loose meeting rhythm.`) +
      pShort(`A dragging employee problem.`) +
      pShort(`A project that keeps consuming time without producing value.`) +
      p(`A habit of doing things the long way because "that's how we've always done it."`) +
      p(`Most businesses do not need more additions.`) +
      p(`They need more subtraction.`) +
      p(`You cannot build a stronger quarter on top of dead weight.`) +
      p(`That is how owners stay overwhelmed.`) +
      p(`They never clear the shelves.`) +
      p(`They just keep stacking more junk on top.`) +
      p(`Read the framework again and ask yourself one hard question:`) +
      p(`What should already be dead that I am still carrying?`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nOne of the most important ideas in the framework is simple:\n\nKill one thing.\n\nEvery contractor is carrying something that should already be dead.\n\nA bad process.\nA weak offer.\nA loose meeting rhythm.\nA dragging employee problem.\nA project that keeps consuming time without producing value.\nA habit of doing things the long way because "that's how we've always done it."\n\nMost businesses do not need more additions.\nThey need more subtraction.\n\nYou cannot build a stronger quarter on top of dead weight.\n\nThat is how owners stay overwhelmed.\nThey never clear the shelves.\nThey just keep stacking more junk on top.\n\nRead the framework again and ask yourself one hard question:\n\nWhat should already be dead that I am still carrying?\n\nMarshall`,
};

const Q1Q2_4: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 4,
  subject: (_fn) => `double down on the winner`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "When something is working, feed it harder.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`The opposite mistake is just as common.`) +
      p(`A signal shows up that something is working and the owner does not feed it aggressively enough.`) +
      pShort(`A marketing angle starts hitting.`) +
      pShort(`A salesperson starts separating.`) +
      pShort(`A service line has better margins.`) +
      pShort(`A process improvement starts creating leverage.`) +
      p(`A certain type of client becomes obviously better.`) +
      p(`And instead of doubling down, they hedge.`) +
      p(`They diversify too early.`) +
      p(`They keep funding mediocrity because it feels safer.`) +
      p(`That is weak operating.`) +
      p(`The quarter should tell you what deserves more:`) +
      pShort(`more attention`) +
      pShort(`more resources`) +
      pShort(`more focus`) +
      p(`more standards`) +
      p(`That is one of the reasons businesses stall.`) +
      p(`They keep equal energy on things that are not producing equal results.`) +
      p(`You do not need balance right now.`) +
      p(`You need accuracy.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nThe opposite mistake is just as common.\n\nA signal shows up that something is working and the owner does not feed it aggressively enough.\n\nA marketing angle starts hitting.\nA salesperson starts separating.\nA service line has better margins.\nA process improvement starts creating leverage.\nA certain type of client becomes obviously better.\n\nAnd instead of doubling down, they hedge.\nThey diversify too early.\nThey keep funding mediocrity because it feels safer.\n\nThat is weak operating.\n\nThe quarter should tell you what deserves more:\nmore attention\nmore resources\nmore focus\nmore standards\n\nThat is one of the reasons businesses stall.\nThey keep equal energy on things that are not producing equal results.\n\nYou do not need balance right now.\nYou need accuracy.\n\nMarshall`,
};

const Q1Q2_5: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 5,
  subject: (_fn) => `willpower is not the answer`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "If the system is broken, effort just turns into exhaustion.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Most contractors try to muscle their way through the quarter.`) +
      p(`That works for a little while.`) +
      p(`Then they hit the wall.`) +
      p(`Because goals are not achieved by intensity alone.`) +
      p(`They are achieved by systems.`) +
      pShort(`If your meetings are loose, the quarter will be loose.`) +
      pShort(`If accountability is weak, the quarter will be weak.`) +
      pShort(`If handoffs are sloppy, the quarter will get sloppy.`) +
      p(`If estimating, sales, or operations are still living in your head, the quarter will keep exposing that.`) +
      p(`That is why "try harder" is such bad advice.`) +
      p(`It sounds noble.`) +
      p(`It just does not scale.`) +
      p(`The framework tells you to fix one system this week for a reason:`) +
      pShort(`a corrected system compounds`) +
      p(`willpower does not`) +
      p(`That is also why people eventually need more than free content.`) +
      p(`They need a room where systems, standards, and correction are part of the environment.`) +
      p(`That is what Contractor Circle is.`) +
      p(link("See Contractor Circle", "https://alpcontractorcircle.com/join")) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nMost contractors try to muscle their way through the quarter.\n\nThat works for a little while.\n\nThen they hit the wall.\n\nBecause goals are not achieved by intensity alone.\nThey are achieved by systems.\n\nIf your meetings are loose, the quarter will be loose.\nIf accountability is weak, the quarter will be weak.\nIf handoffs are sloppy, the quarter will get sloppy.\nIf estimating, sales, or operations are still living in your head, the quarter will keep exposing that.\n\nThat is why "try harder" is such bad advice.\n\nIt sounds noble.\nIt just does not scale.\n\nThe framework tells you to fix one system this week for a reason:\na corrected system compounds\nwillpower does not\n\nThat is also why people eventually need more than free content.\nThey need a room where systems, standards, and correction are part of the environment.\n\nThat is what Contractor Circle is.\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const Q1Q2_6: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 6,
  subject: (_fn) => `free content does not hold the line`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "Most owners do not fail from ignorance. They fail from drift.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`A lot of owners already know what is wrong.`) +
      p(`That is not the issue.`) +
      pShort(`They know the meetings are weak.`) +
      pShort(`They know the systems are loose.`) +
      pShort(`They know the priorities are muddy.`) +
      pShort(`They know the team standards are inconsistent.`) +
      p(`They know they are still carrying too much.`) +
      p(`And then what happens?`) +
      p(`Drift.`) +
      pShort(`The quarter starts.`) +
      pShort(`The noise begins.`) +
      pShort(`The calendar fills up.`) +
      pShort(`The same habits come back.`) +
      pShort(`The same excuses reappear.`) +
      p(`And the same quarter gets repeated with slightly different wallpaper.`) +
      p(`That is why free frameworks help, but usually do not finish the job.`) +
      p(`They can wake you up.`) +
      p(`They do not hold the line.`) +
      p(`A stronger environment holds the line.`) +
      pShort(`That means real accountability.`) +
      pShort(`Real operator conversations.`) +
      p(`Real proximity to people who are also trying to tighten the business.`) +
      p(`That is Contractor Circle.`) +
      sig(),
    cta: { buttonText: "CLAIM YOUR FOUNDING SPOT →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nA lot of owners already know what is wrong.\n\nThat is not the issue.\n\nThey know the meetings are weak.\nThey know the systems are loose.\nThey know the priorities are muddy.\nThey know the team standards are inconsistent.\nThey know they are still carrying too much.\n\nAnd then what happens?\n\nDrift.\n\nThe quarter starts.\nThe noise begins.\nThe calendar fills up.\nThe same habits come back.\nThe same excuses reappear.\nAnd the same quarter gets repeated with slightly different wallpaper.\n\nThat is why free frameworks help, but usually do not finish the job.\n\nThey can wake you up.\nThey do not hold the line.\n\nA stronger environment holds the line.\n\nThat means real accountability.\nReal operator conversations.\nReal proximity to people who are also trying to tighten the business.\n\nThat is Contractor Circle.\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const Q1Q2_7: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 7,
  subject: (_fn) => `this is what correction looks like`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "This is not theory. This is what happens when operators get in the right environment.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`I want to show you why this matters.`) +
      p(`There are real contractors inside this ecosystem making serious moves.`) +
      pShort(`Not because they got a magic sentence from me.`) +
      pShort(`Not because they bought inspiration.`) +
      p(`Not because they got lucky.`) +
      p(`Because they got in a better environment.`) +
      pShort(`A place with stronger standards.`) +
      pShort(`A place with clearer thinking.`) +
      pShort(`A place where operator-level conversations happen regularly.`) +
      p(`A place where business problems actually get challenged instead of just tolerated.`) +
      p(`That is when people start tightening things up.`) +
      p(`That is when the quarter stops running them.`) +
      p(`That is when revenue, professionalism, clarity, and execution start moving in the right direction.`) +
      p(`If you want to see what that looks like, go look at the join page.`) +
      sig(),
    cta: { buttonText: "SEE THE PROOF →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nI want to show you why this matters.\n\nThere are real contractors inside this ecosystem making serious moves.\n\nNot because they got a magic sentence from me.\nNot because they bought inspiration.\nNot because they got lucky.\n\nBecause they got in a better environment.\n\nA place with stronger standards.\nA place with clearer thinking.\nA place where operator-level conversations happen regularly.\nA place where business problems actually get challenged instead of just tolerated.\n\nThat is when people start tightening things up.\nThat is when the quarter stops running them.\nThat is when revenue, professionalism, clarity, and execution start moving in the right direction.\n\nIf you want to see what that looks like, go look at the join page.\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const Q1Q2_8: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 8,
  subject: (_fn) => `here is what you are joining`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "This is for the contractor who is done winging the quarter.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Let me make this simple.`) +
      p(`If you are serious about the next quarter being different, you need more than a framework.`) +
      p(`You need an operating environment.`) +
      p(`Inside Contractor Circle, you are getting:`) +
      bulletList([
        "Bi-weekly live calls with me",
        "Monthly deal reviews",
        "Monthly bootcamp",
        "Private Discord access",
        "Full template library",
        "Complete replay library",
      ]) +
      p(`It is $497 per month.`) +
      p(`You can cancel anytime.`) +
      p(`If you come in at the founding rate, that price is locked in forever.`) +
      p(`This is not for everybody.`) +
      p(`It is for the contractor who is tired of repeating loose quarters, carrying the whole business alone, and trying to self-correct without enough pressure around him.`) +
      sig(),
    cta: { buttonText: "JOIN CONTRACTOR CIRCLE →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nLet me make this simple.\n\nIf you are serious about the next quarter being different, you need more than a framework.\n\nYou need an operating environment.\n\nInside Contractor Circle, you are getting:\n• Bi-weekly live calls with me\n• Monthly deal reviews\n• Monthly bootcamp\n• Private Discord access\n• Full template library\n• Complete replay library\n\nIt is $497 per month.\nYou can cancel anytime.\nIf you come in at the founding rate, that price is locked in forever.\n\nThis is not for everybody.\n\nIt is for the contractor who is tired of repeating loose quarters, carrying the whole business alone, and trying to self-correct without enough pressure around him.\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

const Q1Q2_9: DripEmailDef = {
  sequenceId: "q1q2_single",
  stepNumber: 9,
  subject: (_fn) => `do not repeat the quarter`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "If nothing changes, the next quarter will tell the same story.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Here is the truth.`) +
      p(`If you do not make a real correction, the next quarter will probably tell the same story.`) +
      pShort(`Maybe with a different excuse.`) +
      pShort(`Maybe with a different market condition.`) +
      pShort(`Maybe with a different employee issue.`) +
      p(`Maybe with a different level of stress.`) +
      p(`But the same core story.`) +
      pShort(`Loose priorities.`) +
      pShort(`Loose systems.`) +
      pShort(`Loose accountability.`) +
      p(`Loose correction.`) +
      p(`That is what repeats the quarter.`) +
      p(`At some point, the issue stops being information and becomes decision.`) +
      p(`You have the framework.`) +
      p(`You have the lens.`) +
      p(`You know more now than you did before you downloaded it.`) +
      p(`The question is whether you are going to use that awareness to make a move.`) +
      p(`If you want the next quarter to be tighter, cleaner, and more controlled, join us.`) +
      sig(),
    cta: { buttonText: "JOIN THE CIRCLE →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nHere is the truth.\n\nIf you do not make a real correction, the next quarter will probably tell the same story.\n\nMaybe with a different excuse.\nMaybe with a different market condition.\nMaybe with a different employee issue.\nMaybe with a different level of stress.\n\nBut the same core story.\n\nLoose priorities.\nLoose systems.\nLoose accountability.\nLoose correction.\n\nThat is what repeats the quarter.\n\nAt some point, the issue stops being information and becomes decision.\n\nYou have the framework.\nYou have the lens.\nYou know more now than you did before you downloaded it.\n\nThe question is whether you are going to use that awareness to make a move.\n\nIf you want the next quarter to be tighter, cleaner, and more controlled, join us.\n\nhttps://alpcontractorcircle.com/join\n\nMarshall`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// SEQUENCE 3: DOUBLE-DIPPERS → CONTRACTOR CIRCLE (6 emails)
// Strategy: Shorter, sharper, more direct — these people showed repeated intent
// Cadence: Day 0,1,3,5,7,10
// ═══════════════════════════════════════════════════════════════════════════════

const DD_1: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 1,
  subject: (fn) => `${fn}, you came back for a reason`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "You do not download multiple resources by accident.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`You downloaded more than one resource from me.`) +
      p(`That tells me something.`) +
      pShort(`You are not casually scrolling.`) +
      pShort(`You are not just killing time.`) +
      p(`You are not randomly collecting PDFs.`) +
      p(`You are looking for something.`) +
      pShort(`More clarity.`) +
      pShort(`More control.`) +
      pShort(`More structure.`) +
      pShort(`A better way to run the business.`) +
      p(`A way to stop carrying so much of it in your own head.`) +
      p(`That is why this matters.`) +
      p(`People do not come back for a second resource unless the first one hit a nerve.`) +
      p(`So let's just call it what it is:`) +
      pShort(`something in your business feels loose`) +
      pShort(`something in your business needs tightening`) +
      p(`and part of you already knows free information is not the whole answer`) +
      p(`The real question now is not whether the content is helpful.`) +
      p(`It is whether you are going to keep circling the solution or step into it.`) +
      p(link("See Contractor Circle", "https://alpcontractorcircle.com/join")) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —

You downloaded more than one resource from me.

That tells me something.

You are not casually scrolling.
You are not just killing time.
You are not randomly collecting PDFs.

You are looking for something.

More clarity.
More control.
More structure.
A better way to run the business.
A way to stop carrying so much of it in your own head.

That is why this matters.

People do not come back for a second resource unless the first one hit a nerve.

So let's just call it what it is:

something in your business feels loose
something in your business needs tightening
and part of you already knows free information is not the whole answer

The real question now is not whether the content is helpful.

It is whether you are going to keep circling the solution or step into it.

https://alpcontractorcircle.com/join

Marshall`,
};

const DD_2: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 2,
  subject: (_fn) => `you probably do not need another PDF`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "The issue is no longer awareness. It is implementation.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`By now, you have seen enough of my thinking to know whether it resonates.`) +
      pShort(`You have downloaded multiple resources.`) +
      pShort(`You have spent time with the frameworks.`) +
      p(`You have pulled on more than one problem inside your business.`) +
      p(`That is good.`) +
      p(`But let me say this plainly:`) +
      p(`You probably do not need another free PDF.`) +
      p(`Not because free is bad.`) +
      p(`Because free has already done its job.`) +
      pShort(`It got your attention.`) +
      pShort(`It helped you see some things more clearly.`) +
      p(`It probably gave you language for problems you were already feeling.`) +
      p(`Good.`) +
      p(`Now what?`) +
      p(`That is the part where most contractors stall.`) +
      pShort(`They keep consuming.`) +
      pShort(`They keep agreeing.`) +
      pShort(`They keep collecting.`) +
      p(`They keep telling themselves they are "working on it."`) +
      p(`But they never actually change the environment around them.`) +
      p(`And because they do not change the environment, they do not change the business.`) +
      p(`That is the gap Contractor Circle closes.`) +
      p(link("Claim Your Founding Spot", "https://alpcontractorcircle.com/join")) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —

By now, you have seen enough of my thinking to know whether it resonates.

You have downloaded multiple resources.
You have spent time with the frameworks.
You have pulled on more than one problem inside your business.

That is good.

But let me say this plainly:

You probably do not need another free PDF.

Not because free is bad.
Because free has already done its job.

It got your attention.
It helped you see some things more clearly.
It probably gave you language for problems you were already feeling.

Good.

Now what?

That is the part where most contractors stall.

They keep consuming.
They keep agreeing.
They keep collecting.
They keep telling themselves they are "working on it."

But they never actually change the environment around them.

And because they do not change the environment, they do not change the business.

That is the gap Contractor Circle closes.

https://alpcontractorcircle.com/join

Marshall`,
};

const DD_3: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 3,
  subject: (_fn) => `your pattern is telling on you`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "If you keep downloading the content, the pattern already says a lot.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Let's be honest about what your behavior is saying.`) +
      p(`If you downloaded the Estimating Checklist, then the Q1/Q2 Framework...`) +
      p(`or the Three Silos...`) +
      p(`or some combination of them...`) +
      p(`you are not looking for entertainment.`) +
      p(`You are looking for leverage.`) +
      pShort(`You want the business to tighten up.`) +
      pShort(`You want cleaner decisions.`) +
      pShort(`You want stronger systems.`) +
      pShort(`You want more control.`) +
      pShort(`You want less waste.`) +
      pShort(`You want less confusion.`) +
      p(`You want a better operating rhythm.`) +
      p(`That is what you are actually chasing.`) +
      p(`And that is exactly why staying at the free level forever makes no sense.`) +
      pShort(`Free content can point.`) +
      pShort(`It cannot stay in the trench with you.`) +
      pShort(`It cannot challenge your blind spots in real time.`) +
      pShort(`It cannot pressure better decisions out of you.`) +
      p(`It cannot create accountability.`) +
      p(`A stronger room does that.`) +
      p(`That room is Contractor Circle.`) +
      sig(),
    cta: { buttonText: "JOIN CONTRACTOR CIRCLE →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

Let's be honest about what your behavior is saying.

If you downloaded the Estimating Checklist, then the Q1/Q2 Framework...
or the Three Silos...
or some combination of them...

you are not looking for entertainment.

You are looking for leverage.

You want the business to tighten up.
You want cleaner decisions.
You want stronger systems.
You want more control.
You want less waste.
You want less confusion.
You want a better operating rhythm.

That is what you are actually chasing.

And that is exactly why staying at the free level forever makes no sense.

Free content can point.
It cannot stay in the trench with you.
It cannot challenge your blind spots in real time.
It cannot pressure better decisions out of you.
It cannot create accountability.

A stronger room does that.

That room is Contractor Circle.

https://alpcontractorcircle.com/join

Marshall`,
};

const DD_4: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 4,
  subject: (_fn) => `real contractors are already in the room`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "You do not need more internet ideas. You need a stronger environment.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`One of the biggest mistakes contractors make is thinking they need more information.`) +
      p(`Most of the time, they do not.`) +
      p(`They need a stronger environment.`) +
      p(`A place where:`) +
      pShort(`the standard is higher`) +
      pShort(`the conversations are sharper`) +
      pShort(`the accountability is real`) +
      pShort(`the operators are serious`) +
      p(`the ideas actually get implemented`) +
      p(`That is what makes Contractor Circle different.`) +
      pShort(`This is not some theory club.`) +
      pShort(`This is not vague motivation.`) +
      p(`This is not generic coaching language.`) +
      p(`There are real contractors inside this ecosystem making real moves.`) +
      pShort(`You can see that in the proof.`) +
      pShort(`You can see it in the testimonials.`) +
      pShort(`You can see it in the before-and-after outcomes.`) +
      p(`You can feel the difference between passive content and a real room.`) +
      p(`If you have already come back for multiple resources, you are probably a better fit than you think.`) +
      sig(),
    cta: { buttonText: "SEE THE PROOF →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

One of the biggest mistakes contractors make is thinking they need more information.

Most of the time, they do not.

They need a stronger environment.

A place where:
the standard is higher
the conversations are sharper
the accountability is real
the operators are serious
the ideas actually get implemented

That is what makes Contractor Circle different.

This is not some theory club.
This is not vague motivation.
This is not generic coaching language.

There are real contractors inside this ecosystem making real moves.

You can see that in the proof.
You can see it in the testimonials.
You can see it in the before-and-after outcomes.
You can feel the difference between passive content and a real room.

If you have already come back for multiple resources, you are probably a better fit than you think.

https://alpcontractorcircle.com/join

Marshall`,
};

const DD_5: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 5,
  subject: (_fn) => `what you are actually joining`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "This is what sits on the other side of all the free content.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Let me make the offer simple.`) +
      p(`Contractor Circle is for the contractor who is done trying to self-correct in isolation.`) +
      p(`Inside, you get:`) +
      bulletList([
        "Bi-weekly live calls with me",
        "Monthly deal reviews",
        "Monthly bootcamp",
        "Private Discord access",
        "Full template library",
        "Complete replay library",
      ]) +
      p(`It is $497 per month.`) +
      p(`You can cancel anytime.`) +
      p(`If you join at the founding rate, that price is locked in forever.`) +
      p(`That is not expensive if you are serious.`) +
      pShort(`Not compared to what weak decisions cost.`) +
      pShort(`Not compared to what loose systems cost.`) +
      p(`Not compared to what one bad estimate, one bad hire, one soft quarter, or one avoidable mistake costs.`) +
      p(`If you are still here, still opening, still downloading, still paying attention, then the fit is probably there.`) +
      sig(),
    cta: { buttonText: "JOIN THE CIRCLE →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

Let me make the offer simple.

Contractor Circle is for the contractor who is done trying to self-correct in isolation.

Inside, you get:
• Bi-weekly live calls with me
• Monthly deal reviews
• Monthly bootcamp
• Private Discord access
• Full template library
• Complete replay library

It is $497 per month.
You can cancel anytime.
If you join at the founding rate, that price is locked in forever.

That is not expensive if you are serious.

Not compared to what weak decisions cost.
Not compared to what loose systems cost.
Not compared to what one bad estimate, one bad hire, one soft quarter, or one avoidable mistake costs.

If you are still here, still opening, still downloading, still paying attention, then the fit is probably there.

https://alpcontractorcircle.com/join

Marshall`,
};

const DD_6: DripEmailDef = {
  sequenceId: "double_dipper",
  stepNumber: 6,
  subject: (_fn) => `you keep coming back — that means something`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "At some point, the issue stops being information and becomes decision.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`You came back more than once.`) +
      p(`That means something.`) +
      pShort(`You saw the content.`) +
      pShort(`You downloaded the resources.`) +
      pShort(`You stayed engaged.`) +
      p(`You kept pulling on the same thread.`) +
      p(`So I'll leave you with this:`) +
      p(`Do not confuse repeated interest with progress.`) +
      p(`A lot of contractors do that.`) +
      pShort(`They keep consuming and mistake that for movement.`) +
      pShort(`They keep agreeing and mistake that for change.`) +
      p(`They keep watching and mistake that for execution.`) +
      p(`That is not how businesses tighten up.`) +
      p(`Businesses tighten up when the owner gets serious enough to step into a better environment and let that environment sharpen him.`) +
      p(`If that is where you are, join us.`) +
      p(`If not, no issue.`) +
      p(`Keep the resources.`) +
      p(`Use them.`) +
      p(`They will help.`) +
      p(`But if you already know you need more than free, here is the move:`) +
      sig(),
    cta: { buttonText: "CLAIM YOUR FOUNDING SPOT →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

You came back more than once.

That means something.

You saw the content.
You downloaded the resources.
You stayed engaged.
You kept pulling on the same thread.

So I'll leave you with this:

Do not confuse repeated interest with progress.

A lot of contractors do that.

They keep consuming and mistake that for movement.
They keep agreeing and mistake that for change.
They keep watching and mistake that for execution.

That is not how businesses tighten up.

Businesses tighten up when the owner gets serious enough to step into a better environment and let that environment sharpen him.

If that is where you are, join us.

If not, no issue.
Keep the resources.
Use them.
They will help.

But if you already know you need more than free, here is the move:

https://alpcontractorcircle.com/join

Marshall`,
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
// SEQUENCE 5: THREE SILOS / HOLY GRAIL OF SCALING → CONTRACTOR CIRCLE (8 emails)
// Strategy: Simplify the chaos into a diagnosis — Attention, People, Process
// Cadence: Day 0,1,2,3,4,5,8,10 (daily for 6, then spaced)
// ═══════════════════════════════════════════════════════════════════════════════

const TS_1: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, here is the holy grail of scaling`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "Most businesses are more complicated than they need to be.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Your Three Silos Framework is ready.`) +
      ctaModule({ headline: "Download Your Framework", subtext: "The Three Silos — Attention, People, Process. The holy grail of scaling.", buttonText: "DOWNLOAD FRAMEWORK →", buttonUrl: THREE_SILOS_PDF_URL }) +
      p(`You downloaded this because part of you already knows the business has gotten too complicated.`) +
      pShort(`Too many moving parts.`) +
      pShort(`Too many problems.`) +
      p(`Too many things pulling on you at once.`) +
      p(`That is exactly why I made this framework.`) +
      p(`When you strip all the noise out of business, most of what matters falls into three buckets:`) +
      pShort(`Attention.`) +
      pShort(`People.`) +
      p(`Process.`) +
      p(`That is it.`) +
      p(`Most owners get buried in tactics because they never step back far enough to see the chessboard.`) +
      p(`They keep trying to solve surface-level issues without identifying the actual broken silo.`) +
      p(`That is how smart contractors stay stuck.`) +
      p(`Read it slowly.`) +
      p(`Do not just skim it and tell yourself you "get it."`) +
      p(`Use it to diagnose where your business is actually breaking down.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —\n\nYour Three Silos Framework is ready.\n\nDownload it here: ${THREE_SILOS_PDF_URL}\n\nYou downloaded this because part of you already knows the business has gotten too complicated.Too many moving parts.
Too many problems.
Too many things pulling on you at once.

That is exactly why I made this framework.

When you strip all the noise out of business, most of what matters falls into three buckets:

Attention.
People.
Process.

That is it.

Most owners get buried in tactics because they never step back far enough to see the chessboard.

They keep trying to solve surface-level issues without identifying the actual broken silo.

That is how smart contractors stay stuck.

Read it slowly.

Do not just skim it and tell yourself you "get it."
Use it to diagnose where your business is actually breaking down.

Marshall`,
};

const TS_2: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 2,
  subject: (_fn) => `most contractors misdiagnose the problem`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "The issue is usually not effort. It is misdiagnosis.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Most business owners are not dealing with twenty real problems.`) +
      p(`They are usually dealing with one real bottleneck and nineteen downstream symptoms.`) +
      p(`But because they never slow down and diagnose properly, they treat symptoms like causes.`) +
      pShort(`They blame the team.`) +
      pShort(`They blame lead flow.`) +
      pShort(`They blame the economy.`) +
      pShort(`They blame pricing.`) +
      p(`They blame motivation.`) +
      p(`Sometimes those things matter.`) +
      p(`But most of the time, the real problem is that one of the three silos is weak:`) +
      pShort(`Attention`) +
      pShort(`People`) +
      p(`Process`) +
      p(`If Attention is weak, the pipeline is inconsistent and the market barely knows you exist.`) +
      p(`If People are weak, the owner carries everything and the team cannot execute at a high level.`) +
      p(`If Process is weak, everything depends on memory, hustle, and recovery.`) +
      p(`That is why the framework matters.`) +
      p(`It helps you stop guessing.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —

Most business owners are not dealing with twenty real problems.

They are usually dealing with one real bottleneck and nineteen downstream symptoms.

But because they never slow down and diagnose properly, they treat symptoms like causes.

They blame the team.
They blame lead flow.
They blame the economy.
They blame pricing.
They blame motivation.

Sometimes those things matter.

But most of the time, the real problem is that one of the three silos is weak:

Attention
People
Process

If Attention is weak, the pipeline is inconsistent and the market barely knows you exist.

If People are weak, the owner carries everything and the team cannot execute at a high level.

If Process is weak, everything depends on memory, hustle, and recovery.

That is why the framework matters.

It helps you stop guessing.

Marshall`,
};

const TS_3: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 3,
  subject: (_fn) => `which silo is broken?`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "If you cannot name the broken silo, you cannot fix the business.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Here is the question that matters:`) +
      p(`Which silo is actually breaking your flywheel right now?`) +
      pShort(`Not which one annoys you.`) +
      pShort(`Not which one sounds good to talk about.`) +
      p(`Which one is truly holding the business back?`) +
      p(`Is it Attention?`) +
      p(`Meaning:`) +
      pShort(`you are not visible enough`) +
      pShort(`lead flow is inconsistent`) +
      pShort(`recruiting is harder because nobody knows who you are`) +
      p(`the market has no real awareness of you`) +
      p(`Is it People?`) +
      p(`Meaning:`) +
      pShort(`you do not trust the team`) +
      pShort(`you are still the decision-maker on everything`) +
      pShort(`you cannot scale because the bench is weak`) +
      p(`you are surrounded by bodies, not operators`) +
      p(`Is it Process?`) +
      p(`Meaning:`) +
      pShort(`everything lives in your head`) +
      pShort(`execution is inconsistent`) +
      pShort(`handoffs are loose`) +
      p(`the business only works when you are pushing on it`) +
      p(`Most owners need to answer that question more honestly than they currently do.`) +
      p(`The framework gives you the lens.`) +
      p(`But the diagnosis only helps if you tell yourself the truth.`) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —

Here is the question that matters:

Which silo is actually breaking your flywheel right now?

Not which one annoys you.
Not which one sounds good to talk about.
Which one is truly holding the business back?

Is it Attention?
you are not visible enough
lead flow is inconsistent
recruiting is harder because nobody knows who you are
the market has no real awareness of you

Is it People?
you do not trust the team
you are still the decision-maker on everything
you cannot scale because the bench is weak
you are surrounded by bodies, not operators

Is it Process?
everything lives in your head
execution is inconsistent
handoffs are loose
the business only works when you are pushing on it

Most owners need to answer that question more honestly than they currently do.

The framework gives you the lens.
But the diagnosis only helps if you tell yourself the truth.

Marshall`,
};

const TS_4: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 4,
  subject: (_fn) => `why most owners stay stuck`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "Most contractors stay stuck because they keep adding instead of correcting.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`The reason most contractors stay stuck is not lack of effort.`) +
      p(`It is lack of correction.`) +
      p(`They add more instead of tightening what is already loose.`) +
      pShort(`Another app.`) +
      pShort(`Another hire.`) +
      pShort(`Another marketing idea.`) +
      pShort(`Another meeting.`) +
      p(`Another random tactic.`) +
      p(`Meanwhile, the actual bottleneck stays right where it is.`) +
      p(`That is why business starts to feel heavy.`) +
      p(`Not because it is impossible.`) +
      p(`Because it is being run without enough clarity, standards, and correction.`) +
      p(`Free frameworks can wake you up.`) +
      p(`They can help you see the board differently.`) +
      pShort(`But they do not create pressure.`) +
      pShort(`They do not challenge your blind spots.`) +
      pShort(`They do not hold the line when you drift.`) +
      p(`They do not force implementation.`) +
      p(`That is where most owners break down.`) +
      p(`They know.`) +
      p(`But they do not execute long enough or hard enough to change.`) +
      p(`That is the gap Contractor Circle closes.`) +
      p(link("See Contractor Circle", "https://alpcontractorcircle.com/join")) +
      sig(),
  }),
  buildText: (fn) =>
    `Hey ${fn} —

The reason most contractors stay stuck is not lack of effort.

It is lack of correction.

They add more instead of tightening what is already loose.

Another app.
Another hire.
Another marketing idea.
Another meeting.
Another random tactic.

Meanwhile, the actual bottleneck stays right where it is.

That is why business starts to feel heavy.

Not because it is impossible.
Because it is being run without enough clarity, standards, and correction.

Free frameworks can wake you up.
They can help you see the board differently.

But they do not create pressure.
They do not challenge your blind spots.
They do not hold the line when you drift.
They do not force implementation.

That is where most owners break down.

They know.
But they do not execute long enough or hard enough to change.

That is the gap Contractor Circle closes.

https://alpcontractorcircle.com/join

Marshall`,
};

const TS_5: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 5,
  subject: (_fn) => `this is not theory`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "This is built on real operators, not guru fantasy.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`I want to make something very clear.`) +
      p(`This is not theory I cooked up to sound smart.`) +
      p(`This is built around real contractors, real businesses, real pressure, and real outcomes.`) +
      p(`On the Contractor Circle side, there is proof from people inside the ecosystem who tightened their thinking, sharpened their operations, and made serious moves.`) +
      pShort(`You can see examples of real revenue growth.`) +
      pShort(`You can see member feedback.`) +
      p(`You can see what happens when somebody gets in the right room and starts operating differently.`) +
      p(`That matters because a lot of business content sounds good but never translates into actual movement.`) +
      p(`This does.`) +
      p(`And the reason it does is simple:`) +
      p(`it is grounded in real businesses with real consequences.`) +
      p(`If you have been reading the framework and seeing yourself in it, go look at what Contractor Circle actually is.`) +
      sig(),
    cta: { buttonText: "SEE THE PROOF →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

I want to make something very clear.

This is not theory I cooked up to sound smart.

This is built around real contractors, real businesses, real pressure, and real outcomes.

On the Contractor Circle side, there is proof from people inside the ecosystem who tightened their thinking, sharpened their operations, and made serious moves.

You can see examples of real revenue growth.
You can see member feedback.
You can see what happens when somebody gets in the right room and starts operating differently.

That matters because a lot of business content sounds good but never translates into actual movement.

This does.

And the reason it does is simple:
it is grounded in real businesses with real consequences.

If you have been reading the framework and seeing yourself in it, go look at what Contractor Circle actually is.

https://alpcontractorcircle.com/join

Marshall`,
};

const TS_6: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 6,
  subject: (_fn) => `watching is not the same as building`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "At some point, the issue is no longer awareness. It is decision.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`A lot of people stay in the same pattern for years.`) +
      pShort(`They follow the content.`) +
      pShort(`They agree with the message.`) +
      pShort(`They save the posts.`) +
      pShort(`They download the free stuff.`) +
      p(`They nod their head.`) +
      p(`And nothing really changes.`) +
      p(`Why?`) +
      p(`Because information is not the same as environment.`) +
      p(`Free content gives you awareness.`) +
      p(`A real room gives you proximity, correction, pressure, and repetition.`) +
      p(`That is the difference.`) +
      p(`You can follow me on Instagram forever and still stay exactly where you are.`) +
      p(`Or you can step into a place where the standard is higher and the conversations are different.`) +
      p(`That is what Contractor Circle is.`) +
      bulletList([
        "Bi-weekly live calls",
        "Monthly deal reviews",
        "Monthly bootcamp",
        "Private Discord",
        "Templates",
        "Replay library",
        "Founding member pricing locked in forever",
        "Cancel anytime",
      ]) +
      p(`That is a real operating environment.`) +
      sig(),
    cta: { buttonText: "CLAIM YOUR FOUNDING SPOT →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

A lot of people stay in the same pattern for years.

They follow the content.
They agree with the message.
They save the posts.
They download the free stuff.
They nod their head.

And nothing really changes.

Why?

Because information is not the same as environment.

Free content gives you awareness.
A real room gives you proximity, correction, pressure, and repetition.

That is the difference.

You can follow me on Instagram forever and still stay exactly where you are.

Or you can step into a place where the standard is higher and the conversations are different.

That is what Contractor Circle is.

• Bi-weekly live calls
• Monthly deal reviews
• Monthly bootcamp
• Private Discord
• Templates
• Replay library
• Founding member pricing locked in forever
• Cancel anytime

That is a real operating environment.

https://alpcontractorcircle.com/join

Marshall`,
};

const TS_7: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 7,
  subject: (_fn) => `Contractor Circle in plain English`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "This is for contractors who want structure, not just inspiration.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Let me make this simple.`) +
      p(`Contractor Circle is for the contractor who knows the business cannot keep running off instinct, scattered effort, and random correction.`) +
      p(`It is for the owner who wants:`) +
      bulletList([
        "better decisions",
        "tighter systems",
        "real accountability",
        "clearer thinking",
        "operator-level conversations",
        "a stronger environment",
      ]) +
      p(`Inside, you are getting:`) +
      bulletList([
        "Bi-weekly live calls with me",
        "Monthly deal reviews",
        "Monthly bootcamp",
        "Private Discord access",
        "Full template library",
        "Complete replay library",
      ]) +
      p(`It is $497 per month.`) +
      p(`You can cancel anytime.`) +
      p(`If you join at the founding rate, that rate is locked in forever.`) +
      p(`If you have been consuming the free side of the ecosystem and know you need more than content, this is the next step.`) +
      sig(),
    cta: { buttonText: "JOIN CONTRACTOR CIRCLE →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

Let me make this simple.

Contractor Circle is for the contractor who knows the business cannot keep running off instinct, scattered effort, and random correction.

It is for the owner who wants:
• better decisions
• tighter systems
• real accountability
• clearer thinking
• operator-level conversations
• a stronger environment

Inside, you are getting:
• Bi-weekly live calls with me
• Monthly deal reviews
• Monthly bootcamp
• Private Discord access
• Full template library
• Complete replay library

It is $497 per month.
You can cancel anytime.
If you join at the founding rate, that rate is locked in forever.

If you have been consuming the free side of the ecosystem and know you need more than content, this is the next step.

https://alpcontractorcircle.com/join

Marshall`,
};

const TS_8: DripEmailDef = {
  sequenceId: "three_silos_single",
  stepNumber: 8,
  subject: (_fn) => `you already know where the problem is`,
  buildHtml: (fn) => buildCCEmail({
    preheaderText: "You do not need more awareness. You need a decision.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`By now, you probably have a pretty good sense of where the business is breaking.`) +
      pShort(`Maybe it is Attention.`) +
      pShort(`Maybe it is People.`) +
      p(`Maybe it is Process.`) +
      p(`Maybe, if you are honest, it is more than one.`) +
      p(`But at this point, the issue is probably not lack of insight.`) +
      p(`It is whether you are going to do something with it.`) +
      p(`That is the line.`) +
      pShort(`Some owners collect frameworks.`) +
      p(`Some owners make a decision and step into a better environment.`) +
      p(`If you are serious about fixing the bottleneck, tightening the business, and surrounding yourself with stronger conversations, then join us.`) +
      p(`If not, keep the framework.`) +
      p(`Use it.`) +
      p(`It will help.`) +
      p(`But if you are ready for more than free, here is the move:`) +
      sig(),
    cta: { buttonText: "JOIN THE CIRCLE →" },
  }),
  buildText: (fn) =>
    `Hey ${fn} —

By now, you probably have a pretty good sense of where the business is breaking.

Maybe it is Attention.
Maybe it is People.
Maybe it is Process.

Maybe, if you are honest, it is more than one.

But at this point, the issue is probably not lack of insight.

It is whether you are going to do something with it.

That is the line.

Some owners collect frameworks.
Some owners make a decision and step into a better environment.

If you are serious about fixing the bottleneck, tightening the business, and surrounding yourself with stronger conversations, then join us.

If not, keep the framework.
Use it.
It will help.

But if you are ready for more than free, here is the move:

https://alpcontractorcircle.com/join

Marshall`,
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const ALL_DRIP_EMAILS: DripEmailDef[] = [
  EST_1, EST_2, EST_3, EST_4, EST_5, EST_6, EST_7, EST_8, EST_9,
  Q1Q2_1, Q1Q2_2, Q1Q2_3, Q1Q2_4, Q1Q2_5, Q1Q2_6, Q1Q2_7, Q1Q2_8, Q1Q2_9,
  TS_1, TS_2, TS_3, TS_4, TS_5, TS_6, TS_7, TS_8,
  DD_1, DD_2, DD_3, DD_4, DD_5, DD_6,
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
  // index 0 = delivery email (step 0), index N = gap before step N
  // Estimating: Day 0,1,2,3,4,5,6,8,10 (daily for 7, then spaced)
  estimating_single: [0, 1, 1, 1, 1, 1, 1, 2, 2, 2],
  // Q1/Q2: Day 0,1,2,3,4,5,6,8,10 (daily for 7, then spaced)
  q1q2_single: [0, 1, 1, 1, 1, 1, 1, 2, 2, 2],
  // Three Silos: Day 0,1,2,3,4,5,8,10 (daily for 6, then spaced)
  three_silos_single: [0, 1, 1, 1, 1, 1, 3, 2, 2],
  // Double Dipper: Day 0,1,3,5,7,10 (tighter cadence for warm leads)
  double_dipper: [0, 1, 2, 2, 2, 3, 3],
  // Homepage: Day 0,1,3,5
  homepage_only: [0, 1, 2, 2],
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
