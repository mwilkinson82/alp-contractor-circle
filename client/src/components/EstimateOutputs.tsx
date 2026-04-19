/**
 * EstimateOutputs — Bid Summary PDF, Proposal PDF, and AIA G702/G703 SOV Excel.
 * Uses jsPDF + jspdf-autotable for PDFs, xlsx (SheetJS) for Excel SOV.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  FileText, FileSpreadsheet, ClipboardList, Download, Loader2,
  Building2, Settings2,
} from "lucide-react";

const CSI_DIVISION_NAMES: Record<string, string> = {
  "01": "General Requirements", "02": "Existing Conditions", "03": "Concrete",
  "04": "Masonry", "05": "Metals", "06": "Wood, Plastics & Composites",
  "07": "Thermal & Moisture Protection", "08": "Openings", "09": "Finishes",
  "10": "Specialties", "11": "Equipment", "12": "Furnishings",
  "13": "Special Construction", "14": "Conveying Equipment",
  "21": "Fire Suppression", "22": "Plumbing", "23": "HVAC",
  "26": "Electrical", "27": "Communications", "28": "Electronic Safety & Security",
  "31": "Earthwork", "32": "Exterior Improvements", "33": "Utilities",
};

function fmtCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(cents / 100);
}
function fmtNum(cents: number): number {
  return Math.round(cents) / 100;
}

interface DivisionData {
  items: any[];
  materialTotal: number;
  laborTotal: number;
}

interface EstimateCalcs {
  byDivision: Record<string, DivisionData>;
  divisionOrder: string[];
  totalMaterial: number;
  totalLabor: number;
  directCost: number;
  generalConditions: number;
  overhead: number;
  profit: number;
  contingency: number;
  bond: number;
  tax: number;
  grandTotal: number;
}

interface EstimateOutputsProps {
  projectName: string;
  projectDescription?: string;
  calculations: EstimateCalcs;
  markups: {
    generalConditionsPct: number;
    overheadPct: number;
    profitPct: number;
    contingencyPct: number;
    bondPct: number;
    taxPct: number;
  };
  currency: string;
  costRegion?: string | null;
}

function pctDisplay(bps: number): string { return (bps / 100).toFixed(2); }

export default function EstimateOutputs({
  projectName, projectDescription, calculations, markups, currency, costRegion,
}: EstimateOutputsProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [showBranding, setShowBranding] = useState(false);

  // ─── Company branding fields ──────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyLicense, setCompanyLicense] = useState("");

  // ─── Proposal client fields ───────────────────────────────────────
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [projectAddress, setProjectAddress] = useState("");

  // ─── SOV fields ───────────────────────────────────────────────────
  const [ownerName, setOwnerName] = useState("");
  const [architectName, setArchitectName] = useState("");
  const [contractDate, setContractDate] = useState("");
  const [projectNo, setProjectNo] = useState("");
  const [retainagePct, setRetainagePct] = useState("10");

  // ─── Bid Summary PDF ────────────────────────────────────────────────
  const generateBidSummary = () => {
    setGenerating("bid");
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Header with company branding
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 45, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("BID SUMMARY", 14, 18);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (companyName) doc.text(companyName, 14, 26);
      if (companyAddress) doc.text(companyAddress, 14, 32);
      if (companyPhone || companyEmail) doc.text([companyPhone, companyEmail].filter(Boolean).join(" | "), 14, 38);
      doc.text(projectName, pageW - 14, 26, { align: "right" });
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - 14, 32, { align: "right" });
      if (costRegion) doc.text(`Region: ${costRegion}`, pageW - 14, 38, { align: "right" });

      let y = 55;

      // Division breakdown table
      const divRows = calculations.divisionOrder.map(div => {
        const data = calculations.byDivision[div];
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        return [
          `Div ${div} — ${divName}`,
          fmtCurrency(data.materialTotal),
          fmtCurrency(data.laborTotal),
          fmtCurrency(data.materialTotal + data.laborTotal),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["CSI Division", "Material", "Labor", "Subtotal"]],
        body: divRows,
        foot: [["DIRECT COSTS TOTAL", fmtCurrency(calculations.totalMaterial), fmtCurrency(calculations.totalLabor), fmtCurrency(calculations.directCost)]],
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
        footStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Markup waterfall
      const waterfallRows: string[][] = [
        ["Direct Costs", fmtCurrency(calculations.directCost)],
      ];
      if (markups.generalConditionsPct > 0) waterfallRows.push([`+ General Conditions (${pctDisplay(markups.generalConditionsPct)}%)`, fmtCurrency(calculations.generalConditions)]);
      if (markups.overheadPct > 0) waterfallRows.push([`+ Overhead (${pctDisplay(markups.overheadPct)}%)`, fmtCurrency(calculations.overhead)]);
      if (markups.profitPct > 0) waterfallRows.push([`+ Profit (${pctDisplay(markups.profitPct)}%)`, fmtCurrency(calculations.profit)]);
      if (markups.contingencyPct > 0) waterfallRows.push([`+ Contingency (${pctDisplay(markups.contingencyPct)}%)`, fmtCurrency(calculations.contingency)]);
      if (markups.bondPct > 0) waterfallRows.push([`+ Bond (${pctDisplay(markups.bondPct)}%)`, fmtCurrency(calculations.bond)]);
      if (markups.taxPct > 0) waterfallRows.push([`+ Sales Tax on Materials (${pctDisplay(markups.taxPct)}%)`, fmtCurrency(calculations.tax)]);

      autoTable(doc, {
        startY: y,
        head: [["Estimate Waterfall", "Amount"]],
        body: waterfallRows,
        foot: [["GRAND TOTAL", fmtCurrency(calculations.grandTotal)]],
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 9, fontStyle: "bold" },
        footStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 11, fontStyle: "bold" },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by ConstructLine — Powered by ALP", 14, pageH - 10);
      if (companyLicense) doc.text(`License: ${companyLicense}`, pageW - 14, pageH - 10, { align: "right" });

      doc.save(`bid-summary-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("Bid Summary PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(null);
    }
  };

  // ─── Proposal PDF ──────────────────────────────────────────────────
  const generateProposal = () => {
    setGenerating("proposal");
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      // Header with company branding
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 50, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PROPOSAL", 14, 22);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (companyName) {
        doc.text(companyName, 14, 32);
        if (companyAddress) doc.text(companyAddress, 14, 38);
        if (companyPhone) doc.text(companyPhone, 14, 44);
      }
      doc.text(projectName, pageW - 14, 32, { align: "right" });
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - 14, 38, { align: "right" });

      let y = 60;

      // From / To
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("FROM:", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(companyName || "Your Company", 14, y + 6);
      if (companyEmail) doc.text(companyEmail, 14, y + 12);
      if (companyLicense) doc.text(`License: ${companyLicense}`, 14, y + 18);

      doc.setFont("helvetica", "bold");
      doc.text("TO:", pageW / 2, y);
      doc.setFont("helvetica", "normal");
      doc.text(clientName || "Client Name", pageW / 2, y + 6);
      if (clientCompany) doc.text(clientCompany, pageW / 2, y + 12);
      if (projectAddress) doc.text(projectAddress, pageW / 2, y + 18);

      y += 30;

      // Scope
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("SCOPE OF WORK", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const scopeText = projectDescription || "Provide all labor, materials, equipment, and supervision necessary to complete the following work as described in the project documents:";
      const scopeLines = doc.splitTextToSize(scopeText, pageW - 28);
      doc.text(scopeLines, 14, y);
      y += scopeLines.length * 5 + 5;

      // Division list
      for (const div of calculations.divisionOrder) {
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        const data = calculations.byDivision[div];
        if (data.items.length > 0) {
          doc.text(`• Division ${div} — ${divName} (${data.items.length} items)`, 18, y);
          y += 5;
          if (y > pageH - 60) { doc.addPage(); y = 20; }
        }
      }

      y += 5;

      // Pricing summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("PRICING SUMMARY", 14, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        body: [
          ["Direct Costs (Material + Labor)", fmtCurrency(calculations.directCost)],
          [`General Conditions (${pctDisplay(markups.generalConditionsPct)}%)`, fmtCurrency(calculations.generalConditions)],
          ["Overhead & Profit", fmtCurrency(calculations.overhead + calculations.profit)],
          [`Contingency (${pctDisplay(markups.contingencyPct)}%)`, fmtCurrency(calculations.contingency)],
          [`Bond (${pctDisplay(markups.bondPct)}%)`, fmtCurrency(calculations.bond)],
          [`Sales Tax (${pctDisplay(markups.taxPct)}%)`, fmtCurrency(calculations.tax)],
        ],
        foot: [["TOTAL CONTRACT PRICE", fmtCurrency(calculations.grandTotal)]],
        theme: "plain",
        footStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255], fontSize: 12, fontStyle: "bold" },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // Terms
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("TERMS & CONDITIONS", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const terms = [
        "1. This proposal is valid for 30 days from the date above.",
        "2. Payment terms: Progress billing per AIA G702/G703 Schedule of Values.",
        "3. Retainage: 10% until substantial completion, 5% through final completion.",
        "4. Changes to scope require written Change Order approval before work begins.",
        "5. This proposal excludes work not specifically described in the scope above.",
      ];
      for (const t of terms) {
        doc.text(t, 14, y);
        y += 5;
      }

      y += 10;
      doc.setDrawColor(150, 150, 150);
      doc.line(14, y, 90, y);
      doc.line(pageW / 2 + 10, y, pageW - 14, y);
      doc.setFontSize(8);
      doc.text("Contractor Signature / Date", 14, y + 5);
      doc.text("Owner/Client Signature / Date", pageW / 2 + 10, y + 5);

      // Footer
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by ConstructLine — Powered by ALP", 14, pageH - 10);

      doc.save(`proposal-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("Proposal PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate Proposal");
    } finally {
      setGenerating(null);
    }
  };

  // ─── AIA G702/G703 SOV Excel ──────────────────────────────────────
  const generateSOVExcel = () => {
    setGenerating("sov");
    try {
      const wb = XLSX.utils.book_new();
      const today = new Date().toLocaleDateString("en-US");
      const retPct = parseFloat(retainagePct) || 10;

      // ── Sheet 1: G702 — Application & Certificate for Payment ─────
      const g702Data: (string | number | null)[][] = [];

      // Header rows
      g702Data.push(["AIA DOCUMENT G702 — APPLICATION AND CERTIFICATE FOR PAYMENT"]);
      g702Data.push([]);
      g702Data.push(["TO OWNER:", ownerName || "(Owner Name)", "", "APPLICATION NO:", "1"]);
      g702Data.push(["PROJECT:", projectName, "", "PERIOD TO:", today]);
      g702Data.push(["FROM CONTRACTOR:", companyName || "(Contractor Name)", "", "CONTRACT DATE:", contractDate || today]);
      g702Data.push(["VIA ARCHITECT:", architectName || "(Architect Name)", "", "PROJECT NO:", projectNo || ""]);
      g702Data.push([]);
      g702Data.push(["CONTRACTOR'S APPLICATION FOR PAYMENT"]);
      g702Data.push([]);

      // 9-line calculation
      const originalContractSum = fmtNum(calculations.grandTotal);
      g702Data.push(["1.", "ORIGINAL CONTRACT SUM", "", "", originalContractSum]);
      g702Data.push(["2.", "Net Change by Change Orders", "", "", 0]);
      g702Data.push(["3.", "CONTRACT SUM TO DATE (Line 1 ± 2)", "", "", originalContractSum]);
      g702Data.push(["4.", "TOTAL COMPLETED & STORED TO DATE (Column G on G703)", "", "", 0]);
      g702Data.push(["5.", "RETAINAGE"]);
      g702Data.push(["", `  a. ${retPct}% of Completed Work`, "", "", 0]);
      g702Data.push(["", `  b. ${retPct}% of Stored Material`, "", "", 0]);
      g702Data.push(["", "  Total Retainage (Lines 5a + 5b)", "", "", 0]);
      g702Data.push(["6.", "TOTAL EARNED LESS RETAINAGE (Line 4 Less Line 5 Total)", "", "", 0]);
      g702Data.push(["7.", "LESS PREVIOUS CERTIFICATES FOR PAYMENT", "", "", 0]);
      g702Data.push(["8.", "CURRENT PAYMENT DUE (Line 6 - Line 7)", "", "", 0]);
      g702Data.push(["9.", "BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 - Line 6)", "", "", originalContractSum]);
      g702Data.push([]);
      g702Data.push(["CONTRACTOR CERTIFICATION"]);
      g702Data.push(["The undersigned Contractor certifies that to the best of the Contractor's knowledge,"]);
      g702Data.push(["information and belief the Work covered by this Application for Payment has been"]);
      g702Data.push(["completed in accordance with the Contract Documents."]);
      g702Data.push([]);
      g702Data.push(["Contractor: ___________________________", "", "", "Date: _______________"]);
      g702Data.push([]);
      g702Data.push(["ARCHITECT'S CERTIFICATE FOR PAYMENT"]);
      g702Data.push(["In accordance with the Contract Documents, the Architect certifies that to the best"]);
      g702Data.push(["of the Architect's knowledge, the Work has progressed as indicated."]);
      g702Data.push([]);
      g702Data.push(["Architect: ___________________________", "", "", "Date: _______________"]);

      const ws1 = XLSX.utils.aoa_to_sheet(g702Data);
      // Set column widths
      ws1["!cols"] = [
        { wch: 5 }, { wch: 50 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "G702 - Application");

      // ── Sheet 2: G703 — Continuation Sheet (SOV) ──────────────────
      const g703Data: (string | number | null)[][] = [];

      // Header
      g703Data.push(["AIA DOCUMENT G703 — CONTINUATION SHEET"]);
      g703Data.push(["APPLICATION NO:", "1", "", "APPLICATION DATE:", today]);
      g703Data.push(["PROJECT:", projectName, "", "PERIOD TO:", today]);
      g703Data.push([]);

      // Column headers
      g703Data.push([
        "ITEM NO.",
        "DESCRIPTION OF WORK",
        "SCHEDULED VALUE",
        "WORK COMPLETED - FROM PREVIOUS APPLICATION (D+E)",
        "WORK COMPLETED - THIS PERIOD",
        "MATERIALS PRESENTLY STORED (NOT IN D OR E)",
        "TOTAL COMPLETED AND STORED TO DATE (D+E+F)",
        "% (G ÷ C)",
        "BALANCE TO FINISH (C - G)",
        `RETAINAGE (${retPct}%)`,
      ]);

      // Division line items
      let itemNum = 1;
      let totalScheduled = 0;

      for (const div of calculations.divisionOrder) {
        const data = calculations.byDivision[div];
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        const divTotal = fmtNum(data.materialTotal + data.laborTotal);
        totalScheduled += divTotal;

        g703Data.push([
          itemNum++,
          `${div} — ${divName}`,
          divTotal,
          0, // Previous application
          0, // This period
          0, // Stored materials
          0, // Total completed
          "0%", // % complete
          divTotal, // Balance to finish
          0, // Retainage
        ]);
      }

      // Markup line items
      const markupItems: [string, number][] = [];
      if (calculations.generalConditions > 0) markupItems.push(["General Conditions", fmtNum(calculations.generalConditions)]);
      if (calculations.overhead > 0) markupItems.push(["Overhead", fmtNum(calculations.overhead)]);
      if (calculations.profit > 0) markupItems.push(["Profit", fmtNum(calculations.profit)]);
      if (calculations.contingency > 0) markupItems.push(["Contingency", fmtNum(calculations.contingency)]);
      if (calculations.bond > 0) markupItems.push(["Bond", fmtNum(calculations.bond)]);
      if (calculations.tax > 0) markupItems.push(["Sales Tax", fmtNum(calculations.tax)]);

      for (const [name, amount] of markupItems) {
        totalScheduled += amount;
        g703Data.push([
          itemNum++,
          name,
          amount,
          0, 0, 0, 0, "0%", amount, 0,
        ]);
      }

      // Totals row
      g703Data.push([]);
      g703Data.push([
        "",
        "CONTRACT TOTALS",
        totalScheduled,
        0, 0, 0, 0, "0%", totalScheduled, 0,
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet(g703Data);
      // Set column widths for G703
      ws2["!cols"] = [
        { wch: 10 }, // Item No
        { wch: 35 }, // Description
        { wch: 16 }, // Scheduled Value
        { wch: 18 }, // Previous Application
        { wch: 16 }, // This Period
        { wch: 18 }, // Stored Materials
        { wch: 18 }, // Total Completed
        { wch: 10 }, // %
        { wch: 16 }, // Balance to Finish
        { wch: 14 }, // Retainage
      ];
      XLSX.utils.book_append_sheet(wb, ws2, "G703 - SOV");

      // Download
      XLSX.writeFile(wb, `AIA-G702-G703-SOV-${projectName.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
      toast.success("AIA G702/G703 SOV Excel downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate SOV Excel");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Section header */}
      <div className="flex items-center justify-between border-t border-white/10 pt-6">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-400" />
          <h3 className="text-cream font-semibold text-base">Export Documents</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowBranding(!showBranding)}
          className="text-cream-muted hover:text-cream gap-1.5 text-xs">
          <Settings2 className="w-3.5 h-3.5" />
          {showBranding ? "Hide" : "Company"} Branding
        </Button>
      </div>

      {/* Company Branding Panel */}
      {showBranding && (
        <div className="bg-navy-medium/30 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <h4 className="text-cream font-medium text-sm">Company Branding</h4>
            <span className="text-cream-muted text-xs">(appears on all documents)</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Company name" value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="h-8 text-sm bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Company address" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
              className="h-8 text-sm bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Phone number" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)}
              className="h-8 text-sm bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Email address" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)}
              className="h-8 text-sm bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="License number (optional)" value={companyLicense} onChange={e => setCompanyLicense(e.target.value)}
              className="h-8 text-sm bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bid Summary */}
        <div className="bg-navy-medium/30 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h4 className="text-cream font-medium text-sm">Bid Summary</h4>
          </div>
          <p className="text-cream-muted text-xs">
            One-page formatted estimate with division breakdown and markup waterfall. Includes your company branding.
          </p>
          <Button size="sm" onClick={generateBidSummary} disabled={generating === "bid"}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-1.5">
            {generating === "bid" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </Button>
        </div>

        {/* Proposal */}
        <div className="bg-navy-medium/30 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            <h4 className="text-cream font-medium text-sm">Proposal</h4>
          </div>
          <p className="text-cream-muted text-xs">
            Cover letter + scope + pricing + terms. Fill in client info below.
          </p>
          <div className="space-y-1.5">
            <Input placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Client company" value={clientCompany} onChange={e => setClientCompany(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Project address" value={projectAddress} onChange={e => setProjectAddress(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
          </div>
          <Button size="sm" onClick={generateProposal} disabled={generating === "proposal"}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-1.5">
            {generating === "proposal" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download PDF
          </Button>
        </div>

        {/* SOV — AIA G702/G703 Excel */}
        <div className="bg-navy-medium/30 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <h4 className="text-cream font-medium text-sm">Schedule of Values</h4>
          </div>
          <p className="text-cream-muted text-xs">
            AIA G702/G703 Excel — 2 sheets: Application for Payment + Continuation Sheet (SOV). Editable in Excel.
          </p>
          <div className="space-y-1.5">
            <Input placeholder="Owner name" value={ownerName} onChange={e => setOwnerName(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Architect name" value={architectName} onChange={e => setArchitectName(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <div className="grid grid-cols-2 gap-1.5">
              <Input placeholder="Project No." value={projectNo} onChange={e => setProjectNo(e.target.value)}
                className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
              <Input placeholder="Retainage %" value={retainagePct} onChange={e => setRetainagePct(e.target.value)}
                className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            </div>
          </div>
          <Button size="sm" onClick={generateSOVExcel} disabled={generating === "sov"}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5">
            {generating === "sov" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download AIA G702/G703 Excel
          </Button>
        </div>
      </div>
    </div>
  );
}
