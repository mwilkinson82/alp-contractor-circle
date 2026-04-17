/**
 * Member Dashboard — The Contractor Circle portal home.
 * Shows welcome message, subscription status, quick links, and upcoming events.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  Crown,
  Calendar,
  PlayCircle,
  FileDown,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
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
import { SubscriptionGate } from "@/components/portal/SubscriptionGate";
import { CalendarIntegration } from "@/components/portal/CalendarIntegration";

const DISCORD_INVITE = "https://discord.gg/KUTmm9D5aW";

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
const NEXT_BOOTCAMP_DATE = "2025-04-26";
const NEXT_BOOTCAMP_DISPLAY = "Saturday, April 26 at 5 PM ET";
const BOOTCAMP_ZOOM_LINK = "https://us06web.zoom.us/j/87028206220?pwd=k2YtkNdLz7y1nnkZt0HFSe0obntSnl.1";

// Generate Google Calendar add link for the bootcamp
function getBootcampCalendarUrl() {
  // April 26, 2026 5:00 PM ET = 21:00 UTC
  const start = "20260426T210000Z";
  // Assume ~2 hours
  const end = "20260426T230000Z";
  const title = encodeURIComponent("Contractor Circle Monthly Bootcamp");
  const details = encodeURIComponent(
    "Monthly Bootcamp — Deep dive session with Marshall and the Contractor Circle community.\n\n" +
    "Join Zoom Meeting:\n" + BOOTCAMP_ZOOM_LINK + "\n\n" +
    "Meeting ID: 870 2820 6220\nPasscode: 260916\n\n" +
    "Come prepared: water, coffee, pen & paper. 90+ minutes. Audience participation expected."
  );
  const location = encodeURIComponent(BOOTCAMP_ZOOM_LINK);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

function BootcampTopicWidget() {
  const [topic, setTopic] = useState("");
  const [reason, setReason] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

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

  // Countdown
  const bootcampDate = new Date("2025-04-26T21:00:00Z"); // 5 PM ET = 21:00 UTC
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
            href={getBootcampCalendarUrl()}
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
  const { data: subscription, isLoading: subLoading } = trpc.member.subscription.useQuery(undefined, {
    retry: false,
  });
  const [questionModalOpen, setQuestionModalOpen] = useState(false);

  const displayName = member?.displayName || member?.discordUsername || "Member";
  const firstName = displayName.split(" ")[0];

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Question Modal */}
      {questionModalOpen && <QuestionModal onClose={() => setQuestionModalOpen(false)} />}

      {/* Welcome Header */}
      <div data-tour="welcome-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream">
            {greeting}, {firstName}
          </h1>
          <p className="text-cream-muted mt-1">
            Welcome to your Contractor Circle member portal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {member?.memberRole === "founding_member" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20">
              <Crown className="w-3.5 h-3.5 text-ember" />
              <span className="text-xs font-semibold text-ember uppercase tracking-wider">Founding Member</span>
            </span>
          )}
        </div>
      </div>

      {/* Subscription Status Card */}
      <div data-tour="subscription-status" className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ember/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-ember" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-cream">
                {subscription?.plan || "The Contractor Circle"}
              </h2>
              <p className="text-cream-muted text-sm mt-0.5">
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
          </div>
          <StatusBadge status={subscription?.status || member?.subscriptionStatus || "none"} />
        </div>

        {/* Member Since */}
        {member?.createdAt && (
          <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cream-muted/50" />
            <span className="text-xs text-cream-muted">
              Member since {new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>
        )}

        {subscription?.cancelAtPeriodEnd && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Your subscription will end at the current billing period.
            </p>
          </div>
        )}
      </div>

      {/* Calendar Integration — Available to all members */}
      <CalendarIntegration />

      {/* Monthly Bootcamp — Topic Submission */}
      {isSubscribed && <BootcampTopicWidget />}

      {/* Gated content for subscribers only */}
      {isSubscribed ? (
        <>
          {/* Submit a Question — Prominent CTA tile */}
          <button
            onClick={() => setQuestionModalOpen(true)}
            className="w-full group glass-card rounded-2xl p-5 sm:p-6 hover:bg-ember/[0.04] border border-ember/15 hover:border-ember/35 transition-all duration-300 text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-ember/10 group-hover:bg-ember/15 flex items-center justify-center shrink-0 transition-colors">
                <Send className="w-6 h-6 text-ember" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-base font-bold text-cream group-hover:text-ember transition-colors">
                  Submit a Question for the Next Call
                </h3>
                <p className="text-cream-muted text-sm mt-0.5">
                  Marshall reviews every submission — get your question answered live.
                </p>
              </div>
              <div className="shrink-0 w-8 h-8 rounded-full bg-ember/10 group-hover:bg-ember/20 flex items-center justify-center transition-colors">
                <Send className="w-3.5 h-3.5 text-ember" />
              </div>
            </div>
          </button>

          {/* Success Stories Form */}
          <SuccessStoriesForm />
        </>
      ) : (
        /* Non-subscriber CTA */
        <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8 border border-ember/20 text-center">
          <div className="w-14 h-14 rounded-full bg-ember/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-ember" />
          </div>
          <h3 className="font-heading text-xl font-bold text-cream mb-2">Unlock Full Portal Access</h3>
          <p className="text-cream-muted text-sm mb-6 max-w-md mx-auto">
            You're previewing the Contractor Circle portal. Subscribe to unlock live call access, question submissions, templates, replays, and the private Discord community.
          </p>
          <a
            href="/circle#pricing"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-ember hover:bg-ember/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-ember/30 hover:shadow-ember/50"
          >
            <Crown className="w-4 h-4" />
            Become a Member — $497/mo
          </a>
        </div>
      )}

      {/* Quick Links Grid */}
      <div data-tour="quick-links" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(link => (
          <a
            key={link.title}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            onClick={link.href === "#" ? (e) => e.preventDefault() : undefined}
            className="group glass-card rounded-xl p-5 hover:bg-white/[0.03] transition-all duration-300 block"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${link.bg} flex items-center justify-center shrink-0`}>
                <link.icon className={`w-5 h-5 ${link.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-semibold text-cream group-hover:text-ember transition-colors">
                    {link.title}
                  </h3>
                  {link.external && <ExternalLink className="w-3 h-3 text-cream-muted" />}
                </div>
                <p className="text-cream-muted text-xs mt-1">{link.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Submit Question for Next Call */}
      <QuestionSubmitWidget />

      {/* Motivational Quote */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8 text-center">
        <blockquote className="text-cream/80 text-lg md:text-xl font-heading italic leading-relaxed max-w-2xl mx-auto">
          "The difference between a contractor and a business owner is the system they build around themselves."
        </blockquote>
        <p className="text-ember text-sm mt-4 font-medium">— Marshall Wilkinson</p>
      </div>
    </div>
  );
}
