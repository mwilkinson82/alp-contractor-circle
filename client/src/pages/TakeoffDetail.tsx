/**
 * TakeoffDetail — Full takeoff project view with drawing upload,
 * ConstructLine processing status, and quantity review/edit table.
 */
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import ProjectSettingsPanel from "@/components/ProjectSettingsPanel";
import PreAnalysisModal, {
  type PreAnalysisSettings,
} from "@/components/PreAnalysisModal";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import ItemDetailModal from "@/components/ItemDetailModal";
import EstimateSummary from "@/components/EstimateSummary";
import {
  playCompletionChime,
  sendCompletionNotification,
} from "@/lib/completionChime";
import {
  ArrowLeft,
  Upload,
  FileImage,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Play,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  DollarSign,
  PoundSterling,
  FileStack,
  Download,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Calculator,
  Percent,
  PlusCircle,
  Layers,
  Ruler,
  Bookmark,
  GitCompareArrows,
  Merge,
  MoreHorizontal,
  FileText,
  ClipboardList,
  Info,
  Flag,
} from "lucide-react";
import { MeasurementRollup } from "@/components/MeasurementRollup";
import SheetScaleCalibrator from "@/components/SheetScaleCalibrator";
// Scale calibration prompt removed — not used in AI pipeline
import {
  DRAWING_SCALES,
  PAPER_SIZES,
  pxPerFt,
} from "@/components/ScaleCalibrationPrompt";

function parseProjectAllowances(
  raw: unknown
): Array<{ description: string; amount: number }> {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed)
      ? parsed
          .map((a: any) => ({
            description: String(a.description || "").trim(),
            amount: Number(a.amount) || 0,
          }))
          .filter(a => a.description && a.amount > 0)
      : [];
  } catch {
    return [];
  }
}

/** Reverse-lookup: given a px/ft ratio, find the closest matching human-readable scale label */
function getScaleLabel(ratio: number): string {
  let bestLabel = `${Math.round(ratio)} px/ft`;
  let bestDist = Infinity;
  for (let si = 0; si < DRAWING_SCALES.length; si++) {
    for (let pi = 0; pi < PAPER_SIZES.length; pi++) {
      const candidate = pxPerFt(si, pi);
      const dist = Math.abs(candidate - ratio);
      if (dist < bestDist) {
        bestDist = dist;
        bestLabel = DRAWING_SCALES[si].label.split("(")[0].trim();
      }
    }
  }
  // Only use the label if it's a close match (within 5%)
  if (bestDist / ratio > 0.05) return `${ratio.toFixed(1)} px/ft`;
  return bestLabel;
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildScopeIntent } from "../../../shared/scopeIntent";
import {
  normalizeTakeoffProjectType,
  shouldRunResidentialQa,
} from "../../../shared/projectType";
import {
  getBidModeBehavior,
  normalizeTakeoffBidMode,
} from "../../../shared/bidMode";
import {
  getScopeMaterialUnitCost,
  getScopeStatusFromNotes,
  isScopeExcludedItem,
  isScopeIncludedItem,
  isScopeReviewItem,
  sumScopeIncludedExtendedCost,
  sumScopeIncludedLaborCost,
  sumScopeIncludedMaterialCost,
} from "../../../shared/scopeCost";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  GBP: "en-GB",
  AUD: "en-AU",
};

function formatCurrency(cents: number, currencyCode: string = "USD"): string {
  const locale = CURRENCY_LOCALE[currencyCode] || "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function getTakeoffMaterialUnitCost(item: any): number {
  return getScopeMaterialUnitCost(item);
}

function getScopeReviewStatus(item: any): "included" | "review" | "excluded" {
  return getScopeStatusFromNotes(item?.notes);
}

function formatScopeReviewStatus(
  status: "included" | "review" | "excluded"
): string {
  if (status === "review") return "Needs scope review";
  if (status === "excluded") return "Likely excluded";
  return "Included in scope";
}

function sortByExtendedCostDesc<
  T extends { extendedCost?: number | string | null },
>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => Number(b.extendedCost || 0) - Number(a.extendedCost || 0)
  );
}

function scopeDecisionNotes(
  notes: string | null | undefined,
  status: "included" | "review" | "excluded"
): string {
  const cleaned = String(notes || "")
    .replace(/\[Scope:\s*(?:included|review|excluded)\]\s*/gi, "")
    .trim();
  const label =
    status === "included"
      ? "included"
      : status === "excluded"
        ? "excluded"
        : "review";
  return `[Scope: ${label}]${cleaned ? ` ${cleaned}` : ""}`;
}

function getEstimatorCue(item: any): { label: string; className: string } {
  const notes = String(item?.notes || "").toLowerCase();
  const cost = Number(item?.extendedCost || 0);
  const confidence = Number(item?.confidence || 0);
  if (
    notes.includes("[scope: excluded]") &&
    notes.includes("[scope: included]")
  ) {
    return {
      label: "Scope conflict",
      className: "bg-red-500/15 text-red-200 border-red-500/25",
    };
  }
  if (notes.includes("duplicate") || notes.includes("another active row")) {
    return {
      label: "Possible duplicate",
      className: "bg-blue-500/15 text-blue-200 border-blue-500/25",
    };
  }
  if (
    notes.includes("[generated]") ||
    notes.includes("[enhanced]") ||
    notes.includes("[consolidated")
  ) {
    return {
      label: "Generated quantity",
      className: "bg-amber-500/15 text-amber-100 border-amber-500/25",
    };
  }
  if (
    item?.needsMeasurement ||
    notes.includes("placeholder") ||
    notes.includes("field verify") ||
    notes.includes("actual measurement")
  ) {
    return {
      label: "Needs quantity",
      className: "bg-orange-500/15 text-orange-200 border-orange-500/25",
    };
  }
  if (cost >= 1_000_000) {
    return {
      label: "High dollar",
      className: "bg-purple-500/15 text-purple-200 border-purple-500/25",
    };
  }
  if (confidence > 0 && confidence < 70) {
    return {
      label: "Low confidence",
      className: "bg-red-500/15 text-red-200 border-red-500/25",
    };
  }
  return {
    label: "Estimator decision",
    className: "bg-white/5 text-cream-muted border-white/10",
  };
}

type AssemblyBundleDecision = "include" | "review" | "exclude";
type AssemblyBundleStatus = AssemblyBundleDecision | "mixed" | "open";

interface AssemblyBundle {
  key: string;
  title: string;
  drawingGroup: string;
  items: any[];
  primaryItem: any;
  alternateItems: any[];
  recommendedDecision: AssemblyBundleDecision;
  reason: string;
  currentIncludedCost: number;
  reviewCost: number;
  openReviewCost: number;
  excludedCost: number;
  openReviewCount: number;
  highImpact: boolean;
  sourceDrawings: string[];
  status: AssemblyBundleStatus;
}

const ASSEMBLY_RULES: Array<{
  key: string;
  title: string;
  terms: string[];
  divisions?: string[];
}> = [
  {
    key: "foundation-reinforcing",
    title: "Foundation reinforcing package",
    divisions: ["03", "05"],
    terms: ["rebar", "reinforc", "dowell", "dowel", "mesh", "wwf", "wwm"],
  },
  {
    key: "slab-on-grade",
    title: "Slab-on-grade package",
    divisions: ["03"],
    terms: [
      "slab",
      "sog",
      "vapor",
      "termite",
      "finish floor",
      "floor concrete",
    ],
  },
  {
    key: "trench-pit-concrete",
    title: "Trench/pit concrete, form, and rebar package",
    divisions: ["03", "31"],
    terms: [
      "trench",
      "pit",
      "grade beam",
      "footing",
      "wall footing",
      "formed",
      "formwork",
    ],
  },
  {
    key: "drain-pit",
    title: "Drain/pit package",
    divisions: ["03", "22", "31", "33"],
    terms: ["drain", "sump", "catch basin", "cleanout", "storm", "pipe", "pit"],
  },
  {
    key: "exterior-boundary",
    title: "Exterior/boundary package",
    divisions: ["02", "31", "32", "33"],
    terms: [
      "exterior",
      "pavement",
      "curb",
      "sidewalk",
      "landscape",
      "fence",
      "site",
    ],
  },
  {
    key: "excluded-masonry-cmu",
    title: "Excluded masonry/CMU boundary package",
    divisions: ["04"],
    terms: ["cmu", "masonry", "block", "brick", "veneer", "lintel"],
  },
  {
    key: "general-requirements",
    title: "General requirements and soft-cost package",
    divisions: ["01"],
    terms: [
      "supervision",
      "general requirement",
      "mobilization",
      "testing",
      "layout",
      "survey",
      "cleanup",
    ],
  },
];

function getItemSearchText(item: any): string {
  return `${item?.description || ""} ${item?.notes || ""} ${item?.csiCode || ""} ${item?.csiDivision || ""}`.toLowerCase();
}

function getAssemblyRule(item: any) {
  const text = getItemSearchText(item);
  const division = String(item?.csiDivision || "").padStart(2, "0");
  const ruleByKey = (key: string) =>
    ASSEMBLY_RULES.find(rule => rule.key === key)!;
  const hasAny = (terms: string[]) => terms.some(term => text.includes(term));

  if (hasAny(ruleByKey("excluded-masonry-cmu").terms)) {
    return ruleByKey("excluded-masonry-cmu");
  }
  if (hasAny(["drain", "sump", "catch basin", "cleanout", "storm", "pipe"])) {
    return ruleByKey("drain-pit");
  }
  if (
    hasAny([
      "trench",
      "pit",
      "grade beam",
      "footing",
      "wall footing",
      "formed",
      "formwork",
    ])
  ) {
    return ruleByKey("trench-pit-concrete");
  }
  if (hasAny(ruleByKey("slab-on-grade").terms)) {
    return ruleByKey("slab-on-grade");
  }
  if (hasAny(ruleByKey("foundation-reinforcing").terms)) {
    return ruleByKey("foundation-reinforcing");
  }
  if (hasAny(ruleByKey("general-requirements").terms)) {
    return ruleByKey("general-requirements");
  }

  const termRule = ASSEMBLY_RULES.find(rule =>
    rule.terms.some(term => text.includes(term))
  );
  if (termRule) return termRule;

  if (division === "01") return ASSEMBLY_RULES[6];
  if (division === "04") return ASSEMBLY_RULES[5];
  if (["31", "32", "33"].includes(division)) return ASSEMBLY_RULES[4];

  return {
    key: `division-${division || "00"}`,
    title: `${CSI_DIVISION_NAMES[division] || `Division ${division || "00"}`} package`,
    terms: [],
    divisions: [division],
  };
}

function getSheetLabel(sheet: any): string {
  if (!sheet) return "Unlinked drawing";
  return sheet.sheetName || `Page ${sheet.pageNumber || "?"}`;
}

function buildAssemblyBundles(
  allItems: any[],
  sheets: any[]
): AssemblyBundle[] {
  const sheetById = new Map(
    (sheets || []).map((sheet: any) => [sheet.id, sheet])
  );
  const groups = new Map<string, any[]>();

  for (const item of allItems || []) {
    const rule = getAssemblyRule(item);
    const key = rule.key;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }

  return Array.from(groups.entries())
    .map(([key, bundleItems]) => {
      const sortedItems = sortByExtendedCostDesc(bundleItems);
      const primaryItem = sortedItems[0];
      const sourceDrawings = Array.from(
        new Set(
          bundleItems.map(item =>
            getSheetLabel(item.sheetId ? sheetById.get(item.sheetId) : null)
          )
        )
      );
      const rule = getAssemblyRule(primaryItem);
      const currentIncludedCost = bundleItems
        .filter(item => isScopeIncludedItem(item))
        .reduce((sum, item) => sum + Number(item.extendedCost || 0), 0);
      const reviewItemsForBundle = bundleItems.filter(item =>
        isScopeReviewItem(item)
      );
      const excludedItemsForBundle = bundleItems.filter(item =>
        isScopeExcludedItem(item)
      );
      const reviewCost = reviewItemsForBundle.reduce(
        (sum, item) => sum + Number(item.extendedCost || 0),
        0
      );
      const openReviewCost = reviewItemsForBundle
        .filter(item => !item.reviewed)
        .reduce((sum, item) => sum + Number(item.extendedCost || 0), 0);
      const excludedCost = excludedItemsForBundle.reduce(
        (sum, item) => sum + Number(item.extendedCost || 0),
        0
      );
      const openReviewCount = reviewItemsForBundle.filter(
        item => !item.reviewed
      ).length;
      const includedCount = bundleItems.filter(item =>
        isScopeIncludedItem(item)
      ).length;
      const reviewCount = reviewItemsForBundle.length;
      const excludedCount = excludedItemsForBundle.length;
      const status: AssemblyBundleStatus =
        openReviewCount > 0
          ? "open"
          : includedCount === bundleItems.length
            ? "include"
            : excludedCount === bundleItems.length
              ? "exclude"
              : reviewCount === bundleItems.length
                ? "review"
                : "mixed";
      const hasRiskCue = bundleItems.some(item => {
        const cue = getEstimatorCue(item).label;
        return [
          "Scope conflict",
          "Possible duplicate",
          "Generated quantity",
          "Needs quantity",
          "Low confidence",
        ].includes(cue);
      });
      const highImpact =
        currentIncludedCost + reviewCost >= 1_000_000 ||
        reviewItemsForBundle.length > 0 ||
        hasRiskCue;
      const recommendedDecision: AssemblyBundleDecision =
        reviewItemsForBundle.length > 0
          ? "review"
          : excludedItemsForBundle.length > bundleItems.length / 2
            ? "exclude"
            : "include";
      const reason =
        reviewItemsForBundle.length > 0
          ? `${reviewItemsForBundle.length} row${reviewItemsForBundle.length !== 1 ? "s need" : " needs"} estimator decision before pricing.`
          : hasRiskCue
            ? "Verify generated, low-confidence, or duplicate evidence before relying on this package."
            : excludedItemsForBundle.length > 0
              ? "Boundary rows are visible but held outside active pricing."
              : "Rows are currently accepted; spot-check drawing evidence as needed.";

      return {
        key,
        title: rule.title,
        drawingGroup:
          sourceDrawings.length > 1
            ? `${sourceDrawings.length} drawings`
            : sourceDrawings[0] || "Unlinked drawing",
        items: sortedItems,
        primaryItem,
        alternateItems: sortedItems.slice(1),
        recommendedDecision,
        reason,
        currentIncludedCost,
        reviewCost,
        openReviewCost,
        excludedCost,
        openReviewCount,
        highImpact,
        sourceDrawings,
        status,
      };
    })
    .sort((a, b) => {
      if (a.openReviewCount !== b.openReviewCount) {
        return b.openReviewCount - a.openReviewCount;
      }
      if (a.highImpact !== b.highImpact) return a.highImpact ? -1 : 1;
      return (
        b.currentIncludedCost +
        b.reviewCost -
        (a.currentIncludedCost + a.reviewCost)
      );
    });
}

