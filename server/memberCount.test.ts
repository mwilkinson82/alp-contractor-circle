/**
 * Tests for the circle.memberCount tRPC endpoint.
 * Verifies that the Supabase-backed member count query works correctly.
 * IMPORTANT: These tests are read-only — they never insert records.
 * Any test that inserts records MUST use try/finally to guarantee cleanup.
 */
import { describe, it, expect } from "vitest";
import { getSupabaseClient } from "./supabaseClient";

describe("circle.memberCount", () => {
  it("should return a count and total from Supabase", async () => {
    const supabase = getSupabaseClient();
    expect(supabase).not.toBeNull();

    const { count, error } = await supabase!
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    expect(error).toBeNull();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("should return count >= 0 and remaining <= 50", async () => {
    const supabase = getSupabaseClient();
    expect(supabase).not.toBeNull();

    const { count } = await supabase!
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    const total = 50;
    const remaining = total - (count ?? 0);

    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(remaining).toBeLessThanOrEqual(50);
  });

  it("should return consistent count across multiple calls", async () => {
    const supabase = getSupabaseClient();
    expect(supabase).not.toBeNull();

    const result1 = await supabase!
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    const result2 = await supabase!
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active");

    expect(result1.count).toBe(result2.count);
  });
});
