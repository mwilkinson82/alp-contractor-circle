/**
 * Schedule Reports — Tabular + Visual reports for CPM schedules.
 * Supports: Total Float, Early Start, Critical Path, Duration, Schedule Comparison,
 *           Cash Flow S-Curve, Resource Histogram.
 * Designed for print-ready output (City of New York monthly update style).
 */
import { useState, useMemo, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  AlertTriangle,
  Clock,
  Activity,
  BarChart3,
  GitCompare,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Users,
  DollarSign,
} from "lucide-react";

type ReportType = "totalFloat" | "earlyStart" | "criticalPath" | "duration" | "comparison" | "cashFlowSCurve" | "resourceHistogram";

const REPORT_LABELS: Record<ReportType, { label: string; icon: any; description: string }> = {
  totalFloat: {
    label: "Total Float Report",
    icon: Clock,
    description: "Activities sorted by total float — identifies near-critical and critical activities",
  },
  earlyStart: {
    label: "Early Start Report",
    icon: Activity,
    description: "Activities sorted by early start date — shows the planned sequence of work",
  },
  criticalPath: {
    label: "Critical Path Report",
    icon: AlertTriangle,
    description: "Critical and longest-path activities with driving relationships",
  },
  duration: {
    label: "Duration Report",
    icon: BarChart3,
    description: "Activities sorted by original duration — identifies long-duration activities",
  },
  comparison: {
    label: "Schedule Comparison Report",
    icon: GitCompare,
    description: "Baseline vs. current schedule — date variances, float changes, duration deltas",
  },
  cashFlowSCurve: {
    label: "Cash Flow S-Curve",
    icon: TrendingUp,
    description: "Cumulative budgeted vs. actual cost projection — for draw requests and bank reporting",
  },
  resourceHistogram: {
    label: "Resource Histogram",
    icon: Users,
    description: "Weekly resource loading by type — identifies over-allocation and leveling needs",
  },
};

function fmtDate(d: any): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtFloat(f: number | null | undefined): string {
  if (f === null || f === undefined) return "—";
  return f.toString();
}

function floatColor(f: number | null | undefined): string {
  if (f === null || f === undefined) return "";
  if (f <= 0) return "text-red-600 font-bold";
  if (f <= 5) return "text-amber-600 font-semibold";
  if (f <= 10) return "text-yellow-600";
  return "text-green-600";
}

function varianceColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (v > 0) return "text-red-600 font-bold";
  if (v < 0) return "text-green-600 font-semibold";
  return "text-muted-foreground";
}

function fmtCurrency(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtWeek(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Color palette for histogram stacked bars ──────────────────────────────
const HISTOGRAM_COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#e11d48", "#84cc16", "#a855f7", "#0ea5e9", "#d946ef",
];

// ── S-Curve Canvas Chart ──────────────────────────────────────────────────
function SCurveChart({ data }: { data: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 40, right: 30, bottom: 60, left: 80 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    // Clear
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Find max value
    const maxVal = Math.max(
      ...data.map(d => Math.max(d.cumulativeBudgeted || 0, d.cumulativeActual || 0)),
      1
    );

    // Grid lines
    const gridLines = 5;
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      // Y-axis labels
      const val = maxVal - (maxVal / gridLines) * i;
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(fmtCurrency(val), pad.left - 8, y + 4);
    }
    ctx.setLineDash([]);

    // X-axis labels
    const step = Math.max(1, Math.floor(data.length / 8));
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px 'DM Sans', sans-serif";
    ctx.textAlign = "center";
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = pad.left + (i / (data.length - 1)) * chartW;
        ctx.save();
        ctx.translate(x, pad.top + chartH + 12);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(fmtWeek(d.week), 0, 0);
        ctx.restore();
      }
    });

    // Draw budgeted line (blue)
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = pad.left + (i / (data.length - 1)) * chartW;
      const y = pad.top + chartH - (d.cumulativeBudgeted / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under budgeted
    ctx.fillStyle = "rgba(59, 130, 246, 0.08)";
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = pad.left + (i / (data.length - 1)) * chartW;
      const y = pad.top + chartH - (d.cumulativeBudgeted / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + chartW, pad.top + chartH);
    ctx.lineTo(pad.left, pad.top + chartH);
    ctx.closePath();
    ctx.fill();

    // Draw actual line (green)
    const hasActual = data.some(d => (d.cumulativeActual || 0) > 0);
    if (hasActual) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = pad.left + (i / (data.length - 1)) * chartW;
        const y = pad.top + chartH - ((d.cumulativeActual || 0) / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Title
    ctx.fillStyle = "#111827";
    ctx.font = "bold 14px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Cash Flow S-Curve", pad.left, 20);

    // Legend
    const legendX = w - pad.right - 180;
    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(legendX, 10, 12, 12);
    ctx.fillStyle = "#374151";
    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Budgeted", legendX + 16, 20);

    if (hasActual) {
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(legendX + 90, 10, 12, 12);
      ctx.fillStyle = "#374151";
      ctx.fillText("Actual", legendX + 106, 20);
    }
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full border rounded-lg"
      style={{ height: 400 }}
    />
  );
}

