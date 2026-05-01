/**
 * ProjectSettingsPanel — Edit takeoff project divisions, currency, specialties, and cost region after creation.
 *
 * Features:
 * - Currency toggle buttons (USD/GBP/AUD) so region list auto-filters to the correct country
 * - Edit selected divisions
 * - Edit trade specialties (with auto-detect badges)
 * - Edit cost region (recalculates all item costs automatically)
 * - Shows current settings with badges
 * - "Re-Analyze" option when divisions change so user doesn't have to re-upload drawings
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DivisionSelector from "@/components/DivisionSelector";
import RegionSelector from "@/components/RegionSelector";
import SpecialtySelector from "@/components/SpecialtySelector";
import { Loader2, Settings, AlertCircle, RefreshCw, FileText, Wrench, Bookmark, X, PlusCircle, Trash2, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TRADE_SPECIALTIES } from "../../../shared/tradeSpecialties";
import { CUSTOM_RESIDENTIAL_ALLOWANCE_PRESETS } from "../../../shared/residentialEstimateQa";
import { buildScopeIntent } from "../../../shared/scopeIntent";
import { trpc } from "@/lib/trpc";

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar", flag: "\u{1F1FA}\u{1F1F8}" },
  { code: "GBP", symbol: "\u00A3", label: "British Pound", flag: "\u{1F1EC}\u{1F1E7}" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar", flag: "\u{1F1E6}\u{1F1FA}" },
] as const;

export interface AllowanceItem {
  description: string;
  amount: number; // in cents
}

interface ProjectSettingsPanelProps {
  projectId: number;
  currentDivisions: string[] | null;
  currentRegion: string | null;
  currentRegionName?: string;
  currentCurrency?: string | null;
  currentScopeText?: string | null;
  currentSpecialties?: string[] | null;
  detectedSpecialties?: string[] | null;
  currentRateProfileId?: number | null;
  currentAllowances?: AllowanceItem[] | null;
  onSave: (
    divisions: string[] | null,
    region: string | null,
    currency?: string,
    scopeText?: string | null,
    specialties?: string[] | null,
    rateProfileId?: number | null,
    allowances?: AllowanceItem[] | null
  ) => Promise<{ regionChanged?: boolean }>;
  /** Called when user wants to re-analyze with new divisions */
  onReAnalyze?: (divisions: string[] | null) => void;
  /** Whether sheets have been processed (to show re-analyze option) */
  hasProcessedSheets?: boolean;
  /** External control: open the dialog from outside */
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  /** If true, scroll to the Scope Description field when dialog opens */
  focusScope?: boolean;
}

