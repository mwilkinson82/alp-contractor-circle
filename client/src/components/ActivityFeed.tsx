/**
 * ActivityFeed — live-polling feed of user actions for the admin panel.
 * Shows "Marshall opened Quantity Takeoff 2m ago", "AJ uploaded a sheet", etc.
 */
import { trpc } from "@/lib/trpc";
import { Activity, FileUp, BarChart3, Hammer, Eye, Settings, LogIn, Zap, Clock } from "lucide-react";

// ─── Action icon + color mapping ────────────────────────────────────────────
const ACTION_CONFIG: Record<string, { icon: typeof Activity; color: string; label: string }> = {
  page_visit: { icon: Eye, color: "text-blue-400", label: "Visited" },
  takeoff_created: { icon: Hammer, color: "text-amber-400", label: "Created Takeoff" },
  sheet_uploaded: { icon: FileUp, color: "text-emerald-400", label: "Uploaded Sheet" },
  estimate_confirmed: { icon: BarChart3, color: "text-purple-400", label: "Confirmed Estimate" },
  labor_inferred: { icon: Zap, color: "text-cyan-400", label: "Ran Labor AI" },
  rate_configured: { icon: Settings, color: "text-orange-400", label: "Configured Rates" },
  profile_saved: { icon: Settings, color: "text-indigo-400", label: "Saved Rate Profile" },
  login: { icon: LogIn, color: "text-emerald-400", label: "Logged In" },
  scale_calibrated: { icon: Settings, color: "text-teal-400", label: "Calibrated Scale" },
  analysis_started: { icon: Zap, color: "text-yellow-400", label: "Started Analysis" },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? { icon: Activity, color: "text-cream-muted", label: action };
}

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Activity Feed Panel (Admin) ────────────────────────────────────────────
export function ActivityFeedPanel() {
  const { data: entries, isLoading } = trpc.presence.getRecentActivity.useQuery(
    { limit: 50 },
    { refetchInterval: 10_000 }
  );

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-cream">Recent Activity</h3>
        </div>
        <span className="text-[11px] text-cream-muted/50">
          History · updates every 10s
        </span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-cream-muted/55">
        This is the recent trail of movement in the portal. It can include members who are no longer live now.
      </p>

      {isLoading ? (
        <div className="text-xs text-cream-muted/50 py-4 text-center">Loading activity...</div>
      ) : !entries || entries.length === 0 ? (
        <div className="text-xs text-cream-muted/50 py-4 text-center">
          No activity recorded yet. Actions will appear here as members use the portal.
        </div>
      ) : (
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {entries.map((entry: any) => {
            const config = getActionConfig(entry.action);
            const Icon = config.icon;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-white/3 transition-colors"
              >
                <div className={`mt-0.5 shrink-0 ${config.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-cream leading-snug">
                    <span className="font-medium">{entry.displayName || `Member #${entry.memberId}`}</span>
                    {" "}
                    <span className="text-cream-muted/70">{entry.description}</span>
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-cream-muted/40" />
                    <span className="text-[11px] text-cream-muted/40">{timeAgo(entry.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Compact Activity Feed (for sidebar or smaller spaces) ──────────────────
export function ActivityFeedCompact({ limit = 5 }: { limit?: number }) {
  const { data: entries } = trpc.presence.getRecentActivity.useQuery(
    { limit },
    { refetchInterval: 15_000 }
  );

  if (!entries || entries.length === 0) return null;

  return (
    <div className="space-y-1 px-2">
      <div className="flex items-center gap-1.5 px-1 mb-1">
        <Activity className="w-3 h-3 text-amber-400/70" />
        <span className="text-[10px] font-medium text-cream-muted/50 uppercase tracking-wider">Recent</span>
      </div>
      {entries.map((entry: any) => {
        const config = getActionConfig(entry.action);
        const Icon = config.icon;
        return (
          <div key={entry.id} className="flex items-center gap-2 px-1 py-0.5">
            <Icon className={`w-2.5 h-2.5 shrink-0 ${config.color}`} />
            <span className="text-[11px] text-cream-muted/60 truncate">
              {entry.displayName?.split(" ")[0] || "User"}: {entry.description}
            </span>
          </div>
        );
      })}
    </div>
  );
}
