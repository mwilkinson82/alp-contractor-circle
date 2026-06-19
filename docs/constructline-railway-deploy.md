# ConstructLine Fresh Railway Deployment

This app can run as a fresh ConstructLine/Basis deployment with new logins and a new database. The immediate recovery goal is direct client access, not restoration of old Manus marketing, drip, or Stripe flows.

## Recommended URL

- `https://basis.alpcontractorcircle.com`
- Backup option: `https://constructline.alpcontractorcircle.com`

## Railway Services

1. Create a Railway project from the GitHub repo.
2. Add a MySQL service in the same Railway project.
3. Deploy the Node app service from this repo.

## Build Settings

Build command:

```sh
corepack enable && pnpm install --frozen-lockfile && pnpm build
```

Start command:

```sh
pnpm start
```

## Required Variables

```sh
NODE_ENV=production
CONSTRUCTLINE_ONLY=true
VITE_CONSTRUCTLINE_ONLY=true
PUBLIC_APP_URL=https://basis.alpcontractorcircle.com
ALLOWED_ORIGINS=https://basis.alpcontractorcircle.com,https://constructline.alpcontractorcircle.com
JWT_SECRET=<generate-a-long-random-secret>
DATABASE_URL=<railway-mysql-url>
CONSTRUCTLINE_SIGNUP_CODE=<client-access-code>
ALLOW_PUBLIC_CONSTRUCTLINE_SIGNUP=false
```

## Keep Disabled For Fresh ConstructLine

```sh
ENABLE_DRIP_ENGINE=false
ENABLE_DRIP_ROUTES=false
ENABLE_STRIPE_WEBHOOK=false
ENABLE_STRIPE_CHECKOUT=false
```

## Optional But Expected

```sh
RESEND_API_KEY=<resend-api-key>
DISCORD_CLIENT_ID=<discord-client-id>
DISCORD_CLIENT_SECRET=<discord-client-secret>
DISCORD_BOT_TOKEN=<discord-bot-token>
DISCORD_GUILD_ID=<discord-server-id>
ENABLE_DISCORD_BOT=true
OPENAI_API_KEY=<openai-project-api-key>
OPENAI_MODEL=gpt-5.5
OPENAI_MAX_COMPLETION_TOKENS=32768
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=/data/storage
```

Use `OPENAI_MODEL=gpt-5.5` for the first production-quality test. Move down to a cheaper model only after comparing takeoff accuracy on representative drawings.

## Optional Model Routing And Cost Tracking

ConstructLine records each analysis run and each LLM call in MySQL. By default, every call uses `OPENAI_MODEL`. To test a cheaper/faster model ladder without changing code, set any of these optional overrides:

```sh
OPENAI_MODEL_SHEET_INDEX=<cheaper-fast-model>
OPENAI_MODEL_TAKEOFF_EXTRACT=<primary-vision-model>
OPENAI_MODEL_TAKEOFF_VERIFY=<review-model>
OPENAI_MODEL_LABOR=<labor-basis-model>
```

If you want the analysis-run ledger to estimate spend, set token pricing in cents per 1M tokens:

```sh
OPENAI_INPUT_COST_PER_1M_TOKENS_CENTS=<input-cents>
OPENAI_OUTPUT_COST_PER_1M_TOKENS_CENTS=<output-cents>
```

Leave these unset if you only need timing, model, and token-count observability.

If a Railway volume is mounted somewhere other than `/data`, set `STORAGE_LOCAL_DIR` to that mounted path plus `/storage`.

## One-Time Database Setup

After `DATABASE_URL` points at the new Railway MySQL database, run:

```sh
pnpm db:push
```

Do this against the fresh database before giving clients links.

## Discord OAuth

In the Discord Developer Portal, add this redirect URI:

```txt
https://basis.alpcontractorcircle.com/api/beta/discord/callback
```

If the backup domain is used, add:

```txt
https://constructline.alpcontractorcircle.com/api/beta/discord/callback
```

## Smoke Test

1. Open `/constructline/login`.
2. Create a test account using the invite code.
3. Confirm redirect to `/portal/constructline`.
4. Open `/portal/takeoff`.
5. Create a project and upload a small drawing.
6. Run the AI processing once.
7. Confirm drip routes and Stripe checkout stay disabled.
8. Connect Discord and confirm the ConstructLine role assignment works.
