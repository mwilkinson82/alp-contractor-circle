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
  Calendar,
} from "lucide-react";

type ReportType = "totalFloat" | "earlyStart" | "criticalPath" | "duration" | "comparison" | "cashFlowSCurve" | "resourceHistogram" | "resourceLeveling" | "evm" | "delayAnalysis" | "costForecast" | "healthScore";

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
  resourceLeveling: {
    label: "Resource Leveling",
    icon: AlertTriangle,
    description: "Detects over-allocated resources and suggests schedule adjustments",
  },
  evm: {
    label: "Earned Value Management",
    icon: DollarSign,
    description: "CPI, SPI, EAC, ETC and other EVM metrics with trend analysis",
  },
  resourceHistogram: {
    label: "Resource Histogram",
    icon: Users,
    description: "Weekly resource loading by type — identifies over-allocation and leveling needs",
  },
  delayAnalysis: {
    label: "Delay Analysis",
    icon: GitCompare,
    description: "Compare current schedule against baseline — identify impacted activities and auto-generate annotations",
  },
  costForecast: {
    label: "Cost Forecast (S-Curve)",
    icon: TrendingUp,
    description: "Project future costs based on CPI/SPI trends — for bank draw requests",
  },
  healthScore: {
    label: "Schedule Health Score",
    icon: Activity,
    description: "Composite grade combining float, critical path, logic density, and resource balance",
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
  return "text-emerald-400";
}

function varianceColor(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (v > 0) return "text-red-600 font-bold";
  if (v < 0) return "text-green-600 font-semibold";
  return "text-gray-600 font-medium";
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
  );}

// ── Cost Forecast Chart ───────────────────────────────────────────────────────────
function CostForecastChart({ data, bac, eac }: { data: any[]; bac: number; eac: number }) {
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

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    const maxVal = Math.max(...data.map(d => Math.max(d.planned || 0, d.actual || 0, d.forecastEAC || 0, d.earned || 0)), bac, eac) * 1.1;

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
      ctx.fillStyle = "#374151";
      ctx.font = "bold 11px 'DM Sans', sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("$" + (val / 100).toLocaleString("en-US", { maximumFractionDigits: 0 }), pad.left - 8, y + 4);
    }
    ctx.setLineDash([]);

    // X-axis
    const step = Math.max(1, Math.floor(data.length / 8));
    ctx.fillStyle = "#374151";
    ctx.font = "bold 10px 'DM Sans', sans-serif";
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

    const drawLine = (key: string, color: string, lineWidth: number, dash?: number[]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (dash) ctx.setLineDash(dash);
      else ctx.setLineDash([]);
      ctx.beginPath();
      data.forEach((d, i) => {
        const x = pad.left + (i / (data.length - 1)) * chartW;
        const y = pad.top + chartH - ((d[key] || 0) / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    drawLine("planned", "#3b82f6", 2.5);
    drawLine("earned", "#22c55e", 2.5);
    drawLine("actual", "#ef4444", 2.5);
    drawLine("forecastEAC", "#a855f7", 2, [6, 4]);

    // BAC line
    const bacY = pad.top + chartH - (bac / maxVal) * chartH;
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left, bacY);
    ctx.lineTo(w - pad.right, bacY);
    ctx.stroke();
    ctx.fillStyle = "#3b82f6";
    ctx.font = "bold 10px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("BAC", w - pad.right + 4, bacY + 4);

    // EAC line
    if (eac !== bac) {
      const eacY = pad.top + chartH - (eac / maxVal) * chartH;
      ctx.strokeStyle = "#a855f7";
      ctx.beginPath();
      ctx.moveTo(pad.left, eacY);
      ctx.lineTo(w - pad.right, eacY);
      ctx.stroke();
      ctx.fillStyle = "#a855f7";
      ctx.fillText("EAC", w - pad.right + 4, eacY + 4);
    }
    ctx.setLineDash([]);

    // Legend
    const legend = [
      { label: "Planned Value", color: "#3b82f6" },
      { label: "Earned Value", color: "#22c55e" },
      { label: "Actual Cost", color: "#ef4444" },
      { label: "Forecast (EAC)", color: "#a855f7" },
    ];
    ctx.font = "bold 11px 'DM Sans', sans-serif";
    let lx = pad.left;
    legend.forEach(l => {
      ctx.fillStyle = l.color;
      ctx.fillRect(lx, 8, 16, 3);
      ctx.fillStyle = "#374151";
      ctx.textAlign = "left";
      ctx.fillText(l.label, lx + 20, 14);
      lx += ctx.measureText(l.label).width + 40;
    });
  }, [data, bac, eac]);

  return <canvas ref={canvasRef} className="w-full" style={{ height: 400 }} />;
}