// ── Resource Histogram Canvas Chart ───────────────────────────────────────
function HistogramChart({ data, resourceKeys }: { data: any[]; resourceKeys: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length || !resourceKeys.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pad = { top: 40, right: 30, bottom: 70, left: 70 };
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Calculate max stacked value
    let maxVal = 0;
    data.forEach(d => {
      let total = 0;
      resourceKeys.forEach(k => { total += d[k] || 0; });
      if (total > maxVal) maxVal = total;
    });
    maxVal = maxVal || 1;

    // Grid
    const gridLines = 5;
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
      const val = maxVal - (maxVal / gridLines) * i;
      ctx.fillStyle = "#6b7280";
      ctx.font = "11px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(val).toLocaleString() + "h", pad.left - 8, y + 4);
    }
    ctx.setLineDash([]);

    // Bars
    const barW = Math.max(4, (chartW / data.length) - 2);
    const gap = (chartW - barW * data.length) / (data.length + 1);

    data.forEach((d, i) => {
      const x = pad.left + gap + i * (barW + gap);
      let cumY = 0;
      resourceKeys.forEach((k, ki) => {
        const val = d[k] || 0;
        const barH = (val / maxVal) * chartH;
        const y = pad.top + chartH - cumY - barH;
        ctx.fillStyle = HISTOGRAM_COLORS[ki % HISTOGRAM_COLORS.length];
        ctx.fillRect(x, y, barW, barH);
        cumY += barH;
      });

      // X label
      const step = Math.max(1, Math.floor(data.length / 10));
      if (i % step === 0 || i === data.length - 1) {
        ctx.fillStyle = "#6b7280";
        ctx.font = "9px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.save();
        ctx.translate(x + barW / 2, pad.top + chartH + 12);
        ctx.rotate(-Math.PI / 5);
        ctx.fillText(fmtWeek(d.week), 0, 0);
        ctx.restore();
      }
    });

    // Title
    ctx.fillStyle = "#111827";
    ctx.font = "bold 14px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Resource Histogram (Hours/Week)", pad.left, 20);

    // Legend
    let lx = pad.left + 260;
    resourceKeys.forEach((k, ki) => {
      const label = k.split(":")[1] || k;
      ctx.fillStyle = HISTOGRAM_COLORS[ki % HISTOGRAM_COLORS.length];
      ctx.fillRect(lx, 8, 10, 10);
      ctx.fillStyle = "#374151";
      ctx.font = "10px 'DM Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(label, lx + 14, 17);
      lx += ctx.measureText(label).width + 28;
      if (lx > w - 40) { lx = pad.left + 260; }
    });
  }, [data, resourceKeys]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full border rounded-lg"
      style={{ height: 420 }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function ScheduleReports() {
  const [, params] = useRoute("/scheduler/:id/reports");
  const scheduleId = params?.id ? parseInt(params.id) : 0;

  const [reportType, setReportType] = useState<ReportType>("totalFloat");
  const [baselineId, setBaselineId] = useState<number | undefined>();
  const [sortBy, setSortBy] = useState<string>("float_asc");
  const [showFilters, setShowFilters] = useState(false);
  const [floatThreshold, setFloatThreshold] = useState<string>("");
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const isChartReport = reportType === "cashFlowSCurve" || reportType === "resourceHistogram";

  const { data: scheduleData } = trpc.schedule.get.useQuery(
    { id: scheduleId },
    { enabled: scheduleId > 0 }
  );
  const schedule = scheduleData?.schedule;
  const baselines = scheduleData?.baselines;

  const reportInput = useMemo(() => ({
    scheduleId,
    reportType,
    baselineId: reportType === "comparison" ? baselineId : undefined,
    filters: {
      floatThreshold: floatThreshold ? parseInt(floatThreshold) : undefined,
      showOnlyCritical,
    },
    sortBy: reportType === "totalFloat" ? sortBy : undefined,
  }), [scheduleId, reportType, baselineId, floatThreshold, showOnlyCritical, sortBy]);

  const { data: reportData, isLoading } = trpc.schedule.getReport.useQuery(
    reportInput,
    { enabled: scheduleId > 0 && (reportType !== "comparison" || !!baselineId) }
  );

  const handlePrint = () => { window.print(); };

  const handleExportCSV = () => {
    if (!reportData?.rows?.length) return;
    const rows = reportData.rows;
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row: any) =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "string" && (val.includes(",") || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schedule?.name || "schedule"}_${reportType}_report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ReportInfo = REPORT_LABELS[reportType];
  const Icon = ReportInfo.icon;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Screen-only header */}
      <div className="print:hidden border-b bg-card">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/scheduler/${scheduleId}`}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Schedule
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{schedule?.name || "Schedule"} — Reports</h1>
                <p className="text-sm text-muted-foreground">Tabular & visual schedule reports for review and submission</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!reportData?.rows?.length}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="default" size="sm" onClick={handlePrint} disabled={!reportData?.rows?.length}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Report selection and filters */}
      <div className="print:hidden max-w-[1600px] mx-auto px-6 py-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[260px]">
            <Label className="text-sm font-medium mb-1.5 block">Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="totalFloat">Total Float Report</SelectItem>
                <SelectItem value="earlyStart">Early Start Report</SelectItem>
                <SelectItem value="criticalPath">Critical Path Report</SelectItem>
                <SelectItem value="duration">Duration Report</SelectItem>
                <SelectItem value="comparison">Schedule Comparison</SelectItem>
                <SelectItem value="cashFlowSCurve">Cash Flow S-Curve</SelectItem>
                <SelectItem value="resourceHistogram">Resource Histogram</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === "comparison" && (
            <div className="min-w-[240px]">
              <Label className="text-sm font-medium mb-1.5 block">Compare Against Baseline</Label>
              <Select value={baselineId?.toString() || ""} onValueChange={(v) => setBaselineId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select baseline..." />
                </SelectTrigger>
                <SelectContent>
                  {baselines?.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name} {b.updateNumber ? `(Update ${b.updateNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {reportType === "totalFloat" && (
            <div className="min-w-[200px]">
              <Label className="text-sm font-medium mb-1.5 block">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="float_asc">Float (Low to High)</SelectItem>
                  <SelectItem value="float_desc">Float (High to Low)</SelectItem>
                  <SelectItem value="early_start">Early Start</SelectItem>
                  <SelectItem value="activity_id">Activity ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!isChartReport && (
            <Button
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
            </Button>
          )}
        </div>

        {showFilters && !isChartReport && (
          <Card className="mt-3">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <Label className="text-sm mb-1.5 block">Max Float Threshold</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 10"
                    value={floatThreshold}
                    onChange={(e) => setFloatThreshold(e.target.value)}
                    className="w-32"
                  />
                </div>
                <div className="flex items-center gap-2 pb-2">
                  <Checkbox
                    id="critOnly"
                    checked={showOnlyCritical}
                    onCheckedChange={(v) => setShowOnlyCritical(!!v)}
                  />
                  <Label htmlFor="critOnly" className="text-sm cursor-pointer">Critical activities only</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report content (printable) */}
      <div ref={printRef} className="max-w-[1600px] mx-auto px-6 py-4">
        {/* Print header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">{schedule?.name || "Schedule"}</h1>
          <h2 className="text-lg font-semibold mt-1">{ReportInfo.label}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Generated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {schedule?.dataDate && ` | Data Date: ${fmtDate(schedule.dataDate)}`}
          </p>
        </div>

        {/* Summary cards — for tabular reports */}
        {reportData?.summary && !isChartReport && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6 print:grid-cols-6 print:gap-2">
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Total Activities</p>
                <p className="text-2xl font-bold">{reportData.summary.totalActivities}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Critical</p>
                <p className="text-2xl font-bold text-red-600">{reportData.summary.criticalActivities}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Negative Float</p>
                <p className="text-2xl font-bold text-amber-600">{reportData.summary.negativeFloatCount}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Avg Float</p>
                <p className="text-2xl font-bold">{reportData.summary.averageFloat?.toFixed(1) ?? "—"}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Complete</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary.completedActivities}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">In Progress</p>
                <p className="text-2xl font-bold">{reportData.summary.inProgressActivities}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary cards — for S-Curve */}
        {reportData?.summary && reportType === "cashFlowSCurve" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:grid-cols-4 print:gap-2">
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Total Budgeted</p>
                <p className="text-2xl font-bold text-blue-600">{fmtCurrency((reportData.summary as any).totalBudgetedCost || 0)}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Total Actual</p>
                <p className="text-2xl font-bold text-green-600">{fmtCurrency((reportData.summary as any).totalActualCost || 0)}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Variance</p>
                <p className={`text-2xl font-bold ${((reportData.summary as any).totalBudgetedCost || 0) - ((reportData.summary as any).totalActualCost || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {fmtCurrency(((reportData.summary as any).totalBudgetedCost || 0) - ((reportData.summary as any).totalActualCost || 0))}
                </p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Weeks</p>
                <p className="text-2xl font-bold">{(reportData.summary as any).totalWeeks || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Summary cards — for Histogram */}
        {reportData?.summary && reportType === "resourceHistogram" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 print:grid-cols-4 print:gap-2">
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Resources</p>
                <p className="text-2xl font-bold">{(reportData.summary as any).totalResources || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Assignments</p>
                <p className="text-2xl font-bold">{(reportData.summary as any).totalAssignments || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Weeks</p>
                <p className="text-2xl font-bold">{(reportData.summary as any).totalWeeks || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-muted-foreground print:text-gray-500">Resource Types</p>
                <p className="text-2xl font-bold">{((reportData.summary as any).resourceKeys || []).length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-muted-foreground">Generating report...</span>
          </div>
        )}

        {/* ── S-Curve Chart + Table ──────────────────────────────────────── */}
        {reportType === "cashFlowSCurve" && reportData?.rows && !isLoading && (
          <>
            <div className="flex items-center gap-2 mb-3 print:hidden">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Cash Flow S-Curve</h2>
              <span className="text-sm text-muted-foreground">({reportData.rows.length} weeks)</span>
            </div>

            <SCurveChart data={reportData.rows} />

            {/* Tabular data below chart */}
            <h3 className="text-sm font-semibold mt-6 mb-2">Weekly Cash Flow Detail</h3>
            <div className="overflow-x-auto border rounded-lg print:border-black">
              <table className="w-full text-sm print:text-[10px]">
                <thead>
                  <tr className="bg-muted/50 print:bg-gray-100 border-b print:border-black">
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Week Of</th>
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Weekly Budgeted</th>
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Weekly Actual</th>
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Cumulative Budgeted</th>
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Cumulative Actual</th>
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row: any, idx: number) => (
                    <tr key={idx} className={`border-b print:border-gray-300 hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10 print:bg-gray-50"}`}>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtWeek(row.week)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.weeklyBudgeted)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.weeklyActual)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-blue-600">{fmtCurrency(row.cumulativeBudgeted)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-green-600">{fmtCurrency(row.cumulativeActual)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${(row.cumulativeBudgeted - row.cumulativeActual) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmtCurrency(row.cumulativeBudgeted - row.cumulativeActual)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Resource Histogram Chart + Table ───────────────────────────── */}
        {reportType === "resourceHistogram" && reportData?.rows && !isLoading && (
          <>
            <div className="flex items-center gap-2 mb-3 print:hidden">
              <Users className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold">Resource Histogram</h2>
              <span className="text-sm text-muted-foreground">({reportData.rows.length} weeks)</span>
            </div>

            <HistogramChart
              data={reportData.rows}
              resourceKeys={(reportData.summary as any)?.resourceKeys || []}
            />

            {/* Tabular data below chart */}
            <h3 className="text-sm font-semibold mt-6 mb-2">Weekly Resource Loading Detail (Hours)</h3>
            <div className="overflow-x-auto border rounded-lg print:border-black">
              <table className="w-full text-sm print:text-[10px]">
                <thead>
                  <tr className="bg-muted/50 print:bg-gray-100 border-b print:border-black">
                    <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Week Of</th>
                    {((reportData.summary as any)?.resourceKeys || []).map((k: string) => (
                      <th key={k} className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">
                        {k.split(":")[1] || k}
                      </th>
                    ))}
                    <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row: any, idx: number) => {
                    const keys = (reportData.summary as any)?.resourceKeys || [];
                    const total = keys.reduce((s: number, k: string) => s + (row[k] || 0), 0);
                    return (
                      <tr key={idx} className={`border-b print:border-gray-300 hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10 print:bg-gray-50"}`}>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtWeek(row.week)}</td>
                        {keys.map((k: string) => (
                          <td key={k} className="px-3 py-2 text-right font-mono">{(row[k] || 0).toLocaleString()}</td>
                        ))}
                        <td className="px-3 py-2 text-right font-mono font-bold">{total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── Tabular reports (existing) ─────────────────────────────────── */}
        {!isChartReport && reportData?.rows && !isLoading && (
          <>
            <div className="flex items-center gap-2 mb-3 print:hidden">
              <Icon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">{ReportInfo.label}</h2>
              <span className="text-sm text-muted-foreground">({reportData.rows.length} activities)</span>
            </div>

            <div className="overflow-x-auto border rounded-lg print:border-black">
              <table className="w-full text-sm print:text-[10px]">
                <thead>
                  <tr className="bg-muted/50 print:bg-gray-100 border-b print:border-black">
                    {reportType === "totalFloat" && (
                      <>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Activity ID</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Activity Name</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">WBS</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">OD</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Start</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Finish</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Late Start</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Late Finish</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Total Float</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Free Float</th>
                        <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Critical</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">% Comp</th>
                      </>
                    )}
                    {reportType === "earlyStart" && (
                      <>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Activity ID</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Activity Name</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">WBS</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">OD</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Start</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Finish</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Late Start</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Late Finish</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Total Float</th>
                        <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Critical</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">% Comp</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Constraint</th>
                      </>
                    )}
                    {reportType === "criticalPath" && (
                      <>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Activity ID</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Activity Name</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">WBS</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">OD</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Start</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Finish</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Total Float</th>
                        <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Longest Path</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Predecessors</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Successors</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">% Comp</th>
                      </>
                    )}
                    {reportType === "duration" && (
                      <>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Activity ID</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Activity Name</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">WBS</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Original Duration</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Remaining Duration</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Start</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Early Finish</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Total Float</th>
                        <th className="text-center px-3 py-2.5 font-semibold whitespace-nowrap">Critical</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">% Comp</th>
                      </>
                    )}
                    {reportType === "comparison" && (
                      <>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Activity ID</th>
                        <th className="text-left px-3 py-2.5 font-semibold">Activity Name</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">BL Start</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Curr Start</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Start Var (d)</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">BL Finish</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Curr Finish</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Finish Var (d)</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">BL Dur</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Curr Dur</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Dur Var</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">BL Float</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Curr Float</th>
                        <th className="text-right px-3 py-2.5 font-semibold whitespace-nowrap">Float Var</th>
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row: any, idx: number) => (
                    <tr
                      key={idx}
                      className={`border-b print:border-gray-300 hover:bg-muted/30 ${
                        row.isCritical ? "bg-red-50/50 dark:bg-red-950/20 print:bg-red-50" : ""
                      } ${idx % 2 === 0 ? "" : "bg-muted/10 print:bg-gray-50"}`}
                    >
                      {reportType === "totalFloat" && (
                        <>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.activityId}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.duration}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyFinish)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.lateStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.lateFinish)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.totalFloat)}`}>{fmtFloat(row.totalFloat)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.freeFloat)}`}>{fmtFloat(row.freeFloat)}</td>
                          <td className="px-3 py-2 text-center">{row.isCritical ? "Yes" : ""}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.percentComplete}%</td>
                        </>
                      )}
                      {reportType === "earlyStart" && (
                        <>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.activityId}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.duration}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyFinish)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.lateStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.lateFinish)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.totalFloat)}`}>{fmtFloat(row.totalFloat)}</td>
                          <td className="px-3 py-2 text-center">{row.isCritical ? "Yes" : ""}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.percentComplete}%</td>
                          <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{row.constraintType !== "ASAP" ? row.constraintType : ""}</td>
                        </>
                      )}
                      {reportType === "criticalPath" && (
                        <>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.activityId}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.duration}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyFinish)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.totalFloat)}`}>{fmtFloat(row.totalFloat)}</td>
                          <td className="px-3 py-2 text-center">{row.isOnLongestPath ? "LP" : ""}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.predecessorCount ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.successorCount ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.percentComplete}%</td>
                        </>
                      )}
                      {reportType === "duration" && (
                        <>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.activityId}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{row.duration}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.remainingDuration ?? "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyFinish)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.totalFloat)}`}>{fmtFloat(row.totalFloat)}</td>
                          <td className="px-3 py-2 text-center">{row.isCritical ? "Yes" : ""}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.percentComplete}%</td>
                        </>
                      )}
                      {reportType === "comparison" && (
                        <>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.activityId}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.baselineStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.currentStart)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${varianceColor(row.startVariance)}`}>{row.startVariance != null ? (row.startVariance > 0 ? `+${row.startVariance}` : row.startVariance) : "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.baselineFinish)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.currentFinish)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${varianceColor(row.finishVariance)}`}>{row.finishVariance != null ? (row.finishVariance > 0 ? `+${row.finishVariance}` : row.finishVariance) : "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.baselineDuration ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.currentDuration ?? "—"}</td>
                          <td className={`px-3 py-2 text-right font-mono ${varianceColor(row.durationVariance)}`}>{row.durationVariance != null ? (row.durationVariance > 0 ? `+${row.durationVariance}` : row.durationVariance) : "—"}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.baselineFloat)}`}>{fmtFloat(row.baselineFloat)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.currentFloat)}`}>{fmtFloat(row.currentFloat)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${varianceColor(row.floatVariance)}`}>{row.floatVariance != null ? (row.floatVariance > 0 ? `+${row.floatVariance}` : row.floatVariance) : "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              row.status === "delayed" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                              row.status === "ahead" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                              row.status === "new" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                              "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}>
                              {row.status || "on-time"}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print footer */}
            <div className="hidden print:block mt-4 pt-2 border-t border-gray-300 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>ALP Contractor Circle — CPM Schedule Builder</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!isLoading && (!reportData?.rows || reportData.rows.length === 0) && reportType !== "comparison" && !isChartReport && (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No data available</h3>
            <p className="text-muted-foreground mt-1">Run the CPM calculation first to generate report data.</p>
          </div>
        )}

        {/* Empty state for chart reports */}
        {!isLoading && (!reportData?.rows || reportData.rows.length === 0) && isChartReport && (
          <div className="text-center py-20">
            <DollarSign className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No resource data available</h3>
            <p className="text-muted-foreground mt-1">
              Assign resources to activities with budgeted costs first. Use the Resources panel in the scheduler to add resources and assign them to activities.
            </p>
          </div>
        )}

        {reportType === "comparison" && !baselineId && (
          <div className="text-center py-20">
            <GitCompare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">Select a baseline to compare</h3>
            <p className="text-muted-foreground mt-1">Choose a baseline or update snapshot from the dropdown above.</p>
          </div>
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
          .print\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
          canvas { max-width: 100%; height: auto !important; }
        }
      `}</style>
    </div>
  );
}
