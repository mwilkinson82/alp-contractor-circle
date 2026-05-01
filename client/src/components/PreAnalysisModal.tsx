/**
 * PreAnalysisModal — scope-first setup before ConstructLine takeoff.
 */
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ClipboardList,
  DollarSign,
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
  detectedSpecialties,
  preferredCurrency,
  uncalibratedSheetCount = 0,
  onSetScale,
}: PreAnalysisModalProps) {
  const saved = useMemo(() => loadSavedSettings(), []);
  const [currency, setCurrency] = useState<"USD" | "GBP" | "AUD">(
    (existingCurrency as any) || (preferredCurrency as any) || saved.currency || "USD"
  );
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(existingDivisions || saved.selectedDivisions || []);
  const [costRegion, setCostRegion] = useState<string | null>(existingRegion ?? saved.costRegion ?? null);
  const [scopeText, setScopeText] = useState<string>(existingScopeText || saved.scopeText || "");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(existingSpecialties || saved.selectedSpecialties || []);
  const [allowances, setAllowances] = useState<AllowanceItem[]>(saved.allowances || []);

  useEffect(() => {
    if (!open) return;
    setCurrency((existingCurrency as any) || (preferredCurrency as any) || saved.currency || "USD");
    setSelectedDivisions(existingDivisions || saved.selectedDivisions || []);
    setCostRegion(existingRegion ?? saved.costRegion ?? null);
    setScopeText(existingScopeText || saved.scopeText || "");
    setSelectedSpecialties(existingSpecialties || saved.selectedSpecialties || []);
    setAllowances(saved.allowances || []);
  }, [open, existingCurrency, preferredCurrency, existingDivisions, existingRegion, existingScopeText, existingSpecialties, saved]);

  const scopeIntent = useMemo(
    () => buildScopeIntent(scopeText, selectedDivisions.length > 0 ? selectedDivisions : null),
    [scopeText, selectedDivisions]
  );

  const addAllowance = () => {
    setAllowances(prev => [...prev, { id: crypto.randomUUID(), description: "", amount: 0 }]);
  };

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl text-cream flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Configure Bid Scope
          </DialogTitle>
          <DialogDescription className="text-cream-muted">
            Tell ConstructLine what scope to take off from {pendingSheetCount} drawing{pendingSheetCount !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto overscroll-contain min-h-0 space-y-5 pr-1">
          {uncalibratedSheetCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-300">
                  {uncalibratedSheetCount} sheet{uncalibratedSheetCount !== 1 ? "s" : ""} not scale-calibrated
                </p>
                <p className="text-xs text-amber-300/70 mt-0.5">
                  Set scale on each sheet for accurate real-world quantities.
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

          <section className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-500" />
                <Label className="text-base font-semibold text-cream">What scope are you bidding?</Label>
              </div>
              <p className="text-xs text-cream-muted">
                Add the trade package, inclusions, exclusions, and boundary items. Leave blank for a full drawing-set takeoff.
              </p>
            </div>
            <Textarea
              value={scopeText}
              onChange={(e) => setScopeText(e.target.value)}
              placeholder="Example: Underground concrete plus below-grade waterproofing. Include trench pits, correlator pit, rebar, formwork, concrete, vapor barrier, waterproofing, protection board, direct excavation and backfill. Exclude roofing and above-grade envelope."
              className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 min-h-[170px] resize-none text-sm"
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-cream-muted/50">{scopeText.length}/2000</span>
              {scopeText.trim() && (
                <button onClick={() => setScopeText("")} className="text-[10px] text-amber-400 hover:text-amber-300 transition-colors">
                  Clear scope
                </button>
              )}
            </div>
            {scopeIntent.hasScope && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-amber-300">Interpreted Scope</span>
                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px]">
                    {scopeIntent.summary}
                  </Badge>
                </div>
                <p className="text-xs text-cream-muted">
                  Boundary items remain visible as Needs scope review so you can include, edit, or delete them before pricing.
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-cream-muted/60">Examples</span>
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    onClick={() => setScopeText(example)}
                    className="text-[11px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-cream-muted hover:bg-amber-500/10 hover:text-amber-300 hover:border-amber-500/20 transition-colors"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <details className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-cream">Advanced optional settings</summary>
            <div className="space-y-5 pt-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm font-semibold text-cream">Currency</Label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCurrency(c.code);
                        if (c.code !== currency) setCostRegion(null);
                      }}
                      className={`p-3 rounded-lg border transition-colors text-left ${
                        currency === c.code ? "border-amber-500/50 bg-amber-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="font-semibold text-cream">{c.flag}</span>
                      <p className="text-[10px] text-cream-muted mt-1">{c.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm font-semibold text-cream">CSI Divisions</Label>
                  <Badge className="bg-white/10 text-cream-muted border-white/10 text-[10px] font-normal">Inference aid</Badge>
                </div>
                <DivisionSelector value={selectedDivisions} onChange={setSelectedDivisions} defaultExpanded={false} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm font-semibold text-cream">Trade Specialties</Label>
                  <Badge className="bg-white/10 text-cream-muted border-white/10 text-[10px] font-normal">Inference aid</Badge>
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
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm font-semibold text-cream">Regional Cost Factoring</Label>
                </div>
                <RegionSelector value={costRegion} onChange={setCostRegion} defaultExpanded={false} currency={currency} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-500" />
                  <Label className="text-sm font-semibold text-cream">Allowances</Label>
                </div>
                <div className="space-y-2">
                  {allowances.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <Input
                        value={item.description}
                        onChange={(e) => setAllowances(prev => prev.map(a => a.id === item.id ? { ...a, description: e.target.value } : a))}
                        placeholder="Allowance description"
                        className="flex-1 bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 h-9 text-sm"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cream-muted text-sm">$</span>
                        <Input
                          type="number"
                          value={item.amount ? Math.round(item.amount / 100) : ""}
                          onChange={(e) => setAllowances(prev => prev.map(a => a.id === item.id ? { ...a, amount: Math.round((parseFloat(e.target.value) || 0) * 100) } : a))}
                          placeholder="0"
                          className="bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 h-9 text-sm pl-6 text-right"
                          min={0}
                        />
                      </div>
                      <button onClick={() => setAllowances(prev => prev.filter(a => a.id !== item.id))} className="text-red-400/60 hover:text-red-400 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={addAllowance} className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors py-1">
                    <Plus className="w-4 h-4" />
                    Add Allowance Item
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-cream-muted hover:text-cream">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold"
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
