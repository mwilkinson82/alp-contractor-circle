/**
 * Drip Campaign Admin Dashboard
 * View enrollment stats, sequence breakdown, recent sends, and manage enrollments.
 * Only accessible to admin members.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import {
  Mail,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  ArrowRightCircle,
  Pause,
  Play,
  Loader2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

const SEQUENCE_LABELS: Record<string, string> = {
  estimating_single: "Estimating Checklist",
  q1q2_single: "Q1/Q2 Framework",
  double_dipper: "Double-Dipper",
  homepage_only: "Homepage Subscriber",
};

const STATUS_COLORS: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  completed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  paused: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  unsubscribed: "text-red-400 bg-red-500/10 border-red-500/20",
  converted: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export default function DripDashboard() {
  const { member } = useMember();
  const [selectedSequence, setSelectedSequence] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState(0);

  // Check admin access
  if (member?.memberRole !== "admin") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="glass-card rounded-2xl p-8 border border-red-500/20 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="font-heading text-xl font-bold text-cream mb-2">Access Denied</h2>
          <p className="text-cream-muted">Only administrators can view the drip campaign dashboard.</p>
        </div>
      </div>
    );
  }

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.drip.status.useQuery();

  // Fetch enrollments table
  const { data: enrollmentsData, isLoading: enrollmentsLoading, refetch: refetchEnrollments } = trpc.drip.enrollments.useQuery({
    sequenceId: selectedSequence || undefined,
    status: selectedStatus || undefined,
    limit: 25,
    offset: page * 25,
  });

  // Pause/Resume mutation
  const togglePause = trpc.drip.togglePause.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEnrollments();
    },
  });

  // Manual trigger mutation
  const triggerDrip = trpc.drip.trigger.useMutation();

  // Compute sequence summary from stats
  const sequenceSummary = useMemo(() => {
    if (!stats?.bySequence) return [];
    const map: Record<string, { active: number; completed: number; paused: number; unsubscribed: number; converted: number; total: number }> = {};
    for (const row of stats.bySequence) {
      if (!map[row.sequenceId]) {
        map[row.sequenceId] = { active: 0, completed: 0, paused: 0, unsubscribed: 0, converted: 0, total: 0 };
      }
      const count = Number(row.cnt);
      map[row.sequenceId][row.status as keyof typeof map[string]] = count;
      map[row.sequenceId].total += count;
    }
    return Object.entries(map).map(([id, data]) => ({ id, label: SEQUENCE_LABELS[id] || id, ...data }));
  }, [stats]);

  // Total active enrollments
  const totalActive = sequenceSummary.reduce((sum, s) => sum + s.active, 0);
  const totalAll = sequenceSummary.reduce((sum, s) => sum + s.total, 0);

  if (statsLoading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-ember animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-cream">Drip Campaigns</h1>
          <p className="text-cream-muted text-sm mt-1">Automated email sequences for leads</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { refetchStats(); refetchEnrollments(); }}
            className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-cream-muted hover:text-cream hover:bg-white/10 transition-colors text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={Users} label="Total Enrolled" value={totalAll} color="text-cream" />
        <StatCard icon={Send} label="Active" value={totalActive} color="text-emerald-400" />
        <StatCard icon={Mail} label="Emails Sent" value={stats?.totalEmailsSent ?? 0} color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="Converted" value={stats?.convertedCount ?? 0} color="text-purple-400" />
        <StatCard icon={XCircle} label="Unsubscribed" value={stats?.unsubscribedCount ?? 0} color="text-red-400" />
      </div>

      {/* Sequence Breakdown */}
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <h2 className="font-heading text-lg font-semibold text-cream mb-4">Sequence Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sequenceSummary.map((seq) => (
            <div
              key={seq.id}
              className="bg-white/[0.03] rounded-xl p-4 border border-white/5 hover:border-ember/20 transition-colors cursor-pointer"
              onClick={() => { setSelectedSequence(seq.id); setPage(0); }}
            >
              <div className="text-sm font-medium text-cream mb-3">{seq.label}</div>
              <div className="text-2xl font-bold text-cream mb-3">{seq.total}</div>
              <div className="space-y-1.5">
                <BarRow label="Active" count={seq.active} total={seq.total} color="bg-emerald-500" />
                <BarRow label="Completed" count={seq.completed} total={seq.total} color="bg-blue-500" />
                <BarRow label="Converted" count={seq.converted} total={seq.total} color="bg-purple-500" />
                {seq.paused > 0 && <BarRow label="Paused" count={seq.paused} total={seq.total} color="bg-amber-500" />}
                {seq.unsubscribed > 0 && <BarRow label="Unsub" count={seq.unsubscribed} total={seq.total} color="bg-red-500" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Distribution */}
      {stats?.stepDistribution && stats.stepDistribution.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h2 className="font-heading text-lg font-semibold text-cream mb-4">Active Enrollments by Step</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {stats.stepDistribution.map((row: any, i: number) => (
              <div key={i} className="bg-white/[0.03] rounded-lg p-3 border border-white/5 text-center">
                <div className="text-xs text-cream-muted mb-1">{SEQUENCE_LABELS[row.sequenceId] || row.sequenceId}</div>
                <div className="text-lg font-bold text-cream">Step {row.currentStep}</div>
                <div className="text-sm text-ember">{Number(row.cnt)} people</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sends */}
      {stats?.recentSends && stats.recentSends.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-white/5">
          <h2 className="font-heading text-lg font-semibold text-cream mb-4">Recent Sends</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-cream-muted font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-cream-muted font-medium">Email</th>
                  <th className="text-left py-2 px-3 text-cream-muted font-medium">Sequence</th>
                  <th className="text-left py-2 px-3 text-cream-muted font-medium">Step</th>
                  <th className="text-left py-2 px-3 text-cream-muted font-medium">Sent</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentSends.map((send: any) => (
                  <tr key={send.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-cream">{send.firstName || "—"}</td>
                    <td className="py-2 px-3 text-cream-muted">{send.email}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-ember/10 text-ember border border-ember/20">
                        {SEQUENCE_LABELS[send.sequenceId] || send.sequenceId}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-cream">#{send.stepNumber}</td>
                    <td className="py-2 px-3 text-cream-muted text-xs">
                      {send.sentAt ? new Date(send.sentAt).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enrollments Table */}
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <h2 className="font-heading text-lg font-semibold text-cream">All Enrollments</h2>
          <div className="flex gap-2 flex-wrap">
            <select
              value={selectedSequence}
              onChange={(e) => { setSelectedSequence(e.target.value); setPage(0); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-cream focus:outline-none focus:border-ember/50"
            >
              <option value="">All Sequences</option>
              {Object.entries(SEQUENCE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(0); }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-cream focus:outline-none focus:border-ember/50"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="unsubscribed">Unsubscribed</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>

        {enrollmentsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-ember animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 px-3 text-cream-muted font-medium">Name</th>
                    <th className="text-left py-2 px-3 text-cream-muted font-medium">Email</th>
                    <th className="text-left py-2 px-3 text-cream-muted font-medium">Sequence</th>
                    <th className="text-left py-2 px-3 text-cream-muted font-medium">Step</th>
                    <th className="text-left py-2 px-3 text-cream-muted font-medium">Status</th>
                    <th className="text-left py-2 px-3 text-cream-muted font-medium">Next Send</th>
                    <th className="text-left py-2 px-3 text-cream-muted font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollmentsData?.rows?.map((row: any) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="py-2 px-3 text-cream">{row.firstName || "—"}</td>
                      <td className="py-2 px-3 text-cream-muted text-xs">{row.email}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-ember/10 text-ember border border-ember/20">
                          {SEQUENCE_LABELS[row.sequenceId] || row.sequenceId}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-cream">{row.currentStep}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[row.status] || "text-cream"}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-cream-muted text-xs">
                        {row.nextSendAt ? new Date(row.nextSendAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-2 px-3">
                        {row.status === "active" && (
                          <button
                            onClick={() => togglePause.mutate({ enrollmentId: row.id, action: "pause" })}
                            className="text-amber-400 hover:text-amber-300 transition-colors"
                            title="Pause"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}
                        {row.status === "paused" && (
                          <button
                            onClick={() => togglePause.mutate({ enrollmentId: row.id, action: "resume" })}
                            className="text-emerald-400 hover:text-emerald-300 transition-colors"
                            title="Resume"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!enrollmentsData?.rows || enrollmentsData.rows.length === 0) && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-cream-muted">
                        No enrollments found matching the filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {enrollmentsData && enrollmentsData.total > 25 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                <span className="text-sm text-cream-muted">
                  Showing {page * 25 + 1}–{Math.min((page + 1) * 25, enrollmentsData.total)} of {enrollmentsData.total}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-cream-muted hover:text-cream disabled:opacity-30 text-sm"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * 25 >= enrollmentsData.total}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-cream-muted hover:text-cream disabled:opacity-30 text-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pending / Engine Status */}
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <h2 className="font-heading text-lg font-semibold text-cream mb-4">Engine Status</h2>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${stats?.pendingNow && stats.pendingNow > 0 ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            <span className="text-cream text-sm">
              {stats?.pendingNow && stats.pendingNow > 0
                ? `${stats.pendingNow} emails pending (due now)`
                : "No emails pending — next batch at 8 AM ET"
              }
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => triggerDrip.mutate({ dryRun: true })}
              disabled={triggerDrip.isPending}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-cream-muted hover:text-cream hover:bg-white/10 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {triggerDrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Dry Run
            </button>
            <button
              onClick={() => {
                if (window.confirm("This will send real emails to all pending enrollments. Are you sure?")) {
                  triggerDrip.mutate({ dryRun: false });
                }
              }}
              disabled={triggerDrip.isPending}
              className="px-4 py-2 rounded-lg bg-ember/20 border border-ember/30 text-ember hover:bg-ember/30 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {triggerDrip.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Now
            </button>
          </div>
        </div>
        {triggerDrip.data && (
          <div className="mt-4 p-4 bg-white/[0.03] rounded-lg border border-white/5 text-sm">
            <p className="text-cream">
              Result: {triggerDrip.data.sent} sent, {triggerDrip.data.skipped} skipped, {triggerDrip.data.failed} failed, {triggerDrip.data.completed} completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-cream-muted">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function BarRow({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-cream-muted w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-cream-muted w-6 text-right">{count}</span>
    </div>
  );
}
