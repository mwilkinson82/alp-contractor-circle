/**
 * Admin Panel — Replay Library Management
 * Only visible to members with memberRole === "admin".
 * Lets Marshall add, edit, and delete Cloudflare Stream replays without touching code.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";
import {
  Plus,
  Trash2,
  Edit3,
  Video,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Shield,
  MessageCircle,
  Star,
  Archive,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Save,
  CalendarDays,
  Clock,
  Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { OnlineUsersPanel } from "@/components/OnlineUsersWidget";
import { ActivityFeedPanel } from "@/components/ActivityFeed";

type Category = "weekly_calls" | "bootcamp" | "masterclass" | "q_and_a";

const CATEGORY_LABELS: Record<Category, string> = {
  weekly_calls: "Contractor Circle Call",
  bootcamp: "Bootcamp",
  masterclass: "Masterclass",
  q_and_a: "Q&A Session",
};

const CATEGORY_COLORS: Record<Category, string> = {
  weekly_calls: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  bootcamp: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  masterclass: "bg-ember/10 text-ember border-ember/20",
  q_and_a: "bg-green-500/10 text-green-400 border-green-500/20",
};

type VideoSource = "cloudflare" | "zoom_clips";

interface ReplayFormData {
  title: string;
  description: string;
  category: Category;
  videoSource: VideoSource;
  cloudflareStreamId: string;
  zoomClipsUrl: string;
  duration: string;
  callDate: string;
  featured: boolean;
}

const emptyForm: ReplayFormData = {
  title: "",
  description: "",
  category: "weekly_calls",
  videoSource: "cloudflare",
  cloudflareStreamId: "",
  zoomClipsUrl: "",
  duration: "",
  callDate: new Date().toISOString().split("T")[0],
  featured: false,
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-cream-muted", bg: "bg-white/5" },
  selected_for_call: { label: "Selected for Call", color: "text-green-400", bg: "bg-green-500/10" },
  selected_for_bootcamp: { label: "For Bootcamp", color: "text-blue-400", bg: "bg-blue-500/10" },
  answered: { label: "Answered", color: "text-ember", bg: "bg-ember/10" },
  archived: { label: "Archived", color: "text-cream-muted/50", bg: "bg-white/5" },
};

const BOOTCAMP_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  submitted: { label: "Submitted", color: "text-cream-muted", bg: "bg-white/5" },
  selected: { label: "Selected", color: "text-green-400", bg: "bg-green-500/10" },
  not_selected: { label: "Not Selected", color: "text-cream-muted/50", bg: "bg-white/5" },
};

function NextCallSettingsPanel() {
  const { data: settingsData, isLoading, refetch } = trpc.member.getSettings.useQuery(undefined, { retry: false });
  const updateSettings = trpc.member.updateSettings.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Next call settings updated!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const settings = settingsData?.settings || {};

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dayLabel, setDayLabel] = useState("");
  const [focus, setFocus] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (settingsData && !initialized) {
    setDate(settings.next_call_date || "");
    setTime(settings.next_call_time || "17:00");
    setDayLabel(settings.next_call_day_label || "Sunday");
    setFocus(settings.next_call_month_focus || "Systems & Processes \u00b7 Attention, People Process Framework");
    setInitialized(true);
  }

  function handleDateChange(newDate: string) {
    setDate(newDate);
    if (newDate) {
      const d = new Date(newDate + "T12:00:00Z");
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setDayLabel(days[d.getUTCDay()]);
    }
  }

  function formatTimeDisplay(t: string): string {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour24 = parseInt(h);
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
    return `${hour12}:${m} ${ampm} ET`;
  }

  function handleSave() {
    updateSettings.mutate({
      settings: {
        next_call_date: date,
        next_call_time: time,
        next_call_day_label: dayLabel,
        next_call_month_focus: focus,
      },
    });
  }

  const hasChanges = initialized && (
    date !== (settings.next_call_date || "") ||
    time !== (settings.next_call_time || "") ||
    dayLabel !== (settings.next_call_day_label || "") ||
    focus !== (settings.next_call_month_focus || "")
  );

  const previewDisplay = date && dayLabel && time
    ? (() => {
        const d = new Date(date + "T12:00:00Z");
        const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
        const dayNum = d.getUTCDate();
        return `${dayLabel}, ${month} ${dayNum} at ${formatTimeDisplay(time)}`;
      })()
    : "";

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CalendarDays className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-cream">Next Live Call</h2>
            <p className="text-cream-muted text-xs mt-0.5">
              Update the next call date, time, and monthly focus. Shown on the /join page hero and member dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-cream-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Call Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => handleDateChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-cream text-sm focus:outline-none focus:border-ember/40 [color-scheme:dark]"
                />
                {dayLabel && (
                  <p className="text-xs text-cream-muted/60 mt-1.5">
                    Auto-detected: <span className="text-cream">{dayLabel}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Time (Eastern)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-cream text-sm focus:outline-none focus:border-ember/40 [color-scheme:dark]"
                />
                {time && (
                  <p className="text-xs text-cream-muted/60 mt-1.5">
                    Displays as: <span className="text-cream">{formatTimeDisplay(time)}</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                <Settings className="w-3.5 h-3.5" />
                This Month's Focus
              </label>
              <input
                type="text"
                value={focus}
                onChange={e => setFocus(e.target.value)}
                placeholder="Systems & Processes \u00b7 Attention, People Process Framework"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-cream text-sm placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40"
              />
            </div>

            {previewDisplay && (
              <div className="p-3.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/15">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Join Page Preview</p>
                <p className="text-cream text-sm font-medium">{previewDisplay}</p>
                <p className="text-cream-muted text-xs mt-1">{focus}</p>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!hasChanges || updateSettings.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ember text-obsidian text-sm font-bold hover:bg-ember/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {updateSettings.isPending ? "Saving..." : "Save Next Call Settings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BootcampSettingsPanel() {
  const { data: settingsData, isLoading, refetch } = trpc.member.getSettings.useQuery(undefined, { retry: false });
  const updateSettings = trpc.member.updateSettings.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Bootcamp settings updated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const settings = settingsData?.settings || {};

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dayLabel, setDayLabel] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form from fetched settings
  if (settingsData && !initialized) {
    setDate(settings.bootcamp_date || "2026-04-26");
    setTime(settings.bootcamp_time || "17:00");
    setDayLabel(settings.bootcamp_day_label || "Sunday");
    setZoomLink(settings.bootcamp_zoom_link || "");
    setInitialized(true);
  }

  // Auto-detect day of week from date
  function handleDateChange(newDate: string) {
    setDate(newDate);
    if (newDate) {
      const d = new Date(newDate + "T12:00:00Z");
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      setDayLabel(days[d.getUTCDay()]);
    }
  }

  // Format time for display: "17:00" → "5:00 PM ET"
  function formatTimeDisplay(t: string): string {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour24 = parseInt(h);
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
    return `${hour12}:${m} ${ampm} ET`;
  }

  function handleSave() {
    updateSettings.mutate({
      settings: {
        bootcamp_date: date,
        bootcamp_time: time,
        bootcamp_day_label: dayLabel,
        bootcamp_zoom_link: zoomLink,
      },
    });
  }

  const hasChanges = initialized && (
    date !== (settings.bootcamp_date || "") ||
    time !== (settings.bootcamp_time || "") ||
    dayLabel !== (settings.bootcamp_day_label || "") ||
    zoomLink !== (settings.bootcamp_zoom_link || "")
  );

  // Preview display
  const previewDisplay = date && dayLabel && time
    ? (() => {
        const d = new Date(date + "T12:00:00Z");
        const month = d.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
        const dayNum = d.getUTCDate();
        return `${dayLabel}, ${month} ${dayNum} at ${formatTimeDisplay(time)}`;
      })()
    : "";

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-semibold text-cream">Bootcamp Settings</h2>
            <p className="text-cream-muted text-xs mt-0.5">
              Update the next bootcamp date, time, and Zoom link. Changes are reflected immediately on the member dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center gap-2 text-cream-muted text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading settings...
          </div>
        ) : (
          <>
            {/* Date + Time row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Bootcamp Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => handleDateChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-cream text-sm focus:outline-none focus:border-ember/40 [color-scheme:dark]"
                />
                {dayLabel && (
                  <p className="text-xs text-cream-muted/60 mt-1.5">
                    Auto-detected: <span className="text-cream">{dayLabel}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                  <Clock className="w-3.5 h-3.5" />
                  Time (Eastern)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-cream text-sm focus:outline-none focus:border-ember/40 [color-scheme:dark]"
                />
                {time && (
                  <p className="text-xs text-cream-muted/60 mt-1.5">
                    Displays as: <span className="text-cream">{formatTimeDisplay(time)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Zoom link */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-cream-muted mb-2 uppercase tracking-wider">
                <Link2 className="w-3.5 h-3.5" />
                Zoom Meeting Link
              </label>
              <input
                type="url"
                value={zoomLink}
                onChange={e => setZoomLink(e.target.value)}
                placeholder="https://us06web.zoom.us/j/..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-cream text-sm placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40"
              />
            </div>

            {/* Preview */}
            {previewDisplay && (
              <div className="p-3.5 rounded-xl bg-ember/[0.06] border border-ember/15">
                <p className="text-xs font-semibold text-ember uppercase tracking-wider mb-1">Member Dashboard Preview</p>
                <p className="text-cream text-sm font-medium">{previewDisplay}</p>
              </div>
            )}

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateSettings.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ember text-obsidian text-sm font-bold hover:bg-ember/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {updateSettings.isPending ? "Saving..." : "Save Bootcamp Settings"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function BootcampTopicsReviewPanel() {
  const { data, isLoading, refetch } = trpc.member.adminBootcampTopics.useQuery(undefined, { retry: false });
  const updateStatus = trpc.member.updateBootcampTopicStatus.useMutation({ onSuccess: () => refetch() });
  const [filter, setFilter] = useState<string>("all");

  const topics = data?.topics || [];
  const filtered = filter === "all" ? topics : topics.filter((t: any) => t.status === filter);
  const pendingCount = topics.filter((t: any) => t.status === "submitted").length;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-ember" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-cream">Bootcamp Topics</h2>
              <p className="text-cream-muted text-xs mt-0.5">
                {pendingCount > 0 ? `${pendingCount} new topic${pendingCount > 1 ? "s" : ""} submitted` : "No pending topics"}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "submitted", "selected", "not_selected"].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === s ? "bg-ember text-obsidian" : "bg-white/5 text-cream-muted hover:bg-white/10"
                }`}
              >
                {s === "all" ? `All (${topics.length})` : BOOTCAMP_STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {isLoading ? (
          <div className="p-8 text-center text-cream-muted text-sm">Loading topics...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-cream-muted text-sm">No bootcamp topics submitted yet.</div>
        ) : (
          filtered.map((t: any) => {
            const cfg = BOOTCAMP_STATUS_CONFIG[t.status] || BOOTCAMP_STATUS_CONFIG.pending;
            return (
              <div key={t.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-ember">
                        {t.memberName || t.memberUsername || `Member #${t.memberId}`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-cream-muted/50">
                        {t.bootcampDate} &middot; {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-cream text-sm leading-relaxed font-medium">{t.topic}</p>
                    {t.reason && (
                      <p className="text-cream-muted text-xs mt-1.5 italic">Why: {t.reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {t.status === "submitted" && (
                      <>
                        <button
                          onClick={() => updateStatus.mutate({ topicId: t.id, status: "selected" })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                          title="Select for bootcamp"
                        >
                          <ThumbsUp className="w-3.5 h-3.5" /> Select
                        </button>
                        <button
                          onClick={() => updateStatus.mutate({ topicId: t.id, status: "not_selected" })}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-cream-muted text-xs font-medium hover:bg-white/10 transition-colors"
                          title="Not selected"
                        >
                          <ThumbsDown className="w-3.5 h-3.5" /> Pass
                        </button>
                      </>
                    )}
                    {t.status !== "submitted" && (
                      <button
                        onClick={() => updateStatus.mutate({ topicId: t.id, status: "submitted" })}
                        className="px-2.5 py-1.5 rounded-lg bg-white/5 text-cream-muted text-xs font-medium hover:bg-white/10 transition-colors"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function QuestionsReviewPanel() {
  const { data, isLoading, refetch } = trpc.member.adminQuestions.useQuery(undefined, { retry: false });
  const updateStatus = trpc.member.updateQuestionStatus.useMutation({ onSuccess: () => refetch() });
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [noteInputs, setNoteInputs] = useState<Record<number, string>>({});

  const questions = data?.questions || [];
  const filtered = filter === "all" ? questions : questions.filter((q: any) => q.status === filter);
  const pendingCount = questions.filter((q: any) => q.status === "pending").length;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ember/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-ember" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-cream">Member Questions</h2>
              <p className="text-cream-muted text-xs mt-0.5">
                {pendingCount > 0 ? `${pendingCount} new question${pendingCount > 1 ? "s" : ""} awaiting review` : "All questions reviewed"}
              </p>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {["all", "pending", "selected_for_call", "selected_for_bootcamp", "answered", "archived"].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  filter === s ? "bg-ember text-obsidian" : "bg-white/5 text-cream-muted hover:bg-white/10"
                }`}
              >
                {s === "all" ? `All (${questions.length})` : STATUS_CONFIG[s]?.label || s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {isLoading ? (
          <div className="p-8 text-center text-cream-muted text-sm">Loading questions...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-cream-muted text-sm">No questions in this category yet.</div>
        ) : (
          filtered.map((q: any) => {
            const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG.pending;
            const isExpanded = expandedId === q.id;
            return (
              <div key={q.id} className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-semibold text-ember">
                        {q.memberName || q.memberUsername || `Member #${q.memberId}`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-cream-muted/50">
                        {new Date(q.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-cream text-sm leading-relaxed">{q.question}</p>
                    {q.context && (
                      <p className="text-cream-muted text-xs mt-1.5 italic">Context: {q.context}</p>
                    )}
                    {q.adminNotes && (
                      <p className="text-ember text-xs mt-1.5">Note: {q.adminNotes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : q.id)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-white/5 text-cream-muted text-xs hover:bg-white/10 transition-colors"
                  >
                    {isExpanded ? "Close" : "Actions"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateStatus.mutate({ id: q.id, status: "selected_for_call", adminNotes: noteInputs[q.id] })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" /> Select for Call
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: q.id, status: "selected_for_bootcamp", adminNotes: noteInputs[q.id] })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" /> Select for Bootcamp
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: q.id, status: "answered", adminNotes: noteInputs[q.id] })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ember/10 text-ember text-xs font-medium hover:bg-ember/20 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Answered
                      </button>
                      <button
                        onClick={() => updateStatus.mutate({ id: q.id, status: "archived" })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 text-cream-muted text-xs font-medium hover:bg-white/10 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" /> Archive
                      </button>
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Add a note (optional)..."
                        value={noteInputs[q.id] || ""}
                        onChange={e => setNoteInputs(n => ({ ...n, [q.id]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream text-xs placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function PortalAdmin() {
  const { member } = useMember();
  const [, setLocation] = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReplayFormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Redirect non-admins
  if (member && member.memberRole !== "admin") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-cream mb-2">Access Denied</h2>
        <p className="text-cream-muted mb-6">This area is restricted to administrators.</p>
        <Button onClick={() => setLocation("/portal")} variant="outline" className="border-white/10 text-cream">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const utils = trpc.useUtils();

  // Fetch all replays (admin sees all including unpublished)
  const { data, isLoading } = trpc.member.replays.useQuery();
  const replays = data?.replays || [];

  const addMutation = trpc.member.addReplay.useMutation({
    onSuccess: () => {
      utils.member.replays.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Replay added! It's now live in the library.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateMutation = trpc.member.updateReplay.useMutation({
    onSuccess: () => {
      utils.member.replays.invalidate();
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success("Replay updated.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = trpc.member.deleteReplay.useMutation({
    onSuccess: () => {
      utils.member.replays.invalidate();
      setDeleteConfirm(null);
      toast.success("Replay deleted.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.callDate) {
      toast.error("Title and date are required.");
      return;
    }
    if (form.videoSource === "cloudflare" && !form.cloudflareStreamId) {
      toast.error("Cloudflare Stream ID is required.");
      return;
    }
    if (form.videoSource === "zoom_clips" && !form.zoomClipsUrl) {
      toast.error("Zoom Clips embed URL is required.");
      return;
    }
    const payload = {
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      videoSource: form.videoSource,
      cloudflareStreamId: form.videoSource === "cloudflare" ? form.cloudflareStreamId : undefined,
      zoomClipsUrl: form.videoSource === "zoom_clips" ? form.zoomClipsUrl : undefined,
      duration: form.duration || undefined,
      callDate: new Date(form.callDate),
      featured: form.featured,
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...payload });
      return;
    }

    addMutation.mutate(payload);
  }

  function handleEdit(replay: typeof replays[0]) {
    setForm({
      title: replay.title,
      description: replay.description || "",
      category: replay.category as Category,
      videoSource: (replay.videoSource as VideoSource) || "cloudflare",
      cloudflareStreamId: replay.cloudflareStreamId || "",
      zoomClipsUrl: replay.zoomClipsUrl || "",
      duration: replay.duration || "",
      callDate: new Date(replay.callDate).toISOString().split("T")[0],
      featured: replay.featured,
    });
    setEditingId(replay.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Online Users + Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OnlineUsersPanel />
        <ActivityFeedPanel />
      </div>

      {/* Questions Review Section */}
      <QuestionsReviewPanel />

      {/* Next Live Call Settings */}
      <NextCallSettingsPanel />

      {/* Bootcamp Settings */}
      <BootcampSettingsPanel />

      {/* Bootcamp Topics Review Section */}
      <BootcampTopicsReviewPanel />

      {/* Header */}
      <div className="overflow-hidden rounded-lg border border-[#d7c7aa]/14 bg-[#f8f5ef] text-[#171714] shadow-[0_28px_80px_rgba(0,0,0,0.22)]">
        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-[#d7c7aa] bg-white/70 px-3 py-1.5">
            <Shield className="w-4 h-4 text-[#9b6d23]" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9b6d23]">Admin Panel</span>
          </div>
          <h1 className="font-heading text-2xl font-semibold tracking-normal text-[#11100c] md:text-4xl">
            Replay Library Manager
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6d6558]">
            Publish calls, bootcamps, and masterclasses with clean member-facing titles, summaries, thumbnails, and featured placement.
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="shrink-0 bg-ember text-white shadow-[0_12px_30px_rgba(212,145,92,0.24)] hover:bg-ember/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Replay
          </Button>
        )}
        </div>
      </div>

      {/* Cloudflare Workflow Guide */}
      <div className="rounded-lg border border-white/10 bg-[#0b0e11] p-4 sm:p-5">
        <h3 className="font-heading text-sm font-semibold text-cream mb-3 flex items-center gap-2">
          <Video className="w-4 h-4 text-ember" />
          Publishing checklist
        </h3>
        <ol className="grid gap-2 text-sm text-cream-muted lg:grid-cols-2">
          <li className="flex gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Zoom sends you the recording link automatically after the call ends.</span>
          </li>
          <li className="flex gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>
              Open{" "}
              <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-ember hover:underline inline-flex items-center gap-1">
                Cloudflare Stream <ExternalLink className="w-3 h-3" />
              </a>
              {" "}→ Upload → "Upload via URL" → paste the Zoom recording link.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Once processed, copy the <strong className="text-cream">Video ID</strong> from Cloudflare Stream (it looks like: <code className="text-ember bg-ember/5 px-1 rounded text-xs">a4eXaMpLeId123</code>).</span>
          </li>
          <li className="flex gap-3 rounded-lg border border-white/8 bg-white/[0.03] p-3">
            <span className="w-5 h-5 rounded-full bg-ember/10 text-ember text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">4</span>
            <span>Add the replay, write a short useful summary, and feature only the sessions members should see first.</span>
          </li>
        </ol>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-ember/20 bg-[#0b0e11] p-4 sm:p-6 md:p-8">
          <h2 className="font-heading text-lg font-semibold text-cream mb-1">
            {editingId ? "Edit Replay" : "Add New Replay"}
          </h2>
          <p className="mb-6 text-sm text-cream-muted">
            Member-facing copy should help someone decide what to watch in five seconds.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Title */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Title <span className="text-ember">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekly Call: Scaling Your Estimating Process"
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50"
                  required
                />
              </div>

              {/* Video Source Toggle */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Video Source <span className="text-ember">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, videoSource: "cloudflare" }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                      form.videoSource === "cloudflare"
                        ? "bg-ember/20 border-ember text-ember"
                        : "bg-white/5 border-white/10 text-cream-muted hover:bg-white/10"
                    }`}
                  >
                    Cloudflare Stream
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, videoSource: "zoom_clips" }))}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all border ${
                      form.videoSource === "zoom_clips"
                        ? "bg-blue-500/20 border-blue-500 text-blue-400"
                        : "bg-white/5 border-white/10 text-cream-muted hover:bg-white/10"
                    }`}
                  >
                    Zoom Clips
                  </button>
                </div>
              </div>

              {/* Cloudflare Stream ID (shown when cloudflare selected) */}
              {form.videoSource === "cloudflare" && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                    Cloudflare Stream Video ID <span className="text-ember">*</span>
                  </label>
                  <Input
                    value={form.cloudflareStreamId}
                    onChange={e => setForm(f => ({ ...f, cloudflareStreamId: e.target.value.trim() }))}
                    placeholder="e.g. a4eXaMpLeId123abc456"
                    className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50 font-mono text-sm"
                    required
                  />
                  {form.cloudflareStreamId && (
                    <p className="text-xs text-cream-muted mt-1.5">
                      Preview:{" "}
                      <a
                        href={`https://iframe.videodelivery.net/${form.cloudflareStreamId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ember hover:underline inline-flex items-center gap-1"
                      >
                        Open embed URL <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  )}
                </div>
              )}

              {/* Zoom Clips Embed Code (shown when zoom_clips selected) */}
              {form.videoSource === "zoom_clips" && (
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                    Zoom Clips Embed Code <span className="text-blue-400">*</span>
                  </label>
                  <textarea
                    value={form.zoomClipsUrl}
                    onChange={e => {
                      const raw = e.target.value;
                      // Auto-extract src URL from iframe embed code
                      const srcMatch = raw.match(/src=["']([^"']+)["']/);
                      const extracted = srcMatch ? srcMatch[1] : raw.trim();
                      setForm(f => ({ ...f, zoomClipsUrl: extracted }));
                    }}
                    placeholder='Paste the full embed code from Zoom Clips (the <div> block with the <iframe>)'
                    className="w-full min-h-[80px] px-3 py-2 bg-white/5 border border-white/10 rounded-md text-cream placeholder:text-cream-muted/40 focus:border-blue-500/50 font-mono text-xs resize-y"
                    required
                  />
                  <p className="text-xs text-cream-muted mt-1.5">
                    In Zoom, go to your Clip → Share → Embed tab → paste the <strong>entire embed code</strong>. The URL will be extracted automatically.
                  </p>
                  {form.zoomClipsUrl && (
                    <div className="mt-2 p-2 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                      <p className="text-xs text-blue-400 font-mono truncate">
                        Extracted URL: {form.zoomClipsUrl}
                      </p>
                      <a
                        href={form.zoomClipsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        Open in new tab <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Category
                </label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm(f => ({ ...f, category: val as Category }))}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-cream focus:border-ember/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy border-white/10">
                    {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([val, label]) => (
                      <SelectItem key={val} value={val} className="text-cream focus:bg-ember/10 focus:text-ember">
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Call Date */}
              <div>
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Call Date <span className="text-ember">*</span>
                </label>
                <Input
                  type="date"
                  value={form.callDate}
                  onChange={e => setForm(f => ({ ...f, callDate: e.target.value }))}
                  className="bg-white/5 border-white/10 text-cream focus:border-ember/50"
                  required
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Duration
                </label>
                <Input
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                  placeholder="e.g. 1h 24m"
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50"
                />
              </div>

              {/* Featured */}
              <div className="flex items-center gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, featured: !f.featured }))}
                  className={`w-10 h-6 rounded-full transition-all duration-200 relative ${form.featured ? "bg-ember" : "bg-white/10"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200 ${form.featured ? "left-5" : "left-1"}`} />
                </button>
                <span className="text-sm text-cream-muted">Feature at top of library</span>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-cream-muted uppercase tracking-wider mb-2">
                  Description
                </label>
                <Textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of what was covered in this session..."
                  className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 focus:border-ember/50 resize-none"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={addMutation.isPending || updateMutation.isPending}
                className="bg-ember hover:bg-ember/90 text-white"
              >
                {addMutation.isPending || updateMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" /> {editingId ? "Update Replay" : "Add Replay"}</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelForm}
                className="border-white/10 text-cream-muted hover:text-cream"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Replay List */}
      <div>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Published Library</p>
            <h2 className="font-heading text-xl font-semibold text-cream">
              All Replays ({replays.length})
            </h2>
          </div>
          <p className="text-sm text-cream-muted">Newest sessions appear first for members.</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-ember animate-spin" />
          </div>
        ) : replays.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Video className="w-10 h-10 text-cream-muted/30 mx-auto mb-3" />
            <p className="text-cream-muted">No replays yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {replays.map(replay => (
              <div
                key={replay.id}
                className="rounded-lg border border-white/10 bg-[#0e1114] p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-colors hover:border-ember/20 hover:bg-[#12161a]"
              >
                {/* Thumbnail */}
                <div className="w-full sm:w-32 h-20 rounded-lg overflow-hidden bg-white/5 shrink-0 flex items-center justify-center">
                  {replay.thumbnailUrl ? (
                    <img
                      src={replay.thumbnailUrl}
                      alt={replay.title}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <Video className="w-6 h-6 text-blue-400/60" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[replay.category as Category]}`}>
                      {CATEGORY_LABELS[replay.category as Category]}
                    </span>
                    {replay.featured && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                        Featured
                      </span>
                    )}
                  </div>
                  <h3 className="font-heading text-sm font-semibold text-cream truncate">{replay.title}</h3>
                  {replay.description && (
                    <p className="mt-1 line-clamp-1 text-xs text-cream-muted">
                      {replay.description}
                    </p>
                  )}
                  <p className="text-xs text-cream-muted mt-0.5">
                    {new Date(replay.callDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {replay.duration && ` · ${replay.duration}`}
                    {" · "}
                    <span className="font-mono text-ember/70">
                      {replay.videoSource === "zoom_clips" ? "Zoom Clips" : replay.cloudflareStreamId}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={replay.embedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                    title="Preview video"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cream-muted" />
                  </a>
                  <button
                    onClick={() => handleEdit(replay)}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-ember/10 flex items-center justify-center transition-colors"
                    title="Edit replay"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-cream-muted hover:text-ember" />
                  </button>
                  {deleteConfirm === replay.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate({ id: replay.id })}
                        disabled={deleteMutation.isPending}
                        className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                      >
                        {deleteMutation.isPending ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 rounded-lg bg-white/5 text-cream-muted text-xs transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(replay.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-500/10 flex items-center justify-center transition-colors"
                      title="Delete replay"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-cream-muted hover:text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
