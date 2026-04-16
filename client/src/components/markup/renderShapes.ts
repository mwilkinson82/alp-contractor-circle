import type { Shape, Point } from "./types";

export type FormatDistanceFn = (pxDist: number) => string;

const defaultFormat: FormatDistanceFn = (px) => `${Math.round(px)}px`;

function drawPen(ctx: CanvasRenderingContext2D, points: Point[]) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function drawRectangle(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  ctx.strokeRect(x, y, w, h);
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radiusX: number,
  radiusY: number,
) {
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, Math.abs(radiusX), Math.abs(radiusY), 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLine(ctx: CanvasRenderingContext2D, start: Point, end: Point, fmt: FormatDistanceFn) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();

  // Measure label
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 20) {
    const mx = (start.x + end.x) / 2;
    const my = (start.y + end.y) / 2;
    const fontSize = Math.max(12, Math.min(16, dist / 10));
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    const label = fmt(dist);
    const metrics = ctx.measureText(label);
    const pad = 4;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath();
    ctx.roundRect(mx - metrics.width / 2 - pad, my - fontSize - pad, metrics.width + pad * 2, fontSize + pad * 2, 4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#fff";
    ctx.fillText(label, mx, my);
    // Crosshair endpoints
    const cross = 6;
    ctx.beginPath();
    ctx.moveTo(start.x - cross / 2, start.y - cross / 2);
    ctx.lineTo(start.x + cross / 2, start.y + cross / 2);
    ctx.moveTo(start.x + cross / 2, start.y - cross / 2);
    ctx.lineTo(start.x - cross / 2, start.y + cross / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(end.x - cross / 2, end.y - cross / 2);
    ctx.lineTo(end.x + cross / 2, end.y + cross / 2);
    ctx.moveTo(end.x + cross / 2, end.y - cross / 2);
    ctx.lineTo(end.x - cross / 2, end.y + cross / 2);
    ctx.stroke();
  }
}

/**
 * Compute polygon area using the Shoelace formula.
 * Returns area in square pixels (image-space).
 */
function polygonArea(points: Point[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/** Compute the centroid of a polygon */
function polygonCentroid(points: Point[]): Point {
  let cx = 0, cy = 0;
  for (const p of points) { cx += p.x; cy += p.y; }
  return { x: cx / points.length, y: cy / points.length };
}

export type FormatAreaFn = (pxArea: number) => string;

function drawPolygon(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  fmtArea?: FormatAreaFn,
) {
  if (points.length < 3) {
    // Not enough points for a polygon — draw as a polyline
    if (points.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
    }
    return;
  }
  // Fill with semi-transparent color
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
  // Stroke outline
  ctx.stroke();
  // Vertex dots
  for (const p of points) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  // Area label at centroid
  if (fmtArea) {
    const area = polygonArea(points);
    if (area > 100) {
      const c = polygonCentroid(points);
      const label = fmtArea(area);
      const fontSize = 14;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(label);
      const pad = 6;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.beginPath();
      ctx.roundRect(c.x - metrics.width / 2 - pad, c.y - fontSize / 2 - pad, metrics.width + pad * 2, fontSize + pad * 2, 4);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#fff";
      ctx.fillText(label, c.x, c.y);
    }
  }
}

function drawText(
  ctx: CanvasRenderingContext2D,
  position: Point,
  text: string,
  fontSize: number,
  color: string,
) {
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.3;
  const maxWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const totalHeight = lines.length * lineHeight;
  const pad = 6;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.beginPath();
  ctx.roundRect(position.x - pad, position.y - pad, maxWidth + pad * 2, totalHeight + pad * 2, 4);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = color;
  lines.forEach((line, i) => {
    ctx.fillText(line, position.x, position.y + i * lineHeight);
  });
}

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, fmt: FormatDistanceFn = defaultFormat, fmtArea?: FormatAreaFn) {
  ctx.save();
  ctx.strokeStyle = shape.color;
  ctx.fillStyle = shape.color;
  ctx.lineWidth = shape.lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (shape.type) {
    case "pen":
      drawPen(ctx, shape.points);
      break;
    case "rectangle":
      drawRectangle(ctx, shape.start, shape.end);
      break;
    case "circle":
      drawCircle(ctx, shape.center, shape.radiusX, shape.radiusY);
      break;
    case "line":
      drawLine(ctx, shape.start, shape.end, fmt);
      break;
    case "polygon":
      drawPolygon(ctx, shape.points, shape.color, fmtArea);
      break;
    case "text":
      drawText(ctx, shape.position, shape.text, shape.fontSize, shape.color);
      break;
  }
  ctx.restore();
}

export function renderAllShapes(ctx: CanvasRenderingContext2D, shapes: Shape[], fmt: FormatDistanceFn = defaultFormat, fmtArea?: FormatAreaFn, selectedId?: string | null) {
  for (const shape of shapes) {
    drawShape(ctx, shape, fmt, fmtArea);
    // Draw selection highlight
    if (selectedId && shape.id === selectedId) {
      drawSelectionHighlight(ctx, shape);
    }
  }
}

/** Draw a glowing highlight around a selected shape */
function drawSelectionHighlight(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.save();
  ctx.strokeStyle = "#3B82F6";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.shadowColor = "#3B82F6";
  ctx.shadowBlur = 8;

  switch (shape.type) {
    case "line": {
      // Highlight endpoints with draggable handles
      const handleR = 7;
      ctx.fillStyle = "#3B82F6";
      ctx.setLineDash([]);
      for (const pt of [shape.start, shape.end]) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, handleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, handleR, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Highlight the line itself
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(shape.start.x, shape.start.y);
      ctx.lineTo(shape.end.x, shape.end.y);
      ctx.stroke();
      break;
    }
    case "rectangle": {
      const x = Math.min(shape.start.x, shape.end.x) - 4;
      const y = Math.min(shape.start.y, shape.end.y) - 4;
      const w = Math.abs(shape.end.x - shape.start.x) + 8;
      const h = Math.abs(shape.end.y - shape.start.y) + 8;
      ctx.strokeRect(x, y, w, h);
      // Corner handles
      ctx.fillStyle = "#3B82F6";
      ctx.setLineDash([]);
      for (const pt of [shape.start, shape.end, { x: shape.start.x, y: shape.end.y }, { x: shape.end.x, y: shape.start.y }]) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "circle": {
      ctx.beginPath();
      ctx.ellipse(shape.center.x, shape.center.y, shape.radiusX + 4, shape.radiusY + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "polygon": {
      if (shape.points.length >= 3) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i].x, shape.points[i].y);
        ctx.closePath();
        ctx.stroke();
      }
      // Vertex handles
      ctx.fillStyle = "#3B82F6";
      ctx.setLineDash([]);
      for (const pt of shape.points) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case "pen": {
      if (shape.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i].x, shape.points[i].y);
        ctx.stroke();
      }
      break;
    }
    case "text": {
      ctx.font = `bold ${shape.fontSize}px sans-serif`;
      const lines = shape.text.split("\n");
      const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));
      const totalH = lines.length * shape.fontSize * 1.3;
      ctx.strokeRect(shape.position.x - 6, shape.position.y - 6, maxW + 12, totalH + 12);
      break;
    }
  }
  ctx.restore();
}

