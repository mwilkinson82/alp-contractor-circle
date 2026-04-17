export interface Point {
  x: number;
  y: number;
}

export type ToolType = "select" | "pen" | "rectangle" | "circle" | "line" | "polygon" | "text" | "count";

export interface PenShape {
  id: string;
  type: "pen";
  points: Point[];
  color: string;
  lineWidth: number;
}

export interface RectangleShape {
  id: string;
  type: "rectangle";
  start: Point;
  end: Point;
  color: string;
  lineWidth: number;
}

export interface CircleShape {
  id: string;
  type: "circle";
  center: Point;
  radiusX: number;
  radiusY: number;
  color: string;
  lineWidth: number;
}

export interface LineShape {
  id: string;
  type: "line";
  start: Point;
  end: Point;
  color: string;
  lineWidth: number;
}

export interface TextShape {
  id: string;
  type: "text";
  position: Point;
  text: string;
  fontSize: number;
  color: string;
  lineWidth: number;
}

export interface PolygonShape {
  id: string;
  type: "polygon";
  points: Point[];
  color: string;
  lineWidth: number;
}

export interface CountShape {
  id: string;
  type: "count";
  position: Point;
  number: number;
  color: string;
  lineWidth: number;
}

export type Shape = PenShape | RectangleShape | CircleShape | LineShape | PolygonShape | TextShape | CountShape;
