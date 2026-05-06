/**
 * Schedule PDF Export — generates a professional PDF with activity table and Gantt chart.
 * Uses jsPDF + jspdf-autotable for the table, and custom drawing for the Gantt.
 * Light/professional theme matching the scheduler UI.
 */
import jsPDF from "jspdf";
import { GState } from "jspdf";
import autoTable from "jspdf-autotable";

export interface PdfFooterConfig {
  columns: number; // 3, 4, or 5
  left: string;
  centerLeft?: string;
  center: string;
  centerRight?: string;
  right: string;
}

export interface PdfHeaderConfig {
  columns: number;
  left: string;
  centerLeft?: string;
  center: string;
  centerRight?: string;
  right: string;
}

export interface PdfExportOptions {
  // Schedule data
  scheduleName: string;
  projectStartDate: Date;
  dataDate: Date | null;
  lastCalculatedAt: Date | null;

  // Activities
  activities: Array<{
    id?: number; // DB id for relationship arrow mapping
    activityId: string;
    name: string;
    duration: number;
    earlyStart: Date | null;
    earlyFinish: Date | null;
    lateStart: Date | null;
    lateFinish: Date | null;
    totalFloat: number | null;
    freeFloat: number | null;
    isCritical: boolean;
    percentComplete: string;
    wbs: string | null;
    activityType?: "task" | "milestone";
    barColor?: string;
  }>;

  // Relationships (for Gantt arrows)
  relationships: Array<{
    predecessorId: number;
    successorId: number;
    relationshipType: string;
    lagDays: number;
  }>;

  // Columns to include
  columns: string[];

  // Custom header/footer
  companyName: string;
  projectName: string;
  footerText: string;
  logoUrl?: string;

  // Footer/Header config
  footerConfig?: PdfFooterConfig;
  headerConfig?: PdfHeaderConfig;

  // Page settings
  pageSize: "letter" | "legal" | "tabloid" | "a3" | "a1" | "archD" | "archE" | [number, number];
  orientation: "landscape" | "portrait";

  // Display options
  showGantt: boolean;
  showTable: boolean;
  showCriticalPathOnly: boolean;
  showLogicLines?: boolean;

  // Header color customization
  headerBgColor?: string;
  headerAccentColor?: string;
  headerTextColor?: string;

  // PDF scale (from preview zoom controls, default 100)
  pdfZoom?: number;
  // Scheduler magnification zoom (default 100)
  magnificationZoom?: number;

  // Header/footer height customization (in mm)
  headerHeightMm?: number;
  footerHeightMm?: number;

  // Timescale / gridline options
  gridlineInterval?: "none" | "weekly" | "monthly" | "quarterly";
  timescaleLabels?: "months" | "quarters" | "both";

  // Legend placement
  legendPlacement?: "footer" | "inline";

  // Annotations overlay (text boxes, arrows, shading from GanttAnnotations)
  annotations?: Array<{
    id: string;
    type: "text" | "arrow" | "shading";
    // Text box fields
    x?: number;
    y?: number;
    text?: string;
    fontSize?: number;
    color?: string;
    bgColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    width?: number;
    height?: number;
    // Arrow fields
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    strokeWidth?: number;
    label?: string;
    lineStyle?: "solid" | "dashed" | "dotted";
    startEndpoint?: "arrow" | "circle" | "diamond" | "none";
    endEndpoint?: "arrow" | "circle" | "diamond" | "none";
    // Shading fields
    opacity?: number;
    pattern?: "solid" | "hatching" | "crosshatch" | "dots";
  }>;

  // Screen-space dimensions of the Gantt chart (for annotation coordinate mapping)
  ganttScreenWidth?: number;
  ganttScreenHeight?: number;
  ganttPixelsPerDay?: number;   // screen pixels per day (for X coordinate mapping)
  ganttRangeStartMs?: number;  // rangeStart timestamp in ms (for X coordinate mapping)

  // Column width proportions from the app (key → CSS width like "200px" or "1fr")
  appColumnWidths?: Record<string, string>;

  // WBS grouping for Gantt
  groupedActivities?: Array<{
    group: string | null;
    activities: Array<{
      id?: number;
      activityId: string;
      name: string;
      duration: number;
      earlyStart: Date | null;
      earlyFinish: Date | null;
      lateStart: Date | null;
      lateFinish: Date | null;
      totalFloat: number | null;
      freeFloat: number | null;
      isCritical: boolean;
      percentComplete: string;
      wbs: string | null;
      activityType?: "task" | "milestone";
      barColor?: string;
    }>;
    depth: number;
    wbsColor?: string;
    wbsTextColor?: string;
    ancestorColors?: string[];
  }>;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function formatDateFull(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function isImageToken(token: string): boolean {
  return token.startsWith("{image:");
}

function isRichTextToken(token: string): boolean {
  return token.startsWith("{richtext:");
}

interface RichTextLine {
  text: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

function parseRichTextToken(token: string): RichTextLine[] {
  try {
    const json = token.slice(10, -1); // strip {richtext: and }
    return JSON.parse(json);
  } catch {
    return [];
  }
}

function getImageDataUrl(token: string): string {
  return token.slice(7, -1); // strip {image: and }
}

function resolveToken(token: string, ctx: { pageNum: number; totalPages: number; scheduleName: string; dataDate: Date | null; projectStartDate: Date; companyName: string; projectName: string }): string {
  if (isImageToken(token)) return ""; // images handled separately
  if (isRichTextToken(token)) return ""; // rich text handled separately
  return token
    .replace(/\{page\}/g, String(ctx.pageNum))
    .replace(/\{total\}/g, String(ctx.totalPages))
    .replace(/\{date\}/g, new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))
    .replace(/\{scheduleName\}/g, ctx.scheduleName)
    .replace(/\{dataDate\}/g, ctx.dataDate ? formatDateFull(ctx.dataDate) : "Not set")
    .replace(/\{projectStart\}/g, formatDateFull(ctx.projectStartDate))
    .replace(/\{companyName\}/g, ctx.companyName)
    .replace(/\{projectName\}/g, ctx.projectName);
}

// Image dimension cache for proper aspect ratio
const imageDimensionCache = new Map<string, { w: number; h: number }>();

function getImageDimensions(dataUrl: string): { w: number; h: number } | null {
  if (imageDimensionCache.has(dataUrl)) return imageDimensionCache.get(dataUrl)!;
  // Try to extract from data URL via an off-screen image (sync fallback: use default ratio)
  return null;
}

function addImageToDoc(doc: any, token: string, x: number, y: number, maxH: number, align: "left" | "center" | "right" = "left", maxW?: number) {
  if (!isImageToken(token)) return;
  try {
    const dataUrl = getImageDataUrl(token);
    const imgH = maxH - 2;
    // Try to get actual image properties from jsPDF
    let imgW: number;
    try {
      const imgProps = doc.getImageProperties(dataUrl);
      const aspect = imgProps.width / imgProps.height;
      imgW = imgH * aspect;
      // Clamp to maxW if provided
      if (maxW && imgW > maxW) {
        imgW = maxW;
      }
    } catch {
      // Fallback: assume 2:1 aspect ratio
      imgW = imgH * 2;
    }
    let ix = x;
    if (align === "right") ix = x - imgW;
    else if (align === "center") ix = x - imgW / 2;
    doc.addImage(dataUrl, ix, y, imgW, imgH);
  } catch (e) {
    console.warn("Failed to add image to PDF:", e);
  }
}

/** Calculate the minimum height (mm) needed to render a rich text block without clipping */
function calcRichTextHeight(lines: RichTextLine[]): number {
  if (!lines || lines.length === 0) return 0;
  const lineSpacing = 1.2; // mm between lines
  const lineHeights = lines.map(l => (l.fontSize || 8) * 0.352778); // pt to mm
  return lineHeights.reduce((s, h) => s + h, 0) + (lines.length - 1) * lineSpacing + 4; // +4mm padding
}

/** Calculate the minimum footer/header height needed for all configured slots */
function calcMinSlotHeight(config: { left: string; center: string; right: string; centerLeft?: string; centerRight?: string }): number {
  const tokens = [config.left, config.center, config.right, config.centerLeft || "", config.centerRight || ""].filter(Boolean);
  let maxH = 0;
  for (const token of tokens) {
    if (isRichTextToken(token)) {
      const lines = parseRichTextToken(token);
      const h = calcRichTextHeight(lines);
      if (h > maxH) maxH = h;
    }
  }
  return maxH;
}

/** Render rich text lines vertically centered in a slot */
function renderRichText(doc: any, lines: RichTextLine[], x: number, y: number, slotH: number, align: "left" | "center" | "right" = "left") {
  if (!lines || lines.length === 0) return;
  // Calculate total height of all lines
  const lineSpacing = 1.2; // mm between lines
  const lineHeights = lines.map(l => (l.fontSize || 8) * 0.352778); // pt to mm
  const totalTextH = lineHeights.reduce((s, h) => s + h, 0) + (lines.length - 1) * lineSpacing;
  // Start Y: vertically center the block
  let curY = y + (slotH - totalTextH) / 2 + lineHeights[0] * 0.75; // 0.75 for baseline offset
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fontSize = line.fontSize || 8;
    const fontStyle = (line.bold && line.italic) ? "bolditalic" : line.bold ? "bold" : line.italic ? "italic" : "normal";
    doc.setFont("helvetica", fontStyle);
    doc.setFontSize(fontSize);
    if (line.color) {
      const hex = line.color.replace('#', '');
      doc.setTextColor(parseInt(hex.substring(0, 2), 16), parseInt(hex.substring(2, 4), 16), parseInt(hex.substring(4, 6), 16));
    }
    doc.text(line.text || "", x, curY, { align });
    // Draw underline manually
    if (line.underline && line.text) {
      const textW = doc.getTextWidth(line.text);
      let ulX = x;
      if (align === "center") ulX = x - textW / 2;
      else if (align === "right") ulX = x - textW;
      doc.setLineWidth(0.15);
      doc.line(ulX, curY + 0.5, ulX + textW, curY + 0.5);
    }
    curY += lineHeights[i] + lineSpacing;
  }
}

export async function generateSchedulePdf(options: PdfExportOptions): Promise<void> {
  const {
    scheduleName,
    projectStartDate,
    dataDate,
    lastCalculatedAt,
    activities,
    columns,
    companyName,
    projectName,
    footerText,
    pageSize,
    orientation,
    showGantt,
    showTable,
    showCriticalPathOnly,
    footerConfig,
    headerConfig,
  } = options;
  const showLogicLines = options.showLogicLines ?? false;

  // Parse hex color to RGB tuple
  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
  };
  const hdrBg = options.headerBgColor && options.headerBgColor !== 'transparent' ? hexToRgb(options.headerBgColor) : null;

