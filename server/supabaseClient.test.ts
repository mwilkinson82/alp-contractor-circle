import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for supabaseClient.ts — validates Supabase credentials and upsert logic.
 */

describe("Supabase Client", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset module cache so getSupabaseClient re-initializes
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("should have SUPABASE_URL and SUPABASE_ANON_KEY set in environment", () => {
    expect(process.env.SUPABASE_URL).toBeTruthy();
    expect(process.env.SUPABASE_URL).toContain("supabase.co");
    expect(process.env.SUPABASE_ANON_KEY).toBeTruthy();
    expect(process.env.SUPABASE_ANON_KEY!.length).toBeGreaterThan(50);
  });

  it("should initialize Supabase client when credentials are set", async () => {
    const { getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();
  });

  it("should return null when SUPABASE_URL is missing", async () => {
    delete process.env.SUPABASE_URL;
    const { getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).toBeNull();
  });

  it("should successfully connect to Supabase and query the members table", async () => {
    const { getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    // Verify we can reach the members table (just a count query, no data mutation)
    const { count, error } = await client!
      .from("members")
      .select("*", { count: "exact", head: true });

    expect(error).toBeNull();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("upsertSupabaseMember should successfully insert a test member and clean up", async () => {
    const { upsertSupabaseMember, getSupabaseClient } = await import("./supabaseClient");
    const client = getSupabaseClient();
    expect(client).not.toBeNull();

    const testEmail = `vitest-${Date.now()}@test-cleanup.example.com`;

    // Insert test member
    const result = await upsertSupabaseMember({
      name: "Vitest Test Member",
      email: testEmail,
      subscriptionStatus: "active",
      foundingMember: true,
      stripeSessionId: "cs_test_vitest_123",
      stripeCustomerId: "cus_test_vitest_123",
    });

    expect(result.success).toBe(true);

    // Verify the record exists
    const { data, error } = await client!
      .from("members")
      .select("*")
      .eq("email", testEmail)
      .single();

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.name).toBe("Vitest Test Member");
    expect(data!.subscription_status).toBe("active");
    expect(data!.founding_member).toBe(true);
    expect(data!.stripe_session_id).toBe("cs_test_vitest_123");

    // Clean up — delete the test record
    const { error: deleteError } = await client!
      .from("members")
      .delete()
      .eq("email", testEmail);

    expect(deleteError).toBeNull();
  });
});
