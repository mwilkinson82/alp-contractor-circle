/**
 * Member Dashboard — The Contractor Circle portal home.
 * Shows welcome message, subscription status, quick links, and upcoming events.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowRight,
  BriefcaseBusiness,
  Crown,
  Calendar,
  Database,
  PlayCircle,
  FileDown,
  GanttChart,
  HardHat,
  LayoutDashboard,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  PackageCheck,
  Ruler,
  Zap,
  Send,
  ChevronDown,
  ChevronUp,
  X,
  Flame,
  Mic2,
  Video,
  CalendarPlus,
} from "lucide-react";
import { SuccessStoriesForm } from "@/components/portal/SuccessStoriesForm";
import { CalendarIntegration } from "@/components/portal/CalendarIntegration";

const DISCORD_INVITE = "https://discord.gg/rsK5HZcF";

const BOOTCAMP_POSTER_URL = "/manus-storage/BootcampPoster_6025f4ca.png";
const BOOTCAMP_ZOOM_DIRECT = "https://us06web.zoom.us/j/87028206220?pwd=k2YtkNdLz7y1nnkZt0HFSe0obntSnl.1";

/**
 * Featured hero banner for bootcamp day.
 * Shows the bootcamp poster image with a pulsing "LIVE TODAY" badge and Join Zoom CTA.
 * Only renders on the day of the bootcamp.
 */
