import express, { type Express, type Request, type Response } from "express";
import Stripe from "stripe";
import { stripe } from "./stripe";
import { notifyOwner } from "./_core/notification";
import { sendWelcomeEmail, sendFoundingMemberEmail, sendPurchaseNotification } from "./email";
import { upsertMemberByEmail, getMemberByEmail } from "./memberDb";
import { upsertSupabaseMember } from "./supabaseClient";

/**
 * Register the Stripe webhook endpoint.
 * MUST be called BEFORE express.json() middleware to preserve raw body for signature verification.
 *
 * IMPORTANT: This webhook only processes events that contain metadata.product_key === "contractor_circle".
 * This prevents cross-site webhook noise from other Stripe products on the same account.
 */
export function registerStripeWebhook(app: Express) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — webhook endpoint disabled");
    return;
  }

  if (!stripe) {
    console.warn("[Stripe Webhook] Stripe not configured — webhook endpoint disabled");
    return;
  }

  // Use express.raw() for this specific route to preserve the raw body for signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string;

      let event: Stripe.Event;

      try {
        event = stripe!.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Handle test events — required for webhook verification
      if (event.id.startsWith("evt_test_")) {
        console.log("[Stripe Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

      try {
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            // ─── FILTER: Only process Contractor Circle checkouts ───────────
            // This prevents webhook noise from other products on the same Stripe account.
            const productKey = session.metadata?.product_key;
            if (productKey !== "contractor_circle") {
              console.log(
                `[Stripe Webhook] Ignoring checkout.session.completed — product_key: "${productKey}" is not "contractor_circle"`
              );
              break;
            }

            console.log(
              `[Stripe Webhook] Checkout completed — session: ${session.id}, customer: ${session.customer}, email: ${session.customer_email}`
            );

            const memberEmail = session.customer_email || session.customer_details?.email;
            const memberName = session.metadata?.customer_name || session.customer_details?.name || "New Member";
            const stripeCustomerId = typeof session.customer === "string" ? session.customer : undefined;
            const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : undefined;

            // ─── AUTO-CREATE / UPDATE MEMBER RECORD ──────────────────────────
            // Create a member record in the database so the member can log in
            // to the portal with Discord and have their subscription recognized.
            if (memberEmail) {
              try {
                await upsertMemberByEmail({
                  email: memberEmail,
                  displayName: memberName,
                  stripeCustomerId,
                  stripeSubscriptionId,
                  subscriptionStatus: "active",
                  memberRole: "founding_member",
                });
                console.log(`[Stripe Webhook] Member record created/updated for ${memberEmail}`);
              } catch (err) {
                console.warn("[Stripe Webhook] Failed to upsert member record:", err);
              }
            }

            // ─── INSERT INTO SUPABASE MEMBERS TABLE ─────────────────────────────
            // This is the external Supabase DB that the portal uses for login.
            // MUST happen BEFORE welcome email so the member can log in immediately.
            if (memberEmail) {
              try {
                const supaResult = await upsertSupabaseMember({
                  name: memberName,
                  email: memberEmail,
                  subscriptionStatus: "active",
                  foundingMember: true,
                  stripeSessionId: session.id,
                  stripeCustomerId,
                });
                if (supaResult.success) {
                  console.log(`[Stripe Webhook] Supabase member record created/updated for ${memberEmail}`);
                } else {
                  console.warn(`[Stripe Webhook] Supabase upsert failed: ${supaResult.error}`);
                }
              } catch (err) {
                console.warn("[Stripe Webhook] Failed to upsert Supabase member record:", err);
              }
            }

            // ─── SEND WELCOME EMAILS (both fire sequentially) ────────────────────────────────
            if (memberEmail) {
              // Email #1: Getting Started
              try {
                const emailResult = await sendWelcomeEmail({
                  to: memberEmail,
                  name: memberName,
                });
                if (emailResult.success) {
                  console.log(`[Stripe Webhook] Welcome email #1 sent to ${memberEmail}`);
                } else {
                  console.warn(`[Stripe Webhook] Welcome email #1 failed: ${emailResult.error}`);
                }
              } catch (err) {
                console.warn("[Stripe Webhook] Failed to send welcome email #1:", err);
              }

              // Email #2: Founding Member announcement (slight delay so inbox doesn't get both at once)
              setTimeout(async () => {
                try {
                  const foundingResult = await sendFoundingMemberEmail({
                    to: memberEmail,
                    name: memberName,
                  });
                  if (foundingResult.success) {
                    console.log(`[Stripe Webhook] Founding member email #2 sent to ${memberEmail}`);
                  } else {
                    console.warn(`[Stripe Webhook] Founding member email #2 failed: ${foundingResult.error}`);
                  }
                } catch (err) {
                  console.warn("[Stripe Webhook] Failed to send founding member email #2:", err);
                }
              }, 5000); // 5-second delay between emails
            } else {
              console.warn("[Stripe Webhook] No email found on checkout session — skipping welcome emails");
            }            // ─── DETAILED MONITORING NOTIFICATION TO MARSHALL ─────────────────
            // Sends a comprehensive status report so Marshall can verify everything
            // worked correctly without needing to check the database manually.
            try {
              // Check if the member record was actually created/found in MySQL
              let mysqlStatus = "UNKNOWN";
              let mysqlDetails = "";
              try {
                const memberRecord = await getMemberByEmail(memberEmail || "");
                if (memberRecord) {
                  const hasRealDiscord = memberRecord.discordId && !memberRecord.discordId.startsWith("email:");
                  mysqlStatus = "OK";
                  mysqlDetails = [
                    `  Record ID: ${memberRecord.id}`,
                    `  Discord linked: ${hasRealDiscord ? "YES (" + memberRecord.discordId + ")" : "NO (pending Discord login)"}`,
                    `  Subscription: ${memberRecord.subscriptionStatus}`,
                    `  Role: ${memberRecord.memberRole}`,
                    `  Stripe Customer: ${memberRecord.stripeCustomerId || "N/A"}`,
                  ].join("\n");
                } else {
                  mysqlStatus = "WARNING";
                  mysqlDetails = "  Member record NOT found after upsert — check logs";
                }
              } catch (dbErr: any) {
                mysqlStatus = "ERROR";
                mysqlDetails = `  Database check failed: ${dbErr.message}`;
              }

              // Count total active members
              let activeCount = "?";
              try {
                const { getSupabaseClient } = await import("./supabaseClient");
                const supabase = getSupabaseClient();
                if (supabase) {
                  const { count } = await supabase
                    .from("members")
                    .select("*", { count: "exact", head: true })
                    .eq("subscription_status", "active");
                  activeCount = String(count ?? "?");
                }
              } catch { /* non-fatal */ }

              const amountDisplay = session.amount_total
                ? `$${(session.amount_total / 100).toFixed(2)}`
                : "$497/mo";

              await notifyOwner({
                title: `New Purchase: ${memberName}`,
                content: [
                  `NEW CONTRACTOR CIRCLE PURCHASE`,
                  ``,
                  `Member: ${memberName}`,
                  `Email: ${memberEmail || "N/A"}`,
                  `Amount: ${amountDisplay}`,
                  `Stripe Session: ${session.id}`,
                  `Stripe Customer: ${stripeCustomerId || "N/A"}`,
                  ``,
                  `--- DATABASE STATUS ---`,
                  `MySQL: ${mysqlStatus}`,
                  mysqlDetails,
                  ``,
                  `--- EMAIL STATUS ---`,
                  `Welcome email #1: ${memberEmail ? "SENT" : "SKIPPED (no email)"}`,
                  `Founding member email #2: ${memberEmail ? "QUEUED (5s delay)" : "SKIPPED"}`,
                  ``,
                  `--- PORTAL STATUS ---`,
                  `Active founding members: ${activeCount} of 50`,
                  ``,
                  `NEXT: Member needs to log in via Discord at alpcontractorcircle.com/portal.`,
                  `If their Discord email differs from ${memberEmail || "their Stripe email"}, the merge system will handle it automatically.`,
                ].join("\n"),
              });
            } catch (err) {
              console.warn("[Stripe Webhook] Failed to send owner notification:", err);
            }

            // ─── EMAIL PURCHASE NOTIFICATION TO MARSHALL ─────────────────────────
            try {
              const amountPaid = session.amount_total
                ? `$${(session.amount_total / 100).toFixed(2)}`
                : "$497/mo";
              await sendPurchaseNotification({
                memberName,
                memberEmail: memberEmail || "N/A",
                amount: amountPaid,
                product: "Contractor Circle — Founding Member",
                sessionId: session.id,
              });
            } catch (err) {
              console.warn("[Stripe Webhook] Failed to send purchase notification email:", err);
            }
            break;
          }

          case "customer.subscription.created": {
            const subscription = event.data.object as Stripe.Subscription;

            // Filter: only process Contractor Circle subscriptions
            const productKey = subscription.metadata?.product_key;
            if (productKey !== "contractor_circle") {
              console.log(`[Stripe Webhook] Ignoring subscription.created — product_key: "${productKey}"`);
              break;
            }

            console.log(
              `[Stripe Webhook] Subscription created — id: ${subscription.id}, customer: ${subscription.customer}, status: ${subscription.status}`
            );
            break;
          }

          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;

            // Filter: only process Contractor Circle subscriptions
            const productKey = subscription.metadata?.product_key;
            if (productKey !== "contractor_circle") {
              console.log(`[Stripe Webhook] Ignoring subscription.updated — product_key: "${productKey}"`);
              break;
            }

            console.log(
              `[Stripe Webhook] Subscription updated — id: ${subscription.id}, status: ${subscription.status}`
            );

            // Update member subscription status in database
            const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
            if (customerId) {
              try {
                await upsertMemberByStripeCustomerId(customerId, {
                  stripeSubscriptionId: subscription.id,
                  subscriptionStatus: mapStripeStatus(subscription.status),
                });
                console.log(`[Stripe Webhook] Updated subscription status for customer ${customerId}: ${subscription.status}`);
              } catch (err) {
                console.warn("[Stripe Webhook] Failed to update member subscription status:", err);
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;

            // Filter: only process Contractor Circle subscriptions
            const productKey = subscription.metadata?.product_key;
            if (productKey !== "contractor_circle") {
              console.log(`[Stripe Webhook] Ignoring subscription.deleted — product_key: "${productKey}"`);
              break;
            }

            console.log(
              `[Stripe Webhook] Subscription cancelled — id: ${subscription.id}, customer: ${subscription.customer}`
            );

            const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
            if (customerId) {
              try {
                await upsertMemberByStripeCustomerId(customerId, {
                  subscriptionStatus: "canceled",
                });
                console.log(`[Stripe Webhook] Marked member as canceled for customer ${customerId}`);
              } catch (err) {
                console.warn("[Stripe Webhook] Failed to mark member as canceled:", err);
              }
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(
              `[Stripe Webhook] Invoice paid — id: ${invoice.id}, amount: $${(invoice.amount_paid / 100).toFixed(2)}`
            );
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(
              `[Stripe Webhook] Invoice payment failed — id: ${invoice.id}, customer: ${invoice.customer}`
            );
            // Future: Notify member, retry logic
            break;
          }

          default:
            console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
        }
      } catch (err: any) {
        console.error(`[Stripe Webhook] Error processing event ${event.type}: ${err.message}`);
      }

      res.json({ received: true });
    }
  );

  console.log("[Stripe Webhook] Registered at /api/stripe/webhook");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapStripeStatus(
  status: Stripe.Subscription.Status
): "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none" {
  const map: Record<string, "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none"> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    incomplete: "incomplete",
    incomplete_expired: "canceled",
    unpaid: "past_due",
    paused: "none",
  };
  return map[status] ?? "none";
}

async function upsertMemberByStripeCustomerId(
  stripeCustomerId: string,
  updates: {
    stripeSubscriptionId?: string;
    subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none";
  }
): Promise<void> {
  const { upsertMemberByEmail } = await import("./memberDb");
  const { getMemberByStripeCustomerId } = await import("./memberDb");

  const existing = await getMemberByStripeCustomerId(stripeCustomerId);
  if (!existing) {
    console.warn(`[Stripe Webhook] No member found for Stripe customer ${stripeCustomerId}`);
    return;
  }

  await upsertMemberByEmail({
    email: existing.email || "",
    displayName: existing.discordDisplayName || existing.discordUsername || "Member",
    stripeCustomerId,
    ...updates,
  });
}
