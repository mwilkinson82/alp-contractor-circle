/**
 * ScaleCalibrationPrompt — fires after every sheet upload.
 *
 * UX priorities (v2):
 * 1. Bulk-apply is the HERO option — always visible, prominent, one-click.
 * 2. Individual calibration is secondary / optional.
 * 3. Skip freeze fixed — Dialog onOpenChange no longer swallows events;
 *    all state updates use functional form to avoid stale closure issues.
 */
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Ruler,
  CheckCircle2,
  SkipForward,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface Sheet {
  id: number;
  sheetName?: string;
  pageNumber?: number;
  imageUrl?: string;
}

interface SheetScale {
  ratio: number;
  unit: string;
}

interface Props {
  open: boolean;
  sheets: Sheet[];
  projectId: number;
  onComplete: (scales: Record<number, SheetScale>) => void;
  onSkipAll: () => void;
}

const UNITS = [
  { value: "ft", label: "Feet (ft)" },
  { value: "in", label: "Inches (in)" },
  { value: "m",  label: "Meters (m)" },
  { value: "cm", label: "Centimeters (cm)" },
];

export default function ScaleCalibrationPrompt({
  open,
  sheets,
  projectId,
  onComplete,
  onSkipAll,
}: Props) {
  const [scales, setScales] = useState<Record<number, SheetScale>>({});
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [bulkRatio, setBulkRatio] = useState("");
  const [bulkUnit, setBulkUnit] = useState("ft");
  const [showIndividual, setShowIndividual] = useState(false);
  const [saving, setSaving] = useState(false);
  // Track whether bulk has been applied so we can show a confirmation state
  const [bulkApplied, setBulkApplied] = useState(false);

  const saveMarkupMutation = trpc.takeoff.saveSheetMarkup.useMutation();

  // ── Bulk apply ────────────────────────────────────────────────────────────
  const handleBulkApply = useCallback(() => {
    const r = parseFloat(bulkRatio);
    if (isNaN(r) || r <= 0) {
      toast.error("Enter a valid scale value first");
      return;
    }
    const newScales: Record<number, SheetScale> = {};
    for (const sheet of sheets) {
      newScales[sheet.id] = { ratio: r, unit: bulkUnit };
    }
    setScales(newScales);
    setSkipped(new Set());
    setBulkApplied(true);
    toast.success(`Scale ${r} px/${bulkUnit} applied to all ${sheets.length} sheets`);
  }, [bulkRatio, bulkUnit, sheets]);

  // ── Per-sheet helpers ─────────────────────────────────────────────────────
  const handleSkip = useCallback((sheetId: number) => {
    setSkipped(prev => {
      const next = new Set(prev);
      next.add(sheetId);
      return next;
    });
    setScales(prev => {
      const next = { ...prev };
      delete next[sheetId];
      return next;
    });
  }, []);

  const handleUnskip = useCallback((sheetId: number) => {
    setSkipped(prev => {
      const next = new Set(prev);
      next.delete(sheetId);
      return next;
    });
  }, []);

  const handleSetScale = useCallback((sheetId: number, ratio: string, unit: string) => {
    const r = parseFloat(ratio);
    if (!isNaN(r) && r > 0) {
      setScales(prev => ({ ...prev, [sheetId]: { ratio: r, unit } }));
      setSkipped(prev => {
        const next = new Set(prev);
        next.delete(sheetId);
        return next;
      });
    }
  }, []);

  // ── Continue / save ───────────────────────────────────────────────────────
  const handleContinue = async () => {
    if (saving) return;
    setSaving(true);
    try {
      for (const [sheetIdStr, scale] of Object.entries(scales)) {
        const sheetId = parseInt(sheetIdStr);
        await saveMarkupMutation.mutateAsync({
          sheetId,
          projectId,
          shapesJson: "",
          scaleRatio: scale.ratio,
          scaleUnit: scale.unit,
        });
      }
      onComplete(scales);
    } catch (err: any) {
      toast.error(`Failed to save scales: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const calibratedCount = Object.keys(scales).length;
  const totalCount = sheets.length;
  const allCalibratedViaBulk = bulkApplied && calibratedCount === totalCount;

  return (
    <Dialog
      open={open}
      // Allow the dialog to be dismissed only via explicit buttons, not
      // by clicking the overlay — prevents accidental close mid-calibration.
      // The empty handler is intentional; we do NOT call onOpenChange(false)
      // here because the parent controls open state via onComplete/onSkipAll.
      onOpenChange={(_open) => {
        // Do nothing — parent owns open state
      }}
    >
      <DialogContent className="max-w-2xl bg-navy-medium border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Ruler className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl text-white">Set Drawing Scale</DialogTitle>
              <DialogDescription className="text-white/60 text-sm mt-0.5">
                Calibrate your sheets for accurate AI measurements — the single biggest factor in takeoff accuracy.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Accuracy callout */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-amber-200/90 text-sm">
            Without scale calibration, the AI estimates quantities from visual proportions only.
            A calibrated scale can improve measurement accuracy by <strong>40–60%</strong>.
          </p>
        </div>

        {/* ── HERO: Bulk apply ─────────────────────────────────────────────── */}
        <div className={`rounded-xl border-2 p-4 transition-all ${
          allCalibratedViaBulk
            ? "border-green-500/50 bg-green-500/5"
            : "border-amber-500/40 bg-amber-500/5"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className={`w-4 h-4 ${allCalibratedViaBulk ? "text-green-400" : "text-amber-400"}`} />
            <p className="text-sm font-semibold text-white">
              Apply one scale to all {totalCount} sheet{totalCount !== 1 ? "s" : ""}
            </p>
            <Badge
              variant="outline"
              className={`ml-auto text-xs ${
                allCalibratedViaBulk
                  ? "border-green-500/40 text-green-300"
                  : "border-amber-500/40 text-amber-300"
              }`}
            >
              {allCalibratedViaBulk ? "✓ All calibrated" : "Recommended"}
            </Badge>
          </div>

          <p className="text-white/50 text-xs mb-3">
            If all your sheets are from the same drawing set at the same print scale, enter the
            pixels-per-unit value once and it applies to every sheet instantly.
          </p>

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label className="text-white/60 text-xs mb-1 block">Pixels per unit</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 96.5"
                value={bulkRatio}
                onChange={e => { setBulkRatio(e.target.value); setBulkApplied(false); }}
                className="bg-navy-deep/50 border-white/20 text-white h-9"
                onKeyDown={e => { if (e.key === "Enter") handleBulkApply(); }}
              />
            </div>
            <div className="w-32">
              <Label className="text-white/60 text-xs mb-1 block">Unit</Label>
              <Select value={bulkUnit} onValueChange={v => { setBulkUnit(v); setBulkApplied(false); }}>
                <SelectTrigger className="bg-navy-deep/50 border-white/20 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-navy-medium border-white/10">
                  {UNITS.map(u => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleBulkApply}
              className={`h-9 px-5 font-semibold ${
                allCalibratedViaBulk
                  ? "bg-green-600 hover:bg-green-700 text-white"
                  : "bg-amber-500 hover:bg-amber-600 text-black"
              }`}
            >
              {allCalibratedViaBulk ? (
                <><CheckCircle2 className="w-4 h-4 mr-1.5" />Applied</>
              ) : (
                "Apply to All"
              )}
            </Button>
          </div>
        </div>

        {/* ── Individual calibration (collapsible, secondary) ──────────────── */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/70 hover:bg-white/5 transition-colors"
            onClick={() => setShowIndividual(v => !v)}
          >
            <span>
              Individual sheet calibration
              {calibratedCount > 0 && !allCalibratedViaBulk && (
                <span className="ml-2 text-amber-400 text-xs">({calibratedCount}/{totalCount} set)</span>
              )}
            </span>
            {showIndividual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showIndividual && (
            <div className="border-t border-white/10 divide-y divide-white/5">
              {sheets.map(sheet => {
                const scale = scales[sheet.id];
                const isSkipped = skipped.has(sheet.id);
                return (
                  <div
                    key={sheet.id}
                    className={`px-4 py-3 flex gap-3 items-center transition-all ${
                      scale
                        ? "bg-green-500/5"
                        : isSkipped
                        ? "opacity-50"
                        : ""
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-14 h-10 rounded bg-navy-deep/50 flex-shrink-0 overflow-hidden">
                      {sheet.imageUrl ? (
                        <img src={sheet.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                          {sheet.pageNumber}
                        </div>
                      )}
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {sheet.sheetName || `Sheet ${sheet.pageNumber}`}
                      </p>
                      {scale ? (
                        <p className="text-xs text-green-400 mt-0.5">
                          {scale.ratio.toFixed(2)} px/{scale.unit}
                        </p>
                      ) : isSkipped ? (
                        <p className="text-xs text-white/40 mt-0.5">Skipped</p>
                      ) : (
                        <p className="text-xs text-amber-400/70 mt-0.5">Not set</p>
                      )}
                    </div>

                    {/* Per-sheet controls */}
                    <div className="flex gap-1.5 items-center flex-shrink-0">
                      {scale && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      {!isSkipped ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-white/20 text-white/60 hover:bg-white/10"
                          onClick={() => handleSkip(sheet.id)}
                        >
                          <SkipForward className="w-3 h-3 mr-1" />
                          Skip
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          onClick={() => handleUnskip(sheet.id)}
                        >
                          Undo
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onSkipAll}
            disabled={saving}
            className="text-white/40 hover:text-white/70 hover:bg-white/5 text-sm"
          >
            Skip All — Use AI Estimation
          </Button>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6"
          >
            {saving
              ? "Saving..."
              : calibratedCount > 0
              ? `Continue — ${calibratedCount} Sheet${calibratedCount !== 1 ? "s" : ""} Calibrated`
              : "Continue to Analysis"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
