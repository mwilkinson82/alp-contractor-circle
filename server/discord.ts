/**
 * Discord OAuth2 flow for Contractor Circle member authentication.
 *
 * Flow:
 * 1. Frontend redirects to /api/discord/login?origin=<origin>&returnPath=<path>
 * 2. Server redirects to Discord authorization URL
 * 3. Discord redirects back to /api/discord/callback with code
 * 4. Server exchanges code for token, fetches user info, upserts member, sets cookie
 * 5. Server redirects to the member portal
 */
import type { Express, Request, Response } from "express";
import axios from "axios";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { members, type Member, type InsertMember } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { sendNewMemberSignupNotification } from "./email";
import { seedSmithResidenceForMember } from "./seedSmithResidence";
import { seedDefaultCrewsForMember, seedDefaultTradeRatesForMember } from "./seedDefaultCrews";

// ─── Constants ───────────────────────────────────────────────────────────────
// Production domain — must be registered in Discord Developer Portal
const PRODUCTION_ORIGIN = "https://alpcontractorcircle.com";
// All allowed redirect origins (must match Discord Developer Portal exactly)
const ALLOWED_ORIGINS = new Set([
  "https://alpcontractorcircle.com",
  "https://www.alpcontractorcircle.com",
]);
const DISCORD_API_BASE = "https://discord.com/api/v10";

// Guild / channel / role IDs for ALP Discord server
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const CONTRACTOR_CIRCLE_ROLE_ID = "1484648318662344985"; // Contractor Circle role
// #welcome channel is read-only (general welcome pinned there)
const GENERAL_CHAT_CHANNEL_ID = "1484648401483206739";    // #general-chat — personalized welcome messages go here
const DISCORD_OAUTH_AUTHORIZE = "https://discord.com/oauth2/authorize";
const DISCORD_OAUTH_TOKEN = `${DISCORD_API_BASE}/oauth2/token`;
const DISCORD_USER_ME = `${DISCORD_API_BASE}/users/@me`;
const MEMBER_COOKIE_NAME = "member_session";
const MEMBER_SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days
const SCOPES = ["identify", "email"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDiscordClientId(): string {
  return process.env.DISCORD_CLIENT_ID || "";
}

function getDiscordClientSecret(): string {
  return process.env.DISCORD_CLIENT_SECRET || "";
}

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  if (!forwarded) return false;
  const protos = Array.isArray(forwarded) ? forwarded : forwarded.split(",");
  return protos.some(p => p.trim().toLowerCase() === "https");
}

function getMemberCookieOptions(req: Request) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none" as const,
    secure: isSecureRequest(req),
    maxAge: MEMBER_SESSION_MAX_AGE,
  };
}

// ─── Database helpers ────────────────────────────────────────────────────────

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