  const filteredActivities = showCriticalPathOnly
    ? activities.filter((a) => a.isCritical)
    : activities;

  // Resolve page size — jsPDF supports letter/legal/tabloid/a3/a1 natively;
  // for ARCH sizes we pass [width, height] in mm
  const PAGE_SIZE_MM: Record<string, [number, number]> = {
    archD: [609.6, 914.4],  // 24×36 inches
    archE: [914.4, 1219.2], // 36×48 inches
  };
  const resolvedFormat: string | [number, number] = Array.isArray(pageSize)
    ? pageSize
    : PAGE_SIZE_MM[pageSize] || pageSize;

  // Create PDF
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: resolvedFormat,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const headerHeight = options.headerHeightMm || 22;
  // Auto-expand footer height based on rich text content
  const userFooterHeight = options.footerHeightMm || 14;
  const minFooterH = footerConfig ? calcMinSlotHeight(footerConfig) : 0;
  // Add extra space for legend row inside footer (only when legend is in footer)
  const legendInFooter = (options.legendPlacement || "footer") === "footer";
  const legendRowH = legendInFooter ? 5 : 0;
  const footerHeight = Math.max(userFooterHeight, minFooterH) + legendRowH;

  // ─── Color Palette (P6-style clean white) ─────────────────────────────────
  const colors = {
    navy: [13, 27, 42] as [number, number, number],
    gold: [201, 168, 76] as [number, number, number],
    steelBlue: [74, 111, 165] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    warmGray: [248, 248, 248] as [number, number, number],
    text: [20, 20, 20] as [number, number, number],
    muted: [120, 120, 120] as [number, number, number],
    border: [200, 200, 200] as [number, number, number],
    lightBorder: [225, 225, 225] as [number, number, number],
    critical: [200, 30, 30] as [number, number, number],
    green: [22, 130, 60] as [number, number, number],
    colHeader: [235, 238, 242] as [number, number, number],
    colHeaderText: [50, 55, 65] as [number, number, number],
  };
  // P6-style WBS depth colors: subtle professional grays with slight tints
  const WBS_DEPTH_BG: [number, number, number][] = [
    [230, 235, 240],  // Depth 0: Light steel
    [238, 240, 235],  // Depth 1: Light sage
    [240, 238, 235],  // Depth 2: Light warm
    [235, 238, 242],  // Depth 3: Light blue-gray
    [240, 236, 240],  // Depth 4: Light lavender
    [240, 240, 235],  // Depth 5: Light cream
  ];
  const hdrAccent = options.headerAccentColor ? hexToRgb(options.headerAccentColor) : colors.gold;
  const hdrText = options.headerTextColor ? hexToRgb(options.headerTextColor) : colors.white;

  // ─── Draw Header ────────────────────────────────────────────────────────────
  function drawHeader() {
    if (hdrBg) {
      doc.setFillColor(...hdrBg);
      doc.rect(margin, 2, pageWidth - 2 * margin, headerHeight - 2, "F");
    }
    // Always draw a gray stroke border around the header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, 2, pageWidth - 2 * margin, headerHeight - 2, "S");
    // Accent line bounded within margins (aligned with content borders)
    doc.setFillColor(...hdrAccent);
    doc.rect(margin, headerHeight - 0.6, pageWidth - 2 * margin, 0.6, "F");

    const ctx = { pageNum: 0, totalPages: 0, scheduleName, dataDate, projectStartDate, companyName, projectName };

    const hdrPad = 2.5; // Inner padding from header border
    if (headerConfig) {
      // Use configurable header columns
      const cols = headerConfig.columns;
      const usableWidth = pageWidth - 2 * margin;
      const midY = headerHeight / 2 + 1;

      const hdrSlotMaxW = usableWidth / cols;
      // Left column - always bold gold (or image or rich text)
      if (isImageToken(headerConfig.left)) {
        addImageToDoc(doc, headerConfig.left, margin + hdrPad, 1, headerHeight - 2, "left", hdrSlotMaxW - 2 - hdrPad);
      } else if (isRichTextToken(headerConfig.left)) {
        renderRichText(doc, parseRichTextToken(headerConfig.left), margin + hdrPad, 0, headerHeight, "left");
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...hdrAccent);
        doc.text(resolveToken(headerConfig.left, ctx), margin + hdrPad, midY);
      }

      // Other columns
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...hdrText);

