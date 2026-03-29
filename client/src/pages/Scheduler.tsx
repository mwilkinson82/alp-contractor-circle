/**
 * Scheduler — Full-screen standalone CPM scheduling application.
 * Split-pane: Configurable activity table on the left, Gantt chart on the right.
 * Features: toggleable arrows/date lines, data date, targeting, variance columns,
 * configurable columns, save baseline/update, recalculate (F9).
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useMember } from "@/hooks/useMember";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Plus, Trash2, Save, Download, Settings, ChevronLeft,
  ZoomIn, ZoomOut, Filter, Layers, Calendar, Link2, MoreHorizontal,
  GripVertical, AlertTriangle, Play, Eye, EyeOff, Columns3, Target,
  Clock, ArrowUpDown, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import GanttChart from "@/components/GanttChart";
import { generateSchedulePdf } from "@/lib/schedulePdf";

type ZoomLevel = "day" | "week" | "month";

interface ActivityRow {
  id: number;
  activityId: string;
  name: string;
  duration: number;
  wbs: string | null;
  earlyStart: Date | null;
  earlyFinish: Date | null;
  lateStart: Date | null;
  lateFinish: Date | null;
  totalFloat: number | null;
  freeFloat: number | null;
  isCritical: boolean;
  percentComplete: string;
  calendarId: number | null;
  sortOrder: number;
  notes: string | null;
  actualStart: Date | null;
  actualFinish: Date | null;
}

// ─── Column Definitions ─────────────────────────────────────────────────────

interface ColumnDef {
  key: string;
  label: string;
  shortLabel: string;
  width: number;
  align: "left" | "center" | "right";
  alwaysVisible?: boolean;
  requiresTarget?: 1 | 2;
  render: (act: ActivityRow, ctx: RenderContext) => string;
  renderClass?: (act: ActivityRow, ctx: RenderContext) => string;
  editable?: boolean;
}

interface RenderContext {
  formatDate: (d: Date | null) => string;
  t1Map: Map<number, any>;
  t2Map: Map<number, any>;
  calendarMap: Map<number, string>;
}

function varianceDays(currentDate: Date | null, targetDate: string | Date | null): number | null {
  if (!currentDate || !targetDate) return null;
  const td = targetDate instanceof Date ? targetDate : new Date(targetDate);
  return Math.round((currentDate.getTime() - td.getTime()) / (1000 * 60 * 60 * 24));
}

const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "activityId", label: "Activity ID", shortLabel: "ID", width: 60,
    align: "left", alwaysVisible: true,
    render: (a) => a.activityId,
    renderClass: (a) => a.isCritical ? "text-destructive font-semibold font-mono" : "text-muted-foreground font-mono",
  },
  {
    key: "name", label: "Activity Name", shortLabel: "Name", width: 180,
    align: "left", alwaysVisible: true, editable: true,
    render: (a) => a.name,
    renderClass: (a) => a.isCritical ? "text-destructive font-medium" : "text-foreground",
  },
  {
    key: "duration", label: "Duration", shortLabel: "Dur", width: 55,
    align: "center", editable: true,
    render: (a) => `${a.duration}d`,
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "percentComplete", label: "% Complete", shortLabel: "%", width: 50,
    align: "center", editable: true,
    render: (a) => `${parseFloat(a.percentComplete) || 0}%`,
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "earlyStart", label: "Early Start", shortLabel: "ES", width: 85,
    align: "center",
    render: (a, ctx) => ctx.formatDate(a.earlyStart),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "earlyFinish", label: "Early Finish", shortLabel: "EF", width: 85,
    align: "center",
    render: (a, ctx) => ctx.formatDate(a.earlyFinish),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "lateStart", label: "Late Start", shortLabel: "LS", width: 85,
    align: "center",
    render: (a, ctx) => ctx.formatDate(a.lateStart),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "lateFinish", label: "Late Finish", shortLabel: "LF", width: 85,
    align: "center",
    render: (a, ctx) => ctx.formatDate(a.lateFinish),
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "totalFloat", label: "Total Float", shortLabel: "TF", width: 50,
    align: "center",
    render: (a) => a.totalFloat !== null ? String(a.totalFloat) : "—",
    renderClass: (a) =>
      a.totalFloat === 0 || a.isCritical ? "text-destructive font-semibold font-mono"
      : a.totalFloat !== null && a.totalFloat <= 5 ? "text-yellow-500 font-mono"
      : "text-muted-foreground font-mono",
  },
  {
    key: "freeFloat", label: "Free Float", shortLabel: "FF", width: 50,
    align: "center",
    render: (a) => a.freeFloat !== null ? String(a.freeFloat) : "—",
    renderClass: () => "text-muted-foreground font-mono",
  },
  {
    key: "wbs", label: "WBS", shortLabel: "WBS", width: 70,
    align: "left",
    render: (a) => a.wbs || "—",
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "calendar", label: "Calendar", shortLabel: "Cal", width: 90,
    align: "left",
    render: (a, ctx) => a.calendarId ? (ctx.calendarMap.get(a.calendarId) || "—") : "Default",
    renderClass: () => "text-muted-foreground",
  },
  // ── Target 1 variance columns ──
  {
    key: "t1Start", label: "BL Start", shortLabel: "BL ES", width: 85,
    align: "center", requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.t1Map.get(a.id);
      return t?.earlyStart ? ctx.formatDate(new Date(t.earlyStart)) : "—";
    },
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "t1Finish", label: "BL Finish", shortLabel: "BL EF", width: 85,
    align: "center", requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.t1Map.get(a.id);
      return t?.earlyFinish ? ctx.formatDate(new Date(t.earlyFinish)) : "—";
    },
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "t1StartVar", label: "Start Variance", shortLabel: "SV1", width: 55,
    align: "center", requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.t1Map.get(a.id);
      const v = varianceDays(a.earlyStart, t?.earlyStart);
      return v !== null ? (v > 0 ? `+${v}` : String(v)) : "—";
    },
    renderClass: (a, ctx) => {
      const t = ctx.t1Map.get(a.id);
      const v = varianceDays(a.earlyStart, t?.earlyStart);
      if (v === null) return "text-muted-foreground font-mono";
      return v > 0 ? "text-destructive font-semibold font-mono" : v < 0 ? "text-green-500 font-semibold font-mono" : "text-muted-foreground font-mono";
    },
  },
  {
    key: "t1FinishVar", label: "Finish Variance", shortLabel: "FV1", width: 55,
    align: "center", requiresTarget: 1,
    render: (a, ctx) => {
      const t = ctx.t1Map.get(a.id);
      const v = varianceDays(a.earlyFinish, t?.earlyFinish);
      return v !== null ? (v > 0 ? `+${v}` : String(v)) : "—";
    },
    renderClass: (a, ctx) => {
      const t = ctx.t1Map.get(a.id);
      const v = varianceDays(a.earlyFinish, t?.earlyFinish);
      if (v === null) return "text-muted-foreground font-mono";
      return v > 0 ? "text-destructive font-semibold font-mono" : v < 0 ? "text-green-500 font-semibold font-mono" : "text-muted-foreground font-mono";
    },
  },
  // ── Target 2 variance columns ──
  {
    key: "t2Start", label: "Target 2 Start", shortLabel: "T2 ES", width: 85,
    align: "center", requiresTarget: 2,
    render: (a, ctx) => {
      const t = ctx.t2Map.get(a.id);
      return t?.earlyStart ? ctx.formatDate(new Date(t.earlyStart)) : "—";
    },
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "t2Finish", label: "Target 2 Finish", shortLabel: "T2 EF", width: 85,
    align: "center", requiresTarget: 2,
    render: (a, ctx) => {
      const t = ctx.t2Map.get(a.id);
      return t?.earlyFinish ? ctx.formatDate(new Date(t.earlyFinish)) : "—";
    },
    renderClass: () => "text-muted-foreground",
  },
  {
    key: "t2StartVar", label: "Start Var 2", shortLabel: "SV2", width: 55,
    align: "center", requiresTarget: 2,
    render: (a, ctx) => {
      const t = ctx.t2Map.get(a.id);
      const v = varianceDays(a.earlyStart, t?.earlyStart);
      return v !== null ? (v > 0 ? `+${v}` : String(v)) : "—";
    },
    renderClass: (a, ctx) => {
      const t = ctx.t2Map.get(a.id);
      const v = varianceDays(a.earlyStart, t?.earlyStart);
      if (v === null) return "text-muted-foreground font-mono";
      return v > 0 ? "text-destructive font-semibold font-mono" : v < 0 ? "text-green-500 font-semibold font-mono" : "text-muted-foreground font-mono";
    },
  },
  {
    key: "t2FinishVar", label: "Finish Var 2", shortLabel: "FV2", width: 55,
    align: "center", requiresTarget: 2,
    render: (a, ctx) => {
      const t = ctx.t2Map.get(a.id);
      const v = varianceDays(a.earlyFinish, t?.earlyFinish);
      return v !== null ? (v > 0 ? `+${v}` : String(v)) : "—";
    },
    renderClass: (a, ctx) => {
      const t = ctx.t2Map.get(a.id);
      const v = varianceDays(a.earlyFinish, t?.earlyFinish);
      if (v === null) return "text-muted-foreground font-mono";
      return v > 0 ? "text-destructive font-semibold font-mono" : v < 0 ? "text-green-500 font-semibold font-mono" : "text-muted-foreground font-mono";
    },
  },
];

const DEFAULT_VISIBLE_COLUMNS = ["activityId", "name", "duration", "earlyStart", "earlyFinish", "totalFloat"];

export default function Scheduler() {
  const [, params] = useRoute("/scheduler/:id");
  const scheduleId = params?.id ? parseInt(params.id, 10) : null;
  const { member, loading: memberLoading, isAuthenticated, getLoginUrl } = useMember();

  // ─── View State ────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [showArrows, setShowArrows] = useState(true);
  const [showDataDateLine, setShowDataDateLine] = useState(true);
  const [showTodayLine, setShowTodayLine] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(DEFAULT_VISIBLE_COLUMNS);
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  // ─── Dialog State ──────────────────────────────────────────────────────────
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showRelationshipDialog, setShowRelationshipDialog] = useState(false);
  const [showBaselineDialog, setShowBaselineDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [showScheduleInfo, setShowScheduleInfo] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDataDatePicker, setShowDataDatePicker] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);

  // ─── PDF Export State ─────────────────────────────────────────────────────
  const [pdfCompanyName, setPdfCompanyName] = useState("ALP Contractor Circle");
  const [pdfProjectName, setPdfProjectName] = useState("");
  const [pdfFooterText, setPdfFooterText] = useState("");
  const [pdfPageSize, setPdfPageSize] = useState<"letter" | "legal" | "tabloid">("tabloid");
  const [pdfOrientation, setPdfOrientation] = useState<"landscape" | "portrait">("landscape");
  const [pdfShowGantt, setPdfShowGantt] = useState(true);
  const [pdfCriticalOnly, setPdfCriticalOnly] = useState(false);
  const [pdfExporting, setPdfExporting] = useState(false);

  // ─── Targeting State ───────────────────────────────────────────────────────
  const [target1Id, setTarget1Id] = useState<number | null>(null);
  const [target2Id, setTarget2Id] = useState<number | null>(null);

  // ─── Edit State ────────────────────────────────────────────────────────────
  const [editingCell, setEditingCell] = useState<{ activityId: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [activeFilters, setActiveFilters] = useState<Map<number, Set<number>>>(new Map());
  const [groupByCategory, setGroupByCategory] = useState<number | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // ─── Data Queries ──────────────────────────────────────────────────────────

  const scheduleQuery = trpc.schedule.get.useQuery(
    { id: scheduleId! },
    { enabled: !!scheduleId && isAuthenticated }
  );

  const target1Query = trpc.schedule.getSnapshotActivities.useQuery(
    { id: target1Id!, scheduleId: scheduleId! },
    { enabled: !!target1Id && !!scheduleId }
  );

  const target2Query = trpc.schedule.getSnapshotActivities.useQuery(
    { id: target2Id!, scheduleId: scheduleId! },
    { enabled: !!target2Id && !!scheduleId }
  );

  const utils = trpc.useUtils();
  const invalidate = useCallback(() => {
    if (scheduleId) utils.schedule.get.invalidate({ id: scheduleId });
  }, [scheduleId, utils]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const addActivityMut = trpc.schedule.addActivity.useMutation({
    onSuccess: () => { invalidate(); toast.success("Activity added"); },
    onError: (e) => toast.error(e.message),
  });

  const updateActivityMut = trpc.schedule.updateActivity.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteActivityMut = trpc.schedule.deleteActivity.useMutation({
    onSuccess: () => { invalidate(); toast.success("Activity deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const addRelMut = trpc.schedule.addRelationship.useMutation({
    onSuccess: () => { invalidate(); toast.success("Relationship added"); setShowRelationshipDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const deleteRelMut = trpc.schedule.deleteRelationship.useMutation({
    onSuccess: () => { invalidate(); toast.success("Relationship deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const saveBaselineMut = trpc.schedule.saveBaseline.useMutation({
    onSuccess: () => { invalidate(); toast.success("Baseline saved"); setShowBaselineDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const saveUpdateMut = trpc.schedule.saveUpdate.useMutation({
    onSuccess: (data) => { invalidate(); toast.success(`${data.name} saved`); setShowUpdateDialog(false); },
    onError: (e) => toast.error(e.message),
  });

  const recalculateMut = trpc.schedule.recalculate.useMutation({
    onSuccess: (data) => {
      invalidate();
      toast.success(`Schedule calculated — ${data.criticalPathCount} critical activities`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateScheduleMut = trpc.schedule.update.useMutation({
    onSuccess: () => { invalidate(); toast.success("Schedule updated"); },
    onError: (e) => toast.error(e.message),
  });

  const setCodesMut = trpc.schedule.setActivityCodes.useMutation({
    onSuccess: () => invalidate(),
    onError: (e) => toast.error(e.message),
  });

  // ─── Derived Data ──────────────────────────────────────────────────────────

  const data = scheduleQuery.data;
  const schedule = data?.schedule;
  const activities: ActivityRow[] = useMemo(() => {
    if (!data?.activities) return [];
    return data.activities.map((a: any) => ({
      ...a,
      earlyStart: a.earlyStart ? new Date(a.earlyStart) : null,
      earlyFinish: a.earlyFinish ? new Date(a.earlyFinish) : null,
      lateStart: a.lateStart ? new Date(a.lateStart) : null,
      lateFinish: a.lateFinish ? new Date(a.lateFinish) : null,
      actualStart: a.actualStart ? new Date(a.actualStart) : null,
      actualFinish: a.actualFinish ? new Date(a.actualFinish) : null,
    }));
  }, [data?.activities]);

  const relationships = data?.relationships || [];
  const calendars = data?.calendars || [];
  const codeCategories = data?.codeCategories || [];
  const codeAssignments = data?.codeAssignments || [];
  const baselines = data?.baselines || [];

  const calendarMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of calendars) m.set((c as any).id, (c as any).name);
    return m;
  }, [calendars]);

  // Target activity maps
  const t1Activities = target1Query.data?.activities || [];
  const t2Activities = target2Query.data?.activities || [];

  const t1Map = useMemo(() => {
    const m = new Map<number, any>();
    for (const a of t1Activities) m.set(a.id, a);
    return m;
  }, [t1Activities]);

  const t2Map = useMemo(() => {
    const m = new Map<number, any>();
    for (const a of t2Activities) m.set(a.id, a);
    return m;
  }, [t2Activities]);

  // Build code assignment map
  const codeAssignmentMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    for (const a of codeAssignments) {
      if (!map.has(a.activityId)) map.set(a.activityId, new Set());
      map.get(a.activityId)!.add(a.codeValueId);
    }
    return map;
  }, [codeAssignments]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    if (activeFilters.size === 0) return activities;
    return activities.filter((act) => {
      const actCodes = codeAssignmentMap.get(act.id) || new Set();
      for (const [, valueIds] of Array.from(activeFilters.entries())) {
        let hasMatch = false;
        for (const vid of Array.from(valueIds)) {
          if (actCodes.has(vid)) { hasMatch = true; break; }
        }
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [activities, activeFilters, codeAssignmentMap]);

  // Group activities
  const groupedActivities = useMemo(() => {
    if (!groupByCategory) return [{ group: null, activities: filteredActivities }];
    const cat = codeCategories.find((c: any) => c.id === groupByCategory);
    if (!cat) return [{ group: null, activities: filteredActivities }];

    const groups = new Map<string, ActivityRow[]>();
    groups.set("Unassigned", []);
    for (const val of (cat as any).values) groups.set(val.value, []);

    for (const act of filteredActivities) {
      const actCodes = codeAssignmentMap.get(act.id) || new Set();
      let assigned = false;
      for (const val of (cat as any).values) {
        if (actCodes.has(val.id)) { groups.get(val.value)!.push(act); assigned = true; }
      }
      if (!assigned) groups.get("Unassigned")!.push(act);
    }

    return Array.from(groups.entries())
      .filter(([, acts]) => acts.length > 0)
      .map(([group, acts]) => ({ group, activities: acts }));
  }, [filteredActivities, groupByCategory, codeCategories, codeAssignmentMap]);

  // ─── Visible columns (filtered by target state) ───────────────────────────

  const activeColumns = useMemo(() => {
    return ALL_COLUMNS.filter((col) => {
      if (!visibleColumns.includes(col.key) && !col.alwaysVisible) return false;
      if (col.requiresTarget === 1 && !target1Id) return false;
      if (col.requiresTarget === 2 && !target2Id) return false;
      return true;
    });
  }, [visibleColumns, target1Id, target2Id]);

  // Auto-add variance columns when targeting
  useEffect(() => {
    if (target1Id && !visibleColumns.includes("t1StartVar")) {
      setVisibleColumns((prev) => [...prev, "t1Start", "t1Finish", "t1StartVar", "t1FinishVar"]);
    }
  }, [target1Id]);

  useEffect(() => {
    if (target2Id && !visibleColumns.includes("t2StartVar")) {
      setVisibleColumns((prev) => [...prev, "t2Start", "t2Finish", "t2StartVar", "t2FinishVar"]);
    }
  }, [target2Id]);

  // ─── Render context ────────────────────────────────────────────────────────

  const formatDate = (d: Date | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  };

  const renderCtx: RenderContext = useMemo(() => ({
    formatDate, t1Map, t2Map, calendarMap,
  }), [t1Map, t2Map, calendarMap]);

  // ─── Inline Edit Handlers ──────────────────────────────────────────────────

  const startEdit = (activityId: number, field: string, currentValue: string) => {
    setEditingCell({ activityId, field });
    setEditValue(currentValue);
  };

  const commitEdit = () => {
    if (!editingCell || !scheduleId) return;
    const { activityId, field } = editingCell;
    const updateData: any = { id: activityId, scheduleId };

    switch (field) {
      case "name":
        if (editValue.trim()) updateData.name = editValue.trim();
        break;
      case "duration": {
        const dur = parseInt(editValue, 10);
        if (!isNaN(dur) && dur >= 0) updateData.duration = dur;
        break;
      }
      case "wbs":
        updateData.wbs = editValue.trim() || null;
        break;
      case "percentComplete": {
        const pct = parseFloat(editValue);
        if (!isNaN(pct) && pct >= 0 && pct <= 100) updateData.percentComplete = pct;
        break;
      }
    }

    if (Object.keys(updateData).length > 2) updateActivityMut.mutate(updateData);
    setEditingCell(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditingCell(null);
  };

  // ─── New Activity / Relationship State ─────────────────────────────────────

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

  // Initialize data date input from schedule
  useEffect(() => {
    if (schedule?.dataDate) {
      setDataDateInput(new Date(schedule.dataDate).toISOString().split("T")[0]);
    } else if (schedule?.projectStartDate) {
      setDataDateInput(new Date(schedule.projectStartDate).toISOString().split("T")[0]);
    }
  }, [schedule?.dataDate, schedule?.projectStartDate]);

  // ─── Grid template for columns ─────────────────────────────────────────────

  const gridTemplate = useMemo(() => {
    const cols = ["40px", ...activeColumns.map((c) => `${c.width}px`)];
    return cols.join(" ");
  }, [activeColumns]);

  // ─── Loading / Auth States ─────────────────────────────────────────────────

  if (memberLoading || scheduleQuery.isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-ember mx-auto mb-4" />
          <p className="text-muted-foreground">Loading schedule...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Calendar className="w-16 h-16 text-ember mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Sign In Required</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access the scheduler.</p>
          <a href={getLoginUrl(`/scheduler/${scheduleId}`)}>
            <Button className="bg-ember text-primary-foreground hover:bg-ember-dark">Sign In</Button>
          </a>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-foreground mb-2">Schedule Not Found</h1>
          <p className="text-muted-foreground mb-4">This schedule may have been deleted or you don't have access.</p>
          <a href="/portal/scheduler"><Button variant="outline">Back to Schedules</Button></a>
        </div>
      </div>
    );
  }

  const dataDate = schedule.dataDate ? new Date(schedule.dataDate) : null;
  const lastCalculatedAt = (schedule as any).lastCalculatedAt ? new Date((schedule as any).lastCalculatedAt) : null;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ── Top Toolbar ─────────────────────────────────────────────────────── */}
      <div className="h-12 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-3 gap-1.5 shrink-0">
        <a href="/portal/scheduler" className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <ChevronLeft className="w-4 h-4" />
        </a>
        <div className="font-heading font-semibold text-foreground text-sm truncate max-w-[160px]">
          {schedule.name}
        </div>
        <div className="text-xs text-muted-foreground ml-1">
          {filteredActivities.length} activities
        </div>

        <div className="flex-1" />

        {/* Recalculate (F9) */}
        <Button
          variant="outline" size="sm" className="text-xs h-7 gap-1"
          onClick={() => scheduleId && recalculateMut.mutate({ scheduleId })}
          disabled={recalculateMut.isPending}
        >
          {recalculateMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          Calculate
        </Button>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 border border-border rounded-md px-0.5">
          {(["day", "week", "month"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2 py-1 text-xs rounded transition-colors ${zoom === z ? "bg-ember/20 text-ember" : "text-muted-foreground hover:text-foreground"}`}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>

        {/* Toggle: Arrows */}
        <Button
          variant="outline" size="sm" className={`text-xs h-7 w-7 p-0 ${showArrows ? "border-ember text-ember" : ""}`}
          onClick={() => setShowArrows(!showArrows)}
          title="Toggle dependency arrows"
        >
          <Link2 className="w-3.5 h-3.5" />
        </Button>

        {/* Toggle: Data Date Line */}
        <Button
          variant="outline" size="sm" className={`text-xs h-7 w-7 p-0 ${showDataDateLine ? "border-amber-500 text-amber-500" : ""}`}
          onClick={() => setShowDataDateLine(!showDataDateLine)}
          title="Toggle data date line"
        >
          <Target className="w-3.5 h-3.5" />
        </Button>

        {/* Toggle: Today Line */}
        <Button
          variant="outline" size="sm" className={`text-xs h-7 w-7 p-0 ${showTodayLine ? "border-blue-500 text-blue-500" : ""}`}
          onClick={() => setShowTodayLine(!showTodayLine)}
          title="Toggle today line"
        >
          <Clock className="w-3.5 h-3.5" />
        </Button>

        {/* Columns */}
        <Button
          variant="outline" size="sm" className="text-xs h-7"
          onClick={() => setShowColumnPicker(true)}
          title="Configure columns"
        >
          <Columns3 className="w-3.5 h-3.5 mr-1" />
          Columns
        </Button>

        {/* Filter */}
        <Button
          variant="outline" size="sm"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`text-xs h-7 ${activeFilters.size > 0 ? "border-ember text-ember" : ""}`}
        >
          <Filter className="w-3.5 h-3.5 mr-1" />
          Filter
          {activeFilters.size > 0 && (
            <span className="ml-1 bg-ember text-primary-foreground rounded-full w-4 h-4 text-[10px] flex items-center justify-center">
              {activeFilters.size}
            </span>
          )}
        </Button>

        {/* Group By */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7">
              <Layers className="w-3.5 h-3.5 mr-1" />Group
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border">
            <DropdownMenuItem onClick={() => setGroupByCategory(null)}>No Grouping</DropdownMenuItem>
            <DropdownMenuSeparator />
            {codeCategories.map((cat: any) => (
              <DropdownMenuItem key={cat.id} onClick={() => setGroupByCategory(cat.id)}>
                Group by {cat.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-border w-52">
            <DropdownMenuItem onClick={() => setShowActivityDialog(true)}>
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowRelationshipDialog(true)}>
              <Link2 className="w-4 h-4 mr-2" /> Add Relationship
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDataDatePicker(true)}>
              <Target className="w-4 h-4 mr-2" /> Set Data Date
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowBaselineDialog(true)}>
              <Save className="w-4 h-4 mr-2" /> Save Baseline
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowUpdateDialog(true)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Save Update
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Target className="w-4 h-4 mr-2" /> Target 1
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-popover border-border">
                <DropdownMenuItem onClick={() => setTarget1Id(null)}>
                  <span className={!target1Id ? "font-semibold text-ember" : ""}>None</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {baselines.map((b: any) => (
                  <DropdownMenuItem key={b.id} onClick={() => setTarget1Id(b.id)}>
                    <span className={target1Id === b.id ? "font-semibold text-ember" : ""}>
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
              <DropdownMenuSubContent className="bg-popover border-border">
                <DropdownMenuItem onClick={() => setTarget2Id(null)}>
                  <span className={!target2Id ? "font-semibold text-ember" : ""}>None</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {baselines.map((b: any) => (
                  <DropdownMenuItem key={b.id} onClick={() => setTarget2Id(b.id)}>
                    <span className={target2Id === b.id ? "font-semibold text-ember" : ""}>
                      {b.name} {b.snapshotType === "update" ? `(${new Date(b.createdAt).toLocaleDateString()})` : ""}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowCalendarDialog(true)}>
              <Calendar className="w-4 h-4 mr-2" /> Calendars
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowScheduleInfo(true)}>
              <Settings className="w-4 h-4 mr-2" /> Schedule Info
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { setPdfProjectName(schedule?.name || ""); setShowPdfExport(true); }}>
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Target indicators bar ──────────────────────────────────────────── */}
      {(target1Id || target2Id) && (
        <div className="h-7 border-b border-border bg-card/50 flex items-center px-3 gap-4 text-xs shrink-0">
          {target1Id && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-gray-500 opacity-60" />
              <span className="text-muted-foreground">Target 1:</span>
              <span className="text-foreground font-medium">{target1Query.data?.name || "Loading..."}</span>
              <button onClick={() => setTarget1Id(null)} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
            </div>
          )}
          {target2Id && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-2 rounded-sm bg-violet-500 opacity-60" />
              <span className="text-muted-foreground">Target 2:</span>
              <span className="text-foreground font-medium">{target2Query.data?.name || "Loading..."}</span>
              <button onClick={() => setTarget2Id(null)} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
            </div>
          )}
        </div>
      )}

      {/* ── Filter Panel (collapsible) ──────────────────────────────────────── */}
      {showFilterPanel && codeCategories.length > 0 && (
        <div className="border-b border-border bg-card/50 px-4 py-2 flex items-center gap-4 overflow-x-auto shrink-0">
          {codeCategories.map((cat: any) => (
            <div key={cat.id} className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground font-medium">{cat.name}:</span>
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
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${isActive ? "bg-ember/20 border-ember text-ember" : "border-border text-muted-foreground hover:border-muted-foreground/50"}`}
                    >
                      {val.value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {activeFilters.size > 0 && (
            <button onClick={() => setActiveFilters(new Map())} className="text-xs text-destructive hover:underline shrink-0">Clear All</button>
          )}
        </div>
      )}

      {/* ── Split Pane ──────────────────────────────────────────────────────── */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left: Activity Table */}
        <ResizablePanel defaultSize={45} minSize={25} maxSize={70}>
          <div ref={tableRef} className="h-full overflow-auto">
            {/* Table Header */}
            <div className="sticky top-0 z-20 bg-card border-b border-border">
              <div
                className="text-xs font-medium text-muted-foreground h-8 items-center px-2 gap-1"
                style={{ display: "grid", gridTemplateColumns: gridTemplate }}
              >
                <div></div>
                {activeColumns.map((col) => (
                  <div key={col.key} className={`text-${col.align} truncate`} title={col.label}>
                    {col.shortLabel}
                  </div>
                ))}
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border/50">
              {groupedActivities.map(({ group, activities: groupActs }) => (
                <div key={group || "all"}>
                  {group && (
                    <div className="px-3 py-1.5 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {group}
                    </div>
                  )}
                  {groupActs.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => setSelectedActivityId(act.id === selectedActivityId ? null : act.id)}
                      className={`text-xs items-center px-2 gap-1 h-8 cursor-pointer transition-colors ${
                        act.id === selectedActivityId
                          ? "bg-ember/10 border-l-2 border-l-ember"
                          : act.isCritical
                          ? "hover:bg-destructive/5 border-l-2 border-l-destructive/50"
                          : "hover:bg-muted/30 border-l-2 border-l-transparent"
                      }`}
                      style={{ display: "grid", gridTemplateColumns: gridTemplate }}
                    >
                      {/* Row actions */}
                      <div className="flex items-center gap-0.5">
                        <GripVertical className="w-3 h-3 text-muted-foreground/30" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground">
                              <MoreHorizontal className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="bg-popover border-border">
                            <DropdownMenuItem onClick={() => {
                              if (scheduleId) addActivityMut.mutate({ scheduleId, name: "New Activity", duration: 5, afterActivityId: act.id });
                            }}>
                              <Plus className="w-3.5 h-3.5 mr-2" /> Insert Below
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { if (scheduleId && confirm("Delete this activity?")) deleteActivityMut.mutate({ id: act.id, scheduleId }); }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Dynamic columns */}
                      {activeColumns.map((col) => {
                        const isEditing = editingCell?.activityId === act.id && editingCell.field === col.key;
                        const cellClass = col.renderClass ? col.renderClass(act, renderCtx) : "text-muted-foreground";

                        if (isEditing && col.editable) {
                          return (
                            <div key={col.key} className={`text-${col.align}`}>
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={commitEdit}
                                onKeyDown={handleEditKeyDown}
                                autoFocus
                                className="h-6 text-xs px-1 py-0"
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
                          : "";

                        return (
                          <div
                            key={col.key}
                            className={`text-${col.align} truncate ${cellClass}`}
                            onDoubleClick={col.editable ? () => startEdit(act.id, col.key, rawValue) : undefined}
                            title={value}
                          >
                            {value}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Add Activity Row */}
            <div className="px-3 py-2 border-t border-border">
              <button
                onClick={() => setShowActivityDialog(true)}
                className="text-xs text-muted-foreground hover:text-ember transition-colors flex items-center gap-1"
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
            projectStartDate={schedule.projectStartDate ? new Date(schedule.projectStartDate) : new Date()}
            dataDate={dataDate}
            zoom={zoom}
            selectedActivityId={selectedActivityId}
            onSelectActivity={setSelectedActivityId}
            groupedActivities={groupedActivities}
            showArrows={showArrows}
            showDataDateLine={showDataDateLine}
            showTodayLine={showTodayLine}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* ── Column Picker Sheet ─────────────────────────────────────────────── */}
      <Sheet open={showColumnPicker} onOpenChange={setShowColumnPicker}>
        <SheetContent side="right" className="bg-card border-border w-80">
          <SheetHeader>
            <SheetTitle className="font-heading">Configure Columns</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-1">
            {ALL_COLUMNS.map((col) => {
              const isTargetCol = col.requiresTarget === 1 || col.requiresTarget === 2;
              const targetActive = col.requiresTarget === 1 ? !!target1Id : col.requiresTarget === 2 ? !!target2Id : true;
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors ${
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
                    <div className="text-sm text-foreground">{col.label}</div>
                    {isTargetCol && (
                      <div className="text-[10px] text-muted-foreground">
                        Requires Target {col.requiresTarget} active
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="outline" size="sm" className="w-full text-xs"
              onClick={() => setVisibleColumns(DEFAULT_VISIBLE_COLUMNS)}
            >
              Reset to Default
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}

      {/* Add Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Activity Name</Label>
              <Input value={newActName} onChange={(e) => setNewActName(e.target.value)} placeholder="e.g., Foundation Footings" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Duration (days)</Label>
                <Input type="number" value={newActDuration} onChange={(e) => setNewActDuration(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">WBS (optional)</Label>
                <Input value={newActWbs} onChange={(e) => setNewActWbs(e.target.value)} placeholder="e.g., 2.0" className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newActName.trim()) {
                  addActivityMut.mutate({ scheduleId, name: newActName.trim(), duration: parseInt(newActDuration) || 5, wbs: newActWbs.trim() || undefined });
                  setNewActName(""); setNewActDuration("5"); setNewActWbs(""); setShowActivityDialog(false);
                }
              }}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
              disabled={!newActName.trim() || addActivityMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Relationship Dialog */}
      <Dialog open={showRelationshipDialog} onOpenChange={setShowRelationshipDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Add Relationship</DialogTitle>
            <DialogDescription>Define a logic tie between two activities.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Predecessor</Label>
              <Select value={newRelPred} onValueChange={setNewRelPred}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select predecessor" /></SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-60">
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.activityId} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Successor</Label>
              <Select value={newRelSucc} onValueChange={setNewRelSucc}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select successor" /></SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-60">
                  {activities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.activityId} — {a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newRelType} onValueChange={setNewRelType}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="FS">Finish-to-Start (FS)</SelectItem>
                    <SelectItem value="SS">Start-to-Start (SS)</SelectItem>
                    <SelectItem value="FF">Finish-to-Finish (FF)</SelectItem>
                    <SelectItem value="SF">Start-to-Finish (SF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Lag (days)</Label>
                <Input type="number" value={newRelLag} onChange={(e) => setNewRelLag(e.target.value)} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelationshipDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newRelPred && newRelSucc) {
                  addRelMut.mutate({ scheduleId, predecessorId: parseInt(newRelPred), successorId: parseInt(newRelSucc), relationshipType: newRelType as any, lagDays: parseInt(newRelLag) || 0 });
                }
              }}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
              disabled={!newRelPred || !newRelSucc || addRelMut.isPending}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Baseline Dialog */}
      <Dialog open={showBaselineDialog} onOpenChange={setShowBaselineDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Save Baseline</DialogTitle>
            <DialogDescription>Save the current schedule as the original baseline for comparison.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Baseline Name</Label>
            <Input value={newBaselineName} onChange={(e) => setNewBaselineName(e.target.value)} placeholder="e.g., Original Baseline" className="mt-1" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBaselineDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && newBaselineName.trim()) {
                  saveBaselineMut.mutate({ scheduleId, name: newBaselineName.trim(), snapshotType: "baseline" });
                  setNewBaselineName("");
                }
              }}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
              disabled={!newBaselineName.trim() || saveBaselineMut.isPending}
            >
              Save Baseline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Update Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Save Schedule Update</DialogTitle>
            <DialogDescription>
              Snapshot the current schedule as Update {baselines.filter((b: any) => b.snapshotType === "update").length + 1}.
              Data Date: {dataDate ? formatDate(dataDate) : "Not set"}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea
              value={updateNotes}
              onChange={(e) => setUpdateNotes(e.target.value)}
              placeholder="e.g., Added 2 weeks for weather delay on foundation"
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId) {
                  saveUpdateMut.mutate({ scheduleId, notes: updateNotes.trim() || undefined });
                  setUpdateNotes("");
                }
              }}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
              disabled={saveUpdateMut.isPending}
            >
              Save Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Data Date Dialog */}
      <Dialog open={showDataDatePicker} onOpenChange={setShowDataDatePicker}>
        <DialogContent className="bg-card border-border max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-heading">Set Data Date</DialogTitle>
            <DialogDescription>The data date is the "as-of" date for CPM calculations. It is independent of today's calendar date.</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="text-xs">Data Date</Label>
            <Input
              type="date"
              value={dataDateInput}
              onChange={(e) => setDataDateInput(e.target.value)}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDataDatePicker(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (scheduleId && dataDateInput) {
                  updateScheduleMut.mutate({ id: scheduleId, dataDate: new Date(dataDateInput + "T00:00:00") });
                  setShowDataDatePicker(false);
                }
              }}
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
              disabled={!dataDateInput || updateScheduleMut.isPending}
            >
              Set Data Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Calendar Dialog */}
      <Dialog open={showCalendarDialog} onOpenChange={setShowCalendarDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Project Calendars</DialogTitle>
            <DialogDescription>Manage work calendars and holidays.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {calendars.map((cal: any) => (
              <div key={cal.id} className="p-3 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-foreground">{cal.name}</span>
                  <div className="flex items-center gap-2">
                    {cal.isDefault && <span className="text-[10px] bg-ember/20 text-ember px-2 py-0.5 rounded-full">Default</span>}
                    <span className="text-xs text-muted-foreground">{cal.workWeek === "7day" ? "7-day" : "5-day"}</span>
                  </div>
                </div>
                {cal.exceptions && cal.exceptions.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {cal.exceptions.filter((e: any) => e.exceptionType === "holiday").length} holidays configured
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCalendarDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Info Dialog */}
      <Dialog open={showScheduleInfo} onOpenChange={setShowScheduleInfo}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Schedule Information</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project Start</span>
              <span className="text-foreground font-medium">{formatDate(schedule.projectStartDate ? new Date(schedule.projectStartDate) : null)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data Date</span>
              <span className="text-foreground font-medium">{dataDate ? formatDate(dataDate) : "Not set"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Calculated (Run Date)</span>
              <span className="text-foreground font-medium">
                {lastCalculatedAt ? lastCalculatedAt.toLocaleString() : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Activities</span>
              <span className="text-foreground font-medium">{activities.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Critical Activities</span>
              <span className="text-destructive font-medium">{activities.filter((a) => a.isCritical).length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Baselines</span>
              <span className="text-foreground font-medium">{baselines.filter((b: any) => b.snapshotType === "baseline").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updates</span>
              <span className="text-foreground font-medium">{baselines.filter((b: any) => b.snapshotType === "update").length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Relationships</span>
              <span className="text-foreground font-medium">{relationships.length}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleInfo(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export PDF Dialog */}
      <Dialog open={showPdfExport} onOpenChange={setShowPdfExport}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Export to PDF</DialogTitle>
            <DialogDescription>Configure the PDF output with your company branding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Company Name</Label>
              <Input value={pdfCompanyName} onChange={(e) => setPdfCompanyName(e.target.value)} placeholder="Your Company Name" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Project Name</Label>
              <Input value={pdfProjectName} onChange={(e) => setPdfProjectName(e.target.value)} placeholder="Project Name" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Footer Text</Label>
              <Input value={pdfFooterText} onChange={(e) => setPdfFooterText(e.target.value)} placeholder="e.g., Confidential — Do Not Distribute" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Page Size</Label>
                <Select value={pdfPageSize} onValueChange={(v) => setPdfPageSize(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="letter">Letter (8.5×11)</SelectItem>
                    <SelectItem value="legal">Legal (8.5×14)</SelectItem>
                    <SelectItem value="tabloid">Tabloid (11×17)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Orientation</Label>
                <Select value={pdfOrientation} onValueChange={(v) => setPdfOrientation(v as any)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={pdfShowGantt} onCheckedChange={(c) => setPdfShowGantt(!!c)} />
                <span className="text-sm text-foreground">Include Gantt Chart</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={pdfCriticalOnly} onCheckedChange={(c) => setPdfCriticalOnly(!!c)} />
                <span className="text-sm text-foreground">Critical Path Only</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfExport(false)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!schedule) return;
                setPdfExporting(true);
                try {
                  await generateSchedulePdf({
                    scheduleName: schedule.name,
                    projectStartDate: new Date(schedule.projectStartDate),
                    dataDate: schedule.dataDate ? new Date(schedule.dataDate) : null,
                    lastCalculatedAt: (schedule as any).lastCalculatedAt ? new Date((schedule as any).lastCalculatedAt) : null,
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
              className="bg-ember text-primary-foreground hover:bg-ember-dark"
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
