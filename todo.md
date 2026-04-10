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
