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
  pageSize: "letter" | "legal" | "tabloid";
  orientation: "landscape" | "portrait";

  // Display options
  showGantt: boolean;
  showCriticalPathOnly: boolean;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function formatDateFull(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function resolveToken(token: string, ctx: { pageNum: number; totalPages: number; scheduleName: string; dataDate: Date | null; projectStartDate: Date; companyName: string; projectName: string }): string {
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
    footerConfig,
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
  const footerHeight = 14;

  // ─── Color Palette ──────────────────────────────────────────────────────────
  const colors = {
    navy: [13, 27, 42] as [number, number, number],
    gold: [201, 168, 76] as [number, number, number],
    steelBlue: [74, 111, 165] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    warmGray: [245, 243, 239] as [number, number, number],
    text: [30, 30, 30] as [number, number, number],
    muted: [120, 120, 120] as [number, number, number],
    border: [210, 210, 210] as [number, number, number],
    critical: [220, 38, 38] as [number, number, number],
    green: [22, 163, 74] as [number, number, number],
  };

  // ─── Draw Header ────────────────────────────────────────────────────────────
  function drawHeader() {
    doc.setFillColor(...colors.navy);
    doc.rect(0, 0, pageWidth, headerHeight, "F");
    doc.setFillColor(...colors.gold);
    doc.rect(0, headerHeight - 0.6, pageWidth, 0.6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...colors.gold);
    doc.text(companyName || "ALP Contractor Circle", margin, 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...colors.white);
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

      // Left
      doc.text(resolveToken(footerConfig.left, ctx), margin, y + 5);

      if (cols === 3) {
        doc.text(resolveToken(footerConfig.center, ctx), pageWidth / 2, y + 5, { align: "center" });
        doc.text(resolveToken(footerConfig.right, ctx), pageWidth - margin, y + 5, { align: "right" });
      } else if (cols === 4) {
        const seg = usableWidth / 4;
        doc.text(resolveToken(footerConfig.centerLeft || "", ctx), margin + seg, y + 5);
        doc.text(resolveToken(footerConfig.centerRight || "", ctx), margin + seg * 2, y + 5);
        doc.text(resolveToken(footerConfig.right, ctx), pageWidth - margin, y + 5, { align: "right" });
      } else if (cols === 5) {
        const seg = usableWidth / 5;
        doc.text(resolveToken(footerConfig.centerLeft || "", ctx), margin + seg, y + 5);
        doc.text(resolveToken(footerConfig.center, ctx), pageWidth / 2, y + 5, { align: "center" });
        doc.text(resolveToken(footerConfig.centerRight || "", ctx), margin + seg * 3, y + 5);
        doc.text(resolveToken(footerConfig.right, ctx), pageWidth - margin, y + 5, { align: "right" });
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
    name: { header: "Activity Name", minWidth: 55, dataKey: "name", grow: true },
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

  // ─── Activity Table (full width) ───────────────────────────────────────────
  const tableStartY = statsY + 4;

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin, bottom: footerHeight + 4 },
    head: [selectedColumns.map((c) => c.header)],
    body: tableData.map((row) => selectedColumns.map((c) => (row as any)[c.dataKey])),
    theme: "plain",
    styles: {
      fontSize: 7,
      cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 },
      textColor: colors.text,
      lineColor: colors.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: colors.navy,
      textColor: colors.gold,
      fontStyle: "bold",
      fontSize: 7,
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

    // Start Gantt on a new page
    doc.addPage();
    drawHeader();

    const ganttTop = headerHeight + 10;
    const legendHeight = 8;
    const ganttBottom = pageHeight - footerHeight - legendHeight - 4;
    const ganttHeight = ganttBottom - ganttTop;

    // Calculate row height - aim for readable size, paginate if needed
    const idealRowH = 7;
    const maxRowsPerPage = Math.floor(ganttHeight / idealRowH);
    const rowH = Math.min(idealRowH, ganttHeight / Math.min(filteredActivities.length, maxRowsPerPage));
    const barH = rowH * 0.5;

    // Calculate label width based on longest activity name
    const longestLabel = filteredActivities.reduce((max, act) => {
      const label = `${act.activityId} ${act.name}`;
      return label.length > max.length ? label : max;
    }, "");
    doc.setFontSize(5.5);
    const measuredLabelWidth = doc.getTextWidth(longestLabel);
    const labelWidth = Math.min(Math.max(measuredLabelWidth + 4, 60), 100); // Clamp between 60-100mm

    const ganttLeft = margin;
    const ganttRight = pageWidth - margin;
    const chartLeft = ganttLeft + labelWidth;
    const chartWidth = ganttRight - chartLeft;

    const dateToX = (d: Date) => {
      const dayOffset = (new Date(d).getTime() - minDate.getTime()) / 86400000;
      return chartLeft + (dayOffset / totalDays) * chartWidth;
    };

    // ─── Paginate Gantt ──────────────────────────────────────────────────────
    let activityIndex = 0;
    let isFirstGanttPage = true;

    while (activityIndex < filteredActivities.length) {
      if (!isFirstGanttPage) {
        doc.addPage();
        drawHeader();
      }
      isFirstGanttPage = false;

      const pageActivities = filteredActivities.slice(activityIndex, activityIndex + maxRowsPerPage);

      // ─── Draw Time Scale ──────────────────────────────────────────────────
      doc.setFontSize(6);
      doc.setTextColor(...colors.muted);

      const current = new Date(minDate);
      current.setDate(1);
      while (current <= maxDate) {
        const x = dateToX(current);
        if (x >= chartLeft && x <= ganttRight) {
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.1);
          doc.line(x, ganttTop, x, ganttTop + pageActivities.length * rowH);
          doc.setTextColor(...colors.muted);
          doc.text(
            current.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
            x + 1, ganttTop - 2
          );
        }
        current.setMonth(current.getMonth() + 1);
      }

      // ─── Draw Data Date Line ──────────────────────────────────────────────
      if (dataDate) {
        const ddX = dateToX(dataDate);
        if (ddX >= chartLeft && ddX <= ganttRight) {
          doc.setDrawColor(...colors.steelBlue);
          doc.setLineWidth(0.5);
          doc.line(ddX, ganttTop - 3, ddX, ganttTop + pageActivities.length * rowH);
          doc.setFontSize(5.5);
          doc.setTextColor(...colors.steelBlue);
          doc.text("DD", ddX + 0.5, ganttTop - 3.5);
        }
      }

      // ─── Draw Activity Bars ───────────────────────────────────────────────
      pageActivities.forEach((act, i) => {
        const y = ganttTop + i * rowH;

        // Alternating row background (full width including label area)
        if (i % 2 === 0) {
          doc.setFillColor(...colors.warmGray);
          doc.rect(ganttLeft, y, ganttRight - ganttLeft, rowH, "F");
        }

        // Row separator line
        doc.setDrawColor(235, 235, 235);
        doc.setLineWidth(0.05);
        doc.line(ganttLeft, y + rowH, ganttRight, y + rowH);

        // Activity label (full name, no truncation)
        doc.setFontSize(5.5);
        const txtColor = act.isCritical ? colors.critical : colors.text;
        doc.setTextColor(txtColor[0], txtColor[1], txtColor[2]);
        doc.setFont("helvetica", act.isCritical ? "bold" : "normal");
        const label = `${act.activityId} ${act.name}`;
        // Use maxWidth to auto-wrap if needed, but with enough space it won't
        doc.text(label, ganttLeft + 1, y + rowH / 2 + 1.5, { maxWidth: labelWidth - 3 });

        // Vertical separator between labels and chart
        doc.setDrawColor(...colors.border);
        doc.setLineWidth(0.15);
        doc.line(chartLeft, y, chartLeft, y + rowH);

        // Bar
        if (act.earlyStart && act.earlyFinish) {
          const x1 = dateToX(act.earlyStart);
          const x2 = dateToX(act.earlyFinish);
          const barWidth = Math.max(x2 - x1, 1.5);
          const barY = y + (rowH - barH) / 2;

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

            // Draw diamond as 4 triangles meeting at center
            const points = [
              [cx, cy - half],       // top
              [cx + half, cy],       // right
              [cx, cy + half],       // bottom
              [cx - half, cy],       // left
            ];
            // Draw filled polygon using triangle fan
            for (let t = 0; t < 4; t++) {
              const p1 = points[t];
              const p2 = points[(t + 1) % 4];
              doc.triangle(cx, cy, p1[0], p1[1], p2[0], p2[1], "F");
            }

            // Label to the right of diamond
            doc.setFontSize(4.5);
            doc.setTextColor(...colors.text);
            doc.setFont("helvetica", "normal");
            const milestoneLabel = act.name;
            const labelStartX = cx + half + 1.5;
            if (labelStartX + 30 < ganttRight) {
              doc.text(milestoneLabel, labelStartX, cy + 1.2, { maxWidth: ganttRight - labelStartX - 2 });
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
              const floatX = dateToX(act.lateFinish);
              if (floatX > x2) {
                doc.setDrawColor(...colors.muted);
                doc.setLineWidth(0.15);
                doc.setLineDashPattern([0.5, 0.5], 0);
                doc.line(x2, barY + barH / 2, floatX, barY + barH / 2);
                doc.setLineDashPattern([], 0);
              }
            }

            // Label to the right of bar (not above, to avoid overlap)
            doc.setFontSize(4.5);
            doc.setTextColor(...colors.text);
            doc.setFont("helvetica", "normal");
            const barLabel = act.name;
            const labelStartX = x2 + 1.5;
            const availableSpace = ganttRight - labelStartX - 2;
            if (availableSpace > 10) {
              doc.text(barLabel, labelStartX, barY + barH / 2 + 1.2, { maxWidth: availableSpace });
            }
          }
        }
      });

      activityIndex += maxRowsPerPage;
    }

    // ─── Legend (on last Gantt page, below activities) ───────────────────────
    const lastPageActCount = filteredActivities.length % maxRowsPerPage || maxRowsPerPage;
    const legendY = ganttTop + lastPageActCount * rowH + 4;

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
