import { describe, expect, it } from "vitest";
import {
  buildWelcomeEmailHtml,
  buildWelcomeEmailText,
  buildFoundingMemberEmailHtml,
  buildFoundingMemberEmailText,
  sendWelcomeEmail,
  sendFoundingMemberEmail,
} from "./email";

// ─── Welcome Email #1 — Getting Started ──────────────────────────────────────

describe("Welcome Email #1 — HTML", () => {
  it("includes the member's first name in the greeting", () => {
    const html = buildWelcomeEmailHtml({ name: "John Smith" });
    expect(html).toContain("Welcome to The Circle, John.");
  });

  it("falls back to 'there' when name is empty", () => {
    const html = buildWelcomeEmailHtml({ name: "" });
    expect(html).toContain("Welcome to The Circle, there.");
  });

  it("includes the Discord invite link", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("https://discord.gg/rsK5HZcF");
  });

  it("includes the Founding Member badge", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Founding Member");
  });

  it("includes all three onboarding steps with correct content", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Step 1");
    expect(html).toContain("Step 2");
    expect(html).toContain("Step 3");
    expect(html).toContain("Join the Discord Community");
    expect(html).toContain("Add the Bi-Weekly Call to Your Calendar");
    expect(html).toContain("Start Executing in the Portal");
  });

  it("includes the Zoom link in the calendar step", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("us06web.zoom.us");
  });

  it("includes add-to-calendar buttons for Google, Apple, and Outlook", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("+ Google");
    expect(html).toContain("+ Apple");
    expect(html).toContain("+ Outlook");
  });

  it("includes the portal login CTA", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Access Your Member Portal");
    expect(html).toContain("alpcontractorcircle.com/portal");
  });

  it("includes the membership benefits list", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Bi-weekly Sunday group calls with Marshall");
    expect(html).toContain("Monthly deal reviews");
    expect(html).toContain("template library");
    expect(html).toContain("Discord community");
    expect(html).toContain("replay library");
  });

  it("includes Marshall's quote", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("The future is bright");
    expect(html).toContain("Marshall Wilkinson");
  });

  it("uses the Midnight Ember color scheme", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("#08090D");
    expect(html).toContain("#D4915C");
    expect(html).toContain("#EDE6DB");
  });

  it("includes Sunday call detail", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Sunday");
  });
});

describe("Welcome Email #1 — Plain Text", () => {
  it("includes the member's first name", () => {
    const text = buildWelcomeEmailText({ name: "Jane Doe" });
    expect(text).toContain("Welcome to The Circle, Jane.");
  });

  it("includes the Discord link", () => {
    const text = buildWelcomeEmailText({ name: "Test" });
    expect(text).toContain("https://discord.gg/rsK5HZcF");
  });

  it("includes all three steps", () => {
    const text = buildWelcomeEmailText({ name: "Test" });
    expect(text).toContain("STEP 1");
    expect(text).toContain("STEP 2");
    expect(text).toContain("STEP 3");
  });

  it("includes Zoom link in plain text", () => {
    const text = buildWelcomeEmailText({ name: "Test" });
    expect(text).toContain("us06web.zoom.us");
  });

  it("includes the membership benefits", () => {
    const text = buildWelcomeEmailText({ name: "Test" });
    expect(text).toContain("Bi-weekly Sunday group calls with Marshall");
    expect(text).toContain("Monthly deal reviews");
  });
});

// ─── Welcome Email #2 — Founding Member ──────────────────────────────────────

describe("Founding Member Email #2 — HTML", () => {
  it("includes the member's first name", () => {
    const html = buildFoundingMemberEmailHtml({ name: "Alex Builder" });
    expect(html).toContain("Alex");
  });

  it("includes the Founding Member badge", () => {
    const html = buildFoundingMemberEmailHtml({ name: "Test User" });
    expect(html).toContain("Founding Member");
  });

  it("includes grandfathered pricing message", () => {
    const html = buildFoundingMemberEmailHtml({ name: "Test User" });
    expect(html).toContain("grandfathered");
    expect(html).toContain("Price Locked");
  });

  it("includes limited spots message", () => {
    const html = buildFoundingMemberEmailHtml({ name: "Test User" });
    expect(html).toContain("Limited Spots");
  });

  it("includes Marshall's personal message", () => {
    const html = buildFoundingMemberEmailHtml({ name: "Test User" });
    expect(html).toContain("2.5 billion");
    expect(html).toContain("Marshall Wilkinson");
  });

  it("includes the portal CTA", () => {
    const html = buildFoundingMemberEmailHtml({ name: "Test User" });
    expect(html).toContain("Access Your Member Portal");
    expect(html).toContain("alpcontractorcircle.com/portal");
  });

  it("uses the Midnight Ember color scheme", () => {
    const html = buildFoundingMemberEmailHtml({ name: "Test User" });
    expect(html).toContain("#08090D");
    expect(html).toContain("#D4915C");
  });
});

describe("Founding Member Email #2 — Plain Text", () => {
  it("includes the member's first name", () => {
    const text = buildFoundingMemberEmailText({ name: "Sam Contractor" });
    expect(text).toContain("Sam");
  });

  it("includes grandfathered pricing message", () => {
    const text = buildFoundingMemberEmailText({ name: "Test" });
    expect(text).toContain("grandfathered");
  });

  it("includes Marshall's quote", () => {
    const text = buildFoundingMemberEmailText({ name: "Test" });
    expect(text).toContain("2.5 billion");
  });
});

// ─── Integration tests (skipped unless RESEND_API_KEY is set) ─────────────────

describe("sendWelcomeEmail", () => {
  it.skip("sends a real email via Resend API (requires RESEND_API_KEY)", async () => {
    const result = await sendWelcomeEmail({
      to: "delivered@resend.dev",
      name: "Test Member",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});

describe("sendFoundingMemberEmail", () => {
  it.skip("sends a real founding member email via Resend API (requires RESEND_API_KEY)", async () => {
    const result = await sendFoundingMemberEmail({
      to: "delivered@resend.dev",
      name: "Test Member",
    });
    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});
