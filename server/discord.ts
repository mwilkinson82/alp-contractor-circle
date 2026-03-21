import type { Express, Request, Response } from "express";
import axios from "axios";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { getDb } from "./db";
import { members } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const DISCORD_API = "https://discord.com/api/v10";
const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";
const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";

function getRedirectUri(origin: string) {
  return `${origin}/api/discord/callback`;
}

export function registerDiscordRoutes(app: Express) {
  // Discord OAuth login — redirects to Discord
  app.get("/api/discord/login", (req: Request, res: Response) => {
    const origin = (req.query.origin as string) || `${req.protocol}://${req.get("host")}`;
    const returnPath = (req.query.returnPath as string) || "/portal";
    const redirectUri = getRedirectUri(origin);

    const state = Buffer.from(JSON.stringify({ origin, returnPath })).toString("base64url");

    const params = new URLSearchParams({
      client_id: ENV.discordClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email guilds",
      state,
      prompt: "consent",
    });

    res.redirect(`${DISCORD_OAUTH_URL}?${params.toString()}`);
  });

  // Discord OAuth callback — exchanges code for token, verifies guild membership
  app.get("/api/discord/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const stateParam = req.query.state as string;

    if (!code || !stateParam) {
      res.status(400).json({ error: "Missing code or state" });
      return;
    }

    let state: { origin: string; returnPath: string };
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
    } catch {
      res.status(400).json({ error: "Invalid state" });
      return;
    }

    const redirectUri = getRedirectUri(state.origin);

    try {
      // Exchange code for access token
      const tokenRes = await axios.post(
        DISCORD_TOKEN_URL,
        new URLSearchParams({
          client_id: ENV.discordClientId,
          client_secret: ENV.discordClientSecret,
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const accessToken = tokenRes.data.access_token;

      // Get user info from Discord
      const userRes = await axios.get(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const discordUser = userRes.data;
      const discordId = discordUser.id;
      const discordUsername = discordUser.username;
      const displayName = discordUser.global_name || discordUser.username;
      const email = discordUser.email || null;
      const avatarHash = discordUser.avatar;
      const avatarUrl = avatarHash
        ? `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${avatarHash.startsWith("a_") ? "gif" : "png"}?size=256`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(discordUser.discriminator || "0") % 5}.png`;

      // Verify guild membership using bot token
      let isGuildMember = false;
      if (ENV.discordBotToken) {
        try {
          await axios.get(`${DISCORD_API}/guilds/${ENV.discordGuildId}/members/${discordId}`, {
            headers: { Authorization: `Bot ${ENV.discordBotToken}` },
          });
          isGuildMember = true;
        } catch (err: any) {
          if (err?.response?.status === 404) {
            isGuildMember = false;
          } else {
            console.error("[Discord] Guild member check failed:", err?.response?.status);
            // If bot check fails, check user's guilds via OAuth
            try {
              const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              isGuildMember = guildsRes.data.some((g: any) => g.id === ENV.discordGuildId);
            } catch {
              isGuildMember = false;
            }
          }
        }
      } else {
        // Fallback: check via user's guilds
        try {
          const guildsRes = await axios.get(`${DISCORD_API}/users/@me/guilds`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          isGuildMember = guildsRes.data.some((g: any) => g.id === ENV.discordGuildId);
        } catch {
          isGuildMember = false;
        }
      }

      // Upsert member in database
      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: "Database unavailable" });
        return;
      }

      const existing = await db.select().from(members).where(eq(members.discordId, discordId)).limit(1);

      if (existing.length > 0) {
        await db.update(members).set({
          discordUsername,
          displayName,
          email,
          avatarUrl,
          lastSignedIn: new Date(),
        }).where(eq(members.discordId, discordId));
      } else {
        await db.insert(members).values({
          discordId,
          discordUsername,
          displayName,
          email,
          avatarUrl,
          memberRole: "member",
          subscriptionStatus: "none",
          lastSignedIn: new Date(),
        });
      }

      // Create session token using the SDK
      const sessionToken = await sdk.createSessionToken(discordId, {
        name: displayName,
        expiresInMs: ONE_YEAR_MS,
      });

      // Also upsert into users table for compatibility
      const { upsertUser } = await import("./db");
      await upsertUser({
        openId: discordId,
        name: displayName,
        email,
        loginMethod: "discord",
        lastSignedIn: new Date(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // Redirect based on guild membership and subscription
      const member = await db.select().from(members).where(eq(members.discordId, discordId)).limit(1);
      const hasActiveSubscription = member[0]?.subscriptionStatus === "active" || member[0]?.subscriptionStatus === "trialing";

      if (!isGuildMember && !hasActiveSubscription) {
        res.redirect(`${state.origin}/circle`);
      } else {
        res.redirect(`${state.origin}${state.returnPath || "/portal"}`);
      }
    } catch (error: any) {
      console.error("[Discord] OAuth callback failed:", error?.response?.data || error.message);
      res.redirect(`${state.origin}/circle?error=auth_failed`);
    }
  });

  // Discord logout
  app.post("/api/discord/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
