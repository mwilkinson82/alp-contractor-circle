import { boolean, decimal, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing Manus auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Members table — Contractor Circle members who authenticate via Discord.
 * Links Discord identity to Stripe subscription for access control.
 */
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  /** Discord user ID (snowflake) */
  discordId: varchar("discordId", { length: 64 }).notNull().unique(),
  /** Discord username */
  discordUsername: varchar("discordUsername", { length: 128 }),
  /** Discord display name */
  discordDisplayName: text("discordDisplayName"),
  /** Discord avatar hash (construct URL: https://cdn.discordapp.com/avatars/{id}/{hash}.png) */
  discordAvatar: varchar("discordAvatar", { length: 256 }),
  /** Email from Discord */
  email: varchar("email", { length: 320 }),
  /** Stripe customer ID — set when member subscribes */
  stripeCustomerId: varchar("stripeCustomerId", { length: 128 }),
  /** Stripe subscription ID — active subscription */
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 128 }),
  /** Subscription status: active, canceled, past_due, trialing, etc. */
  subscriptionStatus: mysqlEnum("subscriptionStatus", [
    "active",
    "canceled",
    "past_due",
    "trialing",
    "incomplete",
    "none",
  ]).default("none").notNull(),
  /** Member role within the circle */
  memberRole: mysqlEnum("memberRole", ["member", "founding_member", "admin"]).default("member").notNull(),
  /** Preferred currency for ConstructLine takeoffs */
  preferredCurrency: varchar("preferredCurrency", { length: 8 }),
  /** Company name — used in PDF headers/footers and profile */
  companyName: varchar("companyName", { length: 255 }),
  /** Company logo URL (S3) — used in PDF headers and profile */
  companyLogo: varchar("companyLogo", { length: 512 }),
  /** Whether the member has completed the CPM Scheduler onboarding tour */
  cpmOnboardingDone: boolean("cpmOnboardingDone").default(false).notNull(),
  /** Whether the Smith Residence template schedule has been seeded into this member's account (runs once on first login) */
  scheduleSeeded: boolean("scheduleSeeded").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

/**
 * Replays table — Contractor Circle call recordings hosted on Cloudflare Stream.
 *
 * Workflow:
 * 1. Download Zoom recording after each Thursday call
 * 2. Upload to Cloudflare Stream (get the video ID)
 * 3. Add entry here via the admin panel or tRPC mutation
 * 4. Members can watch in the portal Replay Library
 */
