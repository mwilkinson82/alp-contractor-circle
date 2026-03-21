import { describe, expect, it } from "vitest";
import { buildWelcomeEmailHtml, buildWelcomeEmailText, sendWelcomeEmail } from "./email";

describe("Welcome Email Template - HTML", () => {
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
    expect(html).toContain("https://discord.gg/jnwDPTY6D3");
  });

  it("includes the Founding Member badge", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Founding Member");
  });

  it("includes all three onboarding steps", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Step 1");
    expect(html).toContain("Step 2");
    expect(html).toContain("Step 3");
    expect(html).toContain("Join the Discord Community");
    expect(html).toContain("Mark Your Calendar");
    expect(html).toContain("Start Executing");
  });

  it("includes the membership benefits list", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Weekly Thursday group calls");
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
    expect(html).toContain("#08090D"); // navy-deep background
    expect(html).toContain("#D4915C"); // ember accent
    expect(html).toContain("#EDE6DB"); // cream text
  });

  it("includes Thursday evening call detail", () => {
    const html = buildWelcomeEmailHtml({ name: "Test User" });
    expect(html).toContain("Thursday evening");
  });
});

describe("Welcome Email Template - Plain Text", () => {
  it("includes the member's first name", () => {
    const text = buildWelcomeEmailText({ name: "Jane Doe" });
    expect(text).toContain("Welcome to The Circle, Jane.");
  });

  it("includes the Discord link", () => {
    const text = buildWelcomeEmailText({ name: "Test" });
    expect(text).toContain("https://discord.gg/jnwDPTY6D3");
  });

  it("includes all three steps", () => {
    const text = buildWelcomeEmailText({ name: "Test" });
    expect(text).toContain("STEP 1");
    expect(text).toContain("STEP 2");
    expect(text).toContain("STEP 3");
  });

  it("includes the membership benefits", () => {
    const text = buildWelcomeEmailText({ name: "Test" });
    expect(text).toContain("Weekly Thursday group calls");
    expect(text).toContain("Monthly deal reviews");
  });
});

describe("sendWelcomeEmail", () => {
  it.skip("sends a real email via Resend API (requires RESEND_API_KEY)", async () => {
    // Use Resend's test address to avoid sending to a real inbox
    const result = await sendWelcomeEmail({
      to: "delivered@resend.dev",
      name: "Test Member",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("string");
  });
});
