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
