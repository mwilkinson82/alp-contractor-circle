// v2 — premium dark SaaS theme
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMember } from "@/hooks/useMember";
import GanttChart from "@/components/GanttChart";
import GanttAnnotations, { type Annotation } from "@/components/GanttAnnotations";
import { WBSTree } from "@/components/WBSTree";
import { PdfExportPreview } from "@/components/PdfExportPreview";
import { generateSchedulePdf } from "@/lib/schedulePdf";
import { toast } from "sonner";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Play, Save, MoreHorizontal, Plus, Trash2, GripVertical, Columns3,
  Filter, Layers, Target, Calendar, Settings, Download, FileDown, Upload,
  Loader2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown,
  AlertTriangle, CheckCircle2, Search, FolderTree, Palette, Eye, EyeOff,
  BookOpen, LayoutGrid, Star, Undo2, Redo2, BarChart3, DollarSign, Pencil,
} from "lucide-react";
import { Link } from "wouter";
import { CSI_ACTIVE_DIVISIONS, WBS_GROUP_COLORS, type CsiDivision } from "../../../shared/csiDivisions";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import ResourcePanel from "@/components/ResourcePanel";

/* ── Types ──────────────────────────────────────────────────────────────── */
interface ColumnDef {
  key: string;
  label: string;
  shortLabel: string;
  align: "left" | "center" | "right";
  width: string;
  editable?: boolean;
  alwaysVisible?: boolean;
  requiresTarget?: 1 | 2;
  sortable?: boolean;
  getSortValue?: (act: any, ctx: any) => number | string;
  render: (act: any, ctx: any) => string;
  renderClass?: (act: any, ctx: any) => string;
}

type SortDir = "asc" | "desc" | null;
interface SortState { key: string; dir: SortDir; }

/* ── Helpers ────────────────────────────────────────────────────────────── */
const formatDate = (d: Date | null | undefined) => {
  if (!d) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
};

const parseDateSafe = (v: any): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

/* ── Column Definitions ─────────────────────────────────────────────────── */
const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "activityId", label: "Activity ID", shortLabel: "ID", align: "left", width: "80px",
    editable: true, alwaysVisible: false, sortable: true,
    getSortValue: (a) => a.activityId || "",
    render: (a) => a.activityId || `A${a.id}`,
    renderClass: () => "text-gray-900 font-semibold",
  },
  {
    key: "name", label: "Activity Name", shortLabel: "Name", align: "left", width: "1fr",
    editable: true, alwaysVisible: true, sortable: true,
    getSortValue: (a) => a.name,
    render: (a) => a.name,
    renderClass: () => "text-gray-900 font-medium",
  },
  {
    key: "duration", label: "Duration", shortLabel: "Dur", align: "center", width: "50px",
    editable: true, sortable: true,
    getSortValue: (a) => a.duration,
    render: (a) => `${a.duration}d`,
    renderClass: () => "text-gray-700",
  },
  {
    key: "percentComplete", label: "% Complete", shortLabel: "%", align: "center", width: "45px",
    editable: true, sortable: true,
    getSortValue: (a) => parseFloat(a.percentComplete) || 0,
    render: (a) => `${Math.round(parseFloat(a.percentComplete) || 0)}%`,
    renderClass: () => "text-gray-700",
  },
  {
    key: "earlyStart", label: "Early Start", shortLabel: "ES", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.earlyStart ? new Date(a.earlyStart).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.earlyStart)),
    renderClass: () => "text-gray-700",
  },
  {
    key: "earlyFinish", label: "Early Finish", shortLabel: "EF", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.earlyFinish ? new Date(a.earlyFinish).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.earlyFinish)),
    renderClass: () => "text-gray-700",
  },
  {
    key: "lateStart", label: "Late Start", shortLabel: "LS", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.lateStart ? new Date(a.lateStart).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.lateStart)),
    renderClass: () => "text-gray-700",
  },
  {
    key: "lateFinish", label: "Late Finish", shortLabel: "LF", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.lateFinish ? new Date(a.lateFinish).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.lateFinish)),
    renderClass: () => "text-gray-700",
  },
  {
    key: "totalFloat", label: "Total Float", shortLabel: "TF", align: "center", width: "45px",
    sortable: true,
    getSortValue: (a) => a.totalFloat ?? 999,
    render: (a) => a.totalFloat != null ? `${a.totalFloat}d` : "—",
    renderClass: (a) => {
      const tf = a.totalFloat;
      if (tf == null) return "text-gray-400";
      if (tf <= 0) return "text-red-600 font-semibold";
      if (tf <= 5) return "text-amber-600 font-medium";
      return "text-emerald-700";
    },
  },
  {
    key: "freeFloat", label: "Free Float", shortLabel: "FF", align: "center", width: "45px",
    sortable: true,
    getSortValue: (a) => a.freeFloat ?? 999,
    render: (a) => a.freeFloat != null ? `${a.freeFloat}d` : "—",
    renderClass: () => "text-gray-700",
  },
  {
    key: "wbs", label: "WBS", shortLabel: "WBS", align: "left", width: "70px",
    editable: true, sortable: true,
    getSortValue: (a) => a.wbs || "",
    render: (a) => a.wbs || "—",
    renderClass: () => "text-gray-700",
  },
  {
    key: "calendar", label: "Calendar", shortLabel: "Cal", align: "left", width: "70px",
    sortable: false,
    render: (a, ctx) => {
      if (!a.calendarId) return ctx.defaultCalName || "Default";
      const cal = ctx.calendars?.find((c: any) => c.id === a.calendarId);
      return cal ? cal.name : "—";
    },
    renderClass: () => "text-gray-700",
  },
  // Target 1 variance columns
  {
    key: "bl1Start", label: "BL Start", shortLabel: "BL1 ES", align: "center", width: "80px",
    requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      return t ? formatDate(parseDateSafe(t.earlyStart)) : "—";
    },
    renderClass: () => "text-gray-700",
  },
  {
    key: "bl1Finish", label: "BL Finish", shortLabel: "BL1 EF", align: "center", width: "80px",
    requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      return t ? formatDate(parseDateSafe(t.earlyFinish)) : "—";
    },
    renderClass: () => "text-gray-700",
  },
  {
    key: "startVar1", label: "Start Variance 1", shortLabel: "SV1", align: "center", width: "50px",
    requiresTarget: 1, sortable: true,
    getSortValue: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      if (!t || !a.earlyStart || !t.earlyStart) return 0;
      return Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
    },
    render: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      if (!t || !a.earlyStart || !t.earlyStart) return "—";
      const diff = Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
      return diff > 0 ? `+${diff}d` : diff < 0 ? `${diff}d` : "0d";
    },
    renderClass: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      if (!t || !a.earlyStart || !t.earlyStart) return "text-gray-400";
      const diff = Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-700 font-semibold";
      return "text-gray-600";
    },
  },
  {
    key: "finishVar1", label: "Finish Variance 1", shortLabel: "FV1", align: "center", width: "50px",
    requiresTarget: 1, sortable: true,
    getSortValue: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      if (!t || !a.earlyFinish || !t.earlyFinish) return 0;
      return Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
    },
    render: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      if (!t || !a.earlyFinish || !t.earlyFinish) return "—";
      const diff = Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
      return diff > 0 ? `+${diff}d` : diff < 0 ? `${diff}d` : "0d";
    },
    renderClass: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      if (!t || !a.earlyFinish || !t.earlyFinish) return "text-gray-400";
      const diff = Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-700 font-semibold";
      return "text-gray-600";
    },
  },
  // Target 2 variance columns
  {
    key: "bl2Start", label: "BL2 Start", shortLabel: "BL2 ES", align: "center", width: "80px",
    requiresTarget: 2,
    render: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      return t ? formatDate(parseDateSafe(t.earlyStart)) : "—";
    },
    renderClass: () => "text-gray-700",
  },
  {
    key: "bl2Finish", label: "BL2 Finish", shortLabel: "BL2 EF", align: "center", width: "80px",
    requiresTarget: 2,
    render: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      return t ? formatDate(parseDateSafe(t.earlyFinish)) : "—";
    },
    renderClass: () => "text-gray-700",
  },
  {
    key: "startVar2", label: "Start Variance 2", shortLabel: "SV2", align: "center", width: "50px",
    requiresTarget: 2, sortable: true,
    getSortValue: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      if (!t || !a.earlyStart || !t.earlyStart) return 0;
      return Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
    },
    render: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      if (!t || !a.earlyStart || !t.earlyStart) return "—";
      const diff = Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
      return diff > 0 ? `+${diff}d` : diff < 0 ? `${diff}d` : "0d";
    },
    renderClass: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      if (!t || !a.earlyStart || !t.earlyStart) return "text-gray-400";
      const diff = Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-700 font-semibold";
      return "text-gray-600";
    },
  },
  {
    key: "finishVar2", label: "Finish Variance 2", shortLabel: "FV2", align: "center", width: "50px",
    requiresTarget: 2, sortable: true,
    getSortValue: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      if (!t || !a.earlyFinish || !t.earlyFinish) return 0;
      return Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
    },
    render: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      if (!t || !a.earlyFinish || !t.earlyFinish) return "—";
      const diff = Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
      return diff > 0 ? `+${diff}d` : diff < 0 ? `${diff}d` : "0d";
    },
    renderClass: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      if (!t || !a.earlyFinish || !t.earlyFinish) return "text-gray-400";
      const diff = Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-700 font-semibold";
      return "text-gray-600";
    },
  },
];

