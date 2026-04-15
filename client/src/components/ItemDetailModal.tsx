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
} from "lucide-react";

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

function DrawingViewer({ imageUrl, sheetName }: { imageUrl: string; sheetName: string }) {
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
          onClick={() => { setZoomIndex(0); setPosition({ x: 0, y: 0 }); }}
          className="p-1 text-white/70 hover:text-white transition-colors ml-1"
          title="Reset zoom"
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
  onClose,
}: {
  imageUrl: string;
  sheetName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <span className="text-white/80 text-sm font-medium">{sheetName}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <DrawingViewer imageUrl={imageUrl} sheetName={sheetName} />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

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
      <Dialog open={!!item} onOpenChange={onClose}>
        {/* Wider modal when drawing is available */}
        <DialogContent className={hasDrawing ? "sm:max-w-6xl" : "sm:max-w-3xl"}>
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

      {/* Fullscreen drawing overlay */}
      {isFullscreen && hasDrawing && (
        <FullscreenDrawing
          imageUrl={sourceSheet!.imageUrl!}
          sheetName={sheetLabel}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
