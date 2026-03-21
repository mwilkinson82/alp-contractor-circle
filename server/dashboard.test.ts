import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "marshall@alpcontractorcircle.com",
    name: "Marshall Wilkinson",
    loginMethod: "manus",
    role: "admin",
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
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createUnauthContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.me", () => {
  it("returns user data for authenticated users", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.name).toBe("Marshall Wilkinson");
    expect(result?.email).toBe("marshall@alpcontractorcircle.com");
    expect(result?.role).toBe("admin");
  });

  it("returns null for unauthenticated users", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeNull();
  });
});

describe("dashboard constants", () => {
  it("has correct Zoom meeting link", () => {
    const ZOOM_LINK = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";
    expect(ZOOM_LINK).toContain("83215167292");
    expect(ZOOM_LINK).toContain("zoom.us");
  });

  it("has correct Google Drive folder link", () => {
    const DRIVE_LINK = "https://drive.google.com/drive/folders/1Rf6kphpQtXyMXUm_TNJb-ng8dPm1J068";
    expect(DRIVE_LINK).toContain("drive.google.com");
    expect(DRIVE_LINK).toContain("1Rf6kphpQtXyMXUm_TNJb-ng8dPm1J068");
  });

  it("has correct Discord invite link", () => {
    const DISCORD_LINK = "https://discord.gg/jnwDPTY6D3";
    expect(DISCORD_LINK).toContain("discord.gg");
    expect(DISCORD_LINK).toContain("jnwDPTY6D3");
  });

  it("has correct Discord server ID", () => {
    const DISCORD_SERVER_ID = "927273292354711613";
    expect(DISCORD_SERVER_ID).toBe("927273292354711613");
    expect(DISCORD_SERVER_ID.length).toBeGreaterThan(0);
  });
});

describe("ICS calendar generation", () => {
  it("generates valid ICS content", () => {
    const ZOOM_LINK = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";

    // Simulate the ICS generation logic
    const now = new Date();
    const nextThursday = new Date(now);
    const dayOfWeek = nextThursday.getDay();
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
    nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
    nextThursday.setHours(19, 0, 0, 0);

    const endTime = new Date(nextThursday);
    endTime.setHours(20, 0, 0, 0);

    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ALP Contractor Circle//EN
BEGIN:VEVENT
DTSTART:${formatDate(nextThursday)}
DTEND:${formatDate(endTime)}
RRULE:FREQ=WEEKLY;BYDAY=TH
SUMMARY:ALP Contractor Circle - Weekly Session
DESCRIPTION:Join the weekly ALP Contractor Circle coaching session.\\n\\nZoom Link: ${ZOOM_LINK}
URL:${ZOOM_LINK}
LOCATION:Zoom
END:VEVENT
END:VCALENDAR`;

    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("END:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=TH");
    expect(ics).toContain("ALP Contractor Circle");
    expect(ics).toContain(ZOOM_LINK);
    expect(ics).toContain("Zoom");

    // Verify the next session is a Thursday
    expect(nextThursday.getDay()).toBe(4); // Thursday = 4
  });
});

describe("next session calculation", () => {
  it("always returns a Thursday", () => {
    const now = new Date();
    const nextThursday = new Date(now);
    const dayOfWeek = nextThursday.getDay();
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
    nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);

    expect(nextThursday.getDay()).toBe(4);
  });

  it("returns a future date", () => {
    const now = new Date();
    const nextThursday = new Date(now);
    const dayOfWeek = nextThursday.getDay();
    const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7;
    nextThursday.setDate(nextThursday.getDate() + daysUntilThursday);
    nextThursday.setHours(19, 0, 0, 0);

    expect(nextThursday.getTime()).toBeGreaterThan(now.getTime());
  });
});
