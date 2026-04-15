import { useState, useRef, useEffect } from "react";
import type { Point } from "./types";

interface TextInputOverlayProps {
  position: Point;
  zoom: number;
  panOffset: Point;
  color: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}

export function TextInputOverlay({
  position,
  zoom,
  panOffset,
  color,
  onSubmit,
  onCancel,
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

  const screenX = position.x * zoom + panOffset.x;
  const screenY = position.y * zoom + panOffset.y;

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
