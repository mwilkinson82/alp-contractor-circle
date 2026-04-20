/**
 * ScaleCalibrationPrompt v8
 *
 * Three modes:
 *   "all"     — Known scale from title block → pick from dropdown, applies to all sheets
 *   "groups"  — Different known scales by discipline (Arch/Struct/MEP/Civil)
 *   "measure" — Scale NOT noted on drawings or you want to set your own custom scale
 *               → click two points on a drawing, type the real-world distance, system calculates px/ft
 *
 * v8 improvements:
 *   - Reformatted "Known Scale" tab: scale + paper size dropdowns stack vertically, stay inside modal
 *   - Sheet dropdown in Measure mode is large, prominent, high-contrast with amber border
 *   - "Shift+drag to pan" is a prominent highlighted callout bar, not tiny gray text
 *   - Added fullscreen mode button — expands drawing viewer to fill the entire screen for precise measurement
 *   - Improved overall spacing and readability
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Ruler, CheckCircle2, Layers, Crosshair, RotateCcw, ZoomIn, ZoomOut, Maximize2, Minimize2, Move, MousePointer2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DRAWING_SCALES = [
  { label: '1/4" = 1\'-0"  (most common)', drawingInchesPerFt: 0.25 },
  { label: '1/8" = 1\'-0"',                drawingInchesPerFt: 0.125 },
  { label: '3/16" = 1\'-0"',               drawingInchesPerFt: 0.1875 },
  { label: '3/8" = 1\'-0"',                drawingInchesPerFt: 0.375 },
  { label: '1/2" = 1\'-0"',                drawingInchesPerFt: 0.5 },
  { label: '3/4" = 1\'-0"',                drawingInchesPerFt: 0.75 },
  { label: '1" = 1\'-0"',                  drawingInchesPerFt: 1.0 },
  { label: '1" = 10\'',                     drawingInchesPerFt: 0.1 },
  { label: '1" = 20\'',                     drawingInchesPerFt: 0.05 },
  { label: '1" = 30\'',                     drawingInchesPerFt: 1 / 30 },
  { label: '1" = 40\'',                     drawingInchesPerFt: 0.025 },
  { label: '1" = 50\'',                     drawingInchesPerFt: 0.02 },
  { label: '1" = 100\'',                    drawingInchesPerFt: 0.01 },
  { label: '1:100  (metric)',               drawingInchesPerFt: 0.1181 },
  { label: '1:200  (metric)',               drawingInchesPerFt: 0.05906 },
  { label: '1:500  (metric)',               drawingInchesPerFt: 0.02362 },
];

export const PAPER_SIZES = [
  { label: '24" × 36"  (Arch D — most common)', dpi: 150 },
  { label: '30" × 42"  (Arch E1)',               dpi: 150 },
  { label: '36" × 48"  (Arch E)',                dpi: 150 },
  { label: '11" × 17"  (Tabloid)',               dpi: 150 },
  { label: '8.5" × 11"  (Letter)',               dpi: 150 },
  { label: '18" × 24"  (Arch C)',                dpi: 150 },
];

const DISCIPLINES = [
  { key: "arch",   label: "Architectural",  color: "text-blue-300",   prefixes: ["a-", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "arch"] },
  { key: "struct", label: "Structural",     color: "text-orange-300", prefixes: ["s-", "s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "str"] },
  { key: "mep",    label: "MEP / Plumbing", color: "text-green-300",  prefixes: ["m-", "m0", "m1", "m2", "m3", "p-", "p0", "p1", "p2", "e-", "e0", "e1", "e2", "mep", "mech", "plum", "elec"] },
  { key: "civil",  label: "Civil / Site",   color: "text-purple-300", prefixes: ["c-", "c0", "c1", "c2", "c3", "c4", "civ", "site", "l-", "l0", "l1"] },
  { key: "other",  label: "Other / General",color: "text-white/60",   prefixes: [] },
];

const MEASURE_UNITS = [
  { value: "ft", label: "Feet" },
  { value: "in", label: "Inches" },
  { value: "m",  label: "Meters" },
  { value: "cm", label: "Centimeters" },
];

const ZOOM_LEVELS = [1, 1.5, 2.5, 4, 6];

function guessGroup(sheetName: string): string {
  const lower = (sheetName || "").toLowerCase().trim();
  for (const d of DISCIPLINES.filter(d => d.key !== "other")) {
    if (d.prefixes.some(p => lower.startsWith(p) || lower.includes(p))) return d.key;
  }
  return "other";
}

export function pxPerFt(scaleIdx: number, paperIdx: number): number {
  return DRAWING_SCALES[scaleIdx].drawingInchesPerFt * PAPER_SIZES[paperIdx].dpi;
}

/** Convert a measured px/unit ratio to px/ft for storage consistency */
function toPxPerFt(pxPerUnit: number, unit: string): number {
  switch (unit) {
    case "ft": return pxPerUnit;
    case "in": return pxPerUnit * 12;
    case "m":  return pxPerUnit / 3.28084;
    case "cm": return pxPerUnit / 0.328084;
    default: return pxPerUnit;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Sheet { id: number; sheetName?: string; pageNumber?: number; imageUrl?: string; }
export interface SheetScale { ratio: number; unit: string; method?: "measured" | "title_block"; }
interface Props {
  open: boolean;
  sheets: Sheet[];
  projectId: number;
  onComplete: (scales: Record<number, SheetScale>) => void;
  onSkipAll: () => void;
}
interface Point { x: number; y: number; }

// ── Scale row for dropdown modes ─────────────────────────────────────────────

function ScaleRow({
  label, color, count, scaleIdx, paperIdx, onScaleChange, onPaperChange,
}: {
  label: string; color: string; count: number;
  scaleIdx: number; paperIdx: number;
  onScaleChange: (i: number) => void; onPaperChange: (i: number) => void;
}) {
  return (
    <div className="space-y-2.5 p-3 rounded-lg bg-[#151a27] border border-white/10">
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
        <Badge variant="outline" className="border-white/20 text-white/50 text-xs ml-auto">
          {count} sheet{count !== 1 ? "s" : ""}
        </Badge>
      </div>
      {/* Scale dropdown — full width */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">Drawing Scale</label>
        <Select value={String(scaleIdx)} onValueChange={v => onScaleChange(Number(v))}>
          <SelectTrigger className="bg-[#0d1117] border-amber-500/30 text-white h-10 text-sm w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-white/10 max-h-64">
            {DRAWING_SCALES.map((s, i) => (
              <SelectItem key={i} value={String(i)} className="text-sm">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Paper size dropdown — full width */}
      <div>
        <label className="text-[10px] uppercase tracking-wider text-white/40 mb-1 block">Paper Size</label>
        <Select value={String(paperIdx)} onValueChange={v => onPaperChange(Number(v))}>
          <SelectTrigger className="bg-[#0d1117] border-amber-500/30 text-white h-10 text-sm w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1f2e] border-white/10">
            {PAPER_SIZES.map((p, i) => (
              <SelectItem key={i} value={String(i)} className="text-sm">{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ── Inline Measure Tool with zoom/pan/fullscreen ─────────────────────────────

function MeasureTool({
  sheet,
  onMeasured,
  isFullscreen,
  onToggleFullscreen,
}: {
  sheet: Sheet;
  onMeasured: (pxPerFtRatio: number) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const [step, setStep] = useState<"pick_p1" | "pick_p2" | "enter_dist">("pick_p1");
  const [p1, setP1] = useState<Point | null>(null);
  const [p2, setP2] = useState<Point | null>(null);
  const [pixelDist, setPixelDist] = useState(0);
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState("ft");
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Zoom/pan state
  const [zoom, setZoom] = useState(1);
  const [panPos, setPanPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  // Mode: "pan" = drag to navigate, "draw" = click to place points
  const [interactMode, setInteractMode] = useState<"pan" | "draw">("draw");

  // Touch pinch state
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    if (step === "enter_dist") setTimeout(() => inputRef.current?.focus(), 80);
  }, [step]);

  const zoomIn = useCallback((cursorX?: number, cursorY?: number) => {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    const cx = cursorX ?? (rect ? rect.left + rect.width / 2 : 0);
    const cy = cursorY ?? (rect ? rect.top + rect.height / 2 : 0);
    setZoom(prev => {
      const next = Math.min(prev * 1.5, 8);
      if (next <= 1.01) { setPanPos({ x: 0, y: 0 }); return next; }
      if (!container || !rect) return next;
      const cw = rect.width, ch = rect.height;
      const imgX = (cx - rect.left - cw / 2 - panPos.x) / prev;
      const imgY = (cy - rect.top - ch / 2 - panPos.y) / prev;
      setPanPos({ x: cx - rect.left - cw / 2 - imgX * next, y: cy - rect.top - ch / 2 - imgY * next });
      return next;
    });
  }, [panPos]);

  const zoomOut = useCallback((cursorX?: number, cursorY?: number) => {
    const container = containerRef.current;
    const rect = container?.getBoundingClientRect();
    const cx = cursorX ?? (rect ? rect.left + rect.width / 2 : 0);
    const cy = cursorY ?? (rect ? rect.top + rect.height / 2 : 0);
    setZoom(prev => {
      const next = Math.max(prev / 1.5, 1);
      if (next <= 1.01) { setPanPos({ x: 0, y: 0 }); return 1; }
      if (!container || !rect) return next;
      const cw = rect.width, ch = rect.height;
      const imgX = (cx - rect.left - cw / 2 - panPos.x) / prev;
      const imgY = (cy - rect.top - ch / 2 - panPos.y) / prev;
      setPanPos({ x: cx - rect.left - cw / 2 - imgX * next, y: cy - rect.top - ch / 2 - imgY * next });
      return next;
    });
  }, [panPos]);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPanPos({ x: 0, y: 0 });
  }, []);

  // Wheel zoom — cursor-centered
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) zoomIn(e.clientX, e.clientY);
    else zoomOut(e.clientX, e.clientY);
  }, [zoomIn, zoomOut]);

  // Mouse down: in pan mode always drag; in draw mode only drag with shift/middle/right
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const shouldPan = interactMode === "pan" || e.button === 1 || e.button === 2 || e.shiftKey;
    if (!shouldPan) return;
    if (zoom <= 1 && interactMode !== "pan") return;
    e.preventDefault();
    setIsDragging(true);
    dragMoved.current = false;
    setDragStart({ x: e.clientX - panPos.x, y: e.clientY - panPos.y });
  }, [interactMode, zoom, panPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    dragMoved.current = true;
    setPanPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for pinch-to-zoom and single-finger pan
  const lastTouchPos = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastTouchPos.current = null;
    } else if (e.touches.length === 1 && zoom > 1) {
      lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const delta = dist - lastTouchDist.current;
      if (Math.abs(delta) > 10) {
        if (delta > 0) zoomIn(midX, midY); else zoomOut(midX, midY);
        lastTouchDist.current = dist;
      }
    } else if (e.touches.length === 1 && lastTouchPos.current && zoom > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - lastTouchPos.current.x;
      const dy = e.touches[0].clientY - lastTouchPos.current.y;
      setPanPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastTouchPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, [zoomIn, zoomOut, zoom]);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = null;
    lastTouchPos.current = null;
  }, []);

  // Convert screen click to image-space coordinates (accounting for zoom/pan)
  const toImageCoords = useCallback((e: React.MouseEvent<HTMLDivElement>): Point => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const cw = rect.width, ch = rect.height;
    const nw = img.naturalWidth || cw, nh = img.naturalHeight || ch;
    const imgAspect = nw / nh, ctnAspect = cw / ch;
    let iw: number, ih: number;
    if (imgAspect > ctnAspect) { iw = cw; ih = cw / imgAspect; }
    else { ih = ch; iw = ch * imgAspect; }
    const ox = (cw - iw) / 2, oy = (ch - ih) / 2;
    const centerX = cw / 2, centerY = ch / 2;
    const ptx = (cx - centerX - panPos.x) / zoom + centerX;
    const pty = (cy - centerY - panPos.y) / zoom + centerY;
    return {
      x: Math.max(0, Math.min(nw, ((ptx - ox) / iw) * nw)),
      y: Math.max(0, Math.min(nh, ((pty - oy) / ih) * nh)),
    };
  }, [zoom, panPos]);

  // Convert image-space coords to screen-space container coords (accounting for zoom/pan)
  const toContainerCoords = useCallback((p: Point): Point => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cw = rect.width, ch = rect.height;
    const nw = img.naturalWidth || cw, nh = img.naturalHeight || ch;
    const imgAspect = nw / nh, ctnAspect = cw / ch;
    let iw: number, ih: number;
    if (imgAspect > ctnAspect) { iw = cw; ih = cw / imgAspect; }
    else { ih = ch; iw = ch * imgAspect; }
    const ox = (cw - iw) / 2, oy = (ch - ih) / 2;
    const ptx = ox + (p.x / nw) * iw;
    const pty = oy + (p.y / nh) * ih;
    const centerX = cw / 2, centerY = ch / 2;
    return {
      x: centerX + (ptx - centerX) * zoom + panPos.x,
      y: centerY + (pty - centerY) * zoom + panPos.y,
    };
  }, [zoom, panPos]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (dragMoved.current) return;
    if (interactMode === "pan") return; // pan mode — don't place points
    if (step === "pick_p1") {
      setP1(toImageCoords(e));
      setStep("pick_p2");
    } else if (step === "pick_p2") {
      const pt = toImageCoords(e);
      setP2(pt);
      if (p1) {
        const dx = pt.x - p1.x, dy = pt.y - p1.y;
        setPixelDist(Math.sqrt(dx * dx + dy * dy));
      }
      setStep("enter_dist");
    }
  }, [step, p1, toImageCoords, interactMode]);

  const handleConfirm = () => {
    const val = parseFloat(distance);
    if (!val || val <= 0 || pixelDist <= 0) return;
    const pxPerUnit = pixelDist / val;
    const ratio = toPxPerFt(pxPerUnit, unit);
    onMeasured(ratio);
  };

  const handleReset = () => {
    setStep("pick_p1");
    setP1(null); setP2(null);
    setDistance(""); setPixelDist(0);
  };

  const c1 = p1 ? toContainerCoords(p1) : null;
  const c2 = p2 ? toContainerCoords(p2) : null;

  // Dynamic height: normal = 380px, fullscreen = fill available space
  const viewerHeight = isFullscreen ? "calc(100vh - 240px)" : "380px";

  // Cursor based on mode and state
  const getCursor = () => {
    if (isDragging) return "grabbing";
    if (interactMode === "pan") return zoom > 1 ? "grab" : "default";
    if (step === "enter_dist") return "default";
    return "crosshair";
  };

  return (
    <div className="space-y-3">
      {/* Toolbar: mode toggle + zoom controls + fullscreen */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pan / Draw mode toggle */}
        <div className="flex items-center rounded-lg border border-white/15 overflow-hidden">
          <button
            type="button"
            onClick={() => setInteractMode("draw")}
            title="Draw mode — click to place measurement points"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
              interactMode === "draw"
                ? "bg-amber-500/20 text-amber-300 border-r border-amber-500/30"
                : "bg-white/5 text-white/40 hover:text-white/60 border-r border-white/10"
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Draw
          </button>
          <button
            type="button"
            onClick={() => setInteractMode("pan")}
            title="Pan mode — drag to navigate the drawing"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all ${
              interactMode === "pan"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-white/5 text-white/40 hover:text-white/60"
            }`}
          >
            <Move className="w-3.5 h-3.5" />
            Pan
          </button>
        </div>

        {/* Mode hint */}
        {interactMode === "pan" ? (
          <span className="text-blue-300/70 text-xs">Drag to navigate · Switch to Draw to place points</span>
        ) : zoom > 1 ? (
          <span className="text-amber-300/70 text-xs">Switch to Pan to navigate · Click to place points</span>
        ) : (
          <span className="text-white/40 text-xs">Scroll to zoom · Click to place measurement points</span>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => zoomOut()} disabled={zoom <= 1}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/70" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white/60 text-xs font-mono min-w-[3.5rem] text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomIn()} disabled={zoom >= 8}
            className="p-1.5 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/70" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          {zoom > 1 && (
            <button type="button" onClick={resetZoom}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/70 ml-1" title="Reset zoom">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-1.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 ml-1"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen — zoom in for precision"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Drawing viewer */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-[#0d1117] border border-white/10"
        style={{ height: viewerHeight, cursor: getCursor(), touchAction: "none" }}
        onClick={handleClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={e => e.preventDefault()}
      >
        {sheet.imageUrl ? (
          <img
            ref={imgRef}
            src={sheet.imageUrl}
            alt={sheet.sheetName || `Sheet ${sheet.pageNumber}`}
            className="w-full h-full object-contain select-none"
            draggable={false}
            style={{
              transform: `translate(${panPos.x}px, ${panPos.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
            No preview available — upload a drawing first
          </div>
        )}
        {/* Overlay line + points */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
          {c1 && c2 && (
            <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
          )}
          {c1 && (
            <>
              <circle cx={c1.x} cy={c1.y} r="7" fill="#f59e0b" opacity="0.9" />
              <text x={c1.x + 10} y={c1.y - 6} fill="#f59e0b" fontSize="12" fontWeight="bold">A</text>
            </>
          )}
          {c2 && (
            <>
              <circle cx={c2.x} cy={c2.y} r="7" fill="#10b981" opacity="0.9" />
              <text x={c2.x + 10} y={c2.y - 6} fill="#10b981" fontSize="12" fontWeight="bold">B</text>
            </>
          )}
        </svg>
      </div>

      {/* Step instructions */}
      {step === "pick_p1" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <p className="text-amber-300 text-sm font-semibold">Step 1: Click the start of a known dimension</p>
          <p className="text-white/50 text-xs mt-0.5">Pick a wall, door, room width — anything you know the real length of. Zoom in for accuracy.</p>
        </div>
      )}
      {step === "pick_p2" && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
          <p className="text-emerald-300 text-sm font-semibold">Step 2: Click the other end of that dimension</p>
          <p className="text-white/50 text-xs mt-0.5">Click the opposite end of the same wall, door, or measurement.</p>
        </div>
      )}
      {step === "enter_dist" && (
        <div className="space-y-2">
          <div className="bg-[#151a27] border border-white/10 rounded-lg px-4 py-3">
            <p className="text-white text-sm font-medium">
              Measured: <span className="text-amber-400 font-mono">{Math.round(pixelDist)}px</span> on screen
            </p>
            <p className="text-white/50 text-xs mt-0.5">Enter the real-world distance between those two points:</p>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              step="any"
              min="0.01"
              value={distance}
              onChange={e => setDistance(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirm()}
              placeholder="e.g. 20"
              className="flex-1 bg-[#0d1117] border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
            />
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="w-32 bg-[#0d1117] border-white/20 text-white h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1f2e] border-white/10">
                {MEASURE_UNITS.map(u => (
                  <SelectItem key={u.value} value={u.value} className="text-sm">{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10 px-5"
              disabled={!distance || parseFloat(distance) <= 0}
              onClick={handleConfirm}
            >
              Apply Scale
            </Button>
          </div>
          <button type="button" onClick={handleReset} className="text-white/40 hover:text-white/60 text-xs flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Start over
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScaleCalibrationPrompt({ open, sheets, projectId, onComplete, onSkipAll }: Props) {
  const [mode, setMode] = useState<"all" | "groups" | "measure">("all");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // "all" mode state
  const [allScaleIdx, setAllScaleIdx] = useState(0);
  const [allPaperIdx, setAllPaperIdx] = useState(0);

  // "groups" mode state
  const [groupScales, setGroupScales] = useState<Record<string, { scaleIdx: number; paperIdx: number }>>(
    Object.fromEntries(DISCIPLINES.map(d => [d.key, { scaleIdx: 0, paperIdx: 0 }]))
  );

  // "measure" mode state
  const [measureSheetIdx, setMeasureSheetIdx] = useState(0);
  const [measuredRatio, setMeasuredRatio] = useState<number | null>(null);
  const [measureApplyTo, setMeasureApplyTo] = useState<"all" | string>("all");

  // ── Remember last-used scale ────────────────────────────────────────────────
  const prefQuery = trpc.takeoff.getScalePreference.useQuery(undefined, { enabled: open });
  const savePrefMutation = trpc.takeoff.saveScalePreference.useMutation();
  const bulkScaleMutation = trpc.takeoff.bulkSaveSheetScale.useMutation();

  useEffect(() => {
    if (prefQuery.data) {
      const { lastScaleIdx, lastPaperIdx } = prefQuery.data;
      if (lastScaleIdx >= 0 && lastScaleIdx < DRAWING_SCALES.length) setAllScaleIdx(lastScaleIdx);
      if (lastPaperIdx >= 0 && lastPaperIdx < PAPER_SIZES.length) setAllPaperIdx(lastPaperIdx);
      setGroupScales(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = { scaleIdx: lastScaleIdx || 0, paperIdx: lastPaperIdx || 0 };
        }
        return next;
      });
    }
  }, [prefQuery.data]);

  const sheetGroups = useMemo(() => {
    const groups: Record<string, Sheet[]> = Object.fromEntries(DISCIPLINES.map(d => [d.key, []]));
    for (const sheet of sheets) {
      const g = guessGroup(sheet.sheetName || `Sheet ${sheet.pageNumber}`);
      groups[g].push(sheet);
    }
    return groups;
  }, [sheets]);

  const activeGroups = DISCIPLINES.filter(d => sheetGroups[d.key].length > 0);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      window.addEventListener("keydown", handleKeyDown, true);
      return () => window.removeEventListener("keydown", handleKeyDown, true);
    }
  }, [isFullscreen]);

  const handleApply = async () => {
    if (saving || done) return;
    setSaving(true);
    try {
      const scalesMap: Record<number, SheetScale> = {};

      if (mode === "measure" && measuredRatio) {
        const targetSheets = measureApplyTo === "all"
          ? sheets
          : sheetGroups[measureApplyTo] || sheets;

        await bulkScaleMutation.mutateAsync({
          projectId,
          sheetIds: targetSheets.map(s => s.id),
          scaleRatio: measuredRatio,
          scaleUnit: "ft",
        });
        for (const sheet of targetSheets) {
          scalesMap[sheet.id] = { ratio: measuredRatio, unit: "ft", method: "measured" };
        }
      } else if (mode === "all") {
        const ratio = pxPerFt(allScaleIdx, allPaperIdx);
        await bulkScaleMutation.mutateAsync({
          projectId,
          sheetIds: sheets.map(s => s.id),
          scaleRatio: ratio,
          scaleUnit: "ft",
        });
        for (const sheet of sheets) {
          scalesMap[sheet.id] = { ratio, unit: "ft", method: "title_block" };
        }
        savePrefMutation.mutate({ lastScaleIdx: allScaleIdx, lastPaperIdx: allPaperIdx });
      } else {
        for (const disc of DISCIPLINES) {
          const groupSheets = sheetGroups[disc.key];
          if (!groupSheets.length) continue;
          const { scaleIdx, paperIdx } = groupScales[disc.key];
          const ratio = pxPerFt(scaleIdx, paperIdx);
          await bulkScaleMutation.mutateAsync({
            projectId,
            sheetIds: groupSheets.map(s => s.id),
            scaleRatio: ratio,
            scaleUnit: "ft",
          });
          for (const sheet of groupSheets) {
            scalesMap[sheet.id] = { ratio, unit: "ft", method: "title_block" };
          }
        }
        const firstGroup = activeGroups[0];
        if (firstGroup) {
          const { scaleIdx, paperIdx } = groupScales[firstGroup.key];
          savePrefMutation.mutate({ lastScaleIdx: scaleIdx, lastPaperIdx: paperIdx });
        }
      }

      setDone(true);
      const appliedCount = Object.keys(scalesMap).length;
      toast.success(`Scale set for ${appliedCount} sheet${appliedCount !== 1 ? "s" : ""}`);
      setTimeout(() => onComplete(scalesMap), 400);
    } catch (err: any) {
      toast.error(`Failed to save scale: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && !saving) onSkipAll();
  };

  const handleMeasured = (ratio: number) => {
    setMeasuredRatio(ratio);
    toast.success("Scale calculated — hit 'Set Scale & Analyze' to apply.");
  };

  const measureSheet = sheets[measureSheetIdx] || sheets[0];

  // Fullscreen: use a fixed overlay instead of the dialog
  const dialogClasses = isFullscreen
    ? "!bg-[#1a1f2e] border-white/10 text-white max-w-none w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden"
    : `!bg-[#1a1f2e] border-white/10 text-white flex flex-col overflow-hidden ${mode === "measure" ? "max-w-3xl max-h-[92vh]" : "max-w-xl max-h-[85vh]"}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={dialogClasses}>
        {/* Fixed header */}
        <DialogHeader className="flex-shrink-0 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Ruler className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl text-white">Set Drawing Scale</DialogTitle>
              <DialogDescription className="text-white/60 text-sm mt-0.5">
                {sheets.length} sheet{sheets.length !== 1 ? "s" : ""} uploaded. Set the scale so the AI can calculate accurate quantities.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">

        {/* ── Mode toggle ── */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode("all"); setIsFullscreen(false); }}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
                mode === "all" ? "bg-amber-500/15 border-amber-500/50 text-amber-300" : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              <Ruler className="w-4 h-4" />
              <span>Known Scale</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode("groups"); setIsFullscreen(false); }}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
                mode === "groups" ? "bg-amber-500/15 border-amber-500/50 text-amber-300" : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>By Discipline</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("measure")}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
                mode === "measure" ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300" : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>Measure on Drawing</span>
            </button>
          </div>
          {/* Mode description */}
          {!isFullscreen && (
            <p className="text-white/40 text-xs px-1">
              {mode === "all" && "Scale is noted in the title block — pick it from the dropdown."}
              {mode === "groups" && "Different trades at different scales — set one per discipline."}
              {mode === "measure" && "Scale isn't noted on the drawings, isn't accurate, or you want to set your own custom scale."}
            </p>
          )}
        </div>

        {/* ── Content ── */}
        {mode === "all" && (
          <div className="space-y-3">
            <ScaleRow
              label="All Sheets"
              color="text-amber-300"
              count={sheets.length}
              scaleIdx={allScaleIdx}
              paperIdx={allPaperIdx}
              onScaleChange={setAllScaleIdx}
              onPaperChange={setAllPaperIdx}
            />
            <div className="bg-[#151a27] rounded-lg px-4 py-2.5 text-xs text-white/50">
              <span className="text-white/70 font-medium">{DRAWING_SCALES[allScaleIdx].label.split("(")[0].trim()}</span>
              {" on "}
              <span className="text-white/70 font-medium">{PAPER_SIZES[allPaperIdx].label.split("(")[0].trim()}</span>
              {" → "}
              <span className="text-amber-300 font-medium">{pxPerFt(allScaleIdx, allPaperIdx).toFixed(1)} px/ft</span>
            </div>
          </div>
        )}

        {mode === "groups" && (
          <div className="space-y-2">
            {activeGroups.map(disc => (
              <ScaleRow
                key={disc.key}
                label={`${disc.label}  (${sheetGroups[disc.key].map(s => s.sheetName || `Sheet ${s.pageNumber}`).slice(0, 3).join(", ")}${sheetGroups[disc.key].length > 3 ? "…" : ""})`}
                color={disc.color}
                count={sheetGroups[disc.key].length}
                scaleIdx={groupScales[disc.key].scaleIdx}
                paperIdx={groupScales[disc.key].paperIdx}
                onScaleChange={i => setGroupScales(prev => ({ ...prev, [disc.key]: { ...prev[disc.key], scaleIdx: i } }))}
                onPaperChange={i => setGroupScales(prev => ({ ...prev, [disc.key]: { ...prev[disc.key], paperIdx: i } }))}
              />
            ))}
          </div>
        )}

        {mode === "measure" && (
          <div className="space-y-3">
            {/* Sheet selector — prominent, large, high-contrast */}
            {sheets.length > 1 && (
              <div className="bg-[#151a27] border border-amber-500/30 rounded-lg p-3">
                <label className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2 block">
                  Select Sheet to Measure On
                </label>
                <Select value={String(measureSheetIdx)} onValueChange={v => { setMeasureSheetIdx(Number(v)); setMeasuredRatio(null); }}>
                  <SelectTrigger className="bg-[#0d1117] border-amber-500/40 text-white h-11 text-sm w-full font-medium">
                    <SelectValue />
                  </SelectTrigger>                  <SelectContent className="bg-[#1a1f2e] border-amber-500/20 max-h-64">                    {sheets.map((s, i) => (
                      <SelectItem key={s.id} value={String(i)} className="text-sm py-2">
                        {s.sheetName || `Sheet ${s.pageNumber || i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <MeasureTool
              key={measureSheet.id}
              sheet={measureSheet}
              onMeasured={handleMeasured}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(prev => !prev)}
            />

            {measuredRatio && (
              <div className="space-y-3">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-emerald-300 text-sm font-semibold">Scale calculated: {measuredRatio.toFixed(1)} px/ft</p>
                    <p className="text-white/50 text-xs">Choose which sheets to apply this scale to:</p>
                  </div>
                </div>

                {/* Apply-to selector: all sheets or specific discipline */}
                {activeGroups.length > 1 && (
                  <div className="bg-[#151a27] border border-white/10 rounded-lg p-3 space-y-2">
                    <p className="text-white/60 text-xs font-medium">Apply measured scale to:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setMeasureApplyTo("all")}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                          measureApplyTo === "all"
                            ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                            : "border-white/10 text-white/50 hover:bg-white/5"
                        }`}
                      >
                        All {sheets.length} sheets
                      </button>
                      {activeGroups.map(disc => (
                        <button
                          key={disc.key}
                          type="button"
                          onClick={() => setMeasureApplyTo(disc.key)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                            measureApplyTo === disc.key
                              ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                              : "border-white/10 text-white/50 hover:bg-white/5"
                          }`}
                        >
                          {disc.label} ({sheetGroups[disc.key].length})
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        </div>{/* end scrollable body */}

        {/* ── Sticky Footer — always visible, never clipped ── */}
        <div className="flex-shrink-0 flex items-center justify-between pt-3 mt-1 border-t border-white/10 gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkipAll}
            disabled={saving}
            className="text-white/40 hover:text-white/60 hover:bg-white/5 text-sm"
          >
            Skip — Let AI Estimate
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={saving || done || (mode === "measure" && !measuredRatio)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-11 text-base"
          >
            {done
              ? <><CheckCircle2 className="w-4 h-4 mr-2" />Done</>
              : saving
              ? "Saving..."
              : `Set Scale & Analyze →`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
