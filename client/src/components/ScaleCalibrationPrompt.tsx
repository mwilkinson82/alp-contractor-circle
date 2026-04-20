/**
 * ScaleCalibrationPrompt v6
 *
 * Three modes:
 *   "all"     — Known scale from title block → pick from dropdown, applies to all sheets
 *   "groups"  — Different known scales by discipline (Arch/Struct/MEP/Civil)
 *   "measure" — Scale NOT noted on drawings or you want to set your own custom scale
 *               → click two points on a drawing, type the real-world distance, system calculates px/ft
 *
 * Clear UX messaging:
 *   - Dropdown modes = "I know my drawing scale (it's in the title block)"
 *   - Measure mode   = "Scale isn't noted, isn't accurate, or I want to set my own"
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Ruler, CheckCircle2, Layers, Crosshair, RotateCcw, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

export const DRAWING_SCALES = [
  { label: '1/4" = 1\'-0"  (most common)', drawingInchesPerFt: 0.25 },
  { label: '1/8" = 1\'-0"',                drawingInchesPerFt: 0.125 },
  { label: '3/16" = 1\'-0"',               drawingInchesPerFt: 0.1875 },
  { label: '3/8" = 1\'-0"',                drawingInchesPerFt: 0.375 },
  { label: '1/2" = 1\'-0"',                drawingInchesPerFt: 0.5 },
  { label: '3/4" = 1\'-0"',                drawingInchesPerFt: 0.75 },
  { label: '1" = 1\'-0"',                  drawingInchesPerFt: 1.0 },
  { label: '1" = 10\'',                     drawingInchesPerFt: 0.1 },
  { label: '1" = 20\'',                     drawingInchesPerFt: 0.05 },
  { label: '1" = 30\'',                     drawingInchesPerFt: 1 / 30 },
  { label: '1" = 40\'',                     drawingInchesPerFt: 0.025 },
  { label: '1" = 50\'',                     drawingInchesPerFt: 0.02 },
  { label: '1" = 100\'',                    drawingInchesPerFt: 0.01 },
  { label: '1:100  (metric)',               drawingInchesPerFt: 0.1181 },
  { label: '1:200  (metric)',               drawingInchesPerFt: 0.05906 },
  { label: '1:500  (metric)',               drawingInchesPerFt: 0.02362 },
];

export const PAPER_SIZES = [
  { label: '24" × 36"  (Arch D — most common)', dpi: 150 },
  { label: '30" × 42"  (Arch E1)',               dpi: 150 },
  { label: '36" × 48"  (Arch E)',                dpi: 150 },
  { label: '11" × 17"  (Tabloid)',               dpi: 150 },
  { label: '8.5" × 11"  (Letter)',               dpi: 150 },
  { label: '18" × 24"  (Arch C)',                dpi: 150 },
];

const DISCIPLINES = [
  { key: "arch",   label: "Architectural",  color: "text-blue-300",   prefixes: ["a-", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "arch"] },
  { key: "struct", label: "Structural",     color: "text-orange-300", prefixes: ["s-", "s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "str"] },
  { key: "mep",    label: "MEP / Plumbing", color: "text-green-300",  prefixes: ["m-", "m0", "m1", "m2", "m3", "p-", "p0", "p1", "p2", "e-", "e0", "e1", "e2", "mep", "mech", "plum", "elec"] },
  { key: "civil",  label: "Civil / Site",   color: "text-purple-300", prefixes: ["c-", "c0", "c1", "c2", "c3", "c4", "civ", "site", "l-", "l0", "l1"] },
  { key: "other",  label: "Other / General",color: "text-white/60",   prefixes: [] },
];

const MEASURE_UNITS = [
  { value: "ft", label: "Feet" },
  { value: "in", label: "Inches" },
  { value: "m",  label: "Meters" },
  { value: "cm", label: "Centimeters" },
];

function guessGroup(sheetName: string): string {
  const lower = (sheetName || "").toLowerCase().trim();
  for (const d of DISCIPLINES.filter(d => d.key !== "other")) {
    if (d.prefixes.some(p => lower.startsWith(p) || lower.includes(p))) return d.key;
  }
  return "other";
}

export function pxPerFt(scaleIdx: number, paperIdx: number): number {
  return DRAWING_SCALES[scaleIdx].drawingInchesPerFt * PAPER_SIZES[paperIdx].dpi;
}

/** Convert a measured px/unit ratio to px/ft for storage consistency */
function toPxPerFt(pxPerUnit: number, unit: string): number {
  switch (unit) {
    case "ft": return pxPerUnit;
    case "in": return pxPerUnit * 12;
    case "m":  return pxPerUnit / 3.28084;
    case "cm": return pxPerUnit / 0.328084;
    default: return pxPerUnit;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Sheet { id: number; sheetName?: string; pageNumber?: number; imageUrl?: string; }
interface SheetScale { ratio: number; unit: string; }
interface Props {
  open: boolean;
  sheets: Sheet[];
  projectId: number;
  onComplete: (scales: Record<number, SheetScale>) => void;
  onSkipAll: () => void;
}
interface Point { x: number; y: number; }

// ── Scale row for dropdown modes ─────────────────────────────────────────────

function ScaleRow({
  label, color, count, scaleIdx, paperIdx, onScaleChange, onPaperChange,
}: {
  label: string; color: string; count: number;
  scaleIdx: number; paperIdx: number;
  onScaleChange: (i: number) => void; onPaperChange: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-white/3 border border-white/8">
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
        <Badge variant="outline" className="border-white/20 text-white/50 text-xs ml-auto">
          {count} sheet{count !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={String(scaleIdx)} onValueChange={v => onScaleChange(Number(v))}>
            <SelectTrigger className="bg-navy-deep/60 border-white/20 text-white h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-navy-medium border-white/10 max-h-64">
              {DRAWING_SCALES.map((s, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-44">
          <Select value={String(paperIdx)} onValueChange={v => onPaperChange(Number(v))}>
            <SelectTrigger className="bg-navy-deep/60 border-white/20 text-white h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-navy-medium border-white/10">
              {PAPER_SIZES.map((p, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ── Inline Measure Tool (embedded in the dialog, not fullscreen) ─────────────

function MeasureTool({
  sheet,
  onMeasured,
}: {
  sheet: Sheet;
  onMeasured: (pxPerFtRatio: number) => void;
}) {
  const [step, setStep] = useState<"pick_p1" | "pick_p2" | "enter_dist">("pick_p1");
  const [p1, setP1] = useState<Point | null>(null);
  const [p2, setP2] = useState<Point | null>(null);
  const [pixelDist, setPixelDist] = useState(0);
  const [distance, setDistance] = useState("");
  const [unit, setUnit] = useState("ft");
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "enter_dist") setTimeout(() => inputRef.current?.focus(), 80);
  }, [step]);

  const toImageCoords = useCallback((e: React.MouseEvent<HTMLDivElement>): Point => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const cw = rect.width, ch = rect.height;
    const nw = img.naturalWidth || cw, nh = img.naturalHeight || ch;
    const imgAspect = nw / nh, ctnAspect = cw / ch;
    let iw: number, ih: number;
    if (imgAspect > ctnAspect) { iw = cw; ih = cw / imgAspect; }
    else { ih = ch; iw = ch * imgAspect; }
    const ox = (cw - iw) / 2, oy = (ch - ih) / 2;
    return {
      x: Math.max(0, Math.min(nw, ((cx - ox) / iw) * nw)),
      y: Math.max(0, Math.min(nh, ((cy - oy) / ih) * nh)),
    };
  }, []);

  const toContainerCoords = useCallback((p: Point): Point => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const cw = rect.width, ch = rect.height;
    const nw = img.naturalWidth || cw, nh = img.naturalHeight || ch;
    const imgAspect = nw / nh, ctnAspect = cw / ch;
    let iw: number, ih: number;
    if (imgAspect > ctnAspect) { iw = cw; ih = cw / imgAspect; }
    else { ih = ch; iw = ch * imgAspect; }
    const ox = (cw - iw) / 2, oy = (ch - ih) / 2;
    return { x: ox + (p.x / nw) * iw, y: oy + (p.y / nh) * ih };
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (step === "pick_p1") {
      setP1(toImageCoords(e));
      setStep("pick_p2");
    } else if (step === "pick_p2") {
      const pt = toImageCoords(e);
      setP2(pt);
      if (p1) {
        const dx = pt.x - p1.x, dy = pt.y - p1.y;
        setPixelDist(Math.sqrt(dx * dx + dy * dy));
      }
      setStep("enter_dist");
    }
  }, [step, p1, toImageCoords]);

  const handleConfirm = () => {
    const val = parseFloat(distance);
    if (!val || val <= 0 || pixelDist <= 0) return;
    const pxPerUnit = pixelDist / val;
    const ratio = toPxPerFt(pxPerUnit, unit);
    onMeasured(ratio);
  };

  const handleReset = () => {
    setStep("pick_p1");
    setP1(null); setP2(null);
    setDistance(""); setPixelDist(0);
  };

  const c1 = p1 ? toContainerCoords(p1) : null;
  const c2 = p2 ? toContainerCoords(p2) : null;
  const sheetLabel = sheet.sheetName || `Sheet ${sheet.pageNumber}`;

  return (
    <div className="space-y-3">
      {/* Drawing preview with click area */}
      <div
        ref={containerRef}
        className="relative rounded-lg overflow-hidden bg-black/40 border border-white/10"
        style={{
          height: 320,
          cursor: step === "pick_p1" || step === "pick_p2" ? "crosshair" : "default",
        }}
        onClick={handleClick}
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
          <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
            No preview available — upload a drawing first
          </div>
        )}
        {/* Overlay line + points */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
          {c1 && c2 && (
            <line x1={c1.x} y1={c1.y} x2={c2.x} y2={c2.y} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
          )}
          {c1 && (
            <>
              <circle cx={c1.x} cy={c1.y} r="6" fill="#f59e0b" opacity="0.9" />
              <text x={c1.x + 9} y={c1.y - 5} fill="#f59e0b" fontSize="11" fontWeight="bold">A</text>
            </>
          )}
          {c2 && (
            <>
              <circle cx={c2.x} cy={c2.y} r="6" fill="#10b981" opacity="0.9" />
              <text x={c2.x + 9} y={c2.y - 5} fill="#10b981" fontSize="11" fontWeight="bold">B</text>
            </>
          )}
        </svg>
      </div>

      {/* Step instructions */}
      {step === "pick_p1" && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <p className="text-amber-300 text-sm font-semibold">Step 1: Click the start of a known dimension</p>
          <p className="text-white/50 text-xs mt-0.5">Pick a wall, door, room width — anything you know the real length of.</p>
        </div>
      )}
      {step === "pick_p2" && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3">
          <p className="text-emerald-300 text-sm font-semibold">Step 2: Click the other end of that dimension</p>
          <p className="text-white/50 text-xs mt-0.5">Click the opposite end of the same wall, door, or measurement.</p>
        </div>
      )}
      {step === "enter_dist" && (
        <div className="space-y-2">
          <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-3">
            <p className="text-white text-sm font-medium">
              Measured: <span className="text-amber-400 font-mono">{Math.round(pixelDist)}px</span> on screen
            </p>
            <p className="text-white/50 text-xs mt-0.5">Enter the real-world distance between those two points:</p>
          </div>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="number"
              step="any"
              min="0.01"
              value={distance}
              onChange={e => setDistance(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleConfirm()}
              placeholder="e.g. 20"
              className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30"
            />
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="w-32 bg-black/50 border-white/20 text-white h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-navy-medium border-white/10">
                {MEASURE_UNITS.map(u => (
                  <SelectItem key={u.value} value={u.value} className="text-sm">{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold h-10 px-5"
              disabled={!distance || parseFloat(distance) <= 0}
              onClick={handleConfirm}
            >
              Apply Scale
            </Button>
          </div>
          <button type="button" onClick={handleReset} className="text-white/40 hover:text-white/60 text-xs flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Start over
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScaleCalibrationPrompt({ open, sheets, projectId, onComplete, onSkipAll }: Props) {
  const [mode, setMode] = useState<"all" | "groups" | "measure">("all");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // "all" mode state
  const [allScaleIdx, setAllScaleIdx] = useState(0);
  const [allPaperIdx, setAllPaperIdx] = useState(0);

  // "groups" mode state
  const [groupScales, setGroupScales] = useState<Record<string, { scaleIdx: number; paperIdx: number }>>(
    Object.fromEntries(DISCIPLINES.map(d => [d.key, { scaleIdx: 0, paperIdx: 0 }]))
  );

  // "measure" mode state
  const [measureSheetIdx, setMeasureSheetIdx] = useState(0);
  const [measuredRatio, setMeasuredRatio] = useState<number | null>(null);

  // ── Remember last-used scale ────────────────────────────────────────────────
  const prefQuery = trpc.takeoff.getScalePreference.useQuery(undefined, { enabled: open });
  const savePrefMutation = trpc.takeoff.saveScalePreference.useMutation();
  const bulkScaleMutation = trpc.takeoff.bulkSaveSheetScale.useMutation();

  useEffect(() => {
    if (prefQuery.data) {
      const { lastScaleIdx, lastPaperIdx } = prefQuery.data;
      if (lastScaleIdx >= 0 && lastScaleIdx < DRAWING_SCALES.length) setAllScaleIdx(lastScaleIdx);
      if (lastPaperIdx >= 0 && lastPaperIdx < PAPER_SIZES.length) setAllPaperIdx(lastPaperIdx);
      setGroupScales(prev => {
        const next = { ...prev };
        for (const key of Object.keys(next)) {
          next[key] = { scaleIdx: lastScaleIdx || 0, paperIdx: lastPaperIdx || 0 };
        }
        return next;
      });
    }
  }, [prefQuery.data]);

  const sheetGroups = useMemo(() => {
    const groups: Record<string, Sheet[]> = Object.fromEntries(DISCIPLINES.map(d => [d.key, []]));
    for (const sheet of sheets) {
      const g = guessGroup(sheet.sheetName || `Sheet ${sheet.pageNumber}`);
      groups[g].push(sheet);
    }
    return groups;
  }, [sheets]);

  const activeGroups = DISCIPLINES.filter(d => sheetGroups[d.key].length > 0);

  const handleApply = async () => {
    if (saving || done) return;
    setSaving(true);
    try {
      const scalesMap: Record<number, SheetScale> = {};

      if (mode === "measure" && measuredRatio) {
        // Apply the measured ratio to all sheets
        await bulkScaleMutation.mutateAsync({
          projectId,
          sheetIds: sheets.map(s => s.id),
          scaleRatio: measuredRatio,
          scaleUnit: "ft",
        });
        for (const sheet of sheets) {
          scalesMap[sheet.id] = { ratio: measuredRatio, unit: "ft" };
        }
      } else if (mode === "all") {
        const ratio = pxPerFt(allScaleIdx, allPaperIdx);
        await bulkScaleMutation.mutateAsync({
          projectId,
          sheetIds: sheets.map(s => s.id),
          scaleRatio: ratio,
          scaleUnit: "ft",
        });
        for (const sheet of sheets) {
          scalesMap[sheet.id] = { ratio, unit: "ft" };
        }
        savePrefMutation.mutate({ lastScaleIdx: allScaleIdx, lastPaperIdx: allPaperIdx });
      } else {
        for (const disc of DISCIPLINES) {
          const groupSheets = sheetGroups[disc.key];
          if (!groupSheets.length) continue;
          const { scaleIdx, paperIdx } = groupScales[disc.key];
          const ratio = pxPerFt(scaleIdx, paperIdx);
          await bulkScaleMutation.mutateAsync({
            projectId,
            sheetIds: groupSheets.map(s => s.id),
            scaleRatio: ratio,
            scaleUnit: "ft",
          });
          for (const sheet of groupSheets) {
            scalesMap[sheet.id] = { ratio, unit: "ft" };
          }
        }
        const firstGroup = activeGroups[0];
        if (firstGroup) {
          const { scaleIdx, paperIdx } = groupScales[firstGroup.key];
          savePrefMutation.mutate({ lastScaleIdx: scaleIdx, lastPaperIdx: paperIdx });
        }
      }

      setDone(true);
      toast.success(`Scale set for all ${sheets.length} sheets`);
      setTimeout(() => onComplete(scalesMap), 400);
    } catch (err: any) {
      toast.error(`Failed to save scale: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen && !saving) onSkipAll();
  };

  const handleMeasured = (ratio: number) => {
    setMeasuredRatio(ratio);
    toast.success("Scale calculated — hit 'Set Scale & Analyze' to apply to all sheets.");
  };

  // Pick a sheet to measure on — prefer one with an imageUrl
  const measureSheet = sheets[measureSheetIdx] || sheets[0];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`bg-navy-medium border-white/10 text-white max-h-[90vh] overflow-y-auto ${mode === "measure" ? "max-w-3xl" : "max-w-xl"}`}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Ruler className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl text-white">Set Drawing Scale</DialogTitle>
              <DialogDescription className="text-white/60 text-sm mt-0.5">
                {sheets.length} sheet{sheets.length !== 1 ? "s" : ""} uploaded. Set the scale so the AI can calculate accurate quantities.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Mode toggle ── */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
                mode === "all" ? "bg-amber-500/15 border-amber-500/50 text-amber-300" : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              <Ruler className="w-4 h-4" />
              <span>Known Scale</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("groups")}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
                mode === "groups" ? "bg-amber-500/15 border-amber-500/50 text-amber-300" : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>By Discipline</span>
            </button>
            <button
              type="button"
              onClick={() => setMode("measure")}
              className={`flex-1 flex flex-col items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
                mode === "measure" ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300" : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              <Crosshair className="w-4 h-4" />
              <span>Measure on Drawing</span>
            </button>
          </div>
          {/* Mode description */}
          <p className="text-white/40 text-xs px-1">
            {mode === "all" && "Scale is noted in the title block — pick it from the dropdown."}
            {mode === "groups" && "Different trades at different scales — set one per discipline."}
            {mode === "measure" && "Scale isn't noted on the drawings, isn't accurate, or you want to set your own custom scale."}
          </p>
        </div>

        {/* ── Content ── */}
        {mode === "all" && (
          <div className="space-y-3">
            <ScaleRow
              label="All Sheets"
              color="text-amber-300"
              count={sheets.length}
              scaleIdx={allScaleIdx}
              paperIdx={allPaperIdx}
              onScaleChange={setAllScaleIdx}
              onPaperChange={setAllPaperIdx}
            />
            <div className="bg-white/3 rounded-lg px-4 py-2.5 text-xs text-white/50">
              <span className="text-white/70 font-medium">{DRAWING_SCALES[allScaleIdx].label.split("(")[0].trim()}</span>
              {" on "}
              <span className="text-white/70 font-medium">{PAPER_SIZES[allPaperIdx].label.split("(")[0].trim()}</span>
              {" → "}
              <span className="text-amber-300 font-medium">{pxPerFt(allScaleIdx, allPaperIdx).toFixed(1)} px/ft</span>
            </div>
          </div>
        )}

        {mode === "groups" && (
          <div className="space-y-2">
            {activeGroups.map(disc => (
              <ScaleRow
                key={disc.key}
                label={`${disc.label}  (${sheetGroups[disc.key].map(s => s.sheetName || `Sheet ${s.pageNumber}`).slice(0, 3).join(", ")}${sheetGroups[disc.key].length > 3 ? "…" : ""})`}
                color={disc.color}
                count={sheetGroups[disc.key].length}
                scaleIdx={groupScales[disc.key].scaleIdx}
                paperIdx={groupScales[disc.key].paperIdx}
                onScaleChange={i => setGroupScales(prev => ({ ...prev, [disc.key]: { ...prev[disc.key], scaleIdx: i } }))}
                onPaperChange={i => setGroupScales(prev => ({ ...prev, [disc.key]: { ...prev[disc.key], paperIdx: i } }))}
              />
            ))}
          </div>
        )}

        {mode === "measure" && (
          <div className="space-y-3">
            {/* Sheet selector if multiple sheets */}
            {sheets.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-white/50 text-xs">Measuring on:</span>
                <Select value={String(measureSheetIdx)} onValueChange={v => { setMeasureSheetIdx(Number(v)); setMeasuredRatio(null); }}>
                  <SelectTrigger className="bg-navy-deep/60 border-white/20 text-white h-8 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-medium border-white/10 max-h-48">
                    {sheets.map((s, i) => (
                      <SelectItem key={s.id} value={String(i)} className="text-xs">
                        {s.sheetName || `Sheet ${s.pageNumber || i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <MeasureTool
              key={measureSheet.id}
              sheet={measureSheet}
              onMeasured={handleMeasured}
            />

            {measuredRatio && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-emerald-300 text-sm font-semibold">Scale calculated: {measuredRatio.toFixed(1)} px/ft</p>
                  <p className="text-white/50 text-xs">This will be applied to all {sheets.length} sheets when you hit the button below.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-2 gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkipAll}
            disabled={saving}
            className="text-white/40 hover:text-white/60 hover:bg-white/5 text-sm"
          >
            Skip — Let AI Estimate
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            disabled={saving || done || (mode === "measure" && !measuredRatio)}
            className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-8 h-11 text-base"
          >
            {done
              ? <><CheckCircle2 className="w-4 h-4 mr-2" />Done</>
              : saving
              ? "Saving..."
              : `Set Scale & Analyze →`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
