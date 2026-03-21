/**
 * Stripe product and price configuration for The Contracting Circle.
 * Prices are created dynamically on first checkout if they don't exist yet.
 */

export const PRODUCTS = {
  contractingCircle: {
    name: "The Contracting Circle — Founding Member",
    description:
      "Elite contractor community & execution engine. Weekly calls, monthly deal reviews, bootcamps, template library, and Discord community access.",
    priceAmount: 49700, // $497.00 in cents
    currency: "usd",
    interval: "month" as const,
    metadata: {
      product_key: "contracting_circle",
      tier: "founding_member",
    },
  },
} as const;
