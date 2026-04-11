/**
 * PdfExportPreview — WYSIWYG multi-page PDF preview with real relationship arrows.
 *
 * Key improvements:
 * - Renders ALL pages as separate canvases stacked vertically in a scrollable container
 * - Uses actual relationships data (predecessorId/successorId) for logic line arrows
 * - Supports FS, SS, FF, SF relationship types with proper arrow routing
 * - WBS group headers shown in both table and Gantt sides
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { getWbsRowHeight, getActivityRowHeight } from "@/components/GanttChart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, Loader2, FileText, Type, Image as ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";

export interface PdfHeaderFooterConfig {
  headerColumns?: { position: number; content: string; customText?: string; imageDataUrl?: string }[];
  footerColumns?: { position: number; content: string; customText?: string; imageDataUrl?: string }[];
  headerColumnCount?: 3 | 5;
  footerColumnCount?: 3 | 5;
  pageSize?: "letter" | "legal" | "tabloid";
  orientation?: "landscape" | "portrait";
  showGantt?: boolean;
  showTable?: boolean;
  criticalPathOnly?: boolean;
  showLogicLines?: boolean;
  headerBgColor?: string;
  headerAccentColor?: string;
  headerTextColor?: string;
}

interface Activity {
  id: number;
  activityId: string;
  name: string;
  duration: number;
  earlyStart?: Date | string | null;
  earlyFinish?: Date | string | null;
  isCritical?: boolean;
  percentComplete?: number;
  barColor?: string;
}

interface Relationship {
  id: number;
  predecessorId: number;
  successorId: number;
  relationshipType: "FS" | "SS" | "FF" | "SF";
  lagDays: number;
}

interface WbsGroup {
  group: string | null;
  activities: Activity[];
  depth: number;
  wbsColor?: string;
  wbsTextColor?: string;
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
  /** Pass groupedActivities when groupBy === "wbs" to show WBS headers in preview */
  groupedActivities?: WbsGroup[];
  groupBy?: string | null;
  /** All relationships for drawing logic lines */
  relationships?: Relationship[];
  magnificationZoom?: number; // 50-150 for PDF row height scaling
}

const CONTENT_OPTIONS = [
  { value: "company", label: "Company Name" },
  { value: "project", label: "Project Name" },
  { value: "schedule", label: "Schedule Name" },
  { value: "date", label: "Export Date" },
  { value: "datadate", label: "Data Date" },
  { value: "page", label: "Page Numbers" },
  { value: "custom", label: "Custom Text" },
  { value: "image", label: "Image / Logo" },
  { value: "empty", label: "(Empty)" },
];

// Paper sizes in inches (width x height in portrait)
const PAPER_SIZES: Record<string, { w: number; h: number; label: string }> = {
  letter:  { w: 8.5,  h: 11,   label: "Letter (8.5×11)" },
  legal:   { w: 8.5,  h: 14,   label: "Legal (8.5×14)" },
  tabloid: { w: 11,   h: 17,   label: "Tabloid (11×17)" },
};

interface ColumnData {
  position: number;
  content: string;
  customText?: string;
  imageDataUrl?: string;
}