const DEFAULT_VISIBLE_COLUMNS = ["activityId", "name", "duration", "earlyStart", "earlyFinish", "totalFloat", "wbs"];

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Scheduler() {
  const { id } = useParams<{ id: string }>();
  const scheduleId = id ? parseInt(id) : null;
  const { user } = useAuth();
  const { member } = useMember();
  const [, navigate] = useLocation();
  const tableRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();
  const { record: recordAction, undo, redo, canUndo, canRedo, isProcessing: isUndoRedoProcessing, undoDescription, redoDescription, clear: clearHistory } = useUndoRedo();

  // Clear undo/redo history when switching schedules
  useEffect(() => { clearHistory(); }, [scheduleId, clearHistory]);

  /* ── Data Queries ───────────────────────────────────────────────────────── */
  const scheduleQuery = trpc.schedule.get.useQuery(
    { id: scheduleId! },
    { enabled: !!scheduleId }
  );
  const schedule = scheduleQuery.data;
  const activities: any[] = schedule?.activities || [];
  const relationships: any[] = schedule?.relationships || [];
  const baselines: any[] = schedule?.baselines || [];
  const calendars: any[] = schedule?.calendars || [];
  const codeCategories: any[] = schedule?.codeCategories || [];
  const codeAssignments: any[] = schedule?.codeAssignments || [];
  const wbsNodes: any[] = schedule?.wbsNodes || [];

  /* ── View State ───────────────────────────────────────────────────────── */
  const [zoom, setZoom] = useState<"day" | "week" | "month" | "custom">("week");
  const [customPpd, setCustomPpd] = useState<number>(14); // pixels per day for custom zoom
  const [showArrows, setShowArrows] = useState(true);
  const [showDataDateLine, setShowDataDateLine] = useState(true);
  const [showTodayLine, setShowTodayLine] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [columnWidths, setColumnWidths] = useState<Record<string, string>>({});
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };
  const [sortState, setSortState] = useState<SortState>({ key: "", dir: null });
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  /* ── Targeting State ──────────────────────────────────────────────────── */
  const [target1Id, setTarget1Id] = useState<number | null>(null);
  const [target2Id, setTarget2Id] = useState<number | null>(null);
  const target1Query = trpc.schedule.getSnapshotActivities.useQuery(
    { id: target1Id!, scheduleId: scheduleId! },
    { enabled: !!target1Id && !!scheduleId }
  );
  const target2Query = trpc.schedule.getSnapshotActivities.useQuery(
    { id: target2Id!, scheduleId: scheduleId! },
    { enabled: !!target2Id && !!scheduleId }
  );

    /* ── Resource Assignments (for cost overlay) ────────────────────────── */
  const resourceAssignmentsQuery = trpc.schedule.listResourceAssignments.useQuery(
    { scheduleId: scheduleId! },
    { enabled: !!scheduleId }
  );

  // ── Annotations persistence (queries only, effects below state) ──
  const annotationsQuery = trpc.schedule.getAnnotations.useQuery(
    { scheduleId: scheduleId! },
    { enabled: !!scheduleId }
  );
  const saveAnnotationsMut = trpc.schedule.saveAnnotations.useMutation();
  const costDataMap = useMemo(() => {
    const map = new Map<number, number>();
    if (!resourceAssignmentsQuery.data) return map;
    for (const a of resourceAssignmentsQuery.data) {
      const existing = map.get(a.activityId) || 0;
      map.set(a.activityId, existing + (a.budgetedCost || 0));
    }
    return map;
  }, [resourceAssignmentsQuery.data]);

  /* ── Dialog State ───────────────────────────────────────────────────── */
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showActivityDetailModal, setShowActivityDetailModal] = useState(false);
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [showBaselineDialog, setShowBaselineDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showDataDatePicker, setShowDataDatePicker] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [showScheduleHealth, setShowScheduleHealth] = useState(false);
  const [showScheduleInfo, setShowScheduleInfo] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);
  const [showWbsManager, setShowWbsManager] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showBulkAddDialog, setShowBulkAddDialog] = useState(false);
  const [showResourcePanel, setShowResourcePanel] = useState(false);
  const [showCostOverlay, setShowCostOverlay] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [ganttAnnotations, setGanttAnnotations] = useState<Annotation[]>([]);
  const [annotationsLoaded, setAnnotationsLoaded] = useState(false);

  // Load annotations from DB on first fetch
  useEffect(() => {
    if (annotationsQuery.data && !annotationsLoaded) {
      const loaded = annotationsQuery.data.map((row: any) => ({
        ...row.data,
        type: row.annotationType,
        id: row.data?.id || `db-${row.id}`,
      })) as Annotation[];
      setGanttAnnotations(loaded);
      setAnnotationsLoaded(true);
    }
  }, [annotationsQuery.data, annotationsLoaded]);

  // Reset loaded flag when schedule changes
  useEffect(() => { setAnnotationsLoaded(false); }, [scheduleId]);

  // Auto-save annotations when they change (debounced)
  const saveAnnotationsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAnnotationsChange = useCallback((newAnnotations: Annotation[]) => {
    setGanttAnnotations(newAnnotations);
    if (!scheduleId) return;
    if (saveAnnotationsTimeoutRef.current) clearTimeout(saveAnnotationsTimeoutRef.current);
    saveAnnotationsTimeoutRef.current = setTimeout(() => {
      saveAnnotationsMut.mutate({
        scheduleId,
        annotations: newAnnotations.map((a, i) => ({
          scheduleId,
          annotationType: a.type,
          data: a as any,
          sortOrder: i,
        })),
      });
    }, 1500);
  }, [scheduleId, saveAnnotationsMut]);

  const ganttContainerRef = useRef<HTMLDivElement>(null);
  const [ganttContainerSize, setGanttContainerSize] = useState({ width: 0, height: 0 });
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);
  const [csvParsedRows, setCsvParsedRows] = useState<Array<{activityId?: string; name: string; duration: number; wbs?: string; activityType: "task" | "milestone"; predecessors?: string}>>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [showIdSettingsDialog, setShowIdSettingsDialog] = useState(false);
  const [bulkAddCount, setBulkAddCount] = useState("10");
  const [bulkAddPrefix, setBulkAddPrefix] = useState("");
  const [idSettingsPrefix, setIdSettingsPrefix] = useState("");
  const [idSettingsStart, setIdSettingsStart] = useState("1000");
  const [idSettingsInterval, setIdSettingsInterval] = useState("10");

  /* ── Multi-Select State ──────────────────────────────────────────────── */
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<number>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<number | null>(null);
  const [showBulkWbsDialog, setShowBulkWbsDialog] = useState(false);
  const [bulkWbsTarget, setBulkWbsTarget] = useState("");

  /* ── Form State ───────────────────────────────────────────────────────── */
  const [newActName, setNewActName] = useState("");
  const [newActDuration, setNewActDuration] = useState("5");
  const [newActWbs, setNewActWbs] = useState("");
  const [newActType, setNewActType] = useState<"task" | "milestone">("task");
  const [newActActivityId, setNewActActivityId] = useState("");
  const [newRelPred, setNewRelPred] = useState("");
  const [newRelSucc, setNewRelSucc] = useState("");
  const [newRelType, setNewRelType] = useState("FS");
  const [newRelLag, setNewRelLag] = useState("0");
  const [newBaselineName, setNewBaselineName] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [dataDateInput, setDataDateInput] = useState("");
  const [editingCell, setEditingCell] = useState<{ activityId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  /* ── Activity Detail Modal State ──────────────────────────────────────── */
  const [detailAct, setDetailAct] = useState<any>(null);
  const [detailName, setDetailName] = useState("");
  const [detailDuration, setDetailDuration] = useState("");
  const [detailActivityId, setDetailActivityId] = useState("");
  const [detailWbs, setDetailWbs] = useState("");
  const [detailCalendarId, setDetailCalendarId] = useState("");
  const [detailBarColor, setDetailBarColor] = useState("");
  const [detailPercentComplete, setDetailPercentComplete] = useState("");
  const [detailActivityType, setDetailActivityType] = useState<"task" | "milestone">("task");
  const [detailConstraintType, setDetailConstraintType] = useState("ASAP");
  const [detailConstraintDate, setDetailConstraintDate] = useState("");
  const [newDetailRelPred, setNewDetailRelPred] = useState("");
  const [newDetailRelType, setNewDetailRelType] = useState("FS");
  const [newDetailRelLag, setNewDetailRelLag] = useState("0");

  /* ── PDF State ────────────────────────────────────────────────────────── */
  const [pdfCompanyName, setPdfCompanyName] = useState("");
  const [pdfProjectName, setPdfProjectName] = useState("");
  const [pdfFooterText, setPdfFooterText] = useState("");
  const [pdfPageSize, setPdfPageSize] = useState<"letter" | "legal" | "tabloid">("tabloid");
  const [pdfOrientation, setPdfOrientation] = useState<"landscape" | "portrait">("landscape");
  const [pdfShowGantt, setPdfShowGantt] = useState(true);
  const [pdfCriticalOnly, setPdfCriticalOnly] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfFooterColumns, setPdfFooterColumns] = useState(3);
  const [pdfFooterLeft, setPdfFooterLeft] = useState("Generated by ALP CPM Schedule Builder");
  const [pdfFooterCenter, setPdfFooterCenter] = useState("Page {page} of {total}");
  const [pdfFooterRight, setPdfFooterRight] = useState("{date}");

  /* ── Gantt Display Settings ──────────────────────────────────────────── */
  const [ganttFontSize, setGanttFontSize] = useState(9);
  const [ganttFontColor, setGanttFontColor] = useState("#374151");
  const [ganttFontFamily, setGanttFontFamily] = useState("DM Sans");
  const [showGanttSettings, setShowGanttSettings] = useState(false);
  const [costFontSize, setCostFontSize] = useState(9);
  /* Bar color overrides — initialized from schedule data when dialog opens */
  const [localCriticalBarColor, setLocalCriticalBarColor] = useState("#ef4444");
  const [localNormalBarColor, setLocalNormalBarColor] = useState("#22c55e");

  /* ── Advanced Filter State ────────────────────────────────────────────── */
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [filterLongestPath, setFilterLongestPath] = useState(false);
  const [filterLookahead, setFilterLookahead] = useState<"none" | "1week" | "2week" | "4week">("none");
  const [filterFloatMin, setFilterFloatMin] = useState("");
  const [filterFloatMax, setFilterFloatMax] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");
  const [filterOpenEnds, setFilterOpenEnds] = useState(false);

  /* ── WBS Manager State ────────────────────────────────────────────────── */
  const [newWbsCode, setNewWbsCode] = useState("");
  const [newWbsName, setNewWbsName] = useState("");
  const [newWbsParentId, setNewWbsParentId] = useState<string>("");
  const [showCsiPicker, setShowCsiPicker] = useState(true);
  const [selectedCsiCodes, setSelectedCsiCodes] = useState<Set<string>>(new Set());
  const [csiSearch, setCsiSearch] = useState("");

  /* ── Layout State ─────────────────────────────────────────────────────── */
  const [showLayoutDialog, setShowLayoutDialog] = useState(false);
  const [layoutName, setLayoutName] = useState("");
  const [layoutIsDefault, setLayoutIsDefault] = useState(false);

  /* ── Activity Code Filter State ───────────────────────────────────────── */
  const [activeFilters, setActiveFilters] = useState<Map<number, Set<number>>>(new Map());

  /* ── Derived Data ─────────────────────────────────────────────────────── */
  const dataDate = useMemo(() => parseDateSafe(schedule?.schedule?.dataDate), [schedule?.schedule?.dataDate]);
  const lastCalculatedAt = useMemo(() => parseDateSafe(schedule?.schedule?.lastCalculatedAt), [schedule?.schedule?.lastCalculatedAt]);
  const defaultCalName = useMemo(() => calendars.find((c: any) => c.isDefault)?.name || "Default", [calendars]);

  const target1Map = useMemo(() => {
    const m = new Map<number, any>();
    const acts = target1Query.data?.activities || [];
    for (const a of acts) m.set(a.originalActivityId || a.id, a);
    return m;
  }, [target1Query.data]);

  const target2Map = useMemo(() => {
    const m = new Map<number, any>();
    const acts = target2Query.data?.activities || [];
    for (const a of acts) m.set(a.originalActivityId || a.id, a);
    return m;
  }, [target2Query.data]);

  const t1Activities = useMemo(() => target1Query.data?.activities || [], [target1Query.data]);
  const t2Activities = useMemo(() => target2Query.data?.activities || [], [target2Query.data]);

  const renderCtx = useMemo(() => ({
    target1Map, target2Map, calendars, defaultCalName,
  }), [target1Map, target2Map, calendars, defaultCalName]);

  /* ── Open Ends Detection ──────────────────────────────────────────────── */
  const openEnds = useMemo(() => {
    const predSet = new Set<number>();
    const succSet = new Set<number>();
    for (const r of relationships) {
      succSet.add(r.predecessorId);
      predSet.add(r.successorId);
    }
    const openStarts = activities.filter((a) => !predSet.has(a.id));
    const openFinishes = activities.filter((a) => !succSet.has(a.id));
    return { openStarts, openFinishes };
  }, [activities, relationships]);

  /* ── Filtering ────────────────────────────────────────────────────────── */
  const filteredActivities = useMemo(() => {
    let acts = [...activities];

    // Search filter (activity ID or name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      acts = acts.filter((a) =>
        (a.activityId || `A${a.id}`).toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q)
      );
    }

    // Activity code filters
    if (activeFilters.size > 0) {
      acts = acts.filter((a) => {
        for (const [catId, valIds] of Array.from(activeFilters.entries())) {
          const assigned = codeAssignments.filter((ca: any) => ca.activityId === a.id && ca.categoryId === catId);
          const hasMatch = assigned.some((ca: any) => valIds.has(ca.valueId));
          if (!hasMatch) return false;
        }
        return true;
      });
    }

    // Advanced filters
    if (filterCriticalOnly) {
      acts = acts.filter((a) => a.isCritical);
    }
    if (filterLongestPath) {
      acts = acts.filter((a) => a.isOnLongestPath);
    }

    if (filterLookahead !== "none" && dataDate) {
      const days = filterLookahead === "1week" ? 7 : filterLookahead === "2week" ? 14 : 28;
      const cutoff = new Date(dataDate.getTime() + days * 86400000);
      acts = acts.filter((a) => {
        const es = parseDateSafe(a.earlyStart);
        return es && es <= cutoff;
      });
    }

    if (filterFloatMin !== "") {
      const min = parseInt(filterFloatMin);
      if (!isNaN(min)) acts = acts.filter((a) => (a.totalFloat ?? 999) >= min);
    }
    if (filterFloatMax !== "") {
      const max = parseInt(filterFloatMax);
      if (!isNaN(max)) acts = acts.filter((a) => (a.totalFloat ?? -999) <= max);
    }

    if (filterDateStart) {
      const start = new Date(filterDateStart + "T00:00:00");
      acts = acts.filter((a) => {
        const es = parseDateSafe(a.earlyStart);
        return es && es >= start;
      });
    }
    if (filterDateEnd) {
      const end = new Date(filterDateEnd + "T23:59:59");
      acts = acts.filter((a) => {
        const ef = parseDateSafe(a.earlyFinish);
        return ef && ef <= end;
      });
    }

    if (filterOpenEnds) {
      const openIds = new Set([
        ...openEnds.openStarts.map((a) => a.id),
        ...openEnds.openFinishes.map((a) => a.id),
      ]);
      acts = acts.filter((a) => openIds.has(a.id));
    }

    return acts;
  }, [activities, searchQuery, activeFilters, codeAssignments, filterCriticalOnly, filterLongestPath, filterLookahead, dataDate, filterFloatMin, filterFloatMax, filterDateStart, filterDateEnd, filterOpenEnds, openEnds]);

  /* ── Sorting ──────────────────────────────────────────────────────────── */
  const sortedActivities = useMemo(() => {
    if (!sortState.dir || !sortState.key) return filteredActivities;
    const col = ALL_COLUMNS.find((c) => c.key === sortState.key);
    if (!col?.getSortValue) return filteredActivities;
    const sorted = [...filteredActivities].sort((a, b) => {
      const va = col.getSortValue!(a, renderCtx);
      const vb = col.getSortValue!(b, renderCtx);
      if (typeof va === "string" && typeof vb === "string") {
        return sortState.dir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      const na = typeof va === "number" ? va : 0;
      const nb = typeof vb === "number" ? vb : 0;
      return sortState.dir === "asc" ? na - nb : nb - na;
    });
    return sorted;
  }, [filteredActivities, sortState, renderCtx]);

  /* ── Grouping ─────────────────────────────────────────────────────────── */
  const groupedActivities = useMemo(() => {
    if (!groupBy) return [{ group: null as string | null, activities: sortedActivities, depth: 0 as number, wbsColor: undefined as string | undefined, wbsTextColor: undefined as string | undefined }];

    if (groupBy === "wbs" && wbsNodes.length > 0) {
      // Build a map of WBS code -> activities
      const actsByWbs = new Map<string, any[]>();
      for (const act of sortedActivities) {
        const code = act.wbs || "";
        if (!actsByWbs.has(code)) actsByWbs.set(code, []);
        actsByWbs.get(code)!.push(act);
      }

      // Build hierarchical groups by walking the WBS tree depth-first
      type GroupEntry = { group: string; activities: any[]; depth: number; wbsColor?: string; wbsTextColor?: string };
      const result: GroupEntry[] = [];

      const walkTree = (parentId: number | null, depth: number) => {
        const children = wbsNodes
          .filter((n: any) => (n.parentId || null) === parentId)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.code.localeCompare(b.code, undefined, { numeric: true }));

        for (const node of children) {
          const label = `${node.code} \u2014 ${node.name}`;
          // Collect activities directly assigned to this WBS code (not to children)
          const childCodes = new Set<string>();
          const collectChildCodes = (pid: number) => {
            for (const c of wbsNodes) {
              if ((c.parentId || null) === pid) {
                childCodes.add(c.code);
                collectChildCodes(c.id);
              }
            }
          };
          collectChildCodes(node.id);

          // Activities for this node: assigned to this code but NOT to any descendant code
          const directActs = (actsByWbs.get(node.code) || []).filter(
            (a: any) => !childCodes.has(a.wbs)
          );

          // Always show the group header even if it has no direct activities
          // (it may have child groups with activities)
          const hasDescendantActs = Array.from(childCodes).some(code => (actsByWbs.get(code) || []).length > 0);
          if (directActs.length > 0 || hasDescendantActs) {
            result.push({
              group: label,
              activities: directActs,
              depth,
              wbsColor: node.groupColor || undefined,
              wbsTextColor: node.groupTextColor || undefined,
            });
          }

          // Recurse into children
          walkTree(node.id, depth + 1);
        }
      };

      walkTree(null, 0);

      // Add "No WBS" group for activities without a WBS assignment
      const noWbsActs = actsByWbs.get("") || [];
      if (noWbsActs.length > 0) {
        result.push({ group: "No WBS", activities: noWbsActs, depth: 0 });
      }

      return result;
    }

    // Non-WBS grouping (critical path, activity codes, etc.)
    const groups = new Map<string, any[]>();
    for (const act of sortedActivities) {
      let key = "Ungrouped";
      if (groupBy === "critical") {
        key = act.isCritical ? "Critical Path" : "Non-Critical";
      } else {
        const catId = parseInt(groupBy);
        if (!isNaN(catId)) {
          const assignment = codeAssignments.find((ca: any) => ca.activityId === act.id && ca.categoryId === catId);
          if (assignment) {
            const cat = codeCategories.find((c: any) => c.id === catId);
            const val = cat?.values?.find((v: any) => v.id === assignment.valueId);
            key = val?.value || "Unassigned";
          } else {
            key = "Unassigned";
          }
        }
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(act);
    }
    return Array.from(groups.entries()).map(([group, acts]) => ({ group: group as string | null, activities: acts, depth: 0, wbsColor: undefined as string | undefined, wbsTextColor: undefined as string | undefined }));
  }, [sortedActivities, groupBy, codeAssignments, codeCategories, wbsNodes]);

  /* ── Active Columns ───────────────────────────────────────────────────── */
  const activeColumns = useMemo(() => {
    return ALL_COLUMNS.filter((col) => {
      if (col.alwaysVisible) return true;
      if (!visibleColumns.includes(col.key)) return false;
      if (col.requiresTarget === 1 && !target1Id) return false;
      if (col.requiresTarget === 2 && !target2Id) return false;
      return true;
    });
  }, [visibleColumns, target1Id, target2Id]);

  const gridTemplate = useMemo(() => {
    // Use columnWidths overrides if available, otherwise use default col.width
    return "40px " + activeColumns.map((c) => columnWidths[c.key] || c.width).join(" ");
  }, [activeColumns, columnWidths]);

  /* ── Mutations ────────────────────────────────────────────────────────── */
  const recalcMut = trpc.schedule.recalculate.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Schedule calculated"); },
    onError: (e) => toast.error(e.message),
  });
  const addActivityMut = trpc.schedule.addActivity.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Activity added"); },
    onError: (e) => toast.error(e.message),
  });
  const updateActivityMut = trpc.schedule.updateActivity.useMutation({
    onSuccess: (_data, vars) => {
      utils.schedule.get.invalidate();
      // Record for undo — store the previous values
      const prev = activities.find((a) => a.id === vars.id);
      if (prev && scheduleId) {
        const prevUpdate: any = { id: vars.id, scheduleId };
        if (vars.name !== undefined) prevUpdate.name = prev.name;
        if (vars.duration !== undefined) prevUpdate.duration = prev.duration;
        if ((vars as any).percentComplete !== undefined) prevUpdate.percentComplete = (prev as any).percentComplete;
        if ((vars as any).barColor !== undefined) prevUpdate.barColor = (prev as any).barColor;
        recordAction({
          description: `Update activity "${prev.name}"`,
          execute: async () => { updateActivityMut.mutate(vars); },
          undo: async () => { updateActivityMut.mutate(prevUpdate); },
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const deleteActivityMut = trpc.schedule.deleteActivity.useMutation({
    onSuccess: (_data, vars) => {
      utils.schedule.get.invalidate();
      toast.success("Activity deleted");
      // Record for undo — store the deleted activity's data so we can re-add it
      const deleted = activities.find((a) => a.id === vars.id);
      if (deleted && scheduleId) {
        recordAction({
          description: `Delete activity "${deleted.name}"`,
          execute: async () => { deleteActivityMut.mutate({ id: vars.id, scheduleId }); },
          undo: async () => {
            addActivityMut.mutate({
              scheduleId,
              name: deleted.name,
              duration: deleted.duration ?? 5,
              activityType: (deleted as any).activityType || "task",
            });
          },
        });
      }
    },
    onError: (e) => toast.error(e.message),
  });
  const addRelMut = trpc.schedule.addRelationship.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); setShowRelationshipDialog(false); toast.success("Relationship added"); },
    onError: (e) => toast.error(e.message),
  });
  const saveBaselineMut = trpc.schedule.saveBaseline.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); setShowBaselineDialog(false); toast.success("Baseline saved"); },
    onError: (e) => toast.error(e.message),
  });
  const saveUpdateMut = trpc.schedule.saveUpdate.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); setShowUpdateDialog(false); toast.success("Update saved"); },
    onError: (e) => toast.error(e.message),
  });
  const updateScheduleMut = trpc.schedule.update.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Data date updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const addWbsMut = trpc.schedule.createWbsNode.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("WBS node added"); setNewWbsCode(""); setNewWbsName(""); setNewWbsParentId(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteWbsMut = trpc.schedule.deleteWbsNode.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("WBS node deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateWbsMut = trpc.schedule.updateWbsNode.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const bulkAddMut = trpc.schedule.bulkAddActivities.useMutation({
    onSuccess: (data) => { utils.schedule.get.invalidate(); setShowBulkAddDialog(false); toast.success(`${data.count} activities added`); },
    onError: (e: any) => toast.error(e.message),
  });
  const csvImportMut = trpc.schedule.importActivitiesCsv.useMutation({
    onSuccess: (data) => {
      utils.schedule.get.invalidate();
      setShowCsvImportDialog(false);
      setCsvParsedRows([]);
      setCsvFileName("");
      toast.success(`Imported ${data.activitiesCreated} activities and ${data.relationshipsCreated} relationships`);
    },
    onError: (e: any) => toast.error(e.message),
  });
  const updateIdSettingsMut = trpc.schedule.updateScheduleIdSettings.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); setShowIdSettingsDialog(false); toast.success("ID settings updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateBarColorsMut = trpc.schedule.updateScheduleBarColors.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Bar colors saved"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteRelMut = trpc.schedule.deleteRelationship.useMutation({
    onSuccess: (_data, vars) => {
      utils.schedule.get.invalidate();
      toast.success("Relationship removed");
      // Record for undo — store the deleted relationship data
      const deleted = relationships.find((r: any) => r.id === vars.id);
      if (deleted && scheduleId) {
        recordAction({
          description: "Delete relationship",
          execute: async () => { deleteRelMut.mutate({ id: vars.id, scheduleId }); },
          undo: async () => {
            addRelMut.mutate({
              scheduleId,
              predecessorId: (deleted as any).predecessorId,
              successorId: (deleted as any).successorId,
              relationshipType: (deleted as any).relationshipType,
              lagDays: (deleted as any).lagDays || 0,
            });
          },
        });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });
  const addCalendarMut = trpc.schedule.addCalendar.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Calendar updated"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCalendarMut = trpc.schedule.deleteCalendar.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Calendar deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const addCalExcMut = trpc.schedule.addCalendarException.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Exception added"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCalExcMut = trpc.schedule.deleteCalendarException.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Exception removed"); },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── CSI Import Mutation ───────────────────────────────────────────────── */
  const importCsiMut = trpc.schedule.importCsiDivisions.useMutation({
    onSuccess: (data) => { utils.schedule.get.invalidate(); toast.success(`Imported ${data.created} CSI divisions`); setSelectedCsiCodes(new Set()); setShowCsiPicker(false); },
    onError: (e: any) => toast.error(e.message),
  });

  /* ── Layout Mutations ─────────────────────────────────────────────────── */
  const layoutsQuery = trpc.schedule.listLayouts.useQuery(
    { scheduleId: scheduleId! },
    { enabled: !!scheduleId }
  );
  const layouts = layoutsQuery.data || [];

  const saveLayoutMut = trpc.schedule.saveLayout.useMutation({
    onSuccess: () => { layoutsQuery.refetch(); toast.success("Layout saved"); setShowLayoutDialog(false); setLayoutName(""); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteLayoutMut = trpc.schedule.deleteLayout.useMutation({
    onSuccess: () => { layoutsQuery.refetch(); toast.success("Layout deleted"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateLayoutMut = trpc.schedule.updateLayout.useMutation({
    onSuccess: () => { layoutsQuery.refetch(); toast.success("Layout updated"); },
    onError: (e: any) => toast.error(e.message),
  });

  const captureLayoutConfig = useCallback(() => {
    return JSON.stringify({
      visibleColumns,
      groupBy,
      sortState,
      zoom,
      customPpd,
      showArrows,
      showDataDateLine,
      showTodayLine,
      ganttFontSize,
      ganttFontColor,
      ganttFontFamily,
      filterCriticalOnly,
      filterLongestPath,
      filterLookahead,
      filterFloatMin,
      filterFloatMax,
      filterDateStart,
      filterDateEnd,
      filterOpenEnds,
    });
  }, [visibleColumns, groupBy, sortState, zoom, customPpd, showArrows, showDataDateLine, showTodayLine, ganttFontSize, ganttFontColor, ganttFontFamily, filterCriticalOnly, filterLongestPath, filterLookahead, filterFloatMin, filterFloatMax, filterDateStart, filterDateEnd, filterOpenEnds]);

  const applyLayoutConfig = useCallback((configJson: string) => {
    try {
      const cfg = JSON.parse(configJson);
      if (cfg.visibleColumns) setVisibleColumns(cfg.visibleColumns);
      if (cfg.groupBy !== undefined) setGroupBy(cfg.groupBy);
      if (cfg.sortState) setSortState(cfg.sortState);
      if (cfg.zoom) { setZoom(cfg.zoom); if (cfg.customPpd) setCustomPpd(cfg.customPpd); }
      if (cfg.showArrows !== undefined) setShowArrows(cfg.showArrows);
      if (cfg.showDataDateLine !== undefined) setShowDataDateLine(cfg.showDataDateLine);
      if (cfg.showTodayLine !== undefined) setShowTodayLine(cfg.showTodayLine);
      if (cfg.ganttFontSize) setGanttFontSize(cfg.ganttFontSize);
      if (cfg.ganttFontColor) setGanttFontColor(cfg.ganttFontColor);
      if (cfg.ganttFontFamily) setGanttFontFamily(cfg.ganttFontFamily);
      if (cfg.filterCriticalOnly !== undefined) setFilterCriticalOnly(cfg.filterCriticalOnly);
      if (cfg.filterLongestPath !== undefined) setFilterLongestPath(cfg.filterLongestPath);
      if (cfg.filterLookahead) setFilterLookahead(cfg.filterLookahead);
      if (cfg.filterFloatMin !== undefined) setFilterFloatMin(cfg.filterFloatMin);
      if (cfg.filterFloatMax !== undefined) setFilterFloatMax(cfg.filterFloatMax);
      if (cfg.filterDateStart !== undefined) setFilterDateStart(cfg.filterDateStart);
      if (cfg.filterDateEnd !== undefined) setFilterDateEnd(cfg.filterDateEnd);
      if (cfg.filterOpenEnds !== undefined) setFilterOpenEnds(cfg.filterOpenEnds);
      toast.success("Layout applied");
    } catch { toast.error("Invalid layout config"); }
  }, []);

  /* ── Handlers ───────────────────────────────────────────────────────────── */

  /* Column resize handlers */
  const handleColResizeStart = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingCol(colKey);
    resizeStartX.current = e.clientX;
    const col = ALL_COLUMNS.find((c) => c.key === colKey);
    const currentWidth = columnWidths[colKey] || col?.width || "80px";
    // Parse current width to px
    const match = currentWidth.match(/(\d+)/);
    resizeStartWidth.current = match ? parseInt(match[1]) : 80;
  }, [columnWidths]);

  useEffect(() => {
    if (!resizingCol) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(40, resizeStartWidth.current + delta);
      setColumnWidths((prev) => ({ ...prev, [resizingCol]: `${newWidth}px` }));
    };
    const handleMouseUp = () => {
      setResizingCol(null);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingCol]);

  const handleColumnSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: "", dir: null };
    });
  }, []);

  const startEdit = useCallback((activityId: number, field: string, value: string) => {
    setEditingCell({ activityId, field });
    setEditValue(value);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingCell || !scheduleId) { setEditingCell(null); return; }
    const { activityId, field } = editingCell;
    const update: any = { id: activityId, scheduleId };
    if (field === "name") update.name = editValue;
    else if (field === "duration") update.duration = parseInt(editValue) || 1;
    else if (field === "percentComplete") update.percentComplete = String(Math.min(100, Math.max(0, parseFloat(editValue) || 0)));
    else if (field === "wbs") update.wbs = editValue || null;
    else if (field === "activityId") update.activityId = editValue || null;
    updateActivityMut.mutate(update);
    setEditingCell(null);
  }, [editingCell, editValue, scheduleId, updateActivityMut]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    else if (e.key === "Escape") setEditingCell(null);
  }, [commitEdit]);

  const openActivityDetail = useCallback((act: any) => {
    setDetailAct(act);
    setDetailName(act.name);
    setDetailDuration(String(act.duration));
    setDetailActivityId(act.activityId || "");
    setDetailWbs(act.wbs || "__none__");
    setDetailCalendarId(act.calendarId ? String(act.calendarId) : "");
    setDetailBarColor(act.barColor || "");
    setDetailPercentComplete(String(parseFloat(act.percentComplete) || 0));
    setDetailActivityType(act.activityType || "task");
    setDetailConstraintType(act.constraintType || "ASAP");
    setDetailConstraintDate(act.constraintDate ? new Date(act.constraintDate).toISOString().split("T")[0] : "");
    setNewDetailRelPred("");
    setNewDetailRelType("FS");
    setNewDetailRelLag("0");
    setShowActivityDetailModal(true);
  }, []);

  const saveActivityDetail = useCallback(() => {
    if (!detailAct || !scheduleId) return;
    updateActivityMut.mutate({
      id: detailAct.id,
      scheduleId,
      name: detailName,
      duration: parseInt(detailDuration) || 1,
      activityId: detailActivityId || null,
      wbs: detailWbs === "__none__" ? null : (detailWbs || undefined),
      calendarId: detailCalendarId ? parseInt(detailCalendarId) : undefined,
      barColor: detailBarColor || null,
      percentComplete: Math.min(100, Math.max(0, parseFloat(detailPercentComplete) || 0)),
      activityType: detailActivityType,
      constraintType: detailConstraintType as any,
      constraintDate: detailConstraintDate ? new Date(detailConstraintDate + "T00:00:00") : null,
    });
    setShowActivityDetailModal(false);
    toast.success("Activity updated");
  }, [detailAct, scheduleId, detailName, detailDuration, detailActivityId, detailWbs, detailCalendarId, detailBarColor, detailPercentComplete, detailActivityType, detailConstraintType, detailConstraintDate, updateActivityMut]);

  const handleGanttDurationChange = useCallback((activityId: number, newDuration: number) => {
    if (!scheduleId) return;
    updateActivityMut.mutate({ id: activityId, scheduleId, duration: Math.max(1, newDuration) });
    toast.success(`Duration updated to ${Math.max(1, newDuration)}d`);
  }, [scheduleId, updateActivityMut]);

  const handleGanttRelationshipCreate = useCallback((predId: number, succId: number, type: string) => {
    if (!scheduleId) return;
    addRelMut.mutate({ scheduleId, predecessorId: predId, successorId: succId, relationshipType: type as any, lagDays: 0 });
  }, [scheduleId, addRelMut]);

  const handleGanttActivityClick = useCallback((activityId: number) => {
    const act = activities.find((a) => a.id === activityId);
    if (act) openActivityDetail(act);
  }, [activities, openActivityDetail]);

  /* ── Loading / Error ──────────────────────────────────────────────────── */
  if (!scheduleId) return <div className="h-screen flex items-center justify-center bg-[#0f1219] text-gray-300">Invalid schedule ID</div>;
  if (scheduleQuery.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f1219]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Loading schedule...</p>
        </div>
      </div>
    );
  }
  if (!schedule) return <div className="h-screen flex items-center justify-center bg-[#0f1219] text-gray-300">Schedule not found</div>;

  const hasActiveFilters = filterCriticalOnly || filterLongestPath || filterLookahead !== "none" || filterFloatMin || filterFloatMax || filterDateStart || filterDateEnd || filterOpenEnds || activeFilters.size > 0;

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col bg-[#0f1219] text-gray-100">
      {/* ── Top Toolbar ── Construct Line SaaS Ribbon ────────────────────── */}
      <div className="border-b border-white/10 bg-[#151a28] shrink-0">
        {/* Row 1: Title bar with Construct Line branding */}
        <div className="h-11 flex items-center px-4 gap-3 border-b border-white/5">
          <button onClick={() => window.close()} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-white/10" />
          {/* Construct Line Brand Mark */}
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight text-white leading-tight">Construct<span className="text-amber-400">Line</span></span>
            <span className="text-[8px] text-gray-500 tracking-wider uppercase leading-tight">Powered by ALP</span>
          </div>
          <div className="w-px h-5 bg-white/10" />
          <h1 className="text-sm font-medium text-gray-300 truncate max-w-[280px] tracking-tight">{schedule.schedule.name}</h1>
          <div className="flex-1" />
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID or name..."
                className="h-8 text-xs pl-8 w-52 border-white/15 bg-white/5 text-gray-100 placeholder:text-gray-500 rounded-lg"
                autoFocus
                onBlur={() => { if (!searchQuery) setShowSearch(false); }}
              />
            </div>
          )}
          <Button
            size="sm" variant="ghost"
            className={`h-8 w-8 p-0 rounded-lg ${searchQuery ? "text-amber-400" : "text-gray-400 hover:text-white"}`}
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>

        {/* Row 2: Professional SaaS Ribbon Toolbar */}
        <div className="flex items-stretch px-2 gap-0 overflow-x-auto">

          {/* ── GROUP: Schedule ── */}
          <div className="flex flex-col py-1.5 px-2 border-r border-white/[0.06]">
            <div className="flex items-center gap-1 flex-1">
              <Button
                size="sm" variant="outline"
                className="h-8 text-xs gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/15 bg-amber-500/10 font-semibold rounded-md shadow-sm shadow-amber-500/10"
                onClick={() => scheduleId && recalcMut.mutate({ scheduleId })}
                disabled={recalcMut.isPending}
              >
                {recalcMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Calculate
              </Button>
              <div className="flex items-center bg-white/[0.04] rounded-md border border-white/[0.06]">
                <Button
                  size="sm" variant="ghost"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-r-none"
                  onClick={undo}
                  disabled={!canUndo || isUndoRedoProcessing}
                  title={undoDescription ? `Undo: ${undoDescription}` : "Nothing to undo (Ctrl+Z)"}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-4 bg-white/[0.08]" />
                <Button
                  size="sm" variant="ghost"
                  className="h-8 w-8 p-0 text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 rounded-l-none"
                  onClick={redo}
                  disabled={!canRedo || isUndoRedoProcessing}
                  title={redoDescription ? `Redo: ${redoDescription}` : "Nothing to redo (Ctrl+Shift+Z)"}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button
                size="sm" variant="outline"
                className={`h-8 text-xs gap-1.5 rounded-md ${
                  dataDate
                    ? "border-sky-500/25 text-sky-300 bg-sky-500/8 hover:bg-sky-500/15"
                    : "border-amber-500/40 text-amber-400 bg-amber-500/10 animate-pulse"
                }`}
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0];
                  setDataDateInput(dataDate ? dataDate.toISOString().split("T")[0] : today);
                  setShowDataDatePicker(true);
                }}
                title="Click to set or change the Data Date"
              >
                <Calendar className="w-3.5 h-3.5" />
                DD: {dataDate ? formatDate(dataDate) : "Set"}
              </Button>
            </div>
            <span className="text-[9px] font-bold tracking-[0.15em] text-amber-500/60 uppercase text-center mt-1 border-t border-white/[0.04] pt-0.5">Schedule</span>
          </div>

          {/* ── GROUP: Activities ── */}
          <div className="flex flex-col py-1.5 px-2 border-r border-white/[0.06]">
            <div className="flex items-center gap-0.5 flex-1">
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-md" onClick={() => setShowActivityDialog(true)} title="Add a new activity">
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-sky-400 hover:bg-sky-500/10 hover:text-sky-300 rounded-md" onClick={() => setShowBulkAddDialog(true)} title="Bulk add multiple activities">
                <Plus className="w-3.5 h-3.5" /> Bulk
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-md" onClick={() => setShowCsvImportDialog(true)} title="Import activities from CSV file">
                <Upload className="w-3.5 h-3.5" /> CSV
              </Button>
            </div>
            <span className="text-[9px] font-bold tracking-[0.15em] text-amber-500/60 uppercase text-center mt-1 border-t border-white/[0.04] pt-0.5">Activities</span>
          </div>

          {/* ── GROUP: View ── */}
          <div className="flex flex-col py-1.5 px-2 border-r border-white/[0.06]">
            <div className="flex items-center gap-1 flex-1">
              {/* Zoom Segmented Control */}
              <div className="flex items-center rounded-md h-8 overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                {(["day", "week", "month"] as const).map((z) => (
                  <button
                    key={z}
                    onClick={() => { setZoom(z); setCustomPpd(z === "day" ? 40 : z === "week" ? 14 : 4); }}
                    className={`px-2.5 text-[11px] h-full transition-all font-medium ${zoom === z ? "bg-amber-500/20 text-amber-300 shadow-inner shadow-amber-500/10" : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"}`}
                  >
                    {z.charAt(0).toUpperCase() + z.slice(1)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5" title="Drag to adjust timescale density (or Ctrl+Scroll on Gantt)">
                <span className="text-[9px] text-gray-600">−</span>
                <input type="range" min="0.5" max="60" step="0.5" value={customPpd}
                  onChange={(e) => { setCustomPpd(parseFloat(e.target.value)); }}
                  className="w-14 h-1 accent-amber-500 cursor-pointer"
                  title={`Timescale density: ${customPpd} px/day`}
                />
                <span className="text-[9px] text-gray-600">+</span>
              </div>
              <div className="w-px h-5 bg-white/[0.06] mx-0.5" />
              {/* Toggle Group */}
              <div className="flex items-center bg-white/[0.03] rounded-md border border-white/[0.06] overflow-hidden">
                <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 rounded-none ${showArrows ? "text-amber-400 bg-amber-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"}`}
                  onClick={() => setShowArrows(!showArrows)} title="Logic lines (relationship arrows)">
                  {/* P6-style right-angle arrow icon for logic lines */}
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 4v8h6" />
                    <path d="M7 10l2 2-2 2" />
                  </svg>
                </Button>
                <div className="w-px h-4 bg-white/[0.06]" />
                <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 rounded-none ${showDataDateLine ? "text-amber-400 bg-amber-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"}`}
                  onClick={() => setShowDataDateLine(!showDataDateLine)} title="Data date line">
                  <div className="w-4 h-4 flex items-center justify-center text-[9px] font-bold">DD</div>
                </Button>
                <div className="w-px h-4 bg-white/[0.06]" />
                <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 rounded-none ${showTodayLine ? "text-amber-400 bg-amber-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"}`}
                  onClick={() => setShowTodayLine(!showTodayLine)} title="Today line">
                  <div className="w-4 h-4 flex items-center justify-center text-[9px] font-bold">TD</div>
                </Button>
                <div className="w-px h-4 bg-white/[0.06]" />
                <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 rounded-none ${showCostOverlay ? "text-emerald-400 bg-emerald-500/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.06]"}`}
                  onClick={() => setShowCostOverlay(!showCostOverlay)} title="Cost overlay">
                  <DollarSign className="w-3.5 h-3.5" />
                </Button>
              </div>
              <Button size="sm" variant={showAnnotations ? "default" : "ghost"} className={`h-8 text-xs gap-1 rounded-md ${showAnnotations ? "bg-amber-500 text-gray-950 hover:bg-amber-400 shadow-sm shadow-amber-500/20" : "text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"}`}
                onClick={() => setShowAnnotations(!showAnnotations)} title="Annotation overlay for delay analysis">
                <Pencil className="w-3.5 h-3.5" /> Annotate
              </Button>
              <div className="w-px h-5 bg-white/[0.06] mx-0.5" />
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 rounded-md" onClick={() => setShowColumnPicker(true)} title="Choose visible table columns">
                <Columns3 className="w-3.5 h-3.5" /> Columns
              </Button>
              <Button size="sm" variant="ghost" className={`h-8 text-xs gap-1 rounded-md ${hasActiveFilters ? "text-amber-400 bg-amber-500/10" : "text-gray-400 hover:bg-white/[0.06]"} hover:text-gray-200`}
                onClick={() => setShowAdvancedFilter(true)} title="Filter activities by critical path, float, dates, and more">
                <Filter className="w-3.5 h-3.5" /> Filter
                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 rounded-md" title="Group activities by WBS, Critical Path, or Activity Codes">
                    <Layers className="w-3.5 h-3.5" /> Group
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setGroupBy(null)}>
                    <span className={!groupBy ? "font-semibold text-amber-400" : ""}>None</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy("wbs")}>
                    <span className={groupBy === "wbs" ? "font-semibold text-amber-400" : ""}>WBS</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setGroupBy("critical")}>
                    <span className={groupBy === "critical" ? "font-semibold text-amber-400" : ""}>Critical Path</span>
                  </DropdownMenuItem>
                  {codeCategories.map((cat: any) => (
                    <DropdownMenuItem key={cat.id} onClick={() => setGroupBy(String(cat.id))}>
                      <span className={groupBy === String(cat.id) ? "font-semibold text-amber-400" : ""}>{cat.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <span className="text-[9px] font-bold tracking-[0.15em] text-amber-500/60 uppercase text-center mt-1 border-t border-white/[0.04] pt-0.5">View</span>
          </div>

          {/* ── GROUP: Tools ── */}
          <div className="flex flex-col py-1.5 px-2 border-r border-white/[0.06]">
            <div className="flex items-center gap-0.5 flex-1">
              <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 rounded-md" onClick={() => setShowResourcePanel(true)} title="Manage resource assignments and costs">
                <DollarSign className="w-3.5 h-3.5" /> Resources
              </Button>
              <Link href={`/scheduler/${scheduleId}/reports`}>
                <Button size="sm" variant="ghost" className="h-8 text-xs gap-1 text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 rounded-md" title="View schedule reports and analytics">
                  <BarChart3 className="w-3.5 h-3.5" /> Reports
                </Button>
              </Link>
            </div>
            <span className="text-[9px] font-bold tracking-[0.15em] text-amber-500/60 uppercase text-center mt-1 border-t border-white/[0.04] pt-0.5">Tools</span>
          </div>

          <div className="flex-1" />

          {/* ── Settings ── */}
          <div className="flex items-center py-1.5 px-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-white/[0.1] text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white rounded-md">
                  <Settings className="w-3.5 h-3.5" /> Settings
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowRelationshipDialog(true)}>
                <svg viewBox="0 0 16 16" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8h10M9 5l3 3-3 3" /></svg>
                Add Relationship
              </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowIdSettingsDialog(true)}>
              <Settings className="w-4 h-4 mr-2" /> Activity ID Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowBaselineDialog(true)}>
              <Save className="w-4 h-4 mr-2" /> Save Baseline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
              <Save className="w-4 h-4 mr-2" /> Save Update
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Target className="w-4 h-4 mr-2" /> Target 1
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTarget1Id(null)}>
                  <span className={!target1Id ? "font-semibold text-amber-400" : ""}>None</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {baselines.map((b: any) => (
                  <DropdownMenuItem key={b.id} onClick={() => setTarget1Id(b.id)}>
                    <span className={target1Id === b.id ? "font-semibold text-amber-400" : ""}>
                      {b.name} {b.snapshotType === "update" ? `(${new Date(b.createdAt).toLocaleDateString()})` : ""}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Target className="w-4 h-4 mr-2" /> Target 2
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTarget2Id(null)}>
                  <span className={!target2Id ? "font-semibold text-amber-400" : ""}>None</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {baselines.map((b: any) => (
                  <DropdownMenuItem key={b.id} onClick={() => setTarget2Id(b.id)}>
                    <span className={target2Id === b.id ? "font-semibold text-amber-400" : ""}>
                      {b.name} {b.snapshotType === "update" ? `(${new Date(b.createdAt).toLocaleDateString()})` : ""}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowWbsManager(true)}>
              <FolderTree className="w-4 h-4 mr-2" /> WBS Manager
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowCalendarDialog(true)}>
              <Calendar className="w-4 h-4 mr-2" /> Calendars
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowScheduleHealth(true)}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Schedule Health
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowScheduleInfo(true)}>
              <Settings className="w-4 h-4 mr-2" /> Schedule Info
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowGanttSettings(true)}>
              <Settings className="w-4 h-4 mr-2" /> Gantt Display Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LayoutGrid className="w-4 h-4 mr-2" /> Layouts
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <DropdownMenuItem onClick={() => { setLayoutName(""); setLayoutIsDefault(false); setShowLayoutDialog(true); }}>
                  <Save className="w-4 h-4 mr-2" /> Save Current Layout
                </DropdownMenuItem>
                {layouts.length > 0 && <DropdownMenuSeparator />}
                {layouts.map((layout: any) => (
                  <DropdownMenuItem key={layout.id} onClick={() => applyLayoutConfig(layout.config)}>
                    {layout.isDefault && <Star className="w-3 h-3 mr-1 text-amber-500 fill-amber-500" />}
                    <span className="flex-1 truncate">{layout.name}</span>
                    <button
                      className="ml-2 text-gray-400 hover:text-red-400"
                      onClick={(e) => { e.stopPropagation(); if (scheduleId) deleteLayoutMut.mutate({ id: layout.id, scheduleId }); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setPdfProjectName(schedule?.schedule?.name || ""); setShowPdfExport(true); }}>
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>{/* end ribbon row */}
      </div>{/* end toolbar */}

      {/* ── Target indicators bar ──────────────────────────────────────────── */}
      {(target1Id || target2Id) && (
        <div className="h-7 border-b border-white/10 bg-[#1a1f2e] flex items-center px-3 gap-4 text-xs shrink-0">
          {target1Id && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-gray-400" />
              <span className="text-gray-400">Target 1:</span>
              <span className="text-gray-200 font-medium">{target1Query.data ? baselines.find((b: any) => b.id === target1Id)?.name || "Loaded" : "Loading..."}</span>
              <button onClick={() => setTarget1Id(null)} className="text-gray-500 hover:text-red-400 ml-1">&times;</button>
            </div>
          )}
          {target2Id && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-violet-400" />
              <span className="text-gray-400">Target 2:</span>
              <span className="text-gray-200 font-medium">{target2Query.data ? baselines.find((b: any) => b.id === target2Id)?.name || "Loaded" : "Loading..."}</span>
              <button onClick={() => setTarget2Id(null)} className="text-gray-500 hover:text-red-400 ml-1">&times;</button>
            </div>
          )}
        </div>
      )}

      {/* ── Activity Code Filter Bar ───────────────────────────────────────── */}
      {showFilterPanel && codeCategories.length > 0 && (
        <div className="border-b border-white/10 bg-[#151a28] px-4 py-2 flex items-center gap-4 overflow-x-auto shrink-0">
          {codeCategories.map((cat: any) => (
            <div key={cat.id} className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-400 font-medium">{cat.name}:</span>
              <div className="flex gap-1">
                {cat.values.map((val: any) => {
                  const isActive = activeFilters.get(cat.id)?.has(val.id) || false;
                  return (
                    <button
                      key={val.id}
                      onClick={() => {
                        const newFilters = new Map(activeFilters);
                        if (!newFilters.has(cat.id)) newFilters.set(cat.id, new Set());
                        const set = newFilters.get(cat.id)!;
                        if (isActive) { set.delete(val.id); if (set.size === 0) newFilters.delete(cat.id); }
                        else set.add(val.id);
                        setActiveFilters(newFilters);
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${isActive ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "border-white/15 text-gray-400 hover:border-white/30 hover:text-gray-200"}`}
                    >
                      {val.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {activeFilters.size > 0 && (
            <button onClick={() => setActiveFilters(new Map())} className="text-xs text-red-400 hover:underline shrink-0">Clear All</button>
          )}
        </div>
      )}

      {/* ── Split Pane ──────────────────────────────────────────────────────── */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left: Activity Table */}
        <ResizablePanel defaultSize={45} minSize={25} maxSize={70}>
          <div ref={tableRef} className="h-full overflow-auto bg-white">
            {/* Table Header with sortable columns */}
            <div className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
              <div
                className="text-sm font-semibold text-gray-600 h-11 items-center px-3 gap-1.5"
                style={{ display: "grid", gridTemplateColumns: gridTemplate }}
              >
                <div></div>
                {activeColumns.map((col) => {
                  const isSorted = sortState.key === col.key;
                  return (
                    <div
                      key={col.key}
                      className={`text-${col.align} truncate flex items-center gap-0.5 relative group/col ${col.sortable ? "cursor-pointer hover:text-gray-900 select-none" : ""}`}
                      title={col.label}
                      onClick={col.sortable ? () => handleColumnSort(col.key) : undefined}
                    >
                      <span className="truncate">{col.shortLabel}</span>
                      {col.sortable && (
                        <span className="shrink-0">
                          {isSorted && sortState.dir === "asc" && <ChevronUp className="w-3 h-3 text-amber-400" />}
                          {isSorted && sortState.dir === "desc" && <ChevronDown className="w-3 h-3 text-amber-400" />}
                          {!isSorted && <ArrowUpDown className="w-3 h-3 text-gray-400" />}
                        </span>
                      )}
                      {/* Column resize handle */}
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-amber-500/50 transition-colors ${resizingCol === col.key ? "bg-amber-500" : "bg-transparent group-hover/col:bg-gray-300/50"}`}
                        onMouseDown={(e) => handleColResizeStart(e, col.key)}
                        title="Drag to resize column"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {groupedActivities.map(({ group, activities: groupActs, depth, wbsColor, wbsTextColor }) => (
                <div key={group || "all"}>
                  {group && (() => {
                    // P6-style colored band header
                    let groupBg = "#374151";
                    let groupText = "#f9fafb";
                    const d = depth ?? 0;
                    if (groupBy === "wbs") {
                      if (wbsColor) groupBg = wbsColor;
                      else groupBg = d === 0 ? "#1e293b" : d === 1 ? "#374151" : "#4b5563";
                      if (wbsTextColor) groupText = wbsTextColor;
                      else groupText = "#f9fafb";
                    }
                    // Determine if this group is collapsed
                    const groupKey = group || "all";
                    const isCollapsed = collapsedGroups?.has(groupKey);
                    return (
                      <div
                        className="flex items-center cursor-pointer select-none border-b"
                        style={{
                          backgroundColor: groupBg,
                          color: groupText,
                          borderBottomColor: "rgba(0,0,0,0.2)",
                          paddingLeft: `${8 + d * 20}px`,
                          paddingRight: "12px",
                          paddingTop: d === 0 ? "7px" : "5px",
                          paddingBottom: d === 0 ? "7px" : "5px",
                          minHeight: d === 0 ? "34px" : "28px",
                        }}
                        onClick={() => toggleGroupCollapse?.(groupKey)}
                        title={isCollapsed ? "Click to expand" : "Click to collapse"}
                      >
                        {/* Collapse toggle */}
                        <span className="mr-2 flex-shrink-0 opacity-80">
                          {isCollapsed
                            ? <ChevronRight className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />}
                        </span>
                        {/* WBS code badge for WBS grouping */}
                        {groupBy === "wbs" && (() => {
                          const wbsNode = wbsNodes.find((w: any) => w.name === group || `${w.code} — ${w.name}` === group || w.code === group);
                          return wbsNode ? (
                            <span
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded mr-2 flex-shrink-0 opacity-90"
                              style={{ backgroundColor: "rgba(0,0,0,0.25)", color: groupText }}
                            >
                              {wbsNode.code}
                            </span>
                          ) : null;
                        })()}
                        <span
                          className="font-bold tracking-wide truncate"
                          style={{ fontSize: d === 0 ? "0.8125rem" : "0.75rem" }}
                        >
                          {group}
                        </span>
                        <span
                          className="ml-2 flex-shrink-0 opacity-70"
                          style={{ fontSize: "0.6875rem", fontWeight: 400 }}
                        >
                          {isCollapsed ? `(${groupActs.length} hidden)` : `(${groupActs.length})`}
                        </span>
                      </div>
                    );
                  })()}
                  {groupActs.map((act) => {
                    const isOpenStart = openEnds.openStarts.some((a) => a.id === act.id);
                    const isOpenFinish = openEnds.openFinishes.some((a) => a.id === act.id);
                    const hasOpenEnd = isOpenStart || isOpenFinish;
                    const isSelected = selectedActivityIds.has(act.id);
                    return (
                      <div
                        key={act.id}
                        className={`text-sm items-center px-3 gap-1.5 h-11 cursor-pointer transition-colors border-b border-gray-100 ${
                          isSelected
                            ? "bg-amber-50 border-l-2 border-l-amber-500 ring-1 ring-amber-500/20"
                            : act.id === selectedActivityId
                            ? "bg-blue-50 border-l-2 border-l-blue-400"
                            : act.isCritical
                            ? "hover:bg-amber-50/60 border-l-2 border-l-amber-400"
                            : hasOpenEnd
                            ? "hover:bg-yellow-50 border-l-2 border-l-yellow-400"
                            : "hover:bg-gray-50 border-l-2 border-l-transparent"
                        }`}
                        style={{ display: "grid", gridTemplateColumns: gridTemplate }}
                        onClick={(e) => {
                          // Don't handle if click originated from checkbox or dropdown
                          const target = e.target as HTMLElement;
                          if (target.tagName === 'INPUT' || target.closest('button') || target.closest('[role="menu"]')) return;
                          if (e.shiftKey && lastClickedId !== null) {
                            e.preventDefault();
                            const allActs = groupedActivities.flatMap(g => g.activities);
                            const idx1 = allActs.findIndex(a => a.id === lastClickedId);
                            const idx2 = allActs.findIndex(a => a.id === act.id);
                            if (idx1 >= 0 && idx2 >= 0) {
                              const start = Math.min(idx1, idx2);
                              const end = Math.max(idx1, idx2);
                              const newSet = new Set(selectedActivityIds);
                              for (let i = start; i <= end; i++) newSet.add(allActs[i].id);
                              setSelectedActivityIds(newSet);
                            }
                          } else if (e.ctrlKey || e.metaKey) {
                            const newSet = new Set(selectedActivityIds);
                            if (newSet.has(act.id)) newSet.delete(act.id);
                            else newSet.add(act.id);
                            setSelectedActivityIds(newSet);
                            setLastClickedId(act.id);
                          } else {
                            setSelectedActivityIds(new Set());
                            openActivityDetail(act);
                          }
                          setLastClickedId(act.id);
                        }}
                        onDoubleClick={() => openActivityDetail(act)}
                        title={selectedActivityIds.size > 0 ? "Shift+click to extend selection, Ctrl+click to toggle" : "Click to edit, Shift/Ctrl+click to multi-select"}
                      >
                        {/* Row actions */}
                        <div className="flex items-center gap-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (e.shiftKey && lastClickedId !== null) {
                                // Shift+click checkbox: select range
                                const allActs = groupedActivities.flatMap(g => g.activities);
                                const idx1 = allActs.findIndex(a => a.id === lastClickedId);
                                const idx2 = allActs.findIndex(a => a.id === act.id);
                                if (idx1 >= 0 && idx2 >= 0) {
                                  const start = Math.min(idx1, idx2);
                                  const end = Math.max(idx1, idx2);
                                  const newSet = new Set(selectedActivityIds);
                                  for (let i = start; i <= end; i++) newSet.add(allActs[i].id);
                                  setSelectedActivityIds(newSet);
                                }
                              } else {
                                // Normal click: toggle single
                                const newSet = new Set(selectedActivityIds);
                                if (isSelected) newSet.delete(act.id);
                                else newSet.add(act.id);
                                setSelectedActivityIds(newSet);
                              }
                              setLastClickedId(act.id);
                            }}
                            className="w-3.5 h-3.5 accent-amber-500 cursor-pointer shrink-0"
                            title="Click to select, Shift+click to select range"
                          />
                          {hasOpenEnd && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                          {!hasOpenEnd && <GripVertical className="w-3.5 h-3.5 text-gray-600" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300" onClick={(e) => e.stopPropagation()} title="More options">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => openActivityDetail(act)}>
                                <Settings className="w-3.5 h-3.5 mr-2" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                if (scheduleId) addActivityMut.mutate({ scheduleId, name: "New Activity", duration: 5, afterActivityId: act.id });
                              }}>
                                <Plus className="w-3.5 h-3.5 mr-2" /> Insert Below
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { if (scheduleId && confirm("Delete this activity?")) deleteActivityMut.mutate({ id: act.id, scheduleId }); }}
                                className="text-red-400 focus:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Dynamic columns */}
                        {activeColumns.map((col) => {
                          const isEditing = editingCell?.activityId === act.id && editingCell?.field === col.key;
                          const cellClass = col.renderClass ? col.renderClass(act, renderCtx) : "text-gray-700";

                          if (isEditing && col.editable) {
                            return (
                              <div key={col.key} className={`text-${col.align}`} onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={handleEditKeyDown}
                                  autoFocus
                                  className="h-8 text-sm px-2 py-0 border-amber-500/60 bg-white text-gray-900 border"
                                  type={col.key === "duration" || col.key === "percentComplete" ? "number" : "text"}
                                />
                              </div>
                            );
                          }

                          const value = col.render(act, renderCtx);
                          const rawValue = col.key === "name" ? act.name
                            : col.key === "duration" ? String(act.duration)
                            : col.key === "percentComplete" ? String(parseFloat(act.percentComplete) || 0)
                            : col.key === "wbs" ? (act.wbs || "")
                            : col.key === "activityId" ? (act.activityId || "")
                            : "";

                          return (
                            <div
                              key={col.key}
                              className={`text-${col.align} truncate ${cellClass}`}
                              onDoubleClick={col.editable ? (e) => { e.stopPropagation(); startEdit(act.id, col.key, rawValue); } : undefined}
                              title={value}
                            >
                              {value}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Add Activity Row */}
            <div className="px-3 py-2 border-t border-gray-200">
              <button
                onClick={() => setShowActivityDialog(true)}
                className="text-sm text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Activity
              </button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Gantt Chart */}
        <ResizablePanel defaultSize={55} minSize={30}>
          <div ref={ganttContainerRef} className="relative w-full h-full">
          <GanttChart
            activities={filteredActivities}
            relationships={relationships}
            target1Activities={t1Activities}
            target2Activities={t2Activities}
            projectStartDate={schedule.schedule.projectStartDate ? new Date(schedule.schedule.projectStartDate) : new Date()}
            dataDate={dataDate}
            zoom={zoom}
            selectedActivityId={selectedActivityId}
            onSelectActivity={setSelectedActivityId}
            groupedActivities={groupedActivities}
            showArrows={showArrows}
            showDataDateLine={showDataDateLine}
            showTodayLine={showTodayLine}
            onDurationChange={handleGanttDurationChange}
            onRelationshipCreate={handleGanttRelationshipCreate}
            onActivityDoubleClick={handleGanttActivityClick}
            ganttFontSize={ganttFontSize}
            ganttFontColor={ganttFontColor}
            ganttFontFamily={ganttFontFamily}
            customPixelsPerDay={customPpd}
            onZoomChange={(ppd) => {
              setCustomPpd(ppd);
            }}
            showCostOverlay={showCostOverlay}
            costData={costDataMap}
            costFontSize={costFontSize}
            criticalBarColor={schedule?.schedule?.criticalBarColor}
            normalBarColor={schedule?.schedule?.normalBarColor}
          />
          <GanttAnnotations
            width={ganttContainerRef.current?.scrollWidth || 2000}
            height={ganttContainerRef.current?.scrollHeight || 1000}
            annotations={ganttAnnotations}
            onAnnotationsChange={handleAnnotationsChange}
            visible={showAnnotations}
          />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── DIALOGS ──────────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Column Picker Sheet ─────────────────────────────────────────────── */}
      <Sheet open={showColumnPicker} onOpenChange={setShowColumnPicker}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle className="font-semibold">Configure Columns</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1">
            {ALL_COLUMNS.map((col) => {
              const isTargetCol = col.requiresTarget === 1 || col.requiresTarget === 2;
              const targetActive = col.requiresTarget === 1 ? !!target1Id : col.requiresTarget === 2 ? !!target2Id : true;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer transition-colors ${
                    col.alwaysVisible ? "opacity-60" : ""
                  } ${isTargetCol && !targetActive ? "opacity-30" : ""}`}
                >
                  <Checkbox
                    checked={visibleColumns.includes(col.key) || col.alwaysVisible}
                    disabled={col.alwaysVisible}
                    onCheckedChange={(checked) => {
                      if (col.alwaysVisible) return;
                      setVisibleColumns((prev) =>
                        checked ? [...prev, col.key] : prev.filter((k) => k !== col.key)
                      );
                    }}
                  />
                  <div>
                    <div className="text-sm text-gray-200">{col.label}</div>
                    {isTargetCol && (
                      <div className="text-[10px] text-gray-600">
                        Requires Target {col.requiresTarget} active
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <Button
              variant="outline" size="sm" className="w-full text-xs border-white/15"
              onClick={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
            >
              Reset to Default
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Activity Detail Modal ───────────────────────────────────────────── */}
      <Dialog open={showActivityDetailModal} onOpenChange={setShowActivityDetailModal}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Activity Details</DialogTitle>
            <DialogDescription>Edit all properties of this activity.</DialogDescription>
          </DialogHeader>
          {detailAct && (
            <div className="grid grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto pr-1">
              {/* ── LEFT COLUMN: Properties ── */}
              <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Properties</h3>
              {/* Activity Type */}
              <div>
                <Label className="text-sm text-gray-600">Type</Label>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant={detailActivityType === "task" ? "default" : "outline"}
                    className={detailActivityType === "task" ? "bg-amber-500 text-white" : "border-white/15 text-gray-300"}
                    onClick={() => setDetailActivityType("task")}>
                    Task
                  </Button>
                  <Button size="sm" variant={detailActivityType === "milestone" ? "default" : "outline"}
                    className={detailActivityType === "milestone" ? "bg-amber-600 text-white" : "border-white/15 text-gray-300"}
                    onClick={() => { setDetailActivityType("milestone"); setDetailDuration("0"); }}>
                    ◆ Milestone
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-gray-600">Activity ID</Label>
                  <Input value={detailActivityId} onChange={(e) => setDetailActivityId(e.target.value)} placeholder="e.g., FOUND-010" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Duration (days)</Label>
                  <Input type="number" value={detailDuration} onChange={(e) => setDetailDuration(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" disabled={detailActivityType === "milestone"} />
                </div>
              </div>
              <div>
                <Label className="text-sm text-gray-600">Activity Name</Label>
                <Input value={detailName} onChange={(e) => setDetailName(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">WBS Code</Label>
                  {wbsNodes.length > 0 ? (
                    <Select value={detailWbs || "__none__"} onValueChange={setDetailWbs}>
                      <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200">
                        <SelectValue placeholder="Select WBS">
                          {detailWbs && detailWbs !== "__none__"
                            ? `${detailWbs} — ${wbsNodes.find((w: any) => w.code === detailWbs)?.name || ""}`
                            : "None (top level)"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="">
                        <SelectItem value="__none__" className="">None (top level)</SelectItem>
                        {wbsNodes.map((w: any) => (
                          <SelectItem key={w.id} value={w.code} className="">{w.code} — {w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={detailWbs === "__none__" ? "" : detailWbs} onChange={(e) => setDetailWbs(e.target.value || "__none__")} placeholder="e.g., 2.1" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">% Complete</Label>
                  <Input type="number" value={detailPercentComplete} onChange={(e) => setDetailPercentComplete(e.target.value)} min="0" max="100" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Calendar</Label>
                  <Select value={detailCalendarId} onValueChange={setDetailCalendarId}>
                    <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200"><SelectValue placeholder="Default" /></SelectTrigger>
                    <SelectContent className="">
                      <SelectItem value=" " className="">Default Calendar</SelectItem>
                      {calendars.map((cal: any) => (
                        <SelectItem key={cal.id} value={String(cal.id)} className="">{cal.name} ({cal.workWeek === "7day" ? "7-day" : "5-day"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Bar Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={detailBarColor || (detailActivityType === "milestone" ? "#ff9800" : "#22c55e")}
                      onChange={(e) => setDetailBarColor(e.target.value)}
                      className="w-8 h-8 rounded border border-white/15 cursor-pointer"
                    />
                    <Input
                      value={detailBarColor}
                      onChange={(e) => setDetailBarColor(e.target.value)}
                      placeholder={detailActivityType === "milestone" ? "#ff9800" : "#22c55e"}
                      className="flex-1 border-white/15"
                    />
                    {detailBarColor && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-600" onClick={() => setDetailBarColor("")}
                        >
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Constraints */}
              <div className="border border-blue-100 bg-amber-500/10/30 rounded-lg p-3">
                <Label className="text-xs text-amber-300 font-semibold mb-2 block">Date Constraints</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] text-gray-400">Constraint Type</Label>
                    <Select value={detailConstraintType} onValueChange={setDetailConstraintType}>
                      <SelectTrigger className="mt-0.5 border-white/15 text-xs h-8 bg-white/5 text-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="">
                        <SelectItem value="ASAP" className="text-xs">As Soon As Possible</SelectItem>
                        <SelectItem value="ALAP" className="text-xs">As Late As Possible</SelectItem>
                        <SelectItem value="SNET" className="text-xs">Start No Earlier Than</SelectItem>
                        <SelectItem value="SNLT" className="text-xs">Start No Later Than</SelectItem>
                        <SelectItem value="FNET" className="text-xs">Finish No Earlier Than</SelectItem>
                        <SelectItem value="FNLT" className="text-xs">Finish No Later Than</SelectItem>
                        <SelectItem value="MSO" className="text-xs">Must Start On</SelectItem>
                        <SelectItem value="MFO" className="text-xs">Must Finish On</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Constraint Date</Label>
                    <Input
                      type="date"
                      value={detailConstraintDate}
                      onChange={(e) => setDetailConstraintDate(e.target.value)}
                      className="mt-0.5 border-white/15 text-xs h-8 bg-white/5 text-gray-200"
                      disabled={detailConstraintType === "ASAP" || detailConstraintType === "ALAP"}
                    />
                  </div>
                </div>
                {(detailConstraintType === "ASAP" || detailConstraintType === "ALAP") && (
                  <p className="text-[10px] text-gray-600 mt-1">No date required for {detailConstraintType === "ASAP" ? "As Soon As Possible" : "As Late As Possible"}</p>
                )}
              </div>
              </div>
              {/* ── RIGHT COLUMN: Relationships & CPM Results ── */}
              <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Relationships & Schedule</h3>
              {/* Relationships with edit/delete */}
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Relationships</Label>
                <div className="text-xs text-gray-400 space-y-1 bg-white/5 rounded-md p-2 border border-white/10">
                  {relationships.filter((r: any) => r.successorId === detailAct.id).map((r: any) => {
                    const pred = activities.find((a) => a.id === r.predecessorId);
                    return (
                      <div key={r.id} className="flex items-center gap-1 justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Pred:</span>
                          <span className="font-medium text-gray-400">{pred?.activityId || pred?.name || `#${r.predecessorId}`}</span>
                          <span className="text-amber-400 font-mono text-[10px] bg-amber-500/15 px-1 rounded">{r.relationshipType}</span>
                          {r.lagDays ? <span className="text-gray-600">+{r.lagDays}d</span> : null}
                        </div>
                        <button onClick={() => { if (scheduleId) deleteRelMut.mutate({ id: r.id, scheduleId }); }}
                          className="text-red-400 hover:text-red-300 p-0.5" title="Remove relationship">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {relationships.filter((r: any) => r.predecessorId === detailAct.id).map((r: any) => {
                    const succ = activities.find((a) => a.id === r.successorId);
                    return (
                      <div key={r.id} className="flex items-center gap-1 justify-between">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-600">Succ:</span>
                          <span className="font-medium text-gray-400">{succ?.activityId || succ?.name || `#${r.successorId}`}</span>
                          <span className="text-amber-400 font-mono text-[10px] bg-amber-500/15 px-1 rounded">{r.relationshipType}</span>
                          {r.lagDays ? <span className="text-gray-600">+{r.lagDays}d</span> : null}
                        </div>
                        <button onClick={() => { if (scheduleId) deleteRelMut.mutate({ id: r.id, scheduleId }); }}
                          className="text-red-400 hover:text-red-300 p-0.5" title="Remove relationship">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {relationships.filter((r: any) => r.predecessorId === detailAct.id || r.successorId === detailAct.id).length === 0 && (
                    <span className="text-gray-600 italic">No relationships</span>
                  )}
                </div>
                {/* Add Relationship Inline */}
                <div className="mt-2 p-2 bg-white/5 rounded-md border border-white/10">
                  <div className="text-[10px] text-gray-400 font-medium mb-1">Add Predecessor</div>
                  <div className="flex gap-1 items-end">
                    <Select value={newDetailRelPred} onValueChange={setNewDetailRelPred}>
                      <SelectTrigger className="flex-1 h-7 text-xs border-white/15"><SelectValue placeholder="Select activity" /></SelectTrigger>
                      <SelectContent className="max-h-48">
                        {activities.filter((a) => a.id !== detailAct.id).map((a) => (
                          <SelectItem key={a.id} value={String(a.id)} className="text-xs">{a.activityId} — {a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={newDetailRelType} onValueChange={setNewDetailRelType}>
                      <SelectTrigger className="w-16 h-7 text-xs border-white/15"><SelectValue /></SelectTrigger>
                      <SelectContent className="">
                        <SelectItem value="FS" className="">FS</SelectItem>
                        <SelectItem value="SS" className="">SS</SelectItem>
                        <SelectItem value="FF" className="">FF</SelectItem>
                        <SelectItem value="SF" className="">SF</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input type="number" value={newDetailRelLag} onChange={(e) => setNewDetailRelLag(e.target.value)}
                      className="w-14 h-7 text-xs border-white/15" placeholder="Lag" />
                    <Button size="sm" className="h-7 bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold text-xs px-2"
                      disabled={!newDetailRelPred || !scheduleId}
                      onClick={() => {
                        if (scheduleId && newDetailRelPred) {
                          addRelMut.mutate({
                            scheduleId,
                            predecessorId: parseInt(newDetailRelPred),
                            successorId: detailAct.id,
                            relationshipType: newDetailRelType as any,
                            lagDays: parseInt(newDetailRelLag) || 0,
                          });
                          setNewDetailRelPred("");
                          setNewDetailRelLag("0");
                        }
                      }}>
                      Add
                    </Button>
                  </div>
                </div>
              </div>

              {/* CPM Results (read-only) */}
              <div className="grid grid-cols-4 gap-2 bg-white/5 rounded-md p-2 border border-white/10">
                <div className="text-center">
                  <div className="text-[10px] text-gray-600">ES</div>
                  <div className="text-xs font-medium text-gray-300">{formatDate(parseDateSafe(detailAct.earlyStart))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-600">EF</div>
                  <div className="text-xs font-medium text-gray-300">{formatDate(parseDateSafe(detailAct.earlyFinish))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-600">LS</div>
                  <div className="text-xs font-medium text-gray-300">{formatDate(parseDateSafe(detailAct.lateStart))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-600">LF</div>
                  <div className="text-xs font-medium text-gray-300">{formatDate(parseDateSafe(detailAct.lateFinish))}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-md p-2 border border-white/10">
                <div className="text-center">
                  <div className="text-[10px] text-gray-600">Total Float</div>
                  <div className={`text-xs font-semibold ${detailAct.totalFloat <= 0 ? "text-red-400" : detailAct.totalFloat <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                    {detailAct.totalFloat != null ? `${detailAct.totalFloat}d` : "—"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-600">Free Float</div>
                  <div className="text-xs font-medium text-gray-400">{detailAct.freeFloat != null ? `${detailAct.freeFloat}d` : "—"}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-600">Critical</div>
                  <div className={`text-xs font-semibold ${detailAct.isCritical ? "text-red-400" : "text-emerald-400"}`}>
                    {detailAct.isCritical ? "Yes" : "No"}
                  </div>
                </div>
              </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDetailModal(false)} className="border-white/15">Cancel</Button>
            <Button onClick={saveActivityDetail} className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold" disabled={updateActivityMut.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Activity Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Add Activity</DialogTitle>
            <DialogDescription>Create a new task or milestone in this schedule.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Activity Type */}
            <div>
              <Label className="text-xs text-gray-600">Type</Label>
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant={newActType === "task" ? "default" : "outline"}
                  className={newActType === "task" ? "bg-amber-500 text-white" : "border-white/15 text-gray-300"}
                  onClick={() => setNewActType("task")}>
                  Task
                </Button>
                <Button size="sm" variant={newActType === "milestone" ? "default" : "outline"}
                  className={newActType === "milestone" ? "bg-amber-600 text-white" : "border-white/15 text-gray-300"}
                  onClick={() => { setNewActType("milestone"); setNewActDuration("0"); }}>
                  ◆ Milestone
                </Button>
              </div>
            </div>
            {/* Activity ID (optional override) */}
            <div>
              <Label className="text-xs text-gray-600">Activity ID (optional)</Label>
              <Input value={newActActivityId} onChange={(e) => setNewActActivityId(e.target.value)} placeholder="Auto-generated if blank" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Activity Name</Label>
              <Input value={newActName} onChange={(e) => setNewActName(e.target.value)} placeholder={newActType === "milestone" ? "e.g., Notice to Proceed" : "e.g., Foundation Footings"} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Duration (days)</Label>
                <Input type="number" value={newActDuration} onChange={(e) => setNewActDuration(e.target.value)}
                  className="mt-1 border-white/15 bg-white/5 text-gray-200" disabled={newActType === "milestone"} />
              </div>
              <div>
                <Label className="text-xs text-gray-600">WBS (optional)</Label>
                {wbsNodes.length > 0 ? (
                  <Select value={newActWbs || "__none__"} onValueChange={(v) => setNewActWbs(v === "__none__" ? "" : v)}>
                    <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200"><SelectValue placeholder="Select WBS" /></SelectTrigger>
                    <SelectContent className="">
                      <SelectItem value="__none__" className="">None</SelectItem>
                      {wbsNodes.map((w: any) => (
                        <SelectItem key={w.id} value={w.code} className="">{w.code} — {w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={newActWbs} onChange={(e) => setNewActWbs(e.target.value)} placeholder="e.g., 2.0" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newActName.trim()) {
                  addActivityMut.mutate({
                    scheduleId, name: newActName.trim(),
                    duration: newActType === "milestone" ? 0 : (parseInt(newActDuration) || 5),
                    wbs: newActWbs.trim() || undefined,
                    activityType: newActType,
                    activityId: newActActivityId.trim() || undefined,
                  });
                  setNewActName(""); setNewActDuration("5"); setNewActWbs(""); setNewActType("task"); setNewActActivityId(""); setShowActivityDialog(false);
                }
              }}
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={!newActName.trim() || addActivityMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Add Activities Dialog ──────────────────────────────────────── */}
      <Dialog open={showBulkAddDialog} onOpenChange={setShowBulkAddDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Bulk Add Activities</DialogTitle>
            <DialogDescription>Create multiple activities at once with auto-generated IDs.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Number of Activities</Label>
              <Input type="number" min="1" max="500" value={bulkAddCount} onChange={(e) => setBulkAddCount(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Name Prefix (optional)</Label>
              <Input value={bulkAddPrefix} onChange={(e) => setBulkAddPrefix(e.target.value)} placeholder="e.g., Activity" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              <p className="text-[10px] text-gray-600 mt-1">Activities will be named "{bulkAddPrefix || 'Activity'} 1", "{bulkAddPrefix || 'Activity'} 2", etc.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAddDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId) {
                  bulkAddMut.mutate({
                    scheduleId,
                    count: Math.min(500, Math.max(1, parseInt(bulkAddCount) || 10)),
                    namePrefix: bulkAddPrefix.trim() || "Activity",
                  });
                }
              }}
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={bulkAddMut.isPending}
            >
              {bulkAddMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add {bulkAddCount || 10} Activities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── CSV Import Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showCsvImportDialog} onOpenChange={(open) => { setShowCsvImportDialog(open); if (!open) { setCsvParsedRows([]); setCsvFileName(""); } }}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" /> Import Activities from CSV
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to bulk-import activities. Supported columns: Activity ID, Name, Duration, WBS, Type, Predecessors.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* File upload */}
            <div>
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-white/15 rounded-lg cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-colors">
                <Upload className="w-6 h-6 text-gray-600 mb-1" />
                <span className="text-sm text-gray-400">{csvFileName || "Click to select CSV file"}</span>
                <span className="text-[10px] text-gray-600 mt-0.5">Accepts .csv files up to 1000 rows</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setCsvFileName(file.name);
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      if (!text) return;
                      const lines = text.split(/\r?\n/).filter(l => l.trim());
                      if (lines.length < 2) { toast.error("CSV must have a header row and at least one data row"); return; }
                      const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
                      const nameIdx = header.findIndex(h => h === "name" || h === "activityname" || h === "description");
                      const idIdx = header.findIndex(h => h === "activityid" || h === "id" || h === "code");
                      const durIdx = header.findIndex(h => h === "duration" || h === "dur" || h === "days");
                      const wbsIdx = header.findIndex(h => h === "wbs" || h === "wbscode");
                      const typeIdx = header.findIndex(h => h === "type" || h === "activitytype");
                      const predIdx = header.findIndex(h => h === "predecessors" || h === "predecessor" || h === "pred" || h === "preds");
                      if (nameIdx === -1) { toast.error("CSV must have a 'Name' column"); return; }
                      const rows: typeof csvParsedRows = [];
                      for (let i = 1; i < lines.length; i++) {
                        // Simple CSV parsing (handles basic quoted fields)
                        const vals: string[] = [];
                        let current = "";
                        let inQuotes = false;
                        for (const ch of lines[i]) {
                          if (ch === '"') { inQuotes = !inQuotes; continue; }
                          if (ch === "," && !inQuotes) { vals.push(current.trim()); current = ""; continue; }
                          current += ch;
                        }
                        vals.push(current.trim());
                        const name = vals[nameIdx];
                        if (!name) continue;
                        const dur = durIdx >= 0 ? parseInt(vals[durIdx]) || 1 : 1;
                        const typeRaw = typeIdx >= 0 ? vals[typeIdx]?.toLowerCase() : "task";
                        rows.push({
                          activityId: idIdx >= 0 ? vals[idIdx] || undefined : undefined,
                          name,
                          duration: dur,
                          wbs: wbsIdx >= 0 ? vals[wbsIdx] || undefined : undefined,
                          activityType: typeRaw === "milestone" ? "milestone" : "task",
                          predecessors: predIdx >= 0 ? vals[predIdx] || undefined : undefined,
                        });
                      }
                      setCsvParsedRows(rows);
                      toast.success(`Parsed ${rows.length} activities from CSV`);
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Template hint */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 mb-1">Expected CSV Format</p>
              <code className="text-[10px] text-gray-400 block font-mono">
                Activity ID,Name,Duration,WBS,Type,Predecessors<br/>
                A1010,Site Survey,3,1.0,task,<br/>
                A1020,Demolition,5,1.0,task,A1010FS<br/>
                A1030,Excavation,7,2.0,task,A1020FS<br/>
                M1000,Project Complete,0,,milestone,A1030FS
              </code>
              <p className="text-[10px] text-gray-600 mt-1">Only "Name" is required. Predecessors format: A1010FS, A1020SS+2, A1030FF-1</p>
            </div>

            {/* Preview table */}
            {csvParsedRows.length > 0 && (
              <div className="border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-white/5 px-3 py-1.5 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">{csvParsedRows.length} activities to import</span>
                  <button onClick={() => { setCsvParsedRows([]); setCsvFileName(""); }} className="text-[10px] text-red-500 hover:underline">Clear</button>
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-400 font-medium">#</th>
                        <th className="px-2 py-1 text-left text-gray-400 font-medium">ID</th>
                        <th className="px-2 py-1 text-left text-gray-400 font-medium">Name</th>
                        <th className="px-2 py-1 text-center text-gray-400 font-medium">Dur</th>
                        <th className="px-2 py-1 text-left text-gray-400 font-medium">WBS</th>
                        <th className="px-2 py-1 text-left text-gray-400 font-medium">Type</th>
                        <th className="px-2 py-1 text-left text-gray-400 font-medium">Preds</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvParsedRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="px-2 py-1 text-gray-600">{i + 1}</td>
                          <td className="px-2 py-1 font-mono text-gray-400">{row.activityId || "(auto)"}</td>
                          <td className="px-2 py-1 text-gray-200">{row.name}</td>
                          <td className="px-2 py-1 text-center text-gray-300">{row.duration}d</td>
                          <td className="px-2 py-1 text-gray-600">{row.wbs || "—"}</td>
                          <td className="px-2 py-1 text-gray-600">{row.activityType}</td>
                          <td className="px-2 py-1 text-gray-600 font-mono text-[10px]">{row.predecessors || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {csvParsedRows.length > 50 && (
                    <div className="px-3 py-1.5 text-[10px] text-gray-500 bg-white/5 border-t border-white/10">
                      Showing first 50 of {csvParsedRows.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCsvImportDialog(false); setCsvParsedRows([]); setCsvFileName(""); }} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && csvParsedRows.length > 0) {
                  csvImportMut.mutate({ scheduleId, rows: csvParsedRows });
                }
              }}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              disabled={csvParsedRows.length === 0 || csvImportMut.isPending}
            >
              {csvImportMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              Import {csvParsedRows.length} Activities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Activity ID Settings Dialog ─────────────────────────────────────── */}
      <Dialog open={showIdSettingsDialog} onOpenChange={setShowIdSettingsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Activity ID Settings</DialogTitle>
            <DialogDescription>Configure how new Activity IDs are generated.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">ID Prefix</Label>
              <Input value={idSettingsPrefix} onChange={(e) => setIdSettingsPrefix(e.target.value)} placeholder="e.g., A, E, FOUND" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              <p className="text-[10px] text-gray-600 mt-1">Leave blank for numbers only. Example: "E" → E100, E110, E120</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Start Number</Label>
                <Input type="number" value={idSettingsStart} onChange={(e) => setIdSettingsStart(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Interval</Label>
                <Input type="number" value={idSettingsInterval} onChange={(e) => setIdSettingsInterval(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
                <p className="text-[10px] text-gray-600 mt-1">e.g., 10 → ...100, 110, 120</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIdSettingsDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId) {
                  updateIdSettingsMut.mutate({
                    scheduleId,
                    activityIdPrefix: idSettingsPrefix.trim(),
                    activityIdStart: parseInt(idSettingsStart) || 1000,
                    activityIdInterval: parseInt(idSettingsInterval) || 10,
                  });
                }
              }}
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={updateIdSettingsMut.isPending}
            >
              Save Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Relationship Dialog ─────────────────────────────────────────── */}
      <Dialog open={showRelationshipDialog} onOpenChange={setShowRelationshipDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Add Relationship</DialogTitle>
            <DialogDescription>Define a logic tie between two activities.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Predecessor</Label>
              <Select value={newRelPred} onValueChange={setNewRelPred}>
                <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200"><SelectValue placeholder="Select predecessor" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="">{a.activityId || `A${a.id}`} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Successor</Label>
              <Select value={newRelSucc} onValueChange={setNewRelSucc}>
                <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200"><SelectValue placeholder="Select successor" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="">{a.activityId || `A${a.id}`} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Type</Label>
                <Select value={newRelType} onValueChange={setNewRelType}>
                  <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200"><SelectValue /></SelectTrigger>
                    <SelectContent className="">
                      <SelectItem value="FS" className="">Finish-to-Start (FS)</SelectItem>
                      <SelectItem value="SS" className="">Start-to-Start (SS)</SelectItem>
                      <SelectItem value="FF" className="">Finish-to-Finish (FF)</SelectItem>
                      <SelectItem value="SF" className="">Start-to-Finish (SF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Lag (days)</Label>
                <Input type="number" value={newRelLag} onChange={(e) => setNewRelLag(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelationshipDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newRelPred && newRelSucc) {
                  addRelMut.mutate({ scheduleId, predecessorId: parseInt(newRelPred), successorId: parseInt(newRelSucc), relationshipType: newRelType as any, lagDays: parseInt(newRelLag) || 0 });
                }
              }}
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={!newRelPred || !newRelSucc || addRelMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Baseline Dialog ────────────────────────────────────────────── */}
      <Dialog open={showBaselineDialog} onOpenChange={setShowBaselineDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Save Baseline</DialogTitle>
            <DialogDescription>Save the current schedule as the original baseline for comparison.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs text-gray-600">Baseline Name</Label>
            <Input value={newBaselineName} onChange={(e) => setNewBaselineName(e.target.value)} placeholder="e.g., Original Baseline" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaselineDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newBaselineName.trim()) {
                  saveBaselineMut.mutate({ scheduleId, name: newBaselineName.trim(), snapshotType: "baseline" });
                  setNewBaselineName("");
                }
              }}
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={!newBaselineName.trim() || saveBaselineMut.isPending}
            >
              Save Baseline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Update Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Save Schedule Update</DialogTitle>
            <DialogDescription>
              Snapshot the current schedule as Update {baselines.filter((b: any) => b.snapshotType === "update").length + 1}.
              Data Date: {dataDate ? formatDate(dataDate) : "Not set"}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs text-gray-600">Notes (optional)</Label>
            <Textarea
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="e.g., Added 2 weeks for weather delay on foundation"
              className="mt-1 border-white/15 bg-white/5 text-gray-200"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId) {
                  saveUpdateMut.mutate({ scheduleId, notes: updateNotes.trim() || undefined });
                  setUpdateNotes("");
                }
              }}
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={saveUpdateMut.isPending}
            >
              Save Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set Data Date Dialog ────────────────────────────────────────────── */}
      <Dialog open={showDataDatePicker} onOpenChange={setShowDataDatePicker}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Set Data Date</DialogTitle>
            <DialogDescription>The data date is the "as-of" date for CPM calculations. It is independent of today's calendar date.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs text-gray-600">Data Date</Label>
            <Input
              type="date"
              value={dataDateInput}
              onChange={(e) => setDataDateInput(e.target.value)}
              className="mt-1 border-white/15 bg-white/5 text-gray-200"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDataDatePicker(false)} className="border-white/15">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && dataDateInput) {
                  updateScheduleMut.mutate({ id: scheduleId, dataDate: new Date(dataDateInput + "T00:00:00") }, {
                    onSuccess: () => {
                      setShowDataDatePicker(false);
                      // Auto-trigger recalculation with new data date
                      setTimeout(() => {
                        if (scheduleId) {
                          recalcMut.mutate({ scheduleId });
                        }
                      }, 300);
                    }
                  });
                }
              }}
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={!dataDateInput || updateScheduleMut.isPending}
            >
              {updateScheduleMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 mr-2" />}
              Set Data Date & Calculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Calendar Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Project Calendars</DialogTitle>
            <DialogDescription>Create and manage work calendars, set work days, and mark holidays.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {/* Create New Calendar */}
            <div className="border border-dashed border-blue-300 bg-amber-500/10/30 rounded-lg p-3">
              <Label className="text-xs text-amber-300 font-semibold mb-2 block">Create New Calendar</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Calendar name"
                  className="border-white/15 text-sm bg-white/5 text-gray-200"
                  id="newCalName"
                />
                <Select defaultValue="5day">
                  <SelectTrigger className="border-white/15 text-sm bg-white/5 text-gray-200" id="newCalWorkWeek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="">
                    <SelectItem value="5day" className="">5-Day (Mon-Fri)</SelectItem>
                    <SelectItem value="6day" className="">6-Day (Mon-Sat)</SelectItem>
                    <SelectItem value="7day" className="">7-Day</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold text-xs"
                  onClick={() => {
                    const nameEl = document.getElementById("newCalName") as HTMLInputElement;
                    const name = nameEl?.value?.trim();
                    if (!name || !scheduleId) return;
                    const weekSelect = document.querySelector("#newCalWorkWeek");
                    const weekText = weekSelect?.closest("button")?.textContent || "";
                    let workWeek: "5day" | "7day" = "5day";
                    let mask = 31; // Mon-Fri
                    if (weekText.includes("7-Day")) { workWeek = "7day"; mask = 127; }
                    else if (weekText.includes("6-Day")) { workWeek = "5day"; mask = 63; } // Mon-Sat
                    addCalendarMut.mutate({ scheduleId, name, workWeek, workDaysMask: mask, isDefault: false, addUSHolidays: false });
                    if (nameEl) nameEl.value = "";
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Add Calendar
                </Button>
              </div>
            </div>

            {/* Existing Calendars */}
            {calendars.map((cal: any) => {
              const exceptions = cal.exceptions || [];
              const holidays = exceptions.filter((e: any) => e.exceptionType === "holiday");
              const workdays = exceptions.filter((e: any) => e.exceptionType === "workday");
              const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
              const DAY_BITS = [1, 2, 4, 8, 16, 32, 64];
              return (
                <div key={cal.id} className="border border-white/10 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-100">{cal.name}</span>
                      {cal.isDefault && <span className="text-[10px] bg-amber-500/15 text-amber-300 px-2 py-0.5 rounded-full font-medium">Default</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {!cal.isDefault && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-amber-400 hover:bg-amber-500/10"
                          onClick={() => { if (scheduleId) addCalendarMut.mutate({ scheduleId, name: cal.name, workWeek: cal.workWeek, workDaysMask: cal.workDaysMask, isDefault: true, addUSHolidays: false }); }}
                        >Set Default</Button>
                      )}
                      {!cal.isDefault && (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500 hover:bg-red-50"
                          onClick={() => { if (scheduleId && confirm("Delete this calendar?")) deleteCalendarMut.mutate({ id: cal.id, scheduleId }); }}
                        ><Trash2 className="w-3 h-3" /></Button>
                      )}
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    {/* Work Days */}
                    <div>
                      <Label className="text-[10px] text-gray-400 mb-1 block">Work Days</Label>
                      <div className="flex gap-1">
                        {DAY_NAMES.map((day, i) => {
                          const isWork = (cal.workDaysMask & DAY_BITS[i]) !== 0;
                          return (
                            <button
                              key={day}
                              className={`px-2 py-1 text-[10px] rounded font-medium transition-colors ${
                                isWork ? "bg-emerald-100 text-emerald-700 border border-emerald-300" : "bg-white/8 text-gray-600 border border-white/10"
                              }`}
                              title={isWork ? `${day} is a work day (click to toggle)` : `${day} is a non-work day (click to toggle)`}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Holidays */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-[10px] text-gray-400">Holidays / Non-Work Days ({holidays.length})</Label>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-5 text-[10px] text-amber-400 hover:bg-amber-500/10 px-1"
                            onClick={() => {
                              if (!scheduleId) return;
                              addCalendarMut.mutate({ scheduleId, name: cal.name, workWeek: cal.workWeek, workDaysMask: cal.workDaysMask, isDefault: cal.isDefault, addUSHolidays: true });
                            }}
                          >+ US Holidays</Button>
                        </div>
                      </div>
                      {holidays.length > 0 && (
                        <div className="space-y-0.5 max-h-32 overflow-y-auto">
                          {holidays.sort((a: any, b: any) => new Date(a.exceptionDate).getTime() - new Date(b.exceptionDate).getTime()).map((exc: any) => (
                            <div key={exc.id} className="flex items-center justify-between text-xs px-2 py-1 bg-red-50 rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-red-400 font-mono text-[10px]">{new Date(exc.exceptionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                                <span className="text-gray-600">{exc.description || "Holiday"}</span>
                              </div>
                              <button onClick={() => { if (scheduleId) deleteCalExcMut.mutate({ id: exc.id, scheduleId }); }}
                                className="text-red-400 hover:text-red-300 p-0.5"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add Holiday */}
                      <div className="flex gap-1 mt-1">
                        <Input type="date" className="flex-1 border-white/15 text-xs bg-white/5 text-gray-200 h-7" id={`newHolidayDate-${cal.id}`} />
                        <Input placeholder="Description" className="flex-1 border-white/15 text-xs bg-white/5 text-gray-200 h-7" id={`newHolidayDesc-${cal.id}`} />
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/15 text-gray-300 px-2"
                          onClick={() => {
                            const dateEl = document.getElementById(`newHolidayDate-${cal.id}`) as HTMLInputElement;
                            const descEl = document.getElementById(`newHolidayDesc-${cal.id}`) as HTMLInputElement;
                            if (!dateEl?.value || !scheduleId) return;
                            addCalExcMut.mutate({
                              calendarId: cal.id,
                              scheduleId,
                              exceptionDate: new Date(dateEl.value + "T00:00:00"),
                              exceptionType: "holiday",
                              description: descEl?.value || undefined,
                            });
                            if (dateEl) dateEl.value = "";
                            if (descEl) descEl.value = "";
                          }}
                        >+ Add</Button>
                      </div>
                    </div>

                    {/* Workday Overrides */}
                    <div>
                      <Label className="text-[10px] text-gray-400 mb-1 block">Workday Overrides ({workdays.length})</Label>
                      {workdays.length > 0 && (
                        <div className="space-y-0.5 max-h-24 overflow-y-auto">
                          {workdays.map((exc: any) => (
                            <div key={exc.id} className="flex items-center justify-between text-xs px-2 py-1 bg-emerald-50 rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-600 font-mono text-[10px]">{new Date(exc.exceptionDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span>
                                <span className="text-gray-600">{exc.description || "Work Day"}</span>
                              </div>
                              <button onClick={() => { if (scheduleId) deleteCalExcMut.mutate({ id: exc.id, scheduleId }); }}
                                className="text-red-400 hover:text-red-300 p-0.5"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1 mt-1">
                        <Input type="date" className="flex-1 border-white/15 text-xs bg-white/5 text-gray-200 h-7" id={`newWorkDate-${cal.id}`} />
                        <Input placeholder="e.g., Saturday OT" className="flex-1 border-white/15 text-xs bg-white/5 text-gray-200 h-7" id={`newWorkDesc-${cal.id}`} />
                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/15 text-gray-300 px-2"
                          onClick={() => {
                            const dateEl = document.getElementById(`newWorkDate-${cal.id}`) as HTMLInputElement;
                            const descEl = document.getElementById(`newWorkDesc-${cal.id}`) as HTMLInputElement;
                            if (!dateEl?.value || !scheduleId) return;
                            addCalExcMut.mutate({
                              calendarId: cal.id,
                              scheduleId,
                              exceptionDate: new Date(dateEl.value + "T00:00:00"),
                              exceptionType: "workday",
                              description: descEl?.value || undefined,
                            });
                            if (dateEl) dateEl.value = "";
                            if (descEl) descEl.value = "";
                          }}
                        >+ Add</Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalendarDialog(false)} className="border-white/15">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Health Dialog ───────────────────────────────────────────── */}
      <Dialog open={showScheduleHealth} onOpenChange={setShowScheduleHealth}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Schedule Health Check</DialogTitle>
            <DialogDescription>Review schedule integrity and identify issues.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-gray-100">{activities.length}</div>
                <div className="text-xs text-gray-400">Total Activities</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{activities.filter((a) => a.isCritical).length}</div>
                <div className="text-xs text-gray-400">Critical Activities</div>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <div className="text-2xl font-bold text-gray-100">{relationships.length}</div>
                <div className="text-xs text-gray-400">Relationships</div>
              </div>
            </div>

            {/* Open Ends */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {openEnds.openStarts.length === 0 && openEnds.openFinishes.length === 0 ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-sm font-medium text-gray-100">Open Ends</span>
              </div>

              {openEnds.openStarts.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-amber-600 font-medium mb-1">
                    Missing Predecessors ({openEnds.openStarts.length})
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {openEnds.openStarts.map((a) => (
                      <div
                        key={a.id}
                        className="text-xs text-gray-400 px-2 py-1 bg-amber-50 rounded cursor-pointer hover:bg-amber-100"
                        onClick={() => { setSelectedActivityId(a.id); setShowScheduleHealth(false); }}
                      >
                        <span className="font-mono text-amber-700">{a.activityId || `A${a.id}`}</span> — {a.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {openEnds.openFinishes.length > 0 && (
                <div>
                  <div className="text-xs text-amber-600 font-medium mb-1">
                    Missing Successors ({openEnds.openFinishes.length})
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {openEnds.openFinishes.map((a) => (
                      <div
                        key={a.id}
                        className="text-xs text-gray-400 px-2 py-1 bg-amber-50 rounded cursor-pointer hover:bg-amber-100"
                        onClick={() => { setSelectedActivityId(a.id); setShowScheduleHealth(false); }}
                      >
                        <span className="font-mono text-amber-700">{a.activityId || `A${a.id}`}</span> — {a.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {openEnds.openStarts.length === 0 && openEnds.openFinishes.length === 0 && (
                <div className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded">
                  All activities have predecessors and successors. Schedule logic is complete.
                </div>
              )}
            </div>

            {/* Negative Float */}
            {activities.some((a) => (a.totalFloat ?? 0) < 0) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-100">Negative Float</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activities.filter((a) => (a.totalFloat ?? 0) < 0).map((a) => (
                    <div
                      key={a.id}
                      className="text-xs text-gray-400 px-2 py-1 bg-red-50 rounded cursor-pointer hover:bg-red-500/15"
                      onClick={() => { setSelectedActivityId(a.id); setShowScheduleHealth(false); }}
                    >
                      <span className="font-mono text-red-300">{a.activityId || `A${a.id}`}</span> — {a.name}
                      <span className="ml-2 text-red-400 font-semibold">{a.totalFloat}d</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleHealth(false)} className="border-white/15">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Info Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showScheduleInfo} onOpenChange={setShowScheduleInfo}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Schedule Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Project Start</span><span className="text-gray-100 font-medium">{formatDate(schedule.schedule.projectStartDate ? new Date(schedule.schedule.projectStartDate) : null)}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Data Date</span><span className="text-gray-100 font-medium">{dataDate ? formatDate(dataDate) : "Not set"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Last Calculated (Run Date)</span><span className="text-gray-100 font-medium">{lastCalculatedAt ? lastCalculatedAt.toLocaleString() : "Never"}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Total Activities</span><span className="text-gray-100 font-medium">{activities.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Critical Activities</span><span className="text-red-400 font-medium">{activities.filter((a) => a.isCritical).length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Baselines</span><span className="text-gray-100 font-medium">{baselines.filter((b: any) => b.snapshotType === "baseline").length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Updates</span><span className="text-gray-100 font-medium">{baselines.filter((b: any) => b.snapshotType === "update").length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Relationships</span><span className="text-gray-100 font-medium">{relationships.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Open Starts</span><span className={`font-medium ${openEnds.openStarts.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>{openEnds.openStarts.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Open Finishes</span><span className={`font-medium ${openEnds.openFinishes.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>{openEnds.openFinishes.length}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleInfo(false)} className="border-white/15">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       {/* ── Gantt Display Settings Dialog ──────────────────────────────────── */}
      <Dialog open={showGanttSettings} onOpenChange={(open) => {
          if (open) {
            // Initialize local bar colors from schedule data when dialog opens
            setLocalCriticalBarColor(schedule?.schedule?.criticalBarColor || "#ef4444");
            setLocalNormalBarColor(schedule?.schedule?.normalBarColor || "#22c55e");
          }
          setShowGanttSettings(open);
        }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Gantt Display Settings</DialogTitle>
            <DialogDescription>Customize how activity labels and bars appear on the Gantt chart.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* ── Bar Colors Section ── */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4">
              <Label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Gantt Bar Colors</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-400 mb-1.5 block">Critical Path Bars</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localCriticalBarColor}
                      onChange={(e) => setLocalCriticalBarColor(e.target.value)}
                      className="w-9 h-9 rounded border border-white/15 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={localCriticalBarColor}
                      onChange={(e) => setLocalCriticalBarColor(e.target.value)}
                      className="flex-1 h-8 text-sm border-white/15 text-gray-100 font-mono"
                      placeholder="#ef4444"
                    />
                    <div className="w-8 h-8 rounded border border-white/20 shrink-0" style={{ background: localCriticalBarColor }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Default: red (#ef4444)</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-400 mb-1.5 block">Non-Critical Bars</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localNormalBarColor}
                      onChange={(e) => setLocalNormalBarColor(e.target.value)}
                      className="w-9 h-9 rounded border border-white/15 cursor-pointer bg-transparent"
                    />
                    <Input
                      value={localNormalBarColor}
                      onChange={(e) => setLocalNormalBarColor(e.target.value)}
                      className="flex-1 h-8 text-sm border-white/15 text-gray-100 font-mono"
                      placeholder="#22c55e"
                    />
                    <div className="w-8 h-8 rounded border border-white/20 shrink-0" style={{ background: localNormalBarColor }} />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">Default: green (#22c55e)</p>
                </div>
              </div>
              {/* Bar color preview */}
              <div className="flex items-center gap-3 mt-2">
                <div className="h-5 rounded flex-1" style={{ background: localCriticalBarColor, opacity: 0.9 }} />
                <span className="text-[10px] text-gray-500">Critical</span>
                <div className="h-5 rounded flex-1" style={{ background: localNormalBarColor, opacity: 0.9 }} />
                <span className="text-[10px] text-gray-500">Non-Critical</span>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-white/15 text-gray-300"
                  onClick={() => { setLocalCriticalBarColor("#ef4444"); setLocalNormalBarColor("#22c55e"); }}
                >
                  Reset to P6 Defaults
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
                  disabled={updateBarColorsMut.isPending}
                  onClick={() => {
                    if (!scheduleId) return;
                    updateBarColorsMut.mutate({
                      scheduleId,
                      criticalBarColor: localCriticalBarColor,
                      normalBarColor: localNormalBarColor,
                    });
                  }}
                >
                  {updateBarColorsMut.isPending ? "Saving..." : "Save Bar Colors"}
                </Button>
              </div>
            </div>

            {/* ── Cost Overlay Font Size ── */}
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-3">
              <Label className="text-xs font-semibold text-amber-400 uppercase tracking-wider block">Cost Overlay Font</Label>
              <p className="text-[11px] text-gray-500">Controls the font size of dollar values displayed on Gantt bars when cost overlay is enabled.</p>
              <div className="flex items-center gap-3">
                <Label className="text-xs text-gray-400 shrink-0">Font Size (px)</Label>
                <input
                  type="range" min={7} max={16} step={1}
                  value={costFontSize}
                  onChange={(e) => setCostFontSize(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-8 text-center text-gray-100">{costFontSize}</span>
              </div>
              <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                <Label className="text-xs text-gray-400 mb-2 block">Preview</Label>
                <div className="flex items-center gap-3">
                  <div className="h-6 flex-1 rounded bg-emerald-500/80 flex items-center justify-end pr-2">
                    <span style={{ fontSize: `${costFontSize}px` }} className="text-white font-semibold">$125,000</span>
                  </div>
                  <div className="h-6 flex-1 rounded bg-red-500/80 flex items-center justify-end pr-2">
                    <span style={{ fontSize: `${costFontSize}px` }} className="text-white font-semibold">$48,750</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Label Font Section ── */}
            <div>
              <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-3">Activity Label Font</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">Font Size (px)</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      type="range" min={7} max={18} step={1}
                      value={ganttFontSize}
                      onChange={(e) => setGanttFontSize(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-8 text-center text-gray-100">{ganttFontSize}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Font Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={ganttFontColor}
                      onChange={(e) => setGanttFontColor(e.target.value)}
                      className="w-8 h-8 rounded border border-white/15 cursor-pointer"
                    />
                    <Input
                      value={ganttFontColor}
                      onChange={(e) => setGanttFontColor(e.target.value)}
                      className="flex-1 h-8 text-sm border-white/15 text-gray-100"
                      placeholder="#374151"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Font Family</Label>
                  <Select value={ganttFontFamily} onValueChange={setGanttFontFamily}>
                    <SelectTrigger className="mt-1 border-white/15 text-gray-100"><SelectValue /></SelectTrigger>
                    <SelectContent className="">
                      <SelectItem value="DM Sans" className="">DM Sans</SelectItem>
                      <SelectItem value="Arial" className="">Arial</SelectItem>
                      <SelectItem value="Helvetica" className="">Helvetica</SelectItem>
                      <SelectItem value="Georgia" className="">Georgia</SelectItem>
                      <SelectItem value="Times New Roman" className="">Times New Roman</SelectItem>
                      <SelectItem value="Courier New" className="">Courier New</SelectItem>
                      <SelectItem value="Verdana" className="">Verdana</SelectItem>
                      <SelectItem value="Trebuchet MS" className="">Trebuchet MS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <Label className="text-xs text-gray-400 mb-2 block">Preview</Label>
                  <div style={{ fontSize: `${ganttFontSize}px`, color: ganttFontColor, fontFamily: `'${ganttFontFamily}', sans-serif` }}>
                    Foundation Footings
                  </div>
                  <div style={{ fontSize: `${ganttFontSize}px`, color: ganttFontColor, fontFamily: `'${ganttFontFamily}', sans-serif` }} className="mt-1">
                    Framing — First Floor
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setGanttFontSize(9); setGanttFontColor("#374151"); setGanttFontFamily("DM Sans"); setCostFontSize(9); }} className="border-white/15 text-gray-100">Reset All Fonts</Button>
            <Button onClick={() => setShowGanttSettings(false)} className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── WBS Manager Dialog ────────────────────────────────────────────── */}
      <Dialog open={showWbsManager} onOpenChange={setShowWbsManager}>
        <DialogContent className="max-w-5xl !max-h-[90vh] [&>div:nth-child(2)]:flex [&>div:nth-child(2)]:flex-col [&>div:nth-child(2)]:h-[calc(90vh-2rem)]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="font-semibold text-lg">WBS Manager — Work Breakdown Structure</DialogTitle>
            <DialogDescription>Build your project hierarchy. Drag nodes to reorder. Click color swatch to change group color. Click ▶ to expand/collapse.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
            {/* Visual WBS Tree */}
            <WBSTree
              nodes={wbsNodes}
              onDelete={(id) => {
                deleteWbsMut.mutate({ id, scheduleId: scheduleId! });
              }}
              onUpdateColor={(id, groupColor, groupTextColor) => {
                if (scheduleId) updateWbsMut.mutate({ id, scheduleId, groupColor, groupTextColor });
              }}
              onUpdateNode={(id, code, name, parentId) => {
                if (scheduleId) updateWbsMut.mutate({ id, scheduleId, code, name, parentId });
              }}
              onReorder={(draggedId, targetId, position) => {
                if (!scheduleId) return;
                // Determine new parentId based on drop position
                const targetNode = wbsNodes.find((w: any) => w.id === targetId);
                if (!targetNode) return;
                let newParentId: number | null = null;
                if (position === "inside") {
                  newParentId = targetId;
                } else {
                  newParentId = targetNode.parentId ?? null;
                }
                updateWbsMut.mutate({ id: draggedId, scheduleId, parentId: newParentId });
              }}
            />

            {/* Add new WBS node */}
            <div className="border-t border-white/10 pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">WBS Code</Label>
                  <Input value={newWbsCode} onChange={(e) => setNewWbsCode(e.target.value)} placeholder="e.g., 2.1" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Name</Label>
                  <Input value={newWbsName} onChange={(e) => setNewWbsName(e.target.value)} placeholder="e.g., Foundation" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
                </div>
              </div>
              {wbsNodes.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-600">Parent (optional)</Label>
                  <Select value={newWbsParentId} onValueChange={setNewWbsParentId}>
                    <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200"><SelectValue placeholder="None (top level)" /></SelectTrigger>
                    <SelectContent className="">
                      <SelectItem value=" " className="">None</SelectItem>
                      {wbsNodes.map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)} className="">{w.code} — {w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                size="sm"
                className="w-full bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
                disabled={!newWbsCode.trim() || !newWbsName.trim() || addWbsMut.isPending}
                onClick={() => {
                  if (scheduleId && newWbsCode.trim() && newWbsName.trim()) {
                    addWbsMut.mutate({
                      scheduleId,
                      code: newWbsCode.trim(),
                      name: newWbsName.trim(),
                      parentId: newWbsParentId && newWbsParentId.trim() ? parseInt(newWbsParentId) : undefined,
                    });
                  }
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add WBS Node
              </Button>
            </div>
            {/* CSI MasterFormat Library */}
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> CSI MasterFormat Library
                </h3>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-200"
                  onClick={() => setShowCsiPicker(!showCsiPicker)}
                >
                  {showCsiPicker ? "Collapse" : "Expand"}
                </Button>
              </div>
              {showCsiPicker && (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Search divisions... (e.g., electrical, concrete)"
                    value={csiSearch}
                    onChange={(e) => setCsiSearch(e.target.value)}
                    className="border-white/15 text-sm bg-white/5 text-gray-200"
                  />
                  <div className="max-h-48 overflow-y-auto border border-white/10 rounded-md">
                    {CSI_ACTIVE_DIVISIONS
                      .filter(d => {
                        if (!csiSearch) return true;
                        const q = csiSearch.toLowerCase();
                        return d.name.toLowerCase().includes(q) || d.code.includes(q) || d.fullName.toLowerCase().includes(q);
                      })
                      .map((div) => {
                        const colors = WBS_GROUP_COLORS[div.group];
                        const alreadyExists = wbsNodes.some((w: any) => w.code === div.code);
                        return (
                          <label
                            key={div.code}
                            className={`flex items-center px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0 ${alreadyExists ? "opacity-50" : ""}`}
                          >
                            <Checkbox
                              checked={selectedCsiCodes.has(div.code) || alreadyExists}
                              disabled={alreadyExists}
                              onCheckedChange={(checked) => {
                                setSelectedCsiCodes(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(div.code); else next.delete(div.code);
                                  return next;
                                });
                              }}
                              className="mr-2"
                            />
                            <span
                              className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                              style={{ backgroundColor: colors.border }}
                            />
                            <span className="font-mono text-amber-400 mr-2 w-6">{div.code}</span>
                            <span className="">{div.name}</span>
                            {alreadyExists && <span className="ml-auto text-gray-600 text-[10px]">Added</span>}
                          </label>
                        );
                      })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-white/15"
                      onClick={() => {
                        const allCodes = CSI_ACTIVE_DIVISIONS
                          .filter(d => !wbsNodes.some((w: any) => w.code === d.code))
                          .map(d => d.code);
                        setSelectedCsiCodes(new Set(allCodes));
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-white/15"
                      onClick={() => setSelectedCsiCodes(new Set())}
                    >
                      Clear
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 text-xs"
                      disabled={selectedCsiCodes.size === 0 || importCsiMut.isPending}
                      onClick={() => {
                        if (scheduleId) {
                          importCsiMut.mutate({
                            scheduleId,
                            divisionCodes: Array.from(selectedCsiCodes),
                          });
                        }
                      }}
                    >
                      {importCsiMut.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                      Import {selectedCsiCodes.size} Division{selectedCsiCodes.size !== 1 ? "s" : ""}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setShowWbsManager(false)} className="border-white/15">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Layout Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showLayoutDialog} onOpenChange={setShowLayoutDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Save Layout</DialogTitle>
            <DialogDescription>Save your current view settings (columns, grouping, sort, zoom, filters) as a reusable layout.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Layout Name</Label>
              <Input
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                placeholder="e.g., Critical Path View, By Trade, My Default"
                className="mt-1 border-white/15 bg-white/5 text-gray-200"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400">
              <Checkbox
                checked={layoutIsDefault}
                onCheckedChange={(c) => setLayoutIsDefault(!!c)}
              />
              Set as default layout (auto-loads when opening this schedule)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLayoutDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              disabled={!layoutName.trim() || saveLayoutMut.isPending}
              onClick={() => {
                if (scheduleId && layoutName.trim()) {
                  saveLayoutMut.mutate({
                    scheduleId,
                    name: layoutName.trim(),
                    config: captureLayoutConfig(),
                    isDefault: layoutIsDefault,
                  });
                }
              }}
            >
              {saveLayoutMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Save className="w-3.5 h-3.5 mr-1" />}
              Save Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Advanced Filter Dialog ───────────────────────────────────────────── */}
      <Dialog open={showAdvancedFilter} onOpenChange={setShowAdvancedFilter}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-semibold text-lg">Advanced Filters</DialogTitle>
            <DialogDescription>Filter activities by various criteria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-6 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={filterCriticalOnly} onCheckedChange={(c) => setFilterCriticalOnly(!!c)} />
                <span className="text-sm text-gray-100">Critical Path Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={filterLongestPath} onCheckedChange={(c) => setFilterLongestPath(!!c)} />
                <span className="text-sm text-gray-100">Longest Path</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={filterOpenEnds} onCheckedChange={(c) => setFilterOpenEnds(!!c)} />
                <span className="text-sm text-gray-100">Open Ends Only</span>
              </label>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Lookahead</Label>
              <Select value={filterLookahead} onValueChange={(v) => setFilterLookahead(v as any)}>
                <SelectTrigger className="mt-1 border-white/15 bg-white/5 text-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent className="">
                  <SelectItem value="none" className="">No lookahead filter</SelectItem>
                  <SelectItem value="1week" className="">1-Week Lookahead</SelectItem>
                  <SelectItem value="2week" className="">2-Week Lookahead</SelectItem>
                  <SelectItem value="4week" className="">4-Week Lookahead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Float Min (days)</Label>
                <Input type="number" value={filterFloatMin} onChange={(e) => setFilterFloatMin(e.target.value)} placeholder="Any" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Float Max (days)</Label>
                <Input type="number" value={filterFloatMax} onChange={(e) => setFilterFloatMax(e.target.value)} placeholder="Any" className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Start Date From</Label>
                <Input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Start Date To</Label>
                <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="mt-1 border-white/15 bg-white/5 text-gray-200" />
              </div>
            </div>

            {codeCategories.length > 0 && (
              <div>
                <Label className="text-xs text-gray-600 mb-2 block">Activity Codes</Label>
                <Button
                  size="sm" variant="outline"
                  className="text-xs border-white/15"
                  onClick={() => setShowFilterPanel(!showFilterPanel)}
                >
                  {showFilterPanel ? "Hide" : "Show"} Code Filter Bar
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/15"
              onClick={() => {
                setFilterCriticalOnly(false);
                setFilterLookahead("none");
                setFilterFloatMin("");
                setFilterFloatMax("");
                setFilterDateStart("");
                setFilterDateEnd("");
                setFilterOpenEnds(false);
                setActiveFilters(new Map());
              }}
            >
              Clear All
            </Button>
            <Button onClick={() => setShowAdvancedFilter(false)} className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold">
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PDF Export Preview Modal ────────────────────────────────────────── */}
      <PdfExportPreview
        open={showPdfExport}
        onOpenChange={setShowPdfExport}
        isExporting={pdfExporting}
        projectName={pdfProjectName}
        companyName={pdfCompanyName}
        activities={filteredActivities}
        dataDate={dataDate}
        scheduleName={schedule?.schedule?.name || ""}
        groupedActivities={groupBy === "wbs" ? groupedActivities as any : undefined}
        groupBy={groupBy}
        relationships={relationships as any}
        onExport={async (config) => {
          if (!schedule) return;
          setPdfExporting(true);
          try {
            // Build footer config from the preview modal's column settings
            const contentToToken = (col: { content: string; customText?: string; imageDataUrl?: string }) => {
              switch (col.content) {
                case "company": return "{companyName}";
                case "project": return "{projectName}";
                case "schedule": return "{scheduleName}";
                case "date": return "{date}";
                case "datadate": return "Data Date: {dataDate}";
                case "page": return "Page {page} of {total}";
                case "custom": return col.customText || "";
                case "image": return col.imageDataUrl ? `{image:${col.imageDataUrl}}` : "";
                case "empty": return "";
                default: return "";
              }
            };
            const fCols = config.footerColumns || [];
            const footerConfig = {
              columns: config.footerColumnCount || 3,
              left: fCols[0] ? contentToToken(fCols[0]) : "",
              centerLeft: fCols.length >= 4 ? contentToToken(fCols[1] || { content: "empty" }) : undefined,
              center: fCols.length === 3 ? contentToToken(fCols[1] || { content: "empty" }) : fCols.length === 5 ? contentToToken(fCols[2] || { content: "empty" }) : contentToToken(fCols[1] || { content: "empty" }),
              centerRight: fCols.length >= 4 ? contentToToken(fCols[fCols.length - 2] || { content: "empty" }) : undefined,
              right: fCols[fCols.length - 1] ? contentToToken(fCols[fCols.length - 1]) : "",
            };
            // Build header config from the preview modal's column settings
            const hCols = config.headerColumns || [];
            const headerConfig = {
              columns: config.headerColumnCount || 3,
              left: hCols[0] ? contentToToken(hCols[0]) : "",
              centerLeft: hCols.length >= 4 ? contentToToken(hCols[1] || { content: "empty" }) : undefined,
              center: hCols.length === 3 ? contentToToken(hCols[1] || { content: "empty" }) : hCols.length === 5 ? contentToToken(hCols[2] || { content: "empty" }) : contentToToken(hCols[1] || { content: "empty" }),
              centerRight: hCols.length >= 4 ? contentToToken(hCols[hCols.length - 2] || { content: "empty" }) : undefined,
              right: hCols[hCols.length - 1] ? contentToToken(hCols[hCols.length - 1]) : "",
            };
            await generateSchedulePdf({
              scheduleName: schedule.schedule.name,
              projectStartDate: new Date(schedule.schedule.projectStartDate),
              dataDate: schedule.schedule.dataDate ? new Date(schedule.schedule.dataDate) : null,
              lastCalculatedAt: schedule.schedule.lastCalculatedAt ? new Date(schedule.schedule.lastCalculatedAt) : null,
              activities: config.criticalPathOnly ? filteredActivities.filter(a => a.isCritical) : filteredActivities,
              relationships,
              columns: visibleColumns,
              companyName: pdfCompanyName,
              projectName: pdfProjectName,
              footerText: "",
              footerConfig,
              headerConfig,
              pageSize: config.pageSize ?? "tabloid",
              orientation: config.orientation ?? "landscape",
              showGantt: config.showGantt ?? true,
              showTable: config.showTable ?? false,
              showCriticalPathOnly: config.criticalPathOnly ?? false,
              showLogicLines: config.showLogicLines ?? false,
              headerBgColor: config.headerBgColor,
              headerAccentColor: config.headerAccentColor,
              headerTextColor: config.headerTextColor,
              groupedActivities: groupBy === "wbs" ? groupedActivities.filter(g => g.group !== null).map(g => ({
                group: g.group,
                activities: g.activities.map((a: any) => ({
                  activityId: a.activityId,
                  name: a.name,
                  duration: a.duration,
                  earlyStart: a.earlyStart,
                  earlyFinish: a.earlyFinish,
                  lateStart: a.lateStart,
                  lateFinish: a.lateFinish,
                  totalFloat: a.totalFloat,
                  freeFloat: a.freeFloat,
                  isCritical: a.isCritical,
                  percentComplete: a.percentComplete,
                  wbs: a.wbs,
                  activityType: a.activityType,
                  barColor: a.barColor,
                })),
                depth: g.depth ?? 0,
                wbsColor: g.wbsColor,
                wbsTextColor: g.wbsTextColor,
              })) : undefined,
            });
            toast.success("PDF exported successfully");
            setShowPdfExport(false);
          } catch (err) {
            toast.error("Failed to generate PDF");
            console.error(err);
          } finally {
            setPdfExporting(false);
          }
        }}
      />

      {/* ── Floating Selection Toolbar ──────────────────────────────────────── */}
      {selectedActivityIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a1f2e] border border-white/15 rounded-lg shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-400">
            {selectedActivityIds.size} {selectedActivityIds.size === 1 ? "activity" : "activities"} selected
          </span>
          <div className="w-px h-5 bg-gray-200" />
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            onClick={() => { setBulkWbsTarget(""); setShowBulkWbsDialog(true); }}
          >
            <FolderTree className="w-3.5 h-3.5 mr-1.5" /> Assign WBS
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-red-500/40 text-red-400 hover:bg-red-500/10"
            onClick={() => {
              if (scheduleId && confirm(`Delete ${selectedActivityIds.size} selected activities?`)) {
                Array.from(selectedActivityIds).forEach(id => deleteActivityMut.mutate({ id, scheduleId }));
                setSelectedActivityIds(new Set());
              }
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-gray-400"
            onClick={() => setSelectedActivityIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {/* ── Bulk WBS Assignment Dialog ─────────────────────────────────────── */}
      <Dialog open={showBulkWbsDialog} onOpenChange={setShowBulkWbsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Assign WBS to {selectedActivityIds.size} Activities</DialogTitle>
            <DialogDescription className="text-gray-600">
              Select a WBS code to assign to all selected activities at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Select value={bulkWbsTarget || "__none__"} onValueChange={(v) => setBulkWbsTarget(v === "__none__" ? "" : v)}>
              <SelectTrigger className="border-white/15"><SelectValue placeholder="Select WBS" /></SelectTrigger>
              <SelectContent className="">
                <SelectItem value="__none__" className="">None (remove WBS)</SelectItem>
                {wbsNodes.map((w: any) => (
                  <SelectItem key={w.id} value={w.code} className="">{w.code} — {w.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkWbsDialog(false)} className="border-white/15">Cancel</Button>
            <Button
              className="bg-amber-500 text-gray-950 hover:bg-amber-400 font-semibold"
              onClick={() => {
                if (!scheduleId) return;
                const wbsValue = bulkWbsTarget || null;
                Array.from(selectedActivityIds).forEach(id => {
                  updateActivityMut.mutate({ id, scheduleId, wbs: wbsValue });
                });
                toast.success(`WBS ${wbsValue ? `set to ${wbsValue}` : "cleared"} for ${selectedActivityIds.size} activities`);
                setSelectedActivityIds(new Set());
                setShowBulkWbsDialog(false);
              }}
            >
              Assign to {selectedActivityIds.size} Activities
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resource & Cost Loading Panel */}
      {scheduleId && (
        <ResourcePanel
          scheduleId={scheduleId}
          activities={activities.map((a: any) => ({ id: a.id, activityId: a.activityId, name: a.name }))}
          open={showResourcePanel}
          onOpenChange={setShowResourcePanel}
        />
      )}
    </div>
  );
}
