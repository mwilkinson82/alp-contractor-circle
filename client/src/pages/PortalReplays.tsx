/**
 * Replay Library — Watch past Contracting Circle calls and bootcamp sessions.
 * Videos are hosted on Cloudflare Stream and stored in the database.
 * Marshall adds new replays after each Thursday call via the admin panel.
 */
import { useState, useMemo } from "react";
import {
  PlayCircle,
  Clock,
  Calendar,
  Search,
  Filter,
  Star,
  ChevronRight,
  X,
  Video,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type ReplayCategory = "all" | "weekly_calls" | "bootcamp" | "masterclass" | "q_and_a";

const CATEGORIES: { value: ReplayCategory; label: string }[] = [
  { value: "all", label: "All Replays" },
  { value: "weekly_calls", label: "Weekly Calls" },
  { value: "bootcamp", label: "Bootcamp" },
  { value: "masterclass", label: "Masterclass" },
  { value: "q_and_a", label: "Q&A Sessions" },
];

function categoryColor(cat: string): string {
  const colors: Record<string, string> = {
    weekly_calls: "bg-blue-accent/10 text-blue-accent",
    bootcamp: "bg-ember/10 text-ember",
    masterclass: "bg-purple-500/10 text-purple-400",
    q_and_a: "bg-success/10 text-success",
  };
  return colors[cat] || "bg-white/5 text-cream-muted";
}

function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    weekly_calls: "Weekly Call",
    bootcamp: "Bootcamp",
    masterclass: "Masterclass",
    q_and_a: "Q&A",
  };
  return labels[cat] || cat;
}

interface VideoModalProps {
  embedUrl: string;
  title: string;
  onClose: () => void;
}

function VideoModal({ embedUrl, title, onClose }: VideoModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-navy-deep rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h3 className="font-heading text-sm font-semibold text-cream truncate pr-4">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4 text-cream-muted" />
          </button>
        </div>
        {/* Cloudflare Stream iframe */}
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            src={`${embedUrl}?autoplay=true&muted=false`}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
            title={title}
          />
        </div>
      </div>
    </div>
  );
}

export default function PortalReplays() {
  const [activeCategory, setActiveCategory] = useState<ReplayCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<{ embedUrl: string; title: string } | null>(null);

  const { data, isLoading, error } = trpc.member.replays.useQuery();
  const allReplays = data?.replays ?? [];

  const filteredReplays = useMemo(() => {
    return allReplays.filter(r => {
      if (activeCategory !== "all" && r.category !== activeCategory) return false;
      if (
        searchQuery &&
        !r.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(r.description || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [allReplays, activeCategory, searchQuery]);

  const featuredReplays = allReplays.filter(r => r.featured);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-72 bg-white/5 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card rounded-xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white/5" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="glass-card rounded-xl p-12 text-center">
          <Video className="w-10 h-10 text-cream-muted mx-auto mb-4" />
          <p className="text-cream-muted text-sm">Unable to load replays. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream">
          Replay Library
        </h1>
        <p className="text-cream-muted mt-1">
          Watch past calls, bootcamp sessions, and masterclasses at your own pace.
        </p>
      </div>

      {/* Empty state — no replays yet */}
      {allReplays.length === 0 && (
        <div className="glass-card rounded-xl p-16 text-center border border-ember/10">
          <div className="w-16 h-16 rounded-2xl bg-ember/10 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-ember" />
          </div>
          <h3 className="font-heading text-lg font-semibold text-cream mb-2">
            Replays Coming Soon
          </h3>
          <p className="text-cream-muted text-sm max-w-sm mx-auto">
            Recordings from each Thursday call will appear here after the session. Check back after your first call!
          </p>
        </div>
      )}

      {/* Featured Section */}
      {featuredReplays.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-ember" />
            <h2 className="font-heading text-sm font-semibold text-ember uppercase tracking-wider">Featured</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredReplays.map(replay => (
              <button
                key={replay.id}
                className="group glass-card rounded-xl p-5 text-left hover:bg-white/[0.03] transition-all duration-300 border border-ember/10"
                onClick={() => setActiveVideo({ embedUrl: replay.embedUrl, title: replay.title })}
              >
                {/* Cloudflare Stream thumbnail */}
                <div className="w-full aspect-video rounded-lg overflow-hidden mb-4 bg-white/5 relative">
                  <img
                    src={replay.thumbnailUrl}
                    alt={replay.title}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-ember/80 flex items-center justify-center group-hover:bg-ember transition-colors">
                      <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider mb-2 ${categoryColor(replay.category)}`}>
                      {categoryLabel(replay.category)}
                    </span>
                    <h3 className="font-heading text-sm font-semibold text-cream group-hover:text-ember transition-colors line-clamp-2">
                      {replay.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-2 text-cream-muted text-xs">
                      {replay.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {replay.duration}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(replay.callDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter — only show if there are replays */}
      {allReplays.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-muted" />
            <input
              type="text"
              placeholder="Search replays..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-cream placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/30 focus:ring-1 focus:ring-ember/20 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.value
                    ? "bg-ember/15 text-ember border border-ember/20"
                    : "bg-white/5 text-cream-muted hover:text-cream border border-transparent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Replay List */}
      {allReplays.length > 0 && (
        <div className="space-y-3">
          {filteredReplays.length === 0 ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <Filter className="w-8 h-8 text-cream-muted mx-auto mb-3" />
              <p className="text-cream-muted text-sm">No replays match your search.</p>
            </div>
          ) : (
            filteredReplays.map(replay => (
              <button
                key={replay.id}
                className="group w-full glass-card rounded-xl p-4 md:p-5 text-left hover:bg-white/[0.03] transition-all duration-300 flex items-center gap-4"
                onClick={() => setActiveVideo({ embedUrl: replay.embedUrl, title: replay.title })}
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 md:w-20 md:h-14 rounded-lg overflow-hidden bg-white/5 relative shrink-0">
                  <img
                    src={replay.thumbnailUrl}
                    alt={replay.title}
                    className="w-full h-full object-cover"
                    onError={e => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-colors">
                    <PlayCircle className="w-5 h-5 text-white/80 group-hover:text-ember transition-colors" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${categoryColor(replay.category)}`}>
                      {categoryLabel(replay.category)}
                    </span>
                  </div>
                  <h3 className="font-heading text-sm font-semibold text-cream group-hover:text-ember transition-colors truncate">
                    {replay.title}
                  </h3>
                  <p className="text-cream-muted text-xs mt-1 line-clamp-1 hidden sm:block">
                    {replay.description}
                  </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex flex-col items-end gap-1 text-cream-muted text-xs">
                    {replay.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {replay.duration}
                      </span>
                    )}
                    <span>
                      {new Date(replay.callDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-cream-muted group-hover:text-ember transition-colors" />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Info Note */}
      {allReplays.length > 0 && (
        <div className="glass-card rounded-xl p-5 text-center">
          <p className="text-cream-muted text-sm">
            New recordings are added after each Thursday call. Check back regularly for fresh content.
          </p>
        </div>
      )}

      {/* Video Modal */}
      {activeVideo && (
        <VideoModal
          embedUrl={activeVideo.embedUrl}
          title={activeVideo.title}
          onClose={() => setActiveVideo(null)}
        />
      )}
    </div>
  );
}
