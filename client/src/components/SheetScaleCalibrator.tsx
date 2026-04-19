/**
 * SheetScaleCalibrator
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight fullscreen overlay that lets the user click two points on a
 * drawing sheet to define a reference distance, then enter the real-world
 * measurement. The resulting pixels-per-unit ratio is saved via the
 * takeoff.saveSheetMarkup mutation (preserving any existing shapes).
 *
 * Usage:
 *   <SheetScaleCalibrator
 *     sheet={sheet}
 *     projectId={projectId}
 *     existingMarkup={markup}   // from takeoff.getSheetMarkup
 *     onClose={() => ...}
 *     onSaved={(ratio, unit) => ...}
 *   />
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { X, Ruler, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Point { x: number; y: number }

interface SheetScaleCalibratorProps {
  sheet: { id: number; sheetName?: string; pageNumber?: number; imageUrl?: string };
  projectId: number;
  existingMarkup?: { shapesJson: string; scaleRatio: number; scaleUnit: string } | null;
  onClose: () => void;
  onSaved?: (ratio: number, unit: string) => void;
}

const UNITS = [
  { value: "ft", label: "Feet (ft)" },
  { value: "in", label: "Inches (in)" },
  { value: "m",  label: "Meters (m)" },
  { value: "cm", label: "Centimeters (cm)" },
  { value: "mm", label: "Millimeters (mm)" },
];

type Step = "instructions" | "picking_p1" | "picking_p2" | "entering_distance" | "saved";

export default function SheetScaleCalibrator({
  sheet,
  projectId,
  existingMarkup,
  onClose,
  onSaved,
}: SheetScaleCalibratorProps) {
  const [step, setStep] = useState<Step>("instructions");
  const [p1, setP1] = useState<Point | null>(null);
  const [p2, setP2] = useState<Point | null>(null);
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState("ft");
  const [pixelDist, setPixelDist] = useState(0);
  const [savedRatio, setSavedRatio] = useState(existingMarkup?.scaleRatio ?? 0);
  const [savedUnit, setSavedUnit] = useState(existingMarkup?.scaleUnit ?? "ft");
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const distInputRef = useRef<HTMLInputElement>(null);

  const saveMutation = trpc.takeoff.saveSheetMarkup.useMutation({
    onSuccess: (_, vars) => {
      const ratio = vars.scaleRatio;
      const u = vars.scaleUnit;
      setSavedRatio(ratio);
      setSavedUnit(u);
      setStep("saved");
      toast.success(`Scale set: 1 ${u} = ${Math.round(ratio)}px — AI will use this for analysis.`);
      onSaved?.(ratio, u);
    },
    onError: () => toast.error("Failed to save scale — please try again."),
  });

  // Focus distance input when entering_distance step
  useEffect(() => {
    if (step === "entering_distance") {
      setTimeout(() => distInputRef.current?.focus(), 50);
    }
  }, [step]);

  /** Convert a click event on the image container to image-space coordinates */
  const toImageCoords = useCallback((e: React.MouseEvent<HTMLDivElement>): Point => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return { x: 0, y: 0 };

    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    // object-fit: contain — compute actual rendered image rect
    const cw = rect.width;
    const ch = rect.height;
    const nw = img.naturalWidth || cw;
    const nh = img.naturalHeight || ch;
    const imgAspect = nw / nh;
    const ctnAspect = cw / ch;
    let iw: number, ih: number;
    if (imgAspect > ctnAspect) { iw = cw; ih = cw / imgAspect; }
    else { ih = ch; iw = ch * imgAspect; }
    const ox = (cw - iw) / 2;
    const oy = (ch - ih) / 2;

    // Clamp to image bounds
    const ix = Math.max(0, Math.min(nw, ((cx - ox) / iw) * nw));
    const iy = Math.max(0, Math.min(nh, ((cy - oy) / ih) * nh));
    return { x: ix, y: iy };
  }, []);

  /** Convert image-space point to container-space for overlay rendering */
  const toContainerCoords = useCallback((p: Point): Point => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cw = rect.width;
    const ch = rect.height;
    const nw = img.naturalWidth || cw;
    const nh = img.naturalHeight || ch;
    const imgAspect = nw / nh;
    const ctnAspect = cw / ch;
    let iw: number, ih: number;
    if (imgAspect > ctnAspect) { iw = cw; ih = cw / imgAspect; }
    else { ih = ch; iw = ch * imgAspect; }
    const ox = (cw - iw) / 2;
    const oy = (ch - ih) / 2;
    return {
      x: ox + (p.x / nw) * iw,
      y: oy + (p.y / nh) * ih,
    };
  }, []);

  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (step === "picking_p1") {
      const pt = toImageCoords(e);
      setP1(pt);
      setStep("picking_p2");
    } else if (step === "picking_p2") {
      const pt = toImageCoords(e);
      setP2(pt);
      if (p1) {
        const dx = pt.x - p1.x;
        const dy = pt.y - p1.y;
        setPixelDist(Math.sqrt(dx * dx + dy * dy));
      }
      setStep("entering_distance");
    }
  }, [step, p1, toImageCoords]);

  const handleConfirm = () => {
    const val = parseFloat(distance);
    if (!val || val <= 0 || pixelDist <= 0) return;
    const ratio = pixelDist / val; // pixels per real-world unit
    saveMutation.mutate({
      sheetId: sheet.id,
      projectId,
      shapesJson: existingMarkup?.shapesJson ?? "[]",
      scaleRatio: ratio,
      scaleUnit: unit,
    });
  };

  const handleReset = () => {
    setStep("instructions");
    setP1(null);
    setP2(null);
    setDistance("");
    setPixelDist(0);
  };

  // Render overlay points and line
  const renderOverlay = () => {
    if (!p1 && !p2) return null;
    const c1 = p1 ? toContainerCoords(p1) : null;
    const c2 = p2 ? toContainerCoords(p2) : null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
        {c1 && c2 && (
          <line
            x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y}
            stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3"
          />
        )}
        {c1 && (
          <>
            <circle cx={c1.x} cy={c1.y} r="7" fill="#f59e0b" opacity="0.9" />
            <text x={c1.x + 10} y={c1.y - 6} fill="#f59e0b" fontSize="12" fontWeight="bold">P1</text>
          </>
        )}
        {c2 && (
          <>
            <circle cx={c2.x} cy={c2.y} r="7" fill="#10b981" opacity="0.9" />
            <text x={c2.x + 10} y={c2.y - 6} fill="#10b981" fontSize="12" fontWeight="bold">P2</text>
          </>
        )}
      </svg>
    );
  };

  const sheetLabel = sheet.sheetName || `Page ${sheet.pageNumber}`;

  return (
    <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-navy/80">
        <div className="flex items-center gap-3">
          <Ruler className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-white font-semibold text-sm">Set Drawing Scale</p>
            <p className="text-cream-muted text-xs">{sheetLabel}</p>
          </div>
          {savedRatio > 0 && step !== "saved" && (
            <span className="ml-2 text-xs bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-2 py-0.5 rounded-full">
              Currently: 1 {savedUnit} = {Math.round(savedRatio)}px
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-cream-muted hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Drawing Area ── */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ cursor: step === "picking_p1" || step === "picking_p2" ? "crosshair" : "default" }}
        onClick={handleImageClick}
      >
        {sheet.imageUrl ? (
          <img
            ref={imgRef}
            src={sheet.imageUrl}
            alt={sheetLabel}
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cream-muted">
            No preview available for this sheet.
          </div>
        )}
        {renderOverlay()}
      </div>

      {/* ── Bottom Panel ── */}
      <div className="border-t border-white/10 bg-navy/90 px-5 py-4">
        {step === "instructions" && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-white text-sm font-medium">Click two points on a known dimension</p>
              <p className="text-cream-muted text-xs mt-0.5">
                Use a dimension line, scale bar, or any measurement you know the real-world length of.
                The AI will use this scale when extracting quantities from this sheet.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {savedRatio > 0 && (
                <Button variant="ghost" size="sm" className="text-cream-muted" onClick={onClose}>
                  Keep Existing
                </Button>
              )}
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold" onClick={() => setStep("picking_p1")}>
                <Ruler className="w-3.5 h-3.5 mr-1.5" />
                Start Calibration
              </Button>
            </div>
          </div>
        )}

        {step === "picking_p1" && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-amber-400 text-sm font-semibold">Click Point 1 — start of your reference dimension</p>
              <p className="text-cream-muted text-xs mt-0.5">Click on one end of a known dimension line or scale bar.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-cream-muted shrink-0" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        )}

        {step === "picking_p2" && (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-emerald-400 text-sm font-semibold">Click Point 2 — end of your reference dimension</p>
              <p className="text-cream-muted text-xs mt-0.5">Click on the other end of the same dimension line.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-cream-muted shrink-0" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          </div>
        )}

        {step === "entering_distance" && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-white text-sm font-medium mb-2">
                Reference line: <span className="text-amber-400 font-mono">{Math.round(pixelDist)}px</span> — enter the real-world distance it represents:
              </p>
              <div className="flex gap-2">
                <input
                  ref={distInputRef}
                  type="number"
                  step="any"
                  min="0.01"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
                  placeholder="e.g. 20"
                  className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
                />
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
                >
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-cream-muted" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Redo
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
                disabled={!distance || parseFloat(distance) <= 0 || saveMutation.isPending}
                onClick={handleConfirm}
              >
                {saveMutation.isPending ? "Saving..." : "Set Scale"}
              </Button>
            </div>
          </div>
        )}

        {step === "saved" && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">
                  Scale saved — 1 {savedUnit} = {Math.round(savedRatio)}px
                </p>
                <p className="text-cream-muted text-xs mt-0.5">
                  The AI will use this scale when analyzing this sheet. Re-analyze the sheet to apply it.
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" className="text-cream-muted" onClick={handleReset}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Recalibrate
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
