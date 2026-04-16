import { useState, useRef, useEffect } from "react";

interface ScaleCalibrationDialogProps {
  pixelDistance: number;
  onConfirm: (realDistance: number, unit: string) => void;
  onCancel: () => void;
}

const UNITS = [
  { value: "ft", label: "Feet (ft)" },
  { value: "in", label: "Inches (in)" },
  { value: "m", label: "Meters (m)" },
  { value: "cm", label: "Centimeters (cm)" },
  { value: "mm", label: "Millimeters (mm)" },
];

export function ScaleCalibrationDialog({
  pixelDistance,
  onConfirm,
  onCancel,
}: ScaleCalibrationDialogProps) {
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState("ft");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(distance);
    if (val > 0) {
      onConfirm(val, unit);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel} onKeyDown={handleKeyDown}>
      <div
        className="bg-gray-900 border border-white/10 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-white font-semibold text-lg mb-1">Set Drawing Scale</h3>
        <p className="text-white/50 text-sm mb-4">
          You drew a reference line of <span className="text-amber-400 font-mono">{Math.round(pixelDistance)}px</span>.
          Enter the real-world distance it represents.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              step="any"
              min="0.01"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              placeholder="e.g. 20"
              className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
              autoFocus
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white/70 hover:text-white hover:bg-white/20 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!distance || parseFloat(distance) <= 0}
              className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold text-sm hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Set Scale
            </button>
          </div>
          <p className="text-white/30 text-[11px] text-center">
            Tip: Use a known dimension line on the drawing (e.g. a scale bar or dimension callout)
          </p>
        </form>
      </div>
    </div>
  );
}
