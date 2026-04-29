import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const joinPageSource = readFileSync(
  resolve(__dirname, "..", "client", "src", "pages", "JoinPage.tsx"),
  "utf-8"
);

describe("JoinPage", () => {
  // ── Structure tests ──────────────────────────────────────────────────

  it("exports a default component", () => {
    expect(joinPageSource).toContain("export default function JoinPage");
  });

  it("renders all 10 sections", () => {
    const sections = [
      "HeroSection",
      "BridgeSection",
      "WhatIsSection",
      "WhyNowSection",
      "ProofSection",
      "ComparisonSection",
      "QualificationSection",
      "ObjectionSection",
      "PricingSection",
      "FinalCloseSection",
    ];
    for (const section of sections) {
      expect(joinPageSource).toContain(`<${section}`);
    }
  });

  // ── CTA tests ────────────────────────────────────────────────────────

  it("uses useCircleCheckout hook for checkout", () => {
    expect(joinPageSource).toContain("useCircleCheckout");
    expect(joinPageSource).toContain("startCheckout");
  });

  it("has multiple CTA buttons", () => {
    // CTAButton component is used in Hero, WhyNow, and FinalClose
    const ctaMatches = joinPageSource.match(/<CTAButton/g);
    expect(ctaMatches).not.toBeNull();
    expect(ctaMatches!.length).toBeGreaterThanOrEqual(3);
  });

  // ── Copy tests ───────────────────────────────────────────────────────

  it("contains the hero headline", () => {
    expect(joinPageSource).toContain(
      "Build the"
    );
  });

  it("contains the bridge copy referencing lead magnets", () => {
    expect(joinPageSource).toContain("Estimator");
    expect(joinPageSource).toContain("Q2 Framework");
    expect(joinPageSource).toContain("Holy Grail of Scaling");
  });

  it("contains the final close headline", () => {
    expect(joinPageSource).toContain("Stop collecting tools");
    expect(joinPageSource).toContain("Start building the machine");
  });

  it("contains $497/mo pricing", () => {
    expect(joinPageSource).toContain("$497");
  });

  // ── Proof data tests ─────────────────────────────────────────────────

  it("includes all 5 proof companies", () => {
    const companies = [
      "CNY Group",
      "Trojan Roofing",
      "Davis Contracting",
      "Sage Construction",
      "ARC Construction Group",
    ];
    for (const company of companies) {
      expect(joinPageSource).toContain(company);
    }
  });

  it("includes all 3 testimonials", () => {
    expect(joinPageSource).toContain("Olive Tree Builds");
    expect(joinPageSource).toContain("Sage Construction");
    expect(joinPageSource).toContain("Davis Contracting");
  });

  // ── Feature list tests ───────────────────────────────────────────────

  it("lists all 8 features", () => {
    const featureTitles = [
      "Bi-weekly live working calls",
      "Monthly implementation bootcamps",
      "Private Discord community",
      "35+ template library",
      "Replay library",
      "AI estimating takeoff tool",
      "Question submission before calls",
      "Direct strategic guidance from Marshall",
    ];
    for (const title of featureTitles) {
      expect(joinPageSource).toContain(title);
    }
  });

  // ── Objection handling tests ─────────────────────────────────────────

  it("includes all 5 objections", () => {
    const objections = [
      "I can't afford $497/month",
      "I don't have time",
      "We're too small for structure",
      "We get work from referrals",
      "I've tried coaching before",
    ];
    for (const obj of objections) {
      expect(joinPageSource).toContain(obj);
    }
  });

  // ── Comparison table tests ───────────────────────────────────────────

  it("has passive vs circle comparison", () => {
    expect(joinPageSource).toContain("Passive Program");
    expect(joinPageSource).toContain("Contractor Circle");
    expect(joinPageSource).toContain("Watch content alone");
    expect(joinPageSource).toContain("Bring real problems into the room");
  });

  // ── Qualification section tests ──────────────────────────────────────

  it("has for/not-for qualification lists", () => {
    expect(joinPageSource).toContain("FOR YOU IF");
    expect(joinPageSource).toContain("NOT FOR YOU IF");
    expect(joinPageSource).toContain("You want passive content only");
    expect(joinPageSource).toContain("You are actively trying to scale");
  });

  // ── Pain points tests ────────────────────────────────────────────────

  it("lists all 6 pain points", () => {
    const pains = [
      "Bad estimates still leak margin",
      "People issues still stay vague",
      "Referrals are still not a system",
      "Processes still live in your head",
      "Growth still depends too heavily on you",
      "The same issues keep returning every week",
    ];
    for (const pain of pains) {
      expect(joinPageSource).toContain(pain);
    }
  });

  // ── Image asset tests ────────────────────────────────────────────────

  it("uses CDN URLs for hero and CTA background images", () => {
    expect(joinPageSource).toContain("/manus-storage/");
    expect(joinPageSource).toContain("join-hero-marshall-office");
    expect(joinPageSource).toContain("bridge-boardroom-bg");
  });

  // ── Footer tests ─────────────────────────────────────────────────────

  it("has footer with correct links", () => {
    expect(joinPageSource).toContain('href="/"');
    expect(joinPageSource).toContain('href="/portal"');
    expect(joinPageSource).toContain(
      "instagram.com/realmarshallwilkinson"
    );
  });
});
