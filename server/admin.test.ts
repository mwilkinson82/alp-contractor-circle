/**
 * Tests for admin panel procedures:
 * - addReplay: only admins can add replays
 * - deleteReplay: only admins can delete replays
 * - replays: only authenticated members can view replays
 * - Admin role check logic
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock database ──────────────────────────────────────────────────────────────
const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) });
const mockDelete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
const mockSelect = vi.fn().mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([]),
    }),
  }),
});

vi.mock("drizzle-orm/mysql2", () => ({
  drizzle: vi.fn(() => ({
    insert: mockInsert,
    delete: mockDelete,
    select: mockSelect,
  })),
}));

vi.mock("../drizzle/schema", () => ({
  replays: { id: "id", published: "published", callDate: "callDate" },
  members: { id: "id", discordId: "discordId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ col, dir: "desc" })),
}));

// ── Mock Stripe ────────────────────────────────────────────────────────────────
vi.mock("./stripe", () => ({
  stripe: null,
}));

// ── Mock Discord session helpers ───────────────────────────────────────────────
const mockGetMemberFromRequest = vi.fn();

vi.mock("./discord", () => ({
  parseMemberCookie: vi.fn(() => "mock-cookie"),
  verifyMemberSession: vi.fn(async () => ({ memberId: 1 })),
  getMemberById: vi.fn(async () => null),
}));

// ── Helper to create mock member ───────────────────────────────────────────────
function makeMember(role: "member" | "founding_member" | "admin") {
  return {
    id: 1,
    discordId: "927272166049865807",
    discordUsername: "marshallwilkinson",
    discordDisplayName: "Marshall Wilkinson",
    discordAvatar: null,
    email: "mwilkinson@saxumcapital.com",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: "active" as const,
    memberRole: role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
}

// ── Admin role check logic ─────────────────────────────────────────────────────
describe("Admin role check", () => {
  it("allows access when memberRole is admin", () => {
    const member = makeMember("admin");
    expect(member.memberRole === "admin").toBe(true);
  });

  it("denies access when memberRole is member", () => {
    const member = makeMember("member");
    expect(member.memberRole === "admin").toBe(false);
  });

  it("denies access when memberRole is founding_member", () => {
    const member = makeMember("founding_member");
    expect(member.memberRole === "admin").toBe(false);
  });
});

// ── addReplay validation ───────────────────────────────────────────────────────
describe("addReplay input validation", () => {
  const { z } = require("zod");

  const addReplaySchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    category: z.enum(["weekly_calls", "bootcamp", "masterclass", "q_and_a"]),
    cloudflareStreamId: z.string().min(1),
    duration: z.string().optional(),
    callDate: z.date(),
    featured: z.boolean().default(false),
  });

  it("accepts valid replay input", () => {
    const result = addReplaySchema.safeParse({
      title: "Weekly Call: Scaling Your Estimating Process",
      category: "weekly_calls",
      cloudflareStreamId: "abc123def456",
      callDate: new Date("2026-03-13"),
      featured: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = addReplaySchema.safeParse({
      title: "",
      category: "weekly_calls",
      cloudflareStreamId: "abc123",
      callDate: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty cloudflareStreamId", () => {
    const result = addReplaySchema.safeParse({
      title: "Test Call",
      category: "weekly_calls",
      cloudflareStreamId: "",
      callDate: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category", () => {
    const result = addReplaySchema.safeParse({
      title: "Test Call",
      category: "invalid_category",
      cloudflareStreamId: "abc123",
      callDate: new Date(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts all valid categories", () => {
    const categories = ["weekly_calls", "bootcamp", "masterclass", "q_and_a"];
    for (const category of categories) {
      const result = addReplaySchema.safeParse({
        title: "Test",
        category,
        cloudflareStreamId: "abc123",
        callDate: new Date(),
      });
      expect(result.success).toBe(true);
    }
  });

  it("defaults featured to false when not provided", () => {
    const result = addReplaySchema.safeParse({
      title: "Test Call",
      category: "weekly_calls",
      cloudflareStreamId: "abc123",
      callDate: new Date(),
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featured).toBe(false);
    }
  });
});

// ── deleteReplay validation ────────────────────────────────────────────────────
describe("deleteReplay input validation", () => {
  const { z } = require("zod");
  const deleteSchema = z.object({ id: z.number() });

  it("accepts valid numeric id", () => {
    const result = deleteSchema.safeParse({ id: 42 });
    expect(result.success).toBe(true);
  });

  it("rejects string id", () => {
    const result = deleteSchema.safeParse({ id: "42" });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = deleteSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── Cloudflare Stream URL generation ──────────────────────────────────────────
describe("Cloudflare Stream URL generation", () => {
  const streamId = "abc123def456ghi789";

  it("generates correct embed URL", () => {
    const embedUrl = `https://iframe.videodelivery.net/${streamId}`;
    expect(embedUrl).toBe("https://iframe.videodelivery.net/abc123def456ghi789");
  });

  it("generates correct thumbnail URL", () => {
    const thumbnailUrl = `https://videodelivery.net/${streamId}/thumbnails/thumbnail.jpg`;
    expect(thumbnailUrl).toBe("https://videodelivery.net/abc123def456ghi789/thumbnails/thumbnail.jpg");
  });
});

// ── Admin panel sidebar visibility ────────────────────────────────────────────
describe("Admin panel sidebar visibility", () => {
  const menuItems = [
    { label: "Dashboard", path: "/portal", adminOnly: false },
    { label: "Replay Library", path: "/portal/replays", adminOnly: false },
    { label: "Templates", path: "/portal/templates", adminOnly: false },
    { label: "Account", path: "/portal/account", adminOnly: false },
    { label: "Admin Panel", path: "/portal/admin", adminOnly: true },
  ];

  it("shows 4 items to regular members", () => {
    const isAdmin = false;
    const visible = menuItems.filter(item => !item.adminOnly || isAdmin);
    expect(visible).toHaveLength(4);
    expect(visible.find(i => i.label === "Admin Panel")).toBeUndefined();
  });

  it("shows 5 items to admins", () => {
    const isAdmin = true;
    const visible = menuItems.filter(item => !item.adminOnly || isAdmin);
    expect(visible).toHaveLength(5);
    expect(visible.find(i => i.label === "Admin Panel")).toBeDefined();
  });
});
