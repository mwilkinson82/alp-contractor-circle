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
  ChevronDown,
  ChevronRight,
  DollarSign,
  Percent,
  TrendingUp,
  FileSpreadsheet,
  Users,
  Sparkles,
  Loader2,
  Layers,
  X,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
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
      return "bg-amber-500/12 text-amber-200 border-amber-500/25";
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
  acceptedDirectCost?: number;
  onOpenReview?: () => void;
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
  acceptedDirectCost,
  onOpenReview,
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
    let materialItemsMissing = 0;
    let quantityItemsMissing = 0;
    let bidReadyItems = 0;
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
      const materialUnitCost = getMaterialUnitCost(item);
      const itemMaterial = qty * materialUnitCost;
      if (qty <= 0) quantityItemsMissing++;
      if (materialUnitCost <= 0) materialItemsMissing++;
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
            laborSourceLabel: "Library Labor - Confirm",
            laborNote:
              "Library labor basis is included until you confirm a crew rate.",
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
          laborSourceLabel: "Library Labor - Confirm",
          laborNote:
            "Library labor basis is included until you confirm a crew rate.",
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
      if (
        qty > 0 &&
        materialUnitCost > 0 &&
        (laborEstimate.laborSource === "my_crew" ||
          laborEstimate.laborSource === "manual")
      ) {
        bidReadyItems++;
      }
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
      materialItemsMissing,
      quantityItemsMissing,
      bidReadyItems,
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

  const laborNeedsAttention =
    calculations.laborItemsHeldForReview + calculations.laborItemsWithoutLabor;
  const materialNeedsAttention =
    calculations.materialItemsMissing + calculations.quantityItemsMissing;
  const defaultLaborCount = calculations.laborItemsDefaulted;
  const hasOpenScope = reviewQueueCount > 0;
  const markupPctTotal =
    generalConditionsPct +
    overheadPct +
    profitPct +
    contingencyPct +
    bondPct +
    taxPct;
  const costedItems = Math.max(
    0,
    calculations.totalItems -
      calculations.materialItemsMissing -
      calculations.quantityItemsMissing -
      calculations.laborItemsHeldForReview -
      calculations.laborItemsWithoutLabor
  );
  const pricedRowsPct =
    calculations.totalItems > 0 ? costedItems / calculations.totalItems : 0;
  const readinessPct = Math.min(
    100,
    Math.round(
      pricedRowsPct * 45 +
        (hasOpenScope ? 0 : 25) +
        (defaultLaborCount > 0 || laborNeedsAttention > 0
          ? calculations.laborItemsMatched > 0
            ? 10
            : 0
          : 20) +
        (markupPctTotal > 0 ? 10 : 0)
    )
  );
  const readinessDetail = hasOpenScope
    ? `${reviewQueueCount} scope package${reviewQueueCount !== 1 ? "s" : ""} still pending.`
    : defaultLaborCount > 0
      ? `${defaultLaborCount} row${defaultLaborCount !== 1 ? "s are" : " is"} priced with library labor awaiting confirmation.`
      : laborNeedsAttention > 0
        ? `${laborNeedsAttention} labor decision${laborNeedsAttention !== 1 ? "s" : ""} still open.`
        : "Accepted scope is priced and ready for submit prep.";
  const markupProfileLabel =
    markupPctTotal > 0
      ? `${pctToDisplay(overheadPct + profitPct)}% O/H + profit`
      : "No markup set";
  const acceptedDirect = acceptedDirectCost ?? calculations.directCost;
  const estimateDirectDelta = calculations.directCost - acceptedDirect;
  const hasDirectDelta = Math.abs(estimateDirectDelta) >= 1;
  const markupAndTax = calculations.grandTotal - calculations.directCost;
  const laborBasisOpen = defaultLaborCount + laborNeedsAttention;
  const laborBasisConfirmed = Math.max(
    0,
    calculations.totalItems - laborBasisOpen
  );
  const scopeReadinessPct = hasOpenScope ? 62 : 100;
  const pricingReadinessPct =
    calculations.totalItems > 0 ? Math.round(pricedRowsPct * 100) : 100;
  const laborReadinessPct =
    calculations.totalItems > 0
      ? Math.round((laborBasisConfirmed / calculations.totalItems) * 100)
      : 100;
  const markupReadinessPct = markupPctTotal > 0 ? 100 : 0;
  const proposalReadinessPct =
    hasOpenScope ||
    materialNeedsAttention > 0 ||
    laborNeedsAttention > 0 ||
    defaultLaborCount > 0 ||
    markupPctTotal === 0
      ? 0
      : 100;
  const attentionItems = [
    hasOpenScope
      ? {
          tone: "amber",
          label: "Scope",
          title: "Finish scope review",
          detail: `${reviewQueueCount} high-impact package${reviewQueueCount !== 1 ? "s" : ""} holding ${formatCurrency(reviewQueueCost, currency)} out of the bid.`,
          cta: "Open Review",
          action: onOpenReview,
        }
      : null,
    materialNeedsAttention > 0
      ? {
          tone: "red",
          label: "Cost",
          title: "Resolve missing pricing",
          detail: `${materialNeedsAttention} accepted item${materialNeedsAttention !== 1 ? "s need" : " needs"} pricing cleanup before submit.`,
          cta: "Review Rows",
          action: undefined as (() => void) | undefined,
        }
      : null,
    laborNeedsAttention > 0 || defaultLaborCount > 0
      ? {
          tone: defaultLaborCount > 0 ? "blue" : "amber",
          label: "Labor",
          title: hasUserCrews
            ? "Confirm labor basis"
            : "Crew labor is not set up",
          detail: hasUserCrews
            ? `${laborBasisOpen} item${laborBasisOpen !== 1 ? "s are" : " is"} using default/library labor or still need an explicit labor call.`
            : "Build your crews once, then apply them to accepted scope.",
          cta: hasUserCrews ? "Confirm Labor" : "Set Up Crews",
          action: handleLaborCta,
        }
      : null,
    markupPctTotal === 0
      ? {
          tone: "amber",
          label: "Markup",
          title: "Markup profile is empty",
          detail:
            "Set general conditions, overhead, profit, contingency, bond, or tax before submit.",
          cta: "Save Markups",
          action: handleSave,
        }
      : null,
  ].filter(Boolean) as Array<{
    tone: "amber" | "red" | "blue";
    label: string;
    title: string;
    detail: string;
    cta: string;
    action?: () => void;
  }>;
  const primaryAttention = attentionItems[0];
  const estimateModeLabel =
    hasOpenScope || materialNeedsAttention > 0 || laborNeedsAttention > 0
      ? "Draft"
      : defaultLaborCount > 0
        ? "Price review"
        : "Bid-ready";
  const readinessChecks = [
    { label: "Scope Review", value: scopeReadinessPct },
    { label: "Pricing", value: pricingReadinessPct },
    { label: "Labor Basis", value: laborReadinessPct },
    { label: "Markup", value: markupReadinessPct },
    { label: "Proposal", value: proposalReadinessPct },
  ];

  return (
    <div className="space-y-7">
      <div className="overflow-hidden rounded-xl border border-[#cdbb98] bg-[#f7f3ea] text-[#171714] shadow-[0_28px_90px_rgba(40,34,22,0.22)]">
        <div className="border-b border-[#d8c9ad] bg-white/55 px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6a19]">
                ConstructLine 2.0
              </p>
              <h2 className="mt-1 text-2xl font-semibold">
                Estimate Command Center
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-[#d3b156] bg-[#fff7da] text-[#8a6510]">
                {estimateModeLabel}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportEstimate}
                className="border-[#c8b895] bg-white/55 text-[#29251c] hover:bg-white gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="bg-white/45 p-5 lg:p-6">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.7fr)]">
              <div>
                <p className="text-sm font-semibold text-[#716855]">
                  {estimateModeLabel === "Bid-ready" ? "Ready Bid Total" : "Draft Bid Total"}
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-normal text-[#11100c]">
                  {formatCurrency(calculations.grandTotal, currency)}
                </p>
                <div className="mt-4 rounded-xl border border-[#cdbb98] bg-[#fffdf8] p-4 shadow-[0_14px_34px_rgba(41,37,28,0.08)]">
                  <div className="flex items-center justify-between gap-4 border-b border-[#eadcc4] pb-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#716855]">
                      Accepted Direct Cost
                    </span>
                    <span className="font-mono text-sm font-semibold text-emerald-800">
                      {formatCurrency(acceptedDirect, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-[#eadcc4] py-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#716855]">
                      Markup + Tax
                    </span>
                    <span className="font-mono text-sm font-semibold text-[#8a6510]">
                      {formatCurrency(markupAndTax, currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 pt-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#171714]">
                      {estimateModeLabel === "Bid-ready" ? "Ready Bid Total" : "Draft Bid Total"}
                    </span>
                    <span className="font-mono text-lg font-bold text-[#171714]">
                      {formatCurrency(calculations.grandTotal, currency)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#716855]">
                    Accepted Direct Cost is the top header number. Bid Total adds markup and tax so the estimator sees the final bid math in one place.
                  </p>
                  {hasDirectDelta && (
                    <p className="mt-2 text-[11px] text-[#8a6510]">
                      Estimate direct is{" "}
                      {formatCurrency(Math.abs(estimateDirectDelta), currency)}{" "}
                      {estimateDirectDelta > 0 ? "higher" : "lower"} than the
                      takeoff header because Estimate rebuilds the number from
                      material, labor basis, and allowances.
                    </p>
                  )}
                </div>
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <CommandMetric
                    label="Accepted Direct Cost"
                    value={formatCurrency(acceptedDirect, currency)}
                    tone="green"
                  />
                  <CommandMetric
                    label="Pending scope"
                    value={formatCurrency(reviewQueueCost, currency)}
                    tone={hasOpenScope ? "amber" : "gray"}
                  />
                  <CommandMetric
                    label="Labor Basis"
                    value={`${laborBasisConfirmed} of ${calculations.totalItems} confirmed`}
                    tone="blue"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#cdbb98] bg-[#fffdf8] p-4 shadow-[0_14px_34px_rgba(41,37,28,0.08)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#716855]">
                      Bid Readiness
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#716855]">
                      {readinessDetail}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-3xl font-semibold ${
                      readinessPct >= 80
                        ? "text-emerald-700"
                        : readinessPct >= 50
                          ? "text-[#a66d00]"
                          : "text-orange-700"
                    }`}
                  >
                    {readinessPct}%
                  </span>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#ddd2bd]">
                  <div
                    className={
                      readinessPct >= 80
                        ? "h-full rounded-full bg-emerald-600"
                        : readinessPct >= 50
                          ? "h-full rounded-full bg-[#d9a21a]"
                          : "h-full rounded-full bg-orange-600"
                    }
                    style={{ width: `${Math.min(100, readinessPct)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs font-medium text-[#5d5546]">
                  {costedItems} of {calculations.totalItems} accepted rows have
                  pricing.
                </p>
                <div className="mt-4 space-y-2">
                  {readinessChecks.map(check => (
                    <div key={check.label} className="grid grid-cols-[112px_minmax(0,1fr)_38px] items-center gap-2">
                      <span className="text-[11px] font-medium text-[#716855]">
                        {check.label}
                      </span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#ddd2bd]">
                        <div
                          className={
                            check.value >= 80
                              ? "h-full rounded-full bg-emerald-600"
                              : check.value >= 50
                                ? "h-full rounded-full bg-[#d9a21a]"
                                : "h-full rounded-full bg-orange-600"
                          }
                          style={{ width: `${Math.min(100, check.value)}%` }}
                        />
                      </div>
                      <span className="text-right font-mono text-[11px] font-semibold text-[#5d5546]">
                        {check.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
              <PipelineStep
                label="Scope Review"
                value={
                  hasOpenScope
                    ? `${reviewQueueCount} decisions open`
                    : "Scope clear"
                }
                active={hasOpenScope}
                complete={!hasOpenScope}
                tone="amber"
              />
              <PipelineStep
                label="Pricing Review"
                value={
                  laborBasisOpen > 0
                    ? `${laborBasisOpen} labor basis decisions`
                    : "Costs ready"
                }
                active={!hasOpenScope}
                complete={
                  !hasOpenScope &&
                  defaultLaborCount === 0 &&
                  laborNeedsAttention === 0
                }
                tone="blue"
              />
              <PipelineStep
                label="Proposal"
                value={
                  attentionItems.length > 0
                    ? "Not ready"
                    : "Ready to package"
                }
                active={attentionItems.length === 0}
                complete={attentionItems.length === 0}
                tone="green"
              />
            </div>
          </div>

          <div className="border-t border-[#d8c9ad] bg-[#ebe0cc] p-5 lg:border-l lg:border-t-0 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f5542]">
                Decision Queue
              </h3>
              {primaryAttention?.action ? (
                <Button
                  size="sm"
                  onClick={primaryAttention.action}
                  disabled={
                    inferByTasksMutation.isPending || saveMutation.isPending
                  }
                  className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                >
                  {primaryAttention.cta.includes("Labor") ? (
                    <Layers className="h-3.5 w-3.5" />
                  ) : primaryAttention.cta.includes("Review") ? (
                    <ClipboardList className="h-3.5 w-3.5" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {primaryAttention.cta}
                </Button>
              ) : null}
            </div>
            <div className="mt-4 space-y-3">
              {attentionItems.length > 0 ? (
                attentionItems.slice(0, 3).map((item, index) => (
                  <div
                    key={`${item.label}-${item.title}`}
                    className="rounded-lg border border-[#d2c2a1] bg-white/78 p-3 shadow-[0_10px_24px_rgba(41,37,28,0.06)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#171714] text-[11px] font-semibold text-white">
                        {index + 1}
                      </span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          item.tone === "red"
                            ? "bg-red-600"
                            : item.tone === "blue"
                              ? "bg-blue-600"
                              : "bg-[#d99a16]"
                        }`}
                      />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#716855]">
                        {item.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#171714]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#716855]">
                      {item.detail}
                    </p>
                    {item.action ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={item.action}
                        disabled={
                          inferByTasksMutation.isPending ||
                          saveMutation.isPending
                        }
                        className="mt-3 h-8 border-[#c8b895] bg-white text-[#29251c] hover:bg-[#faf8f2]"
                      >
                        {item.cta}
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3">
                  <p className="text-sm font-semibold text-emerald-900">
                    Estimate is ready to package
                  </p>
                  <p className="mt-1 text-xs text-emerald-800">
                    Accepted scope, labor basis, and markups are clear.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {enableResidentialQa && (
        <ResidentialQaPanel
          findings={residentialQaFindings}
          currency={currency}
          allowanceCount={allowances.length}
          onAddAllowance={onAddAllowance}
        />
      )}

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

      {/* Estimate cockpit: cost table + bid rail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-[#171714] font-semibold text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-700" />
                Direct Cost Breakdown
              </h3>
              <p className="mt-1 text-xs text-[#716855]">
                Accepted scope grouped by division with pricing and labor basis
                decisions.
              </p>
            </div>
            <Badge className="bg-white/80 text-[#716855] border-[#d7c7aa]">
              {calculations.totalItems} accepted rows
            </Badge>
          </div>

          <div className="border border-[#d7c7aa] rounded-xl overflow-hidden bg-[#f4efe4] text-[#171714] shadow-[0_18px_45px_rgba(41,37,28,0.1)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#eee4d2] border-b border-[#d7c7aa]">
                  <th className="text-left text-[#716855] font-semibold px-4 py-2.5 text-xs uppercase tracking-wider">
                    Division
                  </th>
                  <th className="text-left text-[#716855] font-semibold px-4 py-2.5 text-xs uppercase tracking-wider w-36">
                    Status
                  </th>
                  <th className="text-right text-[#716855] font-semibold px-4 py-2.5 text-xs uppercase tracking-wider w-32">
                    Material
                  </th>
                  <th className="text-right text-[#716855] font-semibold px-4 py-2.5 text-xs uppercase tracking-wider w-32">
                    Labor Basis
                  </th>
                  <th className="text-right text-[#716855] font-semibold px-4 py-2.5 text-xs uppercase tracking-wider w-32">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {calculations.divisionOrder.map(div => {
                  const data = calculations.byDivision[div];
                  const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
                  const divTotal = data.materialTotal + data.laborTotal;
                  const divMissingInputs = data.items.filter((item: any) => {
                    const labor = calculations.itemLaborEstimates.get(item.id);
                    return (
                      (parseFloat(item.quantity) || 0) <= 0 ||
                      getMaterialUnitCost(item) <= 0 ||
                      labor?.laborSource === "held_for_review" ||
                      labor?.laborSource === "none"
                    );
                  }).length;
                  const divDefaultLabor = data.items.filter((item: any) => {
                    const labor = calculations.itemLaborEstimates.get(item.id);
                    return labor?.laborSource === "cost_library";
                  }).length;
                  const divStatus =
                    divMissingInputs > 0
                      ? "Needs review"
                      : divDefaultLabor > 0
                        ? "Confirm labor"
                        : "Bid-ready";

                  return (
                    <Fragment key={div}>
                      <tr
                        key={div}
                        className="border-b border-[#d7c7aa] hover:bg-white/65 cursor-pointer"
                        onClick={() => toggleDivision(div)}
                      >
                        <td className="px-4 py-2.5 text-[#171714]">
                          <div className="flex items-center gap-2">
                            {collapsedDivisions.has(div) ? (
                              <ChevronRight className="w-3.5 h-3.5 text-cream-muted" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-cream-muted" />
                            )}
                            <span className="font-mono text-[#8a6510] text-xs">
                              {div}
                            </span>
                            <span>{divName}</span>
                            <Badge className="bg-white/70 text-[#716855] border-[#d7c7aa] text-[10px] ml-1">
                              {data.items.length}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge
                            status={divStatus}
                            detail={
                              divMissingInputs > 0
                                ? `${divMissingInputs} row${divMissingInputs !== 1 ? "s" : ""}`
                                : divDefaultLabor > 0
                                  ? `${divDefaultLabor} to confirm`
                                  : "Ready"
                            }
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#171714] font-mono text-xs">
                          {formatCurrency(data.materialTotal, currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#171714] font-mono text-xs">
                          {data.laborTotal > 0 ? (
                            formatCurrency(data.laborTotal, currency)
                          ) : (
                            <span className="text-[#716855]/50">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[#171714] font-mono text-xs font-medium">
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
                          const rowStatus =
                            qty <= 0 || getMaterialUnitCost(item) <= 0
                              ? "Missing cost"
                              : labor?.laborSource === "held_for_review" ||
                                  labor?.laborSource === "none"
                                ? "Needs review"
                                : labor?.laborSource === "cost_library"
                                  ? "Confirm labor"
                                  : "Bid-ready";
                          return (
                            <tr
                              key={`${div}-${item.id}`}
                              className="border-b border-[#d7c7aa]/70 bg-white/45"
                            >
                              <td className="px-8 py-2 text-[#29251c]">
                                <p className="text-xs line-clamp-1">
                                  {item.description}
                                </p>
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                  {labor?.laborSource !== "cost_library" && (
                                    <Badge
                                      className={`text-[10px] border ${getLaborSourceBadgeClass(labor?.laborSource || "none")}`}
                                    >
                                      {labor?.laborSourceLabel || "No Labor"}
                                    </Badge>
                                  )}
                                  {labor?.laborNote && (
                                    <span className="text-[10px] text-[#716855] line-clamp-1">
                                      {labor.laborNote}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <StatusBadge status={rowStatus} compact />
                              </td>
                              <td className="px-4 py-2 text-right text-[#5d5546] font-mono text-xs">
                                {formatCurrency(materialTotal, currency)}
                              </td>
                              <td className="px-4 py-2 text-right text-[#5d5546] font-mono text-xs">
                                {laborTotal > 0
                                  ? formatCurrency(laborTotal, currency)
                                  : "—"}
                              </td>
                              <td className="px-4 py-2 text-right text-[#5d5546] font-mono text-xs">
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
                  <tr className="border-b border-[#d7c7aa] bg-[#fff4cb]/60">
                    <td className="px-4 py-2.5 text-[#171714]">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-3.5 h-3.5 text-amber-400" />
                        <span>Allowances</span>
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px] ml-1">
                          {allowances.length}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status="Bid allowance" compact />
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#716855]/50 font-mono text-xs">
                      —
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#716855]/50 font-mono text-xs">
                      —
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#8a6510] font-mono text-xs font-medium">
                      {formatCurrency(calculations.allowancesTotal, currency)}
                    </td>
                  </tr>
                )}
                <tr className="bg-[#17130c] border-t border-[#3a2e1d]">
                  <td className="px-4 py-3 text-[#f4efe4] font-semibold">
                    Direct Costs Total
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={attentionItems.length > 0 ? "Draft" : "Bid-ready"}
                      compact
                    />
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-400 font-mono text-sm font-semibold">
                    {formatCurrency(calculations.totalMaterial, currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-400 font-mono text-sm font-semibold">
                    {calculations.totalLabor > 0
                      ? formatCurrency(calculations.totalLabor, currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-[#f4efe4] font-mono text-sm font-bold">
                    {formatCurrency(calculations.directCost, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 shadow-[0_16px_40px_rgba(6,95,70,0.1)]">
            <p className="text-[10px] uppercase tracking-wider text-emerald-800/75">
              {estimateModeLabel === "Bid-ready" ? "Ready Bid Total" : "Draft Bid Total"}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold text-emerald-800">
              {formatCurrency(calculations.grandTotal, currency)}
            </p>
            <div className="mt-3 space-y-1.5 border-t border-emerald-300 pt-3">
              <WaterfallRow
                label="Accepted direct cost"
                value={acceptedDirect}
                currency={currency}
              />
              <WaterfallRow
                label="Markup + tax"
                value={markupAndTax}
                currency={currency}
              />
            </div>
          </div>

          <div className="bg-[#f4efe4] border border-[#d7c7aa] rounded-xl p-4 space-y-3 text-[#171714]">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[#171714] font-semibold text-sm flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#8a6510]" />
                Markup Profile
              </h3>
              <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]">
                {markupProfileLabel}
              </Badge>
            </div>
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
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="mt-1 w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Save Markups
                </>
              )}
            </Button>
          </div>

          <div className="bg-[#f4efe4] border border-[#d7c7aa] rounded-xl p-4 space-y-2 text-[#171714]">
            <h4 className="text-[#171714] font-medium text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#8a6510]" />
              Cost Waterfall
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
            <div className="border-t border-[#d7c7aa] pt-2 mt-2">
              <WaterfallRow
                label="GRAND TOTAL"
                value={calculations.grandTotal}
                currency={currency}
                bold
                accent
              />
            </div>
          </div>

          <div
            className={`rounded-xl border p-4 ${
              hasOpenScope
                ? "border-[#d7b44d] bg-[#fff4cb]"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <div className="flex items-start gap-3">
              {hasOpenScope ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 text-[#8a6510]" />
              ) : (
                <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-700" />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-[#171714]">
                  Pending Scope
                </h4>
                <p className="mt-1 text-xs leading-5 text-[#716855]">
                  {hasOpenScope
                    ? `${reviewQueueCount} review package${reviewQueueCount !== 1 ? "s are" : " is"} visible but not counted until accepted.`
                    : excludedBoundaryCount > 0
                      ? `${excludedBoundaryCount} excluded boundary item${excludedBoundaryCount !== 1 ? "s remain" : " remains"} available for audit.`
                      : "No pending review scope is affecting this bid total."}
                </p>
                <p className="mt-2 font-mono text-sm text-[#8a6510]">
                  {formatCurrency(reviewQueueCost, currency)}
                </p>
                {onOpenReview && hasOpenScope ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onOpenReview}
                    className="mt-3 h-8 border-[#d7b44d] bg-white/80 text-[#8a6510] hover:bg-white"
                  >
                    Open Review
                  </Button>
                ) : null}
              </div>
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

function CommandMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red" | "blue" | "gray";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-[#d9bb65] bg-[#fff5d4] text-[#7a5600]"
        : tone === "red"
          ? "border-red-200 bg-red-50 text-red-900"
          : tone === "blue"
            ? "border-blue-200 bg-blue-50 text-blue-900"
            : "border-[#d7c7aa] bg-white/60 text-[#5d5546]";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
        {label}
      </p>
      <p className="mt-1 truncate font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

function PipelineStep({
  label,
  value,
  active,
  complete,
  tone,
}: {
  label: string;
  value: string;
  active: boolean;
  complete: boolean;
  tone: "green" | "amber" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-300 bg-emerald-50 text-emerald-900"
      : tone === "blue"
        ? "border-blue-300 bg-blue-50 text-blue-900"
        : "border-[#d7b44d] bg-[#fff4cb] text-[#755200]";

  return (
    <div
      className={`rounded-lg border p-3 ${
        active || complete
          ? toneClass
          : "border-[#d7c7aa] bg-white/45 text-[#766b57]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">
          {label}
        </p>
        {complete ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : active ? (
          <AlertTriangle className="h-4 w-4" />
        ) : null}
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({
  status,
  detail,
  compact,
}: {
  status: string;
  detail?: string;
  compact?: boolean;
}) {
  const normalized = status.toLowerCase();
  const className = normalized.includes("ready")
    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
    : normalized.includes("confirm")
      ? "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]"
      : normalized.includes("allowance")
        ? "bg-blue-50 text-blue-800 border-blue-200"
      : normalized.includes("missing") || normalized.includes("draft")
        ? "bg-orange-50 text-orange-800 border-orange-200"
        : "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]";

  return (
    <Badge
      className={`border ${className} ${compact ? "text-[10px]" : "text-[10px]"} max-w-full`}
    >
      <span className="truncate">{status}</span>
      {detail && (
        <span className="ml-1 text-current/65 truncate">· {detail}</span>
      )}
    </Badge>
  );
}

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
        <p className="text-[#171714] text-xs font-medium">{label}</p>
        <p className="text-[#716855] text-[10px] truncate">{hint}</p>
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
          className="w-20 h-7 text-xs text-right bg-white/70 border-[#d7c7aa] text-[#171714] px-2"
        />
        <span className="text-[#716855] text-xs">%</span>
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
        className={`text-xs ${accent ? "text-[#8a6510]" : bold ? "text-[#171714]" : "text-[#716855]"}`}
      >
        {label}
      </span>
      <span
        className={`font-mono text-xs ${accent ? "text-[#8a6510] text-sm" : bold ? "text-[#171714]" : "text-[#716855]"}`}
      >
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}
