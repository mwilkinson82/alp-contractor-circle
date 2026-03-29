import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2, Eye, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface PdfHeaderFooterConfig {
  headerColumns: Array<{ position: number; content: string }>;
  footerColumns: Array<{ position: number; content: string }>;
  headerColumnCount: 3 | 5;
  footerColumnCount: 3 | 5;
  pageSize: "letter" | "legal" | "tabloid";
  orientation: "landscape" | "portrait";
  showGantt: boolean;
  criticalPathOnly: boolean;
}

interface Activity {
  id: number;
  activityId: string;
  name: string;
  duration: number;
  earlyStart: Date | null;
  earlyFinish: Date | null;
  isCritical: boolean;
  barColor?: string | null;
}

interface PdfExportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: PdfHeaderFooterConfig) => Promise<void>;
  isExporting: boolean;
  projectName: string;
  companyName: string;
  activities: Activity[];
  dataDate: Date | null;
  scheduleName: string;
}

const CONTENT_OPTIONS = [
  { value: "company", label: "Company Name" },
  { value: "project", label: "Project Name" },
  { value: "schedule", label: "Schedule Name" },
  { value: "date", label: "Export Date" },
  { value: "datadate", label: "Data Date" },
  { value: "page", label: "Page Numbers" },
  { value: "empty", label: "(Empty)" },
];

// Paper sizes in inches (width x height in portrait)
const PAPER_SIZES: Record<string, { w: number; h: number; label: string }> = {
  letter:  { w: 8.5,  h: 11,   label: "Letter (8.5×11)" },
  legal:   { w: 8.5,  h: 14,   label: "Legal (8.5×14)" },
  tabloid: { w: 11,   h: 17,   label: "Tabloid (11×17)" },
};

