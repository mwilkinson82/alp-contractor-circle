import {
  MousePointer2,
  Pencil,
  Square,
  Circle,
  Minus,
  Type,
  Undo2,
  Redo2,
  Trash2,
  Eraser,
  Download,
  Ruler,
  ArrowRightToLine,
  Save,
  Pentagon,
  Hash,
  Tags,
} from "lucide-react";
import type { ToolType } from "./types";

const TOOLS: { type: ToolType; icon: typeof MousePointer2; label: string; hint?: string }[] = [
  { type: "select", icon: MousePointer2, label: "Select (V)" },
  { type: "pen", icon: Pencil, label: "Pen (P)" },
  { type: "rectangle", icon: Square, label: "Rectangle (R)" },
  { type: "circle", icon: Circle, label: "Circle (C)" },
  { type: "line", icon: Minus, label: "Line / Measure (L)", hint: "Click start → click end" },
  { type: "polygon", icon: Pentagon, label: "Area / Polygon (A)", hint: "Click vertices → close to start or double-click" },
  { type: "text", icon: Type, label: "Text Label (T)" },
  { type: "count", icon: Hash, label: "Count Marker (N)", hint: "Click to place numbered markers" },
];

const COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#FFFFFF",
  "#000000",
];

const LINE_WIDTHS = [2, 4, 6, 8];

interface MarkupToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  lineWidth: number;
  onLineWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: () => void;
  hasElements: boolean;
  /** Whether scale has been calibrated */
  isCalibrated?: boolean;
  /** Current scale display string (e.g. "1px = 0.5 ft") */
  scaleDisplay?: string;
  /** Whether currently in calibration mode */
  isCalibrating?: boolean;
  /** Toggle calibration mode */
  onToggleCalibrate?: () => void;
  /** Last measurement label to show push-to-quantity button */
  lastMeasurementLabel?: string;
  /** Push the last measurement to the item quantity */
  onPushQuantity?: () => void;
  /** Whether auto-save is active */
  isSaving?: boolean;
  /** Delete selected shape */
  onDelete?: () => void;
  /** Active count marker label/category */
  countLabel?: string;
  /** Called when user changes the count label */
  onCountLabelChange?: (label: string) => void;
  /** Label of the currently selected count shape (for editing) */
  selectedCountLabel?: string | null;
  /** Called when user edits the label of a selected count shape */
  onSelectedCountLabelChange?: (label: string) => void;
  /** Number of unlabeled count shapes */
  unlabeledCountCount?: number;
  /** Batch-label all unlabeled counts */
  onBatchLabelUnlabeled?: (label: string) => void;
}

