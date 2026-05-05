/**
 * PreAnalysisModal — scope-first setup before ConstructLine takeoff.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  DollarSign,
  Gauge,
  Loader2,
  MapPin,
  Plus,
  Ruler,
  Sparkles,
  Target,
  Trash2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DivisionSelector from "@/components/DivisionSelector";
import RegionSelector from "@/components/RegionSelector";
import SpecialtySelector from "@/components/SpecialtySelector";
import { buildScopeIntent } from "../../../shared/scopeIntent";
import {
  BID_MODE_BEHAVIORS,
  DEFAULT_NEW_TAKEOFF_BID_MODE,
  TAKEOFF_BID_MODES,
  getBidModeBehavior,
  normalizeTakeoffBidMode,
  type TakeoffBidMode,
} from "../../../shared/bidMode";
import {
  getAllowancePresetsForProjectType,
  getTakeoffProjectTypeLabel,
  normalizeTakeoffProjectType,
  TAKEOFF_PROJECT_TYPE_OPTIONS,
  type TakeoffProjectType,
} from "../../../shared/projectType";

const STORAGE_KEY = "alp-takeoff-preanalysis-prefs";

export interface AllowanceItem {
  id: string;
  description: string;
  amount: number;
}

interface PreAnalysisSettings {
  bidMode: TakeoffBidMode;
  currency: "USD" | "GBP" | "AUD";
  projectType: TakeoffProjectType;
  selectedDivisions: string[];
  costRegion: string | null;
  scopeText: string;
  selectedSpecialties: string[];
  allowances: AllowanceItem[];
}

const DEFAULT_SETTINGS: PreAnalysisSettings = {
  bidMode: DEFAULT_NEW_TAKEOFF_BID_MODE,
  currency: "USD",
  projectType: "commercial",
  selectedDivisions: [],
  costRegion: null,
  scopeText: "",
  selectedSpecialties: [],
  allowances: [],
};

const CURRENCIES = [
  { code: "USD" as const, label: "US Dollar", symbol: "$", flag: "USD", description: "United States pricing (RSMeans)" },
  { code: "GBP" as const, label: "British Pound", symbol: "GBP", flag: "GBP", description: "United Kingdom pricing (BCIS)" },
  { code: "AUD" as const, label: "Australian Dollar", symbol: "A$", flag: "AUD", description: "Australian pricing (Rawlinsons)" },
];

const SCOPE_EXAMPLES = [
  "Underground concrete plus below-grade waterproofing — include trench pits, correlator pit, rebar, formwork, concrete, vapor barrier, waterproofing, protection board, direct excavation and backfill",
  "Below-grade waterproofing only — include membrane, protection board, waterstops, vapor barrier, and foundation drains. Exclude roofing.",
  "Piles and pile caps only — include excavation, reinforcing, concrete, and spoils",
  "Foundations only — spread footings, grade beams, slab-on-grade, and vapor barrier",
  "Structural steel framing — beams, columns, connections, and embeds only",
  "Site utilities — storm and sanitary sewer only",
];

function loadSavedSettings(): PreAnalysisSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: PreAnalysisSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

interface PreAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (settings: PreAnalysisSettings) => void;
  pendingSheetCount: number;
  isSubmitting: boolean;
  existingDivisions?: string[] | null;
  existingRegion?: string | null;
  existingCurrency?: string | null;
  existingScopeText?: string | null;
  existingSpecialties?: string[] | null;
  existingProjectType?: string | null;
  existingBidMode?: string | null;
  detectedSpecialties?: string[] | null;
  preferredCurrency?: string;
  uncalibratedSheetCount?: number;
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
  existingProjectType,
  existingBidMode,
  detectedSpecialties,
  preferredCurrency,
  uncalibratedSheetCount = 0,
  onSetScale,
}: PreAnalysisModalProps) {
  const saved = useMemo(() => loadSavedSettings(), []);
  const [bidMode, setBidMode] = useState<TakeoffBidMode>(
    normalizeTakeoffBidMode(existingBidMode || saved.bidMode, DEFAULT_NEW_TAKEOFF_BID_MODE)
  );
  const [currency, setCurrency] = useState<"USD" | "GBP" | "AUD">(
    (existingCurrency as any) || (preferredCurrency as any) || saved.currency || "USD"
  );
  const [projectType, setProjectType] = useState<TakeoffProjectType>(
    normalizeTakeoffProjectType(existingProjectType || saved.projectType)
  );
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(existingDivisions || saved.selectedDivisions || []);
  const [costRegion, setCostRegion] = useState<string | null>(existingRegion ?? saved.costRegion ?? null);
  const [scopeText, setScopeText] = useState<string>(existingScopeText || saved.scopeText || "");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(existingSpecialties || saved.selectedSpecialties || []);
  const [allowances, setAllowances] = useState<AllowanceItem[]>(saved.allowances || []);

  useEffect(() => {
    if (!open) return;
    setBidMode(normalizeTakeoffBidMode(existingBidMode || saved.bidMode, DEFAULT_NEW_TAKEOFF_BID_MODE));
    setCurrency((existingCurrency as any) || (preferredCurrency as any) || saved.currency || "USD");
    setProjectType(normalizeTakeoffProjectType(existingProjectType || saved.projectType));
    setSelectedDivisions(existingDivisions || saved.selectedDivisions || []);
    setCostRegion(existingRegion ?? saved.costRegion ?? null);
    setScopeText(existingScopeText || saved.scopeText || "");
    setSelectedSpecialties(existingSpecialties || saved.selectedSpecialties || []);
    setAllowances(saved.allowances || []);
  }, [open, existingCurrency, preferredCurrency, existingProjectType, existingBidMode, existingDivisions, existingRegion, existingScopeText, existingSpecialties, saved]);

  const scopeIntent = useMemo(
    () => buildScopeIntent(scopeText, selectedDivisions.length > 0 ? selectedDivisions : null, bidMode),
    [scopeText, selectedDivisions, bidMode]
  );
  const bidModeBehavior = useMemo(() => getBidModeBehavior(bidMode), [bidMode]);
  const allowancePresets = useMemo(() => getAllowancePresetsForProjectType(projectType), [projectType]);
  const tradePackageNeedsScope = bidMode === "trade_package" && scopeText.trim().length < 12 && selectedDivisions.length === 0 && selectedSpecialties.length === 0;

  const addAllowance = () => {
    setAllowances(prev => [...prev, { id: crypto.randomUUID(), description: "", amount: 0 }]);
  };

  const handleConfirm = () => {
    const settings: PreAnalysisSettings = {
      bidMode,
      currency,
      projectType,
      selectedDivisions,
      costRegion,
      scopeText: scopeText.trim(),
      selectedSpecialties,
      allowances: allowances.filter(a => a.description.trim() && a.amount > 0),
    };
    saveSettings(settings);
    onConfirm(settings);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col border-[#d7c7aa] bg-[#f4efe4] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)] [&_[data-slot=dialog-header]]:border-[#d8c9ad] [&_[data-slot=dialog-footer]]:border-[#d8c9ad] [&_[data-slot=dialog-close]]:text-[#716855] [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:text-[#171714]">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#171714] flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8a6510]" />
            Configure Bid Mode
          </DialogTitle>
          <DialogDescription className="text-[#716855]">
            Pick your bid mode. ConstructLine builds the right review surface for {pendingSheetCount} drawing{pendingSheetCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overscroll-contain min-h-0 space-y-5 pr-1">
          {uncalibratedSheetCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-[#d7b44d] bg-[#fff7da] px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-[#8a6510] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#8a6510]">
                  {uncalibratedSheetCount} sheet{uncalibratedSheetCount !== 1 ? "s" : ""} not scale-calibrated
                </p>
                <p className="text-xs text-[#716855] mt-0.5">
                  Set scale on each sheet for accurate real-world quantities.
                </p>
              </div>
              {onSetScale && (
                <button
                  onClick={() => { onClose(); onSetScale(); }}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-[#8a6510] hover:text-[#6f4d00] border border-[#d7b44d] rounded-md px-2.5 py-1.5 bg-white/70 hover:bg-white transition-colors"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Set Scale
                </button>
              )}
            </div>
          )}

          <section className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-[#8a6510]" />
                <Label className="text-base font-semibold text-[#171714]">Pick your bid mode</Label>
              </div>
              <p className="text-xs text-[#716855]">
                ConstructLine builds the right review surface for the bid you are building.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {TAKEOFF_BID_MODES.map((mode) => {
                  const option = BID_MODE_BEHAVIORS[mode];
                  const selected = bidMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setBidMode(mode)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        selected
                          ? "border-[#d7b44d] bg-[#fff4cb] shadow-[0_10px_24px_rgba(217,162,26,0.10)]"
                          : "border-[#d7c7aa] bg-white/75 hover:bg-white"
                      }`}
                    >
                      <span className="text-sm font-semibold text-[#171714]">{option.label}</span>
                      <p className="mt-1 text-[11px] leading-snug text-[#716855]">{option.description}</p>
                      <p className="mt-2 text-[10px] leading-snug text-[#8a6510]">{option.reviewSurface}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 rounded-lg border border-[#d7c7aa] bg-white/70 p-3 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-[#8a6510]" />
                  <Label className="text-base font-semibold text-[#171714]">Pricing Setup</Label>
                </div>
                <p className="text-xs text-[#716855]">
                  Required for takeoff pricing. Pick the project type, currency, and cost region before analysis starts.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#8a6510]" />
                  <Label className="text-sm font-semibold text-[#171714]">Project Type</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  {TAKEOFF_PROJECT_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProjectType(option.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        projectType === option.value
                          ? "border-[#d7b44d] bg-[#fff4cb]"
                          : "border-[#d7c7aa] bg-white/75 hover:bg-white"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#171714]">{option.label}</span>
                      <p className="mt-1 text-[10px] leading-snug text-[#716855]">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.85fr)] gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#8a6510]" />
                    <Label className="text-sm font-semibold text-[#171714]">Currency</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {CURRENCIES.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrency(c.code);
                          if (c.code !== currency) setCostRegion(null);
                        }}
                        className={`p-3 rounded-lg border transition-colors text-left ${
                          currency === c.code ? "border-[#d7b44d] bg-[#fff4cb]" : "border-[#d7c7aa] bg-white/75 hover:bg-white"
                        }`}
                      >
                        <span className="text-sm font-semibold text-[#171714]">{c.code}</span>
                        <p className="text-[10px] text-[#716855] mt-1">{c.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#8a6510]" />
                    <Label className="text-sm font-semibold text-[#171714]">Cost Region</Label>
                  </div>
                  <RegionSelector value={costRegion} onChange={setCostRegion} defaultExpanded={false} currency={currency} />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-[#8a6510]" />
                <Label className="text-base font-semibold text-[#171714]">What scope are you bidding?</Label>
              </div>
              <p className="text-xs text-[#716855]">
                {bidMode === "full_gc"
                  ? "Optional: add known exclusions or GC pricing priorities. Broad trade work stays active."
                  : bidMode === "fast_scope_check"
                    ? "Add the bid question or scope you want checked first. Boundary items stay visible for a quick read."
                    : "Add the trade package, inclusions, exclusions, and boundary items. This gives ConstructLine the bid boundary before totals are built."}
              </p>
            </div>
            <Textarea
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              placeholder={bidMode === "full_gc"
                ? "Example: Full GC estimate. Call out site, structure, envelope, interiors, MEP, and allowances. Exclude owner-furnished equipment."
                : bidMode === "fast_scope_check"
                  ? "Example: Quick bid/no-bid read for below-grade waterproofing and drainage risk. Flag concrete, excavation, and MEP interfaces for review."
                  : "Example: Underground concrete plus below-grade waterproofing. Include trench pits, correlator pit, rebar, formwork, concrete, vapor barrier, waterproofing, protection board, direct excavation and backfill. Exclude roofing and above-grade envelope."}
              className="min-h-[170px] resize-none border-[#d7c7aa] bg-white text-sm text-[#171714] placeholder:text-[#8a806d]"
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#8a806d]">{scopeText.length}/2000</span>
              {scopeText.trim() && (
                <button onClick={() => setScopeText("")} className="text-[10px] text-[#8a6510] hover:text-[#6f4d00] transition-colors">
                  Clear scope
                </button>
              )}
            </div>
            {scopeIntent.hasScope && (
              <div className="rounded-lg border border-[#d7b44d] bg-[#fff7da] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#8a6510]">Review Surface</span>
                  <Badge className="bg-white/80 text-[#8a6510] border-[#d7b44d] text-[10px]">
                    {bidModeBehavior.shortLabel}
                  </Badge>
                </div>
                <p className="text-xs text-[#716855]">
                  {scopeIntent.summary}. {bidModeBehavior.reviewSurface}
                </p>
              </div>
            )}
            {tradePackageNeedsScope && (
              <div className="rounded-lg border border-[#d7b44d] bg-[#fff4cb] p-3 text-xs text-[#8a6510]">
                Trade Package Takeoff works best with a scope boundary. Add a short scope, select divisions, or choose specialties so review and excluded items stay separated from the active bid.
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a806d]">Examples</span>
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => setScopeText(example)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white border border-[#d7c7aa] text-[#716855] hover:bg-[#fff4cb] hover:text-[#8a6510] hover:border-[#d7b44d] transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-[#d7c7aa] bg-white/75 p-3 text-xs">
              <span className="font-semibold text-[#171714]">Setup Summary</span>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[#716855]">
                <span>Bid mode: <strong className="text-[#171714]">{bidModeBehavior.label}</strong></span>
                <span>Project type: <strong className="text-[#171714]">{getTakeoffProjectTypeLabel(projectType)}</strong></span>
                <span>Currency: <strong className="text-[#171714]">{currency}</strong></span>
              </div>
            </div>
          </section>

          <details className="rounded-lg border border-[#d7c7aa] bg-white/65 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-[#171714]">
              Optional Precision Controls
              <span className="ml-2 text-xs font-normal text-[#716855]">
                Use these when you want to narrow sheet triage or trade boundaries.
              </span>
            </summary>
            <div className="space-y-5 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#8a6510]" />
                  <Label className="text-sm font-semibold text-[#171714]">CSI Divisions</Label>
                  <Badge className="bg-white text-[#716855] border-[#d7c7aa] text-[10px] font-normal">Optional filter</Badge>
                </div>
                <DivisionSelector value={selectedDivisions} onChange={setSelectedDivisions} defaultExpanded={false} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#8a6510]" />
                  <Label className="text-sm font-semibold text-[#171714]">Trade Specialties</Label>
                  <Badge className="bg-white text-[#716855] border-[#d7c7aa] text-[10px] font-normal">Optional filter</Badge>
                </div>
                <SpecialtySelector
                  value={selectedSpecialties}
                  onChange={setSelectedSpecialties}
                  selectedDivisions={selectedDivisions}
                  detectedSpecialties={detectedSpecialties || []}
                />
              </div>

              <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#8a6510]" />
                <Label className="text-sm font-semibold text-[#171714]">Allowances</Label>
                <Badge className="bg-white text-[#716855] border-[#d7c7aa] text-[10px] font-normal">
                  {getTakeoffProjectTypeLabel(projectType)}
                </Badge>
              </div>
                <div className="space-y-2">
                  {allowancePresets.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allowancePresets
                        .filter((preset) => !allowances.some((a) => a.description.toLowerCase() === preset.label.toLowerCase()))
                        .map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setAllowances(prev => [...prev, { id: crypto.randomUUID(), description: preset.label, amount: preset.amount }])}
                            className="px-2.5 py-1 text-xs rounded-md bg-[#fff4cb] border border-[#d7b44d] text-[#8a6510] hover:bg-[#fff0b8] transition-colors"
                          >
                            + {preset.label}
                          </button>
                        ))}
                    </div>
                  )}
                  {projectType === "other" && (
                    <p className="text-xs text-[#716855]">
                      Quick-add presets are hidden for Other / Not sure. Add manual allowances as needed.
                    </p>
                  )}
                  {allowances.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input
                        value={item.description}
                        onChange={(e) => setAllowances(prev => prev.map(a => a.id === item.id ? { ...a, description: e.target.value } : a))}
                        placeholder="Allowance description"
                        className="flex-1 border-[#d7c7aa] bg-white text-[#171714] placeholder:text-[#8a806d] h-9 text-sm"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#716855] text-sm">$</span>
                        <Input
                          type="number"
                          value={item.amount ? Math.round(item.amount / 100) : ""}
                          onChange={(e) => setAllowances(prev => prev.map(a => a.id === item.id ? { ...a, amount: Math.round((parseFloat(e.target.value) || 0) * 100) } : a))}
                          placeholder="0"
                          className="border-[#d7c7aa] bg-white text-[#171714] placeholder:text-[#8a806d] h-9 text-sm pl-6 text-right"
                          min={0}
                        />
                      </div>
                      <button onClick={() => setAllowances(prev => prev.filter(a => a.id !== item.id))} className="text-orange-600/70 hover:text-orange-700 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addAllowance} className="flex items-center gap-2 text-sm text-[#8a6510] hover:text-[#6f4d00] transition-colors py-1">
                    <Plus className="w-4 h-4" />
                    Add Allowance Item
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="border-[#c8b895] bg-white/70 text-[#29251c] hover:bg-white">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || tradePackageNeedsScope}
            className="bg-[#171714] text-white hover:bg-[#29251c] font-semibold"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Start Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { PreAnalysisSettings };
