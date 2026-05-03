/**
 * EstimateSummary — Full project estimate with material costs, labor costs
 * (computed from crews + activity productivity), and configurable markups.
 * Renders as a tab inside TakeoffDetail.
 */
import { Fragment, useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  Info,
  Sparkles,
  Loader2,
  Layers,
  X,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import {
  TRADES,
  getBaseWage,
  DEFAULT_BURDENS,
  calculateBurdenedRate,
  DEFAULT_CREWS,
  type LaborType,
} from "../../../shared/tradeRates";
import { COST_REGION_GROUPS } from "../../../shared/costRegions";
import {
  analyzeResidentialEstimateQa,
  reviewResidentialLaborMatch,
  type ResidentialQaItem,
} from "../../../shared/residentialEstimateQa";
import EstimateOutputs from "./EstimateOutputs";

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

function formatCurrency(cents: number, currencyCode: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function pctToDisplay(bps: number): string {
  return (bps / 100).toFixed(2);
}
function displayToPct(str: string): number {
  return Math.round(parseFloat(str || "0") * 100);
}

function parseCents(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getMaterialUnitCost(item: any): number {
  const materialCost = parseCents(item.materialCost);
  if (materialCost > 0) {
    return materialCost;
  }
  const installedUnit = parseCents(item.unitCost);
  const defaultLaborUnit = parseCents(item.laborCost);
  if (installedUnit > defaultLaborUnit) return installedUnit - defaultLaborUnit;
  return parseCents(item.unitCost);
}

type ItemLaborSource =
  | "my_crew"
  | "cost_library"
  | "manual"
  | "held_for_review"
  | "none";

interface ItemLaborEstimate {
  laborCost: number;
  laborSource: ItemLaborSource;
  laborSourceLabel: string;
  laborNote: string;
  crewName?: string;
  productivityPerCrewHr?: number;
}

function getLaborSourceBadgeClass(source: ItemLaborSource): string {
  switch (source) {
    case "my_crew":
      return "bg-blue-500/15 text-blue-300 border-blue-500/25";
    case "cost_library":
      return "bg-cyan-500/15 text-cyan-300 border-cyan-500/25";
    case "manual":
      return "bg-purple-500/15 text-purple-300 border-purple-500/25";
    case "held_for_review":
      return "bg-amber-500/15 text-amber-300 border-amber-500/25";
    default:
      return "bg-white/5 text-cream-muted border-white/10";
  }
}

function parseResidentialSquareFootage(text?: string | null): {
  livingSf?: number;
  totalSf?: number;
} {
  const source = (text || "").toLowerCase();
  if (!source) return {};
  const numberPattern = String.raw`([0-9]{1,3}(?:,[0-9]{3})+|[0-9]{3,6})`;
  const cleanNumber = (value: string) => parseInt(value.replace(/,/g, ""), 10);
  const livingMatch = source.match(
    new RegExp(
      `${numberPattern}\\s*(?:living|conditioned|heated)\\s*(?:sf|sq\\.?\\s*ft|square feet)`
    )
  );
  const totalMatch = source.match(
    new RegExp(
      `${numberPattern}\\s*(?:total|under roof|gross)\\s*(?:sf|sq\\.?\\s*ft|square feet)`
    )
  );
  const fallbackMatch = source.match(
    new RegExp(`${numberPattern}\\s*(?:sf|sq\\.?\\s*ft|square feet)`)
  );
  return {
    livingSf: livingMatch ? cleanNumber(livingMatch[1]) : undefined,
    totalSf: totalMatch
      ? cleanNumber(totalMatch[1])
      : fallbackMatch
        ? cleanNumber(fallbackMatch[1])
        : undefined,
  };
}

interface EstimateSummaryProps {
  projectId: number;
  projectName?: string;
  projectDescription?: string;
  items: any[];
  allowances?: Array<{ description?: string | null; amount?: number | null }>;
  onAddAllowance?: (allowance: { description: string; amount: number }) => void;
  currency: string;
  costRegion?: string | null;
  enableResidentialQa?: boolean;
  reviewQueueCount?: number;
  reviewQueueCost?: number;
  excludedBoundaryCount?: number;
}

export default function EstimateSummary({
  projectId,
  projectName,
  projectDescription,
  items,
  allowances = [],
  onAddAllowance,
  currency,
  costRegion,
  enableResidentialQa = false,
  reviewQueueCount = 0,
  reviewQueueCost = 0,
  excludedBoundaryCount = 0,
}: EstimateSummaryProps) {
  // ─── Data fetching ───────────────────────────────────────────────────
  const { data: markupData, isLoading: markupsLoading } =
    trpc.estimate.getMarkups.useQuery({ projectId });
  const { data: crewsData } = trpc.tradeRates.getCrews.useQuery();
  const { data: activityData } =
    trpc.tradeRates.getActivityProductivity.useQuery();
  const { data: burdenData } = trpc.tradeRates.getBurdenConfigs.useQuery();
  const { data: userRatesData } = trpc.tradeRates.getTradeRates.useQuery();
  const defaultCrewNames = useMemo(
    () => new Set(DEFAULT_CREWS.map(crew => crew.crewName)),
    []
  );
  const userCrews = useMemo(
    () =>
      (crewsData || []).filter(
        (crew: any) => !defaultCrewNames.has(crew.crewName)
      ),
    [crewsData, defaultCrewNames]
  );
  const hasUserCrews = userCrews.length > 0;

  const utils = trpc.useUtils();

  const saveMutation = trpc.estimate.saveMarkups.useMutation({
    onSuccess: () => toast.success("Markup configuration saved"),
    onError: (err: any) => toast.error(err.message),
  });

  // ─── Labor Inference Review Panel (item-level legacy) ──────────────
  const [reviewAssignments, setReviewAssignments] = useState<any[] | null>(
    null
  );
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  // ─── Task-based Review Panel (new) ──────────────────────────────────
  const [taskGroups, setTaskGroups] = useState<any[] | null>(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  const confirmLaborMutation =
    trpc.estimate.confirmLaborAssignments.useMutation({
      onSuccess: result => {
        toast.success(result.message);
        utils.tradeRates.getActivityProductivity.invalidate();
        setShowReviewPanel(false);
        setReviewAssignments(null);
      },
      onError: (err: any) =>
        toast.error("Failed to save assignments: " + err.message),
    });

  const confirmTasksMutation = trpc.estimate.confirmTaskAssignments.useMutation(
    {
      onSuccess: result => {
        toast.success(result.message);
        utils.tradeRates.getActivityProductivity.invalidate();
        setShowTaskPanel(false);
        setTaskGroups(null);
      },
      onError: (err: any) =>
        toast.error("Failed to save task assignments: " + err.message),
    }
  );

  const inferLaborMutation = trpc.estimate.inferLabor.useMutation({
    onSuccess: result => {
      if (result.success) {
        setReviewAssignments(result.assignments);
        setShowReviewPanel(true);
        toast.success(
          `ConstructLine analyzed ${result.assignments.length} items — review assignments below before confirming.`
        );
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) =>
      toast.error("ConstructLine labor analysis failed: " + err.message),
  });

  const inferByTasksMutation = trpc.estimate.inferLaborByTasks.useMutation({
    onSuccess: result => {
      if (result.success) {
        const reviewedTasks = result.tasks.map((task: any) => {
          if (!enableResidentialQa) return task;
          const itemReasons = task.items
            .map((item: any) => reviewResidentialLaborMatch(item).reasons)
            .flat();
          return itemReasons.length > 0
            ? {
                ...task,
                _excluded: true,
                safetyReason: Array.from(new Set(itemReasons)).join(" "),
              }
            : task;
        });
        setTaskGroups(reviewedTasks);
        setShowTaskPanel(true);
        setExpandedTasks(new Set(reviewedTasks.map((_: any, i: number) => i)));
        toast.success(
          `ConstructLine grouped items into ${reviewedTasks.length} installation tasks — review and edit crews before confirming.`
        );
      } else {
        toast.error(result.message);
      }
    },
    onError: (err: any) =>
      toast.error("ConstructLine task analysis failed: " + err.message),
  });

  const handleCalculateLabor = () => {
    if (!hasUserCrews) {
      toast.error(
        "Set up your real crews in the Labor Database before applying crew labor to this estimate."
      );
      window.location.href = "/portal/labor-library?tab=crews";
      return;
    }
    // Use task-based grouping as the primary method
    inferByTasksMutation.mutate({
      projectId,
      items: items.map(i => ({
        description: i.description || "",
        unit: i.unit || "",
        quantity: parseFloat(i.quantity) || 0,
        csiDivision: i.csiDivision || "00",
        notes: i.notes || "",
      })),
    });
  };

  const handleLaborCta = () => {
    if (!hasUserCrews) {
      window.location.href = "/portal/labor-library?tab=crews";
      return;
    }
    handleCalculateLabor();
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

  const handleConfirmTasks = () => {
    if (!taskGroups) return;
    confirmTasksMutation.mutate({
      projectId,
      tasks: taskGroups
        .filter((t: any) => !t._excluded)
        .map((t: any) => ({
          crewId: t.crewId,
          items: t.items,
          reasoning: t.reasoning,
        })),
    });
  };

  const updateTaskCrew = (taskIdx: number, crewId: number | null) => {
    if (!crewsData) return;
    const crew = crewId ? crewsData.find((c: any) => c.id === crewId) : null;
    setTaskGroups(prev =>
      prev
        ? prev.map((t: any, i: number) =>
            i === taskIdx
              ? { ...t, crewId, crewName: crew?.crewName || "unassigned" }
              : t
          )
        : prev
    );
  };

  const toggleTaskExpand = (idx: number) => {
    setExpandedTasks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateItemProductivity = (
    taskIdx: number,
    itemIdx: number,
    val: number
  ) => {
    setTaskGroups(prev =>
      prev
        ? prev.map((t: any, ti: number) =>
            ti === taskIdx
              ? {
                  ...t,
                  items: t.items.map((item: any, ii: number) =>
                    ii === itemIdx
                      ? { ...item, productivityPerCrewHr: val }
                      : item
                  ),
                }
              : t
          )
        : prev
    );
  };

  // ─── Markup state ────────────────────────────────────────────────────
  const [overheadPct, setOverheadPct] = useState(1000);
  const [profitPct, setProfitPct] = useState(1000);
  const [contingencyPct, setContingencyPct] = useState(500);
  const [bondPct, setBondPct] = useState(200);
  const [taxPct, setTaxPct] = useState(800);
  const [generalConditionsPct, setGeneralConditionsPct] = useState(1000);
  const [collapsedDivisions, setCollapsedDivisions] = useState<Set<string>>(
    new Set()
  );

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
      const burden = burdenConfig
        ? {
            ficaPct: burdenConfig.ficaPct,
            futaPct: burdenConfig.futaPct,
            sutaPct: burdenConfig.sutaPct,
            workersCompPct: burdenConfig.workersCompPct,
            generalLiabilityPct: burdenConfig.generalLiabilityPct,
            healthInsuranceCentsPerHr: burdenConfig.healthInsuranceCentsPerHr,
            pensionPct: burdenConfig.pensionPct,
            vacationPct: burdenConfig.vacationPct,
            trainingPct: burdenConfig.trainingPct,
            unionFringeCentsPerHr: burdenConfig.unionFringeCentsPerHr,
            otherCentsPerHr: burdenConfig.otherCentsPerHr,
          }
        : DEFAULT_BURDENS[lt];

      let totalPerHr = 0;
      const members = JSON.parse(crew.crewMembers || "[]");
      for (const m of members) {
        const userRate = userRateMap.get(`${m.tradeName}|${m.classification}`);
        const trade = TRADES.find(t => t.tradeName === m.tradeName);
        const baseWage =
          userRate ?? getBaseWage(m.tradeName, m.classification, lt) ?? 0;
        const burdened = Math.round(
          calculateBurdenedRate(baseWage, burden) * regionMultiplier
        );
        totalPerHr += burdened * (m.count || 1);
      }
      map.set(crew.id, { name: crew.crewName, costPerHr: totalPerHr });
    }
    return map;
  }, [crewsData, burdenData, userRatesData, regionMultiplier]);

  // ─── Build activity productivity lookup ─────────────────────────────
  const activityMap = useMemo(() => {
    const map = new Map<
      string,
      { crewId: number | null; productivityPerCrewHr: number; source: string }
    >();
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

    const byDivision: Record<
      string,
      { items: any[]; materialTotal: number; laborTotal: number }
    > = {};
    const itemLaborEstimates = new Map<number, ItemLaborEstimate>();
    let totalMaterial = 0;
    let totalLabor = 0;
    let laborItemsMatched = 0;
    let laborItemsHeldForReview = 0;
    let laborItemsDefaulted = 0;
    let laborItemsWithoutLabor = 0;
    const allowancesTotal = allowances.reduce(
      (sum, allowance) => sum + parseCents(allowance.amount),
      0
    );

    for (const item of items) {
      const div = item.csiDivision || "00";
      if (!byDivision[div])
        byDivision[div] = { items: [], materialTotal: 0, laborTotal: 0 };
      byDivision[div].items.push(item);

      const qty = parseFloat(item.quantity) || 0;
      const itemMaterial = qty * getMaterialUnitCost(item);
      byDivision[div].materialTotal += itemMaterial;
      totalMaterial += itemMaterial;

      // Labor: look up activity productivity for this item
      const descKey = `${(item.description || "").toLowerCase()}|${(item.unit || "").toLowerCase()}`;
      const activity = activityMap.get(descKey);
      const laborReview = enableResidentialQa
        ? reviewResidentialLaborMatch(item)
        : { blockAutomaticLabor: false, reasons: [] };
      const libraryLaborUnit = parseCents(item.laborCost);
      let itemLabor = 0;
      let laborEstimate: ItemLaborEstimate;

      if (laborReview.blockAutomaticLabor) {
        laborItemsHeldForReview++;
        laborEstimate = {
          laborCost: 0,
          laborSource: "held_for_review",
          laborSourceLabel: "Held for Review",
          laborNote: laborReview.reasons.join(" "),
        };
      } else if (
        activity &&
        activity.crewId &&
        activity.productivityPerCrewHr > 0
      ) {
        const crewInfo = crewCostMap.get(activity.crewId);
        if (crewInfo) {
          // Labor = (qty / productivity_per_crew_hr) × crew_cost_per_hr
          const crewHours = qty / activity.productivityPerCrewHr;
          itemLabor = Math.round(crewHours * crewInfo.costPerHr);
          laborItemsMatched++;
          laborEstimate = {
            laborCost: itemLabor,
            laborSource: "my_crew",
            laborSourceLabel: "My Crew Labor",
            laborNote: `${crewInfo.name} at ${activity.productivityPerCrewHr.toLocaleString()} ${item.unit || "units"} per crew-hour.`,
            crewName: crewInfo.name,
            productivityPerCrewHr: activity.productivityPerCrewHr,
          };
        } else if (libraryLaborUnit > 0) {
          itemLabor = Math.round(qty * libraryLaborUnit);
          laborItemsDefaulted++;
          laborEstimate = {
            laborCost: itemLabor,
            laborSource: "cost_library",
            laborSourceLabel: "Cost Library / Default Labor",
            laborNote:
              "No matching crew rate was found yet, so the estimate is using the takeoff cost-library labor unit.",
          };
        } else {
          laborItemsWithoutLabor++;
          laborEstimate = {
            laborCost: 0,
            laborSource: "none",
            laborSourceLabel: "No Labor",
            laborNote: "No labor source is available for this item yet.",
          };
        }
      } else if (libraryLaborUnit > 0) {
        itemLabor = Math.round(qty * libraryLaborUnit);
        laborItemsDefaulted++;
        laborEstimate = {
          laborCost: itemLabor,
          laborSource: "cost_library",
          laborSourceLabel: "Cost Library / Default Labor",
          laborNote:
            "Using the default labor from the takeoff cost library until crew labor is configured.",
        };
      } else {
        laborItemsWithoutLabor++;
        laborEstimate = {
          laborCost: 0,
          laborSource: "none",
          laborSourceLabel: "No Labor",
          laborNote: "No labor source is available for this item yet.",
        };
      }

      itemLaborEstimates.set(item.id, laborEstimate);
      byDivision[div].laborTotal += itemLabor;
      totalLabor += itemLabor;
    }

    const directCost = totalMaterial + totalLabor + allowancesTotal;
    const generalConditions = Math.round(
      (directCost * generalConditionsPct) / 10000
    );
    const subtotalWithGC = directCost + generalConditions;
    const overhead = Math.round((subtotalWithGC * overheadPct) / 10000);
    const profit = Math.round((subtotalWithGC * profitPct) / 10000);
    const subtotalWithOHP = subtotalWithGC + overhead + profit;
    const contingency = Math.round((subtotalWithOHP * contingencyPct) / 10000);
    const subtotalWithContingency = subtotalWithOHP + contingency;
    const bond = Math.round((subtotalWithContingency * bondPct) / 10000);
    const tax = Math.round((totalMaterial * taxPct) / 10000);
    const grandTotal = subtotalWithContingency + bond + tax;

    return {
      byDivision,
      totalMaterial,
      totalLabor,
      allowancesTotal,
      directCost,
      generalConditions,
      overhead,
      profit,
      contingency,
      bond,
      tax,
      grandTotal,
      divisionOrder: Object.keys(byDivision).sort(),
      laborItemsMatched,
      laborItemsHeldForReview,
      laborItemsDefaulted,
      laborItemsWithoutLabor,
      itemLaborEstimates,
      totalItems: items.length,
    };
  }, [
    items,
    allowances,
    overheadPct,
    profitPct,
    contingencyPct,
    bondPct,
    taxPct,
    generalConditionsPct,
    activityMap,
    crewCostMap,
    enableResidentialQa,
  ]);

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

  const residentialQaFindings = useMemo(() => {
    if (!enableResidentialQa) return [];
    if (!calculations) return [];
    return analyzeResidentialEstimateQa({
      items,
      byDivision: calculations.byDivision,
      directCostCents: calculations.directCost,
      allowances,
      ...parseResidentialSquareFootage(
        `${projectName || ""} ${projectDescription || ""}`
      ),
    });
  }, [
    enableResidentialQa,
    items,
    calculations,
    allowances,
    projectName,
    projectDescription,
  ]);

  const handleExportEstimate = () => {
    if (!calculations) return;
    const rows: any[] = [];
    for (const div of calculations.divisionOrder) {
      const data = calculations.byDivision[div];
      const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
      rows.push({
        "CSI Division": `Div ${div} — ${divName}`,
        "Material Cost": (data.materialTotal / 100).toFixed(2),
        "Active Labor Cost": (data.laborTotal / 100).toFixed(2),
        Subtotal: ((data.materialTotal + data.laborTotal) / 100).toFixed(2),
      });
    }
    rows.push({});
    if (calculations.allowancesTotal > 0) {
      rows.push({
        "CSI Division": "ALLOWANCES",
        Subtotal: (calculations.allowancesTotal / 100).toFixed(2),
      });
    }
    rows.push({
      "CSI Division": "DIRECT COSTS",
      "Material Cost": (calculations.totalMaterial / 100).toFixed(2),
      "Active Labor Cost": (calculations.totalLabor / 100).toFixed(2),
      Subtotal: (calculations.directCost / 100).toFixed(2),
    });
    rows.push({
      "CSI Division": `General Conditions (${pctToDisplay(generalConditionsPct)}%)`,
      Subtotal: (calculations.generalConditions / 100).toFixed(2),
    });
    rows.push({
      "CSI Division": `Overhead (${pctToDisplay(overheadPct)}%)`,
      Subtotal: (calculations.overhead / 100).toFixed(2),
    });
    rows.push({
      "CSI Division": `Profit (${pctToDisplay(profitPct)}%)`,
      Subtotal: (calculations.profit / 100).toFixed(2),
    });
    rows.push({
      "CSI Division": `Contingency (${pctToDisplay(contingencyPct)}%)`,
      Subtotal: (calculations.contingency / 100).toFixed(2),
    });
    rows.push({
      "CSI Division": `Bond (${pctToDisplay(bondPct)}%)`,
      Subtotal: (calculations.bond / 100).toFixed(2),
    });
    rows.push({
      "CSI Division": `Sales Tax on Materials (${pctToDisplay(taxPct)}%)`,
      Subtotal: (calculations.tax / 100).toFixed(2),
    });
    rows.push({});
    rows.push({
      "CSI Division": "GRAND TOTAL",
      Subtotal: (calculations.grandTotal / 100).toFixed(2),
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estimate Summary");
    if (enableResidentialQa && residentialQaFindings.length > 0) {
      const qaRows = residentialQaFindings.map(finding => ({
        Severity: finding.severity.toUpperCase(),
        Type: finding.kind,
        Issue: finding.title,
        Amount: finding.amountCents
          ? (finding.amountCents / 100).toFixed(2)
          : "",
        "Labor status":
          finding.laborMatchStatus === "review_before_labor"
            ? "Review before labor"
            : "",
        "Why it matters": finding.message,
        "Recommended action": finding.action,
        "One-click allowance preset": finding.allowancePreset
          ? `${finding.allowancePreset.description} — ${(finding.allowancePreset.amount / 100).toFixed(2)}`
          : "",
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(qaRows),
        "Residential QA"
      );
    }
    XLSX.writeFile(wb, `estimate-summary-project-${projectId}.xlsx`);
    toast.success("Estimate exported to Excel");
  };

  const toggleDivision = (div: string) => {
    setCollapsedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(div)) next.delete(div);
      else next.add(div);
      return next;
    });
  };

  if (!items || items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Calculator className="w-12 h-12 text-cream-muted/30 mb-4" />
        <h3 className="text-cream font-semibold text-lg mb-2">
          No Takeoff Items Yet
        </h3>
        <p className="text-cream-muted text-sm max-w-md">
          Upload drawings and run a takeoff first. Once you have quantity items
          with costs, the estimate summary will calculate material + labor +
          markups automatically.
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
            Live estimate from takeoff quantities, placeholder default labor,
            your crew labor when assigned, allowances, and configurable markups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportEstimate}
            className="border-white/20 text-cream hover:bg-white/5 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save Markups
          </Button>
        </div>
      </div>

      {reviewQueueCount > 0 ? (
        <div className="bg-amber-500/8 border border-amber-500/25 rounded-xl px-4 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5 lg:mt-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-100 font-medium">
              Draft estimate from accepted scope
            </p>
            <p className="text-xs text-amber-100/75 mt-0.5">
              {reviewQueueCount} scope decision
              {reviewQueueCount !== 1 ? "s are" : " is"} still open and{" "}
              {formatCurrency(reviewQueueCost, currency)} is held out of this
              bid number. Finish the review queue before treating the estimate
              as ready.
            </p>
          </div>
          <Badge className="bg-amber-500/15 text-amber-100 border-amber-500/25">
            {reviewQueueCount} open
          </Badge>
        </div>
      ) : (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm text-emerald-200 font-medium">
              Accepted scope is ready for pricing
            </p>
            <p className="text-xs text-emerald-100/70 mt-0.5">
              The scope queue is clear. This estimate is now using the accepted
              takeoff rows, allowances, labor source, and markup settings.
              {excludedBoundaryCount > 0
                ? ` ${excludedBoundaryCount} boundary item${excludedBoundaryCount !== 1 ? "s remain" : " remains"} visible for audit.`
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* Labor coverage info + Calculate Labor button */}
      {calculations.laborItemsMatched > 0 ? (
        <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Users className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-emerald-200/80 text-xs flex-1">
            <strong className="text-emerald-300">Crew labor is active</strong>{" "}
            for {calculations.laborItemsMatched} item
            {calculations.laborItemsMatched !== 1 ? "s" : ""}.
            {calculations.laborItemsDefaulted > 0
              ? ` ${calculations.laborItemsDefaulted} item${calculations.laborItemsDefaulted !== 1 ? "s are" : " is"} still using Cost Library / Default Labor as a placeholder until you assign one of your crews.`
              : ""}
            {calculations.laborItemsWithoutLabor > 0
              ? ` ${calculations.laborItemsWithoutLabor} item${calculations.laborItemsWithoutLabor !== 1 ? "s have" : " has"} no labor source yet.`
              : ""}
            {enableResidentialQa && calculations.laborItemsHeldForReview > 0
              ? ` ${calculations.laborItemsHeldForReview} risky residential item${calculations.laborItemsHeldForReview !== 1 ? "s were" : " was"} held out for review.`
              : ""}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLaborCta}
            disabled={inferByTasksMutation.isPending}
            className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 gap-1.5 shrink-0"
          >
            {inferByTasksMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Grouping tasks...
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                Review Labor Assignments
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex-1">
            <p className="text-blue-200/80 text-xs">
              <strong className="text-blue-300">
                Cost Library / Default Labor is a placeholder starting point.
              </strong>{" "}
              For accurate labor, set up your real crews in the Labor Database,
              then apply those crews to this estimate. Starter/demo crews are
              for setup only and should be reviewed before bidding.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleLaborCta}
            disabled={inferByTasksMutation.isPending}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white gap-1.5 shrink-0"
          >
            {inferByTasksMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Grouping{items.length > 20 ? ` ${items.length} items` : ""} into
                tasks...
              </>
            ) : !hasUserCrews ? (
              <>
                <Users className="w-3.5 h-3.5" />
                Set Up Crews
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5" />
                Review Labor Assignments
              </>
            )}
          </Button>
        </div>
      )}

      {enableResidentialQa && (
        <ResidentialQaPanel
          findings={residentialQaFindings}
          currency={currency}
          allowanceCount={allowances.length}
          onAddAllowance={onAddAllowance}
        />
      )}

      <div className="bg-navy-medium/35 border border-white/10 rounded-xl px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm text-cream font-medium">
            One labor source per item
          </p>
          <p className="text-xs text-cream-muted">
            The Estimate tab is the live bid number. Each line uses your
            assigned crew labor when matched, or Cost Library / Default Labor as
            a placeholder. Build and review crews in the Labor Database before
            treating labor as bid-ready.
          </p>
        </div>
      </div>

      {/* ─── Labor Inference Review Panel ──────────────────────────────── */}
      {showReviewPanel && reviewAssignments && (
        <div className="border border-indigo-500/30 rounded-xl bg-indigo-500/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-cream">
                ConstructLine Labor Assignment Review
              </h3>
              <span className="text-xs text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                {
                  reviewAssignments.filter(
                    a => a.crewId !== null && !a._excluded
                  ).length
                }{" "}
                of {reviewAssignments.length} matched
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowReviewPanel(false);
                  setReviewAssignments(null);
                }}
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
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Confirm & Apply{" "}
                    {
                      reviewAssignments.filter(
                        a => a.crewId !== null && !a._excluded
                      ).length
                    }{" "}
                    Assignments
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-navy-medium/60 border-b border-white/8">
                  <th className="text-left text-cream-muted font-medium px-3 py-2 w-8"></th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2">
                    Item Description
                  </th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2 w-16">
                    Unit
                  </th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2 w-40">
                    Assigned Crew
                  </th>
                  <th className="text-right text-cream-muted font-medium px-3 py-2 w-32">
                    Output / Crew-Hour
                  </th>
                  <th className="text-left text-cream-muted font-medium px-3 py-2">
                    ConstructLine Reasoning
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewAssignments.map((a, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-white/5 transition-colors ${
                      a._excluded
                        ? "opacity-40 bg-red-500/5"
                        : a.crewId
                          ? "hover:bg-white/3"
                          : "bg-amber-500/5"
                    }`}
                  >
                    {/* Include / exclude toggle */}
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => {
                          setReviewAssignments(prev =>
                            prev
                              ? prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, _excluded: !item._excluded }
                                    : item
                                )
                              : prev
                          );
                        }}
                        title={
                          a._excluded ? "Click to include" : "Click to exclude"
                        }
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
                        <span className="text-indigo-300 font-medium">
                          {a.crewName}
                        </span>
                      ) : (
                        <span className="text-amber-400/70 italic">
                          unassigned
                        </span>
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
                              prev
                                ? prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, productivityPerCrewHr: val }
                                      : item
                                  )
                                : prev
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
              Toggle ✓/✕ to include or exclude items. Edit productivity values
              inline. Click{" "}
              <strong className="text-cream-muted">Confirm & Apply</strong> to
              save.
            </p>
            <Button
              size="sm"
              onClick={handleConfirmAssignments}
              disabled={confirmLaborMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
            >
              {confirmLaborMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
              ) : (
                <>Confirm & Apply</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── Task-based Labor Review Panel ───────────────────────────────── */}
      {showTaskPanel && taskGroups && (
        <div className="border border-indigo-500/30 rounded-xl bg-indigo-500/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-cream">
                ConstructLine Task-Based Labor Review
              </h3>
              <span className="text-xs text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                {
                  taskGroups.filter(
                    (t: any) => !t._excluded && t.crewId !== null
                  ).length
                }{" "}
                of {taskGroups.length} tasks assigned
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowTaskPanel(false);
                  setTaskGroups(null);
                }}
                className="border-white/10 text-cream-muted hover:text-cream text-xs"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmTasks}
                disabled={confirmTasksMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
              >
                {confirmTasksMutation.isPending ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Confirm & Apply{" "}
                    {
                      taskGroups.filter(
                        (t: any) => !t._excluded && t.crewId !== null
                      ).length
                    }{" "}
                    Tasks
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="divide-y divide-white/5">
            {taskGroups.map((task: any, taskIdx: number) => {
              const isExpanded = expandedTasks.has(taskIdx);
              return (
                <div
                  key={taskIdx}
                  className={`${task._excluded ? "opacity-40" : ""}`}
                >
                  {/* Task header */}
                  <div className="px-4 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors">
                    {/* Exclude toggle */}
                    <button
                      onClick={() =>
                        setTaskGroups(prev =>
                          prev
                            ? prev.map((t: any, i: number) =>
                                i === taskIdx
                                  ? { ...t, _excluded: !t._excluded }
                                  : t
                              )
                            : prev
                        )
                      }
                      title={
                        task._excluded ? "Click to include" : "Click to exclude"
                      }
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        task._excluded
                          ? "border-red-400/40 bg-red-500/10 text-red-400"
                          : "border-emerald-400/40 bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {task._excluded ? "✕" : "✓"}
                    </button>

                    {/* Expand toggle */}
                    <button
                      onClick={() => toggleTaskExpand(taskIdx)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-cream-muted shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-cream-muted shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-cream">
                          {task.taskName}
                        </p>
                        {task.taskDescription && (
                          <p className="text-xs text-cream-muted/60 truncate">
                            {task.taskDescription}
                          </p>
                        )}
                        {task.safetyReason && (
                          <p className="text-xs text-amber-300/80 truncate">
                            {task.safetyReason}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-cream-muted/50 shrink-0">
                        {task.items.length} item
                        {task.items.length !== 1 ? "s" : ""}
                      </span>
                    </button>

                    {/* Inline crew selector */}
                    <Select
                      value={task.crewId ? String(task.crewId) : "unassigned"}
                      onValueChange={value =>
                        updateTaskCrew(
                          taskIdx,
                          value === "unassigned" ? null : parseInt(value)
                        )
                      }
                      disabled={task._excluded}
                    >
                      <SelectTrigger
                        size="sm"
                        className="h-8 w-[260px] max-w-[32vw] shrink-0 border-indigo-400/25 bg-navy-deep text-xs text-cream hover:bg-indigo-500/10 hover:border-indigo-300/40 focus-visible:border-indigo-300 focus-visible:ring-indigo-400/20 disabled:opacity-50"
                      >
                        <SelectValue placeholder="Select crew" />
                      </SelectTrigger>
                      <SelectContent
                        align="end"
                        className="w-[320px] max-h-72 border-indigo-400/20 bg-navy-deep text-cream shadow-2xl"
                      >
                        <SelectItem
                          value="unassigned"
                          className="text-cream-muted focus:bg-indigo-500/15 focus:text-white"
                        >
                          Unassigned
                        </SelectItem>
                        {(crewsData || []).map((c: any) => {
                          const isStarterCrew = defaultCrewNames.has(
                            c.crewName
                          );
                          return (
                            <SelectItem
                              key={c.id}
                              value={String(c.id)}
                              className="pr-8 text-cream focus:bg-indigo-500/15 focus:text-white data-[state=checked]:bg-indigo-500/20 data-[state=checked]:text-indigo-100"
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate">{c.crewName}</span>
                                {isStarterCrew && (
                                  <span className="text-[10px] text-amber-300/80">
                                    Starter crew - review before bidding
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expanded item list */}
                  {isExpanded && (
                    <div className="bg-navy-deep/40 border-t border-white/5">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-cream-muted font-medium px-6 py-1.5">
                              Item Description
                            </th>
                            <th className="text-left text-cream-muted font-medium px-3 py-1.5 w-16">
                              Unit
                            </th>
                            <th className="text-right text-cream-muted font-medium px-3 py-1.5 w-36">
                              Output / Crew-Hour
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {task.items.map((item: any, itemIdx: number) => (
                            <tr
                              key={itemIdx}
                              className="border-b border-white/3"
                            >
                              <td className="px-6 py-1.5 text-cream/70">
                                {item.description}
                              </td>
                              <td className="px-3 py-1.5 text-cream-muted">
                                {item.unit}
                              </td>
                              <td className="px-3 py-1.5 text-right">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.01"
                                  value={item.productivityPerCrewHr}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value);
                                    if (!isNaN(val) && val > 0)
                                      updateItemProductivity(
                                        taskIdx,
                                        itemIdx,
                                        val
                                      );
                                  }}
                                  className="w-24 bg-navy-medium border border-white/10 rounded px-2 py-1 text-right text-cream focus:border-indigo-400/50 focus:outline-none text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {task.reasoning && (
                        <p className="px-6 py-2 text-xs text-cream-muted/50 italic">
                          {task.reasoning}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-indigo-500/20 flex items-center justify-between">
            <p className="text-xs text-cream-muted/60">
              Select your real crew for each task. Expand tasks to edit per-item
              productivity. Toggle ✓/✕ to include or exclude. These assignments
              are a review workflow, not an automatic labor guarantee.
            </p>
            <Button
              size="sm"
              onClick={handleConfirmTasks}
              disabled={confirmTasksMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 text-xs"
            >
              {confirmTasksMutation.isPending ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Saving...
                </>
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
                  <th className="text-left text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider">
                    Division
                  </th>
                  <th className="text-right text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider w-32">
                    Material
                  </th>
                  <th className="text-right text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider w-32">
                    Active Labor
                  </th>
                  <th className="text-right text-cream-muted font-medium px-4 py-2.5 text-xs uppercase tracking-wider w-32">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {calculations.divisionOrder.map(div => {
                  const data = calculations.byDivision[div];
                  const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
                  const divTotal = data.materialTotal + data.laborTotal;

                  return (
                    <Fragment key={div}>
                      <tr
                        key={div}
                        className="border-b border-white/5 hover:bg-white/[0.02] cursor-pointer"
                        onClick={() => toggleDivision(div)}
                      >
                        <td className="px-4 py-2.5 text-cream">
                          <div className="flex items-center gap-2">
                            {collapsedDivisions.has(div) ? (
                              <ChevronRight className="w-3.5 h-3.5 text-cream-muted" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-cream-muted" />
                            )}
                            <span className="font-mono text-amber-400/80 text-xs">
                              {div}
                            </span>
                            <span>{divName}</span>
                            <Badge className="bg-white/5 text-cream-muted border-white/10 text-[10px] ml-1">
                              {data.items.length}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-cream font-mono text-xs">
                          {formatCurrency(data.materialTotal, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-cream font-mono text-xs">
                          {data.laborTotal > 0 ? (
                            formatCurrency(data.laborTotal, currency)
                          ) : (
                            <span className="text-cream-muted/40">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-cream font-mono text-xs font-medium">
                          {formatCurrency(divTotal, currency)}
                        </td>
                      </tr>
                      {!collapsedDivisions.has(div) &&
                        data.items.map((item: any) => {
                          const labor = calculations.itemLaborEstimates.get(
                            item.id
                          );
                          const qty = parseFloat(item.quantity) || 0;
                          const materialTotal = Math.round(
                            qty * getMaterialUnitCost(item)
                          );
                          const laborTotal = labor?.laborCost || 0;
                          return (
                            <tr
                              key={`${div}-${item.id}`}
                              className="border-b border-white/5 bg-navy-deep/20"
                            >
                              <td className="px-8 py-2 text-cream/75">
                                <p className="text-xs line-clamp-1">
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    className={`text-[10px] border ${getLaborSourceBadgeClass(labor?.laborSource || "none")}`}
                                  >
                                    {labor?.laborSourceLabel || "No Labor"}
                                  </Badge>
                                  {labor?.laborNote && (
                                    <span className="text-[10px] text-cream-muted/55 line-clamp-1">
                                      {labor.laborNote}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right text-cream-muted font-mono text-xs">
                                {formatCurrency(materialTotal, currency)}
                              </td>
                              <td className="px-4 py-2 text-right text-cream-muted font-mono text-xs">
                                {laborTotal > 0
                                  ? formatCurrency(laborTotal, currency)
                                  : "—"}
                              </td>
                              <td className="px-4 py-2 text-right text-cream-muted font-mono text-xs">
                                {formatCurrency(
                                  materialTotal + laborTotal,
                                  currency
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </Fragment>
                  );
                })}
                {calculations.allowancesTotal > 0 && (
                  <tr className="border-b border-white/5 bg-amber-500/[0.03]">
                    <td className="px-4 py-2.5 text-cream">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                        <span>Allowances</span>
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px] ml-1">
                          {allowances.length}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-cream-muted/40 font-mono text-xs">
                      —
                    </td>
                    <td className="px-4 py-2.5 text-right text-cream-muted/40 font-mono text-xs">
                      —
                    </td>
                    <td className="px-4 py-2.5 text-right text-amber-300 font-mono text-xs font-medium">
                      {formatCurrency(calculations.allowancesTotal, currency)}
                    </td>
                  </tr>
                )}
                <tr className="bg-navy-medium/50 border-t border-white/15">
                  <td className="px-4 py-3 text-cream font-semibold">
                    Direct Costs Total
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono text-sm font-semibold">
                    {formatCurrency(calculations.totalMaterial, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-400 font-mono text-sm font-semibold">
                    {calculations.totalLabor > 0
                      ? formatCurrency(calculations.totalLabor, currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-cream font-mono text-sm font-bold">
                    {formatCurrency(calculations.directCost, currency)}
                  </td>
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
            <MarkupInput
              label="General Conditions"
              value={generalConditionsPct}
              onChange={setGeneralConditionsPct}
              hint="Site overhead, supervision, temp facilities"
            />
            <MarkupInput
              label="Overhead"
              value={overheadPct}
              onChange={setOverheadPct}
              hint="Office overhead, insurance, admin"
            />
            <MarkupInput
              label="Profit"
              value={profitPct}
              onChange={setProfitPct}
              hint="Contractor profit margin"
            />
            <MarkupInput
              label="Contingency"
              value={contingencyPct}
              onChange={setContingencyPct}
              hint="Risk allowance for unknowns"
            />
            <MarkupInput
              label="Bond"
              value={bondPct}
              onChange={setBondPct}
              hint="Performance & payment bond cost"
            />
            <MarkupInput
              label="Sales Tax (Materials)"
              value={taxPct}
              onChange={setTaxPct}
              hint="State/local tax on materials only"
            />
          </div>

          {/* Estimate Waterfall */}
          <div className="bg-navy-medium/30 border border-white/10 rounded-lg p-4 space-y-2">
            <h4 className="text-cream font-medium text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              Estimate Waterfall
            </h4>
            <WaterfallRow
              label="Direct Costs"
              value={calculations.directCost}
              currency={currency}
              bold
            />
            {generalConditionsPct > 0 && (
              <WaterfallRow
                label={`+ General Conditions (${pctToDisplay(generalConditionsPct)}%)`}
                value={calculations.generalConditions}
                currency={currency}
              />
            )}
            {overheadPct > 0 && (
              <WaterfallRow
                label={`+ Overhead (${pctToDisplay(overheadPct)}%)`}
                value={calculations.overhead}
                currency={currency}
              />
            )}
            {profitPct > 0 && (
              <WaterfallRow
                label={`+ Profit (${pctToDisplay(profitPct)}%)`}
                value={calculations.profit}
                currency={currency}
              />
            )}
            {contingencyPct > 0 && (
              <WaterfallRow
                label={`+ Contingency (${pctToDisplay(contingencyPct)}%)`}
                value={calculations.contingency}
                currency={currency}
              />
            )}
            {bondPct > 0 && (
              <WaterfallRow
                label={`+ Bond (${pctToDisplay(bondPct)}%)`}
                value={calculations.bond}
                currency={currency}
              />
            )}
            {taxPct > 0 && (
              <WaterfallRow
                label={`+ Sales Tax (${pctToDisplay(taxPct)}%)`}
                value={calculations.tax}
                currency={currency}
              />
            )}
            <div className="border-t border-white/15 pt-2 mt-2">
              <WaterfallRow
                label="GRAND TOTAL"
                value={calculations.grandTotal}
                currency={currency}
                bold
                accent
              />
            </div>
          </div>
        </div>
      </div>
      {/* Export Documents */}
      <EstimateOutputs
        projectName={projectName || `Project ${projectId}`}
        projectDescription={projectDescription}
        calculations={calculations}
        markups={{
          generalConditionsPct,
          overheadPct,
          profitPct,
          contingencyPct,
          bondPct,
          taxPct,
        }}
        currency={currency}
        costRegion={costRegion}
      />
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ResidentialQaPanel({
  findings,
  currency,
  allowanceCount,
  onAddAllowance,
}: {
  findings: ResidentialQaItem[];
  currency: string;
  allowanceCount: number;
  onAddAllowance?: (allowance: { description: string; amount: number }) => void;
}) {
  const highCount = findings.filter(f => f.severity === "high").length;
  const mediumCount = findings.filter(f => f.severity === "medium").length;
  const topFindings = findings.slice(0, 6);

  if (findings.length === 0) {
    return (
      <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-200 text-sm font-medium">
            Residential estimate QA looks clean
          </p>
          <p className="text-emerald-200/70 text-xs mt-0.5">
            Required residential categories are represented, and no high-dollar
            inferred/detail-driven scope was detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-amber-500/25 bg-amber-500/6 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-500/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-cream">
              Residential Estimate QA
            </h3>
            <p className="text-xs text-cream-muted">
              Review scope risks before labor and markups make the estimate feel
              final.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allowanceCount > 0 && (
            <Badge className="bg-emerald-500/12 text-emerald-300 border-emerald-500/25 text-[10px]">
              <ClipboardList className="w-3 h-3 mr-1" />
              {allowanceCount} allowance{allowanceCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="bg-red-500/12 text-red-300 border-red-500/25 text-[10px]">
              {highCount} high
            </Badge>
          )}
          {mediumCount > 0 && (
            <Badge className="bg-amber-500/12 text-amber-300 border-amber-500/25 text-[10px]">
              {mediumCount} review
            </Badge>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {topFindings.map(finding => (
          <div
            key={finding.id}
            className="px-4 py-3 grid grid-cols-1 md:grid-cols-[160px_1fr_auto] gap-3 items-start"
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  finding.severity === "high"
                    ? "bg-red-400"
                    : finding.severity === "medium"
                      ? "bg-amber-400"
                      : "bg-blue-400"
                }`}
              />
              <span className="text-xs uppercase tracking-wider text-cream-muted">
                {finding.kind.replace("_", " ")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-cream font-medium">{finding.title}</p>
              <p className="text-xs text-cream-muted mt-0.5">
                {finding.message}
              </p>
              <p className="text-xs text-amber-200/80 mt-1">{finding.action}</p>
              {finding.laborMatchStatus === "review_before_labor" && (
                <Badge className="bg-indigo-500/12 text-indigo-300 border-indigo-500/25 text-[10px] mt-2">
                  Review before labor match
                </Badge>
              )}
              {finding.allowancePreset && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <p className="text-xs text-emerald-200/75">
                    Suggested allowance: {finding.allowancePreset.description} (
                    {formatCurrency(finding.allowancePreset.amount, currency)})
                  </p>
                  {onAddAllowance && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAddAllowance(finding.allowancePreset!)}
                      className="h-6 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 text-[10px] px-2"
                    >
                      Add allowance
                    </Button>
                  )}
                </div>
              )}
            </div>
            {finding.amountCents ? (
              <span className="font-mono text-xs text-cream text-right md:pt-0.5">
                {formatCurrency(finding.amountCents, currency)}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {findings.length > topFindings.length && (
        <div className="px-4 py-2 border-t border-white/5 text-xs text-cream-muted">
          {findings.length - topFindings.length} additional QA item
          {findings.length - topFindings.length !== 1 ? "s" : ""} will export to
          the Residential QA worksheet.
        </div>
      )}
    </div>
  );
}

function MarkupInput({
  label,
  value,
  onChange,
  hint,
}: {
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
          onChange={e => {
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

function WaterfallRow({
  label,
  value,
  currency,
  bold,
  accent,
}: {
  label: string;
  value: number;
  currency: string;
  bold?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-1 ${bold ? "font-semibold" : ""}`}
    >
      <span
        className={`text-xs ${accent ? "text-amber-400" : bold ? "text-cream" : "text-cream-muted"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-xs ${accent ? "text-amber-400 text-sm" : bold ? "text-cream" : "text-cream-muted"}`}
      >
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}
