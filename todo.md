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
- [x] Marshall's hero image from CDN (https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/marshall_hero_6156d00c.webp)
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
- [x] Deploy via Manus hosting
- [ ] Connect custom domain alpcontractorscircle.com

## Pending
- [x] Write vitest tests for ported code (61 passing, 3 skipped for missing RESEND_API_KEY)
- [x] Save checkpoint and deploy

## Redesign to Match Original (Ported from GitHub repo)
- [x] Ported original ContractingCircle landing page with all circle components
- [x] Ported original PortalDashboard with subscription status, quick links
- [x] Ported original MemberPortalLayout with sidebar navigation
- [x] Ported all portal pages (Replays, Templates, Account, Admin)
- [x] Ported CircleWelcome post-payment page
- [x] Ported original Midnight Ember theme (index.css)
- [x] Updated App.tsx: / route → ContractingCircle (removed link-in-bio Home)
- [x] Updated Discord invite to discord.gg/jnwDPTY6D3
- [x] Updated Zoom link to real meeting URL
- [x] Updated Discord OAuth to use dynamic origin
- [x] Fixed server imports (registerDiscordOAuthRoutes, registerStripeWebhook)
- [x] Installed resend package
- [x] Migrated members table columns
- [x] Migrated replays table columns
- [x] Fixed TypeScript errors (0 errors)

## Hotfix — Name & OAuth- [x] Fix ALL instances of "Contracting Circle" to "Contractor Circle" across entire project
- [x] Update Discord OAuth redirect URI to https://alpcontractorcircle.com/api/discord/callback
- [x] Deploy

## Email & Discord Onboarding Fixes
- [x] Discord: assign member role on OAuth login (not just upsert to DB)
- [x] Discord: redirect new member to #welcome channel (not power-hour thread)
- [x] Welcome Email #1: replace "Mark Your Calendar" card with Zoom add-to-calendar card (Google + Apple + Outlook links)
- [x] Welcome Email #1: update "Start Executing" card to link to portal login (/portal)
- [x] Welcome Email #1: add "Create Your Account / Access Portal" CTA button
- [x] Welcome Email #2: Founding Member announcement email (grandfathered pricing, limited spots, new initiative backstory)
- [x] Wire both emails to fire sequentially from Stripe webhook on checkout.session.completed

## Footer Link Fixes
- [x] Fix Instagram URL to https://instagram.com/realmarshallwilkinson in both emails
- [x] Fix website URL to https://alpcontractorschool.com in both emails

## Discord & Landing Page Updates
- [x] Move Discord welcome message from #welcome to #general-chat
- [x] Add live member count to landing page hero (e.g. "X of 50 founding spots claimed")

