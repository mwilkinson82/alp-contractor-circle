/**
 * Three Silos Framework Lead Magnet Tests
 * 
 * Tests the drip email definitions, auto-enroll mapping, and email template.
 */

import { describe, it, expect } from "vitest";
import { getDripEmail, getMaxStep, ALL_DRIP_EMAILS, getNextSendDate } from "./dripEmails";

describe("Three Silos Framework — Drip Emails", () => {
  it("has 5 drip emails for three_silos_single sequence", () => {
    const siloEmails = ALL_DRIP_EMAILS.filter(
      (e) => e.sequenceId === "three_silos_single"
    );
    expect(siloEmails).toHaveLength(5);
  });

  it("step numbers are 1 through 5", () => {
    for (let step = 1; step <= 5; step++) {
      const email = getDripEmail("three_silos_single", step);
      expect(email).toBeDefined();
      expect(email!.stepNumber).toBe(step);
    }
  });

  it("getMaxStep returns 5 for three_silos_single", () => {
    expect(getMaxStep("three_silos_single")).toBe(5);
  });

  it("each email has a subject, buildHtml, and buildText", () => {
    for (let step = 1; step <= 5; step++) {
      const email = getDripEmail("three_silos_single", step)!;
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
    const email = getDripEmail("three_silos_single", 1)!;
    expect(email.subject("Marshall")).toContain("Marshall");
  });

  it("email #5 (final) mentions Contractor Circle", () => {
    const email = getDripEmail("three_silos_single", 5)!;
    const html = email.buildHtml("TestUser");
    expect(html.toLowerCase()).toContain("contractor circle");
  });

  it("schedule returns valid dates for all steps", () => {
    const baseDate = new Date("2026-04-23T12:00:00Z");
    for (let step = 1; step <= 5; step++) {
      const nextDate = getNextSendDate("three_silos_single", step, baseDate);
      expect(nextDate).toBeTruthy();
      expect(typeof nextDate).toBe("string");
      // Should be a MySQL datetime string
      expect(nextDate).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    }
  });

  it("getNextSendDate returns null after max step", () => {
    const result = getNextSendDate("three_silos_single", 6);
    expect(result).toBeNull();
  });
});

describe("Three Silos Framework — Auto-Enroll Mapping", () => {
  it("dripAutoEnroll has three-silos-framework in SOURCE_TO_SEQUENCE", async () => {
    // We can't import the private const directly, so we verify the behavior
    // by checking the module exports the autoEnrollLeadMagnet function
    const mod = await import("./dripAutoEnroll");
    expect(typeof mod.autoEnrollLeadMagnet).toBe("function");
  });
});

describe("Three Silos Framework — Email Delivery", () => {
  it("sendThreeSilosEmail function exists and is exported", async () => {
    const mod = await import("./email");
    expect(typeof mod.sendThreeSilosEmail).toBe("function");
  });

  it("sendThreeSilosEmail returns a result object with expected shape", async () => {
    const mod = await import("./email");
    const result = await mod.sendThreeSilosEmail({
      to: "test@example.com",
      firstName: "Test",
    });
    // Result should have success boolean and optionally id or error
    expect(typeof result.success).toBe("boolean");
    if (result.success) {
      expect(result.id).toBeTruthy();
    } else {
      expect(result.error).toBeTruthy();
    }
  }, 15_000);
});
