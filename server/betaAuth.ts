/**
 * Beta user authentication — email + password sign-up/login for non-Discord users.
 * Beta users get access to ConstructLine tools (Takeoff + Scheduler) only.
 * All other portal features are locked behind Contractor Circle membership.
 */
import type { Express, Request, Response } from "express";
import { hashSync, compareSync } from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { betaUsers, type BetaUser } from "../drizzle/schema";
import { sendConstructLineWelcomeEmail } from "./email";

const BETA_COOKIE_NAME = "beta_session";
const BETA_SESSION_MAX_AGE = 1000 * 60 * 60 * 24 * 30; // 30 days

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
      isConstructLineUser: true,
    });
  });

  console.log("[Beta Auth] Routes registered: /api/beta/signup, /api/beta/login, /api/beta/logout, /api/beta/me");
}