export function PdfExportPreview({
  open,
  onOpenChange,
  onExport,
  isExporting,
  projectName,
  companyName,
  activities,
  dataDate,
  scheduleName,
}: PdfExportPreviewProps) {
  const [headerColumnCount, setHeaderColumnCount] = useState<3 | 5>(3);
  const [footerColumnCount, setFooterColumnCount] = useState<3 | 5>(3);
  const [headerColumns, setHeaderColumns] = useState([
    { position: 0, content: "company" },
    { position: 1, content: "schedule" },
    { position: 2, content: "datadate" },
  ]);
  const [footerColumns, setFooterColumns] = useState([
    { position: 0, content: "project" },
    { position: 1, content: "date" },
    { position: 2, content: "page" },
  ]);
  const [pageSize, setPageSize] = useState<"letter" | "legal" | "tabloid">("tabloid");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showGantt, setShowGantt] = useState(true);
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Force canvas re-render when dialog opens
  useEffect(() => {
    if (open) {
      setCanvasReady(false);
      const timer = setTimeout(() => setCanvasReady(true), 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Measure container
  useEffect(() => {
    if (!open || !previewContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, [open]);

  const handleColumnCountChange = (type: "header" | "footer", count: 3 | 5) => {
    const setter = type === "header" ? setHeaderColumns : setFooterColumns;
    const current = type === "header" ? headerColumns : footerColumns;
    const countSetter = type === "header" ? setHeaderColumnCount : setFooterColumnCount;
    countSetter(count);
    const newCols = [];
    for (let i = 0; i < count; i++) {
      if (i < current.length) newCols.push(current[i]);
      else newCols.push({ position: i, content: "empty" });
    }
    setter(newCols);
  };

  const handleColumnContentChange = (type: "header" | "footer", pos: number, content: string) => {
    const setter = type === "header" ? setHeaderColumns : setFooterColumns;
    const current = type === "header" ? [...headerColumns] : [...footerColumns];
    current[pos] = { ...current[pos], content };
    setter(current);
  };

  const getContentPreview = useCallback((content: string): string => {
    switch (content) {
      case "company": return companyName || "Company Name";
      case "project": return projectName || "Project Name";
      case "schedule": return scheduleName || "Schedule Name";
      case "date": return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      case "datadate": return dataDate ? `DD: ${dataDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "DD: Not set";
      case "page": return "Page 1 of 5";
      case "empty": return "";
      default: return "";
    }
  }, [companyName, projectName, scheduleName, dataDate]);

  const previewActivities = useMemo(() => {
    const filtered = criticalPathOnly ? activities.filter(a => a.isCritical) : activities;
    return filtered;
  }, [activities, criticalPathOnly]);

  // Calculate paper dimensions for the preview
  const paperDims = useMemo(() => {
    const paper = PAPER_SIZES[pageSize];
    const pw = orientation === "landscape" ? paper.h : paper.w;
    const ph = orientation === "landscape" ? paper.w : paper.h;
    return { w: pw, h: ph };
  }, [pageSize, orientation]);

  // Calculate canvas pixel dimensions to fit container while maintaining paper aspect ratio
  const canvasDims = useMemo(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return { width: 800, height: 500 };
    const aspect = paperDims.w / paperDims.h;
    const containerW = containerSize.width - 32; // padding
    const containerH = containerSize.height - 32;
    let w: number, h: number;
    if (containerW / containerH > aspect) {
      h = containerH;
      w = h * aspect;
    } else {
      w = containerW;
      h = w / aspect;
    }
    return { width: Math.round(w), height: Math.round(h) };
  }, [containerSize, paperDims]);

  // Draw canvas preview — true WYSIWYG
  useEffect(() => {
    if (!open || !canvasReady) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvasDims.width;
    const displayH = canvasDims.height;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.scale(dpr, dpr);

    const w = displayW;
    const h = displayH;

    // Scale factor: how many pixels per inch of paper
    const ppi = w / paperDims.w;
    const marginIn = 0.4; // 0.4 inch margin
    const margin = marginIn * ppi;
    const headerH = 0.35 * ppi;
    const footerH = 0.25 * ppi;
    const contentY = margin + headerH + 4;
    const contentH = h - margin * 2 - headerH - footerH - 12;

    // White page background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Page border
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // ── Header band ──
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(margin, margin, w - margin * 2, headerH);
    ctx.fillStyle = "#c9a84c";
    ctx.fillRect(margin, margin + headerH - 2, w - margin * 2, 2);

    const hColW = (w - margin * 2) / headerColumnCount;
    const headerFontSize = Math.max(7, Math.min(12, ppi * 0.12));
    ctx.textBaseline = "middle";
    headerColumns.forEach((col, i) => {
      const text = getContentPreview(col.content);
      ctx.fillStyle = i === 0 ? "#c9a84c" : "#e2e8f0";
      ctx.font = i === 0 ? `bold ${headerFontSize}px 'DM Sans', sans-serif` : `${headerFontSize * 0.9}px 'DM Sans', sans-serif`;
      ctx.textAlign = i === 0 ? "left" : i === headerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 8 : i === headerColumnCount - 1 ? margin + i * hColW + hColW - 8 : margin + i * hColW + hColW / 2;
      ctx.fillText(text, tx, margin + headerH / 2);
    });

    // ── Content area ──
    const tableW = showGantt ? (w - margin * 2) * 0.42 : (w - margin * 2);
    const ganttX = margin + tableW + 4;
    const ganttW = w - margin * 2 - tableW - 4;

    // Calculate how many rows fit
    const baseFontSize = Math.max(5.5, Math.min(10, ppi * 0.08));
    const rowH = Math.max(baseFontSize + 6, Math.min(16, contentH / 40));
    const maxRows = Math.floor((contentH - rowH) / rowH);
    const visibleActs = previewActivities.slice(0, maxRows);

    // Table header
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(margin, contentY, tableW, rowH);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, contentY, tableW, rowH);
    ctx.fillStyle = "#475569";
    ctx.font = `bold ${baseFontSize}px 'DM Sans', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("ID", margin + 4, contentY + rowH / 2);
    ctx.fillText("Activity Name", margin + tableW * 0.12, contentY + rowH / 2);
    ctx.fillText("Dur", margin + tableW * 0.6, contentY + rowH / 2);
    ctx.fillText("Start", margin + tableW * 0.72, contentY + rowH / 2);
    ctx.fillText("Finish", margin + tableW * 0.87, contentY + rowH / 2);

    // Table rows
    for (let i = 0; i < visibleActs.length; i++) {
      const act = visibleActs[i];
      const ry = contentY + (i + 1) * rowH;
      if (ry + rowH > contentY + contentH - 4) break;

      if (i % 2 === 1) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(margin, ry, tableW, rowH);
      }

      ctx.fillStyle = act.isCritical ? "#dc2626" : "#334155";
      ctx.font = `${baseFontSize}px 'DM Sans', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(act.activityId, margin + 4, ry + rowH / 2);

      const nameMaxChars = Math.floor(tableW * 0.45 / (baseFontSize * 0.55));
      const name = act.name.length > nameMaxChars ? act.name.slice(0, nameMaxChars) + "…" : act.name;
      ctx.fillText(name, margin + tableW * 0.12, ry + rowH / 2);
      ctx.fillText(`${act.duration}d`, margin + tableW * 0.6, ry + rowH / 2);

      if (act.earlyStart) {
        const es = new Date(act.earlyStart);
        ctx.fillText(`${es.getMonth() + 1}/${es.getDate()}`, margin + tableW * 0.72, ry + rowH / 2);
      }
      if (act.earlyFinish) {
        const ef = new Date(act.earlyFinish);
        ctx.fillText(`${ef.getMonth() + 1}/${ef.getDate()}`, margin + tableW * 0.87, ry + rowH / 2);
      }
    }

    // Table border
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, contentY, tableW, contentH);

    // Row lines
    for (let i = 1; i <= visibleActs.length; i++) {
      const ry = contentY + i * rowH;
      if (ry > contentY + contentH - 4) break;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(margin, ry);
      ctx.lineTo(margin + tableW, ry);
      ctx.stroke();
    }

    // ── Gantt area ──
    if (showGantt) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(ganttX, contentY, ganttW, rowH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(ganttX, contentY, ganttW, contentH);

      // Find date range from ALL activities (not just visible)
      let minDate = Infinity;
      let maxDate = -Infinity;
      previewActivities.forEach(a => {
        if (a.earlyStart) minDate = Math.min(minDate, new Date(a.earlyStart).getTime());
        if (a.earlyFinish) maxDate = Math.max(maxDate, new Date(a.earlyFinish).getTime());
      });
      const dateRange = maxDate - minDate || 1;

      // Time scale header
      const tsFont = Math.max(5, baseFontSize * 0.85);
      ctx.fillStyle = "#94a3b8";
      ctx.font = `${tsFont}px 'DM Sans', sans-serif`;
      ctx.textAlign = "center";

      // Calculate month labels from actual date range
      if (minDate !== Infinity) {
        const startD = new Date(minDate);
        const endD = new Date(maxDate);
        startD.setDate(1);
        const months: { label: string; x: number }[] = [];
        const cur = new Date(startD);
        while (cur <= endD) {
          const monthStart = cur.getTime();
          const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          const monthEnd = Math.min(nextMonth.getTime(), maxDate);
          const midPct = ((monthStart + monthEnd) / 2 - minDate) / dateRange;
          const mx = ganttX + 4 + midPct * (ganttW - 8);
          const shortMonth = cur.toLocaleDateString("en-US", { month: "short" });
          const yr = cur.getFullYear().toString().slice(-2);
          months.push({ label: `${shortMonth} '${yr}`, x: mx });

          // Vertical gridline at month boundary
          const boundaryPct = (nextMonth.getTime() - minDate) / dateRange;
          const bx = ganttX + 4 + boundaryPct * (ganttW - 8);
          if (bx > ganttX && bx < ganttX + ganttW) {
            ctx.strokeStyle = "#e2e8f0";
            ctx.lineWidth = 0.3;
            ctx.beginPath();
            ctx.moveTo(bx, contentY + rowH);
            ctx.lineTo(bx, contentY + contentH);
            ctx.stroke();
          }

          cur.setMonth(cur.getMonth() + 1);
        }
        months.forEach(m => {
          ctx.fillStyle = "#94a3b8";
          ctx.font = `${tsFont}px 'DM Sans', sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(m.label, m.x, contentY + rowH / 2);
        });
      }

      // Draw bars
      for (let i = 0; i < visibleActs.length; i++) {
        const act = visibleActs[i];
        const ry = contentY + (i + 1) * rowH;
        if (ry + rowH > contentY + contentH - 4) break;
        if (!act.earlyStart || !act.earlyFinish) continue;

        const startPct = (new Date(act.earlyStart).getTime() - minDate) / dateRange;
        const endPct = (new Date(act.earlyFinish).getTime() - minDate) / dateRange;
        const bx = ganttX + 4 + startPct * (ganttW - 8);
        const bw = Math.max(3, (endPct - startPct) * (ganttW - 8));
        const by = ry + 3;
        const bh = rowH - 6;

        if (act.duration === 0) {
          const cx = bx;
          const cy = by + bh / 2;
          const s = Math.min(4, bh / 2);
          ctx.fillStyle = act.barColor || "#eab308";
          ctx.beginPath();
          ctx.moveTo(cx, cy - s);
          ctx.lineTo(cx + s, cy);
          ctx.lineTo(cx, cy + s);
          ctx.lineTo(cx - s, cy);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = act.barColor || (act.isCritical ? "#ef4444" : "#22c55e");
          const radius = 1.5;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, radius);
          ctx.fill();
        }
      }

      // Data date line
      if (dataDate && minDate !== Infinity) {
        const ddPct = (new Date(dataDate).getTime() - minDate) / dateRange;
        const ddX = ganttX + 4 + ddPct * (ganttW - 8);
        if (ddX > ganttX && ddX < ganttX + ganttW) {
          ctx.strokeStyle = "#2563eb";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ddX, contentY + rowH);
          ctx.lineTo(ddX, contentY + contentH);
          ctx.stroke();
          ctx.fillStyle = "#2563eb";
          ctx.font = `bold ${tsFont}px 'DM Sans', sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("DD", ddX, contentY + rowH + 8);
        }
      }
    }

    // ── Footer band ──
    const footerY = h - margin - footerH;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(margin, footerY);
    ctx.lineTo(w - margin, footerY);
    ctx.stroke();

    const fColW = (w - margin * 2) / footerColumnCount;
    const footerFontSize = Math.max(6, baseFontSize * 0.9);
    ctx.font = `${footerFontSize}px 'DM Sans', sans-serif`;
    ctx.textBaseline = "middle";
    footerColumns.forEach((col, i) => {
      const text = getContentPreview(col.content);
      ctx.fillStyle = "#64748b";
      ctx.textAlign = i === 0 ? "left" : i === footerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 4 : i === footerColumnCount - 1 ? w - margin - 4 : margin + i * fColW + fColW / 2;
      ctx.fillText(text, tx, footerY + footerH / 2);
    });

    // Activity count indicator
    const totalFiltered = previewActivities.length;
    if (totalFiltered > visibleActs.length) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = `italic ${baseFontSize * 0.8}px 'DM Sans', sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText(`Showing ${visibleActs.length} of ${totalFiltered} activities — full PDF will include all`, w / 2, contentY + contentH - 4);
    }

  }, [open, canvasReady, canvasDims, paperDims, headerColumns, footerColumns, headerColumnCount, footerColumnCount, showGantt, criticalPathOnly, previewActivities, companyName, projectName, scheduleName, dataDate, getContentPreview]);

  const handleExport = async () => {
    await onExport({
      headerColumns,
      footerColumns,
      headerColumnCount,
      footerColumnCount,
      pageSize,
      orientation,
      showGantt,
      criticalPathOnly,
    });
  };

  const getColLabel = (idx: number, count: number): string => {
    if (count === 3) return idx === 0 ? "Left" : idx === 1 ? "Center" : "Right";
    if (idx === 0) return "Left";
    if (idx === 1) return "Center-Left";
    if (idx === 2) return "Center";
    if (idx === 3) return "Center-Right";
    return "Right";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 p-0 flex flex-col" style={{ width: "92vw", maxWidth: "92vw", height: "88vh", maxHeight: "88vh" }}>
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-600" /> PDF Export Preview
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            True-to-scale preview. Change paper size and orientation to see exactly how your schedule will print.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 py-3 min-h-0">
          <div className="flex gap-5 h-full">
            {/* Left: WYSIWYG Preview — takes most of the space */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Preview</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {PAPER_SIZES[pageSize].label} — {orientation === "landscape" ? "Landscape" : "Portrait"} — {paperDims.w}" × {paperDims.h}"
                </span>
              </div>
              <div
                ref={previewContainerRef}
                className="flex-1 min-h-0 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden"
                style={{ padding: "16px" }}
              >
                <div className="relative" style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.12))" }}>
                  <canvas
                    ref={previewCanvasRef}
                    className="rounded bg-white"
                    style={{
                      width: `${canvasDims.width}px`,
                      height: `${canvasDims.height}px`,
                      display: "block",
                    }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                {previewActivities.length} activities {criticalPathOnly ? "(critical path only)" : ""} — Full PDF will paginate automatically
              </p>
            </div>

            {/* Right: Configuration Panel — narrower sidebar */}
            <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
              {/* Page Settings */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-3">
                <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Page Settings</Label>
                <div>
                  <Label className="text-[10px] text-gray-500 mb-0.5 block">Paper Size</Label>
                  <Select value={pageSize} onValueChange={(v) => setPageSize(v as any)}>
                    <SelectTrigger className="border-gray-300 text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="letter" className="text-gray-900 text-xs">Letter (8.5×11)</SelectItem>
                      <SelectItem value="legal" className="text-gray-900 text-xs">Legal (8.5×14)</SelectItem>
                      <SelectItem value="tabloid" className="text-gray-900 text-xs">Tabloid (11×17)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 mb-0.5 block">Orientation</Label>
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                    <SelectTrigger className="border-gray-300 text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="landscape" className="text-gray-900 text-xs">Landscape</SelectItem>
                      <SelectItem value="portrait" className="text-gray-900 text-xs">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Display Options */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2">
                <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Display</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showGantt} onCheckedChange={(c) => setShowGantt(!!c)} />
                  <span className="text-xs text-gray-700">Include Gantt Chart</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={criticalPathOnly} onCheckedChange={(c) => setCriticalPathOnly(!!c)} />
                  <span className="text-xs text-gray-700">Critical Path Only</span>
                </label>
              </div>

              {/* Header/Footer Configuration */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                <Tabs defaultValue="header" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="header" className="text-xs">Header</TabsTrigger>
                    <TabsTrigger value="footer" className="text-xs">Footer</TabsTrigger>
                  </TabsList>

                  <TabsContent value="header" className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-gray-500 shrink-0">Columns:</Label>
                      {([3, 5] as const).map(c => (
                        <Button key={c} size="sm" variant={headerColumnCount === c ? "default" : "outline"}
                          className={`h-6 text-[10px] px-2.5 ${headerColumnCount === c ? "bg-blue-600 text-white" : "border-gray-300 text-gray-600"}`}
                          onClick={() => handleColumnCountChange("header", c)}>
                          {c}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {headerColumns.map((col, idx) => (
                        <div key={idx}>
                          <Label className="text-[9px] text-gray-400 mb-0.5 block">{getColLabel(idx, headerColumnCount)}</Label>
                          <Select value={col.content} onValueChange={(v) => handleColumnContentChange("header", idx, v)}>
                            <SelectTrigger className="border-gray-300 text-[11px] h-7 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              {CONTENT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-gray-900 text-xs">{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="footer" className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-gray-500 shrink-0">Columns:</Label>
                      {([3, 5] as const).map(c => (
                        <Button key={c} size="sm" variant={footerColumnCount === c ? "default" : "outline"}
                          className={`h-6 text-[10px] px-2.5 ${footerColumnCount === c ? "bg-blue-600 text-white" : "border-gray-300 text-gray-600"}`}
                          onClick={() => handleColumnCountChange("footer", c)}>
                          {c}
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {footerColumns.map((col, idx) => (
                        <div key={idx}>
                          <Label className="text-[9px] text-gray-400 mb-0.5 block">{getColLabel(idx, footerColumnCount)}</Label>
                          <Select value={col.content} onValueChange={(v) => handleColumnContentChange("footer", idx, v)}>
                            <SelectTrigger className="border-gray-300 text-[11px] h-7 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                              {CONTENT_OPTIONS.map(opt => (
                                <SelectItem key={opt.value} value={opt.value} className="text-gray-900 text-xs">{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-300 text-gray-700">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
