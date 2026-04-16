import { useState, useRef, useEffect } from "react";
import type { Point } from "./types";

interface TextInputOverlayProps {
  /** Position in image-space coordinates (natural image pixels) */
  position: Point;
  zoom: number;
  panOffset: Point;
  color: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
  /** Natural width of the source image */
  imageNaturalWidth?: number;
  /** Natural height of the source image */
  imageNaturalHeight?: number;
  /** Container width in CSS pixels */
  containerWidth?: number;
  /** Container height in CSS pixels */
  containerHeight?: number;
}

/**
 * Compute where the image actually renders inside its container
 * when using object-fit: contain.
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
    w = containerW;
    h = containerW / imgAspect;
  } else {
    h = containerH;
    w = containerH * imgAspect;
  }
  const x = (containerW - w) / 2;
  const y = (containerH - h) / 2;
  return { x, y, w, h };
}

export function TextInputOverlay({
  position,
  zoom,
  panOffset,
  color,
  onSubmit,
  onCancel,
  imageNaturalWidth = 0,
  imageNaturalHeight = 0,
  containerWidth = 0,
  containerHeight = 0,
}: TextInputOverlayProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) onSubmit(text.trim());
      else onCancel();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  // Convert image-space position to screen-space position
  // Must match the CSS transform on the image: translate(pan) scale(zoom) with transformOrigin center
  const fitted = computeFittedImageRect(containerWidth, containerHeight, imageNaturalWidth, imageNaturalHeight);
  const fitScale = fitted.w > 0 ? fitted.w / imageNaturalWidth : 1;

  // Position in pre-transform container space
  const preX = fitted.x + position.x * fitScale;
  const preY = fitted.y + position.y * fitScale;

  // Apply CSS transform: center-origin scale + translate
  const cx = containerWidth / 2;
  const cy = containerHeight / 2;
  const screenX = cx + (preX - cx) * zoom + panOffset.x;
  const screenY = cy + (preY - cy) * zoom + panOffset.y;

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      style={{ left: screenX, top: screenY }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className="bg-black/80 text-white border border-amber-500/50 rounded-lg px-3 py-2 text-sm font-bold outline-none resize-none min-w-[120px] max-w-[300px] backdrop-blur-sm shadow-xl"
        style={{ color, caretColor: color }}
        rows={1}
      />
      <div className="text-[10px] text-white/40 mt-1 px-1">
        Enter to confirm &middot; Esc to cancel
      </div>
    </div>
  );
}
