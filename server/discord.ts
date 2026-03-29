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
  if (data.email !== undefined) updateSet.email = data.email;
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

      // ─── Merge email-based member record (created by Stripe webhook) ────
      // If a member record was created by Stripe (keyed by email, with a
      // placeholder discordId like "email:..."), merge it with the real Discord
      // identity so the member gets their subscription status on first login.
      if (discordUser.email) {
        const db = getDb();
        if (db) {
          const { eq } = await import("drizzle-orm");
          const emailPlaceholder = `email:${discordUser.email}`;
          const pendingRecord = await db
            .select()
            .from(members)
            .where(eq(members.discordId, emailPlaceholder))
            .limit(1);

          if (pendingRecord.length > 0) {
            // Update the placeholder record with the real Discord identity
            await db
              .update(members)
              .set({
                discordId: discordUser.id,
                discordUsername: discordUser.username,
                discordDisplayName: discordUser.global_name || discordUser.username,
                discordAvatar: discordUser.avatar,
                lastSignedIn: new Date(),
              })
              .where(eq(members.discordId, emailPlaceholder));
            console.log(`[Discord OAuth] Merged Stripe member record for ${discordUser.email} with Discord ID ${discordUser.id}`);
          } else {
            // No pending record — standard upsert
            await upsertMember({
              discordId: discordUser.id,
              discordUsername: discordUser.username,
              discordDisplayName: discordUser.global_name || discordUser.username,
              discordAvatar: discordUser.avatar,
              email: discordUser.email,
            });
          }
        }
      } else {
        // No email from Discord — standard upsert
        await upsertMember({
          discordId: discordUser.id,
          discordUsername: discordUser.username,
          discordDisplayName: discordUser.global_name || discordUser.username,
          discordAvatar: discordUser.avatar,
          email: discordUser.email,
        });
      }

      // Fetch the member record to get the ID
      const member = await getMemberByDiscordId(discordUser.id);
      if (!member) {
        res.status(500).json({ error: "Failed to create member record" });
        return;
      }

      // ─── Assign Contractor Circle role via bot ───────────────────────────
      // Only attempt if the member has an active subscription
      if (member.subscriptionStatus === "active" && GUILD_ID && BOT_TOKEN) {
        try {
          // Add member to guild (required if they haven't joined via invite yet)
          await axios.put(
            `${DISCORD_API_BASE}/guilds/${GUILD_ID}/members/${discordUser.id}`,
            { access_token: tokenData.access_token },
            { headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" } }
          ).catch(() => { /* already a member — ignore 204/400 */ });

          // Assign the Contractor Circle role
          await axios.put(
            `${DISCORD_API_BASE}/guilds/${GUILD_ID}/members/${discordUser.id}/roles/${CONTRACTOR_CIRCLE_ROLE_ID}`,
            {},
            { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
          );
          console.log(`[Discord] Assigned Contractor Circle role to ${discordUser.username}`);

          // Post personalized welcome message in #general-chat (fire-and-forget)
          const displayName = discordUser.global_name || discordUser.username;
          axios.post(
            `${DISCORD_API_BASE}/channels/${GENERAL_CHAT_CHANNEL_ID}/messages`,
            {
              content: `🎉 Welcome to **The Contractor Circle**, <@${discordUser.id}>!\n\nYou now have access to **#circle-chat**, **#templates-resources**, and **#replays**. Read through this channel for everything you need to get started. We're glad you're here — let's build.`,
            },
            { headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" } }
          ).catch((e: any) => console.warn("[Discord] Welcome message failed:", e?.message));
        } catch (roleErr: any) {
          // Non-fatal — log and continue
          console.warn("[Discord] Role assignment failed:", roleErr?.message);
        }
      }

      // Create session token and set cookie
      const sessionToken = await createMemberSession(member);
      const cookieOptions = getMemberCookieOptions(req);
      res.cookie(MEMBER_COOKIE_NAME, sessionToken, cookieOptions);

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
    res.clearCookie(MEMBER_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
