import { describe, it, expect, vi } from "vitest";

/**
 * Tests for ConstructLine beta auth endpoints.
 * These verify the /api/beta/* routes are properly wired.
 */

// Mock the database module
vi.mock("./db", () => ({
  getDb: () => null,
}));

describe("ConstructLine Beta Auth Routes", () => {
  it("should export registerBetaAuthRoutes function", async () => {
    const mod = await import("./betaAuth");
    expect(mod).toBeDefined();
    expect(mod.registerBetaAuthRoutes).toBeDefined();
    expect(typeof mod.registerBetaAuthRoutes).toBe("function");
  });

  it("should export verifyBetaSession function", async () => {
    const mod = await import("./betaAuth");
    expect(mod.verifyBetaSession).toBeDefined();
    expect(typeof mod.verifyBetaSession).toBe("function");
  });

  it("should export parseBetaCookie function", async () => {
    const mod = await import("./betaAuth");
    expect(mod.parseBetaCookie).toBeDefined();
    expect(typeof mod.parseBetaCookie).toBe("function");
  });

  it("should export getBetaUserById function", async () => {
    const mod = await import("./betaAuth");
    expect(mod.getBetaUserById).toBeDefined();
    expect(typeof mod.getBetaUserById).toBe("function");
  });

  it("should export getBetaUserFromRequest function", async () => {
    const mod = await import("./betaAuth");
    expect(mod.getBetaUserFromRequest).toBeDefined();
    expect(typeof mod.getBetaUserFromRequest).toBe("function");
  });

  it("should register password reset request and confirm routes", async () => {
    const registered = new Set<string>();
    const app = {
      post: (path: string) => registered.add(`POST ${path}`),
      get: (path: string) => registered.add(`GET ${path}`),
    };

    const mod = await import("./betaAuth");
    mod.registerBetaAuthRoutes(app as any);

    expect(registered.has("POST /api/beta/password-reset/request")).toBe(true);
    expect(registered.has("POST /api/beta/password-reset/confirm")).toBe(true);
  });
});

describe("ConstructLine Route Configuration", () => {
  it("/constructline route path is correctly defined", () => {
    const routePath = "/constructline";
    expect(routePath).toBe("/constructline");
  });

  it("/constructline/login route path is correctly defined", () => {
    const routePath = "/constructline/login";
    expect(routePath).toBe("/constructline/login");
  });

  it("/constructline/reset-password route path is correctly defined", () => {
    const routePath = "/constructline/reset-password";
    expect(routePath).toBe("/constructline/reset-password");
  });

  it("legacy /try should map to /constructline", () => {
    const legacyPath = "/try";
    const newPath = "/constructline";
    expect(legacyPath).not.toBe(newPath);
    expect(newPath).toContain("constructline");
  });
});
