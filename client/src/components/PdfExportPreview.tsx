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
      case "page": return "Page 1 of 1";
      case "empty": return "";
      default: return "";
    }
  };

  // Draw a miniature preview of the schedule on canvas
  const previewActivities = useMemo(() => {
    const filtered = criticalPathOnly ? activities.filter(a => a.isCritical) : activities;
    return filtered.slice(0, 15); // Show first 15 for preview
  }, [activities, criticalPathOnly]);

  useEffect(() => {
    if (!open) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    // Page dimensions for preview
    const isLandscape = orientation === "landscape";
    const pageW = w;
    const pageH = h;
    const margin = 8;
    const headerH = 20;
    const footerH = 20;
    const contentY = margin + headerH + 4;
    const contentH = pageH - margin * 2 - headerH - footerH - 8;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageW, pageH);

    // Page border
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, pageW - 1, pageH - 1);

    // ── Header ──
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(margin, margin, pageW - margin * 2, headerH);
    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(margin, margin, pageW - margin * 2, headerH);

    const hColW = (pageW - margin * 2) / headerColumnCount;
    ctx.font = "bold 7px 'DM Sans', sans-serif";
    ctx.textBaseline = "middle";
    headerColumns.forEach((col, i) => {
      const text = getContentPreview(col.content);
      const x = margin + i * hColW;
      ctx.fillStyle = "#374151";
      ctx.textAlign = i === 0 ? "left" : i === headerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? x + 4 : i === headerColumnCount - 1 ? x + hColW - 4 : x + hColW / 2;
      ctx.fillText(text, tx, margin + headerH / 2);
    });

    // ── Content area ──
    const tableW = showGantt ? (pageW - margin * 2) * 0.45 : (pageW - margin * 2);
    const ganttX = margin + tableW + 2;
    const ganttW = pageW - margin * 2 - tableW - 2;
    const rowH = Math.min(12, contentH / Math.max(previewActivities.length + 1, 8));

    // Table header
    ctx.fillStyle = "#e5e7eb";
    ctx.fillRect(margin, contentY, tableW, rowH);
    ctx.fillStyle = "#6b7280";
    ctx.font = "bold 6px 'DM Sans', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("ID", margin + 2, contentY + rowH / 2);
    ctx.fillText("Activity Name", margin + 28, contentY + rowH / 2);
    ctx.fillText("Dur", margin + tableW * 0.65, contentY + rowH / 2);
    ctx.fillText("Start", margin + tableW * 0.75, contentY + rowH / 2);
    ctx.fillText("Finish", margin + tableW * 0.88, contentY + rowH / 2);

    // Table rows
    previewActivities.forEach((act, i) => {
      const ry = contentY + (i + 1) * rowH;
      if (ry + rowH > contentY + contentH) return;

      // Alternating row bg
      if (i % 2 === 1) {
        ctx.fillStyle = "#f9fafb";
        ctx.fillRect(margin, ry, tableW, rowH);
      }

      ctx.fillStyle = "#374151";
      ctx.font = "6px 'DM Sans', sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(act.activityId, margin + 2, ry + rowH / 2);

      const nameMax = 22;
      const name = act.name.length > nameMax ? act.name.slice(0, nameMax) + "…" : act.name;
      ctx.fillText(name, margin + 28, ry + rowH / 2);
      ctx.fillText(`${act.duration}d`, margin + tableW * 0.65, ry + rowH / 2);

      if (act.earlyStart) {
        const es = act.earlyStart;
        ctx.fillText(`${es.getMonth() + 1}/${es.getDate()}`, margin + tableW * 0.75, ry + rowH / 2);
      }
      if (act.earlyFinish) {
        const ef = act.earlyFinish;
        ctx.fillText(`${ef.getMonth() + 1}/${ef.getDate()}`, margin + tableW * 0.88, ry + rowH / 2);
      }
    });

    // Table border
    ctx.strokeStyle = "#d1d5db";
    ctx.strokeRect(margin, contentY, tableW, contentH);

    // ── Gantt area ──
    if (showGantt) {
      // Gantt header
      ctx.fillStyle = "#e5e7eb";
      ctx.fillRect(ganttX, contentY, ganttW, rowH);
      ctx.strokeStyle = "#d1d5db";
      ctx.strokeRect(ganttX, contentY, ganttW, contentH);

      // Time scale markers
      ctx.fillStyle = "#9ca3af";
      ctx.font = "5px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      const monthCount = 4;
      for (let m = 0; m < monthCount; m++) {
        const mx = ganttX + (m + 0.5) * (ganttW / monthCount);
        ctx.fillText(["Apr", "May", "Jun", "Jul"][m] || "", mx, contentY + rowH / 2);
      }

      // Find date range for scaling
      let minDate = Infinity;
      let maxDate = -Infinity;
      previewActivities.forEach(a => {
        if (a.earlyStart) minDate = Math.min(minDate, a.earlyStart.getTime());
        if (a.earlyFinish) maxDate = Math.max(maxDate, a.earlyFinish.getTime());
      });
      const dateRange = maxDate - minDate || 1;

      // Draw bars
      previewActivities.forEach((act, i) => {
        const ry = contentY + (i + 1) * rowH;
        if (ry + rowH > contentY + contentH) return;
        if (!act.earlyStart || !act.earlyFinish) return;

        const startPct = (act.earlyStart.getTime() - minDate) / dateRange;
        const endPct = (act.earlyFinish.getTime() - minDate) / dateRange;
        const bx = ganttX + 4 + startPct * (ganttW - 8);
        const bw = Math.max(2, (endPct - startPct) * (ganttW - 8));
        const by = ry + 3;
        const bh = rowH - 6;

        if (act.duration === 0) {
          // Milestone diamond
          const cx = bx;
          const cy = by + bh / 2;
          const s = 3;
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
          ctx.fillRect(bx, by, bw, bh);
        }
      });

      // Data date line in preview
      if (dataDate && minDate !== Infinity) {
        const ddPct = (dataDate.getTime() - minDate) / dateRange;
        const ddX = ganttX + 4 + ddPct * (ganttW - 8);
        if (ddX > ganttX && ddX < ganttX + ganttW) {
          ctx.strokeStyle = "#2563eb";
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(ddX, contentY);
          ctx.lineTo(ddX, contentY + contentH);
          ctx.stroke();
        }
      }
    }

    // ── Footer ──
    const footerY = pageH - margin - footerH;
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(margin, footerY, pageW - margin * 2, footerH);
    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(margin, footerY, pageW - margin * 2, footerH);

    const fColW = (pageW - margin * 2) / footerColumnCount;
    ctx.font = "6px 'DM Sans', sans-serif";
    ctx.textBaseline = "middle";
    footerColumns.forEach((col, i) => {
      const text = getContentPreview(col.content);
      const x = margin + i * fColW;
      ctx.fillStyle = "#6b7280";
      ctx.textAlign = i === 0 ? "left" : i === footerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? x + 4 : i === footerColumnCount - 1 ? x + fColW - 4 : x + fColW / 2;
      ctx.fillText(text, tx, footerY + footerH / 2);
    });

    // "More activities" indicator
    if (activities.length > 15) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "italic 6px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`+ ${activities.length - 15} more activities...`, pageW / 2, contentY + contentH - 6);
    }

  }, [open, headerColumns, footerColumns, headerColumnCount, footerColumnCount, pageSize, orientation, showGantt, criticalPathOnly, previewActivities, companyName, projectName, scheduleName, dataDate, activities.length]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 max-w-3xl text-gray-900 max-h-[92vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-600" /> PDF Export Preview
          </DialogTitle>
          <DialogDescription className="text-xs">Configure header, footer, and page settings. The preview updates live.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="grid grid-cols-2 gap-4 mt-3">
            {/* Left: Live Preview */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Live Preview</Label>
              <div className="border border-gray-200 rounded-lg bg-gray-50 p-2 shadow-inner">
                <canvas
                  ref={previewCanvasRef}
                  className="w-full rounded bg-white shadow-sm"
                  style={{ height: orientation === "landscape" ? 200 : 260, aspectRatio: orientation === "landscape" ? "11/8.5" : "8.5/11" }}
                />
              </div>
              <p className="text-[10px] text-gray-400 text-center">
                Showing {Math.min(15, previewActivities.length)} of {activities.length} activities
              </p>
            </div>

            {/* Right: Configuration */}
            <div className="space-y-3">
              {/* Page Settings */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Page Size</Label>
                  <Select value={pageSize} onValueChange={(v) => setPageSize(v as any)}>
                    <SelectTrigger className="mt-0.5 border-gray-300 text-xs h-8">
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
                  <Label className="text-[10px] text-gray-500 uppercase tracking-wider">Orientation</Label>
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                    <SelectTrigger className="mt-0.5 border-gray-300 text-xs h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200">
                      <SelectItem value="landscape" className="text-gray-900 text-xs">Landscape</SelectItem>
                      <SelectItem value="portrait" className="text-gray-900 text-xs">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={showGantt} onCheckedChange={(c) => setShowGantt(!!c)} />
                  <span className="text-xs text-gray-700">Gantt Chart</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox checked={criticalPathOnly} onCheckedChange={(c) => setCriticalPathOnly(!!c)} />
                  <span className="text-xs text-gray-700">Critical Only</span>
                </label>
              </div>

              {/* Header/Footer Tabs */}
              <Tabs defaultValue="header" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-7">
                  <TabsTrigger value="header" className="text-xs h-6">Header</TabsTrigger>
                  <TabsTrigger value="footer" className="text-xs h-6">Footer</TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-gray-500 shrink-0">Columns:</Label>
                    {([3, 5] as const).map(c => (
                      <Button key={c} size="sm" variant={headerColumnCount === c ? "default" : "outline"}
                        className={`h-6 text-[10px] px-2 ${headerColumnCount === c ? "bg-blue-600" : "border-gray-300 text-gray-600"}`}
                        onClick={() => handleColumnCountChange("header", c)}>
                        {c}
                      </Button>
                    ))}
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${headerColumnCount}, 1fr)` }}>
                    {headerColumns.map((col, idx) => (
                      <div key={idx}>
                        <Label className="text-[9px] text-gray-400 mb-0.5 block">{idx === 0 ? "Left" : idx === headerColumnCount - 1 ? "Right" : "Center"}</Label>
                        <Select value={col.content} onValueChange={(v) => handleColumnContentChange("header", idx, v)}>
                          <SelectTrigger className="border-gray-300 text-[10px] h-7">
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

                <TabsContent value="footer" className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-[10px] text-gray-500 shrink-0">Columns:</Label>
                    {([3, 5] as const).map(c => (
                      <Button key={c} size="sm" variant={footerColumnCount === c ? "default" : "outline"}
                        className={`h-6 text-[10px] px-2 ${footerColumnCount === c ? "bg-blue-600" : "border-gray-300 text-gray-600"}`}
                        onClick={() => handleColumnCountChange("footer", c)}>
                        {c}
                      </Button>
                    ))}
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${footerColumnCount}, 1fr)` }}>
                    {footerColumns.map((col, idx) => (
                      <div key={idx}>
                        <Label className="text-[9px] text-gray-400 mb-0.5 block">{idx === 0 ? "Left" : idx === footerColumnCount - 1 ? "Right" : "Center"}</Label>
                        <Select value={col.content} onValueChange={(v) => handleColumnContentChange("footer", idx, v)}>
                          <SelectTrigger className="border-gray-300 text-[10px] h-7">
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

        <DialogFooter className="px-6 py-3 border-t border-gray-200">
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
