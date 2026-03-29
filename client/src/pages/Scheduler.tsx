import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useMember } from "@/hooks/useMember";
import GanttChart from "@/components/GanttChart";
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
  Filter, Layers, Target, Calendar, Settings, Download, FileDown,
  Loader2, ChevronLeft, ChevronDown, ChevronUp, ArrowUpDown,
  AlertTriangle, CheckCircle2, Search, FolderTree, Palette, Eye, EyeOff,
} from "lucide-react";

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
    renderClass: (a) => a.isCritical ? "text-red-600 font-semibold" : "text-foreground",
  },
  {
    key: "name", label: "Activity Name", shortLabel: "Name", align: "left", width: "1fr",
    editable: true, alwaysVisible: true, sortable: true,
    getSortValue: (a) => a.name,
    render: (a) => a.name,
    renderClass: (a) => a.isCritical ? "text-red-600 font-medium" : "text-foreground",
  },
  {
    key: "duration", label: "Duration", shortLabel: "Dur", align: "center", width: "50px",
    editable: true, sortable: true,
    getSortValue: (a) => a.duration,
    render: (a) => `${a.duration}d`,
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "percentComplete", label: "% Complete", shortLabel: "%", align: "center", width: "45px",
    editable: true, sortable: true,
    getSortValue: (a) => parseFloat(a.percentComplete) || 0,
    render: (a) => `${Math.round(parseFloat(a.percentComplete) || 0)}%`,
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "earlyStart", label: "Early Start", shortLabel: "ES", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.earlyStart ? new Date(a.earlyStart).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.earlyStart)),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "earlyFinish", label: "Early Finish", shortLabel: "EF", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.earlyFinish ? new Date(a.earlyFinish).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.earlyFinish)),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "lateStart", label: "Late Start", shortLabel: "LS", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.lateStart ? new Date(a.lateStart).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.lateStart)),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "lateFinish", label: "Late Finish", shortLabel: "LF", align: "center", width: "80px",
    sortable: true,
    getSortValue: (a) => a.lateFinish ? new Date(a.lateFinish).getTime() : 0,
    render: (a) => formatDate(parseDateSafe(a.lateFinish)),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "totalFloat", label: "Total Float", shortLabel: "TF", align: "center", width: "45px",
    sortable: true,
    getSortValue: (a) => a.totalFloat ?? 999,
    render: (a) => a.totalFloat != null ? `${a.totalFloat}d` : "—",
    renderClass: (a) => {
      const tf = a.totalFloat;
      if (tf == null) return "text-muted-foreground";
      if (tf <= 0) return "text-red-600 font-semibold";
      if (tf <= 5) return "text-amber-600 font-medium";
      return "text-emerald-600";
    },
  },
  {
    key: "freeFloat", label: "Free Float", shortLabel: "FF", align: "center", width: "45px",
    sortable: true,
    getSortValue: (a) => a.freeFloat ?? 999,
    render: (a) => a.freeFloat != null ? `${a.freeFloat}d` : "—",
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "wbs", label: "WBS", shortLabel: "WBS", align: "left", width: "70px",
    editable: true, sortable: true,
    getSortValue: (a) => a.wbs || "",
    render: (a) => a.wbs || "—",
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "calendar", label: "Calendar", shortLabel: "Cal", align: "left", width: "70px",
    sortable: false,
    render: (a, ctx) => {
      if (!a.calendarId) return ctx.defaultCalName || "Default";
      const cal = ctx.calendars?.find((c: any) => c.id === a.calendarId);
      return cal ? cal.name : "—";
    },
    renderClass: () => "text-muted-foreground",
  },
  // Target 1 variance columns
  {
    key: "bl1Start", label: "BL Start", shortLabel: "BL1 ES", align: "center", width: "80px",
    requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      return t ? formatDate(parseDateSafe(t.earlyStart)) : "—";
    },
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "bl1Finish", label: "BL Finish", shortLabel: "BL1 EF", align: "center", width: "80px",
    requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.target1Map?.get(a.id);
      return t ? formatDate(parseDateSafe(t.earlyFinish)) : "—";
    },
    renderClass: () => "text-muted-foreground",
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
      if (!t || !a.earlyStart || !t.earlyStart) return "text-muted-foreground";
      const diff = Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-600 font-semibold";
      return "text-muted-foreground";
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
      if (!t || !a.earlyFinish || !t.earlyFinish) return "text-muted-foreground";
      const diff = Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-600 font-semibold";
      return "text-muted-foreground";
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
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "bl2Finish", label: "BL2 Finish", shortLabel: "BL2 EF", align: "center", width: "80px",
    requiresTarget: 2,
    render: (a, ctx) => {
      const t = ctx.target2Map?.get(a.id);
      return t ? formatDate(parseDateSafe(t.earlyFinish)) : "—";
    },
    renderClass: () => "text-muted-foreground",
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
      if (!t || !a.earlyStart || !t.earlyStart) return "text-muted-foreground";
      const diff = Math.round((new Date(a.earlyStart).getTime() - new Date(t.earlyStart).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-600 font-semibold";
      return "text-muted-foreground";
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
      if (!t || !a.earlyFinish || !t.earlyFinish) return "text-muted-foreground";
      const diff = Math.round((new Date(a.earlyFinish).getTime() - new Date(t.earlyFinish).getTime()) / 86400000);
      if (diff > 0) return "text-red-600 font-semibold";
      if (diff < 0) return "text-emerald-600 font-semibold";
      return "text-muted-foreground";
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

  /* ── Data Queries ─────────────────────────────────────────────────────── */
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
  const [zoom, setZoom] = useState<"day" | "week" | "month">("week");
  const [showArrows, setShowArrows] = useState(true);
  const [showDataDateLine, setShowDataDateLine] = useState(true);
  const [showTodayLine, setShowTodayLine] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<string | null>(null);
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

  /* ── Dialog State ─────────────────────────────────────────────────────── */
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

  /* ── Form State ───────────────────────────────────────────────────────── */
  const [newActName, setNewActName] = useState("");
  const [newActDuration, setNewActDuration] = useState("5");
  const [newActWbs, setNewActWbs] = useState("");
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

  /* ── PDF State ────────────────────────────────────────────────────────── */
  const [pdfCompanyName, setPdfCompanyName] = useState("");
  const [pdfProjectName, setPdfProjectName] = useState("");
  const [pdfFooterText, setPdfFooterText] = useState("");
  const [pdfPageSize, setPdfPageSize] = useState<"letter" | "legal" | "tabloid">("tabloid");
  const [pdfOrientation, setPdfOrientation] = useState<"landscape" | "portrait">("landscape");
  const [pdfShowGantt, setPdfShowGantt] = useState(true);
  const [pdfCriticalOnly, setPdfCriticalOnly] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  /* ── Advanced Filter State ────────────────────────────────────────────── */
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
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
  }, [activities, searchQuery, activeFilters, codeAssignments, filterCriticalOnly, filterLookahead, dataDate, filterFloatMin, filterFloatMax, filterDateStart, filterDateEnd, filterOpenEnds, openEnds]);

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
    if (!groupBy) return [{ group: null, activities: sortedActivities }];
    const groups = new Map<string, any[]>();
    for (const act of sortedActivities) {
      let key = "Ungrouped";
      if (groupBy === "wbs") {
        key = act.wbs || "No WBS";
      } else if (groupBy === "critical") {
        key = act.isCritical ? "Critical Path" : "Non-Critical";
      } else {
        // Group by activity code category
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
    return Array.from(groups.entries()).map(([group, acts]) => ({ group, activities: acts }));
  }, [sortedActivities, groupBy, codeAssignments, codeCategories]);

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
    return "32px " + activeColumns.map((c) => c.width).join(" ");
  }, [activeColumns]);

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
    onSuccess: () => { utils.schedule.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteActivityMut = trpc.schedule.deleteActivity.useMutation({
    onSuccess: () => { utils.schedule.get.invalidate(); toast.success("Activity deleted"); },
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
    onSuccess: () => { utils.schedule.get.invalidate(); },
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

  /* ── Handlers ─────────────────────────────────────────────────────────── */
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
    setDetailWbs(act.wbs || "");
    setDetailCalendarId(act.calendarId ? String(act.calendarId) : "");
    setDetailBarColor(act.barColor || "");
    setDetailPercentComplete(String(parseFloat(act.percentComplete) || 0));
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
      wbs: detailWbs || undefined,
      calendarId: detailCalendarId ? parseInt(detailCalendarId) : undefined,
      barColor: detailBarColor || null,
      percentComplete: Math.min(100, Math.max(0, parseFloat(detailPercentComplete) || 0)),
    });
    setShowActivityDetailModal(false);
    toast.success("Activity updated");
  }, [detailAct, scheduleId, detailName, detailDuration, detailActivityId, detailWbs, detailCalendarId, detailBarColor, detailPercentComplete, updateActivityMut]);

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
  if (!scheduleId) return <div className="h-screen flex items-center justify-center bg-white text-gray-900">Invalid schedule ID</div>;
  if (scheduleQuery.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading schedule...</p>
        </div>
      </div>
    );
  }
  if (!schedule) return <div className="h-screen flex items-center justify-center bg-white text-gray-900">Schedule not found</div>;

  const hasActiveFilters = filterCriticalOnly || filterLookahead !== "none" || filterFloatMin || filterFloatMax || filterDateStart || filterDateEnd || filterOpenEnds || activeFilters.size > 0;

  /* ── Render ───────────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900">
      {/* ── Top Toolbar ──────────────────────────────────────────────────── */}
      <div className="h-11 border-b border-gray-200 bg-white flex items-center px-3 gap-1.5 shrink-0">
        {/* Left: Back + Title */}
        <button onClick={() => window.close()} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{schedule.schedule.name}</h1>
        <div className="w-px h-5 bg-gray-200 mx-1" />

        {/* Calculate */}
        <Button
          size="sm" variant="outline"
          className="h-7 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100"
          onClick={() => scheduleId && recalcMut.mutate({ scheduleId })}
          disabled={recalcMut.isPending}
        >
          {recalcMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Calculate
        </Button>

        {/* Data Date */}
        <Button
          size="sm" variant="outline"
          className="h-7 text-xs gap-1.5 border-gray-300 text-gray-700 hover:bg-gray-100"
          onClick={() => { setDataDateInput(dataDate ? dataDate.toISOString().split("T")[0] : ""); setShowDataDatePicker(true); }}
        >
          <Calendar className="w-3.5 h-3.5" />
          DD: {dataDate ? formatDate(dataDate) : "Not set"}
        </Button>

        {/* Zoom */}
        <div className="flex items-center border border-gray-300 rounded-md h-7 overflow-hidden">
          {(["day", "week", "month"] as const).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2 text-xs h-full transition-colors ${zoom === z ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Search */}
        {showSearch && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID or name..."
              className="h-7 text-xs pl-7 w-48 border-gray-300"
              autoFocus
              onBlur={() => { if (!searchQuery) setShowSearch(false); }}
            />
          </div>
        )}
        <Button
          size="sm" variant="ghost"
          className={`h-7 w-7 p-0 ${searchQuery ? "text-blue-600" : "text-gray-500"}`}
          onClick={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(""); }}
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* Toggle Buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            size="sm" variant="ghost"
            className={`h-7 w-7 p-0 ${showArrows ? "text-blue-600" : "text-gray-400"}`}
            onClick={() => setShowArrows(!showArrows)}
            title="Toggle dependency arrows"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 8h10M9 5l3 3-3 3" />
            </svg>
          </Button>
          <Button
            size="sm" variant="ghost"
            className={`h-7 w-7 p-0 ${showDataDateLine ? "text-blue-600" : "text-gray-400"}`}
            onClick={() => setShowDataDateLine(!showDataDateLine)}
            title="Toggle data date line"
          >
            <div className="w-4 h-4 flex items-center justify-center text-[9px] font-bold">DD</div>
          </Button>
          <Button
            size="sm" variant="ghost"
            className={`h-7 w-7 p-0 ${showTodayLine ? "text-blue-600" : "text-gray-400"}`}
            onClick={() => setShowTodayLine(!showTodayLine)}
            title="Toggle today line"
          >
            <div className="w-4 h-4 flex items-center justify-center text-[9px] font-bold">TD</div>
          </Button>
        </div>

        <div className="w-px h-5 bg-gray-200 mx-0.5" />

        {/* Columns */}
        <Button
          size="sm" variant="ghost"
          className="h-7 text-xs gap-1 text-gray-600 hover:bg-gray-100"
          onClick={() => setShowColumnPicker(true)}
        >
          <Columns3 className="w-3.5 h-3.5" /> Columns
        </Button>

        {/* Filter */}
        <Button
          size="sm" variant="ghost"
          className={`h-7 text-xs gap-1 ${hasActiveFilters ? "text-blue-600" : "text-gray-600"} hover:bg-gray-100`}
          onClick={() => setShowAdvancedFilter(true)}
        >
          <Filter className="w-3.5 h-3.5" /> Filter
          {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
        </Button>

        {/* Group By */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-gray-600 hover:bg-gray-100">
              <Layers className="w-3.5 h-3.5" /> Group
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-gray-200">
            <DropdownMenuItem onClick={() => setGroupBy(null)}>
              <span className={!groupBy ? "font-semibold text-blue-600" : ""}>None</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy("wbs")}>
              <span className={groupBy === "wbs" ? "font-semibold text-blue-600" : ""}>WBS</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setGroupBy("critical")}>
              <span className={groupBy === "critical" ? "font-semibold text-blue-600" : ""}>Critical Path</span>
            </DropdownMenuItem>
            {codeCategories.map((cat: any) => (
              <DropdownMenuItem key={cat.id} onClick={() => setGroupBy(String(cat.id))}>
                <span className={groupBy === String(cat.id) ? "font-semibold text-blue-600" : ""}>{cat.name}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-gray-600 hover:bg-gray-100">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white border-gray-200 w-56">
            <DropdownMenuItem onClick={() => setShowActivityDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowRelationshipDialog(true)}>
              <svg viewBox="0 0 16 16" className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 8h10M9 5l3 3-3 3" /></svg>
              Add Relationship
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
              <DropdownMenuSubContent className="bg-white border-gray-200">
                <DropdownMenuItem onClick={() => setTarget1Id(null)}>
                  <span className={!target1Id ? "font-semibold text-blue-600" : ""}>None</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {baselines.map((b: any) => (
                  <DropdownMenuItem key={b.id} onClick={() => setTarget1Id(b.id)}>
                    <span className={target1Id === b.id ? "font-semibold text-blue-600" : ""}>
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
              <DropdownMenuSubContent className="bg-white border-gray-200">
                <DropdownMenuItem onClick={() => setTarget2Id(null)}>
                  <span className={!target2Id ? "font-semibold text-blue-600" : ""}>None</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {baselines.map((b: any) => (
                  <DropdownMenuItem key={b.id} onClick={() => setTarget2Id(b.id)}>
                    <span className={target2Id === b.id ? "font-semibold text-blue-600" : ""}>
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
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setPdfProjectName(schedule?.schedule?.name || ""); setShowPdfExport(true); }}>
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Target indicators bar ──────────────────────────────────────────── */}
      {(target1Id || target2Id) && (
        <div className="h-7 border-b border-gray-200 bg-blue-50 flex items-center px-3 gap-4 text-xs shrink-0">
          {target1Id && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-gray-400" />
              <span className="text-gray-500">Target 1:</span>
              <span className="text-gray-900 font-medium">{target1Query.data ? baselines.find((b: any) => b.id === target1Id)?.name || "Loaded" : "Loading..."}</span>
              <button onClick={() => setTarget1Id(null)} className="text-gray-400 hover:text-red-500 ml-1">&times;</button>
            </div>
          )}
          {target2Id && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-violet-400" />
              <span className="text-gray-500">Target 2:</span>
              <span className="text-gray-900 font-medium">{target2Query.data ? baselines.find((b: any) => b.id === target2Id)?.name || "Loaded" : "Loading..."}</span>
              <button onClick={() => setTarget2Id(null)} className="text-gray-400 hover:text-red-500 ml-1">&times;</button>
            </div>
          )}
        </div>
      )}

      {/* ── Activity Code Filter Bar ───────────────────────────────────────── */}
      {showFilterPanel && codeCategories.length > 0 && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 flex items-center gap-4 overflow-x-auto shrink-0">
          {codeCategories.map((cat: any) => (
            <div key={cat.id} className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-gray-500 font-medium">{cat.name}:</span>
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
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${isActive ? "bg-blue-100 border-blue-400 text-blue-700" : "border-gray-300 text-gray-500 hover:border-gray-400"}`}
                    >
                      {val.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {activeFilters.size > 0 && (
            <button onClick={() => setActiveFilters(new Map())} className="text-xs text-red-500 hover:underline shrink-0">Clear All</button>
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
                className="text-xs font-medium text-gray-500 h-8 items-center px-2 gap-1"
                style={{ display: "grid", gridTemplateColumns: gridTemplate }}
              >
                <div></div>
                {activeColumns.map((col) => {
                  const isSorted = sortState.key === col.key;
                  return (
                    <div
                      key={col.key}
                      className={`text-${col.align} truncate flex items-center gap-0.5 ${col.sortable ? "cursor-pointer hover:text-gray-700 select-none" : ""}`}
                      title={col.label}
                      onClick={col.sortable ? () => handleColumnSort(col.key) : undefined}
                    >
                      <span className="truncate">{col.shortLabel}</span>
                      {col.sortable && (
                        <span className="shrink-0">
                          {isSorted && sortState.dir === "asc" && <ChevronUp className="w-3 h-3 text-blue-600" />}
                          {isSorted && sortState.dir === "desc" && <ChevronDown className="w-3 h-3 text-blue-600" />}
                          {!isSorted && <ArrowUpDown className="w-3 h-3 text-gray-300" />}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-100">
              {groupedActivities.map(({ group, activities: groupActs }) => (
                <div key={group || "all"}>
                  {group && (
                    <div className="px-3 py-1.5 bg-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      {group}
                    </div>
                  )}
                  {groupActs.map((act) => {
                    const isOpenStart = openEnds.openStarts.some((a) => a.id === act.id);
                    const isOpenFinish = openEnds.openFinishes.some((a) => a.id === act.id);
                    const hasOpenEnd = isOpenStart || isOpenFinish;
                    return (
                      <div
                        key={act.id}
                        className={`text-xs items-center px-2 gap-1 h-8 cursor-pointer transition-colors ${
                          act.id === selectedActivityId
                            ? "bg-blue-100 border-l-2 border-l-blue-600 ring-1 ring-blue-300"
                            : act.isCritical
                            ? "hover:bg-red-50/50 border-l-2 border-l-red-400"
                            : hasOpenEnd
                            ? "hover:bg-amber-50/50 border-l-2 border-l-amber-400"
                            : "hover:bg-gray-50 border-l-2 border-l-transparent"
                        }`}
                        style={{ display: "grid", gridTemplateColumns: gridTemplate }}
                        onClick={() => openActivityDetail(act)}
                        title="Click to edit activity details"
                      >
                        {/* Row actions */}
                        <div className="flex items-center gap-0.5">
                          {hasOpenEnd && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                          {!hasOpenEnd && <GripVertical className="w-3 h-3 text-gray-300" />}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-0.5 rounded hover:bg-gray-100 text-gray-400" onClick={(e) => e.stopPropagation()} title="More options">
                                <MoreHorizontal className="w-3 h-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="bg-white border-gray-200 text-foreground">
                              <DropdownMenuItem onClick={() => openActivityDetail(act)} className="text-foreground">
                                <Settings className="w-3.5 h-3.5 mr-2" /> Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                if (scheduleId) addActivityMut.mutate({ scheduleId, name: "New Activity", duration: 5, afterActivityId: act.id });
                              }} className="text-foreground">
                                <Plus className="w-3.5 h-3.5 mr-2" /> Insert Below
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { if (scheduleId && confirm("Delete this activity?")) deleteActivityMut.mutate({ id: act.id, scheduleId }); }}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Dynamic columns */}
                        {activeColumns.map((col) => {
                          const isEditing = editingCell?.activityId === act.id && editingCell?.field === col.key;
                          const cellClass = col.renderClass ? col.renderClass(act, renderCtx) : "text-gray-500";

                          if (isEditing && col.editable) {
                            return (
                              <div key={col.key} className={`text-${col.align}`} onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={commitEdit}
                                  onKeyDown={handleEditKeyDown}
                                  autoFocus
                                  className="h-6 text-xs px-1 py-0 border-blue-400"
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
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Activity
              </button>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right: Gantt Chart */}
        <ResizablePanel defaultSize={55} minSize={30}>
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
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── DIALOGS ──────────────────────────────────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Column Picker Sheet ─────────────────────────────────────────────── */}
      <Sheet open={showColumnPicker} onOpenChange={setShowColumnPicker}>
        <SheetContent side="right" className="bg-white border-gray-200 w-80">
          <SheetHeader>
            <SheetTitle className="font-semibold text-gray-900">Configure Columns</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1">
            {ALL_COLUMNS.map((col) => {
              const isTargetCol = col.requiresTarget === 1 || col.requiresTarget === 2;
              const targetActive = col.requiresTarget === 1 ? !!target1Id : col.requiresTarget === 2 ? !!target2Id : true;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors ${
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
                    <div className="text-sm text-gray-900">{col.label}</div>
                    {isTargetCol && (
                      <div className="text-[10px] text-gray-400">
                        Requires Target {col.requiresTarget} active
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              variant="outline" size="sm" className="w-full text-xs border-gray-300"
              onClick={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
            >
              Reset to Default
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Activity Detail Modal ───────────────────────────────────────────── */}
      <Dialog open={showActivityDetailModal} onOpenChange={setShowActivityDetailModal}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Activity Details</DialogTitle>
            <DialogDescription>Edit all properties of this activity.</DialogDescription>
          </DialogHeader>
          {detailAct && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Activity ID</Label>
                  <Input value={detailActivityId} onChange={(e) => setDetailActivityId(e.target.value)} placeholder="e.g., FOUND-010" className="mt-1 border-gray-300" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Duration (days)</Label>
                  <Input type="number" value={detailDuration} onChange={(e) => setDetailDuration(e.target.value)} className="mt-1 border-gray-300" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Activity Name</Label>
                <Input value={detailName} onChange={(e) => setDetailName(e.target.value)} className="mt-1 border-gray-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">WBS Code</Label>
                  {wbsNodes.length > 0 ? (
                    <Select value={detailWbs} onValueChange={setDetailWbs}>
                      <SelectTrigger className="mt-1 border-gray-300"><SelectValue placeholder="Select WBS" /></SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 max-h-60 text-foreground">
                        <SelectItem value=" " className="text-foreground">None</SelectItem>
                        {wbsNodes.map((w: any) => (
                          <SelectItem key={w.id} value={w.code} className="text-foreground">{w.code} — {w.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input value={detailWbs} onChange={(e) => setDetailWbs(e.target.value)} placeholder="e.g., 2.1" className="mt-1 border-gray-300" />
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">% Complete</Label>
                  <Input type="number" value={detailPercentComplete} onChange={(e) => setDetailPercentComplete(e.target.value)} min="0" max="100" className="mt-1 border-gray-300" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-600">Calendar</Label>
                  <Select value={detailCalendarId} onValueChange={setDetailCalendarId}>
                    <SelectTrigger className="mt-1 border-gray-300"><SelectValue placeholder="Default" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-foreground">
                      <SelectItem value=" " className="text-foreground">Default Calendar</SelectItem>
                      {calendars.map((cal: any) => (
                        <SelectItem key={cal.id} value={String(cal.id)} className="text-foreground">{cal.name} ({cal.workWeek === "7day" ? "7-day" : "5-day"})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Bar Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={detailBarColor || "#22c55e"}
                      onChange={(e) => setDetailBarColor(e.target.value)}
                      className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={detailBarColor}
                      onChange={(e) => setDetailBarColor(e.target.value)}
                      placeholder="Auto"
                      className="flex-1 border-gray-300"
                    />
                    {detailBarColor && (
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-gray-400" onClick={() => setDetailBarColor("")}>
                        Reset
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Relationships summary */}
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Relationships</Label>
                <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-md p-2">
                  {relationships.filter((r: any) => r.successorId === detailAct.id).map((r: any) => {
                    const pred = activities.find((a) => a.id === r.predecessorId);
                    return (
                      <div key={r.id} className="flex items-center gap-1">
                        <span className="text-gray-400">Pred:</span>
                        <span className="font-medium text-gray-700">{pred?.activityId || pred?.name || `#${r.predecessorId}`}</span>
                        <span className="text-blue-600 font-mono text-[10px] bg-blue-50 px-1 rounded">{r.relationshipType}</span>
                        {r.lagDays ? <span className="text-gray-400">+{r.lagDays}d</span> : null}
                      </div>
                    );
                  })}
                  {relationships.filter((r: any) => r.predecessorId === detailAct.id).map((r: any) => {
                    const succ = activities.find((a) => a.id === r.successorId);
                    return (
                      <div key={r.id} className="flex items-center gap-1">
                        <span className="text-gray-400">Succ:</span>
                        <span className="font-medium text-gray-700">{succ?.activityId || succ?.name || `#${r.successorId}`}</span>
                        <span className="text-blue-600 font-mono text-[10px] bg-blue-50 px-1 rounded">{r.relationshipType}</span>
                        {r.lagDays ? <span className="text-gray-400">+{r.lagDays}d</span> : null}
                      </div>
                    );
                  })}
                  {relationships.filter((r: any) => r.predecessorId === detailAct.id || r.successorId === detailAct.id).length === 0 && (
                    <span className="text-gray-400 italic">No relationships</span>
                  )}
                </div>
              </div>

              {/* CPM Results (read-only) */}
              <div className="grid grid-cols-4 gap-2 bg-gray-50 rounded-md p-2">
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">ES</div>
                  <div className="text-xs font-medium text-gray-700">{formatDate(parseDateSafe(detailAct.earlyStart))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">EF</div>
                  <div className="text-xs font-medium text-gray-700">{formatDate(parseDateSafe(detailAct.earlyFinish))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">LS</div>
                  <div className="text-xs font-medium text-gray-700">{formatDate(parseDateSafe(detailAct.lateStart))}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">LF</div>
                  <div className="text-xs font-medium text-gray-700">{formatDate(parseDateSafe(detailAct.lateFinish))}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-md p-2">
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">Total Float</div>
                  <div className={`text-xs font-semibold ${detailAct.totalFloat <= 0 ? "text-red-600" : detailAct.totalFloat <= 5 ? "text-amber-600" : "text-emerald-600"}`}>
                    {detailAct.totalFloat != null ? `${detailAct.totalFloat}d` : "—"}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">Free Float</div>
                  <div className="text-xs font-medium text-gray-700">{detailAct.freeFloat != null ? `${detailAct.freeFloat}d` : "—"}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">Critical</div>
                  <div className={`text-xs font-semibold ${detailAct.isCritical ? "text-red-600" : "text-emerald-600"}`}>
                    {detailAct.isCritical ? "Yes" : "No"}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDetailModal(false)} className="border-gray-300">Cancel</Button>
            <Button onClick={saveActivityDetail} className="bg-blue-600 text-white hover:bg-blue-700" disabled={updateActivityMut.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Activity Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Add Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Activity Name</Label>
              <Input value={newActName} onChange={(e) => setNewActName(e.target.value)} placeholder="e.g., Foundation Footings" className="mt-1 border-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Duration (days)</Label>
                <Input type="number" value={newActDuration} onChange={(e) => setNewActDuration(e.target.value)} className="mt-1 border-gray-300" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">WBS (optional)</Label>
                <Input value={newActWbs} onChange={(e) => setNewActWbs(e.target.value)} placeholder="e.g., 2.0" className="mt-1 border-gray-300" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)} className="border-gray-300">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newActName.trim()) {
                  addActivityMut.mutate({ scheduleId, name: newActName.trim(), duration: parseInt(newActDuration) || 5, wbs: newActWbs.trim() || undefined });
                  setNewActName(""); setNewActDuration("5"); setNewActWbs(""); setShowActivityDialog(false);
                }
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!newActName.trim() || addActivityMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Relationship Dialog ─────────────────────────────────────────── */}
      <Dialog open={showRelationshipDialog} onOpenChange={setShowRelationshipDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Add Relationship</DialogTitle>
            <DialogDescription>Define a logic tie between two activities.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-gray-600">Predecessor</Label>
              <Select value={newRelPred} onValueChange={setNewRelPred}>
                <SelectTrigger className="mt-1 border-gray-300"><SelectValue placeholder="Select predecessor" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 max-h-60 text-foreground">
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="text-foreground">{a.activityId || `A${a.id}`} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-600">Successor</Label>
              <Select value={newRelSucc} onValueChange={setNewRelSucc}>
                <SelectTrigger className="mt-1 border-gray-300"><SelectValue placeholder="Select successor" /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 max-h-60 text-foreground">
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="text-foreground">{a.activityId || `A${a.id}`} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Type</Label>
                <Select value={newRelType} onValueChange={setNewRelType}>
                  <SelectTrigger className="mt-1 border-gray-300"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-foreground">
                    <SelectItem value="FS" className="text-foreground">Finish-to-Start (FS)</SelectItem>
                    <SelectItem value="SS" className="text-foreground">Start-to-Start (SS)</SelectItem>
                    <SelectItem value="FF" className="text-foreground">Finish-to-Finish (FF)</SelectItem>
                    <SelectItem value="SF" className="text-foreground">Start-to-Finish (SF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Lag (days)</Label>
                <Input type="number" value={newRelLag} onChange={(e) => setNewRelLag(e.target.value)} className="mt-1 border-gray-300" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelationshipDialog(false)} className="border-gray-300">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newRelPred && newRelSucc) {
                  addRelMut.mutate({ scheduleId, predecessorId: parseInt(newRelPred), successorId: parseInt(newRelSucc), relationshipType: newRelType as any, lagDays: parseInt(newRelLag) || 0 });
                }
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!newRelPred || !newRelSucc || addRelMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Baseline Dialog ────────────────────────────────────────────── */}
      <Dialog open={showBaselineDialog} onOpenChange={setShowBaselineDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Save Baseline</DialogTitle>
            <DialogDescription>Save the current schedule as the original baseline for comparison.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs text-gray-600">Baseline Name</Label>
            <Input value={newBaselineName} onChange={(e) => setNewBaselineName(e.target.value)} placeholder="e.g., Original Baseline" className="mt-1 border-gray-300" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaselineDialog(false)} className="border-gray-300">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newBaselineName.trim()) {
                  saveBaselineMut.mutate({ scheduleId, name: newBaselineName.trim(), snapshotType: "baseline" });
                  setNewBaselineName("");
                }
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!newBaselineName.trim() || saveBaselineMut.isPending}
            >
              Save Baseline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Update Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Save Schedule Update</DialogTitle>
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
              className="mt-1 border-gray-300"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)} className="border-gray-300">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId) {
                  saveUpdateMut.mutate({ scheduleId, notes: updateNotes.trim() || undefined });
                  setUpdateNotes("");
                }
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={saveUpdateMut.isPending}
            >
              Save Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Set Data Date Dialog ────────────────────────────────────────────── */}
      <Dialog open={showDataDatePicker} onOpenChange={setShowDataDatePicker}>
        <DialogContent className="bg-white border-gray-200 max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Set Data Date</DialogTitle>
            <DialogDescription>The data date is the "as-of" date for CPM calculations. It is independent of today's calendar date.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs text-gray-600">Data Date</Label>
            <Input
              type="date"
              value={dataDateInput}
              onChange={(e) => setDataDateInput(e.target.value)}
              className="mt-1 border-gray-300"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDataDatePicker(false)} className="border-gray-300">Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && dataDateInput) {
                  updateScheduleMut.mutate({ id: scheduleId, dataDate: new Date(dataDateInput + "T00:00:00") });
                  setShowDataDatePicker(false);
                }
              }}
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={!dataDateInput || updateScheduleMut.isPending}
            >
              Set Data Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Calendar Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Project Calendars</DialogTitle>
            <DialogDescription>Manage work calendars and holidays.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {calendars.map((cal: any) => (
              <div key={cal.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900">{cal.name}</span>
                  <div className="flex items-center gap-2">
                    {cal.isDefault && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Default</span>}
                    <span className="text-xs text-gray-500">{cal.workWeek === "7day" ? "7-day" : "5-day"}</span>
                  </div>
                </div>
                {cal.exceptions && cal.exceptions.length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    {cal.exceptions.filter((e: any) => e.exceptionType === "holiday").length} holidays configured
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalendarDialog(false)} className="border-gray-300">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Health Dialog ───────────────────────────────────────────── */}
      <Dialog open={showScheduleHealth} onOpenChange={setShowScheduleHealth}>
        <DialogContent className="bg-white border-gray-200 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Schedule Health Check</DialogTitle>
            <DialogDescription>Review schedule integrity and identify issues.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{activities.length}</div>
                <div className="text-xs text-gray-500">Total Activities</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{activities.filter((a) => a.isCritical).length}</div>
                <div className="text-xs text-gray-500">Critical Activities</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{relationships.length}</div>
                <div className="text-xs text-gray-500">Relationships</div>
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
                <span className="text-sm font-medium text-gray-900">Open Ends</span>
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
                        className="text-xs text-gray-700 px-2 py-1 bg-amber-50 rounded cursor-pointer hover:bg-amber-100"
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
                        className="text-xs text-gray-700 px-2 py-1 bg-amber-50 rounded cursor-pointer hover:bg-amber-100"
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
                  <span className="text-sm font-medium text-gray-900">Negative Float</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {activities.filter((a) => (a.totalFloat ?? 0) < 0).map((a) => (
                    <div
                      key={a.id}
                      className="text-xs text-gray-700 px-2 py-1 bg-red-50 rounded cursor-pointer hover:bg-red-100"
                      onClick={() => { setSelectedActivityId(a.id); setShowScheduleHealth(false); }}
                    >
                      <span className="font-mono text-red-700">{a.activityId || `A${a.id}`}</span> — {a.name}
                      <span className="ml-2 text-red-600 font-semibold">{a.totalFloat}d</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleHealth(false)} className="border-gray-300">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Schedule Info Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showScheduleInfo} onOpenChange={setShowScheduleInfo}>
        <DialogContent className="bg-white border-gray-200 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Schedule Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Project Start</span><span className="text-gray-900 font-medium">{formatDate(schedule.schedule.projectStartDate ? new Date(schedule.schedule.projectStartDate) : null)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Data Date</span><span className="text-gray-900 font-medium">{dataDate ? formatDate(dataDate) : "Not set"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Last Calculated (Run Date)</span><span className="text-gray-900 font-medium">{lastCalculatedAt ? lastCalculatedAt.toLocaleString() : "Never"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Activities</span><span className="text-gray-900 font-medium">{activities.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Critical Activities</span><span className="text-red-600 font-medium">{activities.filter((a) => a.isCritical).length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Baselines</span><span className="text-gray-900 font-medium">{baselines.filter((b: any) => b.snapshotType === "baseline").length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Updates</span><span className="text-gray-900 font-medium">{baselines.filter((b: any) => b.snapshotType === "update").length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Relationships</span><span className="text-gray-900 font-medium">{relationships.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Open Starts</span><span className={`font-medium ${openEnds.openStarts.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>{openEnds.openStarts.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Open Finishes</span><span className={`font-medium ${openEnds.openFinishes.length > 0 ? "text-amber-600" : "text-emerald-600"}`}>{openEnds.openFinishes.length}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleInfo(false)} className="border-gray-300">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── WBS Manager Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showWbsManager} onOpenChange={setShowWbsManager}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">WBS Manager</DialogTitle>
            <DialogDescription>Define the Work Breakdown Structure for this schedule.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing WBS nodes */}
            <div className="max-h-60 overflow-y-auto space-y-1">
              {wbsNodes.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">No WBS nodes defined yet.</div>
              )}
              {wbsNodes.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md">
                  <div>
                    <span className="text-xs font-mono text-blue-600">{w.code}</span>
                    <span className="text-xs text-gray-700 ml-2">{w.name}</span>
                    {w.parentId && (
                      <span className="text-[10px] text-gray-400 ml-2">
                        (under {wbsNodes.find((p: any) => p.id === w.parentId)?.code || "?"})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => { if (confirm(`Delete WBS "${w.code}"?`)) deleteWbsMut.mutate({ id: w.id, scheduleId: scheduleId! }); }}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new WBS node */}
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">WBS Code</Label>
                  <Input value={newWbsCode} onChange={(e) => setNewWbsCode(e.target.value)} placeholder="e.g., 2.1" className="mt-1 border-gray-300" />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Name</Label>
                  <Input value={newWbsName} onChange={(e) => setNewWbsName(e.target.value)} placeholder="e.g., Foundation" className="mt-1 border-gray-300" />
                </div>
              </div>
              {wbsNodes.length > 0 && (
                <div>
                  <Label className="text-xs text-gray-600">Parent (optional)</Label>
                  <Select value={newWbsParentId} onValueChange={setNewWbsParentId}>
                    <SelectTrigger className="mt-1 border-gray-300"><SelectValue placeholder="None (top level)" /></SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-foreground">
                      <SelectItem value=" " className="text-foreground">None (top level)</SelectItem>
                      {wbsNodes.map((w: any) => (
                        <SelectItem key={w.id} value={String(w.id)} className="text-foreground">{w.code} — {w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                size="sm"
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWbsManager(false)} className="border-gray-300">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Advanced Filter Dialog ───────────────────────────────────────────── */}
      <Dialog open={showAdvancedFilter} onOpenChange={setShowAdvancedFilter}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Advanced Filters</DialogTitle>
            <DialogDescription>Filter activities by various criteria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={filterCriticalOnly} onCheckedChange={(c) => setFilterCriticalOnly(!!c)} />
                <span className="text-sm text-gray-900">Critical Path Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={filterOpenEnds} onCheckedChange={(c) => setFilterOpenEnds(!!c)} />
                <span className="text-sm text-gray-900">Open Ends Only</span>
              </label>
            </div>

            <div>
              <Label className="text-xs text-gray-600">Lookahead</Label>
              <Select value={filterLookahead} onValueChange={(v) => setFilterLookahead(v as any)}>
                <SelectTrigger className="mt-1 border-gray-300"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-foreground">
                  <SelectItem value="none" className="text-foreground">No lookahead filter</SelectItem>
                  <SelectItem value="1week" className="text-foreground">1-Week Lookahead</SelectItem>
                  <SelectItem value="2week" className="text-foreground">2-Week Lookahead</SelectItem>
                  <SelectItem value="4week" className="text-foreground">4-Week Lookahead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Float Min (days)</Label>
                <Input type="number" value={filterFloatMin} onChange={(e) => setFilterFloatMin(e.target.value)} placeholder="Any" className="mt-1 border-gray-300" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Float Max (days)</Label>
                <Input type="number" value={filterFloatMax} onChange={(e) => setFilterFloatMax(e.target.value)} placeholder="Any" className="mt-1 border-gray-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Start Date From</Label>
                <Input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} className="mt-1 border-gray-300" />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Start Date To</Label>
                <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} className="mt-1 border-gray-300" />
              </div>
            </div>

            {codeCategories.length > 0 && (
              <div>
                <Label className="text-xs text-gray-600 mb-2 block">Activity Codes</Label>
                <Button
                  size="sm" variant="outline"
                  className="text-xs border-gray-300"
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
              className="border-gray-300"
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
            <Button onClick={() => setShowAdvancedFilter(false)} className="bg-blue-600 text-white hover:bg-blue-700">
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Export PDF Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showPdfExport} onOpenChange={setShowPdfExport}>
        <DialogContent className="bg-white border-gray-200 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-semibold text-gray-900">Export to PDF</DialogTitle>
            <DialogDescription>Configure the PDF output with your company branding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-gray-600">Company Name</Label>
              <Input value={pdfCompanyName} onChange={(e) => setPdfCompanyName(e.target.value)} placeholder="Your Company Name" className="mt-1 border-gray-300" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Project Name</Label>
              <Input value={pdfProjectName} onChange={(e) => setPdfProjectName(e.target.value)} placeholder="Project Name" className="mt-1 border-gray-300" />
            </div>
            <div>
              <Label className="text-xs text-gray-600">Footer Text</Label>
              <Input value={pdfFooterText} onChange={(e) => setPdfFooterText(e.target.value)} placeholder="e.g., Confidential — Do Not Distribute" className="mt-1 border-gray-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-600">Page Size</Label>
                <Select value={pdfPageSize} onValueChange={(v) => setPdfPageSize(v as any)}>
                  <SelectTrigger className="mt-1 border-gray-300"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-foreground">
                    <SelectItem value="letter" className="text-foreground">Letter (8.5x11)</SelectItem>
                    <SelectItem value="legal" className="text-foreground">Legal (8.5x14)</SelectItem>
                    <SelectItem value="tabloid" className="text-foreground">Tabloid (11x17)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Orientation</Label>
                <Select value={pdfOrientation} onValueChange={(v) => setPdfOrientation(v as any)}>
                  <SelectTrigger className="mt-1 border-gray-300"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-foreground">
                    <SelectItem value="landscape" className="text-foreground">Landscape</SelectItem>
                    <SelectItem value="portrait" className="text-foreground">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={pdfShowGantt} onCheckedChange={(c) => setPdfShowGantt(!!c)} />
                <span className="text-sm text-gray-900">Include Gantt Chart</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={pdfCriticalOnly} onCheckedChange={(c) => setPdfCriticalOnly(!!c)} />
                <span className="text-sm text-gray-900">Critical Path Only</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfExport(false)} className="border-gray-300">Cancel</Button>
            <Button
              onClick={async () => {
                if (!schedule) return;
                setPdfExporting(true);
                try {
                  await generateSchedulePdf({
                    scheduleName: schedule.schedule.name,
                    projectStartDate: new Date(schedule.schedule.projectStartDate),
                    dataDate: schedule.schedule.dataDate ? new Date(schedule.schedule.dataDate) : null,
                    lastCalculatedAt: schedule.schedule.lastCalculatedAt ? new Date(schedule.schedule.lastCalculatedAt) : null,
                    activities: filteredActivities,
                    relationships,
                    columns: visibleColumns,
                    companyName: pdfCompanyName,
                    projectName: pdfProjectName,
                    footerText: pdfFooterText,
                    pageSize: pdfPageSize,
                    orientation: pdfOrientation,
                    showGantt: pdfShowGantt,
                    showCriticalPathOnly: pdfCriticalOnly,
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
              className="bg-blue-600 text-white hover:bg-blue-700"
              disabled={pdfExporting}
            >
              {pdfExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              Export PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
