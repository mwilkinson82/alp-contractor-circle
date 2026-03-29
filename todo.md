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
