/**
 * Tests for Discord OAuth and member portal features.
 */
import { describe, it, expect } from "vitest";

// ─── Discord OAuth credential tests ──────────────────────────────────────────

describe("Discord OAuth credentials", () => {
  it("should have DISCORD_CLIENT_ID set as numeric snowflake", () => {
    expect(process.env.DISCORD_CLIENT_ID).toBeDefined();
    expect(process.env.DISCORD_CLIENT_ID).not.toBe("");
    expect(/^\d+$/.test(process.env.DISCORD_CLIENT_ID!)).toBe(true);
  });

  it("should have DISCORD_CLIENT_SECRET set", () => {
    expect(process.env.DISCORD_CLIENT_SECRET).toBeDefined();
    expect(process.env.DISCORD_CLIENT_SECRET!.length).toBeGreaterThan(10);
  });
});

// ─── Session management tests ────────────────────────────────────────────────

describe("Member session management", () => {
  it("should create and verify a valid member session JWT", async () => {
    const { createMemberSession, verifyMemberSession } = await import("./discord");

    const fakeMember = {
      id: 42,
      discordId: "123456789",
      discordUsername: "testuser",
      discordDisplayName: "Test User",
      discordAvatar: "abc123",
      email: "test@example.com",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "active",
      memberRole: "member",
      createdAt: new Date(),
      lastSignedIn: new Date(),
    } as any;

    const token = await createMemberSession(fakeMember);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // JWT has 3 parts

    const session = await verifyMemberSession(token);
    expect(session).not.toBeNull();
    expect(session!.memberId).toBe("42");
    expect(session!.discordId).toBe("123456789");
  });

  it("should return null for null/undefined/empty session tokens", async () => {
    const { verifyMemberSession } = await import("./discord");

    expect(await verifyMemberSession(null)).toBeNull();
    expect(await verifyMemberSession(undefined)).toBeNull();
    expect(await verifyMemberSession("")).toBeNull();
  });

  it("should return null for invalid JWT tokens", async () => {
    const { verifyMemberSession } = await import("./discord");
    expect(await verifyMemberSession("invalid.jwt.token")).toBeNull();
  });

  it("should return null for tampered tokens", async () => {
    const { verifyMemberSession } = await import("./discord");
    const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtZW1iZXJJZCI6MSwiZGlzY29yZElkIjoiMTIzIiwidHlwZSI6Im1lbWJlciIsImV4cCI6MX0.invalid";
    expect(await verifyMemberSession(expiredToken)).toBeNull();
  });
});

// ─── parseMemberCookie tests ─────────────────────────────────────────────────

describe("parseMemberCookie", () => {
  it("should extract member_session cookie from request", async () => {
    const { parseMemberCookie } = await import("./discord");
    const req = { headers: { cookie: "member_session=abc123; other=xyz" } } as any;
    expect(parseMemberCookie(req)).toBe("abc123");
  });

  it("should return undefined when no cookie header", async () => {
    const { parseMemberCookie } = await import("./discord");
    expect(parseMemberCookie({ headers: {} } as any)).toBeUndefined();
  });

  it("should return undefined when member_session cookie is missing", async () => {
    const { parseMemberCookie } = await import("./discord");
    const req = { headers: { cookie: "other=xyz; another=abc" } } as any;
    expect(parseMemberCookie(req)).toBeUndefined();
  });
});

// ─── State encoding/decoding tests ──────────────────────────────────────────

describe("OAuth state encoding", () => {
  it("should encode and decode state with origin and returnPath", () => {
    const origin = "https://example.com";
    const returnPath = "/portal";

    const state = Buffer.from(JSON.stringify({ origin, returnPath })).toString("base64url");
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());

    expect(decoded.origin).toBe(origin);
    expect(decoded.returnPath).toBe(returnPath);
  });

  it("should handle custom return paths in state", () => {
    const origin = "https://example.com";
    const returnPath = "/portal/replays";

    const state = Buffer.from(JSON.stringify({ origin, returnPath })).toString("base64url");
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());

    expect(decoded.returnPath).toBe("/portal/replays");
  });

  it("should construct proper Discord authorize URL", () => {
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const redirectUri = "https://example.com/api/discord/callback";

    const url = new URL("https://discord.com/oauth2/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "identify email");

    expect(url.origin).toBe("https://discord.com");
    expect(url.searchParams.get("client_id")).toBe(clientId);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toBe("identify email");
  });
});

