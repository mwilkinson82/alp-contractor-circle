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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Eye,
  FileImage,
  Send,
} from "lucide-react";
import {
  getResolvedBaseWage,
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

const LIGHT_OUTLINE_BUTTON_CLASS =
  "border-[#c8b895] bg-white/70 text-[#29251c] hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714] focus-visible:!text-[#171714]";

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
      return "bg-blue-50 text-[#244c91] border-blue-200";
    case "cost_library":
      return "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]";
    case "manual":
      return "bg-[#f1eee6] text-[#716855] border-[#d7c7aa]";
    case "held_for_review":
      return "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]";
    default:
      return "bg-white text-[#716855] border-[#d7c7aa]";
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

function getSheetDisplayName(sheet: any): string {
  if (!sheet) return "Source not linked";
  return (
    sheet.sheetNumber ||
    sheet.sheetName ||
    sheet.name ||
    sheet.filename ||
    `Sheet ${sheet.pageNumber || sheet.id}`
  );
}

type EstimateQaAnomaly = {
  id?: string;
  severity?: string;
  category?: string;
  title?: string;
  description?: string;
  amount?: number;
  items?: any[];
  itemReviews?: Record<string, EstimateQaItemReview>;
};

type EstimateQaItemReview = {
  reason?: string;
  action?: string;
};

function getEstimateItemKey(item: any): string {
  return String(item?.id ?? item?.itemId ?? item?.description ?? "");
}

function getQaItemReview(
  anomaly: EstimateQaAnomaly,
  item: any
): EstimateQaItemReview {
  const key = getEstimateItemKey(item);
  return (key && anomaly.itemReviews?.[key]) || {};
}

function getQaSampleNotes(anomaly: EstimateQaAnomaly): string {
  return (anomaly.items || [])
    .slice(0, 3)
    .map(item => getQaItemReview(anomaly, item).reason)
    .filter(Boolean)
    .join(" | ");
}

interface EstimateSummaryProps {
  projectId: number;
  projectName?: string;
  projectDescription?: string;
  items: any[];
  sheets?: any[];
  allowances?: Array<{ description?: string | null; amount?: number | null }>;
  onAddAllowance?: (allowance: { description: string; amount: number }) => void;
  currency: string;
  costRegion?: string | null;
  enableResidentialQa?: boolean;
  reviewQueueCount?: number;
  reviewQueueCost?: number;
  excludedBoundaryCount?: number;
  acceptedDirectCost?: number;
  qaAnomalies?: EstimateQaAnomaly[];
  onOpenReview?: () => void;
  onOpenSubmit?: () => void;
  onOpenSourceItem?: (item: any) => void;
  submitOnly?: boolean;
}

export default function EstimateSummary({
  projectId,
  projectName,
  projectDescription,
  items,
  sheets = [],
  allowances = [],
  onAddAllowance,
  currency,
  costRegion,
  enableResidentialQa = false,
  reviewQueueCount = 0,
  reviewQueueCost = 0,
  excludedBoundaryCount = 0,
  acceptedDirectCost,
  qaAnomalies = [],
  onOpenReview,
  onOpenSubmit,
  onOpenSourceItem,
  submitOnly = false,
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
  const sheetById = useMemo(
    () =>
      new Map((sheets || []).map((sheet: any) => [String(sheet.id), sheet])),
    [sheets]
  );

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
  const [selectedLaborItem, setSelectedLaborItem] = useState<any | null>(null);
  const [laborCrewId, setLaborCrewId] = useState("");
  const [laborProductivity, setLaborProductivity] = useState("1");
  const [laborNotes, setLaborNotes] = useState("");

  const confirmLaborMutation =
    trpc.estimate.confirmLaborAssignments.useMutation({
      onSuccess: result => {
        toast.success(result.message);
        utils.tradeRates.getActivityProductivity.invalidate();
        setShowReviewPanel(false);
        setReviewAssignments(null);
        setSelectedLaborItem(null);
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

  const getSuggestedProductivity = (item: any, crewId: number | null) => {
    if (!crewId) return 1;
    const descKey = `${(item.description || "").toLowerCase()}|${(item.unit || "").toLowerCase()}`;
    const existingActivity = activityMap.get(descKey);
    if (
      existingActivity?.crewId === crewId &&
      existingActivity.productivityPerCrewHr > 0
    ) {
      return existingActivity.productivityPerCrewHr;
    }
    const crewInfo = crewCostMap.get(crewId);
    const libraryLaborUnit = parseCents(item.laborCost);
    if (crewInfo?.costPerHr && libraryLaborUnit > 0) {
      return Math.max(0.01, crewInfo.costPerHr / libraryLaborUnit);
    }
    return 1;
  };

  const openItemLaborEditor = (item: any) => {
    if (!hasUserCrews) {
      toast.error(
        "Set up your real crews before confirming labor on this item."
      );
      window.location.href = "/portal/labor-library?tab=crews";
      return;
    }
    const descKey = `${(item.description || "").toLowerCase()}|${(item.unit || "").toLowerCase()}`;
    const existingActivity = activityMap.get(descKey);
    const fallbackCrew = userCrews[0] || crewsData?.[0];
    const nextCrewId = existingActivity?.crewId || fallbackCrew?.id || null;
    setSelectedLaborItem(item);
    setLaborCrewId(nextCrewId ? String(nextCrewId) : "");
    setLaborProductivity(
      getSuggestedProductivity(item, nextCrewId).toFixed(2).replace(/\.00$/, "")
    );
    setLaborNotes(
      existingActivity?.source === "ai_inferred"
        ? "Confirmed from estimate labor review."
        : "Manual labor confirmation from Estimate."
    );
  };

  const handleSaveItemLabor = () => {
    if (!selectedLaborItem) return;
    const crewId = parseInt(laborCrewId, 10);
    const productivityPerCrewHr = parseFloat(laborProductivity);
    if (!crewId || Number.isNaN(crewId)) {
      toast.error("Choose a crew before saving labor.");
      return;
    }
    if (!Number.isFinite(productivityPerCrewHr) || productivityPerCrewHr <= 0) {
      toast.error("Enter production greater than zero.");
      return;
    }
    confirmLaborMutation.mutate({
      projectId,
      assignments: [
        {
          description: selectedLaborItem.description || "",
          unit: selectedLaborItem.unit || "",
          csiDivision: selectedLaborItem.csiDivision || "00",
          crewId,
          productivityPerCrewHr,
          notes: laborNotes || "Manual labor confirmation from Estimate.",
        },
      ],
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
        const baseWage =
          getResolvedBaseWage(m.tradeName, m.classification, lt, userRateMap) ??
          0;
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
  const qaActionAnomalies = useMemo(
    () => qaAnomalies.filter(anomaly => anomaly.severity !== "reference"),
    [qaAnomalies]
  );
  const qaBlockerCount = qaActionAnomalies.filter(
    anomaly => anomaly.severity === "blocker"
  ).length;
  const qaReviewCount = qaActionAnomalies.length;
  const qaReviewAmount = qaActionAnomalies.reduce(
    (sum, anomaly) => sum + Number(anomaly.amount || 0),
    0
  );

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
    if (qaAnomalies.length > 0) {
      const qaRows = qaAnomalies.map(anomaly => ({
        Severity: String(anomaly.severity || "review").toUpperCase(),
        Category: anomaly.category || "",
        Finding: anomaly.title || "",
        "Rows Shown": anomaly.items?.length || 0,
        "Value At Stake": anomaly.amount
          ? (Number(anomaly.amount) / 100).toFixed(2)
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
        "Sample Row Notes": getQaSampleNotes(anomaly),
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(qaRows),
        "ConstructLine QA"
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
        <Calculator className="w-12 h-12 text-[#8a806d]/40 mb-4" />
        <h3 className="text-[#171714] font-semibold text-lg mb-2">
          No Takeoff Items Yet
        </h3>
        <p className="text-[#716855] text-sm max-w-md">
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
  const hasQaBlockers = qaBlockerCount > 0;
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
  const readinessScore =
    pricedRowsPct * 45 +
    (hasOpenScope ? 0 : 25) +
    (defaultLaborCount > 0 || laborNeedsAttention > 0
      ? calculations.laborItemsMatched > 0
        ? 10
        : 0
      : 20) +
    (markupPctTotal > 0 ? 10 : 0) -
    (hasQaBlockers ? 20 : qaReviewCount > 0 ? 8 : 0);
  const readinessPct = Math.min(100, Math.max(0, Math.round(readinessScore)));
  const readinessDetail = hasQaBlockers
    ? `${qaBlockerCount} ConstructLine QA blocker${qaBlockerCount !== 1 ? "s need" : " needs"} estimator review.`
    : hasOpenScope
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
  const markupAndTax = Math.max(0, calculations.grandTotal - acceptedDirect);
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
  const qaReadinessPct = hasQaBlockers ? 0 : qaReviewCount > 0 ? 72 : 100;
  const proposalReadinessPct =
    hasOpenScope ||
    hasQaBlockers ||
    qaReviewCount > 0 ||
    materialNeedsAttention > 0 ||
    laborNeedsAttention > 0 ||
    defaultLaborCount > 0 ||
    markupPctTotal === 0
      ? 0
      : 100;
  const clientPackageBlockers = [
    hasOpenScope
      ? `${reviewQueueCount} scope decision${reviewQueueCount !== 1 ? "s" : ""} still open`
      : null,
    qaReviewCount > 0
      ? hasQaBlockers
        ? `${qaBlockerCount} QA blocker${qaBlockerCount !== 1 ? "s" : ""} must be resolved`
        : `${qaReviewCount} QA review finding${qaReviewCount !== 1 ? "s" : ""} need estimator disposition`
      : null,
    materialNeedsAttention > 0
      ? `${materialNeedsAttention} accepted item${materialNeedsAttention !== 1 ? "s need" : " needs"} pricing or quantity cleanup`
      : null,
    laborNeedsAttention > 0
      ? `${laborNeedsAttention} labor decision${laborNeedsAttention !== 1 ? "s" : ""} still open`
      : null,
    defaultLaborCount > 0
      ? `${defaultLaborCount} row${defaultLaborCount !== 1 ? "s use" : " uses"} library labor and need confirmation`
      : null,
    markupPctTotal === 0 ? "Markup profile is empty" : null,
  ].filter(Boolean) as string[];
  const isClientPackageLocked = clientPackageBlockers.length > 0;
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
    hasQaBlockers
      ? {
          tone: "red",
          label: "QA",
          title: "Estimator review required",
          detail: `${qaBlockerCount} ConstructLine QA blocker${qaBlockerCount !== 1 ? "s are" : " is"} holding ${formatCurrency(qaReviewAmount, currency)} in reviewed value.`,
          cta: "Open QA Review",
          action: onOpenReview,
        }
      : qaReviewCount > 0
        ? {
            tone: "amber",
            label: "QA",
            title: "AI review items remain",
            detail: `${qaReviewCount} ConstructLine QA finding${qaReviewCount !== 1 ? "s" : ""} should be checked before sending.`,
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
  const estimateModeLabel = hasQaBlockers
    ? "Estimator review"
    : qaReviewCount > 0
      ? "Review draft"
      : hasOpenScope || materialNeedsAttention > 0 || laborNeedsAttention > 0
      ? "Draft"
      : defaultLaborCount > 0
        ? "Price review"
        : "Bid-ready";
  const readinessChecks = [
    { label: "Scope Review", value: scopeReadinessPct },
    { label: "Pricing", value: pricingReadinessPct },
    { label: "Labor Basis", value: laborReadinessPct },
    { label: "Estimator QA", value: qaReadinessPct },
    { label: "Markup", value: markupReadinessPct },
    { label: "Proposal", value: proposalReadinessPct },
  ];

  if (submitOnly) {
    return (
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
        sheets={sheets}
        qaAnomalies={qaAnomalies}
      />
    );
  }

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
                className={`${LIGHT_OUTLINE_BUTTON_CLASS} gap-1.5`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {isClientPackageLocked ? "Export Review Draft" : "Export"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="bg-white/45 p-5 lg:p-6">
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.7fr)]">
              <div>
                <p className="text-sm font-semibold text-[#716855]">
                  {estimateModeLabel === "Bid-ready"
                    ? "Ready Bid Total"
                    : "Draft Bid Total"}
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
                      {estimateModeLabel === "Bid-ready"
                        ? "Ready Bid Total"
                        : "Draft Bid Total"}
                    </span>
                    <span className="font-mono text-lg font-bold text-[#171714]">
                      {formatCurrency(calculations.grandTotal, currency)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#716855]">
                    Accepted Direct Cost is the top header number. Bid Total
                    adds markup and tax so the estimator sees the final bid math
                    in one place.
                  </p>
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
                    value={`${laborBasisConfirmed} / ${calculations.totalItems} confirmed`}
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
                    <div
                      key={check.label}
                      className="grid grid-cols-[112px_minmax(0,1fr)_38px] items-center gap-2"
                    >
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

            {isClientPackageLocked && (
              <div className="mt-5 rounded-xl border border-orange-300 bg-orange-50 p-4 text-orange-950 shadow-[0_14px_34px_rgba(154,83,0,0.08)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-700" />
                      <p className="text-sm font-semibold">
                        Client package locked for estimator review
                      </p>
                    </div>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-orange-900/80">
                      Internal exports remain available, but proposal and
                      owner-facing packaging should wait until these items are
                      cleared.
                    </p>
                  </div>
                  <Badge className="w-fit border-orange-300 bg-white text-orange-800">
                    Review draft
                  </Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {clientPackageBlockers.slice(0, 4).map(blocker => (
                    <div
                      key={blocker}
                      className="flex items-start gap-2 rounded-lg border border-orange-200 bg-white/70 px-3 py-2 text-xs text-orange-950"
                    >
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-700" />
                      <span>{blocker}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  isClientPackageLocked
                    ? "Locked for review"
                    : "Ready to package"
                }
                active={!isClientPackageLocked}
                complete={!isClientPackageLocked}
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
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-950">
                    Estimate is ready to submit
                  </p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    Accepted scope, labor basis, and markups are clear. Build
                    the proposal package next.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenSubmit}
                    className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-[#171714] px-4 text-xs font-semibold text-white shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition-colors hover:bg-[#29251c]"
                  >
                    <Send className="mr-2 h-3.5 w-3.5" />
                    Open Submit Package
                  </button>
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
        <div className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50 text-[#171714]">
          <div className="px-4 py-3 border-b border-blue-200 bg-white/75 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#244c91]" />
              <h3 className="text-sm font-semibold text-[#171714]">
                ConstructLine Labor Assignment Review
              </h3>
              <span className="text-xs text-[#244c91] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
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
                className="border-[#c8b895] bg-white text-[#5d5546] hover:bg-[#faf8f2] hover:text-[#171714] text-xs"
              >
                Close Review
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAssignments}
                disabled={confirmLaborMutation.isPending}
                className="bg-[#244c91] hover:bg-[#1b3c74] text-white gap-1.5 text-xs"
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
                <tr className="bg-[#f4efe4] border-b border-[#d7c7aa]">
                  <th className="text-left text-[#716855] font-medium px-3 py-2 w-8"></th>
                  <th className="text-left text-[#716855] font-medium px-3 py-2">
                    Item Description
                  </th>
                  <th className="text-left text-[#716855] font-medium px-3 py-2 w-16">
                    Unit
                  </th>
                  <th className="text-left text-[#716855] font-medium px-3 py-2 w-40">
                    Assigned Crew
                  </th>
                  <th className="text-right text-[#716855] font-medium px-3 py-2 w-32">
                    Output / Crew-Hour
                  </th>
                  <th className="text-left text-[#716855] font-medium px-3 py-2">
                    ConstructLine Reasoning
                  </th>
                </tr>
              </thead>
              <tbody>
                {reviewAssignments.map((a, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-[#eadcc4] transition-colors ${
                      a._excluded
                        ? "opacity-45 bg-orange-50"
                        : a.crewId
                          ? "bg-white/65 hover:bg-white"
                          : "bg-[#fff4cb]/55"
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
                            ? "border-red-300 bg-red-50 text-red-800"
                            : "border-emerald-300 bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {a._excluded ? "✕" : "✓"}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-[#29251c] max-w-xs">
                      <span className="line-clamp-2">{a.description}</span>
                    </td>
                    <td className="px-3 py-2 text-[#716855]">{a.unit}</td>
                    <td className="px-3 py-2">
                      {a.crewId ? (
                        <span className="text-[#244c91] font-medium">
                          {a.crewName}
                        </span>
                      ) : (
                        <span className="text-[#8a6510] italic">
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
                        className="w-24 rounded border border-[#d7c7aa] bg-white px-2 py-1 text-right text-[#171714] focus:border-[#244c91] focus:outline-none text-xs"
                      />
                    </td>
                    <td className="px-3 py-2 text-[#716855] max-w-xs">
                      <span className="line-clamp-2 italic">{a.reasoning}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-blue-200 bg-white/70 flex items-center justify-between">
            <p className="text-xs text-[#716855]">
              Toggle ✓/✕ to include or exclude items. Edit productivity values
              inline. Click{" "}
              <strong className="text-[#171714]">Confirm & Apply</strong> to
              save.
            </p>
            <Button
              size="sm"
              onClick={handleConfirmAssignments}
              disabled={confirmLaborMutation.isPending}
              className="bg-[#244c91] hover:bg-[#1b3c74] text-white gap-1.5 text-xs"
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
        <div className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50 text-[#171714]">
          <div className="px-4 py-3 border-b border-blue-200 bg-white/75 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#244c91]" />
              <h3 className="text-sm font-semibold text-[#171714]">
                ConstructLine Task-Based Labor Review
              </h3>
              <span className="text-xs text-[#244c91] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
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
                className="border-[#c8b895] bg-white text-[#5d5546] hover:bg-[#faf8f2] hover:text-[#171714] text-xs"
              >
                Close Review
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmTasks}
                disabled={confirmTasksMutation.isPending}
                className="bg-[#244c91] hover:bg-[#1b3c74] text-white gap-1.5 text-xs"
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

          <div className="divide-y divide-[#eadcc4] bg-white/55">
            {taskGroups.map((task: any, taskIdx: number) => {
              const isExpanded = expandedTasks.has(taskIdx);
              return (
                <div
                  key={taskIdx}
                  className={`${task._excluded ? "opacity-40" : ""}`}
                >
                  {/* Task header */}
                  <div className="px-4 py-3 flex items-center gap-3 hover:bg-white transition-colors">
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
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-emerald-300 bg-emerald-50 text-emerald-800"
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
                        <ChevronDown className="w-3.5 h-3.5 text-[#716855] shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#716855] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#171714]">
                          {task.taskName}
                        </p>
                        {task.taskDescription && (
                          <p className="text-xs text-[#716855] truncate">
                            {task.taskDescription}
                          </p>
                        )}
                        {task.safetyReason && (
                          <p className="text-xs text-[#8a6510] truncate">
                            {task.safetyReason}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-[#8a806d] shrink-0">
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
                        className="h-8 w-[260px] max-w-[32vw] shrink-0 border-[#d7c7aa] bg-white text-xs text-[#171714] hover:bg-[#faf8f2] focus-visible:border-[#244c91] focus-visible:ring-blue-200 disabled:opacity-50"
                      >
                        <SelectValue placeholder="Select crew" />
                      </SelectTrigger>
                      <SelectContent
                        align="end"
                        className="w-[320px] max-h-72 border-[#d7c7aa] bg-white text-[#171714] shadow-2xl"
                      >
                        <SelectItem
                          value="unassigned"
                          className="text-[#716855] focus:bg-blue-50 focus:text-[#171714]"
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
                              className="pr-8 text-[#171714] focus:bg-blue-50 focus:text-[#171714] data-[state=checked]:bg-blue-50 data-[state=checked]:text-[#244c91]"
                            >
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate">{c.crewName}</span>
                                {isStarterCrew && (
                                  <span className="text-[10px] text-[#8a6510]">
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
                    <div className="bg-[#faf8f2] border-t border-[#eadcc4]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-[#eadcc4]">
                            <th className="text-left text-[#716855] font-medium px-6 py-1.5">
                              Item Description
                            </th>
                            <th className="text-left text-[#716855] font-medium px-3 py-1.5 w-16">
                              Unit
                            </th>
                            <th className="text-right text-[#716855] font-medium px-3 py-1.5 w-36">
                              Output / Crew-Hour
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {task.items.map((item: any, itemIdx: number) => (
                            <tr
                              key={itemIdx}
                              className="border-b border-[#eadcc4]"
                            >
                              <td className="px-6 py-1.5 text-[#29251c]">
                                {item.description}
                              </td>
                              <td className="px-3 py-1.5 text-[#716855]">
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
                                  className="w-24 rounded border border-[#d7c7aa] bg-white px-2 py-1 text-right text-[#171714] focus:border-[#244c91] focus:outline-none text-xs"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {task.reasoning && (
                        <p className="px-6 py-2 text-xs text-[#716855] italic">
                          {task.reasoning}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-blue-200 bg-white/70 flex items-center justify-between">
            <p className="text-xs text-[#716855]">
              Select your real crew for each task. Expand tasks to edit per-item
              productivity. Toggle ✓/✕ to include or exclude. These assignments
              are a review workflow, not an automatic labor guarantee.
            </p>
            <Button
              size="sm"
              onClick={handleConfirmTasks}
              disabled={confirmTasksMutation.isPending}
              className="bg-[#244c91] hover:bg-[#1b3c74] text-white gap-1.5 text-xs"
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
                              <ChevronRight className="w-3.5 h-3.5 text-[#716855]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#716855]" />
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
                          const sourceSheet = item.sheetId
                            ? sheetById.get(String(item.sheetId))
                            : null;
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
                              className={`border-b border-[#d7c7aa]/70 bg-white/45 transition-colors ${onOpenSourceItem ? "cursor-pointer hover:bg-white/80 focus-within:bg-white/80" : ""}`}
                              onClick={() => onOpenSourceItem?.(item)}
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
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-[#716855]">
                                  <span
                                    className={`inline-flex max-w-[260px] items-center gap-1 rounded-full border px-2 py-0.5 font-semibold ${sourceSheet ? "border-blue-200 bg-blue-50 text-[#244c91]" : "border-[#d7c7aa] bg-white/70 text-[#716855]"}`}
                                    title={
                                      sourceSheet
                                        ? getSheetDisplayName(sourceSheet)
                                        : "No drawing source is linked to this estimate row yet"
                                    }
                                  >
                                    <FileImage className="h-3 w-3 shrink-0" />
                                    <span className="truncate">
                                      {sourceSheet
                                        ? getSheetDisplayName(sourceSheet)
                                        : "Source not linked"}
                                    </span>
                                  </span>
                                  {onOpenSourceItem && (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 rounded-full border border-[#d7c7aa] bg-white/75 px-2 py-0.5 font-semibold text-[#5d5546] shadow-sm transition-colors hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
                                      onClick={event => {
                                        event.stopPropagation();
                                        onOpenSourceItem(item);
                                      }}
                                    >
                                      <Eye className="h-3 w-3" />
                                      Evidence
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                {labor?.laborSource === "cost_library" ||
                                labor?.laborSource === "held_for_review" ||
                                labor?.laborSource === "none" ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-[#d7b44d] bg-[#fff7da] px-2.5 text-xs text-[#8a6510] hover:!bg-[#fff4cb] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
                                    onClick={event => {
                                      event.stopPropagation();
                                      openItemLaborEditor(item);
                                    }}
                                  >
                                    Confirm labor
                                  </Button>
                                ) : (
                                  <StatusBadge status={rowStatus} compact />
                                )}
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
                        <ClipboardList className="w-3.5 h-3.5 text-[#8a6510]" />
                        <span>Allowances</span>
                        <Badge className="bg-[#fff4cb] text-[#8a6510] border-[#d7b44d] text-[10px] ml-1">
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
              {estimateModeLabel === "Bid-ready"
                ? "Ready Bid Total"
                : "Draft Bid Total"}
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
                    className="mt-3 h-8 border-[#d7b44d] bg-white/80 text-[#8a6510] hover:!bg-[#fff4cb] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
                  >
                    Open Review
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Dialog
        open={!!selectedLaborItem}
        onOpenChange={open => {
          if (!open) setSelectedLaborItem(null);
        }}
      >
        <DialogContent className="sm:max-w-xl border-[#d7c7aa] bg-[#f4efe4] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)] [&_[data-slot=dialog-header]]:border-[#d8c9ad] [&_[data-slot=dialog-footer]]:border-[#d8c9ad] [&_[data-slot=dialog-close]]:text-[#716855] [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:text-[#171714]">
          <DialogHeader>
            <DialogTitle>Confirm Labor</DialogTitle>
            <DialogDescription className="text-[#716855]">
              Choose the crew and production rate for this accepted item.
            </DialogDescription>
          </DialogHeader>
          {selectedLaborItem && (
            <div className="space-y-4">
              <div className="rounded-lg border border-[#d7c7aa] bg-white/70 p-3">
                <p className="text-sm font-semibold text-[#171714]">
                  {selectedLaborItem.description}
                </p>
                <p className="mt-1 text-xs text-[#716855]">
                  {parseFloat(
                    selectedLaborItem.quantity || "0"
                  ).toLocaleString()}{" "}
                  {selectedLaborItem.unit || "units"} · Division{" "}
                  {selectedLaborItem.csiDivision || "00"}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#716855]">
                    Crew
                  </span>
                  <Select
                    value={laborCrewId}
                    onValueChange={value => {
                      setLaborCrewId(value);
                      const crewId = parseInt(value, 10);
                      setLaborProductivity(
                        getSuggestedProductivity(
                          selectedLaborItem,
                          Number.isNaN(crewId) ? null : crewId
                        )
                          .toFixed(2)
                          .replace(/\.00$/, "")
                      );
                    }}
                  >
                    <SelectTrigger className="border-[#d7c7aa] bg-white text-[#171714] hover:bg-[#faf8f2]">
                      <SelectValue placeholder="Select crew" />
                    </SelectTrigger>
                    <SelectContent className="border-[#d7c7aa] bg-white text-[#171714]">
                      {userCrews.map((crew: any) => (
                        <SelectItem
                          key={crew.id}
                          value={String(crew.id)}
                          className="focus:bg-[#faf8f2] focus:text-[#171714]"
                        >
                          {crew.crewName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#716855]">
                    Production
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={laborProductivity}
                      onChange={e => setLaborProductivity(e.target.value)}
                      className="border-[#d7c7aa] bg-white text-[#171714]"
                    />
                    <span className="shrink-0 text-xs text-[#716855]">
                      {selectedLaborItem.unit || "units"}/crew hr
                    </span>
                  </div>
                </label>
              </div>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#716855]">
                  Labor note
                </span>
                <Input
                  value={laborNotes}
                  onChange={e => setLaborNotes(e.target.value)}
                  className="border-[#d7c7aa] bg-white text-[#171714]"
                />
              </label>
              {laborCrewId && (
                <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
                  This will replace the library labor basis with your crew labor
                  for this item.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedLaborItem(null)}
              className={LIGHT_OUTLINE_BUTTON_CLASS}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveItemLabor}
              disabled={confirmLaborMutation.isPending}
              className="bg-emerald-700 text-white hover:bg-emerald-800"
            >
              {confirmLaborMutation.isPending ? "Saving..." : "Save Labor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
      <p className="mt-1 break-words font-mono text-base font-semibold leading-tight">
        {value}
      </p>
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
      <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
        <div>
          <p className="text-emerald-900 text-sm font-medium">
            Residential estimate QA looks clean
          </p>
          <p className="text-emerald-800 text-xs mt-0.5">
            Required residential categories are represented, and no high-dollar
            inferred/detail-driven scope was detected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#d7b44d] bg-[#fff7da] text-[#171714] shadow-[0_16px_40px_rgba(138,101,16,0.1)]">
      <div className="px-4 py-3 border-b border-[#d7b44d] bg-[#fff4cb] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 text-[#8a6510] shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-[#171714]">
              Residential Estimate QA
            </h3>
            <p className="text-xs text-[#716855]">
              Review scope risks before labor and markups make the estimate feel
              final.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allowanceCount > 0 && (
            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
              <ClipboardList className="w-3 h-3 mr-1" />
              {allowanceCount} allowance{allowanceCount !== 1 ? "s" : ""}
            </Badge>
          )}
          {highCount > 0 && (
            <Badge className="bg-orange-50 text-orange-800 border-orange-300 text-[10px]">
              {highCount} high
            </Badge>
          )}
          {mediumCount > 0 && (
            <Badge className="bg-white text-[#8a6510] border-[#d7b44d] text-[10px]">
              {mediumCount} review
            </Badge>
          )}
        </div>
      </div>

      <div className="divide-y divide-[#eadcc4] bg-white/55">
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
              <span className="text-xs uppercase tracking-wider text-[#716855]">
                {finding.kind.replace("_", " ")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm text-[#171714] font-medium">
                {finding.title}
              </p>
              <p className="text-xs text-[#716855] mt-0.5">{finding.message}</p>
              <p className="text-xs text-[#8a6510] mt-1">{finding.action}</p>
              {finding.laborMatchStatus === "review_before_labor" && (
                <Badge className="bg-blue-50 text-[#244c91] border-blue-200 text-[10px] mt-2">
                  Review before labor match
                </Badge>
              )}
              {finding.allowancePreset && (
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <p className="text-xs text-emerald-800">
                    Suggested allowance: {finding.allowancePreset.description} (
                    {formatCurrency(finding.allowancePreset.amount, currency)})
                  </p>
                  {onAddAllowance && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onAddAllowance(finding.allowancePreset!)}
                      className="h-6 border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[10px] px-2"
                    >
                      Add allowance
                    </Button>
                  )}
                </div>
              )}
            </div>
            {finding.amountCents ? (
              <span className="font-mono text-xs text-[#171714] text-right md:pt-0.5">
                {formatCurrency(finding.amountCents, currency)}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {findings.length > topFindings.length && (
        <div className="px-4 py-2 border-t border-[#eadcc4] bg-white/55 text-xs text-[#716855]">
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
