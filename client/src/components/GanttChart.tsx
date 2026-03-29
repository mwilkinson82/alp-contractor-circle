/**
 * GanttChart — Interactive canvas-based Gantt chart with:
 * - Light/white theme (off-white background)
 * - Critical bars = red, non-critical = green, custom colors per activity
 * - Activity labels ABOVE bars (not inside) to handle short-duration activities
 * - Zoom-to-fit: compress entire Gantt into viewport
 * - Drag-to-resize: grab left/right edge of bar to change duration
 * - Drag-to-connect: L-shaped handles on bar edges, drag line to create relationships
 * - Toggleable dependency arrows
 * - Data date line = solid BLUE, today line = dashed gray
 * - Dual-target comparison overlay (Target 1 + Target 2 bars)
 * - Click bar or row to open activity detail modal
 */
import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { toast } from "sonner";

type ZoomLevel = "day" | "week" | "month" | "fit" | "custom";

interface Activity {
  id: number;
  activityId: string;
  name: string;
  duration: number;
  earlyStart: Date | null;
  earlyFinish: Date | null;
  totalFloat: number | null;
  isCritical: boolean;
  percentComplete: string;
  actualStart: Date | null;
  actualFinish: Date | null;
  barColor?: string | null;
}

interface Relationship {
  id: number;
  predecessorId: number;
  successorId: number;
  relationshipType: string;
  lagDays: number;
}

interface TargetActivity {
  id: number;
  activityId: string;
  name: string;
  earlyStart: string | Date | null;
  earlyFinish: string | Date | null;
  isCritical?: boolean;
}

interface GroupedActivities {
  group: string | null;
  activities: Activity[];
}

interface GanttChartProps {
  activities: Activity[];
  relationships: Relationship[];
  target1Activities: TargetActivity[];
  target2Activities: TargetActivity[];
  projectStartDate: Date;
  dataDate: Date | null;
  zoom: ZoomLevel;
  selectedActivityId: number | null;
  onSelectActivity: (id: number | null) => void;
  onActivityDoubleClick?: (id: number) => void;
  groupedActivities: GroupedActivities[];
  showArrows: boolean;
  showDataDateLine: boolean;
  showTodayLine: boolean;
  onDurationChange?: (activityId: number, newDuration: number) => void;
  onRelationshipCreate?: (predecessorId: number, successorId: number, type: string) => void;
  ganttFontSize?: number;   // px, default 9
  ganttFontColor?: string;  // hex, default labelText
  ganttFontFamily?: string; // e.g. "DM Sans", "Arial"
  customPixelsPerDay?: number; // for continuous zoom
  onZoomChange?: (ppd: number) => void; // callback when user scrollwheel-zooms
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 48;
const BAR_HEIGHT = 14;
const BAR_Y_OFFSET = 14; // Push bar down to leave room for label above
const TARGET_BAR_HEIGHT = 5;
const ARROW_HEAD_SIZE = 4;
const HANDLE_RADIUS = 5;
const EDGE_HIT_ZONE = 8;

// Light theme colors
const COLORS = {
  critical: "#dc2626",
  criticalFill: "#ef4444",
  normal: "#16a34a",
  normalFill: "#22c55e",
  target1: "#9ca3af",
  target1Fill: "#6b7280",
  target2: "#8b5cf6",
  target2Fill: "#7c3aed",
  milestone: "#eab308",
  progress: "#3b82f6",
  arrow: "#6b7280",
  arrowCritical: "#dc2626",
  todayLine: "#9ca3af",
  dataDateLine: "#2563eb", // Solid BLUE
  gridLine: "rgba(0,0,0,0.06)",
  headerBg: "#f8f5f0", // Warm off-white/tan
  headerText: "rgba(0,0,0,0.45)",
  headerTextBold: "rgba(0,0,0,0.7)",
  selectedBg: "rgba(37,99,235,0.08)",
  groupBg: "rgba(0,0,0,0.03)",
  rowBg: "#faf8f5", // Very light warm white
  rowAltBg: "#f5f2ed", // Slightly darker for alternating rows
  handleFill: "#2563eb",
  handleStroke: "#fff",
  connectLine: "#3b82f6",
  connectLineValid: "#16a34a",
  labelText: "rgba(0,0,0,0.7)",
  barBorder: "rgba(0,0,0,0.15)",
  headerBorder: "rgba(0,0,0,0.1)",
  weekendBg: "rgba(0,0,0,0.02)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function startOfWeek(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  return r;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function formatMonthYear(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatWeek(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("en-US", { day: "numeric" });
}

function formatDayOfWeek(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "narrow" });
}

function toDate(d: string | Date | null): Date | null {
  if (!d) return null;
  return d instanceof Date ? d : new Date(d);
}

// ─── Drag state types ─────────────────────────────────────────────────────────

type DragMode = "none" | "resize-left" | "resize-right" | "connect" | "pan";

