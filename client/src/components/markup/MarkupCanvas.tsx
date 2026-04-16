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
  /** Pixels per real-world unit (e.g. px per foot). 0 = not calibrated */
  scaleRatio?: number;
  /** Unit label for measurements (e.g. "ft", "m") */
  scaleUnit?: string;
  /** When true, user is in "set scale" mode — next two clicks define the reference distance */
  isCalibrating?: boolean;
  /** Called with pixel distance when user finishes the two-click calibration */
  onCalibrationComplete?: (pixelDistance: number) => void;
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
  scaleRatio = 0,
  scaleUnit = "px",
  isCalibrating = false,
  onCalibrationComplete,
}: MarkupCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penPoints, setPenPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // Click-to-click state for line tool
  const [lineFirstClick, setLineFirstClick] = useState<Point | null>(null);

  // Calibration state (two-click)
  const [calibrationStart, setCalibrationStart] = useState<Point | null>(null);

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

  /** Format a pixel distance using calibration if available */
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
    renderAllShapes(ctx, elements, formatDistance);

    // Preview for drag-based shapes (rectangle, circle)
    if (isDrawing && startPoint && currentPoint) {
      const preview = getPreviewShape();
      if (preview) {
        ctx.globalAlpha = 0.7;
        drawShape(ctx, preview, formatDistance);
        ctx.globalAlpha = 1;
      }
    }

    // Preview for pen
    if (isDrawing && activeTool === "pen" && penPoints.length > 1) {
      ctx.globalAlpha = 0.7;
      drawShape(ctx, { type: "pen", points: penPoints, color, lineWidth } as Shape, formatDistance);
      ctx.globalAlpha = 1;
    }

    // Preview for click-to-click line (first click placed, mouse moving)
    if (lineFirstClick && currentPoint && !isDrawing) {
      ctx.globalAlpha = 0.6;
      drawShape(ctx, { id: "line-preview", type: "line", start: lineFirstClick, end: currentPoint, color, lineWidth } as Shape, formatDistance);
      ctx.globalAlpha = 1;
    }

    // Preview for calibration line
    if (isCalibrating && calibrationStart && currentPoint) {
      ctx.globalAlpha = 0.6;
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(calibrationStart.x, calibrationStart.y);
      ctx.lineTo(currentPoint.x, currentPoint.y);
      ctx.stroke();
      // Draw endpoints
      const cross = 10;
      [calibrationStart, currentPoint].forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x - cross / 2, p.y);
        ctx.lineTo(p.x + cross / 2, p.y);
        ctx.moveTo(p.x, p.y - cross / 2);
        ctx.lineTo(p.x, p.y + cross / 2);
        ctx.stroke();
      });
      // Label
      const dx = currentPoint.x - calibrationStart.x;
      const dy = currentPoint.y - calibrationStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        const mx = (calibrationStart.x + currentPoint.x) / 2;
        const my = (calibrationStart.y + currentPoint.y) / 2;
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        const label = `${Math.round(dist)}px — click to set`;
        const metrics = ctx.measureText(label);
        ctx.fillStyle = "rgba(34,197,94,0.85)";
        ctx.beginPath();
        ctx.roundRect(mx - metrics.width / 2 - 6, my - 20, metrics.width + 12, 24, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText(label, mx, my);
      }
      ctx.restore();
    }

    ctx.restore();
  }, [elements, isDrawing, startPoint, currentPoint, penPoints, activeTool, color, lineWidth, zoom, panOffset, getPreviewShape, formatDistance, lineFirstClick, isCalibrating, calibrationStart]);

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

  // Reset click-to-click line state when tool changes away from line
  useEffect(() => {
    if (activeTool !== "line") {
      setLineFirstClick(null);
    }
  }, [activeTool]);

  // Reset calibration state when calibration mode is turned off
  useEffect(() => {
    if (!isCalibrating) {
      setCalibrationStart(null);
    }
  }, [isCalibrating]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = toCanvasCoords(e.clientX, e.clientY);

      // Calibration mode: two-click to define reference distance
      if (isCalibrating) {
        if (!calibrationStart) {
          setCalibrationStart(pt);
          setCurrentPoint(pt);
        } else {
          const dx = pt.x - calibrationStart.x;
          const dy = pt.y - calibrationStart.y;
          const pixelDist = Math.sqrt(dx * dx + dy * dy);
          if (pixelDist > 5) {
            onCalibrationComplete?.(pixelDist);
          }
          setCalibrationStart(null);
          setCurrentPoint(null);
        }
        return;
      }

      if (activeTool === "select") return;

      if (activeTool === "text") {
        onTextPrompt?.(pt);
        return;
      }

      // Click-to-click line tool
      if (activeTool === "line") {
        if (!lineFirstClick) {
          // First click — set start point
          setLineFirstClick(pt);
          setCurrentPoint(pt);
        } else {
          // Second click — finalize line
          const dx = pt.x - lineFirstClick.x;
          const dy = pt.y - lineFirstClick.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 3) {
            const shape: Shape = {
              id: generateId(),
              type: "line",
              start: lineFirstClick,
              end: pt,
              color,
              lineWidth,
            };
            onElementAdd(shape);
          }
          setLineFirstClick(null);
          setCurrentPoint(null);
        }
        return;
      }

      // Drag-based tools (pen, rectangle, circle)
      setIsDrawing(true);
      setStartPoint(pt);
      setCurrentPoint(pt);
      if (activeTool === "pen") setPenPoints([pt]);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isActive, activeTool, toCanvasCoords, onTextPrompt, lineFirstClick, color, lineWidth, onElementAdd, isCalibrating, calibrationStart, onCalibrationComplete],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive) return;
      const pt = toCanvasCoords(e.clientX, e.clientY);

      // Update current point for calibration preview
      if (isCalibrating && calibrationStart) {
        e.preventDefault();
        e.stopPropagation();
        setCurrentPoint(pt);
        return;
      }

      // Update current point for click-to-click line preview
      if (lineFirstClick && activeTool === "line") {
        e.preventDefault();
        e.stopPropagation();
        setCurrentPoint(pt);
        return;
      }

      // Drag-based drawing
      if (!isDrawing) return;
      e.preventDefault();
      e.stopPropagation();
      setCurrentPoint(pt);
      if (activeTool === "pen") setPenPoints((prev) => [...prev, pt]);
    },
    [isActive, isDrawing, activeTool, toCanvasCoords, lineFirstClick, isCalibrating, calibrationStart],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Line tool uses click-to-click, not drag — ignore pointer up for it
      if (activeTool === "line") return;
      if (isCalibrating) return;
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
      }
      if (shape) onElementAdd(shape);
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentPoint(null);
      setPenPoints([]);
    },
    [isDrawing, activeTool, startPoint, penPoints, color, lineWidth, toCanvasCoords, onElementAdd, isCalibrating],
  );

  if (!isActive && !isCalibrating) return null;

  const getCursor = () => {
    if (isCalibrating) return "crosshair";
    if (activeTool === "select") return "default";
    if (activeTool === "text") return "text";
    return "crosshair";
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{
        cursor: getCursor(),
        touchAction: "none",
        zIndex: 20,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}
