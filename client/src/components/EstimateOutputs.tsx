/**
 * EstimateOutputs — Bid Summary PDF, Proposal, and Schedule of Values (SOV).
 * Uses jsPDF + jspdf-autotable for clean formatted output.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText, FileSpreadsheet, ClipboardList, Download, Loader2,
  Building2, User, Calendar, MapPin,
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

  // ─── Project info fields for proposal ────────────────────────────────
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [projectAddress, setProjectAddress] = useState("");
  const [companyName, setCompanyName] = useState("ALP Construction");
  const [companyContact, setCompanyContact] = useState("");

  // ─── Bid Summary PDF ────────────────────────────────────────────────
  const generateBidSummary = () => {
    setGenerating("bid");
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(15, 23, 42); // navy
      doc.rect(0, 0, pageW, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("BID SUMMARY", 14, 22);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(projectName, 14, 32);
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - 14, 32, { align: "right" });

      let y = 50;

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
      doc.text(`Project: ${projectName}`, pageW - 14, pageH - 10, { align: "right" });

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

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 50, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("PROPOSAL", 14, 25);
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(projectName, 14, 38);
      doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), pageW - 14, 38, { align: "right" });

      let y = 60;

      // From / To
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("FROM:", 14, y);
      doc.setFont("helvetica", "normal");
      doc.text(companyName || "Your Company", 14, y + 6);
      if (companyContact) doc.text(companyContact, 14, y + 12);

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
          [`Overhead & Profit`, fmtCurrency(calculations.overhead + calculations.profit)],
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
      // Signature lines
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

  // ─── Schedule of Values (SOV) ──────────────────────────────────────
  const generateSOV = () => {
    setGenerating("sov");
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const pageW = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 35, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("SCHEDULE OF VALUES", 14, 18);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Project: ${projectName}`, 14, 28);
      doc.text(`AIA G703 Format  |  Date: ${new Date().toLocaleDateString()}`, pageW - 14, 28, { align: "right" });

      // Build SOV rows
      const sovRows: (string | number)[][] = [];
      let itemNum = 1;
      let runningTotal = 0;

      for (const div of calculations.divisionOrder) {
        const data = calculations.byDivision[div];
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        const divTotal = data.materialTotal + data.laborTotal;
        const pctOfTotal = calculations.grandTotal > 0 ? ((divTotal / calculations.grandTotal) * 100).toFixed(1) : "0.0";
        runningTotal += divTotal;

        sovRows.push([
          String(itemNum++),
          `${div} — ${divName}`,
          fmtCurrency(divTotal),
          `${pctOfTotal}%`,
          "$0.00", // Previous applications
          "$0.00", // This period
          fmtCurrency(divTotal), // Balance to finish
          `${pctOfTotal}%`, // % complete
        ]);
      }

      const pctOfGrand = (val: number): string => {
        return calculations.grandTotal > 0 ? `${((val / calculations.grandTotal) * 100).toFixed(1)}%` : "0.0%";
      };

      // Add markup line items
      if (calculations.generalConditions > 0) {
        sovRows.push([String(itemNum++), "General Conditions", fmtCurrency(calculations.generalConditions), pctOfGrand(calculations.generalConditions), "$0.00", "$0.00", fmtCurrency(calculations.generalConditions), "0.0%"]);
      }
      if (calculations.overhead > 0) {
        sovRows.push([String(itemNum++), "Overhead", fmtCurrency(calculations.overhead), pctOfGrand(calculations.overhead), "$0.00", "$0.00", fmtCurrency(calculations.overhead), "0.0%"]);
      }
      if (calculations.profit > 0) {
        sovRows.push([String(itemNum++), "Profit", fmtCurrency(calculations.profit), pctOfGrand(calculations.profit), "$0.00", "$0.00", fmtCurrency(calculations.profit), "0.0%"]);
      }
      if (calculations.contingency > 0) {
        sovRows.push([String(itemNum++), "Contingency", fmtCurrency(calculations.contingency), pctOfGrand(calculations.contingency), "$0.00", "$0.00", fmtCurrency(calculations.contingency), "0.0%"]);
      }
      if (calculations.bond > 0) {
        sovRows.push([String(itemNum++), "Bond", fmtCurrency(calculations.bond), pctOfGrand(calculations.bond), "$0.00", "$0.00", fmtCurrency(calculations.bond), "0.0%"]);
      }
      if (calculations.tax > 0) {
        sovRows.push([String(itemNum++), "Sales Tax", fmtCurrency(calculations.tax), pctOfGrand(calculations.tax), "$0.00", "$0.00", fmtCurrency(calculations.tax), "0.0%"]);
      }

      autoTable(doc, {
        startY: 42,
        head: [["#", "Description of Work", "Scheduled Value", "% of Total", "Previous Applications", "Work This Period", "Balance to Finish", "% Complete"]],
        body: sovRows,
        foot: [["", "GRAND TOTAL", fmtCurrency(calculations.grandTotal), "100.0%", "$0.00", "$0.00", fmtCurrency(calculations.grandTotal), "0.0%"]],
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 7, fontStyle: "bold" },
        footStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 12, halign: "center" },
          1: { cellWidth: 70 },
          2: { halign: "right" },
          3: { halign: "center" },
          4: { halign: "right" },
          5: { halign: "right" },
          6: { halign: "right" },
          7: { halign: "center" },
        },
        margin: { left: 10, right: 10 },
      });

      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("AIA Document G703 — Schedule of Values  |  Generated by ConstructLine — Powered by ALP", 10, pageH - 8);

      doc.save(`sov-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
      toast.success("Schedule of Values PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate SOV");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Section header */}
      <div className="flex items-center gap-2 border-t border-white/10 pt-6">
        <FileText className="w-5 h-5 text-amber-400" />
        <h3 className="text-cream font-semibold text-base">Export Documents</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bid Summary */}
        <div className="bg-navy-medium/30 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <h4 className="text-cream font-medium text-sm">Bid Summary</h4>
          </div>
          <p className="text-cream-muted text-xs">
            One-page formatted estimate with division breakdown and markup waterfall. Ready to hand to an owner or GC.
          </p>
          <Button size="sm" onClick={generateBidSummary} disabled={generating === "bid"}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white gap-1.5">
            {generating === "bid" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download Bid Summary PDF
          </Button>
        </div>

        {/* Proposal */}
        <div className="bg-navy-medium/30 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-400" />
            <h4 className="text-cream font-medium text-sm">Proposal</h4>
          </div>
          <p className="text-cream-muted text-xs">
            Cover letter + scope + pricing summary + terms. Fill in the client info below for a complete proposal.
          </p>
          <div className="space-y-1.5">
            <Input placeholder="Client name" value={clientName} onChange={e => setClientName(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Client company" value={clientCompany} onChange={e => setClientCompany(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Project address" value={projectAddress} onChange={e => setProjectAddress(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
            <Input placeholder="Your company name" value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="h-7 text-xs bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/40" />
          </div>
          <Button size="sm" onClick={generateProposal} disabled={generating === "proposal"}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white gap-1.5">
            {generating === "proposal" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download Proposal PDF
          </Button>
        </div>

        {/* SOV */}
        <div className="bg-navy-medium/30 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <h4 className="text-cream font-medium text-sm">Schedule of Values</h4>
          </div>
          <p className="text-cream-muted text-xs">
            AIA G703-format line-item breakdown by CSI division with scheduled values and completion tracking columns.
          </p>
          <Button size="sm" onClick={generateSOV} disabled={generating === "sov"}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5">
            {generating === "sov" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Download SOV PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