export const replays = mysqlTable("replays", {
  id: int("id").autoincrement().primaryKey(),
  /** Title shown in the library */
  title: varchar("title", { length: 256 }).notNull(),
  /** Short description */
  description: text("description"),
  /** Category for filtering */
  category: mysqlEnum("category", [
    "weekly_calls",
    "bootcamp",
    "masterclass",
    "q_and_a",
  ]).default("weekly_calls").notNull(),
  /**
   * Cloudflare Stream video ID.
   * Embed URL: https://iframe.videodelivery.net/{cloudflareStreamId}
   * Thumbnail URL: https://videodelivery.net/{cloudflareStreamId}/thumbnails/thumbnail.jpg
   */
  cloudflareStreamId: varchar("cloudflareStreamId", { length: 128 }).notNull(),
  /** Duration string e.g. "1h 24m" */
  duration: varchar("duration", { length: 32 }),
  /** Date of the call/session */
  callDate: timestamp("callDate").notNull(),
  /** Whether to feature this replay at the top of the library */
  featured: boolean("featured").default(false).notNull(),
  /** Whether this replay is published (visible to members) */
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Replay = typeof replays.$inferSelect;
export type InsertReplay = typeof replays.$inferInsert;

/**
 * Call questions table — members submit questions before each bi-weekly call.
 * Marshall reviews and selects which ones to address live or in the monthly bootcamp.
 */
export const callQuestions = mysqlTable("call_questions", {
  id: int("id").autoincrement().primaryKey(),
  /** Member who submitted the question */
  memberId: int("memberId").notNull(),
  /** The question text */
  question: text("question").notNull(),
  /** Optional context/background */
  context: text("context"),
  /** Status of the question */
  status: mysqlEnum("status", [
    "pending",
    "selected_for_call",
    "selected_for_bootcamp",
    "answered",
    "archived",
  ]).default("pending").notNull(),
  /** Admin notes (visible only to Marshall) */
  adminNotes: text("adminNotes"),
  /** Which call cycle this was submitted for (ISO date string of the call date) */
  callCycle: varchar("callCycle", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CallQuestion = typeof callQuestions.$inferSelect;
export type InsertCallQuestion = typeof callQuestions.$inferInsert;

/**
 * Bootcamp topics table — members submit topic suggestions for the monthly bootcamp.
 * Marshall reviews and selects one or more topics for the deep-dive session.
 */
export const bootcampTopics = mysqlTable("bootcamp_topics", {
  id: int("id").autoincrement().primaryKey(),
  /** Member who submitted the topic */
  memberId: int("memberId").notNull(),
  /** The topic title/name */
  topic: varchar("topic", { length: 512 }).notNull(),
  /** Why this topic matters — optional context */
  reason: text("reason"),
  /** Which bootcamp date this was submitted for (ISO date string) */
  bootcampDate: varchar("bootcampDate", { length: 32 }).notNull(),
  /** Status of the topic */
  status: mysqlEnum("status", [
    "submitted",
    "selected",
    "not_selected",
  ]).default("submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BootcampTopic = typeof bootcampTopics.$inferSelect;
export type InsertBootcampTopic = typeof bootcampTopics.$inferInsert;

/**
 * Email subscribers table — captures emails from the homepage email capture form.
 * Used for marketing campaigns and pre-launch notifications.
 */
export const emailSubscribers = mysqlTable("email_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  /** Email address */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Source of subscription (e.g., 'homepage_capture') */
  source: varchar("source", { length: 64 }).default("homepage_capture").notNull(),
  /** Whether the email has been verified */
  verified: boolean("verified").default(false).notNull(),
  /** Timestamp when subscribed */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  /** Last updated */
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSubscriber = typeof emailSubscribers.$inferSelect;
export type InsertEmailSubscriber = typeof emailSubscribers.$inferInsert;

// ─── CPM Schedule Builder ────────────────────────────────────────────────────

/**
 * Schedules table — each member can have multiple project schedules.
 * A schedule is the top-level container for activities, codes, and baselines.
 */
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner (member ID from members table) */
  memberId: int("memberId").notNull(),
  /** Schedule name e.g. "123 Main St Renovation" */
  name: varchar("name", { length: 256 }).notNull(),
  /** Optional description */
  description: text("description"),
  /** Project start date */
  projectStartDate: timestamp("projectStartDate").notNull(),
  /** Data date — the "as-of" date for CPM calculations (independent of today) */
  dataDate: timestamp("dataDate"),
  /** Run date — timestamp of last CPM recalculation (audit trail, not shown on Gantt) */
  lastCalculatedAt: timestamp("lastCalculatedAt"),
  /** Default calendar for this schedule (references project_calendars.id) */
  defaultCalendarId: int("defaultCalendarId"),
  /** Status */
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  /** Which template this was created from (null if blank) */
  templateId: varchar("templateId", { length: 64 }),
  /** Activity ID prefix (e.g. E for electrical, P for plumbing) */
  activityIdPrefix: varchar("activityIdPrefix", { length: 10 }).default("A").notNull(),
  /** Activity ID starting number (e.g. 1, 100, 1000) */
  activityIdStart: int("activityIdStart").default(1).notNull(),
  /** Activity ID interval/increment (e.g. 1, 5, 10) */
  activityIdInterval: int("activityIdInterval").default(1).notNull(),
  /** Next activity ID number to assign (e.g. 1010, 1020) */
  activityIdNext: int("activityIdNext").default(1).notNull(),
  /** Custom bar color for critical path activities (hex, e.g. #ef4444). Null = global default red */
  criticalBarColor: varchar("criticalBarColor", { length: 16 }),
  /** Custom bar color for non-critical activities (hex, e.g. #22c55e). Null = global default green */
  normalBarColor: varchar("normalBarColor", { length: 16 }),
  /** Per-schedule project name override (for PDF headers) */
  projectName: varchar("projectName", { length: 256 }),
  /** Client name for this schedule (for PDF headers) */
  clientName: varchar("clientName", { length: 256 }),
  /** Contract number for this schedule (for PDF headers) */
  contractNumber: varchar("contractNumber", { length: 128 }),
  /** Per-schedule company name override (null = use member.companyName) */
  companyNameOverride: varchar("companyNameOverride", { length: 255 }),
  /** Per-schedule company logo override URL (null = use member.companyLogo) */
  companyLogoOverride: varchar("companyLogoOverride", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

/**
 * Activities table — individual tasks/activities within a schedule.
 * Each activity has a duration and can be assigned activity codes.
 */
export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Activity ID shown to user (e.g. "A1010", "A1020") */
  activityId: varchar("activityId", { length: 32 }).notNull(),
  /** Activity name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Duration in work days */
  duration: int("duration").notNull().default(1),
  /** WBS path for grouping (e.g. "1.0", "1.1", "2.0") */
  wbs: varchar("wbs", { length: 64 }),
  /** Percent complete (0-100) */
  percentComplete: decimal("percentComplete", { precision: 5, scale: 2 }).default("0.00").notNull(),
  /** Actual start date (null if not started) */
  actualStart: timestamp("actualStart"),
  /** Actual finish date (null if not finished) */
  actualFinish: timestamp("actualFinish"),
  /** Computed: earliest start (set by CPM engine on server) */
  earlyStart: timestamp("earlyStart"),
  /** Computed: earliest finish */
  earlyFinish: timestamp("earlyFinish"),
  /** Computed: latest start */
  lateStart: timestamp("lateStart"),
  /** Computed: latest finish */
  lateFinish: timestamp("lateFinish"),
  /** Computed: total float in work days */
  totalFloat: int("totalFloat"),
  /** Computed: free float in work days */
  freeFloat: int("freeFloat"),
  /** Whether this activity is on the critical path */
  isCritical: boolean("isCritical").default(false).notNull(),
  isOnLongestPath: boolean("isOnLongestPath").default(false).notNull(),
  /** Sort order within the schedule */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** Calendar override for this activity (null = use schedule default) */
  calendarId: int("calendarId"),
  /** Custom bar color for Gantt (hex, e.g. "#FF0000"). Null = auto (red=critical, green=non-critical) */
  barColor: varchar("barColor", { length: 16 }),
  /** WBS node ID (references schedule_wbs.id) */
  wbsId: int("wbsId"),
  /** Activity type: task (regular bar) or milestone (diamond, 0 duration) */
  activityType: varchar("activityType", { length: 16 }).default("task").notNull(),
  /** Constraint type for scheduling (e.g. ASAP, SNET, SNLT, FNET, FNLT, MSO, MFO) */
  constraintType: varchar("constraintType", { length: 16 }).default("ASAP").notNull(),
  /** Constraint date (used with SNET, SNLT, FNET, FNLT, MSO, MFO) */
  constraintDate: timestamp("constraintDate"),
  /** Optional notes */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferInsert;

/**
 * WBS (Work Breakdown Structure) nodes — hierarchical tree structure for organizing activities.
 * e.g. 1.0 Sitework → 1.1 Clearing → 1.2 Grading, 2.0 Foundation → 2.1 Excavation → 2.2 Footings
 */
export const scheduleWbs = mysqlTable("schedule_wbs", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Parent WBS node (null = top level) */
  parentId: int("parentId"),
  /** WBS code e.g. "1.0", "1.1", "2.0" */
  code: varchar("code", { length: 32 }).notNull(),
  /** WBS name e.g. "Sitework", "Foundation" */
  name: varchar("name", { length: 256 }).notNull(),
  /** Sort order within parent */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** Custom background color for group header (hex format, e.g. "#FF6B6B") */
  groupColor: varchar("groupColor", { length: 7 }).default("#3B82F6"),
  /** Custom text color for group header (hex format, e.g. "#FFFFFF") */
  groupTextColor: varchar("groupTextColor", { length: 7 }).default("#FFFFFF"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduleWbs = typeof scheduleWbs.$inferSelect;
export type InsertScheduleWbs = typeof scheduleWbs.$inferInsert;

/**
 * Activity relationships (logic ties) — defines predecessor/successor links.
 * Supports FS, SS, FF, SF with optional lag (positive) or lead (negative).
 */
export const activityRelationships = mysqlTable("activity_relationships", {
  id: int("id").autoincrement().primaryKey(),
  /** The schedule this relationship belongs to */
  scheduleId: int("scheduleId").notNull(),
  /** Predecessor activity ID (DB id) */
  predecessorId: int("predecessorId").notNull(),
  /** Successor activity ID (DB id) */
  successorId: int("successorId").notNull(),
  /** Relationship type */
  relationshipType: mysqlEnum("relationshipType", ["FS", "SS", "FF", "SF"]).default("FS").notNull(),
  /** Lag in work days (negative = lead) */
  lagDays: int("lagDays").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityRelationship = typeof activityRelationships.$inferSelect;
export type InsertActivityRelationship = typeof activityRelationships.$inferInsert;

/**
 * Activity code categories — user-defined classification dimensions.
 * e.g. "Responsibility", "Area", "Trade", "Phase", "Priority"
 */
export const activityCodeCategories = mysqlTable("activity_code_categories", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Category name e.g. "Responsibility" */
  name: varchar("name", { length: 128 }).notNull(),
  /** Sort order */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityCodeCategory = typeof activityCodeCategories.$inferSelect;
export type InsertActivityCodeCategory = typeof activityCodeCategories.$inferInsert;

/**
 * Activity code values — the individual values within a category.
 * e.g. Under "Trade": "Concrete", "Framing", "Electrical", "Plumbing"
 */
export const activityCodeValues = mysqlTable("activity_code_values", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent category */
  categoryId: int("categoryId").notNull(),
  /** Code value e.g. "Electrical" */
  value: varchar("value", { length: 128 }).notNull(),
  /** Optional color for Gantt display */
  color: varchar("color", { length: 16 }),
  /** Sort order */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityCodeValue = typeof activityCodeValues.$inferSelect;
export type InsertActivityCodeValue = typeof activityCodeValues.$inferInsert;

/**
 * Activity code assignments — links activities to code values (many-to-many).
 * An activity can have one value per category.
 */
export const activityCodeAssignments = mysqlTable("activity_code_assignments", {
  id: int("id").autoincrement().primaryKey(),
  /** The activity */
  activityId: int("activityId").notNull(),
  /** The code value assigned */
  codeValueId: int("codeValueId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityCodeAssignment = typeof activityCodeAssignments.$inferSelect;
export type InsertActivityCodeAssignment = typeof activityCodeAssignments.$inferInsert;

/**
 * Schedule baselines / updates — snapshots of the schedule at a point in time.
 * Type "baseline" = original approved schedule.
 * Type "update" = numbered schedule update (Update 1, Update 2, etc.).
 * Stores the full activity data, relationships, and calendars as JSON for overlay/comparison.
 */
export const scheduleBaselines = mysqlTable("schedule_baselines", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Snapshot name e.g. "Original Baseline", "Update 1", "Update 2" */
  name: varchar("name", { length: 256 }).notNull(),
  /** Type: baseline (original approved) or update (numbered schedule update) */
  snapshotType: mysqlEnum("snapshotType", ["baseline", "update"]).default("baseline").notNull(),
  /** Update number (null for baselines, 1/2/3... for updates) */
  updateNumber: int("updateNumber"),
  /** Data date at the time this snapshot was taken */
  dataDate: timestamp("snapshotDataDate"),
  /** Snapshot of all activities at this point in time (JSON array) */
  activitiesSnapshot: json("activitiesSnapshot").notNull(),
  /** Snapshot of all relationships at this point in time (JSON array) */
  relationshipsSnapshot: json("relationshipsSnapshot").notNull(),
  /** Snapshot of project start date */
  projectStartDate: timestamp("snapshotProjectStartDate"),
  /** Notes about this update (e.g. "Added 2 weeks for weather delay") */
  notes: text("snapshotNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScheduleBaseline = typeof scheduleBaselines.$inferSelect;
export type InsertScheduleBaseline = typeof scheduleBaselines.$inferInsert;

/**
 * Project calendars — named calendars with base work week and custom non-work days.
 * Each schedule can have multiple calendars. Activities can be assigned to specific calendars.
 * e.g. "Standard 5-Day", "7-Day Push Schedule", "Union Calendar"
 */
export const projectCalendars = mysqlTable("project_calendars", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Calendar name e.g. "Standard 5-Day" */
  name: varchar("name", { length: 128 }).notNull(),
  /** Base work week type */
  workWeek: mysqlEnum("workWeek", ["5day", "7day"]).default("5day").notNull(),
  /** Work days bitmask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64. Default 5-day = 31 (Mon-Fri) */
  workDaysMask: int("workDaysMask").default(31).notNull(),
  /** Whether this is the default calendar for the schedule */
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProjectCalendar = typeof projectCalendars.$inferSelect;
export type InsertProjectCalendar = typeof projectCalendars.$inferInsert;

/**
 * Calendar exceptions — specific dates marked as non-work days (holidays, shutdowns, weather days).
 * Can also mark normally non-work days as work days (e.g., Saturday overtime).
 */
export const calendarExceptions = mysqlTable("calendar_exceptions", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent calendar */
  calendarId: int("calendarId").notNull(),
  /** The exception date */
  exceptionDate: timestamp("exceptionDate").notNull(),
  /** Type: holiday (non-work) or workday (override to work) */
  exceptionType: mysqlEnum("exceptionType", ["holiday", "workday"]).default("holiday").notNull(),
  /** Description e.g. "Thanksgiving", "Weather Day", "Saturday OT" */
  description: varchar("description", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalendarException = typeof calendarExceptions.$inferSelect;
export type InsertCalendarException = typeof calendarExceptions.$inferInsert;

/**
 * Templates table — reusable project management templates for the portal.
 * Members can browse and download templates organized by category.
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  /** Template name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Description shown in the template library */
  description: text("description"),
  /** Category for filtering (e.g., "Project Management", "Construction SOPs", "Checklists") */
  category: varchar("category", { length: 128 }).notNull(),
  /** CDN URL to the template file (PDF, DOCX, etc.) */
  url: text("url").notNull(),
  /** File type (e.g., "pdf", "docx", "xlsx") */
  fileType: varchar("fileType", { length: 16 }).default("pdf").notNull(),
  /** Whether this template is featured/highlighted */
  featured: boolean("featured").default(false).notNull(),
  /** Whether this template is published (visible to members) */
  published: boolean("published").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;


// ─── Lead Magnet Captures ──────────────────────────────────────────────────

/**
 * Leads table — captures contact info from lead magnet landing pages.
 * Each lead is tied to a specific lead magnet (source) for tracking.
 */
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  /** First name */
  firstName: varchar("firstName", { length: 128 }).notNull(),
  /** Email address */
  email: varchar("email", { length: 320 }).notNull(),
  /** Which lead magnet they opted into (e.g., 'q1-q2-framework') */
  source: varchar("source", { length: 128 }).notNull(),
  /** Timestamp when captured */
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;


// ─── Drip Campaign System ──────────────────────────────────────────────────

/**
 * Drip enrollments — tracks which leads are enrolled in which drip sequence.
 * A lead can only be in ONE active sequence at a time.
 * Double-dippers get moved from single-dipper sequences to sequence 3.
 */
export const dripEnrollments = mysqlTable("drip_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  /** Email of the lead (denormalized for easy querying) */
  email: varchar("email", { length: 320 }).notNull(),
  /** First name of the lead */
  firstName: varchar("firstName", { length: 128 }).notNull(),
  /** Which sequence they're enrolled in */
  sequenceId: mysqlEnum("sequenceId", [
    "estimating_single",
    "q1q2_single",
    "double_dipper",
    "homepage_only",
  ]).notNull(),
  /** Current step in the sequence (1-based: 1 = first email, 2 = second, etc.) */
  currentStep: int("currentStep").default(0).notNull(),
  /** Status of the enrollment */
  status: mysqlEnum("status", [
    "active",
    "completed",
    "paused",
    "unsubscribed",
    "converted",
  ]).default("active").notNull(),
  /** When the enrollment started (used to calculate send dates) */
  enrolledAt: timestamp("enrolledAt").defaultNow().notNull(),
  /** When the next email should be sent */
  nextSendAt: timestamp("nextSendAt"),
  /** If they converted (became a CC member), when */
  convertedAt: timestamp("convertedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DripEnrollment = typeof dripEnrollments.$inferSelect;
export type InsertDripEnrollment = typeof dripEnrollments.$inferInsert;

/**
 * Drip sent emails — tracks every email sent to prevent duplicates.
 * Also serves as an audit log for the drip campaign.
 */
export const dripSentEmails = mysqlTable("drip_sent_emails", {
  id: int("id").autoincrement().primaryKey(),
  /** The enrollment this email belongs to */
  enrollmentId: int("enrollmentId").notNull(),
  /** Email address it was sent to */
  email: varchar("email", { length: 320 }).notNull(),
  /** Which sequence */
  sequenceId: varchar("sequenceId", { length: 64 }).notNull(),
  /** Which step in the sequence (1-based) */
  stepNumber: int("stepNumber").notNull(),
  /** Resend email ID for tracking */
  resendId: varchar("resendId", { length: 128 }),
  /** Send status */
  status: mysqlEnum("status", ["sent", "failed", "bounced"]).default("sent").notNull(),
  /** Error message if failed */
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type DripSentEmail = typeof dripSentEmails.$inferSelect;
export type InsertDripSentEmail = typeof dripSentEmails.$inferInsert;

/**
 * Schedule layouts — saved view configurations per schedule.
 * Stores columns, sort, grouping, filters, zoom, and display settings.
 * Similar to P6 layouts but more user-friendly.
 */
export const scheduleLayouts = mysqlTable("schedule_layouts", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Layout name e.g. "Critical Path View", "By Trade", "My Default" */
  name: varchar("name", { length: 128 }).notNull(),
  /** Whether this is the default layout for this schedule */
  isDefault: boolean("isDefault").default(false).notNull(),
  /** JSON blob storing the full layout configuration */
  config: text("config").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
export type ScheduleLayout = typeof scheduleLayouts.$inferSelect;
export type InsertScheduleLayout = typeof scheduleLayouts.$inferInsert;


// ─── Resource & Cost Loading ──────────────────────────────────────────────

/**
 * Schedule resources — labor, equipment, material, and subcontractor resources.
 * Each resource has a name, type, unit of measure, and cost rate.
 */
export const scheduleResources = mysqlTable("schedule_resources", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Resource name e.g. "Electrician", "Crane", "Concrete" */
  name: varchar("name", { length: 256 }).notNull(),
  /** Resource type */
  resourceType: mysqlEnum("resourceType", ["labor", "equipment", "material", "subcontractor"]).default("labor").notNull(),
  /** Unit of measure e.g. "hr", "day", "cy", "ea", "ls" */
  unit: varchar("unit", { length: 32 }).default("hr").notNull(),
  /** Cost rate per unit (stored in cents to avoid floating point) */
  costRate: int("costRate").default(0).notNull(),
  /** Max units available per day (e.g., 8 hrs for labor, 1 for equipment) */
  maxUnitsPerDay: decimal("maxUnitsPerDay", { precision: 10, scale: 2 }).default("8.00").notNull(),
  /** Notes/description */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleResource = typeof scheduleResources.$inferSelect;
export type InsertScheduleResource = typeof scheduleResources.$inferInsert;

/**
 * Activity resource assignments — junction table linking activities to resources.
 * Each assignment specifies units per day and can override the resource cost rate.
 */
export const activityResources = mysqlTable("activity_resources", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule (denormalized for easy querying) */
  scheduleId: int("scheduleId").notNull(),
  /** Activity this resource is assigned to */
  activityId: int("activityId").notNull(),
  /** Resource being assigned */
  resourceId: int("resourceId").notNull(),
  /** Units per day (e.g., 8 hrs/day, 2 crews/day) */
  unitsPerDay: decimal("unitsPerDay", { precision: 10, scale: 2 }).default("8.00").notNull(),
  /** Override cost rate for this assignment (null = use resource default) */
  costRateOverride: int("costRateOverride"),
  /** Total budgeted cost for this assignment (calculated: rate * units * duration) */
  budgetedCost: int("budgetedCost").default(0).notNull(),
  /** Actual cost to date */
  actualCost: int("actualCost").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ActivityResource = typeof activityResources.$inferSelect;
export type InsertActivityResource = typeof activityResources.$inferInsert;

/**
 * Cost accounts — optional cost categorization for activities.
 * Allows grouping costs by trade, phase, or any custom category.
 */
export const costAccounts = mysqlTable("cost_accounts", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Cost account code e.g. "03-CONCRETE", "05-METALS" */
  code: varchar("code", { length: 64 }).notNull(),
  /** Cost account name */
  name: varchar("name", { length: 256 }).notNull(),
  /** Parent cost account (for hierarchy) */
  parentId: int("parentId"),
  /** Budget amount for this cost account (cents) */
  budget: int("budget").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CostAccount = typeof costAccounts.$inferSelect;
export type InsertCostAccount = typeof costAccounts.$inferInsert;

// ─── Gantt Annotations (Delay Analysis Overlays) ────────────────────────────

/**
 * Schedule annotations — persistent text boxes, arrows, and shading overlays
 * on the Gantt chart for delay analysis, change order justification, etc.
 * Each annotation stores its type and full properties as JSON.
 */
export const scheduleAnnotations = mysqlTable("schedule_annotations", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent schedule */
  scheduleId: int("scheduleId").notNull(),
  /** Annotation type: text, arrow, or shading */
  annotationType: mysqlEnum("annotationType", ["text", "arrow", "shading"]).notNull(),
  /** Full annotation properties stored as JSON (position, color, size, pattern, label, etc.) */
  data: json("data").notNull(),
  /** Display order / z-index */
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleAnnotation = typeof scheduleAnnotations.$inferSelect;
export type InsertScheduleAnnotation = typeof scheduleAnnotations.$inferInsert;


// ─── AI Quantity Takeoff ──────────────────────────────────────────────────────

/**
 * Takeoff projects — top-level container for a drawing set + quantity takeoff.
 * Each member can have multiple takeoff projects (one per bid/project).
 */
export const takeoffProjects = mysqlTable("takeoff_projects", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner (member ID from members table) */
  memberId: int("memberId").notNull(),
  /** Project name e.g. "Smith Residence Bid" */
  name: varchar("name", { length: 256 }).notNull(),
  /** Optional description */
  description: text("description"),
  /** Overall processing status */
  status: mysqlEnum("status", [
    "draft",
    "uploading",
    "processing",
    "post_processing",
    "completed",
    "error",
  ]).default("draft").notNull(),
  /** Total number of sheets uploaded */
  totalSheets: int("totalSheets").default(0).notNull(),
  /** Number of sheets processed so far */
  processedSheets: int("processedSheets").default(0).notNull(),
  /** Grand total estimated cost (cents) */
  totalEstimatedCost: int("totalEstimatedCost").default(0).notNull(),
  /** JSON array of selected CSI division codes, e.g. ["03","05","09"] - null means all divisions */
  selectedDivisions: text("selectedDivisions"),
  /** Cost region code for regional cost factor adjustment - null means national average */
  costRegion: varchar("costRegion", { length: 64 }),
  /** Regional cost multiplier (stored as integer basis points, e.g. 10500 = 1.05x) - null means 1.00x */
  costMultiplier: int("costMultiplier"),
  /** Currency code: USD, GBP, AUD — defaults to USD */
  currency: varchar("currency", { length: 8 }).default("USD"),
  /** Free-text scope description for targeted extraction within a CSI division */
  scopeText: text("scopeText"),
  /** JSON array of manually selected trade specialty IDs, e.g. ["concrete_tilt_up","metals_structural_steel"] */
  selectedSpecialties: text("selectedSpecialties"),
  /** JSON array of AI-detected trade specialty IDs from drawing analysis */
  detectedSpecialties: text("detectedSpecialties"),
  /** Set to true if post-processing timed out — project completed with partial results */
  processingTimedOut: boolean("processingTimedOut").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TakeoffProject = typeof takeoffProjects.$inferSelect;
export type InsertTakeoffProject = typeof takeoffProjects.$inferInsert;

/**
 * Drawing sheets — individual pages/sheets from an uploaded PDF drawing set.
 * Each sheet is processed independently by the AI vision pipeline.
 */
export const drawingSheets = mysqlTable("drawing_sheets", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent takeoff project */
  projectId: int("projectId").notNull(),
  /** Original filename */
  originalFilename: varchar("originalFilename", { length: 512 }),
  /** Page number within the PDF (1-based) */
  pageNumber: int("pageNumber").default(1).notNull(),
  /** S3 URL for the uploaded page image */
  imageUrl: text("imageUrl"),
  /** S3 file key for the page image */
  imageKey: varchar("imageKey", { length: 512 }),
  /** AI-detected sheet name e.g. "A1.1 - First Floor Plan" */
  sheetName: varchar("sheetName", { length: 256 }),
  /** AI-detected sheet type */
  sheetType: mysqlEnum("sheetType", [
    "floor_plan",
    "elevation",
    "section",
    "detail",
    "schedule",
    "site_plan",
    "structural",
    "mep",
    "electrical",
    "plumbing",
    "hvac",
    "landscape",
    "cover",
    "other",
  ]).default("other").notNull(),
  /** Processing status for this sheet */
  status: mysqlEnum("status", [
    "pending",
    "processing",
    "completed",
    "error",
    "skipped",
  ]).default("pending").notNull(),
  /** Error message if processing failed */
  errorMessage: text("errorMessage"),
  /** Raw AI response JSON (for debugging/reprocessing) */
  aiRawResponse: text("aiRawResponse"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DrawingSheet = typeof drawingSheets.$inferSelect;
export type InsertDrawingSheet = typeof drawingSheets.$inferInsert;

/**
 * Takeoff items — individual quantity line items extracted by AI from drawing sheets.
 * Organized by CSI division for standard construction estimating workflow.
 */
export const takeoffItems = mysqlTable("takeoff_items", {
  id: int("id").autoincrement().primaryKey(),
  /** Parent takeoff project */
  projectId: int("projectId").notNull(),
  /** Source drawing sheet */
  sheetId: int("sheetId").notNull(),
  /** CSI division code e.g. "03" for Concrete, "05" for Metals */
  csiDivision: varchar("csiDivision", { length: 8 }),
  /** CSI subdivision code e.g. "03 30 00" for Cast-in-Place Concrete */
  csiCode: varchar("csiCode", { length: 16 }),
  /** Item description e.g. "8\" CMU Block Wall" */
  description: varchar("description", { length: 512 }).notNull(),
  /** Quantity value */
  quantity: decimal("quantity", { precision: 12, scale: 2 }).default("0.00").notNull(),
  /** Unit of measure e.g. "SF", "LF", "CY", "EA", "LS" */
  unit: varchar("unit", { length: 16 }).default("EA").notNull(),
  /** Unit cost in cents */
  unitCost: int("unitCost").default(0).notNull(),
  /** Extended cost in cents (quantity * unitCost) */
  extendedCost: int("extendedCost").default(0).notNull(),
  /** AI confidence score (0-100) */
  confidence: int("confidence").default(80).notNull(),
  /** Notes or AI reasoning */
  notes: text("notes"),
  /** Whether this item has been manually reviewed/edited */
  reviewed: boolean("reviewed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TakeoffItem = typeof takeoffItems.$inferSelect;
export type InsertTakeoffItem = typeof takeoffItems.$inferInsert;

/**
 * User Cost Library — member-uploaded unit cost data that overrides the default cost table.
 * Members can upload a CSV/Excel with their own material unit costs.
 * When a takeoff runs, the cost lookup engine checks this library first before falling back to the built-in cost table.
 */
export const userCostLibrary = mysqlTable("user_cost_library", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner (member ID) */
  memberId: int("memberId").notNull(),
  /** CSI division code e.g. "03", "31" */
  csiDivision: varchar("csiDivision", { length: 8 }),
  /** Description / item name as entered by user */
  description: varchar("description", { length: 512 }).notNull(),
  /** Unit of measure: SF, LF, CY, EA, LS, etc. */
  unit: varchar("unit", { length: 32 }).notNull(),
  /** Material unit cost in cents */
  unitCost: int("unitCost").notNull(),
  /** Optional notes (source, date, project reference) */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserCostLibraryEntry = typeof userCostLibrary.$inferSelect;
export type InsertUserCostLibraryEntry = typeof userCostLibrary.$inferInsert;

/**
 * Sheet Markups — persisted drawing annotations per sheet per member.
 * Stores the full array of Shape objects as JSON so markups survive page reloads.
 * Also stores scale calibration data so measurements remain accurate.
 */
export const sheetMarkups = mysqlTable("sheet_markups", {
  id: int("id").autoincrement().primaryKey(),
  /** The drawing sheet this markup belongs to */
  sheetId: int("sheetId").notNull(),
  /** The member who created the markup */
  memberId: int("memberId").notNull(),
  /** The takeoff project ID (for easy querying) */
  projectId: int("projectId").notNull(),
  /** JSON array of Shape objects */
  shapesJson: text("shapesJson").notNull(),
  /** Scale ratio: pixels per real-world unit (0 = not calibrated) */
  scaleRatio: decimal("scaleRatio", { precision: 20, scale: 6 }).default("0").notNull(),
  /** Scale unit: "ft", "m", "in", "cm", "mm", "px" */
  scaleUnit: varchar("scaleUnit", { length: 8 }).default("px").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SheetMarkup = typeof sheetMarkups.$inferSelect;
export type InsertSheetMarkup = typeof sheetMarkups.$inferInsert;

/**
 * Measurement History — logs when a measurement is applied to a line item.
 * Tracks who applied what measurement, from which sheet, and when.
 */
export const measurementHistory = mysqlTable("measurement_history", {
  id: int("id").autoincrement().primaryKey(),
  /** The takeoff item that received the measurement */
  itemId: int("itemId").notNull(),
  /** The takeoff project ID */
  projectId: int("projectId").notNull(),
  /** The drawing sheet the measurement came from */
  sheetId: int("sheetId").notNull(),
  /** Type of measurement: "line", "area", or "count" */
  measurementType: varchar("measurementType", { length: 16 }).notNull(),
  /** The raw numeric value applied (e.g. 125.5 for 125.5 LF) */
  rawValue: decimal("rawValue", { precision: 20, scale: 4 }).notNull(),
  /** The unit applied (e.g. "LF", "SF", "EA") */
  unit: varchar("unit", { length: 16 }).notNull(),
  /** The member who applied the measurement */
  memberId: int("memberId").notNull(),
  /** Sheet name at time of apply (denormalized for history readability) */
  sheetName: varchar("sheetName", { length: 255 }),
  /** Item description at time of apply (denormalized for history readability) */
  itemDescription: varchar("itemDescription", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MeasurementHistory = typeof measurementHistory.$inferSelect;
export type InsertMeasurementHistory = typeof measurementHistory.$inferInsert;

/**
 * Feedback — beta user feedback submissions with optional screenshot.
 */
export const feedback = mysqlTable("feedback", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  memberName: varchar("memberName", { length: 128 }),
  message: text("message").notNull(),
  screenshotUrl: text("screenshotUrl"),
  page: varchar("page", { length: 512 }),
  userAgent: text("userAgent"),
  category: mysqlEnum("category", ["bug", "feature", "general", "other"]).default("general").notNull(),
  status: mysqlEnum("status", ["new", "reviewed", "in_progress", "resolved", "wont_fix"]).default("new").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;

/**
 * XER Import Jobs — tracks async XER file import progress.
 * The file is uploaded to S3 first, then processed server-side.
 */
export const xerImportJobs = mysqlTable("xer_import_jobs", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  /** S3 URL of the uploaded XER file */
  fileUrl: text("fileUrl").notNull(),
  /** User-provided schedule name override */
  scheduleName: varchar("scheduleName", { length: 256 }),
  /** Current status of the import */
  status: mysqlEnum("status", ["pending", "parsing", "importing", "complete", "failed"]).default("pending").notNull(),
  /** Progress message for the frontend */
  progressMessage: text("progressMessage"),
  /** Resulting schedule ID on success */
  scheduleId: int("scheduleId"),
  /** Result summary JSON */
  result: json("result"),
  /** Error message on failure */
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type XerImportJob = typeof xerImportJobs.$inferSelect;
export type InsertXerImportJob = typeof xerImportJobs.$inferInsert;

// ─── Beta Users (email+password, non-Discord) ─────────────────────────────────
export const betaUsers = mysqlTable("beta_users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("companyName", { length: 255 }),
  /** Whether this beta user has been deactivated */
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type BetaUser = typeof betaUsers.$inferSelect;
export type InsertBetaUser = typeof betaUsers.$inferInsert;


// ─── Labor Library ────────────────────────────────────────────────────────────
/**
 * User Labor Library — per-member labor rate data by CSI code.
 * Mirrors the Cost Library structure but tracks labor-specific fields:
 * laborRate (cents/unit), crewSize, productivity (units/hr).
 */
export const userLaborLibrary = mysqlTable("user_labor_library", {
  id: int("id").autoincrement().primaryKey(),
  /** Owner (member ID) */
  memberId: int("memberId").notNull(),
  /** CSI division code e.g. "03", "31" */
  csiDivision: varchar("csiDivision", { length: 8 }),
  /** Description / trade or task name */
  description: varchar("description", { length: 512 }).notNull(),
  /** Unit of measure: SF, LF, CY, EA, HR, etc. */
  unit: varchar("unit", { length: 32 }).notNull(),
  /** Labor rate in cents per unit (all-in crew cost per unit of output) */
  laborRate: int("laborRate").notNull(),
  /** Optional: crew size (number of workers) */
  crewSize: decimal("crewSize", { precision: 5, scale: 1 }),
  /** Optional: productivity in units per hour */
  productivity: decimal("productivity", { precision: 10, scale: 2 }),
  /** Optional notes (source, date, project reference) */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type UserLaborLibraryEntry = typeof userLaborLibrary.$inferSelect;
export type InsertUserLaborLibraryEntry = typeof userLaborLibrary.$inferInsert;

// ─── Estimate Markups ─────────────────────────────────────────────────────────
/**
 * Estimate Markups — per-project markup configuration for full estimates.
 * Stores OH&P, contingency, bond, tax, and other percentage-based markups.
 * One row per project; if missing, system defaults apply.
 */
export const estimateMarkups = mysqlTable("estimate_markups", {
  id: int("id").autoincrement().primaryKey(),
  /** Takeoff project ID */
  projectId: int("projectId").notNull(),
  /** Member who owns this config */
  memberId: int("memberId").notNull(),
  /** Overhead percentage (e.g. 1000 = 10.00%) — stored as basis points */
  overheadPct: int("overheadPct").default(1000).notNull(),
  /** Profit percentage */
  profitPct: int("profitPct").default(1000).notNull(),
  /** Contingency percentage */
  contingencyPct: int("contingencyPct").default(500).notNull(),
  /** Bond cost percentage (of total) */
  bondPct: int("bondPct").default(150).notNull(),
  /** Sales tax percentage (on materials only) */
  taxPct: int("taxPct").default(0).notNull(),
  /** General conditions percentage */
  generalConditionsPct: int("generalConditionsPct").default(0).notNull(),
  /** Custom JSON for additional line-item markups */
  customMarkups: text("customMarkups"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EstimateMarkup = typeof estimateMarkups.$inferSelect;
export type InsertEstimateMarkup = typeof estimateMarkups.$inferInsert;

// ─── Company Defaults ─────────────────────────────────────────────────────────
/**
 * Company Estimate Defaults — per-member default markup percentages.
 * Applied to new projects when no project-specific markups exist.
 */
export const companyEstimateDefaults = mysqlTable("company_estimate_defaults", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().unique(),
  overheadPct: int("overheadPct").default(1000).notNull(),
  profitPct: int("profitPct").default(1000).notNull(),
  contingencyPct: int("contingencyPct").default(500).notNull(),
  bondPct: int("bondPct").default(150).notNull(),
  taxPct: int("taxPct").default(0).notNull(),
  generalConditionsPct: int("generalConditionsPct").default(0).notNull(),
  customMarkups: text("customMarkups"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CompanyEstimateDefault = typeof companyEstimateDefaults.$inferSelect;
export type InsertCompanyEstimateDefault = typeof companyEstimateDefaults.$inferInsert;

// ─── Trade Rate Library ───────────────────────────────────────────────────────
/**
 * Trade Rates — per-member base wage rates by trade, classification, and labor type.
 * The base wage is BEFORE burden. The system calculates fully burdened rate using
 * the member's burden configuration.
 *
 * Classifications: Foreman, Journeyman, 4th Year Apprentice, 3rd Year, 2nd Year, 1st Year
 * Labor types: res_open, res_union, com_open, com_union
 */
export const tradeRates = mysqlTable("trade_rates", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  /** Trade name: Carpenter, Electrician, Plumber, Iron Worker, Laborer, etc. */
  tradeName: varchar("tradeName", { length: 128 }).notNull(),
  /** CSI division this trade primarily works in (e.g. "06" for Carpenter) */
  csiDivision: varchar("csiDivision", { length: 8 }),
  /** Classification: foreman, journeyman, apprentice_4, apprentice_3, apprentice_2, apprentice_1 */
  classification: varchar("classification", { length: 32 }).notNull(),
  /** Labor type: res_open, res_union, com_open, com_union */
  laborType: varchar("laborType", { length: 16 }).notNull(),
  /** Base wage in cents per hour (BEFORE burden) */
  baseWageCents: int("baseWageCents").notNull(),
  /** Regional code from costRegions (e.g. "national", "nyc", "la") — null means national avg */
  regionCode: varchar("regionCode", { length: 32 }),
  /** Notes (e.g. "2025 CBA rate", "per last project") */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TradeRate = typeof tradeRates.$inferSelect;
export type InsertTradeRate = typeof tradeRates.$inferInsert;

// ─── Burden Configuration ─────────────────────────────────────────────────────
/**
 * Burden Config — per-member, per-labor-type burden rates.
 * Each burden line item is stored as basis points (e.g. 765 = 7.65%).
 * Fixed-dollar items (health, pension) stored in cents per hour.
 *
 * The system uses these to calculate the fully burdened rate:
 *   Burdened Rate = Base Wage × (1 + sum of % burdens) + sum of fixed $/hr burdens
 *
 * Users can optionally override burden per trade (e.g. different WC rate for electricians).
 */
export const burdenConfigs = mysqlTable("burden_configs", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  /** Labor type this config applies to: res_open, res_union, com_open, com_union */
  laborType: varchar("laborType", { length: 16 }).notNull(),
  /** Optional: specific trade name override. Null = default for this labor type */
  tradeName: varchar("tradeName", { length: 128 }),
  /** FICA (Social Security + Medicare) — basis points, e.g. 765 = 7.65% */
  ficaPct: int("ficaPct").default(765).notNull(),
  /** FUTA (Federal Unemployment) — basis points, e.g. 60 = 0.60% */
  futaPct: int("futaPct").default(60).notNull(),
  /** SUTA (State Unemployment) — basis points, varies by state */
  sutaPct: int("sutaPct").default(270).notNull(),
  /** Workers Compensation — basis points, varies by trade and state */
  workersCompPct: int("workersCompPct").default(800).notNull(),
  /** General Liability Insurance — basis points */
  generalLiabilityPct: int("generalLiabilityPct").default(200).notNull(),
  /** Health Insurance — cents per hour (fixed cost, not percentage) */
  healthInsuranceCentsPerHr: int("healthInsuranceCentsPerHr").default(850).notNull(),
  /** Pension / 401k — basis points of base wage */
  pensionPct: int("pensionPct").default(300).notNull(),
  /** Vacation / Holiday Pay — basis points of base wage */
  vacationPct: int("vacationPct").default(400).notNull(),
  /** Training Fund — basis points (common in union) */
  trainingPct: int("trainingPct").default(0).notNull(),
  /** Union Dues / Fringe — cents per hour (union shops only) */
  unionFringeCentsPerHr: int("unionFringeCentsPerHr").default(0).notNull(),
  /** Other burden — cents per hour (catch-all) */
  otherCentsPerHr: int("otherCentsPerHr").default(0).notNull(),
  /** Other burden description */
  otherDescription: varchar("otherDescription", { length: 256 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BurdenConfig = typeof burdenConfigs.$inferSelect;
export type InsertBurdenConfig = typeof burdenConfigs.$inferInsert;

// ─── Crew Definitions ─────────────────────────────────────────────────────────
/**
 * Crew Definitions — user-defined crews composed of trade/classification combos.
 * Each crew has a name and a JSON array of members with their trade, classification, and count.
 * The system calculates the blended hourly rate from the Trade Rate Library + Burden Config.
 */
export const crewDefinitions = mysqlTable("crew_definitions", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  /** Crew name, e.g. "Concrete Crew A", "Framing Crew" */
  crewName: varchar("crewName", { length: 128 }).notNull(),
  /** Labor type this crew uses: res_open, res_union, com_open, com_union */
  laborType: varchar("laborType", { length: 16 }).notNull(),
  /** JSON array of crew members:
   * [{ tradeName: "Carpenter", classification: "journeyman", count: 3 },
   *  { tradeName: "Carpenter", classification: "foreman", count: 1 }]
   */
  crewMembers: text("crewMembers").notNull(),
  /** Optional notes */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CrewDefinition = typeof crewDefinitions.$inferSelect;
export type InsertCrewDefinition = typeof crewDefinitions.$inferInsert;

// ─── Activity Productivity Factors ────────────────────────────────────────────
/**
 * Activity Productivity — maps CSI work activities to crew types and productivity rates.
 * Used to auto-calculate labor cost on takeoff items:
 *   Labor Cost = Quantity / Productivity × Crew Hourly Rate
 *
 * Productivity = units of output per crew-hour (e.g. 50 SF/crew-hr for slab forming).
 * Users can override with their own historical production rates.
 */
export const activityProductivity = mysqlTable("activity_productivity", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull(),
  /** CSI division code */
  csiDivision: varchar("csiDivision", { length: 8 }),
  /** Activity description (matches takeoff item descriptions) */
  description: varchar("description", { length: 512 }).notNull(),
  /** Unit of measure (SF, LF, CY, EA, etc.) */
  unit: varchar("unit", { length: 32 }).notNull(),
  /** Crew definition ID (links to crewDefinitions) */
  crewId: int("crewId"),
  /** Productivity: units of output per crew-hour (stored as decimal) */
  productivityPerCrewHr: decimal("productivityPerCrewHr", { precision: 10, scale: 2 }).notNull(),
  /** Source: "rs_means", "user_historical", "subcontractor_quote" */
  source: varchar("source", { length: 32 }).default("rs_means"),
  /** Notes */
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type ActivityProductivity = typeof activityProductivity.$inferSelect;
export type InsertActivityProductivity = typeof activityProductivity.$inferInsert;
