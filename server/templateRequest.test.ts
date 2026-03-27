/**
 * templateRequest.test.ts — Tests for the template request Supabase integration.
 */
import { describe, it, expect, afterEach } from "vitest";
import { insertTemplateRequest, getSupabaseClient } from "./supabaseClient";

const TEST_EMAIL = `vitest-tr-${Date.now()}@test-cleanup.example.com`;

afterEach(async () => {
  // Clean up any test records created during this test run
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase
      .from("template_requests")
      .delete()
      .like("member_email", "%@test-cleanup.example.com");
  }
});

describe("Template Request Supabase Integration", () => {
  it("should insert a template request into Supabase", async () => {
    const result = await insertTemplateRequest({
      memberName: "Vitest Test Member",
      memberEmail: TEST_EMAIL,
      templateTitle: "Test Template Request",
      description: "This is a vitest test request — safe to delete.",
    });

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should verify the inserted record exists in the table", async () => {
    await insertTemplateRequest({
      memberName: "Vitest Test Member",
      memberEmail: TEST_EMAIL,
      templateTitle: "Verification Test",
      description: "Verifying the record was inserted correctly.",
    });

    const supabase = getSupabaseClient();
    expect(supabase).not.toBeNull();

    const { data, error } = await supabase!
      .from("template_requests")
      .select("*")
      .eq("member_email", TEST_EMAIL)
      .order("created_at", { ascending: false })
      .limit(1);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThan(0);
    expect(data![0].template_title).toBe("Verification Test");
    expect(data![0].member_name).toBe("Vitest Test Member");
  });

  it("should allow multiple requests from the same member", async () => {
    const result1 = await insertTemplateRequest({
      memberName: "Vitest Test Member",
      memberEmail: TEST_EMAIL,
      templateTitle: "First Request",
      description: "First template request from this member.",
    });
    const result2 = await insertTemplateRequest({
      memberName: "Vitest Test Member",
      memberEmail: TEST_EMAIL,
      templateTitle: "Second Request",
      description: "Second template request from this member.",
    });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    const supabase = getSupabaseClient();
    const { data } = await supabase!
      .from("template_requests")
      .select("*")
      .eq("member_email", TEST_EMAIL);

    expect(data!.length).toBeGreaterThanOrEqual(2);
  });
});
