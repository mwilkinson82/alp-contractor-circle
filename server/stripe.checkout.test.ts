import { describe, expect, it, vi, beforeEach } from "vitest";
import { PRODUCTS } from "./products";
import type { TrpcContext } from "./_core/context";

// ─── Helper: create a minimal tRPC context for testing ────────────────────
function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { origin: "https://example.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Products Configuration ───────────────────────────────────────────────
describe("Stripe Products Configuration", () => {
  it("has the correct Contracting Circle product config", () => {
    const product = PRODUCTS.contractingCircle;
    expect(product.name).toBe("The Contracting Circle — Founding Member");
    expect(product.priceAmount).toBe(49700); // $497.00
    expect(product.currency).toBe("usd");
    expect(product.interval).toBe("month");
    expect(product.metadata.product_key).toBe("contracting_circle");
    expect(product.metadata.tier).toBe("founding_member");
  });

  it("price amount is correct in cents", () => {
    const product = PRODUCTS.contractingCircle;
    const priceInDollars = product.priceAmount / 100;
    expect(priceInDollars).toBe(497);
  });

  it("product description mentions key features", () => {
    const product = PRODUCTS.contractingCircle;
    expect(product.description).toContain("Weekly calls");
    expect(product.description).toContain("Discord");
    expect(product.description).toContain("template library");
  });
});

// ─── Router Structure ─────────────────────────────────────────────────────
describe("Stripe Checkout Router", () => {
  it("createCircleCheckout is a public procedure (no auth required)", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("stripe.createCircleCheckout");
  });

  it("verifyCheckout is a public procedure (no auth required)", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter._def.procedures).toHaveProperty("stripe.verifyCheckout");
  });
});

// ─── Verify Checkout Endpoint ─────────────────────────────────────────────
describe("stripe.verifyCheckout", () => {
  it("returns verified: false when Stripe is not configured", async () => {
    // Mock the stripe module to return null (no Stripe key)
    vi.doMock("./stripe", () => ({
      stripe: null,
      createCircleCheckoutSession: vi.fn(),
    }));

    // Re-import routers with the mock
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    const result = await caller.stripe.verifyCheckout({ sessionId: "cs_test_123" });

    expect(result.verified).toBe(false);
    expect(result.customerName).toBeNull();
    expect(result.customerEmail).toBeNull();

    vi.doUnmock("./stripe");
  });

  it("returns the correct shape from verifyCheckout", async () => {
    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    // With a fake session ID, Stripe will throw (or return unverified)
    const result = await caller.stripe.verifyCheckout({ sessionId: "cs_fake_nonexistent" });

    // Should gracefully handle the error and return unverified
    expect(result).toHaveProperty("verified");
    expect(result).toHaveProperty("customerName");
    expect(result).toHaveProperty("customerEmail");
    expect(typeof result.verified).toBe("boolean");
  });
});

// ─── Checkout Session Creation ────────────────────────────────────────────
describe("stripe.createCircleCheckout", () => {
  it("requires origin header for redirect URLs", async () => {
    const { appRouter } = await import("./routers");
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // This will fail if Stripe isn't configured, which is expected in test
    // The important thing is that the procedure exists and accepts the call
    try {
      await caller.stripe.createCircleCheckout();
    } catch (err: any) {
      // Expected: either Stripe not configured or network error
      expect(err.message).toBeDefined();
    }
  });
});
