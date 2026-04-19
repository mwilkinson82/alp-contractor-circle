/**
 * OnlineUsersWidget — shows who's currently online.
 *
 * Two variants:
 * - "badge": compact count for the sidebar (shows green dot + count)
 * - "panel": full admin panel with user list, current pages, session duration
 */
import { trpc } from "@/lib/trpc";
import { Users, Circle, Monitor, Clock } from "lucide-react";

// ─── Friendly page name mapping ─────────────────────────────────────────────
const PAGE_NAMES: Record<string, string> = {
  "/portal": "Dashboard",
  "/portal/dashboard": "Dashboard",
  "/portal/constructline": "ConstructLine Hub",
  "/portal/takeoff": "Takeoff List",
  "/portal/cost-library": "Cost Library",
  "/portal/labor-library": "Trade Rate Library",
  "/portal/replays": "Replay Library",
  "/portal/templates": "Templates",
  "/portal/account": "Account",
  "/portal/admin": "Admin Panel",
  "/portal/subscribers": "Subscribers",
  "/portal/members": "Members",
  "/portal/analytics": "Analytics",
  "/portal/drip": "Drip Campaigns",
  "/portal/feedback": "Feedback",
};

function friendlyPageName(path: string | null): string {
  if (!path) return "Unknown";
  // Exact match
  if (PAGE_NAMES[path]) return PAGE_NAMES[path];
  // Takeoff detail
  if (path.startsWith("/takeoff/")) return "Takeoff Project";
  // Schedule
  if (path.startsWith("/schedule/")) return "CPM Schedule";
  // Closest prefix match
  const sorted = Object.keys(PAGE_NAMES).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (path.startsWith(key)) return PAGE_NAMES[key];
  }
  return path;
}

function formatDuration(start: Date | string): string {
  const ms = Date.now() - new Date(start).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

// ─── Sidebar Badge ──────────────────────────────────────────────────────────
export function OnlineUsersBadge() {
  const { data } = trpc.presence.getOnlineUsers.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const count = data?.count ?? 0;

  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-cream-muted">
      <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
      <span>
        {count} online
      </span>
    </div>
  );
}

// ─── Admin Panel Widget ─────────────────────────────────────────────────────
export function OnlineUsersPanel() {
  const { data, isLoading } = trpc.presence.getOnlineUsers.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const count = data?.count ?? 0;
  const users = data?.users ?? [];

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-cream">Online Now</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
          <span className="text-sm font-bold text-emerald-400">{count}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-cream-muted/50 py-4 text-center">Loading...</div>
      ) : users.length === 0 ? (
        <div className="text-xs text-cream-muted/50 py-4 text-center">
          {count > 0
            ? `${count} user${count > 1 ? "s" : ""} online (details visible to admins)`
            : "No one is online right now"}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u: any) => (
            <div
              key={u.memberId}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/5"
            >
              <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cream truncate">
                  {u.displayName || `Member #${u.memberId}`}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-cream-muted/60">
                  <Monitor className="w-3 h-3" />
                  <span className="truncate">{friendlyPageName(u.currentPage)}</span>
                  <span className="text-cream-muted/30">·</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(u.sessionStart)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
