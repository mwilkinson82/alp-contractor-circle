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
import { Download, Eye, Loader2, FileText, Type, Image as ImageIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Bold, Italic, Underline, Plus, Trash2 } from "lucide-react";

export interface PdfHeaderFooterConfig {
  headerColumns?: { position: number; content: string; customText?: string; richTextLines?: RichTextLine[]; imageDataUrl?: string }[];
  footerColumns?: { position: number; content: string; customText?: string; richTextLines?: RichTextLine[]; imageDataUrl?: string }[];
  headerColumnCount?: 3 | 5;
  footerColumnCount?: 3 | 5;
  pageSize?: "letter" | "legal" | "tabloid" | "a3" | "a1" | "archD" | "archE";
  orientation?: "landscape" | "portrait";
  showGantt?: boolean;
  showTable?: boolean; // deprecated - always false
  criticalPathOnly?: boolean;
  showLogicLines?: boolean;
  headerBgColor?: string;
  headerAccentColor?: string;
  headerTextColor?: string;
  pdfZoom?: number;
  visibleColumns?: string[];
  gridlineInterval?: "none" | "weekly" | "monthly" | "quarterly";
  timescaleLabels?: "months" | "quarters" | "both";
  headerHeightMm?: number;
  footerHeightMm?: number;
  legendPlacement?: "footer" | "inline";
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
  ancestorColors?: string[];
}

interface PdfExportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (config: PdfHeaderFooterConfig) => Promise<void>;
  isExporting: boolean;
  projectName: string;
  companyName: string;
  companyLogo: string;
  activities: Activity[];
  dataDate: Date | null;
  scheduleName: string;
  /** Pass groupedActivities when groupBy === "wbs" to show WBS headers in preview */
  groupedActivities?: WbsGroup[];
  groupBy?: string | null;
  /** All relationships for drawing logic lines */
  relationships?: Relationship[];
  magnificationZoom?: number; // 50-150 for PDF row height scaling
  visibleColumns?: string[]; // Column keys visible on the scheduler screen
  /** Actual column widths from the scheduler (key → CSS width like "200px" or "1fr") */
  appColumnWidths?: Record<string, string>;
  /** Previously saved PDF export config to restore on open */
  savedPdfConfig?: SavedPdfConfig | null;
  /** Called after export with the current config so it can be persisted */
  onConfigChange?: (config: SavedPdfConfig) => void;
  /** Annotations to overlay on the preview (same data passed to generateSchedulePdf) */
  annotations?: Array<{
    id: string;
    type: "text" | "arrow" | "shading";
    x?: number; y?: number; text?: string; fontSize?: number; color?: string; bgColor?: string;
    bold?: boolean; italic?: boolean; underline?: boolean; width?: number; height?: number;
    x1?: number; y1?: number; x2?: number; y2?: number; strokeWidth?: number; label?: string;
    lineStyle?: "solid" | "dashed" | "dotted";
    startEndpoint?: "arrow" | "circle" | "diamond" | "none";
    endEndpoint?: "arrow" | "circle" | "diamond" | "none";
    opacity?: number; pattern?: "solid" | "hatching" | "crosshatch" | "dots";
  }>;
  /** Screen-space Gantt dimensions for annotation coordinate mapping */
  ganttScreenWidth?: number;
  ganttScreenHeight?: number;
  ganttPixelsPerDay?: number;
  ganttRangeStartMs?: number;
}

export interface SavedPdfConfig {
  headerColumnCount: 3 | 5;
  footerColumnCount: 3 | 5;
  headerColumns: ColumnData[];
  footerColumns: ColumnData[];
  pageSize: string;
  orientation: string;
  showGantt: boolean;
  criticalPathOnly: boolean;
  showLogicLines: boolean;
  headerBgColor: string;
  headerAccentColor: string;
  headerTextColor: string;
  pdfZoom: number;
  gridlineInterval: string;
  timescaleLabels: string;
  headerHeightMm: number;
  footerHeightMm: number;
  legendPlacement: "footer" | "inline";
}

const CONTENT_OPTIONS = [
  { value: "company", label: "Company Name" },
  { value: "project", label: "Project Name" },
  { value: "schedule", label: "Schedule Name" },
  { value: "date", label: "Export Date" },
  { value: "datadate", label: "Data Date" },
  { value: "page", label: "Page Numbers" },
  { value: "constructline", label: "\u00A9 ConstructLine" },
  { value: "custom", label: "Custom Text (Rich)" },
  { value: "image", label: "Image / Logo" },
  { value: "empty", label: "(Empty)" },
];

// Paper sizes in inches (width x height in portrait)
const PAPER_SIZES: Record<string, { w: number; h: number; label: string }> = {
  letter:  { w: 8.5,  h: 11,   label: "Letter (8.5×11)" },
  legal:   { w: 8.5,  h: 14,   label: "Legal (8.5×14)" },
  tabloid: { w: 11,   h: 17,   label: "Tabloid (11×17)" },
  a3:      { w: 11.69, h: 16.54, label: "A3 (297×420mm)" },
  a1:      { w: 23.39, h: 33.11, label: "A1 (594×841mm)" },
  archD:   { w: 24,   h: 36,   label: "ARCH D (24×36)" },
  archE:   { w: 36,   h: 48,   label: "ARCH E (36×48)" },
};

/** A single styled line of text within a custom text cell */
export interface RichTextLine {
  text: string;
  fontSize?: number;    // 6-24pt, default 8
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;       // hex color, default inherit
}

