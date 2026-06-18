/**
 * EstimateOutputs — Bid Summary PDF, Proposal PDF, and AIA G702/G703 SOV Excel.
 * Uses jsPDF + jspdf-autotable for PDFs, xlsx (SheetJS) for Excel SOV.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  FileText,
  FileSpreadsheet,
  ClipboardList,
  Download,
  Loader2,
  Building2,
  Settings2,
  Upload,
  Palette,
  LayoutTemplate,
  Send,
  BadgeCheck,
  TableProperties,
} from "lucide-react";

const CSI_DIVISION_NAMES: Record<string, string> = {
  "01": "General Requirements",
  "02": "Existing Conditions",
  "03": "Concrete",
  "04": "Masonry",
  "05": "Metals",
  "06": "Wood, Plastics & Composites",
  "07": "Thermal & Moisture Protection",
  "08": "Openings",
  "09": "Finishes",
  "10": "Specialties",
  "11": "Equipment",
  "12": "Furnishings",
  "13": "Special Construction",
  "14": "Conveying Equipment",
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "28": "Electronic Safety & Security",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

function fmtCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
function fmtNum(cents: number): number {
  return Math.round(cents) / 100;
}
function parseCents(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}
function getMaterialUnitCost(item: any): number {
  const materialCost = parseCents(item.materialCost);
  if (materialCost > 0) return materialCost;
  const installedUnit = parseCents(item.unitCost);
  const defaultLaborUnit = parseCents(item.laborCost);
  if (installedUnit > defaultLaborUnit) return installedUnit - defaultLaborUnit;
  return parseCents(item.unitCost);
}
function getItemQuantity(item: any): number {
  return parseFloat(String(item.quantity ?? "")) || 0;
}
function getItemMaterialTotal(item: any): number {
  return Math.round(getItemQuantity(item) * getMaterialUnitCost(item));
}
function getSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet";
}

type EstimateQaAnomaly = {
  id?: string;
  severity?: string;
  category?: string;
  title?: string;
  description?: string;
  amount?: number;
  items?: any[];
};

function getEstimateItemKey(item: any): string {
  return String(item?.id ?? item?.itemId ?? item?.description ?? "");
}

function buildQaFlagMap(anomalies: EstimateQaAnomaly[]): Map<string, string[]> {
  const flags = new Map<string, string[]>();
  for (const anomaly of anomalies) {
    const label = `${String(anomaly.severity || "review").toUpperCase()}: ${anomaly.title || "ConstructLine QA"}`;
    for (const item of anomaly.items || []) {
      const key = getEstimateItemKey(item);
      if (!key) continue;
      const existing = flags.get(key) || [];
      if (!existing.includes(label)) existing.push(label);
      flags.set(key, existing);
    }
  }
  return flags;
}

function getSourceSheetLabel(item: any, sheets: any[]): string {
  const sheetId = item?.sheetId ?? item?.sourceSheetId;
  const sheet = sheets.find(candidate => String(candidate?.id) === String(sheetId));
  if (sheet) {
    return (
      [sheet.sheetNumber, sheet.sheetName || sheet.name]
        .filter(Boolean)
        .join(" - ") || `Sheet ${sheet.pageNumber || sheet.id}`
    );
  }
  return (
    item?.sheetName ||
    item?.sheetNumber ||
    (sheetId ? `Sheet ${sheetId}` : "")
  );
}

function getScopeStatus(item: any): string {
  const explicit = item?.scopeStatus || item?.scopeDecision || item?.status;
  if (explicit) return String(explicit);
  const notes = String(item?.notes || "").toLowerCase();
  if (notes.includes("[scope: excluded]")) return "Excluded";
  if (notes.includes("[scope: review]")) return "Review";
  if (notes.includes("[scope: included]")) return "Accepted";
  return "Accepted";
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
  allowancesTotal?: number;
  directCost: number;
  generalConditions: number;
  overhead: number;
  profit: number;
  contingency: number;
  bond: number;
  tax: number;
  grandTotal: number;
  itemLaborEstimates?: Map<
    number,
    {
      laborCost: number;
      laborSourceLabel: string;
      laborNote: string;
      crewName?: string;
      productivityPerCrewHr?: number;
    }
  >;
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
  sheets?: any[];
  qaAnomalies?: EstimateQaAnomaly[];
}

function pctDisplay(bps: number): string {
  return (bps / 100).toFixed(2);
}

export default function EstimateOutputs({
  projectName,
  projectDescription,
  calculations,
  markups,
  currency,
  costRegion,
  sheets = [],
  qaAnomalies = [],
}: EstimateOutputsProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [showBranding, setShowBranding] = useState(true);
  const [proposalLayout, setProposalLayout] = useState<
    "executive" | "formal" | "scope"
  >("executive");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [proposalIntro, setProposalIntro] = useState(
    "Thank you for the opportunity to submit this proposal. The pricing below is built from the accepted ConstructLine takeoff, organized by CSI division, and includes the direct costs, labor basis, markups, tax, and bid total shown in this package."
  );
  const [proposalInclusions, setProposalInclusions] = useState(
    "Includes accepted scope items listed in the estimate detail, labor and material pricing shown by division, allowances included in the bid total, and standard project supervision required to perform the work."
  );
  const [proposalExclusions, setProposalExclusions] = useState(
    "Excludes work not specifically listed in this proposal, owner-furnished items, hidden conditions, permit fees unless listed, and changes after proposal acceptance."
  );
  const [proposalTerms, setProposalTerms] = useState(
    "Proposal is valid for 30 days. Changes to scope require written approval. Payment terms, retainage, and schedule requirements are subject to final contract agreement."
  );
  const [includeTerms, setIncludeTerms] = useState(false);
  const qaFlagMap = buildQaFlagMap(qaAnomalies);
  const qaBlockerCount = qaAnomalies.filter(
    anomaly => anomaly.severity === "blocker"
  ).length;
  const qaReviewCount = qaAnomalies.filter(
    anomaly => anomaly.severity && anomaly.severity !== "reference"
  ).length;

  // ─── Company branding fields ──────────────────────────────────────
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyLicense, setCompanyLicense] = useState("");

  const handleLogoUpload = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogoDataUrl(reader.result);
        toast.success("Company logo attached");
      }
    };
    reader.readAsDataURL(file);
  };

  const addLogo = (doc: jsPDF, pageW: number, x = pageW - 44, y = 10) => {
    if (!logoDataUrl) return;
    try {
      doc.addImage(
        logoDataUrl,
        logoDataUrl.includes("image/png") ? "PNG" : "JPEG",
        x,
        y,
        28,
        16,
        undefined,
        "FAST"
      );
    } catch {
      // If a browser-provided image type cannot be embedded, keep document generation working.
    }
  };

  const getLabor = (item: any) => calculations.itemLaborEstimates?.get(item.id);
  const buildItemRows = (items: any[]) =>
    items.map((item: any) => {
      const qty = getItemQuantity(item);
      const materialTotal = getItemMaterialTotal(item);
      const labor = getLabor(item);
      const laborTotal = labor?.laborCost || 0;
      return {
        item,
        qty,
        materialTotal,
        laborTotal,
        subtotal: materialTotal + laborTotal,
        labor,
      };
    });

  const writeWorkbookSheet = (
    wb: XLSX.WorkBook,
    sheetName: string,
    rows: Record<string, string | number>[],
    widths: Array<{ wch: number }>
  ) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = widths;
    XLSX.utils.book_append_sheet(wb, ws, getSheetName(sheetName));
  };

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
      addLogo(doc, pageW);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (companyName) doc.text(companyName, 14, 26);
      if (companyAddress) doc.text(companyAddress, 14, 32);
      if (companyPhone || companyEmail)
        doc.text(
          [companyPhone, companyEmail].filter(Boolean).join(" | "),
          14,
          38
        );
      doc.text(projectName, pageW - 14, 26, { align: "right" });
      doc.text(
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        pageW - 14,
        32,
        { align: "right" }
      );
      if (costRegion)
        doc.text(`Region: ${costRegion}`, pageW - 14, 38, { align: "right" });

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
      if ((calculations.allowancesTotal || 0) > 0) {
        divRows.push([
          "Allowances",
          "—",
          "—",
          fmtCurrency(calculations.allowancesTotal || 0),
        ]);
      }

      autoTable(doc, {
        startY: y,
        head: [["CSI Division", "Material", "Crew Labor", "Subtotal"]],
        body: divRows,
        foot: [
          [
            "DIRECT COSTS TOTAL",
            fmtCurrency(calculations.totalMaterial),
            fmtCurrency(calculations.totalLabor),
            fmtCurrency(calculations.directCost),
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
        },
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
      if (markups.generalConditionsPct > 0)
        waterfallRows.push([
          `+ General Conditions (${pctDisplay(markups.generalConditionsPct)}%)`,
          fmtCurrency(calculations.generalConditions),
        ]);
      if (markups.overheadPct > 0)
        waterfallRows.push([
          `+ Overhead (${pctDisplay(markups.overheadPct)}%)`,
          fmtCurrency(calculations.overhead),
        ]);
      if (markups.profitPct > 0)
        waterfallRows.push([
          `+ Profit (${pctDisplay(markups.profitPct)}%)`,
          fmtCurrency(calculations.profit),
        ]);
      if (markups.contingencyPct > 0)
        waterfallRows.push([
          `+ Contingency (${pctDisplay(markups.contingencyPct)}%)`,
          fmtCurrency(calculations.contingency),
        ]);
      if (markups.bondPct > 0)
        waterfallRows.push([
          `+ Bond (${pctDisplay(markups.bondPct)}%)`,
          fmtCurrency(calculations.bond),
        ]);
      if (markups.taxPct > 0)
        waterfallRows.push([
          `+ Sales Tax on Materials (${pctDisplay(markups.taxPct)}%)`,
          fmtCurrency(calculations.tax),
        ]);

      autoTable(doc, {
        startY: y,
        head: [["Estimate Waterfall", "Amount"]],
        body: waterfallRows,
        foot: [["GRAND TOTAL", fmtCurrency(calculations.grandTotal)]],
        theme: "grid",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 9,
          fontStyle: "bold",
        },
        footStyles: {
          fillColor: [217, 119, 6],
          textColor: [255, 255, 255],
          fontSize: 11,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text("Generated by ConstructLine — Powered by ALP", 14, pageH - 10);
      if (companyLicense)
        doc.text(`License: ${companyLicense}`, pageW - 14, pageH - 10, {
          align: "right",
        });

      doc.save(
        `bid-summary-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`
      );
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
      doc.text(
        proposalLayout === "formal" ? "CONTRACT PROPOSAL" : "PROPOSAL",
        14,
        22
      );
      addLogo(doc, pageW);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      if (companyName) {
        doc.text(companyName, 14, 32);
        if (companyAddress) doc.text(companyAddress, 14, 38);
        if (companyPhone) doc.text(companyPhone, 14, 44);
      }
      doc.text(projectName, pageW - 14, 32, { align: "right" });
      doc.text(
        new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        pageW - 14,
        38,
        { align: "right" }
      );

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

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("PROPOSAL LETTER", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const introLines = doc.splitTextToSize(proposalIntro, pageW - 28);
      doc.text(introLines, 14, y);
      y += introLines.length * 5 + 8;

      // Scope
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("SCOPE OF WORK", 14, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const scopeText =
        projectDescription ||
        (proposalLayout === "scope"
          ? "This proposal is organized around the accepted scope extracted from the project documents, including the divisions listed below."
          : "Provide all labor, materials, equipment, and supervision necessary to complete the following work as described in the project documents:");
      const scopeLines = doc.splitTextToSize(scopeText, pageW - 28);
      doc.text(scopeLines, 14, y);
      y += scopeLines.length * 5 + 5;

      const divisionRows = calculations.divisionOrder.map(div => {
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        const data = calculations.byDivision[div];
        return [
          `Div ${div} — ${divName}`,
          String(data.items.length),
          fmtCurrency(data.materialTotal, currency),
          fmtCurrency(data.laborTotal, currency),
          fmtCurrency(data.materialTotal + data.laborTotal, currency),
        ];
      });

      autoTable(doc, {
        startY: y,
        head: [["Division", "Rows", "Material", "Labor", "Subtotal"]],
        body: divisionRows,
        theme: proposalLayout === "formal" ? "grid" : "striped",
        headStyles: {
          fillColor: proposalLayout === "formal" ? [30, 41, 59] : [23, 23, 20],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 75 },
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      if (proposalLayout === "scope") {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("DETAILED ESTIMATE ITEMS", 14, y);
        y += 4;
        for (const div of calculations.divisionOrder) {
          const data = calculations.byDivision[div];
          const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
          const rows = buildItemRows(data.items).map(row => [
            row.item.description || "Estimate item",
            String(row.qty || ""),
            row.item.unit || "",
            fmtCurrency(row.materialTotal, currency),
            fmtCurrency(row.laborTotal, currency),
            fmtCurrency(row.subtotal, currency),
          ]);
          autoTable(doc, {
            startY: y,
            head: [
              [
                `Div ${div} — ${divName}`,
                "Qty",
                "Unit",
                "Material",
                "Labor",
                "Subtotal",
              ],
            ],
            body: rows,
            theme: "grid",
            headStyles: {
              fillColor: [23, 23, 20],
              textColor: [255, 255, 255],
              fontSize: 7,
              fontStyle: "bold",
            },
            bodyStyles: { fontSize: 7 },
            columnStyles: {
              0: { cellWidth: 70 },
              1: { halign: "right", cellWidth: 18 },
              2: { cellWidth: 16 },
              3: { halign: "right" },
              4: { halign: "right" },
              5: { halign: "right", fontStyle: "bold" },
            },
            margin: { left: 14, right: 14 },
          });
          y = (doc as any).lastAutoTable.finalY + 8;
          if (y > pageH - 55) {
            doc.addPage();
            y = 20;
          }
        }
      }

      if (y > pageH - 95) {
        doc.addPage();
        y = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("INCLUSIONS", 14, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const inclusionLines = doc.splitTextToSize(
        proposalInclusions,
        pageW - 28
      );
      doc.text(inclusionLines, 14, y);
      y += inclusionLines.length * 4.5 + 7;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("EXCLUSIONS", 14, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const exclusionLines = doc.splitTextToSize(
        proposalExclusions,
        pageW - 28
      );
      doc.text(exclusionLines, 14, y);
      y += exclusionLines.length * 4.5 + 8;

      // Pricing summary
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("PRICING SUMMARY", 14, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        body: [
          [
            "Direct Costs (Material + Crew Labor + Allowances)",
            fmtCurrency(calculations.directCost, currency),
          ],
          [
            `General Conditions (${pctDisplay(markups.generalConditionsPct)}%)`,
            fmtCurrency(calculations.generalConditions, currency),
          ],
          [
            "Overhead & Profit",
            fmtCurrency(calculations.overhead + calculations.profit, currency),
          ],
          [
            `Contingency (${pctDisplay(markups.contingencyPct)}%)`,
            fmtCurrency(calculations.contingency, currency),
          ],
          [
            `Bond (${pctDisplay(markups.bondPct)}%)`,
            fmtCurrency(calculations.bond, currency),
          ],
          [
            `Sales Tax (${pctDisplay(markups.taxPct)}%)`,
            fmtCurrency(calculations.tax, currency),
          ],
        ],
        foot: [
          [
            "TOTAL CONTRACT PRICE",
            fmtCurrency(calculations.grandTotal, currency),
          ],
        ],
        theme: "plain",
        footStyles: {
          fillColor: [217, 119, 6],
          textColor: [255, 255, 255],
          fontSize: 12,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      if (includeTerms && proposalTerms.trim()) {
        // Terms & Conditions — check if we need a new page
        // Terms + signatures need ~70px of space
        const termsHeight = 70;
        if (y + termsHeight > pageH - 20) {
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text(
            "Generated by ConstructLine — Powered by ALP",
            14,
            pageH - 10
          );
          doc.addPage();
          y = 20;
        }

        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("TERMS & CONDITIONS", 14, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        const terms = proposalTerms
          .split("\n")
          .flatMap(line => doc.splitTextToSize(line, pageW - 28));
        for (const t of terms) {
          if (y > pageH - 30) {
            doc.addPage();
            y = 20;
          }
          doc.text(t, 14, y);
          y += 5;
        }
      }

      // Signature lines — ensure they fit on current page
      if (y + 25 > pageH - 20) {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by ConstructLine — Powered by ALP", 14, pageH - 10);
        doc.addPage();
        y = 30;
      } else {
        y += 15;
      }

      doc.setDrawColor(150, 150, 150);
      doc.line(14, y, 90, y);
      doc.line(pageW / 2 + 10, y, pageW - 14, y);
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text("Contractor Signature / Date", 14, y + 5);
      doc.text("Owner/Client Signature / Date", pageW / 2 + 10, y + 5);

      // Footer on every page
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by ConstructLine — Powered by ALP", 14, pageH - 10);
        if (totalPages > 1) {
          doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 10, {
            align: "right",
          });
        }
      }

      doc.save(
        `proposal-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`
      );
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
      g702Data.push([
        "AIA DOCUMENT G702 — APPLICATION AND CERTIFICATE FOR PAYMENT",
      ]);
      g702Data.push([]);
      g702Data.push([
        "TO OWNER:",
        ownerName || "(Owner Name)",
        "",
        "APPLICATION NO:",
        "1",
      ]);
      g702Data.push(["PROJECT:", projectName, "", "PERIOD TO:", today]);
      g702Data.push([
        "FROM CONTRACTOR:",
        companyName || "(Contractor Name)",
        "",
        "CONTRACT DATE:",
        contractDate || today,
      ]);
      g702Data.push([
        "VIA ARCHITECT:",
        architectName || "(Architect Name)",
        "",
        "PROJECT NO:",
        projectNo || "",
      ]);
      g702Data.push([]);
      g702Data.push(["CONTRACTOR'S APPLICATION FOR PAYMENT"]);
      g702Data.push([]);

      // 9-line calculation
      const originalContractSum = fmtNum(calculations.grandTotal);
      g702Data.push([
        "1.",
        "ORIGINAL CONTRACT SUM",
        "",
        "",
        originalContractSum,
      ]);
      g702Data.push(["2.", "Net Change by Change Orders", "", "", 0]);
      g702Data.push([
        "3.",
        "CONTRACT SUM TO DATE (Line 1 ± 2)",
        "",
        "",
        originalContractSum,
      ]);
      g702Data.push([
        "4.",
        "TOTAL COMPLETED & STORED TO DATE (Column G on G703)",
        "",
        "",
        0,
      ]);
      g702Data.push(["5.", "RETAINAGE"]);
      g702Data.push(["", `  a. ${retPct}% of Completed Work`, "", "", 0]);
      g702Data.push(["", `  b. ${retPct}% of Stored Material`, "", "", 0]);
      g702Data.push(["", "  Total Retainage (Lines 5a + 5b)", "", "", 0]);
      g702Data.push([
        "6.",
        "TOTAL EARNED LESS RETAINAGE (Line 4 Less Line 5 Total)",
        "",
        "",
        0,
      ]);
      g702Data.push([
        "7.",
        "LESS PREVIOUS CERTIFICATES FOR PAYMENT",
        "",
        "",
        0,
      ]);
      g702Data.push(["8.", "CURRENT PAYMENT DUE (Line 6 - Line 7)", "", "", 0]);
      g702Data.push([
        "9.",
        "BALANCE TO FINISH, INCLUDING RETAINAGE (Line 3 - Line 6)",
        "",
        "",
        originalContractSum,
      ]);
      g702Data.push([]);
      g702Data.push(["CONTRACTOR CERTIFICATION"]);
      g702Data.push([
        "The undersigned Contractor certifies that to the best of the Contractor's knowledge,",
      ]);
      g702Data.push([
        "information and belief the Work covered by this Application for Payment has been",
      ]);
      g702Data.push(["completed in accordance with the Contract Documents."]);
      g702Data.push([]);
      g702Data.push([
        "Contractor: ___________________________",
        "",
        "",
        "Date: _______________",
      ]);
      g702Data.push([]);
      g702Data.push(["ARCHITECT'S CERTIFICATE FOR PAYMENT"]);
      g702Data.push([
        "In accordance with the Contract Documents, the Architect certifies that to the best",
      ]);
      g702Data.push([
        "of the Architect's knowledge, the Work has progressed as indicated.",
      ]);
      g702Data.push([]);
      g702Data.push([
        "Architect: ___________________________",
        "",
        "",
        "Date: _______________",
      ]);

      const ws1 = XLSX.utils.aoa_to_sheet(g702Data);
      // Set column widths
      ws1["!cols"] = [
        { wch: 5 },
        { wch: 50 },
        { wch: 15 },
        { wch: 18 },
        { wch: 18 },
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

      if ((calculations.allowancesTotal || 0) > 0) {
        const allowanceTotal = fmtNum(calculations.allowancesTotal || 0);
        totalScheduled += allowanceTotal;
        g703Data.push([
          itemNum++,
          "Allowances",
          allowanceTotal,
          0,
          0,
          0,
          0,
          "0%",
          allowanceTotal,
          0,
        ]);
      }

      // Markup line items
      const markupItems: [string, number][] = [];
      if (calculations.generalConditions > 0)
        markupItems.push([
          "General Conditions",
          fmtNum(calculations.generalConditions),
        ]);
      if (calculations.overhead > 0)
        markupItems.push(["Overhead", fmtNum(calculations.overhead)]);
      if (calculations.profit > 0)
        markupItems.push(["Profit", fmtNum(calculations.profit)]);
      if (calculations.contingency > 0)
        markupItems.push(["Contingency", fmtNum(calculations.contingency)]);
      if (calculations.bond > 0)
        markupItems.push(["Bond", fmtNum(calculations.bond)]);
      if (calculations.tax > 0)
        markupItems.push(["Sales Tax", fmtNum(calculations.tax)]);

      for (const [name, amount] of markupItems) {
        totalScheduled += amount;
        g703Data.push([itemNum++, name, amount, 0, 0, 0, 0, "0%", amount, 0]);
      }

      // Totals row
      g703Data.push([]);
      g703Data.push([
        "",
        "CONTRACT TOTALS",
        totalScheduled,
        0,
        0,
        0,
        0,
        "0%",
        totalScheduled,
        0,
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
      XLSX.writeFile(
        wb,
        `AIA-G702-G703-SOV-${projectName.replace(/\s+/g, "-").toLowerCase()}.xlsx`
      );
      toast.success("AIA G702/G703 SOV Excel downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate SOV Excel");
    } finally {
      setGenerating(null);
    }
  };

  const generateFullEstimateExcel = () => {
    setGenerating("full-excel");
    try {
      const wb = XLSX.utils.book_new();
      const summaryRows: Record<string, string | number>[] = [];
      for (const div of calculations.divisionOrder) {
        const data = calculations.byDivision[div];
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        summaryRows.push({
          "CSI Division": `Div ${div} — ${divName}`,
          Rows: data.items.length,
          Material: fmtNum(data.materialTotal),
          Labor: fmtNum(data.laborTotal),
          Subtotal: fmtNum(data.materialTotal + data.laborTotal),
        });
      }
      summaryRows.push({
        "CSI Division": "Allowances",
        Rows: "",
        Material: "",
        Labor: "",
        Subtotal: fmtNum(calculations.allowancesTotal || 0),
      });
      summaryRows.push({
        "CSI Division": "Direct Cost Total",
        Rows: "",
        Material: fmtNum(calculations.totalMaterial),
        Labor: fmtNum(calculations.totalLabor),
        Subtotal: fmtNum(calculations.directCost),
      });
      summaryRows.push({
        "CSI Division": "Grand Total",
        Rows: "",
        Material: "",
        Labor: "",
        Subtotal: fmtNum(calculations.grandTotal),
      });

      writeWorkbookSheet(wb, "Summary", summaryRows, [
        { wch: 42 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
      ]);

      for (const div of calculations.divisionOrder) {
        const data = calculations.byDivision[div];
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        const rows: Record<string, string | number>[] = buildItemRows(
          data.items
        ).map(row => ({
          Description: row.item.description || "",
          Quantity: row.qty,
          Unit: row.item.unit || "",
          "Scope Status": getScopeStatus(row.item),
          "Estimator Reviewed": row.item.reviewed ? "Yes" : "No",
          "Confidence %": Number(row.item.confidence || 0) || "",
          "Material Unit": fmtNum(getMaterialUnitCost(row.item)),
          "Material Total": fmtNum(row.materialTotal),
          "Labor Total": fmtNum(row.laborTotal),
          "Labor Basis": row.labor?.laborSourceLabel || "No Labor",
          "Crew / Productivity": row.labor?.crewName
            ? `${row.labor.crewName}${row.labor.productivityPerCrewHr ? ` @ ${row.labor.productivityPerCrewHr} ${row.item.unit || "units"}/crew-hr` : ""}`
            : row.labor?.laborNote || "",
          Subtotal: fmtNum(row.subtotal),
          "Source Sheet": getSourceSheetLabel(row.item, sheets),
          "QA Flags": (qaFlagMap.get(getEstimateItemKey(row.item)) || []).join(
            " | "
          ),
          "CSI Division": div,
          Category: row.item.category || "",
          Notes: row.item.notes || row.item.sourceNotes || "",
        }));
        rows.push({
          Description: "DIVISION TOTAL",
          Quantity: "",
          Unit: "",
          "Scope Status": "",
          "Estimator Reviewed": "",
          "Confidence %": "",
          "Material Unit": "",
          "Material Total": fmtNum(data.materialTotal),
          "Labor Total": fmtNum(data.laborTotal),
          "Labor Basis": "",
          "Crew / Productivity": "",
          Subtotal: fmtNum(data.materialTotal + data.laborTotal),
          "Source Sheet": "",
          "QA Flags": "",
          "CSI Division": div,
          Category: "",
          Notes: "",
        });
        writeWorkbookSheet(wb, `Div ${div} ${divName}`, rows, [
          { wch: 46 },
          { wch: 12 },
          { wch: 10 },
          { wch: 16 },
          { wch: 18 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
          { wch: 22 },
          { wch: 34 },
          { wch: 14 },
          { wch: 26 },
          { wch: 42 },
          { wch: 12 },
          { wch: 20 },
          { wch: 36 },
        ]);
      }

      if (qaAnomalies.length > 0) {
        writeWorkbookSheet(
          wb,
          "ConstructLine QA",
          qaAnomalies.map(anomaly => ({
            Severity: String(anomaly.severity || "review").toUpperCase(),
            Category: anomaly.category || "",
            Finding: anomaly.title || "",
            "Rows Shown": anomaly.items?.length || 0,
            "Value At Stake": anomaly.amount
              ? fmtNum(Number(anomaly.amount))
              : "",
            "Estimator Action":
              anomaly.severity === "blocker"
                ? "Resolve before packaging"
                : anomaly.severity === "risk"
                  ? "Review before sending"
                  : anomaly.severity === "reference"
                    ? "Trace source if needed"
                    : "Estimator review recommended",
            Description: anomaly.description || "",
          })),
          [
            { wch: 14 },
            { wch: 18 },
            { wch: 34 },
            { wch: 12 },
            { wch: 18 },
            { wch: 28 },
            { wch: 72 },
          ]
        );
      }

      if ((calculations.allowancesTotal || 0) > 0) {
        writeWorkbookSheet(
          wb,
          "Allowances",
          [
            {
              Description: "Allowances Total",
              Amount: fmtNum(calculations.allowancesTotal || 0),
            },
          ],
          [{ wch: 42 }, { wch: 16 }]
        );
      }

      writeWorkbookSheet(
        wb,
        "Markups",
        [
          {
            Line: "Direct Cost",
            Rate: "",
            Amount: fmtNum(calculations.directCost),
          },
          {
            Line: "General Conditions",
            Rate: `${pctDisplay(markups.generalConditionsPct)}%`,
            Amount: fmtNum(calculations.generalConditions),
          },
          {
            Line: "Overhead",
            Rate: `${pctDisplay(markups.overheadPct)}%`,
            Amount: fmtNum(calculations.overhead),
          },
          {
            Line: "Profit",
            Rate: `${pctDisplay(markups.profitPct)}%`,
            Amount: fmtNum(calculations.profit),
          },
          {
            Line: "Contingency",
            Rate: `${pctDisplay(markups.contingencyPct)}%`,
            Amount: fmtNum(calculations.contingency),
          },
          {
            Line: "Bond",
            Rate: `${pctDisplay(markups.bondPct)}%`,
            Amount: fmtNum(calculations.bond),
          },
          {
            Line: "Sales Tax",
            Rate: `${pctDisplay(markups.taxPct)}%`,
            Amount: fmtNum(calculations.tax),
          },
          {
            Line: "Grand Total",
            Rate: "",
            Amount: fmtNum(calculations.grandTotal),
          },
        ],
        [{ wch: 28 }, { wch: 14 }, { wch: 16 }]
      );

      XLSX.writeFile(
        wb,
        `full-estimate-${projectName.replace(/\s+/g, "-").toLowerCase()}.xlsx`
      );
      toast.success("Full estimate workbook downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate full estimate workbook");
    } finally {
      setGenerating(null);
    }
  };

  const generateFullEstimatePdf = () => {
    setGenerating("full-pdf");
    try {
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      doc.setFillColor(7, 9, 11);
      doc.rect(0, 0, pageW, 42, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("FULL ESTIMATE DETAIL", 14, 18);
      addLogo(doc, pageW);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(projectName, 14, 28);
      doc.text(
        `Grand Total: ${fmtCurrency(calculations.grandTotal, currency)}`,
        pageW - 14,
        28,
        { align: "right" }
      );

      let y = 52;
      autoTable(doc, {
        startY: y,
        head: [["Division", "Rows", "Material", "Labor", "Subtotal"]],
        body: calculations.divisionOrder.map(div => {
          const data = calculations.byDivision[div];
          const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
          return [
            `Div ${div} — ${divName}`,
            String(data.items.length),
            fmtCurrency(data.materialTotal, currency),
            fmtCurrency(data.laborTotal, currency),
            fmtCurrency(data.materialTotal + data.laborTotal, currency),
          ];
        }),
        foot: [
          [
            "DIRECT COST",
            "",
            fmtCurrency(calculations.totalMaterial, currency),
            fmtCurrency(calculations.totalLabor, currency),
            fmtCurrency(calculations.directCost, currency),
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [23, 23, 20],
          textColor: [255, 255, 255],
          fontSize: 8,
        },
        footStyles: {
          fillColor: [23, 23, 20],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
        },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          1: { halign: "right" },
          2: { halign: "right" },
          3: { halign: "right" },
          4: { halign: "right", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      for (const div of calculations.divisionOrder) {
        const data = calculations.byDivision[div];
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        if (y > pageH - 70) {
          doc.addPage();
          y = 18;
        }
        const rows = buildItemRows(data.items).map(row => [
          row.item.description || "Estimate item",
          String(row.qty || ""),
          row.item.unit || "",
          fmtCurrency(row.materialTotal, currency),
          fmtCurrency(row.laborTotal, currency),
          fmtCurrency(row.subtotal, currency),
        ]);
        autoTable(doc, {
          startY: y,
          head: [
            [
              `Div ${div} — ${divName}`,
              "Qty",
              "Unit",
              "Material",
              "Labor",
              "Subtotal",
            ],
          ],
          body: rows,
          theme: "grid",
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontSize: 7,
            fontStyle: "bold",
          },
          bodyStyles: { fontSize: 7 },
          columnStyles: {
            0: { cellWidth: 72 },
            1: { halign: "right", cellWidth: 18 },
            2: { cellWidth: 16 },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right", fontStyle: "bold" },
          },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      doc.addPage();
      autoTable(doc, {
        startY: 18,
        head: [["Cost Waterfall", "Amount"]],
        body: [
          ["Direct Cost", fmtCurrency(calculations.directCost, currency)],
          [
            `General Conditions (${pctDisplay(markups.generalConditionsPct)}%)`,
            fmtCurrency(calculations.generalConditions, currency),
          ],
          [
            `Overhead (${pctDisplay(markups.overheadPct)}%)`,
            fmtCurrency(calculations.overhead, currency),
          ],
          [
            `Profit (${pctDisplay(markups.profitPct)}%)`,
            fmtCurrency(calculations.profit, currency),
          ],
          [
            `Contingency (${pctDisplay(markups.contingencyPct)}%)`,
            fmtCurrency(calculations.contingency, currency),
          ],
          [
            `Bond (${pctDisplay(markups.bondPct)}%)`,
            fmtCurrency(calculations.bond, currency),
          ],
          [
            `Sales Tax (${pctDisplay(markups.taxPct)}%)`,
            fmtCurrency(calculations.tax, currency),
          ],
        ],
        foot: [["GRAND TOTAL", fmtCurrency(calculations.grandTotal, currency)]],
        theme: "grid",
        headStyles: { fillColor: [23, 23, 20], textColor: [255, 255, 255] },
        footStyles: {
          fillColor: [217, 119, 6],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Generated by ConstructLine — Powered by ALP", 14, pageH - 10);
        doc.text(`Page ${i} of ${totalPages}`, pageW - 14, pageH - 10, {
          align: "right",
        });
      }

      doc.save(
        `full-estimate-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`
      );
      toast.success("Full estimate PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate full estimate PDF");
    } finally {
      setGenerating(null);
    }
  };

  return (
    <section
      id="submit-package"
      className="overflow-hidden rounded-xl border border-[#cdbb98] bg-[#f8f5ef] text-[#171714] shadow-[0_28px_90px_rgba(40,34,22,0.16)]"
    >
      <div className="border-b border-[#d8c9ad] bg-[#07090b] px-5 py-6 text-white lg:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f1b51d]">
              Bid Submission Center
            </p>
            <h3 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-normal lg:text-4xl">
              Build the owner-facing package before it leaves the office.
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/62">
              Choose the proposal format, tune the language, attach company
              assets, decide whether terms belong in this packet, and export the
              documents your team needs.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            {[
              [
                "Contract Total",
                fmtCurrency(calculations.grandTotal, currency),
              ],
              ["Direct Cost", fmtCurrency(calculations.directCost, currency)],
              [
                "Template",
                proposalLayout === "scope"
                  ? "Scope Detail"
                  : proposalLayout === "formal"
                    ? "Formal"
                    : "Executive",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.06] p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
                  {label}
                </p>
                <p className="mt-2 truncate font-mono text-lg font-semibold text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 lg:p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="space-y-5">
              <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 text-[#8a6510]" />
                      <h4 className="font-semibold text-[#171714]">
                        Proposal Layout
                      </h4>
                    </div>
                    <p className="mt-1 text-sm text-[#716855]">
                      Select the presentation style before generating the
                      client-facing proposal.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  {[
                    [
                      "executive",
                      "Executive",
                      "Cover-first package with clean price emphasis.",
                    ],
                    [
                      "formal",
                      "Formal",
                      "Contract-style proposal for institutional work.",
                    ],
                    [
                      "scope",
                      "Scope Detail",
                      "Division-led package for complex trade review.",
                    ],
                  ].map(([value, label, detail]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setProposalLayout(
                          value as "executive" | "formal" | "scope"
                        )
                      }
                      className={`rounded-lg border p-4 text-left transition-all ${
                        proposalLayout === value
                          ? "border-[#d7b44d] bg-[#fff7da] shadow-[0_16px_34px_rgba(138,101,16,0.12)]"
                          : "border-[#eadcc4] bg-[#fffdf8] hover:border-[#d7b44d]"
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#171714]">
                        {label}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-[#716855]">
                        {detail}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.08)]">
                <div className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#8a6510]" />
                  <h4 className="font-semibold text-[#171714]">
                    Recipient Details
                  </h4>
                </div>
                <p className="mt-1 text-sm text-[#716855]">
                  Keep these optional. They appear on the proposal when filled.
                </p>
                <div className="mt-4 grid gap-3">
                  <Input
                    placeholder="Client name"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
                  />
                  <Input
                    placeholder="Client company"
                    value={clientCompany}
                    onChange={e => setClientCompany(e.target.value)}
                    className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
                  />
                  <Input
                    placeholder="Project address"
                    value={projectAddress}
                    onChange={e => setProjectAddress(e.target.value)}
                    className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-[#8a6510]" />
                      <h4 className="font-semibold text-[#171714]">
                        Company Letterhead
                      </h4>
                    </div>
                    <p className="mt-1 text-sm text-[#716855]">
                      Add the firm details you want printed on proposal,
                      summary, and SOV outputs.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowBranding(!showBranding)}
                      className="h-9 border-[#d7c7aa] bg-white text-[#5d5546] hover:!bg-[#faf8f2]"
                    >
                      <Settings2 className="mr-2 h-3.5 w-3.5" />
                      {showBranding ? "Hide" : "Show"}
                    </Button>
                    <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-[#d7c7aa] bg-[#fffdf8] px-3 text-xs font-semibold text-[#5d5546] hover:bg-[#fff7da]">
                      <Upload className="mr-2 h-3.5 w-3.5" />
                      {logoDataUrl ? "Logo Attached" : "Upload Logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={e => handleLogoUpload(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
                {showBranding && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <Input
                      placeholder="Company name"
                      value={companyName}
                      onChange={e => setCompanyName(e.target.value)}
                      className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
                    />
                    <Input
                      placeholder="Company address"
                      value={companyAddress}
                      onChange={e => setCompanyAddress(e.target.value)}
                      className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
                    />
                    <Input
                      placeholder="Phone number"
                      value={companyPhone}
                      onChange={e => setCompanyPhone(e.target.value)}
                      className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
                    />
                    <Input
                      placeholder="Email address"
                      value={companyEmail}
                      onChange={e => setCompanyEmail(e.target.value)}
                      className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
                    />
                    <Input
                      placeholder="License number (optional)"
                      value={companyLicense}
                      onChange={e => setCompanyLicense(e.target.value)}
                      className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50 md:col-span-2"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.08)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#8a6510]" />
                      <h4 className="font-semibold text-[#171714]">
                        Proposal Verbiage
                      </h4>
                    </div>
                    <p className="mt-1 text-sm text-[#716855]">
                      Write the language your client actually sees. Leave any
                      section blank to omit it from the proposal.
                    </p>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#d7c7aa] bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-[#5d5546]">
                    <input
                      type="checkbox"
                      checked={includeTerms}
                      onChange={e => setIncludeTerms(e.target.checked)}
                      className="h-4 w-4 accent-[#171714]"
                    />
                    Include terms page
                  </label>
                </div>
                <div className="mt-4 grid gap-4">
                  <Textarea
                    value={proposalIntro}
                    onChange={e => setProposalIntro(e.target.value)}
                    className="min-h-32 border-[#d7c7aa] bg-white text-sm text-[#171714] placeholder:text-[#716855]/50"
                    placeholder="Proposal letter / executive summary"
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <Textarea
                      value={proposalInclusions}
                      onChange={e => setProposalInclusions(e.target.value)}
                      className="min-h-36 border-[#d7c7aa] bg-white text-sm text-[#171714] placeholder:text-[#716855]/50"
                      placeholder="Inclusions"
                    />
                    <Textarea
                      value={proposalExclusions}
                      onChange={e => setProposalExclusions(e.target.value)}
                      className="min-h-36 border-[#d7c7aa] bg-white text-sm text-[#171714] placeholder:text-[#716855]/50"
                      placeholder="Exclusions"
                    />
                  </div>
                  {includeTerms && (
                    <Textarea
                      value={proposalTerms}
                      onChange={e => setProposalTerms(e.target.value)}
                      className="min-h-40 border-[#d7c7aa] bg-white text-sm text-[#171714] placeholder:text-[#716855]/50"
                      placeholder="Terms and conditions"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.08)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#716855]">
              SOV setup
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-5">
              <Input
                placeholder="Owner name"
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
              />
              <Input
                placeholder="Architect name"
                value={architectName}
                onChange={e => setArchitectName(e.target.value)}
                className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
              />
              <Input
                placeholder="Project No."
                value={projectNo}
                onChange={e => setProjectNo(e.target.value)}
                className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
              />
              <Input
                placeholder="Retainage %"
                value={retainagePct}
                onChange={e => setRetainagePct(e.target.value)}
                className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
              />
              <Input
                placeholder="Contract date"
                value={contractDate}
                onChange={e => setContractDate(e.target.value)}
                className="h-10 bg-white border-[#d7c7aa] text-[#171714] placeholder:text-[#716855]/50"
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-[#c9b27c] bg-[#07090b] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.20)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f1b51d]">
              Package Outputs
            </p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Generate the client-facing proposal, internal backups, and full
              estimate detail from the same accepted bid math.
            </p>
          </div>
          {qaReviewCount > 0 && (
            <div
              className={`rounded-xl border p-4 shadow-[0_14px_36px_rgba(41,37,28,0.07)] ${
                qaBlockerCount > 0
                  ? "border-orange-300 bg-orange-50"
                  : "border-[#d7b44d] bg-[#fff7da]"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${
                  qaBlockerCount > 0 ? "text-orange-800" : "text-[#8a6510]"
                }`}
              >
                Estimator QA
              </p>
              <p className="mt-2 text-sm font-semibold text-[#171714]">
                {qaBlockerCount > 0
                  ? `${qaBlockerCount} blocker${qaBlockerCount !== 1 ? "s" : ""} before packaging`
                  : `${qaReviewCount} review item${qaReviewCount !== 1 ? "s" : ""} in this estimate`}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#716855]">
                The full workbook includes a ConstructLine QA tab and per-row
                QA flags.
              </p>
            </div>
          )}
          {[
            {
              key: "proposal",
              title: "Proposal",
              detail: includeTerms
                ? "Client-ready cover, scope, pricing, and included terms."
                : "Client-ready cover, scope, and pricing without terms attached.",
              icon: ClipboardList,
              action: generateProposal,
              label: "Generate Proposal",
            },
            {
              key: "bid",
              title: "Bid Summary",
              detail:
                "Internal/external estimate summary with division totals.",
              icon: FileText,
              action: generateBidSummary,
              label: "Generate Summary",
            },
            {
              key: "full-excel",
              title: "Full Estimate Workbook",
              detail:
                "Summary, QA review, markups, allowances, and one detailed tab per CSI division.",
              icon: TableProperties,
              action: generateFullEstimateExcel,
              label: "Download Full Excel",
            },
            {
              key: "full-pdf",
              title: "Full Estimate PDF",
              detail:
                "Printable estimate detail with every accepted row and the cost waterfall.",
              icon: FileText,
              action: generateFullEstimatePdf,
              label: "Download Full PDF",
            },
            {
              key: "sov",
              title: "AIA SOV Workbook",
              detail: "G702/G703 workbook with scheduled values.",
              icon: FileSpreadsheet,
              action: generateSOVExcel,
              label: "Generate SOV",
            },
          ].map(output => {
            const OutputIcon = output.icon;
            return (
              <div
                key={output.key}
                className="rounded-xl border border-[#d7c7aa] bg-white p-4 shadow-[0_14px_36px_rgba(41,37,28,0.07)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800">
                    <OutputIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[#171714]">
                        {output.title}
                      </p>
                      <BadgeCheck className="h-3.5 w-3.5 text-emerald-700" />
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#716855]">
                      {output.detail}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={output.action}
                  disabled={generating === output.key}
                  className="mt-4 h-10 w-full bg-[#171714] text-white hover:bg-[#29251c]"
                >
                  {generating === output.key ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-3.5 w-3.5" />
                  )}
                  {output.label}
                </Button>
              </div>
            );
          })}

          <div className="rounded-xl border border-[#d7c7aa] bg-[#fffdf8] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#716855]">
              Proposal terms
            </p>
            <p className="mt-2 text-xs leading-5 text-[#716855]">
              Terms are off by default so contractors can attach attorney
              language separately or leave the proposal clean.
            </p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#171714]">
              <input
                type="checkbox"
                checked={includeTerms}
                onChange={e => setIncludeTerms(e.target.checked)}
                className="h-4 w-4 accent-[#171714]"
              />
              Include terms in proposal PDF
            </label>
          </div>
        </aside>
      </div>
    </section>
  );
}
