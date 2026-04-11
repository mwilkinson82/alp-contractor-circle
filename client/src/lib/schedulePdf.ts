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

  // Timescale / gridline options
  gridlineInterval?: "none" | "weekly" | "monthly" | "quarterly";
  timescaleLabels?: "months" | "quarters" | "both";

  // WBS grouping for Gantt
  groupedActivities?: Array<{
    group: string | null;
    activities: Array<{
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

function getImageDataUrl(token: string): string {
  return token.slice(7, -1); // strip {image: and }
}

function resolveToken(token: string, ctx: { pageNum: number; totalPages: number; scheduleName: string; dataDate: Date | null; projectStartDate: Date; companyName: string; projectName: string }): string {
  if (isImageToken(token)) return ""; // images handled separately
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

function addImageToDoc(doc: any, token: string, x: number, y: number, maxH: number, align: "left" | "center" | "right" = "left") {
  if (!isImageToken(token)) return;
  try {
    const dataUrl = getImageDataUrl(token);
    // jsPDF addImage with auto-detect format from data URL
    const imgH = maxH - 2;
    // Estimate width from aspect ratio (assume roughly 3:1 for logos)
    const imgW = imgH * 3;
    let ix = x;
    if (align === "right") ix = x - imgW;
    else if (align === "center") ix = x - imgW / 2;
    doc.addImage(dataUrl, ix, y, imgW, imgH);
  } catch (e) {
    // Silently fail if image can't be added
    console.warn("Failed to add image to PDF:", e);
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
  const headerHeight = 22;
  const footerHeight = 14;

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
  // P6-style WBS depth colors: green → yellow → red/salmon → pink/magenta
  const WBS_DEPTH_BG: [number, number, number][] = [
    [180, 220, 140],  // Depth 0: Green
    [255, 240, 130],  // Depth 1: Yellow
    [240, 150, 140],  // Depth 2: Red/Salmon
    [230, 170, 220],  // Depth 3: Pink/Magenta
    [180, 200, 240],  // Depth 4: Light Blue
    [255, 210, 150],  // Depth 5: Light Orange
  ];
  const hdrAccent = options.headerAccentColor ? hexToRgb(options.headerAccentColor) : colors.gold;
  const hdrText = options.headerTextColor ? hexToRgb(options.headerTextColor) : colors.white;

  // ─── Draw Header ────────────────────────────────────────────────────────────
  function drawHeader() {
    if (hdrBg) {
      doc.setFillColor(...hdrBg);
      doc.rect(0, 0, pageWidth, headerHeight, "F");
    } else {
      doc.setDrawColor(210, 210, 210);
      doc.setLineWidth(0.3);
      doc.rect(0, 0, pageWidth, headerHeight, "S");
    }
    doc.setFillColor(...hdrAccent);
    doc.rect(0, headerHeight - 0.6, pageWidth, 0.6, "F");

    const ctx = { pageNum: 0, totalPages: 0, scheduleName, dataDate, projectStartDate, companyName, projectName };

    if (headerConfig) {
      // Use configurable header columns
      const cols = headerConfig.columns;
      const usableWidth = pageWidth - 2 * margin;
      const midY = headerHeight / 2 + 1;

      // Left column - always bold gold (or image)
      if (isImageToken(headerConfig.left)) {
        addImageToDoc(doc, headerConfig.left, margin, 1, headerHeight - 2, "left");
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...hdrAccent);
        doc.text(resolveToken(headerConfig.left, ctx), margin, midY - 3);
      }

      // Other columns
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...hdrText);

      const renderHeaderSlot = (token: string, x: number, y: number, align: "left" | "center" | "right") => {
        if (isImageToken(token)) {
          addImageToDoc(doc, token, x, 1, headerHeight - 2, align);
        } else {
          doc.text(resolveToken(token, ctx), x, y, { align });
        }
      };

      if (cols === 3) {
        renderHeaderSlot(headerConfig.center, pageWidth / 2, midY, "center");
        renderHeaderSlot(headerConfig.right, pageWidth - margin, midY, "right");
      } else if (cols === 5) {
        const seg = usableWidth / 5;
        renderHeaderSlot(headerConfig.centerLeft || "", margin + seg, midY, "left");
        renderHeaderSlot(headerConfig.center, pageWidth / 2, midY, "center");
        renderHeaderSlot(headerConfig.centerRight || "", margin + seg * 3, midY, "left");
        renderHeaderSlot(headerConfig.right, pageWidth - margin, midY, "right");
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
    doc.line(margin, y, pageWidth - margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.muted);

    const ctx = { pageNum, totalPages, scheduleName, dataDate, projectStartDate, companyName, projectName };

    if (footerConfig) {
      const usableWidth = pageWidth - 2 * margin;
      const cols = footerConfig.columns;

      const renderFooterSlot = (token: string, x: number, fy: number, align: "left" | "center" | "right") => {
        if (isImageToken(token)) {
          addImageToDoc(doc, token, x, fy - 3, footerHeight - 2, align);
        } else {
          doc.text(resolveToken(token, ctx), x, fy, { align });
        }
      };

      // Left
      renderFooterSlot(footerConfig.left, margin, y + 5, "left");

      if (cols === 3) {
        renderFooterSlot(footerConfig.center, pageWidth / 2, y + 5, "center");
        renderFooterSlot(footerConfig.right, pageWidth - margin, y + 5, "right");
      } else if (cols === 4) {
        const seg = usableWidth / 4;
        renderFooterSlot(footerConfig.centerLeft || "", margin + seg, y + 5, "left");
        renderFooterSlot(footerConfig.centerRight || "", margin + seg * 2, y + 5, "left");
        renderFooterSlot(footerConfig.right, pageWidth - margin, y + 5, "right");
      } else if (cols === 5) {
        const seg = usableWidth / 5;
        renderFooterSlot(footerConfig.centerLeft || "", margin + seg, y + 5, "left");
        renderFooterSlot(footerConfig.center, pageWidth / 2, y + 5, "center");
        renderFooterSlot(footerConfig.centerRight || "", margin + seg * 3, y + 5, "left");
        renderFooterSlot(footerConfig.right, pageWidth - margin, y + 5, "right");
      }
    } else {
      doc.text(footerText || "Generated by ALP CPM Schedule Builder", margin, y + 5);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, y + 5, { align: "center" });
      doc.text(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), pageWidth - margin, y + 5, { align: "right" });
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
    maxDate = new Date(maxDate.getTime() + 14 * 86400000); // 2 week padding

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
    type PdfRow = { type: "group"; label: string; depth: number; bgColor?: string; textColor?: string; groupActivities?: typeof filteredActivities } | { type: "activity"; act: typeof filteredActivities[0] };
    const pdfRows: PdfRow[] = [];
    if (options.groupedActivities && options.groupedActivities.length > 0) {
      for (const g of options.groupedActivities) {
        if (g.group) {
          // Filter group activities by critical path if needed
          const gActs = showCriticalPathOnly ? g.activities.filter(a => a.isCritical) : g.activities;
          // Check if this group or its descendants have activities
          const hasActs = gActs.length > 0 || (!showCriticalPathOnly);
          if (hasActs || gActs.length > 0) {
            pdfRows.push({ type: "group", label: g.group, depth: g.depth, bgColor: g.wbsColor, textColor: g.wbsTextColor, groupActivities: gActs as any });
          }
          for (const act of gActs) {
            pdfRows.push({ type: "activity", act });
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

    // Variable row heights: compact P6-style density
    const getRowH = (row: PdfRow): number => {
      if (row.type === "group") {
        const depth = row.depth;
        return (depth === 0 ? 9 : depth === 1 ? 8 : 7.5) * zoomScale;
      }
      return 7 * zoomScale;
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
          doc.text(col.header, chX + 1.5, ganttTop - colHeaderH - 1 + colHeaderH / 2 + 1.8);
        } else {
          doc.text(col.header, chX + cw / 2, ganttTop - colHeaderH - 1 + colHeaderH / 2 + 1.8, { align: "center" });
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
      pageRows.forEach((row, i) => {
        const y = rowYOffsets[i];
        const rh = getRowH(row);
        const barH = rh * 0.55;

        if (row.type === "group") {
          // WBS Group Header row — P6-style depth-based colors
          const depth = row.depth;
          const indent = depth * 3; // mm indent per level
          // Background — depth-based: green → yellow → red → pink
          const bgColor = WBS_DEPTH_BG[depth % WBS_DEPTH_BG.length];
          doc.setFillColor(...bgColor);
          doc.rect(ganttLeft, y, ganttRight - ganttLeft, rh, "F");

          // Group label text — bold black text
          doc.setTextColor(20, 20, 20);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(depth === 0 ? 9 : depth === 1 ? 8 : 7.5);
          doc.text(row.label, ganttLeft + 2 + indent, y + rh / 2 + 1.2, { maxWidth: labelWidth - indent - 4 });

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

          // Separator
          doc.setDrawColor(...colors.border);
          doc.setLineWidth(0.1);
          doc.line(ganttLeft, y + rh, ganttRight, y + rh);
          return;
        }

        const act = row.act;

        // Alternating row background (full width including label area)
        if (i % 2 === 0) {
          doc.setFillColor(...colors.warmGray);
          doc.rect(ganttLeft, y, ganttRight - ganttLeft, rh, "F");
        }

        // Row separator line — very thin, light gray (P6-style)
        doc.setDrawColor(...colors.lightBorder);
        doc.setLineWidth(0.05);
        doc.line(ganttLeft, y + rh, ganttRight, y + rh);

        // Activity columns (dynamic based on visible columns)
        doc.setFontSize(7.5);
        const txtColor = act.isCritical ? colors.critical : colors.text;
        doc.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
        doc.setFont("helvetica", act.isCritical ? "bold" : "normal");
        let cellX = ganttLeft;
        for (let ci = 0; ci < ganttActiveCols.length; ci++) {
          const col = ganttActiveCols[ci];
          const cw = ganttColWidths[ci];
          let val = col.getValue(act);
          const isLeft = col.header === "Activity Name" || col.header === "ID";
          if (col.header === "Activity Name") {
            // Truncate name to fit column width — word-boundary aware
            const maxW = cw - 3;
            if (doc.getTextWidth(val) > maxW) {
              // Try to cut at last space that fits
              let truncated = val;
              while (doc.getTextWidth(truncated + "...") > maxW && truncated.length > 3) {
                const lastSpace = truncated.lastIndexOf(" ");
                if (lastSpace > 5) {
                  truncated = truncated.substring(0, lastSpace);
                } else {
                  truncated = truncated.slice(0, -1);
                }
              }
              val = truncated + "...";
            }
          }
          if (isLeft) {
            doc.text(val, cellX + 1.5, y + rh / 2 + 2, { maxWidth: cw - 3 });
          } else {
            doc.text(val, cellX + cw / 2, y + rh / 2 + 2, { align: "center", maxWidth: cw - 2 });
          }
          // Column separator line — very subtle
          if (ci > 0) {
            doc.setDrawColor(...colors.lightBorder);
            doc.setLineWidth(0.04);
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
            // Diamond for milestone
            const diamondSize = barH * 1.6;
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

            // Label to the right of diamond (clipped to Gantt area) — P6-style with bullet
            doc.setFontSize(6.5);
            doc.setTextColor(...colors.text);
            doc.setFont("helvetica", "normal");
            const milestoneLabel = `- ${act.name}`;
            const labelStartX = cx + half + 1.5;
            const availSpace = ganttRight - labelStartX - 1;
            if (availSpace > 5) {
              doc.text(milestoneLabel, labelStartX, cy + 1.2, { maxWidth: availSpace });
            }
          } else {
            // Regular bar
            doc.setFillColor(...barColor);
            doc.roundedRect(x1, barY, barWidth, barH, 0.4, 0.4, "F");

            // Progress fill
            const pct = parseFloat(act.percentComplete) / 100;
            if (pct > 0 && pct < 1) {
              const darkColor = barColor.map(c => Math.max(0, c - 60)) as [number, number, number];
              doc.setFillColor(...darkColor);
              doc.roundedRect(x1, barY, barWidth * pct, barH, 0.4, 0.4, "F");
            }

            // Float bar (dashed extension)
            if (act.totalFloat && act.totalFloat > 0 && act.lateFinish) {
              const floatX = Math.min(dateToX(act.lateFinish), ganttRight);
              if (floatX > x2) {
                doc.setDrawColor(...colors.muted);
                doc.setLineWidth(0.15);
                doc.setLineDashPattern([0.5, 0.5], 0);
                doc.line(x2, barY + barH / 2, floatX, barY + barH / 2);
                doc.setLineDashPattern([], 0);
              }
            }

            // Label to the right of bar (clipped to Gantt area) — P6-style with bullet
            doc.setFontSize(6.5);
            doc.setTextColor(...colors.text);
            doc.setFont("helvetica", "normal");
            const barLabel = `- ${act.name}`;
            const labelStartX = x2 + 1.5;
            const availableSpace = ganttRight - labelStartX - 1;
            if (availableSpace > 5) {
              doc.text(barLabel, labelStartX, barY + barH / 2 + 1.2, { maxWidth: availableSpace });
            }
          }
        }
      });
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

    // Float
    doc.setDrawColor(...colors.muted);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.line(legendX, legendY + 1.25, legendX + 8, legendY + 1.25);
    doc.setLineDashPattern([], 0);
    doc.setTextColor(...colors.muted);
    doc.text("Total Float", legendX + 10, legendY + 2);
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
