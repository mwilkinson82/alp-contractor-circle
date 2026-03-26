/**
 * Tests for the Supabase leads table and insertSupabaseLead helper.
 * Uses try/finally to guarantee cleanup — no test records left behind.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Supabase Leads", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should connect to the leads table and query it", async () => {
    const { getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    const { count, error } = await client!
      .from("leads")
      .select("*", { count: "exact", head: true });

    expect(error).toBeNull();
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(3); // We inserted 3 initial leads
  });

  it("should have the 3 initial leads present", async () => {
    const { getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    const { data, error } = await client!
      .from("leads")
      .select("email, source")
      .order("created_at", { ascending: true });

    expect(error).toBeNull();
    expect(data).not.toBeNull();

    const emails = data!.map((r: any) => r.email);
    expect(emails).toContain("mateodavidjohnston@gmail.com");
    expect(emails).toContain("bbell@mlbell.com");
    expect(emails).toContain("rob@reviverestorationusa.com");
  });

  it("insertSupabaseLead should insert and clean up a test lead", async () => {
    const { insertSupabaseLead, getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    const testEmail = `vitest-lead-${Date.now()}@test-cleanup.example.com`;

    try {
      const result = await insertSupabaseLead({
        name: "Test Lead",
        email: testEmail,
        source: "vitest-test",
      });

      expect(result.success).toBe(true);

      // Verify the record exists
      const { data, error } = await client!
        .from("leads")
        .select("*")
        .eq("email", testEmail)
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data!.name).toBe("Test Lead");
      expect(data!.source).toBe("vitest-test");
    } finally {
      // Always clean up
      await client!
        .from("leads")
        .delete()
        .eq("email", testEmail);
    }
  });

  it("insertSupabaseLead should upsert on duplicate email without error", async () => {
    const { insertSupabaseLead, getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    const testEmail = `vitest-lead-dup-${Date.now()}@test-cleanup.example.com`;

    try {
      // First insert
      const result1 = await insertSupabaseLead({
        name: "First Insert",
        email: testEmail,
        source: "vitest-first",
      });
      expect(result1.success).toBe(true);

      // Second insert (upsert) — should not error
      const result2 = await insertSupabaseLead({
        name: "Updated Name",
        email: testEmail,
        source: "vitest-second",
      });
      expect(result2.success).toBe(true);

      // Verify only one record exists with updated source
      const { data } = await client!
        .from("leads")
        .select("*")
        .eq("email", testEmail);

      expect(data).not.toBeNull();
      expect(data!.length).toBe(1);
      expect(data![0].source).toBe("vitest-second");
    } finally {
      await client!
        .from("leads")
        .delete()
        .eq("email", testEmail);
    }
  });
});
