/**
 * PreAnalysisModal — Pops up when user clicks "Start ConstructLine Takeoff".
 *
 * Steps:
 * 1. Currency selection (USD / GBP / AUD)
 * 2. CSI Division selection (reuses DivisionSelector)
 * 3. Trade Specialty selection (reuses SpecialtySelector)
 * 4. Regional cost factoring (reuses RegionSelector, filtered by currency)
 * 5. Scope-specific text (optional free-text to narrow extraction)
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
import DivisionSelector from "@/components/DivisionSelector";
import RegionSelector from "@/components/RegionSelector";
import SpecialtySelector from "@/components/SpecialtySelector";
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
  Wrench,
  AlertTriangle,
  Ruler,
  Plus,
  Trash2,
  ClipboardList,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { TRADE_SPECIALTIES } from "../../../shared/tradeSpecialties";
import { CUSTOM_RESIDENTIAL_ALLOWANCE_PRESETS } from "../../../shared/residentialEstimateQa";
import { buildScopeIntent } from "../../../shared/scopeIntent";

const STORAGE_KEY = "alp-takeoff-preanalysis-prefs";

export interface AllowanceItem {
  id: string;
  description: string;
  amount: number;
}

interface PreAnalysisSettings {
  currency: "USD" | "GBP" | "AUD";
  selectedDivisions: string[];
  costRegion: string | null;
  scopeText: string;
  selectedSpecialties: string[];
  allowances: AllowanceItem[];
}

const DEFAULT_SETTINGS: PreAnalysisSettings = {
  currency: "USD",
  selectedDivisions: [],
  costRegion: null,
  scopeText: "",
  selectedSpecialties: [],
  allowances: [],
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
  "Below-grade waterproofing only — include membrane, protection board, waterstops, and foundation drains",
  "Piles and pile caps only — include excavation, reinforcing, concrete, and spoils",
  "Foundations only — spread footings, grade beams, slab-on-grade, and vapor barrier",
  "Division 03 partial scope — foundations up through slab-on-grade, no vertical concrete walls",
  "Structural steel framing — beams, columns, connections, and embeds only",
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
  existingSpecialties?: string[] | null;
  /** ConstructLine engine-detected specialties from previous analysis */
  detectedSpecialties?: string[] | null;
  /** User's preferred currency from database (auto-select for new projects) */
  preferredCurrency?: string;
  /** Number of sheets that have NOT been scale-calibrated — shows warning banner if > 0 */
  uncalibratedSheetCount?: number;
  /** Called when user clicks 'Set Scale' in the warning banner */
  onSetScale?: () => void;
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
  existingSpecialties,
  detectedSpecialties,
  preferredCurrency,
  uncalibratedSheetCount = 0,
  onSetScale,
}: PreAnalysisModalProps) {
  const [step, setStep] = useState(1);
  const saved = useMemo(() => loadSavedSettings(), []);

  // Initialize from existing project settings, then preferred currency, then saved prefs, then defaults
  const [currency, setCurrency] = useState<"USD" | "GBP" | "AUD">(
    (existingCurrency as any) || (preferredCurrency as any) || saved.currency || "USD"
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
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(
    existingSpecialties || saved.selectedSpecialties || []
  );
  const [allowances, setAllowances] = useState<AllowanceItem[]>(saved.allowances || []);
  const scopeIntent = useMemo(
    () => buildScopeIntent(scopeText, selectedDivisions.length > 0 ? selectedDivisions : null),
    [scopeText, selectedDivisions]
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
      selectedSpecialties,
      allowances: allowances.filter(a => a.description.trim() && a.amount > 0),
    };
    saveSettings(settings);
    onConfirm(settings);
  };

  const addAllowance = () => {
    setAllowances(prev => [...prev, { id: crypto.randomUUID(), description: "", amount: 0 }]);
  };
  const removeAllowance = (id: string) => {
    setAllowances(prev => prev.filter(a => a.id !== id));
  };
  const updateAllowance = (id: string, field: "description" | "amount", value: string | number) => {
    setAllowances(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const totalSteps = 6;

  // Build specialty names for summary
  const specialtyNames = selectedSpecialties
    .map((id) => TRADE_SPECIALTIES[id]?.name)
    .filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl text-cream flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Configure Bid Scope
          </DialogTitle>
          <DialogDescription className="text-cream-muted">
            Upload the full drawing set, then tell <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> which bid scope to take off from {pendingSheetCount} drawing{pendingSheetCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable body area */}
        <div className="overflow-y-auto overscroll-contain min-h-0">

        {/* Scale Calibration Warning Banner */}
        {uncalibratedSheetCount > 0 && (
          <div className="mx-1 mb-3 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-300">
                {uncalibratedSheetCount} sheet{uncalibratedSheetCount !== 1 ? "s" : ""} not scale-calibrated
              </p>
              <p className="text-xs text-amber-300/70 mt-0.5">
                Without scale calibration, AI measurements are estimated from the drawing. Set scale on each sheet for accurate real-world quantities.
              </p>
            </div>
            {onSetScale && (
              <button
                onClick={() => { onClose(); onSetScale(); }}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-md px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
              >
                <Ruler className="w-3.5 h-3.5" />
                Set Scale
              </button>
            )}
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-1 py-2">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => setStep(s)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  s === step
                    ? "bg-amber-500 text-white"
                    : s < step
                      ? "bg-amber-500/30 text-amber-300"
                      : "bg-white/10 text-cream-muted"
                }`}
              >
                {s}
              </button>
              {s < 6 && (
                <div className={`w-4 h-0.5 ${s < step ? "bg-amber-500/30" : "bg-white/10"}`} />
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
              <Label className="text-sm font-semibold text-cream">Bid Package Divisions</Label>
            </div>
            <p className="text-xs text-cream-muted -mt-2">
              Select the broad CSI divisions your scope can touch. For narrow work like below-grade waterproofing or piles, keep related support divisions selected and narrow the actual scope on the next step.
            </p>
            <DivisionSelector
              value={selectedDivisions}
              onChange={setSelectedDivisions}
            />
          </div>
        )}

        {/* Step 3: Trade Specialties */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold text-cream">Trade Specialties</Label>
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/25 text-[10px] font-normal px-1.5 py-0 leading-4">
                New
              </Badge>
            </div>
            {/* Clear "skip this" callout */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 mb-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-cream font-medium">You can skip this step entirely</p>
                <p className="text-xs text-cream-muted mt-0.5">
                  Leave everything unselected and the <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> engine will automatically detect specialties from your drawings. Only select specialties here if you want to force specific ones.
                </p>
              </div>
            </div>
            <SpecialtySelector
              value={selectedSpecialties}
              onChange={setSelectedSpecialties}
              selectedDivisions={selectedDivisions}
              detectedSpecialties={detectedSpecialties || []}
            />
          </div>
        )}

        {/* Step 4: Regional Factoring */}
        {step === 4 && (
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

        {/* Step 5: Scope-Specific Text */}
        {step === 5 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold text-cream">Scope Intent</Label>
              <Badge className="bg-white/10 text-cream-muted border-white/10 text-[10px] font-normal">Optional</Badge>
            </div>

            {/* Clear "leave blank" callout */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-cream font-medium">Use a full drawing set for a partial bid scope</p>
                <p className="text-xs text-cream-muted mt-0.5">
                  Type the subcontract scope, trade package, inclusions, and exclusions. <span className="font-semibold"><span className="text-white">Construct</span><span className="text-amber-400">Line</span></span> will focus extraction on included work and flag boundary items for review when they may belong to another trade.
                </p>
              </div>
            </div>

            <Textarea
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              placeholder="Example: Below-grade waterproofing only. Include membrane, protection board, waterstops, foundation drains, and vapor barrier. Exclude roofing and above-grade envelope."
              className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 min-h-[100px] resize-none"
              maxLength={2000}
            />
            {scopeIntent.hasScope && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-300">Interpreted Scope</span>
                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px]">
                    {scopeIntent.summary}
                  </Badge>
                </div>
                <p className="text-xs text-cream-muted">
                  Review items will stay visible in Quantity Takeoff with a scope-review note so you can include, edit, or delete them before pricing the bid.
                </p>
                {(scopeIntent.focusDivisions.length > 0 || scopeIntent.excludedDivisions.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {scopeIntent.focusDivisions.slice(0, 8).map((division) => (
                      <Badge key={`focus-${division}`} className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
                        Include Div {division}
                      </Badge>
                    ))}
                    {scopeIntent.excludedDivisions.slice(0, 8).map((division) => (
                      <Badge key={`exclude-${division}`} className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px]">
                        Usually excludes Div {division}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cream-muted/50">{scopeText.length}/2000</span>
              {scopeText.trim() && (
                <button
                  onClick={() => setScopeText("")}
                  className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Clear — take off everything
                </button>
              )}
            </div>
            {/* Example scopes */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted/60">
                Or click an example to narrow scope
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

          </div>
        )}

        {/* Step 6: Allowances (Residential) */}
        {step === 6 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-4 h-4 text-amber-500" />
              <Label className="text-sm font-semibold text-cream">Allowances</Label>
              <Badge className="bg-white/10 text-cream-muted border-white/10 text-[10px] font-normal">Optional</Badge>
            </div>

            {/* Explanation callout */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-cream font-medium">Skip this if selections are already on the drawings</p>
                <p className="text-xs text-cream-muted mt-0.5">
                  For residential projects where cabinets, countertops, tile, or other selections haven't been picked yet, add allowance items here with placeholder dollar amounts. You can refine them later when you get actual pricing.
                </p>
              </div>
            </div>

            {/* Quick-add presets */}
            <div className="space-y-3">
              <span className="text-xs text-cream-muted">Quick Add — Residential</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  ...CUSTOM_RESIDENTIAL_ALLOWANCE_PRESETS.map(preset => ({ label: preset.description, amount: preset.amount })),
                ].filter(preset => !allowances.some(a => a.description.toLowerCase() === preset.label.toLowerCase())).map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setAllowances(prev => [...prev, { id: crypto.randomUUID(), description: preset.label, amount: preset.amount }])}
                    className="px-2.5 py-1 text-xs rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-cream-muted">Quick Add — Commercial</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "FF&E (Furniture, Fixtures & Equipment)", amount: 2500000 },
                  { label: "Signage & Wayfinding", amount: 800000 },
                  { label: "Security Systems", amount: 1500000 },
                  { label: "Low-Voltage / Data & Communications", amount: 2000000 },
                  { label: "Specialty Equipment", amount: 3000000 },
                  { label: "AV Systems", amount: 1200000 },
                ].filter(preset => !allowances.some(a => a.description.toLowerCase() === preset.label.toLowerCase())).map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setAllowances(prev => [...prev, { id: crypto.randomUUID(), description: preset.label, amount: preset.amount }])}
                    className="px-2.5 py-1 text-xs rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-cream-muted">Quick Add — Public Works</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Traffic Control & MOT", amount: 1500000 },
                  { label: "Environmental Compliance", amount: 1000000 },
                  { label: "Temporary Facilities", amount: 800000 },
                  { label: "Erosion & Sediment Control", amount: 600000 },
                  { label: "Dewatering", amount: 1200000 },
                  { label: "Testing & Inspection", amount: 1000000 },
                ].filter(preset => !allowances.some(a => a.description.toLowerCase() === preset.label.toLowerCase())).map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => setAllowances(prev => [...prev, { id: crypto.randomUUID(), description: preset.label, amount: preset.amount }])}
                    className="px-2.5 py-1 text-xs rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Allowance items list */}
            <div className="space-y-2">
              {allowances.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    value={item.description}
                    onChange={(e) => updateAllowance(item.id, "description", e.target.value)}
                    placeholder="e.g. Kitchen Cabinets"
                    className="flex-1 bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 h-9 text-sm"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cream-muted text-sm">$</span>
                    <Input
                      type="number"
                      value={item.amount ? Math.round(item.amount / 100) : ""}
                      onChange={(e) => updateAllowance(item.id, "amount", Math.round((parseFloat(e.target.value) || 0) * 100))}
                      placeholder="0"
                      className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 h-9 text-sm pl-6 text-right"
                      min={0}
                    />
                  </div>
                  <button
                    onClick={() => removeAllowance(item.id)}
                    className="text-red-400/60 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addAllowance}
              className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors py-1"
            >
              <Plus className="w-4 h-4" />
              Add Allowance Item
            </button>

            {allowances.length > 0 && allowances.some(a => a.amount > 0) && (
              <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cream-muted">Total Allowances:</span>
                  <span className="text-sm font-semibold text-amber-300">
                    ${(allowances.reduce((sum, a) => sum + (a.amount || 0), 0) / 100).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

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
                  <span className="text-cream-muted">Specialties:</span>{" "}
                  <span className="text-cream font-medium">
                    {selectedSpecialties.length === 0
                      ? "Auto-detect"
                      : `${selectedSpecialties.length} selected`}
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
                    {scopeText.trim() ? scopeIntent.summary : "Full drawing set"}
                  </span>
                </div>
                <div>
                  <span className="text-cream-muted">Allowances:</span>{" "}
                  <span className="text-cream font-medium">
                    {allowances.filter(a => a.description.trim() && a.amount > 0).length > 0
                      ? `${allowances.filter(a => a.description.trim() && a.amount > 0).length} items ($${(allowances.filter(a => a.amount > 0).reduce((s, a) => s + a.amount, 0) / 100).toLocaleString()})`
                      : "None"}
                  </span>
                </div>
              </div>
              {specialtyNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {specialtyNames.map((name) => (
                    <Badge
                      key={name}
                      className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[9px]"
                    >
                      <Wrench className="w-2.5 h-2.5 mr-0.5" />
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        </div>{/* end scrollable body */}

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
