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
} from "lucide-react";
import { MarkupCanvas } from "@/components/markup/MarkupCanvas";
import { MarkupToolbar } from "@/components/markup/MarkupToolbar";
import { TextInputOverlay } from "@/components/markup/TextInputOverlay";
import { useMarkupHistory } from "@/components/markup/useMarkupHistory";
import { exportToPng } from "@/components/markup/exportToPng";
import type { ToolType, Point, Shape } from "@/components/markup/types";
import { ScaleCalibrationDialog } from "@/components/markup/ScaleCalibrationDialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

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

// ─── Types ────────────────────────────────────────────────────────────────────

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
  confidence: number;
  reviewed?: boolean;
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
  onMarkReviewed: (data: { id: number; projectId: number; reviewed: boolean }) => void;
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

function DrawingViewer({ imageUrl, sheetName, onFullscreen }: { imageUrl: string; sheetName: string; onFullscreen?: () => void }) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const zoom = ZOOM_LEVELS[zoomIndex];

  // Reset zoom when image changes
  useEffect(() => {
    setZoomIndex(0);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  const handleZoomIn = useCallback(() => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next === 0) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [handleZoomIn, handleZoomOut]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    // Only cycle zoom on click (not drag)
    if (isDragging) return;
    const target = e.target as HTMLElement;
    if (target.closest("button")) return; // Don't zoom when clicking toolbar buttons
    handleZoomIn();
  }, [isDragging, handleZoomIn]);

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
          onClick={onFullscreen || (() => { setZoomIndex(0); setPosition({ x: 0, y: 0 }); })}
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
        className="flex-1 overflow-hidden bg-white rounded-lg"
        style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
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
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transformOrigin: "center center",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
        />
      </div>
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
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [textPromptPos, setTextPromptPos] = useState<Point | null>(null);
  const { elements, pushElement, replaceElements, undo, redo, clearAll, canUndo, canRedo } = useMarkupHistory();
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastMeasurement, setLastMeasurement] = useState<{ pxDist: number; type: string } | null>(null);

  // Image natural dimensions (needed for image-space coordinate conversion)
  const [imageNaturalWidth, setImageNaturalWidth] = useState(0);
  const [imageNaturalHeight, setImageNaturalHeight] = useState(0);

  // Container dimensions (needed for object-fit: contain calculation)
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
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
  const [calibrationPixelDist, setCalibrationPixelDist] = useState<number | null>(null);
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
          setScaleDisplay(`1 ${savedMarkup.data.scaleUnit || "px"} = ${Math.round(savedMarkup.data.scaleRatio)}px`);
        }
      } catch { /* ignore parse errors */ }
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
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [elements, scaleRatio, scaleUnit, sheetId, projectId, hasLoaded]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (textPromptPos) { setTextPromptPos(null); return; }
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") { e.preventDefault(); redo(); return; }
      if (markupActive && !textPromptPos) {
        switch (e.key.toLowerCase()) {
          case "v": setActiveTool("select"); break;
          case "p": setActiveTool("pen"); break;
          case "r": setActiveTool("rectangle"); break;
          case "c": setActiveTool("circle"); break;
          case "l": setActiveTool("line"); break;
          case "a": setActiveTool("polygon"); break;
          case "t": setActiveTool("text"); break;
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, undo, redo, markupActive, textPromptPos]);

  const handleTextSubmit = useCallback((text: string) => {
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
  }, [textPromptPos, activeColor, lineWidth, pushElement]);

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
    [scaleRatio, scaleUnit],
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
    [scaleRatio, scaleUnit],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedShapeId) return;
    const filtered = elements.filter((el) => el.id !== selectedShapeId);
    replaceElements(filtered);
    setSelectedShapeId(null);
  }, [selectedShapeId, elements, replaceElements]);

  const handleExport = useCallback(async () => {
    try {
      await exportToPng(imageUrl, elements, `${sheetName}-markup.png`, formatDistance, formatArea);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [imageUrl, elements, sheetName, formatDistance, formatArea]);

  const toggleMarkup = useCallback(() => {
    setMarkupActive((prev) => !prev);
    setTextPromptPos(null);
    setIsCalibrating(false);
  }, []);

  const handleToggleCalibrate = useCallback(() => {
    setIsCalibrating((prev) => !prev);
  }, []);

  const handleCalibrationComplete = useCallback((pixelDist: number) => {
    setCalibrationPixelDist(pixelDist);
    setIsCalibrating(false);
  }, []);

  const handleScaleConfirm = useCallback((realDistance: number, unit: string) => {
    if (calibrationPixelDist && realDistance > 0) {
      const ratio = calibrationPixelDist / realDistance;
      setScaleRatio(ratio);
      setScaleUnit(unit);
      setScaleDisplay(`1 ${unit} = ${Math.round(ratio)}px`);
    }
    setCalibrationPixelDist(null);
  }, [calibrationPixelDist]);

  const handleScaleCancel = useCallback(() => {
    setCalibrationPixelDist(null);
  }, []);

  // Zoom controls
  const ZOOM_STEPS = [1, 1.5, 2, 2.5, 3, 4];
  const zoomIdx = ZOOM_STEPS.indexOf(zoom);
  const handleZoomIn = () => { if (zoomIdx < ZOOM_STEPS.length - 1) setZoom(ZOOM_STEPS[zoomIdx + 1]); };
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
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  }, [zoomIdx]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // In markup mode, only pan if spacebar is held
    if (markupActive && !spaceHeld) return;
    if (!markupActive && zoom <= 1) { handleZoomIn(); return; }
    if (zoom <= 1) return; // don't pan at 100%
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  }, [markupActive, spaceHeld, zoom, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    // Allow dragging in markup mode only when spacebar is held
    if (markupActive && !spaceHeld) { setIsDragging(false); return; }
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [isDragging, markupActive, spaceHeld, dragStart]);

  const handleMouseUp = useCallback(() => { setIsDragging(false); }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
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
              <><Move className="w-3.5 h-3.5" /><span>Pan Mode</span></>
            ) : (
              <><Pencil className="w-3.5 h-3.5" /><span>Markup</span></>
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
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
          <button type="button" onClick={handleZoomOut} disabled={zoomIdx <= 0} className="p-1 text-white/70 hover:text-white disabled:text-white/30 transition-colors" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white/80 text-xs font-mono min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={handleZoomIn} disabled={zoomIdx >= ZOOM_STEPS.length - 1} className="p-1 text-white/70 hover:text-white disabled:text-white/30 transition-colors" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Image + canvas container */}
        <div
          ref={containerRef}
          className="h-full overflow-hidden bg-white relative"
          style={{ cursor: markupActive ? (spaceHeld ? (isDragging ? "grabbing" : "grab") : undefined) : zoom > 1 ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={imageUrl}
            alt={sheetName}
            className="w-full h-full object-contain select-none"
            draggable={false}
            onLoad={(e) => {
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
            onElementAdd={(shape) => {
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
              } else if (shape.type === "polygon" && scaleRatio > 0 && shape.points.length >= 3) {
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
            isPanning={spaceHeld}
            imageNaturalWidth={imageNaturalWidth}
            imageNaturalHeight={imageNaturalHeight}
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
            onToolChange={(tool) => {
              setActiveTool(tool);
              if (tool !== "select") setSelectedShapeId(null);
            }}
            activeColor={activeColor}
            onColorChange={setActiveColor}
            lineWidth={lineWidth}
            onLineWidthChange={setLineWidth}
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
            lastMeasurementLabel={lastMeasurement && scaleRatio > 0 ? (
              lastMeasurement.type === "line"
                ? formatDistance(lastMeasurement.pxDist)
                : `${(lastMeasurement.pxDist / (scaleRatio * scaleRatio)).toFixed(1)} ${scaleUnit === "ft" ? "SF" : scaleUnit === "m" ? "m\u00B2" : scaleUnit + "\u00B2"}`
            ) : undefined}
            onPushQuantity={lastMeasurement && scaleRatio > 0 && onQuantityUpdate ? () => {
              if (lastMeasurement.type === "line") {
                const realDist = lastMeasurement.pxDist / scaleRatio;
                const unit = scaleUnit === "ft" ? "LF" : scaleUnit;
                onQuantityUpdate(realDist, unit);
              } else {
                const realArea = lastMeasurement.pxDist / (scaleRatio * scaleRatio);
                const unit = scaleUnit === "ft" ? "SF" : scaleUnit === "m" ? "m\u00B2" : scaleUnit + "\u00B2";
                onQuantityUpdate(realArea, unit);
              }
            } : undefined}
            isSaving={saveMarkupMutation.isPending}
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

      {/* Calibration hint overlay */}
      {isCalibrating && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-green-500/90 text-black px-4 py-2 rounded-lg text-sm font-semibold shadow-xl pointer-events-none">
          Click two points on a known dimension line to set the scale
        </div>
      )}

      {/* Spacebar pan hint */}
      {markupActive && spaceHeld && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-white/90 text-black px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg pointer-events-none">
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
  const [notes, setNotes] = useState("");

  const symbol = CURRENCY_SYMBOLS[currencyCode] || "$";
  const hasDrawing = !!(sourceSheet?.imageUrl);
  const sheetLabel = sourceSheet?.sheetName || `Page ${sourceSheet?.pageNumber || "?"}`;

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setDescription(item.description || "");
      setQuantity(parseFloat(item.quantity as string)?.toString() || "0");
      setUnit(item.unit || "EA");
      setUnitCost(((item.unitCost || 0) / 100).toFixed(2));
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

  const extendedCost = Math.round(
    parseFloat(quantity || "0") * parseFloat(unitCost || "0") * 100
  );

  const confidenceColor =
    item.confidence >= 80
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : item.confidence >= 50
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";

  const handleSave = () => {
    onSave({
      id: item.id,
      projectId,
      description,
      quantity,
      unit,
      unitCost: Math.round(parseFloat(unitCost || "0") * 100),
      notes: notes || undefined,
      reviewed: true,
    });
    setIsEditing(false);
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
            setQuantity(qty.toString());
            setUnit(unit);
            toast.success(`Quantity updated to ${qty.toFixed(2)} ${unit}`);
          }}
        />
      ) : (
      <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
        {/* Wider modal when drawing is available */}
        <DialogContent
          className={hasDrawing ? "sm:max-w-6xl" : "sm:max-w-3xl"}
        >
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="shrink-0 font-mono text-xs border-amber-500/30 text-amber-400">
                {item.csiCode || item.csiDivision || "—"}
              </Badge>
              <DialogTitle className="text-lg truncate">
                {isEditing ? "Edit Item" : (item.description?.slice(0, 60) || "Takeoff Item")}
                {!isEditing && item.description && item.description.length > 60 && "..."}
              </DialogTitle>
              {/* Navigation */}
              {(hasPrev || hasNext) && (
                <div className="flex items-center gap-1 ml-auto shrink-0">
                  <Button variant="ghost" size="icon" disabled={!hasPrev} onClick={onPrev} className="h-7 w-7 text-cream-muted hover:text-cream">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-[10px] text-cream-muted/50">←→</span>
                  <Button variant="ghost" size="icon" disabled={!hasNext} onClick={onNext} className="h-7 w-7 text-cream-muted hover:text-cream">
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
                    <span className="text-amber-400 font-medium text-sm">
                      {sheetLabel}
                    </span>
                    {sourceSheet?.sheetType && sourceSheet.sheetType !== "other" && (
                      <Badge variant="outline" className="text-[10px] border-white/10 text-cream-muted">
                        {sourceSheet.sheetType}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-cream-muted hover:text-cream text-xs gap-1"
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> Full Screen
                  </Button>
                </div>

                {/* Drawing viewer */}
                <div className="flex-1 min-h-0 rounded-lg overflow-hidden border border-amber-500/20">
                  <DrawingViewer
                    imageUrl={sourceSheet!.imageUrl!}
                    sheetName={sheetLabel}
                    onFullscreen={() => setIsFullscreen(true)}
                  />
                </div>
              </div>
            )}

            {/* ─── RIGHT (or FULL): Item Details ──────────────────── */}
            <div className={`${hasDrawing ? "w-1/2" : ""} overflow-y-auto pr-1 space-y-4`}>

              {/* No drawing placeholder */}
              {!hasDrawing && (
                <div className="flex items-center gap-3 bg-navy-deep/30 border border-white/5 rounded-lg p-3">
                  <ImageIcon className="w-5 h-5 text-cream-muted/40" />
                  <span className="text-cream-muted/60 text-sm">No source drawing linked to this item</span>
                </div>
              )}

              {/* Full Description */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <Label className="text-cream-muted text-xs uppercase tracking-wider">Description</Label>
                </div>
                {isEditing ? (
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="bg-navy-deep/50 border-white/10 text-cream resize-none text-sm"
                  />
                ) : (
                  <div className="bg-navy-deep/30 border border-white/5 rounded-lg p-3">
                    <p className="text-cream text-sm leading-relaxed whitespace-pre-wrap">
                      {item.description || "No description"}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                  <Label className="text-cream-muted text-xs uppercase tracking-wider">Your Notes</Label>
                </div>
                {isEditing ? (
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g., Verify with sub, Price seems high..."
                    className="bg-navy-deep/50 border-white/10 text-cream resize-none text-sm"
                  />
                ) : (
                  <div className="bg-navy-deep/30 border border-white/5 rounded-lg p-2.5">
                    {notes ? (
                      <p className="text-cream text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
                    ) : (
                      <p className="text-cream-muted/50 text-sm italic">No notes — click Edit to add</p>
                    )}
                  </div>
                )}
              </div>

              {/* Quantity / Unit / Cost Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3 h-3 text-amber-400" />
                    <Label className="text-cream-muted text-[10px] uppercase tracking-wider">Qty</Label>
                  </div>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="bg-navy-deep/50 border-white/10 text-cream font-mono h-9 text-sm"
                    />
                  ) : (
                    <p className="text-cream font-mono text-base font-semibold">
                      {parseFloat(item.quantity as string).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Ruler className="w-3 h-3 text-amber-400" />
                    <Label className="text-cream-muted text-[10px] uppercase tracking-wider">Unit</Label>
                  </div>
                  {isEditing ? (
                    <Input
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="bg-navy-deep/50 border-white/10 text-cream h-9 text-sm"
                    />
                  ) : (
                    <p className="text-cream text-base font-semibold">{item.unit || "EA"}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3 h-3 text-amber-400" />
                    <Label className="text-cream-muted text-[10px] uppercase tracking-wider">Unit Cost</Label>
                  </div>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(e.target.value)}
                      className="bg-navy-deep/50 border-white/10 text-cream font-mono h-9 text-sm"
                    />
                  ) : (
                    <p className="text-cream font-mono text-base font-semibold">
                      {formatCurrency(item.unitCost, currencyCode)}
                    </p>
                  )}
                </div>
              </div>

              {/* Extended Cost */}
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-cream-muted text-sm">Extended Cost</span>
                  <span className="text-amber-400 font-bold text-xl font-mono">
                    {isEditing
                      ? formatCurrency(extendedCost, currencyCode)
                      : formatCurrency(item.extendedCost, currencyCode)}
                  </span>
                </div>
              </div>

              {/* Meta badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge className={`text-xs border ${confidenceColor}`}>
                  {item.confidence}% confidence
                </Badge>
                {item.reviewed ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 text-xs border border-emerald-500/30">
                    <Check className="w-3 h-3 mr-1" /> Reviewed
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 text-xs border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* ─── Footer ───────────────────────────────────────────── */}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => {
                    onMarkReviewed({ id: item.id, projectId, reviewed: true });
                  }}
                >
                  <Check className="w-4 h-4 mr-1" /> Mark Reviewed
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
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
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  <Button
                    onClick={() => setIsEditing(true)}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                  >
                    <Edit3 className="w-4 h-4 mr-2" /> Edit Item
                  </Button>
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}
    </>
  );
}
