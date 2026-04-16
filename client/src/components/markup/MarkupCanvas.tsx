import { useRef, useState, useCallback, useEffect } from "react";
import type { Point, ToolType, Shape } from "./types";
import { renderAllShapes, drawShape, type FormatAreaFn } from "./renderShapes";

let _idCounter = 0;
function generateId(): string {
  return `shape_${Date.now()}_${++_idCounter}`;
}

/**
 * Compute where the image actually renders inside its container
 * when using object-fit: contain. Returns the rect in CSS pixels
 * relative to the container's top-left, BEFORE any CSS transform.
 */
function computeFittedImageRect(
  containerW: number,
  containerH: number,
  naturalW: number,
  naturalH: number,
): { x: number; y: number; w: number; h: number } {
  if (naturalW <= 0 || naturalH <= 0) return { x: 0, y: 0, w: containerW, h: containerH };
  const imgAspect = naturalW / naturalH;
  const ctnAspect = containerW / containerH;
  let w: number, h: number;
  if (imgAspect > ctnAspect) {
    // Image is wider than container → letterbox top/bottom
    w = containerW;
    h = containerW / imgAspect;
  } else {
    // Image is taller than container → letterbox left/right
    h = containerH;
    w = containerH * imgAspect;
  }
  const x = (containerW - w) / 2;
  const y = (containerH - h) / 2;
  return { x, y, w, h };
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
  /** When true, spacebar is held and user is panning — canvas should not capture pointer events */
  isPanning?: boolean;
  /** Natural width of the source image (needed for image-space conversion) */
  imageNaturalWidth?: number;
  /** Natural height of the source image (needed for image-space conversion) */
  imageNaturalHeight?: number;
  /** Currently selected shape ID (for highlighting) */
  selectedShapeId?: string | null;
  /** Called when user clicks on a shape to select it */
  onSelectShape?: (id: string | null) => void;
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
  isPanning = false,
  imageNaturalWidth = 0,
  imageNaturalHeight = 0,
}: MarkupCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penPoints, setPenPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentPoint, setCurrentPoint] = useState<Point | null>(null);

  // Click-to-click state for line tool
  const [lineFirstClick, setLineFirstClick] = useState<Point | null>(null);

  // Click-to-click state for polygon tool
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);

  // Calibration state (two-click)
  const [calibrationStart, setCalibrationStart] = useState<Point | null>(null);

  /**
   * Convert screen (client) coordinates to image-space coordinates.
   *
   * The image element uses:
   *   transform: translate(panOffset.x, panOffset.y) scale(zoom)
   *   transformOrigin: center center
   *   object-fit: contain
   *
   * So the pipeline is:
   * 1. Get position relative to the container (canvas bounding rect)
   * 2. Undo the CSS transform (center-origin scale + translate)
   * 3. Subtract the object-fit padding to get position within the fitted image
   * 4. Scale from fitted-image pixels to natural-image pixels
   */
  const toImageCoords = useCallback(
    (clientX: number, clientY: number): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const containerW = rect.width;
      const containerH = rect.height;

      // Position relative to container top-left
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;

      // Center of the container (the transform origin)
      const cx = containerW / 2;
      const cy = containerH / 2;

      // Undo CSS transform: translate(pan) scale(zoom) with origin at center
      // The CSS transform applies: point_screen = center + (point_pretransform - center) * zoom + pan
      // So: point_pretransform = center + (point_screen - pan - center) / zoom
      const preX = cx + (sx - panOffset.x - cx) / zoom;
      const preY = cy + (sy - panOffset.y - cy) / zoom;

      // Now preX/preY is in the container's coordinate space (before transform).
      // Subtract the object-fit padding and scale to image natural coordinates.
      const fitted = computeFittedImageRect(containerW, containerH, imageNaturalWidth, imageNaturalHeight);
      const imgX = ((preX - fitted.x) / fitted.w) * imageNaturalWidth;
      const imgY = ((preY - fitted.y) / fitted.h) * imageNaturalHeight;

      return { x: imgX, y: imgY };
    },
    [zoom, panOffset, imageNaturalWidth, imageNaturalHeight],
  );

  /** Format a pixel area using calibration if available */
  const formatArea: FormatAreaFn = useCallback(
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
        const cxp = (startPoint.x + currentPoint.x) / 2;
        const cyp = (startPoint.y + currentPoint.y) / 2;
        const rx = Math.abs(currentPoint.x - startPoint.x) / 2;
        const ry = Math.abs(currentPoint.y - startPoint.y) / 2;
        return { id: "preview", type: "circle", center: { x: cxp, y: cyp }, radiusX: rx, radiusY: ry, color, lineWidth };
      }
      default:
        return null;
    }
  }, [startPoint, currentPoint, activeTool, color, lineWidth]);

  /**
   * Redraw all shapes on the canvas.
   *
   * Shapes are stored in image-space coordinates (0,0 = top-left of natural image).
   * We need to transform them to screen-space to match the CSS-transformed image.
   *
   * The transform pipeline (image-space → screen-space):
   * 1. Scale from natural image coords to fitted-image coords
   * 2. Add the object-fit padding offset
   * 3. Apply the CSS transform: center-origin scale(zoom) + translate(pan)
   */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;

    if (canvas.width !== containerW * dpr || canvas.height !== containerH * dpr) {
      canvas.width = containerW * dpr;
      canvas.height = containerH * dpr;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Compute the fitted image rect (where the image sits before CSS transform)
    const fitted = computeFittedImageRect(containerW, containerH, imageNaturalWidth, imageNaturalHeight);

    // Scale factor from image-natural-pixels to fitted-display-pixels
    const fitScale = fitted.w > 0 ? fitted.w / imageNaturalWidth : 1;

    // Apply the same transform as the CSS on the image element:
    // transformOrigin: center center → translate to center, scale, translate back
    // then translate(panOffset) scale(zoom)
    const cx = containerW / 2;
    const cy = containerH / 2;

    // The CSS transform is: translate(pan) scale(zoom) with origin at center.
    // In matrix form from center:
    //   screen = center + (pre - center) * zoom + pan
    // Where pre = fitted.x + imgCoord * fitScale
    //
    // We compose the canvas transform:
    // 1. Translate to center
    // 2. Apply pan
    // 3. Scale by zoom
    // 4. Translate back from center
    // 5. Translate to fitted image origin
    // 6. Scale by fitScale (image-space → fitted-space)

    ctx.translate(cx + panOffset.x, cy + panOffset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-cx, -cy);
    ctx.translate(fitted.x, fitted.y);
    ctx.scale(fitScale, fitScale);

    // Now the canvas coordinate system matches image-space coordinates
    renderAllShapes(ctx, elements, formatDistance, formatArea);

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
      drawShape(ctx, { id: "line-preview", type: "line", start: lineFirstClick, end: currentPoint, color, lineWidth } as Shape, formatDistance, formatArea);
      ctx.globalAlpha = 1;
    }

    // Preview for polygon (vertices placed so far + mouse cursor)
    if (polygonPoints.length > 0 && currentPoint && activeTool === "polygon") {
      const previewPts = [...polygonPoints, currentPoint];
      ctx.globalAlpha = 0.6;
      drawShape(ctx, { id: "poly-preview", type: "polygon", points: previewPts, color, lineWidth } as Shape, formatDistance, formatArea);
      // Draw closing-snap indicator when cursor is near the first point
      if (polygonPoints.length >= 2) {
        const dx = currentPoint.x - polygonPoints[0].x;
        const dy = currentPoint.y - polygonPoints[0].y;
        const snapDist = Math.sqrt(dx * dx + dy * dy);
        if (snapDist < 30) {
          ctx.save();
          ctx.strokeStyle = "#22C55E";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(polygonPoints[0].x, polygonPoints[0].y, 12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }
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
  }, [elements, isDrawing, startPoint, currentPoint, penPoints, activeTool, color, lineWidth, zoom, panOffset, getPreviewShape, formatDistance, formatArea, lineFirstClick, polygonPoints, isCalibrating, calibrationStart, imageNaturalWidth, imageNaturalHeight]);

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

  // Reset polygon state when tool changes away from polygon
  useEffect(() => {
    if (activeTool !== "polygon") {
      setPolygonPoints([]);
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
      if (!isActive || isPanning) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = toImageCoords(e.clientX, e.clientY);

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

      // Click-to-click polygon tool
      if (activeTool === "polygon") {
        // Check if closing the polygon (click near first point, or double-click handled below)
        if (polygonPoints.length >= 3) {
          const dx = pt.x - polygonPoints[0].x;
          const dy = pt.y - polygonPoints[0].y;
          const snapDist = Math.sqrt(dx * dx + dy * dy);
          if (snapDist < 30) {
            // Close the polygon
            const shape: Shape = {
              id: generateId(),
              type: "polygon",
              points: [...polygonPoints],
              color,
              lineWidth,
            };
            onElementAdd(shape);
            setPolygonPoints([]);
            setCurrentPoint(null);
            return;
          }
        }
        // Add vertex
        setPolygonPoints((prev) => [...prev, pt]);
        setCurrentPoint(pt);
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
    [isActive, activeTool, toImageCoords, onTextPrompt, lineFirstClick, polygonPoints, color, lineWidth, onElementAdd, isCalibrating, calibrationStart, onCalibrationComplete, isPanning],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isActive || isPanning) return;
      const pt = toImageCoords(e.clientX, e.clientY);

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

      // Update current point for polygon preview
      if (polygonPoints.length > 0 && activeTool === "polygon") {
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
    [isActive, isDrawing, activeTool, toImageCoords, lineFirstClick, isCalibrating, calibrationStart, isPanning],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Line and polygon tools use click-to-click, not drag — ignore pointer up for them
      if (activeTool === "line" || activeTool === "polygon") return;
      if (isCalibrating) return;
      if (!isDrawing) return;
      e.preventDefault();
      e.stopPropagation();
      const pt = toImageCoords(e.clientX, e.clientY);
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
            const cxp = (startPoint.x + pt.x) / 2;
            const cyp = (startPoint.y + pt.y) / 2;
            const rx = Math.abs(pt.x - startPoint.x) / 2;
            const ry = Math.abs(pt.y - startPoint.y) / 2;
            if (rx > 2 || ry > 2) {
              shape = { id, type: "circle", center: { x: cxp, y: cyp }, radiusX: rx, radiusY: ry, color, lineWidth };
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
    [isDrawing, activeTool, startPoint, penPoints, color, lineWidth, toImageCoords, onElementAdd, isCalibrating],
  );

  // Double-click to close polygon
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (activeTool !== "polygon" || polygonPoints.length < 3) return;
      e.preventDefault();
      e.stopPropagation();
      const shape: Shape = {
        id: generateId(),
        type: "polygon",
        points: [...polygonPoints],
        color,
        lineWidth,
      };
      onElementAdd(shape);
      setPolygonPoints([]);
      setCurrentPoint(null);
    },
    [activeTool, polygonPoints, color, lineWidth, onElementAdd],
  );

  // Always render the canvas so annotations are visible in both markup and pan modes.
  // When not active (pan mode), disable pointer events so the user can pan/zoom the image.
  const pointerEventsStyle = (!isActive && !isCalibrating) ? "none" as const : isPanning ? "none" as const : "auto" as const;

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
        cursor: isPanning ? "grab" : getCursor(),
        touchAction: "none",
        zIndex: 20,
        pointerEvents: pointerEventsStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}
