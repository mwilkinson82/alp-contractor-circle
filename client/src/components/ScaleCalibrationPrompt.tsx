/**
 * ScaleCalibrationPrompt v4
 *
 * Two modes:
 *   "all"    — One scale for the whole set (simple projects, same-scale drawings)
 *   "groups" — One scale per discipline: Arch / Structural / MEP / Civil / Other
 *              Sheets are auto-assigned to a group based on their name prefix.
 *
 * Members never see raw pixel values. They pick a standard drawing scale
 * (e.g. 1/4"=1'-0") and a print size — the math is invisible.
 */
import { useState, useMemo } from "react";
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
import { Ruler, CheckCircle2, Layers } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Constants ─────────────────────────────────────────────────────────────────

const DRAWING_SCALES = [
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

const PAPER_SIZES = [
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

function guessGroup(sheetName: string): string {
  const lower = (sheetName || "").toLowerCase().trim();
  for (const d of DISCIPLINES.filter(d => d.key !== "other")) {
    if (d.prefixes.some(p => lower.startsWith(p) || lower.includes(p))) return d.key;
  }
  return "other";
}

function pxPerFt(scaleIdx: number, paperIdx: number): number {
  return DRAWING_SCALES[scaleIdx].drawingInchesPerFt * PAPER_SIZES[paperIdx].dpi;
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

// ── Scale row for a single discipline or "all" ────────────────────────────────

function ScaleRow({
  label,
  color,
  count,
  scaleIdx,
  paperIdx,
  onScaleChange,
  onPaperChange,
}: {
  label: string;
  color: string;
  count: number;
  scaleIdx: number;
  paperIdx: number;
  onScaleChange: (i: number) => void;
  onPaperChange: (i: number) => void;
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

// ── Main component ────────────────────────────────────────────────────────────

export default function ScaleCalibrationPrompt({ open, sheets, projectId, onComplete, onSkipAll }: Props) {
  const [mode, setMode] = useState<"all" | "groups">("all");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // "all" mode state
  const [allScaleIdx, setAllScaleIdx] = useState(0);
  const [allPaperIdx, setAllPaperIdx] = useState(0);

  // "groups" mode state — scaleIdx + paperIdx per discipline key
  const [groupScales, setGroupScales] = useState<Record<string, { scaleIdx: number; paperIdx: number }>>(
    Object.fromEntries(DISCIPLINES.map(d => [d.key, { scaleIdx: 0, paperIdx: 0 }]))
  );

  const saveMarkupMutation = trpc.takeoff.saveSheetMarkup.useMutation();

  // Auto-assign sheets to discipline groups
  const sheetGroups = useMemo(() => {
    const groups: Record<string, Sheet[]> = Object.fromEntries(DISCIPLINES.map(d => [d.key, []]));
    for (const sheet of sheets) {
      const g = guessGroup(sheet.sheetName || `Sheet ${sheet.pageNumber}`);
      groups[g].push(sheet);
    }
    return groups;
  }, [sheets]);

  // Which groups actually have sheets (for groups mode)
  const activeGroups = DISCIPLINES.filter(d => sheetGroups[d.key].length > 0);

  const handleApply = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const scalesMap: Record<number, SheetScale> = {};

      if (mode === "all") {
        const ratio = pxPerFt(allScaleIdx, allPaperIdx);
        for (const sheet of sheets) {
          await saveMarkupMutation.mutateAsync({ sheetId: sheet.id, projectId, shapesJson: "", scaleRatio: ratio, scaleUnit: "ft" });
          scalesMap[sheet.id] = { ratio, unit: "ft" };
        }
      } else {
        for (const disc of DISCIPLINES) {
          const groupSheets = sheetGroups[disc.key];
          if (!groupSheets.length) continue;
          const { scaleIdx, paperIdx } = groupScales[disc.key];
          const ratio = pxPerFt(scaleIdx, paperIdx);
          for (const sheet of groupSheets) {
            await saveMarkupMutation.mutateAsync({ sheetId: sheet.id, projectId, shapesJson: "", scaleRatio: ratio, scaleUnit: "ft" });
            scalesMap[sheet.id] = { ratio, unit: "ft" };
          }
        }
      }

      setDone(true);
      toast.success(`Scale set for all ${sheets.length} sheets — starting analysis`);
      onComplete(scalesMap);
    } catch (err: any) {
      toast.error(`Failed to save scale: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl bg-navy-medium border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Ruler className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl text-white">Set Drawing Scale</DialogTitle>
              <DialogDescription className="text-white/60 text-sm mt-0.5">
                Pick your scale — applies to all {sheets.length} sheets instantly. Check the title block on your drawings.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("all")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
              mode === "all"
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "border-white/10 text-white/50 hover:bg-white/5"
            }`}
          >
            <Ruler className="w-4 h-4" />
            Same scale for all sheets
          </button>
          <button
            type="button"
            onClick={() => setMode("groups")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium border transition-all ${
              mode === "groups"
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "border-white/10 text-white/50 hover:bg-white/5"
            }`}
          >
            <Layers className="w-4 h-4" />
            Different scales by discipline
          </button>
        </div>

        {/* Content */}
        {mode === "all" ? (
          <div className="space-y-3">
            <p className="text-white/50 text-xs">All {sheets.length} sheets will use this scale.</p>
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
        ) : (
          <div className="space-y-2">
            <p className="text-white/50 text-xs">
              Sheets are auto-grouped by name prefix (A-, S-, M-, C-, etc.). Adjust if needed.
            </p>
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

        {/* Footer */}
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
            disabled={saving || done}
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
