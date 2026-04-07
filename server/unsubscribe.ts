/**
 * Drip Campaign Unsubscribe System
 * 
 * - Token-based unsubscribe links (HMAC-SHA256, no expiry)
 * - GET /api/drip/unsubscribe?token=xxx — renders confirmation page and marks as unsubscribed
 * - generateUnsubscribeUrl(email) — creates the link to embed in drip emails
 */

import crypto from "crypto";
import { Express, Request, Response } from "express";

const SECRET = process.env.JWT_SECRET || "fallback-secret";

let _pool: any = null;
async function getPool() {
  if (!_pool) {
    const mysql = await import("mysql2/promise");
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 2,
    });
  }
  return _pool;
}

// ─── Token helpers ──────────────────────────────────────────────────────────

/** Create an HMAC token for the given email — deterministic, no expiry */
function createToken(email: string): string {
  return crypto.createHmac("sha256", SECRET).update(email.toLowerCase().trim()).digest("hex");
}

/** Verify a token matches the email */
function verifyToken(email: string, token: string): boolean {
  const expected = createToken(email);
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Generate the full unsubscribe URL for a given email */
export function generateUnsubscribeUrl(email: string): string {
  const token = createToken(email);
  const encodedEmail = encodeURIComponent(email.toLowerCase().trim());
  // Use relative path — works across all domains
  return `/api/drip/unsubscribe?email=${encodedEmail}&token=${token}`;
}

// ─── Express route registration ─────────────────────────────────────────────

export function registerUnsubscribeRoutes(app: Express): void {
  app.get("/api/drip/unsubscribe", async (req: Request, res: Response) => {
    const { email, token } = req.query;

    if (!email || !token || typeof email !== "string" || typeof token !== "string") {
      return res.status(400).send(renderPage("Invalid Link", "This unsubscribe link is invalid or expired."));
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify token
    try {
      if (!verifyToken(normalizedEmail, token)) {
        return res.status(400).send(renderPage("Invalid Link", "This unsubscribe link is invalid."));
      }
    } catch {
      return res.status(400).send(renderPage("Invalid Link", "This unsubscribe link is invalid."));
    }

    // Mark all active drip enrollments for this email as unsubscribed
    try {
      const pool = await getPool();
      const [result] = await pool.execute(
        `UPDATE drip_enrollments 
         SET status = 'unsubscribed', nextSendAt = NULL 
         WHERE email = ? AND status = 'active'`,
        [normalizedEmail]
      );

      const affected = (result as any).affectedRows || 0;
      console.log(`[Unsubscribe] ${normalizedEmail} — ${affected} enrollment(s) unsubscribed`);

      return res.send(renderPage(
        "You've Been Unsubscribed",
        `You've been removed from our email series. You won't receive any more drip campaign emails from us.<br><br>If this was a mistake, just reply to any previous email from Marshall and we'll get you back on track.`
      ));
    } catch (err: any) {
      console.error("[Unsubscribe] Database error:", err);
      return res.status(500).send(renderPage("Something Went Wrong", "Please try again later or reply to any email from Marshall to unsubscribe manually."));
    }
  });
}

// ─── Confirmation page HTML ─────────────────────────────────────────────────

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — ALP</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #f7f5f2;
      font-family: 'Inter', Helvetica, Arial, sans-serif;
      color: #2d2d2d;
      padding: 24px;
    }
    .card {
      max-width: 480px;
      width: 100%;
      background: #ffffff;
      border-radius: 12px;
      padding: 48px 36px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      text-align: center;
    }
    .accent {
      width: 40px;
      height: 3px;
      background: linear-gradient(90deg, #D4915C, #C9A96E);
      border-radius: 2px;
      margin: 0 auto 28px auto;
    }
    h1 {
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1a1a1a;
    }
    p {
      font-size: 15px;
      line-height: 1.7;
      color: #555;
    }
    .footer {
      margin-top: 32px;
      font-size: 11px;
      letter-spacing: 1.5px;
      color: #999;
      text-transform: uppercase;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="accent"></div>
    <h1>${title}</h1>
    <p>${message}</p>
    <div class="footer">ALP</div>
  </div>
</body>
</html>`;
}
