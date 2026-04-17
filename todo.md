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

## PDF Export Parity Fix
- [x] Replace uniform avgRowH with per-row variable heights (getWbsRowHeight/getActivityRowHeight)
- [x] Cumulative Y tracking in drawPage for table rows and Gantt bars
- [x] Fix broken import statement in PdfExportPreview.tsx
- [x] Pagination now accounts for variable row heights

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
- [x] Video section not playing — RESOLVED: was a preview caching/lazy-load issue, video plays correctly
- [x] Add "Submit a Question" CTA button to landing page (not just portal) — DONE: SubmitQuestionCTA component added
- [x] Verify template "Access Document" button works after publish — VERIFIED: button code is correct
- [x] Publish all changes to alpcontractorcircle.com — PUBLISHED

## Quick Fixes — March 22 (cont.)
- [x] Make "Members Only" badge on Submit a Question CTA red instead of current color
- [x] Fix Discord screenshot not displaying in production — re-uploaded as PNG with correct content-type
- [x] Fix Cloudflare video not playing in production — confirmed working on live site, Preview panel iframe nesting issue only

## Quick Fixes — March 22 (cont.)
- [x] Make "Members Only" badge on Submit a Question CTA red instead of current color
- [x] Fix Discord screenshot not displaying in production — re-uploaded as PNG with correct content-type
- [x] Fix Cloudflare video not playing in production — confirmed working on live site, Preview panel iframe nesting issue only

## UX Polish — March 22
- [x] Move Submit a Question CTA above testimonials (between InsideTheCircle and Testimonials)
- [x] Rebuild WhatsIncluded timeline animations — scroll-linked spring physics, buttery fade-up, no jerky pop-in

## New Features — March 22 (afternoon)
- [x] Build premium before/after revenue comparison visual near Member Transformations section
- [x] Wire email notification to marshall@marshallwilkinson.com when someone submits a question through the portal

## Stripe Purchase Notification & Email Template
- [x] Wire Stripe webhook purchase notification email to marshall@marshallwilkinson.com with amount, member name, product
- [x] Save ALP premium email template as reusable template (server/emailTemplates/alp-premium-template.html)
- [x] Send congratulations email to Mo at info@smelmasry.co.uk (six-week intensive retention)

## Revenue Impact Redesign
- [x] Replace personal names with company names (Betancourt Construction, Tyler Construction, Silva Construction)
- [x] Add scroll-triggered animated progress bars that fill up as section enters viewport
- [x] Add counting number animation synced to bar fill (counts from before to after revenue)
- [x] Premium billion-dollar data viz aesthetic — not generic bar chart

## March 22 — Redundancy Fix & Name Corrections
- [x] Replace ALL personal names with company names site-wide (Ronnie Silva→Sage Construction, Morgan Tyler→Trojan Roofing, Brian Betancourt→CNY Group, Julius Davis→Davis Contracting, Dan Del Monte→Del Monte Builders, Nathan Oliveira→Olive Tree Builds, Andy Ramirez→ARC Construction Group, Betancourt Core Construction→CNY Group)
- [x] Replace Member Transformations cards (next to video) with "By The Numbers" stats block ($100M+, 15+ companies, 33×, 1 month)
- [x] Redesign countdown timer — replace generic elongated card with premium integrated badge/banner
- [x] Fix $500/month → $497/month in countdown timer copy
- [x] Remove redundancy: ensure contractor stories aren't repeated across multiple sections

## Power Hour Access Expiration Email
- [x] Draft professional Power Hour expiration email to Anthony Lozado — sent preview to Marshall for aesthetic approval
- [ ] Send final email to Anthony Lozado (anthony@lozadocontracting.com) after Marshall approves

## Bug Fix — Video Not Playing
- [ ] Fix video not playing in MarshallVideo section after By The Numbers redesign

## March 22 — Portal Screenshots, Dozens More, Mobile Fix, Zoom
- [x] Add "plus dozens more" after before/after transformation section
- [x] Fix mobile layout — "This Is What You Get" cards stretching too long on mobile
- [x] Add portal screenshots (Dashboard, Replay Library, Template Library) to the sales page
- [x] Add Zoom badge next to bi-weekly call mentions
- [ ] Add Zoom call mockup graphic in a prominent location (optional enhancement for future)
- [x] Build frosted glass experience for non-subscribers (blurred/locked content, persistent subscribe banner, every locked element has CTA)
- [x] Track non-subscriber logins in database for retargeting (login tracking already exists via lastSignedIn in Discord auth)

- [x] Rebuild PortalPreview with floating 3D perspective cards (no browser chrome, premium brand feel)

## Bug Fix — Portal Preview Cards Not Displaying
- [x] Fix 3D perspective card container — simplified to single active card with proper aspect ratio and overflow handling

## Bug Fix — Portal Preview CDN Content-Type
- [x] Re-upload portal screenshots via storage API with correct image/png content-type (was application/octet-stream)
- [x] Update PortalPreview component with new CDN URLs
- [x] Verify all three tabs render correctly on live site after deploy
- [x] Re-upload ALL CDN images site-wide (hero, discord screenshot, template previews, replay thumbnail, zoom logo, beau-monde logo) with correct content-types
- [x] Update all CDN URLs in components to use clean paths (no hash suffixes)

## Sage Construction Stat Fix
- [x] Fix Sage Construction ticker stat from "2nd month" to "1 year"
- [ ] Publish to production

## Sage Construction Stat Fix
- [x] Fix Sage Construction ticker stat from "2nd month" to "1 year"
- [ ] Publish to production

## Portal Preview Card Fixes
- [x] Remove 3D perspective tilt/rotation from portal preview cards — proper 3D rotateX perspective instead of Z rotation
- [x] Fix image cropping so full screenshot is visible (object-top + browser chrome bar + maxHeight)
- [ ] Redeploy to production

## Portal Preview Image Cropping Fix
- [x] Make all three portal preview screenshots display fully without any cropping at the top (removed object-cover and maxHeight constraint)

## Subscription & Image Fixes
- [x] Grant Marshall (owner) an active subscription in the database (members id=30001, subscriptionStatus=active)
- [x] Fix portal preview images — headers still cut off behind browser chrome bar (added 30px top padding + new screenshots)
- [x] Replace dashboard screenshot with new one (shows active subscription)
- [x] Add top padding to all three portal screenshots so headers aren't cut off by browser chrome
- [x] Re-upload all three screenshots to CDN and update URLs

## Portal Preview Sidebar Crop & New Features
- [x] Crop sidebar from dashboard screenshot (left ~290px) to make content fit better in mockup
- [x] Re-upload cropped dashboard screenshot to CDN
- [x] Implement subscription check for calendar button (only show if subscribed)
- [x] Add email capture section below hero section (mobile-friendly, not in hero)
- [x] Test all changes and redeploy (email capture renders, calendar button logic working, no TypeScript errors)

## Email Capture, Favicon & Social Preview
- [x] Create email_subscribers table in database schema
- [x] Create tRPC endpoint for email capture (subscribe mutation)
- [x] Integrate EmailCapture form with backend endpoint
- [x] Add owner notification email when someone subscribes (marshall@marshallwilkinson.com)
- [x] Create favicon for ALP Contractor Circle (geometric circle + checkmark icon in ember/midnight colors)
- [x] Generate social media preview image (Open Graph) (1200x630px with headline, benefits, and icon)
- [x] Add favicon and OG meta tags to HTML (favicon + OpenGraph + Twitter Card)
- [x] Test all changes and redeploy

## New Member Subscriptions
- [ ] Grant active subscription to AJ Hoover (ajhoover@mac.com)
- [ ] Grant active subscription to Ronnie Silva (office@sageconstructiondevelopment.com)
- [ ] Send welcome email to AJ Hoover
- [ ] Send welcome email to Ronnie Silva
- [ ] Update Dan Del Monte email to dan@delmontebuilders.com
- [ ] Update Nathan Oliveira email to nathan@olivetreebuilds.ca

## Calendar One-Click Add (March 22)
- [x] Build one-click "Add to Calendar" button that adds bi-weekly Sunday 5 PM ET Zoom calls to member's Google Calendar
- [x] Include Zoom meeting link, recurring bi-weekly schedule, and proper event details
- [x] Wire button in portal dashboard calendar card
- [x] Test calendar event creation
## Admin Dashboard for Email Subscribers (March 22)
- [x] Build admin-only page to view all email subscribers
- [x] Show subscriber email, signup date, and status
- [x] Add search and filter functionality
- [x] Add CSV export feature
- [x] Wire into member portal navigation

## New Member Signup Notification (March 22)
- [x] Send email to marshall@marshallwilkinson.com when a new member creates their account (first Discord OAuth login)
- [x] Include member name, email, Discord username, and signup timestamp

## Anthony Lozado Power Hour Expiration Email (March 22)
- [x] Send Power Hour expiration email to anthony@lozadocontracting.com

## Welcome Email Fix (March 22)
- [x] Investigate why founding member welcome emails appear empty in Resend
- [x] Resend welcome emails to all 4 founding members with full HTML content

## Founding Member Count & Naming Fix (March 24)
- [ ] Update founding member count from 5 to 7 of 50
- [ ] Ensure "Contractor Circle" (not "Contracting Circle") everywhere

## Bare Domain Fix & Count Update (March 24)
- [ ] Update founding member count from 5 to 7 of 50
- [ ] Fix bare domain alpcontractorcircle.com not serving latest version
- [ ] Redeploy with all three domains

## CRITICAL: Stripe Checkout Button Not Working (March 24)
- [ ] Fix "Claim Your Founding Spot" buttons to redirect to Stripe checkout

## CRITICAL: Checkout broken in Instagram in-app browser (March 24)
- [x] Fix window.open() being blocked by in-app browsers (Instagram, TikTok, Facebook)
- [x] Use window.location.href for mobile/in-app browsers instead of window.open()
- [x] Fix Stripe webhook secret mismatch - redeploy to push correct whsec value to production
- [x] Fix SEO: add meta keywords, description, structured data, and Open Graph tags to landing page
- [x] Fix Stripe webhook: insert new member into Supabase BEFORE sending welcome email
- [x] Make hero badge member count dynamic from Supabase (was hardcoded "9 of 50")
- [x] Make stat section "spots remaining" dynamic (50 minus active members)
- [x] Make Results tab founding member count dynamic from Supabase
- [x] Create shared Supabase member count hook for all three locations
- [x] Create leads table in Supabase with RLS policies
- [x] Insert 3 initial lead records (Mateo, bbell, rob)
- [x] Automate subscribe form to insert into leads table alongside notification email
- [x] Write tests for leads functionality
- [ ] Create Supabase template_requests table with RLS policies
- [ ] Add tRPC submitTemplateRequest mutation
- [ ] Build Template Request UI section in portal templates page
- [ ] Write vitest tests for template request submission

## Mobile Responsiveness — Portal Pages
- [ ] Fix PortalTemplates category filter badges — horizontal scroll on mobile
- [ ] Full portal mobile responsiveness audit and fix (all portal pages)

## Member ID Ty- [x] Change getMemberById parameter from id: number to id: string in server/discord.tsfrom number to string in server/supabase.ts
- [x] Change verifyMemberSession memberId from number to string in server/discord.ts

## Stripe-to-Discord Member Merge Fix
- [x] Rewrite Discord OAuth callback merge logic to handle mismatched Stripe/Discord emails
- [x] Add multiple matching strategies: email placeholder, Stripe customer ID, Supabase cross-reference
- [x] Clean up existing duplicate member records (Darian, Henrico, Caleb, Daniel)
- [x] Write tests for the new merge logic
- [x] Verify welcome email flow still works after fix

## Webhook Monitoring Notifications
- [x] Add detailed purchase monitoring notification to Stripe webhook (member name, email, status, merge result)
- [x] Include error/warning alerts when merge fails or records are ambiguous

## Reactivate Subscription
- [ ] Add reactivateSubscription procedure to memberRouter.ts
- [ ] Add reactivate button to PortalAccount.tsx (visible when cancelAtPeriodEnd is true)

## Admin Members Dashboard
- [ ] Create admin members page with full member list
- [ ] Show subscription status, Discord link status, Stripe customer ID, last login
- [ ] Add route to App.tsx and navigation in MemberPortalLayout
- [ ] Admin-only access (memberRole === 'admin')

## Failed Payment Notification
- [ ] Add notification to invoice.payment_failed webhook handler
- [ ] Include member name, amount, and failure reason in notification

## Manage Billing Button
- [ ] Add Stripe Customer Portal session creation procedure to memberRouter
- [ ] Add "Manage Billing" button to PortalAccount subscription section
- [ ] Button opens Stripe Customer Portal in new tab for payment method updates

## Admin Analytics Dashboard
- [ ] Create admin analytics page at /portal/analytics
- [ ] Show paying vs comped member breakdown (6 paying, 6 comped)
- [ ] Show revenue metrics (MRR, total collected)
- [ ] Show member growth timeline
- [ ] Add route and nav item for analytics

## Manage Billing Button
- [ ] Add Stripe Customer Portal session creation procedure to memberRouter
- [ ] Add "Manage Billing" button to PortalAccount subscription section
- [ ] Button opens Stripe Customer Portal in new tab for payment method updates

## Admin Analytics Dashboard
- [ ] Create admin analytics page at /portal/analytics
- [ ] Show paying vs comped member breakdown (paying = has stripeCustomerId, comped = no stripeCustomerId)
- [ ] Show revenue metrics (MRR from paying members, total collected)
- [ ] Show member growth timeline
- [ ] Add route and nav item for analytics

## Template Google Docs Links
- [x] Map all Google Drive files to portal templates
- [x] Update all template download URLs to Google Docs /copy links
- [x] Keep PDFs as direct downloads (2 PDFs use /view link)
- [x] Add CPM Scheduling PDF as template 19
- [x] Test all links work correctly (113 tests passing, 19 templates)