      const renderHeaderSlot = (token: string, x: number, hy: number, align: "left" | "center" | "right") => {
        if (isImageToken(token)) {
          addImageToDoc(doc, token, x, 1, headerHeight - 2, align, hdrSlotMaxW - 2);
        } else if (isRichTextToken(token)) {
          renderRichText(doc, parseRichTextToken(token), x, 0, headerHeight, align);
          // Reset font after rich text
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7.5);
          doc.setTextColor(...hdrText);
        } else {
          doc.text(resolveToken(token, ctx), x, hy, { align });
        }
      };

      if (cols === 3) {
        renderHeaderSlot(headerConfig.center, pageWidth / 2, midY, "center");
        renderHeaderSlot(headerConfig.right, pageWidth - margin - hdrPad, midY, "right");
      } else if (cols === 5) {
        const seg = usableWidth / 5;
        renderHeaderSlot(headerConfig.centerLeft || "", margin + seg, midY, "left");
        renderHeaderSlot(headerConfig.center, pageWidth / 2, midY, "center");
        renderHeaderSlot(headerConfig.centerRight || "", margin + seg * 3, midY, "left");
        renderHeaderSlot(headerConfig.right, pageWidth - margin - hdrPad, midY, "right");
      }
    } else {
      // Default header layout
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...hdrAccent);
      doc.text(companyName || "ALP Contractor Circle", margin, 8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...hdrText);
      doc.text(projectName || scheduleName, margin, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(180, 190, 210);
      doc.text(scheduleName, margin, 19);

      const rightX = pageWidth - margin;
      doc.setFontSize(7);
      doc.setTextColor(180, 190, 210);
      doc.text(`Data Date: ${dataDate ? formatDateFull(dataDate) : "Not set"}`, rightX, 8, { align: "right" });
      doc.text(`Project Start: ${formatDateFull(projectStartDate)}`, rightX, 13, { align: "right" });
      doc.text(`Run Date: ${lastCalculatedAt ? new Date(lastCalculatedAt).toLocaleString() : "—"}`, rightX, 18, { align: "right" });
    }
  }

  // ─── Draw Footer ────────────────────────────────────────────────────────────
  function drawFooter(pageNum: number, totalPages: number) {
    const y = pageHeight - footerHeight;
    // Draw full gray stroke border around the footer area
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, pageWidth - 2 * margin, footerHeight, "S");
    // Draw continuous left and right page borders from header bottom to footer top
    doc.line(margin, 2 + headerHeight - 2, margin, y);
    doc.line(pageWidth - margin, 2 + headerHeight - 2, pageWidth - margin, y);

    // ── Schedule Legend (top row of footer — only if legendPlacement is "footer") ──
    if (!legendInFooter) {
      // No legend in footer — skip to footer content
    } else {
    const legendY = y + 1.5;
    const legendFontSize = Math.max(5, 6);
    doc.setFontSize(legendFontSize);
    doc.setFont("helvetica", "normal");
    let lx = margin + 4;
    const lSpacing = 32;
    const lBarW = 6;
    const lBarH = 2;

    // Critical bar (red)
    doc.setFillColor(239, 68, 68);
    doc.rect(lx, legendY, lBarW, lBarH, "F");
    doc.setTextColor(20, 20, 20);
    doc.text("Critical", lx + lBarW + 1.5, legendY + lBarH - 0.3);
    lx += lSpacing;

    // Normal bar (green)
    doc.setFillColor(22, 130, 60);
    doc.rect(lx, legendY, lBarW, lBarH, "F");
    doc.text("Non-Critical", lx + lBarW + 1.5, legendY + lBarH - 0.3);
    lx += lSpacing + 4;

    // Milestone diamond
    const mx = lx + 1.5;
    const my = legendY + lBarH / 2;
    const ms = 1.2;
    doc.setFillColor(20, 20, 20);
    doc.triangle(mx, my - ms, mx + ms, my, mx, my + ms, "F");
    doc.triangle(mx, my - ms, mx - ms, my, mx, my + ms, "F");
    doc.text("Milestone", mx + ms + 2, legendY + lBarH - 0.3);
    lx += lSpacing;

    // Data date line
    if (dataDate) {
      doc.setDrawColor(74, 111, 165);
      doc.setLineWidth(0.5);
      doc.line(lx, legendY, lx, legendY + lBarH);
      doc.setTextColor(20, 20, 20);
      doc.text("Data Date", lx + 2, legendY + lBarH - 0.3);
      lx += lSpacing;
    }

    // Summary bar
    doc.setFillColor(40, 40, 40);
    doc.rect(lx, legendY + 0.3, lBarW, lBarH * 0.6, "F");
    const stickW = 0.4;
    doc.rect(lx, legendY + 0.3, stickW, lBarH, "F");
    doc.rect(lx + lBarW - stickW, legendY + 0.3, stickW, lBarH, "F");
    doc.setTextColor(20, 20, 20);
    doc.text("Summary", lx + lBarW + 1.5, legendY + lBarH - 0.3);

    // ConstructLine branding (right side of legend row)
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);
    doc.text("\u00A9 ConstructLine", pageWidth - margin - 4, legendY + lBarH - 0.3, { align: "right" });

    // Separator line between legend and footer content
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.1);
    doc.line(margin, y + legendRowH, pageWidth - margin, y + legendRowH);
    } // end if legendInFooter

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.muted);
    const ftrPad = 2.5; // Inner padding from footer border

    const ctx = { pageNum, totalPages, scheduleName, dataDate, projectStartDate, companyName, projectName };

    if (footerConfig) {
      const usableWidth = pageWidth - 2 * margin;
      const cols = footerConfig.columns;
      const footerMidY = y + legendRowH + (footerHeight - legendRowH) / 2 + 1;

      const slotMaxW = usableWidth / cols;
      const renderFooterSlot = (token: string, x: number, fy: number, align: "left" | "center" | "right") => {
        if (isImageToken(token)) {
          addImageToDoc(doc, token, x, y + legendRowH + 1, footerHeight - legendRowH - 2, align, slotMaxW - 2);
        } else if (isRichTextToken(token)) {
          const lines = parseRichTextToken(token);
          renderRichText(doc, lines, x, y + legendRowH, footerHeight - legendRowH, align);
          // Reset font after rich text
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...colors.muted);
        } else {
          doc.text(resolveToken(token, ctx), x, fy, { align });
        }
      };

      // Left
      renderFooterSlot(footerConfig.left, margin + ftrPad, footerMidY, "left");

      if (cols === 3) {
        renderFooterSlot(footerConfig.center, pageWidth / 2, footerMidY, "center");
        renderFooterSlot(footerConfig.right, pageWidth - margin - ftrPad, footerMidY, "right");
      } else if (cols === 4) {
        const seg = usableWidth / 4;
        renderFooterSlot(footerConfig.centerLeft || "", margin + seg, footerMidY, "left");
        renderFooterSlot(footerConfig.centerRight || "", margin + seg * 2, footerMidY, "left");
        renderFooterSlot(footerConfig.right, pageWidth - margin - ftrPad, footerMidY, "right");
      } else if (cols === 5) {
        const seg = usableWidth / 5;
        renderFooterSlot(footerConfig.centerLeft || "", margin + seg, footerMidY, "left");
        renderFooterSlot(footerConfig.center, pageWidth / 2, footerMidY, "center");
        renderFooterSlot(footerConfig.centerRight || "", margin + seg * 3, footerMidY, "left");
        renderFooterSlot(footerConfig.right, pageWidth - margin - ftrPad, footerMidY, "right");
      }
    } else {
      const defaultMidY = y + legendRowH + (footerHeight - legendRowH) / 2 + 1;
      doc.text(footerText || "Generated by ALP CPM Schedule Builder", margin + ftrPad, defaultMidY);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, defaultMidY, { align: "center" });
      doc.text("\u00A9 ConstructLine", pageWidth - margin - ftrPad, defaultMidY, { align: "right" });
    }
  }

  // ─── Build Column Definitions ───────────────────────────────────────────────
  const columnMap: Record<string, { header: string; minWidth: number; dataKey: string; grow: boolean }> = {
    activityId: { header: "ID", minWidth: 16, dataKey: "activityId", grow: false },
    name: { header: "Activity Name", minWidth: 70, dataKey: "name", grow: true },
    duration: { header: "Dur", minWidth: 11, dataKey: "duration", grow: false },
    percentComplete: { header: "%", minWidth: 11, dataKey: "percentComplete", grow: false },
    earlyStart: { header: "ES", minWidth: 22, dataKey: "earlyStart", grow: false },
    earlyFinish: { header: "EF", minWidth: 22, dataKey: "earlyFinish", grow: false },
    lateStart: { header: "LS", minWidth: 22, dataKey: "lateStart", grow: false },
    lateFinish: { header: "LF", minWidth: 22, dataKey: "lateFinish", grow: false },
    totalFloat: { header: "TF", minWidth: 11, dataKey: "totalFloat", grow: false },
    freeFloat: { header: "FF", minWidth: 11, dataKey: "freeFloat", grow: false },
    wbs: { header: "WBS", minWidth: 14, dataKey: "wbs", grow: false },
  };

  const selectedColumns = columns
    .filter((c) => columnMap[c])
    .map((c) => columnMap[c]);

  if (!selectedColumns.find((c) => c.dataKey === "activityId")) {
    selectedColumns.unshift(columnMap.activityId);
  }
  if (!selectedColumns.find((c) => c.dataKey === "name")) {
    selectedColumns.splice(1, 0, columnMap.name);
  }

  // ─── Auto-size columns to fill full page width ─────────────────────────────
  const usableTableWidth = pageWidth - 2 * margin;
  const totalMinWidth = selectedColumns.reduce((sum, c) => sum + c.minWidth, 0);
  const extraSpace = usableTableWidth - totalMinWidth;
  const growCount = selectedColumns.filter((c) => c.grow).length;

  const columnWidths = selectedColumns.map((c) => {
    if (c.grow && growCount > 0 && extraSpace > 0) {
      return c.minWidth + extraSpace / growCount;
    }
    // If no grow columns, distribute evenly
    if (growCount === 0 && extraSpace > 0) {
      return c.minWidth + extraSpace / selectedColumns.length;
    }
    return c.minWidth;
  });

  // ─── Build Table Data ───────────────────────────────────────────────────────
  const tableData = filteredActivities.map((act) => ({
    activityId: act.activityId,
    name: act.name,
    duration: String(act.duration),
    percentComplete: `${parseFloat(act.percentComplete)}%`,
    earlyStart: formatDate(act.earlyStart),
    earlyFinish: formatDate(act.earlyFinish),
    lateStart: formatDate(act.lateStart),
    lateFinish: formatDate(act.lateFinish),
    totalFloat: act.totalFloat != null ? String(act.totalFloat) : "—",
    freeFloat: act.freeFloat != null ? String(act.freeFloat) : "—",
    wbs: act.wbs || "—",
    _isCritical: act.isCritical,
  }));

  // ─── Draw Header on first page ──────────────────────────────────────────────
  drawHeader();

  // ─── Summary Stats ──────────────────────────────────────────────────────────
  const statsY = headerHeight + 4;
  doc.setFontSize(7);
  doc.setTextColor(...colors.muted);
  const critCount = filteredActivities.filter((a) => a.isCritical).length;
  const statsText = `${filteredActivities.length} Activities  ·  ${critCount} Critical  ·  ${options.relationships.length} Relationships`;
  doc.text(statsText, margin, statsY);

  if (showCriticalPathOnly) {
    doc.setTextColor(...colors.critical);
    doc.text("  ·  Critical Path Only", margin + doc.getTextWidth(statsText), statsY);
  }

  // ─── Activity Table (only if showTable is true) ───────────────────────────
  if (showTable) {
    const tableStartY = statsY + 4;

    autoTable(doc, {
      startY: tableStartY,
      margin: { left: margin, right: margin, bottom: footerHeight + 4 },
      head: [selectedColumns.map((c) => c.header)],
      body: tableData.map((row) => selectedColumns.map((c) => (row as any)[c.dataKey])),
      theme: "plain",
      styles: {
        fontSize: 8,
        cellPadding: { top: 2.2, bottom: 2.2, left: 2, right: 2 },
        textColor: colors.text,
        lineColor: colors.border,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: colors.colHeader,
        textColor: colors.colHeaderText,
        fontStyle: "bold",
        fontSize: 7.5,
      },
      alternateRowStyles: {
        fillColor: colors.warmGray,
      },
      bodyStyles: {
        fillColor: colors.white,
      },
      columnStyles: columnWidths.reduce((acc, w, i) => {
        acc[i] = { cellWidth: w };
        return acc;
      }, {} as Record<number, { cellWidth: number }>),
      didParseCell: (data) => {
        if (data.section === "body") {
          const rowData = tableData[data.row.index];
          if (rowData?._isCritical) {
            if (data.column.index === 0) {
              data.cell.styles.textColor = colors.critical;
              data.cell.styles.fontStyle = "bold";
            }
          }
        }
      },
      didDrawPage: () => {
        drawHeader();
      },
    });
  }

  // ─── Gantt Chart Section ────────────────────────────────────────────────────
  if (showGantt && filteredActivities.length > 0) {
    let minDate = new Date(projectStartDate);
    let maxDate = new Date(projectStartDate);
    for (const act of filteredActivities) {
      if (act.earlyStart && new Date(act.earlyStart) < minDate) minDate = new Date(act.earlyStart);
      if (act.earlyFinish && new Date(act.earlyFinish) > maxDate) maxDate = new Date(act.earlyFinish);
      if (act.lateFinish && new Date(act.lateFinish) > maxDate) maxDate = new Date(act.lateFinish);
    }
    // Add enough right padding so labels for the last activities have room
    // Labels need substantial space — 25% of timeline or 30 days minimum
    // This ensures late-project activity labels are never truncated
    const durationDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
    const labelPaddingDays = Math.max(30, Math.round(durationDays * 0.25)); // 25% of timeline or 30 days min
    maxDate = new Date(maxDate.getTime() + labelPaddingDays * 86400000);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
    if (totalDays <= 0) {
      // Just add footers and save
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
      }
      const fileName = `${scheduleName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
      return;
    }

    // Zoom scale factor
    const zoomScale = ((options.magnificationZoom || 100) / 100) * ((options.pdfZoom || 100) / 100);

    // Build flat row list with WBS group headers interleaved
    type PdfRow = { type: "group"; label: string; depth: number; bgColor?: string; textColor?: string; groupActivities?: typeof filteredActivities; ancestorColors?: string[] } | { type: "activity"; act: typeof filteredActivities[0]; ancestorColors?: string[] };
    const pdfRows: PdfRow[] = [];
    if (options.groupedActivities && options.groupedActivities.length > 0) {
      for (const g of options.groupedActivities) {
        if (g.group) {
          // Filter group activities by critical path if needed
          const gActs = showCriticalPathOnly ? g.activities.filter(a => a.isCritical) : g.activities;
          // Check if this group or its descendants have activities
          const hasActs = gActs.length > 0 || (!showCriticalPathOnly);
          if (hasActs || gActs.length > 0) {
            pdfRows.push({ type: "group", label: g.group, depth: g.depth, bgColor: g.wbsColor, textColor: g.wbsTextColor, groupActivities: gActs as any, ancestorColors: g.ancestorColors });
          }
          for (const act of gActs) {
            pdfRows.push({ type: "activity", act, ancestorColors: g.ancestorColors });
          }
        } else {
          const gActs = showCriticalPathOnly ? g.activities.filter(a => a.isCritical) : g.activities;
          for (const act of gActs) {
            pdfRows.push({ type: "activity", act });
          }
        }
      }
    } else {
      for (const act of filteredActivities) {
        pdfRows.push({ type: "activity", act });
      }
    }

    // Tighter row heights for denser P6-style layout
    const getRowH = (row: PdfRow): number => {
      if (row.type === "group") {
        const depth = row.depth;
        return (depth === 0 ? 8 : depth === 1 ? 7 : 6.5) * zoomScale;
      }
      return 6.5 * zoomScale;
    };

    // Start Gantt on a new page (or continue on first page if no table)
    if (showTable) {
      doc.addPage();
      drawHeader();
    }

    const ganttTop = headerHeight + 10;
    const legendHeight = 0; // Legend is now drawn inside the footer
    const ganttBottom = pageHeight - footerHeight - legendHeight - 4;
    const ganttHeight = ganttBottom - ganttTop;

    // Paginate using variable row heights — accumulate until page is full
    const pages: PdfRow[][] = [];
    let currentPage: PdfRow[] = [];
    let currentH = 0;
    for (const row of pdfRows) {
      const rh = getRowH(row);
      if (currentH + rh > ganttHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        currentH = 0;
      }
      currentPage.push(row);
      currentH += rh;
    }
    if (currentPage.length > 0) pages.push(currentPage);

    // ─── Dynamic column definitions for Gantt left-side table ─────────────
    const ganttColDefs: Record<string, { header: string; minWidth: number; grow: boolean; getValue: (act: any) => string }> = {
      activityId: { header: "ID", minWidth: 14, grow: false, getValue: (a) => a.activityId || "" },
      name: { header: "Activity Name", minWidth: 70, grow: true, getValue: (a) => a.name || "" },
      duration: { header: "Dur", minWidth: 10, grow: false, getValue: (a) => `${a.duration}d` },
      percentComplete: { header: "%", minWidth: 8, grow: false, getValue: (a) => `${Math.round(parseFloat(String(a.percentComplete)) || 0)}%` },
      earlyStart: { header: "ES", minWidth: 18, grow: false, getValue: (a) => a.earlyStart ? new Date(a.earlyStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      earlyFinish: { header: "EF", minWidth: 18, grow: false, getValue: (a) => a.earlyFinish ? new Date(a.earlyFinish).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      lateStart: { header: "LS", minWidth: 18, grow: false, getValue: (a) => a.lateStart ? new Date(a.lateStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      lateFinish: { header: "LF", minWidth: 18, grow: false, getValue: (a) => a.lateFinish ? new Date(a.lateFinish).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "" },
      totalFloat: { header: "TF", minWidth: 10, grow: false, getValue: (a) => a.totalFloat != null ? `${a.totalFloat}d` : "\u2014" },
      freeFloat: { header: "FF", minWidth: 10, grow: false, getValue: (a) => a.freeFloat != null ? `${a.freeFloat}d` : "\u2014" },
      wbs: { header: "WBS", minWidth: 12, grow: false, getValue: (a) => a.wbs || "\u2014" },
    };
    const ganttActiveKeys = columns.filter(k => ganttColDefs[k]);
    if (!ganttActiveKeys.includes("activityId")) ganttActiveKeys.unshift("activityId");
    if (!ganttActiveKeys.includes("name")) ganttActiveKeys.splice(1, 0, "name");
    const ganttActiveCols = ganttActiveKeys.map(k => ganttColDefs[k]);

    // Compute column widths using app proportions when available
    const usableWidth = pageWidth - 2 * margin;

    let ganttColWidths: number[];
    let labelWidth: number;

    if (options.appColumnWidths && Object.keys(options.appColumnWidths).length > 0) {
      // Parse app column widths to get pixel proportions
      const appWidths: number[] = ganttActiveKeys.map(key => {
        const cssVal = options.appColumnWidths![key];
        if (!cssVal) return ganttColDefs[key].minWidth;
        // 1fr or other flexible units — give it a large default (Name column)
        if (cssVal.includes('fr')) return 400;
        const pxMatch = cssVal.match(/(\d+)/);
        if (pxMatch) return parseInt(pxMatch[1]);
        return ganttColDefs[key].minWidth;
      });
      const totalAppPx = appWidths.reduce((s, w) => s + w, 0);
      // Calculate table share based on number and type of visible columns.
      // With default 7 columns (ID 80, Name 400, Dur 50, ES 80, EF 80, TF 45, WBS 70 = 805px),
      // the table should get ~45% of page width. With fewer columns, less; with more, more.
      // Scale: 5 cols → ~35%, 7 cols → ~45%, 10+ cols → ~55%
      const numCols = ganttActiveKeys.length;
      const baseShare = numCols <= 4 ? 0.30 : numCols <= 6 ? 0.38 : numCols <= 8 ? 0.45 : numCols <= 10 ? 0.50 : 0.55;
      labelWidth = usableWidth * baseShare;
      // Distribute labelWidth proportionally based on app widths
      ganttColWidths = appWidths.map((w, idx) => {
        const proportion = w / totalAppPx;
        const minW = ganttColDefs[ganttActiveKeys[idx]]?.minWidth || 8;
        return Math.max(minW, labelWidth * proportion);
      });
      // Recalculate labelWidth as sum of actual column widths
      labelWidth = ganttColWidths.reduce((s, w) => s + w, 0);
    } else {
      // Fallback: sum minWidths, distribute extra to grow columns
      const totalMinW = ganttActiveCols.reduce((s, c) => s + c.minWidth, 0);
      labelWidth = Math.min(Math.max(totalMinW + 4, usableWidth * 0.35), usableWidth * 0.55);
      const ganttGrowCount = ganttActiveCols.filter(c => c.grow).length;
      const ganttExtraW = Math.max(0, labelWidth - totalMinW);
      ganttColWidths = ganttActiveCols.map(c => {
        if (c.grow && ganttGrowCount > 0 && ganttExtraW > 0) return c.minWidth + ganttExtraW / ganttGrowCount;
        return c.minWidth;
      });
    }

    const ganttLeft = margin;
    const ganttRight = pageWidth - margin;
    const chartLeft = ganttLeft + labelWidth;
    const chartWidth = ganttRight - chartLeft;

    const dateToX = (d: Date) => {
      const dayOffset = (new Date(d).getTime() - minDate.getTime()) / 86400000;
      return chartLeft + (dayOffset / totalDays) * chartWidth;
    };

    // ─── Paginate Gantt ──────────────────────────────────────────────────────
    let isFirstGanttPage = true;

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      if (!isFirstGanttPage) {
        doc.addPage();
        drawHeader();
      }
      isFirstGanttPage = false;

      const pageRows = pages[pageIdx];

      // ─── Draw column headers at top of Gantt table (P6-style light gray) ──
      const colHeaderH = 7;
      doc.setFillColor(...colors.colHeader);
      doc.rect(ganttLeft, ganttTop - colHeaderH - 1, labelWidth, colHeaderH, "F");
      doc.setFontSize(7);
      doc.setTextColor(...colors.colHeaderText);
      doc.setFont("helvetica", "bold");
      let chX = ganttLeft;
      for (let ci = 0; ci < ganttActiveCols.length; ci++) {
        const col = ganttActiveCols[ci];
        const cw = ganttColWidths[ci];
        const isLeft = col.header === "Activity Name" || col.header === "ID";
        if (isLeft) {
            doc.text(col.header, chX + 1.5, ganttTop - colHeaderH - 1 + colHeaderH / 2 + 0.8);
        } else {
          doc.text(col.header, chX + cw / 2, ganttTop - colHeaderH - 1 + colHeaderH / 2 + 0.8, { align: "center" });
        }
        chX += cw;
      }
      // Vertical separator between table and chart header
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.15);
      doc.line(chartLeft, ganttTop - colHeaderH - 1, chartLeft, ganttTop);

      // Compute cumulative Y offsets for variable row heights
      const rowYOffsets: number[] = [];
      let cumY = ganttTop;
      for (const row of pageRows) {
        rowYOffsets.push(cumY);
        cumY += getRowH(row);
      }
      const pageContentBottom = cumY;

        // ─── Draw Time Scale (configurable gridlines & labels) ─────────────
      const gridInterval = options.gridlineInterval || "monthly";
      const tsLabels = options.timescaleLabels || "months";

      // Draw timescale labels in the header area above the Gantt
      // Also draw the timescale header background
      doc.setFillColor(...colors.colHeader);
      doc.rect(chartLeft, ganttTop - colHeaderH - 1, chartWidth, colHeaderH, "F");

      // Month-based iteration for labels and gridlines
      const current = new Date(minDate);
      current.setDate(1);
      while (current <= maxDate) {
        const x = dateToX(current);
        const nextMonth = new Date(current);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        if (x >= chartLeft && x <= ganttRight) {
          const isQuarterBoundary = current.getMonth() % 3 === 0;

          // Gridlines based on interval setting
          if (gridInterval === "monthly" || (gridInterval === "quarterly" && isQuarterBoundary)) {
            doc.setDrawColor(...colors.border);
            doc.setLineWidth(gridInterval === "quarterly" && isQuarterBoundary ? 0.2 : 0.12);
            doc.line(x, ganttTop, x, pageContentBottom);
          }

          // Labels
          doc.setTextColor(...colors.colHeaderText);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          if (tsLabels === "months" || tsLabels === "both") {
            doc.text(
              current.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
              x + 1, ganttTop - colHeaderH / 2
            );
          }
          if (tsLabels === "quarters" && isQuarterBoundary) {
            const qNum = Math.floor(current.getMonth() / 3) + 1;
            doc.text(`Q${qNum} '${current.getFullYear().toString().slice(-2)}`, x + 1, ganttTop - colHeaderH / 2);
          }
          if (tsLabels === "both" && isQuarterBoundary) {
            const qNum = Math.floor(current.getMonth() / 3) + 1;
            doc.setFontSize(5);
            doc.text(`Q${qNum}`, x + 1, ganttTop - colHeaderH + 1.5);
          }
        }

        // Weekly sub-gridlines (only if gridInterval is "weekly")
        if (gridInterval === "weekly") {
          const weekDate = new Date(current);
          weekDate.setDate(weekDate.getDate() + 7);
          while (weekDate < nextMonth && weekDate <= maxDate) {
            const wx = dateToX(weekDate);
            if (wx >= chartLeft && wx <= ganttRight) {
              doc.setDrawColor(...colors.lightBorder);
              doc.setLineWidth(0.06);
              doc.line(wx, ganttTop, wx, pageContentBottom);
            }
            weekDate.setDate(weekDate.getDate() + 7);
          }
        }

        current.setMonth(current.getMonth() + 1);
      }
      doc.setFont("helvetica", "normal");

      // ─── Draw Data Date Line ──────────────────────────────────────────────
      if (dataDate) {
        const ddX = dateToX(dataDate);
        if (ddX >= chartLeft && ddX <= ganttRight) {
          doc.setDrawColor(...colors.steelBlue);
          doc.setLineWidth(0.5);
          doc.line(ddX, ganttTop - 3, ddX, pageContentBottom);
          doc.setFontSize(5.5);
          doc.setTextColor(...colors.steelBlue);
          doc.text("DD", ddX + 0.5, ganttTop - 3.5);
        }
      }

      // ─── Draw Rows (Group Headers + Activity Bars) ────────────────────────
      // ─── Draw outer border: left edge of table ─────────────────────
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.3);
      // Left border of table
      doc.line(ganttLeft, ganttTop - colHeaderH - 1, ganttLeft, pageContentBottom);
      // Right border of Gantt
      doc.line(ganttRight, ganttTop - colHeaderH - 1, ganttRight, pageContentBottom);
      // Top border (across full width)
      doc.line(ganttLeft, ganttTop - colHeaderH - 1, ganttRight, ganttTop - colHeaderH - 1);
      // Bottom border (across full width)
      doc.line(ganttLeft, pageContentBottom, ganttRight, pageContentBottom);
      // Separator between column headers and data rows
      doc.line(ganttLeft, ganttTop, ganttRight, ganttTop);

      pageRows.forEach((row, i) => {
        const y = rowYOffsets[i];
        const rh = getRowH(row);
        const barH = rh * 0.38;

        if (row.type === "group") {
          // WBS Group Header row — use WBS Manager color if set, fallback to depth palette
          const depth = row.depth;
          if (row.bgColor) {
            const rgb = hexToRgb(row.bgColor);
            // Use full opacity — match exactly what the user sees in the app
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          } else {
            doc.setFillColor(...WBS_DEPTH_BG[depth % WBS_DEPTH_BG.length]);
          }
          doc.rect(ganttLeft, y, ganttRight - ganttLeft, rh, "F");

          // P6-style colored left bars — one per ancestor level
          const anc = row.ancestorColors || [];
          const barW = 1.2; // mm width per bar
          const barGap = 0.4; // mm gap between bars
          for (let ai = 0; ai < anc.length; ai++) {
            const rgb = hexToRgb(anc[ai]);
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.rect(ganttLeft + ai * (barW + barGap), y, barW, rh, "F");
          }
          const leftBarsWidth = anc.length > 0 ? anc.length * (barW + barGap) + 1 : 0;

          // Group label text — use WBS Manager text color if set
          if (row.textColor) {
            const tc = hexToRgb(row.textColor);
            doc.setTextColor(tc[0], tc[1], tc[2]);
          } else {
            doc.setTextColor(30, 35, 45);
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(depth === 0 ? 7.5 : depth === 1 ? 7 : 6.5);
          // Truncate label instead of wrapping
          let groupLabel = row.label;
          const groupMaxW = labelWidth - leftBarsWidth - 4;
          if (doc.getTextWidth(groupLabel) > groupMaxW) {
            while (doc.getTextWidth(groupLabel + "...") > groupMaxW && groupLabel.length > 3) {
              groupLabel = groupLabel.slice(0, -1);
            }
            groupLabel = groupLabel + "...";
          }
          doc.text(groupLabel, ganttLeft + leftBarsWidth + 2, y + rh / 2 + 0.8);

          // ── WBS Summary Bar in Gantt area ──
          const childActs = row.groupActivities || [];
          let summaryStart = Infinity;
          let summaryEnd = -Infinity;
          for (const child of childActs) {
            if (child.earlyStart) summaryStart = Math.min(summaryStart, new Date(child.earlyStart).getTime());
            if (child.earlyFinish) summaryEnd = Math.max(summaryEnd, new Date(child.earlyFinish).getTime());
          }
          if (summaryStart < Infinity && summaryEnd > -Infinity) {
            const sbx1 = dateToX(new Date(summaryStart));
            const sbx2 = dateToX(new Date(summaryEnd));
            const sbw = Math.max(sbx2 - sbx1, 2);
            const sbh = Math.max(2, rh * 0.28);
            const sby = y + rh / 2 - sbh / 2;
            // Summary bar — use WBS color if set, otherwise dark
            if (row.bgColor) {
              const srgb = hexToRgb(row.bgColor);
              doc.setFillColor(srgb[0], srgb[1], srgb[2]);
            } else {
              doc.setFillColor(40, 40, 40);
            }
            doc.rect(sbx1, sby, sbw, sbh, "F");
            // Start bracket (downward tick)
            const tickW = Math.max(0.5, sbh * 0.3);
            const tickH = sbh + Math.max(1, sbh * 0.5);
            doc.rect(sbx1, sby, tickW, tickH, "F");
            // End bracket (downward tick)
            doc.rect(sbx1 + sbw - tickW, sby, tickW, tickH, "F");
            // Diamond at end
            const dx = sbx1 + sbw;
            const dy = sby + sbh / 2;
            const ds = Math.max(1, sbh * 0.4);
            doc.triangle(dx, dy - ds, dx + ds, dy, dx, dy + ds, "F");
            doc.triangle(dx, dy - ds, dx - ds, dy, dx, dy + ds, "F");
          }

          // Separator — consistent with activity row separators
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.15);
          doc.line(ganttLeft, y + rh, ganttRight, y + rh);
          return;
        }

        const act = row.act;

        // Alternating row background (full width including label area)
        if (i % 2 === 0) {
          doc.setFillColor(...colors.warmGray);
          doc.rect(ganttLeft, y, ganttRight - ganttLeft, rh, "F");
        }

        // P6-style colored left bars on activity rows — one per ancestor level
        const actAnc = row.ancestorColors || [];
        const actBarW = 1.2; // mm width per bar
        const actBarGap = 0.4; // mm gap between bars
        for (let ai = 0; ai < actAnc.length; ai++) {
          const rgb = hexToRgb(actAnc[ai]);
          doc.setFillColor(rgb[0], rgb[1], rgb[2]);
          doc.rect(ganttLeft + ai * (actBarW + actBarGap), y, actBarW, rh, "F");
        }

        // Row separator line — thin but visible for clean visual separation
        doc.setDrawColor(...colors.lightBorder);
        doc.setLineWidth(0.15);
        doc.line(ganttLeft, y + rh, ganttRight, y + rh);
        // Also draw top separator for first row
        if (i === 0) {
          doc.line(ganttLeft, y, ganttRight, y);
        }

        // Calculate depth bars width for text offset
        const actLeftBarsWidth = actAnc.length > 0 ? actAnc.length * (actBarW + actBarGap) + 0.5 : 0;

        // Activity columns (dynamic based on visible columns)
        doc.setFontSize(6.5);
        const txtColor = act.isCritical ? colors.critical : colors.text;
        doc.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
        doc.setFont("helvetica", act.isCritical ? "bold" : "normal");
        let cellX = ganttLeft;
        for (let ci = 0; ci < ganttActiveCols.length; ci++) {
          const col = ganttActiveCols[ci];
          const cw = ganttColWidths[ci];
          let val = col.getValue(act);
          const isLeft = col.header === "Activity Name" || col.header === "ID";
          // For the first column (ID), offset text past the depth bars
          const textOffset = ci === 0 ? actLeftBarsWidth : 0;
          // Truncate all cell values to prevent wrapping
          const cellMaxW = cw - 3 - textOffset;
          if (doc.getTextWidth(val) > cellMaxW) {
            while (doc.getTextWidth(val + "...") > cellMaxW && val.length > 3) {
              val = val.slice(0, -1);
            }
            val = val + "...";
          }
          if (isLeft) {
            doc.text(val, cellX + 1.5 + textOffset, y + rh / 2 + 0.8);
          } else {
            doc.text(val, cellX + cw / 2, y + rh / 2 + 0.8, { align: "center" });
          }
          // Column separator line
          if (ci > 0) {
            doc.setDrawColor(...colors.lightBorder);
            doc.setLineWidth(0.1);
            doc.line(cellX, y, cellX, y + rh);
          }
          cellX += cw;
        }

        // Vertical separator between table and chart
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.15);
        doc.line(chartLeft, y, chartLeft, y + rh);

        // Bar
        if (act.earlyStart && act.earlyFinish) {
          const x1 = dateToX(act.earlyStart);
          const x2 = dateToX(act.earlyFinish);
          const barWidth = Math.max(x2 - x1, 1.5);
          const barY = y + (rh - barH) / 2;

          // Determine bar color
          let barColor: [number, number, number];
          if (act.barColor) {
            const hex = act.barColor.replace('#', '');
            barColor = [
              parseInt(hex.substring(0, 2), 16),
              parseInt(hex.substring(2, 4), 16),
              parseInt(hex.substring(4, 6), 16)
            ];
          } else if (act.isCritical) {
            barColor = colors.critical;
          } else {
            barColor = colors.green;
          }

          if (act.activityType === "milestone" || act.duration === 0) {
            // Diamond for milestone — smaller, professional P6-style
            const diamondSize = barH * 0.9;
            const cx = x1;
            const cy = barY + barH / 2;
            const half = diamondSize / 2;

            doc.setFillColor(...barColor);
            doc.setDrawColor(...barColor);
            doc.setLineWidth(0.2);

            const points = [
              [cx, cy - half],
              [cx + half, cy],
              [cx, cy + half],
              [cx - half, cy],
            ];
            for (let t = 0; t < 4; t++) {
              const p1 = points[t];
              const p2 = points[(t + 1) % 4];
              doc.triangle(cx, cy, p1[0], p1[1], p2[0], p2[1], "F");
            }

            // Label — smart placement with font scaling for milestones
            const mBaseFontSize = 6.5;
            doc.setFontSize(mBaseFontSize);
            doc.setFont("helvetica", "normal");
            const mLabelStartX = cx + half + 1.5;
            const mPageEdge = pageWidth - margin;
            const mRightSpace = mPageEdge - mLabelStartX;
            const mLeftSpace = (cx - half) - chartLeft - 1.5;
            const mFullLabel = act.name;
            const mMinUseful = 8;

            const mRightFits = doc.getTextWidth(mFullLabel) <= mRightSpace;
            const mLeftFits = doc.getTextWidth(act.name) <= mLeftSpace;

            if (mRightFits) {
              doc.setTextColor(...colors.text);
              doc.text(mFullLabel, mLabelStartX, cy + 0.8);
            } else if (mLeftFits) {
              doc.setTextColor(...colors.text);
              doc.text(act.name, cx - half - 1.5, cy + 0.8, { align: "right" });
            } else {
              // Try smaller font
              const mSmallFont = 5;
              doc.setFontSize(mSmallFont);
              const mSmallRightFits = doc.getTextWidth(mFullLabel) <= mRightSpace;
              const mSmallLeftFits = doc.getTextWidth(`${act.name} -`) <= mLeftSpace;

              if (mSmallRightFits) {
                doc.setTextColor(...colors.text);
                doc.text(mFullLabel, mLabelStartX, cy + 0.6);
              } else if (mSmallLeftFits) {
                doc.setTextColor(...colors.text);
                doc.text(`${act.name} -`, cx - half - 1.5, cy + 0.6, { align: "right" });
              } else if (mRightSpace >= mLeftSpace && mRightSpace >= mMinUseful) {
                doc.setTextColor(...colors.text);
                let milestoneLabel = mFullLabel;
                if (doc.getTextWidth(milestoneLabel) > mRightSpace) {
                  while (doc.getTextWidth(milestoneLabel + "...") > mRightSpace && milestoneLabel.length > 3) {
                    milestoneLabel = milestoneLabel.slice(0, -1);
                  }
                  milestoneLabel = milestoneLabel + "...";
                }
                doc.text(milestoneLabel, mLabelStartX, cy + 0.6);
              } else if (mLeftSpace >= mMinUseful) {
                doc.setTextColor(...colors.text);
                let milestoneLabel = act.name;
                if (doc.getTextWidth(milestoneLabel) > mLeftSpace) {
                  while (doc.getTextWidth("..." + milestoneLabel) > mLeftSpace && milestoneLabel.length > 3) {
                    milestoneLabel = milestoneLabel.slice(1);
                  }
                  milestoneLabel = "..." + milestoneLabel;
                }
                doc.text(milestoneLabel, cx - half - 1.5, cy + 0.6, { align: "right" });
              }
            }
            doc.setFontSize(mBaseFontSize);
          } else {
            // Regular bar — flat sharp rectangles (P6-style)
            doc.setFillColor(...barColor);
            doc.rect(x1, barY, barWidth, barH, "F");

            // Progress fill — darker shade inside bar
            const pct = parseFloat(act.percentComplete) / 100;
            if (pct > 0 && pct < 1) {
              const darkColor = barColor.map(c => Math.max(0, c - 60)) as [number, number, number];
              doc.setFillColor(...darkColor);
              doc.rect(x1, barY, barWidth * pct, barH, "F");
            }

            // Float bar removed — total float is shown in the TF column instead

            // Label — smart placement with font scaling for tight spaces
            const baseFontSize = 6.5;
            doc.setFontSize(baseFontSize);
            doc.setFont("helvetica", "normal");
            const fullLabel = act.name;
            const rightStartX = x2 + 1.5;
            // Allow labels to extend beyond chart area to page edge (labels are text, not bars)
            const pageEdge = pageWidth - margin;
            const rightSpace = pageEdge - rightStartX;
            const leftSpace = x1 - chartLeft - 1.5;
            const labelTextWidth = doc.getTextWidth(fullLabel);
            const minUseful = 8; // reduced minimum for tighter fits

            // Try full label at normal size first
            const rightFits = labelTextWidth <= rightSpace;
            const leftFits = doc.getTextWidth(act.name) <= leftSpace;

            if (rightFits) {
              doc.setTextColor(...colors.text);
              doc.text(fullLabel, rightStartX, barY + barH / 2 + 0.8);
            } else if (leftFits) {
              doc.setTextColor(...colors.text);
              doc.text(act.name, x1 - 1.5, barY + barH / 2 + 0.8, { align: "right" });
            } else {
              // Try smaller font (5pt) to fit the full label
              const smallFont = 5;
              doc.setFontSize(smallFont);
              const smallRightFits = doc.getTextWidth(fullLabel) <= rightSpace;
              const smallLeftFits = doc.getTextWidth(act.name) <= leftSpace;

              if (smallRightFits) {
                doc.setTextColor(...colors.text);
                doc.text(fullLabel, rightStartX, barY + barH / 2 + 0.6);
              } else if (smallLeftFits) {
                doc.setTextColor(...colors.text);
                doc.text(act.name, x1 - 1.5, barY + barH / 2 + 0.6, { align: "right" });
              } else if (rightSpace >= leftSpace && rightSpace >= minUseful) {
                // Truncate at small font on the side with more room
                doc.setTextColor(...colors.text);
                let barLabel = fullLabel;
                if (doc.getTextWidth(barLabel) > rightSpace) {
                  while (doc.getTextWidth(barLabel + "...") > rightSpace && barLabel.length > 3) {
                    barLabel = barLabel.slice(0, -1);
                  }
                  barLabel = barLabel + "...";
                }
                doc.text(barLabel, rightStartX, barY + barH / 2 + 0.6);
              } else if (leftSpace >= minUseful) {
                doc.setTextColor(...colors.text);
                let barLabel = act.name;
                if (doc.getTextWidth(barLabel) > leftSpace) {
                  while (doc.getTextWidth("..." + barLabel) > leftSpace && barLabel.length > 3) {
                    barLabel = barLabel.slice(1);
                  }
                  barLabel = "..." + barLabel;
                }
                doc.text(barLabel, x1 - 1.5, barY + barH / 2 + 0.6, { align: "right" });
              } else if (barWidth > 6) {
                // Inside bar at small font
                doc.setTextColor(255, 255, 255);
                let barLabel = act.name;
                const insideSpace = barWidth - 1.5;
                if (doc.getTextWidth(barLabel) > insideSpace) {
                  while (doc.getTextWidth(barLabel + "...") > insideSpace && barLabel.length > 3) {
                    barLabel = barLabel.slice(0, -1);
                  }
                  barLabel = barLabel + "...";
                }
                doc.text(barLabel, x1 + 0.75, barY + barH / 2 + 0.6);
              }
            }
            // Restore font size for next iteration
            doc.setFontSize(baseFontSize);
          }
        }
      });

      // ─── Draw Logic Lines (Relationship Arrows) on this page ──────────
      if (showLogicLines && options.relationships.length > 0) {
        // Build a map from DB activity id to bar position on this page
        type BarPos = { x1: number; x2: number; yMid: number };
        const barPositions = new Map<number, BarPos>();

        pageRows.forEach((row, i) => {
          if (row.type !== "activity") return;
          const act = row.act;
          if (!act.earlyStart || !act.earlyFinish || !act.id) return;
          const y = rowYOffsets[i];
          const rh = getRowH(row);
          const barH = rh * 0.38;
          const x1 = dateToX(act.earlyStart);
          const x2 = dateToX(act.earlyFinish);
          const barWidth = Math.max(x2 - x1, 1.5);
          const barY = y + (rh - barH) / 2;
          const yMid = barY + barH / 2;
          if (act.activityType === "milestone" || act.duration === 0) {
            barPositions.set(act.id, { x1: x1, x2: x1, yMid });
          } else {
            barPositions.set(act.id, { x1, x2: x1 + barWidth, yMid });
          }
        });

        if (barPositions.size > 0) {
          doc.setDrawColor(80, 90, 110);
          doc.setLineWidth(0.15);

          for (const rel of options.relationships) {
            const predPos = barPositions.get(rel.predecessorId);
            const succPos = barPositions.get(rel.successorId);
            if (!predPos || !succPos) continue; // one or both not on this page

            const type = rel.relationshipType || "FS";
            let sx: number, sy: number, ex: number, ey: number;

            switch (type) {
              case "FS": sx = predPos.x2; sy = predPos.yMid; ex = succPos.x1; ey = succPos.yMid; break;
              case "SS": sx = predPos.x1; sy = predPos.yMid; ex = succPos.x1; ey = succPos.yMid; break;
              case "FF": sx = predPos.x2; sy = predPos.yMid; ex = succPos.x2; ey = succPos.yMid; break;
              case "SF": sx = predPos.x1; sy = predPos.yMid; ex = succPos.x2; ey = succPos.yMid; break;
              default:   sx = predPos.x2; sy = predPos.yMid; ex = succPos.x1; ey = succPos.yMid;
            }

            // Draw right-angle routing
            doc.setLineDashPattern([], 0);
            if (Math.abs(sy - ey) < 0.5) {
              // Same row — straight line
              doc.line(sx, sy, ex, ey);
            } else {
              // Route: horizontal → vertical → horizontal
              const midX = Math.max(sx + 2, sx + (ex - sx) / 2);
              doc.line(sx, sy, midX, sy);
              doc.line(midX, sy, midX, ey);
              doc.line(midX, ey, ex, ey);
            }

            // Arrowhead at destination (small triangle)
            const arrowSize = 0.8;
            const isRightArrow = type === "FF" || type === "SF";
            if (isRightArrow) {
              // Arrow pointing right
              doc.setFillColor(80, 90, 110);
              doc.triangle(ex, ey, ex - arrowSize * 1.5, ey - arrowSize, ex - arrowSize * 1.5, ey + arrowSize, "F");
            } else {
              // Arrow pointing left (toward start of successor)
              doc.setFillColor(80, 90, 110);
              doc.triangle(ex, ey, ex + arrowSize * 1.5, ey - arrowSize, ex + arrowSize * 1.5, ey + arrowSize, "F");
            }
          }
        }
      }

      // ─── Draw Annotations (Text Boxes, Arrows, Shading) on this page ───
      if (options.annotations && options.annotations.length > 0 && options.ganttPixelsPerDay && options.ganttRangeStartMs) {
        const screenPpd = options.ganttPixelsPerDay;
        const screenRangeStart = new Date(options.ganttRangeStartMs);
        // HEADER_HEIGHT in screen space = 48px
        const SCREEN_HEADER_H = 48;

        // Build cumulative screen Y offsets for ALL pdfRows (not just this page)
        // so we can figure out which page an annotation falls on
        const screenRowHeights: number[] = [];
        const screenRowYOffsets: number[] = [];
        let screenCumY = SCREEN_HEADER_H;
        for (const row of pdfRows) {
          screenRowYOffsets.push(screenCumY);
          // Screen row heights: WBS groups use getWbsRowHeight, activities use getActivityRowHeight
          // These match the GanttChart's flatRows computation
          if (row.type === "group") {
            const depth = row.depth;
            const h = depth <= 0 ? 34 : depth === 1 ? 28 : 24;
            screenRowHeights.push(h);
            screenCumY += h;
          } else {
            screenRowHeights.push(32); // getActivityRowHeight(false)
            screenCumY += 32;
          }
        }
        // screenCumY now represents total content height in screen space

        // Compute the screen Y range for each page
        // Page i covers pdfRows from pages[0..i-1] accumulated
        let globalRowIdx = 0;
        const pageScreenYStart: number[] = [];
        const pageScreenYEnd: number[] = [];
        for (let pi = 0; pi < pages.length; pi++) {
          const firstRowGlobalIdx = globalRowIdx;
          pageScreenYStart.push(screenRowYOffsets[firstRowGlobalIdx] || SCREEN_HEADER_H);
          const lastRowGlobalIdx = globalRowIdx + pages[pi].length - 1;
          pageScreenYEnd.push((screenRowYOffsets[lastRowGlobalIdx] || SCREEN_HEADER_H) + (screenRowHeights[lastRowGlobalIdx] || 32));
          globalRowIdx += pages[pi].length;
        }

        // Helper: convert screen X (content-space px) to PDF X (mm)
        const screenXToPdfX = (sx: number): number => {
          // sx is in content-space pixels where x=0 is the left edge of the canvas
          // In screen space: date position = daysBetween(rangeStart, date) * pixelsPerDay
          // So sx corresponds to a date: screenRangeStart + (sx / screenPpd) days
          const dayOffset = sx / screenPpd;
          const dateMs = screenRangeStart.getTime() + dayOffset * 86400000;
          const date = new Date(dateMs);
          return dateToX(date);
        };

        // Helper: convert screen Y to PDF page index and PDF Y
        const screenYToPdf = (sy: number): { pageIndex: number; pdfY: number } | null => {
          for (let pi = 0; pi < pages.length; pi++) {
            if (sy >= pageScreenYStart[pi] && sy < pageScreenYEnd[pi]) {
              // Map within this page
              const screenPageH = pageScreenYEnd[pi] - pageScreenYStart[pi];
              // PDF page height for content = sum of row heights on this page
              let pdfPageH = 0;
              for (let ri = 0; ri < pages[pi].length; ri++) {
                pdfPageH += getRowH(pages[pi][ri]);
              }
              const fraction = (sy - pageScreenYStart[pi]) / screenPageH;
              return { pageIndex: pi, pdfY: ganttTop + fraction * pdfPageH };
            }
          }
          // If annotation is above all rows, put on first page at ganttTop
          if (sy < (pageScreenYStart[0] || SCREEN_HEADER_H)) {
            return { pageIndex: 0, pdfY: ganttTop };
          }
          // If below all rows, put on last page at bottom
          return { pageIndex: pages.length - 1, pdfY: ganttBottom };
        };

        // Helper: convert screen width (px) to PDF width (mm)
        const screenWToPdfW = (sw: number): number => {
          // Use the ratio of chart widths
          const screenTotalW = options.ganttScreenWidth || 2000;
          return (sw / screenTotalW) * chartWidth;
        };

        // Helper: convert screen height (px) to PDF height (mm) for a given page
        const screenHToPdfH = (sh: number, pi: number): number => {
          const screenPageH = pageScreenYEnd[pi] - pageScreenYStart[pi];
          let pdfPageH = 0;
          for (const row of pages[pi]) pdfPageH += getRowH(row);
          return (sh / screenPageH) * pdfPageH;
        };

        // Helper: parse hex color to RGB
        const hexToRgbLocal = (hex: string): [number, number, number] => {
          const h = hex.replace('#', '');
          return [
            parseInt(h.substring(0, 2), 16) || 0,
            parseInt(h.substring(2, 4), 16) || 0,
            parseInt(h.substring(4, 6), 16) || 0,
          ];
        };

        // We need to draw annotations on the correct page
        // The current page in the loop is pageIdx, but we need to iterate all annotations
        // and draw them on their respective pages. Since we're inside the page loop,
        // we only draw annotations that belong to this page.

        for (const ann of options.annotations) {
          if (ann.type === "shading" && ann.x != null && ann.y != null && ann.width && ann.height) {
            const topLeft = screenYToPdf(ann.y);
            if (!topLeft || topLeft.pageIndex !== pageIdx) continue;

            const px1 = screenXToPdfX(ann.x);
            const px2 = screenXToPdfX(ann.x + ann.width);
            const pdfW = Math.abs(px2 - px1);
            const pdfH = screenHToPdfH(ann.height, pageIdx);

            // Clip to chart area
            const clippedX = Math.max(px1, chartLeft);
            const clippedRight = Math.min(px1 + pdfW, ganttRight);
            const clippedW = clippedRight - clippedX;
            if (clippedW <= 0) continue;

            const rgb = hexToRgbLocal(ann.color || "#3b82f6");
            const opacity = ann.opacity ?? 0.15;

            // Draw solid fill with opacity (use alpha channel)
            doc.setGState(new GState({ opacity }));
            doc.setFillColor(rgb[0], rgb[1], rgb[2]);
            doc.rect(clippedX, topLeft.pdfY, clippedW, pdfH, "F");

            // Draw pattern overlay if not solid
            if (ann.pattern && ann.pattern !== "solid") {
              doc.setGState(new GState({ opacity: opacity * 0.6 }));
              doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
              doc.setLineWidth(0.15);
              if (ann.pattern === "hatching" || ann.pattern === "crosshatch") {
                // Draw diagonal lines
                const step = 2; // mm between lines
                for (let lx = clippedX - pdfH; lx < clippedX + clippedW; lx += step) {
                  const x1c = Math.max(lx, clippedX);
                  const x2c = Math.min(lx + pdfH, clippedX + clippedW);
                  if (x1c < x2c) {
                    const y1c = topLeft.pdfY + (x1c - lx);
                    const y2c = topLeft.pdfY + (x2c - lx);
                    doc.line(x1c, y1c, x2c, y2c);
                  }
                }
                if (ann.pattern === "crosshatch") {
                  for (let lx = clippedX - pdfH; lx < clippedX + clippedW; lx += step) {
                    const x1c = Math.max(lx, clippedX);
                    const x2c = Math.min(lx + pdfH, clippedX + clippedW);
                    if (x1c < x2c) {
                      const y1c = topLeft.pdfY + pdfH - (x1c - lx);
                      const y2c = topLeft.pdfY + pdfH - (x2c - lx);
                      doc.line(x1c, y1c, x2c, y2c);
                    }
                  }
                }
              } else if (ann.pattern === "dots") {
                const step = 2;
                for (let dx = clippedX + step; dx < clippedX + clippedW; dx += step) {
                  for (let dy = topLeft.pdfY + step; dy < topLeft.pdfY + pdfH; dy += step) {
                    doc.circle(dx, dy, 0.2, "F");
                  }
                }
              }
            }

            // Reset opacity
            doc.setGState(new GState({ opacity: 1 }));

            // Draw label if present
            if (ann.label) {
              doc.setFontSize(7);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(rgb[0], rgb[1], rgb[2]);
              doc.text(ann.label, clippedX + clippedW / 2, topLeft.pdfY + pdfH / 2 + 1, { align: "center" });
            }
          }

          if (ann.type === "arrow" && ann.x1 != null && ann.y1 != null && ann.x2 != null && ann.y2 != null) {
            const startPos = screenYToPdf(ann.y1);
            const endPos = screenYToPdf(ann.y2);
            // Only draw if both endpoints are on this page
            if (!startPos || !endPos || startPos.pageIndex !== pageIdx || endPos.pageIndex !== pageIdx) continue;

            const px1 = screenXToPdfX(ann.x1);
            const py1 = startPos.pdfY;
            const px2 = screenXToPdfX(ann.x2);
            const py2 = endPos.pdfY;

            const rgb = hexToRgbLocal(ann.color || "#ef4444");
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            const sw = Math.max((ann.strokeWidth || 2) * 0.3, 0.3); // scale stroke to mm
            doc.setLineWidth(sw);

            // Dash pattern
            if (ann.lineStyle === "dashed") {
              doc.setLineDashPattern([sw * 4, sw * 2], 0);
            } else if (ann.lineStyle === "dotted") {
              doc.setLineDashPattern([sw, sw * 2], 0);
            } else {
              doc.setLineDashPattern([], 0);
            }

            doc.line(px1, py1, px2, py2);
            doc.setLineDashPattern([], 0); // reset

            // Draw arrowhead at end
            const endEp = ann.endEndpoint || "arrow";
            if (endEp === "arrow") {
              const angle = Math.atan2(py2 - py1, px2 - px1);
              const arrowLen = 1.5;
              const arrowAngle = Math.PI / 6;
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              doc.triangle(
                px2, py2,
                px2 - arrowLen * Math.cos(angle - arrowAngle), py2 - arrowLen * Math.sin(angle - arrowAngle),
                px2 - arrowLen * Math.cos(angle + arrowAngle), py2 - arrowLen * Math.sin(angle + arrowAngle),
                "F"
              );
            } else if (endEp === "circle") {
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              doc.circle(px2, py2, 0.6, "F");
            } else if (endEp === "diamond") {
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              const ds = 0.8;
              doc.triangle(px2, py2 - ds, px2 + ds, py2, px2, py2 + ds, "F");
              doc.triangle(px2, py2 - ds, px2 - ds, py2, px2, py2 + ds, "F");
            }

            // Draw start endpoint
            const startEp = ann.startEndpoint || "none";
            if (startEp === "arrow") {
              const angle = Math.atan2(py1 - py2, px1 - px2);
              const arrowLen = 1.5;
              const arrowAngle = Math.PI / 6;
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              doc.triangle(
                px1, py1,
                px1 - arrowLen * Math.cos(angle - arrowAngle), py1 - arrowLen * Math.sin(angle - arrowAngle),
                px1 - arrowLen * Math.cos(angle + arrowAngle), py1 - arrowLen * Math.sin(angle + arrowAngle),
                "F"
              );
            } else if (startEp === "circle") {
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              doc.circle(px1, py1, 0.6, "F");
            } else if (startEp === "diamond") {
              doc.setFillColor(rgb[0], rgb[1], rgb[2]);
              const ds = 0.8;
              doc.triangle(px1, py1 - ds, px1 + ds, py1, px1, py1 + ds, "F");
              doc.triangle(px1, py1 - ds, px1 - ds, py1, px1, py1 + ds, "F");
            }

            // Arrow label
            if (ann.label) {
              doc.setFontSize(6);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(rgb[0], rgb[1], rgb[2]);
              const midX = (px1 + px2) / 2;
              const midY = (py1 + py2) / 2 - 1.5;
              doc.text(ann.label, midX, midY, { align: "center" });
            }
          }

          if (ann.type === "text" && ann.x != null && ann.y != null) {
            const pos = screenYToPdf(ann.y);
            if (!pos || pos.pageIndex !== pageIdx) continue;

            const px = screenXToPdfX(ann.x);
            const py = pos.pdfY;
            const pdfW = screenWToPdfW(ann.width || 200);
            const pdfH = screenHToPdfH(ann.height || 40, pageIdx);

            // Background
            const bgColor = ann.bgColor || "#fef08a";
            if (bgColor !== "transparent") {
              const bgRgb = hexToRgbLocal(bgColor);
              doc.setFillColor(bgRgb[0], bgRgb[1], bgRgb[2]);
              doc.roundedRect(px, py, pdfW, Math.max(pdfH, 4), 0.8, 0.8, "F");
            }

            // Border
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.15);
            doc.roundedRect(px, py, pdfW, Math.max(pdfH, 4), 0.8, 0.8, "S");

            // Text
            if (ann.text) {
              const textRgb = hexToRgbLocal(ann.color || "#000000");
              doc.setTextColor(textRgb[0], textRgb[1], textRgb[2]);
              // Scale font size: screen fontSize is in px, PDF needs reasonable mm-based size
              const screenFs = ann.fontSize || 13;
              const pdfFs = Math.max(5, Math.min(12, screenFs * 0.55));
              doc.setFontSize(pdfFs);
              doc.setFont("helvetica", ann.bold ? "bold" : "normal");

              // Word-wrap text within the box
              const textPadding = 1.5;
              const maxTextW = pdfW - textPadding * 2;
              const lines = doc.splitTextToSize(ann.text, maxTextW);
              const lineH = pdfFs * 0.4; // approximate line height in mm
              let ty = py + textPadding + lineH;
              for (const line of lines) {
                if (ty > py + Math.max(pdfH, 4) - 0.5) break; // don't overflow box
                doc.text(line, px + textPadding, ty);
                ty += lineH;
              }
            }
          }
        }
      }
    }

    // Draw inline legend on the last page (below the last activity row) when legendPlacement is "inline"
    if (!legendInFooter) {
      const lastPageNum = doc.getNumberOfPages();
      doc.setPage(lastPageNum);
      // Find the Y position after the last drawn row
      const inlineLegendY = pageHeight - footerHeight - 8;
      const lBarW = 6;
      const lBarH = 2;
      doc.setFontSize(6);
      doc.setFont("helvetica", "normal");
      let ilx = margin + 4;
      const ilSpacing = 32;

      // Critical bar (red)
      doc.setFillColor(239, 68, 68);
      doc.rect(ilx, inlineLegendY, lBarW, lBarH, "F");
      doc.setTextColor(20, 20, 20);
      doc.text("Critical", ilx + lBarW + 1.5, inlineLegendY + lBarH - 0.3);
      ilx += ilSpacing;

      // Normal bar (green)
      doc.setFillColor(22, 130, 60);
      doc.rect(ilx, inlineLegendY, lBarW, lBarH, "F");
      doc.text("Non-Critical", ilx + lBarW + 1.5, inlineLegendY + lBarH - 0.3);
      ilx += ilSpacing + 4;

      // Milestone diamond
      const mx = ilx + 1.5;
      const my = inlineLegendY + lBarH / 2;
      const ms = 1.2;
      doc.setFillColor(20, 20, 20);
      doc.triangle(mx, my - ms, mx + ms, my, mx, my + ms, "F");
      doc.triangle(mx, my - ms, mx - ms, my, mx, my + ms, "F");
      doc.text("Milestone", mx + ms + 2, inlineLegendY + lBarH - 0.3);
      ilx += ilSpacing;

      // Data date line
      if (dataDate) {
        doc.setDrawColor(74, 111, 165);
        doc.setLineWidth(0.5);
        doc.line(ilx, inlineLegendY, ilx, inlineLegendY + lBarH);
        doc.setTextColor(20, 20, 20);
        doc.text("Data Date", ilx + 2, inlineLegendY + lBarH - 0.3);
        ilx += ilSpacing;
      }

      // Summary bar
      doc.setFillColor(40, 40, 40);
      doc.rect(ilx, inlineLegendY + 0.3, lBarW, lBarH * 0.6, "F");
      const stickW = 0.4;
      doc.rect(ilx, inlineLegendY + 0.3, stickW, lBarH, "F");
      doc.rect(ilx + lBarW - stickW, inlineLegendY + 0.3, stickW, lBarH, "F");
      doc.setTextColor(20, 20, 20);
      doc.text("Summary", ilx + lBarW + 1.5, inlineLegendY + lBarH - 0.3);
    }
  }

  // ─── Add Page Numbers ───────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // ─── Save ───────────────────────────────────────────────────────────────────
  const fileName = `${scheduleName.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(fileName);
}