export async function upsertMember(data: InsertMember): Promise<void> {
  const db = getDb();
  if (!db) return;

  const updateSet: Record<string, unknown> = {};
  if (data.discordUsername !== undefined) updateSet.discordUsername = data.discordUsername;
  if (data.discordDisplayName !== undefined) updateSet.discordDisplayName = data.discordDisplayName;
  if (data.discordAvatar !== undefined) updateSet.discordAvatar = data.discordAvatar;
  // CRITICAL: Never overwrite a non-null email with null.
  // Discord can return email: null if the user hasn't verified their email or has it set to private.
  // We use sql`COALESCE(?, email)` so that null values fall back to the existing email.
  if (data.email) {
    // Only overwrite email if we have a real value
    updateSet.email = data.email;
  }
  // If data.email is null/undefined, do NOT include it in updateSet — preserves existing email
  if (data.stripeCustomerId !== undefined) updateSet.stripeCustomerId = data.stripeCustomerId;
  if (data.stripeSubscriptionId !== undefined) updateSet.stripeSubscriptionId = data.stripeSubscriptionId;
  if (data.subscriptionStatus !== undefined) updateSet.subscriptionStatus = data.subscriptionStatus;
  if (data.memberRole !== undefined) updateSet.memberRole = data.memberRole;
  updateSet.lastSignedIn = new Date();

  await db.insert(members).values({
    ...data,
    lastSignedIn: new Date(),
  }).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getMemberByDiscordId(discordId: string): Promise<Member | undefined> {
  const db = getDb();
  if (!db) return undefined;
  const result = await db.select().from(members).where(eq(members.discordId, discordId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getMemberById(id: string): Promise<Member | undefined> {
  const db = getDb();
  if (!db) return undefined;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return undefined;
  const result = await db.select().from(members).where(eq(members.id, numericId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Session management ──────────────────────────────────────────────────────

export async function createMemberSession(member: Member): Promise<string> {
  const secret = getSessionSecret();
  const expiresAt = Math.floor((Date.now() + MEMBER_SESSION_MAX_AGE) / 1000);

  return new SignJWT({
    memberId: member.id,
    discordId: member.discordId,
    type: "member",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export async function verifyMemberSession(
  cookieValue: string | undefined | null
): Promise<{ memberId: string; discordId: string } | null> {
  if (!cookieValue) return null;

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secret, { algorithms: ["HS256"] });
    const { memberId, discordId, type } = payload as Record<string, unknown>;

    if (type !== "member" || typeof discordId !== "string") {
      return null;
    }

    return { memberId: String(memberId), discordId };
  } catch {
    return null;
  }
}

export function parseMemberCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const parsed = parseCookieHeader(cookieHeader);
  return parsed[MEMBER_COOKIE_NAME];
}

// ─── Discord API helpers ─────────────────────────────────────────────────────

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  email: string | null;
  verified: boolean;
}

async function exchangeCodeForToken(code: string, redirectUri: string): Promise<DiscordTokenResponse> {
  const params = new URLSearchParams({
    client_id: getDiscordClientId(),
    client_secret: getDiscordClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const { data } = await axios.post<DiscordTokenResponse>(DISCORD_OAUTH_TOKEN, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  return data;
}

async function fetchDiscordUser(accessToken: string): Promise<DiscordUser> {
  const { data } = await axios.get<DiscordUser>(DISCORD_USER_ME, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}

// ─── Express routes ──────────────────────────────────────────────────────────

export function registerDiscordOAuthRoutes(app: Express) {
  /**
   * GET /api/discord/login
   * Redirects to Discord authorization page.
   * Query params:
   *   - origin: the frontend origin (required for redirect after callback)
   *   - returnPath: where to redirect after login (default: /portal)
   */
  app.get("/api/discord/login", (req: Request, res: Response) => {
    // Always normalise to the canonical production origin so the redirect_uri
    // matches exactly what is registered in the Discord Developer Portal.
    // The fallback to req.get("host") would return the internal Cloud Run hostname
    // in production, which is NOT registered and causes "Invalid OAuth2 redirect_uri".
    const rawOrigin = (req.query.origin as string) || req.headers.origin || "";
    const origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : PRODUCTION_ORIGIN;
    const returnPath = (req.query.returnPath as string) || "/portal";
    const redirectUri = `${origin}/api/discord/callback`;

    // Encode state: origin + returnPath
    const state = Buffer.from(JSON.stringify({ origin, returnPath })).toString("base64url");

    const url = new URL(DISCORD_OAUTH_AUTHORIZE);
    url.searchParams.set("client_id", getDiscordClientId());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "consent");

    res.redirect(302, url.toString());
  });

  /**
   * GET /api/discord/callback
   * Discord redirects here after user authorizes.
   * Exchanges code for token, fetches user, upserts member, sets session cookie.
   */
  app.get("/api/discord/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code || !stateParam) {
      res.status(400).json({ error: "Missing code or state parameter" });
      return;
    }

    let origin = "";
    let returnPath = "/portal";

    try {
      const stateData = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      // Normalise origin: must match what was sent to Discord (and what is registered).
      // If the stored origin is not in ALLOWED_ORIGINS, fall back to PRODUCTION_ORIGIN.
      const rawOrigin = stateData.origin || "";
      origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : PRODUCTION_ORIGIN;
      returnPath = stateData.returnPath || "/portal";
    } catch {
      res.status(400).json({ error: "Invalid state parameter" });
      return;
    }

    const redirectUri = `${origin}/api/discord/callback`;

    try {
      // Exchange code for access token
      const tokenData = await exchangeCodeForToken(code, redirectUri);

      // Fetch Discord user info
      const discordUser = await fetchDiscordUser(tokenData.access_token);

      // ─── Merge Stripe member record with Discord identity ────────────────
      // When someone buys via Stripe, the webhook creates a MySQL record with
      // a placeholder discordId like "email:<stripe-email>". When they log in
      // via Discord, their Discord email is often DIFFERENT from their Stripe
      // email. We use multiple strategies to find and merge the correct record.
      const db = getDb();
      let merged = false;

      if (db) {
        const { eq, like, and } = await import("drizzle-orm");

        // ── Strategy 0: Direct email match ──────────────────────────────────
        // If the Discord user's email matches an existing member record's email,
        // merge immediately. This handles manually-added members, placeholder
        // records, or any case where the email is the same.
        if (!merged && discordUser.email) {
          const emailMatch = await db
            .select()
            .from(members)
            .where(eq(members.email, discordUser.email));

          // Find records that DON'T already have this Discord ID
          const otherRecords = emailMatch.filter(m => m.discordId !== discordUser.id);

          if (otherRecords.length > 0) {
            // Take the one with the best subscription status (active > none)
            const bestRecord = otherRecords.find(m => m.subscriptionStatus === 'active') || otherRecords[0];

            // Update the existing record with the real Discord identity
            await db
              .update(members)
              .set({
                discordId: discordUser.id,
                discordUsername: discordUser.username,
                discordDisplayName: discordUser.global_name || discordUser.username,
                discordAvatar: discordUser.avatar,
                ...(discordUser.email ? { email: discordUser.email } : {}), // Never overwrite email with null
                lastSignedIn: new Date(),
              })
              .where(eq(members.id, bestRecord.id));

            // Clean up any other duplicate records with the same email
            const duplicateIds = otherRecords.filter(m => m.id !== bestRecord.id).map(m => m.id);
            if (duplicateIds.length > 0) {
              for (const dupId of duplicateIds) {
                await db.delete(members).where(eq(members.id, dupId));
              }
              console.log(`[Discord OAuth] Strategy 0: Cleaned up ${duplicateIds.length} duplicate records for ${discordUser.email}`);
            }

            console.log(`[Discord OAuth] Strategy 0: Merged by email match for ${discordUser.email} (record id=${bestRecord.id}, was discordId=${bestRecord.discordId}, subscription=${bestRecord.subscriptionStatus})`);
            merged = true;
          }
        }

        // ── Strategy 1: Exact email placeholder match (Discord email === Stripe email) ──
        if (!merged && discordUser.email) {
          const emailPlaceholder = `email:${discordUser.email}`;
          const exactMatch = await db
            .select()
            .from(members)
            .where(eq(members.discordId, emailPlaceholder))
            .limit(1);

          if (exactMatch.length > 0) {
            await db
              .update(members)
              .set({
                discordId: discordUser.id,
                discordUsername: discordUser.username,
                discordDisplayName: discordUser.global_name || discordUser.username,
                discordAvatar: discordUser.avatar,
                ...(discordUser.email ? { email: discordUser.email } : {}), // Never overwrite email with null
                lastSignedIn: new Date(),
              })
              .where(eq(members.discordId, emailPlaceholder));
            console.log(`[Discord OAuth] Strategy 1: Merged by exact email placeholder for ${discordUser.email}`);
            merged = true;
          }
        }

        // ── Strategy 2: Cross-reference via Supabase ──────────────────────────
        // The Discord email may differ from the Stripe email. Supabase has the
        // Stripe email + stripe_customer_id. We look up the Discord user's email
        // in Supabase first; if not found, we check if there's a Supabase member
        // whose name matches the Discord display name (fuzzy). Then we use the
        // Supabase stripe_customer_id to find the MySQL placeholder record.
        if (!merged) {
          try {
            const { getSupabaseClient } = await import("./supabaseClient");
            const supabase = getSupabaseClient();
            if (supabase) {
              // Try to find a Supabase member by Discord email first
              let supaMatch = null;
              if (discordUser.email) {
                const { data: byEmail } = await supabase
                  .from("members")
                  .select("email, stripe_customer_id, stripe_session_id, name")
                  .eq("email", discordUser.email)
                  .eq("subscription_status", "active")
                  .limit(1);
                if (byEmail && byEmail.length > 0) {
                  supaMatch = byEmail[0];
                  console.log(`[Discord OAuth] Strategy 2: Found Supabase member by Discord email: ${discordUser.email}`);
                }
              }

              // If no match by Discord email, search for unlinked active members
              // and try to match by display name
              if (!supaMatch) {
                const { data: activeMembers } = await supabase
                  .from("members")
                  .select("email, stripe_customer_id, stripe_session_id, name, discord_id")
                  .eq("subscription_status", "active")
                  .is("discord_id", null);

                if (activeMembers && activeMembers.length > 0) {
                  // Try name match
                  const discordName = (discordUser.global_name || discordUser.username || "").toLowerCase();
                  const nameMatch = activeMembers.find(m => {
                    const supaName = (m.name || "").toLowerCase();
                    return supaName === discordName ||
                           supaName.includes(discordName) ||
                           discordName.includes(supaName);
                  });
                  if (nameMatch) {
                    supaMatch = nameMatch;
                    console.log(`[Discord OAuth] Strategy 2: Found Supabase member by name match: ${nameMatch.name}`);
                  } else if (activeMembers.length === 1) {
                    // Only one unlinked active member — likely the right one
                    supaMatch = activeMembers[0];
                    console.log(`[Discord OAuth] Strategy 2: Only one unlinked active Supabase member: ${activeMembers[0].email}`);
                  }
                }
              }

              // If we found a Supabase match, find the corresponding MySQL placeholder
              if (supaMatch) {
                const stripeEmail = supaMatch.email;
                const stripeCustomerId = supaMatch.stripe_customer_id;

                // Try to find MySQL record by email placeholder from Stripe email
                let mysqlPlaceholder = null;
                if (stripeEmail) {
                  const byStripePlaceholder = await db
                    .select()
                    .from(members)
                    .where(eq(members.discordId, `email:${stripeEmail}`))
                    .limit(1);
                  if (byStripePlaceholder.length > 0) {
                    mysqlPlaceholder = byStripePlaceholder[0];
                  }
                }

                // Fallback: find by Stripe customer ID
                if (!mysqlPlaceholder && stripeCustomerId) {
                  const byCustomerId = await db
                    .select()
                    .from(members)
                    .where(eq(members.stripeCustomerId, stripeCustomerId))
                    .limit(1);
                  if (byCustomerId.length > 0 && byCustomerId[0].discordId.startsWith("email:")) {
                    mysqlPlaceholder = byCustomerId[0];
                  }
                }

                if (mysqlPlaceholder) {
                  await db
                    .update(members)
                    .set({
                      discordId: discordUser.id,
                      discordUsername: discordUser.username,
                      discordDisplayName: discordUser.global_name || discordUser.username,
                      discordAvatar: discordUser.avatar,
                      // Prefer existing placeholder email over null Discord email
                      email: discordUser.email || mysqlPlaceholder.email || undefined,
                      lastSignedIn: new Date(),
                    })
                    .where(eq(members.id, mysqlPlaceholder.id));
                  console.log(`[Discord OAuth] Strategy 2: Merged MySQL placeholder (id=${mysqlPlaceholder.id}) via Supabase cross-ref. Stripe email: ${stripeEmail}, Discord ID: ${discordUser.id}`);
                  merged = true;

                  // Also update Supabase with the Discord ID for future reference
                  try {
                    await supabase
                      .from("members")
                      .update({ discord_id: discordUser.id, discord_username: discordUser.username })
                      .eq("email", stripeEmail);
                  } catch (e) {
                    console.warn("[Discord OAuth] Failed to update Supabase with Discord ID:", e);
                  }
                }
              }
            }
          } catch (e) {
            console.warn("[Discord OAuth] Strategy 2 (Supabase cross-ref) failed:", e);
          }
        }

        // ── Strategy 3: Find any unmerged placeholder with active subscription ──
        // Last resort: if there's exactly one MySQL record with discordId starting
        // with "email:" and subscriptionStatus "active", it's almost certainly
        // the member who just purchased.
        if (!merged) {
          try {
            const placeholders = await db
              .select()
              .from(members)
              .where(
                and(
                  like(members.discordId, "email:%"),
                  eq(members.subscriptionStatus, "active")
                )
              );

            if (placeholders.length === 1) {
              const placeholder = placeholders[0];
              await db
                .update(members)
                .set({
                  discordId: discordUser.id,
                  discordUsername: discordUser.username,
                  discordDisplayName: discordUser.global_name || discordUser.username,
                  discordAvatar: discordUser.avatar,
                  // Prefer existing placeholder email over null Discord email
                  email: discordUser.email || placeholder.email || undefined,
                  lastSignedIn: new Date(),
                })
                .where(eq(members.id, placeholder.id));
              console.log(`[Discord OAuth] Strategy 3: Merged sole unlinked active placeholder (id=${placeholder.id}, email=${placeholder.email}) with Discord ID ${discordUser.id}`);
              merged = true;
            } else if (placeholders.length > 1) {
              console.warn(`[Discord OAuth] Strategy 3: Found ${placeholders.length} unlinked active placeholders — cannot auto-merge. Manual intervention needed.`);
            }
          } catch (e) {
            console.warn("[Discord OAuth] Strategy 3 failed:", e);
          }
        }
      }

      // ── Fallback: standard upsert (no placeholder found to merge) ──────────
      if (!merged) {
        await upsertMember({
          discordId: discordUser.id,
          discordUsername: discordUser.username,
          discordDisplayName: discordUser.global_name || discordUser.username,
          discordAvatar: discordUser.avatar,
          email: discordUser.email,
        });
        console.log(`[Discord OAuth] No Stripe placeholder found — created/updated standard member record for Discord ID ${discordUser.id}`);
      }

      // Fetch the member record to get the ID
      const member = await getMemberByDiscordId(discordUser.id);
      if (!member) {
        res.status(500).json({ error: "Failed to create member record" });
        return;
      }
      // ─── SUBSCRIPTION GATE ─────────────────────────────────────────────
      // Only paying members can access the portal. If no active subscription,
      // redirect to the sales page. Do NOT create a session cookie.
      // Whitelisted IDs: alpteambot (360002), Daniel G (1320007) — beta testers.
      const PORTAL_WHITELIST = new Set([360002, 1320007]);
      if (member.subscriptionStatus !== "active" && member.subscriptionStatus !== "trialing" && !PORTAL_WHITELIST.has(member.id)) {
        console.log(`[Discord OAuth] BLOCKED: ${discordUser.username} (${discordUser.email}) has subscriptionStatus="${member.subscriptionStatus}" — redirecting to sales page`);
        res.redirect(302, `${origin}/circle?error=no_subscription`);
        return;
      }

      // ─── Assign Contractor Circle role via bot ───────────────────────────
      // Only attempt if the member has an active subscription
      if (member.subscriptionStatus === "active" && GUILD_ID && BOT_TOKEN) {
        try {
          // Add member to guild (required if they haven't joined via invite yet)
          const addToGuildResponse = await axios.put(
            `${DISCORD_API_BASE}/guilds/${GUILD_ID}/members/${discordUser.id}`,
            { access_token: tokenData.access_token },
            { headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" } }
          ).catch(() => null);

          // 201 = newly added to guild (wasn't a member before)
          // 204 = already a member of the guild
          const justJoinedViaPortal = addToGuildResponse?.status === 201;

          // Assign the Contractor Circle role
          await axios.put(
            `${DISCORD_API_BASE}/guilds/${GUILD_ID}/members/${discordUser.id}/roles/${CONTRACTOR_CIRCLE_ROLE_ID}`,
            {},
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
          );
          console.log(`[Discord] Assigned Contractor Circle role to ${discordUser.username}`);

          // Only post welcome message if they were NOT already in the Discord server.
          // If they joined Discord first, the guildMemberAdd gateway event already
          // welcomed them. We only welcome here if the portal OAuth added them to
          // the guild for the first time (status 201).
          if (justJoinedViaPortal) {
            const displayName = discordUser.global_name || discordUser.username;
            axios.post(
              `${DISCORD_API_BASE}/channels/${GENERAL_CHAT_CHANNEL_ID}/messages`,
              {
                content: `🎉 Welcome to **The Contractor Circle**, <@${discordUser.id}>!\n\nYou now have access to **#circle-chat**, **#templates-resources**, and **#replays**. Log in to the member portal at **alpcontractorcircle.com/portal** to access all your resources. We're glad you're here — let's build.`,
              },
              { headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" } }
            ).catch((e: any) => console.warn("[Discord] Welcome message failed:", e?.message));
            console.log(`[Discord] Welcome message sent for ${displayName} (joined via portal OAuth)`);
          } else {
            console.log(`[Discord] ${discordUser.username} was already in the guild — welcome already sent on join, skipping duplicate.`);
          }
        } catch (roleErr: any) {
          // Non-fatal — log and continue
          console.warn("[Discord] Role assignment failed:", roleErr?.message);
        }
      }

      // Create session token and set cookie
      const sessionToken = await createMemberSession(member);
      const cookieOptions = getMemberCookieOptions(req);
      res.cookie(MEMBER_COOKIE_NAME, sessionToken, cookieOptions);
      // Clear any lingering ConstructLine beta session so Discord member login takes full priority
      res.clearCookie("beta_session", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: -1 });

      // Auto-seed Smith Residence template for new members (fire-and-forget, idempotent)
      seedSmithResidenceForMember(member.id).catch((e: any) =>
        console.warn("[Discord] Smith Residence seed failed:", e?.message)
      );
      // Auto-seed default crews for new members (fire-and-forget, idempotent)
      seedDefaultCrewsForMember(member.id).catch((e: any) =>
        console.warn("[Discord] Default crew seed failed:", e?.message)
      );
      // Auto-seed default trade rates for new members (fire-and-forget, idempotent)
      seedDefaultTradeRatesForMember(member.id).catch((e: any) =>
        console.warn("[Discord] Default trade rate seed failed:", e?.message)
      );

      // Send new member signup notification to Marshall (fire-and-forget)
      if (member.discordUsername && member.email) {
        sendNewMemberSignupNotification({
          memberName: member.discordDisplayName || member.discordUsername || "Unknown",
          memberEmail: member.email,
          discordUsername: member.discordUsername,
        }).catch((e: any) => console.warn("[Discord] New member notification failed:", e?.message));
      }

      // Redirect to member portal
      res.redirect(302, `${origin}${returnPath}`);
    } catch (error) {
      console.error("[Discord OAuth] Callback failed:", error);
      res.redirect(302, `${origin}/circle?error=auth_failed`);
    }
  });

  /**
   * GET /api/discord/me
   * Returns the current member's info from the session cookie.
   */
  app.get("/api/discord/me", async (req: Request, res: Response) => {
    const cookie = parseMemberCookie(req);
    const session = await verifyMemberSession(cookie);

    if (!session) {
      res.json({ member: null });
      return;
    }

    const member = await getMemberById(session.memberId);
    if (!member) {
      res.json({ member: null });
      return;
    }

    // Build avatar URL
    const avatarUrl = member.discordAvatar
      ? `https://cdn.discordapp.com/avatars/${member.discordId}/${member.discordAvatar}.png?size=128`
      : `https://cdn.discordapp.com/embed/avatars/${parseInt(member.discordId) % 5}.png`;

    res.json({
      member: {
        id: member.id,
        discordId: member.discordId,
        discordUsername: member.discordUsername,
        displayName: member.discordDisplayName || member.discordUsername,
        avatarUrl,
        email: member.email,
        subscriptionStatus: member.subscriptionStatus,
        memberRole: member.memberRole,
        createdAt: member.createdAt,
      },
    });
  });

  /**
   * POST /api/discord/logout
   * Clears the member session cookie.
   */
  app.post("/api/discord/logout", (req: Request, res: Response) => {
    const cookieOptions = getMemberCookieOptions(req);
    // Clear Discord member session
    res.clearCookie(MEMBER_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    // Also clear ConstructLine beta session — Sign Out must be a full wipe of both account types
    res.clearCookie("beta_session", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: -1 });
    res.json({ success: true });
  });
}