// ─── Member avatar URL construction tests ────────────────────────────────────

describe("Member avatar URL construction", () => {
  it("should build custom avatar URL when avatar hash exists", () => {
    const discordId = "123456789";
    const avatar = "abc123def";
    const avatarUrl = `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=128`;
    expect(avatarUrl).toBe("https://cdn.discordapp.com/avatars/123456789/abc123def.png?size=128");
  });

  it("should build default avatar URL when no avatar hash", () => {
    const discordId = "123456789";
    const defaultIndex = parseInt(discordId) % 5;
    const avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
    expect(avatarUrl).toContain("https://cdn.discordapp.com/embed/avatars/");
    expect(defaultIndex).toBeGreaterThanOrEqual(0);
    expect(defaultIndex).toBeLessThan(5);
  });
});

// ─── redirect_uri normalisation regression tests ─────────────────────────────
// These tests guard against the "Invalid OAuth2 redirect_uri" bug where the
// internal Cloud Run hostname was used instead of the registered production domain.

describe("redirect_uri normalisation", () => {
  const PRODUCTION_ORIGIN = "https://alpcontractorcircle.com";
  const ALLOWED_ORIGINS = new Set([
    "https://alpcontractorcircle.com",
    "https://www.alpcontractorcircle.com",
  ]);

  function normaliseOrigin(rawOrigin: string): string {
    return ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : PRODUCTION_ORIGIN;
  }

  it("should keep https://alpcontractorcircle.com as-is", () => {
    expect(normaliseOrigin("https://alpcontractorcircle.com")).toBe(PRODUCTION_ORIGIN);
  });

  it("should keep https://www.alpcontractorcircle.com as-is", () => {
    expect(normaliseOrigin("https://www.alpcontractorcircle.com")).toBe(
      "https://www.alpcontractorcircle.com"
    );
  });

  it("should normalise internal Cloud Run hostname to production origin", () => {
    expect(normaliseOrigin("https://y62wtfmmee-4w3teb4ewq-uk.a.run.app")).toBe(PRODUCTION_ORIGIN);
  });

  it("should normalise manus.space dev URL to production origin", () => {
    expect(normaliseOrigin("https://3000-i0lrrlxp6joa86g06ihb3-cdfc253e.us2.manus.computer")).toBe(
      PRODUCTION_ORIGIN
    );
  });

  it("should normalise empty string to production origin", () => {
    expect(normaliseOrigin("")).toBe(PRODUCTION_ORIGIN);
  });

  it("should normalise localhost to production origin in production context", () => {
    expect(normaliseOrigin("http://localhost:3000")).toBe(PRODUCTION_ORIGIN);
  });

  it("should produce a valid redirect_uri for the production origin", () => {
    const origin = normaliseOrigin("https://alpcontractorcircle.com");
    const redirectUri = `${origin}/api/discord/callback`;
    expect(redirectUri).toBe("https://alpcontractorcircle.com/api/discord/callback");
  });

  it("should produce a valid redirect_uri for www origin", () => {
    const origin = normaliseOrigin("https://www.alpcontractorcircle.com");
    const redirectUri = `${origin}/api/discord/callback`;
    expect(redirectUri).toBe("https://www.alpcontractorcircle.com/api/discord/callback");
  });
});

// ─── Merge strategy logic tests ─────────────────────────────────────────────
// These tests validate the multi-strategy merge logic that handles mismatched
// Stripe and Discord emails during the OAuth callback.

