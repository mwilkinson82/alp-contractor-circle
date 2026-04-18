/**
 * Beta Auth Tests — Verify signup, login, session, and logout functionality.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { verifyBetaSession, parseBetaCookie } from "./betaAuth";
import { SignJWT } from "jose";

describe("Beta Auth", () => {
  describe("verifyBetaSession", () => {
    it("should return null for undefined cookie", async () => {
      const result = await verifyBetaSession(undefined);
      expect(result).toBeNull();
    });

    it("should return null for null cookie", async () => {
      const result = await verifyBetaSession(null);
      expect(result).toBeNull();
    });

    it("should return null for invalid JWT", async () => {
      const result = await verifyBetaSession("invalid.token.here");
      expect(result).toBeNull();
    });

    it("should return null for malformed JWT", async () => {
      const result = await verifyBetaSession("not-a-jwt");
      expect(result).toBeNull();
    });

    it("should return null for JWT with wrong type", async () => {
      // Create a valid JWT but with type !== 'beta'
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
      const token = await new SignJWT({
        betaUserId: 1,
        email: "test@example.com",
        type: "member", // Wrong type
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setExpirationTime("1h")
        .sign(secret);

      const result = await verifyBetaSession(token);
      expect(result).toBeNull();
    });

    it("should parse valid beta session token", async () => {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");
      const token = await new SignJWT({
        betaUserId: 123,
        email: "beta@example.com",
        type: "beta",
      })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setExpirationTime("1h")
        .sign(secret);

      const result = await verifyBetaSession(token);
      expect(result).not.toBeNull();
      expect(result?.betaUserId).toBe(123);
      expect(result?.email).toBe("beta@example.com");
    });
  });

  describe("parseBetaCookie", () => {
    it("should return undefined when no cookie header", () => {
      const req = { headers: {} } as any;
      const result = parseBetaCookie(req);
      expect(result).toBeUndefined();
    });

    it("should extract beta_session cookie from header", () => {
      const req = {
        headers: {
          cookie: "beta_session=test-token-123; other=value",
        },
      } as any;
      const result = parseBetaCookie(req);
      expect(result).toBe("test-token-123");
    });

    it("should return undefined if beta_session not present", () => {
      const req = {
        headers: {
          cookie: "other=value; another=data",
        },
      } as any;
      const result = parseBetaCookie(req);
      expect(result).toBeUndefined();
    });

    it("should handle empty cookie header", () => {
      const req = {
        headers: {
          cookie: "",
        },
      } as any;
      const result = parseBetaCookie(req);
      expect(result).toBeUndefined();
    });
  });
});
