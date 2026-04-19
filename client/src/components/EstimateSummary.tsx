/**
 * EstimateSummary — Full project estimate with material costs, labor costs,
 * and configurable markups (OH&P, contingency, bond, taxes).
 * Renders as a tab inside TakeoffDetail.
 */
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  Calculator,
  Save,
  Download,
  ChevronDown,
  ChevronRight,
  DollarSign,
  HardHat,
  Percent,
  TrendingUp,
  FileSpreadsheet,
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

function formatCurrency(cents: number, currencyCode: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function pctToDisplay(basisPts: number): string {
  return (basisPts / 100).toFixed(2);
}

function displayToPct(display: string): number {
  return Math.round(parseFloat(display || "0") * 100);
}

interface EstimateSummaryProps {
  projectId: number;
  items: any[];
  currency: string;
  costRegion?: string | null;
}

export default function EstimateSummary({ projectId, items, currency, costRegion }: EstimateSummaryProps) {
  const { data: markupData, isLoading: markupsLoading } = trpc.estimate.getMarkups.useQuery({ projectId });
  const saveMutation = trpc.estimate.saveMarkups.useMutation({
    onSuccess: () => toast.success("Markup configuration saved"),
    onError: (err: any) => toast.error(err.message),
  });

  // Markup state (basis points: 1000 = 10.00%)
  const [overheadPct, setOverheadPct] = useState(1000);
  const [profitPct, setProfitPct] = useState(1000);
  const [contingencyPct, setContingencyPct] = useState(500);
  const [bondPct, setBondPct] = useState(150);
  const [taxPct, setTaxPct] = useState(0);
  const [generalConditionsPct, setGeneralConditionsPct] = useState(0);
  const [collapsedDivisions, setCollapsedDivisions] = useState<Set<string>>(new Set());

  // Load saved markups
  useEffect(() => {
    if (markupData) {
      setOverheadPct(markupData.overheadPct);
      setProfitPct(markupData.profitPct);
      setContingencyPct(markupData.contingencyPct);
      setBondPct(markupData.bondPct);
      setTaxPct(markupData.taxPct);
      setGeneralConditionsPct(markupData.generalConditionsPct);
    }
  }, [markupData]);

  // Compute totals
  const calculations = useMemo(() => {
    if (!items || items.length === 0) return null;

    // Group by division
    const byDivision: Record<string, { items: any[]; materialTotal: number; laborTotal: number }> = {};
    let totalMaterial = 0;
    let totalLabor = 0;

    for (const item of items) {
      const div = item.csiDivision || "00";
      if (!byDivision[div]) byDivision[div] = { items: [], materialTotal: 0, laborTotal: 0 };
      byDivision[div].items.push(item);

      const qty = parseFloat(item.quantity) || 0;
      const unitCost = parseFloat(item.unitCost) || 0; // in cents
      const itemMaterial = qty * unitCost;
      byDivision[div].materialTotal += itemMaterial;
      totalMaterial += itemMaterial;

      // Labor estimate: use laborCost if available, otherwise estimate as 40% of material
      const laborCost = item.laborCost ? parseFloat(item.laborCost) : 0;
      const itemLabor = laborCost > 0 ? qty * laborCost : 0;
      byDivision[div].laborTotal += itemLabor;
      totalLabor += itemLabor;
    }

    const directCost = totalMaterial + totalLabor;
    const generalConditions = Math.round(directCost * generalConditionsPct / 10000);
    const subtotalWithGC = directCost + generalConditions;
    const overhead = Math.round(subtotalWithGC * overheadPct / 10000);
    const profit = Math.round(subtotalWithGC * profitPct / 10000);
    const subtotalWithOHP = subtotalWithGC + overhead + profit;
    const contingency = Math.round(subtotalWithOHP * contingencyPct / 10000);
    const subtotalWithContingency = subtotalWithOHP + contingency;
    const bond = Math.round(subtotalWithContingency * bondPct / 10000);
    const tax = Math.round(totalMaterial * taxPct / 10000); // tax on materials only
    const grandTotal = subtotalWithContingency + bond + tax;

    return {
      byDivision,
      totalMaterial,
      totalLabor,
      directCost,
      generalConditions,
      overhead,
      profit,
      contingency,
      bond,
      tax,
      grandTotal,
      divisionOrder: Object.keys(byDivision).sort(),
    };
  }, [items, overheadPct, profitPct, contingencyPct, bondPct, taxPct, generalConditionsPct]);

  const handleSave = () => {
    saveMutation.mutate({
      projectId,
      overheadPct,
      profitPct,
      contingencyPct,
      bondPct,
      taxPct,
      generalConditionsPct,
    });
  };

  const handleExportEstimate = () => {
    if (!calculations) return;
    const rows: any[] = [];

    // Division breakdown
    for (const div of calculations.divisionOrder) {
      const data = calculations.byDivision[div];
      const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
      rows.push({
        "CSI Division": `Div ${div} — ${divName}`,
        "Material Cost": (data.materialTotal / 100).toFixed(2),
        "Labor Cost": (data.laborTotal / 100).toFixed(2),
        "Subtotal": ((data.materialTotal + data.laborTotal) / 100).toFixed(2),
      });
    }

    // Totals
    rows.push({});
    rows.push({ "CSI Division": "DIRECT COSTS", "Material Cost": (calculations.totalMaterial / 100).toFixed(2), "Labor Cost": (calculations.totalLabor / 100).toFixed(2), "Subtotal": (calculations.directCost / 100).toFixed(2) });
    rows.push({ "CSI Division": `General Conditions (${pctToDisplay(generalConditionsPct)}%)`, "Subtotal": (calculations.generalConditions / 100).toFixed(2) });
    rows.push({ "CSI Division": `Overhead (${pctToDisplay(overheadPct)}%)`, "Subtotal": (calculations.overhead / 100).toFixed(2) });
    rows.push({ "CSI Division": `Profit (${pctToDisplay(profitPct)}%)`, "Subtotal": (calculations.profit / 100).toFixed(2) });
    rows.push({ "CSI Division": `Contingency (${pctToDisplay(contingencyPct)}%)`, "Subtotal": (calculations.contingency / 100).toFixed(2) });
    rows.push({ "CSI Division": `Bond (${pctToDisplay(bondPct)}%)`, "Subtotal": (calculations.bond / 100).toFixed(2) });
    rows.push({ "CSI Division": `Sales Tax on Materials (${pctToDisplay(taxPct)}%)`, "Subtotal": (calculations.tax / 100).toFixed(2) });
    rows.push({});
    rows.push({ "CSI Division": "GRAND TOTAL", "Subtotal": (calculations.grandTotal / 100).toFixed(2) });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estimate Summary");
    XLSX.writeFile(wb, `estimate-summary-project-${projectId}.xlsx`);
    toast.success("Estimate exported to Excel");
  };

  const toggleDivision = (div: string) => {
    setCollapsedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(div)) next.delete(div); else next.add(div);
      return next;
    });
  };

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Calculator className="w-12 h-12 text-cream-muted/30 mb-4" />
        <h3 className="text-cream font-semibold text-lg mb-2">No Takeoff Items Yet</h3>
        <p className="text-cream-muted text-sm max-w-md">
          Upload drawings and run a takeoff first. Once you have quantity items with costs,
          the estimate summary will calculate material + labor + markups automatically.
        </p>
      </div>
    );
  }

  if (markupsLoading || !calculations) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-cream font-semibold text-lg flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            Estimate Summary
          </h2>
          <p className="text-cream-muted text-xs mt-1">
            Material costs from takeoff + labor + configurable markups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportEstimate}
            className="border-white/20 text-cream hover:bg-white/5 gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5" />Export
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5">
            <Save className="w-3.5 h-3.5" />Save Markups
          </Button>
        </div>
      </div>

      {/* Two-column layout: Division breakdown + Markup config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Division Cost Breakdown (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-cream font-medium text-sm flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Direct Cost Breakdown by Division
          </h3>

          {/* Division table */}
          <div className="border border-white/10 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-medium/70 border-b border-white/10">
                  <th className="text-left text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider">Division</th>
                  <th className="text-right text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider w-32">Material</th>
                  <th className="text-right text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider w-32">Labor</th>
                  <th className="text-right text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider w-32">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {calculations.divisionOrder.map((div) => {
                  const data = calculations.byDivision[div];
                  const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
                  const divTotal = data.materialTotal + data.laborTotal;
                  const isCollapsed = collapsedDivisions.has(div);

                  return (
                    <tr key={div}
                      className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => toggleDivision(div)}
                    >
                      <td className="px-4 py-2.5 text-cream">
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-cream-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-cream-muted" />}
                          <span className="font-mono text-amber-400/80 text-xs">{div}</span>
                          <span>{divName}</span>
                          <Badge className="bg-white/5 text-cream-muted border-white/10 text-[10px] ml-1">{data.items.length}</Badge>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-cream font-mono text-xs">{formatCurrency(data.materialTotal, currency)}</td>
                      <td className="px-4 py-2.5 text-right text-cream font-mono text-xs">{data.laborTotal > 0 ? formatCurrency(data.laborTotal, currency) : <span className="text-cream-muted/40">—</span>}</td>
                      <td className="px-4 py-2.5 text-right text-cream font-mono text-xs font-medium">{formatCurrency(divTotal, currency)}</td>
                    </tr>
                  );
                })}
                {/* Direct cost total row */}
                <tr className="bg-navy-medium/50 border-t border-white/15">
                  <td className="px-4 py-3 text-cream font-semibold">Direct Costs Total</td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono text-sm font-semibold">{formatCurrency(calculations.totalMaterial, currency)}</td>
                  <td className="px-4 py-3 text-right text-blue-400 font-mono text-sm font-semibold">{calculations.totalLabor > 0 ? formatCurrency(calculations.totalLabor, currency) : "—"}</td>
                  <td className="px-4 py-3 text-right text-cream font-mono text-sm font-bold">{formatCurrency(calculations.directCost, currency)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Markup Configuration (1 col) */}
        <div className="space-y-4">
          <h3 className="text-cream font-medium text-sm flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-amber-400" />
            Markup Configuration
          </h3>

          <div className="bg-navy-medium/30 border border-white/10 rounded-lg p-4 space-y-3">
            <MarkupInput label="General Conditions" value={generalConditionsPct} onChange={setGeneralConditionsPct} hint="Site overhead, supervision, temp facilities" />
            <MarkupInput label="Overhead" value={overheadPct} onChange={setOverheadPct} hint="Office overhead, insurance, admin" />
            <MarkupInput label="Profit" value={profitPct} onChange={setProfitPct} hint="Contractor profit margin" />
            <MarkupInput label="Contingency" value={contingencyPct} onChange={setContingencyPct} hint="Risk allowance for unknowns" />
            <MarkupInput label="Bond" value={bondPct} onChange={setBondPct} hint="Performance & payment bond cost" />
            <MarkupInput label="Sales Tax (Materials)" value={taxPct} onChange={setTaxPct} hint="State/local tax on materials only" />
          </div>

          {/* Estimate Waterfall */}
          <div className="bg-navy-medium/30 border border-white/10 rounded-lg p-4 space-y-2">
            <h4 className="text-cream font-medium text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Estimate Waterfall
            </h4>
            <WaterfallRow label="Direct Costs" value={calculations.directCost} currency={currency} bold />
            {generalConditionsPct > 0 && <WaterfallRow label={`+ General Conditions (${pctToDisplay(generalConditionsPct)}%)`} value={calculations.generalConditions} currency={currency} />}
            {overheadPct > 0 && <WaterfallRow label={`+ Overhead (${pctToDisplay(overheadPct)}%)`} value={calculations.overhead} currency={currency} />}
            {profitPct > 0 && <WaterfallRow label={`+ Profit (${pctToDisplay(profitPct)}%)`} value={calculations.profit} currency={currency} />}
            {contingencyPct > 0 && <WaterfallRow label={`+ Contingency (${pctToDisplay(contingencyPct)}%)`} value={calculations.contingency} currency={currency} />}
            {bondPct > 0 && <WaterfallRow label={`+ Bond (${pctToDisplay(bondPct)}%)`} value={calculations.bond} currency={currency} />}
            {taxPct > 0 && <WaterfallRow label={`+ Sales Tax (${pctToDisplay(taxPct)}%)`} value={calculations.tax} currency={currency} />}
            <div className="border-t border-white/15 pt-2 mt-2">
              <WaterfallRow label="GRAND TOTAL" value={calculations.grandTotal} currency={currency} bold accent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MarkupInput({ label, value, onChange, hint }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint: string;
}) {
  const [display, setDisplay] = useState(pctToDisplay(value));

  useEffect(() => {
    setDisplay(pctToDisplay(value));
  }, [value]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-cream text-xs font-medium">{label}</p>
        <p className="text-cream-muted text-[10px] truncate">{hint}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={display}
          onChange={(e) => {
            setDisplay(e.target.value);
            onChange(displayToPct(e.target.value));
          }}
          className="w-20 h-7 text-xs text-right bg-navy-deep/80 border-white/10 text-cream px-2"
        />
        <span className="text-cream-muted text-xs">%</span>
      </div>
    </div>
  );
}

function WaterfallRow({ label, value, currency, bold, accent }: {
  label: string;
  value: number;
  currency: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between py-1 ${bold ? "font-semibold" : ""}`}>
      <span className={`text-xs ${accent ? "text-amber-400" : bold ? "text-cream" : "text-cream-muted"}`}>{label}</span>
      <span className={`font-mono text-xs ${accent ? "text-amber-400 text-sm" : bold ? "text-cream" : "text-cream-muted"}`}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}
