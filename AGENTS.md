# AGENTS.md — ALP Contractor Circle Portal

> **READ THIS ENTIRE FILE BEFORE DOING ANYTHING.** This is the institutional memory for this project. Every rule here exists because a mistake was made. Do not repeat them.

---

## Owner

**Marshall Wilkinson** — Founder of ALP (Altitude Logic Pressure). World-class sales and business consultant. Has done over $2.5 billion in construction. Extremely busy. Does not have time for circle jerks, double-handling, or re-explaining things that should already be known. Respect his time.

---

## CRITICAL RULES — NEVER VIOLATE THESE

### 1. NEVER send anything to customers/clients/subscribers without Marshall's explicit approval first
- **No mass emails.** No broadcast emails. No emails to the subscriber list. No emails to leads. No emails to members. NOTHING goes out without Marshall reviewing and approving it first.
- **Members ≠ Subscribers ≠ Leads.** These are three completely different audiences:
  - **Members** = Paying Contractor Circle members (in the `members` table, have Discord, pay via Stripe)
  - **Subscribers** = Email subscribers (in the `email_subscribers` table, signed up via homepage or lead magnets)
  - **Leads** = People who downloaded a lead magnet (in the `leads` table)
- If Marshall says "send to members," that means ONLY the `members` table. NOT the subscriber list. NOT the leads list.
- If you are about to trigger any email send, STOP and confirm with Marshall: who exactly is receiving it, what the email says, and get his OK.

### 2. Stripe keys are LIVE and CONFIGURED — do NOT ask Marshall for them again
- **STRIPE_SECRET_KEY**: Live key (`sk_live_51HPL9D...`) — configured in Settings → Payment
- **VITE_STRIPE_PUBLISHABLE_KEY**: Live key (`pk_live_51HPL9D...`) — configured in Settings → Payment
- **STRIPE_WEBHOOK_SECRET**: Set and working (`whsec_...`)
- The Stripe account is **ALPio** on the live Stripe dashboard
- The webhook endpoint is `https://alpcontractorcircle.com/api/stripe/webhook` — it is ACTIVE and receiving events
- The sandbox dev environment may show `sk_test_...` keys — that's the dev sandbox, NOT production. The deployed site uses the live keys from Settings → Payment.
- **DO NOT** ever tell Marshall the Stripe keys aren't set or ask him to provide them. They are set. They are live. They work.

### 3. Do NOT redo work that is already done
- Before suggesting any configuration change, CHECK what is already configured
- Before asking Marshall for any credential or key, CHECK the environment variables and Settings panels
- Before rebuilding any feature, CHECK if it already exists in the codebase
- If you don't know, investigate silently. Do not ask Marshall to look things up for you.

---

## Deployment Process

1. Make code changes in the sandbox
2. Run `npx vitest run` to verify all tests pass
3. Run `webdev_save_checkpoint` to create a checkpoint
4. Marshall clicks **Publish** in the Management UI header, or the system auto-deploys
5. The deployed site runs at `https://alpcontractorcircle.com` (custom domain)
6. Also available at `https://alpcontractor-jyldjeaf.manus.space`

**The deployed production site uses environment variables from Settings → Secrets and Settings → Payment.** The sandbox dev environment may have different values for some keys. Do not confuse the two.

---

## Template Library — How to Add a New PDF Template

This is the exact process. Follow it every time Marshall gives you a PDF to add to the template library.

### Step 1: Upload the PDF to CDN
```bash
manus-upload-file --webdev /path/to/template.pdf
```
This returns a CDN URL like `https://d2xsxph8kpxj0f.cloudfront.net/...`. Save this URL.

### Step 2: Add the template to the TEMPLATES array in `client/src/pages/PortalTemplates.tsx`
Add a new entry to the `TEMPLATES` array (around line 48). Use the next sequential ID. Example:

```typescript
{
  id: "29",
  title: "Your Template Title",
  description: "One-line description.",
  longDescription: "Detailed description of what this template contains and how to use it.",
  category: "operations",  // one of: proposals, contracts, sales, operations, finance, estimating, contractor_circle
  fileType: "pdf",
  downloadUrl: "THE_CDN_URL_FROM_STEP_1",
  featured: false,
  badge: "Optional Badge Text",
  pages: "X pages",
  highlights: [
    "Key feature 1",
    "Key feature 2",
    "Key feature 3",
  ],
},
```

### Step 3: Update the test count
The vitest for templates checks the count. Update the expected count in the test file.

### Step 4: Run tests, checkpoint, deploy
```bash
npx vitest run
```
Then `webdev_save_checkpoint` and deploy.

### What NOT to do:
- Do NOT insert templates into the SQL database. The primary source is the hardcoded `TEMPLATES` array. The DB `templates` table is a secondary/legacy source that merges in.
- Do NOT use `/manus-storage/` paths for downloadUrl — use the full CDN URL from `manus-upload-file --webdev`
- Do NOT forget to add the template to the array — if it's only in the DB, it won't have highlights, longDescription, or proper formatting

---