interface DragState {
  mode: DragMode;
  activityId: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  originalDuration: number;
  fromEdge: "start" | "finish";
  scrollStartX?: number;
  scrollStartY?: number;
}

interface BarRect {
  activityId: number;
  x: number;
  y: number;
  w: number;
  h: number;
  isMilestone: boolean;
}

export default function GanttChart({
  activities,
  relationships,
  target1Activities,
  target2Activities,
  projectStartDate,
  dataDate,
  zoom,
  selectedActivityId,
  onSelectActivity,
  onActivityDoubleClick,
  groupedActivities,
  showArrows,
  showDataDateLine,
  showTodayLine,
  onDurationChange,
  onRelationshipCreate,
  ganttFontSize = 9,
  ganttFontColor,
  ganttFontFamily = "DM Sans",
  customPixelsPerDay,
  onZoomChange,
}: GanttChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [containerHeight, setContainerHeight] = useState(600);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredActivity, setHoveredActivity] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<"start" | "finish" | "body" | null>(null);
  const [dropTarget, setDropTarget] = useState<{ activityId: number; edge: "start" | "finish" } | null>(null);

  const barRectsRef = useRef<BarRect[]>([]);

  // ─── Compute layout ──────────────────────────────────────────────────────

  // Flatten grouped activities for row index mapping
  const flatRows = useMemo(() => {
    const rows: Array<{ type: "group" | "activity"; group?: string; activity?: Activity; rowIndex: number }> = [];
    let idx = 0;
    for (const g of groupedActivities) {
      if (g.group) {
        rows.push({ type: "group", group: g.group, rowIndex: idx });
        idx++;
      }
      for (const act of g.activities) {
        rows.push({ type: "activity", activity: act, rowIndex: idx });
        idx++;
      }
    }
    return rows;
  }, [groupedActivities]);

  const activityRowMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of flatRows) {
      if (row.type === "activity" && row.activity) {
        map.set(row.activity.id, row.rowIndex);
      }
    }
    return map;
  }, [flatRows]);

  // Date range
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    let minDate = new Date(projectStartDate);
    let maxDate = addDays(minDate, 30);

    const checkDate = (d: Date | null) => {
      if (d) {
        if (d < minDate) minDate = new Date(d);
        if (d > maxDate) maxDate = new Date(d);
      }
    };

    for (const act of activities) {
      checkDate(act.earlyStart);
      checkDate(act.earlyFinish);
    }

    for (const ta of [...target1Activities, ...target2Activities]) {
      checkDate(toDate(ta.earlyStart));
      checkDate(toDate(ta.earlyFinish));
    }

    if (dataDate) checkDate(dataDate);

    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 14);
    return { rangeStart: start, rangeEnd: end, totalDays: daysBetween(start, end) };
  }, [activities, target1Activities, target2Activities, projectStartDate, dataDate]);

  // Compute pixels per day based on zoom level (including "fit" and "custom")
  const pixelsPerDay = useMemo(() => {
    if (zoom === "custom" && customPixelsPerDay) {
      return Math.max(0.5, Math.min(80, customPixelsPerDay));
    }
    if (zoom === "fit") {
      const availableWidth = containerWidth - 20;
      if (totalDays <= 0) return 4;
      const ppd = Math.max(1, availableWidth / totalDays);
      return Math.min(ppd, 40);
    }
    return zoom === "day" ? 40 : zoom === "week" ? 14 : 4;
  }, [zoom, containerWidth, totalDays, customPixelsPerDay]);

  const totalWidth = totalDays * pixelsPerDay;
  const totalHeight = HEADER_HEIGHT + flatRows.length * ROW_HEIGHT;

  // ─── Resize observer ─────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
        setContainerHeight(entry.contentRect.height);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ─── Hit testing helpers ──────────────────────────────────────────────────

  const getCanvasCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { cx: 0, cy: 0 };
    return { cx: e.clientX - rect.left, cy: e.clientY - rect.top };
  }, []);

  const hitTestBar = useCallback((cx: number, cy: number): { bar: BarRect; edge: "start" | "finish" | "body" } | null => {
    const bars = barRectsRef.current;
    for (let i = bars.length - 1; i >= 0; i--) {
      const bar = bars[i];
      if (bar.isMilestone) continue;
      if (cy >= bar.y && cy <= bar.y + bar.h) {
        if (cx >= bar.x - EDGE_HIT_ZONE && cx <= bar.x + EDGE_HIT_ZONE) {
          return { bar, edge: "start" };
        }
        if (cx >= bar.x + bar.w - EDGE_HIT_ZONE && cx <= bar.x + bar.w + EDGE_HIT_ZONE) {
          return { bar, edge: "finish" };
        }
        if (cx >= bar.x && cx <= bar.x + bar.w) {
          return { bar, edge: "body" };
        }
      }
    }
    return null;
  }, []);

  const hitTestBarAny = useCallback((cx: number, cy: number): { bar: BarRect; edge: "start" | "finish" } | null => {
    const bars = barRectsRef.current;
    for (let i = bars.length - 1; i >= 0; i--) {
      const bar = bars[i];
      if (bar.isMilestone) continue;
      if (cy >= bar.y - 4 && cy <= bar.y + bar.h + 4) {
        const midX = bar.x + bar.w / 2;
        if (cx >= bar.x - 12 && cx <= bar.x + bar.w + 12) {
          return { bar, edge: cx < midX ? "start" : "finish" };
        }
      }
    }
    return null;
  }, []);

  // ─── Mouse handlers ───────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { cx, cy } = getCanvasCoords(e);
    const hit = hitTestBar(cx, cy);
    if (!hit) {
      // No bar hit — start pan mode
      e.preventDefault();
      const el = containerRef.current;
      setDragState({
        mode: "pan",
        activityId: 0,
        startX: e.clientX,
        startY: e.clientY,
        currentX: e.clientX,
        currentY: e.clientY,
        originalDuration: 0,
        fromEdge: "start",
        scrollStartX: el?.scrollLeft ?? 0,
        scrollStartY: el?.scrollTop ?? 0,
      });
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "grabbing";
      return;
    }

    if (hit.edge === "start" || hit.edge === "finish") {
      if (e.altKey || e.metaKey) {
        e.preventDefault();
        setDragState({
          mode: "connect",
          activityId: hit.bar.activityId,
          startX: hit.edge === "start" ? hit.bar.x : hit.bar.x + hit.bar.w,
          startY: hit.bar.y + hit.bar.h / 2,
          currentX: cx,
          currentY: cy,
          originalDuration: 0,
          fromEdge: hit.edge,
        });
      } else {
        e.preventDefault();
        const act = activities.find((a) => a.id === hit.bar.activityId);
        if (!act) return;
        setDragState({
          mode: hit.edge === "start" ? "resize-left" : "resize-right",
          activityId: hit.bar.activityId,
          startX: cx,
          startY: cy,
          currentX: cx,
          currentY: cy,
          originalDuration: act.duration,
          fromEdge: hit.edge,
        });
      }
    }
  }, [getCanvasCoords, hitTestBar, activities]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const { cx, cy } = getCanvasCoords(e);

    if (dragState) {
      if (dragState.mode === "pan") {
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        const el = containerRef.current;
        if (el) {
          el.scrollLeft = (dragState.scrollStartX ?? 0) - dx;
          el.scrollTop = (dragState.scrollStartY ?? 0) - dy;
        }
        return;
      }

      setDragState((prev) => prev ? { ...prev, currentX: cx, currentY: cy } : null);

      if (dragState.mode === "connect") {
        const hit = hitTestBarAny(cx, cy);
        if (hit && hit.bar.activityId !== dragState.activityId) {
          setDropTarget({ activityId: hit.bar.activityId, edge: hit.edge });
        } else {
          setDropTarget(null);
        }
      }
      return;
    }

    const hit = hitTestBar(cx, cy);
    if (hit) {
      setHoveredActivity(hit.bar.activityId);
      setHoveredEdge(hit.edge);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = (hit.edge === "start" || hit.edge === "finish") ? "col-resize" : "pointer";
      }
    } else {
      setHoveredActivity(null);
      setHoveredEdge(null);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "grab";
    }
  }, [getCanvasCoords, hitTestBar, hitTestBarAny, dragState]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState) {
      // Regular click — select activity
      const { cx, cy } = getCanvasCoords(e);
      const adjustedY = cy + scrollTop - HEADER_HEIGHT;
      const rowIndex = Math.floor(adjustedY / ROW_HEIGHT);
      const row = flatRows.find((r) => r.rowIndex === rowIndex);
      if (row?.type === "activity" && row.activity) {
        onSelectActivity(row.activity.id === selectedActivityId ? null : row.activity.id);
      }
      return;
    }

    if (dragState.mode === "pan") {
      setDragState(null);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = "grab";
      return;
    }

    if (dragState.mode === "resize-left" || dragState.mode === "resize-right") {
      const deltaX = dragState.currentX - dragState.startX;
      const deltaDays = Math.round(deltaX / pixelsPerDay);
      let newDuration: number;

      if (dragState.mode === "resize-right") {
        newDuration = Math.max(1, dragState.originalDuration + deltaDays);
      } else {
        newDuration = Math.max(1, dragState.originalDuration - deltaDays);
      }

      if (newDuration !== dragState.originalDuration && onDurationChange) {
        onDurationChange(dragState.activityId, newDuration);
        toast.success(`Duration changed to ${newDuration} days`);
      }
    }

    if (dragState.mode === "connect" && dropTarget && onRelationshipCreate) {
      const fromEdge = dragState.fromEdge;
      const toEdge = dropTarget.edge;
      let relType: string;

      if (fromEdge === "finish" && toEdge === "start") relType = "FS";
      else if (fromEdge === "finish" && toEdge === "finish") relType = "FF";
      else if (fromEdge === "start" && toEdge === "start") relType = "SS";
      else relType = "SF";

      onRelationshipCreate(dragState.activityId, dropTarget.activityId, relType);

      const predAct = activities.find((a) => a.id === dragState.activityId);
      const succAct = activities.find((a) => a.id === dropTarget.activityId);
      toast.success(`${relType}: ${predAct?.name || "?"} → ${succAct?.name || "?"}`);
    }

    setDragState(null);
    setDropTarget(null);
  }, [dragState, dropTarget, pixelsPerDay, onDurationChange, onRelationshipCreate, activities, getCanvasCoords, scrollTop, flatRows, selectedActivityId, onSelectActivity]);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onActivityDoubleClick) return;
    const { cx, cy } = getCanvasCoords(e);
    const hit = hitTestBar(cx, cy);
    if (hit) {
      onActivityDoubleClick(hit.bar.activityId);
      return;
    }
    // Also check row click
    const adjustedY = cy + scrollTop - HEADER_HEIGHT;
    const rowIndex = Math.floor(adjustedY / ROW_HEIGHT);
    const row = flatRows.find((r) => r.rowIndex === rowIndex);
    if (row?.type === "activity" && row.activity) {
      onActivityDoubleClick(row.activity.id);
    }
  }, [getCanvasCoords, hitTestBar, onActivityDoubleClick, scrollTop, flatRows]);

  const handleMouseLeave = useCallback(() => {
    if (dragState) {
      setDragState(null);
      setDropTarget(null);
    }
    setHoveredActivity(null);
    setHoveredEdge(null);
  }, [dragState]);

  // ─── Canvas rendering ─────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const visibleWidth = containerWidth;
    const visibleHeight = containerHeight;

    canvas.width = visibleWidth * dpr;
    canvas.height = visibleHeight * dpr;
    canvas.style.width = `${visibleWidth}px`;
    canvas.style.height = `${visibleHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    // ── Clear with light background ────────────────────────────────────
    ctx.fillStyle = COLORS.rowBg;
    ctx.fillRect(0, 0, visibleWidth, visibleHeight);

    const offsetX = -scrollLeft;
    const offsetY = -scrollTop;

    const barRects: BarRect[] = [];

    // ── Draw time scale header ──────────────────────────────────────────

    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, 0, visibleWidth, HEADER_HEIGHT);

    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 1;

    if (zoom === "day") {
      let current = new Date(rangeStart);
      while (current <= rangeEnd) {
        const x = daysBetween(rangeStart, current) * pixelsPerDay + offsetX;
        if (x > -pixelsPerDay && x < visibleWidth + pixelsPerDay) {
          // Weekend shading
          if (current.getDay() === 0 || current.getDay() === 6) {
            ctx.fillStyle = COLORS.weekendBg;
            ctx.fillRect(x, HEADER_HEIGHT, pixelsPerDay, visibleHeight);
          }
          ctx.fillStyle = COLORS.headerText;
          ctx.font = "10px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(formatDay(current), x + pixelsPerDay / 2, HEADER_HEIGHT - 6);
          ctx.fillStyle = current.getDay() === 0 || current.getDay() === 6
            ? "rgba(220,38,38,0.5)" : COLORS.headerText;
          ctx.fillText(formatDayOfWeek(current), x + pixelsPerDay / 2, HEADER_HEIGHT - 18);
          ctx.beginPath();
          ctx.moveTo(x, HEADER_HEIGHT);
          ctx.lineTo(x, totalHeight + offsetY);
          ctx.stroke();
        }
        if (current.getDate() === 1) {
          ctx.fillStyle = COLORS.headerTextBold;
          ctx.font = "bold 11px 'DM Sans', sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(formatMonthYear(current), x + 4, 14);
        }
        current = addDays(current, 1);
      }
    } else if (zoom === "week" || (zoom === "fit" && pixelsPerDay >= 5)) {
      let current = startOfWeek(new Date(rangeStart));
      while (current <= rangeEnd) {
        const x = daysBetween(rangeStart, current) * pixelsPerDay + offsetX;
        const weekWidth = 7 * pixelsPerDay;
        if (x > -weekWidth && x < visibleWidth + weekWidth) {
          ctx.fillStyle = COLORS.headerText;
          ctx.font = "10px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(formatWeek(current), x + weekWidth / 2, HEADER_HEIGHT - 8);
          ctx.beginPath();
          ctx.moveTo(x, HEADER_HEIGHT);
          ctx.lineTo(x, totalHeight + offsetY);
          ctx.stroke();
        }
        if (current.getDate() <= 7) {
          ctx.fillStyle = COLORS.headerTextBold;
          ctx.font = "bold 11px 'DM Sans', sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(formatMonthYear(startOfMonth(current)), x + 4, 14);
        }
        current = addDays(current, 7);
      }
    } else {
      // Month view (or fit with very compressed zoom)
      let current = startOfMonth(new Date(rangeStart));
      while (current <= rangeEnd) {
        const x = daysBetween(rangeStart, current) * pixelsPerDay + offsetX;
        const daysInMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        const monthWidth = daysInMonth * pixelsPerDay;
        if (x > -monthWidth && x < visibleWidth + monthWidth) {
          ctx.fillStyle = COLORS.headerText;
          ctx.font = "10px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(current.toLocaleDateString("en-US", { month: "short" }), x + monthWidth / 2, HEADER_HEIGHT - 8);
          ctx.beginPath();
          ctx.moveTo(x, HEADER_HEIGHT);
          ctx.lineTo(x, totalHeight + offsetY);
          ctx.stroke();
        }
        if (current.getMonth() === 0) {
          ctx.fillStyle = COLORS.headerTextBold;
          ctx.font = "bold 11px 'DM Sans', sans-serif";
          ctx.textAlign = "left";
          ctx.fillText(String(current.getFullYear()), x + 4, 14);
        }
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }

    // Header bottom border
    ctx.strokeStyle = COLORS.headerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(visibleWidth, HEADER_HEIGHT);
    ctx.stroke();

    // ── Draw rows ───────────────────────────────────────────────────────

    const t1Map = new Map<number, TargetActivity>();
    for (const ta of target1Activities) t1Map.set(ta.id, ta);
    const t2Map = new Map<number, TargetActivity>();
    for (const ta of target2Activities) t2Map.set(ta.id, ta);

    for (const row of flatRows) {
      const y = HEADER_HEIGHT + row.rowIndex * ROW_HEIGHT + offsetY;
      if (y < HEADER_HEIGHT - ROW_HEIGHT || y > visibleHeight + ROW_HEIGHT) continue;

      if (row.type === "group") {
        ctx.fillStyle = COLORS.groupBg;
        ctx.fillRect(0, y, visibleWidth, ROW_HEIGHT);
        ctx.fillStyle = COLORS.headerTextBold;
        ctx.font = "bold 10px 'DM Sans', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(row.group || "", 8, y + ROW_HEIGHT / 2 + 3);
        continue;
      }

      const act = row.activity!;

      // Alternating row background
      if (row.rowIndex % 2 === 1) {
        ctx.fillStyle = COLORS.rowAltBg;
        ctx.fillRect(0, y, visibleWidth, ROW_HEIGHT);
      }

      // Selected row highlight
      if (act.id === selectedActivityId) {
        ctx.fillStyle = COLORS.selectedBg;
        ctx.fillRect(0, y, visibleWidth, ROW_HEIGHT);
      }

      // Row divider
      ctx.strokeStyle = COLORS.gridLine;
      ctx.beginPath();
      ctx.moveTo(0, y + ROW_HEIGHT);
      ctx.lineTo(visibleWidth, y + ROW_HEIGHT);
      ctx.stroke();

      if (!act.earlyStart || !act.earlyFinish) continue;

      let barX = daysBetween(rangeStart, act.earlyStart) * pixelsPerDay + offsetX;
      let barW = Math.max(daysBetween(act.earlyStart, act.earlyFinish) * pixelsPerDay, 3);
      const barY = y + BAR_Y_OFFSET;

      // If this activity is being resized, adjust bar visually
      if (dragState && (dragState.mode === "resize-left" || dragState.mode === "resize-right") && dragState.activityId === act.id) {
        const deltaX = dragState.currentX - dragState.startX;
        if (dragState.mode === "resize-right") {
          barW = Math.max(barW + deltaX, pixelsPerDay);
        } else {
          barX = barX + deltaX;
          barW = Math.max(barW - deltaX, pixelsPerDay);
        }
      }

      // ── Target 1 bar ──────────────────────────────────────────────────
      const t1Act = t1Map.get(act.id);
      if (t1Act) {
        const t1Start = toDate(t1Act.earlyStart);
        const t1Finish = toDate(t1Act.earlyFinish);
        if (t1Start && t1Finish) {
          const t1x = daysBetween(rangeStart, t1Start) * pixelsPerDay + offsetX;
          const t1w = Math.max(daysBetween(t1Start, t1Finish) * pixelsPerDay, 3);
          ctx.fillStyle = COLORS.target1Fill;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(t1x, barY + BAR_HEIGHT + 2, t1w, TARGET_BAR_HEIGHT);
          ctx.globalAlpha = 1;
        }
      }

      // ── Target 2 bar ──────────────────────────────────────────────────
      const t2Act = t2Map.get(act.id);
      if (t2Act) {
        const t2Start = toDate(t2Act.earlyStart);
        const t2Finish = toDate(t2Act.earlyFinish);
        if (t2Start && t2Finish) {
          const t2x = daysBetween(rangeStart, t2Start) * pixelsPerDay + offsetX;
          const t2w = Math.max(daysBetween(t2Start, t2Finish) * pixelsPerDay, 3);
          ctx.fillStyle = COLORS.target2Fill;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(t2x, barY + BAR_HEIGHT + 2 + (t1Act ? TARGET_BAR_HEIGHT + 1 : 0), t2w, TARGET_BAR_HEIGHT);
          ctx.globalAlpha = 1;
        }
      }

      // ── Activity bar ──────────────────────────────────────────────────

      if (act.duration === 0 || (act as any).activityType === "milestone") {
        // Milestone diamond — use custom barColor if set, else default
        const cx = barX;
        const cy = barY + BAR_HEIGHT / 2;
        const size = 6;
        const milestoneFill = act.barColor || COLORS.milestone;
        ctx.fillStyle = milestoneFill;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();
        // Stroke for visibility
        ctx.strokeStyle = milestoneFill;
        ctx.lineWidth = 1;
        ctx.stroke();
        barRects.push({ activityId: act.id, x: cx - size, y: cy - size, w: size * 2, h: size * 2, isMilestone: true });

        // Label above milestone
        ctx.fillStyle = ganttFontColor || COLORS.labelText;
        ctx.font = `${ganttFontSize}px '${ganttFontFamily}', sans-serif`;
        ctx.textAlign = "left";
        ctx.fillText(act.name, cx + size + 4, cy + 3);
      } else {
        // Determine bar color: custom > critical/non-critical default
        const barFillColor = act.barColor || (act.isCritical ? COLORS.criticalFill : COLORS.normalFill);
        const barStrokeColor = act.barColor
          ? (act.barColor + "cc") // slightly darker for border
          : (act.isCritical ? COLORS.critical : COLORS.normal);

        // Bar background
        const radius = 3;
        ctx.fillStyle = barFillColor;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, BAR_HEIGHT, radius);
        ctx.fill();

        // Progress fill
        const pct = parseFloat(act.percentComplete) || 0;
        if (pct > 0) {
          const progressW = barW * (pct / 100);
          ctx.fillStyle = COLORS.progress;
          ctx.globalAlpha = 0.4;
          ctx.beginPath();
          ctx.roundRect(barX, barY, progressW, BAR_HEIGHT, radius);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Bar border
        const isHovered = hoveredActivity === act.id;
        const isDropCandidate = dropTarget?.activityId === act.id;
        ctx.strokeStyle = isDropCandidate ? COLORS.connectLineValid
          : isHovered ? "#000"
          : barStrokeColor;
        ctx.lineWidth = isHovered || isDropCandidate ? 2 : 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, BAR_HEIGHT, radius);
        ctx.stroke();
        ctx.lineWidth = 1;

        // Activity label ABOVE the bar
        ctx.fillStyle = ganttFontColor || COLORS.labelText;
        ctx.font = `${ganttFontSize}px '${ganttFontFamily}', sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        const labelMaxWidth = Math.max(barW, 120); // Allow label to extend beyond short bars
        const charWidth = ganttFontSize * 0.6;
        const maxChars = Math.floor(labelMaxWidth / charWidth);
        const label = act.name.length > maxChars ? act.name.slice(0, maxChars) + "\u2026" : act.name;
        ctx.fillText(label, barX, barY - 2);
        ctx.textBaseline = "alphabetic";

        // ── Connector handles (show on hover) ────────────────────────────
        if (isHovered && !dragState) {
          // Left handle (Start)
          const lhX = barX;
          const lhY = barY + BAR_HEIGHT / 2;
          ctx.fillStyle = COLORS.handleFill;
          ctx.strokeStyle = COLORS.handleStroke;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(lhX, lhY, HANDLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(lhX + 2, lhY);
          ctx.lineTo(lhX - 2, lhY - 3);
          ctx.lineTo(lhX - 2, lhY + 3);
          ctx.closePath();
          ctx.fill();

          // Right handle (Finish)
          const rhX = barX + barW;
          const rhY = barY + BAR_HEIGHT / 2;
          ctx.fillStyle = COLORS.handleFill;
          ctx.strokeStyle = COLORS.handleStroke;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(rhX, rhY, HANDLE_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.moveTo(rhX - 2, rhY);
          ctx.lineTo(rhX + 2, rhY - 3);
          ctx.lineTo(rhX + 2, rhY + 3);
          ctx.closePath();
          ctx.fill();
        }

        barRects.push({ activityId: act.id, x: barX, y: barY, w: barW, h: BAR_HEIGHT, isMilestone: false });
      }
    }

    barRectsRef.current = barRects;

    // ── Draw dependency arrows (toggleable) ─────────────────────────────

    if (showArrows) {
      for (const rel of relationships) {
        const predRow = activityRowMap.get(rel.predecessorId);
        const succRow = activityRowMap.get(rel.successorId);
        if (predRow === undefined || succRow === undefined) continue;

        const predAct = activities.find((a) => a.id === rel.predecessorId);
        const succAct = activities.find((a) => a.id === rel.successorId);
        if (!predAct?.earlyStart || !predAct?.earlyFinish || !succAct?.earlyStart || !succAct?.earlyFinish) continue;

        const predY = HEADER_HEIGHT + predRow * ROW_HEIGHT + offsetY;
        const succY = HEADER_HEIGHT + succRow * ROW_HEIGHT + offsetY;

        const predBarX = daysBetween(rangeStart, predAct.earlyStart) * pixelsPerDay + offsetX;
        const predBarEnd = daysBetween(rangeStart, predAct.earlyFinish) * pixelsPerDay + offsetX;
        const succBarX = daysBetween(rangeStart, succAct.earlyStart) * pixelsPerDay + offsetX;
        const succBarEnd = daysBetween(rangeStart, succAct.earlyFinish) * pixelsPerDay + offsetX;

        let startX: number, startY: number, endX: number, endY: number;

        switch (rel.relationshipType) {
          case "FS":
            startX = predBarEnd; startY = predY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            endX = succBarX; endY = succY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            break;
          case "SS":
            startX = predBarX; startY = predY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            endX = succBarX; endY = succY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            break;
          case "FF":
            startX = predBarEnd; startY = predY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            endX = succBarEnd; endY = succY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            break;
          case "SF":
            startX = predBarX; startY = predY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            endX = succBarEnd; endY = succY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            break;
          default:
            startX = predBarEnd; startY = predY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
            endX = succBarX; endY = succY + BAR_Y_OFFSET + BAR_HEIGHT / 2;
        }

        const isCriticalRel = predAct.isCritical && succAct.isCritical;
        ctx.strokeStyle = isCriticalRel ? COLORS.arrowCritical : COLORS.arrow;
        ctx.fillStyle = isCriticalRel ? COLORS.arrowCritical : COLORS.arrow;
        ctx.lineWidth = 1.5;

        const midX = startX + 8;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(midX, startY);
        ctx.lineTo(midX, endY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - ARROW_HEAD_SIZE, endY - ARROW_HEAD_SIZE);
        ctx.lineTo(endX - ARROW_HEAD_SIZE, endY + ARROW_HEAD_SIZE);
        ctx.closePath();
        ctx.fill();
      }
    }

    // ── Draw drag-to-connect line ──────────────────────────────────────

    if (dragState && dragState.mode === "connect") {
      ctx.strokeStyle = dropTarget ? COLORS.connectLineValid : COLORS.connectLine;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.moveTo(dragState.startX, dragState.startY);

      const midX = dragState.startX + (dragState.fromEdge === "finish" ? 10 : -10);
      ctx.lineTo(midX, dragState.startY);
      ctx.lineTo(midX, dragState.currentY);
      ctx.lineTo(dragState.currentX, dragState.currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrow head at cursor
      const dx = dragState.currentX - midX;
      const angle = Math.atan2(0, dx);
      ctx.fillStyle = dropTarget ? COLORS.connectLineValid : COLORS.connectLine;
      ctx.beginPath();
      ctx.moveTo(dragState.currentX, dragState.currentY);
      ctx.lineTo(
        dragState.currentX - ARROW_HEAD_SIZE * 2 * Math.cos(angle - Math.PI / 6),
        dragState.currentY - ARROW_HEAD_SIZE * 2 * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        dragState.currentX - ARROW_HEAD_SIZE * 2 * Math.cos(angle + Math.PI / 6),
        dragState.currentY - ARROW_HEAD_SIZE * 2 * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fill();

      // Drop target highlight
      if (dropTarget) {
        const targetBar = barRects.find((b) => b.activityId === dropTarget.activityId);
        if (targetBar) {
          const handleX = dropTarget.edge === "start" ? targetBar.x : targetBar.x + targetBar.w;
          const handleY = targetBar.y + targetBar.h / 2;
          ctx.fillStyle = COLORS.connectLineValid;
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.arc(handleX, handleY, HANDLE_RADIUS + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          // Show relationship type label
          const fromEdge = dragState.fromEdge;
          const toEdge = dropTarget.edge;
          let relLabel: string;
          if (fromEdge === "finish" && toEdge === "start") relLabel = "FS";
          else if (fromEdge === "finish" && toEdge === "finish") relLabel = "FF";
          else if (fromEdge === "start" && toEdge === "start") relLabel = "SS";
          else relLabel = "SF";

          ctx.fillStyle = COLORS.connectLineValid;
          ctx.font = "bold 11px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(relLabel, handleX, handleY - 14);
        }
      }
    }

    // ── Resize preview indicator ────────────────────────────────────────

    if (dragState && (dragState.mode === "resize-left" || dragState.mode === "resize-right")) {
      const deltaX = dragState.currentX - dragState.startX;
      const deltaDays = Math.round(deltaX / pixelsPerDay);
      let newDuration: number;
      if (dragState.mode === "resize-right") {
        newDuration = Math.max(1, dragState.originalDuration + deltaDays);
      } else {
        newDuration = Math.max(1, dragState.originalDuration - deltaDays);
      }

      // Duration label near cursor
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      const labelW = 60;
      const labelH = 22;
      const lx = dragState.currentX - labelW / 2;
      const ly = dragState.currentY - 32;
      ctx.beginPath();
      ctx.roundRect(lx, ly, labelW, labelH, 4);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px 'DM Sans', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${newDuration}d`, dragState.currentX, ly + labelH / 2);
      ctx.textBaseline = "alphabetic";
    }

    // ── Data Date line (solid BLUE) ────────────────────────────────────

    if (showDataDateLine && dataDate) {
      const ddX = daysBetween(rangeStart, dataDate) * pixelsPerDay + offsetX;
      if (ddX > 0 && ddX < visibleWidth) {
        ctx.strokeStyle = COLORS.dataDateLine;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(ddX, HEADER_HEIGHT);
        ctx.lineTo(ddX, visibleHeight);
        ctx.stroke();

        // Label at top
        ctx.fillStyle = COLORS.dataDateLine;
        ctx.font = "bold 9px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DATA DATE", ddX, HEADER_HEIGHT - 4);

        // Small triangle indicator
        ctx.beginPath();
        ctx.moveTo(ddX - 5, HEADER_HEIGHT);
        ctx.lineTo(ddX + 5, HEADER_HEIGHT);
        ctx.lineTo(ddX, HEADER_HEIGHT + 6);
        ctx.closePath();
        ctx.fillStyle = COLORS.dataDateLine;
        ctx.fill();
      }
    }

    // ── Today line (dashed gray) ────────────────────────────────────────

    if (showTodayLine) {
      const today = new Date();
      const todayX = daysBetween(rangeStart, today) * pixelsPerDay + offsetX;
      if (todayX > 0 && todayX < visibleWidth) {
        ctx.strokeStyle = COLORS.todayLine;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(todayX, HEADER_HEIGHT);
        ctx.lineTo(todayX, visibleHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = COLORS.todayLine;
        ctx.font = "bold 9px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("TODAY", todayX, HEADER_HEIGHT - 4);
      }
    }
  }, [
    activities, relationships, target1Activities, target2Activities,
    flatRows, activityRowMap, rangeStart, rangeEnd, totalDays,
    pixelsPerDay, zoom, scrollLeft, scrollTop, containerWidth, containerHeight,
    selectedActivityId, showArrows, showDataDateLine, showTodayLine, dataDate,
    hoveredActivity, hoveredEdge, dragState, dropTarget,
  ]);

  // ─── Scroll handler ───────────────────────────────────────────────────────

  const handleScroll = () => {
    const el = containerRef.current;
    if (el) {
      setScrollLeft(el.scrollLeft);
      setScrollTop(el.scrollTop);
    }
  };

  // ─── Wheel zoom (Ctrl/Cmd + scroll to zoom timescale) ─────────────────────
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!onZoomChange) return;
      const delta = -e.deltaY * 0.01;
      const currentPpd = pixelsPerDay;
      const factor = Math.pow(1.15, delta);
      const newPpd = Math.max(0.5, Math.min(80, currentPpd * factor));
      onZoomChange(newPpd);
    }
  }, [pixelsPerDay, onZoomChange]);

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto relative"
      style={{ backgroundColor: COLORS.rowBg }}
      onScroll={handleScroll}
      onWheel={handleWheel}
    >
      {/* Interaction hints */}
      {hoveredActivity && hoveredEdge && !dragState && (
        <div className="absolute top-1 right-1 z-10 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none">
          {hoveredEdge === "start" || hoveredEdge === "finish"
            ? "Drag to resize · Alt+Drag to connect"
            : "Click to select · Double-click to edit"}
        </div>
      )}
      {dragState?.mode === "connect" && (
        <div className="absolute top-1 right-1 z-10 bg-blue-600/90 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none">
          Drop on another bar edge to create relationship
        </div>
      )}
      {dragState?.mode?.startsWith("resize") && (
        <div className="absolute top-1 right-1 z-10 bg-amber-600/90 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none">
          Release to set new duration
        </div>
      )}
      <div style={{ width: Math.max(totalWidth, containerWidth), height: totalHeight, position: "relative" }}>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          className="absolute top-0 left-0"
          style={{ position: "sticky", top: 0, left: 0 }}
        />
      </div>
    </div>
  );
}
