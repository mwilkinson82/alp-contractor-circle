import { describe, expect, it } from "vitest";
import { Resend } from "resend";

describe("Resend API Key Validation", () => {
  it.skip("RESEND_API_KEY is set in environment", () => {
    expect(process.env.RESEND_API_KEY).toBeDefined();
    expect(process.env.RESEND_API_KEY).not.toBe("");
    expect(process.env.RESEND_API_KEY!.startsWith("re_")).toBe(true);
  });

  it.skip("can authenticate with Resend API", async () => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Use the domains.list() endpoint as a lightweight auth check
    const { data, error } = await resend.domains.list();

    // If the key is valid, we should not get an authentication error
    // We may get an empty list (no domains configured yet) which is fine
    if (error) {
      // 401/403 means bad key; other errors (like rate limit) are acceptable
      expect(error.message).not.toContain("API key is invalid");
      expect(error.name).not.toBe("validation_error");
    } else {
      expect(data).toBeDefined();
    }
  });
});
