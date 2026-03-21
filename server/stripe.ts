import Stripe from "stripe";
import type { Express, Request, Response } from "express";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { members } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(ENV.stripeSecretKey, { apiVersion: "2025-04-30.basil" as any });
  }
  return _stripe;
}

// Product configuration
export const PRODUCTS = {
  contractorCircle: {
    name: "Contractor Circle Membership",
    description: "Monthly access to the Contractor Circle — weekly coaching calls, template library, course replays, and private Discord community.",
    priceAmount: 49700, // $497.00 in cents
    currency: "usd",
    interval: "month" as const,
  },
};

export async function createCheckoutSession(memberId: number, memberEmail: string | null, origin: string) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: PRODUCTS.contractorCircle.currency,
          product_data: {
            name: PRODUCTS.contractorCircle.name,
            description: PRODUCTS.contractorCircle.description,
          },
          unit_amount: PRODUCTS.contractorCircle.priceAmount,
          recurring: { interval: PRODUCTS.contractorCircle.interval },
        },
        quantity: 1,
      },
    ],
    customer_email: memberEmail || undefined,
    client_reference_id: memberId.toString(),
    metadata: {
      member_id: memberId.toString(),
    },
    allow_promotion_codes: true,
    success_url: `${origin}/circle/welcome?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/circle`,
  });

  return session;
}

export function registerStripeWebhook(app: Express) {
  // MUST be registered BEFORE express.json() middleware
  app.post("/api/stripe/webhook", async (req: Request, res: Response) => {
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"] as string;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        ENV.stripeWebhookSecret
      );
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const memberId = session.metadata?.member_id;
          if (memberId) {
            const db = await getDb();
            if (db) {
              await db.update(members).set({
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                subscriptionStatus: "active",
              }).where(eq(members.id, parseInt(memberId)));
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const db = await getDb();
          if (db) {
            await db.update(members).set({
              subscriptionStatus: subscription.status,
            }).where(eq(members.stripeSubscriptionId, subscription.id));
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const db = await getDb();
          if (db) {
            await db.update(members).set({
              subscriptionStatus: "canceled",
            }).where(eq(members.stripeSubscriptionId, subscription.id));
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          const db = await getDb();
          const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
          if (db && subId) {
            await db.update(members).set({
              subscriptionStatus: "past_due",
            }).where(eq(members.stripeSubscriptionId, subId));
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[Stripe Webhook] Processing error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
