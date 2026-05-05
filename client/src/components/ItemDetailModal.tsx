/**
 * ItemDetailModal — Side-by-side layout: source drawing as focal point
 * on the left, item details on the right. Click-to-zoom on drawing.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  Loader2,
  Edit3,
  FileText,
  Hash,
  DollarSign,
  Ruler,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Image as ImageIcon,
  Pencil,
  Move,
  ArrowRightToLine,
  Sigma,
  History,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { MarkupCanvas } from "@/components/markup/MarkupCanvas";
import { MarkupToolbar } from "@/components/markup/MarkupToolbar";
import { TextInputOverlay } from "@/components/markup/TextInputOverlay";
import { useMarkupHistory } from "@/components/markup/useMarkupHistory";
import { exportToPng } from "@/components/markup/exportToPng";
import type {
  ToolType,
  Point,
  Shape,
  CountShape,
  LineShape,
  PolygonShape,
} from "@/components/markup/types";
import { ScaleCalibrationDialog } from "@/components/markup/ScaleCalibrationDialog";
import { MeasurementSummary } from "@/components/markup/MeasurementSummary";
import { renderAllShapes } from "@/components/markup/renderShapes";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getScopeStatusFromNotes } from "../../../shared/scopeCost";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  GBP: "£",
  AUD: "A$",
};

const CURRENCY_LOCALE: Record<string, string> = {
  USD: "en-US",
  GBP: "en-GB",
  AUD: "en-AU",
};

function formatCurrency(cents: number, code: string = "USD") {
  const locale = CURRENCY_LOCALE[code] || "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─── Types ──────────────────────────────────────────────────────────────────────
interface TakeoffItem {
  id: number;
  csiCode?: string;
  csiDivision?: string;
  description?: string;
  notes?: string;
  quantity: string | number;
  unit?: string;
  unitCost: number;
  extendedCost: number;
  materialCost?: number;
  laborCost?: number;
  confidence: number;
  reviewed?: boolean;
  needsMeasurement?: boolean;
  sheetId?: number;
  sheetName?: string;
  pageNumber?: number;
}

interface SourceSheet {
  id: number;
  sheetName?: string | null;
  pageNumber?: number | null;
  imageUrl?: string | null;
  sheetType?: string | null;
}

interface ItemDetailModalProps {
  item: TakeoffItem | null;
  projectId: number;
  currencyCode: string;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: (data: { id: number; projectId: number }) => void;
  onMarkReviewed: (data: {
    id: number;
    projectId: number;
    reviewed: boolean;
  }) => void;
  onScopeDecision?: (
    item: TakeoffItem,
    status: "included" | "review" | "excluded"
  ) => void;
  isPending: boolean;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  sourceSheet?: SourceSheet | null;
}

// ─── Zoom Levels ──────────────────────────────────────────────────────────────

const ZOOM_LEVELS = [1, 1.5, 2.5, 4];

// ─── Drawing Viewer with Zoom ─────────────────────────────────────────────────

function DrawingViewer({
  imageUrl,
  sheetName,
  onFullscreen,
  sheetId,
}: {
  imageUrl: string;
  sheetName: string;
  onFullscreen?: () => void;
  sheetId?: number;
}) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const zoom = ZOOM_LEVELS[zoomIndex];

  // Load saved markups for this sheet
  const savedMarkup = trpc.takeoff.getSheetMarkup.useQuery(
    { sheetId: sheetId! },
    { enabled: !!sheetId }
  );
  const shapes: Shape[] = savedMarkup.data?.shapesJson
    ? (() => {
        try {
          return JSON.parse(savedMarkup.data.shapesJson);
        } catch {
          return [];
        }
      })()
    : [];

  // Track container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setContainerSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Redraw annotation overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      shapes.length === 0 ||
      imgNatural.w === 0 ||
      containerSize.w === 0
    )
      return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas to container size
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerSize.w * dpr;
    canvas.height = containerSize.h * dpr;
    canvas.style.width = `${containerSize.w}px`;
    canvas.style.height = `${containerSize.h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, containerSize.w, containerSize.h);

    // Compute fitted image rect (object-fit: contain)
    const imgAspect = imgNatural.w / imgNatural.h;
    const cAspect = containerSize.w / containerSize.h;
    let fitW: number, fitH: number;
    if (imgAspect > cAspect) {
      fitW = containerSize.w;
      fitH = containerSize.w / imgAspect;
    } else {
      fitH = containerSize.h;
      fitW = containerSize.h * imgAspect;
    }
    const offsetX = (containerSize.w - fitW) / 2;
    const offsetY = (containerSize.h - fitH) / 2;
    const scaleX = fitW / imgNatural.w;
    const scaleY = fitH / imgNatural.h;

    // Map image-space shapes to screen-space
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleX, scaleY);
    renderAllShapes(ctx, shapes);
    ctx.restore();
  }, [shapes, imgNatural, containerSize]);

  // Reset zoom when image changes
  useEffect(() => {
    setZoomIndex(0);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  const handleZoomIn = useCallback(() => {
    setZoomIndex(prev => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex(prev => {
      const next = Math.max(prev - 1, 0);
      if (next === 0) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        handleZoomIn();
      } else {
        handleZoomOut();
      }
    },
    [handleZoomIn, handleZoomOut]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [zoom, position]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Only cycle zoom on click (not drag)
      if (isDragging) return;
      const target = e.target as HTMLElement;
      if (target.closest("button")) return; // Don't zoom when clicking toolbar buttons
      handleZoomIn();
    },
    [isDragging, handleZoomIn]
  );

  return (
    <div className="relative h-full flex flex-col">
      {/* Drawing toolbar */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomIndex === 0}
          className="p-1 text-white/70 hover:text-white disabled:text-white/30 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-white/80 text-xs font-mono min-w-[3rem] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
          className="p-1 text-white/70 hover:text-white disabled:text-white/30 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={
            onFullscreen ||
            (() => {
              setZoomIndex(0);
              setPosition({ x: 0, y: 0 });
            })
          }
          className="p-1 text-white/70 hover:text-white transition-colors ml-1"
          title={onFullscreen ? "Go fullscreen" : "Reset zoom"}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom hint */}
      {zoomIndex === 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
          <span className="text-white/60 text-xs">Click or scroll to zoom</span>
        </div>
      )}

      {/* Drawing container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-white rounded-lg relative"
        style={{
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      >
        <img
          src={imageUrl}
          alt={sheetName}
          className="w-full h-full object-contain select-none"
          draggable={false}
          onLoad={e => {
            const img = e.currentTarget;
            setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
          }}
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        />
        {/* Annotation overlay — read-only */}
        {shapes.length > 0 && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── Markup Measurement Strip (shown below drawing in modal) ─────────────────

function computeLineLengthHelper(line: LineShape): number {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function computePolygonAreaHelper(poly: PolygonShape): number {
  const pts = poly.points;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

/** Determine which measurement type best matches the item's unit */
function suggestedMeasurementType(
  itemUnit: string | undefined
): "line" | "area" | "count" | null {
  if (!itemUnit) return null;
  const u = itemUnit.toUpperCase().trim();
  // Linear units
  if (
    [
      "LF",
      "FT",
      "M",
      "IN",
      "CM",
      "MM",
      "YD",
      "LINEAR FEET",
      "FEET",
      "FOOT",
    ].includes(u)
  )
    return "line";
  // Area units
  if (
    [
      "SF",
      "SQ FT",
      "SQFT",
      "SY",
      "SQ YD",
      "M2",
      "M²",
      "SQUARE FEET",
      "SQUARE FOOT",
    ].includes(u)
  )
    return "area";
  // Count units
  if (
    [
      "EA",
      "EACH",
      "PC",
      "PCS",
      "UNIT",
      "UNITS",
      "SET",
      "SETS",
      "LOT",
      "LS",
    ].includes(u)
  )
    return "count";
  return null;
}

function MarkupMeasurementStrip({
  sheetId,
  itemId,
  projectId,
  itemUnit,
  itemDescription,
  sheetName,
  onApplyQuantity,
  onOpenFullscreen,
}: {
  sheetId?: number;
  itemId?: number;
  projectId?: number;
  itemUnit?: string;
  itemDescription?: string;
  sheetName?: string;
  onApplyQuantity: (
    qty: number,
    unit: string,
    measurementType: "line" | "area" | "count"
  ) => void;
  onOpenFullscreen: () => void;
}) {
  const savedMarkup = trpc.takeoff.getSheetMarkup.useQuery(
    { sheetId: sheetId! },
    { enabled: !!sheetId }
  );

  if (!savedMarkup.data?.shapesJson) return null;

  let shapes: Shape[] = [];
  try {
    shapes = JSON.parse(savedMarkup.data.shapesJson);
  } catch {
    return null;
  }

  const scaleRatio = parseFloat(String(savedMarkup.data.scaleRatio)) || 0;
  const scaleUnit = savedMarkup.data.scaleUnit || "px";
  const isCalibrated = scaleRatio > 0;

  const lines = shapes.filter((s): s is LineShape => s.type === "line");
  const polygons = shapes.filter(
    (s): s is PolygonShape => s.type === "polygon"
  );
  const counts = shapes.filter((s): s is CountShape => s.type === "count");

  const totalLinePx = lines.reduce(
    (sum, l) => sum + computeLineLengthHelper(l),
    0
  );
  const totalAreaPx = polygons.reduce(
    (sum, p) => sum + computePolygonAreaHelper(p),
    0
  );

  const hasAny = lines.length > 0 || polygons.length > 0 || counts.length > 0;
  if (!hasAny) return null;

  const fmtDist = (px: number) => {
    if (!isCalibrated) return `${Math.round(px)}px`;
    const real = px / scaleRatio;
    return `${real.toFixed(1)} ${scaleUnit === "ft" ? "LF" : scaleUnit}`;
  };

  const fmtArea = (px: number) => {
    if (!isCalibrated) return `${Math.round(px)}px²`;
    const real = px / (scaleRatio * scaleRatio);
    const unitLabel =
      scaleUnit === "ft" ? "SF" : scaleUnit === "m" ? "m²" : scaleUnit + "²";
    return `${real.toFixed(1)} ${unitLabel}`;
  };

  const lineUnit = scaleUnit === "ft" ? "LF" : scaleUnit;
  const areaUnit =
    scaleUnit === "ft" ? "SF" : scaleUnit === "m" ? "m²" : scaleUnit + "²";

  const suggested = suggestedMeasurementType(itemUnit);

  const isSuggested = (type: "line" | "area" | "count") => suggested === type;

  return (
    <div className="mt-2 bg-navy-deep/40 border border-white/10 rounded-lg p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Sigma className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
          Saved Measurements
        </span>
        {!isCalibrated && (
          <span className="text-[9px] text-amber-400/60 italic ml-auto">
            Not calibrated
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Total lines */}
        {lines.length > 0 && (
          <div
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${
              isSuggested("line")
                ? "bg-blue-500/20 border-2 border-blue-400/60 ring-1 ring-blue-400/30"
                : "bg-blue-500/10 border border-blue-500/20"
            }`}
          >
            <Ruler className="w-3 h-3 text-blue-400" />
            <span className="text-[11px] text-blue-300 font-mono">
              {fmtDist(totalLinePx)}
            </span>
            <span className="text-[9px] text-blue-400/60">
              ({lines.length} lines)
            </span>
            {isCalibrated && (
              <button
                type="button"
                onClick={() =>
                  onApplyQuantity(totalLinePx / scaleRatio, lineUnit, "line")
                }
                className={`ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  isSuggested("line")
                    ? "bg-blue-500/40 text-blue-200 hover:bg-blue-500/50 font-bold"
                    : "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                }`}
                title="Apply total line distance as item quantity"
              >
                {isSuggested("line") && <Sparkles className="w-3 h-3" />}
                <ArrowRightToLine className="w-3 h-3" />
                {isSuggested("line") ? "Suggested" : "Apply"}
              </button>
            )}
          </div>
        )}

        {/* Total areas */}
        {polygons.length > 0 && (
          <div
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${
              isSuggested("area")
                ? "bg-green-500/20 border-2 border-green-400/60 ring-1 ring-green-400/30"
                : "bg-green-500/10 border border-green-500/20"
            }`}
          >
            <span className="text-[11px] text-green-300 font-mono">
              {fmtArea(totalAreaPx)}
            </span>
            <span className="text-[9px] text-green-400/60">
              ({polygons.length} areas)
            </span>
            {isCalibrated && (
              <button
                type="button"
                onClick={() =>
                  onApplyQuantity(
                    totalAreaPx / (scaleRatio * scaleRatio),
                    areaUnit,
                    "area"
                  )
                }
                className={`ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                  isSuggested("area")
                    ? "bg-green-500/40 text-green-200 hover:bg-green-500/50 font-bold"
                    : "bg-green-500/20 text-green-300 hover:bg-green-500/30"
                }`}
                title="Apply total area as item quantity"
              >
                {isSuggested("area") && <Sparkles className="w-3 h-3" />}
                <ArrowRightToLine className="w-3 h-3" />
                {isSuggested("area") ? "Suggested" : "Apply"}
              </button>
            )}
          </div>
        )}

        {/* Total counts */}
        {counts.length > 0 && (
          <div
            className={`flex items-center gap-1.5 rounded-md px-2 py-1 ${
              isSuggested("count")
                ? "bg-purple-500/20 border-2 border-purple-400/60 ring-1 ring-purple-400/30"
                : "bg-purple-500/10 border border-purple-500/20"
            }`}
          >
            <span className="text-[11px] text-purple-300 font-mono">
              {counts.length} counted
            </span>
            <button
              type="button"
              onClick={() => onApplyQuantity(counts.length, "EA", "count")}
              className={`ml-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                isSuggested("count")
                  ? "bg-purple-500/40 text-purple-200 hover:bg-purple-500/50 font-bold"
                  : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
              }`}
              title="Apply count as item quantity"
            >
              {isSuggested("count") && <Sparkles className="w-3 h-3" />}
              <ArrowRightToLine className="w-3 h-3" />
              {isSuggested("count") ? "Suggested" : "Apply"}
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen CTA for more detailed measurement */}
      <button
        type="button"
        onClick={onOpenFullscreen}
        className="mt-2 flex items-center gap-1.5 text-[10px] text-cream-muted/60 hover:text-cream-muted transition-colors"
      >
        <Pencil className="w-3 h-3" />
        Open fullscreen to add or edit measurements
      </button>
    </div>
  );
}

// ─── Fullscreen Drawing Overlay ───────────────────────────────────────────────

function FullscreenDrawing({
  imageUrl,
  sheetName,
  sheetId,
  projectId,
  itemUnit,
  onClose,
  onQuantityUpdate,
}: {
  imageUrl: string;
  sheetName: string;
  sheetId?: number;
  projectId?: number;
  itemUnit?: string;
  onClose: () => void;
  onQuantityUpdate?: (quantity: number, unit: string) => void;
}) {
  const [markupActive, setMarkupActive] = useState(false);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [activeColor, setActiveColor] = useState("#EF4444");
  const [lineWidth, setLineWidth] = useState(4);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [countLabel, setCountLabel] = useState("");
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [textPromptPos, setTextPromptPos] = useState<Point | null>(null);
  const {
    elements,
    pushElement,
    replaceElements,
    updateElement,
    updateElementSilent,
    beginDrag,
    commitDrag,
    removeElement,
    undo,
    redo,
    clearAll,
    canUndo,
    canRedo,
  } = useMarkupHistory();

  // When color or lineWidth changes and a shape is selected, apply to that shape
  const handleColorChange = useCallback(
    (c: string) => {
      setActiveColor(c);
      if (selectedShapeId) {
        updateElement(selectedShapeId, s => ({ ...s, color: c }));
      }
    },
    [selectedShapeId, updateElement]
  );

  const handleLineWidthChange = useCallback(
    (w: number) => {
      setLineWidth(w);
      if (selectedShapeId) {
        updateElement(selectedShapeId, s => ({ ...s, lineWidth: w }));
      }
    },
    [selectedShapeId, updateElement]
  );
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastMeasurement, setLastMeasurement] = useState<{
    pxDist: number;
    type: string;
  } | null>(null);

  // Image natural dimensions (needed for image-space coordinate conversion)
  const [imageNaturalWidth, setImageNaturalWidth] = useState(0);
  const [imageNaturalHeight, setImageNaturalHeight] = useState(0);

  // Container dimensions (needed for object-fit: contain calculation)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    observer.observe(el);
    // Initial measurement
    const rect = el.getBoundingClientRect();
    setContainerSize({ w: rect.width, h: rect.height });
    return () => observer.disconnect();
  }, []);

  // Scale calibration state (declared early for auto-save reference)
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [scaleRatio, setScaleRatio] = useState(0); // px per real-world unit
  const [scaleUnit, setScaleUnit] = useState("px");
  const [calibrationPixelDist, setCalibrationPixelDist] = useState<
    number | null
  >(null);
  const [scaleDisplay, setScaleDisplay] = useState("");

  // ── Load saved markup from DB ──
  const savedMarkup = trpc.takeoff.getSheetMarkup.useQuery(
    { sheetId: sheetId! },
    { enabled: !!sheetId && !hasLoaded }
  );
  useEffect(() => {
    if (savedMarkup.data && !hasLoaded) {
      try {
        const shapes = JSON.parse(savedMarkup.data.shapesJson) as Shape[];
        if (shapes.length > 0) replaceElements(shapes);
        if (savedMarkup.data.scaleRatio > 0) {
          setScaleRatio(savedMarkup.data.scaleRatio);
          setScaleUnit(savedMarkup.data.scaleUnit || "px");
          setScaleDisplay(
            `1 ${savedMarkup.data.scaleUnit || "px"} = ${Math.round(savedMarkup.data.scaleRatio)}px`
          );
        }
      } catch {
        /* ignore parse errors */
      }
      setHasLoaded(true);
    } else if (savedMarkup.isFetched && !savedMarkup.data) {
      setHasLoaded(true);
    }
  }, [savedMarkup.data, savedMarkup.isFetched, hasLoaded, replaceElements]);

  // ── Auto-save markup to DB (debounced) ──
  const saveMarkupMutation = trpc.takeoff.saveSheetMarkup.useMutation();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether user has made any changes (to avoid saving empty state on initial load)
  const hasUserEdited = useRef(false);
  useEffect(() => {
    if (!sheetId || !projectId || !hasLoaded) return;
    // Skip the first fire after load (elements may still be empty or just loaded from DB)
    if (!hasUserEdited.current) {
      hasUserEdited.current = true;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveMarkupMutation.mutate({
        sheetId,
        projectId,
        shapesJson: JSON.stringify(elements),
        scaleRatio,
        scaleUnit,
      });
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [elements, scaleRatio, scaleUnit, sheetId, projectId, hasLoaded]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (textPromptPos) {
          setTextPromptPos(null);
          return;
        }
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
        return;
      }
      // Skip tool shortcuts when user is typing in an input or textarea
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (markupActive && !textPromptPos) {
        switch (e.key.toLowerCase()) {
          case "v":
            setActiveTool("select");
            break;
          case "p":
            setActiveTool("pen");
            break;
          case "r":
            setActiveTool("rectangle");
            break;
          case "c":
            setActiveTool("circle");
            break;
          case "l":
            setActiveTool("line");
            break;
          case "a":
            setActiveTool("polygon");
            break;
          case "t":
            setActiveTool("text");
            break;
          case "n":
            setActiveTool("count");
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, undo, redo, markupActive, textPromptPos]);

  const handleTextSubmit = useCallback(
    (text: string) => {
      if (!textPromptPos) return;
      const shape = {
        id: `text_${Date.now()}`,
        type: "text" as const,
        position: textPromptPos,
        text,
        fontSize: Math.max(14, lineWidth * 4),
        color: activeColor,
        lineWidth,
      };
      pushElement(shape);
      setTextPromptPos(null);
    },
    [textPromptPos, activeColor, lineWidth, pushElement]
  );

  const formatDistance = useCallback(
    (pxDist: number): string => {
      if (scaleRatio > 0) {
        const realDist = pxDist / scaleRatio;
        if (scaleUnit === "ft") {
          const feet = Math.floor(realDist);
          const inches = Math.round((realDist - feet) * 12);
          if (inches === 12) return `${feet + 1}'-0"`;
          return `${feet}'-${inches}"`;
        }
        return `${realDist.toFixed(1)} ${scaleUnit}`;
      }
      return `${Math.round(pxDist)}px`;
    },
    [scaleRatio, scaleUnit]
  );

  const formatArea = useCallback(
    (pxArea: number): string => {
      if (scaleRatio > 0) {
        const realArea = pxArea / (scaleRatio * scaleRatio);
        if (scaleUnit === "ft") return `${realArea.toFixed(1)} SF`;
        if (scaleUnit === "m") return `${realArea.toFixed(1)} m\u00B2`;
        return `${realArea.toFixed(1)} ${scaleUnit}\u00B2`;
      }
      return `${Math.round(pxArea)} px\u00B2`;
    },
    [scaleRatio, scaleUnit]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedShapeId) return;
    removeElement(selectedShapeId);
    setSelectedShapeId(null);
  }, [selectedShapeId, removeElement]);

  const handleExport = useCallback(async () => {
    try {
      await exportToPng(
        imageUrl,
        elements,
        `${sheetName}-markup.png`,
        formatDistance,
        formatArea
      );
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [imageUrl, elements, sheetName, formatDistance, formatArea]);

  const toggleMarkup = useCallback(() => {
    setMarkupActive(prev => !prev);
    setTextPromptPos(null);
    setIsCalibrating(false);
  }, []);

  const handleToggleCalibrate = useCallback(() => {
    setIsCalibrating(prev => !prev);
  }, []);

  const handleCalibrationComplete = useCallback((pixelDist: number) => {
    setCalibrationPixelDist(pixelDist);
    setIsCalibrating(false);
  }, []);

  const handleScaleConfirm = useCallback(
    (realDistance: number, unit: string) => {
      if (calibrationPixelDist && realDistance > 0) {
        const ratio = calibrationPixelDist / realDistance;
        setScaleRatio(ratio);
        setScaleUnit(unit);
        setScaleDisplay(`1 ${unit} = ${Math.round(ratio)}px`);
      }
      setCalibrationPixelDist(null);
    },
    [calibrationPixelDist]
  );

  const handleScaleCancel = useCallback(() => {
    setCalibrationPixelDist(null);
  }, []);

  // Zoom controls
  const ZOOM_STEPS = [1, 1.5, 2, 2.5, 3, 4];
  const zoomIdx = ZOOM_STEPS.indexOf(zoom);
  const handleZoomIn = () => {
    if (zoomIdx < ZOOM_STEPS.length - 1) setZoom(ZOOM_STEPS[zoomIdx + 1]);
  };
  const handleZoomOut = () => {
    if (zoomIdx > 0) {
      setZoom(ZOOM_STEPS[zoomIdx - 1]);
      if (zoomIdx - 1 === 0) setPanOffset({ x: 0, y: 0 });
    }
  };

  // Pan handling — works in BOTH pan mode and markup mode (via spacebar hold)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);

  // Track spacebar for pan-while-in-markup-mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && markupActive && !textPromptPos) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceHeld(false);
        setIsDragging(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [markupActive, textPromptPos]);

  // Scroll-wheel zoom works in ALL modes (pan + markup)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    },
    [zoomIdx]
  );

  const handlePointerDownContainer = useCallback(
    (e: React.PointerEvent) => {
      // In pan-only mode (markup off): click-to-zoom at 100%, drag to pan when zoomed
      if (!markupActive && zoom <= 1) {
        handleZoomIn();
        return;
      }
      // In markup mode: only pan when spacebar is held
      if (markupActive && !spaceHeld) return;
      if (zoom <= 1) return; // don't pan at 100%
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    },
    [markupActive, zoom, panOffset, spaceHeld]
  );

  const handlePointerMoveContainer = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart]
  );

  const handlePointerUpContainer = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      onPointerDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-white/80 text-sm font-medium">{sheetName}</span>
          {markupActive && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium border border-amber-500/30">
              Markup Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMarkup}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              markupActive
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                : "bg-white/10 text-white/70 hover:text-white hover:bg-white/20"
            }`}
            title={markupActive ? "Exit markup mode" : "Enter markup mode"}
          >
            {markupActive ? (
              <>
                <Move className="w-3.5 h-3.5" />
                <span>Pan Mode</span>
              </>
            ) : (
              <>
                <Pencil className="w-3.5 h-3.5" />
                <span>Markup</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Drawing area */}
      <div className="flex-1 min-h-0 relative">
        {/* Zoom controls */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomIdx <= 0}
            className="p-1 text-white/70 hover:text-white disabled:text-white/30 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white/80 text-xs font-mono min-w-[3rem] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomIdx >= ZOOM_STEPS.length - 1}
            className="p-1 text-white/70 hover:text-white disabled:text-white/30 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Image + canvas container */}
        <div
          ref={containerRef}
          className="h-full overflow-hidden bg-white relative"
          style={{
            cursor: spaceHeld
              ? isDragging
                ? "grabbing"
                : "grab"
              : zoom > 1 && !markupActive
                ? isDragging
                  ? "grabbing"
                  : "grab"
                : markupActive
                  ? "crosshair"
                  : "zoom-in",
          }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDownContainer}
          onPointerMove={handlePointerMoveContainer}
          onPointerUp={handlePointerUpContainer}
          onPointerLeave={handlePointerUpContainer}
        >
          <img
            src={imageUrl}
            alt={sheetName}
            className="w-full h-full object-contain select-none"
            draggable={false}
            onLoad={e => {
              const img = e.currentTarget;
              setImageNaturalWidth(img.naturalWidth);
              setImageNaturalHeight(img.naturalHeight);
            }}
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
          />
          <MarkupCanvas
            elements={elements}
            onElementAdd={shape => {
              pushElement(shape);
              // Track last measurement for push-to-quantity
              if (shape.type === "line" && scaleRatio > 0) {
                const dx = shape.end.x - shape.start.x;
                const dy = shape.end.y - shape.start.y;
                const pxDist = Math.sqrt(dx * dx + dy * dy);
                setLastMeasurement({ pxDist, type: "line" });
              } else if (shape.type === "rectangle" && scaleRatio > 0) {
                const w = Math.abs(shape.end.x - shape.start.x);
                const h = Math.abs(shape.end.y - shape.start.y);
                const areaPx = w * h;
                setLastMeasurement({ pxDist: areaPx, type: "area" });
              } else if (shape.type === "circle" && scaleRatio > 0) {
                const areaPx = Math.PI * shape.radiusX * shape.radiusY;
                setLastMeasurement({ pxDist: areaPx, type: "area" });
              } else if (
                shape.type === "polygon" &&
                scaleRatio > 0 &&
                shape.points.length >= 3
              ) {
                // Shoelace formula for polygon area
                let areaPx = 0;
                const pts = shape.points;
                for (let i = 0; i < pts.length; i++) {
                  const j = (i + 1) % pts.length;
                  areaPx += pts[i].x * pts[j].y;
                  areaPx -= pts[j].x * pts[i].y;
                }
                areaPx = Math.abs(areaPx) / 2;
                setLastMeasurement({ pxDist: areaPx, type: "area" });
              }
            }}
            activeTool={activeTool}
            color={activeColor}
            lineWidth={lineWidth}
            zoom={zoom}
            panOffset={panOffset}
            isActive={markupActive}
            selectedShapeId={selectedShapeId}
            onSelectShape={setSelectedShapeId}
            onTextPrompt={setTextPromptPos}
            scaleRatio={scaleRatio}
            scaleUnit={scaleUnit}
            isCalibrating={isCalibrating}
            onCalibrationComplete={handleCalibrationComplete}
            isPanning={spaceHeld || isDragging}
            imageNaturalWidth={imageNaturalWidth}
            imageNaturalHeight={imageNaturalHeight}
            onUpdateElement={updateElementSilent}
            onDragStart={beginDrag}
            onDragEnd={commitDrag}
            countLabel={countLabel}
          />
          {textPromptPos && (
            <TextInputOverlay
              position={textPromptPos}
              zoom={zoom}
              panOffset={panOffset}
              color={activeColor}
              onSubmit={handleTextSubmit}
              onCancel={() => setTextPromptPos(null)}
              imageNaturalWidth={imageNaturalWidth}
              imageNaturalHeight={imageNaturalHeight}
              containerWidth={containerSize.w}
              containerHeight={containerSize.h}
            />
          )}
        </div>
      </div>

      {/* Markup toolbar (bottom) */}
      {markupActive && (
        <div className="flex justify-center py-2 px-4 bg-black/80 border-t border-white/5 shrink-0">
          <MarkupToolbar
            activeTool={activeTool}
            onToolChange={tool => {
              setActiveTool(tool);
              if (tool !== "select") setSelectedShapeId(null);
            }}
            activeColor={activeColor}
            onColorChange={handleColorChange}
            lineWidth={lineWidth}
            onLineWidthChange={handleLineWidthChange}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            onClear={clearAll}
            onExport={handleExport}
            hasElements={elements.length > 0}
            onDelete={selectedShapeId ? handleDeleteSelected : undefined}
            isCalibrated={scaleRatio > 0}
            scaleDisplay={scaleDisplay}
            isCalibrating={isCalibrating}
            onToggleCalibrate={handleToggleCalibrate}
            lastMeasurementLabel={
              lastMeasurement && scaleRatio > 0
                ? lastMeasurement.type === "line"
                  ? formatDistance(lastMeasurement.pxDist)
                  : `${(lastMeasurement.pxDist / (scaleRatio * scaleRatio)).toFixed(1)} ${scaleUnit === "ft" ? "SF" : scaleUnit === "m" ? "m\u00B2" : scaleUnit + "\u00B2"}`
                : undefined
            }
            onPushQuantity={
              lastMeasurement && scaleRatio > 0 && onQuantityUpdate
                ? () => {
                    if (lastMeasurement.type === "line") {
                      const realDist = lastMeasurement.pxDist / scaleRatio;
                      const unit = scaleUnit === "ft" ? "LF" : scaleUnit;
                      onQuantityUpdate(realDist, unit);
                    } else {
                      const realArea =
                        lastMeasurement.pxDist / (scaleRatio * scaleRatio);
                      const unit =
                        scaleUnit === "ft"
                          ? "SF"
                          : scaleUnit === "m"
                            ? "m\u00B2"
                            : scaleUnit + "\u00B2";
                      onQuantityUpdate(realArea, unit);
                    }
                  }
                : undefined
            }
            isSaving={saveMarkupMutation.isPending}
            countLabel={countLabel}
            onCountLabelChange={setCountLabel}
            selectedCountLabel={
              selectedShapeId
                ? (() => {
                    const sel = elements.find(e => e.id === selectedShapeId);
                    return sel?.type === "count"
                      ? ((sel as CountShape).label ?? "")
                      : null;
                  })()
                : null
            }
            onSelectedCountLabelChange={(label: string) => {
              if (selectedShapeId) {
                updateElement(selectedShapeId, s => ({ ...s, label }));
              }
            }}
            unlabeledCountCount={
              elements.filter(
                e => e.type === "count" && !(e as CountShape).label
              ).length
            }
            onBatchLabelUnlabeled={(label: string) => {
              const unlabeled = elements.filter(
                e => e.type === "count" && !(e as CountShape).label
              );
              // Use replaceElements to batch-update all unlabeled counts
              const updated = elements.map(e => {
                if (e.type === "count" && !(e as CountShape).label) {
                  return { ...e, label } as CountShape;
                }
                return e;
              });
              replaceElements(updated);
              toast.success(
                `Labeled ${unlabeled.length} count marker(s) as "${label}"`
              );
            }}
          />
        </div>
      )}
      {/* Scale calibration dialog */}
      {calibrationPixelDist !== null && (
        <ScaleCalibrationDialog
          pixelDistance={calibrationPixelDist}
          onConfirm={handleScaleConfirm}
          onCancel={handleScaleCancel}
        />
      )}

      {/* Measurement summary panel — positioned on left side to avoid covering zoom controls */}
      <div className="absolute top-14 left-4 z-30 pointer-events-auto">
        <MeasurementSummary
          elements={elements}
          formatDistance={formatDistance}
          formatArea={formatArea}
          isCalibrated={scaleRatio > 0}
          sheetName={sheetName || "Sheet"}
        />
      </div>

      {/* Calibration hint overlay — positioned at top so it doesn't obstruct the scale bar */}
      {isCalibrating && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-green-500/90 text-black px-4 py-2 rounded-lg text-sm font-semibold shadow-xl pointer-events-none animate-pulse">
          Click two points on a known dimension line to set the scale
        </div>
      )}

      {/* Pan hint — only show briefly */}
      {markupActive && zoom > 1 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-white/90 text-black px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg pointer-events-none opacity-70">
          Hold Space + drag to pan
        </div>
      )}
    </div>
  );
}

// ─── Helpersnt ────────────────────────────────────────────────────────────────

export default function ItemDetailModal({
  item,
  projectId,
  currencyCode,
  onClose,
  onSave,
  onDelete,
  onMarkReviewed,
  onScopeDecision,
  isPending,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  sourceSheet,
}: ItemDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [materialUnitCost, setMaterialUnitCost] = useState("");
  const [defaultLaborUnitCost, setDefaultLaborUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const appliedMeasurementValuesRef = useRef<Record<string, number>>({});

  const symbol = CURRENCY_SYMBOLS[currencyCode] || "$";
  const hasDrawing = !!sourceSheet?.imageUrl;
  const sheetLabel =
    sourceSheet?.sheetName || `Page ${sourceSheet?.pageNumber || "?"}`;

  // Measurement history
  const logMeasurement = trpc.takeoff.logMeasurementApply.useMutation();
  const measurementHistory = trpc.takeoff.getItemMeasurementHistory.useQuery(
    { itemId: item?.id! },
    { enabled: !!item?.id }
  );

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setDescription(item.description || "");
      setQuantity(parseFloat(item.quantity as string)?.toString() || "0");
      setUnit(item.unit || "EA");
      setUnitCost(((item.unitCost || 0) / 100).toFixed(2));
      setMaterialUnitCost(
        (
          (item.materialCost && item.materialCost > 0
            ? item.materialCost
            : Math.max(0, (item.unitCost || 0) - (item.laborCost || 0))) / 100
        ).toFixed(2)
      );
      setDefaultLaborUnitCost(((item.laborCost || 0) / 100).toFixed(2));
      setNotes(item.notes || "");
      setIsEditing(false);
      setIsFullscreen(false);
    }
  }, [item]);

  // Keyboard navigation
  useEffect(() => {
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (isEditing) return;
      if (e.key === "ArrowLeft" && hasPrev && onPrev) {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowRight" && hasNext && onNext) {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [item, isEditing, hasPrev, hasNext, onPrev, onNext]);

  if (!item) return null;

  const scopeStatus = getScopeStatusFromNotes(item.notes);
  const includeButtonLabel =
    scopeStatus === "excluded" ? "Restore to Bid" : "Add to Bid";
  const holdButtonLabel =
    scopeStatus === "excluded" ? "Move to Review" : "Decide Later";

  const materialUnitCostCents = Math.round(
    parseFloat(materialUnitCost || "0") * 100
  );
  const defaultLaborUnitCostCents = Math.round(
    parseFloat(defaultLaborUnitCost || "0") * 100
  );
  const referenceUnitCostCents =
    materialUnitCostCents + defaultLaborUnitCostCents;
  const extendedCost = Math.round(
    parseFloat(quantity || "0") * referenceUnitCostCents
  );
  const displayMaterialUnitCost =
    item.materialCost && item.materialCost > 0
      ? item.materialCost
      : Math.max(0, (item.unitCost || 0) - (item.laborCost || 0));
  const displayDefaultLaborUnitCost = item.laborCost || 0;

  const confidenceColor =
    item.confidence >= 80
      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
      : item.confidence >= 50
        ? "bg-amber-50 text-[#8a6510] border-[#d7b44d]"
        : "bg-orange-50 text-orange-800 border-orange-300";

  const handleSave = () => {
    onSave({
      id: item.id,
      projectId,
      description,
      quantity,
      unit,
      unitCost: referenceUnitCostCents,
      materialCost: materialUnitCostCents,
      laborCost: defaultLaborUnitCostCents,
      notes: notes || undefined,
      reviewed: true,
    });
    setIsEditing(false);
  };

  const formatAppliedQuantity = (value: number) =>
    Number.isInteger(value) ? value.toString() : value.toFixed(2);

  const persistQuantityFromMeasurement = (
    qty: number,
    unitLabel: string,
    measurementType?: "line" | "area" | "count",
    rawValue = qty
  ) => {
    const existingQty = parseFloat(quantity || String(item.quantity) || "0");
    const measurementKey =
      measurementType && sourceSheet?.id
        ? `${item.id}:${sourceSheet.id}:${measurementType}`
        : null;
    const lastApplied = measurementHistory.data?.find(
      entry =>
        entry.sheetId === sourceSheet?.id &&
        entry.measurementType === measurementType
    );
    const previouslyApplied =
      (measurementKey
        ? appliedMeasurementValuesRef.current[measurementKey]
        : undefined) ??
      lastApplied?.rawValue ??
      0;
    const nextQty =
      measurementType === "count"
        ? Math.max(0, existingQty + rawValue - previouslyApplied)
        : qty;
    const nextQuantity = formatAppliedQuantity(nextQty);
    const nextUnit =
      measurementType === "count" ? unit || unitLabel : unitLabel;

    setQuantity(nextQuantity);
    setUnit(nextUnit);
    onSave({
      id: item.id,
      projectId,
      description,
      quantity: nextQuantity,
      unit: nextUnit,
      unitCost: referenceUnitCostCents,
      materialCost: materialUnitCostCents,
      laborCost: defaultLaborUnitCostCents,
      notes: notes || undefined,
    });

    if (measurementType && item?.id && sourceSheet?.id) {
      if (measurementKey) {
        appliedMeasurementValuesRef.current[measurementKey] = rawValue;
      }
      logMeasurement.mutate({
        itemId: item.id,
        projectId,
        sheetId: sourceSheet.id,
        measurementType,
        rawValue,
        unit: nextUnit,
        sheetName: sheetLabel,
        itemDescription: description,
      });
    }

    toast.success(`Quantity saved as ${nextQuantity} ${nextUnit}`);
  };

  return (
    <>
      {/* When fullscreen is active, render ONLY the fullscreen overlay — hide the dialog entirely */}
      {isFullscreen && hasDrawing ? (
        <FullscreenDrawing
          imageUrl={sourceSheet!.imageUrl!}
          sheetName={sheetLabel}
          sheetId={sourceSheet?.id}
          projectId={projectId}
          itemUnit={item.unit || "EA"}
          onClose={() => setIsFullscreen(false)}
          onQuantityUpdate={(qty, unit) => {
            persistQuantityFromMeasurement(qty, unit);
          }}
        />
      ) : (
        <Dialog
          open={!!item}
          onOpenChange={open => {
            if (!open) onClose();
          }}
        >
          {/* Wider modal when drawing is available */}
          <DialogContent
            className={`${hasDrawing ? "sm:max-w-6xl" : "sm:max-w-3xl"} border-[#d7c7aa] bg-[#f4efe4] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)] [&_[data-slot=dialog-header]]:border-[#d8c9ad] [&_[data-slot=dialog-footer]]:border-[#d8c9ad] [&_[data-slot=dialog-close]]:text-[#716855] [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:text-[#171714]`}
          >
            <DialogHeader>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="shrink-0 border-[#d7b44d] bg-[#fff4cb] font-mono text-xs text-[#8a6510]"
                >
                  {item.csiCode || item.csiDivision || "—"}
                </Badge>
                <DialogTitle className="truncate text-lg text-[#171714]">
                  {isEditing
                    ? "Edit Item"
                    : item.description?.slice(0, 60) || "Takeoff Item"}
                  {!isEditing &&
                    item.description &&
                    item.description.length > 60 &&
                    "..."}
                </DialogTitle>
                {/* Navigation */}
                {(hasPrev || hasNext) && (
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!hasPrev}
                      onClick={onPrev}
                      className="h-7 w-7 text-[#716855] hover:bg-white hover:text-[#171714]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-[10px] text-[#8a806d]">←→</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!hasNext}
                      onClick={onNext}
                      className="h-7 w-7 text-[#716855] hover:bg-white hover:text-[#171714]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              <DialogDescription className="sr-only">
                View and edit takeoff item details
              </DialogDescription>
            </DialogHeader>

            {/* ─── Body: Side-by-side when drawing available ─────────── */}
            <div className={hasDrawing ? "flex gap-5 max-h-[65vh]" : ""}>
              {/* ─── LEFT: Source Drawing (focal point) ──────────────── */}
              {hasDrawing && (
                <div className="w-1/2 shrink-0 flex flex-col min-h-[300px]">
                  {/* Sheet label bar */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-sm font-semibold text-[#8a6510]">
                        {sheetLabel}
                      </span>
                      {sourceSheet?.sheetType &&
                        sourceSheet.sheetType !== "other" && (
                          <Badge
                            variant="outline"
                            className="border-[#d7c7aa] bg-white/70 text-[10px] text-[#716855]"
                          >
                            {sourceSheet.sheetType}
                          </Badge>
                        )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-[#716855] hover:bg-white hover:text-[#171714]"
                      onClick={() => setIsFullscreen(true)}
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Full Screen
                    </Button>
                  </div>

                  {/* Drawing viewer */}
                  <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-[#d7c7aa] bg-white shadow-[0_18px_45px_rgba(41,37,28,0.12)]">
                    <DrawingViewer
                      imageUrl={sourceSheet!.imageUrl!}
                      sheetName={sheetLabel}
                      sheetId={sourceSheet?.id}
                      onFullscreen={() => setIsFullscreen(true)}
                    />
                  </div>

                  {/* Quick-apply measurement strip from saved markups */}
                  <MarkupMeasurementStrip
                    sheetId={sourceSheet?.id}
                    itemId={item?.id}
                    projectId={projectId}
                    itemUnit={unit}
                    itemDescription={description}
                    sheetName={sheetLabel}
                    onApplyQuantity={(qty, unitLabel, measurementType) => {
                      persistQuantityFromMeasurement(
                        qty,
                        unitLabel,
                        measurementType
                      );
                    }}
                    onOpenFullscreen={() => setIsFullscreen(true)}
                  />
                </div>
              )}

              {/* ─── RIGHT (or FULL): Item Details ──────────────────── */}
              <div
                className={`${hasDrawing ? "w-1/2" : ""} overflow-y-auto pr-1 space-y-4`}
              >
                {/* No drawing placeholder */}
                {!hasDrawing && (
                  <div className="flex items-center gap-3 rounded-lg border border-[#d7c7aa] bg-white/70 p-3">
                    <ImageIcon className="w-5 h-5 text-[#8a806d]" />
                    <span className="text-sm text-[#716855]">
                      No source drawing linked to this item
                    </span>
                  </div>
                )}

                {/* Full Description */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-[#244c91]" />
                    <Label className="text-xs uppercase tracking-wider text-[#716855]">
                      Description
                    </Label>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={3}
                      className="resize-none border-[#d7c7aa] bg-white text-sm text-[#171714]"
                    />
                  ) : (
                    <div className="rounded-lg border border-[#d7c7aa] bg-white/75 p-3 shadow-sm">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#29251c]">
                        {item.description || "No description"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-3.5 w-3.5 text-[#8a6510]" />
                    <Label className="text-xs uppercase tracking-wider text-[#716855]">
                      Your Notes
                    </Label>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={2}
                      placeholder="e.g., Verify with sub, Price seems high..."
                      className="resize-none border-[#d7c7aa] bg-white text-sm text-[#171714]"
                    />
                  ) : (
                    <div className="rounded-lg border border-[#d7c7aa] bg-white/75 p-2.5 shadow-sm">
                      {notes ? (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#29251c]">
                          {notes}
                        </p>
                      ) : (
                        <p className="text-sm italic text-[#8a806d]">
                          No notes — click Edit to add
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Quantity / Unit / Cost Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Hash className="h-3 w-3 text-[#8a6510]" />
                      <Label className="text-[10px] uppercase tracking-wider text-[#716855]">
                        Qty
                      </Label>
                    </div>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                        className="h-9 border-[#d7c7aa] bg-white font-mono text-sm text-[#171714]"
                      />
                    ) : (
                      <p className="font-mono text-base font-semibold text-[#171714]">
                        {parseFloat(item.quantity as string).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Ruler className="h-3 w-3 text-[#8a6510]" />
                      <Label className="text-[10px] uppercase tracking-wider text-[#716855]">
                        Unit
                      </Label>
                    </div>
                    {isEditing ? (
                      <Input
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        className="h-9 border-[#d7c7aa] bg-white text-sm text-[#171714]"
                      />
                    ) : (
                      <p className="text-base font-semibold text-[#171714]">
                        {item.unit || "EA"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-emerald-700" />
                      <Label className="text-[10px] uppercase tracking-wider text-[#716855]">
                        Material Unit
                      </Label>
                    </div>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={materialUnitCost}
                        onChange={e => setMaterialUnitCost(e.target.value)}
                        className="h-9 border-[#d7c7aa] bg-white font-mono text-sm text-[#171714]"
                      />
                    ) : (
                      <p className="font-mono text-base font-semibold text-[#171714]">
                        {formatCurrency(displayMaterialUnitCost, currencyCode)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3 text-[#244c91]" />
                      <Label className="text-[10px] uppercase tracking-wider text-[#716855]">
                        Default Labor
                      </Label>
                    </div>
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={defaultLaborUnitCost}
                        onChange={e => setDefaultLaborUnitCost(e.target.value)}
                        className="h-9 border-[#d7c7aa] bg-white font-mono text-sm text-[#171714]"
                      />
                    ) : (
                      <p className="font-mono text-base font-semibold text-[#171714]">
                        {displayDefaultLaborUnitCost > 0
                          ? formatCurrency(
                              displayDefaultLaborUnitCost,
                              currencyCode
                            )
                          : "—"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Sigma className="h-3 w-3 text-[#8a6510]" />
                      <Label className="text-[10px] uppercase tracking-wider text-[#716855]">
                        Ref Unit
                      </Label>
                    </div>
                    <p className="font-mono text-base font-semibold text-[#171714]">
                      {formatCurrency(
                        isEditing ? referenceUnitCostCents : item.unitCost,
                        currencyCode
                      )}
                    </p>
                  </div>
                </div>

                {/* Extended Cost */}
                <div className="rounded-lg border border-[#d7b44d] bg-[#fff7da] p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#716855]">
                      Reference Total
                    </span>
                    <span className="font-mono text-xl font-bold text-[#a66d00]">
                      {isEditing
                        ? formatCurrency(extendedCost, currencyCode)
                        : formatCurrency(item.extendedCost, currencyCode)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#716855]">
                    Quantity Takeoff reference = material unit + default labor
                    unit. The Estimate tab chooses the active labor source for
                    the live total.
                  </p>
                </div>

                {/* Audit Trail */}
                <div className="space-y-2 rounded-lg border border-[#d7c7aa] bg-white/75 p-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5 text-[#8a6510]" />
                    <Label className="text-xs uppercase tracking-wider text-[#716855]">
                      Audit Trail
                    </Label>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <p className="text-[#8a806d]">Quantity source</p>
                      <p className="font-medium text-[#29251c]">
                        {measurementHistory.data?.length
                          ? "Verified measurement"
                          : item.needsMeasurement
                            ? "Needs measurement"
                            : "AI takeoff"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#8a806d]">Drawing reference</p>
                      <p className="font-medium text-[#29251c]">
                        {hasDrawing ? sheetLabel : "No linked sheet"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#8a806d]">Labor source</p>
                      <p className="font-medium text-[#29251c]">
                        {displayDefaultLaborUnitCost > 0
                          ? "Cost Library / Default Labor"
                          : "No default labor"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[#8a806d]">Confidence</p>
                      <p className="font-medium text-[#29251c]">{item.confidence}%</p>
                    </div>
                  </div>
                </div>

                {/* Meta badges */}
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={`text-xs border ${confidenceColor}`}>
                    {item.confidence}% confidence
                  </Badge>
                  {item.reviewed ? (
                    <Badge className="border border-emerald-300 bg-emerald-50 text-xs text-emerald-800">
                      <Check className="w-3 h-3 mr-1" /> Reviewed
                    </Badge>
                  ) : (
                    <Badge className="border border-[#d7b44d] bg-[#fff4cb] text-xs text-[#8a6510]">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Pending
                    </Badge>
                  )}
                  {measurementHistory.data &&
                    measurementHistory.data.length > 0 && (
                      <Badge className="bg-blue-50 text-[#244c91] text-xs border border-blue-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified via
                        Measurement
                      </Badge>
                    )}
                </div>

                {/* Measurement History Timeline */}
                {measurementHistory.data &&
                  measurementHistory.data.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <History className="h-3.5 w-3.5 text-[#8a6510]" />
                        <Label className="text-xs uppercase tracking-wider text-[#716855]">
                          Measurement History
                        </Label>
                      </div>
                      <div className="max-h-[140px] space-y-2 overflow-y-auto rounded-lg border border-[#d7c7aa] bg-white/75 p-2.5">
                        {measurementHistory.data.map(entry => {
                          const typeIcon =
                            entry.measurementType === "line"
                              ? "📏"
                              : entry.measurementType === "area"
                                ? "⬛"
                                : "🔢";
                          const when = new Date(entry.createdAt);
                          const timeAgo = getTimeAgo(when);
                          return (
                            <div
                              key={entry.id}
                              className="flex items-start gap-2 text-[11px]"
                            >
                              <span className="text-sm mt-0.5 shrink-0">
                                {typeIcon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-semibold text-[#29251c]">
                                    {entry.rawValue.toFixed(
                                      entry.measurementType === "count" ? 0 : 2
                                    )}{" "}
                                    {entry.unit}
                                  </span>
                                  <span className="text-[#8a806d]">←</span>
                                  <span className="truncate text-[#716855]">
                                    {entry.sheetName || "Sheet"}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#8a806d]">
                                  {timeAgo}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* ─── Footer ───────────────────────────────────────────── */}
            <DialogFooter className="flex-col gap-3 sm:flex-col sm:items-stretch sm:justify-start">
              {onScopeDecision && !isEditing && (
                <div className="w-full rounded-lg border border-[#d7c7aa] bg-white/70 px-3 py-2.5 shadow-sm">
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 xl:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#5d5546]">
                        Choose Where This Goes
                      </p>
                      <p className="mt-0.5 max-w-2xl text-xs text-[#716855]">
                        Add it to the bid, park it for later, or leave it out.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex xl:justify-end gap-2">
                      <Button
                        size="sm"
                        variant={
                          scopeStatus === "excluded" ? "outline" : "default"
                        }
                        className={`whitespace-nowrap ${
                          scopeStatus === "excluded"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                        }`}
                        onClick={() => onScopeDecision(item, "included")}
                        disabled={isPending}
                      >
                        <Check className="w-4 h-4 mr-1.5" />{" "}
                        {includeButtonLabel}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="whitespace-nowrap border-[#d7b44d] bg-[#fff7da] text-[#8a6510] hover:bg-[#fff4cb]"
                        onClick={() => onScopeDecision(item, "review")}
                        disabled={isPending}
                      >
                        <AlertTriangle className="w-4 h-4 mr-1.5" />{" "}
                        {holdButtonLabel}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="whitespace-nowrap border-orange-300 bg-orange-50 text-orange-800 hover:bg-orange-100"
                        onClick={() => onScopeDecision(item, "excluded")}
                        disabled={isPending}
                      >
                        <X className="w-4 h-4 mr-1.5" /> Not in Bid
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <div className="flex items-center gap-2 mr-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                    onClick={() => {
                      onDelete({ id: item.id, projectId });
                      onClose();
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                  {!item.reviewed && !isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                      onClick={() => {
                        onMarkReviewed({
                          id: item.id,
                          projectId,
                          reviewed: true,
                        });
                      }}
                    >
                      <Check className="w-4 h-4 mr-1" /> Mark Reviewed
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        className="border-[#c8b895] bg-white/70 text-[#29251c] hover:bg-white"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={isPending}
                        className="bg-[#171714] text-white hover:bg-[#29251c]"
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={onClose}
                        className="border-[#c8b895] bg-white/70 text-[#29251c] hover:bg-white"
                      >
                        Close
                      </Button>
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-[#171714] text-white hover:bg-[#29251c]"
                      >
                        <Edit3 className="w-4 h-4 mr-2" /> Edit Item
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
