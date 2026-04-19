/**
 * EstimateSummary — Full project estimate with material costs, labor costs
 * (computed from crews + activity productivity), and configurable markups.
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
  Calculator, Save, Download, ChevronDown, ChevronRight,
  DollarSign, HardHat, Percent, TrendingUp, FileSpreadsheet,
  Users, Info, Sparkles, Loader2,
} from "lucide-react";
import {
  TRADES, getBaseWage,
  DEFAULT_BURDENS, calculateBurdenedRate,
  type LaborType,
} from "../../../shared/tradeRates";
import { COST_REGION_GROUPS } from "../../../shared/costRegions";
import EstimateOutputs from "./EstimateOutputs";

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
    style: "currency", currency: currencyCode, minimumFractionDigits: 2,
  }).format(cents / 100);
}

function pctToDisplay(bps: number): string { return (bps / 100).toFixed(2); }
function displayToPct(str: string): number { return Math.round(parseFloat(str || "0") * 100); }

interface EstimateSummaryProps {
  projectId: number;
  projectName?: string;
  projectDescription?: string;
  items: any[];
  currency: string;
  costRegion?: string | null;
}

export default function EstimateSummary({ projectId, projectName, projectDescription, items, currency, costRegion }: EstimateSummaryProps) {
  // ─── Data fetching ───────────────────────────────────────────────────
  const { data: markupData, isLoading: markupsLoading } = trpc.estimate.getMarkups.useQuery({ projectId });
  const { data: crewsData } = trpc.tradeRates.getCrews.useQuery();
  const { data: activityData } = trpc.tradeRates.getActivityProductivity.useQuery();
  const { data: burdenData } = trpc.tradeRates.getBurdenConfigs.useQuery();
  const { data: userRatesData } = trpc.tradeRates.getTradeRates.useQuery();

  const utils = trpc.useUtils();

  const saveMutation = trpc.estimate.saveMarkups.useMutation({
    onSuccess: () => toast.success("Markup configuration saved"),
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Labor Inference Review Panel ──────────────────────────────────
  const [reviewAssignments, setReviewAssignments] = useState<any[] | null>(null);
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const confirmLaborMutation = trpc.estimate.confirmLaborAssignments.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      utils.tradeRates.getActivityProductivity.invalidate();
      setShowReviewPanel(false);
      setReviewAssignments(null);
    },
    onError: (err: any) => toast.error("Failed to save assignments: " + err.message),
  });

  const inferLaborMutation = trpc.estimate.inferLabor.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        // Show review panel instead of auto-saving
        setReviewAssignments(result.assignments);
        setShowReviewPanel(true);
        toast.success(`ConstructLine analyzed ${result.assignments.length} items — review assignments below before confirming.`);
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) => toast.error("ConstructLine labor analysis failed: " + err.message),
  });

  const handleCalculateLabor = () => {
    if (!crewsData || crewsData.length === 0) {
      toast.error("No crews defined yet. Go to Trade Rate Library → Crew Builder to set up your crews first.");
      return;
    }
    inferLaborMutation.mutate({
      projectId,
      items: items.map(i => ({
        description: i.description || "",
        unit: i.unit || "",
        quantity: parseFloat(i.quantity) || 0,
        csiDivision: i.csiDivision || "00",
      })),
    });
  };

  const handleConfirmAssignments = () => {
    if (!reviewAssignments) return;
    confirmLaborMutation.mutate({
      projectId,
      assignments: reviewAssignments
        .filter(a => a.crewId !== null && !a._excluded)
        .map(a => ({
          description: a.description,
          unit: a.unit,
          csiDivision: a.csiDivision,
          crewId: a.crewId,
          productivityPerCrewHr: a.productivityPerCrewHr,
          notes: a.reasoning,
        })),
    });
  };

  // ─── Markup state ────────────────────────────────────────────────────
  const [overheadPct, setOverheadPct] = useState(1000);
  const [profitPct, setProfitPct] = useState(1000);
  const [contingencyPct, setContingencyPct] = useState(500);
  const [bondPct, setBondPct] = useState(200);
  const [taxPct, setTaxPct] = useState(800);
  const [generalConditionsPct, setGeneralConditionsPct] = useState(1000);
  const [collapsedDivisions, setCollapsedDivisions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (markupData) {
      setOverheadPct(markupData.overheadPct ?? 1000);
      setProfitPct(markupData.profitPct ?? 1000);
      setContingencyPct(markupData.contingencyPct ?? 500);
      setBondPct(markupData.bondPct ?? 200);
      setTaxPct(markupData.taxPct ?? 800);
      setGeneralConditionsPct(markupData.generalConditionsPct ?? 1000);
    }
  }, [markupData]);

  // ─── Regional multiplier ────────────────────────────────────────────
  const regionMultiplier = useMemo(() => {
    if (!costRegion) return 1.0;
    for (const group of COST_REGION_GROUPS) {
      for (const metro of group.metros) {
        if (metro.code === costRegion) return metro.multiplier / 10000;
      }
    }
    return 1.0;
  }, [costRegion]);

  // ─── Build crew cost map ────────────────────────────────────────────
  const crewCostMap = useMemo(() => {
    const map = new Map<number, { name: string; costPerHr: number }>();
    if (!crewsData) return map;

    // Build user rate overrides map
    const userRateMap = new Map<string, number>();
    if (userRatesData) {
      for (const r of userRatesData) {
        userRateMap.set(`${r.tradeName}|${r.classification}`, r.baseWageCents);
      }
    }

    for (const crew of crewsData) {
      const lt = (crew.laborType || "com_open") as LaborType;
      // Get burden for this labor type
      const burdenConfig = burdenData?.find((b: any) => b.laborType === lt);
      const burden = burdenConfig ? {
        ficaPct: burdenConfig.ficaPct, futaPct: burdenConfig.futaPct, sutaPct: burdenConfig.sutaPct,
        workersCompPct: burdenConfig.workersCompPct, generalLiabilityPct: burdenConfig.generalLiabilityPct,
        healthInsuranceCentsPerHr: burdenConfig.healthInsuranceCentsPerHr,
        pensionPct: burdenConfig.pensionPct, vacationPct: burdenConfig.vacationPct,
        trainingPct: burdenConfig.trainingPct,
        unionFringeCentsPerHr: burdenConfig.unionFringeCentsPerHr, otherCentsPerHr: burdenConfig.otherCentsPerHr,
      } : DEFAULT_BURDENS[lt];

      let totalPerHr = 0;
      const members = JSON.parse(crew.crewMembers || "[]");
      for (const m of members) {
        const userRate = userRateMap.get(`${m.tradeName}|${m.classification}`);
        const trade = TRADES.find(t => t.tradeName === m.tradeName);
        const baseWage = userRate ?? (getBaseWage(m.tradeName, m.classification, lt) ?? 0);
        const burdened = Math.round(calculateBurdenedRate(baseWage, burden) * regionMultiplier);
        totalPerHr += burdened * (m.count || 1);
      }
      map.set(crew.id, { name: crew.crewName, costPerHr: totalPerHr });
    }
    return map;
  }, [crewsData, burdenData, userRatesData, regionMultiplier]);

  // ─── Build activity productivity lookup ─────────────────────────────
  const activityMap = useMemo(() => {
    const map = new Map<string, { crewId: number | null; productivityPerCrewHr: number; source: string }>();
    if (!activityData) return map;
    for (const a of activityData) {
      // Key by description+unit (lowercase for fuzzy matching)
      const key = `${(a.description || "").toLowerCase()}|${(a.unit || "").toLowerCase()}`;
      map.set(key, {
        crewId: a.crewId,
        productivityPerCrewHr: parseFloat(a.productivityPerCrewHr) || 0,
        source: a.source || "rs_means",
      });
    }
    return map;
  }, [activityData]);

  // ─── Compute totals ─────────────────────────────────────────────────
  const calculations = useMemo(() => {
    if (!items || items.length === 0) return null;

    const byDivision: Record<string, { items: any[]; materialTotal: number; laborTotal: number }> = {};
    let totalMaterial = 0;
    let totalLabor = 0;
    let laborItemsMatched = 0;

    for (const item of items) {
      const div = item.csiDivision || "00";
      if (!byDivision[div]) byDivision[div] = { items: [], materialTotal: 0, laborTotal: 0 };
      byDivision[div].items.push(item);

      const qty = parseFloat(item.quantity) || 0;
      const unitCost = parseFloat(item.unitCost) || 0;
      const itemMaterial = qty * unitCost;
      byDivision[div].materialTotal += itemMaterial;
      totalMaterial += itemMaterial;

      // Labor: look up activity productivity for this item
      const descKey = `${(item.description || "").toLowerCase()}|${(item.unit || "").toLowerCase()}`;
      const activity = activityMap.get(descKey);
      let itemLabor = 0;

      if (activity && activity.crewId && activity.productivityPerCrewHr > 0) {
        const crewInfo = crewCostMap.get(activity.crewId);
        if (crewInfo) {
          // Labor = (qty / productivity_per_crew_hr) × crew_cost_per_hr
          const crewHours = qty / activity.productivityPerCrewHr;
          itemLabor = Math.round(crewHours * crewInfo.costPerHr);
          laborItemsMatched++;
        }
      }

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
    const tax = Math.round(totalMaterial * taxPct / 10000);
    const grandTotal = subtotalWithContingency + bond + tax;

    return {
      byDivision, totalMaterial, totalLabor, directCost,
      generalConditions, overhead, profit, contingency, bond, tax, grandTotal,
      divisionOrder: Object.keys(byDivision).sort(),
      laborItemsMatched,
      totalItems: items.length,
    };
  }, [items, overheadPct, profitPct, contingencyPct, bondPct, taxPct, generalConditionsPct, activityMap, crewCostMap]);

  const handleSave = () => {
    saveMutation.mutate({ projectId, overheadPct, profitPct, contingencyPct, bondPct, taxPct, generalConditionsPct });
  };

  const handleExportEstimate = () => {
    if (!calculations) return;
    const rows: any[] = [];
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
            Material costs from takeoff + labor from crews/productivity + configurable markups
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

      {/* Labor coverage info + Calculate Labor button */}
      {calculations.laborItemsMatched > 0 ? (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Users className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-emerald-200/80 text-xs flex-1">
            <strong className="text-emerald-300">Labor calculated</strong> for {calculations.laborItemsMatched} of {calculations.totalItems} items
            using your crew definitions and activity productivity factors.
            Items without matching productivity data show "—" in the labor column.
          </p>
          <Button
            variant="outline" size="sm"
            onClick={handleCalculateLabor}
            disabled={inferLaborMutation.isPending}
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 gap-1.5 shrink-0"
          >
            {inferLaborMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" />Re-calculate Labor</>
            )}
          </Button>
        </div>
      ) : (
        <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="text-blue-200/80 text-xs">
              <strong className="text-blue-300">Labor costs not yet configured.</strong> Use ConstructLine to automatically match
              your takeoff items to crews and estimate productivity rates, or manually set them in Trade Rate Library.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleCalculateLabor}
            disabled={inferLaborMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white gap-1.5 shrink-0"
          >
            {inferLaborMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing{items.length > 20 ? ` ${items.length} items` : ''}...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" />ConstructLine Labor Analysis</>
            )}
          </Button>
        </div>
      )}

      {/* ─── Labor Inference Review Panel ──────────────────────────────── */}
      {showReviewPanel && reviewAssignments && (
        <div className="border border-indigo-500/30 rounded-xl bg-indigo-500/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-cream">ConstructLine Labor Assignment Review</h3>
              <span className="text-xs text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                {reviewAssignments.filter(a => a.crewId !== null && !a._excluded).length} of {reviewAssignments.length} matched
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => { setShowReviewPanel(false); setReviewAssignments(null); }}
                className="border-white/10 text-cream-muted hover:text-cream text-xs"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAssignments}
                disabled={confirmLaborMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
              >
                {confirmLaborMutation.isPending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" />Saving...</>
                ) : (
                  <>Confirm & Apply {reviewAssignments.filter(a => a.crewId !== null && !a._excluded).length} Assignments</>
                )}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-navy-medium/60 border-b border-white/8">
                  <th className="text-left text-cream-muted font-medium px-3 py-2 w-8"></th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2">Item Description</th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2 w-16">Unit</th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2 w-40">Assigned Crew</th>
                  <th className="text-right text-cream-muted font-medium px-3 py-2 w-32">Output / Crew-Hour</th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2">ConstructLine Reasoning</th>
                </tr>
              </thead>
              <tbody>
                {reviewAssignments.map((a, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-white/5 transition-colors ${
                      a._excluded ? "opacity-40 bg-red-500/5" : a.crewId ? "hover:bg-white/3" : "bg-amber-500/5"
                    }`}
                  >
                    {/* Include / exclude toggle */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          setReviewAssignments(prev =>
                            prev ? prev.map((item, i) =>
                              i === idx ? { ...item, _excluded: !item._excluded } : item
                            ) : prev
                          );
                        }}
                        title={a._excluded ? "Click to include" : "Click to exclude"}
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          a._excluded
                            ? "border-red-400/40 bg-red-500/10 text-red-400"
                            : "border-emerald-400/40 bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {a._excluded ? "✕" : "✓"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-cream/80 max-w-xs">
                      <span className="line-clamp-2">{a.description}</span>
                    </td>
                    <td className="px-3 py-2 text-cream-muted">{a.unit}</td>
                    <td className="px-3 py-2">
                      {a.crewId ? (
                        <span className="text-indigo-300 font-medium">{a.crewName}</span>
                      ) : (
                        <span className="text-amber-400/70 italic">unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.1"
                        min="0.01"
                        value={a.productivityPerCrewHr}
                        onChange={e => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setReviewAssignments(prev =>
                              prev ? prev.map((item, i) =>
                                i === idx ? { ...item, productivityPerCrewHr: val } : item
                              ) : prev
                            );
                          }
                        }}
                        className="w-24 bg-navy-medium border border-white/10 rounded px-2 py-1 text-right text-cream focus:border-indigo-400/50 focus:outline-none text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-cream-muted/60 max-w-xs">
                      <span className="line-clamp-2 italic">{a.reasoning}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-indigo-500/20 flex items-center justify-between">
            <p className="text-xs text-cream-muted/60">
              Toggle ✓/✕ to include or exclude items. Edit productivity values inline. Click <strong className="text-cream-muted">Confirm & Apply</strong> to save.
            </p>
            <Button
              size="sm"
              onClick={handleConfirmAssignments}
              disabled={confirmLaborMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
            >
              {confirmLaborMutation.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" />Saving...</>
              ) : (
                <>Confirm & Apply</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Two-column layout: Division breakdown + Markup config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Division Cost Breakdown (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-cream font-medium text-sm flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Direct Cost Breakdown by Division
          </h3>

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

                  return (
                    <tr key={div}
                      className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => toggleDivision(div)}
                    >
                      <td className="px-4 py-2.5 text-cream">
                        <div className="flex items-center gap-2">
                          {collapsedDivisions.has(div) ? <ChevronRight className="w-3.5 h-3.5 text-cream-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-cream-muted" />}
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
      {/* Export Documents */}
      <EstimateOutputs
        projectName={projectName || `Project ${projectId}`}
        projectDescription={projectDescription}
        calculations={calculations}
        markups={{ generalConditionsPct, overheadPct, profitPct, contingencyPct, bondPct, taxPct }}
        currency={currency}
        costRegion={costRegion}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MarkupInput({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint: string;
}) {
  const [display, setDisplay] = useState(pctToDisplay(value));
  useEffect(() => { setDisplay(pctToDisplay(value)); }, [value]);

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-cream text-xs font-medium">{label}</p>
        <p className="text-cream-muted text-[10px] truncate">{hint}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Input
          type="number" step="0.01" min="0" max="100"
          value={display}
          onChange={(e) => { setDisplay(e.target.value); onChange(displayToPct(e.target.value)); }}
          className="w-20 h-7 text-xs text-right bg-navy-deep/80 border-white/10 text-cream px-2"
        />
        <span className="text-cream-muted text-xs">%</span>
      </div>
    </div>
  );
}

function WaterfallRow({ label, value, currency, bold, accent }: {
  label: string; value: number; currency: string; bold?: boolean; accent?: boolean;
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
