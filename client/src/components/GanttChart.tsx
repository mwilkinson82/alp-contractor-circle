/**
 * GanttChart — Interactive canvas-based Gantt chart with:
 * - Activity bars (colored by critical path status)
 * - Toggleable dependency arrows
 * - Toggleable data date line (solid) and today line (dashed)
 * - Dual-target comparison overlay (Target 1 + Target 2 bars)
 * - Time scale headers (day/week/month)
 * - Click to select activity
 */
import { useMemo, useRef, useEffect, useState } from "react";

type ZoomLevel = "day" | "week" | "month";

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
  groupedActivities: GroupedActivities[];
  showArrows: boolean;
  showDataDateLine: boolean;
  showTodayLine: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 48;
const BAR_HEIGHT = 14;
const BAR_Y_OFFSET = 4;
const TARGET_BAR_HEIGHT = 5;
const GROUP_HEADER_HEIGHT = 24;
const ARROW_HEAD_SIZE = 4;

// Colors
const COLORS = {
  critical: "#ef4444",
  criticalFill: "#dc2626",
  normal: "#d4915c",
  normalFill: "#c9a96e",
  target1: "#6b7280",
  target1Fill: "#4b5563",
  target2: "#8b5cf6",
  target2Fill: "#7c3aed",
  milestone: "#eab308",
  progress: "#22c55e",
  arrow: "#9ca3af",
  arrowCritical: "#ef4444",
  todayLine: "#3b82f6",
  dataDateLine: "#f59e0b",
  gridLine: "rgba(255,255,255,0.04)",
  headerBg: "rgba(15,15,30,0.9)",
  headerText: "rgba(255,255,255,0.5)",
  headerTextBold: "rgba(255,255,255,0.7)",
  selectedBg: "rgba(212,145,92,0.08)",
  groupBg: "rgba(255,255,255,0.03)",
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
  groupedActivities,
  showArrows,
  showDataDateLine,
  showTodayLine,
}: GanttChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // ─── Compute layout ──────────────────────────────────────────────────────

  const pixelsPerDay = zoom === "day" ? 40 : zoom === "week" ? 14 : 4;

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

  // Activity ID -> row index
  const activityRowMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of flatRows) {
      if (row.type === "activity" && row.activity) {
        map.set(row.activity.id, row.rowIndex);
      }
    }
    return map;
  }, [flatRows]);

  // Date range — include all activities, targets, and data date
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

  const totalWidth = totalDays * pixelsPerDay;
  const totalHeight = HEADER_HEIGHT + flatRows.length * ROW_HEIGHT;

  // ─── Resize observer ─────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) setContainerWidth(entry.contentRect.width);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ─── Canvas rendering ─────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const visibleWidth = containerWidth;
    const visibleHeight = containerRef.current?.clientHeight || 600;

    canvas.width = visibleWidth * dpr;
    canvas.height = visibleHeight * dpr;
    canvas.style.width = `${visibleWidth}px`;
    canvas.style.height = `${visibleHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, visibleWidth, visibleHeight);

    const offsetX = -scrollLeft;
    const offsetY = -scrollTop;

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
          ctx.fillStyle = COLORS.headerText;
          ctx.font = "10px 'DM Sans', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(formatDay(current), x + pixelsPerDay / 2, HEADER_HEIGHT - 6);
          ctx.fillStyle = current.getDay() === 0 || current.getDay() === 6
            ? "rgba(239,68,68,0.4)" : COLORS.headerText;
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
    } else if (zoom === "week") {
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
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(0, HEADER_HEIGHT);
    ctx.lineTo(visibleWidth, HEADER_HEIGHT);
    ctx.stroke();

    // ── Draw rows ───────────────────────────────────────────────────────

    // Build target lookup maps for fast access
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
        continue;
      }

      const act = row.activity!;

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

      const barX = daysBetween(rangeStart, act.earlyStart) * pixelsPerDay + offsetX;
      const barW = Math.max(daysBetween(act.earlyStart, act.earlyFinish) * pixelsPerDay, 3);
      const barY = y + BAR_Y_OFFSET;

      // ── Target 1 bar (gray, below current bar) ─────────────────────
      const t1Act = t1Map.get(act.id);
      if (t1Act) {
        const t1Start = toDate(t1Act.earlyStart);
        const t1Finish = toDate(t1Act.earlyFinish);
        if (t1Start && t1Finish) {
          const t1x = daysBetween(rangeStart, t1Start) * pixelsPerDay + offsetX;
          const t1w = Math.max(daysBetween(t1Start, t1Finish) * pixelsPerDay, 3);
          ctx.fillStyle = COLORS.target1Fill;
          ctx.globalAlpha = 0.45;
          ctx.fillRect(t1x, barY + BAR_HEIGHT + 2, t1w, TARGET_BAR_HEIGHT);
          ctx.globalAlpha = 1;
        }
      }

      // ── Target 2 bar (purple, below target 1) ──────────────────────
      const t2Act = t2Map.get(act.id);
      if (t2Act) {
        const t2Start = toDate(t2Act.earlyStart);
        const t2Finish = toDate(t2Act.earlyFinish);
        if (t2Start && t2Finish) {
          const t2x = daysBetween(rangeStart, t2Start) * pixelsPerDay + offsetX;
          const t2w = Math.max(daysBetween(t2Start, t2Finish) * pixelsPerDay, 3);
          ctx.fillStyle = COLORS.target2Fill;
          ctx.globalAlpha = 0.45;
          ctx.fillRect(t2x, barY + BAR_HEIGHT + 2 + (t1Act ? TARGET_BAR_HEIGHT + 1 : 0), t2w, TARGET_BAR_HEIGHT);
          ctx.globalAlpha = 1;
        }
      }

      // ── Activity bar ──────────────────────────────────────────────────

      if (act.duration === 0) {
        // Milestone diamond
        const cx = barX;
        const cy = barY + BAR_HEIGHT / 2;
        const size = 6;
        ctx.fillStyle = COLORS.milestone;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();
      } else {
        // Bar background
        const radius = 3;
        ctx.fillStyle = act.isCritical ? COLORS.criticalFill : COLORS.normalFill;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, BAR_HEIGHT, radius);
        ctx.fill();

        // Progress fill
        const pct = parseFloat(act.percentComplete) || 0;
        if (pct > 0) {
          const progressW = barW * (pct / 100);
          ctx.fillStyle = COLORS.progress;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.roundRect(barX, barY, progressW, BAR_HEIGHT, radius);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // Bar border
        ctx.strokeStyle = act.isCritical ? COLORS.critical : COLORS.normal;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, BAR_HEIGHT, radius);
        ctx.stroke();

        // Activity label on bar
        if (barW > 60) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = "bold 9px 'DM Sans', sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const maxChars = Math.floor(barW / 6);
          const label = act.name.length > maxChars ? act.name.slice(0, maxChars) + "…" : act.name;
          ctx.fillText(label, barX + 4, barY + BAR_HEIGHT / 2);
          ctx.textBaseline = "alphabetic";
        }
      }
    }

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
            startX = predBarEnd; startY = predY + ROW_HEIGHT / 2;
            endX = succBarX; endY = succY + ROW_HEIGHT / 2;
            break;
          case "SS":
            startX = predBarX; startY = predY + ROW_HEIGHT / 2;
            endX = succBarX; endY = succY + ROW_HEIGHT / 2;
            break;
          case "FF":
            startX = predBarEnd; startY = predY + ROW_HEIGHT / 2;
            endX = succBarEnd; endY = succY + ROW_HEIGHT / 2;
            break;
          case "SF":
            startX = predBarX; startY = predY + ROW_HEIGHT / 2;
            endX = succBarEnd; endY = succY + ROW_HEIGHT / 2;
            break;
          default:
            startX = predBarEnd; startY = predY + ROW_HEIGHT / 2;
            endX = succBarX; endY = succY + ROW_HEIGHT / 2;
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

    // ── Data Date line (solid amber, toggleable) ────────────────────────

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

        // Label
        ctx.fillStyle = COLORS.dataDateLine;
        ctx.font = "bold 9px 'DM Sans', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("DATA DATE", ddX, HEADER_HEIGHT - 4);
      }
    }

    // ── Today line (dashed blue, toggleable, default OFF) ───────────────

    if (showTodayLine) {
      const today = new Date();
      const todayX = daysBetween(rangeStart, today) * pixelsPerDay + offsetX;
      if (todayX > 0 && todayX < visibleWidth) {
        ctx.strokeStyle = COLORS.todayLine;
        ctx.lineWidth = 2;
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
    pixelsPerDay, zoom, scrollLeft, scrollTop, containerWidth,
    selectedActivityId, showArrows, showDataDateLine, showTodayLine, dataDate,
  ]);

  // ─── Click handler ────────────────────────────────────────────────────────

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + scrollTop - HEADER_HEIGHT;
    const rowIndex = Math.floor(y / ROW_HEIGHT);
    const row = flatRows.find((r) => r.rowIndex === rowIndex);
    if (row?.type === "activity" && row.activity) {
      onSelectActivity(row.activity.id === selectedActivityId ? null : row.activity.id);
    }
  };

  // ─── Scroll handler ───────────────────────────────────────────────────────

  const handleScroll = () => {
    const el = containerRef.current;
    if (el) {
      setScrollLeft(el.scrollLeft);
      setScrollTop(el.scrollTop);
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-auto relative"
      onScroll={handleScroll}
    >
      <div style={{ width: Math.max(totalWidth, containerWidth), height: totalHeight, position: "relative" }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="absolute top-0 left-0 cursor-pointer"
          style={{ position: "sticky", top: 0, left: 0 }}
        />
      </div>
    </div>
  );
}
