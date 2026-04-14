/**
 * PreAnalysisModal — Pops up when user clicks "Start Construct Line Takeoff".
 *
 * Steps:
 * 1. Currency selection (USD / GBP / AUD)
 * 2. CSI Division selection (reuses DivisionSelector)
 * 3. Regional cost factoring (reuses RegionSelector, filtered by currency)
 * 4. Scope-specific text (optional free-text to narrow extraction)
 *
 * Remembers last selections via localStorage.
 */
import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import DivisionSelector from "@/components/DivisionSelector";
import RegionSelector from "@/components/RegionSelector";
import {
  DollarSign,
  PoundSterling,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Building2,
  MapPin,
  Target,
  Loader2,
} from "lucide-react";

const STORAGE_KEY = "alp-takeoff-preanalysis-prefs";

interface PreAnalysisSettings {
  currency: "USD" | "GBP" | "AUD";
  selectedDivisions: string[];
  costRegion: string | null;
  scopeText: string;
}

const DEFAULT_SETTINGS: PreAnalysisSettings = {
  currency: "USD",
  selectedDivisions: [],
  costRegion: null,
  scopeText: "",
};

function loadSavedSettings(): PreAnalysisSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: PreAnalysisSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

const CURRENCIES = [
  {
    code: "USD" as const,
    label: "US Dollar",
    symbol: "$",
    flag: "🇺🇸",
    description: "United States pricing (RSMeans)",
  },
  {
    code: "GBP" as const,
    label: "British Pound",
    symbol: "£",
    flag: "🇬🇧",
    description: "United Kingdom pricing (BCIS)",
  },
  {
    code: "AUD" as const,
    label: "Australian Dollar",
    symbol: "A$",
    flag: "🇦🇺",
    description: "Australian pricing (Rawlinsons)",
  },
];

const SCOPE_EXAMPLES = [
  "Foundations only — spread footings and grade beams",
  "Structural steel framing — beams, columns, and connections",
  "Interior framing and drywall only — no exterior",
  "Mechanical ductwork and equipment — no piping",
  "Site utilities — storm and sanitary sewer only",
];

interface PreAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (settings: PreAnalysisSettings) => void;
  pendingSheetCount: number;
  isSubmitting: boolean;
  /** Pre-populate from project's existing settings */
  existingDivisions?: string[] | null;
  existingRegion?: string | null;
  existingCurrency?: string | null;
  existingScopeText?: string | null;
}

export default function PreAnalysisModal({
  open,
  onClose,
  onConfirm,
  pendingSheetCount,
  isSubmitting,
  existingDivisions,
  existingRegion,
  existingCurrency,
  existingScopeText,
}: PreAnalysisModalProps) {
  const [step, setStep] = useState(1);
  const saved = useMemo(() => loadSavedSettings(), []);

  // Initialize from existing project settings, then saved prefs, then defaults
  const [currency, setCurrency] = useState<"USD" | "GBP" | "AUD">(
    (existingCurrency as any) || saved.currency || "USD"
  );
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(
    existingDivisions || saved.selectedDivisions || []
  );
  const [costRegion, setCostRegion] = useState<string | null>(
    existingRegion ?? saved.costRegion ?? null
  );
  const [scopeText, setScopeText] = useState<string>(
    existingScopeText || saved.scopeText || ""
  );

  // Reset step when modal opens
  useEffect(() => {
    if (open) setStep(1);
  }, [open]);

  const handleConfirm = () => {
    const settings: PreAnalysisSettings = {
      currency,
      selectedDivisions,
      costRegion,
      scopeText: scopeText.trim(),
    };
    saveSettings(settings);
    onConfirm(settings);
  };

  const totalSteps = 4;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl text-cream flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Configure Analysis
          </DialogTitle>
          <DialogDescription className="text-cream-muted">
            Set your preferences before Construct Line analyzes {pendingSheetCount} drawing{pendingSheetCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 py-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => setStep(s)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s === step
                    ? "bg-amber-500 text-white"
                    : s < step
                      ? "bg-amber-500/30 text-amber-300"
                      : "bg-white/10 text-cream-muted"
                }`}
              >
                {s}
              </button>
              {s < 4 && (
                <div className={`w-8 h-0.5 ${s < step ? "bg-amber-500/30" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Currency */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold text-cream">Currency</Label>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setCurrency(c.code);
                    // Reset region when currency changes since regions are country-specific
                    if (c.code !== currency) setCostRegion(null);
                  }}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors text-left ${
                    currency === c.code
                      ? "border-amber-500/50 bg-amber-500/10"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="text-2xl">{c.flag}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-cream">{c.label}</span>
                      <Badge className={`text-xs ${
                        currency === c.code
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                          : "bg-white/5 text-cream-muted border-white/10"
                      }`}>
                        {c.symbol} {c.code}
                      </Badge>
                    </div>
                    <p className="text-xs text-cream-muted mt-0.5">{c.description}</p>
                  </div>
                  {currency === c.code && (
                    <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: CSI Divisions */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold text-cream">CSI Divisions</Label>
            </div>
            <p className="text-xs text-cream-muted -mt-2">
              Select which CSI divisions to include. Leave all selected for a full takeoff.
            </p>
            <DivisionSelector
              value={selectedDivisions}
              onChange={setSelectedDivisions}
            />
          </div>
        )}

        {/* Step 3: Regional Factoring */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold text-cream">Regional Cost Factoring</Label>
            </div>
            <p className="text-xs text-cream-muted -mt-2">
              Select a region to adjust pricing for local market conditions. Leave unselected for national average.
            </p>
            <RegionSelector
              value={costRegion}
              onChange={setCostRegion}
              defaultExpanded={true}
              currency={currency}
            />
          </div>
        )}

        {/* Step 4: Scope-Specific Text */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold text-cream">Specific Scope (Optional)</Label>
            </div>
            <p className="text-xs text-cream-muted -mt-2">
              Describe your specific scope of work to narrow the takeoff. Leave blank to extract everything in the selected divisions.
            </p>
            <Textarea
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              placeholder="e.g., Foundations only — spread footings and grade beams"
              className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/50 min-h-[100px] resize-none"
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cream-muted/50">{scopeText.length}/2000</span>
            </div>
            {/* Example scopes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted/60">
                Examples (click to use)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setScopeText(ex)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-cream-muted hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/20 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
              <span className="text-xs font-semibold text-cream">Analysis Summary</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-cream-muted">Currency:</span>{" "}
                  <span className="text-cream font-medium">
                    {CURRENCIES.find((c) => c.code === currency)?.symbol} {currency}
                  </span>
                </div>
                <div>
                  <span className="text-cream-muted">Divisions:</span>{" "}
                  <span className="text-cream font-medium">
                    {selectedDivisions.length === 0 ? "All" : `${selectedDivisions.length} selected`}
                  </span>
                </div>
                <div>
                  <span className="text-cream-muted">Region:</span>{" "}
                  <span className="text-cream font-medium">
                    {costRegion || "National Average"}
                  </span>
                </div>
                <div>
                  <span className="text-cream-muted">Scope:</span>{" "}
                  <span className="text-cream font-medium">
                    {scopeText.trim() ? "Custom" : "Full"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2 pt-2">
          <div className="flex gap-2">
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={() => setStep(step - 1)}
                className="text-cream-muted hover:text-cream"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-cream-muted hover:text-cream"
            >
              Cancel
            </Button>
            {step < totalSteps ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Start Analysis
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { PreAnalysisSettings };
