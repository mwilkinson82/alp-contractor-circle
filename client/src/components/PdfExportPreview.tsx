import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Loader2, Eye } from "lucide-react";
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
  const [pageSize, setPageSize] = useState<"letter" | "legal" | "tabloid">("letter");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showGantt, setShowGantt] = useState(true);
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Force canvas re-render when dialog opens
  useEffect(() => {
    if (open) {
      setCanvasReady(false);
      const timer = setTimeout(() => setCanvasReady(true), 100);
      return () => clearTimeout(timer);
    }
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

  const getContentPreview = (content: string): string => {
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
  };

  const previewActivities = useMemo(() => {
    const filtered = criticalPathOnly ? activities.filter(a => a.isCritical) : activities;
    return filtered.slice(0, 20);
  }, [activities, criticalPathOnly]);

  // Draw canvas preview
  useEffect(() => {
    if (!open || !canvasReady) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use fixed pixel dimensions for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.offsetWidth || 480;
    const displayH = canvas.offsetHeight || 320;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.scale(dpr, dpr);

    const w = displayW;
    const h = displayH;
    const margin = 10;
    const headerH = 24;
    const footerH = 22;
    const contentY = margin + headerH + 4;
    const contentH = h - margin * 2 - headerH - footerH - 8;

    // White background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Page border shadow
    ctx.shadowColor = "rgba(0,0,0,0.08)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    // ── Header band ──
    ctx.fillStyle = "#0d1b2a";
    ctx.fillRect(margin, margin, w - margin * 2, headerH);
    // Gold accent line
    ctx.fillStyle = "#c9a84c";
    ctx.fillRect(margin, margin + headerH - 1.5, w - margin * 2, 1.5);

    const hColW = (w - margin * 2) / headerColumnCount;
    ctx.textBaseline = "middle";
    headerColumns.forEach((col, i) => {
      const text = getContentPreview(col.content);
      ctx.fillStyle = i === 0 ? "#c9a84c" : "#e2e8f0";
      ctx.font = i === 0 ? "bold 8px 'DM Sans', sans-serif" : "7px 'DM Sans', sans-serif";
      ctx.textAlign = i === 0 ? "left" : i === headerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 6 : i === headerColumnCount - 1 ? margin + i * hColW + hColW - 6 : margin + i * hColW + hColW / 2;
      ctx.fillText(text, tx, margin + headerH / 2);
    });

    // ── Content area ──
    const tableW = showGantt ? (w - margin * 2) * 0.42 : (w - margin * 2);
    const ganttX = margin + tableW + 3;
    const ganttW = w - margin * 2 - tableW - 3;
    const maxRows = Math.min(previewActivities.length, 18);
    const rowH = Math.min(13, contentH / Math.max(maxRows + 1, 6));

    // Table header
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(margin, contentY, tableW, rowH);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, contentY, tableW, rowH);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 6px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ID", margin + 3, contentY + rowH / 2);
    ctx.fillText("Activity Name", margin + 30, contentY + rowH / 2);
    ctx.fillText("Dur", margin + tableW * 0.62, contentY + rowH / 2);
    ctx.fillText("Start", margin + tableW * 0.73, contentY + rowH / 2);
    ctx.fillText("Finish", margin + tableW * 0.87, contentY + rowH / 2);

    // Table rows
    for (let i = 0; i < maxRows; i++) {
      const act = previewActivities[i];
      const ry = contentY + (i + 1) * rowH;
      if (ry + rowH > contentY + contentH - 4) break;

      if (i % 2 === 1) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(margin, ry, tableW, rowH);
      }

      ctx.fillStyle = act.isCritical ? "#dc2626" : "#334155";
      ctx.font = "6px 'DM Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(act.activityId, margin + 3, ry + rowH / 2);

      const nameMax = 20;
      const name = act.name.length > nameMax ? act.name.slice(0, nameMax) + "…" : act.name;
      ctx.fillText(name, margin + 30, ry + rowH / 2);
      ctx.fillText(`${act.duration}d`, margin + tableW * 0.62, ry + rowH / 2);

      if (act.earlyStart) {
        const es = new Date(act.earlyStart);
        ctx.fillText(`${es.getMonth() + 1}/${es.getDate()}`, margin + tableW * 0.73, ry + rowH / 2);
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

    // ── Gantt area ──
    if (showGantt) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(ganttX, contentY, ganttW, rowH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.strokeRect(ganttX, contentY, ganttW, contentH);

      // Time scale
      ctx.fillStyle = "#94a3b8";
      ctx.font = "5px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      const months = ["Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
      const monthCount = Math.min(6, months.length);
      for (let m = 0; m < monthCount; m++) {
        const mx = ganttX + (m + 0.5) * (ganttW / monthCount);
        ctx.fillText(months[m], mx, contentY + rowH / 2);
        // Vertical gridline
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(ganttX + (m + 1) * (ganttW / monthCount), contentY + rowH);
        ctx.lineTo(ganttX + (m + 1) * (ganttW / monthCount), contentY + contentH);
        ctx.stroke();
      }

      // Find date range
      let minDate = Infinity;
      let maxDate = -Infinity;
      previewActivities.forEach(a => {
        if (a.earlyStart) minDate = Math.min(minDate, new Date(a.earlyStart).getTime());
        if (a.earlyFinish) maxDate = Math.max(maxDate, new Date(a.earlyFinish).getTime());
      });
      const dateRange = maxDate - minDate || 1;

      // Draw bars
      for (let i = 0; i < maxRows; i++) {
        const act = previewActivities[i];
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
          // Milestone diamond
          const cx = bx;
          const cy = by + bh / 2;
          const s = 3.5;
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
          // DD label
          ctx.fillStyle = "#2563eb";
          ctx.font = "bold 5px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("DD", ddX, contentY + rowH + 6);
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
    ctx.font = "6px 'DM Sans', sans-serif";
    ctx.textBaseline = "middle";
    footerColumns.forEach((col, i) => {
      const text = getContentPreview(col.content);
      ctx.fillStyle = "#64748b";
      ctx.textAlign = i === 0 ? "left" : i === footerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 4 : i === footerColumnCount - 1 ? w - margin - 4 : margin + i * fColW + fColW / 2;
      ctx.fillText(text, tx, footerY + footerH / 2);
    });

    // Activity count indicator
    if (activities.length > maxRows) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 5px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`Showing ${maxRows} of ${activities.length} activities`, w / 2, contentY + contentH - 3);
    }

  }, [open, canvasReady, headerColumns, footerColumns, headerColumnCount, footerColumnCount, pageSize, orientation, showGantt, criticalPathOnly, previewActivities, companyName, projectName, scheduleName, dataDate, activities.length]);

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

  // Column position labels
  const getColLabel = (idx: number, count: number): string => {
    if (count === 3) return idx === 0 ? "Left" : idx === 1 ? "Center" : "Right";
    // 5 columns
    if (idx === 0) return "Left";
    if (idx === 1) return "Center-Left";
    if (idx === 2) return "Center";
    if (idx === 3) return "Center-Right";
    return "Right";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-5xl w-[95vw] text-gray-900 max-h-[94vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" /> PDF Export Preview
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-500">
            Configure header, footer, and page settings. The preview updates live as you make changes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-0">
          <div className="flex gap-5">
            {/* Left: Live Preview Canvas */}
            <div className="flex-shrink-0" style={{ width: "52%" }}>
              <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Live Preview</Label>
              <div className="border border-gray-200 rounded-lg bg-gray-50 p-2.5 shadow-inner">
                <canvas
                  ref={previewCanvasRef}
                  className="w-full rounded bg-white"
                  style={{
                    height: orientation === "landscape" ? 280 : 360,
                    display: "block",
                  }}
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                Showing {Math.min(20, previewActivities.length)} of {activities.length} activities
              </p>
            </div>

            {/* Right: Configuration Panel */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Page Settings Row */}
              <div>
                <Label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Page Settings</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-gray-500 mb-0.5 block">Page Size</Label>
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
              </div>

              {/* Display Options */}
              <div className="flex items-center gap-4 py-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={showGantt} onCheckedChange={(c) => setShowGantt(!!c)} />
                  <span className="text-xs text-gray-700">Include Gantt Chart</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={criticalPathOnly} onCheckedChange={(c) => setCriticalPathOnly(!!c)} />
                  <span className="text-xs text-gray-700">Critical Path Only</span>
                </label>
              </div>

              {/* Header/Footer Configuration */}
              <Tabs defaultValue="header" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-8">
                  <TabsTrigger value="header" className="text-xs">Header</TabsTrigger>
                  <TabsTrigger value="footer" className="text-xs">Footer</TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-gray-500 shrink-0">Columns:</Label>
                    {([3, 5] as const).map(c => (
                      <Button key={c} size="sm" variant={headerColumnCount === c ? "default" : "outline"}
                        className={`h-7 text-xs px-3 ${headerColumnCount === c ? "bg-blue-600 text-white" : "border-gray-300 text-gray-600"}`}
                        onClick={() => handleColumnCountChange("header", c)}>
                        {c}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {headerColumns.map((col, idx) => (
                      <div key={idx} className="min-w-0" style={{ flex: "1 1 0", minWidth: headerColumnCount === 5 ? "80px" : "100px" }}>
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

                <TabsContent value="footer" className="mt-3 space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-gray-500 shrink-0">Columns:</Label>
                    {([3, 5] as const).map(c => (
                      <Button key={c} size="sm" variant={footerColumnCount === c ? "default" : "outline"}
                        className={`h-7 text-xs px-3 ${footerColumnCount === c ? "bg-blue-600 text-white" : "border-gray-300 text-gray-600"}`}
                        onClick={() => handleColumnCountChange("footer", c)}>
                        {c}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {footerColumns.map((col, idx) => (
                      <div key={idx} className="min-w-0" style={{ flex: "1 1 0", minWidth: footerColumnCount === 5 ? "80px" : "100px" }}>
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

        <DialogFooter className="px-6 py-3 border-t border-gray-100 shrink-0">
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
