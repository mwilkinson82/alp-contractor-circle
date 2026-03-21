import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing Manus auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Members table — Contracting Circle members who authenticate via Discord.
 * Links Discord identity to Stripe subscription for access control.
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  /** Discord user ID (snowflake) */
  discordId: varchar("discordId", { length: 64 }).notNull().unique(),
  /** Discord username */
  discordUsername: varchar("discordUsername", { length: 128 }),
  /** Discord display name */
  discordDisplayName: text("discordDisplayName"),
  /** Discord avatar hash (construct URL: https://cdn.discordapp.com/avatars/{id}/{hash}.png) */
  discordAvatar: varchar("discordAvatar", { length: 256 }),
  /** Email from Discord */
  email: varchar("email", { length: 320 }),
  /** Stripe customer ID — set when member subscribes */
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  /** Stripe subscription ID — active subscription */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  /** Subscription status: active, canceled, past_due, trialing, etc. */
  subscriptionStatus: mysqlEnum("subscriptionStatus", [
    "active",
    "canceled",
    "past_due",
    "trialing",
    "incomplete",
    "none",
  ]).default("none").notNull(),
  /** Member role within the circle */
  memberRole: mysqlEnum("memberRole", ["member", "founding_member", "admin"]).default("member").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * Replays table — Contracting Circle call recordings hosted on Cloudflare Stream.
 *
 * Workflow:
 * 1. Download Zoom recording after each Thursday call
 * 2. Upload to Cloudflare Stream (get the video ID)
 * 3. Add entry here via the admin panel or tRPC mutation
 * 4. Members can watch in the portal Replay Library
 */
export const replays = mysqlTable("replays", {
  id: int("id").autoincrement().primaryKey(),
  /** Title shown in the library */
  title: varchar("title", { length: 256 }).notNull(),
  /** Short description */
  description: text("description"),
  /** Category for filtering */
  category: mysqlEnum("category", [
    "weekly_calls",
    "bootcamp",
    "masterclass",
    "q_and_a",
  ]).default("weekly_calls").notNull(),
  /**
   * Cloudflare Stream video ID.
   * Embed URL: https://iframe.videodelivery.net/{cloudflareStreamId}
   * Thumbnail URL: https://videodelivery.net/{cloudflareStreamId}/thumbnails/thumbnail.jpg
   */
  cloudflareStreamId: varchar("cloudflareStreamId", { length: 128 }).notNull(),
  /** Duration string e.g. "1h 24m" */
  duration: varchar("duration", { length: 32 }),
  /** Date of the call/session */
  callDate: timestamp("callDate").notNull(),
  /** Whether to feature this replay at the top of the library */
  featured: boolean("featured").default(false).notNull(),
  /** Whether this replay is published (visible to members) */
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Replay = typeof replays.$inferSelect;
export type InsertReplay = typeof replays.$inferInsert;