## Database Schema — Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `members` | Paying Contractor Circle members | discordId, email, stripeCustomerId, subscriptionStatus |
| `email_subscribers` | Email list (homepage + lead magnet signups) | email, source |
| `leads` | Lead magnet downloads | firstName, email, source |
| `drip_enrollments` | Drip campaign enrollments | email, sequenceId (ENUM), status, currentStep |
| `drip_sent_emails` | Sent drip email log | email, sequenceId, stepNumber |
| `templates` | DB-stored templates (secondary to hardcoded) | name, url, category |

### Important: drip_enrollments.sequenceId is an ENUM
When adding a new drip sequence, you MUST:
1. Add the sequence ID to the ENUM in the actual database: `ALTER TABLE drip_enrollments MODIFY COLUMN sequenceId ENUM('estimating_single','q1q2_single','double_dipper','homepage_only','three_silos_single') NOT NULL`
2. Add it to the Drizzle schema in `drizzle/schema.ts`
3. Add it to `SOURCE_TO_SEQUENCE` in `server/dripAutoEnroll.ts`
4. Add it to `SCHEDULE` in `server/dripEmails.ts`
5. Add it to `SEQUENCE_LABELS` in `client/src/pages/DripDashboard.tsx`
6. Create the email templates in `server/dripEmails.ts`

---

## Lead Magnet → Drip Sequence Mapping

| Landing Page | Route | Source Tag | Drip Sequence |
|-------------|-------|------------|---------------|
| Estimating Checklist | `/estimating` | `estimating-checklist` | `estimating_single` |
| Q1/Q2 Framework | `/q2` | `q1-q2-framework` | `q1q2_single` |
| Three Silos Framework | `/silos` | `three-silos-framework` | `three_silos_single` |
| Homepage capture | `/` | `homepage_capture` | `homepage_only` |
| Double-dipper (auto) | — | (auto-detected) | `double_dipper` |

---

## Email Configuration

- **Email provider**: Resend (API key in `RESEND_API_KEY` env var)
- **Transactional from address**: `Marshall Wilkinson | ALP <welcome@notifications.marshallwilkinson.com>`
- **Drip from address**: `Marshall Wilkinson <marshall@notifications.marshallwilkinson.com>`
- **Domain**: `notifications.marshallwilkinson.com` (configured in Resend)

---

## Key URLs

| What | URL |
|------|-----|
| Production site | https://alpcontractorcircle.com |
| Manus subdomain | https://alpcontractor-jyldjeaf.manus.space |
| Stripe Dashboard | https://dashboard.stripe.com (ALPio account) |
| Webhook endpoint | https://alpcontractorcircle.com/api/stripe/webhook |
| Coaching link | https://altitudelogicpressure.com/coaching |

---

## Portal Structure

### Public Pages (no auth required)
- `/` and `/circle` — Contractor Circle sales/landing page
- `/estimating` — Estimating Checklist lead magnet
- `/q2` — Q1/Q2 Framework lead magnet
- `/silos` — Three Silos Framework lead magnet
- `/constructline` — ConstructLine landing page

### Member Portal (auth required, subscription gated)
- `/portal` — Dashboard
- `/portal/replays` — Replay Library
- `/portal/templates` — Template Library
- `/portal/account` — Account settings
- `/portal/constructline` — ConstructLine tools (takeoff, estimating, scheduling)

### Admin Pages (admin role required)
- `/portal/admin` — Admin Panel
- `/portal/subscribers` — Subscriber management
- `/portal/members` — Member management
- `/portal/analytics` — Analytics
- `/portal/drip` — Drip Campaign Dashboard

---

## ConstructLine Tools

ConstructLine is the construction management toolset inside the portal:
- **Takeoff** — Quantity takeoff from blueprints (XER import, manual entry)
- **Estimating** — Cost estimation with labor and material libraries
- **CPM Scheduler** — Critical Path Method scheduling
- **Cost Library** — 759 cost items, 320 labor items
- **Trade Rate Library** — Labor rates by trade

---

## Things That Are Already Done — Do Not Rebuild

- Stripe integration (live keys, webhook, checkout flow)
- Discord OAuth login for members
- Drip campaign system (5 sequences, 15-min cron engine)
- Email delivery via Resend
- Template library with 28+ templates
- Subscription gating on portal features
- Member whitelist system (Daniel G, alpteambot bypass)
- Supabase member sync
- Analytics tracking
- ConstructLine beta access system

---

## Common Mistakes to Avoid

1. **Don't confuse dev sandbox keys with production keys.** The sandbox may show test keys; production uses live keys from Settings.
2. **Don't add a new drip sequence without updating the ENUM.** This was the Three Silos bug — the code was correct but the database ENUM didn't include the new value.
3. **Don't send emails without Marshall's approval.** Ever.
4. **Don't ask Marshall for information you can look up.** Check the code, database, environment, and Settings panels first.
5. **Don't use `/manus-storage/` paths for template URLs.** Always use `manus-upload-file --webdev` to get proper CDN URLs.
6. **Don't duplicate work.** Check git history and todo.md before starting anything.