/**
 * Hit-test a point against all shapes. Returns the topmost shape ID
 * that the point is close to, or null if nothing is hit.
 * `threshold` is the pixel distance tolerance in image-space.
 */
export function hitTestShapes(shapes: Shape[], pt: Point, threshold = 15): string | null {
  // Iterate in reverse so topmost (last-drawn) shapes are tested first
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (hitTestShape(s, pt, threshold)) return s.id;
  }
  return null;
}

function hitTestShape(shape: Shape, pt: Point, threshold: number): boolean {
  switch (shape.type) {
    case "line":
      return distToSegment(pt, shape.start, shape.end) < threshold;
    case "rectangle": {
      const x1 = Math.min(shape.start.x, shape.end.x);
      const y1 = Math.min(shape.start.y, shape.end.y);
      const x2 = Math.max(shape.start.x, shape.end.x);
      const y2 = Math.max(shape.start.y, shape.end.y);
      // Check if near any edge
      return (
        distToSegment(pt, { x: x1, y: y1 }, { x: x2, y: y1 }) < threshold ||
        distToSegment(pt, { x: x2, y: y1 }, { x: x2, y: y2 }) < threshold ||
        distToSegment(pt, { x: x2, y: y2 }, { x: x1, y: y2 }) < threshold ||
        distToSegment(pt, { x: x1, y: y2 }, { x: x1, y: y1 }) < threshold ||
        // Or inside the rectangle
        (pt.x >= x1 && pt.x <= x2 && pt.y >= y1 && pt.y <= y2)
      );
    }
    case "circle": {
      const dx = (pt.x - shape.center.x) / (shape.radiusX || 1);
      const dy = (pt.y - shape.center.y) / (shape.radiusY || 1);
      const normalizedDist = Math.sqrt(dx * dx + dy * dy);
      return Math.abs(normalizedDist - 1) < threshold / Math.max(shape.radiusX, shape.radiusY, 1) || normalizedDist < 1;
    }
    case "polygon": {
      // Check edges
      for (let i = 0; i < shape.points.length; i++) {
        const j = (i + 1) % shape.points.length;
        if (distToSegment(pt, shape.points[i], shape.points[j]) < threshold) return true;
      }
      // Check if inside polygon (ray casting)
      return pointInPolygon(pt, shape.points);
    }
    case "pen": {
      for (let i = 0; i < shape.points.length - 1; i++) {
        if (distToSegment(pt, shape.points[i], shape.points[i + 1]) < threshold) return true;
      }
      return false;
    }
    case "text": {
      const fontSize = shape.fontSize;
      const lines = shape.text.split("\n");
      const maxW = lines.reduce((max, l) => Math.max(max, l.length * fontSize * 0.6), 0);
      const totalH = lines.length * fontSize * 1.3;
      return (
        pt.x >= shape.position.x - 10 &&
        pt.x <= shape.position.x + maxW + 10 &&
        pt.y >= shape.position.y - 10 &&
        pt.y <= shape.position.y + totalH + 10
      );
    }
    default:
      return false;
  }
}

/** Distance from point p to line segment (a, b) */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

/** Ray-casting point-in-polygon test */
function pointInPolygon(pt: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > pt.y) !== (yj > pt.y) && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
