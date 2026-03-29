/**
 * Schedule PDF Export — generates a professional PDF with activity table and Gantt chart.
 * Uses jsPDF + jspdf-autotable for the table, and custom drawing for the Gantt.
 * Light/professional theme matching the scheduler UI.
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

  // ─── Light Theme Color Palette ──────────────────────────────────────────────
  const colors = {
    navy: [13, 27, 42] as [number, number, number],           // #0D1B2A
    gold: [201, 168, 76] as [number, number, number],          // #C9A84C
    darkGold: [160, 120, 48] as [number, number, number],      // #A07830
    steelBlue: [74, 111, 165] as [number, number, number],     // #4A6FA5
    white: [255, 255, 255] as [number, number, number],
    offWhite: [250, 248, 244] as [number, number, number],     // #FAF8F4
    warmGray: [245, 243, 239] as [number, number, number],     // #F5F3EF
    text: [30, 30, 30] as [number, number, number],            // #1E1E1E
    muted: [120, 120, 120] as [number, number, number],        // #787878
    border: [210, 210, 210] as [number, number, number],       // #D2D2D2
    critical: [220, 38, 38] as [number, number, number],       // #DC2626
    green: [22, 163, 74] as [number, number, number],          // #16A34A
    lightCritical: [254, 242, 242] as [number, number, number],// #FEF2F2
  };

  // ─── Draw Header ────────────────────────────────────────────────────────────
  function drawHeader() {
    // Navy background bar
    doc.setFillColor(...colors.navy);
    doc.rect(0, 0, pageWidth, headerHeight, "F");

    // Gold accent line at bottom of header
    doc.setFillColor(...colors.gold);
    doc.rect(0, headerHeight - 0.6, pageWidth, 0.6, "F");

    // Company name (left)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.gold);
    doc.text(companyName || "ALP Contractor Circle", margin, 8);

    // Project name (left, below company)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...colors.white);
    doc.text(projectName || scheduleName, margin, 14);

    // Schedule name (left, below project)
    doc.setFontSize(7);
    doc.setTextColor(180, 190, 210);
    doc.text(scheduleName, margin, 19);

    // Right side info
    const rightX = pageWidth - margin;
    doc.setFontSize(7);
    doc.setTextColor(180, 190, 210);
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
      fillColor: colors.navy,
      textColor: colors.gold,
      fontStyle: "bold",
      fontSize: 6.5,
    },
    alternateRowStyles: {
      fillColor: colors.warmGray,
    },
    bodyStyles: {
      fillColor: colors.white,
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
    const ganttTop = headerHeight + 8;
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
        doc.setTextColor(...colors.muted);
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
        doc.setDrawColor(...colors.steelBlue);
        doc.setLineWidth(0.4);
        doc.line(ddX, ganttTop - 2, ddX, ganttTop + filteredActivities.length * rowH);
        doc.setFontSize(5);
        doc.setTextColor(...colors.steelBlue);
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
        doc.setFillColor(...colors.warmGray);
        doc.rect(chartLeft, y, chartWidth, rowH, "F");
      }

      // Bar
      if (act.earlyStart && act.earlyFinish) {
        const x1 = dateToX(act.earlyStart);
        const x2 = dateToX(act.earlyFinish);
        const barWidth = Math.max(x2 - x1, 1);
        const barY = y + (rowH - barH) / 2;

        // Determine bar color (custom > critical/non-critical)
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

        // Draw milestone (diamond) or bar
        if (act.activityType === "milestone" || act.duration === 0) {
          // Draw diamond marker for milestone
          const diamondSize = barH * 1.5;
          const diamondX = x1;
          const diamondY = barY + barH / 2;
          const half = diamondSize / 2;
          
          // Draw filled diamond using lines
          doc.setDrawColor(...barColor);
          doc.setLineWidth(0.3);
          doc.setFillColor(...barColor);
          
          // Draw diamond outline
          doc.line(diamondX, diamondY - half, diamondX + half, diamondY);
          doc.line(diamondX + half, diamondY, diamondX, diamondY + half);
          doc.line(diamondX, diamondY + half, diamondX - half, diamondY);
          doc.line(diamondX - half, diamondY, diamondX, diamondY - half);
          
          // Fill center with small square
          doc.rect(diamondX - half / 3, diamondY - half / 3, (2 * half) / 3, (2 * half) / 3, "F");
        } else {
          // Draw regular bar
          doc.setFillColor(...barColor);
          doc.roundedRect(x1, barY, barWidth, barH, 0.5, 0.5, "F");

          // Progress fill (darker shade)
          const pct = parseFloat(act.percentComplete) / 100;
          if (pct > 0 && pct < 1) {
            const darkColor = barColor.map(c => Math.max(0, c - 60)) as [number, number, number];
            doc.setFillColor(...darkColor);
            doc.roundedRect(x1, barY, barWidth * pct, barH, 0.5, 0.5, "F");
          }
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

        // Activity name above bar
        doc.setFontSize(4);
        doc.setTextColor(...colors.text);
        const barLabel = act.name.substring(0, 20);
        const labelX = x1 + (barWidth / 2);
        doc.text(barLabel, labelX, barY - 1, { align: "center", maxWidth: barWidth - 0.5 });
      }
    });

    // ─── Legend ──────────────────────────────────────────────────────────────
    const legendY = ganttTop + filteredActivities.length * rowH + 4;
    doc.setFontSize(5.5);

    // Critical bar
    doc.setFillColor(...colors.critical);
    doc.rect(ganttLeft, legendY, 8, 2.5, "F");
    doc.setTextColor(...colors.text);
    doc.text("Critical Path", ganttLeft + 10, legendY + 2);

    // Normal bar
    doc.setFillColor(...colors.green);
    doc.rect(ganttLeft + 35, legendY, 8, 2.5, "F");
    doc.text("Non-Critical", ganttLeft + 45, legendY + 2);

    // Data date
    if (dataDate) {
      doc.setDrawColor(...colors.steelBlue);
      doc.setLineWidth(0.4);
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