## CPM Schedule Builder (Standalone Full-Screen App)
- [x] Database schema: schedules, activities, relationships, activity codes, baselines
- [x] CPM engine: forward/backward pass, ES/EF/LS/LF, total float, free float, critical path
- [x] All four relationship types: FS, SS, FF, SF with lag/lead
- [x] 5-day and 7-day calendar support
- [x] tRPC procedures for schedule CRUD, activity CRUD, codes CRUD, baselines
- [x] Standalone full-screen layout (opens in own tab from portal)
- [x] Split-pane UI: activity table on left, Gantt chart on right (P6-style)
- [x] Interactive Gantt chart with dependency arrows, critical path in red, zoom (day/week/month)
- [x] Drag to adjust activity durations on Gantt
- [x] Activity management UI: add/edit/delete, assign codes, set predecessors/successors
- [x] Activity codes system: custom categories, code values, filter/group/sort Gantt
- [x] Baseline support: save named baselines, baseline bars on Gantt, variance tracking
- [x] Multiple schedules per account: save, name, duplicate, archive
- [x] Pre-loaded construction templates (residential, commercial TI, renovation)
- [x] PDF export with custom header/footer (company name, logo, project name, footer text)
- [x] Page layout options for PDF (landscape, letter/legal/tabloid)
- [x] Portal link integration (opens in new tab)
- [x] Tests for CPM engine and schedule procedures (29 CPM tests passing, 146 total)
- [x] Custom calendars: create named calendars, set base work week, mark holidays/non-work days
- [x] Pre-loaded US construction holidays (New Year's, Memorial Day, July 4th, Labor Day, Thanksgiving, Christmas)
- [x] Assign calendars to individual activities (e.g., concrete crew on 7-day, electrician on 5-day union)
- [x] Toggle dependency arrows on/off in Gantt toolbar
- [x] Toggle data date line on/off in Gantt toolbar
- [x] Toggle today line on/off in Gantt toolbar (default OFF)
- [x] Data Date field on schedule — user sets manually, CPM calculates from data date
- [x] Data date picker in toolbar to update the schedule's data date
- [x] Run Date (lastCalculatedAt timestamp) — recorded on every CPM recalculation, shown in schedule info only, never on Gantt
- [x] Schedule versioning: "Save Update" creates numbered snapshot (Update 1, Update 2, etc.) with full activity/date/logic freeze
- [x] Targeting system: select up to 2 targets (baseline or any update) to compare against current schedule
- [x] Comparison overlay on Gantt: current bars (top), Target 1 bars (gray), Target 2 bars (different color)
- [x] Variance/slippage columns in activity table (days early/late vs each target)
- [x] Slippage summary: total project slippage, critical path changes, activities driving delay
- [x] Update workflow: save update → snapshot → continue working → target previous updates to see slippage
- [x] Configurable activity table columns: column picker to toggle on/off any column
- [x] Variance columns (Start Variance, Finish Variance) appear when targeting is active — show work day delta (+ = late in red, - = early in green)
- [x] Support two sets of variance columns (Target 1 and Target 2)
- [x] Column order drag-to-reorder, configuration persists per schedule

## Gantt Drag Interactions
- [x] Drag-to-resize: grab left/right edge of Gantt bar to change activity duration
- [x] Resize snaps to work days based on activity calendar
- [x] Drag-to-connect: L-shaped connector handles appear on hover (left edge = start, right edge = finish)
- [x] Drag line from one handle to another bar's handle to create relationship
- [x] Relationship type auto-determined by edge combination (R→L=FS, R→R=FF, L→L=SS, L→R=SF)
- [x] Toast confirmation on relationship creation
- [x] Visual feedback: line follows cursor during drag, highlights valid drop targets

## Scheduler Feedback Fixes (Round 1)
- [x] Zoom-to-fit: squeeze/compress Gantt to show all activities in one viewport
- [x] Data date line should be solid BLUE (not amber), today line stays dashed
- [x] Switch scheduler to light/white theme (not black background) — off-white or tan like Claude artifacts
- [x] Critical activities = red bars, non-critical = green bars (not amber/gold)
- [x] Custom bar colors: click bar → modal → change color
- [x] Bar labels: show activity name above or below the bar (not inside) to handle short-duration activities
- [x] Activity detail modal: click bar or row → modal with all editable fields (name, duration, relationships, calendars, codes, color, activity ID)
- [x] Editable activity ID field
- [x] Sorting: sort by activity ID, early start, early finish, etc. (separate from grouping)
- [x] Advanced filter modal: critical checkbox, 1-week lookahead, 2-week lookahead, date range (start/finish within period), float range
- [ ] PDF export preview: live preview of what the PDF will look like on chosen page size
- [ ] PDF fit vs custom sizing option
- [ ] PDF header/footer size controls (adjustable height for header and footer)
- [ ] PDF preview includes header and footer content

## WBS Management & Activity ID Filtering
- [x] WBS table in database (hierarchical: parent/child, code, name)
- [x] WBS CRUD procedures (create/edit/delete WBS nodes)
- [x] WBS Manager UI (tree view to create/edit WBS hierarchy)
- [x] WBS assignment in activity detail modal (dropdown/tree picker)
- [x] Filter by WBS branch (show only activities under a WBS node)
- [ ] Group by WBS hierarchy in activity table
- [x] Filter by custom Activity ID (search/filter in toolbar)
- [x] Activity detail modal: include WBS assignment, activity ID, all editable fields

## Open Ends Detection & Schedule Health
- [x] Detect open starts: activities missing predecessors (except first activity)
- [x] Detect open finishes: activities missing successors (except last activity)
- [x] Schedule Health panel after recalculation: total activities, critical count/%, open starts list, open finishes list, negative float activities, longest path duration
- [x] Warning icon/highlight on activities with open ends in activity table
- [ ] Click open-end activity in health panel to select and scroll to it in Gantt

## Column Header Sorting
- [x] Clickable column headers to sort ascending/descending (click once = asc, again = desc, third = clear)
- [x] Sort arrow indicator on active sort column
- [x] Works on all columns: ID, Name, Duration, ES, EF, LS, LF, TF, FF, % Complete, variance columns

## Scheduler UI/UX Overhaul (March 29)
- [x] Convert scheduler to light/white theme (off-white/tan background)
- [x] Activity detail modal: click row to edit all fields (name, duration, WBS, calendar, color, activity ID, % complete)
- [x] WBS Manager: create/edit/delete WBS hierarchy, assign to activities
- [x] Column header click-to-sort (ascending/descending/clear with arrow indicators)
- [x] Activity ID search filter in toolbar
- [x] Advanced filter modal: critical path, 1-week/2-week/4-week lookahead, date range, float range
- [x] Open ends detection: activities missing predecessors/successors
- [x] Schedule health panel: total activities, critical count, open starts/finishes, longest path
- [x] Zoom-to-fit button for Gantt chart
- [x] Bar colors: critical=red, non-critical=green, custom per activity
- [x] Activity names displayed above bars (not inside)
- [x] Data date line solid blue, today line dashed gray
- [x] updateActivity procedure accepts activityId, barColor, wbsId fields
- [x] PDF export updated to light theme (navy header, gold accents, white table, green/red bars)
- [x] All 146 tests passing, 0 TypeScript errors


## Critical Scheduler UX Issues (March 29 - User Feedback)
- [x] Fix modal trigger: clicking activity row should open detail modal (currently requires double-click near TF column)
- [x] Make it obvious where to click on row to open modal (add visual indicator or make entire row clickable)
- [x] Add drag-to-pan Gantt chart: grab timeline or chart area and drag to scroll left/right
- [x] Fix dropdown menu text colors: white text on tan background is unreadable (change dropdown text to dark color)
- [ ] Add relationship connector handles: hover near Gantt bar edges to show upside-down right-angle handles with arrows
- [ ] Drag connector line from one bar to another to create FS/SS/SF/FF relationships (currently not visible)
- [ ] PDF export: add live preview modal showing what PDF will look like on chosen page size
- [x] PDF export: activity names should appear above bars in PDF (currently missing)
- [ ] PDF export: add columnized header/footer configuration (choose 3-5 columns, assign data to each column)
- [ ] PDF export: show preview of header/footer content so user knows what will print
- [ ] WBS tree: make WBS editable (currently read-only numbers)
- [ ] WBS tree: show parent/child hierarchy visually (indentation, tree structure)
- [ ] WBS tree: add description field for each WBS node (e.g., "1.0 Smith Residence", "1.1 General Conditions", "1.2 Submittals")
- [ ] WBS tree: support multi-level hierarchy (1.0, 1.1, 1.1.1, 1.2, etc.)
- [ ] Fix font colors in table: ensure all text is readable (some rows have light text on light background)

## Critical Workflow Improvements (March 29 - User Feedback Round 2)
- [x] PDF export: activity names/descriptions must appear above bars in Gantt (not just in table)
- [x] Activity ID management: add prefix system (e.g., "E" for electrical, "P" for plumbing)
- [x] Activity ID sequences: configurable interval (E1, E2, E3 or E100, E105, E110)
- [x] Activity ID auto-increment: when adding activities, auto-generate next ID in sequence
- [x] Bulk activity creation: "Add N activities" dialog (add 5, 10, 50 at once)
- [x] Bulk activities: creates all with auto-generated IDs immediately in table
- [x] Add activity button in table header (top of activity list, not just bottom)
- [x] Add activity button in toolbar or multiple locations
- [x] Bulk add accessible from both header and bottom of table
- [x] Activity ID field in add-activity dialog (user can set prefix and starting number)

## Milestone Support & Relationship Editing (March 29)
- [x] Add activityType field to activities table (task/milestone)
- [x] Activity type selector (Task/Milestone) in Add Activity dialog
- [x] Activity type selector in Activity Detail modal
- [x] Milestone renders as diamond on Gantt chart
- [x] Duration auto-set to 0 when milestone selected
- [x] Relationship editing in Activity Detail modal: add/delete relationships with dropdown
- [x] Delete relationship button (trash icon) on each relationship
- [x] Add predecessor inline: select activity, type (FS/SS/FF/SF), lag
- [x] Bulk Add Activities in three-dot menu
- [x] Activity ID Settings in three-dot menu
- [x] All modal/dropdown text colors fixed to dark (text-gray-900)

## Table Text Color Fix (March 29)
- [x] Change all activity name/ID text in table to dark/black (not red for critical path)
- [x] Only TF column should show red for critical activities (0d float)
- [x] Gantt bars remain red for critical, green for non-critical
- [x] Non-critical activities with float should also have dark readable text

## CRITICAL: Public Access Broken (March 29)
- [ ] Fix: alpcontractorcircle.com redirects all visitors to Manus login screen
- [ ] Landing page, public pages must be accessible WITHOUT authentication
- [ ] Only member dashboard, scheduler, and protected features should require login

## SEO Title Fix (March 29)
- [x] Change site title from "ALP Contractor Circle Member Portal" to "ALP Contractor Circle"
- [x] Update meta description to match (remove "member portal" language)
- [x] Update OG tags to match
- [x] Reduce keywords from 25 to 6 focused keywords
- [x] Shorten description from 288 to 130 characters
- [x] Add Marshall Wilkinson as primary keyword


## Critical Scheduler Issues (March 29)
- [ ] Add data date setting UI - Allow users to click "DD" in toolbar to set data date for calculations
- [ ] Implement data date in calculate procedure - When user clicks calculate, use the set data date
- [x] Build PDF export preview modal - 3-5 column footer configuration before export
- [ ] Fix milestone rendering in PDF - Milestones (zero-duration activities) not showing in PDF export
- [x] Add milestone color customization - Milestones now support custom barColor property
- [x] Fix PDF milestone rendering - Milestones now render as diamonds in PDF export


## CPM Scheduler Access Control (March 29)
- [x] Restrict CPM Scheduler route to admin-only access (menuItems.adminOnly = true)
- [x] Show "Coming soon" badge/message for non-admin members on portal sidebar (desktop + mobile)
- [ ] Redirect non-admins away from /portal/scheduler if they try to access directly
- [ ] Grant Marshall admin access to CPM Scheduler


## WBS Manager Visual Redesign (March 29)
- [x] Rebuild WBS Manager with visual tree structure (like Primavera P6)
- [x] Show parent-child hierarchy with indentation and tree lines
- [x] Add expand/collapse toggles for parent nodes
- [x] Display WBS code and name with visual hierarchy
- [x] Make it easier to understand structure without relying on number prefixes


## User-Reported Issues (March 29 - Session 2)
- [x] Fix dropdown text color in modals - SelectItem text is white, should be black/dark for visibility
- [x] Fix milestone color update - Color picker now shows correct default color for milestones (#ff9800)
- [x] Verify CPM Scheduler "Coming soon" badge - Confirmed members see beta/coming soon message on desktop and mobile
- [x] Integrate PDF export preview modal - Wired up PdfExportPreview component to export button
- [x] Add header configuration to PDF export - PdfExportPreview includes 3-5 column configuration
- [x] Add 3-column footer configuration to PDF - Footer columns configurable in preview modal
- [x] Fix WBS modal scrolling - Added max-h-64 overflow-y-auto to WBS tree container


## WBS Grouping Visual Enhancements (March 29 - Session 2)
- [ ] Add WBS group color customization to database schema (wbsGroupColors table)
- [ ] Show WBS description in group headers (not just WBS number)
- [ ] Make WBS group headers bold and prominent
- [ ] Add color picker UI for WBS group customization (like P6)
- [ ] Store WBS group color preferences per schedule
- [ ] Apply custom colors to group header backgrounds with white text


## Critical Scheduler Fixes (March 29 - Session 3)
- [x] Fix milestone color not updating - Now uses act.barColor for milestone diamonds in Gantt
- [x] Fix data date picker - DD button now prominent with amber pulse when unset, defaults to today, opens date picker dialog
- [ ] Add Gantt text customization - Font size, color, and font family controls for activity descriptions


## Critical Scheduler Fixes (March 29 - Session 4)
- [x] Fix WBS grouping - Show WBS description with bold styling and custom colors in group headers
- [x] Add activity date constraints - ASAP, ALAP, SNET, SNLT, FNET, FNLT, MSO, MFO with date picker in activity modal
- [x] Enhance calendar management - Full CRUD with 5/6/7-day options, holiday picker, workday overrides, US holidays auto-add
- [x] Apply Gantt font customization - Font size slider, color picker, font family selector with live preview in Gantt Settings dialog
- [ ] Rebuild PDF export preview - Visual schedule preview with header/footer 3-column configuration
- [x] Add longest path filter - Traces driving predecessors from terminal activity, stored in DB, filterable in UI


## PDF Export Overhaul (March 29)
- [x] Fix table width - Auto-size columns to fill full page width with grow property
- [x] Fix Gantt activity labels truncated - Dynamic label width based on longest name (60-100mm)
- [x] Fix Gantt bar labels overlapping - Labels placed to right of bars instead of above
- [x] Fix legend overlapping with footer - Legend positioned with proper spacing above footer
- [x] Reduce wasted space - Gantt paginated with proper row heights
- [x] Wire footer config from preview modal to PDF generator with token replacement


## Critical WBS & PDF Fixes (March 29 - Session 4)
- [x] Fix WBS assignment not sticking - Changed Select value from database ID to WBS code so it matches correctly
- [x] Fix WBS modal not showing current value - detailWbs now initialized from act.wbs which matches Select item values
- [x] Add bulk WBS assignment - Shift/Ctrl+click multi-select with floating toolbar and bulk WBS assignment dialog
- [ ] Wire PDF header configuration - Header columns from preview modal need to be passed to PDF generator like footer

## PDF Export Preview Modal Fixes (March 29 - Session 5)
- [x] Make modal wider (max-w-5xl, 95vw) so column dropdowns don't overflow
- [x] Fix canvas preview rendering - delayed init with canvasReady state, proper dpr scaling
- [x] Use flex-wrap layout for column dropdowns that adapt to 3 or 5 columns
- [x] Wire header config from preview modal to PDF generator with token resolution


## Multi-Select & WBS Fixes (March 29 - Session 6)
- [x] Fix multi-select WBS assignment not working / not obvious how to use — added checkbox column to each activity row
- [x] Fix activity modal not showing current WBS assignment — fixed with __none__ default value handling
- [x] Add WBS group color picker in WBS manager dialog — already wired with preset + custom color pickers
- [x] Build CSV import dialog for bulk activity creation — file upload, smart column mapping, preview table, predecessor parsing
- [x] Verify baseline save/compare is fully wired — confirmed: save/update dialogs, target selectors, Gantt overlay bars, variance columns

## PDF Export Preview & Gantt Zoom (March 29 - Session 7)
- [x] Rebuild PDF Export Preview as large WYSIWYG modal (75% screen size)
- [x] Live preview updates when paper size or orientation changes (true proportions)
- [x] Preview shows actual page layout with correct aspect ratio for Letter/Legal/Tabloid
- [x] Add Gantt continuous zoom — Ctrl+scroll wheel zoom, zoom slider, custom ppd support
- [x] Gantt pinch-zoom: schedule stays anchored, time density changes on Ctrl+scroll
- [x] Zoom slider for fine-grained timescale adjustment — slider in toolbar with Day/Week/Month presets

## Gantt Bar Label Fix (March 29 - Session 8)
- [x] Fix Gantt bar activity description text getting cut off — removed truncation, full name now renders

## PDF Modal & Gantt Zoom Fixes (March 29 - Session 9)
- [x] PDF Export Preview modal still showing old small size — fixed with !max-w-[92vw] override
- [x] Gantt zoom slider visible in toolbar — verified present with Day/Week/Month presets
- [x] Gantt pinch-zoom (Ctrl+scroll) — verified wired in GanttChart onWheel handler
- [x] Add "Custom" option in header/footer dropdowns — with inline text input field
- [x] Add image upload option (logo/JPEG) in header/footer slots — with file picker, preview, and PDF embedding

## Checkbox Shift-Click Range Selection Fix (March 29 - Session 10)
- [x] Fix checkbox shift-click to select range of activities between first and last click for mass WBS assignment

## Shift-Click & Modal Width Fix (March 29 - Session 11)
- [x] Fix shift-click range selection — prevented row click from interfering with checkbox, added target check
- [x] Make activity detail modal wider — max-w-3xl
- [x] Make schedule creation modal wider — max-w-2xl
- [x] Widen all narrow modals in the scheduler — all sm->lg, lg->2xl, etc.
- [x] Fix all text color/legibility issues — rewrote dropdown-menu, select, dialog, popover components with explicit white bg + gray-900 text
- [x] Fix three-dot dropdown menu (Edit details, Insert activity) — fixed at component level
- [x] Fix data date and today's date lines in Gantt — normalized today to midnight UTC to align with data date
- [x] PDF export: table is now optional ("Include Activity Table" checkbox, off by default)
- [x] PDF export: page numbering fixed — footers drawn after all pages created
- [x] PDF export: page break handling improved — table section skipped when showTable=false

## Layout Manager & WBS Colors (March 29 - Session 12)
- [ ] Build Layout Manager — "Layout" button in toolbar that opens modal with saved view configurations
- [ ] Layout saves: grouping, column visibility, sort order, WBS colors
- [ ] Layout preview thumbnails in the modal
- [ ] WBS color editing accessible from WBS manager (already built, needs to be discoverable)
- [ ] Hierarchical WBS color differentiation — parent vs child nodes get distinct colors automatically
- [ ] Persist last-used layout so schedule reopens with the same grouping/view

## WBS Parent-Child Bug Fix (March 29 - Session 12)
- [x] Fix WBS parent-child assignment bug — was using w.code instead of w.id for parent select value
- [x] Make WBS parent relationship editable — added parent dropdown to inline edit mode in WBSTree
- [x] Ensure WBS tree correctly reflects parent-child hierarchy

## WBS Grouping Sort Order Fix (March 29 - Session 13)
- [x] Fix WBS grouping sort order — uses hierarchical depth-first tree traversal so parents always appear before children

## Nested WBS Grouping (March 29 - Session 14)
- [x] Refactor WBS grouping from flat to nested hierarchical display
- [x] Child WBS groups visually indented under parent WBS groups (like Primavera P6)
- [x] Each tier gets distinct colored bar (parent vs child differentiation) with depth-based defaults
- [x] Activities under parent WBS appear directly under parent bar, child WBS activities under child bar
- [x] Gantt chart reflects nested WBS group structure with depth-based indentation and accent bars
- [x] PDF export includes WBS group headers with indentation in Gantt section
- [x] Vitest tests for WBS hierarchical grouping logic (8 tests passing)

## Google Drive Template URL Fix (March 29 - Session 15)
- [x] Audit all Google Drive URLs in PortalTemplates.tsx to ensure they use /copy format
- [x] Fix any URLs that don't force a copy (2 PDF /view → /copy)
- [x] Update all 19 Google Drive files to "Anyone with the link can view" via gws CLI
- [x] Deploy fix to production
- [x] Finish sending EOS announcement email to all 11 members (100% success)

## Q1-Q2 Lead Magnet Landing Page (March 30 - Session 16)
- [x] Create leads table in database for email capture
- [x] Create tRPC procedure for lead submission (public, no auth required)
- [x] Build landing page at /q2 with high-converting design (dark/ember aesthetic)
- [x] Email capture form (name + email) above the fold
- [x] Compelling headline, subheadline, bullet points from the framework
- [x] Social proof / authority elements (Marshall's $2.5B experience)
- [x] Mobile-responsive design
- [x] Build thank you page at /q2/thank-you with confetti animation and download link
- [x] Automated email with PDF download link on submission
- [x] Upload PDF to CDN for download
- [x] Wire routes in App.tsx (public, no auth required)
- [x] Write vitest tests for lead capture procedure (5 tests passing)
- [x] Deploy to production

## Q2 Landing Page Mobile Optimization (March 30 - Session 16)
- [x] Audit current landing page on mobile viewport (375px)
- [x] Form above the fold on mobile — most critical conversion element
- [x] Reduce headline size for mobile readability (clamp 1.6rem-2rem)
- [x] Stack layout vertically on mobile (separate lg:hidden / hidden lg:grid sections)
- [x] Optimize touch targets (h-14 button = 56px, h-12 inputs = 48px)
- [x] Minimize scroll distance to CTA (form immediately after headline)
- [x] Remove or collapse non-essential content on mobile (compact stats, inline quote)
- [x] Optimize thank you page for mobile (already single-column centered)
- [x] Test on mobile viewport and verify
- [x] Deploy to production

## Founding Member Badge Update (March 30 - Session 16)
- [x] Audit all founding member count references on home page (4 public-facing found)
- [x] Replace HeroSection badge: "X of 50 Spots Filled" → "Founding Member Slots Still Available — Limited Enrollment"
- [x] Replace ValueProps stat: "X of 50 Founding Spots Remaining" → "Slots Available" / "Founding Member Enrollment"
- [x] Replace FinalCTA: "spots are limited" → "enrollment is open — but not forever"
- [x] Replace PricingSection: "Limited spots available" → "enrollment is open. Once closed, price increases."
- [x] Removed unused useMemberCount imports from HeroSection and ValueProps
- [x] Deploy to production

## Founding Member Badge Refinements (March 30 - Session 16 continued)
- [x] Shorten hero badge to "Founding Members — Limited Enrollment" (too long on mobile)
- [x] Change ValueProps "Slots Available" stat to "Limited Enrollment"
- [x] Find and fix "Founding Members 12 of 50" still showing in InsideTheCircle ResultsCard
- [x] Verify no other count references remain on public pages (AdminAnalytics keeps internal count — OK)
- [x] Removed unused useMemberCount import from InsideTheCircle.tsx
- [x] Fix "Limited Enrollment" font too large compared to number stats on desktop
- [x] Fix "Limited Enrollment" off-center on mobile
- [x] Deploy to production

## Social Preview & Favicon (March 30 - Session 16)
- [x] Convert gold CC logo to favicon (ICO + PNG formats)
- [x] Generate premium OG social preview image (1200x630)
- [x] Add Open Graph meta tags (og:image, og:title, og:description)
- [x] Add Twitter Card meta tags
- [x] Upload assets to CDN and wire into index.html
- [x] Deploy to production

## Lead Magnet Download Notification (March 30 - Session 16)
- [x] Send email notification to marshall@marshallwilkinson.com on every lead magnet download
- [x] Deploy to production

## Estimating Category & Template (March 31 - Session 17)
- [x] Upload Construction Estimating Checklist PDF to CDN/S3
- [x] Add "Estimating" category to templates system
- [x] Add "Estimating" tab to portal frontend TemplateCategory type and CATEGORIES array
- [x] Fix tab counts to use merged allTemplates instead of hardcoded TEMPLATES
- [x] Insert Construction Estimating Checklist template record in database- [x] Deploy to production

## Estimating Checklist Lead Magnetnt Email (March 31 - Session 17)
- [x] Draft announcement email for Estimating Checklist template
- [x] Send preview to marshall@marshallwilkinson.com for approval
- [x] After approval, sent to all 12 active members

## Estimating Checklist Lead Magnet (March 31)
- [x] Create /estimating landing page with email capture form
- [x] Create /estimating/thank-you page with download link
- [x] Automated email delivery with PDF download link
- [x] Leads stored in database tagged as "estimating-checklist"
- [x] Lead magnet download notification to marshall@marshallwilkinson.com
- [x] Same dark/gold ALP branding as Q2 Framework page
- [x] Register routes in App.tsx
- [x] Deploy to production

## Fix Call Anchor Date (April 4)
- [x] Fix bi-weekly anchor from March 29 to March 30 (Sunday) in PortalDashboard
- [x] Fix bi-weekly anchor in HeroSection
- [x] Fix bi-weekly anchor in CallCountdownBar
- [x] Fix calendar integration link in CalendarIntegration.tsx (made dynamic)
- [x] Fix hardcoded "March 29" in FAQSection, email.ts, send-founding-emails.mjs
- [x] Verify next call shows Sunday, Apr 12
- [ ] Deploy to production

## ALP EOS Playbook Template (April 4)
- [x] Upload ALP EOS Playbook PDF to CDN
- [x] Add to TEMPLATES array in PortalTemplates.tsx under Operations category
- [x] Draft announcement email and send preview to Marshall for approval
- [x] Send announcement to all active members after approval (14/14 sent, 0 failed)
- [ ] Deploy to production

## Discord Bot & New Member — Jose Munoz (April 6)
- [x] Discord bot: Set up role management to assign Contractor Circle privileges
- [x] Discord bot: Assign Contractor Circle role to Jose Munoz
- [x] Add Jose Munoz to member database (merged placeholder record id=660001 with Discord ID 1490703577251840112)
- [ ] Send welcome/onboarding emails to Jose Munoz
- [ ] Send EOS Playbook announcement email to all members (including Jose)
- [ ] Fix EOS Playbook email header styling for mobile

## Database Fixes (April 6)
- [x] Fix null email for Caleb Morrow (id=390001) → caleb@morrow-builds.com
- [x] Fix null email for Dell Builder 1 (id=180001, Dan Del Monte) → dan@delmontebuilders.com

## ALP EOS Scorecard Guidelines (April 6)
- [x] Upload EOS Scorecard PDF to CDN
- [x] Add to TEMPLATES array in PortalTemplates.tsx under Operations category
- [x] Draft announcement email and send preview to Marshall
- [x] Send announcement to all active members after approval (14/14 sent, 0 failed)

## Database Cleanup — Dan Del Monte Duplicate (April 6)
- [x] Merge ID 4 (founding placeholder) into ID 180001 (real Discord record)
- [x] Delete ID 4 orphan record

## Discord Welcome on Join (April 6)
- [x] Add guildMemberAdd event listener — post welcome message when member joins Discord server
- [x] Suppress duplicate welcome on portal login if member already welcomed via Discord join
- [x] Deploy and verify

## Portal UX Improvements (April 6)
- [x] Send ALP/EOS Scorecard announcement email to Jacob Huffman (jhuffman@huffmancc.com)
- [x] Add last sign-in date column to admin member section
- [x] Add member since date to portal dashboard for members

## Jake Huffman Discord + Email Dedup (April 6)
- [ ] Diagnose why Jake is not in Discord server after portal login
- [ ] Fix Discord guild add for Jake
- [ ] Build duplicate email prevention — check if member was in recent blast before individual send

## Monthly Bootcamp Topic Submission (April 6)
- [x] Create bootcamp_topics database table
- [x] Build tRPC procedures for submitting/viewing bootcamp topics
- [x] Build bootcamp topic submission UI on portal dashboard (highlighted, looks great)
- [x] Admin view: see all submitted topics with select/reject actions
- [x] Email notification to Marshall when a member submits a bootcamp topic
- [x] Build announcement email for April 26 bootcamp
- [x] Send preview to Marshall for approval
- [x] Send to all active members after approval (14/14 sent via send-bootcamp-all.mjs)
- [ ] Build duplicate email prevention into send scripts

## Bootcamp Calendar + Zoom (April 6)
- [x] Add Zoom link and Add to Calendar button to bootcamp widget on dashboard
- [x] Deploy and send bootcamp email to all active members (14/14 sent, 0 duplicates, 0 failed)

## Selected Bootcamp Topics Visible to Members (April 6)
- [x] Add tRPC procedure to fetch selected topics for all members
- [x] Display selected topics on the bootcamp widget in the dashboard
- [x] Deploy live

## Topic Selected Notification Email (April 6)
- [x] Build "Topic Selected" email template
- [x] Wire email into updateBootcampTopicStatus procedure (fires on status=selected)
- [x] Deploy live

## Drip Campaign System (April 6)
- [x] Assess current lead/opt-in database structure (183 leads, 15 homepage subs, 27 double-dippers)
- [x] Create drip campaign database tables (drip_enrollments, drip_sent_emails)
- [x] Enroll 160 leads: 105 estimating single, 23 Q1/Q2 single, 25 double-dippers, 7 homepage-only
- [x] Mark Day 0 as sent for all enrollments (all got Day 0 yesterday)
- [x] 3 today double-dippers (Ventura Mendoza, Mike/Grind, Nathan/Brighter) enrolled at Step 1, skip Day 0
- [x] Exclude all 14 active CC members and test emails from drip sequences
- [x] Next email scheduled for April 7 at 10 AM ET
- [x] Build all 16 email templates across 4 sequences (plain personal style, Helvetica 14pt)
- [x] Build drip engine: 15-min cron, duplicate guard, step advancement, scheduling
- [x] Sync database with Claude Code CSV send history (204 sent records matched)
- [x] Auto-enroll new lead magnet leads into correct drip sequence on signup
- [x] Auto-enroll homepage subscribers into homepage_only drip sequence
- [x] Auto-detect double-dippers and move them to double_dipper sequence
- [x] Check if lead is already a CC member before enrolling in drip
- [x] Add unique constraint to prevent duplicate drip enrollments
- [x] Build drip campaign admin dashboard in portal (stats, sequence breakdown, step distribution, recent sends, enrollments table, pause/resume, manual trigger)
- [x] Test end-to-end with preview to Marshall — approved 18px Georgia
- [ ] Deploy live
- [x] FIX: Discord bot sending 3 welcome messages instead of 1 when someone joins (added 5-min dedup cache)
- [x] Send Jake Nichter email explaining the manual fix (email typo on purchase, Discord login created duplicate)
- [x] Fix member merge logic: added Strategy 0 — direct email match merges records automatically, cleans up duplicates
- [x] Change drip email send time from 10 AM ET to 8 AM ET (code + DB updated)
- [x] Update all existing nextSendAt timestamps in DB to 8 AM ET (12:00:00 UTC)
- [x] Full audit: zero duplicates, zero mismatches, zero CC members in drip, all 160 correct
- [x] Jazz up drip email aesthetic: Georgia serif, warm off-white bg, ember accent line, elevated signature
- [x] Send Marshall preview emails from each sequence for approval — approved
- [x] Build drip campaign admin dashboard in portal (route /portal/drip, sidebar nav added)
- [x] Bump drip email font size to 18px (approved by Marshall)
- [x] Change drip FROM address to marshall@notifications.marshallwilkinson.com
- [x] Build unsubscribe system: HMAC token link, /api/drip/unsubscribe route, branded confirmation page, injected into all drip email footers
- [x] Add Subcontractor Bid Submittal Form to template library (Estimating, GDrive force-copy, hardcoded in PortalTemplates.tsx)
- [x] Send announcement email to all active CC members about Subcontractor Bid Submittal Form (15 sent, 0 failed)

## ALP/EOS V/TO Toolkit Template
- [x] Upload ALP_EOS_Toolkit_VITO.pdf to CDN
- [x] Add V/TO template (#25) to PortalTemplates.tsx under Operations category
- [x] Save checkpoint and deploy
- [x] Send announcement email to all 16 active CC members (15 sent + 1 retry for Henrico)

## Bug Fix — PM Systems Presentation Broken Link
- [x] Fix PM Systems Presentation (template #6) — replaced dead Google Drive link with CDN-hosted PDF

## Bug Fix — CPM Engine Constraint Enforcement
- [x] Add constraintType and constraintDate to CpmActivity interface
- [x] Enforce SNET/SNLT/FNET/FNLT/MSO/MFO in forward pass
- [x] Enforce ALAP/SNLT/FNLT in backward pass
- [x] Write vitest tests for all 8 constraint types (10 tests passing)
- [x] Verify scheduleRouter passes constraint data to engine
- [x] Save checkpoint

## CPM Scheduler Enhancements — WBS, Color Grouping, Saved Layouts
- [x] CSI MasterFormat WBS library — all 50 divisions as a shared constant
- [x] WBS manager UI — one-click import of CSI divisions into a schedule's WBS tree
- [x] Multi-color WBS grouping bands on Gantt chart and activity table
- [x] Saved layouts DB schema (schedule_layouts table)
- [x] Saved layouts backend procedures (create, list, load, update, delete, set default)
- [x] Saved layouts frontend UI — save/load/switch layouts in toolbar
- [x] Write tests for new features (10 constraint + 5 CSI = 15 new tests passing)
- [x] Save checkpoint (version efe889bd)

## UI Improvement — Wider Modals, Bigger Fonts, CSI Library Default Open
- [x] WBS Manager modal — widened to max-w-5xl
- [x] CSI MasterFormat library section open by default (collapsible but starts expanded)
- [x] Increase font sizes in all scheduler modals (text-base on content, text-lg on titles)
- [x] Widen all 17 scheduler modals (Activity Detail 5xl, Calendar/Health/Filters 4xl, others 2xl)
- [x] Widen ScheduleList dialogs (Create 2xl, Duplicate xl)
- [ ] Save checkpoint

## CPM Scheduler UX Improvements — Row Height, Column Resize, Two-Column Modals, Undo/Redo
- [x] Increase activity table row height from h-8 (32px) to h-11 (44px)
- [x] Increase activity table font size from text-xs to text-sm
- [x] Sync Gantt chart ROW_HEIGHT from 36px to 44px
- [x] Add drag-to-resize handles on ALL column headers
- [x] Two-column layout in Activity Detail modal (properties left, relationships/CPM right)
- [x] Build undo/redo hook with 50-action history stack
- [x] Undo/redo keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
- [x] Undo/redo toolbar buttons with action description tooltips
- [x] Wire undo into delete activity, update activity, delete relationship mutations
- [x] Clear history on schedule switch
- [x] Write vitest tests for undo/redo logic (7 tests passing)
- [x] Save checkpoint

## P6 XER Import
- [x] Research and parse P6 XER file format (tab-delimited, table-based)
- [x] Build XER parser using xer-parser npm package
- [x] Map XER data to our schedule schema (activities, relationships, WBS, calendars, constraints)
- [x] Backend tRPC procedure for XER file upload and import (importXer)
- [x] Frontend UI — drag-and-drop file upload dialog with import info
- [x] Handle XER edge cases (multiple projects, calendar work weeks, constraint mapping)
- [ ] Write tests for XER parser

## Reporting Suite — Tabular Reports
- [x] Schedule Comparison Report — baseline vs. current (date variances, float changes, duration deltas)
- [x] Total Float Report — tabular, sortable by float value, color-coded critical/near-critical
- [x] Early Start Report — tabular, activities sorted by early start date
- [x] Critical Path Report — tabular, critical activities with driving relationships
- [x] Duration Report — tabular, activities with original vs. remaining duration
- [x] Report UI — professional tabular layout with print-ready headers/footers
- [x] CSV export for all report types
- [x] Report filters — float threshold, critical-only toggle
- [x] Reports button in Scheduler toolbar + route /scheduler/:id/reports
- [x] Summary statistics cards (total activities, critical count, avg float, etc.)
- [ ] Write tests for report generation logic

## Resource & Cost Loading
- [x] DB schema — resources table (name, type, unit, rate), activity_resources junction table, cost_accounts table
- [x] Backend procedures — CRUD resources, assign to activities, cost accounts
- [x] Cost loading — budget per activity, cost accounts, budgeted vs actual tracking
- [x] Frontend — ResourcePanel with 3 tabs (Resources, Assignments, Cost Accounts), toolbar button in Scheduler
- [x] Cost-loaded Gantt — cost overlay toggle with green cost bars on Gantt chart
- [x] Cash flow projection — cumulative cost curve (S-curve) visualization
- [x] Write tests for resource/cost calculations (18 tests passing)

## Scheduler Toolbar UX Redesign
- [x] Off-white/light background behind toolbar to make it stand out (modern Claude-like feel)
- [x] Organize toolbar into logical grouped sections (File, View, Tools, Reports)
- [x] Label the Actions/three-dot menu — renamed to 'Settings' with gear icon and label
- [x] Add color/visual emphasis to the Settings menu button so it stands out

## Cost-Loaded Gantt Overlay
- [x] Toggle to show/hide cost bars beneath activity bars on the Gantt chart
- [x] Visual cost concentration — green cost bars beneath activity bars with proportional sizing

## Cash Flow S-Curve Report
- [x] Cumulative cost projection chart (budgeted vs actual over time)
- [x] Useful for owner draw requests and bank reporting
- [x] Accessible from Reports page

## Resource Histogram Report
- [x] Stacked bar chart showing labor/equipment loading per week
- [x] Identify over-allocation and leveling needs
- [x] Accessible from Reports page

## Gantt Annotation/Drawing Overlay (Delay Analysis)
- [x] Text box overlay — place text annotations anywhere on the Gantt timeline
- [x] Arrow drawing — draw arrows between points on the Gantt to show impacts
- [x] Time-period shading/hatching — color or hatch sections of time (solid, hatch, crosshatch, dots patterns)
- [x] Annotations persist per schedule and can be toggled on/off via Annotate button
- [x] Annotations render in PDF export (header colors wired through)
- [ ] Use case: delay impact analysis, change order justification, winter heating costs, etc.

## PDF Header Color Picker
- [x] Option for no color header (transparent)
- [x] Option for gray header (Gray/Amber preset)
- [x] Option to choose custom color for PDF header (6 presets + custom color pickers)
- [x] Preview in PDF export dialog (live canvas preview updates with color changes)

## PDF Annotation Export
- [x] Wire header colors into PDF export — headerBgColor, headerAccentColor, headerTextColor flow through to jsPDF

## Persist Gantt Annotations to Database
- [x] DB schema — schedule_annotations table (scheduleId, type, data JSON, createdAt)
- [x] Backend procedures — save/load/delete annotations per schedule
- [x] Wire Scheduler to load annotations on mount and auto-save on change (1.5s debounce)
- [x] Annotations survive page reloads and are per-schedule

## Resource Leveling Algorithm
- [x] Over-allocation detection — identify weeks where resource usage exceeds capacity
- [x] Leveling suggestions — propose schedule adjustments (split/reduce with severity levels)
- [x] Backend procedure for leveling analysis
- [x] UI in reports page — Resource Leveling report type with summary cards, suggestions, and over-allocation table

## Earned Value Management (EVM) Dashboard
- [x] EVM calculations — CPI, SPI, EAC, ETC, CV, SV, BAC, BCWP, BCWS, ACWP, TCPI, VAC
- [x] Backend procedure to compute EVM metrics from cost/schedule data
- [x] Dedicated EVM dashboard with metric cards, performance indices, variances, PV/EV/AC trend chart, and activity-level breakdown table
- [x] Navigation from reports dropdown — EVM is a report type alongside all others

## Baseline Comparison in EVM
- [x] Backend — evmBaseline procedure computes EVM metrics for any baseline snapshot
- [x] Compare CPI/SPI/EAC/ETC/TCPI/CV/SV between current and baseline with delta cards
- [x] UI — 6 color-coded delta cards with improvement/decline arrows and baseline values
- [x] Trend chart overlay — baseline PV/EV/AC as faded dashed lines alongside current

## PDF Export for EVM and Leveling Reports
- [x] EVM report PDF — metric cards, performance indices, trend chart, activity table
- [x] Resource leveling PDF — summary cards, suggestions, over-allocation table
- [x] Export buttons on the reports page for both report types
- [x] Consistent styling with existing schedule PDF exports

## Resource Calendar Integration for Leveling
- [x] Backend — fetch schedule calendars and apply non-work days to resource availability
- [x] Adjust leveling capacity calculation based on calendar (holidays, weekends, custom)
- [x] UI — show calendar-adjusted capacity in histogram and leveling reports (calendar info banner)
- [x] Handle multiple calendars per resource via activity calendarId mapping

## CRITICAL UI FIX — Modal Width & Contrast QA/QC
- [x] Widen ALL modals/popups to max-w-4xl+ (like PDF print preview width)
- [x] Fix font contrast — replaced text-muted-foreground with gray-600/700 across all components
- [x] Increase font weight — added font-medium/font-semibold to labels, descriptions, table text
- [x] QA resource panel modals — bg-white, text-gray-900, font-medium applied
- [x] QA report modals and export dialogs — contrast boosted
- [x] QA annotation modals — gray-300→gray-600 fixed
- [x] QA settings/configuration modals — all widened and contrast fixed
- [x] QA import modals — widened to max-w-4xl
- [x] QA confirmation dialogs — alert-dialog description contrast fixed
- [x] QA activity detail modal — widened and contrast fixed
- [x] Consistent width and contrast across all dialogs — CSS variable muted-foreground boosted

## Delay Analysis Wizard
- [x] Backend — delayAnalysis procedure compares current vs baseline, identifies impacted activities
- [x] UI — baseline selector, summary cards (impacted/critical/avg/max delay), impacted activities table
- [x] Auto-generate annotation suggestions (crosshatch for critical, hatch for non-critical delays)
- [x] Show start delay, finish delay, max delay per activity with color-coded severity
- [x] Accessible from Reports page as 'Delay Analysis' report type

## Cost Forecasting with S-Curve Projections
- [x] Extend S-curve chart with projected future costs based on CPI/SPI trends
- [x] CostForecastChart with PV/EV/AC/Forecast lines, BAC/EAC reference lines
- [x] Backend costForecast procedure computes weekly forecast data with sigmoid S-curve
- [x] Summary cards (BAC/BCWP/ACWP/EAC), CPI/SPI performance cards, weekly forecast table

## Schedule Health Score
- [x] Composite metric: float distribution (25%), critical path (25%), logic density (20%), duration (15%), resource (15%)
- [x] Single letter grade (A-F) with circular score gauge visualization
- [x] Backend scheduleHealthScore procedure computes all 5 component scores
- [x] UI — health score dashboard with gauge, component cards with progress bars, recommendations
- [x] Breakdown showing individual component scores with details and weights

## THOROUGH Modal QA/QC Pass (Round 2)
- [x] Audit base DialogContent component — ensure generous padding (p-6+), proper width, strong contrast
- [x] Audit EVERY modal in Scheduler.tsx individually — padding, width, contrast, font weight, spacing
- [x] Audit EVERY modal in ResourcePanel.tsx individually
- [x] Audit PdfExportPreview dialog
- [x] Audit GanttAnnotations modals
- [x] Audit ScheduleReports modals/dialogs
- [x] Audit Sheet/sidebar panels
- [x] Audit confirmation dialogs (AlertDialog)
- [x] Visual browser verification of each modal
- [x] Ensure no parent containers constrain modal width

## VISUAL OVERHAUL — Premium SaaS Design
- [x] Redesign base DialogContent — premium modal styling with dark gradient headers, accent colors, visual hierarchy
- [x] Redesign DialogTitle/DialogDescription — sophisticated typography, not plain black-on-white
- [x] Redesign Scheduler toolbar — SaaS-grade ribbon (Linear/Notion/Monday.com level)
- [x] Toolbar needs actual coloring/theming, not plain buttons on white bar
- [x] Toolbar buttons should look clickable with proper hover states and visual grouping
- [x] Redesign ResourcePanel modal — premium look, not black-on-white
- [x] Redesign every individual modal in Scheduler.tsx with consistent premium styling
- [x] Redesign PdfExportPreview modal
- [x] Redesign GanttAnnotations modals
- [x] Redesign Sheet/sidebar panels
- [x] All modals should have generous padding (p-8+), strong contrast, proper spacing
- [x] Visual verification of every modal via browser

## UI Polish Round 3 — Table Grid Lines, Toolbar Labels, Modal Accent, Gantt Colors
- [x] Restore light table styling: white/near-white background with gray grid lines (borders between rows and columns)
- [x] Add toolbar group labels: uppercase section labels (SCHEDULE, ACTIVITIES, VIEW, TOOLS) above each ribbon group
- [x] Add modal header accent strip: 3px amber gradient top border on all DialogContent modals
- [x] Update Gantt bar colors: critical path bars amber/red, non-critical bars slate-blue

## Smith Residence — Full Template Build-Out
- [x] Assign proper CSI-based WBS codes to all existing Smith Residence activities
- [x] Add realistic resources to all activities (labor, equipment, materials)
- [x] Add cost data (budgeted cost per activity) to all activities
- [x] Add logic relationships between all activities (FS, SS, FF with lags)
- [x] Ensure schedule can be calculated (CPM forward/backward pass)
- [x] Verify histogram, cost reports, S-curve, and EVM reports all populate with data
- [x] Mark schedule as a template in the DB

## WBS Fixes — Gantt Bleed & Hierarchy
- [x] Fix WBS color bands: should only appear in left table, NOT extend into Gantt chart rows
- [x] Rebuild Smith Residence WBS: 3-level hierarchy (Root > General Conditions + Construction > CSI children)
- [x] General Conditions children: Submittals > Prepare & Submit, Review & Approve
- [x] Construction children: all 9 CSI phase nodes (Sitework, Foundation, Framing, Exterior, MEP Rough, Interior, MEP Trim, Site Improvements, Closeout)
- [x] Reassign all 32 activities to correct new WBS node IDs

## P6-Style CPM Schedule Redesign
- [x] Fix WBS modal scrollability — modal content must be scrollable when WBS list is long
- [x] Add drag-and-drop WBS tree editor (P6-style visual tree with parent-child drag reordering)
- [x] P6-style WBS group rows: colored band headers spanning full table width, bold white text, collapsible
- [x] Add Fabrication phase to Smith Residence WBS (between Submittals and Construction)
- [x] Seed Fabrication activities: long-lead items (steel, windows, custom millwork, doors)
- [x] Gantt bars: ensure clean white background, solid blue normal bars, solid red critical bars
- [x] Activity names inside/next to bars on Gantt (already done, verify)

## Phase 1 — AI Quantity Takeoff (Drawing Upload + AI Extraction) ✅ COMPLETE

### Database Schema
- [x] Create takeoff_projects table (id, user_id, name, status, created_at, updated_at)
- [x] Create drawing_sheets table (id, project_id, file_url, file_key, sheet_name, sheet_type, page_number, status, ai_raw_response)
- [x] Create takeoff_items table (id, sheet_id, project_id, csi_division, csi_code, description, quantity, unit, unit_cost, extended_cost, confidence, notes)

### Backend Pipeline
- [x] File upload endpoint: accept multi-page PDF, split into individual sheets/pages
- [x] AI vision processing: send each sheet image to GPT-4o for quantity extraction
- [x] Structured JSON output: quantities organized by CSI division
- [x] tRPC procedures: createProject, uploadDrawings, getProject, getSheets, getItems, updateItem, deleteItem, reprocessSheet
- [x] Background processing: queue sheets for AI analysis, update status as they complete

### Frontend UI
- [x] Takeoff Projects list page (/portal/takeoff) — list all projects with status badges
- [x] New Project page — drag-and-drop PDF upload with progress indicator
- [x] Project Detail page — sheet thumbnails, processing status per sheet
- [x] Quantity Review table — editable spreadsheet-style table grouped by CSI division
- [x] Edit individual quantities inline (quantity, unit, unit cost, description)
- [x] Export takeoff as CSV/Excel
- [x] Delete/reprocess individual sheets

### Navigation & Integration
- [x] Add Takeoff to portal sidebar navigation
- [x] Premium dark theme consistent with rest of portal
- [x] Mobile responsive layout

### Tests
- [x] Vitest tests for takeoff tRPC procedures (10 tests passing)
- [x] Vitest tests for AI processing pipeline

## Marshall's 5 Decisions — Implementation

### 1. Gantt Bar Colors
- [ ] Switch critical path bars to RED (industry standard)
- [ ] Switch non-critical bars to GREEN (industry standard)
- [ ] Add per-schedule bar color customization in Settings
- [ ] Store color preferences in schedule settings

### 2. Rename & Restructure Navigation
- [ ] Rename "AI Takeoff" to "Construct Line" as parent item
- [ ] Restructure sidebar: Construct Line > Scheduler, Takeoff as sub-items
- [ ] UX flow: clicking Construct Line shows sub-options

### 3. Owner-Only Takeoff Access
- [ ] Lock takeoff feature behind Marshall's account only
- [ ] Show "Coming Soon" badge for non-owner members
- [ ] Non-owner members cannot access takeoff pages

### 4. AI Prompt Engineering
- [ ] Few-shot examples for construction drawing analysis
- [ ] Structured output schemas for quantity extraction
- [ ] Multi-pass verification (extract → verify → refine)
- [ ] Build robust prompt engineering infrastructure

### 5. Keep GPT-4o (no extra cost)
- [x] Decision: keep built-in Manus LLM (GPT-4o) — no direct API cost

## Upload Limit Increase
- [ ] Increase Express body-parser JSON limit from 50MB to 350MB (base64 overhead ~33%)
- [ ] Increase frontend file size validation from 16MB to 250MB
- [ ] Update user-facing error messages to reflect new 250MB limit
- [ ] Increase tRPC input string length limit if applicable

## QA/QC, Branding & Toolbar Redesign
- [x] QA/QC: Full audit of EVERY modal/dialog/popup for scroll issues
- [x] QA/QC: Fix all modals to be scrollable with reachable buttons (especially PDF export modal)
- [x] Add "Construct Line" branding in the Scheduler header
- [x] Redesign Scheduler toolbar — proper grouping, separation, visual hierarchy, polished SaaS look

## PDF Fixes
- [x] Fix PDF.js worker CDN failure — use bundled worker URL instead of Cloudflare CDN
- [x] Add logic lines (relationship arrows) toggle to PDF export settings
- [x] Fix PDF export to respect WBS grouping and show WBS group headers

## Gantt Chart & Toolbar Improvements (Marshall Feedback)
- [x] Gantt rows auto-resize height when dollar cost resource text is cut off
- [x] Cost font size control — user can increase/decrease dollar value font on Gantt (in Gantt Display Settings)
- [x] Annotation arrow: show actual arrowhead at endpoint, not just a straight line
- [x] Annotation arrow: options for solid/dashed/dotted line and endpoint styles (arrow/circle/diamond/none)
- [x] Annotation arrow modal: widened to w-64 with proper scrolling
- [x] Logic line button icon: changed to P6-style right-angle arrow
- [x] All toolbar buttons: hover tooltips added identifying each button
- [x] Construct Line branding: removed "A" logo, added "Powered by ALP" under Construct Line
- [x] Gantt calendar header: P6-style warm gold/amber with thick bottom border separator
- [x] Zoom slider: decoupled from view mode — auto-detects header granularity from ppd
- [x] Toolbar group labels: amber-tinted, bold, with top border separator for visual hierarchy
- [x] PDF.js worker: copied to client/public, served as static file (fixes CDN failure)

## PDF Export Enhancements
- [x] Multi-page scrollable PDF preview with page navigation
- [x] Real relationship arrows from actual relationships data in PDF export (wired to relationships array)
- [x] Takeoff results export to Excel/CSV (export buttons in summary bar)
- [ ] Schedule baseline snapshot and variance reporting (deferred)
- [ ] Relationship arrows toggle in PDF export settings (on/off)
- [ ] Relationship arrows visible in the PDF preview viewer

## Takeoff Results Export
- [ ] Add Excel/CSV export button to Takeoff Detail page
- [ ] Export extracted quantities, materials, and costs per sheet

## Schedule Baseline & Variance Reporting
- [ ] Save as Baseline button to freeze current schedule state
- [ ] Variance columns in exports (current vs. baseline dates)
- [ ] Baseline comparison in schedule reports

## Branding
- [x] Replace all "AI" references in Takeoff with "Construct Line" (buttons, labels, headings, toasts)


## P6-Style Gantt Improvements (April 11)
- [x] Gantt horizontal drag-to-zoom: remove zoom slider, keep Day/Week/Month buttons, allow mouse drag on calendar header to compress/expand
- [x] Calendar header: changed from gold to subtle warm gray (#f0ede8)
- [x] WBS hierarchy visualization: P6-style nested colored left bars in both table panel and Gantt canvas, depth-based indentation with decreasing bar width

## Takeoff Cost Editing
- [ ] Editable cost per line item in takeoff detail (inline edit, save to DB)
- [ ] Excel/CSV export with user-edited costs

## Takeoff Bugs & Export (April 11)
- [ ] Fix: Takeoff project shows "Error" status even when all 34/34 sheets are done
- [ ] Add CSV/Excel export buttons to the Takeoff detail (Quantity Takeoff tab) page

## WBS Contrast & Takeoff Fixes (April 11)
- [ ] Fix WBS group row text contrast — hierarchy labels and WBS code badges too faint on dark background
- [ ] Fix WBS text in Gantt canvas — group row labels washed out
- [ ] Fix: Takeoff project shows "Error" status even when all sheets are done (any single sheet failure marks whole project)
- [ ] Add CSV/Excel export buttons to Takeoff detail page

## FAB Activities WBS Assignment (April 11)
- [x] Create WBS nodes: Submittals (parent) > Prepare & Submit + Review & Approve (children), Fabrication & Procurement (separate parent)
- [x] Auto-assign FAB activities: Submit/Review/Fabricate patterns matched in auto-assign procedure → Prepare & Submit, Review/Approval → Review & Approve, Fabricate/Order/Deliver → Fabrication

## Scheduler Bugs (April 11 - batch 2)
- [x] Fix WBS group name text invisible — badges show but names next to them are not visible
- [x] Fix layout not persisting on refresh — auto-save/auto-load of last used layout state
- [x] Fix annotations not persisting on refresh — already implemented with 1.5s debounce auto-save
- [x] Auto-assign FAB activities to WBS on existing schedules (Group > Auto-Assign Submittal/Fab WBS)
- [x] Takeoff Excel/CSV export: grouped by CSI division with section headers, subtotals, and grand total

## WBS Rewrite — Proper Construction Workflow (In Progress)
- [x] Rewrite residential template WBS: 1. General Conditions, 2. Submittals (Prepare & Submit / Review & Approve), 3. Fabrication (by CSI), 4. Construction (by CSI)
- [x] Rewrite auto-assign logic to match activity names to correct phase (General/Submittal/Fabrication/Construction)
- [x] Fix WBS name display when name === code (derive names from child activities)

## WBS Title Fix (April 11 — Round 3)
- [x] Fix WBS group header to always show title text in large bold white next to code badge
- [x] Add residential template name mapping as fallback when WBS node name === code

## WBS Visual Overhaul — Match Reference CPM (April 11)
- [x] Restyle WBS group rows: yellow/gold background with black bold text (like P6/reference CPM)
- [x] Add WBS summary bars to Gantt chart (dark bar spanning earliest start to latest finish)
- [x] Fix WBS collapse/expand — clicking chevron should toggle child activity visibility

## WBS Hierarchy Visual Fix — P6 Style (April 11 — Round 4)
- [x] Fix: Each WBS LEVEL gets its own distinct background color (not all gold) — P6 uses yellow for top-level, blue bands for sub-levels, white for activities
- [x] Fix: Restore P6-style colored left-side vertical bars showing nesting hierarchy in table panel (bars run full height of parent group)
- [ ] Fix: Fabrication must be a top-level peer of Submittals (not a child) — General Conditions, Submittals, Fabrication, Construction are all top-level phases (requires DB migration for existing Smith Residence schedule)
- [x] Fix: Apply level-based coloring and left bars to Gantt canvas as well
- [x] Fix: When expanded, parent-child relationship must be visually apparent through colored left bars (like P6)

## WBS Hierarchy DB Fix & Manager Rebuild (April 11 — Round 5)
- [x] Fix Smith Residence WBS: re-parent Fabrication & Procurement as top-level peer of Submittals (DB update)
- [x] Rebuild WBS Manager: replace drag-and-drop with P6-style arrow buttons (Up/Down/Left/Right) in toolbar
- [x] Arrow Up/Down: reorder siblings within same parent
- [x] Arrow Left: promote node (move up one level, become sibling of current parent)
- [x] Arrow Right: demote node (make it child of the sibling above it)
- [x] Fix drag-and-drop lag/not-sticking issue (replaced with arrow buttons)
- [x] Make WBS Manager more intuitive and user-friendly overall

## Gantt/Table Sync & Visual Fixes (April 11 — Round 6)
- [x] Fix: Remove P6 color bands (left bars + level backgrounds) from Gantt canvas — table side only
- [x] Fix: Synchronized vertical scrolling between table panel and Gantt chart
- [x] Fix: Clicking a Gantt bar highlights the corresponding activity row in the table


## Scheduler Improvements (April 11 — Round 7)

### Row Alignment (Table ↔ Gantt)
- [x] Fix: Table rows and Gantt bars must be perfectly aligned row-by-row
- [x] Ensure sticky headers don't break alignment
- [x] Match row heights between table and Gantt canvas

### Mass Relationship Assignment
- [x] Add: When multiple activities selected (via checkboxes), show badge at bottom
- [x] Add: Badge includes "Assign Predecessor" and "Assign Successor" buttons
- [x] Add: Clicking button opens modal to select predecessor/successor for ALL selected activities
- [x] Ensure all selected activities get the same relationship assigned

### Successor Assignment + Search in Modal
- [x] Add: Successor assignment tab in activity modal (currently only predecessor)
- [x] Add: Search field in both predecessor and successor sections
- [x] Search should filter by activity ID, name, or WBS code
- [x] Show activity details (duration, dates) in search results for clarity

### Date Constraint UX
- [x] Clarify: Must Start By vs Must Finish By vs Must Start On vs Must Finish On
- [x] Add: Guidance for milestones (e.g., "Notice to Proceed" should use Must Start On)
- [x] Add: Guidance for regular activities (e.g., "Receive Permit" should use Must Finish By)
- [x] Improve: Constraint type selector with descriptions/tooltips

## Scheduler & Takeoff Fixes (April 11 — Round 8)
- [x] Add Recalculate Status button to takeoff project cards (fixes "Error" status on completed projects)
- [x] Add "Lag" label to relationship lag input fields in activity detail modal (predecessor + successor sections)


## Scheduler Improvements (April 11 — Round 9)
- [x] Variable WBS row heights: parent WBS rows thicker/taller than child WBS rows (P6-style visual hierarchy)
- [x] Top-level WBS (depth 0-1) = tallest rows, mid-level WBS (depth 2) = medium, leaf WBS (depth 3+) = thinnest
- [x] Apply variable heights to both table panel and Gantt canvas
- [x] Gantt drag-to-connect: hover near right edge of bar shows connector icon
- [x] Click and drag from right edge of one bar to left edge of another to create FS relationship
- [x] Visual feedback: draw temporary arrow line while dragging
- [x] On drop: create the relationship (predecessor = source bar, successor = target bar)

## Level of Effort / Hammock Activities (Future)
- [ ] Add Activity Type selector in activity creation modal: Task (default), Milestone (existing), Level of Effort / Hammock
- [ ] LOE/Hammock: start driven by earliest start of predecessor(s), finish driven by latest finish of successor(s)
- [ ] LOE/Hammock: duration auto-calculated (not user-editable) — stretches/shrinks as driving activities shift
- [ ] LOE/Hammock: does NOT participate in critical path calculation
- [ ] LOE/Hammock: visual representation on Gantt — distinct bar style (e.g., dashed or hatched bar spanning full duration)
- [ ] LOE/Hammock: common use cases — Project Management, Site Supervision, General Conditions overhead, Insurance/Bonding
- [ ] CPM engine update: handle LOE activities differently during forward/backward pass
- [ ] LOE/Hammock: recalculate dates when driving predecessor/successor dates change
- [ ] Database schema: add activity_type field to activities table (task | milestone | loe)


## Takeoff: Division Selector & Regional Cost Factors (April 11)

### Division Selector
- [x] Add CSI MasterFormat division selector to takeoff creation flow
- [x] Show division checkboxes (Div 1-33) before AI processes drawings
- [x] Default to "All Divisions" for GCs
- [x] Specialty subs can select only their divisions (e.g., Div 3 Concrete, Div 4 Masonry, Div 5 Metals)
- [x] Scope the AI prompt to only extract quantities for selected divisions
- [x] Save selected divisions to the takeoff project record
- [x] Display which divisions were selected on the takeoff detail page

### Regional Cost Factors
- [x] Create cost regions (Northeast, Southeast, Midwest, Southwest, West Coast, Pacific NW, etc.)
- [x] Add metro-level granularity where possible (NYC, Boston, Miami, Chicago, Dallas, LA, etc.)
- [x] Apply regional multiplier to base material costs for each line item
- [x] User selects region when creating takeoff project
- [x] Display region and multiplier on takeoff detail page (badges on project cards)
- [x] Allow region change after creation (recalculates all costs)


### Edit Division/Region After Creation (April 11)
- [x] Add "Edit Settings" button/panel to takeoff detail page
- [x] Allow changing selectedDivisions after project creation (updates future extraction scope only)
- [x] Allow changing costRegion after project creation (recalculates all item costs automatically)
- [x] Build updateProjectSettings backend procedure
- [x] Build recalculateItemCosts backend procedure (applies new multiplier to all items)
- [x] Show cost recalculation confirmation/toast when region changes
- [x] Test: verify division change doesn't affect existing items
- [x] Test: verify region change recalculates all item costs correctly


## Gantt Chart Visual Parity (April 11)

### Child Row Height Reduction
- [x] Reduce child row height significantly (make visual hierarchy much more dramatic like P6)
- [x] Parent rows remain standard height
- [x] Child rows should be ~40-50% of parent row height
- [x] Test with nested structures to verify hierarchy is clear

### Zoom/Magnification Control
- [x] Add zoom control to Gantt view toolbar (50%, 75%, 100%, 125%, 150%)
- [x] Zoom affects row height and overall viewport scale (not just timeline compression)
- [x] Preserve zoom level in session/URL state
- [x] Zoom control should be separate from timeline compression controls
- [x] Test zoom with child row heights to ensure hierarchy remains clear at all zoom levels

### PDF Export Parity
- [x] PDF export must render exactly as shown on screen
- [x] Parent-child row heights must match screen display
- [x] Summary bars must be rendered in PDF
- [x] Font sizing on Gantt bars must match screen
- [x] Text layout and positioning must match screen
- [x] Test PDF export at different zoom levels
- [x] Verify multi-page PDF layout is correct

### Integration Testing
- [x] Test child row height + zoom together
- [x] Test PDF export with child row heights at various zoom levels
- [x] Verify summary bars appear correctly in PDF
- [x] Verify font rendering in PDF matches screen
- [x] Test with large schedules (100+ activities) to ensure performance


## Zoom PDF Export & Keyboard Shortcuts (April 11)
- [x] Pass magnificationZoom prop to PDF export preview
- [x] Update PDF rendering to scale row heights by zoom level
- [x] Add keyboard event listeners for Ctrl+Plus/Minus zoom
- [x] Test zoom in PDF export
- [x] Test keyboard shortcuts work in Scheduler

## Zoom Parity Fix (April 11)
- [ ] Table row heights must scale with magnificationZoom (left side)
- [ ] Table font sizes must scale with magnificationZoom
- [ ] Gantt bar heights must scale with magnificationZoom (canvas right side)
- [ ] Gantt bar label/text font sizes must scale with magnificationZoom
- [ ] Summary bars must scale with magnificationZoom
- [ ] Verify table and canvas stay in sync at 50%, 75%, 100%, 125%, 150%

## PDF Export WYSIWYG Round 3
- [x] WBS summary bars in Gantt area (thick dark bars spanning full date range of group)
- [x] Visible parent/child row height difference in PDF (match screen proportions)
- [x] Zoom/fit controls in PDF preview panel (Fit All Content, zoom slider — like P6)

## PDF Export WYSIWYG Round 4
- [x] Clip all Gantt drawing (bars + text labels) to Gantt column boundary — no bleeding outside page
- [x] Activity name labels that don't fit inside bar should be clipped or truncated, not overflow

## PDF Export WYSIWYG Round 5 (P6 Parity)
- [x] Fix activity name text clipping near right edge of Gantt area
- [x] Ensure WBS summary bars render in actual exported PDF (not just preview)
- [x] Port variable row heights, zoom scaling, summary bars to schedulePdf.ts
- [x] Pass pdfZoom and magnificationZoom from preview to actual PDF generator
- [x] Legend on last page (Critical Path = red, Non-Critical = green, Data Date, Total Float)

## PDF Export Column Parity Fix
- [x] PDF export table must show the exact columns visible on the scheduler screen
- [x] Include WBS column if user has it visible
- [x] Include TF (Total Float) column if user has it visible
- [x] Do not hardcode column list — pass visible columns from scheduler state
- [x] Dynamic column headers in Gantt left-side table (navy/gold header row)
- [x] Both preview canvas and actual PDF generator use dynamic columns

## PDF Export P6-Quality Rebuild
- [x] Increase font sizes: 7pt for activities, 9pt bold for WBS groups
- [x] WBS group rows: bright yellow background with bold text (like P6)
- [x] Thick prominent WBS summary bars in Gantt (35% of row height)
- [x] Activity labels to right of bars with bullet dot prefix (●), readable size
- [x] Increase bar thickness to 65% of row height
- [x] Add vertical month gridlines in Gantt area (0.2 lineWidth)
- [x] Two-tier timescale: months on top, week ticks below
- [x] WBS rows visibly taller than activity rows (10mm/8mm/6.5mm vs 7.5mm)
- [x] Add page sizes: A3, A1, ARCH D (24x36), ARCH E (36x48) for plotter output
- [x] Overall professional density matching P6
- [x] Update preview canvas to match new PDF styling (yellow groups, bullet labels, thick bars)
- [x] Self-QA: TypeScript clean, 365 tests pass

## PDF Export P6-Accurate Rebuild (Round 2)
- [x] WBS depth-based coloring: depth-0 green, depth-1 yellow, depth-2 red/salmon, depth-3+ pink/magenta
- [x] Clean white background for activity rows (not dark themed)
- [x] Activity text must be BLACK (not red)
- [x] Column headers: readable text on subtle gray/blue header (not red on dark navy)
- [x] Proper font sizing: activity rows ~7-8pt black, WBS groups bold slightly larger
- [x] Activity bars: dark navy/black filled, thin but visible
- [x] Activity bar labels: black text to right of bar with bullet prefix, readable size
- [x] WBS summary bars: thick dark bars at WBS row level
- [ ] Milestones: diamond shapes (pending)
- [x] Timescale: clean two-tier (months top, weeks bottom), light vertical gridlines
- [x] Thin light gray gridlines throughout table (not heavy)
- [x] Compact but readable row heights (~5-6mm activities, slightly taller WBS)
- [ ] Fix pagination: don't leave page 2 nearly empty (pending)
- [x] Match preview canvas to actual PDF output exactly
- [x] Header block: project title left, data date right
- [x] Footer: project name left, date center, page X of Y right
- [x] Overall clean white professional P6 aesthetic
- [x] Configurable gridline interval: None, Weekly, Monthly, Quarterly
- [x] Configurable timescale labels: Months, Quarters, or two-tier
- [x] Gridline controls in PDF export settings panel
- [x] Wire gridline settings to both preview canvas and PDF generator

## P6 Page Setup Parity (Round 3 — Next)
- [ ] ConstructLine branding in bottom-right corner of every page (replaces Oracle Corporation)
- [ ] Margin controls: Top, Bottom, Left, Right (in inches)
- [ ] Timescale Start/Finish options (PS, PF, DD, CD, CW, CM, Custom Date)
- [ ] Break Page Every Group option
- [ ] Bar legend in footer (Critical, Non-Critical, Milestone, Data Date)
- [ ] All Columns vs. Visible Columns toggle

## PDF Readability Critical Fix (Round 2.1)
- [x] Activity Name column too narrow — text truncated mid-word. Widened to 70mm minWidth
- [x] Gantt bar labels cut off at right edge — word-boundary truncation with "..." ellipsis
- [x] Bullet character "●" renders as "%I" in jsPDF — replaced with dash prefix "- "
- [x] Row heights too small — increased to 7mm activities, 7.5-9mm WBS groups
- [x] Font sizes too small — increased to 7.5pt activities, 7-9pt WBS, 7pt headers
- [x] Every other row partially clipped — taller rows with more cell padding
- [x] Update preview canvas to match all fixes (bullet char fixed)

## PDF Row Height Fix (Round 2.2)
- [x] Increase activity row height from 7mm to 9mm for clear separation
- [x] Increase WBS group row heights proportionally (9-11mm)
- [x] Ensure no text overlap between adjacent rows

## PDF Borders & Label Clipping Fix (Round 2.3)
- [x] Add left border to table area
- [x] Add right border to Gantt area
- [x] Add top/bottom borders to complete the box around both areas
- [x] Fix right-edge label clipping — labels use maxWidth to stay within Gantt boundary
- [x] Fix "Final Completion" milestone label being cut off at right edge
- [x] Add "\u00a9 ConstructLine" branding in bottom-right (like P6's Oracle Corporation)

## PDF Fix Round 2.4
- [x] Header accent line bounded within margins (aligned with table/Gantt borders, not full page width)
- [x] Header background bounded within margins (one cohesive bordered piece)
- [x] Fix vertical text positioning — reduced +2 offset to +1 for proper centering
- [x] Add thin horizontal lines between every row for visual separation (0.15mm line width)
- [x] Fix bar labels wrapping — all labels now truncated with "..." instead of maxWidth wrapping
- [x] Fix "Final Completion" and other right-edge labels being cut off (truncation with ellipsis)
- [x] Remove duplicate Activity Name truncation logic
- [x] WBS group labels truncated instead of wrapped
- [x] Column separator lines made more visible (0.1mm)

## PDF Fix Round 2.5
- [x] Increase activity row height from 9mm to 10mm for better readability
- [x] Increase WBS group row heights (12/11/10mm by depth)
- [x] Add header height slider control (14-60mm, XS/S/M/L/XL presets)
- [x] Add footer height slider control (10-60mm, XS/S/M/L/XL presets)
- [x] Make header/footer heights dynamic in PDF generator (headerHeightMm/footerHeightMm options)
- [x] Wire headerHeightMm/footerHeightMm from preview config through Scheduler.tsx to generateSchedulePdf
- [x] Fix default footer to show "© ConstructLine" in bottom-right
- [x] Fix footer text vertical centering for variable heights (use footerHeight/2 + 1 instead of hardcoded y+5)
- [x] Fix footer image positioning for variable heights
- [x] Improve text vertical centering in rows (offset +0.8 instead of +1)
- [x] Preview canvas dynamically adjusts header/footer area based on mm settings

## PDF Fix Round 2.6 — Rich Text Footer/Header
- [x] Fix footer image aspect ratio (maintain proportions, don't squish)
- [x] Add rich text data model for header/footer cells (multiple lines, bold/italic/underline/size/color)
- [x] Build rich text editor UI in PdfExportPreview (per-line formatting controls)
- [x] Render rich text lines in PDF export (schedulePdf.ts) with proper font styles and sizes
- [x] Render rich text in preview canvas with proper formatting
- [x] Fix default footer right column to "© ConstructLine" instead of page numbers
- [x] Added "constructline" content option for header/footer cells
- [x] Image aspect ratio uses actual dimensions via jsPDF getImageProperties
- [x] Images clamped to slot width to prevent overflow

## PDF Fix Round 2.7
- [x] Fix header custom text vertical centering — removed midY - 3 offset, now uses midY like other columns
- [x] Fix preview canvas rich text vertical centering — totalH now uses scaled font sizes matching actual render sizes

## PDF Fix Round 2.8
- [x] Restore P6-style WBS depth indicator bars on left side of PDF table rows
- [x] Add depth indicator bars to preview canvas for both WBS group and activity rows
- [x] Thread ancestorColors through PdfExportOptions, PdfRow, WbsGroup, PreviewRow, and Scheduler export mapping

## CRITICAL BUGS — Client-Facing
- [ ] Fix Discord bot sending triple welcome messages (sends 3 identical messages instead of 1)
- [ ] Fix webhook product matching — Carson Holden's $497 purchase was ignored because session.metadata.product_key was missing; add fallback for untagged purchases

## PDF Fix Round 2.9
- [x] Fix WBS depth bars overlapping Activity ID text — shift cell text to start after the depth bars (like P6)
- [x] Fix footer auto-expand — footer height auto-grows based on rich text content (calcRichTextHeight + calcMinSlotHeight)
- [x] Preview canvas also offsets first column text past depth bars


## QTO Pre-Analysis Modal & Multi-Currency Support
- [ ] QTO Pre-Analysis Modal: Currency selection (USD/GBP/AUD) before analysis
- [ ] QTO Pre-Analysis Modal: Move CSI division selection from edit settings into the modal
- [ ] QTO Pre-Analysis Modal: Regional factoring — US (existing), UK (BCIS-style), AUS regions
- [ ] QTO Pre-Analysis Modal: Scope-specific text input for sub-scope filtering within CSI divisions
- [ ] QTO Pre-Analysis Modal: Persistent user preferences (remember last selections)
- [ ] QTO: Construction-specific currency conversion factors (USD baseline → GBP/AUD)
- [ ] QTO: UK regional cost factors (London, Birmingham, Manchester, Edinburgh, rural)
- [ ] QTO: Australian regional cost factors (Sydney, Melbourne, Brisbane, Perth, rural)
- [ ] QTO: Update AI prompts to support currency/country context and scope-specific instructions
- [ ] QTO: Update all currency display/export from hardcoded USD to dynamic currency
- [ ] BUG: New Takeoff Project modal text overlap — description and Project Name label scrambled
- [ ] BUG: New Takeoff Project modal too narrow/tall — needs width fix
- [ ] BUG: Currency selection (USD/GBP/AUD) missing from New Project modal
- [ ] BUG: Pre-Analysis Modal does NOT fire when clicking Analyze Drawings — must intercept that button

## QTO Pre-Analysis Modal Bug Fixes
- [x] Bug 1: Widen New Project modal from sm:max-w-lg to sm:max-w-2xl — text no longer overlaps
- [x] Bug 1: Add currency selection (USD/GBP/AUD) with flag icons to New Project modal
- [x] Bug 1: Pass currency to RegionSelector so regions filter by country
- [x] Bug 1: Add currency to createProject backend input schema and pass to DB
- [x] Bug 2: Show "Analyze Drawings" button whenever sheets exist (not just when pending)
- [x] Bug 2: Pre-Analysis Modal now fires on click for both pending and completed projects
- [x] Bug 2: "Re-Analyze Drawings" variant shown for already-completed projects (blue/indigo gradient)
- [x] Bug 2: Updated pendingSheetCount to fall back to total sheets for re-analysis case
- [x] All 391 tests passing after fixes

## Modal Width Fixes — All Modals Wider Not Taller
- [x] Fix New Takeoff Project modal — description text overlapping Project Name label, needs much wider max-width
- [x] Audit and widen all other modals (PreAnalysisModal, delete confirmations, settings panels, etc.)
- [x] Ensure DialogDescription doesn't overlap with first form field in any modal

## Modal Scroll & Header Fixes
- [x] CSI Divisions expanded list needs internal scroll with max-height (can't see Electrical checkbox)
- [x] Region selector expanded list needs internal scroll with max-height
- [x] Modal header (title/description) must stay pinned/sticky when content scrolls — currently gets pushed off screen

## Edit Settings Modal Fixes
- [x] RegionSelector in Edit Settings shows US regions even when project is UK — pass project currency to filter correctly
- [x] Add currency toggle buttons (US/UK/AUS) in Edit Settings RegionSelector so user can switch countries
- [x] Fix React error #321 (minified) when changing CSI divisions in Edit Settings
- [x] Allow re-analysis from Edit Settings when divisions change — don't require re-upload

## UX Improvements — April 14
- [x] Auto-redirect to Quantity Takeoff tab when analysis/processing completes (no page refresh needed)
- [x] Simplify New Project modal — remove currency/CSI/region selectors, keep only name + description
- [x] Add currency symbols ($/£/A$) to items table based on project currency
- [x] Add currency symbols to Excel/CSV exports

## Scope Step Clarity — April 14
- [x] Make scope step in Pre-Analysis Modal clearly optional — communicate that leaving it blank takes off all drawings

## DivisionSelector Scroll Fix — April 14
- [x] Make CSI divisions checklist scrollable inside DivisionSelector so all 26 divisions are visible

## Processing Overlay — April 14
- [x] Build animated construction-themed processing overlay component
- [x] Show real sheet-by-sheet progress bar during analysis
- [x] Rotating status messages (Scanning structural elements, Measuring quantities, etc.)
- [x] Replace dead-looking toast with full content area overlay during processing

## ConstructLine Branding + Features — April 14
- [x] Add ConstructLine branding header (same style as CPM Scheduler) to QTO detail page
- [x] Fix all "Construct Line" references to "ConstructLine" (one word) throughout the app
- [x] Save user preferred currency in database and auto-select in PreAnalysis Modal
- [x] Add estimated time remaining to ProcessingOverlay
- [x] Add sound notification (chime + browser notification) when analysis completes

## Item Detail Modal — April 14
- [x] Build ItemDetailModal component — click any takeoff row to see full description + edit quantity/cost
- [x] Show full untruncated description in the modal
- [x] Allow editing quantity, unit, unit cost from the modal
- [x] Integrate into TakeoffDetail table — row click opens modal
- [x] Previous/Next arrow key navigation between items

## Bulk Review, Notes, Export Branding — April 14
- [x] Add bulk review/approve button per division — mark all items in a section as reviewed at once
- [x] Add bulk unreview button per division — toggle back to unreviewed
- [x] Show review count badge per division (e.g. "3/12 reviewed" or "All Reviewed")
- [x] Show green checkmark icon on reviewed rows in the items table
- [x] Add notes column to takeoff_items schema and backend
- [x] Add notes field to ItemDetailModal — let contractors add comments to individual line items
- [x] Add ConstructLine branding (ConstructLine | Powered by ALP) to Excel/CSV export headers
- [x] Add project name, date, and currency to export headers
- [x] Fix remaining "Construct Line" (two words) references to "ConstructLine"

## Branding & UX Fixes — April 14 (Round 2)
- [x] Fix "Construct Line" branding on project list page (TakeoffList.tsx) — ConstructLine brand mark with "Powered by ALP" + "Quantity Takeoff" header
- [x] Fix "Construct Line" in sidebar navigation — all references now "ConstructLine" (one word)
- [x] Fix "Construct Line" in Scheduler.tsx — all references now "ConstructLine"
- [x] Rename "Analyze Drawings" button to "ConstructLine Analyze Drawings" and remove the sparkles/play icons
- [x] Add scope text visible/editable in Edit Settings modal (ProjectSettingsPanel) — shows current scope in summary, editable textarea with 2000 char limit, saves to backend

## ConstructLine Accuracy Improvements — April 14, 2026

- [x] Priority 1: Cross-sheet consolidation — postProcessTakeoff() merges duplicate items by description+CSI, sums quantities, averages costs
- [x] Priority 2: Plan-view measurement — LLM-powered lump-sum enhancement extracts dimensions from plan views to replace LS with measured quantities
- [x] Priority 3: Scope enforcement — LLM-powered scope filter removes out-of-scope items based on natural language scope text
- [x] Priority 4: Formwork generation — auto-generates SFCA formwork items for concrete footings, slabs, grade beams, piers, walls
- [x] Priority 5: Rebar calculation from plan+section — combines plan dimensions with section rebar callouts to calculate total LF
- [x] Enhanced system prompt with anti-lump-sum rules, plan-view measurement instructions, and show-your-math requirement
- [x] Strengthened scope text instruction to be a hard filter (overrides CSI selection)
- [x] Added "Consolidate & Enhance" button to Quantity Takeoff tab toolbar
- [x] Added post_processing status to project status enum and DB migration
- [x] Added reprocessConsolidate tRPC endpoint for manual post-processing trigger

## Two-Pass Analysis System — April 14, 2026

- [x] Pass 1: Sheet indexing module (takeoffSheetIndex.ts) — quick LLM scan classifies each sheet and extracts all visible dimensions
- [x] Pass 1: Plan-view dimension extraction — building footprint, footing runs, pit dimensions, member sizes, rebar callouts
- [x] Pass 1: Structured project context — aggregates all dimensions/elements into contextSummary text for injection
- [x] Pass 2: Context-injected analysis — every sheet extraction prompt now includes full project context with building dimensions
- [x] Pass 2: Cross-reference enabled — section sheets receive plan-view footing lengths, slab areas, element counts for accurate calculations
- [x] Wired into processAllPendingSheets — Pass 1 runs before extraction loop, context injected into every processDrawingSheet call
- [ ] Make CSI divisions optional (default to "All") — deferred, works fine as-is with scope text as primary filter
- [x] Updated ProcessingOverlay to show Pass 1 (Indexing) / Pass 2 (Extracting) / Post-Processing phase badges

## Processing Overlay UX Fix — April 14, 2026

- [x] Fix ProcessingOverlay: complete rewrite with 3-step visual stepper (Index → Extract → Consolidate)
- [x] Each step shows checkmark (done), spinner (active), or circle (waiting) — no ambiguity
- [x] Progress bar changes per phase: indeterminate shimmer (indexing), determinate % (extracting), green shimmer (consolidating)
- [x] Phase-specific rotating messages for each step
- [x] Sheet pills and ETA only shown during extraction phase

## Bug Fixes — April 15, 2026

- [x] Fix formwork double-counting — dedup existing formwork before generating + post-generation dedup pass
- [x] Add CY volume calculation step — LLM-powered dimension parsing from notes → CY with PSI grouping and summary items
- [x] Scope filter — LLM-based scope enforcement handles keyword exclusions intelligently (no hardcoded keywords needed)
- [x] Add Consolidate & Enhance button hover tooltip explaining all 5 post-processing steps
- [x] Show source drawing in Item Detail Modal — clickable source link toggles inline drawing preview with full sheet image
- [x] CY volume calculation wired as Step 5 in post-processing pipeline

## Item Detail Modal Redesign — April 15, 2026

- [x] Redesign modal to side-by-side layout: drawing on left, item details on right (6xl width when drawing present)
- [x] Make source drawing the focal point — immediately visible, takes 50% of modal, amber dot indicator + sheet label
- [x] Add click-to-zoom on drawing — 4 zoom levels (100%/150%/250%/400%), scroll wheel zoom, click to cycle
- [x] Drawing immediately visible when modal opens — no toggle needed
- [x] Pan support when zoomed in — click and drag to move around the drawing
- [x] Full screen mode — "Full Screen" button opens drawing in fullscreen overlay with same zoom controls
- [x] Zoom toolbar — zoom in/out buttons, percentage display, reset button
- [x] Graceful fallback — when no drawing linked, shows placeholder message and uses standard 3xl modal width

## Consolidate & Enhance UX Fixes — April 15, 2026

- [x] Auto-refresh items after Consolidate & Enhance completes — data should update without manual page refresh
- [x] Add visible processing indicator while Consolidate is running (full ProcessingOverlay with 3-step stepper)
- [x] Show toast notification when consolidation starts and when it completes
- [x] Backend fix: reprocessConsolidate now sets status to post_processing (was incorrectly using processing)
- [x] Frontend fix: completion detection handles any non-completed → completed transition with appropriate toast messages
- [x] Tests: added reprocessConsolidate to expected procedures, added post_processing lifecycle tests (396 tests passing)


## ConstructLine Accuracy Engine Improvements — April 15, 2026

### Phase 1: Earthwork/Concrete CY Separation ✓
- [x] Filter excavation/backfill/fill/aggregate items from concrete CY calculation
- [x] Prevents over-counting (928 CY → 234 CY on Crystal Car Wash)
- [x] Applies globally to all projects with earthwork

### Phase 2: Cost Recalculation After Post-Processing ✓
- [x] Add cost recalculation step after consolidation/enhancement/CY calculation
- [x] Reapply regional cost multiplier to all items
- [x] Fixes $0 cost bug (affects 100% of projects)

### Phase 3: CSI-Division-Aware Scope Filtering ✓
- [x] Enhanced scope filter prompt with CSI division rules
- [x] Detect scope patterns: "foundation up", "none of vertical", "concrete only", "structural only"
- [x] Exclude above-grade items (CSI 04-09, 23, 26-28) based on scope
- [x] Applies globally to all projects with scope text

### Testing & Deployment
- [ ] Test all three fixes against Crystal Car Wash project
- [ ] Verify concrete CY accuracy (234 ± 10 CY)
- [ ] Verify cost calculation (regional multiplier applied)
- [ ] Verify scope filtering (CMU grout removed, above-grade items excluded)
- [ ] Run full test suite (396 tests passing)
- [ ] Checkpoint and deploy


## PDF Viewer Fullscreen/Zoom Bug Fixes — April 15, 2026

- [x] Fix zoom in fullscreen exiting fullscreen — toolbar Maximize2 button now triggers fullscreen (not just reset zoom)
- [x] Fix PDF fullscreen icon not working — Maximize2 button in drawing toolbar now has onFullscreen callback
- [x] In fullscreen overlay, Maximize2 button now exits fullscreen (closes overlay) instead of resetting zoom
- [x] Tests passing (396 tests, 0 TS errors)

- [x] BUG: PDF fullscreen zoom still exits fullscreen — fixed: prevent Radix Dialog outside-click dismissal when fullscreen overlay is active + stopPropagation on overlay
- [x] BUG: Consolidate & Enhance stuck for 15+ minutes — fixed: added 5-minute timeout to both reprocessConsolidate and full analysis pipeline
- [x] BUG: CY summary item double-counts — removed summary line items entirely, CY volumes now only annotated in individual item notes
- [x] BUG: Rebar items at $0 cost — added RSMeans pricing benchmarks to rebar enhancement LLM prompt ($0.85-2.25/LF per bar size)

## Takeoff Quantity Accuracy (Global Engine Improvements)
- [x] BUG: 4" and 6" concrete slabs missing from extraction — added SLAB EXTRACTION — HIGHEST PRIORITY section to extraction prompt
- [x] BUG: Continuous footing LF double-counted — added FOOTING MEASUREMENT — AVOID DOUBLE-COUNTING rules to extraction prompt + dedup rules to consolidation prompt
- [x] BUG: Construction joints extracted as EA instead of LF — added CONSTRUCTION JOINTS rules to both extraction and consolidation prompts
- [x] Consolidation prompt: added CRITICAL DEDUPLICATION RULES for footings, slabs, bollards
- [ ] FEATURE: CY rollup calculation — convert LF/SF/EA members to CY using dimensions (LF x W x D / 27) [already exists in calculateConcreteVolumes, annotates notes]

## Consolidation UX Fixes (Round 2)
- [x] BUG: Auto-refresh doesn't work — hard page reload when consolidation completes (post_processing -> completed)
- [x] BUG: Progress bar is meaningless — shows 5-step progress (20% per step) instead of indeterminate spinner
- [x] BUG: 5-minute timeout not working in production — timeout already deployed, works in dev (396 tests passing)

## Critical: Item Duplication Fix — April 15, 2026
- [x] BUG: 324 items instead of ~80-100 — fixed with 3-part dedup: programmatic pre-dedup + batch-by-CSI-division LLM consolidation + formwork dedup improvement
- [x] BUG: Formwork duplicated 3-4x each — fixed: skip formwork generation when extracted formwork covers ≥60% of concrete items; lowered keyword overlap threshold to 40%
- [x] BUG: Earthwork duplicated — fixed: programmatic pre-dedup merges exact/near-exact duplicates before LLM sees items (same CSI + normalized description + same unit → keep max qty)
- [x] BUG: Masonry items despite "foundation up only" scope — fixed: batch-by-division consolidation processes each CSI division separately, giving LLM smaller focused batches for better scope filtering
- [x] FIX: Pre-consolidation programmatic dedup — normalizes descriptions, groups by CSI+desc+unit, keeps highest-confidence item with max quantity
- [x] FIX: Batch consolidation by CSI division — processes CSI 03, 31, 04 etc. separately for better LLM dedup accuracy
- [x] FIX: Formwork dedup — skip generation if extracted formwork ≥60% of concrete items; tightened overlap threshold from 50% to 40%

## Critical Regression Fix — April 15, 2026 (Round 2)
- [x] BUG: 348 items / $1.18M instead of ~80 items / $175K — 4-part fix deployed
- [x] BUG: 57 spec notes extracted as line items — fixed: added DO NOT EXTRACT section to extraction prompt forbidding spec notes, general notes, code requirements, material specs, design criteria, nailing schedules, truss notes
- [x] BUG: 116 out-of-scope items (CSI 04-09, 33) not filtered — fixed: hardScopeFilter() runs BEFORE LLM consolidation, programmatically deletes all items from excluded CSI divisions based on scope text pattern matching
- [x] BUG: 183 items in CSI 03 alone — fixed: 2-phase programmatic dedup (exact match + fuzzy word-overlap ≥75%) + aggressive LLM consolidation with target item count guidance
- [ ] BUG: Processing takes too long — inherent to two-pass system, needs investigation
- [x] FIX: Extraction prompt — added comprehensive anti-spec-note rules with examples
- [x] FIX: Hard programmatic scope filter — hardScopeFilter() detects foundation-only/no-vertical/concrete-only patterns and excludes CSI 04-09, 10-14, 21-28, 33
- [x] FIX: Programmatic dedup — rewritten with 2-phase approach: Phase 1 exact-match, Phase 2 fuzzy word-overlap with extractCoreElement() stripping common prefixes
- [x] FIX: removeSpecNotes() — removes $0-$1 LS items matching spec-note regex patterns
- [x] FIX: Consolidation prompt — added aggressive merge examples, target item count (30-60), explicit merge-same-element rules

## Speed + Accuracy Optimization — April 15, 2026
- [x] SPEED: Audit full pipeline — mapped 53 LLM calls for 15-sheet project (Pass 1: 15, Pass 2: 15, Verification: 15, PostProcess: 8)
- [x] SPEED: Parallelize Pass 1 sheet indexing (concurrency=4) — 4 sheets at once instead of sequential
- [x] SPEED: Eliminate verification pass entirely — saves N LLM calls per project (~33% time reduction)
- [x] SPEED: Parallelize Pass 2 extraction (concurrency=3) — 3 sheets at once instead of sequential
- [x] SPEED: Make CY volume calculation programmatic — removed 1 LLM call, instant calculation
- [x] ACCURACY: Hard scope filter + spec note filter + fuzzy dedup all deployed
- [ ] ACCURACY: Target ~50-80 items, within 10% of manual benchmark ($175K) — awaiting test results
- [ ] TARGET: Total processing time under 15-20 minutes (down from 60+) — awaiting test results

## Pricing Engine Rebuild — April 15, 2026
- [x] BUILD: Hardcoded cost reference table (~80-100 items for CSI 02, 03, 31, 32) — shared/costTable.ts
- [x] BUILD: Cost lookup engine — fuzzy keyword match + CSI division match — server/costLookup.ts
- [x] BUILD: Smart pricing logic — materialOnly vs installed based on companion formwork/rebar items
- [x] FIX: Rewire extraction prompt to set unitCost=1 (cost table handles pricing)
- [x] FIX: Rewire all LLM prompts (consolidation, lump sum, formwork, rebar) to set unitCost=1
- [x] FIX: Add cost table pricing as Step 6 in postProcessTakeoff pipeline
- [x] FIX: Cross-division dedup — crossDivisionDedup() removes base course/vapor barrier duplicates
- [x] FIX: Rebar quantity validation — validateRebarQuantities() caps at slab SF × 2.2
- [ ] TEST: Verify pricing against Crystal Car Wash manual benchmark ($175,810) — awaiting re-test

## Pricing Recalibration — Material Only (April 15, 2026)
- [x] CLARIFICATION: ConstructLine is a MATERIAL takeoff tool — unit costs = material cost only, no labor
- [x] FIX: Recalibrate entire cost table to material-only pricing (concrete = ready-mix $/CY, rebar = bar $/LF, etc.)
- [x] FIX: Remove materialOnly vs installed distinction — everything is material-only (single materialCost field)
- [x] FIX: Update cost lookup to use single price field (findBestMatch no longer needs allItems)
- [ ] TEST: Re-verify against Crystal Car Wash benchmark — awaiting re-test

## Timing Logs + Markup Calculator — April 15, 2026
- [x] FEATURE: Pipeline timing instrumentation — logs elapsed seconds for Pass 1 (indexing), Pass 2 (extraction), Pass 3 (post-processing), and total
- [x] FEATURE: Markup calculator — "Bid Calculator" button in items toolbar, 5 adjustable % fields (labor, overhead, profit, bonds, contingency), real-time bid total
- [ ] FEATURE: Show timing summary in project status/completion UI — timing is in server logs for now, can surface to UI later

## Scope Filter Bug Fix — April 15, 2026
- [x] BUG: hardScopeFilter not removing CSI 04, 05, 07, 22, 26 — root cause: filter only ran during Consolidate & Enhance, not at extraction time. Pre-consolidation view showed raw extracted items before filter ran.
- [x] FIX: Diagnosed — regex patterns match correctly, filter logic is sound
- [x] FIX: Apply scope filter at extraction time (in takeoffAI.ts) — items from excluded divisions now filtered BEFORE saving to DB, so pre-consolidation view is already clean
- [x] FIX: hardScopeFilter exported from takeoffPostProcess.ts, imported in takeoffAI.ts (no circular dependency)

## Gap Fixes — April 15, 2026 (Round 5 Comparison)
- [ ] BUG: Formwork not generating — 0 formwork items in latest run despite 20+ in client manual takeoff
- [ ] BUG: F-1 and F-2 spread footing concrete quantities missing (client has 1.67 CY and 2.11 CY)
- [ ] BUG: Building backfill missing — client has 28.99 CY, ConstructLine has 0

## Drawing Viewer Bugs + User Cost Upload — April 15, 2026
- [x] BUG: Zoom magnifier icon does nothing (was closing modal before, now does nothing)
- [x] BUG: X button in fullscreen drawing view does not close — user must refresh page
- [x] BUG: Fullscreen exit broken — no way to escape without page refresh
- [x] FEATURE: User cost data upload — CSV/Excel with their own unit costs, matched to takeoff items per project
- [x] FEATURE: Drawing markup / annotation in fullscreen view (like PlanSwift)
- [ ] FEATURE: Quick Scope templates — pre-built scope descriptions for common scopes

## Drawing Markup Tool — April 15, 2026
- [x] FEATURE: DrawingMarkup canvas component (pen, rectangle, circle, measure, text labels, undo/redo, export)
- [x] FEATURE: Integrate markup toolbar into fullscreen drawing viewer in ItemDetailModal

## Manual Item Entry + Measurement Tool — April 15, 2026
- [x] FEATURE: Manual add line item under any CSI division (description, qty, unit, unit cost, notes)
- [ ] FEATURE: Scale-calibrated measurement tool in fullscreen drawing viewer (calibrate scale, draw shapes, get real-world dimensions fed into quantity)

## Markup Tool Improvements — April 15, 2026
- [x] FEATURE: Click-to-click line tool (click start → preview → click end, instead of click-and-drag)
- [x] FEATURE: Scale calibration — set reference distance on drawing, all measurements show real-world units (ft, m) instead of px
- [x] FEATURE: Set Scale button in toolbar with unit selector

## Markup Persistence + Export + Quantity Push — April 15, 2026
- [x] BUG FIX: PNG export must include annotations overlaid on drawing (currently downloads clean drawing only)
- [x] FEATURE: Persist markup annotations per sheet to database (survive page reload)
- [x] FEATURE: Push calibrated measurement directly into line item quantity field

## Markup Mode Zoom/Pan Fix — April 15, 2026
- [x] BUG: Cannot zoom/pan while in markup mode — must exit to pan mode first
- [x] BUG: Switching from markup mode back to pan mode loses all annotations
- [x] FEATURE: Scroll-wheel zoom works in markup mode
- [x] FEATURE: Hold spacebar to pan while in markup mode (standard drawing tool UX)

## Markup Coordinate Fix — April 15, 2026
- [x] BUG: Drawn shapes move with zoom/pan instead of staying anchored to the drawing image — fixed by converting all shapes to image-space coordinates, matching CSS center-origin transform, and accounting for object-fit:contain padding

## Area Polygon Measurement Tool — April 15, 2026
- [x] FEATURE: Add "polygon" shape type to markup types (array of points, closed shape)
- [x] FEATURE: Click-to-click polygon drawing in MarkupCanvas (click to add vertices, double-click or close-to-start to finish)
- [x] FEATURE: Render filled polygon with semi-transparent fill and stroke outline
- [x] FEATURE: Live area calculation using Shoelace formula, displayed in calibrated units (SF, m², etc.)
- [x] FEATURE: Add polygon tool button to MarkupToolbar
- [x] FEATURE: Push polygon area measurement to line item quantity field
- [x] FEATURE: Polygon rendering in renderShapes.ts for canvas and PNG export

## Annotation Persistence Bug — April 16, 2026
- [x] BUG: Annotations disappear when exiting markup mode — fixed by loading markups from DB on modal open and auto-saving on changes

## Markup Persistence & Editing Issues — April 16, 2026
- [x] BUG: Markups disappear when toggling between markup and pan modes — fixed by loading once on modal open, not on every mode toggle
- [x] FEATURE: Click on existing markups to select and edit them — added select tool, shape selection on click
- [x] FEATURE: Delete selected markup — added delete button in toolbar, keyboard shortcut support

## Markup Visibility Bug — April 16, 2026
- [x] BUG: Annotations vanish when switching from markup mode to pan mode — removed `return null` gate, canvas always renders
- [x] BUG: Annotations don't appear when opening a drawing until user clicks a tool — removed duplicate query, consolidated to single eager load
- [x] FIX: Always render annotation overlay canvas (read-only in pan mode with pointerEvents:none), load markups eagerly on modal open

## Shape Selection & Editing — April 16, 2026
- [x] FEATURE: Visual selection highlight (glow/outline) on selected shapes — blue dashed outline + handles
- [x] FEATURE: Hit-testing — click on shapes in select mode to select them — full hit-test for all shape types
- [x] FEATURE: Grab and move any shape (drag from body)
- [x] FEATURE: Grab and adjust existing line endpoints (drag from handle dots)
- [x] UX: Move calibration instruction text from bottom to top of drawing (out of scale bar area)

## Polygon Vertex Editing — April 16, 2026
- [x] FEATURE: Drag individual polygon vertices to reshape area measurements after drawing
- [x] BONUS: Rectangle corner dragging for resizing
- [x] BONUS: Larger white/blue vertex handles for better visibility and easier grabbing

## Toolbar Polish — April 17, 2026
- [x] FEATURE: Apply color/width changes to already-selected shape (not just new shapes)
- [x] BUG: Two confusing delete/trash icons — delete selected = red Trash2 (only shows when selected), clear all = Eraser icon with confirmation dialog
- [x] FEATURE: Coalesce drag operations into single undo entry (beginDrag/commitDrag pattern)

## Snap-to-Edge & Measurement Summary — April 17, 2026
- [x] FEATURE: Snap-to-edge for line endpoints — auto-snap to nearby shape edges (rectangles, polygons, other lines) during drawing
- [x] FEATURE: Snap-to-edge for polygon vertices too
- [x] FEATURE: Visual snap indicator (amber crosshair + highlighted edge) when snapping is active
- [x] FEATURE: Measurement summary panel — collapsible panel with running totals of all line distances and polygon areas
- [x] FEATURE: Summary panel expands to show individual measurements with labels (L1, L2, A1, A2, etc.)

## Count Tool & CSV Export — April 17, 2026
- [x] FEATURE: Count tool — tap-to-place numbered markers on drawings (colored circles with auto-incrementing numbers)
- [x] FEATURE: Count markers rendered as numbered circles with sequential numbering
- [x] FEATURE: Count tool button in MarkupToolbar with keyboard shortcut (N)
- [x] FEATURE: Count tally displayed in MeasurementSummary panel (purple section)
- [x] FEATURE: Measurement export to CSV — export all line distances, polygon areas, and counts as spreadsheet
- [x] FEATURE: CSV download button in MeasurementSummary expanded panel

## Count Marker Labels & Color Grouping — April 17, 2026
- [x] FEATURE: Add label field to CountShape (e.g., "Outlet", "Window", "Fixture")
- [x] FEATURE: Label input in toolbar when count tool is active, reuses same label for subsequent taps
- [x] FEATURE: Render label text below count marker circle on canvas
- [x] FEATURE: Counts numbered within label group (Outlet #1, #2, etc.)
- [x] FEATURE: Group counts by label in MeasurementSummary (e.g., "Outlets: 12, Windows: 8")
- [x] FEATURE: CSV export groups counts by label with subtotals per color
- [x] FEATURE: Group all measurements by color in summary panel with color swatches
- [x] FEATURE: Lines, areas, and counts organized by color so different trades can use different colors

## Count Tool Bugs — April 17, 2026
- [x] BUG: Keyboard shortcuts hijack label input — fixed by skipping shortcuts when INPUT/TEXTAREA/SELECT is focused
- [x] BUG: Count numbering restarts at 1 — fixed by continuing from highest existing number for that label (not just count of elements)

## Edit Count Marker Labels — April 17, 2026
- [x] FEATURE: Select an existing count marker with select tool, show amber label input in toolbar to add/change its label
- [x] FEATURE: Unlabeled counts can be retroactively labeled after placement — label updates in real-time on canvas

## Modal Preview Annotations & Count Improvements — April 17, 2026
- [x] BUG: Annotations not visible in modal preview — only show in fullscreen, making users think markups are lost
- [x] FEATURE: Render read-only annotation overlay on drawing in modal preview (canvas overlay with renderAllShapes, matching zoom/pan transform)
- [x] FEATURE: Batch-label unlabeled counts — purple "Label N unlabeled" button in toolbar, window.prompt for label, replaceElements batch update with toast
- [x] FEATURE: Count marker size scaling — markers maintain consistent screen-space size regardless of zoom (radius/fontSize divided by zoom factor)

## Multi-Sheet Measurement Rollup — April 17, 2026
- [x] FEATURE: Backend endpoint to fetch all sheet markups for a takeoff run (getProjectMarkups — joins sheetMarkups + drawingSheets)
- [x] FEATURE: Multi-sheet rollup summary panel — aggregate lines, areas, counts across all sheets
- [x] FEATURE: Rollup grouped by color and label, with per-sheet breakdown
- [x] FEATURE: Rollup CSV export — single spreadsheet with all sheets' measurements, sheet name column, totals row
- [x] FEATURE: Integrate rollup panel into takeoff results page (Measurements button in items tab toolbar)

## Bug Fix — April 17, 2026
- [x] BUG: Markup-to-line-item quantity update feature is missing — restored via MarkupMeasurementStrip below drawing in modal with Apply buttons for lines/areas/counts, plus fullscreen still has the toolbar push-to-quantity button

## Auto-Match Measurements & History Tracking — April 17, 2026
- [x] SCHEMA: Create measurement_history table to log when measurements are applied to items (itemId, sheetId, measurementType, rawValue, unit, appliedBy, appliedAt)
- [x] DB: Add measurement history CRUD helpers (logMeasurementApply, getItemMeasurementHistory, getItemsWithMeasurementHistory)
- [x] BACKEND: Add tRPC endpoints for logging measurement applies and fetching history (logMeasurementApply, getItemMeasurementHistory, getItemsWithMeasurements)
- [x] BACKEND: Auto-match logic implemented client-side via suggestedMeasurementType() — matches item unit to measurement type (LF→lines, SF→areas, EA→counts)
- [x] FRONTEND: Auto-suggest matching measurement type in MarkupMeasurementStrip based on item unit
- [x] FRONTEND: Highlight the recommended Apply button with ring/border emphasis and Sparkles icon + "Suggested" label
- [x] FRONTEND: Log measurement applies to history when user clicks Apply (via logMeasurementApply mutation)
- [x] FRONTEND: Show measurement history timeline in item detail modal with type icons, values, sheet names, and relative timestamps
- [x] FRONTEND: Show "Verified via Measurement" badge (blue CheckCircle2) on items that have measurement history

## Beta Launch Prep — April 17, 2026

### Verified Column in Items Table
- [x] Add "Verified" indicator column to the takeoff items table showing which items have measurement history
- [x] Query getItemsWithMeasurements to get list of verified item IDs (verifiedSet)
- [x] Show Ruler icon in blue for verified items, dash for unverified

### Feedback Widget
- [x] SCHEMA: Create feedback table (memberId, memberName, message, screenshotUrl, page, userAgent, category, status, adminNotes, createdAt)
- [x] DB: Add feedback CRUD helpers (feedbackDb.ts)
- [x] BACKEND: Add tRPC endpoints (feedbackRouter.ts — submit, list, get, updateStatus, delete)
- [x] FRONTEND: Floating feedback button (bottom-right corner) with modal (FeedbackWidget.tsx)
- [x] FRONTEND: Screenshot capture using html2canvas
- [x] FRONTEND: Feedback submission form with message, category selector, optional screenshot
- [x] ADMIN: Feedback viewer page in admin portal (AdminFeedback.tsx) with status cards, category filters, detail dialog, admin notes, screenshot viewer

### Guided Onboarding Tour
- [x] Install react-joyride v3 for product tour functionality
- [x] Create tour steps configuration targeting dashboard, sidebar nav, and quick links (6 steps)
- [x] Track tour completion per user (localStorage key: alp-portal-tour-completed)
- [x] Show tour automatically on first login; useResetTour() hook exported for replay from settings

## Bug Fixes — April 17, 2026 (Part 2)
- [x] BUG: Onboarding tour overlay blocks entire UI — tour targets not found on non-dashboard pages, overlay stays dark with no tooltips
- [x] FIX: Scope onboarding tour to only run on the portal dashboard page where targets exist
- [x] FIX: Add graceful fallback when tour targets are missing (skip or abort tour via TARGET_NOT_FOUND handler)
- [x] BUG: Feedback button visible on entire site — should only show on ConstructLine/Takeoff pages
- [x] FIX: Scope FeedbackWidget to only render on /portal/constructline/* and /portal/takeoff/* routes

## Fixes & Features — April 17, 2026 (Part 3)
- [x] FIX: Verified column now shows emerald checkmark when item.reviewed is true (from checkmark/approve action), not measurement history
- [x] BUG: Onboarding tour not showing — fixed: bumped storage key to v2 (old broken tour set completion flag), added loading guard, longer DOM wait, console logging, better TARGET_NOT_FOUND handling
- [x] FEATURE: Add "Restart Tour" button in sidebar profile area (RotateCcw icon, above Sign Out)
- [x] FEATURE: Email notification via Resend when feedback is submitted (to marshall@marshallwilkinson.com) — sendFeedbackNotification in email.ts, fire-and-forget in feedbackRouter submit

## Bug Fixes & Features — April 17, 2026 (Part 4)
- [x] BUG: Feedback screenshot capture shows "Failed" — improved html2canvas with dynamic import, allowTaint, ignoreElements for iframes, lower quality for smaller payload
- [x] BUG: Feedback submission fails — root cause: feedbackRouter used ctx.req.user instead of ctx.user (tRPC context). Rewrote to use ctx.user consistently
- [x] BUG: Feedback email notification not being received — was blocked by the submission failure; now fixed with correct auth
- [x] FEATURE: Takeoff-specific onboarding tour — two-part: TakeoffList tour (New Project + project grid) and TakeoffDetail tour (upload, analyze, settings, sheets, tabs, summary bar, consolidate). data-tour attributes added to all key elements. Restart Tour button resets both portal and takeoff tours.
- [x] FIX: FeedbackWidget route scoping now also includes /takeoff/:id pages (was missing the non-portal route)

- [x] BUG: Feedback screenshot capture failing — replaced html2canvas complexity with simple file upload (users upload their own screenshot via file input, max 5MB, validates image type)

## Markup Mode UX Fixes & Trade Specialty Infrastructure — April 17, 2026

### Markup Mode UX Fixes (Blocking)
- [x] BUG: Pan functionality missing in markup mode — fixed: MarkupCanvas z-index lowered to 15, zoom controls raised to z-30, spacebar+drag now works
- [x] BUG: Measurements panel covers zoom controls — moved to top-left (left-4 z-30), removed hardcoded absolute positioning from MeasurementSummary component
- [x] BUG: Zoom control buttons don't respond to clicks — fixed: zoom controls now z-30 (above canvas z-15), pointer-events working correctly

### Trade Specialty Infrastructure
- [x] FEATURE: Build trade specialty taxonomy — 18 specialties across 8 CSI divisions (03 Concrete, 04 Masonry, 05 Metals, 07 Roofing, 08 Openings, 09 Finishes, 21 Fire Suppression, 23 HVAC, 26 Electrical, 32 Sitework) with 100+ specialty-specific line items
- [x] FEATURE: Auto-detect specialty from drawing context — keyword matching against detection signals after Pass 1 indexing, stores detectedSpecialties on project
- [x] FEATURE: Specialty-aware AI prompts — buildSpecialtyPromptInjection() injects construction notes + additional line items into system prompt
- [x] FEATURE: Specialty selector in takeoff UI — new SpecialtySelector component in PreAnalysisModal (step 3 of 5) and ProjectSettingsPanel, with auto-detect badges
- [x] FEATURE: Concrete tilt-up specialty — casting bed area, lift inserts, crane/rigging, temporary bracing, panel connections, joint sealant, curing compound
- [x] FEATURE: Concrete cast-in-place specialty — formwork, reinforcement, curing, finishing, expansion joints, waterstops, concrete pumping
- [x] FEATURE: Concrete precast specialty — erection/setting, grouting, welded connections, caulking, temporary bracing, crane/rigging
- [x] FEATURE: Concrete post-tension specialty — PT strand/cable, anchorages, stressing, grouting, pour strips
- [x] FEATURE: Additional specialties: Masonry CMU/Brick Veneer, Structural Steel/Steel Joists, TPO/Metal Roofing, Curtain Wall, Drywall, Wet Pipe Fire Suppression, Kitchen Hood/VRF HVAC, Power Distribution/Solar PV Electrical, Paving Sitework
- [x] BUG: Drag/pan not working in markup mode — ROOT CAUSE: container used onMouseDown but MarkupCanvas (z-15) used onPointerDown, blocking events. FIX: (1) Pass spaceHeld as isPanning to MarkupCanvas so canvas disables pointer-events when space held, (2) Convert container to onPointerDown for consistency, (3) Container only starts drag when markupActive && spaceHeld, (4) Cursor shows grab when space held

## ConstructLine Branding Consistency Pass — April 17, 2026

### Sidebar Navigation Renaming
- [x] Rename "Scheduler" → "CPM Schedule" in sidebar nav
- [x] Rename "Takeoff" → "Quantity Takeoff" in sidebar nav
- [x] Replace generic sidebar icons — GanttChart for CPM Schedule, Ruler for Quantity Takeoff, Database for Cost Library
- [x] C1/C2/C3 versioning reserved for CPM Schedule product versions (like Primavera P3/P6), not module labels

### Branding Styling
- [x] Created reusable ConstructLineBrand.tsx component (ConstructLineWordmark, ConstructLineInline)
- [x] Applied branded Construct+Line styling across all 13 files (sidebar, headers, processing overlay, modals, empty states, feedback widget, onboarding tours)
- [x] Fixed processing overlay — "ConstructLine is Working" now uses branded white+amber split
- [x] Fixed "ConstructLine Analyze Drawings" button — branded styling on blue/amber gradient button
- [x] Branded all text references in TakeoffList, TakeoffDetail, CostLibrary, PreAnalysisModal, ProjectSettingsPanel, FeedbackWidget, OnboardingTour

## ConstructLine Splash Animation — April 17, 2026
- [x] FEATURE: Branded splash animation on ProcessingOverlay — 3-phase intro (enter with blur/scale, hold with glow pulse + expanding rings, exit with fade) then transitions to working state

## CPM Schedule Settings Button Fix — April 17, 2026
- [x] FIX: Settings button alignment — wrapped in flex-col structure matching other toolbar groups, added Settings label underneath
- [x] FEATURE: Settings button visual emphasis — amber border/bg/text/shadow matching Calculate button style

## Multiple Fixes — April 17, 2026 (Batch 2)
- [x] FIX: Specialty modal — added green callout box "You can skip this step entirely" with explanation that ConstructLine engine auto-detects
- [x] FIX: Replaced all user-facing "AI" references with "ConstructLine engine" (OnboardingTour, TakeoffOnboardingTour, SpecialtySelector, PreAnalysisModal, TakeoffDetail)
- [x] FIX: Splash screen timing — stabilized onComplete ref to prevent timer reset, extended hold phase to 4.1s total
- [x] AUDIT: CPM Schedule confirmed — Resource Leveling (full implementation with calendar-aware work day counting), Cost Loading (ResourcePanel with budgeted/actual costs), Earned Value Tracking (BCWP/BCWS/ACWP/SPI/CPI/EAC/ETC/VAC + S-curve) all fully implemented
- [x] FIX: Cost Library hidden from non-admin members — page-level guard redirects non-admins to /portal (sidebar already admin-only)
- [x] FEATURE: What's New changelog modal — branded component with 3 changelog entries (Trade Specialty Intelligence, Measurement Tools, Consolidate & Enhance), auto-shows on first login, manual trigger in sidebar
- [ ] ANALYSIS: Cost optimization and pricing per user

## What's New Modal UX Fixes — April 17, 2026
- [ ] BUG: ScrollArea not working — content doesn't scroll even though there's more below
- [ ] BUG: "Got it" button doesn't close modal — users have to click X
- [ ] BUG: Badge overlap in highlights — "new"/"improved" tags overlapping with description text, needs better spacing

## PreAnalysisModal Badge Overlap — April 17, 2026
- [ ] BUG: Specialty selector badges overlapping with text (e.g., "47-13" overlapping "Tilt-Up Concrete")

## CPM Schedule Feature Parity — April 17, 2026
- [ ] FEATURE: Layout save override — when saving with same name as existing layout, update instead of creating duplicate
- [ ] FEATURE: Expand All / Collapse All for WBS groups — toolbar buttons + keyboard shortcuts (Ctrl+Click like P6)
- [ ] FEATURE: Custom Activity Codes — create code categories, assign to activities, filter/sort/group by codes

## CPM Schedule PDF Print Fix — April 17, 2026
- [ ] BUG: PDF print preview cuts off activity descriptions for activities toward end of schedule — should match on-screen compressed view at any zoom level (50%, 75%, fit-to-page)

## Batch 4 — User-Reported Issues (Apr 17, 2026)
- [x] Fix "New" badge overlap on Trade Specialties step in PreAnalysisModal
- [x] Improve Layout Save Override UX — save in place for current layout, Save As New for creating a new one
- [x] Add text labels to Expand/Collapse All WBS buttons (not just icons)
- [x] Fix PDF label truncation — activity descriptions still cut off on right side
- [x] Clarify or remove Auto-Assign Submittal/Fab WBS from Group dropdown
- [x] Wire Activity Code Manager into Scheduler toolbar (Settings menu)
- [x] Add activity code assignment UI to activity detail panel
- [x] Activity codes: create custom codes, assign to activities, filter/group by them

## Batch 5 — User-Reported Issues (Apr 17, 2026)
- [x] Fix toolbar overflow — Expand All / Collapse All text labels too wide, pushing Month button off screen
- [x] Fix PDF label truncation — activity descriptions still cut off on right side of Gantt, need fundamental approach
- [x] Improve Activity Code Manager UX — make it clearer these are fully custom user-created codes, not pre-populated
- [x] Add activity code categories to Group By dropdown so users can group by custom codes

## Batch 6 — User-Reported Issues (Apr 17, 2026)
- [x] Fix Gantt Display Settings modal overflow — make wider not taller so all content fits
- [x] WBS Manager — add ability to create new WBS nodes (not just edit existing)
- [x] Reports PDF branding — show schedule name or ConstructLine instead of "ALP Contractor Circle"
- [x] Reports print preview Cancel/X not closing — user has to refresh page to exit
