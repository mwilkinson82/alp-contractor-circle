/**
 * Report PDF Export — generates professional PDFs for EVM and Resource Leveling reports.
 * Uses jsPDF + jspdf-autotable for tables and custom canvas-to-image for charts.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface EvmPdfOptions {
  scheduleName: string;
  dataDate: string | null;
  metrics: {
    BAC: number; BCWP: number; BCWS: number; ACWP: number;
    CPI: number; SPI: number; CV: number; SV: number;
    EAC: number; ETC: number; VAC: number; TCPI: number;
  };
  activityEvm?: Array<{
    activityId: string; name: string; budget: number;
    earnedValue: number; actualCost: number; cpi: number; percentComplete: number;
  }>;
  baselineData?: {
    baselineName: string;
    CPI: number; SPI: number; CV: number; SV: number;
    EAC: number; TCPI: number;
  } | null;
  companyName?: string;
  pageSize?: "letter" | "legal" | "tabloid";
  orientation?: "landscape" | "portrait";
}

interface LevelingPdfOptions {
  scheduleName: string;
  dataDate: string | null;
  summary: {
    totalResources: number;
    overAllocatedCount: number;
    maxOverAllocation: number;
    totalSuggestions: number;
  };
  overAllocations: Array<{
    resourceName: string;
    resourceType: string;
    week: string;
    allocated: number;
    capacity: number;
    overBy: number;
    severity: string;
  }>;
  suggestions: Array<{
    resourceName: string;
    activityName: string;
    suggestion: string;
    severity: string;
  }>;
  companyName?: string;
  pageSize?: "letter" | "legal" | "tabloid";
  orientation?: "landscape" | "portrait";
}

const PAGE_SIZES: Record<string, [number, number]> = {
  letter: [215.9, 279.4],
  legal: [215.9, 355.6],
  tabloid: [279.4, 431.8],
};

function fmtMoney(cents: number): string {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function severityColor(severity: string): [number, number, number] {
  switch (severity) {
    case "critical": return [220, 38, 38];
    case "high": return [234, 88, 12];
    case "medium": return [202, 138, 4];
    default: return [59, 130, 246];
  }
}

// ── EVM Report PDF ──────────────────────────────────────────────────────────────

export function generateEvmPdf(opts: EvmPdfOptions): void {
  const { scheduleName, dataDate, metrics, activityEvm, baselineData, companyName } = opts;
  const pageSize = opts.pageSize || "letter";
  const orientation = opts.orientation || "portrait";
  const [w, h] = PAGE_SIZES[pageSize];
  const pageW = orientation === "landscape" ? h : w;
  const pageH = orientation === "landscape" ? w : h;

  const doc = new jsPDF({ orientation, unit: "mm", format: [pageW, pageH] });
  const margin = 15;
  let y = margin;

  // Header band
  doc.setFillColor(15, 27, 42); // Navy
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFillColor(201, 168, 76); // Gold accent
  doc.rect(0, 22, pageW, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Earned Value Management Report", margin, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(scheduleName, margin, 16);
  if (companyName) {
    doc.text(companyName, pageW - margin, 10, { align: "right" });
  }
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, pageW - margin, 16, { align: "right" });

  y = 30;

  // Data date
  if (dataDate) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`Data Date: ${new Date(dataDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, margin, y);
    y += 6;
  }

  // Key Metrics Table
  doc.setTextColor(15, 27, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Key Metrics", margin, y);
  y += 4;

  const metricsRows = [
    ["BAC (Budget at Completion)", fmtMoney(metrics.BAC)],
    ["BCWP (Earned Value)", fmtMoney(metrics.BCWP)],
    ["BCWS (Planned Value)", fmtMoney(metrics.BCWS)],
    ["ACWP (Actual Cost)", fmtMoney(metrics.ACWP)],
    ["CPI (Cost Performance Index)", metrics.CPI.toFixed(2)],
    ["SPI (Schedule Performance Index)", metrics.SPI.toFixed(2)],
    ["Cost Variance (CV)", (metrics.CV >= 0 ? "+" : "") + fmtMoney(metrics.CV)],
    ["Schedule Variance (SV)", (metrics.SV >= 0 ? "+" : "") + fmtMoney(metrics.SV)],
    ["EAC (Estimate at Completion)", fmtMoney(metrics.EAC)],
    ["ETC (Estimate to Complete)", fmtMoney(metrics.ETC)],
    ["VAC (Variance at Completion)", (metrics.VAC >= 0 ? "+" : "") + fmtMoney(metrics.VAC)],
    ["TCPI (To-Complete Performance)", metrics.TCPI.toFixed(2)],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: metricsRows,
    theme: "striped",
    headStyles: { fillColor: [15, 27, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 40, halign: "right", fontStyle: "bold" } },
    margin: { left: margin, right: margin },
    tableWidth: 130,
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Performance Assessment
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Performance Assessment", margin, y);
  y += 5;

  const assessments: string[] = [];
  if (metrics.CPI >= 1) assessments.push("Cost Performance: UNDER BUDGET (CPI = " + metrics.CPI.toFixed(2) + ")");
  else assessments.push("Cost Performance: OVER BUDGET (CPI = " + metrics.CPI.toFixed(2) + ")");
  if (metrics.SPI >= 1) assessments.push("Schedule Performance: AHEAD OF SCHEDULE (SPI = " + metrics.SPI.toFixed(2) + ")");
  else assessments.push("Schedule Performance: BEHIND SCHEDULE (SPI = " + metrics.SPI.toFixed(2) + ")");
  if (metrics.TCPI <= 1) assessments.push("Remaining Work: ACHIEVABLE (TCPI = " + metrics.TCPI.toFixed(2) + ")");
  else assessments.push("Remaining Work: DIFFICULT TO ACHIEVE (TCPI = " + metrics.TCPI.toFixed(2) + ")");

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  assessments.forEach(a => {
    doc.setTextColor(60, 60, 60);
    doc.text("• " + a, margin + 2, y);
    y += 4;
  });
  y += 4;

  // Baseline Comparison
  if (baselineData) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 27, 42);
    doc.text(`Baseline Comparison: ${baselineData.baselineName}`, margin, y);
    y += 4;

    const deltaRows = [
      ["CPI", metrics.CPI.toFixed(2), baselineData.CPI.toFixed(2), (metrics.CPI - baselineData.CPI >= 0 ? "+" : "") + (metrics.CPI - baselineData.CPI).toFixed(2)],
      ["SPI", metrics.SPI.toFixed(2), baselineData.SPI.toFixed(2), (metrics.SPI - baselineData.SPI >= 0 ? "+" : "") + (metrics.SPI - baselineData.SPI).toFixed(2)],
      ["CV", fmtMoney(metrics.CV), fmtMoney(baselineData.CV), (metrics.CV - baselineData.CV >= 0 ? "+" : "") + fmtMoney(metrics.CV - baselineData.CV)],
      ["SV", fmtMoney(metrics.SV), fmtMoney(baselineData.SV), (metrics.SV - baselineData.SV >= 0 ? "+" : "") + fmtMoney(metrics.SV - baselineData.SV)],
      ["EAC", fmtMoney(metrics.EAC), fmtMoney(baselineData.EAC), (metrics.EAC - baselineData.EAC >= 0 ? "+" : "") + fmtMoney(metrics.EAC - baselineData.EAC)],
      ["TCPI", metrics.TCPI.toFixed(2), baselineData.TCPI.toFixed(2), (metrics.TCPI - baselineData.TCPI >= 0 ? "+" : "") + (metrics.TCPI - baselineData.TCPI).toFixed(2)],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Current", "Baseline", "Delta"]],
      body: deltaRows,
      theme: "striped",
      headStyles: { fillColor: [88, 28, 135], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35, halign: "right", fontStyle: "bold" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
      tableWidth: 145,
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Activity EVM Breakdown
  if (activityEvm && activityEvm.length > 0) {
    // Check if we need a new page
    if (y > pageH - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 27, 42);
    doc.text("Activity-Level EVM Breakdown", margin, y);
    y += 4;

    const actRows = activityEvm.map(a => [
      a.activityId,
      a.name.length > 30 ? a.name.substring(0, 30) + "..." : a.name,
      fmtMoney(a.budget),
      fmtMoney(a.earnedValue),
      fmtMoney(a.actualCost),
      a.cpi.toFixed(2),
      a.percentComplete + "%",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Act ID", "Name", "Budget", "EV", "AC", "CPI", "% Comp"]],
      body: actRows,
      theme: "striped",
      headStyles: { fillColor: [15, 27, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 22 },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" },
        6: { halign: "right" },
      },
      margin: { left: margin, right: margin },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
    doc.text("ALP Contractor Portal — EVM Report", margin, pageH - 8);
  }

  doc.save(`EVM_Report_${scheduleName.replace(/\s+/g, "_")}.pdf`);
}

// ── Resource Leveling Report PDF ────────────────────────────────────────────────

export function generateLevelingPdf(opts: LevelingPdfOptions): void {
  const { scheduleName, dataDate, summary, overAllocations, suggestions, companyName } = opts;
  const pageSize = opts.pageSize || "letter";
  const orientation = opts.orientation || "landscape";
  const [w, h] = PAGE_SIZES[pageSize];
  const pageW = orientation === "landscape" ? h : w;
  const pageH = orientation === "landscape" ? w : h;

  const doc = new jsPDF({ orientation, unit: "mm", format: [pageW, pageH] });
  const margin = 15;
  let y = margin;

  // Header band
  doc.setFillColor(15, 27, 42);
  doc.rect(0, 0, pageW, 22, "F");
  doc.setFillColor(201, 168, 76);
  doc.rect(0, 22, pageW, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Resource Leveling Analysis", margin, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(scheduleName, margin, 16);
  if (companyName) {
    doc.text(companyName, pageW - margin, 10, { align: "right" });
  }
  doc.text(`Generated: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, pageW - margin, 16, { align: "right" });

  y = 30;

  if (dataDate) {
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(8);
    doc.text(`Data Date: ${new Date(dataDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, margin, y);
    y += 6;
  }

  // Summary
  doc.setTextColor(15, 27, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, y);
  y += 5;

  const summaryRows = [
    ["Total Resources", summary.totalResources.toString()],
    ["Over-Allocated Resources", summary.overAllocatedCount.toString()],
    ["Max Over-Allocation", summary.maxOverAllocation.toFixed(1) + " units"],
    ["Total Suggestions", summary.totalSuggestions.toString()],
  ];

  autoTable(doc, {
    startY: y,
    body: summaryRows,
    theme: "plain",
    bodyStyles: { fontSize: 9 },
    columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" }, 1: { cellWidth: 40 } },
    margin: { left: margin, right: margin },
    tableWidth: 110,
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Over-Allocation Table
  if (overAllocations.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Over-Allocation Details", margin, y);
    y += 4;

    const oaRows = overAllocations.map(oa => [
      oa.resourceName,
      oa.resourceType,
      oa.week,
      oa.allocated.toFixed(1),
      oa.capacity.toFixed(1),
      "+" + oa.overBy.toFixed(1),
      oa.severity.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Resource", "Type", "Week", "Allocated", "Capacity", "Over By", "Severity"]],
      body: oaRows,
      theme: "striped",
      headStyles: { fillColor: [15, 27, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
      didParseCell: function(data: any) {
        if (data.section === "body" && data.column.index === 6) {
          const sev = data.cell.raw?.toString().toLowerCase() || "";
          const [r, g, b] = severityColor(sev);
          data.cell.styles.textColor = [r, g, b];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Suggestions Table
  if (suggestions.length > 0) {
    if (y > pageH - 50) {
      doc.addPage();
      y = margin;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 27, 42);
    doc.text("Leveling Suggestions", margin, y);
    y += 4;

    const sugRows = suggestions.map(s => [
      s.resourceName,
      s.activityName.length > 40 ? s.activityName.substring(0, 40) + "..." : s.activityName,
      s.suggestion,
      s.severity.toUpperCase(),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Resource", "Activity", "Suggestion", "Severity"]],
      body: sugRows,
      theme: "striped",
      headStyles: { fillColor: [15, 27, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 7.5 },
      columnStyles: {
        1: { cellWidth: 60 },
        2: { cellWidth: 80 },
      },
      margin: { left: margin, right: margin },
      didParseCell: function(data: any) {
        if (data.section === "body" && data.column.index === 3) {
          const sev = data.cell.raw?.toString().toLowerCase() || "";
          const [r, g, b] = severityColor(sev);
          data.cell.styles.textColor = [r, g, b];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
    doc.text("ALP Contractor Portal — Resource Leveling Report", margin, pageH - 8);
  }

  doc.save(`Resource_Leveling_${scheduleName.replace(/\s+/g, "_")}.pdf`);
}