const SHEET_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  pending: {
    label: "Pending",
    color: "bg-gray-500/20 text-gray-300",
    icon: Clock,
  },
  processing: {
    label: "Analyzing...",
    color: "bg-amber-500/20 text-amber-300",
    icon: Loader2,
  },
  completed: {
    label: "Done",
    color: "bg-emerald-500/20 text-emerald-300",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    color: "bg-red-500/20 text-red-300",
    icon: AlertCircle,
  },
  skipped: { label: "Skipped", color: "bg-gray-500/20 text-gray-400", icon: X },
};

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
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "28": "Electronic Safety",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TakeoffDetail() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/takeoff/:id");
  const projectId = params?.id ? parseInt(params.id, 10) : 0;

  const [activeTab, setActiveTab] = useState("sheets");
  const [previewSheet, setPreviewSheet] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [collapsedDivisions, setCollapsedDivisions] = useState<Set<string>>(
    new Set()
  );
  const [expandedBundles, setExpandedBundles] = useState<Set<string>>(
    new Set()
  );
  const [selectedBundleKey, setSelectedBundleKey] = useState<string | null>(
    null
  );
  const [showRawReviewRows, setShowRawReviewRows] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [showPreAnalysis, setShowPreAnalysis] = useState(false);
  const [showMarkup, setShowMarkup] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showRollup, setShowRollup] = useState(false);
  const [calibratingSheet, setCalibratingSheet] = useState<any>(null);
  const [sheetScales, setSheetScales] = useState<
    Record<
      number,
      { ratio: number; unit: string; method?: "measured" | "title_block" }
    >
  >({});
  // Scale calibration prompt removed from upload flow
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [importPreview, setImportPreview] = useState<any[] | null>(null);
  const [importRemoveUnmatched, setImportRemoveUnmatched] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [addItemDivision, setAddItemDivision] = useState<string>("03");
  const [showConsolidationDiff, setShowConsolidationDiff] = useState(false);
  const [openSettingsToScope, setOpenSettingsToScope] = useState(false);
  // Track previous scopeText to detect scope changes
  const prevScopeTextRef = useRef<string | null>(null);

  // Prevent navigation during upload — PDF-to-image conversion runs client-side
  useEffect(() => {
    if (!uploading) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploading]);

  const [markups, setMarkups] = useState({
    labor: 0,
    overhead: 0,
    profit: 0,
    bonds: 0,
    contingency: 0,
  });

  // ─── Preferred Currency ──────────────────────────────────────────────────
  const preferredCurrencyQuery = trpc.takeoff.getPreferredCurrency.useQuery();
  const savePreferredCurrency =
    trpc.takeoff.savePreferredCurrency.useMutation();

  // ─── Rate Profiles for quick-switch ─────────────────────────────────────────
  const { data: rateProfiles } = trpc.tradeRates.listRateProfiles.useQuery();

  // ─── Data Queries ─────────────────────────────────────────────────────────

  const {
    data: project,
    isLoading,
    refetch: refetchProject,
  } = trpc.takeoff.getProject.useQuery(
    { id: projectId },
    {
      enabled: projectId > 0,
      // Keep polling even when tab is in background (user walks away from computer)
      refetchIntervalInBackground: true,
      refetchInterval: query => {
        const status = query.state.data?.status;
        return status === "processing" || status === "post_processing"
          ? 3000
          : false;
      },
    }
  );

  const { data: items, refetch: refetchItems } = trpc.takeoff.getItems.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );
  const selectedDivisionList = useMemo(() => {
    if (!project?.selectedDivisions) return null;
    try {
      const parsed = JSON.parse(project.selectedDivisions);
      return Array.isArray(parsed)
        ? parsed.filter(value => typeof value === "string")
        : null;
    } catch {
      return null;
    }
  }, [project?.selectedDivisions]);
  const scopeIntent = useMemo(
    () =>
      buildScopeIntent(
        project?.scopeText || null,
        selectedDivisionList,
        project?.bidMode
      ),
    [project?.scopeText, selectedDivisionList, project?.bidMode]
  );
  const projectType = normalizeTakeoffProjectType(project?.projectType);
  const enableResidentialQa = useMemo(() => {
    return shouldRunResidentialQa(projectType);
  }, [projectType]);
  // ─── Measurement Rollup Query ──────────────────────────────────────────
  const { data: projectMarkups } = trpc.takeoff.getProjectMarkups.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  );

  // Load saved scales from projectMarkups on page load
  useEffect(() => {
    if (projectMarkups && projectMarkups.length > 0) {
      setSheetScales(prev => {
        const next = { ...prev };
        for (const m of projectMarkups) {
          if (m.scaleRatio && m.sheetId && !next[m.sheetId]) {
            next[m.sheetId] = {
              ratio: m.scaleRatio,
              unit: m.scaleUnit || "ft",
            };
          }
        }
        return next;
      });
    }
  }, [projectMarkups]);

  // ─── Consolidation Diff Query ─────────────────────────────────────────
  const { data: consolidationDiff } =
    trpc.takeoff.getConsolidationDiff.useQuery(
      { projectId },
      { enabled: projectId > 0 && showConsolidationDiff }
    );

  // ─── Verified (measurement history) items ─────────────────────────────
  const { data: verifiedItemIds } =
    trpc.takeoff.getItemsWithMeasurements.useQuery(
      { projectId },
      { enabled: projectId > 0 }
    );
  const verifiedSet = useMemo(
    () => new Set(verifiedItemIds || []),
    [verifiedItemIds]
  );

  const { data: progress, refetch: refetchProgress } =
    trpc.takeoff.getProgress.useQuery(
      { projectId },
      {
        enabled: projectId > 0,
        // Keep polling even when tab is in background — critical for long-running takeoffs
        refetchIntervalInBackground: true,
        refetchInterval: query => {
          const status = query.state.data?.status;
          return status === "processing" || status === "post_processing"
            ? 2000
            : false;
        },
      }
    );

  // Track previous processing status to detect completion transition
  const prevStatusRef = useRef<string | null>(null);
  // Track when processing started for elapsed timer
  const processingStartRef = useRef<number | null>(null);

  // Initialize prevScopeTextRef when project first loads
  useEffect(() => {
    if (project && prevScopeTextRef.current === null) {
      prevScopeTextRef.current = project.scopeText ?? "";
    }
  }, [project]);

  // Auto-switch to items tab when processing completes & refetch items
  useEffect(() => {
    const currentStatus = progress?.status || project?.status;
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = currentStatus || null;

    // Stop timer and detect completion
    if (
      prevStatus &&
      prevStatus !== "completed" &&
      currentStatus === "completed"
    ) {
      processingStartRef.current = null;

      // Play completion chime and send browser notification
      playCompletionChime();
      sendCompletionNotification(project?.name || "Project");

      if (prevStatus === "post_processing") {
        // Hard refresh for consolidation to ensure all data is fresh
        toast.success("Consolidation complete! Refreshing data...");
        setTimeout(() => window.location.reload(), 500);
      } else {
        // Regular refetch for initial analysis
        refetchItems().then(() => {
          setActiveTab("items");
          toast.success("Analysis complete! Showing your quantity takeoff.");
        });
      }
    }
  }, [progress?.status, project?.status, refetchItems]);

  // Force-refetch when user returns to the tab during processing
  // This ensures completion is detected immediately even if the background poll
  // was throttled by the browser or the user was away for a long time.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const currentStatus = progress?.status || project?.status;
        if (
          currentStatus === "processing" ||
          currentStatus === "post_processing"
        ) {
          // Immediately check for completion when user comes back
          refetchProgress();
          refetchProject();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [progress?.status, project?.status, refetchProgress, refetchProject]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const uploadMutation = trpc.takeoff.uploadSheet.useMutation({
    onSuccess: () => {
      refetchProject();
      refetchProgress();
    },
    onError: err => toast.error(`Upload failed: ${err.message}`),
  });

  const processMutation = trpc.takeoff.startProcessing.useMutation({
    onSuccess: () => {
      toast.success(
        "ConstructLine takeoff started! This may take a few minutes..."
      );
      refetchProject();
      refetchProgress();
    },
    onError: err => toast.error(err.message),
  });

  const reprocessMutation = trpc.takeoff.reprocessSheet.useMutation({
    onSuccess: () => {
      toast.success("Reprocessing sheet...");
      refetchProject();
      refetchProgress();
    },
    onError: err => toast.error(err.message),
  });

  const updateItemMutation = trpc.takeoff.updateItem.useMutation({
    onSuccess: () => {
      toast.success("Item updated");
      setEditingItem(null);
      refetchItems();
      refetchProject();
    },
    onError: err => toast.error(err.message),
  });

  const deleteItemMutation = trpc.takeoff.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Item deleted");
      refetchItems();
      refetchProject();
    },
    onError: err => toast.error(err.message),
  });

  const bulkReviewMutation = trpc.takeoff.bulkReview.useMutation({
    onSuccess: () => {
      toast.success("All items marked as reviewed");
      refetchItems();
    },
    onError: err => toast.error(err.message),
  });

  const bulkUnreviewMutation = trpc.takeoff.bulkUnreview.useMutation({
    onSuccess: () => {
      toast.success("All items marked as unreviewed");
      refetchItems();
    },
    onError: err => toast.error(err.message),
  });

  const settingsMutation = trpc.takeoff.updateProjectSettings.useMutation({
    onSuccess: (_result, variables) => {
      refetchProject();
      // Scope change detection: if scopeText changed and project is completed, prompt re-run
      const prevScope = prevScopeTextRef.current;
      const newScope =
        variables.scopeText !== undefined ? (variables.scopeText ?? "") : null;
      const isCompleted = project?.status === "completed";
      if (isCompleted && newScope !== null && newScope !== prevScope) {
        toast.info("Scope updated", {
          description:
            "Re-run analysis to apply the new scope to your takeoff.",
          action: {
            label: "Re-run Now",
            onClick: () => consolidateMutation.mutate({ projectId }),
          },
          duration: 8000,
        });
      }
      // Update the tracked scope
      if (newScope !== null) prevScopeTextRef.current = newScope;
    },
    onError: err => toast.error(`Settings error: ${err.message}`),
  });

  const updateProjectMutation = trpc.takeoff.updateProject.useMutation({
    onSuccess: () => {
      refetchProject();
    },
    onError: err => toast.error(`Update error: ${err.message}`),
  });

  const addItemMutation = (trpc.takeoff as any).addItem.useMutation({
    onSuccess: () => {
      toast.success("Item added");
      setShowAddItem(false);
      refetchItems();
      refetchProject();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const consolidateMutation = trpc.takeoff.reprocessConsolidate.useMutation({
    onSuccess: () => {
      toast.success(
        "Re-running full analysis… items will update when complete."
      );
      // The backend sets status to post_processing, which triggers polling via refetchInterval.
      // The prevStatusRef effect above will detect post_processing → completed and auto-refresh items.
      refetchProject();
      refetchProgress();
    },
    onError: err => toast.error(`Re-run error: ${err.message}`),
  });

  const repriceMutation = trpc.takeoff.repriceItems.useMutation({
    onSuccess: result => {
      toast.success(
        `Re-priced ${result.updated} items with updated cost data.`
      );
      refetchItems();
      refetchProject();
    },
    onError: err => toast.error(`Re-price error: ${err.message}`),
  });

  // Derived: is consolidation specifically running?
  const isConsolidating =
    progress?.status === "post_processing" ||
    project?.status === "post_processing";

  // ─── File Upload Handler ──────────────────────────────────────────────────

  const handleFileUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);

      try {
        const existingSheetCount = project?.sheets?.length || 0;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Validate file type
          if (
            !file.type.startsWith("image/") &&
            file.type !== "application/pdf"
          ) {
            toast.error(
              `Unsupported file type: ${file.name}. Use PNG, JPG, or PDF.`
            );
            continue;
          }

          // For images, upload directly
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            const base64 = await new Promise<string>((resolve, reject) => {
              reader.onload = () => {
                const result = reader.result as string;
                resolve(result.split(",")[1]); // Remove data:image/...;base64, prefix
              };
              reader.onerror = reject;
              reader.readAsDataURL(file);
            });

            await uploadMutation.mutateAsync({
              projectId,
              filename: file.name,
              pageNumber: existingSheetCount + i + 1,
              imageData: base64,
              contentType: file.type,
            });

            toast.success(`Uploaded: ${file.name}`);
          } else if (file.type === "application/pdf") {
            // For PDFs, we'll convert pages to images client-side using canvas
            toast.info(
              `Processing PDF: ${file.name}. Converting pages to images...`
            );
            await handlePdfUpload(file, existingSheetCount);
          }
        }

        // After upload, refetch sheets and go straight to pre-analysis settings
        await refetchProject();
        refetchProgress();
        // Auto-trigger the pre-analysis modal so user can confirm settings and start analysis
        setShowPreAnalysis(true);
      } catch (err: any) {
        toast.error(`Upload error: ${err.message}`);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [projectId, project, uploadMutation]
  );

  const handlePdfUpload = async (file: File, startPage: number) => {
    // Use pdf.js to render PDF pages to images
    // Worker file is copied to public/ dir so it's served as a static asset
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.v4.min.mjs";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;

    toast.info(`Found ${numPages} pages in ${file.name}`);
    setUploadProgress({ current: 0, total: numPages });

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        setUploadProgress({ current: pageNum, total: numPages });
        const page = await pdf.getPage(pageNum);
        const scale = 2.0; // High resolution for ConstructLine analysis
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport, canvas } as any)
          .promise;

        // Convert to base64 PNG
        const dataUrl = canvas.toDataURL("image/png");
        const base64 = dataUrl.split(",")[1];

        await uploadMutation.mutateAsync({
          projectId,
          filename: `${file.name} - Page ${pageNum}`,
          pageNumber: startPage + pageNum,
          imageData: base64,
          contentType: "image/png",
        });
      } catch (err: any) {
        toast.error(`Failed to process page ${pageNum}: ${err.message}`);
      }
    }
    setUploadProgress(null);
  };

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      handleFileUpload(e.dataTransfer.files);
    },
    [handleFileUpload]
  );

  //  // ─── Excel/CSV Export ──────────────────────────────────────────────────

  const handleExportExcel = useCallback(() => {
    if (!items || items.length === 0) return;

    const currencyCode = project?.currency || "USD";
    const currencySymbol =
      currencyCode === "GBP" ? "£" : currencyCode === "AUD" ? "A$" : "$";
    const exportBidModeBehavior = getBidModeBehavior(project?.bidMode);
    const projectName = (project as any)?.name || "Takeoff";
    const exportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const headers = [
      "CSI Code",
      "Description",
      "Quantity",
      "Unit",
      `Material (${currencySymbol})`,
      `Default Labor (${currencySymbol})`,
      `Reference Unit (${currencySymbol})`,
      `Reference Total (${currencySymbol})`,
      "Confidence %",
      "Scope",
      "Reviewed",
      "Notes",
    ];
    const allItems = items as any[];
    const activeBucket = allItems.filter(item => isScopeIncludedItem(item));
    const reviewBucket = sortByExtendedCostDesc(
      allItems.filter(item => isScopeReviewItem(item))
    );
    const excludedBucket = allItems.filter(item => isScopeExcludedItem(item));
    const exportAssemblyBundles = buildAssemblyBundles(
      allItems,
      (project as any)?.sheets || []
    );
    const projectAllowances = parseProjectAllowances(
      (project as any)?.allowances
    );
    const allowancesTotal =
      projectAllowances.reduce(
        (sum, allowance) => sum + (allowance.amount || 0),
        0
      ) / 100;
    const bucketTotal = (bucket: any[]) =>
      bucket.reduce(
        (sum, item) => sum + (parseFloat(item.extendedCost) || 0) / 100,
        0
      );
    const activeTotal = bucketTotal(activeBucket) + allowancesTotal;
    const reviewTotal = bucketTotal(reviewBucket);
    const excludedTotal = bucketTotal(excludedBucket);
    const highImpactAssemblyBundles = exportAssemblyBundles.filter(
      bundle => bundle.highImpact && bundle.openReviewCount > 0
    );
    const assemblyReviewTotal =
      highImpactAssemblyBundles.reduce(
        (sum, bundle) => sum + bundle.reviewCost,
        0
      ) / 100;

    const baseHeader = (): any[][] => [
      [
        "ConstructLine | Powered by ALP",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        `Project: ${projectName}`,
        "",
        "",
        `Date: ${exportDate}`,
        "",
        "",
        "",
        `Currency: ${currencyCode}`,
        "",
        "",
        "",
        "",
      ],
      [
        `Bid mode: ${exportBidModeBehavior.label}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        `Review surface: ${exportBidModeBehavior.reviewSurface}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        `Scope: ${scopeIntent.hasScope ? scopeIntent.originalText : "Full drawing set"}`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [],
    ];

    const buildBucketSheet = (
      bucketName: string,
      bucketItems: any[],
      includeAllowances = false
    ): any[][] => {
      const divGroups: Record<string, any[]> = {};
      for (const item of bucketItems) {
        const div = item.csiDivision || "00";
        if (!divGroups[div]) divGroups[div] = [];
        divGroups[div].push(item);
      }
      const sortedDivs = Object.keys(divGroups).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      const aoa: any[][] = [
        ...baseHeader(),
        [`Bucket: ${bucketName}`, "", "", "", "", "", "", "", "", "", "", ""],
        [],
        headers,
      ];
      let grandTotal = 0;

      for (const div of sortedDivs) {
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        aoa.push([
          `${div} - ${divName}`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
        let divTotal = 0;
        for (const item of divGroups[div]) {
          const extCost = (parseFloat(item.extendedCost) || 0) / 100;
          divTotal += extCost;
          aoa.push([
            item.csiCode || item.csiDivision || "",
            item.description || "",
            parseFloat(item.quantity) || 0,
            item.unit || "",
            getTakeoffMaterialUnitCost(item) / 100,
            (parseFloat(item.laborCost) || 0) / 100,
            (parseFloat(item.unitCost) || 0) / 100,
            extCost,
            item.confidence || 0,
            formatScopeReviewStatus(getScopeReviewStatus(item)),
            item.reviewed ? "Yes" : "No",
            item.notes || "",
          ]);
        }
        aoa.push([
          "",
          `Subtotal - ${divName}`,
          "",
          "",
          "",
          "",
          "",
          divTotal,
          "",
          "",
          "",
          "",
        ]);
        aoa.push([]);
        grandTotal += divTotal;
      }

      if (includeAllowances && projectAllowances.length > 0) {
        aoa.push(["ALLOWANCES", "", "", "", "", "", "", "", "", "", "", ""]);
        for (const allowance of projectAllowances) {
          const amt = (allowance.amount || 0) / 100;
          aoa.push([
            "",
            allowance.description || "Allowance",
            "",
            "LS",
            "",
            "",
            "",
            amt,
            "",
            "Included",
            "",
            "",
          ]);
        }
        aoa.push([
          "",
          "Subtotal - Allowances",
          "",
          "",
          "",
          "",
          "",
          allowancesTotal,
          "",
          "",
          "",
          "",
        ]);
        aoa.push([]);
      }
      aoa.push([
        "",
        `${bucketName.toUpperCase()} TOTAL`,
        "",
        "",
        "",
        "",
        "",
        grandTotal + (includeAllowances ? allowancesTotal : 0),
        "",
        "",
        "",
        "",
      ]);
      return aoa;
    };

    const buildAssemblyReviewSheet = (): any[][] => {
      const assemblyHeaders = [
        "Assembly / Package",
        "Recommended Decision",
        `Included (${currencySymbol})`,
        `Review (${currencySymbol})`,
        `Reference Total (${currencySymbol})`,
        "Open Review Rows",
        "High Impact",
        "Evidence Drawings",
        "Primary Row",
        "Alternate Rows",
        "Risk Reason",
        "Raw Scope Mix",
      ];
      const aoa: any[][] = [
        ...baseHeader(),
        [
          "Assembly Review",
          `${exportAssemblyBundles.length} bundles`,
          `${highImpactAssemblyBundles.length} high-impact open`,
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
        [
          "Estimator decision surface. Review package-level bundles first; raw item rows are retained on the bucket sheets for audit.",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
        ],
        [],
        assemblyHeaders,
      ];

      for (const bundle of exportAssemblyBundles) {
        const includedCount = bundle.items.filter(item =>
          isScopeIncludedItem(item)
        ).length;
        const reviewCount = bundle.items.filter(item =>
          isScopeReviewItem(item)
        ).length;
        const excludedCount = bundle.items.filter(item =>
          isScopeExcludedItem(item)
        ).length;
        const referenceTotal =
          (bundle.currentIncludedCost +
            bundle.reviewCost +
            bundle.excludedCost) /
          100;
        const recommendedLabel =
          bundle.recommendedDecision === "include"
            ? "Accept"
            : bundle.recommendedDecision === "exclude"
              ? "Exclude"
              : "Review";

        aoa.push([
          bundle.title,
          recommendedLabel,
          bundle.currentIncludedCost / 100,
          bundle.reviewCost / 100,
          referenceTotal,
          bundle.openReviewCount,
          bundle.highImpact ? "Yes" : "No",
          bundle.sourceDrawings.join(", "),
          bundle.primaryItem?.description || "",
          bundle.alternateItems.length,
          bundle.reason,
          `${includedCount} included / ${reviewCount} review / ${excludedCount} boundary`,
        ]);
      }

      aoa.push([]);
      aoa.push([
        "ASSEMBLY REVIEW TOTAL",
        "",
        activeTotal,
        assemblyReviewTotal,
        activeTotal + reviewTotal + excludedTotal,
        highImpactAssemblyBundles.reduce(
          (sum, bundle) => sum + bundle.openReviewCount,
          0
        ),
        "",
        "",
        "",
        "",
        "",
        "",
      ]);
      return aoa;
    };

    const summaryRows: any[][] = [
      ...baseHeader(),
      [
        "Summary",
        "Count",
        `Subtotal (${currencySymbol})`,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Assembly Review Bundles",
        exportAssemblyBundles.length,
        assemblyReviewTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "High-Impact Bundles Open",
        highImpactAssemblyBundles.length,
        assemblyReviewTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Active Items",
        activeBucket.length,
        activeTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Needs Scope Review",
        reviewBucket.length,
        reviewTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Active + Review Potential",
        activeBucket.length + reviewBucket.length,
        activeTotal + reviewTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Excluded / Boundary",
        excludedBucket.length,
        excludedTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "Allowances included in Active Total",
        projectAllowances.length,
        allowancesTotal,
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ];

    const defaultCols = [
      { wch: 16 },
      { wch: 58 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 14 },
      { wch: 16 },
      { wch: 10 },
      { wch: 46 },
    ];
    const assemblyCols = [
      { wch: 34 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 17 },
      { wch: 16 },
      { wch: 13 },
      { wch: 56 },
      { wch: 58 },
      { wch: 14 },
      { wch: 54 },
      { wch: 28 },
    ];
    const makeSheet = (aoa: any[][], cols = defaultCols) => {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = cols;
      const brandCell = XLSX.utils.encode_cell({ r: 0, c: 0 });
      if (ws[brandCell])
        ws[brandCell].s = {
          font: { bold: true, sz: 16, color: { rgb: "0D1B2A" } },
        };
      return ws;
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, makeSheet(summaryRows), "Summary");
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(buildAssemblyReviewSheet(), assemblyCols),
      "Assembly Review"
    );
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(buildBucketSheet("Active Items", activeBucket, true)),
      "Active Items"
    );
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(buildBucketSheet("Needs Scope Review", reviewBucket)),
      "Needs Scope Review"
    );
    XLSX.utils.book_append_sheet(
      wb,
      makeSheet(buildBucketSheet("Excluded Boundary", excludedBucket)),
      "Excluded Boundary"
    );
    const fileName = `${(project as any)?.name || "Takeoff"}_Quantities_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success("Exported all takeoff buckets to Excel");
  }, [items, project, scopeIntent]);

  const handleExportCsv = useCallback(() => {
    if (!items || items.length === 0) return;
    const currencyCode = project?.currency || "USD";
    const currencySymbol =
      currencyCode === "GBP" ? "£" : currencyCode === "AUD" ? "A$" : "$";
    const exportBidModeBehavior = getBidModeBehavior(project?.bidMode);
    const headers = [
      "CSI Code",
      "Description",
      "Quantity",
      "Unit",
      `Material (${currencySymbol})`,
      `Default Labor (${currencySymbol})`,
      `Reference Unit (${currencySymbol})`,
      `Reference Total (${currencySymbol})`,
      "Confidence %",
      "Scope",
      "Reviewed",
      "Notes",
    ];
    const allItems = items as any[];
    const activeBucket = allItems.filter(item => isScopeIncludedItem(item));
    const reviewBucket = sortByExtendedCostDesc(
      allItems.filter(item => isScopeReviewItem(item))
    );
    const excludedBucket = allItems.filter(item => isScopeExcludedItem(item));
    const csvAllowances = parseProjectAllowances((project as any)?.allowances);
    const csvAllowancesTotal =
      csvAllowances.reduce(
        (sum, allowance) => sum + (allowance.amount || 0),
        0
      ) / 100;
    const bucketTotal = (bucket: any[]) =>
      bucket.reduce(
        (sum, item) => sum + (parseFloat(item.extendedCost) || 0) / 100,
        0
      );
    const activeTotal = bucketTotal(activeBucket) + csvAllowancesTotal;
    const reviewTotal = bucketTotal(reviewBucket);
    const excludedTotal = bucketTotal(excludedBucket);

    const escapeCsv = (value: unknown) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;
    const projectName = (project as any)?.name || "Takeoff";
    const exportDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const csvRows: string[] = [
      [escapeCsv("ConstructLine | Powered by ALP")].join(","),
      [
        escapeCsv(`Project: ${projectName}`),
        "",
        "",
        escapeCsv(`Date: ${exportDate}`),
        "",
        "",
        "",
        escapeCsv(`Currency: ${currencyCode}`),
      ].join(","),
      [escapeCsv(`Bid mode: ${exportBidModeBehavior.label}`)].join(","),
      [
        escapeCsv(`Review surface: ${exportBidModeBehavior.reviewSurface}`),
      ].join(","),
      [
        escapeCsv(
          `Scope: ${scopeIntent.hasScope ? scopeIntent.originalText : "Full drawing set"}`
        ),
      ].join(","),
      "",
      ["Summary", "Count", `Subtotal (${currencySymbol})`].join(","),
      ["Active Items", activeBucket.length, activeTotal.toFixed(2)].join(","),
      ["Needs Scope Review", reviewBucket.length, reviewTotal.toFixed(2)].join(
        ","
      ),
      [
        "Active + Review Potential",
        activeBucket.length + reviewBucket.length,
        (activeTotal + reviewTotal).toFixed(2),
      ].join(","),
      [
        "Excluded / Boundary",
        excludedBucket.length,
        excludedTotal.toFixed(2),
      ].join(","),
      [
        "Allowances included in Active Total",
        csvAllowances.length,
        csvAllowancesTotal.toFixed(2),
      ].join(","),
      "",
      headers.join(","),
    ];

    const appendBucket = (
      bucketName: string,
      bucketItems: any[],
      includeAllowances = false
    ) => {
      csvRows.push("");
      csvRows.push(escapeCsv(bucketName));
      const divGroups: Record<string, any[]> = {};
      for (const item of bucketItems) {
        const div = item.csiDivision || "00";
        if (!divGroups[div]) divGroups[div] = [];
        divGroups[div].push(item);
      }
      const sortedDivs = Object.keys(divGroups).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );
      let grandTotal = 0;
      for (const div of sortedDivs) {
        const divName = CSI_DIVISION_NAMES[div] || `Division ${div}`;
        csvRows.push([escapeCsv(`${div} - ${divName}`)].join(","));
        let divTotal = 0;
        for (const item of divGroups[div]) {
          const extCost = (parseFloat(item.extendedCost) || 0) / 100;
          divTotal += extCost;
          csvRows.push(
            [
              item.csiCode || item.csiDivision || "",
              escapeCsv(item.description || ""),
              parseFloat(item.quantity) || 0,
              item.unit || "",
              (getTakeoffMaterialUnitCost(item) / 100).toFixed(2),
              ((parseFloat(item.laborCost) || 0) / 100).toFixed(2),
              ((parseFloat(item.unitCost) || 0) / 100).toFixed(2),
              extCost.toFixed(2),
              item.confidence || 0,
              formatScopeReviewStatus(getScopeReviewStatus(item)),
              item.reviewed ? "Yes" : "No",
              escapeCsv(item.notes || ""),
            ].join(",")
          );
        }
        csvRows.push(
          [
            "",
            escapeCsv(`Subtotal - ${divName}`),
            "",
            "",
            "",
            "",
            "",
            divTotal.toFixed(2),
            "",
            "",
            "",
            "",
          ].join(",")
        );
        csvRows.push("");
        grandTotal += divTotal;
      }
      if (includeAllowances && csvAllowances.length > 0) {
        csvRows.push(escapeCsv("ALLOWANCES"));
        for (const allowance of csvAllowances) {
          const amt = (allowance.amount || 0) / 100;
          csvRows.push(
            [
              "",
              escapeCsv(allowance.description || "Allowance"),
              "",
              "LS",
              "",
              "",
              "",
              amt.toFixed(2),
              "",
              "Included",
              "",
              "",
            ].join(",")
          );
        }
        csvRows.push(
          [
            "",
            escapeCsv("Subtotal - Allowances"),
            "",
            "",
            "",
            "",
            "",
            csvAllowancesTotal.toFixed(2),
            "",
            "",
            "",
            "",
          ].join(",")
        );
        csvRows.push("");
      }
      csvRows.push(
        [
          "",
          escapeCsv(`${bucketName} Total`),
          "",
          "",
          "",
          "",
          "",
          (grandTotal + (includeAllowances ? csvAllowancesTotal : 0)).toFixed(
            2
          ),
          "",
          "",
          "",
          "",
        ].join(",")
      );
    };

    appendBucket("Active Items", activeBucket, true);
    appendBucket("Needs Scope Review", reviewBucket);
    appendBucket("Excluded / Boundary", excludedBucket);

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(project as any)?.name || "Takeoff"}_Quantities_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported all takeoff buckets to CSV");
  }, [items, project, scopeIntent]);

  // ─── Excel Import ──────────────────────────────────────────────────────
  const importExcelMutation = (trpc.takeoff as any).importExcel.useMutation({
    onSuccess: (result: {
      updated: number;
      created: number;
      removed: number;
      errors: string[];
    }) => {
      refetchProject();
      setShowImportExcel(false);
      setImportPreview(null);
      if (importFileRef.current) importFileRef.current.value = "";
      const parts = [];
      if (result.updated > 0) parts.push(`${result.updated} updated`);
      if (result.created > 0) parts.push(`${result.created} created`);
      if (result.removed > 0) parts.push(`${result.removed} removed`);
      toast.success(`Import complete: ${parts.join(", ") || "no changes"}`);
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} row(s) had errors`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Import failed");
    },
  });

  const handleImportExcel = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          if (!ws) {
            toast.error("No sheet found in file");
            return;
          }

          const rawRows = XLSX.utils.sheet_to_json<any>(ws, {
            header: 1,
          }) as any[][];

          // Find the header row (look for "Description" or "CSI Code")
          let headerIdx = -1;
          for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const row = rawRows[i];
            if (
              row &&
              row.some(
                (cell: any) =>
                  typeof cell === "string" &&
                  (cell.toLowerCase().includes("description") ||
                    cell.toLowerCase().includes("csi code"))
              )
            ) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx === -1) {
            toast.error(
              "Could not find header row with 'Description' or 'CSI Code'"
            );
            return;
          }

          const headers = rawRows[headerIdx].map((h: any) =>
            String(h || "")
              .toLowerCase()
              .trim()
          );
          const descCol = headers.findIndex((h: string) =>
            h.includes("description")
          );
          const csiCol = headers.findIndex(
            (h: string) => h.includes("csi code") || h === "csi"
          );
          const qtyCol = headers.findIndex(
            (h: string) => h.includes("quantity") || h === "qty"
          );
          const unitCol = headers.findIndex(
            (h: string) => h.includes("unit") && !h.includes("cost")
          );
          const unitCostCol = headers.findIndex((h: string) =>
            h.includes("unit cost")
          );
          const confCol = headers.findIndex((h: string) =>
            h.includes("confidence")
          );
          const reviewedCol = headers.findIndex((h: string) =>
            h.includes("reviewed")
          );
          const notesCol = headers.findIndex((h: string) =>
            h.includes("notes")
          );

          if (descCol === -1) {
            toast.error("Could not find 'Description' column");
            return;
          }

          const parsed: any[] = [];
          for (let i = headerIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || !row[descCol]) continue;
            const desc = String(row[descCol] || "").trim();
            if (
              !desc ||
              desc.toLowerCase().startsWith("subtotal") ||
              desc === "GRAND TOTAL"
            )
              continue;
            // Skip division header rows (e.g. "03 — Concrete")
            if (/^\d{2}\s*[\u2014—-]/.test(desc)) continue;

            parsed.push({
              csiCode: csiCol >= 0 ? String(row[csiCol] || "").trim() : "",
              description: desc,
              quantity: qtyCol >= 0 ? parseFloat(row[qtyCol]) || 0 : 0,
              unit: unitCol >= 0 ? String(row[unitCol] || "").trim() : "EA",
              unitCost:
                unitCostCol >= 0 ? parseFloat(row[unitCostCol]) || 0 : 0,
              confidence: confCol >= 0 ? parseFloat(row[confCol]) || 0 : 100,
              reviewed:
                reviewedCol >= 0
                  ? String(row[reviewedCol]).toLowerCase() === "yes" ||
                    row[reviewedCol] === true
                  : false,
              notes: notesCol >= 0 ? String(row[notesCol] || "").trim() : "",
            });
          }

          if (parsed.length === 0) {
            toast.error("No valid data rows found");
            return;
          }
          setImportPreview(parsed);
          setShowImportExcel(true);
        } catch (err: any) {
          toast.error(
            "Failed to parse Excel file: " + (err.message || "Unknown error")
          );
        }
      };
      reader.readAsArrayBuffer(file);
    },
    []
  );

  const handleConfirmImport = useCallback(() => {
    if (!importPreview || importPreview.length === 0) return;
    importExcelMutation.mutate({
      projectId,
      rows: importPreview,
      removeUnmatched: importRemoveUnmatched,
    });
  }, [importPreview, projectId, importRemoveUnmatched, importExcelMutation]);

  // ─── Grouped Items ──────────────────────────────────────────────────

  const activeItems = useMemo(
    () => (items || []).filter((item: any) => isScopeIncludedItem(item)),
    [items]
  );
  const reviewItems = useMemo(
    () =>
      sortByExtendedCostDesc(
        (items || []).filter((item: any) => isScopeReviewItem(item))
      ),
    [items]
  );
  const excludedItems = useMemo(
    () => (items || []).filter((item: any) => isScopeExcludedItem(item)),
    [items]
  );
  const scopeReviewCount = reviewItems.length;
  const reviewItemsCost = useMemo(
    () =>
      reviewItems.reduce(
        (sum: number, item: any) => sum + (Number(item.extendedCost || 0) || 0),
        0
      ),
    [reviewItems]
  );
  const excludedItemsCost = useMemo(
    () =>
      excludedItems.reduce(
        (sum: number, item: any) => sum + (Number(item.extendedCost || 0) || 0),
        0
      ),
    [excludedItems]
  );
  const assemblyBundles = useMemo(
    () => buildAssemblyBundles(items || [], project?.sheets || []),
    [items, project?.sheets]
  );
  const highImpactOpenBundles = useMemo(
    () =>
      assemblyBundles.filter(
        bundle => bundle.highImpact && bundle.openReviewCount > 0
      ),
    [assemblyBundles]
  );
  const highImpactOpenBundleCost = useMemo(
    () =>
      highImpactOpenBundles.reduce(
        (sum, bundle) => sum + bundle.openReviewCost,
        0
      ),
    [highImpactOpenBundles]
  );
  const selectedAssemblyBundle = useMemo(() => {
    if (assemblyBundles.length === 0) return null;
    return (
      assemblyBundles.find(bundle => bundle.key === selectedBundleKey) ||
      highImpactOpenBundles[0] ||
      assemblyBundles[0]
    );
  }, [assemblyBundles, highImpactOpenBundles, selectedBundleKey]);

  useEffect(() => {
    if (assemblyBundles.length === 0) {
      if (selectedBundleKey !== null) setSelectedBundleKey(null);
      return;
    }
    if (!assemblyBundles.some(bundle => bundle.key === selectedBundleKey)) {
      setSelectedBundleKey(
        (highImpactOpenBundles[0] || assemblyBundles[0]).key
      );
    }
  }, [assemblyBundles, highImpactOpenBundles, selectedBundleKey]);

  const groupedItems = useMemo(() => {
    if (!activeItems) return {};
    const groups: Record<string, typeof items> = {};
    for (const item of activeItems) {
      const div = (item as any).csiDivision || "00";
      if (!groups[div]) groups[div] = [];
      groups[div].push(item);
    }
    return groups;
  }, [activeItems]);

  const toggleDivision = (div: string) => {
    setCollapsedDivisions(prev => {
      const next = new Set(prev);
      if (next.has(div)) next.delete(div);
      else next.add(div);
      return next;
    });
  };

  const toggleBundle = (bundleKey: string) => {
    setExpandedBundles(prev => {
      const next = new Set(prev);
      if (next.has(bundleKey)) next.delete(bundleKey);
      else next.add(bundleKey);
      return next;
    });
  };

  const applyScopeDecision = useCallback(
    (
      item: any,
      status: "included" | "review" | "excluded",
      reviewed = true
    ) => {
      updateItemMutation.mutate({
        id: item.id,
        projectId,
        notes: scopeDecisionNotes(item.notes, status),
        reviewed,
      });
    },
    [projectId, updateItemMutation]
  );

  const applyBundleDecision = useCallback(
    (bundle: AssemblyBundle, status: "included" | "review" | "excluded") => {
      const targetItems =
        status === "included"
          ? bundle.items.filter(item => !isScopeIncludedItem(item))
          : status === "review"
            ? bundle.items.filter(
                item => !isScopeReviewItem(item) || !item.reviewed
              )
            : bundle.items.filter(item => !isScopeExcludedItem(item));

      if (targetItems.length === 0) {
        toast.info("Bundle is already in that state");
        return;
      }

      for (const item of targetItems) {
        updateItemMutation.mutate({
          id: item.id,
          projectId,
          notes: scopeDecisionNotes(item.notes, status),
          reviewed: true,
        });
      }
    },
    [projectId, updateItemMutation]
  );

  // ─── Loading State ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-cream-muted">Project not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/portal/takeoff")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Projects
        </Button>
      </div>
    );
  }

  const sheets = project.sheets || [];
  const isProcessing =
    progress?.status === "processing" || progress?.status === "post_processing";
  const hasPendingSheets = sheets.some((s: any) => s.status === "pending");
  // Parse project allowances
  const projectAllowances = parseProjectAllowances(project.allowances);
  const allowancesTotal = projectAllowances.reduce(
    (sum, a) => sum + (a.amount || 0),
    0
  );
  const itemsCost = sumScopeIncludedExtendedCost(activeItems);
  const totalCost = itemsCost + allowancesTotal;
  const potentialTotal = totalCost + reviewItemsCost;
  const bidModeBehavior = getBidModeBehavior(project.bidMode);
  const openReviewItems = reviewItems.filter((item: any) => !item.reviewed);
  const reviewedReviewItems = reviewItems.length - openReviewItems.length;
  const reviewProgressPct =
    reviewItems.length > 0
      ? Math.round((reviewedReviewItems / reviewItems.length) * 100)
      : 100;
  const readyToPrice = highImpactOpenBundles.length === 0;
  const topDecisionBundles = highImpactOpenBundles.slice(0, 3);
  const scrollToAssemblyBundle = (bundleKey?: string) => {
    if (bundleKey) {
      setSelectedBundleKey(bundleKey);
      setExpandedBundles(prev => {
        const next = new Set(prev);
        next.add(bundleKey);
        return next;
      });
    }
    window.setTimeout(() => {
      document.getElementById("assembly-review")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
  };

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Header Bar */}
      <div className="bg-navy-medium/80 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/portal/takeoff")}
              className="text-cream-muted hover:text-cream"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="w-px h-6 bg-white/10" />
            {/* ConstructLine Brand Mark */}
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white leading-tight">
                Construct<span className="text-amber-400">Line</span>
              </span>
              <span className="text-[8px] text-gray-500 tracking-wider uppercase leading-tight">
                Powered by ALP
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <h1 className="text-lg font-bold text-cream">{project.name}</h1>
              {project.description && (
                <p className="text-xs text-cream-muted">
                  {project.description}
                </p>
              )}
            </div>
            {/* Rate Profile Quick-Switch */}
            {rateProfiles && rateProfiles.length > 0 && (
              <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
                <Bookmark className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <Select
                  value={
                    project.rateProfileId
                      ? String(project.rateProfileId)
                      : "default"
                  }
                  onValueChange={val => {
                    const profileId = val === "default" ? null : Number(val);
                    updateProjectMutation.mutate(
                      { id: projectId, rateProfileId: profileId } as any,
                      {
                        onSuccess: () => {
                          refetchProject();
                          const profileName = profileId
                            ? rateProfiles.find((p: any) => p.id === profileId)
                                ?.name
                            : "Hub Default";
                          toast.success(
                            `Rate profile switched to ${profileName}`
                          );
                        },
                      }
                    );
                  }}
                >
                  <SelectTrigger className="h-8 w-[180px] bg-white/5 border-white/10 text-cream text-xs">
                    <SelectValue placeholder="Rate Profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Hub Default</SelectItem>
                    {rateProfiles.map((p: any) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {totalCost > 0 && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 font-bold text-lg">
                  {formatCurrency(totalCost, project?.currency || "USD")}
                </span>
                <span className="text-emerald-400/60 text-xs">
                  current included
                </span>
              </div>
            )}
            <div data-tour="takeoff-settings">
              <ProjectSettingsPanel
                projectId={projectId}
                currentDivisions={
                  project.selectedDivisions
                    ? JSON.parse(project.selectedDivisions)
                    : null
                }
                currentRegion={project.costRegion}
                currentCurrency={project.currency}
                currentProjectType={projectType}
                currentBidMode={project.bidMode}
                currentScopeText={project.scopeText}
                currentSpecialties={
                  project.selectedSpecialties
                    ? JSON.parse(project.selectedSpecialties)
                    : null
                }
                detectedSpecialties={
                  project.detectedSpecialties
                    ? JSON.parse(project.detectedSpecialties)
                    : null
                }
                currentRateProfileId={project.rateProfileId ?? null}
                currentAllowances={
                  project.allowances
                    ? typeof project.allowances === "string"
                      ? JSON.parse(project.allowances)
                      : project.allowances
                    : null
                }
                hasProcessedSheets={sheets.some(
                  (s: any) => s.status === "completed"
                )}
                onSave={async (
                  divisions,
                  region,
                  currency,
                  scopeText,
                  specialties,
                  rateProfileId,
                  allowances,
                  settingsProjectType,
                  bidMode
                ) => {
                  // Save rateProfileId separately via updateProject if it changed
                  if (rateProfileId !== undefined) {
                    await new Promise<void>((resolve, reject) => {
                      updateProjectMutation.mutate(
                        { id: projectId, rateProfileId } as any,
                        {
                          onSuccess: () => resolve(),
                          onError: err => reject(err),
                        }
                      );
                    });
                  }
                  return new Promise<{ regionChanged?: boolean }>(
                    (resolve, reject) => {
                      settingsMutation.mutate(
                        {
                          projectId,
                          selectedDivisions: divisions || [],
                          costRegion: region,
                          currency: currency as any,
                          ...(scopeText !== undefined ? { scopeText } : {}),
                          ...(specialties !== undefined
                            ? { selectedSpecialties: specialties }
                            : {}),
                          ...(allowances !== undefined ? { allowances } : {}),
                          ...(settingsProjectType !== undefined
                            ? { projectType: settingsProjectType }
                            : {}),
                          ...(bidMode !== undefined ? { bidMode } : {}),
                        },
                        {
                          onSuccess: result => resolve(result),
                          onError: err => reject(err),
                        }
                      );
                    }
                  );
                }}
                externalOpen={openSettingsToScope}
                onExternalOpenChange={v => setOpenSettingsToScope(v)}
                focusScope={openSettingsToScope}
                onReAnalyze={divisions => {
                  // Re-analyze with updated divisions — triggers startProcessing
                  processMutation.mutate({
                    projectId,
                    selectedDivisions: divisions || [],
                    currency: (project.currency || "USD") as
                      | "USD"
                      | "GBP"
                      | "AUD",
                    projectType,
                    bidMode: normalizeTakeoffBidMode(project.bidMode),
                    costRegion: project.costRegion || null,
                    scopeText: project.scopeText || null,
                    selectedSpecialties: project.selectedSpecialties
                      ? JSON.parse(project.selectedSpecialties)
                      : null,
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList
            data-tour="takeoff-tabs"
            className="bg-navy-medium/50 border border-white/10 mb-6"
          >
            <TabsTrigger
              value="sheets"
              className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
            >
              <FileStack className="w-4 h-4 mr-2" />
              Drawing Sheets ({sheets.length})
            </TabsTrigger>
            <TabsTrigger
              value="items"
              className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Quantity Takeoff</span>
              <span className="sm:hidden">Takeoff</span>
              <span className="ml-1 text-xs opacity-75">
                ({activeItems.length} active)
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="estimate"
              className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
            >
              <Calculator className="w-4 h-4 mr-2" />
              Estimate
            </TabsTrigger>
          </TabsList>

          {/* ─── Sheets Tab ──────────────────────────────────────────────── */}
          <TabsContent value="sheets">
            {/* Upload Area — hidden during processing when sheets already exist */}
            {!(isProcessing && sheets.length > 0) && (
              <div
                data-tour="takeoff-upload-area"
                className={`border-2 border-dashed rounded-xl p-8 mb-6 text-center transition-all ${
                  dragOver
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-white/20 hover:border-white/40 bg-navy-medium/30"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  className="hidden"
                  onChange={e => handleFileUpload(e.target.files)}
                />
                <div className="flex flex-col items-center gap-3">
                  {uploading ? (
                    <>
                      <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                      <p className="text-cream font-medium">
                        {uploadProgress
                          ? `Converting & uploading page ${uploadProgress.current} of ${uploadProgress.total}...`
                          : "Uploading drawings..."}
                      </p>
                      {uploadProgress && (
                        <div className="w-full max-w-xs">
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                              style={{
                                width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%`,
                              }}
                            />
                          </div>
                          <p className="text-cream-muted text-xs text-center mt-1.5">
                            {Math.round(
                              (uploadProgress.current / uploadProgress.total) *
                                100
                            )}
                            %
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <p className="text-amber-300 text-xs font-medium">
                          Please stay on this page — PDF conversion runs in your
                          browser and will stop if you navigate away.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-cream-muted" />
                      <div>
                        <p className="text-cream font-medium">
                          Drag & drop construction drawings here
                        </p>
                        <p className="text-cream-muted text-sm mt-1">
                          Supports PDF (multi-page) and images (PNG, JPG). Each
                          page is analyzed separately.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2"
                      >
                        <FileImage className="w-4 h-4 mr-2" />
                        Browse Files
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Analyze Drawings Button — opens Pre-Analysis Modal */}
            {/* Shows when: sheets exist AND not currently processing */}
            {sheets.length > 0 && !isProcessing && (
              <div className="mb-6">
                <Button
                  data-tour="takeoff-analyze-btn"
                  onClick={() => setShowPreAnalysis(true)}
                  disabled={processMutation.isPending}
                  className={`w-full font-semibold py-6 text-lg shadow-lg ${
                    hasPendingSheets
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  }`}
                >
                  {processMutation.isPending && (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  )}
                  {hasPendingSheets ? (
                    <>
                      <span className="font-bold tracking-tight">
                        <span className="text-white">Construct</span>
                        <span className="text-amber-300">Line</span>
                      </span>{" "}
                      Analyze Drawings
                    </>
                  ) : (
                    <>
                      <span className="font-bold tracking-tight">
                        <span className="text-white">Construct</span>
                        <span className="text-amber-300">Line</span>
                      </span>{" "}
                      Re-Analyze Drawings
                    </>
                  )}
                  <span className="ml-2 text-sm opacity-75">
                    (
                    {hasPendingSheets
                      ? `${sheets.filter((s: any) => s.status === "pending").length} sheets to analyze`
                      : `${sheets.length} sheets — update settings & re-run`}
                    )
                  </span>
                </Button>
              </div>
            )}

            {/* Pre-Analysis Modal */}
            <PreAnalysisModal
              open={showPreAnalysis}
              onClose={() => setShowPreAnalysis(false)}
              onConfirm={(settings: PreAnalysisSettings) => {
                setShowPreAnalysis(false);
                // Save preferred currency for next time
                savePreferredCurrency.mutate({ currency: settings.currency });
                // Save allowances to project if any were entered
                if (settings.allowances && settings.allowances.length > 0) {
                  settingsMutation.mutate({
                    projectId,
                    selectedDivisions: settings.selectedDivisions,
                    costRegion: settings.costRegion,
                    currency: settings.currency as any,
                    projectType: settings.projectType,
                    bidMode: settings.bidMode,
                    allowances: settings.allowances.map(a => ({
                      description: a.description,
                      amount: a.amount,
                    })),
                  });
                }
                processMutation.mutate({
                  projectId,
                  currency: settings.currency,
                  projectType: settings.projectType,
                  bidMode: settings.bidMode,
                  costRegion: settings.costRegion,
                  selectedDivisions: settings.selectedDivisions,
                  scopeText: settings.scopeText || null,
                  selectedSpecialties:
                    settings.selectedSpecialties.length > 0
                      ? settings.selectedSpecialties
                      : null,
                });
              }}
              pendingSheetCount={
                sheets.filter((s: any) => s.status === "pending").length ||
                sheets.length
              }
              isSubmitting={processMutation.isPending}
              existingDivisions={
                project.selectedDivisions
                  ? JSON.parse(project.selectedDivisions)
                  : null
              }
              existingRegion={project.costRegion}
              existingCurrency={project.currency}
              existingProjectType={projectType}
              existingBidMode={project.bidMode}
              preferredCurrency={preferredCurrencyQuery.data?.currency}
              existingScopeText={project.scopeText}
              existingSpecialties={
                project.selectedSpecialties
                  ? JSON.parse(project.selectedSpecialties)
                  : null
              }
              detectedSpecialties={
                project.detectedSpecialties
                  ? JSON.parse(project.detectedSpecialties)
                  : null
              }
              uncalibratedSheetCount={
                sheets.filter(
                  (s: any) => s.status !== "pending" && !sheetScales[s.id]
                ).length
              }
              onSetScale={() => {
                // Close pre-analysis modal and scroll to sheets tab
                setShowPreAnalysis(false);
                setActiveTab("sheets");
              }}
            />

            {/* Processing Overlay — animated construction-themed progress */}
            {isProcessing && progress && (
              <div className="mb-6">
                <ProcessingOverlay
                  totalSheets={progress.totalSheets}
                  processedSheets={progress.processedSheets}
                  projectStatus={progress.status}
                  sheets={sheets.map((s: any) => ({
                    id: s.id,
                    sheetName: s.sheetName,
                    pageNumber: s.pageNumber,
                    status: s.status,
                  }))}
                  onRetrySheet={sheetId =>
                    reprocessMutation.mutate({ sheetId, projectId })
                  }
                />
              </div>
            )}

            {/* Sheet Grid */}
            {sheets.length > 0 ? (
              <div
                data-tour="takeoff-sheet-grid"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {sheets.map((sheet: any) => {
                  // Detect context-only sheets (cover, general notes) that were auto-completed
                  const isContextOnly =
                    sheet.status === "completed" && sheet.sheetType === "cover";
                  const statusConfig = isContextOnly
                    ? {
                        label: "Context Only",
                        color: "bg-blue-500/20 text-blue-300",
                        icon: CheckCircle2,
                      }
                    : SHEET_STATUS_CONFIG[sheet.status] ||
                      SHEET_STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <Card
                      key={sheet.id}
                      className="bg-navy-medium/50 border-white/10 overflow-hidden group hover:border-amber-500/30 transition-all"
                    >
                      {/* Sheet Thumbnail */}
                      <div
                        className="aspect-[4/3] bg-navy-deep/50 relative cursor-pointer"
                        onClick={() => setPreviewSheet(sheet)}
                      >
                        {sheet.imageUrl ? (
                          <img
                            src={sheet.imageUrl}
                            alt={sheet.sheetName || `Page ${sheet.pageNumber}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileImage className="w-12 h-12 text-cream-muted/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <Eye className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute top-2 right-2">
                          <Badge
                            className={`${statusConfig.color} text-xs flex items-center gap-1`}
                          >
                            <StatusIcon
                              className={`w-3 h-3 ${sheet.status === "processing" ? "animate-spin" : ""}`}
                            />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <p className="text-cream text-sm font-medium truncate">
                              {sheet.sheetName || `Page ${sheet.pageNumber}`}
                            </p>
                            {sheet.sheetType && sheet.sheetType !== "other" && (
                              <p className="text-cream-muted text-xs capitalize">
                                {sheet.sheetType.replace(/_/g, " ")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Set Scale button — always visible when sheet has an image */}
                            {sheet.imageUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-cream-muted hover:text-amber-400"
                                title={
                                  sheetScales[sheet.id]
                                    ? `Scale set: 1 ${sheetScales[sheet.id].unit} = ${Math.round(sheetScales[sheet.id].ratio)}px`
                                    : "Set drawing scale for accurate AI measurements"
                                }
                                onClick={e => {
                                  e.stopPropagation();
                                  setCalibratingSheet(sheet);
                                }}
                              >
                                <Ruler className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(sheet.status === "error" ||
                              sheet.status === "completed") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-cream-muted hover:text-amber-400"
                                onClick={() =>
                                  reprocessMutation.mutate({
                                    sheetId: sheet.id,
                                    projectId,
                                  })
                                }
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                        {sheet.errorMessage && (
                          <p className="text-red-400 text-xs mt-1 line-clamp-2">
                            {sheet.errorMessage}
                          </p>
                        )}
                        {/* Scale indicator with verification badge */}
                        {sheetScales[sheet.id] && (
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                            <p className="text-[10px] text-amber-400/70 flex items-center gap-1">
                              <Ruler className="w-2.5 h-2.5" />
                              {getScaleLabel(sheetScales[sheet.id].ratio)}
                            </p>
                            {sheetScales[sheet.id].method === "measured" ? (
                              <span className="text-[9px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded px-1.5 py-0.5">
                                Measured
                              </span>
                            ) : sheetScales[sheet.id].method ===
                              "title_block" ? (
                              <span className="text-[9px] bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5">
                                Title Block
                              </span>
                            ) : null}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-cream-muted">
                <FileStack className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>
                  No drawing sheets uploaded yet. Upload PDF or image files
                  above.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ─── Quantity Items Tab ──────────────────────────────────────── */}
          <TabsContent value="items">
            {/* Consolidation Processing Overlay — full visual stepper */}
            {isConsolidating && progress && (
              <div className="mb-6">
                <ProcessingOverlay
                  totalSheets={progress.totalSheets}
                  processedSheets={progress.processedSheets}
                  projectStatus={progress.status}
                  sheets={sheets.map((s: any) => ({
                    id: s.id,
                    sheetName: s.sheetName,
                    pageNumber: s.pageNumber,
                    status: s.status,
                  }))}
                  onRetrySheet={sheetId =>
                    reprocessMutation.mutate({ sheetId, projectId })
                  }
                />
              </div>
            )}
            {!items || items.length === 0 ? (
              <div className="text-center py-16 text-cream-muted">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg">No quantity items yet.</p>
                <p className="text-sm mt-1">
                  Upload drawings and run{" "}
                  <span className="font-semibold">
                    <span className="text-white">Construct</span>
                    <span className="text-amber-400">Line</span>
                  </span>{" "}
                  analysis to extract quantities.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Bar — Redesigned two-row toolbar */}
                <div
                  data-tour="takeoff-summary-bar"
                  className="bg-navy-medium/50 border border-white/10 rounded-lg px-4 py-3 space-y-2"
                >
                  {/* Row 1: Stats + Total + Primary Actions */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Left: Stats */}
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-5 text-sm text-cream-muted">
                      <span className="whitespace-normal">
                        <span className="text-cream">
                          {activeItems.length} active
                        </span>
                        <span className="text-red-300/80">
                          {" "}
                          • {excludedItems.length} excluded/boundary
                        </span>
                        <span
                          className={
                            scopeReviewCount > 0
                              ? "text-amber-300/90"
                              : "text-cream-muted"
                          }
                        >
                          {" "}
                          • {scopeReviewCount} need review
                        </span>
                      </span>
                      <span className="hidden sm:inline whitespace-nowrap">
                        {Object.keys(groupedItems).length} CSI divisions
                      </span>
                      {project?.lastAnalyzedAt && (
                        <span
                          className="hidden md:inline whitespace-nowrap text-xs text-cream-muted/60"
                          title={new Date(
                            project.lastAnalyzedAt
                          ).toLocaleString()}
                        >
                          Last analyzed:{" "}
                          {new Date(project.lastAnalyzedAt).toLocaleDateString(
                            undefined,
                            {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      )}
                    </div>
                    {/* Right: Total */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-cream-muted text-sm hidden sm:inline">
                        Pricing ref:
                      </span>
                      <span className="text-amber-400 font-bold text-lg sm:text-xl tabular-nums">
                        {formatCurrency(totalCost, project?.currency || "USD")}
                      </span>
                    </div>
                  </div>
                  {/* Row 2: Action Buttons — compact with overflow dropdown */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
                    {/* Re-run Analysis — manual re-trigger of full post-processing pipeline */}
                    <div className="relative group">
                      <Button
                        data-tour="takeoff-consolidate-btn"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          consolidateMutation.mutate({ projectId })
                        }
                        disabled={consolidateMutation.isPending || isProcessing}
                        className="h-7 text-xs gap-1.5 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      >
                        {consolidateMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">
                          Re-run Scope Analysis
                        </span>
                        <span className="sm:hidden">Re-run</span>
                      </Button>
                      <div className="absolute top-full left-0 mt-2 w-72 p-3 bg-navy-deep border border-amber-500/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <p className="text-amber-400 text-xs font-semibold mb-1.5">
                          Re-run Full Analysis Pipeline
                        </p>
                        <p className="text-cream-muted text-[11px] mb-2">
                          This runs automatically after upload. Use this to
                          re-process after editing scope or adding sheets.
                        </p>
                        <ul className="text-cream-muted text-[11px] space-y-1">
                          <li>
                            • Merges duplicate items from different sheets
                          </li>
                          <li>• Converts lump sums to measured quantities</li>
                          <li>• Calculates concrete volumes (CY)</li>
                          <li>• Generates formwork items</li>
                          <li>• Removes out-of-scope items</li>
                        </ul>
                      </div>
                    </div>
                    {/* Re-price */}
                    <div className="relative group">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => repriceMutation.mutate({ projectId })}
                        disabled={repriceMutation.isPending || isProcessing}
                        className="h-7 text-xs gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                      >
                        {repriceMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <DollarSign className="w-3.5 h-3.5" />
                        )}
                        <span className="hidden sm:inline">Re-price</span>
                      </Button>
                      <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-navy-deep border border-blue-500/20 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                        <p className="text-blue-400 text-xs font-semibold mb-1.5">
                          Re-run Cost Lookup
                        </p>
                        <ul className="text-cream-muted text-[11px] space-y-1">
                          <li>• Re-matches items against cost database</li>
                          <li>• Fixes $1.00 placeholder costs</li>
                          <li>• Applies regional cost multiplier</li>
                        </ul>
                      </div>
                    </div>
                    <div className="w-px h-5 bg-white/10" />
                    {/* Export dropdown — combines Excel + CSV */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!items || items.length === 0}
                          className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          Export
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem onClick={handleExportExcel}>
                          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                          Excel (.xlsx)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportCsv}>
                          <Download className="w-4 h-4 text-blue-400" />
                          CSV (.csv)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <input
                      ref={importFileRef}
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleImportExcel}
                    />
                    <div className="w-px h-5 bg-white/10" />
                    {/* Add Item */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddItem(true)}
                      className="h-7 text-xs gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                      title="Add a manual line item"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Item</span>
                    </Button>
                    {/* More dropdown — Measurements + Show Diff */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-7 text-xs gap-1 border-white/10 text-cream-muted hover:bg-white/5 hover:text-cream ${
                            showConsolidationDiff
                              ? "border-cyan-500/40 text-cyan-400"
                              : ""
                          }`}
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">More</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onClick={() => setShowRollup(true)}
                          disabled={
                            !projectMarkups || projectMarkups.length === 0
                          }
                        >
                          <Layers className="w-4 h-4 text-amber-400" />
                          Measurements
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setOpenSettingsToScope(true);
                          }}
                        >
                          <FileText className="w-4 h-4 text-amber-400" />
                          Edit Scope
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => importFileRef.current?.click()}
                        >
                          <Upload className="w-4 h-4 text-amber-400" />
                          Import Excel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* ─── Markup Calculator Panel ─────────────────────────────── */}
                {showMarkup &&
                  (() => {
                    const materialTotal = totalCost / 100; // cents to dollars
                    const laborAmt = materialTotal * (markups.labor / 100);
                    const subtotalWithLabor = materialTotal + laborAmt;
                    const overheadAmt =
                      subtotalWithLabor * (markups.overhead / 100);
                    const profitAmt =
                      subtotalWithLabor * (markups.profit / 100);
                    const bondsAmt = subtotalWithLabor * (markups.bonds / 100);
                    const contingencyAmt =
                      subtotalWithLabor * (markups.contingency / 100);
                    const grandTotal =
                      subtotalWithLabor +
                      overheadAmt +
                      profitAmt +
                      bondsAmt +
                      contingencyAmt;
                    const totalMarkupPct =
                      materialTotal > 0
                        ? ((grandTotal - materialTotal) / materialTotal) * 100
                        : 0;
                    const curr = project?.currency || "USD";
                    const fmtDollars = (v: number) =>
                      new Intl.NumberFormat(CURRENCY_LOCALE[curr] || "en-US", {
                        style: "currency",
                        currency: curr,
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(v);

                    return (
                      <div className="bg-navy-medium/60 border border-purple-500/20 rounded-lg p-5 mb-4">
                        <div className="flex items-center gap-2 mb-4">
                          <Calculator className="w-4 h-4 text-purple-400" />
                          <h3 className="text-cream font-semibold text-sm">
                            Bid Markup Calculator
                          </h3>
                          <span className="text-cream-muted text-xs ml-auto">
                            Adjust percentages to build your full bid number
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
                          {[
                            {
                              key: "labor" as const,
                              label: "Labor",
                              hint: "Labor cost as % of material",
                            },
                            {
                              key: "overhead" as const,
                              label: "Overhead",
                              hint: "Office, insurance, etc.",
                            },
                            {
                              key: "profit" as const,
                              label: "Profit",
                              hint: "Your margin",
                            },
                            {
                              key: "bonds" as const,
                              label: "Bonds",
                              hint: "Performance & payment bonds",
                            },
                            {
                              key: "contingency" as const,
                              label: "Contingency",
                              hint: "Risk buffer",
                            },
                          ].map(({ key, label, hint }) => (
                            <div key={key}>
                              <Label className="text-cream-muted text-xs mb-1 block">
                                {label}
                              </Label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  max={500}
                                  step={1}
                                  value={markups[key] || ""}
                                  onChange={e =>
                                    setMarkups(prev => ({
                                      ...prev,
                                      [key]: parseFloat(e.target.value) || 0,
                                    }))
                                  }
                                  className="h-9 bg-navy-deep/80 border-white/10 text-cream text-sm pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0"
                                />
                                <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cream-muted/50" />
                              </div>
                              <p className="text-cream-muted/50 text-[10px] mt-0.5">
                                {hint}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="border-t border-white/10 pt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                            <div className="flex justify-between py-1">
                              <span className="text-cream-muted">
                                Material Takeoff Total
                              </span>
                              <span className="text-cream font-mono">
                                {fmtDollars(materialTotal)}
                              </span>
                            </div>
                            {markups.labor > 0 && (
                              <div className="flex justify-between py-1">
                                <span className="text-cream-muted">
                                  + Labor ({markups.labor}%)
                                </span>
                                <span className="text-cream font-mono">
                                  {fmtDollars(laborAmt)}
                                </span>
                              </div>
                            )}
                            {markups.overhead > 0 && (
                              <div className="flex justify-between py-1">
                                <span className="text-cream-muted">
                                  + Overhead ({markups.overhead}%)
                                </span>
                                <span className="text-cream font-mono">
                                  {fmtDollars(overheadAmt)}
                                </span>
                              </div>
                            )}
                            {markups.profit > 0 && (
                              <div className="flex justify-between py-1">
                                <span className="text-cream-muted">
                                  + Profit ({markups.profit}%)
                                </span>
                                <span className="text-cream font-mono">
                                  {fmtDollars(profitAmt)}
                                </span>
                              </div>
                            )}
                            {markups.bonds > 0 && (
                              <div className="flex justify-between py-1">
                                <span className="text-cream-muted">
                                  + Bonds ({markups.bonds}%)
                                </span>
                                <span className="text-cream font-mono">
                                  {fmtDollars(bondsAmt)}
                                </span>
                              </div>
                            )}
                            {markups.contingency > 0 && (
                              <div className="flex justify-between py-1">
                                <span className="text-cream-muted">
                                  + Contingency ({markups.contingency}%)
                                </span>
                                <span className="text-cream font-mono">
                                  {fmtDollars(contingencyAmt)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-amber-500/20">
                            <div>
                              <span className="text-amber-400 font-bold text-lg">
                                Bid Total
                              </span>
                              {totalMarkupPct > 0 && (
                                <span className="text-cream-muted text-xs ml-2">
                                  (+{totalMarkupPct.toFixed(1)}% over material)
                                </span>
                              )}
                            </div>
                            <span className="text-amber-400 font-bold text-2xl font-mono">
                              {fmtDollars(grandTotal)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                {/* ─── Summary Breakdown Bar ───────────────────────────────────────── */}
                {items &&
                  items.length > 0 &&
                  assemblyBundles.length === 0 &&
                  (() => {
                    const materialSubtotal =
                      sumScopeIncludedMaterialCost(activeItems);
                    const laborSubtotal =
                      sumScopeIncludedLaborCost(activeItems);
                    const curr = project?.currency || "USD";
                    return (
                      <div className="bg-navy-medium/40 border border-white/10 rounded-lg px-5 py-4">
                        {(reviewItems.length > 0 ||
                          excludedItems.length > 0) && (
                          <p className="mb-3 text-xs text-amber-100/80">
                            {reviewItems.length > 0
                              ? `${reviewItems.length} needs-review item${reviewItems.length !== 1 ? "s are" : " is"} held out of totals`
                              : ""}
                            {reviewItems.length > 0 && excludedItems.length > 0
                              ? " and "
                              : ""}
                            {excludedItems.length > 0
                              ? `${excludedItems.length} excluded/boundary item${excludedItems.length !== 1 ? "s are" : " is"} visible below`
                              : ""}
                            . Only included scope items count in these totals.
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                          {/* Material Subtotal */}
                          <div className="flex flex-col">
                            <span className="text-cream-muted text-xs uppercase tracking-wider mb-1">
                              Material
                            </span>
                            <span className="text-cream font-mono font-semibold text-lg">
                              {formatCurrency(materialSubtotal, curr)}
                            </span>
                          </div>
                          {/* Cost-library labor subtotal */}
                          <div className="flex flex-col">
                            <span className="text-cyan-400/60 text-xs uppercase tracking-wider mb-1">
                              Default Labor
                            </span>
                            <span className="text-cyan-400 font-mono font-semibold text-lg">
                              {formatCurrency(laborSubtotal, curr)}
                            </span>
                            <span className="text-cream-muted/50 text-[10px] mt-0.5">
                              Used as estimate fallback until crew labor
                              replaces it
                            </span>
                          </div>
                          {/* Allowances Subtotal */}
                          <div className="flex flex-col">
                            <span className="text-amber-400/60 text-xs uppercase tracking-wider mb-1">
                              Allowances
                            </span>
                            <span className="text-amber-400 font-mono font-semibold text-lg">
                              {formatCurrency(allowancesTotal, curr)}
                            </span>
                          </div>
                          {/* Current Included Total */}
                          <div className="flex flex-col border-l border-white/10 pl-4">
                            <span className="text-emerald-400/60 text-xs uppercase tracking-wider mb-1">
                              Current Included
                            </span>
                            <span className="text-emerald-400 font-mono font-bold text-lg">
                              {formatCurrency(totalCost, curr)}
                            </span>
                          </div>
                          {/* Review Subtotal */}
                          <div className="flex flex-col">
                            <span className="text-amber-300/70 text-xs uppercase tracking-wider mb-1">
                              Review Queue
                            </span>
                            <span className="text-amber-300 font-mono font-semibold text-lg">
                              {formatCurrency(reviewItemsCost, curr)}
                            </span>
                            <span className="text-cream-muted/50 text-[10px] mt-0.5">
                              {reviewItems.length} held for estimator decision
                            </span>
                          </div>
                          {/* Potential Total */}
                          <div className="flex flex-col">
                            <span className="text-blue-300/70 text-xs uppercase tracking-wider mb-1">
                              If Accepted
                            </span>
                            <span className="text-blue-300 font-mono font-bold text-lg">
                              {formatCurrency(potentialTotal, curr)}
                            </span>
                            <span className="text-cream-muted/50 text-[10px] mt-0.5">
                              Active plus accepted review items
                            </span>
                          </div>
                        </div>
                        {excludedItems.length > 0 && (
                          <p className="mt-3 text-[11px] text-red-200/70">
                            Excluded / boundary reference:{" "}
                            {formatCurrency(excludedItemsCost, curr)} outside
                            active totals.
                          </p>
                        )}
                      </div>
                    );
                  })()}

                {items && items.length > 0 && assemblyBundles.length === 0 && (
                  <div className="border border-white/10 rounded-lg overflow-hidden bg-navy-medium/30">
                    <div className="px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-amber-300" />
                          <h2 className="text-sm font-semibold text-cream">
                            Bid Review Checklist
                          </h2>
                          <Badge
                            className={
                              readyToPrice
                                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                                : "bg-amber-500/15 text-amber-200 border-amber-500/25"
                            }
                          >
                            {readyToPrice
                              ? "Ready to price"
                              : `${highImpactOpenBundles.length} big decision${highImpactOpenBundles.length !== 1 ? "s" : ""} left`}
                          </Badge>
                        </div>
                        <p className="text-xs text-cream-muted mt-1">
                          Start at the top. Decide the big packages, then price
                          the estimate.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          topDecisionBundles[0]
                            ? scrollToAssemblyBundle(topDecisionBundles[0].key)
                            : scrollToAssemblyBundle()
                        }
                        className="h-8 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                      >
                        <Flag className="w-3.5 h-3.5 mr-1.5" />
                        Start Here
                      </Button>
                    </div>
                    <div className="grid md:grid-cols-3">
                      <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-white/10">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-wider text-cream-muted">
                            1. Current Bid
                          </span>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <p className="mt-2 text-2xl font-mono font-bold text-emerald-400">
                          {formatCurrency(
                            totalCost,
                            project?.currency || "USD"
                          )}
                        </p>
                        <p className="text-xs text-cream-muted">
                          This is what counts now. Anything below is not in the
                          bid until you choose it.
                        </p>
                      </div>
                      <div className="px-4 py-3 border-b md:border-b-0 md:border-r border-white/10">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-wider text-cream-muted">
                            2. Decide Next
                          </span>
                          <Flag className="w-4 h-4 text-amber-300" />
                        </div>
                        <p className="mt-2 text-2xl font-mono font-bold text-amber-300">
                          {highImpactOpenBundles.length}
                        </p>
                        <p className="text-xs text-cream-muted">
                          {formatCurrency(
                            highImpactOpenBundleCost,
                            project?.currency || "USD"
                          )}{" "}
                          still needs an answer.
                        </p>
                        {reviewItems.length > 0 && (
                          <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${reviewProgressPct}%` }}
                            />
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs uppercase tracking-wider text-cream-muted">
                            3. Price Last
                          </span>
                          <AlertCircle className="w-4 h-4 text-amber-300" />
                        </div>
                        <p
                          className={`mt-2 text-lg font-semibold ${
                            readyToPrice ? "text-emerald-300" : "text-amber-200"
                          }`}
                        >
                          {readyToPrice ? "Looks ready" : "Do not price yet"}
                        </p>
                        <p className="text-xs text-cream-muted">
                          {readyToPrice
                            ? "Open Estimate and finish labor, markups, and export."
                            : "Finish the big decisions first, then use the Estimate tab."}
                        </p>
                        <Button
                          size="sm"
                          variant={readyToPrice ? "default" : "outline"}
                          disabled={!readyToPrice}
                          onClick={() => setActiveTab("estimate")}
                          className={
                            readyToPrice
                              ? "mt-3 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                              : "mt-3 h-8 border-white/10 text-cream-muted"
                          }
                        >
                          Open Estimate
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {assemblyBundles.length > 0 &&
                  selectedAssemblyBundle &&
                  (() => {
                    const bundle = selectedAssemblyBundle;
                    const selectedSheet = sheets.find(
                      (sheet: any) => sheet.id === bundle.primaryItem?.sheetId
                    );
                    const expanded = expandedBundles.has(bundle.key);
                    const nextOpenBundle = highImpactOpenBundles.find(
                      candidate => candidate.key !== bundle.key
                    );
                    const recommendedLabel =
                      bundle.recommendedDecision === "include"
                        ? "Add to Bid"
                        : bundle.recommendedDecision === "exclude"
                          ? "Not in Bid"
                          : "Review";
                    const totalReference =
                      bundle.currentIncludedCost +
                      bundle.reviewCost +
                      bundle.excludedCost;
                    const statusLabel =
                      bundle.status === "include"
                        ? "Added to Bid"
                        : bundle.status === "exclude"
                          ? "Not in Bid"
                          : bundle.status === "review"
                            ? "Decided Later"
                            : bundle.status === "mixed"
                              ? "Partly Decided"
                              : "Needs Decision";
                    const statusClass =
                      bundle.status === "include"
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                        : bundle.status === "exclude"
                          ? "bg-red-500/15 text-red-200 border-red-500/25"
                          : bundle.status === "review"
                            ? "bg-amber-500/15 text-amber-200 border-amber-500/25"
                            : bundle.status === "mixed"
                              ? "bg-blue-500/15 text-blue-200 border-blue-500/25"
                              : "bg-amber-500/15 text-amber-200 border-amber-500/25";
                    return (
                      <div
                        id="assembly-review"
                        className="border border-white/10 rounded-lg overflow-hidden bg-navy-medium/25"
                      >
                        <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Layers className="w-4 h-4 text-amber-300" />
                              <h2 className="text-sm font-semibold text-cream">
                                Foreman Workbench
                              </h2>
                              <Badge className="bg-white/5 text-cream-muted border-white/10 text-xs">
                                {assemblyBundles.length} package
                                {assemblyBundles.length !== 1 ? "s" : ""}
                              </Badge>
                              {highImpactOpenBundles.length > 0 && (
                                <Badge className="bg-amber-500/15 text-amber-200 border-amber-500/25 text-xs">
                                  {highImpactOpenBundles.length} need a decision
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-cream-muted mt-1">
                              Work down the punch list. Check the drawing. Make
                              one decision and move to the next package.
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              nextOpenBundle
                                ? setSelectedBundleKey(nextOpenBundle.key)
                                : setActiveTab("estimate")
                            }
                            className="h-8 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                          >
                            <Flag className="w-3.5 h-3.5 mr-1.5" />
                            {nextOpenBundle ? "Next Package" : "Open Estimate"}
                          </Button>
                        </div>

                        <div className="grid xl:grid-cols-[320px_minmax(0,1fr)_340px]">
                          <aside className="border-b xl:border-b-0 xl:border-r border-white/10 bg-navy-deep/35">
                            <div className="px-4 py-3 border-b border-white/10">
                              <p className="text-xs font-semibold uppercase tracking-wider text-cream">
                                Package Punch List
                              </p>
                              <p className="text-xs text-cream-muted mt-1">
                                Start with the biggest open package.
                              </p>
                            </div>
                            <div className="max-h-[680px] overflow-y-auto p-2 space-y-2">
                              {assemblyBundles.map(candidate => {
                                const active = candidate.key === bundle.key;
                                const done = candidate.status !== "open";
                                const candidateStatus =
                                  candidate.status === "include"
                                    ? "Added to Bid"
                                    : candidate.status === "exclude"
                                      ? "Not in Bid"
                                      : candidate.status === "review"
                                        ? "Decided Later"
                                        : candidate.status === "mixed"
                                          ? "Partly Decided"
                                          : `${candidate.openReviewCount} need decision`;
                                return (
                                  <button
                                    key={candidate.key}
                                    type="button"
                                    onClick={() =>
                                      setSelectedBundleKey(candidate.key)
                                    }
                                    className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                                      active
                                        ? "border-amber-400/60 bg-amber-500/10"
                                        : done
                                          ? "border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07]"
                                          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {done ? (
                                        <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-emerald-300" />
                                      ) : (
                                        <Flag className="mt-0.5 w-4 h-4 shrink-0 text-amber-300" />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-cream line-clamp-2">
                                          {candidate.title}
                                        </p>
                                        <p className="mt-1 text-[11px] text-cream-muted line-clamp-1">
                                          {candidate.primaryItem?.description}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-2">
                                      <span
                                        className={`text-[11px] font-semibold ${
                                          done
                                            ? "text-emerald-300"
                                            : "text-amber-200"
                                        }`}
                                      >
                                        {candidateStatus}
                                      </span>
                                      <span className="font-mono text-[11px] text-cream-muted">
                                        {formatCurrency(
                                          candidate.openReviewCost,
                                          project?.currency || "USD"
                                        )}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </aside>

                          <section className="min-w-0 border-b xl:border-b-0 xl:border-r border-white/10">
                            <div className="px-4 py-3 border-b border-white/10">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="bg-blue-500/15 text-blue-200 border-blue-500/25 text-[10px]">
                                      <FileImage className="w-3 h-3 mr-1" />
                                      {bundle.drawingGroup}
                                    </Badge>
                                    <Badge
                                      className={`${statusClass} text-[10px]`}
                                    >
                                      {bundle.status !== "open" && (
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                      )}
                                      {statusLabel}
                                    </Badge>
                                  </div>
                                  <h3 className="mt-2 text-lg font-semibold text-cream">
                                    {bundle.title}
                                  </h3>
                                  <p className="mt-1 text-sm text-cream-muted">
                                    {bundle.primaryItem?.description}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSelectedItem(bundle.primaryItem)
                                  }
                                  className="h-8 border-white/15 text-cream-muted hover:text-cream hover:bg-white/5"
                                >
                                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                                  Open Detail
                                </Button>
                              </div>
                            </div>

                            <div className="p-4">
                              <div className="rounded-lg border border-white/10 bg-white/[0.03] overflow-hidden">
                                {selectedSheet?.imageUrl ? (
                                  <div className="relative bg-white min-h-[360px] max-h-[620px] flex items-center justify-center">
                                    <img
                                      src={selectedSheet.imageUrl}
                                      alt={
                                        selectedSheet.sheetName ||
                                        `Page ${selectedSheet.pageNumber}`
                                      }
                                      className="max-h-[620px] w-full object-contain"
                                    />
                                    <div className="absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white">
                                      {selectedSheet.sheetName ||
                                        `Page ${selectedSheet.pageNumber}`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="min-h-[360px] flex flex-col items-center justify-center gap-2 text-center">
                                    <FileImage className="w-10 h-10 text-cream-muted/50" />
                                    <p className="text-sm font-semibold text-cream">
                                      No drawing preview linked
                                    </p>
                                    <p className="max-w-sm text-xs text-cream-muted">
                                      Open the package detail to inspect the row
                                      notes and drawing reference.
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="mt-4 rounded-lg border border-white/10 bg-navy-deep/35 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-cream-muted">
                                  Why this needs your eye
                                </p>
                                <p className="mt-2 text-sm text-cream">
                                  {bundle.reason}
                                </p>
                                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream-muted">
                                  <span>
                                    Evidence: {bundle.sourceDrawings.join(", ")}
                                  </span>
                                  <span>
                                    {bundle.alternateItems.length} raw row
                                    {bundle.alternateItems.length !== 1
                                      ? "s"
                                      : ""}{" "}
                                    behind this package
                                  </span>
                                </div>
                              </div>
                            </div>
                          </section>

                          <aside className="bg-navy-deep/30">
                            <div className="px-4 py-3 border-b border-white/10">
                              <p className="text-xs font-semibold uppercase tracking-wider text-cream">
                                Make the Call
                              </p>
                              <p className="text-xs text-cream-muted mt-1">
                                Pick where this package belongs.
                              </p>
                            </div>
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 gap-2">
                                <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                                  <p className="text-[10px] uppercase tracking-wider text-cream-muted">
                                    In Bid Now
                                  </p>
                                  <p className="mt-1 truncate text-lg font-mono font-semibold text-emerald-300">
                                    {formatCurrency(
                                      bundle.currentIncludedCost,
                                      project?.currency || "USD"
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                                  <p className="text-[10px] uppercase tracking-wider text-cream-muted">
                                    Waiting on You
                                  </p>
                                  <p className="mt-1 truncate text-lg font-mono font-semibold text-amber-200">
                                    {formatCurrency(
                                      bundle.openReviewCost,
                                      project?.currency || "USD"
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                                  <p className="text-[10px] uppercase tracking-wider text-cream-muted">
                                    Found Total
                                  </p>
                                  <p className="mt-1 truncate text-lg font-mono font-semibold text-cream">
                                    {formatCurrency(
                                      totalReference,
                                      project?.currency || "USD"
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="grid gap-2">
                                <Button
                                  size="lg"
                                  variant={
                                    bundle.status === "include"
                                      ? "default"
                                      : "outline"
                                  }
                                  className={
                                    bundle.status === "include"
                                      ? "justify-start bg-emerald-600 hover:bg-emerald-500 text-white ring-1 ring-emerald-300/40"
                                      : "justify-start border-emerald-500/25 text-emerald-200 hover:bg-emerald-500/10"
                                  }
                                  onClick={() =>
                                    applyBundleDecision(bundle, "included")
                                  }
                                >
                                  {bundle.status === "include" ? (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                  ) : (
                                    <Check className="w-4 h-4 mr-2" />
                                  )}
                                  Add to Bid
                                </Button>
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className={
                                    bundle.status === "exclude"
                                      ? "justify-start border-red-400/50 bg-red-500/15 text-red-100 ring-1 ring-red-300/25"
                                      : "justify-start border-red-500/25 text-red-200 hover:bg-red-500/10"
                                  }
                                  onClick={() =>
                                    applyBundleDecision(bundle, "excluded")
                                  }
                                >
                                  {bundle.status === "exclude" ? (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                  ) : (
                                    <X className="w-4 h-4 mr-2" />
                                  )}
                                  Not in Bid
                                </Button>
                                <Button
                                  size="lg"
                                  variant="outline"
                                  className={
                                    bundle.status === "review"
                                      ? "justify-start border-amber-400/50 bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/25"
                                      : "justify-start border-amber-500/25 text-amber-200 hover:bg-amber-500/10"
                                  }
                                  onClick={() =>
                                    applyBundleDecision(bundle, "review")
                                  }
                                >
                                  {bundle.status === "review" ? (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                  ) : (
                                    <Square className="w-4 h-4 mr-2" />
                                  )}
                                  Decide Later
                                </Button>
                              </div>

                              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-cream-muted">
                                  Suggested Call
                                </p>
                                <p className="mt-1 text-sm font-semibold text-cream">
                                  {recommendedLabel}
                                </p>
                                <p className="mt-1 text-xs text-cream-muted">
                                  Use the drawing if you want to verify before
                                  deciding.
                                </p>
                              </div>

                              <div className="rounded-lg border border-white/10 bg-white/[0.03]">
                                <button
                                  type="button"
                                  onClick={() => toggleBundle(bundle.key)}
                                  className="flex w-full items-center justify-between px-3 py-2 text-left"
                                >
                                  <span className="text-xs font-semibold uppercase tracking-wider text-cream-muted">
                                    Rows Behind This Package
                                  </span>
                                  {expanded ? (
                                    <ChevronDown className="w-4 h-4 text-cream-muted" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-cream-muted" />
                                  )}
                                </button>
                                {expanded && (
                                  <div className="max-h-[260px] overflow-y-auto border-t border-white/10 p-2 space-y-2">
                                    {bundle.items.map(item => {
                                      const status = getScopeReviewStatus(item);
                                      const cue = getEstimatorCue(item);
                                      return (
                                        <button
                                          key={item.id}
                                          className="w-full rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-left hover:bg-white/[0.05]"
                                          onClick={() => setSelectedItem(item)}
                                        >
                                          <div className="flex flex-wrap items-center gap-2">
                                            <Badge className="bg-white/5 text-cream-muted border-white/10 text-[10px]">
                                              {item.csiCode || item.csiDivision}
                                            </Badge>
                                            <Badge
                                              className={`text-[10px] ${
                                                status === "included"
                                                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25"
                                                  : status === "review"
                                                    ? "bg-amber-500/15 text-amber-200 border-amber-500/25"
                                                    : "bg-red-500/15 text-red-200 border-red-500/25"
                                              }`}
                                            >
                                              {formatScopeReviewStatus(status)}
                                            </Badge>
                                            <Badge
                                              className={`text-[10px] ${cue.className}`}
                                            >
                                              {cue.label}
                                            </Badge>
                                          </div>
                                          <p className="mt-1 text-sm text-cream line-clamp-2">
                                            {item.description}
                                          </p>
                                          <p className="mt-1 font-mono text-xs text-amber-300">
                                            {formatCurrency(
                                              item.extendedCost || 0,
                                              project?.currency || "USD"
                                            )}
                                          </p>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </aside>
                        </div>
                      </div>
                    );
                  })()}

                <div className="bg-blue-500/8 border border-blue-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-100/75 leading-relaxed">
                    Quantity Takeoff is the draft review surface for found
                    quantities, scope decisions, material pricing, source
                    drawings, and confidence. The Estimate tab uses the accepted
                    scope as the live bid number.
                  </p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-lg px-4 py-3 flex items-start gap-3">
                  <Flag className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-cream">
                        Bid Mode
                      </span>
                      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px]">
                        {bidModeBehavior.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-cream-muted leading-relaxed mt-1">
                      {bidModeBehavior.reviewSurface}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOpenSettingsToScope(true)}
                    className="h-7 text-xs border-white/15 text-cream-muted hover:text-cream hover:bg-white/5"
                  >
                    Edit Mode
                  </Button>
                </div>

                {scopeIntent.hasScope && (
                  <div className="bg-amber-500/8 border border-amber-500/20 rounded-lg px-4 py-3 flex items-start gap-3">
                    <Flag className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-amber-300">
                          Bid Scope
                        </span>
                        <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px]">
                          {scopeIntent.summary}
                        </Badge>
                        {scopeReviewCount > 0 && (
                          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25 text-[10px]">
                            {scopeReviewCount} review item
                            {scopeReviewCount !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-amber-100/75 leading-relaxed mt-1 line-clamp-2">
                        {scopeIntent.originalText}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOpenSettingsToScope(true)}
                      className="h-7 text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                    >
                      Edit Scope
                    </Button>
                  </div>
                )}

                {/* Allowances Section — shown before CSI divisions */}
                {projectAllowances.length > 0 && (
                  <div className="bg-navy-medium/30 border border-amber-500/20 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleDivision("_allowances")}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`w-4 h-4 text-cream-muted transition-transform ${collapsedDivisions.has("_allowances") ? "-rotate-90" : ""}`}
                        />
                        <div className="flex items-center gap-2">
                          <ClipboardList className="w-4 h-4 text-amber-400" />
                          <span className="font-semibold text-cream">
                            Allowances
                          </span>
                          <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px] font-normal">
                            {projectAllowances.length} item
                            {projectAllowances.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-amber-400 font-semibold">
                        {formatCurrency(
                          allowancesTotal,
                          project?.currency || "USD"
                        )}
                      </span>
                    </button>
                    {!collapsedDivisions.has("_allowances") && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-navy-deep/50 text-cream-muted text-xs uppercase">
                              <th className="text-left px-4 py-2 w-12"></th>
                              <th className="text-left px-4 py-2">
                                Description
                              </th>
                              <th className="text-right px-4 py-2 w-28">
                                Amount
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectAllowances.map((a, idx) => (
                              <tr
                                key={idx}
                                className="border-t border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <td className="px-4 py-2 text-cream-muted font-mono text-xs">
                                  <ClipboardList className="w-3.5 h-3.5 text-amber-400/50" />
                                </td>
                                <td className="px-4 py-2 text-cream">
                                  {a.description}
                                </td>
                                <td className="px-4 py-2 text-right text-amber-300 font-mono">
                                  {formatCurrency(
                                    a.amount,
                                    project?.currency || "USD"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Items by CSI Division */}
                {Object.entries(groupedItems)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([division, divItems]) => {
                    const isCollapsed = collapsedDivisions.has(division);
                    const divTotal = (divItems as any[]).reduce(
                      (sum: number, item: any) =>
                        sum + (item.extendedCost || 0),
                      0
                    );
                    const divName =
                      CSI_DIVISION_NAMES[division] || `Division ${division}`;

                    const divReviewedCount = (divItems as any[]).filter(
                      (i: any) => i.reviewed
                    ).length;
                    const divItemCount = (divItems as any[]).length;
                    const allReviewed = divReviewedCount === divItemCount;

                    return (
                      <div
                        key={division}
                        className="border border-white/10 rounded-lg overflow-hidden"
                      >
                        {/* Division Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-navy-medium/70">
                          <button
                            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                            onClick={() => toggleDivision(division)}
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-cream-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-cream-muted" />
                            )}
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 font-mono">
                              {division}
                            </Badge>
                            <span className="text-cream font-semibold">
                              {divName}
                            </span>
                            <span className="text-cream-muted text-sm">
                              ({divItemCount} items)
                            </span>
                            {divReviewedCount > 0 && (
                              <Badge
                                className={`text-xs ${
                                  allReviewed
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                }`}
                              >
                                {allReviewed
                                  ? "All Reviewed"
                                  : `${divReviewedCount}/${divItemCount} reviewed`}
                              </Badge>
                            )}
                          </button>
                          <div className="flex items-center gap-3">
                            {allReviewed ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={() =>
                                  bulkUnreviewMutation.mutate({
                                    projectId,
                                    csiDivision: division,
                                  })
                                }
                                disabled={bulkUnreviewMutation.isPending}
                              >
                                <Square className="w-3.5 h-3.5" />
                                Unreview All
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                onClick={() =>
                                  bulkReviewMutation.mutate({
                                    projectId,
                                    csiDivision: division,
                                  })
                                }
                                disabled={bulkReviewMutation.isPending}
                              >
                                <CheckSquare className="w-3.5 h-3.5" />
                                Review All
                              </Button>
                            )}
                            <span className="text-amber-400 font-semibold">
                              {formatCurrency(
                                divTotal,
                                project?.currency || "USD"
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Division Items Table */}
                        {!isCollapsed && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-navy-deep/50 text-cream-muted text-xs uppercase">
                                  <th className="text-left px-4 py-2 w-12">
                                    CSI
                                  </th>
                                  <th className="text-left px-4 py-2">
                                    Description
                                  </th>
                                  <th className="text-right px-4 py-2 w-20">
                                    Qty
                                  </th>
                                  <th className="text-left px-4 py-2 w-14">
                                    Unit
                                  </th>
                                  <th className="text-right px-4 py-2 w-20">
                                    Material
                                  </th>
                                  <th className="text-right px-4 py-2 w-24">
                                    Default Labor
                                  </th>
                                  <th className="text-right px-4 py-2 w-24">
                                    Ref Unit
                                  </th>
                                  <th className="text-right px-4 py-2 w-28">
                                    Ref Total
                                  </th>
                                  <th className="text-center px-4 py-2 w-16">
                                    Conf.
                                  </th>
                                  <th className="text-center px-4 py-2 w-16">
                                    Verified
                                  </th>
                                  <th className="text-center px-4 py-2 w-24">
                                    Decision
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {(divItems as any[]).map((item: any) => {
                                  const scopeStatus =
                                    getScopeReviewStatus(item);
                                  return (
                                    <tr
                                      key={item.id}
                                      className={`border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                                        item.reviewed ? "bg-emerald-500/5" : ""
                                      } ${scopeStatus === "review" ? "bg-blue-500/5" : scopeStatus === "excluded" ? "bg-red-500/5" : ""}`}
                                      onClick={() => setSelectedItem(item)}
                                    >
                                      <td className="px-4 py-2 text-cream-muted font-mono text-xs">
                                        <div className="flex items-center gap-1">
                                          {item.reviewed && (
                                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                          )}
                                          {item.csiCode || item.csiDivision}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-cream max-w-xs">
                                        <p className="line-clamp-2">
                                          {item.description}
                                        </p>
                                        {scopeStatus !== "included" && (
                                          <div className="flex flex-wrap items-center gap-1 mt-1">
                                            <Badge
                                              className={`text-[10px] ${
                                                scopeStatus === "review"
                                                  ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                                                  : "bg-red-500/15 text-red-300 border-red-500/25"
                                              }`}
                                            >
                                              <Flag className="w-2.5 h-2.5 mr-0.5" />
                                              {formatScopeReviewStatus(
                                                scopeStatus
                                              )}
                                            </Badge>
                                          </div>
                                        )}
                                        {/* Consolidation diff annotations */}
                                        {showConsolidationDiff &&
                                          consolidationDiff?.hasDiff &&
                                          (() => {
                                            const ann =
                                              consolidationDiff.itemAnnotations[
                                                item.id
                                              ];
                                            if (!ann) return null;
                                            return (
                                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                                {ann.isNew && (
                                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                    New
                                                  </span>
                                                )}
                                                {ann.mergedFrom > 1 && (
                                                  <span
                                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                                                    title={ann.mergedDescriptions?.join(
                                                      "\n"
                                                    )}
                                                  >
                                                    <Merge className="w-2.5 h-2.5" />
                                                    Combined from{" "}
                                                    {ann.mergedFrom}
                                                  </span>
                                                )}
                                              </div>
                                            );
                                          })()}
                                        {item.notes && (
                                          <p className="text-cream-muted text-xs mt-0.5 line-clamp-1">
                                            {item.notes}
                                          </p>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right text-cream font-mono">
                                        <span>
                                          {parseFloat(
                                            item.quantity
                                          ).toLocaleString()}
                                        </span>
                                        {/* Needs measurement indicator */}
                                        {item.needsMeasurement && (
                                          <div
                                            className="text-[10px] text-amber-400 font-semibold mt-0.5 flex items-center justify-end gap-1"
                                            title="Quantity is a placeholder — update with actual measurement"
                                          >
                                            <Ruler className="w-3 h-3" />
                                            needs qty
                                          </div>
                                        )}
                                        {/* Quantity change annotation */}
                                        {showConsolidationDiff &&
                                          consolidationDiff?.hasDiff &&
                                          (() => {
                                            const ann =
                                              consolidationDiff.itemAnnotations[
                                                item.id
                                              ];
                                            if (
                                              !ann ||
                                              !ann.qtyChanged ||
                                              ann.isNew
                                            )
                                              return null;
                                            return (
                                              <div
                                                className="text-[10px] text-amber-400/80 font-normal mt-0.5"
                                                title="Quantity changed during consolidation"
                                              >
                                                was{" "}
                                                {(
                                                  ann.qtyBefore ?? 0
                                                ).toLocaleString()}
                                              </div>
                                            );
                                          })()}
                                      </td>
                                      <td className="px-4 py-2 text-cream-muted">
                                        {item.unit}
                                      </td>
                                      {/* Material Cost */}
                                      <td className="px-4 py-2 text-right text-cream-muted font-mono text-xs">
                                        {isConsolidating ? (
                                          <span className="inline-block w-14 h-4 rounded bg-white/10 animate-pulse" />
                                        ) : (
                                          formatCurrency(
                                            getTakeoffMaterialUnitCost(item),
                                            project?.currency || "USD"
                                          )
                                        )}
                                      </td>
                                      {/* Labor Cost */}
                                      <td className="px-4 py-2 text-right text-cyan-400/80 font-mono text-xs">
                                        {isConsolidating ? (
                                          <span className="inline-block w-14 h-4 rounded bg-cyan-400/10 animate-pulse" />
                                        ) : (
                                          formatCurrency(
                                            item.laborCost || 0,
                                            project?.currency || "USD"
                                          )
                                        )}
                                      </td>
                                      {/* Installed (Combined) Unit Cost */}
                                      <td className="px-4 py-2 text-right text-cream font-mono">
                                        {isConsolidating ? (
                                          <span
                                            className="inline-block w-16 h-4 rounded bg-white/10 animate-pulse"
                                            title="Pricing being applied..."
                                          />
                                        ) : (
                                          <>
                                            <span>
                                              {formatCurrency(
                                                item.unitCost,
                                                project?.currency || "USD"
                                              )}
                                            </span>
                                            {showConsolidationDiff &&
                                              consolidationDiff?.hasDiff &&
                                              (() => {
                                                const ann =
                                                  consolidationDiff
                                                    .itemAnnotations[item.id];
                                                if (
                                                  !ann ||
                                                  !ann.costChanged ||
                                                  ann.isNew
                                                )
                                                  return null;
                                                return (
                                                  <div
                                                    className="text-[10px] text-amber-400/80 font-normal mt-0.5"
                                                    title="Unit cost changed during consolidation"
                                                  >
                                                    was{" "}
                                                    {formatCurrency(
                                                      ann.unitCostBefore ?? 0,
                                                      project?.currency || "USD"
                                                    )}
                                                  </div>
                                                );
                                              })()}
                                          </>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-right text-amber-400 font-semibold font-mono">
                                        {isConsolidating ? (
                                          <span
                                            className="inline-block w-20 h-4 rounded bg-amber-400/10 animate-pulse"
                                            title="Pricing being applied..."
                                          />
                                        ) : (
                                          formatCurrency(
                                            item.extendedCost,
                                            project?.currency || "USD"
                                          )
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        <Badge
                                          className={`text-xs ${
                                            item.confidence >= 80
                                              ? "bg-emerald-500/20 text-emerald-400"
                                              : item.confidence >= 50
                                                ? "bg-amber-500/20 text-amber-400"
                                                : "bg-red-500/20 text-red-400"
                                          }`}
                                        >
                                          {item.confidence}%
                                        </Badge>
                                      </td>
                                      <td className="px-4 py-2 text-center">
                                        {item.reviewed ? (
                                          <div
                                            className="flex items-center justify-center"
                                            title="Reviewed & Verified"
                                          >
                                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          </div>
                                        ) : (
                                          <span className="text-cream-muted/30">
                                            —
                                          </span>
                                        )}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-center"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <div className="flex items-center justify-center gap-1">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-cream-muted hover:text-amber-400"
                                            onClick={() =>
                                              setSelectedItem(item)
                                            }
                                            title="View details"
                                          >
                                            <Eye className="w-3 h-3" />
                                          </Button>
                                          {!item.reviewed && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 w-6 p-0 text-cream-muted hover:text-emerald-400"
                                              onClick={() =>
                                                updateItemMutation.mutate({
                                                  id: item.id,
                                                  projectId,
                                                  reviewed: true,
                                                })
                                              }
                                            >
                                              <Check className="w-3 h-3" />
                                            </Button>
                                          )}
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-cream-muted hover:text-red-400"
                                            onClick={() =>
                                              deleteItemMutation.mutate({
                                                id: item.id,
                                                projectId,
                                              })
                                            }
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}

                {reviewItems.length > 0 && (
                  <div
                    id="scope-review-queue"
                    className="border border-amber-500/25 rounded-lg overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-amber-500/10">
                      <div className="flex flex-wrap items-center gap-2">
                        <Flag className="w-4 h-4 text-amber-300" />
                        <span className="text-amber-100 font-semibold">
                          Raw Review Rows
                        </span>
                        <Badge className="bg-amber-500/15 text-amber-100 border-amber-500/25 text-xs">
                          {reviewItems.length} not counted
                        </Badge>
                        {openReviewItems.length > 0 && (
                          <Badge className="bg-blue-500/15 text-blue-200 border-blue-500/25 text-xs">
                            {openReviewItems.length} open
                          </Badge>
                        )}
                        <Badge className="bg-white/5 text-cream-muted border-white/10 text-xs">
                          Review subtotal{" "}
                          {formatCurrency(
                            reviewItemsCost,
                            project?.currency || "USD"
                          )}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-amber-500/25 text-amber-200 hover:bg-amber-500/10"
                        onClick={() => setShowRawReviewRows(prev => !prev)}
                      >
                        {showRawReviewRows ? (
                          <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {showRawReviewRows ? "Hide Rows" : "Show Raw Rows"}
                      </Button>
                    </div>
                    {!showRawReviewRows && (
                      <div className="px-4 py-3 bg-amber-500/5 text-xs text-amber-100/70">
                        Assembly Review is the primary decision surface. Open
                        raw rows only when you need item-level audit,
                        measurement, or exception cleanup.
                      </div>
                    )}
                    {showRawReviewRows && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-navy-deep/50 text-cream-muted text-xs uppercase">
                              <th className="text-left px-4 py-2 w-12">CSI</th>
                              <th className="text-left px-4 py-2">
                                Description
                              </th>
                              <th className="text-left px-4 py-2 w-36">Cue</th>
                              <th className="text-right px-4 py-2 w-20">Qty</th>
                              <th className="text-left px-4 py-2 w-14">Unit</th>
                              <th className="text-center px-4 py-2 w-16">
                                Conf.
                              </th>
                              <th className="text-right px-4 py-2 w-28">
                                Review Total
                              </th>
                              <th className="text-right px-4 py-2 min-w-[260px]">
                                Decision
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {reviewItems.map((item: any) => {
                              const cue = getEstimatorCue(item);
                              return (
                                <tr
                                  key={item.id}
                                  className={`border-t border-white/5 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer ${item.reviewed ? "opacity-75" : ""}`}
                                  onClick={() => setSelectedItem(item)}
                                >
                                  <td className="px-4 py-2 text-cream-muted font-mono text-xs">
                                    {item.csiCode || item.csiDivision}
                                  </td>
                                  <td className="px-4 py-2 text-cream max-w-lg">
                                    <p className="line-clamp-2">
                                      {item.description}
                                    </p>
                                    {item.notes && (
                                      <p className="text-cream-muted text-xs mt-0.5 line-clamp-1">
                                        {item.notes}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge
                                      className={`text-[10px] ${cue.className}`}
                                    >
                                      {cue.label}
                                    </Badge>
                                    {item.reviewed && (
                                      <div className="text-[10px] text-emerald-300 mt-1 flex items-center gap-1">
                                        <Check className="w-3 h-3" />
                                        held
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right text-cream font-mono">
                                    {parseFloat(
                                      item.quantity || "0"
                                    ).toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-cream-muted">
                                    {item.unit}
                                  </td>
                                  <td className="px-4 py-2 text-center">
                                    <Badge
                                      className={`text-xs ${
                                        item.confidence >= 80
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : item.confidence >= 50
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-red-500/20 text-red-400"
                                      }`}
                                    >
                                      {item.confidence}%
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-2 text-right text-amber-100/70 font-mono">
                                    {formatCurrency(
                                      item.extendedCost || 0,
                                      project?.currency || "USD"
                                    )}
                                  </td>
                                  <td
                                    className="px-4 py-2"
                                    onClick={event => event.stopPropagation()}
                                  >
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 bg-emerald-600/90 hover:bg-emerald-500 text-white px-2.5 text-xs"
                                        onClick={() =>
                                          applyScopeDecision(item, "included")
                                        }
                                        title="Include in active total"
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        Include
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 border-red-500/25 text-red-200 hover:bg-red-500/10 px-2.5 text-xs"
                                        onClick={() =>
                                          applyScopeDecision(item, "excluded")
                                        }
                                        title="Exclude from active total"
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        Exclude
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 border-amber-500/25 text-amber-200 hover:bg-amber-500/10 px-2.5 text-xs"
                                        onClick={() =>
                                          applyScopeDecision(item, "review")
                                        }
                                        title="Keep in review queue"
                                      >
                                        <Square className="w-3 h-3 mr-1" />
                                        Hold
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-cream-muted hover:text-amber-400 px-2 text-xs"
                                        onClick={() => setSelectedItem(item)}
                                        title="View details"
                                      >
                                        <Eye className="w-3 h-3 mr-1" />
                                        Details
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {excludedItems.length > 0 && (
                  <div className="border border-red-500/25 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-red-500/10">
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-red-300" />
                        <span className="text-red-200 font-semibold">
                          Excluded / Scope Boundary Review
                        </span>
                        <Badge className="bg-red-500/15 text-red-200 border-red-500/25 text-xs">
                          {excludedItems.length} likely excluded
                        </Badge>
                      </div>
                      <span className="text-xs text-red-100/70">
                        {bidModeBehavior.shortLabel}: boundary items stay
                        visible and outside totals
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-navy-deep/50 text-cream-muted text-xs uppercase">
                            <th className="text-left px-4 py-2 w-12">CSI</th>
                            <th className="text-left px-4 py-2">Description</th>
                            <th className="text-right px-4 py-2 w-20">Qty</th>
                            <th className="text-left px-4 py-2 w-14">Unit</th>
                            <th className="text-right px-4 py-2 w-28">
                              Ref Total
                            </th>
                            <th className="text-right px-4 py-2 w-40">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {excludedItems.map((item: any) => (
                            <tr
                              key={item.id}
                              className="border-t border-white/5 bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
                              onClick={() => setSelectedItem(item)}
                            >
                              <td className="px-4 py-2 text-cream-muted font-mono text-xs">
                                {item.csiCode || item.csiDivision}
                              </td>
                              <td className="px-4 py-2 text-cream max-w-lg">
                                <p className="line-clamp-2">
                                  {item.description}
                                </p>
                                {item.notes && (
                                  <p className="text-cream-muted text-xs mt-0.5 line-clamp-1">
                                    {item.notes}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-cream font-mono">
                                {parseFloat(
                                  item.quantity || "0"
                                ).toLocaleString()}
                              </td>
                              <td className="px-4 py-2 text-cream-muted">
                                {item.unit}
                              </td>
                              <td className="px-4 py-2 text-right text-red-200/70 font-mono">
                                {formatCurrency(
                                  item.extendedCost || 0,
                                  project?.currency || "USD"
                                )}
                              </td>
                              <td
                                className="px-4 py-2"
                                onClick={event => event.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 border-blue-500/25 text-blue-200 hover:bg-blue-500/10 px-2.5 text-xs"
                                    onClick={() =>
                                      applyScopeDecision(item, "review", false)
                                    }
                                    title="Move back to review queue"
                                  >
                                    <Flag className="w-3 h-3 mr-1" />
                                    Move to Review
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-emerald-300 hover:bg-emerald-500/10 px-2.5 text-xs"
                                    onClick={() =>
                                      applyScopeDecision(item, "included")
                                    }
                                    title="Restore to active total"
                                  >
                                    <Check className="w-3 h-3 mr-1" />
                                    Restore
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-cream-muted hover:text-amber-400 px-2 text-xs"
                                    onClick={() => setSelectedItem(item)}
                                    title="View details"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Details
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── Consolidation Diff: Summary Banner ─────────────────── */}
                {showConsolidationDiff &&
                  consolidationDiff?.hasDiff &&
                  (() => {
                    const anns = Object.values(
                      consolidationDiff.itemAnnotations
                    ) as any[];
                    const newCount = anns.filter(a => a.isNew).length;
                    const mergedCount = anns.filter(
                      a => a.mergedFrom > 1
                    ).length;
                    const qtyChangedCount = anns.filter(
                      a => a.qtyChanged && !a.isNew
                    ).length;
                    const removedCount =
                      consolidationDiff.removedItems?.length || 0;
                    const unchanged =
                      (consolidationDiff.currentItemCount || 0) - anns.length;

                    return (
                      <div className="mt-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <GitCompareArrows className="w-4 h-4 text-cyan-400" />
                          <span className="text-cyan-400 font-semibold text-sm">
                            Consolidation Diff
                          </span>
                          <span className="text-cream-muted text-xs ml-auto">
                            {consolidationDiff.snapshotItemCount} items before →{" "}
                            {consolidationDiff.currentItemCount} after
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs">
                          {mergedCount > 0 && (
                            <span className="text-cyan-400">
                              <Merge className="w-3 h-3 inline mr-1" />
                              {mergedCount} merged
                            </span>
                          )}
                          {qtyChangedCount > 0 && (
                            <span className="text-amber-400">
                              {qtyChangedCount} qty changed
                            </span>
                          )}
                          {newCount > 0 && (
                            <span className="text-emerald-400">
                              {newCount} new
                            </span>
                          )}
                          {removedCount > 0 && (
                            <span className="text-red-400">
                              {removedCount} removed
                            </span>
                          )}
                          {unchanged > 0 && (
                            <span className="text-cream-muted">
                              {unchanged} unchanged
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                {/* ─── Consolidation Diff: Removed Items ──────────────────── */}
                {showConsolidationDiff &&
                  consolidationDiff?.hasDiff &&
                  consolidationDiff.removedItems &&
                  consolidationDiff.removedItems.length > 0 && (
                    <div className="mt-4 border border-red-500/20 rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-red-400 font-semibold text-sm">
                          Removed During Consolidation
                        </span>
                        <span className="text-cream-muted text-xs ml-auto">
                          {consolidationDiff.removedItems.length} items
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-navy-deep/50 text-cream-muted text-xs uppercase">
                              <th className="text-left px-4 py-2 w-12">CSI</th>
                              <th className="text-left px-4 py-2">
                                Description
                              </th>
                              <th className="text-right px-4 py-2 w-20">Qty</th>
                              <th className="text-left px-4 py-2 w-14">Unit</th>
                              <th className="text-right px-4 py-2 w-24">
                                Unit Cost
                              </th>
                              <th className="text-right px-4 py-2 w-28">
                                Extended
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {consolidationDiff.removedItems.map(
                              (ri: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className="border-t border-white/5 opacity-60"
                                >
                                  <td className="px-4 py-2 text-cream-muted font-mono text-xs line-through">
                                    {ri.csiCode || ri.csiDivision}
                                  </td>
                                  <td className="px-4 py-2 text-cream line-through">
                                    {ri.description}
                                  </td>
                                  <td className="px-4 py-2 text-right text-cream font-mono line-through">
                                    {ri.quantity.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-2 text-cream-muted line-through">
                                    {ri.unit}
                                  </td>
                                  <td className="px-4 py-2 text-right text-cream font-mono line-through">
                                    {formatCurrency(
                                      ri.unitCost,
                                      project?.currency || "USD"
                                    )}
                                  </td>
                                  <td className="px-4 py-2 text-right text-red-400/60 font-mono line-through">
                                    {formatCurrency(
                                      ri.extendedCost,
                                      project?.currency || "USD"
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )}
          </TabsContent>

          {/* ─── Estimate Tab ──────────────────────────────────────────── */}
          <TabsContent value="estimate">
            <EstimateSummary
              projectId={project.id}
              projectName={project.name}
              projectDescription={project.description || undefined}
              items={activeItems || []}
              allowances={projectAllowances}
              onAddAllowance={allowance => {
                const existing = projectAllowances.some(
                  a =>
                    (a.description || "").toLowerCase() ===
                    allowance.description.toLowerCase()
                );
                if (existing) {
                  toast.info("Allowance already exists");
                  return;
                }
                settingsMutation.mutate({
                  projectId,
                  allowances: [...projectAllowances, allowance],
                });
                toast.success("Allowance added");
              }}
              currency={project.currency || "USD"}
              costRegion={project.costRegion}
              enableResidentialQa={enableResidentialQa}
              reviewQueueCount={highImpactOpenBundles.length}
              reviewQueueCost={highImpactOpenBundleCost}
              excludedBoundaryCount={excludedItems.length}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Sheet Preview Modal ─────────────────────────────────────────── */}
      <Dialog open={!!previewSheet} onOpenChange={() => setPreviewSheet(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {previewSheet?.sheetName || `Page ${previewSheet?.pageNumber}`}
            </DialogTitle>
            <DialogDescription>
              {previewSheet?.sheetType && previewSheet.sheetType !== "other"
                ? previewSheet.sheetType.replace(/_/g, " ")
                : "Drawing sheet preview"}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {previewSheet?.imageUrl && (
              <img
                src={previewSheet.imageUrl}
                alt={previewSheet.sheetName || "Drawing"}
                className="w-full h-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Item Modal (legacy, kept for fallback) ───────────────── */}
      <EditItemDialog
        item={editingItem}
        projectId={projectId}
        onClose={() => setEditingItem(null)}
        onSave={data => updateItemMutation.mutate(data)}
        isPending={updateItemMutation.isPending}
        currencyCode={project?.currency || "USD"}
      />

      {/* ─── Item Detail Modal ──────────────────────────────────────────── */}
      {(() => {
        // Build flat item list for prev/next navigation
        const allItems = items
          ? Object.entries(
              (items as any[]).reduce(
                (acc: Record<string, any[]>, item: any) => {
                  const div = item.csiDivision || "Other";
                  if (!acc[div]) acc[div] = [];
                  acc[div].push(item);
                  return acc;
                },
                {}
              )
            )
              .sort(([a], [b]) => a.localeCompare(b))
              .flatMap(([, divItems]) => divItems as any[])
          : [];
        const selectedIdx = selectedItem
          ? allItems.findIndex((i: any) => i.id === selectedItem.id)
          : -1;
        // Look up source sheet for the selected item
        const sourceSheet = selectedItem?.sheetId
          ? sheets.find((s: any) => s.id === selectedItem.sheetId) || null
          : null;
        return (
          <ItemDetailModal
            item={selectedItem}
            projectId={projectId}
            currencyCode={project?.currency || "USD"}
            sourceSheet={sourceSheet}
            onClose={() => setSelectedItem(null)}
            onSave={data => {
              updateItemMutation.mutate(data);
              // Update selectedItem in place so modal reflects changes
              setSelectedItem((prev: any) =>
                prev
                  ? {
                      ...prev,
                      ...data,
                      unitCost: data.unitCost,
                      materialCost: data.materialCost,
                      laborCost: data.laborCost,
                      extendedCost: Math.round(
                        parseFloat(data.quantity || "0") * (data.unitCost || 0)
                      ),
                    }
                  : null
              );
            }}
            onDelete={data => {
              deleteItemMutation.mutate(data);
              setSelectedItem(null);
            }}
            onMarkReviewed={data => {
              updateItemMutation.mutate(data);
              setSelectedItem((prev: any) =>
                prev ? { ...prev, reviewed: true } : null
              );
            }}
            onScopeDecision={(item, status) => {
              applyScopeDecision(item, status);
              setSelectedItem((prev: any) =>
                prev
                  ? {
                      ...prev,
                      notes: scopeDecisionNotes(prev.notes, status),
                      reviewed: true,
                    }
                  : null
              );
            }}
            isPending={updateItemMutation.isPending}
            hasPrev={selectedIdx > 0}
            hasNext={selectedIdx >= 0 && selectedIdx < allItems.length - 1}
            onPrev={() => {
              if (selectedIdx > 0) setSelectedItem(allItems[selectedIdx - 1]);
            }}
            onNext={() => {
              if (selectedIdx < allItems.length - 1)
                setSelectedItem(allItems[selectedIdx + 1]);
            }}
          />
        );
      })()}

      {/* ─── Add Manual Item Dialog ──────────────────────────────────── */}
      {showAddItem && (
        <AddItemDialog
          projectId={projectId}
          defaultDivision={addItemDivision}
          currency={project?.currency || "USD"}
          onClose={() => setShowAddItem(false)}
          onSave={data => addItemMutation.mutate({ projectId, ...data })}
          isPending={addItemMutation.isPending}
        />
      )}

      {/* ─── Measurement Rollup Dialog ──────────────────────────────── */}
      <MeasurementRollup
        open={showRollup}
        onClose={() => setShowRollup(false)}
        markups={projectMarkups || []}
        projectName={project?.name || "Takeoff"}
      />

      {/* ─── Excel Import Preview Dialog ──────────────────────────────── */}
      {showImportExcel && importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Import Excel Preview
                </h3>
                <p className="text-xs text-white/50 mt-1">
                  {importPreview.length} rows found — review before importing
                </p>
              </div>
              <button
                onClick={() => {
                  setShowImportExcel(false);
                  setImportPreview(null);
                  if (importFileRef.current) importFileRef.current.value = "";
                }}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-white/50 border-b border-white/10">
                    <th className="text-left p-2">CSI Code</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Qty</th>
                    <th className="text-left p-2">Unit</th>
                    <th className="text-right p-2">Unit Cost</th>
                    <th className="text-right p-2">Extended</th>
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 100).map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="p-2 text-white/60">
                        {row.csiCode || "—"}
                      </td>
                      <td className="p-2 text-white">{row.description}</td>
                      <td className="p-2 text-right text-white">
                        {row.quantity}
                      </td>
                      <td className="p-2 text-white/60">{row.unit}</td>
                      <td className="p-2 text-right text-white">
                        ${row.unitCost.toFixed(2)}
                      </td>
                      <td className="p-2 text-right text-emerald-400">
                        ${(row.quantity * row.unitCost).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview.length > 100 && (
                <p className="text-xs text-white/40 mt-2 text-center">
                  Showing first 100 of {importPreview.length} rows
                </p>
              )}
            </div>
            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-white/60">
                <input
                  type="checkbox"
                  checked={importRemoveUnmatched}
                  onChange={e => setImportRemoveUnmatched(e.target.checked)}
                  className="rounded border-white/20"
                />
                Remove items not in this import
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowImportExcel(false);
                    setImportPreview(null);
                    if (importFileRef.current) importFileRef.current.value = "";
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmImport}
                  disabled={importExcelMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {importExcelMutation.isPending
                    ? "Importing..."
                    : `Import ${importPreview.length} Rows`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Sheet Scale Calibrator ──────────────────────────────────── */}
      {calibratingSheet && (
        <SheetScaleCalibrator
          sheet={calibratingSheet}
          projectId={projectId}
          onClose={() => setCalibratingSheet(null)}
          onSaved={(ratio, unit) => {
            setSheetScales(prev => ({
              ...prev,
              [calibratingSheet.id]: { ratio, unit },
            }));
          }}
        />
      )}

      {/* Scale calibration prompt removed — not used in AI pipeline */}
    </div>
  );
}
// ─── Add Item Dialog ──────────────────────────────────────────────────────────
const CSI_DIVISIONS_LIST = [
  { code: "01", name: "General Requirements" },
  { code: "02", name: "Existing Conditions" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood, Plastics & Composites" },
  { code: "07", name: "Thermal & Moisture Protection" },
  { code: "08", name: "Openings" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "21", name: "Fire Suppression" },
  { code: "22", name: "Plumbing" },
  { code: "23", name: "HVAC" },
  { code: "26", name: "Electrical" },
  { code: "27", name: "Communications" },
  { code: "28", name: "Electronic Safety" },
  { code: "31", name: "Earthwork" },
  { code: "32", name: "Exterior Improvements" },
  { code: "33", name: "Utilities" },
];
const COMMON_UNITS = [
  "EA",
  "SF",
  "LF",
  "CY",
  "SY",
  "CF",
  "TON",
  "LB",
  "LS",
  "HR",
  "GAL",
  "BF",
  "MBF",
];
function AddItemDialog({
  projectId,
  defaultDivision,
  currency,
  onClose,
  onSave,
  isPending,
}: {
  projectId: number;
  defaultDivision: string;
  currency: string;
  onClose: () => void;
  onSave: (data: {
    csiDivision: string;
    csiCode?: string;
    description: string;
    quantity: string;
    unit: string;
    unitCost: number;
    notes?: string;
  }) => void;
  isPending: boolean;
}) {
  const [csiDivision, setCsiDivision] = useState(defaultDivision);
  const [csiCode, setCsiCode] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("EA");
  const [unitCostDollars, setUnitCostDollars] = useState("");
  const [notes, setNotes] = useState("");

  const extCost =
    (parseFloat(quantity) || 0) * (parseFloat(unitCostDollars) || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !quantity || !unitCostDollars) return;
    onSave({
      csiDivision,
      csiCode: csiCode.trim() || undefined,
      description: description.trim(),
      quantity,
      unit,
      unitCost: Math.round(parseFloat(unitCostDollars) * 100),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            Add Manual Line Item
          </DialogTitle>
          <DialogDescription>
            Manually enter a takeoff item under any CSI division.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">
                CSI Division *
              </Label>
              <select
                value={csiDivision}
                onChange={e => setCsiDivision(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-navy-medium text-cream text-sm px-3 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              >
                {CSI_DIVISIONS_LIST.map(d => (
                  <option key={d.code} value={d.code}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">
                CSI Code (optional)
              </Label>
              <Input
                value={csiCode}
                onChange={e => setCsiCode(e.target.value)}
                placeholder="e.g. 03 30 00"
                className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-cream-muted mb-1 block">
              Description *
            </Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 4-inch Concrete Slab on Grade"
              className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">
                Quantity *
              </Label>
              <Input
                type="number"
                step="any"
                min="0"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
                required
              />
            </div>
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">
                Unit
              </Label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full h-9 rounded-md border border-white/10 bg-navy-medium text-cream text-sm px-3 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              >
                {COMMON_UNITS.map(u => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-cream-muted mb-1 block">
                Unit Cost *
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={unitCostDollars}
                onChange={e => setUnitCostDollars(e.target.value)}
                placeholder="0.00"
                className="h-9 text-sm bg-navy-medium border-white/10 text-cream"
                required
              />
            </div>
          </div>
          {parseFloat(quantity) > 0 && parseFloat(unitCostDollars) > 0 && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-2 flex items-center justify-between">
              <span className="text-cream-muted text-sm">Extended Cost</span>
              <span className="text-amber-400 font-semibold font-mono">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency,
                }).format(extCost)}
              </span>
            </div>
          )}
          <div>
            <Label className="text-xs text-cream-muted mb-1 block">
              Notes (optional)
            </Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
              className="w-full rounded-md border border-white/10 bg-navy-medium text-cream text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                !description.trim() ||
                !quantity ||
                !unitCostDollars
              }
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PlusCircle className="w-4 h-4" />
              )}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// ─── Edit Item Dialog ─────────────────────────────────────────────────────────

function EditItemDialog({
  item,
  projectId,
  onClose,
  onSave,
  isPending,
  currencyCode = "USD",
}: {
  item: any;
  projectId: number;
  onClose: () => void;
  onSave: (data: any) => void;
  isPending: boolean;
  currencyCode?: string;
}) {
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");

  useEffect(() => {
    if (item) {
      setDescription(item.description || "");
      setQuantity(item.quantity?.toString() || "0");
      setUnit(item.unit || "EA");
      setUnitCost(((item.unitCost || 0) / 100).toFixed(2));
    }
  }, [item]);

  if (!item) return null;

  return (
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Takeoff Item</DialogTitle>
          <DialogDescription>
            Update the quantity, unit cost, or description.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.01"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Input value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>
                Unit Cost (
                {currencyCode === "GBP"
                  ? "£"
                  : currencyCode === "AUD"
                    ? "A$"
                    : "$"}
                )
              </Label>
              <Input
                type="number"
                step="0.01"
                value={unitCost}
                onChange={e => setUnitCost(e.target.value)}
              />
            </div>
          </div>
          <div className="bg-navy-deep/50 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-cream-muted">Extended Cost:</span>
              <span className="text-amber-400 font-bold text-lg">
                {formatCurrency(
                  Math.round(
                    parseFloat(quantity || "0") *
                      parseFloat(unitCost || "0") *
                      100
                  ),
                  currencyCode
                )}
              </span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                id: item.id,
                projectId,
                description,
                quantity,
                unit,
                unitCost: Math.round(parseFloat(unitCost || "0") * 100),
                reviewed: true,
              })
            }
            disabled={isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