interface ColumnData {
  position: number;
  content: string;
  customText?: string;
  richTextLines?: RichTextLine[];
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
  companyLogo,
  activities,
  dataDate,
  scheduleName,
  groupedActivities,
  groupBy,
  relationships = [],
  magnificationZoom = 100,
  visibleColumns = ["activityId", "name", "duration", "earlyStart", "earlyFinish", "totalFloat", "wbs"],
  appColumnWidths,
  savedPdfConfig,
  onConfigChange,
  annotations = [],
  ganttScreenWidth = 2000,
  ganttPixelsPerDay = 4,
  ganttRangeStartMs,
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
    { position: 1, content: "page" },
    { position: 2, content: "constructline" },
  ]);
  const [pageSize, setPageSize] = useState<"letter" | "legal" | "tabloid" | "a3" | "a1" | "archD" | "archE">("tabloid");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [showGantt, setShowGantt] = useState(true);
  const [showTable, setShowTable] = useState(false);
  const [criticalPathOnly, setCriticalPathOnly] = useState(false);
  const [showLogicLines, setShowLogicLines] = useState(false);
  const [headerBgColor, setHeaderBgColor] = useState("#0d1b2a");
  const [headerAccentColor, setHeaderAccentColor] = useState("#c9a84c");
  const [headerTextColor, setHeaderTextColor] = useState("#e2e8f0");

  // PDF zoom/fit control — independent of the scheduler magnificationZoom
  // This controls how content is scaled to fit the page
  const [pdfZoom, setPdfZoom] = useState(100); // 25-200%

  // Gridline & timescale controls
  const [gridlineInterval, setGridlineInterval] = useState<"none" | "weekly" | "monthly" | "quarterly">("monthly");
  const [timescaleLabels, setTimescaleLabels] = useState<"months" | "quarters" | "both">("months");

  // Header/footer height controls (in mm)
  const [headerHeightMm, setHeaderHeightMm] = useState(22);
  const [footerHeightMm, setFooterHeightMm] = useState(14);

  // Legend placement (footer = every page footer, inline = after last row on last page)
  const [legendPlacement, setLegendPlacement] = useState<"footer" | "inline">("footer");

  // Restore saved config when dialog opens
  const configAppliedRef = useRef(false);
  useEffect(() => {
    if (open && savedPdfConfig && !configAppliedRef.current) {
      configAppliedRef.current = true;
      setHeaderColumnCount(savedPdfConfig.headerColumnCount);
      setFooterColumnCount(savedPdfConfig.footerColumnCount);
      if (savedPdfConfig.headerColumns?.length) setHeaderColumns(savedPdfConfig.headerColumns);
      if (savedPdfConfig.footerColumns?.length) setFooterColumns(savedPdfConfig.footerColumns);
      setPageSize(savedPdfConfig.pageSize as any);
      setOrientation(savedPdfConfig.orientation as any);
      setShowGantt(savedPdfConfig.showGantt);
      setCriticalPathOnly(savedPdfConfig.criticalPathOnly);
      setShowLogicLines(savedPdfConfig.showLogicLines);
      setHeaderBgColor(savedPdfConfig.headerBgColor);
      setHeaderAccentColor(savedPdfConfig.headerAccentColor);
      setHeaderTextColor(savedPdfConfig.headerTextColor);
      setPdfZoom(savedPdfConfig.pdfZoom);
      setGridlineInterval(savedPdfConfig.gridlineInterval as any);
      setTimescaleLabels(savedPdfConfig.timescaleLabels as any);
      setHeaderHeightMm(savedPdfConfig.headerHeightMm);
      setFooterHeightMm(savedPdfConfig.footerHeightMm);
      if (savedPdfConfig.legendPlacement) setLegendPlacement(savedPdfConfig.legendPlacement);
    }
    if (!open) configAppliedRef.current = false;
  }, [open, savedPdfConfig]);

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

  // Auto-populate image columns with company logo if available
  useEffect(() => {
    if (open && companyLogo) {
      const autoPopulate = (cols: ColumnData[], setter: React.Dispatch<React.SetStateAction<ColumnData[]>>) => {
        let changed = false;
        const updated = cols.map((col, idx) => {
          if (col.content === "image" && !col.imageDataUrl) {
            changed = true;
            // Load the image into cache
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              loadedImagesRef.current[`header-${idx}`] = img;
              loadedImagesRef.current[`footer-${idx}`] = img;
              setCanvasReady(false);
              setTimeout(() => setCanvasReady(true), 50);
            };
            img.src = companyLogo;
            return { ...col, imageDataUrl: companyLogo };
          }
          return col;
        });
        if (changed) setter(updated);
      };
      autoPopulate(headerColumns, setHeaderColumns);
      autoPopulate(footerColumns, setFooterColumns);
    }
  }, [open, companyLogo]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Rich text line helpers ──
  const handleAddRichLine = (type: "header" | "footer", colIdx: number) => {
    const setter = type === "header" ? setHeaderColumns : setFooterColumns;
    const current = type === "header" ? [...headerColumns] : [...footerColumns];
    const lines = [...(current[colIdx].richTextLines || []), { text: "", fontSize: 8, bold: false, italic: false, underline: false, color: "#374151" }];
    current[colIdx] = { ...current[colIdx], richTextLines: lines };
    setter(current);
  };

  const handleRemoveRichLine = (type: "header" | "footer", colIdx: number, lineIdx: number) => {
    const setter = type === "header" ? setHeaderColumns : setFooterColumns;
    const current = type === "header" ? [...headerColumns] : [...footerColumns];
    const lines = [...(current[colIdx].richTextLines || [])];
    lines.splice(lineIdx, 1);
    current[colIdx] = { ...current[colIdx], richTextLines: lines };
    setter(current);
  };

  const handleUpdateRichLine = (type: "header" | "footer", colIdx: number, lineIdx: number, updates: Partial<RichTextLine>) => {
    const setter = type === "header" ? setHeaderColumns : setFooterColumns;
    const current = type === "header" ? [...headerColumns] : [...footerColumns];
    const lines = [...(current[colIdx].richTextLines || [])];
    lines[lineIdx] = { ...lines[lineIdx], ...updates };
    current[colIdx] = { ...current[colIdx], richTextLines: lines };
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
      case "constructline": return "\u00A9 ConstructLine";
      case "custom": {
        if (col.richTextLines && col.richTextLines.length > 0) {
          return col.richTextLines.map(l => l.text).filter(Boolean).join(" | ") || "Custom Text";
        }
        return col.customText || "Custom Text";
      }
      case "image": return "[Image]";
      case "empty": return "";
      default: return "";
    }
  }, [companyName, projectName, scheduleName, dataDate]);

  // Build the ordered list of preview rows (WBS group headers + activities)
  const previewRows = useMemo(() => {
    type PreviewRow =
      | { type: "group"; label: string; depth: number; bgColor?: string; textColor?: string; groupActivities?: Activity[]; ancestorColors?: string[] }
      | { type: "activity"; act: Activity; ancestorColors?: string[] };

    const rows: PreviewRow[] = [];
    const useWbs = groupBy === "wbs" && groupedActivities && groupedActivities.length > 0;

    if (useWbs) {
      for (const g of groupedActivities!) {
        const gActs = criticalPathOnly ? g.activities.filter(a => a.isCritical) : g.activities;
        if (g.group && gActs.length > 0) {
          rows.push({ type: "group", label: g.group, depth: g.depth, bgColor: g.wbsColor, textColor: g.wbsTextColor, groupActivities: gActs, ancestorColors: g.ancestorColors });
        }
        for (const act of gActs) {
          rows.push({ type: "activity", act, ancestorColors: g.ancestorColors });
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
  type PreviewRow = { type: "group"; label: string; depth: number; bgColor?: string; textColor?: string; groupActivities?: Activity[]; ancestorColors?: string[] } | { type: "activity"; act: Activity; ancestorColors?: string[] };
  // Combined zoom: magnificationZoom from the scheduler * pdfZoom from the PDF preview controls
  const zoomScale = (magnificationZoom / 100) * (pdfZoom / 100);
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
    const headerH = (headerHeightMm / 25.4) * ppi;
    const footerH = (footerHeightMm / 25.4) * ppi;
    const contentH = canvasDims.height - margin * 2 - headerH - footerH - 12;
    // baseFontSize scales with zoom so text stays proportional to row heights
    const baseFontSize = Math.max(4, Math.min(10, ppi * 0.08 * zoomScale));
    // Column-header row height also scales with zoom
    const headerRowH = (getActivityRowHeight(false) / 96) * ppi * zoomScale;
    return { ppi, margin, headerH, footerH, contentH, baseFontSize, headerRowH };
  }, [canvasDims, paperDims, zoomScale, headerHeightMm, footerHeightMm]);

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
    allPages: (typeof previewRows)[] = [],
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
          let imgW = (img.width / img.height) * imgH;
          // Clamp image width to slot width
          const maxHdrSlotW = hColW - 8;
          const finalImgW = Math.min(imgW, maxHdrSlotW);
          const finalImgH = finalImgW === imgW ? imgH : (finalImgW / imgW) * imgH;
          const ix = i === 0 ? margin + 4 : i === headerColumnCount - 1 ? margin + i * hColW + hColW - finalImgW - 4 : margin + i * hColW + (hColW - finalImgW) / 2;
          const iy = margin + (headerH - finalImgH) / 2;
          ctx.drawImage(img, ix, iy, finalImgW, finalImgH);
        }
        return;
      }
      // Rich text lines rendering for header
      if (col.content === "custom" && col.richTextLines && col.richTextLines.length > 0) {
        const lines = col.richTextLines;
        const align: CanvasTextAlign = i === 0 ? "left" : i === headerColumnCount - 1 ? "right" : "center";
        const tx = i === 0 ? margin + 8 : i === headerColumnCount - 1 ? margin + i * hColW + hColW - 8 : margin + i * hColW + hColW / 2;
        // Calculate total height using SCALED font sizes (same scale as rendering)
        const lineGap = 2;
        const scaledSizes = lines.map((l: any) => (l.fontSize || 8) * (baseFontSize / 8) * 0.9);
        const totalH = scaledSizes.reduce((s: number, fs: number) => s + fs * 1.2, 0) + (lines.length - 1) * lineGap;
        let curY = margin + (headerH - totalH) / 2;
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li];
          const fs = scaledSizes[li];
          const weight = line.bold ? "bold" : "normal";
          const style = line.italic ? "italic" : "normal";
          ctx.font = `${style} ${weight} ${fs}px 'DM Sans', sans-serif`;
          ctx.fillStyle = line.color || headerTextColor;
          ctx.textAlign = align;
          ctx.textBaseline = "top";
          ctx.fillText(line.text || "", tx, curY);
          if (line.underline && line.text) {
            const tw = ctx.measureText(line.text).width;
            let ulX = tx;
            if (align === "center") ulX = tx - tw / 2;
            else if (align === "right") ulX = tx - tw;
            ctx.strokeStyle = line.color || headerTextColor;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(ulX, curY + fs + 1);
            ctx.lineTo(ulX + tw, curY + fs + 1);
            ctx.stroke();
          }
          curY += fs * 1.2 + lineGap;
        }
        return;
      }
      const text = getContentPreview(col, pageNum, numPages);
      ctx.fillStyle = i === 0 ? headerAccentColor : headerTextColor;
      ctx.font = i === 0 ? `bold ${headerFontSize}px 'DM Sans', sans-serif` : `${headerFontSize * 0.9}px 'DM Sans', sans-serif`;
      ctx.textAlign = i === 0 ? "left" : i === headerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 8 : i === headerColumnCount - 1 ? margin + i * hColW + hColW - 8 : margin + i * hColW + hColW / 2;
      ctx.textBaseline = "middle";
      ctx.fillText(text, tx, margin + headerH / 2);
    });

    // ── Column definitions for dynamic table ──
    const colDefs: Record<string, { header: string; minFrac: number; grow: boolean; getValue: (act: Activity) => string }> = {
      activityId: { header: "ID", minFrac: 0.10, grow: false, getValue: (a) => a.activityId || "" },
      name: { header: "Activity Name", minFrac: 0.30, grow: true, getValue: (a) => a.name || "" },
      duration: { header: "Dur", minFrac: 0.06, grow: false, getValue: (a) => `${a.duration}d` },
      percentComplete: { header: "%", minFrac: 0.05, grow: false, getValue: (a) => `${Math.round(parseFloat(String((a as any).percentComplete)) || 0)}%` },
      earlyStart: { header: "ES", minFrac: 0.09, grow: false, getValue: (a) => a.earlyStart ? new Date(a.earlyStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      earlyFinish: { header: "EF", minFrac: 0.09, grow: false, getValue: (a) => a.earlyFinish ? new Date(a.earlyFinish).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      lateStart: { header: "LS", minFrac: 0.09, grow: false, getValue: (a) => (a as any).lateStart ? new Date((a as any).lateStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      lateFinish: { header: "LF", minFrac: 0.09, grow: false, getValue: (a) => (a as any).lateFinish ? new Date((a as any).lateFinish).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      totalFloat: { header: "TF", minFrac: 0.05, grow: false, getValue: (a) => (a as any).totalFloat != null ? `${(a as any).totalFloat}d` : "\u2014" },
      freeFloat: { header: "FF", minFrac: 0.05, grow: false, getValue: (a) => (a as any).freeFloat != null ? `${(a as any).freeFloat}d` : "\u2014" },
      wbs: { header: "WBS", minFrac: 0.07, grow: false, getValue: (a) => (a as any).wbs || "\u2014" },
    };
    const activeColKeys = visibleColumns.filter(k => colDefs[k]);
    const activeCols = activeColKeys.map(k => colDefs[k]);

    // ── Content area — dynamic table width based on column count ──
    const usableW = w - margin * 2;
    const numCols = activeColKeys.length;
    const tableShare = !showGantt ? 1.0 : numCols <= 4 ? 0.30 : numCols <= 6 ? 0.38 : numCols <= 8 ? 0.45 : numCols <= 10 ? 0.50 : 0.55;
    const tableW = usableW * tableShare;
    const ganttX = margin + tableW + 4;
    const ganttW = usableW - tableW - 4;

    // Compute column pixel widths using app proportions when available
    let colWidths: number[];
    if (appColumnWidths && Object.keys(appColumnWidths).length > 0) {
      // Parse app column widths to get pixel proportions
      const appWidths = activeColKeys.map(key => {
        const cssVal = appColumnWidths[key];
        if (!cssVal) return 50;
        const pxMatch = cssVal.match(/(\d+)/);
        if (pxMatch) return parseInt(pxMatch[1]);
        if (cssVal.includes('fr')) return 400;
        return 50;
      });
      const totalAppPx = appWidths.reduce((s, w) => s + w, 0);
      colWidths = appWidths.map(w => (w / totalAppPx) * tableW);
    } else {
      // Fallback: use fraction-based widths
      const totalMinFrac = activeCols.reduce((s, c) => s + c.minFrac, 0);
      const growCount = activeCols.filter(c => c.grow).length;
      const extraFrac = Math.max(0, 1 - totalMinFrac);
      colWidths = activeCols.map(c => {
        let frac = c.minFrac;
        if (c.grow && growCount > 0 && extraFrac > 0) frac += extraFrac / growCount;
        return frac * tableW;
      });
    }

    // Table header
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(margin, contentY, tableW, rowH);
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.strokeRect(margin, contentY, tableW, rowH);
    ctx.fillStyle = "#475569";
    ctx.font = `bold ${baseFontSize}px 'DM Sans', sans-serif`;
    ctx.textBaseline = "middle";
    let colX = margin;
    for (let ci = 0; ci < activeCols.length; ci++) {
      ctx.textAlign = ci === 0 || activeCols[ci].header === "Activity Name" ? "left" : "center";
      const tx = ci === 0 || activeCols[ci].header === "Activity Name" ? colX + 3 : colX + colWidths[ci] / 2;
      ctx.fillText(activeCols[ci].header, tx, contentY + rowH / 2);
      colX += colWidths[ci];
    }

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
        // Use WBS Manager color if set, otherwise fallback to depth-based palette
        if (row.bgColor) {
          ctx.fillStyle = row.bgColor + "25"; // 15% opacity tint of the WBS color
          ctx.fillRect(margin, ry, tableW, rh);
        } else {
          const WBS_PREVIEW_BG = ["#e6ebf0", "#eef0eb", "#f0eeeb", "#ebeff2", "#f0ecf0", "#f0f0eb"];
          ctx.fillStyle = WBS_PREVIEW_BG[depth % WBS_PREVIEW_BG.length];
          ctx.fillRect(margin, ry, tableW, rh);
        }
        // P6-style colored left bars — one per ancestor level
        const anc = row.ancestorColors || [];
        const barW = 3; // px width per bar
        const barGap = 1; // px gap between bars
        for (let ai = 0; ai < anc.length; ai++) {
          ctx.fillStyle = anc[ai];
          ctx.fillRect(margin + ai * (barW + barGap), ry, barW, rh);
        }
        const leftBarsWidth = anc.length > 0 ? anc.length * (barW + barGap) + 3 : 0;
        // Bold black text
        ctx.fillStyle = "#141414";
        ctx.font = `bold ${depth === 0 ? baseFontSize * 1.2 : depth === 1 ? baseFontSize * 1.1 : baseFontSize}px 'DM Sans', sans-serif`;
        ctx.textAlign = "left";
        const groupLabel = row.label.length > 50 ? row.label.slice(0, 50) + "…" : row.label;
        ctx.fillText(groupLabel, margin + 4 + leftBarsWidth, ry + rh / 2);
        ctx.strokeStyle = "#c8c8c8";
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
      // P6-style colored left bars on activity rows
      const actAnc = row.ancestorColors || [];
      const actBarW = 3; // px width per bar
      const actBarGap = 1; // px gap between bars
      for (let ai = 0; ai < actAnc.length; ai++) {
        ctx.fillStyle = actAnc[ai];
        ctx.fillRect(margin + ai * (actBarW + actBarGap), ry, actBarW, rh);
      }
      // Calculate depth bars width to offset first column text
      const actLeftBarsWidth = actAnc.length > 0 ? actAnc.length * (actBarW + actBarGap) + 2 : 0;
      ctx.fillStyle = act.isCritical ? "#dc2626" : "#334155";
      ctx.font = `${baseFontSize}px 'DM Sans', sans-serif`;
      ctx.textBaseline = "middle";
      let cellX = margin;
      for (let ci = 0; ci < activeCols.length; ci++) {
        const col = activeCols[ci];
        const cw = colWidths[ci];
        ctx.textAlign = ci === 0 || col.header === "Activity Name" ? "left" : "center";
        let val = col.getValue(act);
        // For the first column (ID), offset text past the depth bars
        const textOffset = ci === 0 ? actLeftBarsWidth : 0;
        // Truncate if too wide
        if (col.header === "Activity Name") {
          const maxChars = Math.floor((cw - textOffset) / (baseFontSize * 0.55));
          if (val.length > maxChars) val = val.slice(0, maxChars) + "\u2026";
        }
        const tx = ci === 0 || col.header === "Activity Name" ? cellX + 3 + textOffset : cellX + cw / 2;
        ctx.fillText(val, tx, ry + rh / 2);
        cellX += cw;
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

      // Configurable gridlines and timescale labels
      if (minDate !== Infinity) {
        const startD = new Date(minDate);
        const endD = new Date(maxDate);
        startD.setDate(1);

        // Draw timescale header background
        ctx.fillStyle = "#ebeef2";
        ctx.fillRect(ganttX, contentY, ganttW, rowH);

        const cur = new Date(startD);
        while (cur <= endD) {
          const monthStart = cur.getTime();
          const nextMonth = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          const boundaryPct = (monthStart - minDate) / dateRange;
          const bx = ganttX + 4 + boundaryPct * (ganttW - 8);
          const isQuarterBoundary = cur.getMonth() % 3 === 0;

          // Gridlines based on interval setting
          if (gridlineInterval !== "none" && bx > ganttX && bx < ganttX + ganttW) {
            if (gridlineInterval === "monthly" || (gridlineInterval === "quarterly" && isQuarterBoundary)) {
              ctx.strokeStyle = gridlineInterval === "quarterly" && isQuarterBoundary ? "#c8c8c8" : "#e0e0e0";
              ctx.lineWidth = gridlineInterval === "quarterly" && isQuarterBoundary ? 0.5 : 0.3;
              ctx.beginPath();
              ctx.moveTo(bx, contentY + rowH);
              ctx.lineTo(bx, contentY + contentH);
              ctx.stroke();
            }
          }

          // Weekly sub-gridlines
          if (gridlineInterval === "weekly") {
            const weekDate = new Date(cur);
            weekDate.setDate(weekDate.getDate() + 7);
            while (weekDate < nextMonth && weekDate <= endD) {
              const wPct = (weekDate.getTime() - minDate) / dateRange;
              const wx = ganttX + 4 + wPct * (ganttW - 8);
              if (wx > ganttX && wx < ganttX + ganttW) {
                ctx.strokeStyle = "#eeeeee";
                ctx.lineWidth = 0.2;
                ctx.beginPath();
                ctx.moveTo(wx, contentY + rowH);
                ctx.lineTo(wx, contentY + contentH);
                ctx.stroke();
              }
              weekDate.setDate(weekDate.getDate() + 7);
            }
          }

          // Labels
          if (bx > ganttX && bx < ganttX + ganttW) {
            ctx.fillStyle = "#4a4f55";
            ctx.font = `bold ${tsFont}px 'DM Sans', sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const shortMonth = cur.toLocaleDateString("en-US", { month: "short" });
            const yr = cur.getFullYear().toString().slice(-2);
            if (timescaleLabels === "months" || timescaleLabels === "both") {
              ctx.fillText(`${shortMonth} '${yr}`, bx + 2, contentY + rowH / 2);
            }
            if (timescaleLabels === "quarters" && isQuarterBoundary) {
              const qNum = Math.floor(cur.getMonth() / 3) + 1;
              ctx.fillText(`Q${qNum} '${yr}`, bx + 2, contentY + rowH / 2);
            }
            if (timescaleLabels === "both" && isQuarterBoundary) {
              const qNum = Math.floor(cur.getMonth() / 3) + 1;
              ctx.font = `${tsFont * 0.85}px 'DM Sans', sans-serif`;
              ctx.fillText(`Q${qNum}`, bx + 2, contentY + rowH * 0.25);
            }
          }

          cur.setMonth(cur.getMonth() + 1);
        }
      }

      // Track bar positions for logic lines (activityId → bar positions)
      const barPositions = new Map<string, BarPos>();

      // ── CLIP: All Gantt drawing clipped to the Gantt column boundary ──
      ctx.save();
      ctx.beginPath();
      ctx.rect(ganttX, contentY, ganttW, contentH);
      ctx.clip();

      // Draw bars — use same rowYOffsets from table section for alignment
      for (let i = 0; i < pageRows.length; i++) {
        const row = pageRows[i];
        const ry = rowYOffsets[i];
        const rh = getRowHeightPdf(row, ppi);
        if (ry + rh > contentY + contentH - 4) break;

        if (row.type === "group") {
          // Use WBS Manager color if set, otherwise fallback to depth-based palette
          if (row.bgColor) {
            ctx.fillStyle = row.bgColor + "30"; // 19% opacity tint
            ctx.fillRect(ganttX, ry, ganttW, rh);
          } else {
            const WBS_GANTT_BG = ["#b4dc8c", "#fff082", "#f0968c", "#e6aadC", "#b4c8f0", "#ffd296"];
            ctx.fillStyle = WBS_GANTT_BG[row.depth % WBS_GANTT_BG.length];
            ctx.fillRect(ganttX, ry, ganttW, rh);
          }

          // ── WBS Summary Bar (thinner, P6-style) ──
          const childActs = row.groupActivities || [];
          let summaryStart = Infinity;
          let summaryEnd = -Infinity;
          for (const child of childActs) {
            if (child.earlyStart) summaryStart = Math.min(summaryStart, new Date(child.earlyStart).getTime());
            if (child.earlyFinish) summaryEnd = Math.max(summaryEnd, new Date(child.earlyFinish).getTime());
          }
          if (summaryStart < Infinity && summaryEnd > -Infinity && minDate !== Infinity) {
            const sPct = (summaryStart - minDate) / dateRange;
            const ePct = (summaryEnd - minDate) / dateRange;
            const sbx = ganttX + 4 + sPct * (ganttW - 8);
            const sbw = Math.max(4, (ePct - sPct) * (ganttW - 8));
            const sbh = Math.max(2, rh * 0.15);
            const sby = ry + rh / 2 - sbh / 2;
            // Summary bar — use WBS color if set, otherwise dark
            ctx.fillStyle = row.bgColor || "#282828";
            ctx.fillRect(sbx, sby, sbw, sbh);
            // Start bracket (downward tick)
            const tickW = Math.max(1, sbh * 0.25);
            const tickH = sbh + Math.max(1.5, sbh * 0.4);
            ctx.fillRect(sbx, sby, tickW, tickH);
            // End bracket (downward tick)
            ctx.fillRect(sbx + sbw - tickW, sby, tickW, tickH);
            // Diamond at end
            const dx = sbx + sbw;
            const dy = sby + sbh / 2;
            const ds = Math.max(1.5, sbh * 0.3);
            ctx.beginPath();
            ctx.moveTo(dx, dy - ds);
            ctx.lineTo(dx + ds, dy);
            ctx.lineTo(dx, dy + ds);
            ctx.lineTo(dx - ds, dy);
            ctx.closePath();
            ctx.fill();
          }
          continue;
        }

        const act = row.act;
        if (!act.earlyStart || !act.earlyFinish) continue;

        const startPct = (new Date(act.earlyStart).getTime() - minDate) / dateRange;
        const endPct = (new Date(act.earlyFinish).getTime() - minDate) / dateRange;
        const bx = ganttX + 4 + startPct * (ganttW - 8);
        const bw = Math.max(3, (endPct - startPct) * (ganttW - 8));
        const bh = rh * 0.38;
        const by = ry + (rh - bh) / 2;

        // Store position for logic lines
        barPositions.set(act.activityId, { x1: bx, x2: bx + bw, yMid: ry + rh / 2 });

        if (act.duration === 0) {
          // Milestone diamond — smaller, professional P6-style
          const cx = bx;
          const cy = by + bh / 2;
          const s = Math.min(3, bh * 0.45);
          ctx.fillStyle = act.barColor || "#eab308";
          ctx.beginPath();
          ctx.moveTo(cx, cy - s);
          ctx.lineTo(cx + s, cy);
          ctx.lineTo(cx, cy + s);
          ctx.lineTo(cx - s, cy);
          ctx.closePath();
          ctx.fill();
          // Milestone label
          const mlFont = Math.max(5, baseFontSize * 0.95);
          ctx.font = `${mlFont}px 'DM Sans', sans-serif`;
          ctx.fillStyle = "#1e293b";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(act.name, cx + s + 3, cy);
        } else {
          // Flat sharp rectangle bar (P6-style, no rounded corners)
          ctx.fillStyle = act.barColor || (act.isCritical ? "#ef4444" : "#22c55e");
          ctx.fillRect(bx, by, bw, bh);
          // Activity name label
          const barFont = Math.max(5, baseFontSize * 0.95);
          ctx.font = `${barFont}px 'DM Sans', sans-serif`;
          ctx.textBaseline = "middle";
          const labelY = ry + rh / 2;
          ctx.fillStyle = "#1e293b";
          ctx.textAlign = "left";
          ctx.fillText(act.name, bx + bw + 3, labelY);
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

      // ── Annotations overlay ──
      if (annotations && annotations.length > 0 && ganttPixelsPerDay > 0) {
        // Convert screen-pixel X to canvas X using date-based mapping
        // Screen X = (dateMs - ganttRangeStartMs) / msPerDay * ganttPixelsPerDay
        // Canvas X = ganttX + 4 + ((dateMs - minDate) / dateRange) * (ganttW - 8)
        const effectiveRangeStartMs = ganttRangeStartMs ?? minDate;
        const msPerDay = 86400000;
        const screenXToCanvasX = (sx: number): number => {
          const dateMs = effectiveRangeStartMs + (sx / ganttPixelsPerDay) * msPerDay;
          return ganttX + 4 + ((dateMs - minDate) / dateRange) * (ganttW - 8);
        };
        // Screen Y: annotations are positioned relative to the gantt scroll area
        // rowYOffsets[i] gives canvas Y for row i; we map screen Y by finding which row it falls in
        const SCREEN_ROW_H = 32; // approximate screen row height
        const SCREEN_HEADER_H = 40; // approximate gantt header height
        // Calculate the screen Y offset for this page (sum of all rows on previous pages)
        const pageScreenYOffset = (pageNum - 1 > 0)
          ? allPages.slice(0, pageNum - 1).reduce((sum, pg) => sum + pg.length * SCREEN_ROW_H, 0)
          : 0;
        const pageScreenYEnd = pageScreenYOffset + pageRows.length * SCREEN_ROW_H;
        const screenYToCanvasY = (sy: number): number => {
          // Each row has a known height in screen pixels (BASE_ROW_HEIGHT ~32px)
          // Map proportionally to canvas row heights
          const screenContentY = sy - SCREEN_HEADER_H - pageScreenYOffset;
          if (rowYOffsets.length === 0) return contentY + rowH;
          // Find which row this Y falls in
          let accumulated = 0;
          for (let ri = 0; ri < pageRows.length; ri++) {
            const screenRH = SCREEN_ROW_H;
            if (screenContentY <= accumulated + screenRH) {
              const fraction = Math.max(0, screenContentY - accumulated) / screenRH;
              const rh = getRowHeightPdf(pageRows[ri], ppi);
              return rowYOffsets[ri] + fraction * rh;
            }
            accumulated += screenRH;
          }
          return rowYOffsets[rowYOffsets.length - 1] + getRowHeightPdf(pageRows[pageRows.length - 1], ppi);
        };
        const screenWToCanvasW = (sw: number): number => {
          return (sw / ganttScreenWidth) * ganttW;
        };
        // Helper: check if an annotation Y coordinate falls on this page
        const annYOnThisPage = (sy: number): boolean => {
          const absY = sy - SCREEN_HEADER_H;
          return absY >= pageScreenYOffset && absY < pageScreenYEnd;
        };
        ctx.save();
        ctx.beginPath();
        ctx.rect(ganttX, contentY, ganttW, contentH);
        ctx.clip();
        for (const ann of annotations) {
          // Skip annotations whose primary Y coordinate is not on this page
          const primaryY = ann.type === 'arrow' ? ann.y1 : ann.y;
          if (primaryY != null && !annYOnThisPage(primaryY)) continue;
          if (ann.type === "shading" && ann.x != null && ann.y != null && ann.width && ann.height) {
            const cx = screenXToCanvasX(ann.x);
            const cy = screenYToCanvasY(ann.y);
            const cw = screenWToCanvasW(ann.width);
            const ch = (ann.height / 32) * (rowYOffsets.length > 0 ? getRowHeightPdf(pageRows[0], ppi) : 20);
            const rgb = (hex: string) => { const h = hex.replace('#',''); return [parseInt(h.slice(0,2),16)||0, parseInt(h.slice(2,4),16)||0, parseInt(h.slice(4,6),16)||0]; };
            const [r,g,b] = rgb(ann.color || "#3b82f6");
            ctx.globalAlpha = ann.opacity ?? 0.15;
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(cx, cy, cw, ch);
            ctx.globalAlpha = 1;
          } else if (ann.type === "text" && ann.x != null && ann.y != null && ann.text) {
            const cx = screenXToCanvasX(ann.x);
            const cy = screenYToCanvasY(ann.y);
            const cw = ann.width ? screenWToCanvasW(ann.width) : 120;
            const fs = Math.max(5, (ann.fontSize || 12) * (ppi / 96));
            const weight = ann.bold ? "bold" : "normal";
            const style = ann.italic ? "italic" : "normal";
            if (ann.bgColor && ann.bgColor !== "transparent") {
              ctx.fillStyle = ann.bgColor;
              ctx.fillRect(cx, cy, cw, fs * 1.6);
            }
            ctx.font = `${style} ${weight} ${fs}px 'DM Sans', sans-serif`;
            ctx.fillStyle = ann.color || "#1e293b";
            ctx.textBaseline = "top";
            ctx.textAlign = "left";
            ctx.fillText(ann.text, cx + 2, cy + 2, cw - 4);
          } else if (ann.type === "arrow" && ann.x1 != null && ann.y1 != null && ann.x2 != null && ann.y2 != null) {
            const cx1 = screenXToCanvasX(ann.x1);
            const cy1 = screenYToCanvasY(ann.y1);
            const cx2 = screenXToCanvasX(ann.x2);
            const cy2 = screenYToCanvasY(ann.y2);
            ctx.strokeStyle = ann.color || "#ef4444";
            ctx.lineWidth = Math.max(0.5, (ann.strokeWidth || 2) * (ppi / 96));
            if (ann.lineStyle === "dashed") ctx.setLineDash([4, 3]);
            else if (ann.lineStyle === "dotted") ctx.setLineDash([1, 3]);
            else ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(cx1, cy1);
            ctx.lineTo(cx2, cy2);
            ctx.stroke();
            // Arrowhead at end
            if (!ann.endEndpoint || ann.endEndpoint === "arrow") {
              const angle = Math.atan2(cy2 - cy1, cx2 - cx1);
              const as = 4;
              ctx.fillStyle = ann.color || "#ef4444";
              ctx.beginPath();
              ctx.moveTo(cx2, cy2);
              ctx.lineTo(cx2 - as * Math.cos(angle - Math.PI / 6), cy2 - as * Math.sin(angle - Math.PI / 6));
              ctx.lineTo(cx2 - as * Math.cos(angle + Math.PI / 6), cy2 - as * Math.sin(angle + Math.PI / 6));
              ctx.closePath();
              ctx.fill();
            }
            ctx.setLineDash([]);
          }
        }
        ctx.restore();
      }

      // ── END CLIP: Restore canvas state after Gantt drawing ──
      ctx.restore();
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
          // Clamp image width to slot width
          const maxSlotW = fColW - 8;
          const finalW = Math.min(imgW, maxSlotW);
          const finalH = finalW === imgW ? imgH : (finalW / imgW) * imgH;
          const ix = i === 0 ? margin + 4 : i === footerColumnCount - 1 ? margin + i * fColW + fColW - finalW - 4 : margin + i * fColW + (fColW - finalW) / 2;
          const iy = footerY + (footerH - finalH) / 2;
          ctx.drawImage(img, ix, iy, finalW, finalH);
        }
        return;
      }
      // Rich text lines rendering
      if (col.content === "custom" && col.richTextLines && col.richTextLines.length > 0) {
        const lines = col.richTextLines;
        const align: CanvasTextAlign = i === 0 ? "left" : i === footerColumnCount - 1 ? "right" : "center";
        const tx = i === 0 ? margin + 4 : i === footerColumnCount - 1 ? w - margin - 4 : margin + i * fColW + fColW / 2;
        // Calculate total height using SCALED font sizes (same scale as rendering)
        const lineGap = 2;
        const scaledSizes = lines.map((l: any) => (l.fontSize || 8) * (baseFontSize / 8) * 0.9);
        const totalH = scaledSizes.reduce((s: number, fs: number) => s + fs * 1.2, 0) + (lines.length - 1) * lineGap;
        let curY = footerY + (footerH - totalH) / 2;
        for (let li = 0; li < lines.length; li++) {
          const line = lines[li];
          const fs = scaledSizes[li];
          const weight = line.bold ? "bold" : "normal";
          const style = line.italic ? "italic" : "normal";
          ctx.font = `${style} ${weight} ${fs}px 'DM Sans', sans-serif`;
          ctx.fillStyle = line.color || "#64748b";
          ctx.textAlign = align;
          ctx.textBaseline = "top";
          ctx.fillText(line.text || "", tx, curY);
          if (line.underline && line.text) {
            const tw = ctx.measureText(line.text).width;
            let ulX = tx;
            if (align === "center") ulX = tx - tw / 2;
            else if (align === "right") ulX = tx - tw;
            ctx.strokeStyle = line.color || "#64748b";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(ulX, curY + fs + 1);
            ctx.lineTo(ulX + tw, curY + fs + 1);
            ctx.stroke();
          }
          curY += fs * 1.2 + lineGap;
        }
        return;
      }
      const text = getContentPreview(col, pageNum, numPages);
      ctx.fillStyle = "#64748b";
      ctx.textAlign = i === 0 ? "left" : i === footerColumnCount - 1 ? "right" : "center";
      const tx = i === 0 ? margin + 4 : i === footerColumnCount - 1 ? w - margin - 4 : margin + i * fColW + fColW / 2;
      ctx.textBaseline = "middle";
      ctx.fillText(text, tx, footerY + footerH / 2);
    });
  }, [
    canvasDims, paperDims, rowsPerPage, headerColumns, footerColumns, headerColumnCount, footerColumnCount,
    showGantt, showLogicLines, previewRows, companyName, projectName, scheduleName, dataDate,
    getContentPreview, headerBgColor, headerAccentColor, headerTextColor, relationships, dbIdToActivityId,
    getRowHeightPdf, gridlineInterval, timescaleLabels, headerHeightMm, footerHeightMm,
    annotations, ganttPixelsPerDay, ganttScreenWidth, ganttRangeStartMs,
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
          drawPage(canvas, pageRows, idx + 1, numPages, pages);
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
      pdfZoom,
      visibleColumns,
      gridlineInterval,
      timescaleLabels,
      headerHeightMm,
      footerHeightMm,
      legendPlacement,
    });
    // Persist the current config so it's restored next time
    onConfigChange?.({
      headerColumnCount,
      footerColumnCount,
      headerColumns,
      footerColumns,
      pageSize,
      orientation,
      showGantt,
      criticalPathOnly,
      showLogicLines,
      headerBgColor,
      headerAccentColor,
      headerTextColor,
      pdfZoom,
      gridlineInterval,
      timescaleLabels,
      headerHeightMm,
      footerHeightMm,
      legendPlacement,
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
            <div className="mt-1 space-y-1 border border-white/10 rounded p-1.5 bg-white/[0.02]">
              {(col.richTextLines || []).map((line, li) => (
                <div key={li} className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <Input
                      value={line.text}
                      onChange={(e) => handleUpdateRichLine(type, idx, li, { text: e.target.value })}
                      placeholder={`Line ${li + 1}...`}
                      className="flex-1 h-6 text-[10px] border-white/10 bg-white/5"
                    />
                    <button
                      onClick={() => handleRemoveRichLine(type, idx, li)}
                      className="p-0.5 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5 flex-wrap">
                    <button
                      onClick={() => handleUpdateRichLine(type, idx, li, { bold: !line.bold })}
                      className={`p-0.5 rounded text-[9px] ${line.bold ? "bg-amber-500/30 text-amber-300" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      <Bold className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleUpdateRichLine(type, idx, li, { italic: !line.italic })}
                      className={`p-0.5 rounded text-[9px] ${line.italic ? "bg-amber-500/30 text-amber-300" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      <Italic className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleUpdateRichLine(type, idx, li, { underline: !line.underline })}
                      className={`p-0.5 rounded text-[9px] ${line.underline ? "bg-amber-500/30 text-amber-300" : "text-gray-500 hover:text-gray-300"}`}
                    >
                      <Underline className="w-3 h-3" />
                    </button>
                    <select
                      value={line.fontSize || 8}
                      onChange={(e) => handleUpdateRichLine(type, idx, li, { fontSize: Number(e.target.value) })}
                      className="h-4 text-[8px] bg-white/5 border border-white/10 rounded text-gray-300 px-0.5"
                    >
                      {[6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map(s => (
                        <option key={s} value={s}>{s}pt</option>
                      ))}
                    </select>
                    <input
                      type="color"
                      value={line.color || "#374151"}
                      onChange={(e) => handleUpdateRichLine(type, idx, li, { color: e.target.value })}
                      className="w-4 h-4 rounded border border-white/10 cursor-pointer"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => handleAddRichLine(type, idx)}
                className="flex items-center gap-1 text-[9px] text-amber-400 hover:text-amber-300 mt-0.5"
              >
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>
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
                      <SelectItem value="a3" className="text-xs">A3 (297×420mm)</SelectItem>
                      <SelectItem value="a1" className="text-xs">A1 (594×841mm)</SelectItem>
                      <SelectItem value="archD" className="text-xs">ARCH D (24×36)</SelectItem>
                      <SelectItem value="archE" className="text-xs">ARCH E (36×48)</SelectItem>
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
                <div className="pt-1">
                  <Label className="text-[10px] text-gray-400 mb-0.5 block">Legend Placement</Label>
                  <Select value={legendPlacement} onValueChange={(v) => setLegendPlacement(v as "footer" | "inline")}>
                    <SelectTrigger className="border-white/15 text-xs bg-white/5 text-gray-200 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="footer" className="text-xs">Footer (every page)</SelectItem>
                      <SelectItem value="inline" className="text-xs">Inline (last page only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Gridline & Timescale Controls */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-2">
                <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Gridlines & Timescale</Label>
                <div>
                  <Label className="text-[10px] text-gray-400 mb-0.5 block">Gridline Interval</Label>
                  <Select value={gridlineInterval} onValueChange={(v) => setGridlineInterval(v as any)}>
                    <SelectTrigger className="border-white/15 text-xs bg-white/5 text-gray-200 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">None</SelectItem>
                      <SelectItem value="weekly" className="text-xs">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-xs">Monthly</SelectItem>
                      <SelectItem value="quarterly" className="text-xs">Quarterly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-400 mb-0.5 block">Timescale Labels</Label>
                  <Select value={timescaleLabels} onValueChange={(v) => setTimescaleLabels(v as any)}>
                    <SelectTrigger className="border-white/15 text-xs bg-white/5 text-gray-200 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="months" className="text-xs">Months</SelectItem>
                      <SelectItem value="quarters" className="text-xs">Quarters</SelectItem>
                      <SelectItem value="both" className="text-xs">Both (Months + Quarters)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Zoom & Fit Controls */}
              <div className="bg-white/5 rounded-lg border border-white/10 p-3 space-y-2">
                <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block">Scale</Label>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 border-white/15 text-gray-400 bg-white/5"
                    onClick={() => setPdfZoom(z => Math.max(25, z - 10))}
                    disabled={pdfZoom <= 25}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <div className="flex-1 text-center">
                    <span className="text-xs font-medium text-gray-300">{pdfZoom}%</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 w-7 p-0 border-white/15 text-gray-400 bg-white/5"
                    onClick={() => setPdfZoom(z => Math.min(200, z + 10))}
                    disabled={pdfZoom >= 200}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[25, 50, 75, 100, 150].map(z => (
                    <Button
                      key={z}
                      size="sm"
                      variant={pdfZoom === z ? "default" : "outline"}
                      className={`h-6 text-[10px] px-2 ${pdfZoom === z ? "bg-amber-500 text-gray-950 font-semibold" : "border-white/15 text-gray-400 bg-white/5"}`}
                      onClick={() => setPdfZoom(z)}
                    >
                      {z}%
                    </Button>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-[10px] border-white/15 text-amber-400 bg-white/5 hover:bg-amber-500/10 font-medium"
                  onClick={() => {
                    // Calculate zoom to fit all content on one page
                    const { ppi, contentH, headerRowH } = rowsPerPage;
                    // Compute total content height at 100% combined zoom (magnification * 100%)
                    const magScale = magnificationZoom / 100;
                    let totalH = headerRowH / (pdfZoom / 100); // header at current pdfZoom, normalize
                    for (const row of previewRows) {
                      const screenH = row.type === "group"
                        ? getWbsRowHeight(row.depth, false)
                        : getActivityRowHeight(false);
                      totalH += (screenH / 96) * ppi * magScale;
                    }
                    // Find pdfZoom that makes totalH fit in contentH
                    const fitZoom = Math.floor((contentH / totalH) * 100);
                    setPdfZoom(Math.max(10, Math.min(200, fitZoom)));
                  }}
                >
                  <Maximize2 className="w-3 h-3 mr-1" />
                  Fit All on One Page
                </Button>
                <p className="text-[9px] text-gray-600 leading-tight">
                  Scheduler zoom: {magnificationZoom}% × PDF scale: {pdfZoom}% = {Math.round(magnificationZoom * pdfZoom / 100)}% effective
                </p>
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

                    {/* Header Height Control */}
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <Label className="text-[10px] text-gray-400 mb-0.5 block">Height: {headerHeightMm}mm</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={14}
                          max={60}
                          step={2}
                          value={headerHeightMm}
                          onChange={(e) => setHeaderHeightMm(Number(e.target.value))}
                          className="flex-1 h-1.5 accent-amber-500"
                        />
                        <span className="text-[10px] text-gray-500 w-10 text-right">{headerHeightMm}mm</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[14, 22, 30, 40, 50].map(h => (
                          <Button key={h} size="sm" variant={headerHeightMm === h ? "default" : "outline"}
                            className={`h-5 text-[9px] px-1.5 ${headerHeightMm === h ? "bg-amber-500 text-gray-950 font-semibold" : "border-white/15 text-gray-400 bg-white/5"}`}
                            onClick={() => setHeaderHeightMm(h)}>
                            {h === 14 ? "XS" : h === 22 ? "S" : h === 30 ? "M" : h === 40 ? "L" : "XL"}
                          </Button>
                        ))}
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

                    {/* Footer Height Control */}
                    <div>
                      <Label className="text-[10px] text-gray-400 mb-0.5 block">Height: {footerHeightMm}mm</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min={10}
                          max={60}
                          step={2}
                          value={footerHeightMm}
                          onChange={(e) => setFooterHeightMm(Number(e.target.value))}
                          className="flex-1 h-1.5 accent-amber-500"
                        />
                        <span className="text-[10px] text-gray-500 w-10 text-right">{footerHeightMm}mm</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {[10, 14, 22, 30, 40].map(h => (
                          <Button key={h} size="sm" variant={footerHeightMm === h ? "default" : "outline"}
                            className={`h-5 text-[9px] px-1.5 ${footerHeightMm === h ? "bg-amber-500 text-gray-950 font-semibold" : "border-white/15 text-gray-400 bg-white/5"}`}
                            onClick={() => setFooterHeightMm(h)}>
                            {h === 10 ? "XS" : h === 14 ? "S" : h === 22 ? "M" : h === 30 ? "L" : "XL"}
                          </Button>
                        ))}
                      </div>
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
