# ALP Contractor Circle Portal

## Core Setup
- [x] Update index.css with original portal color system (ember/cream/navy)
- [x] Update fonts to Sora + DM Sans
- [x] Set dark theme as default

## Database Schema
- [x] Members table (Discord info, subscription status, role)
- [x] Replays table (admin-managed content)

## Authentication
- [x] Discord OAuth login flow (/api/discord/login, /api/discord/callback)
- [x] Discord guild membership verification (server ID: 927273292354711613)
- [x] Session management with JWT cookies
- [x] Member profile from Discord (avatar, username, display name)

## Stripe Integration
- [x] Products config ($497/mo Contractor Circle)
- [x] Checkout session creation
- [x] Webhook handler (/api/stripe/webhook)
- [x] Subscription status tracking

## Frontend Pages
- [x] Landing page (/circle) - sales page with hero, pricing, CTA
- [x] Login redirect flow
- [x] Member dashboard (/portal) - calendar, quick links
- [x] Templates page (/portal/templates) - Google Drive link
- [x] Replays page (/portal/replays) - course recordings
- [x] Account page (/portal/account) - subscription, profile
- [x] Admin page (/portal/admin) - manage replays, members
- [x] Welcome page (/circle/welcome) - post-payment onboarding

## Dashboard Cards
- [x] Calendar card with Zoom link and Add to Calendar
- [x] Templates & Resources card (Google Drive folder)
- [x] Replays card
- [x] Discord Community card (discord.gg/jnwDPTY6D3)

## Design
- [ ] Marshall's hero image from CDN
- [x] Premium dark luxury aesthetic matching original
- [x] Responsive mobile + desktop layout
- [x] Ember glow effects, grain overlay

## Backend API (tRPC)
- [x] member.me - get current member
- [x] member.subscription - get subscription info
- [x] member.payments - get payment history
- [x] replays.list - list replays
- [x] replays.create - add replay (admin)
- [x] replays.delete - delete replay (admin)
- [x] stripe.createCircleCheckout - create checkout session
- [x] stripe.verifyCheckout - verify checkout session

## Tests
- [x] Auth flow tests (23 tests passing)
- [x] Stripe product config tests
- [x] Member API tests
- [x] Portal constants tests
- [x] ICS calendar generation tests

## Deployment
- [ ] Deploy via Manus hosting
- [ ] Connect custom domain alpcontractorscircle.com
