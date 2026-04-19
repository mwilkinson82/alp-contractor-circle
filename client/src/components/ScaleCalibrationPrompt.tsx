/**
 * ScaleCalibrationPrompt — fires after every sheet upload.
 * Shows all pending sheets and lets the user set scale per sheet
 * or bulk-apply one scale to all, before running analysis.
 * Skippable per sheet; "Continue to Analysis" proceeds regardless.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ruler, CheckCircle2, SkipForward, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
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

export default function ScaleCalibrationPrompt({ open, sheets, projectId, onComplete, onSkipAll }: Props) {
  const [scales, setScales] = useState<Record<number, SheetScale>>({});
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [bulkRatio, setBulkRatio] = useState("");
  const [bulkUnit, setBulkUnit] = useState("ft");
  const [showBulk, setShowBulk] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveMarkupMutation = trpc.takeoff.saveSheetMarkup.useMutation();

  const handleSetScale = (sheetId: number, ratio: string, unit: string) => {
    const r = parseFloat(ratio);
    if (!isNaN(r) && r > 0) {
      setScales(prev => ({ ...prev, [sheetId]: { ratio: r, unit } }));
      setSkipped(prev => { const s = new Set(prev); s.delete(sheetId); return s; });
    }
  };

  const handleSkip = (sheetId: number) => {
    setSkipped(prev => new Set(prev).add(sheetId));
    setScales(prev => { const s = { ...prev }; delete s[sheetId]; return s; });
  };

  const handleBulkApply = () => {
    const r = parseFloat(bulkRatio);
    if (isNaN(r) || r <= 0) {
      toast.error("Enter a valid pixels-per-unit value");
      return;
    }
    const newScales: Record<number, SheetScale> = {};
    for (const sheet of sheets) {
      newScales[sheet.id] = { ratio: r, unit: bulkUnit };
    }
    setScales(newScales);
    setSkipped(new Set());
    toast.success(`Scale applied to all ${sheets.length} sheets`);
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      // Save all set scales to DB
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

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl bg-navy-medium border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Ruler className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-xl text-white">Set Drawing Scale</DialogTitle>
              <DialogDescription className="text-white/60 text-sm mt-0.5">
                Calibrate each sheet for accurate measurements. This is the single biggest factor in takeoff accuracy.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Accuracy callout */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex gap-2 items-start">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-amber-200/90 text-sm">
            Without scale calibration, the AI estimates quantities from visual proportions only. A calibrated scale can improve measurement accuracy by 40–60%. You can set scale now or skip and calibrate later from each sheet card.
          </p>
        </div>

        {/* Bulk apply */}
        <div className="border border-white/10 rounded-lg overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/5 transition-colors"
            onClick={() => setShowBulk(!showBulk)}
          >
            <span>Apply one scale to all sheets (same drawing set)</span>
            {showBulk ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showBulk && (
            <div className="px-4 pb-4 bg-white/3 border-t border-white/10">
              <p className="text-white/50 text-xs mb-3 mt-3">
                Enter the number of pixels that equals 1 unit on your drawings. Use the Set Scale tool on any sheet to measure this, then enter the value here.
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
                    onChange={e => setBulkRatio(e.target.value)}
                    className="bg-navy-deep/50 border-white/20 text-white h-9"
                  />
                </div>
                <div className="w-28">
                  <Label className="text-white/60 text-xs mb-1 block">Unit</Label>
                  <Select value={bulkUnit} onValueChange={setBulkUnit}>
                    <SelectTrigger className="bg-navy-deep/50 border-white/20 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-medium border-white/10">
                      <SelectItem value="ft">Feet (ft)</SelectItem>
                      <SelectItem value="in">Inches (in)</SelectItem>
                      <SelectItem value="m">Meters (m)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleBulkApply}
                  className="bg-amber-500 hover:bg-amber-600 text-black h-9 px-4"
                >
                  Apply All
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Per-sheet list */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-white/60 text-sm">Individual sheet calibration</p>
            <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-xs">
              {calibratedCount} of {totalCount} calibrated
            </Badge>
          </div>
          {sheets.map(sheet => {
            const scale = scales[sheet.id];
            const isSkipped = skipped.has(sheet.id);
            return (
              <div
                key={sheet.id}
                className={`rounded-lg border p-3 flex gap-3 items-center transition-all ${
                  scale
                    ? "border-green-500/30 bg-green-500/5"
                    : isSkipped
                    ? "border-white/5 bg-white/2 opacity-50"
                    : "border-white/10 bg-white/3"
                }`}
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 rounded bg-navy-deep/50 flex-shrink-0 overflow-hidden">
                  {sheet.imageUrl ? (
                    <img src={sheet.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                      {sheet.pageNumber}
                    </div>
                  )}
                </div>

                {/* Sheet name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {sheet.sheetName || `Sheet ${sheet.pageNumber}`}
                  </p>
                  {scale ? (
                    <p className="text-xs text-green-400 mt-0.5">
                      {scale.ratio.toFixed(2)} px/{scale.unit} — calibrated
                    </p>
                  ) : isSkipped ? (
                    <p className="text-xs text-white/40 mt-0.5">Skipped — AI will estimate scale</p>
                  ) : (
                    <p className="text-xs text-amber-400/70 mt-0.5">Not calibrated</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-1.5 items-center flex-shrink-0">
                  {scale ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : null}
                  {!isSkipped && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-white/20 text-white/70 hover:bg-white/10"
                      onClick={() => handleSkip(sheet.id)}
                    >
                      <SkipForward className="w-3 h-3 mr-1" />
                      Skip
                    </Button>
                  )}
                  {isSkipped && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      onClick={() => setSkipped(prev => { const s = new Set(prev); s.delete(sheet.id); return s; })}
                    >
                      Undo
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={onSkipAll}
            className="text-white/50 hover:text-white/80 hover:bg-white/5"
          >
            Skip All — Use AI Estimation
          </Button>
          <Button
            onClick={handleContinue}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-6"
          >
            {saving ? "Saving..." : calibratedCount > 0
              ? `Continue with ${calibratedCount} Calibrated Sheet${calibratedCount !== 1 ? "s" : ""}`
              : "Continue to Analysis"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
