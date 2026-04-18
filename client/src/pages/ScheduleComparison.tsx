/**
 * Schedule Comparison — Cross-schedule variance report.
 * Compares two separate schedule files (e.g., Baseline vs. Update 2) at the activity level.
 * Shows start/finish slippage, float delta, critical path changes, and project-level summary.
 * Designed to be CM-ready and printable.
 */
import { useState, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Printer, Download, GitCompareArrows, AlertTriangle,
  TrendingUp, TrendingDown, Minus, Clock, Activity, CheckCircle2,
  Plus, Trash2, ChevronUp, ChevronDown,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(val: string | null | undefined): string {
  if (!val) return "—";
  const d = new Date(val);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function varianceBadge(v: number | null | undefined, unit = "d") {
  if (v == null) return <span className="text-gray-500">—</span>;
  if (v === 0) return <span className="text-gray-400 font-mono">0{unit}</span>;
  if (v > 0) return (
    <span className="text-red-400 font-mono font-semibold">+{v}{unit}</span>
  );
  return <span className="text-green-400 font-mono font-semibold">{v}{unit}</span>;
}

function floatBadge(v: number | null | undefined) {
  if (v == null) return <span className="text-gray-500">—</span>;
  if (v <= 0) return <span className="text-red-400 font-mono font-semibold">{v}d</span>;
  if (v <= 5) return <span className="text-amber-400 font-mono">{v}d</span>;
  return <span className="text-emerald-400 font-mono">{v}d</span>;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    delayed:  { label: "Delayed",  cls: "bg-red-500/20 text-red-300 border border-red-500/30" },
    ahead:    { label: "Ahead",    cls: "bg-green-500/20 text-green-300 border border-green-500/30" },
    "on-time":{ label: "On Time",  cls: "bg-gray-500/20 text-gray-300 border border-gray-500/30" },
    added:    { label: "Added",    cls: "bg-blue-500/20 text-blue-300 border border-blue-500/30" },
    removed:  { label: "Removed",  cls: "bg-orange-500/20 text-orange-300 border border-orange-500/30" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-500/20 text-gray-300" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

type SortKey = "status" | "finishVariance" | "activityId" | "name" | "startVariance" | "floatVariance";

// ── Component ─────────────────────────────────────────────────────────────────
export default function ScheduleComparison() {
  const [, params] = useRoute("/scheduler/:id/compare");
  const scheduleId = params?.id ? parseInt(params.id) : 0;

  const [baselineScheduleId, setBaselineScheduleId] = useState<number | null>(null);
  const [updateScheduleId, setUpdateScheduleId] = useState<number | null>(scheduleId || null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);

  // Fetch all schedules for the selector
  const { data: scheduleList } = trpc.schedule.list.useQuery();

  // Run comparison when both are selected
  const { data: comparison, isLoading, error } = trpc.schedule.compareSchedules.useQuery(
    { baselineScheduleId: baselineScheduleId!, updateScheduleId: updateScheduleId! },
    { enabled: !!baselineScheduleId && !!updateScheduleId && baselineScheduleId !== updateScheduleId }
  );

  const summary = comparison?.summary;

  // Filter + sort rows
  const rows = useMemo(() => {
    if (!comparison?.rows) return [];
    let r = [...comparison.rows];
    if (filterStatus !== "all") r = r.filter(row => row.status === filterStatus);
    if (showOnlyCritical) r = r.filter(row => row.currentIsCritical || row.baselineIsCritical);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      r = r.filter(row => row.activityId.toLowerCase().includes(q) || row.name.toLowerCase().includes(q));
    }
    r.sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "status") { va = a.status; vb = b.status; }
      else if (sortKey === "finishVariance") { va = a.finishVariance ?? -9999; vb = b.finishVariance ?? -9999; }
      else if (sortKey === "startVariance") { va = a.startVariance ?? -9999; vb = b.startVariance ?? -9999; }
      else if (sortKey === "floatVariance") { va = a.floatVariance ?? -9999; vb = b.floatVariance ?? -9999; }
      else if (sortKey === "activityId") { va = a.activityId; vb = b.activityId; }
      else { va = a.name; vb = b.name; }
      const cmp = typeof va === "string" ? va.localeCompare(vb) : (va - vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [comparison, filterStatus, searchTerm, sortKey, sortDir, showOnlyCritical]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-amber-400" /> : <ChevronDown className="w-3 h-3 text-amber-400" />;
  }

  const scheduleOptions = scheduleList ?? [];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 print:bg-white print:text-black">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/10 bg-gray-900/80 print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center gap-4">
          <Link href={scheduleId ? `/scheduler/${scheduleId}` : "/portal/scheduler"}>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-100 gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back to Scheduler
            </Button>
          </Link>
          <div className="flex items-center gap-2 text-amber-400">
            <GitCompareArrows className="w-5 h-5" />
            <span className="font-bold text-base tracking-wide">Schedule Variance Report</span>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" className="border-white/15 text-gray-300 gap-1.5" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 py-6 space-y-6">

        {/* ── Schedule Selectors ────────────────────────────────────────────── */}
        <div className="bg-gray-900/60 border border-white/10 rounded-xl p-5 print:hidden">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Select Schedules to Compare</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Baseline Schedule <span className="text-gray-500">(original / earlier)</span></Label>
              <Select
                value={baselineScheduleId?.toString() ?? ""}
                onValueChange={(v) => setBaselineScheduleId(parseInt(v))}
              >
                <SelectTrigger className="bg-white/5 border-white/15 text-gray-200">
                  <SelectValue placeholder="Select baseline schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {scheduleOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()} disabled={s.id === updateScheduleId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-400 mb-1.5 block">Update Schedule <span className="text-gray-500">(current / later)</span></Label>
              <Select
                value={updateScheduleId?.toString() ?? ""}
                onValueChange={(v) => setUpdateScheduleId(parseInt(v))}
              >
                <SelectTrigger className="bg-white/5 border-white/15 text-gray-200">
                  <SelectValue placeholder="Select update schedule..." />
                </SelectTrigger>
                <SelectContent>
                  {scheduleOptions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id.toString()} disabled={s.id === baselineScheduleId}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {baselineScheduleId && updateScheduleId && baselineScheduleId === updateScheduleId && (
            <p className="text-xs text-amber-400 mt-3">Please select two different schedules to compare.</p>
          )}
        </div>

        {/* ── Loading / Empty States ─────────────────────────────────────── */}
        {!baselineScheduleId || !updateScheduleId || baselineScheduleId === updateScheduleId ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <GitCompareArrows className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Select two schedules above to generate the variance report</p>
            <p className="text-sm mt-1 opacity-70">Baseline vs. Update — activity-level slippage, float changes, critical path shifts</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mr-3" />
            Calculating variance...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-red-400 py-10 justify-center">
            <AlertTriangle className="w-5 h-5" />
            <span>Error loading comparison: {(error as any).message}</span>
          </div>
        ) : summary && (
          <>
            {/* ── Print Header ──────────────────────────────────────────────── */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Schedule Variance Report</h1>
              <p className="text-sm text-gray-600 mt-1">
                Baseline: <strong>{summary.baselineScheduleName}</strong>
                {summary.baselineDataDate ? ` (Data Date: ${summary.baselineDataDate})` : ""} &nbsp;→&nbsp;
                Update: <strong>{summary.updateScheduleName}</strong>
                {summary.updateDataDate ? ` (Data Date: ${summary.updateDataDate})` : ""}
              </p>
              <p className="text-xs text-gray-500 mt-1">Generated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>

            {/* ── Summary Cards ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 print:grid-cols-6 print:gap-2">
              {[
                {
                  label: "Project Slippage",
                  value: summary.projectSlippageDays != null
                    ? (summary.projectSlippageDays > 0 ? `+${summary.projectSlippageDays}d` : `${summary.projectSlippageDays}d`)
                    : "—",
                  sub: "overall finish delta",
                  color: (summary.projectSlippageDays ?? 0) > 0 ? "text-red-400" : (summary.projectSlippageDays ?? 0) < 0 ? "text-green-400" : "text-gray-400",
                  icon: <TrendingUp className="w-4 h-4" />,
                },
                {
                  label: "Delayed Activities",
                  value: summary.delayedCount,
                  sub: `avg +${summary.avgSlippageDays}d / max +${summary.maxSlippageDays}d`,
                  color: summary.delayedCount > 0 ? "text-red-400" : "text-gray-400",
                  icon: <AlertTriangle className="w-4 h-4" />,
                },
                {
                  label: "Ahead of Schedule",
                  value: summary.aheadCount,
                  sub: "activities finishing early",
                  color: summary.aheadCount > 0 ? "text-green-400" : "text-gray-400",
                  icon: <TrendingDown className="w-4 h-4" />,
                },
                {
                  label: "On Time",
                  value: summary.onTimeCount,
                  sub: "no date change",
                  color: "text-gray-300",
                  icon: <CheckCircle2 className="w-4 h-4" />,
                },
                {
                  label: "Became Critical",
                  value: summary.becameCriticalCount,
                  sub: "new critical path items",
                  color: summary.becameCriticalCount > 0 ? "text-red-400" : "text-gray-400",
                  icon: <Activity className="w-4 h-4" />,
                },
                {
                  label: "Total Activities",
                  value: summary.totalActivities,
                  sub: `${summary.matchedActivities} matched`,
                  color: "text-gray-300",
                  icon: <Minus className="w-4 h-4" />,
                },
              ].map((card, i) => (
                <div key={i} className="bg-gray-900/60 border border-white/10 rounded-xl p-4 print:border-gray-200 print:bg-gray-50">
                  <div className="flex items-center gap-1.5 text-gray-500 mb-2 text-xs uppercase tracking-wider">
                    {card.icon} {card.label}
                  </div>
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{card.sub}</div>
                </div>
              ))}
            </div>

            {/* ── Schedule Names Banner ─────────────────────────────────────── */}
            <div className="bg-gray-900/40 border border-white/10 rounded-lg px-4 py-3 flex flex-wrap gap-4 items-center text-sm print:border-gray-200">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-blue-500/60 border border-blue-400/50 inline-block" />
                <span className="text-gray-400">Baseline:</span>
                <span className="font-semibold text-gray-200">{summary.baselineScheduleName}</span>
                {summary.baselineDataDate && <span className="text-gray-500 text-xs">({summary.baselineDataDate})</span>}
              </div>
              <div className="text-gray-600">→</div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-amber-500/60 border border-amber-400/50 inline-block" />
                <span className="text-gray-400">Update:</span>
                <span className="font-semibold text-gray-200">{summary.updateScheduleName}</span>
                {summary.updateDataDate && <span className="text-gray-500 text-xs">({summary.updateDataDate})</span>}
              </div>
            </div>

            {/* ── Filters ───────────────────────────────────────────────────── */}
            <div className="flex flex-wrap gap-3 items-center print:hidden">
              <div className="flex gap-1.5">
                {["all", "delayed", "ahead", "on-time", "added", "removed"].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterStatus(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      filterStatus === f
                        ? "bg-amber-500 text-gray-950 border-amber-500"
                        : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {f === "all" ? `All (${comparison?.rows?.length ?? 0})` :
                     f === "delayed" ? `Delayed (${summary.delayedCount})` :
                     f === "ahead" ? `Ahead (${summary.aheadCount})` :
                     f === "on-time" ? `On Time (${summary.onTimeCount})` :
                     f === "added" ? `Added (${summary.addedCount})` :
                     `Removed (${summary.removedCount})`}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyCritical}
                    onChange={e => setShowOnlyCritical(e.target.checked)}
                    className="rounded"
                  />
                  Critical only
                </label>
                <Input
                  placeholder="Search activity..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-48 h-8 text-xs bg-white/5 border-white/15 text-gray-200"
                />
              </div>
            </div>

            {/* ── Variance Table ────────────────────────────────────────────── */}
            <div className="rounded-xl border border-white/10 overflow-hidden print:border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900/80 border-b border-white/10 print:bg-gray-100 print:border-gray-300">
                      <th
                        className="text-left px-3 py-3 font-semibold text-gray-300 whitespace-nowrap cursor-pointer hover:text-amber-400 select-none print:text-gray-700"
                        onClick={() => toggleSort("activityId")}
                      >
                        <span className="flex items-center gap-1">Activity ID <SortIcon k="activityId" /></span>
                      </th>
                      <th
                        className="text-left px-3 py-3 font-semibold text-gray-300 cursor-pointer hover:text-amber-400 select-none print:text-gray-700"
                        onClick={() => toggleSort("name")}
                      >
                        <span className="flex items-center gap-1">Activity Name <SortIcon k="name" /></span>
                      </th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">BL Start</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">Curr Start</th>
                      <th
                        className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap cursor-pointer hover:text-amber-400 select-none print:text-gray-700"
                        onClick={() => toggleSort("startVariance")}
                      >
                        <span className="flex items-center justify-end gap-1">Start Var <SortIcon k="startVariance" /></span>
                      </th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">BL Finish</th>
                      <th className="text-left px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">Curr Finish</th>
                      <th
                        className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap cursor-pointer hover:text-amber-400 select-none print:text-gray-700"
                        onClick={() => toggleSort("finishVariance")}
                      >
                        <span className="flex items-center justify-end gap-1">Finish Var <SortIcon k="finishVariance" /></span>
                      </th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">BL Dur</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">Curr Dur</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">Dur Δ</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">BL Float</th>
                      <th className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">Curr Float</th>
                      <th
                        className="text-right px-3 py-3 font-semibold text-gray-300 whitespace-nowrap cursor-pointer hover:text-amber-400 select-none print:text-gray-700"
                        onClick={() => toggleSort("floatVariance")}
                      >
                        <span className="flex items-center justify-end gap-1">Float Δ <SortIcon k="floatVariance" /></span>
                      </th>
                      <th className="text-center px-3 py-3 font-semibold text-gray-300 whitespace-nowrap print:text-gray-700">Critical</th>
                      <th
                        className="text-left px-3 py-3 font-semibold text-gray-300 whitespace-nowrap cursor-pointer hover:text-amber-400 select-none print:text-gray-700"
                        onClick={() => toggleSort("status")}
                      >
                        <span className="flex items-center gap-1">Status <SortIcon k="status" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="text-center py-12 text-gray-500">
                          No activities match the current filter
                        </td>
                      </tr>
                    ) : rows.map((row, idx) => (
                      <tr
                        key={row.activityId}
                        className={`border-b border-white/5 print:border-gray-100 ${
                          row.status === "delayed" ? "bg-red-500/5" :
                          row.status === "ahead" ? "bg-green-500/5" :
                          idx % 2 === 0 ? "" : "bg-white/[0.02]"
                        } ${row.currentIsCritical || row.baselineIsCritical ? "border-l-2 border-l-red-500/50" : ""}`}
                      >
                        <td className="px-3 py-2 font-mono text-xs text-gray-400 whitespace-nowrap">{row.activityId}</td>
                        <td className="px-3 py-2 text-gray-200 max-w-[280px]">
                          <span className="line-clamp-2">{row.name}</span>
                        </td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap text-xs">{fmtDate(row.baselineStart)}</td>
                        <td className="px-3 py-2 text-gray-200 whitespace-nowrap text-xs">{fmtDate(row.currentStart)}</td>
                        <td className="px-3 py-2 text-right">{varianceBadge(row.startVariance)}</td>
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap text-xs">{fmtDate(row.baselineFinish)}</td>
                        <td className="px-3 py-2 text-gray-200 whitespace-nowrap text-xs">{fmtDate(row.currentFinish)}</td>
                        <td className="px-3 py-2 text-right">{varianceBadge(row.finishVariance)}</td>
                        <td className="px-3 py-2 text-right text-gray-400 font-mono text-xs">{row.baselineDuration ?? "—"}</td>
                        <td className="px-3 py-2 text-right text-gray-200 font-mono text-xs">{row.currentDuration ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{varianceBadge(row.durationVariance)}</td>
                        <td className="px-3 py-2 text-right">{floatBadge(row.baselineFloat)}</td>
                        <td className="px-3 py-2 text-right">{floatBadge(row.currentFloat)}</td>
                        <td className="px-3 py-2 text-right">{varianceBadge(row.floatVariance)}</td>
                        <td className="px-3 py-2 text-center text-xs">
                          {row.criticalChange === "became-critical" && (
                            <span className="text-red-400 font-semibold">↑ Critical</span>
                          )}
                          {row.criticalChange === "left-critical" && (
                            <span className="text-green-400 font-semibold">↓ Left</span>
                          )}
                          {!row.criticalChange && row.currentIsCritical && (
                            <span className="text-red-400">●</span>
                          )}
                          {!row.criticalChange && !row.currentIsCritical && (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{statusBadge(row.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Footer ────────────────────────────────────────────────────── */}
            <div className="text-xs text-gray-600 text-right print:text-gray-400">
              {rows.length} activities shown · Positive variance = delay · Negative = ahead of schedule
            </div>
          </>
        )}
      </div>
    </div>
  );
}