function BootcampHeroBanner() {
  const [dismissed, setDismissed] = useState(false);

  // Check if today is bootcamp day (April 26, 2026)
  const now = new Date();
  const etOffset = -4; // EDT
  const etHour = (now.getUTCHours() + etOffset + 24) % 24;
  const etDate = new Date(now.getTime() + etOffset * 60 * 60 * 1000);
  const todayStr = etDate.toISOString().slice(0, 10);
  const isBootcampDay = todayStr === "2026-04-26";
  const isBeforeEvent = etHour < 19; // Show until 7 PM ET (event ends ~7 PM)

  if (dismissed || !isBootcampDay || !isBeforeEvent) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden border-2 border-ember/40 shadow-[0_0_40px_rgba(212,145,92,0.15)]">
      {/* Dismiss button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-all"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Pulsing LIVE TODAY badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
        <span className="text-white text-xs font-bold uppercase tracking-widest bg-red-600/90 px-3 py-1 rounded-full shadow-lg">
          Live Today — 5 PM ET
        </span>
      </div>

      {/* Poster image */}
      <a href={BOOTCAMP_ZOOM_DIRECT} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={BOOTCAMP_POSTER_URL}
          alt="Contractor Circle Bootcamp — Today at 5 PM ET"
          className="w-full object-contain rounded-2xl"
        />
      </a>

      {/* CTA overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-center sm:text-left">
            <p className="text-white font-heading font-bold text-lg sm:text-xl">Bootcamp starts at 5:00 PM ET</p>
            <p className="text-white/60 text-sm">Click to join the Zoom meeting</p>
          </div>
          <a
            href={BOOTCAMP_ZOOM_DIRECT}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-ember hover:bg-ember/90 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-ember/40 hover:shadow-ember/60 whitespace-nowrap text-base"
          >
            <Video className="w-5 h-5" />
            Join Zoom Now
          </a>
        </div>
      </div>
    </div>
  );
}

// Zoom recurring meeting link for bi-weekly Sunday calls at 5 PM ET
// Update this URL when the Zoom meeting link changes
const ZOOM_CALL_LINK = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";

/**
 * Returns the next Contractor Circle call date as a formatted string.
 * Calls are bi-weekly on Sundays at 5 PM ET, starting March 29, 2025.
 * Easter (April 20, 2025) is an off-week — the schedule skips it naturally
 * because March 29 → April 13 → April 27 (skipping April 20).
 */
function getNextCallSunday(): string {
  // Anchor date: first call is Sunday March 30, 2025
  const ANCHOR = new Date(Date.UTC(2025, 2, 30)); // March 30, 2025 UTC (Sunday)
  const now = new Date();
  // Work in UTC days
  const msSinceAnchor = now.getTime() - ANCHOR.getTime();
  const daysSinceAnchor = Math.floor(msSinceAnchor / (1000 * 60 * 60 * 24));
  // How many 14-day cycles have passed?
  const cyclesPassed = daysSinceAnchor < 0 ? 0 : Math.floor(daysSinceAnchor / 14);
  // Next call = anchor + (cyclesPassed + 1) * 14 days, unless today IS a call day
  const isCallDay = daysSinceAnchor >= 0 && daysSinceAnchor % 14 === 0;
  const nextCallOffset = isCallDay ? 0 : (cyclesPassed + 1) * 14;
  const nextCall = new Date(ANCHOR.getTime() + nextCallOffset * 24 * 60 * 60 * 1000);
  return nextCall.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    active: { color: "text-green-400", bg: "bg-green-500/10", label: "Active", icon: CheckCircle2 },
    trialing: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Trial", icon: Clock },
    past_due: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Past Due", icon: AlertCircle },
    canceled: { color: "text-red-400", bg: "bg-red-500/10", label: "Canceled", icon: AlertCircle },
    none: { color: "text-cream-muted", bg: "bg-white/5", label: "No Subscription", icon: AlertCircle },
  };

  const c = config[status] || config.none;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

/**
 * Helper: returns the ISO date string for the next bi-weekly call cycle.
 */
function getNextCallCycle(): string {
  const ANCHOR = new Date(Date.UTC(2025, 2, 30)); // March 30, 2025 UTC (Sunday)
  const now = new Date();
  const msSinceAnchor = now.getTime() - ANCHOR.getTime();
  const daysSinceAnchor = Math.floor(msSinceAnchor / (1000 * 60 * 60 * 24));
  const cyclesPassed = daysSinceAnchor < 0 ? 0 : Math.floor(daysSinceAnchor / 14);
  const isCallDay = daysSinceAnchor >= 0 && daysSinceAnchor % 14 === 0;
  const nextCallOffset = isCallDay ? 0 : (cyclesPassed + 1) * 14;
  const nextCall = new Date(ANCHOR.getTime() + nextCallOffset * 24 * 60 * 60 * 1000);
  return nextCall.toISOString().split("T")[0];
}

function formatCurrency(cents?: number | null): string {
  if (!cents || cents <= 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatProjectDate(value?: string | Date | null): string {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Full-screen modal question form ─────────────────────────────────────────
function QuestionModal({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const utils = trpc.useUtils();

  const submitQuestion = trpc.member.submitQuestion.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setQuestion("");
      setContext("");
      utils.member.myQuestions.invalidate();
    },
  });

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[oklch(0.12_0.02_260)] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/8 sticky top-0 bg-[oklch(0.12_0.02_260)] z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-ember/10 flex items-center justify-center">
              <Send className="w-4 h-4 text-ember" />
            </div>
            <div>
              <h3 className="font-heading text-base font-bold text-cream">Submit a Question</h3>
              <p className="text-cream-muted text-xs">Marshall reviews before each call</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-cream-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-5">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-cream font-semibold text-lg">Question Submitted</p>
                <p className="text-cream-muted text-sm mt-1">Marshall will review it before the next call.</p>
              </div>
              <button
                onClick={onClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-ember/10 border border-ember/20 text-ember text-sm font-semibold hover:bg-ember/20 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                  Your Question <span className="text-ember">*</span>
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What's the most important thing you need clarity on before the next call?"
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40 resize-none"
                  autoFocus
                />
                <p className="text-xs text-cream-muted/40 mt-1 text-right">{question.length}/1000</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                  Context <span className="text-cream-muted/40">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  placeholder="Project size, what you've tried, what's at stake..."
                  rows={3}
                  maxLength={2000}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40 resize-none"
                />
              </div>
              <button
                onClick={() => submitQuestion.mutate({ question, context: context || undefined, callCycle: getNextCallCycle() })}
                disabled={question.trim().length < 10 || submitQuestion.isPending}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-ember text-obsidian text-sm font-bold hover:bg-ember/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitQuestion.isPending ? "Submitting..." : "Submit Question"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Monthly Bootcamp Topic Submission ────────────────────────────────────────
// Fallback defaults (used while settings load or if DB is empty)
const DEFAULT_BOOTCAMP_DATE = "2026-04-26";
const DEFAULT_BOOTCAMP_TIME = "17:00";
const DEFAULT_BOOTCAMP_DAY = "Sunday";
const DEFAULT_BOOTCAMP_ZOOM = "https://us06web.zoom.us/j/87028206220?pwd=k2YtkNdLz7y1nnkZt0HFSe0obntSnl.1";

/**
 * Generate a Google Calendar add link for the bootcamp.
 * Now accepts dynamic date/time/zoom from admin settings.
 */
function getBootcampCalendarUrl(dateStr: string, timeStr: string, zoomLink: string) {
  // Parse date and time into UTC start/end
  const [year, month, day] = dateStr.split("-");
  const [hour, minute] = timeStr.split(":");
  // Convert ET to UTC: ET is UTC-4 (EDT) or UTC-5 (EST). Assume EDT for simplicity.
  const hourUtc = (parseInt(hour) + 4).toString().padStart(2, "0");
  const start = `${year}${month}${day}T${hourUtc}${minute}00Z`;
  // End = start + 2 hours
  const endHourUtc = (parseInt(hourUtc) + 2).toString().padStart(2, "0");
  const end = `${year}${month}${day}T${endHourUtc}${minute}00Z`;

  const title = encodeURIComponent("Contractor Circle Monthly Bootcamp");
  const details = encodeURIComponent(
    "Monthly Bootcamp \u2014 Deep dive session with Marshall and the Contractor Circle community.\n\n" +
    "Join Zoom Meeting:\n" + zoomLink + "\n\n" +
    "Come prepared: water, coffee, pen & paper. 90+ minutes. Audience participation expected."
  );
  const location = encodeURIComponent(zoomLink);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

/**
 * Format a date string like "2026-04-26" + day label into display like "Sunday, April 26 at 5 PM ET"
 */
function formatBootcampDisplay(dateStr: string, dayLabel: string, timeStr: string): string {
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid timezone shift
  const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
  const dayNum = d.getUTCDate();
  // Format time: "17:00" → "5 PM"
  const [h] = timeStr.split(":");
  const hour24 = parseInt(h);
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
  return `${dayLabel}, ${month} ${dayNum} at ${hour12} ${ampm} ET`;
}

function BootcampTopicWidget() {
  const [topic, setTopic] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Fetch admin settings for dynamic bootcamp date
  const { data: settingsData } = trpc.member.getSettings.useQuery(undefined, { retry: false, staleTime: 60_000 });
  const settings = settingsData?.settings || {};

  const NEXT_BOOTCAMP_DATE = settings.bootcamp_date || DEFAULT_BOOTCAMP_DATE;
  const BOOTCAMP_TIME = settings.bootcamp_time || DEFAULT_BOOTCAMP_TIME;
  const BOOTCAMP_DAY = settings.bootcamp_day_label || DEFAULT_BOOTCAMP_DAY;
  const BOOTCAMP_ZOOM_LINK = settings.bootcamp_zoom_link || DEFAULT_BOOTCAMP_ZOOM;
  const NEXT_BOOTCAMP_DISPLAY = formatBootcampDisplay(NEXT_BOOTCAMP_DATE, BOOTCAMP_DAY, BOOTCAMP_TIME);

  const { data: myTopicsData } = trpc.member.myBootcampTopics.useQuery(undefined, { retry: false });
  const { data: selectedData } = trpc.member.selectedBootcampTopics.useQuery({ bootcampDate: NEXT_BOOTCAMP_DATE }, { retry: false });
  const utils = trpc.useUtils();

  const submitTopic = trpc.member.submitBootcampTopic.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTopic("");
      setReason("");
      utils.member.myBootcampTopics.invalidate();
      setTimeout(() => { setSubmitted(false); setShowForm(false); }, 4000);
    },
  });

  const myTopicsForDate = myTopicsData?.topics?.filter(
    (t: any) => t.bootcampDate === NEXT_BOOTCAMP_DATE
  ) ?? [];

  // Countdown — compute from dynamic date + time
  const [h, m] = BOOTCAMP_TIME.split(":");
  const bootcampDate = new Date(`${NEXT_BOOTCAMP_DATE}T${(parseInt(h) + 4).toString().padStart(2, "0")}:${m}:00Z`); // ET → UTC
  const now = new Date();
  const daysUntil = Math.max(0, Math.ceil((bootcampDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-ember/30 bg-gradient-to-br from-ember/[0.08] via-transparent to-ember/[0.04]">
      {/* Accent glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ember via-[#FF8C42] to-ember" />

      <div className="p-5 sm:p-7">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ember/15 flex items-center justify-center shrink-0">
              <Flame className="w-6 h-6 text-ember" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-ember/15 border border-ember/25 text-[10px] font-bold text-ember uppercase tracking-widest">
                  Monthly Bootcamp
                </span>
                {daysUntil > 0 && (
                  <span className="text-xs text-cream-muted">{daysUntil} day{daysUntil !== 1 ? 's' : ''} away</span>
                )}
              </div>
              <h3 className="font-heading text-lg font-bold text-cream">
                Submit Your Topic for the Next Bootcamp
              </h3>
              <p className="text-cream-muted text-sm mt-0.5">
                {NEXT_BOOTCAMP_DISPLAY} — Marshall picks the topics, you bring the questions.
              </p>
            </div>
          </div>
        </div>

        {/* Zoom + Calendar action bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <a
            href={BOOTCAMP_ZOOM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2D8CFF]/15 border border-[#2D8CFF]/30 text-[#2D8CFF] text-sm font-semibold hover:bg-[#2D8CFF]/25 transition-colors"
          >
            <Video className="w-4 h-4" />
            Join on Zoom
          </a>
          <a
            href={getBootcampCalendarUrl(NEXT_BOOTCAMP_DATE, BOOTCAMP_TIME, BOOTCAMP_ZOOM_LINK)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-cream text-sm font-semibold hover:bg-white/10 transition-colors"
          >
            <CalendarPlus className="w-4 h-4 text-ember" />
            Add to Calendar
          </a>
        </div>

        {/* Info bar */}
        <div className="flex flex-wrap items-center gap-3 mb-5 p-3 rounded-xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-ember/70" />
            <span className="text-xs text-cream-muted">90+ min deep dive</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-ember/70" />
            <span className="text-xs text-cream-muted">Audience participation expected</span>
          </div>
          <div className="w-px h-3 bg-white/10" />
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-ember/70" />
            <span className="text-xs text-cream-muted">Come prepared: water, coffee, pen & paper</span>
          </div>
        </div>

        {/* Submit button or form */}
        {!showForm && !submitted ? (
          <button
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-ember text-obsidian text-sm font-bold hover:bg-ember/90 transition-all duration-300 shadow-lg shadow-ember/20 hover:shadow-ember/40"
          >
            <Send className="w-4 h-4" />
            Submit a Topic for Consideration
          </button>
        ) : submitted ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-green-400">Topic submitted! Marshall will review all submissions and select topics for the bootcamp.</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                Your Topic <span className="text-ember">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. How to price change orders profitably, Subcontractor management systems..."
                maxLength={512}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                Why This Topic? <span className="text-cream-muted/40">(optional)</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="What are you struggling with? What would make this valuable for you?"
                rows={2}
                maxLength={2000}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40 resize-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => submitTopic.mutate({ topic, reason: reason || undefined, bootcampDate: NEXT_BOOTCAMP_DATE })}
                disabled={topic.trim().length < 5 || submitTopic.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ember text-obsidian text-sm font-bold hover:bg-ember/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitTopic.isPending ? "Submitting..." : "Submit Topic"}
              </button>
              <button
                onClick={() => { setShowForm(false); setTopic(""); setReason(""); }}
                className="px-4 py-2.5 rounded-xl text-cream-muted text-sm hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Selected Topics — Bootcamp Agenda */}
        {(selectedData?.topics?.length ?? 0) > 0 && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Confirmed Bootcamp Topics</p>
            </div>
            <div className="space-y-2">
              {selectedData!.topics.map((t: any) => (
                <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/[0.06] border border-green-500/15">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-cream text-sm font-medium leading-relaxed">{t.topic}</p>
                    <p className="text-cream-muted/60 text-xs mt-0.5">Submitted by {t.memberName || t.memberUsername || "a member"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previously submitted topics */}
        {myTopicsForDate.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <p className="text-xs font-medium text-cream-muted uppercase tracking-wider mb-3">Your Submitted Topics</p>
            <div className="space-y-2">
              {myTopicsForDate.map((t: any) => (
                <div key={t.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.03]">
                  <p className="text-cream text-xs leading-relaxed flex-1">{t.topic}</p>
                  <span className={`text-xs shrink-0 ${
                    t.status === "selected" ? "text-green-400" :
                    t.status === "not_selected" ? "text-cream-muted/50" :
                    "text-cream-muted"
                  }`}>
                    {t.status === "selected" ? "Selected \u2713" :
                     t.status === "not_selected" ? "Not Selected" :
                     "Submitted"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionSubmitWidget() {
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [context, setContext] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: myQuestionsData } = trpc.member.myQuestions.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();

  const submitQuestion = trpc.member.submitQuestion.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setQuestion("");
      setContext("");
      utils.member.myQuestions.invalidate();
      setTimeout(() => setSubmitted(false), 4000);
    },
  });

  const pendingCount = myQuestionsData?.questions?.filter(
    (q: any) => q.status === "pending" || q.status === "selected_for_call" || q.status === "selected_for_bootcamp"
  ).length ?? 0;

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending: { label: "Submitted", color: "text-cream-muted" },
    selected_for_call: { label: "Selected for Call ✓", color: "text-green-400" },
    selected_for_bootcamp: { label: "Selected for Bootcamp ✓", color: "text-blue-400" },
    answered: { label: "Answered", color: "text-ember" },
    archived: { label: "Archived", color: "text-cream-muted/50" },
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-ember" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-semibold text-cream">Submit a Question for the Next Call</h3>
            <p className="text-cream-muted text-xs mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} question${pendingCount > 1 ? "s" : ""} submitted — Marshall reviews before each call`
                : "Marshall selects questions to work through live each session"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-cream-muted" /> : <ChevronDown className="w-4 h-4 text-cream-muted" />}
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 border-t border-white/5">
          {submitted ? (
            <div className="pt-4 flex items-center gap-3 text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-medium">Question submitted. Marshall will review it before the next call.</span>
            </div>
          ) : (
            <>
              <div className="pt-4">
                <label className="block text-xs font-medium text-cream-muted mb-2 uppercase tracking-wider">
                  Your Question <span className="text-ember">*</span>
                </label>
                <textarea
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="What's the most important thing you need clarity on before the next call?"
                  rows={3}
                  maxLength={1000}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40 resize-none"
                />
                <p className="text-xs text-cream-muted/50 mt-1 text-right">{question.length}/1000</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-cream-muted mb-2 uppercase tracking-wider">
                  Context / Background <span className="text-cream-muted/50">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="Any relevant details — project size, what you've tried, what's at stake..."
                  rows={2}
                  maxLength={2000}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream text-sm placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40 resize-none"
                />
              </div>
              <button
                onClick={() => submitQuestion.mutate({ question, context: context || undefined, callCycle: getNextCallCycle() })}
                disabled={question.trim().length < 10 || submitQuestion.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ember text-obsidian text-sm font-semibold hover:bg-ember/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                {submitQuestion.isPending ? "Submitting..." : "Submit Question"}
              </button>
            </>
          )}

          {/* Past questions */}
          {(myQuestionsData?.questions?.length ?? 0) > 0 && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-xs font-medium text-cream-muted uppercase tracking-wider mb-3">Your Submitted Questions</p>
              <div className="space-y-2">
                {myQuestionsData!.questions.slice(0, 5).map((q: any) => (
                  <div key={q.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-white/[0.03]">
                    <p className="text-cream text-xs leading-relaxed flex-1">{q.question}</p>
                    <span className={`text-xs shrink-0 ${statusLabel[q.status]?.color || "text-cream-muted"}`}>
                      {statusLabel[q.status]?.label || q.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortalDashboard() {
  const { member, isSubscribed } = useMember();
  const [, navigate] = useLocation();
  const { data: subscription, isLoading: subLoading } = trpc.member.subscription.useQuery(undefined, {
    retry: false,
  });
  const { data: projects } = trpc.takeoff.listProjects.useQuery();
  const [questionModalOpen, setQuestionModalOpen] = useState(false);

  const displayName = member?.displayName || member?.discordUsername || "Member";
  const firstName = displayName.split(" ")[0];

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const sortedProjects = [...(projects ?? [])].sort(
    (a: any, b: any) =>
      new Date(b.updatedAt || b.createdAt).getTime() -
      new Date(a.updatedAt || a.createdAt).getTime()
  );
  const recentProjects = sortedProjects.slice(0, 3);
  const totalProjects = projects?.length ?? 0;
  const activeProjects = (projects ?? []).filter((project: any) =>
    ["draft", "uploading", "processing", "post_processing"].includes(project.status)
  ).length;
  const readyToPackage = (projects ?? []).filter(
    (project: any) => project.status === "completed"
  ).length;
  const totalEstimatedValue = (projects ?? []).reduce(
    (sum: number, project: any) => sum + (project.totalEstimatedCost ?? 0),
    0
  );

  const quickLinks = [
    {
      icon: PlayCircle,
      title: "Replay Library",
      description: "Watch past calls and bootcamp sessions",
      href: "/portal/replays",
      color: "text-blue-accent",
      bg: "bg-blue-accent/10",
    },
    {
      icon: FileDown,
      title: "Templates",
      description: "Download proposal and contract templates",
      href: "/portal/templates",
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: MessageSquare,
      title: "Discord Community",
      description: "Connect with fellow contractors",
      href: DISCORD_INVITE,
      external: true,
      color: "text-[#5865F2]",
      bg: "bg-[#5865F2]/10",
    },
    {
      icon: Calendar,
      title: "Next Live Call",
      description: `${getNextCallSunday()} at 5 PM ET`,
      href: ZOOM_CALL_LINK,
      external: true,
      color: "text-ember",
      bg: "bg-ember/10",
    },
  ];

  const constructLineLinks = [
    {
      icon: LayoutDashboard,
      title: "ConstructLine Hub",
      label: "Hub",
      description: "See the suite, recent bids, and the next estimating decision.",
      href: "/portal/constructline",
    },
    {
      icon: Ruler,
      title: "Basis",
      label: "Primary",
      description: "Review drawings, price accepted work, and package the bid.",
      href: "/portal/takeoff",
    },
    {
      icon: Database,
      title: "Basis Cost Library",
      label: "Pricing",
      description: "Maintain unit costs and pricing assumptions for Basis.",
      href: "/portal/cost-library",
    },
    {
      icon: HardHat,
      title: "Basis Trade Rate Library",
      label: "Labor",
      description: "Tune burdened labor rates and crews before estimating.",
      href: "/portal/labor-library",
    },
    {
      icon: GanttChart,
      title: "Baseline",
      label: "Schedule",
      description: "Open CPM scheduling without leaving the ALP suite.",
      href: "/portal/scheduler",
    },
  ];

  return (
    <div className="-m-4 min-h-screen bg-[#f8f5ef] text-[#171714] sm:-m-6 md:-m-8">
      {/* Question Modal */}
      {questionModalOpen && <QuestionModal onClose={() => setQuestionModalOpen(false)} />}

      {/* BOOTCAMP DAY HERO BANNER — Disabled (April 2026 bootcamp is over)
      <BootcampHeroBanner />
      */}

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 md:px-8 md:py-7">
        {/* Welcome Header */}
        <div
          data-tour="welcome-header"
          className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9a7622]">
              Contractor Circle Portal
            </p>
            <h1 className="mt-2 font-heading text-2xl font-semibold tracking-normal text-[#11100c] md:text-3xl">
              {greeting}, {firstName}
            </h1>
            <p className="mt-1 text-sm text-[#6d6558]">
              Your ALP command center for bids, tools, calls, and member resources.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {member?.memberRole === "founding_member" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#d7b44d] bg-[#fff4cb] px-3 py-1.5">
                <Crown className="h-3.5 w-3.5 text-[#8a6510]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-[#8a6510]">
                  Founding Member
                </span>
              </span>
            )}
            <StatusBadge status={subscription?.status || member?.subscriptionStatus || "none"} />
          </div>
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="overflow-hidden rounded-xl border border-[#e4d7bf] bg-[#fffdf8] shadow-[0_28px_80px_rgba(41,37,28,0.08)]">
            <div className="grid min-h-[360px] lg:grid-cols-[minmax(420px,0.72fr)_minmax(500px,1fr)]">
              <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-9">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b58513]">
                  ConstructLine Suite
                </p>
                <h2 className="mt-4 max-w-[620px] text-4xl font-semibold leading-[1.04] tracking-normal text-[#11100c] md:text-[46px]">
                  Build the bid before the day starts building you.
                </h2>
                <p className="mt-4 max-w-[570px] text-[15px] leading-7 text-[#6d6558]">
                  Basis is the estimating cockpit inside ConstructLine: review the set,
                  price accepted work, and package the bid with your cost and trade-rate
                  libraries close at hand.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {["Review scope", "Price accepted work", "Package the bid"].map(item => (
                    <span
                      key={item}
                      className="rounded-full border border-[#eadcc4] bg-white px-3 py-1 text-xs font-semibold text-[#5d5546]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
                <div className="mt-7 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/portal/takeoff")}
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#090b0f] px-5 text-sm font-semibold text-[#f1b51d] shadow-[0_18px_45px_rgba(0,0,0,0.20)] transition-colors hover:bg-[#171a20]"
                  >
                    <Ruler className="h-4 w-4" />
                    Open Basis
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/portal/constructline")}
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#d7c7aa] bg-white px-5 text-sm font-semibold text-[#171714] shadow-sm transition-colors hover:bg-[#faf8f2]"
                  >
                    <LayoutDashboard className="h-4 w-4 text-[#8a6510]" />
                    ConstructLine Hub
                  </button>
                </div>
              </div>
              <div className="relative hidden min-h-[360px] overflow-hidden lg:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_18%,rgba(241,181,29,0.20),transparent_28%),linear-gradient(135deg,#fffdf8_0%,#f8f1e1_42%,#eef5ef_100%)]" />
                <div className="absolute right-7 top-8 h-[285px] w-[455px] rounded-2xl border border-[#d7c7aa] bg-[#090b0f] p-5 shadow-[0_34px_90px_rgba(41,37,28,0.26)]">
                  <div className="flex items-start justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f1b51d]">
                        Basis Cockpit
                      </p>
                      <p className="mt-2 text-lg font-semibold text-white">
                        Active Bid Desk
                      </p>
                    </div>
                    <span className="rounded-full border border-emerald-300/35 bg-emerald-300/12 px-3 py-1 text-xs font-semibold text-emerald-200">
                      Pilot ready
                    </span>
                  </div>
                  <div className="mt-5 grid gap-3">
                    {[
                      ["Review", `${activeProjects}`, "active bids"],
                      ["Estimate", formatCurrency(totalEstimatedValue), "pipeline"],
                      ["Submit", `${readyToPackage}`, "ready packages"],
                    ].map(([label, value, status]) => (
                      <div
                        key={label}
                        className="grid grid-cols-[1fr_auto] items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                      >
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
                            {label}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-white">
                            {value}
                          </p>
                        </div>
                        <p className="font-mono text-xs font-semibold text-[#f1b51d]">
                          {status}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="absolute -right-5 bottom-8 w-[170px] rounded-xl border border-[#f1b51d]/25 bg-[#f1b51d]/12 p-4 backdrop-blur">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f1b51d]">
                      Inputs
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-white/70">
                      <p>Cost Library</p>
                      <p>Trade Rates</p>
                      <p>Project Scope</p>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-8 left-8 rounded-full border border-[#d7c7aa] bg-white/82 px-4 py-2 text-xs font-semibold text-[#5d5546] shadow-[0_14px_40px_rgba(41,37,28,0.12)] backdrop-blur">
                  <span className="inline-flex items-center gap-2">
                    <PackageCheck className="h-3.5 w-3.5 text-[#c48d12]" />
                    Review to Estimate to Submit
                  </span>
                </div>
              </div>
            </div>
          </div>

          <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div
              data-tour="subscription-status"
              className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.07)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#716855]">
                    Membership
                  </p>
                  <h2 className="mt-3 text-lg font-semibold text-[#171714]">
                    {subscription?.plan || "The Contractor Circle"}
                  </h2>
                  <p className="mt-1 text-xs text-[#716855]">
                    {subLoading ? (
                      "Loading subscription..."
                    ) : subscription?.currentPeriodEnd ? (
                      `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                    ) : subscription?.status === "active" ? (
                      "$497/month subscription"
                    ) : (
                      "No active subscription"
                    )}
                  </p>
                </div>
                <Zap className="h-5 w-5 text-[#c48d12]" />
              </div>
              {member?.createdAt && (
                <div className="mt-4 border-t border-[#eadcc4] pt-4">
                  <p className="flex items-center gap-2 text-xs text-[#716855]">
                    <Clock className="h-3.5 w-3.5 text-[#8a806d]" />
                    Member since {new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              )}
              {subscription?.cancelAtPeriodEnd && (
                <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3">
                  <p className="flex items-center gap-2 text-sm text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    Your subscription will end at the current billing period.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.07)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#716855]">
                    Bid Pipeline
                  </p>
                  <p className="mt-3 font-mono text-2xl font-semibold text-[#171714]">
                    {activeProjects}
                  </p>
                  <p className="mt-1 text-xs text-[#716855]">
                    active of {totalProjects} total projects
                  </p>
                </div>
                <BriefcaseBusiness className="h-5 w-5 text-[#c48d12]" />
              </div>
            </div>

            <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.07)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#716855]">
                Estimated Value
              </p>
              <p className="mt-3 font-mono text-2xl font-semibold text-[#171714]">
                {formatCurrency(totalEstimatedValue)}
              </p>
              <p className="mt-1 text-xs text-[#716855]">
                across ConstructLine projects
              </p>
            </div>
          </aside>
        </section>

        <section
          data-tour="quick-links"
          className="mt-6 rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_18px_55px_rgba(41,37,28,0.07)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#716855]">
                Product Entry Points
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold text-[#171714]">
                Start in ConstructLine
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate("/portal/takeoff")}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d7c7aa] bg-[#fffdf8] px-4 text-sm font-semibold text-[#171714] transition-colors hover:bg-[#fff4cb]"
            >
              New Bid
              <ArrowRight className="h-4 w-4 text-[#8a6510]" />
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {constructLineLinks.map(link => {
              const Icon = link.icon;
              return (
                <button
                  key={link.title}
                  type="button"
                  onClick={() => navigate(link.href)}
                  className="group rounded-xl border border-[#eadcc4] bg-[#fffdf8] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#d7b44d] hover:shadow-[0_20px_55px_rgba(41,37,28,0.10)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-[#d7c7aa] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#716855]">
                      {link.label}
                    </span>
                  </div>
                  <p className="mt-4 font-semibold text-[#171714]">
                    {link.title}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#716855]">
                    {link.description}
                  </p>
                  <div className="mt-4 flex justify-end">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d7c7aa] text-[#8a6510] transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
          <section className="rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_18px_55px_rgba(41,37,28,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-xl font-semibold text-[#171714]">
                  Recent Basis Work
                </h2>
                <p className="mt-1 text-sm text-[#716855]">
                  Pick up the bid that needs your next decision.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/portal/takeoff")}
                className="text-sm font-semibold text-[#8a6510] hover:text-[#171714]"
              >
                View all projects
              </button>
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-[#eadcc4]">
              {recentProjects.length === 0 ? (
                <button
                  type="button"
                  onClick={() => navigate("/portal/takeoff")}
                  className="flex w-full items-center gap-3 bg-[#faf8f2] p-5 text-left transition-colors hover:bg-[#fff4cb]"
                >
                  <Ruler className="h-5 w-5 text-[#8a6510]" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#171714]">
                      Start your first Basis bid
                    </p>
                    <p className="text-sm text-[#716855]">
                      Upload drawings and build the estimate from source evidence.
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8a6510]" />
                </button>
              ) : (
                recentProjects.map((project: any, index: number) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => navigate(`/takeoff/${project.id}`)}
                    className={`grid w-full gap-4 p-4 text-left transition-colors hover:bg-[#faf8f2] md:grid-cols-[minmax(0,1fr)_150px_120px] md:items-center ${
                      index > 0 ? "border-t border-[#eadcc4]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[#171714]">
                        {project.name}
                      </p>
                      <p className="mt-1 text-xs text-[#716855]">
                        {project.totalSheets || 0} sheet
                        {project.totalSheets === 1 ? "" : "s"} - Updated{" "}
                        {formatProjectDate(project.updatedAt || project.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#716855]">
                        Bid Total
                      </p>
                      <p className="mt-1 font-mono text-lg font-semibold text-[#171714]">
                        {formatCurrency(project.totalEstimatedCost)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-[#8a6510] md:justify-end">
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <aside className="rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_18px_55px_rgba(41,37,28,0.07)]">
            <h2 className="font-heading text-xl font-semibold text-[#171714]">
              Circle Resources
            </h2>
            <p className="mt-1 text-sm text-[#716855]">
              Coaching and member assets stay one click away.
            </p>
            <div className="mt-5 grid gap-3">
              {quickLinks.map(link => (
                <a
                  key={link.title}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  className="group flex items-start gap-4 rounded-xl border border-[#eadcc4] bg-[#fffdf8] p-4 transition-colors hover:bg-[#fff4cb]"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${link.bg}`}>
                    <link.icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#171714]">
                        {link.title}
                      </h3>
                      {link.external && (
                        <ExternalLink className="h-3 w-3 text-[#8a806d]" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#716855]">
                      {link.description}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-xl border border-black/10 bg-[#07090b] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-[#f1b51d]">
            Member Operations
          </p>
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-5">
              {/* Calendar Integration — Available to all members */}
              <CalendarIntegration />

              {/* Monthly Bootcamp — Topic Submission */}
              {isSubscribed && <BootcampTopicWidget />}

              {/* Gated content for subscribers only */}
              {isSubscribed ? (
                <>
                  <button
                    onClick={() => setQuestionModalOpen(true)}
                    className="group w-full rounded-2xl border border-ember/15 bg-white/[0.04] p-5 text-left transition-all duration-300 hover:border-ember/35 hover:bg-ember/[0.04] sm:p-6"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ember/10 transition-colors group-hover:bg-ember/15">
                        <Send className="h-6 w-6 text-ember" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading text-base font-bold text-cream transition-colors group-hover:text-ember">
                          Submit a Question for the Next Call
                        </h3>
                        <p className="mt-0.5 text-sm text-cream-muted">
                          Marshall reviews every submission - get your question answered live.
                        </p>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ember/10 transition-colors group-hover:bg-ember/20">
                        <Send className="h-3.5 w-3.5 text-ember" />
                      </div>
                    </div>
                  </button>

                  <SuccessStoriesForm />
                </>
              ) : (
                <div className="rounded-2xl border border-ember/20 bg-white/[0.04] p-6 text-center md:p-8">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ember/10">
                    <Crown className="h-7 w-7 text-ember" />
                  </div>
                  <h3 className="mb-2 font-heading text-xl font-bold text-cream">
                    Unlock Full Portal Access
                  </h3>
                  <p className="mx-auto mb-6 max-w-md text-sm text-cream-muted">
                    You're previewing the Contractor Circle portal. Subscribe to unlock live call access, question submissions, templates, replays, and the private Discord community.
                  </p>
                  <a
                    href="/circle#pricing"
                    className="inline-flex items-center gap-2 rounded-xl bg-ember px-8 py-3.5 font-semibold text-white shadow-lg shadow-ember/30 transition-all duration-300 hover:bg-ember/90 hover:shadow-ember/50"
                  >
                    <Crown className="h-4 w-4" />
                    Become a Member - $497/mo
                  </a>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <QuestionSubmitWidget />
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center md:p-8">
                <blockquote className="mx-auto max-w-2xl font-heading text-lg italic leading-relaxed text-cream/80 md:text-xl">
                  "The difference between a contractor and a business owner is the system they build around themselves."
                </blockquote>
                <p className="mt-4 text-sm font-medium text-ember">
                  - Marshall Wilkinson
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
