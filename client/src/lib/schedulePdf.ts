/**
 * Schedule PDF Export — generates a professional PDF with activity table and Gantt chart.
 * Uses jsPDF + jspdf-autotable for the table, and custom drawing for the Gantt.
 * Light/professional theme matching the scheduler UI.
 */
import jsPDF from "jspdf";
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
  const footerHeight = Math.max(userFooterHeight, minFooterH);

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
    } else {
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.rect(margin, 2, pageWidth - 2 * margin, headerHeight - 2, "S");
    }
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
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.2);
    // Top border of footer
    doc.line(margin, y, pageWidth - margin, y);
    // Left border (header bottom to footer bottom)
    doc.line(margin, 2, margin, pageHeight - 2);
    // Right border (header bottom to footer bottom)
    doc.line(pageWidth - margin, 2, pageWidth - margin, pageHeight - 2);
    // Bottom border
    doc.line(margin, pageHeight - 2, pageWidth - margin, pageHeight - 2);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.muted);
    const ftrPad = 2.5; // Inner padding from footer border

    const ctx = { pageNum, totalPages, scheduleName, dataDate, projectStartDate, companyName, projectName };

    if (footerConfig) {
      const usableWidth = pageWidth - 2 * margin;
      const cols = footerConfig.columns;
      const footerMidY = y + footerHeight / 2 + 1;

      const slotMaxW = usableWidth / cols;
      const renderFooterSlot = (token: string, x: number, fy: number, align: "left" | "center" | "right") => {
        if (isImageToken(token)) {
          addImageToDoc(doc, token, x, y + 1, footerHeight - 2, align, slotMaxW - 2);
        } else if (isRichTextToken(token)) {
          const lines = parseRichTextToken(token);
          renderRichText(doc, lines, x, y, footerHeight, align);
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
      const defaultMidY = y + footerHeight / 2 + 1;
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
    const legendHeight = 8;
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
    const ganttActiveCols = columns.filter(k => ganttColDefs[k]).map(k => ganttColDefs[k]);
    // Compute column widths: sum minWidths, distribute extra to grow columns
    const totalMinW = ganttActiveCols.reduce((s, c) => s + c.minWidth, 0);
    // Table takes ~45% of page width, clamped to fit columns
    const usableWidth = pageWidth - 2 * margin;
    const labelWidth = Math.min(Math.max(totalMinW + 4, usableWidth * 0.35), usableWidth * 0.55);
    const ganttGrowCount = ganttActiveCols.filter(c => c.grow).length;
    const ganttExtraW = Math.max(0, labelWidth - totalMinW);
    const ganttColWidths = ganttActiveCols.map(c => {
      if (c.grow && ganttGrowCount > 0 && ganttExtraW > 0) return c.minWidth + ganttExtraW / ganttGrowCount;
      return c.minWidth;
    });

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
          // WBS Group Header row — P6-style depth-based colors
          const depth = row.depth;
          // Background — depth-based: green → yellow → red → pink
          const bgColor = WBS_DEPTH_BG[depth % WBS_DEPTH_BG.length];
          doc.setFillColor(...bgColor);
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

          // Group label text — bold dark text, smaller for professional density
          doc.setTextColor(30, 35, 45);
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
            // Dark summary bar
            doc.setFillColor(40, 40, 40);
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
    }

    // ─── Legend (on last Gantt page, below activities) ───────────────────
    const lastPage = pages[pages.length - 1] || [];
    let lastPageH = 0;
    for (const r of lastPage) lastPageH += getRowH(r);
    const legendY = ganttTop + lastPageH + 4;

    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");

    let legendX = ganttLeft;
    const legendSpacing = 40;

    // Critical bar
    doc.setFillColor(...colors.critical);
    doc.rect(legendX, legendY, 8, 2.5, "F");
    doc.setTextColor(...colors.text);
    doc.text("Critical Path", legendX + 10, legendY + 2);
    legendX += legendSpacing;

    // Normal bar
    doc.setFillColor(...colors.green);
    doc.rect(legendX, legendY, 8, 2.5, "F");
    doc.text("Non-Critical", legendX + 10, legendY + 2);
    legendX += legendSpacing;

    // Data date
    if (dataDate) {
      doc.setDrawColor(...colors.steelBlue);
      doc.setLineWidth(0.5);
      doc.line(legendX, legendY, legendX, legendY + 2.5);
      doc.setTextColor(...colors.text);
      doc.text("Data Date", legendX + 2, legendY + 2);
      legendX += legendSpacing;
    }

    // Total Float legend removed — float lines no longer drawn on bars

    // ─── ConstructLine branding (bottom-right, like P6's "Oracle Corporation") ──
    doc.setFontSize(5.5);
    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "normal");
    doc.text("\u00A9 ConstructLine", ganttRight, legendY + 2, { align: "right" });
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