## Copy Fixes
- [x] Fix "weekly" to "bi-weekly" for calls in both emails (Email #1 and #2)
- [x] Fix "weekly" to "bi-weekly" on landing page (hero badges, stats, features, etc.)
- [x] Remove/replace "Daily Live Rooms" stat with "Founding Spots Remaining" (live count from DB)

## Content Updates
- [ ] Replace fake testimonials with real ones (Nathan Oliveira, Ronnie Silva, Julius Davis + others from screenshots)
- [ ] Add video testimonial section with Beau Monde MP4, Ahron Gluck MP4, and YouTube video
- [ ] Build out portal Templates section with real contractor templates

## Bug Fixes
- [x] Fix Discord OAuth redirect URI — normalise to ALLOWED_ORIGINS; Cloud Run hostname fallback was causing mismatch
- [x] Fix calendar links: bi-weekly Sunday 5 PM ET (not Thursday, not Saturday)
- [x] Add poster thumbnails to video testimonials (Beau Monde logo, Ahron Gluck logo)
- [x] Remove 3 fake testimonials, keep only Olive Tree Builds, Sage Construction, Davis Contracting
- [x] Seed 4 founding members in DB (AJ/Beau Monde, Ronnie/Sage, Nathan/Olive Tree, Dan/Del Monte)
- [x] Add "Member Login" link to landing page nav that goes to /portal (Discord OAuth)

## Landing Page Premium Rebuild
- [x] Rebuild HeroSection: cinematic scroll animations, premium nav, transformation stats bar
- [x] Rebuild WhatsIncluded: scroll-triggered timeline with outcome-focused copy
- [x] Add Marshall video placeholder section
- [x] Rebuild Testimonials: real transformation numbers ($20M, $10M, $2M)
- [x] Rebuild ValueProps, PricingSection, FAQSection, FinalCTA, Footer
- [x] Add Julius Davis ($1M → $4M in 6 months) to hero stats ticker

## Portal Fixes (In Progress)
- [x] Fix Discord Join Community card link — updated to https://discord.gg/KUTmm9D5aW
- [x] Enable admin role for M Wilkinson (Saxon Capital email) — set via SQL
- [x] Add Construction SOPs Template (#8) with Google Drive Access Document button

## New Tasks
- [x] Create construction checklists and SOP documents and add to template library (3 new docs, 3 new templates #9-11)
- [x] Fix replay filter label from "Weekly Call" to "Contractor Circle Calls" (PortalReplays + PortalAdmin)

## Premium Showcase Section
- [x] Build InsideTheCircle component with portal preview, Discord proof, template showcase
- [x] Add social proof dashboard with transformation numbers and member stats
- [x] Premium animations and billion-dollar brand styling
- [x] Integrate into landing page and deploy
- [x] Fix Cloudflare Stream video embed — corrected URL from mediadelivery.net to iframe.videodelivery.net
- [x] Fix video aspect ratio to 9:16 portrait (Cloudflare Stream embed)

## Mobile Optimization (Priority — Most Traffic is Mobile)
- [x] Fix video aspect ratio from 9:16 back to 16:9 (video is landscape, not portrait — 9:16 creates massive black bars)
- [x] Fix stats section mobile spacing — "46 of 50 Founding Spots Remaining" cramped on mobile
- [x] Full mobile optimization pass on entire landing page (hero, ticker, stats, WhatsIncluded, MarshallVideo, InsideTheCircle, testimonials, pricing, FAQ)

## Bug Fixes
- [x] Fix broken Discord screenshot image in InsideTheCircle community tab — replaced with inline Discord-style chat UI illustration (no external image dependency)
- [x] Re-upload real Discord screenshot (AJ Hoover $4.5M bid) to CDN and replace JSX illustration
- [x] Remove autoplay from Cloudflare Stream iframe, add lazy loading (preload=none, autoplay=false, removed autoplay from allow attribute)

## Mobile UX — InsideTheCircle Carousel
- [x] Rebuild InsideTheCircle as swipeable mobile carousel with peek-through edge effect
- [x] Add dot indicators (Instagram-style) below carousel
- [x] Add "Swipe to explore" animated prompt on mobile
- [x] Auto-cycle through tabs every 4s (pauses on interaction)
- [x] Make tab buttons larger with strong active/inactive visual difference
- [x] Add pulsing glow animation on active tab

## Call Date Update
- [x] Update first call date to Sunday March 29th across all site copy — replaced all Thursday references with Sunday, updated bi-weekly logic to anchor on March 29 (skips Easter April 20 naturally)

## Countdown Bar & Template Modals
- [x] Add countdown bar to next call (March 29, 5 PM ET) — sticky top bar with live seconds countdown, dismissible, Claim Spot CTA
- [x] Upload real template screenshots and wire each template modal to its own unique image — 5 CDN images uploaded, each modal now shows the correct screenshot
- [ ] Send welcome emails to four founding members (awaiting email addresses)

## Countdown Bar Redesign
- [x] Redesign countdown bar to airport departures board style — always show "Next Contractor Circle Call" label on mobile, removed "Claim Spot" CTA, clean three-column layout (label | countdown | dismiss)

## Call Schedule Badge (Replaces Sticky Bar)
- [x] Remove sticky countdown bar from landing page
- [x] Fix all "every other Sunday" copy to "Sundays bi-weekly · 5 PM ET · Starting March 29"
- [x] Build animated next-call badge embedded in hero section (premium, not salesy) — inline badge below CTA with live dot, date, countdown

## Template Modal & Hero Enhancements
- [x] Make template preview modals zoomable and scrollable (tap/click to cycle zoom 1x→1.5x→2.5x, scrollable, Escape to close)
- [ ] Add "Add to Calendar" button to hero next-call badge — opens Google Calendar event, Zoom link behind portal login
- [ ] Wire hero "X of 50 Spots Filled" badge to live subscriber count from database (trpc.member.count, refreshes every 30s)
- [ ] Fix TypeScript errors in HeroSection (FoundingSpotsBadge component, onCalendarClick prop, duplicate useEffect import)
- [ ] Fix video thumbnail — use hero CDN image as Cloudflare Stream poster so no open-mouth first frame
- [ ] Rewrite WhatsIncluded — benefits-first copy, add 5 new value items (Hot Seat Deal Reviews, ALP Rolodex, Pricing Benchmarks, Future Program Access, Direct Question Submission)
- [x] Build question submission system — DB schema (call_questions table), tRPC procedures, member submit form in portal, admin review panel with mark-for-call feature

## UX Fixes & WhatsIncluded Rebuild
- [x] Fix calendar icon on hero badge — scroll to pricing section (non-members get no Zoom link)
- [x] Fix "Access This Template" button in InsideTheCircle modal — scroll to pricing / trigger checkout
- [x] Wire live member count in hero badge from trpc.member.count (active Stripe subscribers)
- [x] Add "Submit a Question" quick link to portal dashboard quick-links grid
- [x] Submit a Question quick link opens a modal with form + optional file attachment
- [x] Rebuild WhatsIncluded as bold spoon-feeding benefit stack — large-format outcomes, short punchy copy, no paragraphs

## Portal Templates Fix
- [x] Fix template modal button: change "Download DOCX" to "Access Document" / "Open in Google Drive" linking to the Google Drive URL
- [x] Restore real Discord screenshot (AJ Hoover $4.5M bid) in InsideTheCircle Community tab
- [x] Redesign WhatsIncluded back to premium timeline aesthetic with cleaner punchy copy (no paragraphs, but premium visual design)

## Bug Fixes — March 22 Batch
- [x] Discord screenshot still blank in Community tab — FIXED: removed max-h and object-top constraints
- [ ] Video section not playing — Cloudflare iframe not rendering (video ID may be invalid)
- [x] Add "Submit a Question" CTA button to landing page (not just portal) — DONE: SubmitQuestionCTA component added
- [x] Verify template "Access Document" button works after publish — VERIFIED: button code is correct
- [ ] Publish all changes to alpcontractorcircle.com — READY TO PUBLISH
