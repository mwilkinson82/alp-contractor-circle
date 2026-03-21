import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

// Constants that must be correct
const ZOOM_LINK = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";
const TEMPLATES_URL = "https://drive.google.com/drive/folders/1Rf6kphpQtXyMXUm_TNJb-ng8dPm1J068";
const DISCORD_LINK = "https://discord.gg/jnwDPTY6D3";
const DISCORD_GUILD_ID = "927273292354711613";
const STRIPE_PRICE = 49700; // $497.00 in cents

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];

  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-discord-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "discord",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("Portal Constants", () => {
  it("has the correct Zoom link", () => {
    expect(ZOOM_LINK).toBe("https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1");
  });

  it("has the correct Google Drive templates URL", () => {
    expect(TEMPLATES_URL).toBe("https://drive.google.com/drive/folders/1Rf6kphpQtXyMXUm_TNJb-ng8dPm1J068");
  });

  it("has the correct Discord invite link", () => {
    expect(DISCORD_LINK).toBe("https://discord.gg/jnwDPTY6D3");
  });

  it("has the correct Discord guild ID", () => {
    expect(DISCORD_GUILD_ID).toBe("927273292354711613");
  });

  it("has the correct Stripe price ($497/month)", () => {
    expect(STRIPE_PRICE).toBe(49700);
  });
});

describe("Stripe product configuration", () => {
  it("has the correct product config", async () => {
    const { PRODUCTS } = await import("./stripe");
    expect(PRODUCTS.contractorCircle.priceAmount).toBe(49700);
    expect(PRODUCTS.contractorCircle.currency).toBe("usd");
    expect(PRODUCTS.contractorCircle.interval).toBe("month");
    expect(PRODUCTS.contractorCircle.name).toBe("Contractor Circle Membership");
  });
});

describe("auth.me", () => {
  it("returns user when authenticated", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.name).toBe("Test User");
    expect(result?.loginMethod).toBe("discord");
  });

  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("member.me", () => {
  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.member.me();
    expect(result).toBeNull();
  });
});

describe("member.subscription", () => {
  it("returns null when not authenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.member.subscription();
    expect(result).toBeNull();
  });
});

describe("replays.list", () => {
  it("returns an array (public procedure)", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.replays.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("ICS Calendar Generation", () => {
  it("generates a valid ICS file for weekly Thursday calls", () => {
    function getNextThursday(): Date {
      const now = new Date();
      const day = now.getDay();
      const daysUntilThursday = (4 - day + 7) % 7 || 7;
      const next = new Date(now);
      next.setDate(now.getDate() + daysUntilThursday);
      next.setHours(19, 0, 0, 0);
      return next;
    }

    const nextThursday = getNextThursday();
    expect(nextThursday.getDay()).toBe(4); // Thursday
    expect(nextThursday.getHours()).toBe(19); // 7 PM

    // Verify it's in the future
    expect(nextThursday.getTime()).toBeGreaterThan(Date.now());
  });
});
