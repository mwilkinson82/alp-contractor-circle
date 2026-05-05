/**
 * OnlineUsersWidget — shows who's currently online.
 *
 * Two variants:
 * - "badge": compact count for the sidebar (shows green dot + count)
 * - "panel": full admin panel with user list, current pages, session duration
 */
import { trpc } from "@/lib/trpc";
import { Users, Circle, Monitor, Clock, Activity } from "lucide-react";
import { describePresenceWindow, formatPresencePage, formatPresenceWork } from "@shared/presenceLabels";

function formatDuration(start: Date | string): string {
  const ms = Date.now() - new Date(start).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const secs = Math.max(0, Math.floor(ms / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Sidebar Badge ──────────────────────────────────────────────────────────
export function OnlineUsersBadge() {
  const { data } = trpc.presence.getOnlineUsers.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const count = data?.count ?? 0;

  if (count === 0) return null;

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-cream-muted"
      title={`Live now means ${describePresenceWindow(data?.onlineWindowSeconds ?? 120)}.`}
    >
      <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400" />
      <span>
        {count} live now
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
  const presenceWindow = describePresenceWindow(data?.onlineWindowSeconds ?? 120);

  return (
    <div className="rounded-xl border border-white/8 bg-white/2 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-cream">Live Now</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
          <span className="text-sm font-bold text-emerald-400">{count}</span>
        </div>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-cream-muted/55">
        Heartbeat based: members are counted when {presenceWindow}. Activity below is historical and can show people who are no longer live.
      </p>

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
              className="flex items-start gap-3 px-3 py-3 rounded-lg bg-white/3 border border-white/5"
            >
              <Circle className="mt-1.5 w-2 h-2 fill-emerald-400 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-cream truncate">
                  {u.displayName || `Member #${u.memberId}`}
                </p>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-cream-muted/65">
                  <Monitor className="w-3 h-3" />
                  <span className="truncate">{u.pageLabel || formatPresencePage(u.currentPage)}</span>
                  <span className="text-cream-muted/30">·</span>
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(u.sessionStart)}</span>
                </div>
                <p className="mt-1 text-[11px] text-cream-muted/45 truncate">
                  {u.workLabel || formatPresenceWork(u.currentPage)}
                </p>
                {u.lastActivity ? (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-cream-muted/45">
                    <Activity className="w-3 h-3" />
                    <span className="truncate">{u.lastActivity.description}</span>
                    <span className="shrink-0 text-cream-muted/30">· {timeAgo(u.lastActivity.createdAt)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
