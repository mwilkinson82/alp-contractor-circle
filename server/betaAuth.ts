/**
 * Beta user authentication — email + password sign-up/login for non-Discord users.
 * Beta users get access to ConstructLine tools (Takeoff + Scheduler) only.
 * All other portal features are locked behind Contractor Circle membership.
 *
 * Discord Connect flow (added Apr 2026):
 *   GET /api/beta/discord/connect  → redirects to Discord OAuth
 *   GET /api/beta/discord/callback → exchanges code, adds user to guild, assigns ConstructLine role
 */
import type { Express, Request, Response } from "express";
import { hashSync, compareSync } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import axios from "axios";
import { betaUsers, type BetaUser } from "../drizzle/schema";
import { sendConstructLineWelcomeEmail } from "./email";

const BETA_COOKIE_NAME = "beta_session";
const BETA_SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

// ─── Discord constants ────────────────────────────────────────────────────────
const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_OAUTH_AUTHORIZE = "https://discord.com/oauth2/authorize";
const DISCORD_OAUTH_TOKEN = `${DISCORD_API_BASE}/oauth2/token`;
const DISCORD_USER_ME = `${DISCORD_API_BASE}/users/@me`;

// Guild / role IDs for ALP Discord server
const GUILD_ID = process.env.DISCORD_GUILD_ID || "927273292354711613";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";

// ConstructLine role — created automatically on first run if it doesn't exist
// We store the resolved role ID here after first lookup/creation
let CONSTRUCTLINE_ROLE_ID: string | null = null;

