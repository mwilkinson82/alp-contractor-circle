import { eq, isNotNull, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, emailSubscribers, members, leads } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Email subscriber helpers
export async function subscribeEmail(email: string): Promise<{ success: boolean; isNew: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot subscribe email: database not available");
    return { success: false, isNew: false, error: "Database not available" };
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    
    // Check if email already exists
    const existing = await db
      .select()
      .from(emailSubscribers)
      .where(eq(emailSubscribers.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return { success: true, isNew: false }; // Already subscribed
    }

    // Insert new subscriber
    await db.insert(emailSubscribers).values({
      email: normalizedEmail,
      source: "homepage_capture",
      verified: false,
    });

    return { success: true, isNew: true };
  } catch (error) {
    console.error("[Database] Failed to subscribe email:", error);
    return { success: false, isNew: false, error: String(error) };
  }
}

// TODO: add feature queries here as your schema grows.

// Activity ID generation helper
/**
 * Generate the next Activity ID for a schedule based on its ID settings.
 * For example: prefix="E", start=100, interval=5 → "E100", "E105", "E110", etc.
 */
export function generateNextActivityId(
  prefix: string,
  currentNext: number,
  interval: number
): { activityId: string; nextNumber: number } {
  const activityId = `${prefix}${currentNext}`;
  const nextNumber = currentNext + interval;
  return { activityId, nextNumber };
}

/**
 * Get all active members with email addresses for bulk email sending.
 */
export async function getAllActiveMembers(): Promise<{ id: number; name: string; email: string }[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: members.id,
      name: members.discordDisplayName,
      email: members.email,
    })
    .from(members)
    .where(
      and(
        isNotNull(members.email),
        eq(members.subscriptionStatus, "active")
      )
    );

  return rows
    .filter((r): r is { id: number; name: string; email: string } => !!r.email && !!r.name)
    .map(r => ({ id: r.id, name: r.name, email: r.email }));
}

// ─── Lead Magnet Captures ──────────────────────────────────────────────────

export async function createLead(data: { firstName: string; email: string; source: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if this email already exists for this source
  const existing = await db
    .select()
    .from(leads)
    .where(and(eq(leads.email, data.email), eq(leads.source, data.source)));

  if (existing.length > 0) {
    return { id: existing[0].id, alreadyExists: true };
  }

  const [result] = await db.insert(leads).values({
    firstName: data.firstName,
    email: data.email,
    source: data.source,
  });

  // Also add to email_subscribers if not already there
  const existingSub = await db
    .select()
    .from(emailSubscribers)
    .where(eq(emailSubscribers.email, data.email));

  if (existingSub.length === 0) {
    await db.insert(emailSubscribers).values({
      email: data.email,
      source: `lead_magnet_${data.source}`,
      verified: true,
    });
  }

  return { id: result.insertId, alreadyExists: false };
}