export default function ProjectSettingsPanel({
  projectId,
  currentDivisions,
  currentRegion,
  currentRegionName,
  currentCurrency,
  currentScopeText,
  currentSpecialties,
  detectedSpecialties,
  currentRateProfileId,
  currentAllowances,
  onSave,
  onReAnalyze,
  hasProcessedSheets,
  externalOpen,
  onExternalOpenChange,
  focusScope,
}: ProjectSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const scopeRef = useRef<HTMLDivElement>(null);
  // Sync with external open control
  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);
  // When dialog opens with focusScope, scroll to scope field after a brief delay
  useEffect(() => {
    if (open && focusScope && scopeRef.current) {
      setTimeout(() => {
        scopeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        scopeRef.current?.focus();
      }, 150);
    }
  }, [open, focusScope]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(currentDivisions || []);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(currentRegion || null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(currentCurrency || "USD");
  const [scopeText, setScopeText] = useState<string>(currentScopeText || "");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(currentSpecialties || []);
  const [selectedRateProfileId, setSelectedRateProfileId] = useState<number | null>(currentRateProfileId ?? null);
  const [allowances, setAllowances] = useState<AllowanceItem[]>(currentAllowances || []);
  const scopeIntent = useMemo(
    () => buildScopeIntent(scopeText, selectedDivisions.length > 0 ? selectedDivisions : null),
    [scopeText, selectedDivisions]
  );
  const [saving, setSaving] = useState(false);

  const profilesQuery = trpc.tradeRates.listRateProfiles.useQuery();

  // Reset state when dialog opens (in case project data changed externally)
  useEffect(() => {
    if (open) {
      setSelectedDivisions(currentDivisions || []);
      setSelectedRegion(currentRegion || null);
      setSelectedCurrency(currentCurrency || "USD");
      setScopeText(currentScopeText || "");
      setSelectedSpecialties(currentSpecialties || []);
      setSelectedRateProfileId(currentRateProfileId ?? null);
      setAllowances(currentAllowances || []);
    }
  }, [open, currentDivisions, currentRegion, currentCurrency, currentScopeText, currentSpecialties, currentRateProfileId, currentAllowances]);

  const divisionsChanged = JSON.stringify([...(selectedDivisions || [])].sort()) !== JSON.stringify([...(currentDivisions || [])].sort());
  const regionChanged = selectedRegion !== currentRegion;
  const currencyChanged = selectedCurrency !== (currentCurrency || "USD");
  const scopeChanged = scopeText !== (currentScopeText || "");
  const specialtiesChanged = JSON.stringify([...(selectedSpecialties || [])].sort()) !== JSON.stringify([...(currentSpecialties || [])].sort());
  const rateProfileChanged = selectedRateProfileId !== (currentRateProfileId ?? null);
  const allowancesChanged = JSON.stringify(allowances) !== JSON.stringify(currentAllowances || []);
  const hasChanges = divisionsChanged || regionChanged || currencyChanged || scopeChanged || specialtiesChanged || rateProfileChanged || allowancesChanged;

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave(
        selectedDivisions.length > 0 ? selectedDivisions : null,
        selectedRegion,
        currencyChanged ? selectedCurrency : undefined,
        scopeChanged ? (scopeText.trim() || null) : undefined,
        specialtiesChanged ? (selectedSpecialties.length > 0 ? selectedSpecialties : null) : undefined,
        rateProfileChanged ? selectedRateProfileId : undefined,
        allowancesChanged ? (allowances.length > 0 ? allowances : null) : undefined,
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

  // Build specialty names for summary
  const currentSpecialtyNames = (currentSpecialties || [])
    .map((id) => TRADE_SPECIALTIES[id]?.name)
    .filter(Boolean);

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
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Project Settings</DialogTitle>
            <DialogDescription>
              Adjust currency, divisions, specialties, and cost region for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 py-2 overflow-y-auto overscroll-contain min-h-0 pr-1">
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
                {currentSpecialties && currentSpecialties.length > 0 ? (
                  <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20">
                    <Wrench className="w-3 h-3 mr-1" />
                    {currentSpecialties.length} specialties
                  </Badge>
                ) : (
                  <Badge className="bg-white/5 text-cream-muted border-white/10">
                    Auto-detect specialties
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
              {currentSpecialtyNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentSpecialtyNames.map((name) => (
                    <Badge
                      key={name}
                      className="bg-amber-500/10 text-amber-300/70 border-amber-500/15 text-[9px]"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
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
                Bid Package Divisions
              </div>
              <p className="text-xs text-cream-muted">
                Use divisions as the broad trade boundary, then use Scope Description for narrower subcontract scopes.
              </p>
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

            {/* Trade Specialties */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                Trade Specialties
                <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/25 text-[10px] font-normal">
                  New
                </Badge>
              </div>
              <SpecialtySelector
                value={selectedSpecialties}
                onChange={setSelectedSpecialties}
                selectedDivisions={selectedDivisions}
                detectedSpecialties={detectedSpecialties || []}
              />
              {specialtiesChanged && hasProcessedSheets && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-amber-300">
                    Specialty changes will take effect on the next re-analysis.
                  </span>
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

            {/* Rate Profile Selector */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                Rate Profile
                <span className="text-xs text-cream-muted">(overrides global hub configuration for this project)</span>
              </div>
              {profilesQuery.isLoading ? (
                <div className="flex items-center gap-2 text-xs text-cream-muted py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading profiles...
                </div>
              ) : (profilesQuery.data ?? []).length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-xs text-cream-muted">
                  No rate profiles saved yet. Go to Trade Rate Library → Rate Profiles to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => setSelectedRateProfileId(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all ${
                        selectedRateProfileId === null
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                          : "bg-white/5 border-white/10 text-cream-muted hover:bg-white/8 hover:text-cream"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">Use Hub Default</span>
                      <span className="text-cream-muted/60 ml-1">— global configuration from Trade Rate Library</span>
                    </button>
                    {(profilesQuery.data ?? []).map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => setSelectedRateProfileId(profile.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all ${
                          selectedRateProfileId === profile.id
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                            : "bg-white/5 border-white/10 text-cream-muted hover:bg-white/8 hover:text-cream"
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">{profile.name}</span>
                        {profile.projectType && (
                          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25 text-[9px] ml-auto">
                            {profile.projectType.charAt(0).toUpperCase() + profile.projectType.slice(1)}
                          </Badge>
                        )}
                        {profile.workType && (
                          <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/25 text-[9px]">
                            {profile.workType === "open_shop" ? "Open Shop" : "Union"}
                          </Badge>
                        )}
                        {profile.region && (
                          <Badge className="bg-green-500/15 text-green-300 border-green-500/25 text-[9px]">
                            {profile.region}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Allowances (Residential Selections) */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Allowances
                <span className="text-xs text-cream-muted">(selections not yet priced — cabinets, countertops, tile, etc.)</span>
              </div>
              {/* Quick-add presets */}
              <div className="space-y-2 mb-2">
                <div>
                  <span className="text-xs text-cream-muted">Residential</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {[
                      ...CUSTOM_RESIDENTIAL_ALLOWANCE_PRESETS.map(preset => ({ label: preset.description, amount: preset.amount })),
                    ].filter(preset => !allowances.some(a => a.description.toLowerCase() === preset.label.toLowerCase())).map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAllowances(prev => [...prev, { description: preset.label, amount: preset.amount }])}
                        className="px-2.5 py-1 text-xs rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-cream-muted">Commercial</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
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
                        type="button"
                        onClick={() => setAllowances(prev => [...prev, { description: preset.label, amount: preset.amount }])}
                        className="px-2.5 py-1 text-xs rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-300 hover:bg-blue-500/20 transition-colors"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-cream-muted">Public Works</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
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
                        type="button"
                        onClick={() => setAllowances(prev => [...prev, { description: preset.label, amount: preset.amount }])}
                        className="px-2.5 py-1 text-xs rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                {allowances.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={item.description}
                      onChange={(e) => {
                        const updated = [...allowances];
                        updated[idx] = { ...updated[idx], description: e.target.value };
                        setAllowances(updated);
                      }}
                      placeholder="e.g. Kitchen Cabinets"
                      className="flex-1 h-9 text-sm bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40"
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-cream-muted text-sm">$</span>
                      <Input
                        type="number"
                        step="100"
                        min="0"
                        value={(item.amount / 100).toFixed(0)}
                        onChange={(e) => {
                          const updated = [...allowances];
                          updated[idx] = { ...updated[idx], amount: Math.round(parseFloat(e.target.value || "0") * 100) };
                          setAllowances(updated);
                        }}
                        placeholder="0"
                        className="w-32 h-9 text-sm bg-white/5 border-white/10 text-cream pl-6 text-right"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowances(allowances.filter((_, i) => i !== idx))}
                      className="p-1.5 rounded hover:bg-red-500/20 text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAllowances([...allowances, { description: "", amount: 0 }])}
                  className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 transition-colors py-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Allowance Item
                </button>
              </div>
              {allowances.length > 0 && (
                <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <span className="text-xs text-cream-muted">Total Allowances</span>
                  <span className="text-sm font-semibold text-amber-400 font-mono">
                    ${(allowances.reduce((sum, a) => sum + a.amount, 0) / 100).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Scope Text */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-cream flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Scope Intent
                <span className="text-xs text-cream-muted">(optional bid package instructions)</span>
              </div>
              <div ref={scopeRef}>
              <Textarea
                value={scopeText}
                onChange={(e) => setScopeText(e.target.value)}
                placeholder="e.g. Below-grade waterproofing only. Include membrane, protection board, waterstops, foundation drains, and vapor barrier. Exclude roofing and above-grade envelope."
                className="min-h-[80px] bg-white/5 border-white/10 text-cream placeholder:text-cream-muted/40 resize-none"
                maxLength={2000}
              />
              </div>
              {scopeIntent.hasScope && (
                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px]">
                      {scopeIntent.summary}
                    </Badge>
                    <span className="text-xs text-cream-muted">Items outside this intent may be removed or tagged for review on re-analysis.</span>
                  </div>
                  {(scopeIntent.focusDivisions.length > 0 || scopeIntent.excludedDivisions.length > 0) && (
                    <div className="flex flex-wrap gap-1.5">
                      {scopeIntent.focusDivisions.slice(0, 6).map((division) => (
                        <Badge key={`focus-${division}`} className="bg-emerald-500/10 text-emerald-300 border-emerald-500/20 text-[10px]">
                          Include Div {division}
                        </Badge>
                      ))}
                      {scopeIntent.excludedDivisions.slice(0, 6).map((division) => (
                        <Badge key={`exclude-${division}`} className="bg-red-500/10 text-red-300 border-red-500/20 text-[10px]">
                          Usually excludes Div {division}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-cream-muted/50">
                  Upload full drawings, then describe only the work you are bidding.
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
                setSelectedSpecialties(currentSpecialties || []);
                setAllowances(currentAllowances || []);
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