/** Ensure the ConstructLine role exists in the guild. Returns the role ID. */
async function ensureConstructLineRole(): Promise<string | null> {
  if (CONSTRUCTLINE_ROLE_ID) return CONSTRUCTLINE_ROLE_ID;
  if (!BOT_TOKEN || !GUILD_ID) return null;

  try {
    // Fetch existing roles
    const rolesRes = await axios.get(`${DISCORD_API_BASE}/guilds/${GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    const roles: Array<{ id: string; name: string }> = rolesRes.data;
    const existing = roles.find(r => r.name === "ConstructLine");
    if (existing) {
      CONSTRUCTLINE_ROLE_ID = existing.id;
      console.log(`[BetaDiscord] Found existing ConstructLine role: ${existing.id}`);
      return existing.id;
    }

    // Create the role
    const createRes = await axios.post(
      `${DISCORD_API_BASE}/guilds/${GUILD_ID}/roles`,
      {
        name: "ConstructLine",
        color: 0xd95f2b, // ember orange — matches brand
        hoist: false,
        mentionable: false,
      },
      { headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" } }
    );
    CONSTRUCTLINE_ROLE_ID = createRes.data.id;
    console.log(`[BetaDiscord] Created ConstructLine role: ${CONSTRUCTLINE_ROLE_ID}`);
    return CONSTRUCTLINE_ROLE_ID;
  } catch (err: any) {
    console.warn("[BetaDiscord] Failed to ensure ConstructLine role:", err?.message);
    return null;
  }
}

// Kick off role lookup at startup (non-blocking)
ensureConstructLineRole().catch(() => {});

function getSessionSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret);
}

// Reuse shared drizzle connection pattern from db.ts
let _db: ReturnType<typeof drizzle> | null = null;
function db() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[BetaAuth] Failed to connect to database:", error);
    }
  }
  return _db;
}

/** Throws a 503 if the DB is not available */
function requireDb() {
  const d = db();
  if (!d) throw new Error("Database not available");
  return d;
}

// ─── Session helpers ─────────────────────────────────────────────────────────

async function createBetaToken(user: BetaUser): Promise<string> {
  const secret = getSessionSecret();
  const expiresAt = new Date(Date.now() + BETA_SESSION_MAX_AGE);
  return new SignJWT({
    betaUserId: user.id,
    email: user.email,
    type: "beta",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(secret);
}

export async function verifyBetaSession(
  cookieValue: string | undefined | null
): Promise<{ betaUserId: number; email: string } | null> {
  if (!cookieValue) return null;
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secret, { algorithms: ["HS256"] });
    const { betaUserId, email, type } = payload as Record<string, unknown>;
    if (type !== "beta" || typeof email !== "string") return null;
    return { betaUserId: Number(betaUserId), email };
  } catch {
    return null;
  }
}

export function parseBetaCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const parsed = parseCookieHeader(cookieHeader);
  return parsed[BETA_COOKIE_NAME];
}

export async function getBetaUserById(id: number): Promise<BetaUser | null> {
  const d = db();
  if (!d) return null;
  const rows = await d.select().from(betaUsers).where(eq(betaUsers.id, id)).limit(1);
  return rows[0] || null;
}

export async function getBetaUserFromRequest(req: Request): Promise<BetaUser | null> {
  const cookie = parseBetaCookie(req);
  const session = await verifyBetaSession(cookie);
  if (!session) return null;
  const user = await getBetaUserById(session.betaUserId);
  if (!user || !user.active) return null;
  return user;
}

// ─── Discord OAuth helpers ────────────────────────────────────────────────────

function getDiscordClientId(): string {
  return process.env.DISCORD_CLIENT_ID || "";
}
function getDiscordClientSecret(): string {
  return process.env.DISCORD_CLIENT_SECRET || "";
}

/** Allowed production origins for redirect_uri */
const ALLOWED_ORIGINS = new Set([
  "https://alpcontractorcircle.com",
  "https://www.alpcontractorcircle.com",
]);
const PRODUCTION_ORIGIN = "https://alpcontractorcircle.com";

/** Add a Discord user to the guild and assign ConstructLine role */
async function addToGuildAndAssignRole(
  discordUserId: string,
  accessToken: string
): Promise<void> {
  if (!BOT_TOKEN || !GUILD_ID) return;

  const roleId = await ensureConstructLineRole();

  // Add to guild (PUT /guilds/:id/members/:userId — requires guilds.join scope)
  await axios.put(
    `${DISCORD_API_BASE}/guilds/${GUILD_ID}/members/${discordUserId}`,
    { access_token: accessToken },
    { headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" } }
  ).catch((e: any) => {
    // 204 = already a member, that's fine
    if (e?.response?.status !== 204) {
      console.warn("[BetaDiscord] addToGuild warning:", e?.message);
    }
  });

  // Assign ConstructLine role
  if (roleId) {
    await axios.put(
      `${DISCORD_API_BASE}/guilds/${GUILD_ID}/members/${discordUserId}/roles/${roleId}`,
      {},
      { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
    );
    console.log(`[BetaDiscord] Assigned ConstructLine role to Discord user ${discordUserId}`);
  }
}

// ─── Express routes ──────────────────────────────────────────────────────────

export function registerBetaAuthRoutes(app: Express) {
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: BETA_SESSION_MAX_AGE,
  };

  // POST /api/beta/signup
  app.post("/api/beta/signup", async (req: Request, res: Response) => {
    try {
      const { email, password, name, companyName } = req.body;

      if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password, and name are required." });
      }

      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if email already exists
      const existing = await requireDb()
        .select()
        .from(betaUsers)
        .where(eq(betaUsers.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        return res.status(409).json({ error: "An account with this email already exists. Please log in." });
      }

      // Hash password and create user
      const passwordHash = hashSync(password, 10);
      const result = await requireDb().insert(betaUsers).values({
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        companyName: companyName?.trim() || null,
      });

      const insertId = (result as any)[0]?.insertId;
      const newUser = await getBetaUserById(insertId);
      if (!newUser) {
        return res.status(500).json({ error: "Failed to create account." });
      }

      // Create session token
      const token = await createBetaToken(newUser);
      res.cookie(BETA_COOKIE_NAME, token, cookieOptions);

      // Send welcome email with credentials (fire and forget)
      sendConstructLineWelcomeEmail({
        to: newUser.email,
        name: newUser.name,
        email: newUser.email,
        password: password, // plain text password before hashing is still in scope
      }).catch((err) => console.error("[Beta Signup] Welcome email failed:", err));

      return res.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          companyName: newUser.companyName,
          discordConnected: false,
        },
      });
    } catch (err: any) {
      console.error("[Beta Signup] Error:", err);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // POST /api/beta/login
  app.post("/api/beta/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const rows = await requireDb()
        .select()
        .from(betaUsers)
        .where(eq(betaUsers.email, normalizedEmail))
        .limit(1);

      const user = rows[0];
      if (!user || !user.active) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      if (!compareSync(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      // Update last signed in
      await requireDb()
        .update(betaUsers)
        .set({ lastSignedIn: new Date() })
        .where(eq(betaUsers.id, user.id));

      // Create session token
      const token = await createBetaToken(user);
      res.cookie(BETA_COOKIE_NAME, token, cookieOptions);

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          companyName: user.companyName,
          discordConnected: !!user.discordId,
        },
      });
    } catch (err: any) {
      console.error("[Beta Login] Error:", err);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
  });

  // POST /api/beta/logout
  app.post("/api/beta/logout", (_req: Request, res: Response) => {
    res.clearCookie(BETA_COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return res.json({ success: true });
  });

  // GET /api/beta/me
  app.get("/api/beta/me", async (req: Request, res: Response) => {
    const user = await getBetaUserFromRequest(req);
    if (!user) {
      return res.json(null);
    }
    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.companyName,
      discordConnected: !!user.discordId,
      discordUsername: user.discordUsername || null,
      isConstructLineUser: true,
    });
  });

  // ─── Discord Connect ────────────────────────────────────────────────────────

  /**
   * GET /api/beta/discord/connect
   * Initiates Discord OAuth for an already-logged-in beta user.
   * Requires an active beta session cookie.
   */
  app.get("/api/beta/discord/connect", async (req: Request, res: Response) => {
    const user = await getBetaUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: "You must be logged in to connect Discord." });
    }

    const rawOrigin = (req.query.origin as string) || req.headers.origin || "";
    const origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : PRODUCTION_ORIGIN;
    const returnPath = (req.query.returnPath as string) || "/portal";

    const redirectUri = `${origin}/api/beta/discord/callback`;

    // Encode state: origin + returnPath + betaUserId (so we know who to update on callback)
    const state = Buffer.from(
      JSON.stringify({ origin, returnPath, betaUserId: user.id })
    ).toString("base64url");

    const url = new URL(DISCORD_OAUTH_AUTHORIZE);
    url.searchParams.set("client_id", getDiscordClientId());
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    // guilds.join scope allows the bot to add the user to the guild
    url.searchParams.set("scope", "identify email guilds.join");
    url.searchParams.set("state", state);
    url.searchParams.set("prompt", "consent");

    res.redirect(302, url.toString());
  });

  /**
   * GET /api/beta/discord/callback
   * Discord redirects here after user authorizes.
   * Exchanges code for token, fetches Discord user, updates beta_users, adds to guild.
   */
  app.get("/api/beta/discord/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code || !stateParam) {
      return res.status(400).send("Missing code or state. Please try connecting Discord again.");
    }

    let origin = PRODUCTION_ORIGIN;
    let returnPath = "/portal";
    let betaUserId: number | null = null;

    try {
      const stateData = JSON.parse(Buffer.from(stateParam, "base64url").toString());
      const rawOrigin = stateData.origin || "";
      origin = ALLOWED_ORIGINS.has(rawOrigin) ? rawOrigin : PRODUCTION_ORIGIN;
      returnPath = stateData.returnPath || "/portal";
      betaUserId = Number(stateData.betaUserId) || null;
    } catch {
      return res.status(400).send("Invalid state parameter.");
    }

    if (!betaUserId) {
      return res.redirect(`${origin}${returnPath}?discord_error=invalid_state`);
    }

    const redirectUri = `${origin}/api/beta/discord/callback`;

    try {
      // Exchange code for access token
      const tokenRes = await axios.post(
        DISCORD_OAUTH_TOKEN,
        new URLSearchParams({
          client_id: getDiscordClientId(),
          client_secret: getDiscordClientSecret(),
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const tokenData = tokenRes.data;

      // Fetch Discord user info
      const userRes = await axios.get(DISCORD_USER_ME, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const discordUser = userRes.data;

      // Update beta user record with Discord info
      await requireDb()
        .update(betaUsers)
        .set({
          discordId: discordUser.id,
          discordUsername: discordUser.global_name || discordUser.username,
          discordConnectedAt: new Date(),
        })
        .where(eq(betaUsers.id, betaUserId));

      // Add to guild and assign ConstructLine role (fire and forget — non-blocking)
      addToGuildAndAssignRole(discordUser.id, tokenData.access_token).catch((e: any) =>
        console.warn("[BetaDiscord] Guild/role assignment failed:", e?.message)
      );

      console.log(`[BetaDiscord] Beta user ${betaUserId} connected Discord: ${discordUser.username}`);

      // Redirect back to portal with success flag
      res.redirect(`${origin}${returnPath}?discord_connected=1`);
    } catch (err: any) {
      console.error("[BetaDiscord] Callback error:", err?.response?.data || err?.message);
      res.redirect(`${origin}${returnPath}?discord_error=oauth_failed`);
    }
  });

  console.log("[Beta Auth] Routes registered: /api/beta/signup, /api/beta/login, /api/beta/logout, /api/beta/me, /api/beta/discord/connect, /api/beta/discord/callback");
}
