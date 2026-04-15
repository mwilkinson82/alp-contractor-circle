import { useRef, useState, useCallback, useEffect } from "react";
import type { Point, ToolType, Shape } from "./types";
import { renderAllShapes, drawShape } from "./renderShapes";

let _idCounter = 0;
function generateId(): string {
  return `shape_${Date.now()}_${++_idCounter}`;
}

interface MarkupCanvasProps {
  elements: Shape[];
  onElementAdd: (shape: Shape) => void;
  activeTool: ToolType;
  color: string;
  lineWidth: number;
  zoom: number;
  panOffset: Point;
  isActive: boolean;
  onTextPrompt?: (position: Point) => void;
}

export function MarkupCanvas({
  elements,
  onElementAdd,
  activeTool,
  color,
  lineWidth,
  zoom,
  panOffset,
  isActive,
  onTextPrompt,
}: MarkupCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penPoints, setPenPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left - panOffset.x) / zoom;
      const y = (clientY - rect.top - panOffset.y) / zoom;
      return { x, y };
    },
    [zoom, panOffset],
  );

  const getPreviewShape = useCallback((): Shape | null => {
    if (!startPoint || !currentPoint) return null;
    switch (activeTool) {
      case "rectangle":
        return { id: "preview", type: "rectangle", start: startPoint, end: currentPoint, color, lineWidth };
      case "circle": {
        const cx = (startPoint.x + currentPoint.x) / 2;
        const cy = (startPoint.y + currentPoint.y) / 2;
        const rx = Math.abs(currentPoint.x - startPoint.x) / 2;
        const ry = Math.abs(currentPoint.y - startPoint.y) / 2;
        return { id: "preview", type: "circle", center: { x: cx, y: cy }, radiusX: rx, radiusY: ry, color, lineWidth };
      }
      case "line":
        return { id: "preview", type: "line", start: startPoint, end: currentPoint, color, lineWidth };
      default:
        return null;
    }
  }, [startPoint, currentPoint, activeTool, color, lineWidth]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);
    renderAllShapes(ctx, elements);
    // Preview shape
    if (isDrawing && startPoint && currentPoint) {
      const preview = getPreviewShape();
      if (preview) {
        ctx.globalAlpha = 0.7;
        drawShape(ctx, preview);
        ctx.globalAlpha = 1;
      }
    }
    // Preview pen
    if (isDrawing && activeTool === "pen" && penPoints.length > 1) {
      ctx.globalAlpha = 0.7;
      drawShape(ctx, { type: "pen", points: penPoints, color, lineWidth } as Shape);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }, [elements, isDrawing, startPoint, currentPoint, penPoints, activeTool, color, lineWidth, zoom, panOffset, getPreviewShape]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => redraw());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive || activeTool === "select") return;
      e.preventDefault();
      e.stopPropagation();
      const pt = toCanvasCoords(e.clientX, e.clientY);
      if (activeTool === "text") {
        onTextPrompt?.(pt);
        return;
      }
      setIsDrawing(true);
      setStartPoint(pt);
      setCurrentPoint(pt);
      if (activeTool === "pen") setPenPoints([pt]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isActive, activeTool, toCanvasCoords, onTextPrompt],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = toCanvasCoords(e.clientX, e.clientY);
      setCurrentPoint(pt);
      if (activeTool === "pen") setPenPoints((prev) => [...prev, pt]);
    },
    [isDrawing, activeTool, toCanvasCoords],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = toCanvasCoords(e.clientX, e.clientY);
      const id = generateId();
      let shape: Shape | null = null;
      switch (activeTool) {
        case "pen":
          if (penPoints.length > 1) {
            shape = { id, type: "pen", points: [...penPoints, pt], color, lineWidth };
          }
          break;
        case "rectangle":
          if (startPoint) {
            shape = { id, type: "rectangle", start: startPoint, end: pt, color, lineWidth };
          }
          break;
        case "circle":
          if (startPoint) {
            const cx = (startPoint.x + pt.x) / 2;
            const cy = (startPoint.y + pt.y) / 2;
            const rx = Math.abs(pt.x - startPoint.x) / 2;
            const ry = Math.abs(pt.y - startPoint.y) / 2;
            if (rx > 2 || ry > 2) {
              shape = { id, type: "circle", center: { x: cx, y: cy }, radiusX: rx, radiusY: ry, color, lineWidth };
            }
          }
          break;
        case "line":
          if (startPoint) {
            shape = { id, type: "line", start: startPoint, end: pt, color, lineWidth };
          }
          break;
      }
      if (shape) onElementAdd(shape);
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
      setPenPoints([]);
    },
    [isDrawing, activeTool, startPoint, penPoints, color, lineWidth, toCanvasCoords, onElementAdd],
  );

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        cursor: activeTool === "select" ? "default" : activeTool === "text" ? "text" : "crosshair",
        touchAction: "none",
        zIndex: 20,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
