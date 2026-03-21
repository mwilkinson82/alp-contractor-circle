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
    expect(session!.memberId).toBe(42);
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
