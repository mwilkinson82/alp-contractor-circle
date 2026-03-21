import Stripe from "stripe";
import { PRODUCTS } from "./products";

// Initialize Stripe with the secret key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn("[Stripe] STRIPE_SECRET_KEY not set — Stripe features will be unavailable");
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-03-31.basil" as any })
  : null;

// Cache for the price ID so we don't look it up every time
let cachedPriceId: string | null = null;

/**
 * Get or create the Stripe Price for The Contracting Circle subscription.
 * Creates the Product and Price in Stripe if they don't exist yet.
 */
export async function getOrCreateCirclePriceId(): Promise<string> {
  if (cachedPriceId) return cachedPriceId;
  if (!stripe) throw new Error("Stripe is not configured");

  const product = PRODUCTS.contractingCircle;

  // Search for existing product by metadata
  const existingProducts = await stripe.products.search({
    query: `metadata["product_key"]:"${product.metadata.product_key}"`,
  });

  let stripeProduct: Stripe.Product;

  if (existingProducts.data.length > 0) {
    stripeProduct = existingProducts.data[0];
  } else {
    // Create the product
    stripeProduct = await stripe.products.create({
      name: product.name,
      description: product.description,
      metadata: product.metadata,
    });
    console.log(`[Stripe] Created product: ${stripeProduct.id}`);
  }

  // Search for existing active price on this product
  const existingPrices = await stripe.prices.list({
    product: stripeProduct.id,
    active: true,
    type: "recurring",
    limit: 10,
  });

  const matchingPrice = existingPrices.data.find(
    (p) =>
      p.unit_amount === product.priceAmount &&
      p.currency === product.currency &&
      p.recurring?.interval === product.interval
  );

  if (matchingPrice) {
    cachedPriceId = matchingPrice.id;
    return cachedPriceId;
  }

  // Create the price
  const newPrice = await stripe.prices.create({
    product: stripeProduct.id,
    unit_amount: product.priceAmount,
    currency: product.currency,
    recurring: { interval: product.interval },
    metadata: product.metadata,
  });

  console.log(`[Stripe] Created price: ${newPrice.id}`);
  cachedPriceId = newPrice.id;
  return cachedPriceId;
}

/**
 * Create a Stripe Checkout Session for The Contracting Circle subscription.
 */
export async function createCircleCheckoutSession(params: {
  origin: string;
  userId?: number;
  userEmail?: string;
  userName?: string;
}): Promise<string> {
  if (!stripe) throw new Error("Stripe is not configured");

  const priceId = await getOrCreateCirclePriceId();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    allow_promotion_codes: true,
    success_url: `${params.origin}/circle/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${params.origin}/circle?checkout=cancelled`,
    metadata: {
      product_key: "contracting_circle",
      ...(params.userId && { user_id: params.userId.toString() }),
      ...(params.userName && { customer_name: params.userName }),
      ...(params.userEmail && { customer_email: params.userEmail }),
    },
    ...(params.userId && { client_reference_id: params.userId.toString() }),
    ...(params.userEmail && { customer_email: params.userEmail }),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  if (!session.url) {
    throw new Error("Failed to create checkout session URL");
  }

  return session.url;
}
