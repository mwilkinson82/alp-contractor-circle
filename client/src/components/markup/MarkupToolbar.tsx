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
  Download,
} from "lucide-react";
import type { ToolType } from "./types";

const TOOLS: { type: ToolType; icon: typeof MousePointer2; label: string }[] = [
  { type: "select", icon: MousePointer2, label: "Select" },
  { type: "pen", icon: Pencil, label: "Pen" },
  { type: "rectangle", icon: Square, label: "Rectangle" },
  { type: "circle", icon: Circle, label: "Circle" },
  { type: "line", icon: Minus, label: "Line / Measure" },
  { type: "text", icon: Type, label: "Text Label" },
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
        <button
          type="button"
          onClick={onClear}
          disabled={!hasElements}
          title="Clear all markups"
          className="p-1.5 rounded-lg text-white/70 hover:text-red-400 hover:bg-white/10 disabled:text-white/20 disabled:hover:bg-transparent transition-all duration-150"
        >
          <Trash2 className="w-4 h-4" />
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
      </div>
    </div>
  );
}
