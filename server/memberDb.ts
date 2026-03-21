/**
 * memberDb.ts — Database helpers for member management.
 *
 * These helpers allow creating/updating member records by email (from Stripe)
 * or by Stripe customer ID, independent of Discord authentication.
 *
 * When a member subscribes via Stripe, we create a "pending" member record
 * keyed by email. When they later log in with Discord, the Discord OAuth
 * flow links their Discord identity to the existing email-based record.
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { members, type Member } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

/**
 * Create or update a member record by email address.
 * Used when a Stripe payment comes in — we don't have Discord info yet,
 * so we create a record keyed by email. When the member logs in with Discord,
 * the OAuth callback will merge the records.
 */
export async function upsertMemberByEmail(params: {
  email: string;
  displayName?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "none";
  memberRole?: "member" | "founding_member" | "admin";
}): Promise<void> {
  const db = getDb();
  if (!db) {
    console.warn("[memberDb] Database not configured — skipping upsertMemberByEmail");
    return;
  }

  if (!params.email) {
    console.warn("[memberDb] No email provided — skipping upsertMemberByEmail");
    return;
  }

  // Check if a member with this email already exists
  const existing = await db
    .select()
    .from(members)
    .where(eq(members.email, params.email))
    .limit(1);

  if (existing.length > 0) {
    // Update the existing record
    const updateSet: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (params.stripeCustomerId) updateSet.stripeCustomerId = params.stripeCustomerId;
    if (params.stripeSubscriptionId) updateSet.stripeSubscriptionId = params.stripeSubscriptionId;
    if (params.subscriptionStatus) updateSet.subscriptionStatus = params.subscriptionStatus;
    if (params.memberRole) updateSet.memberRole = params.memberRole;
    if (params.displayName && !existing[0].discordDisplayName) {
      // Only update display name if Discord hasn't set one yet
      updateSet.discordDisplayName = params.displayName;
    }

    await db.update(members).set(updateSet).where(eq(members.email, params.email));
    console.log(`[memberDb] Updated member record for email: ${params.email}`);
  } else {
    // Create a new "pending" member record (no Discord ID yet)
    // We use a placeholder discordId based on email so the unique constraint is satisfied.
    // When the member logs in with Discord, this will be updated with their real Discord ID.
    const placeholderDiscordId = `email:${params.email}`;

    await db.insert(members).values({
      discordId: placeholderDiscordId,
      email: params.email,
      discordDisplayName: params.displayName || "New Member",
      stripeCustomerId: params.stripeCustomerId,
      stripeSubscriptionId: params.stripeSubscriptionId,
      subscriptionStatus: params.subscriptionStatus || "active",
      memberRole: params.memberRole || "founding_member",
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({
      set: {
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
        subscriptionStatus: params.subscriptionStatus || "active",
        memberRole: params.memberRole || "founding_member",
        updatedAt: new Date(),
      },
    });
    console.log(`[memberDb] Created pending member record for email: ${params.email}`);
  }
}

/**
 * Find a member by their email address.
 */
export async function getMemberByEmail(email: string): Promise<Member | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(members)
    .where(eq(members.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Find a member by their Stripe customer ID.
 */
export async function getMemberByStripeCustomerId(stripeCustomerId: string): Promise<Member | undefined> {
  const db = getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(members)
    .where(eq(members.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