export function MarkupToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onExport,
  hasElements,
  isCalibrated = false,
  scaleDisplay = "",
  isCalibrating = false,
  onToggleCalibrate,
  lastMeasurementLabel,
  onPushQuantity,
  isSaving = false,
  onDelete,
  countLabel = "",
  onCountLabelChange,
  selectedCountLabel,
  onSelectedCountLabelChange,
  unlabeledCountCount = 0,
  onBatchLabelUnlabeled,
}: MarkupToolbarProps) {
  return (
    <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-xl px-2 py-1.5 shadow-2xl border border-white/10">
      {/* Tools */}
      <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-1">
        {TOOLS.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => onToolChange(type)}
            title={label}
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              activeTool === type
                ? "bg-amber-500 text-black shadow-lg shadow-amber-500/30"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Count label input — shown when count tool is active OR when a count shape is selected */}
      {activeTool === "count" && (
        <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
          <input
            type="text"
            value={countLabel}
            onChange={(e) => onCountLabelChange?.(e.target.value)}
            placeholder="Label (e.g. Outlet)"
            className="w-28 px-2 py-1 rounded-md bg-white/10 text-white text-xs border border-white/20 focus:border-amber-400 focus:outline-none placeholder:text-white/40"
          />
        </div>
      )}
      {activeTool === "select" && selectedCountLabel !== undefined && selectedCountLabel !== null && (
        <div className="flex items-center gap-1.5 border-r border-white/10 pr-2 mr-1">
          <span className="text-[10px] text-white/50 whitespace-nowrap">Label:</span>
          <input
            type="text"
            value={selectedCountLabel}
            onChange={(e) => onSelectedCountLabelChange?.(e.target.value)}
            placeholder="Add label..."
            className="w-28 px-2 py-1 rounded-md bg-amber-500/10 text-amber-300 text-xs border border-amber-500/30 focus:border-amber-400 focus:outline-none placeholder:text-amber-300/40"
            autoFocus
          />
        </div>
      )}

      {/* Batch-label unlabeled counts */}
      {unlabeledCountCount > 0 && (
        <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
          <button
            type="button"
            onClick={() => {
              const label = window.prompt(`Label all ${unlabeledCountCount} unlabeled count marker(s):`, "");
              if (label && label.trim()) onBatchLabelUnlabeled?.(label.trim());
            }}
            title={`Label all ${unlabeledCountCount} unlabeled counts`}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all duration-150"
          >
            <Tags className="w-3.5 h-3.5" />
            <span>Label {unlabeledCountCount} unlabeled</span>
          </button>
        </div>
      )}

      {/* Scale calibration */}
      <div className="flex items-center gap-1 border-r border-white/10 pr-2 mr-1">
        <button
          type="button"
          onClick={onToggleCalibrate}
          title={isCalibrating ? "Cancel calibration" : isCalibrated ? "Re-calibrate scale" : "Set scale — click two known points"}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150 ${
            isCalibrating
              ? "bg-green-500 text-black shadow-lg shadow-green-500/30 animate-pulse"
              : isCalibrated
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-white/10 text-white/70 hover:text-white hover:bg-white/20"
          }`}
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>{isCalibrating ? "Setting..." : isCalibrated ? "Scaled" : "Set Scale"}</span>
        </button>
        {isCalibrated && scaleDisplay && (
          <span className="text-[10px] text-green-400/80 font-mono whitespace-nowrap">{scaleDisplay}</span>
        )}
      </div>

      {/* Colors */}
      <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-1">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onColorChange(c)}
            title={c}
            className={`w-5 h-5 rounded-full border-2 transition-all duration-150 shrink-0 ${
              activeColor === c
                ? "border-amber-400 scale-125 shadow-lg"
                : "border-white/20 hover:border-white/50 hover:scale-110"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Line widths */}
      <div className="flex items-center gap-0.5 border-r border-white/10 pr-2 mr-1">
        {LINE_WIDTHS.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onLineWidthChange(w)}
            title={`${w}px`}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
              lineWidth === w
                ? "bg-amber-500/20 border border-amber-500/50"
                : "hover:bg-white/10"
            }`}
          >
            <div
              className="rounded-full bg-white"
              style={{ width: w + 2, height: w + 2 }}
            />
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent transition-all duration-150"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent transition-all duration-150"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Delete selected shape (Del)"
            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all duration-150"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Clear all markups on this sheet?")) onClear();
          }}
          disabled={!hasElements}
          title="Clear all markups"
          className="p-1.5 rounded-lg text-white/70 hover:text-orange-400 hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent transition-all duration-150"
        >
          <Eraser className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={!hasElements}
          title="Export as PNG"
          className="p-1.5 rounded-lg text-white/70 hover:text-emerald-400 hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent transition-all duration-150"
        >
          <Download className="w-4 h-4" />
        </button>
        {isSaving && (
          <span className="flex items-center gap-1 text-[10px] text-green-400/70 ml-1">
            <Save className="w-3 h-3" /> Saved
          </span>
        )}
      </div>

      {/* Push measurement to quantity */}
      {lastMeasurementLabel && onPushQuantity && (
        <div className="flex items-center gap-1 border-l border-white/10 pl-2 ml-1">
          <button
            type="button"
            onClick={onPushQuantity}
            title="Push this measurement to the line item quantity"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all duration-150"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
            <span>Use {lastMeasurementLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
