/**
 * Drip Campaign Email Templates
 * 
 * 4 sequences × up to 5 emails each = 16 total emails
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

const FROM_ADDRESS = "Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>";
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

const EST_1: DripEmailDef = {
  sequenceId: "estimating_single",
  stepNumber: 1,
  subject: (fn) => `${fn}, your checklist is ready`,
  buildHtml: (fn) => buildCCSimpleEmail({
    preheaderText: "Use this on your last estimate before you use it on your next one.",
    bodyHtml:
      p(`Hey ${fn} —`) +
      p(`Your Estimating Checklist is ready.`) +
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
    `Hey ${fn} —\n\nYour Estimating Checklist is ready.\n\nBut before you file it away, I need to tell you something most people won't.\n\nThe reason most contractors lose money on jobs is not because they can't estimate.\n\nIt's because they estimate casually.\n\nThey pull numbers from memory.\nThey skip exclusions.\nThey don't scope-level subs.\nThey round down because they're afraid of losing the bid.\nThey forget general conditions.\nThey trust assumptions that should have been verified.\n\nThen they wonder why they're working 60-hour weeks with less profit than they expected.\n\nThis checklist exists to force discipline into the estimating process.\n\nHere's what I want you to do:\n\nDo not wait for your next bid.\n\nPull up your last estimate — the one you already submitted — and run it against the checklist.\n\nSee what you missed.\nSee where you guessed.\nSee where the money may have leaked before the job even started.\n\nThat exercise alone will tell you more about your business than another YouTube video ever will.\n\nMarshall`,
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
