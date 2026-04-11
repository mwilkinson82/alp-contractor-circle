/**
 * GanttAnnotations — SVG overlay for the Gantt chart that supports:
 *   - Text boxes (movable, editable)
 *   - Arrows (from point A to point B) with configurable endpoints and line styles
 *   - Time-period shading (highlight a date range with color + optional hatching)
 *
 * Used for delay analysis, impact presentations, and change order documentation.
 * All annotations are stored in state and can be exported to PDF.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Type,
  ArrowRight,
  Square,
  Trash2,
  Move,
  Palette,
  X,
  Plus,
  MousePointer,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Types ─────────────────────────────────────────────────────────────────
export interface TextAnnotation {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
  bgColor: string;
  bold: boolean;
  width: number;
}

export type ArrowLineStyle = "solid" | "dashed" | "dotted";
export type ArrowEndpoint = "arrow" | "circle" | "diamond" | "none";

export interface ArrowAnnotation {
  id: string;
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  strokeWidth: number;
  label?: string;
  lineStyle?: ArrowLineStyle;
  startEndpoint?: ArrowEndpoint;
  endEndpoint?: ArrowEndpoint;
}

export interface ShadingAnnotation {
  id: string;
  type: "shading";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
  pattern: "solid" | "hatching" | "crosshatch" | "dots";
  label?: string;
}

export type Annotation = TextAnnotation | ArrowAnnotation | ShadingAnnotation;

type Tool = "select" | "text" | "arrow" | "shading";

// ── Color presets ─────────────────────────────────────────────────────────
const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6",
  "#8b5cf6", "#ec4899", "#6b7280", "#000000", "#ffffff",
];

// ── Dash array helpers ──────────────────────────────────────────────────
function getDashArray(style: ArrowLineStyle | undefined, strokeWidth: number): string {
  if (!style || style === "solid") return "";
  if (style === "dashed") return `${strokeWidth * 4} ${strokeWidth * 2}`;
  if (style === "dotted") return `${strokeWidth} ${strokeWidth * 2}`;
  return "";
}

// ── Component ─────────────────────────────────────────────────────────────
interface GanttAnnotationsProps {
  width: number;
  height: number;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  visible: boolean;
}

export default function GanttAnnotations({
  width,
  height,
  annotations,
  onAnnotationsChange,
  visible,
}: GanttAnnotationsProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    field?: string; // for arrow endpoints: "start" | "end"
  } | null>(null);
  const [drawState, setDrawState] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  const genId = () => `ann_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const selected = annotations.find(a => a.id === selectedId) || null;

  // ── Update a single annotation ────────────────────────────────────────
  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    onAnnotationsChange(annotations.map(a => a.id === id ? { ...a, ...updates } as Annotation : a));
  }, [annotations, onAnnotationsChange]);

  const deleteAnnotation = useCallback((id: string) => {
    onAnnotationsChange(annotations.filter(a => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [annotations, onAnnotationsChange, selectedId]);

  // ── SVG coordinate helper ─────────────────────────────────────────────
  const getSvgCoords = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  // ── Mouse handlers ────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const { x, y } = getSvgCoords(e);

    if (tool === "text") {
      const id = genId();
      const newText: TextAnnotation = {
        id, type: "text", x, y, text: "Double-click to edit",
        fontSize: 13, color: "#000000", bgColor: "#fef3c7",
        bold: false, width: 180,
      };
      onAnnotationsChange([...annotations, newText]);
      setSelectedId(id);
      setTool("select");
      return;
    }

    if (tool === "arrow" || tool === "shading") {
      setDrawState({ startX: x, startY: y, currentX: x, currentY: y });
      return;
    }
  }, [tool, annotations, onAnnotationsChange, getSvgCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const { x, y } = getSvgCoords(e);

    // Drawing
    if (drawState) {
      setDrawState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
      return;
    }

    // Dragging
    if (dragState) {
      const dx = x - dragState.startX;
      const dy = y - dragState.startY;
      const ann = annotations.find(a => a.id === dragState.id);
      if (!ann) return;

      if (ann.type === "arrow" && dragState.field) {
        if (dragState.field === "start") {
          updateAnnotation(ann.id, { x1: dragState.origX + dx, y1: dragState.origY + dy });
        } else {
          updateAnnotation(ann.id, { x2: dragState.origX + dx, y2: dragState.origY + dy });
        }
      } else if (ann.type === "arrow") {
        const a = ann as ArrowAnnotation;
        updateAnnotation(ann.id, {
          x1: a.x1 + dx, y1: a.y1 + dy,
          x2: a.x2 + dx, y2: a.y2 + dy,
        });
        setDragState(prev => prev ? { ...prev, startX: x, startY: y } : null);
      } else {
        updateAnnotation(ann.id, { x: dragState.origX + dx, y: dragState.origY + dy });
      }
    }
  }, [drawState, dragState, annotations, updateAnnotation, getSvgCoords]);

  const handleMouseUp = useCallback(() => {
    if (drawState) {
      const dx = drawState.currentX - drawState.startX;
      const dy = drawState.currentY - drawState.startY;

      if (tool === "arrow" && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
        const id = genId();
        const newArrow: ArrowAnnotation = {
          id, type: "arrow",
          x1: drawState.startX, y1: drawState.startY,
          x2: drawState.currentX, y2: drawState.currentY,
          color: "#ef4444", strokeWidth: 2,
          lineStyle: "solid",
          startEndpoint: "none",
          endEndpoint: "arrow",
        };
        onAnnotationsChange([...annotations, newArrow]);
        setSelectedId(id);
        setTool("select");
      }

      if (tool === "shading" && Math.abs(dx) > 10 && Math.abs(dy) > 10) {
        const id = genId();
        const newShading: ShadingAnnotation = {
          id, type: "shading",
          x: Math.min(drawState.startX, drawState.currentX),
          y: Math.min(drawState.startY, drawState.currentY),
          width: Math.abs(dx),
          height: Math.abs(dy),
          color: "#3b82f6", opacity: 0.15,
          pattern: "solid",
        };
        onAnnotationsChange([...annotations, newShading]);
        setSelectedId(id);
        setTool("select");
      }

      setDrawState(null);
      return;
    }

    setDragState(null);
  }, [drawState, tool, annotations, onAnnotationsChange]);

  // ── Keyboard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && !editingTextId) {
          deleteAnnotation(selectedId);
        }
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setTool("select");
        setEditingTextId(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, editingTextId, deleteAnnotation]);

  if (!visible) return null;

  // ── Helper: get marker ID for an endpoint type + color ────────────────
  const getMarkerId = (endpoint: ArrowEndpoint | undefined, color: string, position: "start" | "end") => {
    if (!endpoint || endpoint === "none") return undefined;
    // Use a sanitized color for the ID
    const safeColor = color.replace("#", "");
    return `marker-${endpoint}-${safeColor}-${position}`;
  };

  // ── Collect unique markers needed ─────────────────────────────────────
  const markerDefs: { id: string; endpoint: ArrowEndpoint; color: string; position: "start" | "end" }[] = [];
  for (const ann of annotations) {
    if (ann.type === "arrow") {
      const a = ann as ArrowAnnotation;
      const startEp = a.startEndpoint || "none";
      const endEp = a.endEndpoint || "arrow";
      if (startEp !== "none") {
        const id = getMarkerId(startEp, a.color, "start")!;
        if (!markerDefs.find(m => m.id === id)) markerDefs.push({ id, endpoint: startEp, color: a.color, position: "start" });
      }
      if (endEp !== "none") {
        const id = getMarkerId(endEp, a.color, "end")!;
        if (!markerDefs.find(m => m.id === id)) markerDefs.push({ id, endpoint: endEp, color: a.color, position: "end" });
      }
    }
  }
  // Also add default arrowhead for drawing preview
  const previewMarkerId = "marker-arrow-ef4444-end";
  if (!markerDefs.find(m => m.id === previewMarkerId)) {
    markerDefs.push({ id: previewMarkerId, endpoint: "arrow", color: "#ef4444", position: "end" });
  }

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="pointer-events-auto absolute top-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-[#1a1f2e]/95 backdrop-blur border border-white/15 rounded-lg shadow-lg px-2 py-1.5">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mr-1">Annotate</span>
        <div className="w-px h-5 bg-gray-200" />
        <Button size="sm" variant={tool === "select" ? "default" : "ghost"} className="h-7 w-7 p-0"
          onClick={() => setTool("select")} title="Select / Move">
          <MousePointer className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant={tool === "text" ? "default" : "ghost"} className="h-7 w-7 p-0"
          onClick={() => setTool("text")} title="Add Text Box">
          <Type className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant={tool === "arrow" ? "default" : "ghost"} className="h-7 w-7 p-0"
          onClick={() => setTool("arrow")} title="Draw Arrow">
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
        <Button size="sm" variant={tool === "shading" ? "default" : "ghost"} className="h-7 w-7 p-0"
          onClick={() => setTool("shading")} title="Add Shading / Hatching">
          <Square className="w-3.5 h-3.5" />
        </Button>
        <div className="w-px h-5 bg-gray-200" />
        {selectedId && (
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
            onClick={() => deleteAnnotation(selectedId)} title="Delete selected">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
        <span className="text-[10px] text-gray-600 ml-1">
          {tool === "select" ? "Click to select" :
           tool === "text" ? "Click to place text" :
           tool === "arrow" ? "Drag to draw arrow" :
           "Drag to shade area"}
        </span>
      </div>

      {/* ── Properties panel (when selected) ─────────────────────────────── */}
      {selected && (
        <div className="pointer-events-auto absolute top-12 right-2 z-30 w-64 max-h-[calc(100vh-120px)] overflow-y-auto bg-[#1a1f2e]/95 backdrop-blur border border-white/15 rounded-lg shadow-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-300 uppercase">
              {selected.type === "text" ? "Text Box" : selected.type === "arrow" ? "Arrow" : "Shading"}
            </span>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setSelectedId(null)}>
              <X className="w-3 h-3" />
            </Button>
          </div>

          {/* Color picker */}
          <div>
            <Label className="text-[10px] text-gray-400">Color</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`w-5 h-5 rounded border ${selected.color === c ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-[#1a1f2e]" : "border-white/15"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => updateAnnotation(selected.id, { color: c })}
                />
              ))}
            </div>
          </div>

          {/* Text-specific props */}
          {selected.type === "text" && (
            <>
              <div>
                <Label className="text-[10px] text-gray-400">Background</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {["#fef3c7", "#fecaca", "#bbf7d0", "#bfdbfe", "#e9d5ff", "#fce7f3", "#f3f4f6", "transparent"].map(c => (
                    <button
                      key={c}
                      className={`w-5 h-5 rounded border ${(selected as TextAnnotation).bgColor === c ? "ring-2 ring-amber-500 ring-offset-1 ring-offset-[#1a1f2e]" : "border-white/15"}`}
                      style={{ backgroundColor: c === "transparent" ? "#fff" : c, backgroundImage: c === "transparent" ? "linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%), linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%)" : undefined, backgroundSize: c === "transparent" ? "6px 6px" : undefined, backgroundPosition: c === "transparent" ? "0 0, 3px 3px" : undefined }}
                      onClick={() => updateAnnotation(selected.id, { bgColor: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-gray-400">Size</Label>
                <Input type="number" className="h-6 w-14 text-xs" value={(selected as TextAnnotation).fontSize}
                  onChange={e => updateAnnotation(selected.id, { fontSize: parseInt(e.target.value) || 13 })} />
                <Button size="sm" variant={(selected as TextAnnotation).bold ? "default" : "outline"} className="h-6 w-6 p-0 text-xs font-bold"
                  onClick={() => updateAnnotation(selected.id, { bold: !(selected as TextAnnotation).bold })}>
                  B
                </Button>
              </div>
            </>
          )}

          {/* Arrow-specific props — expanded with line style and endpoint options */}
          {selected.type === "arrow" && (() => {
            const arrow = selected as ArrowAnnotation;
            return (
              <div className="space-y-3">
                {/* Stroke width */}
                <div className="flex items-center gap-2">
                  <Label className="text-[10px] text-gray-400 shrink-0">Width</Label>
                  <Input type="number" className="h-6 w-14 text-xs" min={1} max={8}
                    value={arrow.strokeWidth}
                    onChange={e => updateAnnotation(selected.id, { strokeWidth: parseInt(e.target.value) || 2 })} />
                </div>

                {/* Line style */}
                <div>
                  <Label className="text-[10px] text-gray-400">Line Style</Label>
                  <Select value={arrow.lineStyle || "solid"}
                    onValueChange={v => updateAnnotation(selected.id, { lineStyle: v as ArrowLineStyle })}>
                    <SelectTrigger className="h-7 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid ────</SelectItem>
                      <SelectItem value="dashed">Dashed - - - -</SelectItem>
                      <SelectItem value="dotted">Dotted · · · ·</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Start endpoint */}
                <div>
                  <Label className="text-[10px] text-gray-400">Start Point</Label>
                  <Select value={arrow.startEndpoint || "none"}
                    onValueChange={v => updateAnnotation(selected.id, { startEndpoint: v as ArrowEndpoint })}>
                    <SelectTrigger className="h-7 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (flat)</SelectItem>
                      <SelectItem value="arrow">Arrow ◄</SelectItem>
                      <SelectItem value="circle">Circle ●</SelectItem>
                      <SelectItem value="diamond">Diamond ◆</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* End endpoint */}
                <div>
                  <Label className="text-[10px] text-gray-400">End Point</Label>
                  <Select value={arrow.endEndpoint || "arrow"}
                    onValueChange={v => updateAnnotation(selected.id, { endEndpoint: v as ArrowEndpoint })}>
                    <SelectTrigger className="h-7 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (flat)</SelectItem>
                      <SelectItem value="arrow">Arrow ►</SelectItem>
                      <SelectItem value="circle">Circle ●</SelectItem>
                      <SelectItem value="diamond">Diamond ◆</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Label */}
                <div>
                  <Label className="text-[10px] text-gray-400">Label</Label>
                  <Input className="h-7 text-xs mt-1" placeholder="Optional label text"
                    value={arrow.label || ""}
                    onChange={e => updateAnnotation(selected.id, { label: e.target.value })} />
                </div>
              </div>
            );
          })()}

          {/* Shading-specific props */}
          {selected.type === "shading" && (
            <>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-gray-400">Opacity</Label>
                <input type="range" min={5} max={60} step={5}
                  value={(selected as ShadingAnnotation).opacity * 100}
                  onChange={e => updateAnnotation(selected.id, { opacity: parseInt(e.target.value) / 100 })}
                  className="flex-1 h-1" />
                <span className="text-[10px] text-gray-400 w-8">{Math.round((selected as ShadingAnnotation).opacity * 100)}%</span>
              </div>
              <div>
                <Label className="text-[10px] text-gray-400">Pattern</Label>
                <Select value={(selected as ShadingAnnotation).pattern}
                  onValueChange={v => updateAnnotation(selected.id, { pattern: v as any })}>
                  <SelectTrigger className="h-7 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="hatching">Diagonal Hatching</SelectItem>
                    <SelectItem value="crosshatch">Cross Hatching</SelectItem>
                    <SelectItem value="dots">Dots</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-gray-400">Label</Label>
                <Input className="h-6 text-xs mt-1" placeholder="e.g. Winter Impact Period"
                  value={(selected as ShadingAnnotation).label || ""}
                  onChange={e => updateAnnotation(selected.id, { label: e.target.value })} />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SVG Overlay ──────────────────────────────────────────────────── */}
      <svg
        ref={svgRef}
        className="pointer-events-auto absolute inset-0"
        width={width}
        height={height}
        style={{ cursor: tool === "select" ? "default" : tool === "text" ? "crosshair" : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Pattern and marker definitions */}
        <defs>
          <pattern id="hatching" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1.5" />
          </pattern>
          <pattern id="crosshatch" width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="8" y2="8" stroke="currentColor" strokeWidth="1" />
            <line x1="8" y1="0" x2="0" y2="8" stroke="currentColor" strokeWidth="1" />
          </pattern>
          <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1" fill="currentColor" />
          </pattern>

          {/* Dynamic markers for each arrow annotation */}
          {markerDefs.map(m => {
            const isStart = m.position === "start";
            if (m.endpoint === "arrow") {
              return (
                <marker key={m.id} id={m.id}
                  markerWidth="10" markerHeight="7"
                  refX={isStart ? "0" : "10"} refY="3.5"
                  orient="auto-start-reverse">
                  <polygon points={isStart ? "10 0, 0 3.5, 10 7" : "0 0, 10 3.5, 0 7"} fill={m.color} />
                </marker>
              );
            }
            if (m.endpoint === "circle") {
              return (
                <marker key={m.id} id={m.id}
                  markerWidth="8" markerHeight="8"
                  refX="4" refY="4"
                  orient="auto">
                  <circle cx="4" cy="4" r="3" fill={m.color} />
                </marker>
              );
            }
            if (m.endpoint === "diamond") {
              return (
                <marker key={m.id} id={m.id}
                  markerWidth="10" markerHeight="10"
                  refX="5" refY="5"
                  orient="auto">
                  <polygon points="5 0, 10 5, 5 10, 0 5" fill={m.color} />
                </marker>
              );
            }
            return null;
          })}
        </defs>

        {/* ── Render annotations ─────────────────────────────────────────── */}
        {annotations.map(ann => {
          const isSelected = ann.id === selectedId;

          if (ann.type === "shading") {
            const s = ann as ShadingAnnotation;
            return (
              <g key={ann.id} onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}>
                {/* Solid fill */}
                <rect x={s.x} y={s.y} width={s.width} height={s.height}
                  fill={s.color} opacity={s.opacity}
                  stroke={isSelected ? "#3b82f6" : "none"} strokeWidth={isSelected ? 2 : 0}
                  strokeDasharray={isSelected ? "4 2" : ""}
                  style={{ cursor: "move" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(ann.id);
                    if (tool === "select") {
                      setDragState({ id: ann.id, startX: e.clientX - svgRef.current!.getBoundingClientRect().left, startY: e.clientY - svgRef.current!.getBoundingClientRect().top, origX: s.x, origY: s.y });
                    }
                  }}
                />
                {/* Pattern overlay */}
                {s.pattern !== "solid" && (
                  <rect x={s.x} y={s.y} width={s.width} height={s.height}
                    fill={`url(#${s.pattern === "hatching" ? "hatching" : s.pattern === "crosshatch" ? "crosshatch" : "dots"})`}
                    opacity={0.4} style={{ color: s.color, pointerEvents: "none" }}
                  />
                )}
                {/* Label */}
                {s.label && (
                  <text x={s.x + s.width / 2} y={s.y + s.height / 2}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={11} fontWeight="600" fill={s.color}
                    style={{ pointerEvents: "none" }}>
                    {s.label}
                  </text>
                )}
              </g>
            );
          }

          if (ann.type === "arrow") {
            const a = ann as ArrowAnnotation;
            const startEp = a.startEndpoint || "none";
            const endEp = a.endEndpoint || "arrow";
            const startMarkerId = getMarkerId(startEp, a.color, "start");
            const endMarkerId = getMarkerId(endEp, a.color, "end");
            const dashArray = getDashArray(a.lineStyle, a.strokeWidth);

            return (
              <g key={ann.id} onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}
                style={{ color: a.color }}>
                <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                  stroke={a.color} strokeWidth={a.strokeWidth}
                  strokeDasharray={dashArray}
                  markerStart={startMarkerId ? `url(#${startMarkerId})` : undefined}
                  markerEnd={endMarkerId ? `url(#${endMarkerId})` : undefined}
                  style={{ cursor: "move" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(ann.id);
                    if (tool === "select") {
                      setDragState({ id: ann.id, startX: e.clientX - svgRef.current!.getBoundingClientRect().left, startY: e.clientY - svgRef.current!.getBoundingClientRect().top, origX: a.x1, origY: a.y1 });
                    }
                  }}
                />
                {/* Wider invisible hit area */}
                <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                  stroke="transparent" strokeWidth={Math.max(12, a.strokeWidth + 8)}
                  style={{ cursor: "move" }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(ann.id);
                    if (tool === "select") {
                      setDragState({ id: ann.id, startX: e.clientX - svgRef.current!.getBoundingClientRect().left, startY: e.clientY - svgRef.current!.getBoundingClientRect().top, origX: a.x1, origY: a.y1 });
                    }
                  }}
                />
                {/* Endpoint handles when selected */}
                {isSelected && (
                  <>
                    <circle cx={a.x1} cy={a.y1} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2}
                      style={{ cursor: "grab" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragState({ id: ann.id, startX: e.clientX - svgRef.current!.getBoundingClientRect().left, startY: e.clientY - svgRef.current!.getBoundingClientRect().top, origX: a.x1, origY: a.y1, field: "start" });
                      }} />
                    <circle cx={a.x2} cy={a.y2} r={5} fill="#3b82f6" stroke="#fff" strokeWidth={2}
                      style={{ cursor: "grab" }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setDragState({ id: ann.id, startX: e.clientX - svgRef.current!.getBoundingClientRect().left, startY: e.clientY - svgRef.current!.getBoundingClientRect().top, origX: a.x2, origY: a.y2, field: "end" });
                      }} />
                  </>
                )}
                {/* Arrow label */}
                {a.label && (
                  <text x={(a.x1 + a.x2) / 2} y={(a.y1 + a.y2) / 2 - 8}
                    textAnchor="middle" fontSize={10} fontWeight="600" fill={a.color}
                    style={{ pointerEvents: "none" }}>
                    {a.label}
                  </text>
                )}
              </g>
            );
          }

          if (ann.type === "text") {
            const t = ann as TextAnnotation;
            return (
              <g key={ann.id}>
                {/* Background rect */}
                <rect x={t.x} y={t.y} width={t.width} height={t.fontSize + 14}
                  rx={4} ry={4}
                  fill={t.bgColor === "transparent" ? "none" : t.bgColor}
                  stroke={isSelected ? "#3b82f6" : "#d1d5db"} strokeWidth={isSelected ? 2 : 1}
                  style={{ cursor: "move" }}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(ann.id); }}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(ann.id); }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(ann.id);
                    if (tool === "select" && editingTextId !== ann.id) {
                      setDragState({ id: ann.id, startX: e.clientX - svgRef.current!.getBoundingClientRect().left, startY: e.clientY - svgRef.current!.getBoundingClientRect().top, origX: t.x, origY: t.y });
                    }
                  }}
                />
                {/* Text content */}
                {editingTextId === ann.id ? (
                  <foreignObject x={t.x + 4} y={t.y + 2} width={t.width - 8} height={t.fontSize + 10}>
                    <input
                      autoFocus
                      className="w-full bg-transparent border-none outline-none"
                      style={{ fontSize: t.fontSize, color: t.color, fontWeight: t.bold ? "bold" : "normal" }}
                      value={t.text}
                      onChange={e => updateAnnotation(ann.id, { text: e.target.value })}
                      onBlur={() => setEditingTextId(null)}
                      onKeyDown={e => { if (e.key === "Enter") setEditingTextId(null); }}
                    />
                  </foreignObject>
                ) : (
                  <text x={t.x + 8} y={t.y + t.fontSize + 4}
                    fontSize={t.fontSize} fill={t.color}
                    fontWeight={t.bold ? "bold" : "normal"}
                    style={{ pointerEvents: "none", userSelect: "none" }}>
                    {t.text}
                  </text>
                )}
              </g>
            );
          }

          return null;
        })}

        {/* ── Drawing preview ────────────────────────────────────────────── */}
        {drawState && tool === "arrow" && (
          <line x1={drawState.startX} y1={drawState.startY}
            x2={drawState.currentX} y2={drawState.currentY}
            stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2"
            markerEnd={`url(#${previewMarkerId})`} style={{ color: "#ef4444" }} />
        )}
        {drawState && tool === "shading" && (
          <rect
            x={Math.min(drawState.startX, drawState.currentX)}
            y={Math.min(drawState.startY, drawState.currentY)}
            width={Math.abs(drawState.currentX - drawState.startX)}
            height={Math.abs(drawState.currentY - drawState.startY)}
            fill="#3b82f6" opacity={0.15}
            stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 2"
          />
        )}
      </svg>
    </div>
  );
}
