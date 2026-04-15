import type { Shape, Point } from "./types";

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

function drawLine(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
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
    const label = `${Math.round(dist)}px`;
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

export function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
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
      drawLine(ctx, shape.start, shape.end);
      break;
    case "text":
      drawText(ctx, shape.position, shape.text, shape.fontSize, shape.color);
      break;
  }
  ctx.restore();
}

export function renderAllShapes(ctx: CanvasRenderingContext2D, shapes: Shape[]) {
  for (const shape of shapes) {
    drawShape(ctx, shape);
  }
}