// Bar position info per activity (per page)
interface BarPos {
  x1: number;
  x2: number;
  yMid: number;
}

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
  groupedActivities,
  groupBy,
  relationships = [],
  magnificationZoom = 100,
}: PdfExportPreviewProps) {
  const [headerColumnCount, setHeaderColumnCount] = useState<3 | 5>(3);
  const [footerColumnCount, setFooterColumnCount] = useState<3 | 5>(3);
  const [headerColumns, setHeaderColumns] = useState<ColumnData[]>([
    { position: 0, content: "company" },
    { position: 1, content: "schedule" },
    { position: 2, content: "datadate" },
  ]);
  const [footerColumns, setFooterColumns] = useState<ColumnData[]>([
    { position: 0, content: "project" },
    { position: 1, content: "date" },
    { position: 2, content: "page" },
  ]);
  const [pageSize, setPageSize] = useState<"letter" | "legal" | "tabloid">("tabloid");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showGantt, setShowGantt] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);
  const [showLogicLines, setShowLogicLines] = useState(false);
  const [headerBgColor, setHeaderBgColor] = useState("#0d1b2a");
  const [headerAccentColor, setHeaderAccentColor] = useState("#c9a84c");
  const [headerTextColor, setHeaderTextColor] = useState("#e2e8f0");

  // Multi-page state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [canvasReady, setCanvasReady] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Image cache for loaded images
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});

  // Force canvas re-render when dialog opens
  useEffect(() => {
    if (open) {
      setCanvasReady(false);
      setCurrentPage(0);
      const timer = setTimeout(() => setCanvasReady(true), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Measure container width
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPreviewWidth(Math.max(400, entry.contentRect.width - 32));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [open]);

  const handleColumnCountChange = (type: "header" | "footer", count: 3 | 5) => {
    const setter = type === "header" ? setHeaderColumns : setFooterColumns;
    const current = type === "header" ? headerColumns : footerColumns;
    const countSetter = type === "header" ? setHeaderColumnCount : setFooterColumnCount;
    countSetter(count);
    const newCols: ColumnData[] = [];
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

  const handleCustomTextChange = (type: "header" | "footer", pos: number, text: string) => {
    const setter = type === "header" ? setHeaderColumns : setFooterColumns;
    const current = type === "header" ? [...headerColumns] : [...footerColumns];
    current[pos] = { ...current[pos], customText: text };
    setter(current);
  };

  const handleImageUpload = (type: "header" | "footer", pos: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const setter = type === "header" ? setHeaderColumns : setFooterColumns;
      const current = type === "header" ? [...headerColumns] : [...footerColumns];
      current[pos] = { ...current[pos], imageDataUrl: dataUrl };
      setter(current);
      const img = new Image();
      img.onload = () => {
        loadedImagesRef.current[`${type}-${pos}`] = img;
        setCanvasReady(false);
        setTimeout(() => setCanvasReady(true), 50);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const getContentPreview = useCallback((col: ColumnData, pageNum: number, total: number): string => {
    switch (col.content) {
      case "company": return companyName || "Company Name";
      case "project": return projectName || "Project Name";
      case "schedule": return scheduleName || "Schedule Name";
      case "date": return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      case "datadate": return dataDate ? `DD: ${dataDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "DD: Not set";
      case "page": return `Page ${pageNum} of ${total}`;
      case "custom": return col.customText || "Custom Text";
      case "image": return "[Image]";
      case "empty": return "";
      default: return "";
    }
  }, [companyName, projectName, scheduleName, dataDate]);

  // Build the ordered list of preview rows (WBS group headers + activities)
  const previewRows = useMemo(() => {
    type PreviewRow =
      | { type: "group"; label: string; depth: number; bgColor?: string; textColor?: string }
      | { type: "activity"; act: Activity };

    const rows: PreviewRow[] = [];
    const useWbs = groupBy === "wbs" && groupedActivities && groupedActivities.length > 0;

    if (useWbs) {
      for (const g of groupedActivities!) {
        const gActs = criticalPathOnly ? g.activities.filter(a => a.isCritical) : g.activities;
        if (g.group && gActs.length > 0) {
          rows.push({ type: "group", label: g.group, depth: g.depth, bgColor: g.wbsColor, textColor: g.wbsTextColor });
        }
        for (const act of gActs) {
          rows.push({ type: "activity", act });
        }
      }
    } else {
      const filtered = criticalPathOnly ? activities.filter(a => a.isCritical) : activities;
      for (const act of filtered) {
        rows.push({ type: "activity", act });
      }
    }
    return rows;
  }, [activities, groupedActivities, groupBy, criticalPathOnly]);

  // Build DB id → activityId string map for relationship arrow lookup
  const dbIdToActivityId = useMemo(() => {
    const map = new Map<number, string>();
    activities.forEach(a => map.set(a.id, a.activityId));
    return map;
  }, [activities]);

  // Paper dimensions
  const paperDims = useMemo(() => {
    const paper = PAPER_SIZES[pageSize];
    const pw = orientation === "landscape" ? paper.h : paper.w;
    const ph = orientation === "landscape" ? paper.w : paper.h;
    return { w: pw, h: ph };
  }, [pageSize, orientation]);

  // Canvas pixel dimensions based on container width
  const canvasDims = useMemo(() => {
    const aspect = paperDims.w / paperDims.h;
    const w = previewWidth;
    const h = Math.round(w / aspect);
    return { width: w, height: h };
  }, [previewWidth, paperDims]);

  // Helper: get the PDF-scaled pixel height for a given preview row
  // Mirrors GanttChart.tsx getWbsRowHeight / getActivityRowHeight, scaled to PDF ppi AND magnificationZoom
  type PreviewRow = { type: "group"; label: string; depth: number; bgColor?: string; textColor?: string } | { type: "activity"; act: Activity };
  const zoomScale = magnificationZoom / 100;
  const getRowHeightPdf = useCallback((row: PreviewRow, ppi: number): number => {
    // Screen heights (px): WBS depth-0=56, depth-1=24, depth-2+=20, activity=32
    // Scale to PDF: (screenPx / 96) * ppi * zoomScale
    const screenH = row.type === "group"
      ? getWbsRowHeight(row.depth, false)
      : getActivityRowHeight(false);
    return (screenH / 96) * ppi * zoomScale;
  }, [zoomScale]);

  // Calculate layout constants
  const rowsPerPage = useMemo(() => {
    const ppi = canvasDims.width / paperDims.w;
    const marginIn = 0.4;
    const margin = marginIn * ppi;
    const headerH = 0.35 * ppi;
    const footerH = 0.25 * ppi;
    const contentH = canvasDims.height - margin * 2 - headerH - footerH - 12;
    // baseFontSize scales with zoom so text stays proportional to row heights
    const baseFontSize = Math.max(4, Math.min(10, ppi * 0.08 * zoomScale));
    // Column-header row height also scales with zoom
    const headerRowH = (getActivityRowHeight(false) / 96) * ppi * zoomScale;
    return { ppi, margin, headerH, footerH, contentH, baseFontSize, headerRowH };
  }, [canvasDims, paperDims, zoomScale]);

  const pages = useMemo(() => {
    const { ppi, contentH, headerRowH } = rowsPerPage;
    // headerRowH already includes zoomScale from rowsPerPage
    const result: (typeof previewRows)[] = [];
    let pageRows: typeof previewRows = [];
    let usedH = headerRowH; // start with the column-header row
    for (const row of previewRows) {
      const rh = getRowHeightPdf(row, ppi);
      if (usedH + rh > contentH - 4 && pageRows.length > 0) {
        result.push(pageRows);
        pageRows = [];
        usedH = headerRowH;
      }
      pageRows.push(row);
      usedH += rh;
    }
    if (pageRows.length > 0) result.push(pageRows);
    if (result.length === 0) result.push([]);
    return result;
  }, [previewRows, rowsPerPage, getRowHeightPdf]);

  // Draw a single page onto a canvas
  const drawPage = useCallback((
    canvas: HTMLCanvasElement,
    pageRows: typeof previewRows,
    pageNum: number,
    numPages: number,
  ) => {
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
    const { ppi, margin, headerH, footerH, contentH, baseFontSize, headerRowH } = rowsPerPage;
    // Per-row heights are computed inline using getRowHeightPdf(row, ppi)
    // headerRowH is used only for the column-label row at top of content area
    const rowH = headerRowH; // used only for the column-label header row
    const contentY = margin + headerH + 4;

    // White page background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    // Page border
    ctx.strokeStyle = "#d1d5db";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);

    // ── Header band ──
    if (headerBgColor !== "transparent") {
      ctx.fillStyle = headerBgColor;
      ctx.fillRect(margin, margin, w - margin * 2, headerH);
    } else {
      ctx.strokeStyle = "#d1d5db";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(margin, margin, w - margin * 2, headerH);
    }

    const hColW = (w - margin * 2) / headerColumnCount;
    const headerFontSize = Math.max(7, Math.min(12, ppi * 0.12));
    ctx.textBaseline = "middle";
    headerColumns.forEach((col, i) => {
      if (col.content === "image" && col.imageDataUrl) {
        const img = loadedImagesRef.current[`header-${i}`];
        if (img) {
          const imgH = headerH - 6;
          const imgW = (img.width / img.height) * imgH;
          const ix = i === 0 ? margin + 4 : i === headerColumnCount - 1 ? margin + i * hColW + hColW - imgW - 4 : margin + i * hColW + (hColW - imgW) / 2;
          ctx.drawImage(img, ix, margin + 3, imgW, imgH);
        }
        return;
      }
      const text = getContentPreview(col, pageNum, numPages);
      ctx.fillStyle = i === 0 ? headerAccentColor : headerTextColor;
      ctx.font = i === 0 ? `bold ${headerFontSize}px 'DM Sans', sans-serif` : `${headerFontSize * 0.9}px 'DM Sans', sans-serif`;
      ctx.textAlign = i === 0 ? "left" : i === headerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 8 : i === headerColumnCount - 1 ? margin + i * hColW + hColW - 8 : margin + i * hColW + hColW / 2;
      ctx.fillText(text, tx, margin + headerH / 2);
    });

    // ── Content area ──
    const tableW = showGantt ? (w - margin * 2) * 0.42 : (w - margin * 2);
    const ganttX = margin + tableW + 4;
    const ganttW = w - margin * 2 - tableW - 4;

    // Table header
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(margin, contentY, tableW, rowH);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, contentY, tableW, rowH);
    ctx.fillStyle = "#475569";
    ctx.font = `bold ${baseFontSize}px 'DM Sans', sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("ID", margin + 4, contentY + rowH / 2);
    ctx.fillText("Activity Name", margin + tableW * 0.12, contentY + rowH / 2);
    ctx.fillText("Dur", margin + tableW * 0.6, contentY + rowH / 2);
    ctx.fillText("Start", margin + tableW * 0.72, contentY + rowH / 2);
    ctx.fillText("Finish", margin + tableW * 0.87, contentY + rowH / 2);

    // Table rows — variable row heights, cumulative Y tracking
    // rowYOffsets[i] = Y position of row i (0-indexed into pageRows)
    const rowYOffsets: number[] = [];
    let cumY = contentY + rowH; // start after the column-header row
    for (const row of pageRows) {
      rowYOffsets.push(cumY);
      cumY += getRowHeightPdf(row, ppi);
    }

    let actRowIndex = 0;
    for (let i = 0; i < pageRows.length; i++) {
      const row = pageRows[i];
      const ry = rowYOffsets[i];
      const rh = getRowHeightPdf(row, ppi);
      if (ry + rh > contentY + contentH - 4) break;

      if (row.type === "group") {
        const depth = row.depth;
        const indent = depth * 8;
        ctx.fillStyle = row.bgColor || (depth === 0 ? "#e2e8f0" : depth === 1 ? "#f1f5f9" : "#f8fafc");
        ctx.fillRect(margin, ry, tableW, rh);
        if (depth > 0) {
          ctx.fillStyle = row.bgColor || "#94a3b8";
          ctx.fillRect(margin + indent - 2, ry + 1, 2, rh - 2);
        }
        ctx.fillStyle = row.textColor || (depth === 0 ? "#1e293b" : "#334155");
        ctx.font = `${depth === 0 ? "bold" : "normal"} ${baseFontSize}px 'DM Sans', sans-serif`;
        ctx.textAlign = "left";
        const groupLabel = row.label.length > 40 ? row.label.slice(0, 40) + "…" : row.label;
        ctx.fillText(groupLabel, margin + 4 + indent, ry + rh / 2);
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(margin, ry + rh);
        ctx.lineTo(margin + tableW, ry + rh);
        ctx.stroke();
        continue;
      }

      const act = row.act;
      if (actRowIndex % 2 === 1) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(margin, ry, tableW, rh);
      }
      ctx.fillStyle = act.isCritical ? "#dc2626" : "#334155";
      ctx.font = `${baseFontSize}px 'DM Sans', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(act.activityId, margin + 4, ry + rh / 2);
      const nameMaxChars = Math.floor(tableW * 0.45 / (baseFontSize * 0.55));
      const name = act.name.length > nameMaxChars ? act.name.slice(0, nameMaxChars) + "…" : act.name;
      ctx.fillText(name, margin + tableW * 0.12, ry + rh / 2);
      ctx.fillText(`${act.duration}d`, margin + tableW * 0.6, ry + rh / 2);
      if (act.earlyStart) {
        const es = new Date(act.earlyStart);
        ctx.fillText(`${es.getMonth() + 1}/${es.getDate()}`, margin + tableW * 0.72, ry + rh / 2);
      }
      if (act.earlyFinish) {
        const ef = new Date(act.earlyFinish);
        ctx.fillText(`${ef.getMonth() + 1}/${ef.getDate()}`, margin + tableW * 0.87, ry + rh / 2);
      }
      actRowIndex++;
    }

    // Table border + row dividers (using cumulative Y offsets)
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, contentY, tableW, contentH);
    for (let i = 0; i < rowYOffsets.length; i++) {
      const ry = rowYOffsets[i];
      const rh = getRowHeightPdf(pageRows[i], ppi);
      const lineY = ry + rh;
      if (lineY > contentY + contentH - 4) break;
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(margin, lineY);
      ctx.lineTo(margin + tableW, lineY);
      ctx.stroke();
    }

    // ── Gantt area ──
    if (showGantt) {
      ctx.fillStyle = "#f8fafc";
      ctx.fillRect(ganttX, contentY, ganttW, rowH);
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(ganttX, contentY, ganttW, contentH);

      // Compute date range from ALL activities (not just this page) for consistent scale
      const allActs = previewRows.filter(r => r.type === "activity").map(r => (r as { type: "activity"; act: Activity }).act);
      let minDate = Infinity;
      let maxDate = -Infinity;
      allActs.forEach(a => {
        if (a.earlyStart) minDate = Math.min(minDate, new Date(a.earlyStart).getTime());
        if (a.earlyFinish) maxDate = Math.max(maxDate, new Date(a.earlyFinish).getTime());
      });
      const dateRange = maxDate - minDate || 1;

      const tsFont = Math.max(5, baseFontSize * 0.85);

      // Month grid lines and labels
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
          ctx.textBaseline = "middle";
          ctx.fillText(m.label, m.x, contentY + rowH / 2);
        });
      }

      // Track bar positions for logic lines (activityId → bar positions)
      const barPositions = new Map<string, BarPos>();

      // Draw bars — use same rowYOffsets from table section for alignment
      for (let i = 0; i < pageRows.length; i++) {
        const row = pageRows[i];
        const ry = rowYOffsets[i];
        const rh = getRowHeightPdf(row, ppi);
        if (ry + rh > contentY + contentH - 4) break;

        if (row.type === "group") {
          if (row.bgColor) {
            ctx.fillStyle = row.bgColor + "33";
          } else {
            ctx.fillStyle = row.depth === 0 ? "#e2e8f022" : "#f1f5f911";
          }
          ctx.fillRect(ganttX, ry, ganttW, rh);
          continue;
        }

        const act = row.act;
        if (!act.earlyStart || !act.earlyFinish) continue;

        const startPct = (new Date(act.earlyStart).getTime() - minDate) / dateRange;
        const endPct = (new Date(act.earlyFinish).getTime() - minDate) / dateRange;
        const bx = ganttX + 4 + startPct * (ganttW - 8);
        const bw = Math.max(3, (endPct - startPct) * (ganttW - 8));
        const barPad = Math.max(2, rh * 0.12);
        const by = ry + barPad;
        const bh = rh - barPad * 2;

        // Store position for logic lines
        barPositions.set(act.activityId, { x1: bx, x2: bx + bw, yMid: ry + rh / 2 });

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
          // Milestone label to the right
          const mlFont = Math.max(4, baseFontSize * 0.85);
          ctx.font = `${mlFont}px 'DM Sans', sans-serif`;
          ctx.fillStyle = "#1e293b";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(act.name, cx + s + 3, cy);
        } else {
          ctx.fillStyle = act.barColor || (act.isCritical ? "#ef4444" : "#22c55e");
          const radius = 1.5;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw, bh, radius);
          ctx.fill();
          // Activity name label — draw on bar if it fits, otherwise to the right
          const barFont = Math.max(4, baseFontSize * 0.85);
          ctx.font = `${barFont}px 'DM Sans', sans-serif`;
          ctx.textBaseline = "middle";
          const labelY = ry + rh / 2;
          const labelPad = 3;
          const textW = ctx.measureText(act.name).width;
          if (textW + labelPad * 2 <= bw - 4) {
            // Fits inside bar
            ctx.save();
            ctx.rect(bx, by, bw, bh);
            ctx.clip();
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "left";
            ctx.fillText(act.name, bx + labelPad, labelY);
            ctx.restore();
          } else {
            // Draw to the right of bar
            ctx.fillStyle = "#1e293b";
            ctx.textAlign = "left";
            ctx.fillText(act.name, bx + bw + 3, labelY);
          }
        }
      }

      // ── Real Logic Lines (relationship arrows) ──
      if (showLogicLines && barPositions.size > 0 && relationships.length > 0) {
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.7;

        for (const rel of relationships) {
          const predActId = dbIdToActivityId.get(rel.predecessorId);
          const succActId = dbIdToActivityId.get(rel.successorId);
          if (!predActId || !succActId) continue;

          const predPos = barPositions.get(predActId);
          const succPos = barPositions.get(succActId);
          if (!predPos || !succPos) continue; // one or both not on this page

          const type = rel.relationshipType || "FS";
          let x1: number, y1: number, x2: number, y2: number;

          // Determine connection points based on relationship type
          switch (type) {
            case "FS": x1 = predPos.x2; y1 = predPos.yMid; x2 = succPos.x1; y2 = succPos.yMid; break;
            case "SS": x1 = predPos.x1; y1 = predPos.yMid; x2 = succPos.x1; y2 = succPos.yMid; break;
            case "FF": x1 = predPos.x2; y1 = predPos.yMid; x2 = succPos.x2; y2 = succPos.yMid; break;
            case "SF": x1 = predPos.x1; y1 = predPos.yMid; x2 = succPos.x2; y2 = succPos.yMid; break;
            default:   x1 = predPos.x2; y1 = predPos.yMid; x2 = succPos.x1; y2 = succPos.yMid;
          }

          // Draw right-angle routing: horizontal → vertical → horizontal
          const midX = x1 + (x2 - x1) / 2;
          ctx.beginPath();
          ctx.setLineDash([]);
          if (Math.abs(y1 - y2) < 2) {
            // Same row — draw straight line
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
          } else {
            // Route: from x1,y1 → right 4px → down/up to y2 → to x2,y2
            const routeX = Math.max(x1 + 4, midX);
            ctx.moveTo(x1, y1);
            ctx.lineTo(routeX, y1);
            ctx.lineTo(routeX, y2);
            ctx.lineTo(x2, y2);
          }
          ctx.stroke();

          // Arrowhead at destination
          const arrowSize = 3;
          const isLeft = x2 < x1 + 4; // arrow points left
          ctx.beginPath();
          ctx.fillStyle = "#475569";
          if (type === "FF" || (type === "SF" && !isLeft)) {
            // Arrow pointing right at x2
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - arrowSize * 1.5, y2 - arrowSize);
            ctx.lineTo(x2 - arrowSize * 1.5, y2 + arrowSize);
          } else {
            // Arrow pointing left at x2 (FS, SS default)
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 + arrowSize * 1.5, y2 - arrowSize);
            ctx.lineTo(x2 + arrowSize * 1.5, y2 + arrowSize);
          }
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
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
          ctx.textBaseline = "middle";
          ctx.fillText("DD", ddX, contentY + rowH * 1.5);
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
      if (col.content === "image" && col.imageDataUrl) {
        const img = loadedImagesRef.current[`footer-${i}`];
        if (img) {
          const imgH = footerH - 4;
          const imgW = (img.width / img.height) * imgH;
          const ix = i === 0 ? margin + 4 : i === footerColumnCount - 1 ? margin + i * fColW + fColW - imgW - 4 : margin + i * fColW + (fColW - imgW) / 2;
          ctx.drawImage(img, ix, footerY + 2, imgW, imgH);
        }
        return;
      }
      const text = getContentPreview(col, pageNum, numPages);
      ctx.fillStyle = "#64748b";
      ctx.textAlign = i === 0 ? "left" : i === footerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 4 : i === footerColumnCount - 1 ? w - margin - 4 : margin + i * fColW + fColW / 2;
      ctx.fillText(text, tx, footerY + footerH / 2);
    });
  }, [
    canvasDims, paperDims, rowsPerPage, headerColumns, footerColumns, headerColumnCount, footerColumnCount,
    showGantt, showLogicLines, previewRows, companyName, projectName, scheduleName, dataDate,
    getContentPreview, headerBgColor, headerAccentColor, headerTextColor, relationships, dbIdToActivityId,
    getRowHeightPdf,
  ]);

  // Render all pages
  useEffect(() => {
    if (!open || !canvasReady) return;
    const numPages = pages.length;
    setTotalPages(numPages);
    canvasRefs.current = canvasRefs.current.slice(0, numPages);

    // Small delay to allow DOM to update canvas refs
    const timer = setTimeout(() => {
      pages.forEach((pageRows, idx) => {
        const canvas = canvasRefs.current[idx];
        if (canvas) {
          drawPage(canvas, pageRows, idx + 1, numPages);
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [open, canvasReady, pages, drawPage]);

  const handleExport = async () => {
    await onExport({
      headerColumns,
      footerColumns,
      headerColumnCount,
      footerColumnCount,
      pageSize,
      orientation,
      showGantt,
      showTable,
      criticalPathOnly,
      showLogicLines,
      headerBgColor,
      headerAccentColor,
      headerTextColor,
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

  const renderColumnEditor = (type: "header" | "footer", columns: ColumnData[], columnCount: number) => (
    <div className="space-y-1.5">
      {columns.map((col, idx) => (
        <div key={idx}>
          <Label className="text-[9px] text-gray-600 mb-0.5 block">{getColLabel(idx, columnCount)}</Label>
          <Select value={col.content} onValueChange={(v) => handleColumnContentChange(type, idx, v)}>
            <SelectTrigger className="border-white/15 text-[11px] bg-white/5 text-gray-200 h-7 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {opt.value === "custom" && <Type className="w-3 h-3" />}
                    {opt.value === "image" && <ImageIcon className="w-3 h-3" />}
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {col.content === "custom" && (
            <Input
              value={col.customText || ""}
              onChange={(e) => handleCustomTextChange(type, idx, e.target.value)}
              placeholder="Enter custom text..."
              className="mt-1 h-7 text-[11px] border-white/15"
            />
          )}
          {col.content === "image" && (
            <div className="mt-1">
              {col.imageDataUrl ? (
                <div className="flex items-center gap-2">
                  <img src={col.imageDataUrl} alt="Logo" className="h-6 rounded border border-white/10" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] px-2 border-white/15 text-gray-400 bg-white/5"
                    onClick={() => {
                      const setter = type === "header" ? setHeaderColumns : setFooterColumns;
                      const current = type === "header" ? [...headerColumns] : [...footerColumns];
                      current[idx] = { ...current[idx], imageDataUrl: undefined };
                      setter(current);
                      delete loadedImagesRef.current[`${type}-${idx}`];
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-amber-400 hover:text-amber-300">
                  <ImageIcon className="w-3 h-3" />
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(type, idx, file);
                    }}
                  />
                </label>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const totalActivities = previewRows.filter(r => r.type === "activity").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!p-0 !max-w-[94vw] !w-[94vw] !h-[90vh] !max-h-[90vh] [&>div:nth-child(2)]:!p-0 [&>div:nth-child(2)]:!overflow-hidden [&>div:nth-child(2)]:flex [&>div:nth-child(2)]:flex-col [&>div:nth-child(2)]:h-full">
        <DialogHeader className="px-6 pt-5 pb-0 shrink-0">
          <DialogTitle className="font-semibold flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" /> PDF Export Preview
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-400">
            Multi-page preview — scroll to see all pages. {totalActivities} activities across {totalPages} page{totalPages !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6 py-3 min-h-0">
          <div className="flex gap-5 h-full">
            {/* Left: Multi-page scrollable preview */}
            <div className="flex-1 min-w-0 flex flex-col" ref={containerRef}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-600" />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Preview</span>
                  {groupBy === "wbs" && (
                    <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded px-1.5 py-0.5 font-medium">WBS Grouped</span>
                  )}
                  {showLogicLines && relationships.length > 0 && (
                    <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded px-1.5 py-0.5 font-medium">{relationships.length} relationships</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-600">
                    {PAPER_SIZES[pageSize].label} — {orientation === "landscape" ? "Landscape" : "Portrait"}
                  </span>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 border-white/15 text-gray-400"
                        onClick={() => {
                          const prev = Math.max(0, currentPage - 1);
                          setCurrentPage(prev);
                          scrollContainerRef.current?.children[prev]?.scrollIntoView({ behavior: "smooth" });
                        }}
                        disabled={currentPage === 0}
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </Button>
                      <span className="text-[10px] text-gray-400 min-w-[60px] text-center">
                        Page {currentPage + 1} of {totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 border-white/15 text-gray-400"
                        onClick={() => {
                          const next = Math.min(totalPages - 1, currentPage + 1);
                          setCurrentPage(next);
                          scrollContainerRef.current?.children[next]?.scrollIntoView({ behavior: "smooth" });
                        }}
                        disabled={currentPage === totalPages - 1}
                      >
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable pages container */}
              <div
                ref={scrollContainerRef}
                className="flex-1 min-h-0 bg-[#0f1219] rounded-xl border border-white/10 overflow-y-auto"
                style={{ padding: "16px" }}
                onScroll={(e) => {
                  // Update current page indicator based on scroll position
                  const container = e.currentTarget;
                  const children = Array.from(container.children) as HTMLElement[];
                  for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    const rect = child.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    if (rect.top >= containerRect.top - 50) {
                      setCurrentPage(i);
                      break;
                    }
                  }
                }}
              >
                {pages.map((_, idx) => (
                  <div
                    key={idx}
                    className="mb-4 last:mb-0"
                    style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.2))" }}
                  >
                    {totalPages > 1 && (
                      <div className="text-[10px] text-gray-600 mb-1 text-center">
                        Page {idx + 1} of {totalPages}
                      </div>
                    )}
                    <canvas
                      ref={(el) => { canvasRefs.current[idx] = el; }}
                      className="rounded bg-white block mx-auto"
                      style={{
                        width: `${canvasDims.width}px`,
                        height: `${canvasDims.height}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Configuration Panel */}
            <div className="w-72 shrink-0 flex flex-col gap-3 overflow-y-auto">
              {/* Page Settings */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-3">
                <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Page Settings</Label>
                <div>
                  <Label className="text-[10px] text-gray-400 mb-0.5 block">Paper Size</Label>
                  <Select value={pageSize} onValueChange={(v) => setPageSize(v as any)}>
                    <SelectTrigger className="border-white/15 text-xs bg-white/5 text-gray-200 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="letter" className="text-xs">Letter (8.5×11)</SelectItem>
                      <SelectItem value="legal" className="text-xs">Legal (8.5×14)</SelectItem>
                      <SelectItem value="tabloid" className="text-xs">Tabloid (11×17)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 mb-0.5 block">Orientation</Label>
                  <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                    <SelectTrigger className="border-white/15 text-xs bg-white/5 text-gray-200 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="landscape" className="text-xs">Landscape</SelectItem>
                      <SelectItem value="portrait" className="text-xs">Portrait</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Display Options */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-2">
                <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Display</Label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showGantt} onCheckedChange={(c) => setShowGantt(!!c)} />
                  <span className="text-xs text-gray-400">Include Gantt Chart</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showTable} onCheckedChange={(c) => setShowTable(!!c)} />
                  <span className="text-xs text-gray-400">Include Activity Table</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={criticalPathOnly} onCheckedChange={(c) => setCriticalPathOnly(!!c)} />
                  <span className="text-xs text-gray-400">Critical Path Only</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={showLogicLines} onCheckedChange={(c) => setShowLogicLines(!!c)} />
                  <div>
                    <span className="text-xs text-gray-400">Show Logic Lines</span>
                    <p className="text-[10px] text-gray-600 leading-tight">
                      {relationships.length > 0
                        ? `${relationships.length} real FS/SS/FF/SF arrows`
                        : "Relationship arrows between activities"}
                    </p>
                  </div>
                </label>
              </div>

              {/* Header/Footer Configuration */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-3">
                <Tabs defaultValue="header" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="header" className="text-xs">Header</TabsTrigger>
                    <TabsTrigger value="footer" className="text-xs">Footer</TabsTrigger>
                  </TabsList>

                  <TabsContent value="header" className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-gray-400 shrink-0">Columns:</Label>
                      {([3, 5] as const).map(c => (
                        <Button key={c} size="sm" variant={headerColumnCount === c ? "default" : "outline"}
                          className={`h-6 text-[10px] px-2.5 ${headerColumnCount === c ? "bg-amber-500 text-gray-950 font-semibold" : "border-white/15 text-gray-400 bg-white/5"}`}
                          onClick={() => handleColumnCountChange("header", c)}>
                          {c}
                        </Button>
                      ))}
                    </div>

                    {/* Header Color Picker */}
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">Header Style</Label>
                      <div className="grid grid-cols-3 gap-1.5 mb-2">
                        {[
                          { bg: "#0d1b2a", accent: "#c9a84c", text: "#e2e8f0", label: "Navy/Gold" },
                          { bg: "#1e293b", accent: "#3b82f6", text: "#e2e8f0", label: "Slate/Blue" },
                          { bg: "#374151", accent: "#f59e0b", text: "#f3f4f6", label: "Gray/Amber" },
                          { bg: "#1a1a2e", accent: "#e94560", text: "#eaeaea", label: "Dark/Red" },
                          { bg: "#f1f5f9", accent: "#2563eb", text: "#1e293b", label: "Light/Blue" },
                          { bg: "transparent", accent: "#6b7280", text: "#374151", label: "No Color" },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            className={`h-7 rounded border text-[9px] font-medium flex items-center justify-center gap-1 transition-all ${
                              headerBgColor === preset.bg && headerAccentColor === preset.accent
                                ? "ring-2 ring-blue-500 ring-offset-1 border-blue-400"
                                : "border-white/15 hover:border-gray-400"
                            }`}
                            style={{ backgroundColor: preset.bg === "transparent" ? "#fff" : preset.bg, color: preset.bg === "transparent" ? "#374151" : preset.text }}
                            onClick={() => { setHeaderBgColor(preset.bg); setHeaderAccentColor(preset.accent); setHeaderTextColor(preset.text); }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-[9px] text-gray-600">Custom:</Label>
                        <div className="flex items-center gap-1">
                          <label className="text-[8px] text-gray-600">BG</label>
                          <input type="color" value={headerBgColor === "transparent" ? "#ffffff" : headerBgColor} onChange={e => setHeaderBgColor(e.target.value)} className="w-5 h-5 rounded border border-white/15 cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-[8px] text-gray-600">Accent</label>
                          <input type="color" value={headerAccentColor} onChange={e => setHeaderAccentColor(e.target.value)} className="w-5 h-5 rounded border border-white/15 cursor-pointer" />
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="text-[8px] text-gray-600">Text</label>
                          <input type="color" value={headerTextColor} onChange={e => setHeaderTextColor(e.target.value)} className="w-5 h-5 rounded border border-white/15 cursor-pointer" />
                        </div>
                      </div>
                    </div>

                    {renderColumnEditor("header", headerColumns, headerColumnCount)}
                  </TabsContent>

                  <TabsContent value="footer" className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-gray-400 shrink-0">Columns:</Label>
                      {([3, 5] as const).map(c => (
                        <Button key={c} size="sm" variant={footerColumnCount === c ? "default" : "outline"}
                          className={`h-6 text-[10px] px-2.5 ${footerColumnCount === c ? "bg-amber-500 text-gray-950 font-semibold" : "border-white/15 text-gray-400 bg-white/5"}`}
                          onClick={() => handleColumnCountChange("footer", c)}>
                          {c}
                        </Button>
                      ))}
                    </div>
                    {renderColumnEditor("footer", footerColumns, footerColumnCount)}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-3 border-t border-gray-100 shrink-0 flex items-center justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-white/15 text-gray-400">
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-amber-500 text-gray-950 font-semibold hover:bg-amber-400"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
