/**
 * Schedule Reports — Tabular reports for CPM schedules.
 * Supports: Total Float, Early Start, Critical Path, Duration, Schedule Comparison.
 * Designed for print-ready output (City of New York monthly update style).
 */
import { useState, useMemo, useRef } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";

type ReportType = "totalFloat" | "earlyStart" | "criticalPath" | "duration" | "comparison";

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
  if (v > 0) return "text-red-600 font-bold"; // delayed
  if (v < 0) return "text-green-600 font-semibold"; // ahead
  return "text-muted-foreground";
}

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

  // Fetch schedule info (includes baselines)
  const { data: scheduleData } = trpc.schedule.get.useQuery(
    { id: scheduleId },
    { enabled: scheduleId > 0 }
  );
  const schedule = scheduleData?.schedule;
  const baselines = scheduleData?.baselines;

  // Fetch report data
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

  const handlePrint = () => {
    window.print();
  };

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
                <p className="text-sm text-muted-foreground">Tabular schedule reports for review and submission</p>
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
          <div className="min-w-[240px]">
            <Label className="text-sm font-medium mb-1.5 block">Report Type</Label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(REPORT_LABELS).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
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
        </div>

        {showFilters && (
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

        {/* Summary cards */}
        {reportData?.summary && (
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
                <p className="text-2xl font-bold">{reportData.summary.averageFloat?.toFixed(1) ?? "\u2014"}</p>            </CardContent>
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

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-muted-foreground">Generating report...</span>
          </div>
        )}

        {/* Report table */}
        {reportData?.rows && !isLoading && (
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
        {!isLoading && (!reportData?.rows || reportData.rows.length === 0) && reportType !== "comparison" && (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No data available</h3>
            <p className="text-muted-foreground mt-1">Run the CPM calculation first to generate report data.</p>
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
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
    </div>
  );
}
