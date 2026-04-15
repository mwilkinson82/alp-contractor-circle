/**
 * ItemDetailModal — Click any takeoff row to see the full description
 * and edit quantity, unit, unit cost in a premium modal.
 */
import { useState, useEffect } from "react";
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
  /** Navigate to previous/next item in the list */
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** Source drawing sheet for this item */
  sourceSheet?: SourceSheet | null;
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
  const [showDrawing, setShowDrawing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");

  const symbol = CURRENCY_SYMBOLS[currencyCode] || "$";

  // Sync state when item changes
  useEffect(() => {
    if (item) {
      setDescription(item.description || "");
      setQuantity(parseFloat(item.quantity as string)?.toString() || "0");
      setUnit(item.unit || "EA");
      setUnitCost(((item.unitCost || 0) / 100).toFixed(2));
      setNotes(item.notes || "");
      setIsEditing(false);
      setShowDrawing(false);
    }
  }, [item]);

  // Keyboard navigation
  useEffect(() => {
    if (!item) return;
    const handleKey = (e: KeyboardEvent) => {
      if (isEditing) return; // Don't navigate while editing
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
    <Dialog open={!!item} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="outline" className="shrink-0 font-mono text-xs border-amber-500/30 text-amber-400">
                {item.csiCode || item.csiDivision || "—"}
              </Badge>
              <DialogTitle className="text-lg truncate">
                {isEditing ? "Edit Item" : (item.description?.slice(0, 60) || "Takeoff Item")}
                {!isEditing && item.description && item.description.length > 60 && "..."}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="sr-only">
            View and edit takeoff item details
          </DialogDescription>
        </DialogHeader>

        {/* ─── Body ─────────────────────────────────────────────────── */}
        <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-1">
          {/* Navigation arrows */}
          {(hasPrev || hasNext) && (
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasPrev}
                onClick={onPrev}
                className="text-cream-muted hover:text-cream"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-xs text-cream-muted">Use ← → arrow keys to navigate</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasNext}
                onClick={onNext}
                className="text-cream-muted hover:text-cream"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Full Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <Label className="text-cream-muted text-xs uppercase tracking-wider">Full Description</Label>
            </div>
            {isEditing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-navy-deep/50 border-white/10 text-cream resize-none"
              />
            ) : (
              <div className="bg-navy-deep/30 border border-white/5 rounded-lg p-4">
                <p className="text-cream text-sm leading-relaxed whitespace-pre-wrap">
                  {item.description || "No description"}
                </p>
              </div>
            )}
          </div>

          {/* Notes / Contractor Comments */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-amber-400" />
              <Label className="text-cream-muted text-xs uppercase tracking-wider">Your Notes</Label>
              <span className="text-cream-muted/50 text-xs">(optional — add comments, reminders, or flags)</span>
            </div>
            {isEditing ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="e.g., Verify with sub, Price seems high, Check spec sheet..."
                className="bg-navy-deep/50 border-white/10 text-cream resize-none"
              />
            ) : (
              <div className="bg-navy-deep/30 border border-white/5 rounded-lg p-3">
                {notes ? (
                  <p className="text-cream text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
                ) : (
                  <p className="text-cream-muted/50 text-sm italic">No notes yet — click Edit Item to add comments</p>
                )}
              </div>
            )}
          </div>

          {/* Quantity / Unit / Cost Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                <Label className="text-cream-muted text-xs uppercase tracking-wider">Quantity</Label>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="bg-navy-deep/50 border-white/10 text-cream font-mono"
                />
              ) : (
                <p className="text-cream font-mono text-lg font-semibold">
                  {parseFloat(item.quantity as string).toLocaleString()}
                </p>
              )}
            </div>

            {/* Unit */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-amber-400" />
                <Label className="text-cream-muted text-xs uppercase tracking-wider">Unit</Label>
              </div>
              {isEditing ? (
                <Input
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-navy-deep/50 border-white/10 text-cream"
                />
              ) : (
                <p className="text-cream text-lg font-semibold">{item.unit || "EA"}</p>
              )}
            </div>

            {/* Unit Cost */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                <Label className="text-cream-muted text-xs uppercase tracking-wider">Unit Cost ({symbol})</Label>
              </div>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className="bg-navy-deep/50 border-white/10 text-cream font-mono"
                />
              ) : (
                <p className="text-cream font-mono text-lg font-semibold">
                  {formatCurrency(item.unitCost, currencyCode)}
                </p>
              )}
            </div>
          </div>

          {/* Extended Cost Summary */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-cream-muted text-sm">Extended Cost</span>
              <span className="text-amber-400 font-bold text-2xl font-mono">
                {isEditing
                  ? formatCurrency(extendedCost, currencyCode)
                  : formatCurrency(item.extendedCost, currencyCode)}
              </span>
            </div>
          </div>

          {/* Meta Info Row */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Confidence */}
            <div className="flex items-center gap-2">
              <span className="text-cream-muted text-xs">Confidence:</span>
              <Badge className={`text-xs border ${confidenceColor}`}>
                {item.confidence}%
              </Badge>
            </div>

            {/* Source Sheet — clickable */}
            {sourceSheet ? (
              <button
                type="button"
                className="flex items-center gap-2 hover:bg-white/5 rounded px-2 py-1 transition-colors"
                onClick={() => setShowDrawing(!showDrawing)}
              >
                <span className="text-cream-muted text-xs">Source:</span>
                <span className="text-amber-400 text-xs underline underline-offset-2 cursor-pointer">
                  {sourceSheet.sheetName || `Page ${sourceSheet.pageNumber}`}
                </span>
                <span className="text-cream-muted/50 text-[10px]">{showDrawing ? "▲ hide" : "▼ view drawing"}</span>
              </button>
            ) : (item.sheetName || item.pageNumber) ? (
              <div className="flex items-center gap-2">
                <span className="text-cream-muted text-xs">Source:</span>
                <span className="text-cream text-xs">
                  {item.sheetName || `Page ${item.pageNumber}`}
                </span>
              </div>
            ) : null}

            {/* Reviewed Status */}
            <div className="flex items-center gap-2">
              <span className="text-cream-muted text-xs">Status:</span>
              {item.reviewed ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">
                  <Check className="w-3 h-3 mr-1" /> Reviewed
                </Badge>
              ) : (
                <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Pending Review
                </Badge>
              )}
            </div>
          </div>

          {/* Source Drawing Preview */}
          {showDrawing && sourceSheet?.imageUrl && (
            <div className="space-y-2 border border-amber-500/20 rounded-lg overflow-hidden">
              <div className="bg-amber-500/5 px-3 py-2 flex items-center justify-between">
                <span className="text-amber-400 text-xs font-medium">
                  📐 {sourceSheet.sheetName || `Page ${sourceSheet.pageNumber}`}
                  {sourceSheet.sheetType && sourceSheet.sheetType !== "other" && (
                    <span className="text-cream-muted ml-2">({sourceSheet.sheetType})</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setShowDrawing(false)}
                  className="text-cream-muted hover:text-cream text-xs"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[40vh] overflow-auto bg-white">
                <img
                  src={sourceSheet.imageUrl}
                  alt={sourceSheet.sheetName || "Source drawing"}
                  className="w-full h-auto"
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Footer ───────────────────────────────────────────────── */}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 mr-auto">
            {/* Delete */}
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

            {/* Mark Reviewed */}
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
  );
}
