/**
 * Schedule PDF Export — generates a professional PDF with activity table and Gantt chart.
 * Uses jsPDF + jspdf-autotable for the table, and custom drawing for the Gantt.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

  // Page settings
  pageSize: "letter" | "legal" | "tabloid";
  orientation: "landscape" | "portrait";

  // Display options
  showGantt: boolean;
  showCriticalPathOnly: boolean;
}

const PAGE_SIZES = {
  letter: { w: 215.9, h: 279.4 },
  legal: { w: 215.9, h: 355.6 },
  tabloid: { w: 279.4, h: 431.8 },
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function formatDateFull(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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
    showCriticalPathOnly,
  } = options;

  const filteredActivities = showCriticalPathOnly
    ? activities.filter((a) => a.isCritical)
    : activities;

  // Create PDF
  const doc = new jsPDF({
    orientation,
    unit: "mm",
    format: pageSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const headerHeight = 22;
  const footerHeight = 12;

  // ─── Color Palette ──────────────────────────────────────────────────────────
  const colors = {
    ember: [217, 119, 6] as [number, number, number],       // #D97706
    dark: [15, 15, 15] as [number, number, number],          // #0F0F0F
    darkCard: [24, 24, 24] as [number, number, number],      // #181818
    border: [50, 50, 50] as [number, number, number],        // #323232
    text: [245, 245, 245] as [number, number, number],       // #F5F5F5
    muted: [140, 140, 140] as [number, number, number],      // #8C8C8C
    critical: [220, 38, 38] as [number, number, number],     // #DC2626
    white: [255, 255, 255] as [number, number, number],
    green: [34, 197, 94] as [number, number, number],        // #22C55E
  };

  // ─── Draw Header ────────────────────────────────────────────────────────────
  function drawHeader() {
    // Background bar
    doc.setFillColor(...colors.darkCard);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Ember accent line
    doc.setFillColor(...colors.ember);
    doc.rect(0, headerHeight - 0.5, pageWidth, 0.5, "F");

    // Company name (left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.ember);
    doc.text(companyName || "ALP Contractor Circle", margin, 8);

    // Project name (left, below company)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.text);
    doc.text(projectName || scheduleName, margin, 14);

    // Schedule name (left, below project)
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.text(scheduleName, margin, 19);

    // Right side info
    const rightX = pageWidth - margin;
    doc.setFontSize(7);
    doc.setTextColor(...colors.muted);
    doc.text(`Data Date: ${dataDate ? formatDateFull(dataDate) : "Not set"}`, rightX, 8, { align: "right" });
    doc.text(`Project Start: ${formatDateFull(projectStartDate)}`, rightX, 13, { align: "right" });
    doc.text(`Run Date: ${lastCalculatedAt ? new Date(lastCalculatedAt).toLocaleString() : "—"}`, rightX, 18, { align: "right" });
  }

  // ─── Draw Footer ────────────────────────────────────────────────────────────
  function drawFooter(pageNum: number, totalPages: number) {
    const y = pageHeight - footerHeight;

    // Separator line
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);

    // Footer text (left)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...colors.muted);
    doc.text(footerText || "Generated by ALP CPM Schedule Builder", margin, y + 5);

    // Page number (center)
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, y + 5, { align: "center" });

    // Date (right)
    doc.text(new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }), pageWidth - margin, y + 5, { align: "right" });
  }

  // ─── Build Column Definitions ───────────────────────────────────────────────
  const columnMap: Record<string, { header: string; width: number; dataKey: string }> = {
    activityId: { header: "ID", width: 14, dataKey: "activityId" },
    name: { header: "Activity Name", width: 50, dataKey: "name" },
    duration: { header: "Dur", width: 10, dataKey: "duration" },
    percentComplete: { header: "%", width: 10, dataKey: "percentComplete" },
    earlyStart: { header: "ES", width: 22, dataKey: "earlyStart" },
    earlyFinish: { header: "EF", width: 22, dataKey: "earlyFinish" },
    lateStart: { header: "LS", width: 22, dataKey: "lateStart" },
    lateFinish: { header: "LF", width: 22, dataKey: "lateFinish" },
    totalFloat: { header: "TF", width: 10, dataKey: "totalFloat" },
    freeFloat: { header: "FF", width: 10, dataKey: "freeFloat" },
    wbs: { header: "WBS", width: 14, dataKey: "wbs" },
  };

  const selectedColumns = columns
    .filter((c) => columnMap[c])
    .map((c) => columnMap[c]);

  // Always include ID and Name
  if (!selectedColumns.find((c) => c.dataKey === "activityId")) {
    selectedColumns.unshift(columnMap.activityId);
  }
  if (!selectedColumns.find((c) => c.dataKey === "name")) {
    selectedColumns.splice(1, 0, columnMap.name);
  }

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

  // ─── Activity Table ─────────────────────────────────────────────────────────
  const tableStartY = statsY + 4;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin, bottom: footerHeight + 4 },
    head: [selectedColumns.map((c) => c.header)],
    body: tableData.map((row) => selectedColumns.map((c) => (row as any)[c.dataKey])),
    theme: "plain",
    styles: {
      fontSize: 6.5,
      cellPadding: { top: 1.5, bottom: 1.5, left: 1.5, right: 1.5 },
      textColor: colors.text,
      lineColor: colors.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: colors.darkCard,
      textColor: colors.ember,
      fontStyle: "bold",
      fontSize: 6.5,
    },
    alternateRowStyles: {
      fillColor: [20, 20, 20],
    },
    bodyStyles: {
      fillColor: colors.dark,
    },
    columnStyles: selectedColumns.reduce((acc, col, i) => {
      acc[i] = { cellWidth: col.width };
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

  // ─── Gantt Chart Section ────────────────────────────────────────────────────
  if (showGantt && filteredActivities.length > 0) {
    // Calculate date range
    let minDate = new Date(projectStartDate);
    let maxDate = new Date(projectStartDate);
    for (const act of filteredActivities) {
      if (act.earlyStart && act.earlyStart < minDate) minDate = new Date(act.earlyStart);
      if (act.earlyFinish && act.earlyFinish > maxDate) maxDate = new Date(act.earlyFinish);
      if (act.lateFinish && act.lateFinish > maxDate) maxDate = new Date(act.lateFinish);
    }
    // Add padding
    maxDate = new Date(maxDate.getTime() + 7 * 86400000);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000);
    if (totalDays <= 0) return;

    // Start Gantt on a new page
    doc.addPage();
    drawHeader();

    const ganttLeft = margin;
    const ganttRight = pageWidth - margin;
    const ganttWidth = ganttRight - ganttLeft;
    const ganttTop = headerHeight + 6;
    const ganttBottom = pageHeight - footerHeight - 4;
    const ganttHeight = ganttBottom - ganttTop;

    // Row height
    const rowH = Math.min(6, ganttHeight / filteredActivities.length);
    const barH = rowH * 0.55;
    const labelWidth = 50; // Space for activity labels
    const chartLeft = ganttLeft + labelWidth;
    const chartWidth = ganttWidth - labelWidth;

    // Date to X position
    const dateToX = (d: Date) => {
      const dayOffset = (d.getTime() - minDate.getTime()) / 86400000;
      return chartLeft + (dayOffset / totalDays) * chartWidth;
    };

    // ─── Draw Time Scale ────────────────────────────────────────────────────
    doc.setFontSize(5.5);
    doc.setTextColor(...colors.muted);

    // Month markers
    const current = new Date(minDate);
    current.setDate(1);
    while (current <= maxDate) {
      const x = dateToX(current);
      if (x >= chartLeft && x <= ganttRight) {
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.1);
        doc.line(x, ganttTop, x, ganttTop + filteredActivities.length * rowH);
        doc.text(
          current.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          x + 1, ganttTop - 1
        );
      }
      current.setMonth(current.getMonth() + 1);
    }

    // ─── Draw Data Date Line ──────────────────────────────────────────────
    if (dataDate) {
      const ddX = dateToX(dataDate);
      if (ddX >= chartLeft && ddX <= ganttRight) {
        doc.setDrawColor(...colors.ember);
        doc.setLineWidth(0.3);
        doc.line(ddX, ganttTop - 2, ddX, ganttTop + filteredActivities.length * rowH);
        doc.setFontSize(5);
        doc.setTextColor(...colors.ember);
        doc.text("DD", ddX + 0.5, ganttTop - 2.5);
      }
    }

    // ─── Draw Activity Bars ─────────────────────────────────────────────────
    filteredActivities.forEach((act, i) => {
      const y = ganttTop + i * rowH;

      // Activity label
      doc.setFontSize(5);
      const txtColor = act.isCritical ? colors.critical : colors.text;
      doc.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
      const label = `${act.activityId} ${act.name}`;
      doc.text(label.substring(0, 35), ganttLeft, y + rowH / 2 + 1);

      // Alternating row background
      if (i % 2 === 0) {
        doc.setFillColor(20, 20, 20);
        doc.rect(chartLeft, y, chartWidth, rowH, "F");
      }

      // Bar
      if (act.earlyStart && act.earlyFinish) {
        const x1 = dateToX(act.earlyStart);
        const x2 = dateToX(act.earlyFinish);
        const barWidth = Math.max(x2 - x1, 1);
        const barY = y + (rowH - barH) / 2;

        // Bar color
        if (act.isCritical) {
          doc.setFillColor(...colors.critical);
        } else {
          doc.setFillColor(...colors.ember);
        }
        doc.roundedRect(x1, barY, barWidth, barH, 0.5, 0.5, "F");

        // Progress fill
        const pct = parseFloat(act.percentComplete) / 100;
        if (pct > 0 && pct < 1) {
          doc.setFillColor(act.isCritical ? 180 : 180, act.isCritical ? 20 : 90, act.isCritical ? 20 : 0);
          doc.roundedRect(x1, barY, barWidth * pct, barH, 0.5, 0.5, "F");
        }

        // Float bar (dashed extension)
        if (act.totalFloat && act.totalFloat > 0 && act.lateFinish) {
          const floatX = dateToX(act.lateFinish);
          if (floatX > x2) {
            doc.setDrawColor(...colors.muted);
            doc.setLineWidth(0.15);
            doc.setLineDashPattern([0.5, 0.5], 0);
            doc.line(x2, barY + barH / 2, floatX, barY + barH / 2);
            doc.setLineDashPattern([], 0);
          }
        }
      }
    });

    // ─── Legend ──────────────────────────────────────────────────────────────
    const legendY = ganttTop + filteredActivities.length * rowH + 4;
    doc.setFontSize(5.5);

    // Critical bar
    doc.setFillColor(...colors.critical);
    doc.rect(ganttLeft, legendY, 8, 2.5, "F");
    doc.setTextColor(...colors.muted);
    doc.text("Critical Path", ganttLeft + 10, legendY + 2);

    // Normal bar
    doc.setFillColor(...colors.ember);
    doc.rect(ganttLeft + 35, legendY, 8, 2.5, "F");
    doc.text("Non-Critical", ganttLeft + 45, legendY + 2);

    // Data date
    if (dataDate) {
      doc.setDrawColor(...colors.ember);
      doc.setLineWidth(0.3);
      doc.line(ganttLeft + 70, legendY, ganttLeft + 70, legendY + 2.5);
      doc.text("Data Date", ganttLeft + 72, legendY + 2);
    }

    // Float
    doc.setDrawColor(...colors.muted);
    doc.setLineWidth(0.15);
    doc.setLineDashPattern([0.5, 0.5], 0);
    doc.line(ganttLeft + 100, legendY + 1.25, ganttLeft + 108, legendY + 1.25);
    doc.setLineDashPattern([], 0);
    doc.setTextColor(...colors.muted);
    doc.text("Total Float", ganttLeft + 110, legendY + 2);
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
