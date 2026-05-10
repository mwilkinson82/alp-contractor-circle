/**
 * Replay Library — Watch past Contractor Circle calls and implementation sessions.
 * Videos are hosted on Cloudflare Stream or Zoom Clips and stored in the database.
 */
import { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Filter,
  Library,
  Play,
  Search,
  Star,
  Video,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMember } from "@/hooks/useMember";
import { SubscriptionGate } from "@/components/portal/SubscriptionGate";

type ReplayCategory = "all" | "weekly_calls" | "bootcamp" | "masterclass" | "q_and_a";
type SortMode = "newest" | "oldest";

type Replay = {
  id: number;
  title: string;
  description?: string | null;
  category: string;
  videoSource?: string | null;
  duration?: string | null;
  callDate: string | Date;
  featured?: boolean | null;
  embedUrl: string;
  thumbnailUrl?: string | null;
};

const CATEGORIES: { value: ReplayCategory; label: string; shortLabel: string }[] = [
  { value: "all", label: "All", shortLabel: "All" },
  { value: "weekly_calls", label: "Calls", shortLabel: "Calls" },
  { value: "bootcamp", label: "Bootcamps", shortLabel: "Boot" },
  { value: "masterclass", label: "Masterclasses", shortLabel: "Class" },
  { value: "q_and_a", label: "Q&A", shortLabel: "Q&A" },
];

const CATEGORY_META: Record<string, { label: string; pill: string; accent: string; hue: number }> = {
  weekly_calls: {
    label: "Contractor Circle Call",
    pill: "bg-blue-100 text-[#244c91] border-blue-200",
    accent: "text-[#244c91]",
    hue: 245,
  },
  bootcamp: {
    label: "Bootcamp",
    pill: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]",
    accent: "text-[#8a6510]",
    hue: 78,
  },
  masterclass: {
    label: "Masterclass",
    pill: "bg-violet-100 text-violet-800 border-violet-200",
    accent: "text-violet-800",
    hue: 35,
  },
  q_and_a: {
    label: "Q&A",
    pill: "bg-[#ede9dd] text-[#5d5546] border-[#d7c7aa]",
    accent: "text-[#5d5546]",
    hue: 290,
  },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? {
    label: category,
    pill: "bg-white text-[#716855] border-[#d7c7aa]",
    accent: "text-[#716855]",
    hue: 245,
  };
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function sortReplays(replays: Replay[], sortMode: SortMode) {
  return [...replays].sort((a, b) => {
    const aTime = new Date(a.callDate).getTime();
    const bTime = new Date(b.callDate).getTime();
    return sortMode === "newest" ? bTime - aTime : aTime - bTime;
  });
}

function truncateText(text: string | null | undefined, limit: number) {
  if (!text) return "";
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
}

interface VideoModalProps {
  replay: Replay;
  onClose: () => void;
}

function VideoModal({ replay, onClose }: VideoModalProps) {
  const iframeSrc =
    replay.videoSource === "zoom_clips"
      ? replay.embedUrl
      : `${replay.embedUrl}?autoplay=true&muted=false`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/74 p-3 backdrop-blur-md sm:p-5"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl overflow-hidden rounded-xl border border-[#d7c7aa] bg-[#fffdf8] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)]"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#d7c7aa] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <ReplayPill replay={replay} />
              <span className="text-xs text-[#716855]">{formatDate(replay.callDate)}</span>
              {replay.duration && <span className="text-xs text-[#716855]">{replay.duration}</span>}
            </div>
            <h3 className="truncate font-heading text-sm font-semibold text-[#171714] sm:text-base">
              {replay.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d7c7aa] bg-white text-[#716855] transition-colors hover:bg-[#faf8f2] hover:text-[#171714]"
            aria-label="Close replay"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={iframeSrc}
            className="absolute inset-0 h-full w-full"
            frameBorder="0"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            title={replay.title}
          />
        </div>
      </div>
    </div>
  );
}