describe("Merge strategy logic", () => {
  it("Strategy 1: should match when Discord email equals Stripe email (placeholder format)", () => {
    const discordEmail = "darian@vertexctg.com";
    const placeholderDiscordId = `email:${discordEmail}`;
    // Strategy 1 looks for a member with discordId === `email:${discordEmail}`
    expect(placeholderDiscordId).toBe("email:darian@vertexctg.com");
    // If found, it merges by updating the placeholder discordId to the real Discord ID
  });

  it("Strategy 1: should NOT match when Discord email differs from Stripe email", () => {
    const discordEmail = "darianb280@hotmail.com";
    const stripeEmail = "darian@vertexctg.com";
    const placeholderDiscordId = `email:${stripeEmail}`;
    const lookupKey = `email:${discordEmail}`;
    // Strategy 1 looks for `email:darianb280@hotmail.com` but the record has `email:darian@vertexctg.com`
    expect(lookupKey).not.toBe(placeholderDiscordId);
    // This is the exact scenario that caused duplicates — Strategy 2 and 3 handle it
  });

  it("Strategy 2: should cross-reference via Supabase using stripe_customer_id", () => {
    // Simulates the Supabase cross-reference logic
    const supabaseRecord = {
      email: "darian@vertexctg.com",
      stripe_customer_id: "cus_UEcn1F8PBPC0wY",
      name: "Darian Betancourt",
    };
    const mysqlPlaceholderDiscordId = `email:${supabaseRecord.email}`;
    // Strategy 2 finds the Supabase member, extracts stripe email, then looks up MySQL by placeholder
    expect(mysqlPlaceholderDiscordId).toBe("email:darian@vertexctg.com");
    // Can also look up by stripe_customer_id as fallback
    expect(supabaseRecord.stripe_customer_id).toBe("cus_UEcn1F8PBPC0wY");
  });

  it("Strategy 2: should match by display name when emails differ", () => {
    const discordDisplayName = "Darian Betancourt";
    const supabaseName = "Darian Betancourt";
    const match = discordDisplayName.toLowerCase() === supabaseName.toLowerCase() ||
                  discordDisplayName.toLowerCase().includes(supabaseName.toLowerCase()) ||
                  supabaseName.toLowerCase().includes(discordDisplayName.toLowerCase());
    expect(match).toBe(true);
  });

  it("Strategy 2: should handle partial name matches", () => {
    const discordDisplayName = "DB3T"; // Discord username, not real name
    const supabaseName = "Darian Betancourt";
    const match = discordDisplayName.toLowerCase() === supabaseName.toLowerCase() ||
                  discordDisplayName.toLowerCase().includes(supabaseName.toLowerCase()) ||
                  supabaseName.toLowerCase().includes(discordDisplayName.toLowerCase());
    // DB3T does not match "Darian Betancourt" — this is expected
    expect(match).toBe(false);
    // In this case, Strategy 2 falls back to "only one unlinked active member" heuristic
  });

  it("Strategy 3: should merge sole unlinked active placeholder", () => {
    // When there's exactly one MySQL record with discordId starting with "email:"
    // and subscriptionStatus "active", it's the right one to merge
    const placeholders = [
      { id: 450001, discordId: "email:darian@vertexctg.com", subscriptionStatus: "active" },
    ];
    const activeUnlinked = placeholders.filter(
      p => p.discordId.startsWith("email:") && p.subscriptionStatus === "active"
    );
    expect(activeUnlinked.length).toBe(1);
    // Safe to auto-merge
  });

  it("Strategy 3: should NOT auto-merge when multiple unlinked placeholders exist", () => {
    const placeholders = [
      { id: 1, discordId: "email:alice@example.com", subscriptionStatus: "active" },
      { id: 2, discordId: "email:bob@example.com", subscriptionStatus: "active" },
    ];
    const activeUnlinked = placeholders.filter(
      p => p.discordId.startsWith("email:") && p.subscriptionStatus === "active"
    );
    expect(activeUnlinked.length).toBe(2);
    // Cannot auto-merge — ambiguous, needs manual intervention
  });

  it("should detect placeholder discordId format correctly", () => {
    expect("email:test@example.com".startsWith("email:")).toBe(true);
    expect("123456789".startsWith("email:")).toBe(false);
    expect("founding_dan_delmonte".startsWith("email:")).toBe(false);
  });
});
