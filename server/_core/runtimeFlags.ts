function readBoolean(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return defaultValue;

  const normalized = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  console.warn(`[RuntimeFlags] Ignoring invalid boolean for ${name}: ${raw}`);
  return defaultValue;
}

function normalizeOrigin(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    return parsed.origin;
  } catch {
    return null;
  }
}

function splitOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => normalizeOrigin(value.trim()))
    .filter((value): value is string => Boolean(value));
}

const publicAppOrigin =
  normalizeOrigin(process.env.PUBLIC_APP_URL) ||
  normalizeOrigin(process.env.CONSTRUCTLINE_PUBLIC_URL);

const defaultOrigins = [
  "https://alpcontractorcircle.com",
  "https://www.alpcontractorcircle.com",
  publicAppOrigin,
  ...splitOrigins(process.env.ALLOWED_ORIGINS),
];

if (process.env.NODE_ENV !== "production") {
  defaultOrigins.push("http://localhost:3000", "http://localhost:5173");
}

const allowedOrigins = new Set(
  defaultOrigins.filter((value): value is string => Boolean(value))
);

const enableDripEngine = readBoolean("ENABLE_DRIP_ENGINE", false);

export const RUNTIME_FLAGS = {
  constructLineOnly: readBoolean("CONSTRUCTLINE_ONLY", false),
  enableStripeWebhook: readBoolean("ENABLE_STRIPE_WEBHOOK", false),
  enableStripeCheckout: readBoolean("ENABLE_STRIPE_CHECKOUT", false),
  enableDripEngine,
  enableDripRoutes: readBoolean("ENABLE_DRIP_ROUTES", enableDripEngine),
  enableDiscordBot: readBoolean("ENABLE_DISCORD_BOT", true),
  allowPublicConstructLineSignup: readBoolean(
    "ALLOW_PUBLIC_CONSTRUCTLINE_SIGNUP",
    process.env.NODE_ENV !== "production"
  ),
  constructLineSignupCode: process.env.CONSTRUCTLINE_SIGNUP_CODE?.trim() || "",
  publicAppOrigin,
  productionOrigin: publicAppOrigin || "https://alpcontractorcircle.com",
  allowedOrigins,
};

export function resolveAllowedOrigin(rawOrigin: string | undefined | null): string {
  const origin = normalizeOrigin(rawOrigin);
  if (origin && RUNTIME_FLAGS.allowedOrigins.has(origin)) return origin;
  return RUNTIME_FLAGS.productionOrigin;
}

export function requireDripRoutesEnabled(): void {
  if (!RUNTIME_FLAGS.enableDripRoutes) {
    throw new Error("Drip campaign routes are disabled for this deployment.");
  }
}