function Thumbnail({
  replay,
  compact = false,
}: {
  replay: Replay;
  compact?: boolean;
}) {
  const meta = getCategoryMeta(replay.category);
  const posterBackground = `linear-gradient(135deg, oklch(0.32 0.06 ${meta.hue}) 0%, oklch(0.22 0.04 ${meta.hue + 20}) 60%, oklch(0.18 0.03 ${meta.hue + 40}) 100%)`;
  return (
    <div
      className="relative aspect-video overflow-hidden rounded-lg"
      style={{ background: posterBackground }}
    >
      {replay.thumbnailUrl ? (
        <img
          src={replay.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={event => {
            (event.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <>
          <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_20%_20%,white_0.5px,transparent_0.5px),radial-gradient(circle_at_70%_60%,white_0.5px,transparent_0.5px)] [background-size:12px_12px,18px_18px]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-[#f8f3e7]/0 transition-colors duration-300 group-hover:to-[#f8f3e7]/10" />
        </>
      )}
      <div className="absolute inset-0 bg-black/14" />
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className={`flex items-center justify-center rounded-full border border-white/50 bg-[#d7a83c] text-[#11100c] shadow-[0_14px_38px_rgba(138,101,16,0.24)] transition-transform group-hover:scale-105 ${
            compact ? "h-10 w-10" : "h-14 w-14"
          }`}
        >
          <Play className={`${compact ? "h-4 w-4" : "h-5 w-5"} ml-0.5 fill-current`} />
        </span>
      </div>
      {replay.duration && (
        <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white">
          {replay.duration}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 h-1 bg-[#d7a83c]/85" />
    </div>
  );
}

function ReplayPill({ replay }: { replay: Replay }) {
  const meta = getCategoryMeta(replay.category);
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${meta.pill}`}>
      {meta.label}
    </span>
  );
}

function ContinueCard({ replay, onPlay }: { replay: Replay; onPlay: (replay: Replay) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(replay)}
      className="group overflow-hidden rounded-xl border border-[#ded2bd] bg-white text-left shadow-[0_12px_30px_rgba(41,37,28,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#d7b44d] hover:shadow-[0_18px_42px_rgba(41,37,28,0.11)]"
    >
      <Thumbnail replay={replay} />
      <div className="space-y-2 p-4">
        <ReplayPill replay={replay} />
        <h3 className="line-clamp-2 font-display text-xl font-semibold leading-snug text-[#171714]">
          {replay.title}
        </h3>
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#716855]">
          {replay.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {replay.duration}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(replay.callDate)}
          </span>
        </div>
      </div>
    </button>
  );
}

function FeaturedCard({ replay, onPlay }: { replay: Replay; onPlay: (replay: Replay) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(replay)}
      className="group overflow-hidden rounded-xl border border-[#ded2bd] bg-white text-left shadow-[0_12px_30px_rgba(41,37,28,0.08)] transition-all hover:-translate-y-0.5 hover:border-[#d7b44d] hover:shadow-[0_18px_42px_rgba(41,37,28,0.11)]"
    >
      <Thumbnail replay={replay} />
      <div className="space-y-2 p-5">
        <ReplayPill replay={replay} />
        <h3 className="font-display text-2xl font-semibold leading-snug text-[#171714]">
          {replay.title}
        </h3>
        {replay.description && (
          <p className="line-clamp-2 text-sm leading-6 text-[#716855]">
            {truncateText(replay.description, 180)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-sm text-[#716855]">
          {replay.duration && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {replay.duration}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {formatDate(replay.callDate)}
          </span>
        </div>
      </div>
    </button>
  );
}

function ReplayRow({ replay, onPlay }: { replay: Replay; onPlay: (replay: Replay) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPlay(replay)}
      className="group grid w-full grid-cols-[104px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-[#ded2bd] bg-white p-3 text-left shadow-[0_8px_22px_rgba(41,37,28,0.055)] transition-all hover:border-[#d7b44d] hover:bg-[#fffdf8] sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:p-4"
    >
      <Thumbnail replay={replay} compact />
      <div className="min-w-0">
        <ReplayPill replay={replay} />
        <h3 className="mt-2 truncate font-display text-lg font-semibold text-[#171714] sm:text-xl">
          {replay.title}
        </h3>
        {replay.description && (
          <p className="mt-1 hidden truncate text-sm text-[#716855] md:block">
            {replay.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-[#716855] md:hidden">
          {replay.duration && <span>{replay.duration}</span>}
          <span>{formatDate(replay.callDate)}</span>
        </div>
      </div>
      <div className="hidden min-w-[76px] text-right text-sm text-[#716855] sm:block">
        {replay.duration && <div>{replay.duration}</div>}
        <div>{formatDate(replay.callDate)}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-[#8a806d] transition-colors group-hover:text-[#8a6510] sm:hidden" />
    </button>
  );
}

function CourseRow({
  title,
  replays,
  onPlay,
}: {
  title: string;
  replays: Replay[];
  onPlay: (replay: Replay) => void;
}) {
  const firstReplay = replays[0];
  if (!firstReplay) return null;

  const totalDuration = replays
    .map(replay => replay.duration)
    .filter(Boolean)
    .join(" + ");

  return (
    <button
      type="button"
      onClick={() => onPlay(firstReplay)}
      className="group grid w-full grid-cols-[110px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-[#ded2bd] bg-white p-3 text-left shadow-[0_8px_22px_rgba(41,37,28,0.055)] transition-all hover:border-[#d7b44d] hover:bg-[#fffdf8] sm:grid-cols-[156px_minmax(0,1fr)_auto] sm:p-4"
    >
      <Thumbnail replay={firstReplay} compact />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9b6d23]">
          Course · {replays.length} {replays.length === 1 ? "Lesson" : "Lessons"}{totalDuration ? ` · ${totalDuration}` : ""}
        </p>
        <h3 className="mt-1 truncate font-display text-xl font-semibold text-[#171714] sm:text-2xl">
          {title}
        </h3>
        <p className="mt-1 text-sm text-[#716855]">Marshall Wilkinson · {replays.length} lessons</p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eee9de]">
          <div className="h-full w-[18%] rounded-full bg-[#d7a83c]" />
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-[#716855]">
        <span className="hidden sm:inline">1/{replays.length}</span>
        <ChevronDown className="h-5 w-5" />
      </div>
    </button>
  );
}

export default function PortalReplays() {
  const [activeCategory, setActiveCategory] = useState<ReplayCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [activeVideo, setActiveVideo] = useState<Replay | null>(null);
  const { isSubscribed } = useMember();

  const { data, isLoading, error } = trpc.member.replays.useQuery();
  const allReplays = (data?.replays ?? []) as Replay[];

  const sortedAllReplays = useMemo(() => sortReplays(allReplays, sortMode), [allReplays, sortMode]);
  const featuredReplays = sortedAllReplays.filter(replay => replay.featured);
  const latestReplays = sortedAllReplays.slice(0, 3);
  const featuredDisplay = (featuredReplays.length > 0 ? featuredReplays : sortedAllReplays).slice(0, 2);

  const filteredReplays = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return sortedAllReplays.filter(replay => {
      if (activeCategory !== "all" && replay.category !== activeCategory) return false;
      if (!normalizedQuery) return true;
      return (
        replay.title.toLowerCase().includes(normalizedQuery) ||
        (replay.description ?? "").toLowerCase().includes(normalizedQuery)
      );
    });
  }, [sortedAllReplays, activeCategory, searchQuery]);

  const circleCalls = filteredReplays.filter(replay => replay.category === "weekly_calls");
  const bootcamps = filteredReplays.filter(replay => replay.category === "bootcamp");
  const masterclasses = filteredReplays.filter(replay => replay.category === "masterclass");
  const qAndA = filteredReplays.filter(replay => replay.category === "q_and_a");

  if (isLoading) {
    return (
      <div className="-m-4 min-h-screen bg-[#f8f5ef] p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="h-44 animate-pulse rounded-xl bg-white/70" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(item => (
              <div key={item} className="h-72 animate-pulse rounded-xl bg-white/70" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="-m-4 min-h-screen bg-[#f8f5ef] p-4 sm:-m-6 sm:p-6 lg:-m-8 lg:p-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-[#d7c7aa] bg-[#fffdf8] p-12 text-center">
          <Video className="mx-auto mb-4 h-10 w-10 text-[#716855]" />
          <p className="text-sm text-[#716855]">Unable to load replays. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGate isSubscribed={isSubscribed}>
      <div className="min-h-screen bg-[#f8f3e7] text-[#171714]">
        <div className="border-b border-[#e4d7bf] bg-[#fbf6ea]/85 px-5 py-5 backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-[1268px] items-center justify-between gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#716855]">
              Contractor Circle · Replay Library
            </p>
            <span className="hidden text-sm font-medium text-[#5d5546] sm:inline">
              Watch on your own pace
            </span>
          </div>
        </div>
        <div className="mx-auto max-w-[1268px] space-y-12 px-5 pb-12 pt-14 sm:px-8">
          <header className="pb-4">
            <h1 className="font-display text-5xl font-semibold leading-tight tracking-normal text-[#11100c] sm:text-6xl">
              Replay Library
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#5d5546]">
              Watch past calls, bootcamps, and masterclasses at your own pace.
            </p>
          </header>

          {allReplays.length === 0 ? (
            <section className="rounded-xl border border-[#d7c7aa] bg-[#fffdf8] p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-[#fff4cb]">
                <Video className="h-8 w-8 text-[#8a6510]" />
              </div>
              <h2 className="font-heading text-lg font-semibold text-[#171714]">Replays Coming Soon</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[#716855]">
                Recordings from each Contractor Circle session will appear here after the call.
              </p>
            </section>
          ) : (
            <>
              <section className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="font-display text-2xl font-semibold text-[#171714]">Latest replays</h2>
                  <span className="text-sm font-medium text-[#716855]">{latestReplays.length} ready to watch</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {latestReplays.map(replay => (
                    <ContinueCard key={replay.id} replay={replay} onPlay={setActiveVideo} />
                  ))}
                </div>
              </section>

              {featuredDisplay.length > 0 && (
                <section className="space-y-5 pt-2">
                  <div className="inline-flex items-center gap-2 rounded-lg bg-[#11100c] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    <Star className="h-3.5 w-3.5 fill-[#d7a83c] text-[#d7a83c]" />
                    Featured
                  </div>
                  <div className="grid gap-5 lg:grid-cols-2">
                    {featuredDisplay.map(replay => (
                      <FeaturedCard key={replay.id} replay={replay} onPlay={setActiveVideo} />
                    ))}
                  </div>
                </section>
              )}

              <section className="sticky top-0 z-10 rounded-xl border border-[#ded2bd] bg-white/94 p-3 shadow-[0_14px_36px_rgba(41,37,28,0.08)] backdrop-blur sm:p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a806d]" />
                    <input
                      type="text"
                      placeholder="Search replays..."
                      value={searchQuery}
                      onChange={event => setSearchQuery(event.target.value)}
                      className="h-12 w-full rounded-lg border border-[#d7c7aa] bg-[#fffdf8] pl-11 pr-4 text-sm text-[#171714] outline-none transition-all placeholder:text-[#8a806d] focus:border-[#d7b44d] focus:ring-1 focus:ring-[#d7b44d]/30"
                    />
                  </div>
                  <div className="flex gap-3 overflow-x-auto">
                    {CATEGORIES.map(category => (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setActiveCategory(category.value)}
                        className={`h-12 shrink-0 rounded-lg border px-4 text-sm font-semibold transition-all ${
                          activeCategory === category.value
                            ? "border-[#11100c] bg-[#11100c] text-white"
                            : "border-transparent bg-transparent text-[#5d5546] hover:bg-[#f8f3e7] hover:text-[#171714]"
                        }`}
                      >
                        <span className="hidden sm:inline">{category.label}</span>
                        <span className="sm:hidden">{category.shortLabel}</span>
                      </button>
                    ))}
                    <span className="mx-1 hidden h-12 w-px bg-[#d7c7aa] xl:block" />
                    {(["newest", "oldest"] as SortMode[]).map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSortMode(mode)}
                        className={`h-12 shrink-0 rounded-lg px-3 text-sm font-semibold capitalize transition-colors ${
                          sortMode === mode
                            ? "text-[#11100c] underline decoration-[#d7a83c] decoration-2 underline-offset-8"
                            : "text-[#716855] hover:text-[#171714]"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {(searchQuery || activeCategory !== "all") && filteredReplays.length === 0 && (
                <section className="rounded-xl border border-[#d7c7aa] bg-white p-10 text-center">
                  <Filter className="mx-auto mb-3 h-8 w-8 text-[#716855]" />
                  <p className="text-sm text-[#716855]">No replays match that search.</p>
                </section>
              )}

              {(activeCategory === "all" || activeCategory === "weekly_calls") && circleCalls.length > 0 && (
                <section className="space-y-5">
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="font-display text-3xl font-semibold text-[#171714]">Contractor Circle Calls</h2>
                    <span className="text-sm font-medium text-[#716855]">{circleCalls.length} calls</span>
                  </div>
                  <div className="space-y-3">
                    {circleCalls.map(replay => (
                      <ReplayRow key={replay.id} replay={replay} onPlay={setActiveVideo} />
                    ))}
                  </div>
                </section>
              )}

              {(activeCategory === "all" || activeCategory === "masterclass") && masterclasses.length > 0 && (
                <section className="space-y-5">
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="font-display text-3xl font-semibold text-[#171714]">Masterclass Courses</h2>
                    <span className="text-sm font-medium text-[#716855]">{masterclasses.length} lessons</span>
                  </div>
                  <CourseRow
                    title="ALP Outdoor Living Sales Course"
                    replays={masterclasses}
                    onPlay={setActiveVideo}
                  />
                </section>
              )}

              {(activeCategory === "all" || activeCategory === "bootcamp") && bootcamps.length > 0 && (
                <section className="space-y-5">
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="font-display text-3xl font-semibold text-[#171714]">Bootcamps</h2>
                    <span className="text-sm font-medium text-[#716855]">{bootcamps.length} events</span>
                  </div>
                  <div className="space-y-3">
                    {bootcamps.map(replay => (
                      <ReplayRow key={replay.id} replay={replay} onPlay={setActiveVideo} />
                    ))}
                  </div>
                </section>
              )}

              {(activeCategory === "all" || activeCategory === "q_and_a") && qAndA.length > 0 && (
                <section className="space-y-5">
                  <div className="flex items-end justify-between gap-4">
                    <h2 className="font-display text-3xl font-semibold text-[#171714]">Q&A Sessions</h2>
                    <span className="text-sm font-medium text-[#716855]">{qAndA.length} sessions</span>
                  </div>
                  <div className="space-y-3">
                    {qAndA.map(replay => (
                      <ReplayRow key={replay.id} replay={replay} onPlay={setActiveVideo} />
                    ))}
                  </div>
                </section>
              )}

              <footer className="border-t border-[#d7c7aa] pt-6 text-center text-sm text-[#716855]">
                <span className="inline-flex items-center gap-2">
                  <Library className="h-4 w-4" />
                  Built for the Contractor Circle Member Portal
                </span>
              </footer>
            </>
          )}

          {activeVideo && <VideoModal replay={activeVideo} onClose={() => setActiveVideo(null)} />}
        </div>
      </div>
    </SubscriptionGate>
  );
}