// ── EVM Dashboard Component ─────────────────────────────────────────────────────────
function EvmDashboard({ data, baselineData }: { data: any; baselineData?: any }) {const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.trendData?.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width, H = rect.height;
    const pad = { top: 30, right: 30, bottom: 50, left: 80 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, W, H);

    const rows = data.trendData;
    const blRows = baselineData?.trendData || [];
    const allVals = [...rows.map((r: any) => Math.max(r.bcws, r.bcwp, r.acwp)), ...blRows.map((r: any) => Math.max(r.bcws, r.bcwp, r.acwp))];
    const maxVal = Math.max(...allVals, 1);

    // Grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = pad.top + chartH - (i / 5) * chartH;
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke();
      ctx.fillStyle = "#6b7280"; ctx.font = "11px sans-serif"; ctx.textAlign = "right";
      ctx.fillText("$" + ((maxVal * i / 5) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 }), pad.left - 8, y + 4);
    }

    // X labels
    const step = Math.max(1, Math.floor(rows.length / 10));
    ctx.fillStyle = "#6b7280"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    rows.forEach((r: any, i: number) => {
      if (i % step === 0) {
        const x = pad.left + (i / (rows.length - 1)) * chartW;
        ctx.fillText(r.weekLabel, x, H - pad.bottom + 18);
      }
    });

    // Draw lines helper
    const drawLine = (srcRows: any[], key: string, color: string, dash: number[] = [], lineWidth = 2.5) => {
      if (!srcRows.length) return;
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.setLineDash(dash);
      ctx.beginPath();
      srcRows.forEach((r: any, i: number) => {
        const x = pad.left + (i / Math.max(1, srcRows.length - 1)) * chartW;
        const y = pad.top + chartH - (r[key] / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke(); ctx.setLineDash([]);
    };

    // Baseline trend lines (faded, thin)
    if (blRows.length > 0) {
      drawLine(blRows, "bcws", "#93c5fd", [4, 4], 1.5); // Baseline PV - light blue dashed
      drawLine(blRows, "bcwp", "#86efac", [4, 4], 1.5); // Baseline EV - light green dashed
      drawLine(blRows, "acwp", "#fca5a5", [4, 4], 1.5); // Baseline AC - light red dashed
    }

    // Current trend lines
    drawLine(rows, "bcws", "#3b82f6", [6, 3]); // PV - blue dashed
    drawLine(rows, "bcwp", "#22c55e");          // EV - green solid
    drawLine(rows, "acwp", "#ef4444");          // AC - red solid

    // Legend
    const legends: Array<{ label: string; color: string; dash: boolean; thin?: boolean }> = [
      { label: "PV (BCWS)", color: "#3b82f6", dash: true },
      { label: "EV (BCWP)", color: "#22c55e", dash: false },
      { label: "AC (ACWP)", color: "#ef4444", dash: false },
    ];
    if (blRows.length > 0) {
      legends.push({ label: "Baseline PV", color: "#93c5fd", dash: true, thin: true });
      legends.push({ label: "Baseline EV", color: "#86efac", dash: true, thin: true });
    }
    let lx = pad.left + 10;
    legends.forEach(l => {
      ctx.strokeStyle = l.color; ctx.lineWidth = l.thin ? 1.5 : 2.5;
      ctx.setLineDash(l.dash ? [6, 3] : []);
      ctx.beginPath(); ctx.moveTo(lx, pad.top - 12); ctx.lineTo(lx + 24, pad.top - 12); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#374151"; ctx.font = "11px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(l.label, lx + 28, pad.top - 8);
      lx += ctx.measureText(l.label).width + 50;
    });
  }, [data, baselineData]);

  const fmtMoney = (cents: number) => "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const indexColor = (val: number, good: "above" | "below") => {
    if (good === "above") return val >= 1 ? "text-emerald-400" : val >= 0.9 ? "text-amber-600" : "text-red-400";
    return val <= 1 ? "text-emerald-400" : val <= 1.1 ? "text-amber-600" : "text-red-400";
  };
  const varColor = (val: number) => val >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-semibold">Earned Value Management Dashboard</h2>
      </div>

      {/* Key metrics cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">BAC (Budget)</div>
          <div className="text-xl font-bold">{fmtMoney(data.BAC)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">EV (BCWP)</div>
          <div className="text-xl font-bold text-green-600">{fmtMoney(data.BCWP)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">PV (BCWS)</div>
          <div className="text-xl font-bold text-amber-400">{fmtMoney(data.BCWS)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">AC (ACWP)</div>
          <div className="text-xl font-bold text-red-600">{fmtMoney(data.ACWP)}</div>
        </CardContent></Card>
      </div>

      {/* Performance indices */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="border-l-4 border-l-blue-500"><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">CPI (Cost Performance)</div>
          <div className={`text-2xl font-bold ${indexColor(data.CPI, "above")}`}>{data.CPI.toFixed(2)}</div>
          <div className="text-xs text-gray-600 font-medium">{data.CPI >= 1 ? "Under budget" : "Over budget"}</div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-green-500"><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">SPI (Schedule Performance)</div>
          <div className={`text-2xl font-bold ${indexColor(data.SPI, "above")}`}>{data.SPI.toFixed(2)}</div>
          <div className="text-xs text-gray-600 font-medium">{data.SPI >= 1 ? "Ahead of schedule" : "Behind schedule"}</div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">TCPI (To-Complete)</div>
          <div className={`text-2xl font-bold ${indexColor(data.TCPI, "below")}`}>{data.TCPI.toFixed(2)}</div>
          <div className="text-xs text-gray-600 font-medium">{data.TCPI <= 1 ? "Achievable" : "Difficult to achieve"}</div>
        </CardContent></Card>
        <Card className="border-l-4 border-l-purple-500"><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">EAC (Estimate at Completion)</div>
          <div className="text-xl font-bold">{fmtMoney(data.EAC)}</div>
          <div className="text-xs text-gray-600 font-medium">ETC: {fmtMoney(data.ETC)}</div>
        </CardContent></Card>
      </div>

      {/* Variances */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">Cost Variance (CV)</div>
          <div className={`text-lg font-bold ${varColor(data.CV)}`}>{data.CV >= 0 ? "+" : ""}{fmtMoney(data.CV)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">Schedule Variance (SV)</div>
          <div className={`text-lg font-bold ${varColor(data.SV)}`}>{data.SV >= 0 ? "+" : ""}{fmtMoney(data.SV)}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-3 pb-2">
          <div className="text-xs text-gray-600 font-medium">Variance at Completion (VAC)</div>
          <div className={`text-lg font-bold ${varColor(data.VAC)}`}>{data.VAC >= 0 ? "+" : ""}{fmtMoney(data.VAC)}</div>
        </CardContent></Card>
      </div>

      {/* Trend chart */}
      {data.trendData?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">EVM Trend (PV / EV / AC)</h3>
          <canvas ref={canvasRef} className="w-full border rounded-lg bg-[#0f1219]" style={{ height: 360 }} />
        </div>
      )}

      {/* Baseline Comparison */}
      {baselineData && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <GitCompare className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold">Baseline Comparison: {baselineData.baselineName}</h3>
            {baselineData.baselineDataDate && (
              <span className="text-xs text-gray-600 font-medium">(Data Date: {new Date(baselineData.baselineDataDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})</span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: "CPI", current: data.CPI, baseline: baselineData.CPI, fmt: (v: number) => v.toFixed(2), good: "above" as const },
              { label: "SPI", current: data.SPI, baseline: baselineData.SPI, fmt: (v: number) => v.toFixed(2), good: "above" as const },
              { label: "CV", current: data.CV, baseline: baselineData.CV, fmt: fmtMoney, good: "above" as const },
              { label: "SV", current: data.SV, baseline: baselineData.SV, fmt: fmtMoney, good: "above" as const },
              { label: "EAC", current: data.EAC, baseline: baselineData.EAC, fmt: fmtMoney, good: "below" as const },
              { label: "TCPI", current: data.TCPI, baseline: baselineData.TCPI, fmt: (v: number) => v.toFixed(2), good: "below" as const },
            ].map((m) => {
              const delta = m.current - m.baseline;
              const improved = m.good === "above" ? delta > 0 : delta < 0;
              const deltaStr = m.label === "CV" || m.label === "SV" || m.label === "EAC"
                ? (delta >= 0 ? "+" : "") + fmtMoney(delta)
                : (delta >= 0 ? "+" : "") + delta.toFixed(2);
              return (
                <Card key={m.label} className="border-l-4" style={{ borderLeftColor: improved ? "#22c55e" : delta === 0 ? "#9ca3af" : "#ef4444" }}>
                  <CardContent className="pt-2 pb-2">
                    <div className="text-xs text-gray-600 font-medium">{m.label}</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold">{m.fmt(m.current)}</span>
                      <span className={`text-xs font-semibold ${improved ? "text-emerald-400" : delta === 0 ? "text-gray-400" : "text-red-400"}`}>
                        {deltaStr} {improved ? "\u2191" : delta === 0 ? "\u2192" : "\u2193"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Baseline: {m.fmt(m.baseline)}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity EVM breakdown table */}
      {data.activityEvm?.length > 0 && (
        <>
          <h3 className="text-sm font-semibold mb-2">Activity-Level EVM Breakdown</h3>
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-3 py-2.5 font-semibold">Activity ID</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Name</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Budget</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Earned Value</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Actual Cost</th>
                  <th className="text-right px-3 py-2.5 font-semibold">CPI</th>
                  <th className="text-right px-3 py-2.5 font-semibold">% Complete</th>
                </tr>
              </thead>
              <tbody>
                {data.activityEvm.map((a: any, idx: number) => (
                  <tr key={idx} className={`border-b hover:bg-muted/30 ${idx % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-3 py-2 font-mono text-xs">{a.activityId}</td>
                    <td className="px-3 py-2">{a.name}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtMoney(a.budget)}</td>
                    <td className="px-3 py-2 text-right font-mono text-green-600">{fmtMoney(a.earnedValue)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">{fmtMoney(a.actualCost)}</td>
                    <td className={`px-3 py-2 text-right font-mono font-bold ${indexColor(a.cpi, "above")}`}>{a.cpi.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, a.percentComplete)}%` }} />
                        </div>
                        <span className="text-xs font-mono">{a.percentComplete}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {data.BAC === 0 && (
        <div className="text-center py-12">
          <DollarSign className="w-12 h-12 mx-auto text-gray-600 font-medium/50 mb-4" />
          <h3 className="text-lg font-semibold">No Cost Data Available</h3>
          <p className="text-gray-600 font-medium mt-1">Assign resources with budgeted costs to activities first.</p>
        </div>
      )}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────────
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
  const isSpecialReport = reportType === "resourceLeveling" || reportType === "evm" || reportType === "delayAnalysis" || reportType === "costForecast" || reportType === "healthScore";
  const isStandardReport = !isSpecialReport;

  const { data: scheduleData } = trpc.schedule.get.useQuery(
    { id: scheduleId },
    { enabled: scheduleId > 0 }
  );
  const schedule = scheduleData?.schedule;
  const baselines = scheduleData?.baselines;

  const standardReportType = isStandardReport ? reportType as "totalFloat" | "earlyStart" | "criticalPath" | "duration" | "comparison" | "cashFlowSCurve" | "resourceHistogram" : "totalFloat";
  const reportInput = useMemo(() => ({
    scheduleId,
    reportType: standardReportType,
    baselineId: reportType === "comparison" ? baselineId : undefined,
    filters: {
      floatThreshold: floatThreshold ? parseInt(floatThreshold) : undefined,
      showOnlyCritical,
    },
    sortBy: reportType === "totalFloat" ? sortBy : undefined,
  }), [scheduleId, standardReportType, reportType, baselineId, floatThreshold, showOnlyCritical, sortBy]);

  const { data: reportData, isLoading: isStdLoading } = trpc.schedule.getReport.useQuery(
    reportInput,
    { enabled: scheduleId > 0 && isStandardReport && (reportType !== "comparison" || !!baselineId) }
  );

  // Resource Leveling query
  const { data: levelingData, isLoading: isLevelingLoading } = trpc.schedule.resourceLeveling.useQuery(
    { scheduleId },
    { enabled: scheduleId > 0 && reportType === "resourceLeveling" }
  );

  // EVM queries
  const [evmBaselineId, setEvmBaselineId] = useState<number | undefined>();
  const { data: evmData, isLoading: isEvmLoading } = trpc.schedule.evmMetrics.useQuery(
    { scheduleId },
    { enabled: scheduleId > 0 && reportType === "evm" }
  );
  const { data: evmBaselineData } = trpc.schedule.evmBaseline.useQuery(
    { scheduleId, baselineId: evmBaselineId! },
    { enabled: scheduleId > 0 && reportType === "evm" && !!evmBaselineId }
  );

  // Delay Analysis queries
  const [delayBaselineId, setDelayBaselineId] = useState<number | undefined>();
  const { data: delayData, isLoading: isDelayLoading } = trpc.schedule.delayAnalysis.useQuery(
    { scheduleId, baselineId: delayBaselineId! },
    { enabled: scheduleId > 0 && reportType === "delayAnalysis" && !!delayBaselineId }
  );

  // Cost Forecast query
  const { data: forecastData, isLoading: isForecastLoading } = trpc.schedule.costForecast.useQuery(
    { scheduleId },
    { enabled: scheduleId > 0 && reportType === "costForecast" }
  );

  // Health Score query
  const { data: healthData, isLoading: isHealthLoading } = trpc.schedule.healthScore.useQuery(
    { scheduleId },
    { enabled: scheduleId > 0 && reportType === "healthScore" }
  );

  const isLoading = isStdLoading || isLevelingLoading || isEvmLoading || isDelayLoading || isForecastLoading || isHealthLoading;

  const handlePrint = () => { window.print(); };

  const handleExportEvmPdf = async () => {
    if (!evmData) return;
    const { generateEvmPdf } = await import("@/lib/reportPdf");
    generateEvmPdf({
      scheduleName: schedule?.name || "Schedule",
      dataDate: schedule?.dataDate ? String(schedule.dataDate) : null,
      metrics: evmData,
      activityEvm: evmData.activityEvm,
      baselineData: evmBaselineData ? { baselineName: evmBaselineData.baselineName, CPI: evmBaselineData.CPI, SPI: evmBaselineData.SPI, CV: evmBaselineData.CV, SV: evmBaselineData.SV, EAC: evmBaselineData.EAC, TCPI: evmBaselineData.TCPI } : null,
    });
  };

  const handleExportLevelingPdf = async () => {
    if (!levelingData) return;
    const { generateLevelingPdf } = await import("@/lib/reportPdf");
    const uniqueResources = new Set(levelingData.overAllocations.map((oa: any) => oa.resourceId));
    const maxOver = levelingData.overAllocations.length > 0
      ? Math.max(...levelingData.overAllocations.map((oa: any) => oa.overBy))
      : 0;
    generateLevelingPdf({
      scheduleName: schedule?.name || "Schedule",
      dataDate: schedule?.dataDate ? String(schedule.dataDate) : null,
      summary: {
        totalResources: uniqueResources.size,
        overAllocatedCount: uniqueResources.size,
        maxOverAllocation: maxOver,
        totalSuggestions: levelingData.suggestions.length,
      },
      overAllocations: levelingData.overAllocations.map((oa: any) => ({
        resourceName: oa.resourceName,
        resourceType: oa.resourceType,
        week: oa.weekLabel,
        allocated: oa.allocated,
        capacity: oa.capacity,
        overBy: oa.overBy,
        severity: oa.overBy / oa.capacity > 0.5 ? "critical" : oa.overBy / oa.capacity > 0.25 ? "high" : "medium",
      })),
      suggestions: levelingData.suggestions.map((s: any) => ({
        resourceName: s.resourceName,
        activityName: s.weekLabel,
        suggestion: s.message,
        severity: s.severity,
      })),
    });
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
                <p className="text-sm text-gray-600 font-medium">Tabular & visual schedule reports for review and submission</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {reportType === "evm" && (
                <Button variant="outline" size="sm" onClick={handleExportEvmPdf} disabled={!evmData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              )}
              {reportType === "resourceLeveling" && (
                <Button variant="outline" size="sm" onClick={handleExportLevelingPdf} disabled={!levelingData}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              )}
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
                <SelectItem value="resourceLeveling">Resource Leveling</SelectItem>
                <SelectItem value="evm">Earned Value Management</SelectItem>
                <SelectItem value="delayAnalysis">Delay Analysis</SelectItem>
                <SelectItem value="costForecast">Cost Forecast (S-Curve)</SelectItem>
                <SelectItem value="healthScore">Schedule Health Score</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === "evm" && baselines && baselines.length > 0 && (
            <div className="min-w-[240px]">
              <Label className="text-sm font-medium mb-1.5 block">Compare Against Baseline</Label>
              <Select value={evmBaselineId?.toString() || "none"} onValueChange={(v) => setEvmBaselineId(v === "none" ? undefined : parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="No comparison" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No comparison</SelectItem>
                  {baselines.map((b: any) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.name} {b.updateNumber ? `(Update ${b.updateNumber})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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

          {reportType === "delayAnalysis" && baselines && baselines.length > 0 && (
            <div className="min-w-[240px]">
              <Label className="text-sm font-medium mb-1.5 block">Compare Against Baseline</Label>
              <Select value={delayBaselineId?.toString() || ""} onValueChange={(v) => setDelayBaselineId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select baseline..." />
                </SelectTrigger>
                <SelectContent>
                  {baselines.map((b: any) => (
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
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Total Activities</p>
                <p className="text-2xl font-bold">{reportData.summary.totalActivities}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-600">{reportData.summary.criticalActivities}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Negative Float</p>
                <p className="text-2xl font-bold text-amber-600">{reportData.summary.negativeFloatCount}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Avg Float</p>
                <p className="text-2xl font-bold">{reportData.summary.averageFloat?.toFixed(1) ?? "—"}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Complete</p>
                <p className="text-2xl font-bold text-green-600">{reportData.summary.completedActivities}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">In Progress</p>
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
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Total Budgeted</p>
                <p className="text-2xl font-bold text-amber-400">{fmtCurrency((reportData.summary as any).totalBudgetedCost || 0)}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Total Actual</p>
                <p className="text-2xl font-bold text-green-600">{fmtCurrency((reportData.summary as any).totalActualCost || 0)}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Variance</p>
                <p className={`text-2xl font-bold ${((reportData.summary as any).totalBudgetedCost || 0) - ((reportData.summary as any).totalActualCost || 0) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {fmtCurrency(((reportData.summary as any).totalBudgetedCost || 0) - ((reportData.summary as any).totalActualCost || 0))}
                </p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Weeks</p>
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
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Resources</p>
                <p className="text-2xl font-bold">{(reportData.summary as any).totalResources || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Assignments</p>
                <p className="text-2xl font-bold">{(reportData.summary as any).totalAssignments || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Weeks</p>
                <p className="text-2xl font-bold">{(reportData.summary as any).totalWeeks || 0}</p>
              </CardContent>
            </Card>
            <Card className="print:border print:shadow-none">
              <CardContent className="pt-3 pb-3 px-4">
                <p className="text-xs text-gray-600 font-medium print:text-gray-400">Resource Types</p>
                <p className="text-2xl font-bold">{((reportData.summary as any).resourceKeys || []).length}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            <span className="ml-3 text-gray-600 font-medium">Generating report...</span>
          </div>
        )}

        {/* ── S-Curve Chart + Table ──────────────────────────────────────── */}
        {reportType === "cashFlowSCurve" && reportData?.rows && !isLoading && (
          <>
            <div className="flex items-center gap-2 mb-3 print:hidden">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold">Cash Flow S-Curve</h2>
              <span className="text-sm text-gray-600 font-medium">({reportData.rows.length} weeks)</span>
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
                    <tr key={idx} className={`border-b print:border-white/15 hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10 print:bg-gray-50"}`}>
                      <td className="px-3 py-2 whitespace-nowrap">{fmtWeek(row.week)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.weeklyBudgeted)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtCurrency(row.weeklyActual)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-amber-400">{fmtCurrency(row.cumulativeBudgeted)}</td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-green-600">{fmtCurrency(row.cumulativeActual)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${(row.cumulativeBudgeted - row.cumulativeActual) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
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
              <span className="text-sm text-gray-600 font-medium">({reportData.rows.length} weeks)</span>
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
                      <tr key={idx} className={`border-b print:border-white/15 hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10 print:bg-gray-50"}`}>
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
              <span className="text-sm text-gray-600 font-medium">({reportData.rows.length} activities)</span>
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
                      className={`border-b print:border-white/15 hover:bg-muted/30 ${
                        row.isCritical ? "bg-red-500/10/50 dark:bg-red-950/20 print:bg-red-500/10" : ""
                      } ${idx % 2 === 0 ? "" : "bg-muted/10 print:bg-gray-50"}`}
                    >
                      {reportType === "totalFloat" && (
                        <>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.activityId}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 text-gray-600 font-medium whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
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
                          <td className="px-3 py-2 text-gray-600 font-medium whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.duration}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.earlyFinish)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.lateStart)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(row.lateFinish)}</td>
                          <td className={`px-3 py-2 text-right font-mono ${floatColor(row.totalFloat)}`}>{fmtFloat(row.totalFloat)}</td>
                          <td className="px-3 py-2 text-center">{row.isCritical ? "Yes" : ""}</td>
                          <td className="px-3 py-2 text-right font-mono">{row.percentComplete}%</td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-600 font-medium">{row.constraintType !== "ASAP" ? row.constraintType : ""}</td>
                        </>
                      )}
                      {reportType === "criticalPath" && (
                        <>
                          <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{row.activityId}</td>
                          <td className="px-3 py-2">{row.name}</td>
                          <td className="px-3 py-2 text-gray-600 font-medium whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
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
                          <td className="px-3 py-2 text-gray-600 font-medium whitespace-nowrap">{row.wbsName || row.wbsCode || "—"}</td>
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
                              "bg-white/8 text-gray-200 dark:bg-gray-800 dark:text-gray-200"
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
            <div className="hidden print:block mt-4 pt-2 border-t border-white/15 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>ALP Contractor Circle — CPM Schedule Builder</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          </>
        )}

        {/* ── Resource Leveling Report ─────────────────────────────── */}
        {reportType === "resourceLeveling" && !isLoading && levelingData && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-semibold">Resource Leveling Analysis</h2>
            </div>

            {/* Calendar info banner */}
            {levelingData.calendarInfo && levelingData.calendarInfo.calendarsUsed > 0 && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="text-sm font-medium">Calendar-Adjusted Capacity</span>
                  <span className="text-xs text-gray-600 font-medium ml-2">
                    Using {levelingData.calendarInfo.calendarsUsed} calendar{levelingData.calendarInfo.calendarsUsed > 1 ? "s" : ""}
                    {levelingData.calendarInfo.defaultCalendar && ` (default: ${levelingData.calendarInfo.defaultCalendar})`}
                    {levelingData.calendarInfo.exceptionsApplied > 0 && ` · ${levelingData.calendarInfo.exceptionsApplied} exception${levelingData.calendarInfo.exceptionsApplied > 1 ? "s" : ""} applied`}
                  </span>
                </div>
              </div>
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card><CardContent className="pt-4">
                <div className="text-sm text-gray-600 font-medium">Over-Allocations</div>
                <div className={`text-2xl font-bold ${levelingData.overAllocations.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {levelingData.overAllocations.length}
                </div>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <div className="text-sm text-gray-600 font-medium">Suggestions</div>
                <div className="text-2xl font-bold text-amber-600">{levelingData.suggestions.length}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <div className="text-sm text-gray-600 font-medium">Status</div>
                <div className={`text-lg font-bold ${levelingData.overAllocations.length === 0 ? "text-emerald-400" : "text-amber-600"}`}>
                  {levelingData.overAllocations.length === 0 ? "All Resources Balanced" : "Needs Attention"}
                </div>
              </CardContent></Card>
            </div>

            {/* Suggestions */}
            {levelingData.suggestions.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-3">Leveling Suggestions</h3>
                <div className="space-y-2">
                  {levelingData.suggestions.map((s: any, i: number) => (
                    <div key={i} className={`p-3 rounded-lg border-l-4 ${
                      s.severity === "high" ? "bg-red-500/10 border-red-500 dark:bg-red-950" :
                      s.severity === "medium" ? "bg-amber-50 border-amber-500 dark:bg-amber-950" :
                      "bg-blue-50 border-blue-400 dark:bg-blue-950"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                          s.severity === "high" ? "bg-red-200 text-red-800" :
                          s.severity === "medium" ? "bg-amber-200 text-amber-800" :
                          "bg-blue-200 text-blue-800"
                        }`}>{s.severity}</span>
                        <span className="text-xs text-gray-600 font-medium">{s.type === "split" ? "Stagger Activities" : "Reduce Load"}</span>
                      </div>
                      <p className="text-sm">{s.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Over-allocation table */}
            {levelingData.overAllocations.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-3 py-2.5 font-semibold">Week</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Resource</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Type</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Allocated</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Capacity</th>
                      <th className="text-right px-3 py-2.5 font-semibold">Over By</th>
                      <th className="text-left px-3 py-2.5 font-semibold">Activities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {levelingData.overAllocations.map((oa: any, idx: number) => (
                      <tr key={idx} className={`border-b hover:bg-muted/30 ${idx % 2 ? "bg-muted/10" : ""}`}>
                        <td className="px-3 py-2 whitespace-nowrap">{oa.weekLabel}</td>
                        <td className="px-3 py-2 font-medium">{oa.resourceName}</td>
                        <td className="px-3 py-2 capitalize">{oa.resourceType}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">{oa.allocated}</td>
                        <td className="px-3 py-2 text-right font-mono">{oa.capacity}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-red-600">+{oa.overBy}</td>
                        <td className="px-3 py-2 text-xs">{oa.activities.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {levelingData.overAllocations.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-700">No Over-Allocations Detected</h3>
                <p className="text-gray-600 font-medium mt-1">All resources are within capacity across the project timeline.</p>
              </div>
            )}
          </>
        )}

        {/* ── EVM Dashboard ────────────────────────────────────────────── */}
        {reportType === "evm" && !isLoading && evmData && (
          <EvmDashboard data={evmData} baselineData={evmBaselineData} />
        )}

        {/* ── Delay Analysis ────────────────────────────────────────── */}
        {reportType === "delayAnalysis" && !isLoading && delayData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-red-600">{delayData.summary.totalImpacted}</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Impacted Activities</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-orange-600">{delayData.summary.criticalDelays}</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Critical Delays</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-amber-600">{delayData.summary.avgDelay}d</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Average Delay</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-3xl font-bold text-red-700">{delayData.summary.maxDelay}d</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Maximum Delay</div>
              </CardContent></Card>
            </div>

            {/* Baseline info */}
            <Card><CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-400 font-medium">Comparing against: <span className="font-bold text-gray-100">{delayData.baselineName}</span></div>
                  {delayData.baselineDate && <div className="text-xs text-gray-600 mt-0.5">Baseline date: {fmtDate(delayData.baselineDate)}</div>}
                </div>
                {delayData.suggestedAnnotations.length > 0 && (
                  <Button size="sm" variant="default" onClick={() => {
                    // Navigate back to scheduler with annotations
                    const params = new URLSearchParams({ annotations: JSON.stringify(delayData.suggestedAnnotations) });
                    window.history.pushState({}, "", `/scheduler/${scheduleId}?${params}`);
                    window.location.href = `/scheduler/${scheduleId}?${params}`;
                  }}>
                    Apply Annotations to Gantt
                  </Button>
                )}
              </div>
            </CardContent></Card>

            {/* Impacted Activities Table */}
            {delayData.impactedActivities.length > 0 && (
              <Card><CardContent className="pt-4 pb-4">
                <h3 className="text-lg font-bold mb-3">Impacted Activities</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-white/15">
                        <th className="text-left py-2 px-3 font-bold text-gray-100">Activity ID</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-100">Name</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-100">WBS</th>
                        <th className="text-center py-2 px-3 font-bold text-gray-100">Critical</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">TF</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-100">BL Start</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-100">Cur Start</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">Start Delay</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-100">BL Finish</th>
                        <th className="text-left py-2 px-3 font-bold text-gray-100">Cur Finish</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">Finish Delay</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">Max Delay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delayData.impactedActivities.map((imp: any, i: number) => (
                        <tr key={i} className={`border-b ${imp.isCritical ? "bg-red-500/10" : ""} hover:bg-white/5`}>
                          <td className="py-2 px-3 font-mono text-xs font-semibold">{imp.activityId}</td>
                          <td className="py-2 px-3 font-medium max-w-[200px] truncate">{imp.name}</td>
                          <td className="py-2 px-3 text-xs text-gray-400">{imp.wbs}</td>
                          <td className="py-2 px-3 text-center">{imp.isCritical ? <span className="text-red-600 font-bold">YES</span> : <span className="text-gray-500">No</span>}</td>
                          <td className={`py-2 px-3 text-right ${floatColor(imp.totalFloat)}`}>{fmtFloat(imp.totalFloat)}</td>
                          <td className="py-2 px-3 text-xs">{fmtDate(imp.baselineStart)}</td>
                          <td className="py-2 px-3 text-xs">{fmtDate(imp.currentStart)}</td>
                          <td className={`py-2 px-3 text-right font-semibold ${imp.startDelay > 0 ? "text-red-400" : "text-emerald-400"}`}>+{imp.startDelay}d</td>
                          <td className="py-2 px-3 text-xs">{fmtDate(imp.baselineFinish)}</td>
                          <td className="py-2 px-3 text-xs">{fmtDate(imp.currentFinish)}</td>
                          <td className={`py-2 px-3 text-right font-semibold ${imp.finishDelay > 0 ? "text-red-400" : "text-emerald-400"}`}>+{imp.finishDelay}d</td>
                          <td className="py-2 px-3 text-right font-bold text-red-700">+{imp.maxDelay}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent></Card>
            )}
          </div>
        )}

        {reportType === "delayAnalysis" && !delayBaselineId && (
          <div className="text-center py-20">
            <GitCompare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold">Select a baseline to analyze delays</h3>
            <p className="text-gray-600 font-medium mt-1">Choose a baseline from the dropdown above to compare against the current schedule.</p>
          </div>
        )}

        {/* ── Cost Forecast ────────────────────────────────────────────── */}
        {reportType === "costForecast" && !isLoading && forecastData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-amber-400">{fmtCurrency(forecastData.BAC)}</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Budget at Completion (BAC)</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-green-600">{fmtCurrency(forecastData.BCWP)}</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Earned Value (BCWP)</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className="text-2xl font-bold text-red-600">{fmtCurrency(forecastData.ACWP)}</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Actual Cost (ACWP)</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4 text-center">
                <div className={`text-2xl font-bold ${forecastData.EAC > forecastData.BAC ? "text-red-400" : "text-emerald-400"}`}>{fmtCurrency(forecastData.EAC)}</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Estimate at Completion (EAC)</div>
              </CardContent></Card>
            </div>

            {/* Performance indices */}
            <div className="grid grid-cols-2 gap-4">
              <Card><CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 font-medium">Cost Performance Index (CPI)</div>
                    <div className={`text-3xl font-bold ${forecastData.CPI >= 1 ? "text-emerald-400" : "text-red-400"}`}>{forecastData.CPI.toFixed(2)}</div>
                  </div>
                  <div className={`text-sm font-medium px-3 py-1 rounded-full ${forecastData.CPI >= 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {forecastData.CPI >= 1 ? "Under Budget" : "Over Budget"}
                  </div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400 font-medium">Schedule Performance Index (SPI)</div>
                    <div className={`text-3xl font-bold ${forecastData.SPI >= 1 ? "text-emerald-400" : "text-red-400"}`}>{forecastData.SPI.toFixed(2)}</div>
                  </div>
                  <div className={`text-sm font-medium px-3 py-1 rounded-full ${forecastData.SPI >= 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {forecastData.SPI >= 1 ? "Ahead of Schedule" : "Behind Schedule"}
                  </div>
                </div>
              </CardContent></Card>
            </div>

            {/* Forecast S-Curve Chart */}
            {forecastData.forecast.length > 0 && (
              <Card><CardContent className="pt-4 pb-4">
                <h3 className="text-lg font-bold mb-3">Cost Forecast S-Curve</h3>
                <CostForecastChart data={forecastData.forecast} bac={forecastData.BAC} eac={forecastData.EAC} />
              </CardContent></Card>
            )}

            {/* Forecast Table */}
            {forecastData.forecast.length > 0 && (
              <Card><CardContent className="pt-4 pb-4">
                <h3 className="text-lg font-bold mb-3">Weekly Forecast Data</h3>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b-2 border-white/15">
                        <th className="text-left py-2 px-3 font-bold text-gray-100">Week</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">Planned Value</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">Earned Value</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">Actual Cost</th>
                        <th className="text-right py-2 px-3 font-bold text-gray-100">Forecast (EAC)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.forecast.map((row: any, i: number) => (
                        <tr key={i} className="border-b hover:bg-white/5">
                          <td className="py-2 px-3 font-medium">{fmtWeek(row.week)}</td>
                          <td className="py-2 px-3 text-right text-amber-400 font-medium">{fmtCurrency(row.planned)}</td>
                          <td className="py-2 px-3 text-right text-green-600 font-medium">{fmtCurrency(row.earned)}</td>
                          <td className="py-2 px-3 text-right text-red-600 font-medium">{fmtCurrency(row.actual)}</td>
                          <td className="py-2 px-3 text-right text-purple-600 font-medium">{fmtCurrency(row.forecastEAC)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent></Card>
            )}
          </div>
        )}

        {/* ── Health Score Dashboard ────────────────────────────────────── */}
        {reportType === "healthScore" && !isLoading && healthData && (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="flex justify-center">
              <Card className="w-full max-w-md"><CardContent className="pt-6 pb-6 text-center">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-40 h-40" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={healthData.overallScore >= 80 ? "#22c55e" : healthData.overallScore >= 60 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="10" strokeLinecap="round"
                      strokeDasharray={`${healthData.overallScore * 3.14} 314`}
                      transform="rotate(-90 60 60)" />
                    <text x="60" y="55" textAnchor="middle" className="text-3xl font-bold" fill="currentColor" fontSize="28">{healthData.overallScore}</text>
                    <text x="60" y="75" textAnchor="middle" fill="#6b7280" fontSize="14">/ 100</text>
                  </svg>
                </div>
                <div className={`text-4xl font-bold mt-2 ${
                  healthData.grade === "A" ? "text-emerald-400" :
                  healthData.grade === "B" ? "text-amber-400" :
                  healthData.grade === "C" ? "text-amber-600" :
                  healthData.grade === "D" ? "text-orange-600" : "text-red-400"
                }`}>Grade: {healthData.grade}</div>
                <div className="text-sm text-gray-400 font-medium mt-1">Schedule Health Score</div>
              </CardContent></Card>
            </div>

            {/* Component Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {healthData.components.map((comp: any, i: number) => (
                <Card key={i}><CardContent className="pt-4 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-gray-100">{comp.name}</div>
                    <div className={`text-lg font-bold ${
                      comp.score >= 80 ? "text-emerald-400" :
                      comp.score >= 60 ? "text-amber-600" : "text-red-400"
                    }`}>{comp.score}/100</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div className={`h-2.5 rounded-full ${
                      comp.score >= 80 ? "bg-green-500" :
                      comp.score >= 60 ? "bg-amber-500" : "bg-red-500/100"
                    }`} style={{ width: `${comp.score}%` }} />
                  </div>
                  <div className="text-xs text-gray-600 font-medium">{comp.details}</div>
                  <div className="text-xs text-gray-500 mt-1">Weight: {comp.weight}%</div>
                </CardContent></Card>
              ))}
            </div>

            {/* Recommendations */}
            <Card><CardContent className="pt-4 pb-4">
              <h3 className="text-lg font-bold mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {healthData.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      rec.includes("good health") ? "text-green-500" : "text-amber-500"
                    }`} />
                    <span className="text-sm text-gray-200 font-medium">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent></Card>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isSpecialReport && (!reportData?.rows || reportData.rows.length === 0) && reportType !== "comparison" && !isChartReport && (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 mx-auto text-gray-600 font-medium/50 mb-4" />
            <h3 className="text-lg font-semibold">No data available</h3>
            <p className="text-gray-600 font-medium mt-1">Run the CPM calculation first to generate report data.</p>
          </div>
        )}

        {/* Empty state for chart reports */}
        {!isLoading && (!reportData?.rows || reportData.rows.length === 0) && isChartReport && (
          <div className="text-center py-20">
            <DollarSign className="w-12 h-12 mx-auto text-gray-600 font-medium/50 mb-4" />
            <h3 className="text-lg font-semibold">No resource data available</h3>
            <p className="text-gray-600 font-medium mt-1">
              Assign resources to activities with budgeted costs first. Use the Resources panel in the scheduler to add resources and assign them to activities.
            </p>
          </div>
        )}

        {reportType === "comparison" && !baselineId && (
          <div className="text-center py-20">
            <GitCompare className="w-12 h-12 mx-auto text-gray-600 font-medium/50 mb-4" />
            <h3 className="text-lg font-semibold">Select a baseline to compare</h3>
            <p className="text-gray-600 font-medium mt-1">Choose a baseline or update snapshot from the dropdown above.</p>
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
