/**
 * ProjectSettingsPanel — Edit takeoff project divisions, currency, and cost region after creation.
 *
 * Features:
 * - Currency toggle buttons (USD/GBP/AUD) so region list auto-filters to the correct country
 * - Edit selected divisions
 * - Edit cost region (recalculates all item costs automatically)
 * - Shows current settings with badges
 * - "Re-Analyze" option when divisions change so user doesn't have to re-upload drawings
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DivisionSelector from "@/components/DivisionSelector";
import RegionSelector from "@/components/RegionSelector";
import { Loader2, Settings, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "GBP", symbol: "\u00A3", label: "British Pound", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", flag: "\u{1F1E6}\u{1F1FA}" },
] as const;

interface ProjectSettingsPanelProps {
  projectId: number;
  currentDivisions: string[] | null;
  currentRegion: string | null;
  currentRegionName?: string;
  currentCurrency?: string | null;
  currentScopeText?: string | null;
  onSave: (divisions: string[] | null, region: string | null, currency?: string, scopeText?: string | null) => Promise<{ regionChanged?: boolean }>;
  /** Called when user wants to re-analyze with new divisions */
  onReAnalyze?: (divisions: string[] | null) => void;
  /** Whether sheets have been processed (to show re-analyze option) */
  hasProcessedSheets?: boolean;
}

export default function ProjectSettingsPanel({
  projectId,
  currentDivisions,
  currentRegion,
  currentRegionName,
  currentCurrency,
  currentScopeText,
  onSave,
  onReAnalyze,
  hasProcessedSheets,
}: ProjectSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(currentDivisions || []);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(currentRegion || null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currentCurrency || "USD");
  const [scopeText, setScopeText] = useState<string>(currentScopeText || "");
  const [saving, setSaving] = useState(false);

  // Reset state when dialog opens (in case project data changed externally)
  useEffect(() => {
    if (open) {
      setSelectedDivisions(currentDivisions || []);
      setSelectedRegion(currentRegion || null);
      setSelectedCurrency(currentCurrency || "USD");
      setScopeText(currentScopeText || "");
    }
  }, [open, currentDivisions, currentRegion, currentCurrency, currentScopeText]);

  const divisionsChanged = JSON.stringify([...(selectedDivisions || [])].sort()) !== JSON.stringify([...(currentDivisions || [])].sort());
  const regionChanged = selectedRegion !== currentRegion;
  const currencyChanged = selectedCurrency !== (currentCurrency || "USD");
  const scopeChanged = scopeText !== (currentScopeText || "");
  const hasChanges = divisionsChanged || regionChanged || currencyChanged || scopeChanged;

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave(
        selectedDivisions.length > 0 ? selectedDivisions : null,
        selectedRegion,
        currencyChanged ? selectedCurrency : undefined,
        scopeChanged ? (scopeText.trim() || null) : undefined,
      );

      if (result.regionChanged) {
        toast.success("Region updated — all item costs recalculated!");
      } else if (hasChanges) {
        toast.success("Settings updated!");
      }

      setOpen(false);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReAnalyze = () => {
    if (onReAnalyze) {
      onReAnalyze(selectedDivisions.length > 0 ? selectedDivisions : null);
      setOpen(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-white/10 text-cream-muted hover:text-cream hover:bg-white/5"
      >
        <Settings className="w-4 h-4 mr-2" />
        Edit Settings
      </Button>

      {/* Settings Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Adjust currency, divisions, and cost region for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2 overflow-y-auto overscroll-contain min-h-0">
            {/* Current Settings Summary */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
              <div className="text-xs font-medium text-cream-muted">Current Settings</div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/20">
                  {CURRENCIES.find((c) => c.code === (currentCurrency || "USD"))?.flag}{" "}
                  {currentCurrency || "USD"}
                </Badge>
                {currentDivisions && currentDivisions.length > 0 ? (
                  <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20">
                    {currentDivisions.length} divisions
                  </Badge>
                ) : (
                  <Badge className="bg-white/5 text-cream-muted border-white/10">
                    All divisions
                  </Badge>
                )}
                {currentRegion ? (
                  <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                    {currentRegionName || currentRegion}
                  </Badge>
                ) : (
                  <Badge className="bg-white/5 text-cream-muted border-white/10">
                    National Average
                  </Badge>
                )}
              </div>
              {currentScopeText && (
                <div className="mt-1 text-xs text-cream-muted/70 border-t border-white/5 pt-2">
                  <span className="font-medium text-cream-muted">Scope:</span>{" "}
                  <span className="italic">{currentScopeText.length > 120 ? currentScopeText.slice(0, 120) + "..." : currentScopeText}</span>
                </div>
              )}
            </div>

            {/* Currency Toggle */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream">
                Currency
                <span className="text-xs text-cream-muted ml-2">(filters available regions)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {CURRENCIES.map((c) => {
                  const isActive = selectedCurrency === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setSelectedCurrency(c.code);
                        // Reset region when switching currency since regions are country-specific
                        if (c.code !== selectedCurrency) {
                          setSelectedRegion(null);
                        }
                      }}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                        isActive
                          ? "border-amber-500/50 bg-amber-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-cream">{c.symbol}</span>
                          <span className="text-sm font-medium text-cream">{c.code}</span>
                        </div>
                        <span className="text-[10px] text-cream-muted">{c.label}</span>
                      </div>
                      {isActive && (
                        <div className="ml-auto w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Division Selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream">
                CSI Divisions
              </div>
              <DivisionSelector
                value={selectedDivisions}
                onChange={setSelectedDivisions}
                defaultExpanded={false}
              />
              {divisionsChanged && hasProcessedSheets && onReAnalyze && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="text-xs text-blue-300 block mb-2">
                      Division changes require re-analysis to extract new line items. Click "Re-Analyze" below to process your drawings with the updated divisions.
                    </span>
                    <Button
                      size="sm"
                      onClick={handleReAnalyze}
                      className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30 h-7 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Re-Analyze with New Divisions
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Region Selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream">
                Cost Region
                <span className="text-xs text-cream-muted ml-2">(recalculates all costs)</span>
              </div>
              <RegionSelector
                value={selectedRegion}
                onChange={setSelectedRegion}
                defaultExpanded={false}
                currency={selectedCurrency}
              />
              {regionChanged && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-amber-300">
                    Region change will automatically recalculate all item costs based on the new regional multiplier.
                  </span>
                </div>
              )}
            </div>

            {/* Scope Text */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Scope Description
                <span className="text-xs text-cream-muted">(optional — guides ConstructLine analysis)</span>
              </div>
              <Textarea
                value={scopeText}
                onChange={(e) => setScopeText(e.target.value)}
                placeholder="e.g. Focus on structural steel and concrete for the main building only. Exclude site work and landscaping."
                className="min-h-[80px] bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 resize-none"
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-cream-muted/50">
                  Leave blank to analyze all drawings without scope filtering.
                </p>
                <span className="text-[10px] text-cream-muted/40">{scopeText.length}/2000</span>
              </div>
              {scopeChanged && hasProcessedSheets && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-amber-300">
                    Scope changes will take effect on the next re-analysis.
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedDivisions(currentDivisions || []);
                setSelectedRegion(currentRegion || null);
                setSelectedCurrency(currentCurrency || "USD");
                setScopeText(currentScopeText || "");
                setOpen(false);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Settings className="w-4 h-4 mr-2" />
              )}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
