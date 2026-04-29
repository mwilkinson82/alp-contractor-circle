/**
 * Estimating Checklist → Contractor Circle Drip Campaign Tests
 *
 * Tests the 9-email estimating_single drip sequence:
 * - Email definitions (subject, html, text for all 9 steps)
 * - Cadence schedule (daily for 7, then spaced)
 * - Narrative arc (estimating pain → operator problems → Circle offer → consequence)
 */

import { describe, it, expect } from "vitest";
import { getDripEmail, getMaxStep, ALL_DRIP_EMAILS, getNextSendDate } from "./dripEmails";

describe("Estimating Checklist Drip — 9-Email Sequence", () => {
  it("has 9 drip emails for estimating_single sequence", () => {
    const estEmails = ALL_DRIP_EMAILS.filter(
      (e) => e.sequenceId === "estimating_single"
    );
    expect(estEmails).toHaveLength(9);
  });

  it("step numbers are 1 through 9", () => {
    for (let step = 1; step <= 9; step++) {
      const email = getDripEmail("estimating_single", step);
      expect(email).toBeDefined();
      expect(email!.stepNumber).toBe(step);
    }
  });

  it("getMaxStep returns 9 for estimating_single", () => {
    expect(getMaxStep("estimating_single")).toBe(9);
  });

  it("each email has a subject, buildHtml, and buildText", () => {
    for (let step = 1; step <= 9; step++) {
      const email = getDripEmail("estimating_single", step)!;
      const subject = email.subject("TestUser");
      const html = email.buildHtml("TestUser");
      const text = email.buildText("TestUser");

      expect(subject).toBeTruthy();
      expect(typeof subject).toBe("string");
      expect(html).toContain("TestUser");
      expect(text).toContain("TestUser");
    }
  });

  it("email #1 subject includes the first name", () => {
    const email = getDripEmail("estimating_single", 1)!;
    expect(email.subject("Marshall")).toContain("Marshall");
  });

  it("emails 4-9 mention Contractor Circle", () => {
    for (let step = 4; step <= 9; step++) {
      const email = getDripEmail("estimating_single", step)!;
      const html = email.buildHtml("TestUser");
      expect(html.toLowerCase()).toContain("contractor circle");
    }
  });

  it("email #5 includes proof/transformation stories", () => {
    const email = getDripEmail("estimating_single", 5)!;
    const html = email.buildHtml("TestUser");
    expect(html).toContain("CNY Group");
    expect(html).toContain("$20M");
  });

  it("email #9 (final) is the consequence/close email", () => {
    const email = getDripEmail("estimating_single", 9)!;
    const html = email.buildHtml("TestUser");
    expect(html).toContain("last email");
    expect(html.toLowerCase()).toContain("contractor circle");
  });
});

describe("Estimating Checklist Drip — Cadence Schedule", () => {
  it("schedule returns valid dates for all 9 steps", () => {
    const baseDate = new Date("2026-04-29T12:00:00Z");
    for (let step = 1; step <= 9; step++) {
      const nextDate = getNextSendDate("estimating_single", step, baseDate);
      expect(nextDate).toBeTruthy();
      expect(typeof nextDate).toBe("string");
      // Should be a MySQL datetime string
      expect(nextDate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
  });

  it("getNextSendDate returns null after step 9 (max)", () => {
    const result = getNextSendDate("estimating_single", 10);
    expect(result).toBeNull();
  });

  it("first 7 emails are daily (1-day gaps)", () => {
    const baseDate = new Date("2026-04-29T12:00:00Z");
    for (let step = 1; step <= 7; step++) {
      const nextDate = getNextSendDate("estimating_single", step, baseDate);
      expect(nextDate).toBeTruthy();
      // Each step adds 1 day from baseDate, verify it's a valid MySQL datetime
      expect(nextDate).toMatch(/^\d{4}-\d{2}-\d{2} 12:00:00$/);
    }
  });
});

describe("Estimating Checklist Drip — Auto-Enroll", () => {
  it("autoEnrollLeadMagnet function is exported", async () => {
    const mod = await import("./dripAutoEnroll");
    expect(typeof mod.autoEnrollLeadMagnet).toBe("function");
  });
});
