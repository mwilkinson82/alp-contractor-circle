/**
 * One-off script to add a comped member and send them the welcome email.
 * Usage: node scripts/add-comped-member.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { mysqlTable, int, varchar, text, timestamp, mysqlEnum, boolean } from "drizzle-orm/mysql-core";

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const EMAIL = "hacheconstruction@gmail.com";
const NAME = "Julian Hache";

// --- Database ---
const db = drizzle(process.env.DATABASE_URL);

// Members table (matching actual schema with camelCase column names)
const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  discordId: varchar("discordId", { length: 64 }).notNull().unique(),
  discordUsername: varchar("discordUsername", { length: 128 }),
  discordDisplayName: text("discordDisplayName"),
  discordAvatar: varchar("discordAvatar", { length: 256 }),
  email: varchar("email", { length: 320 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  subscriptionStatus: mysqlEnum("subscriptionStatus", [
    "active", "canceled", "past_due", "trialing", "incomplete", "none",
  ]).default("none").notNull(),
  memberRole: mysqlEnum("memberRole", ["member", "founding_member", "admin"]).default("member").notNull(),
  preferredCurrency: varchar("preferredCurrency", { length: 8 }),
  companyName: varchar("companyName", { length: 255 }),
  companyLogo: varchar("companyLogo", { length: 512 }),
  cpmOnboardingDone: boolean("cpmOnboardingDone").default(false).notNull(),
  scheduleSeeded: boolean("scheduleSeeded").default(false).notNull(),
  lastScaleIdx: int("lastScaleIdx").default(0),
  lastPaperIdx: int("lastPaperIdx").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

// --- Upsert Member ---
async function upsertMember() {
  const existing = await db.select().from(members).where(eq(members.email, EMAIL)).limit(1);
  
  if (existing.length > 0) {
    // Update to active/comped
    await db.update(members).set({
      subscriptionStatus: "active",
      memberRole: "founding_member",
      updatedAt: new Date(),
    }).where(eq(members.email, EMAIL));
    console.log(`[OK] Updated existing member record for ${EMAIL} to active/comped`);
    return existing[0];
  } else {
    // Create new pending member (will be linked when they log in via Discord)
    const placeholderDiscordId = `email:${EMAIL}`;
    await db.insert(members).values({
      discordId: placeholderDiscordId,
      email: EMAIL,
      discordDisplayName: NAME,
      subscriptionStatus: "active",
      memberRole: "founding_member",
      lastSignedIn: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`[OK] Created new comped member record for ${EMAIL}`);
    const newMember = await db.select().from(members).where(eq(members.email, EMAIL)).limit(1);
    return newMember[0];
  }
}

// --- Send Welcome Email ---
async function sendWelcomeEmail() {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.error("[ERROR] RESEND_API_KEY not set");
    process.exit(1);
  }
  
  const resend = new Resend(resendApiKey);
  const FROM_ADDRESS = "Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>";
  const firstName = NAME.split(" ")[0];
  
  const { data, error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: EMAIL,
    subject: "Welcome to The Contractor Circle — Here's How to Get Started",
    html: buildWelcomeHtml(firstName),
    text: buildWelcomeText(firstName),
  });
  
  if (error) {
    console.error("[ERROR] Failed to send welcome email:", error);
    process.exit(1);
  }
  
  console.log(`[OK] Welcome email sent to ${EMAIL} — id: ${data?.id}`);
}

function buildWelcomeHtml(firstName) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to The Contractor Circle</title></head>
<body style="margin:0;padding:0;background-color:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d0d0d;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a;border-radius:12px;overflow:hidden;">
<tr><td style="padding:48px 40px 32px;text-align:center;">
<h1 style="color:#f1b51d;font-size:28px;margin:0 0 8px;">Welcome to The Circle, ${firstName}.</h1>
<p style="color:#EDE6DB;font-size:16px;line-height:1.6;margin:16px 0;">You're in. This is where elite contractors build, scale, and dominate their markets together.</p>
</td></tr>
<tr><td style="padding:0 40px 32px;">
<h2 style="color:#f1b51d;font-size:20px;margin:0 0 16px;">Here's how to get started:</h2>
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:12px 0;border-bottom:1px solid #333;">
<p style="color:#EDE6DB;font-size:15px;margin:0;"><strong style="color:#f1b51d;">1.</strong> Join the Discord community — Head to the <strong style="color:#EDE6DB;">#welcome</strong> channel first, then you'll have access to <strong style="color:#EDE6DB;">#general-chat</strong> and the exclusive <strong style="color:#EDE6DB;">#circle-chat</strong>.</p>
</td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #333;">
<p style="color:#EDE6DB;font-size:15px;margin:0;"><strong style="color:#f1b51d;">2.</strong> Log into the Member Portal at <a href="https://alpcontractorcircle.com" style="color:#f1b51d;">alpcontractorcircle.com</a> — your dashboard, replays, templates, and ConstructLine tools are all here.</p>
</td></tr>
<tr><td style="padding:12px 0;border-bottom:1px solid #333;">
<p style="color:#EDE6DB;font-size:15px;margin:0;"><strong style="color:#f1b51d;">3.</strong> Show up to the next live call — Every Sunday at 5:00 PM ET. Bring your questions, your wins, and your challenges.</p>
</td></tr>
<tr><td style="padding:12px 0;">
<p style="color:#EDE6DB;font-size:15px;margin:0;"><strong style="color:#f1b51d;">4.</strong> Explore ConstructLine — Your bid desk (Basis) and schedule desk (Baseline) are ready to go.</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 40px 40px;text-align:center;">
<p style="color:#888;font-size:14px;line-height:1.6;margin:24px 0 0;font-style:italic;">"The future is bright. The value is real. Welcome to a world where anything is possible."</p>
<p style="color:#888;font-size:13px;margin:16px 0 0;">— Marshall Wilkinson</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildWelcomeText(firstName) {
  return `Welcome to The Circle, ${firstName}.

You're in. This is where elite contractors build, scale, and dominate their markets together.

Here's how to get started:

1. Join the Discord community — Head to the #welcome channel first, then you'll have access to #general-chat and the exclusive #circle-chat.

2. Log into the Member Portal at alpcontractorcircle.com — your dashboard, replays, templates, and ConstructLine tools are all here.

3. Show up to the next live call — Every Sunday at 5:00 PM ET. Bring your questions, your wins, and your challenges.

4. Explore ConstructLine — Your bid desk (Basis) and schedule desk (Baseline) are ready to go.

"The future is bright. The value is real. Welcome to a world where anything is possible."

— Marshall Wilkinson`;
}

// --- Main ---
async function main() {
  console.log(`\n=== Adding Comped Member: ${NAME} (${EMAIL}) ===\n`);
  
  const member = await upsertMember();
  console.log(`   Member ID: ${member?.id || "new"}`);
  console.log(`   Status: active (comped — no Stripe subscription)`);
  console.log(`   Role: founding_member\n`);
  
  await sendWelcomeEmail();
  
  console.log(`\n=== Done ===\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
