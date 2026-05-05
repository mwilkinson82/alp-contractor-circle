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
import { Loader2, Settings, AlertCircle, RefreshCw, FileText, Wrench, Bookmark, X, PlusCircle, Trash2, DollarSign, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TRADE_SPECIALTIES } from "../../../shared/tradeSpecialties";
import { buildScopeIntent } from "../../../shared/scopeIntent";
import {
  BID_MODE_BEHAVIORS,
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
  currentProjectType?: string | null;
  currentBidMode?: string | null;
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
    allowances?: AllowanceItem[] | null,
    projectType?: TakeoffProjectType,
    bidMode?: TakeoffBidMode
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
  currentProjectType,
  currentBidMode,
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
  const [selectedProjectType, setSelectedProjectType] = useState<TakeoffProjectType>(normalizeTakeoffProjectType(currentProjectType));
  const [selectedBidMode, setSelectedBidMode] = useState<TakeoffBidMode>(normalizeTakeoffBidMode(currentBidMode));
  const [scopeText, setScopeText] = useState<string>(currentScopeText || "");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(currentSpecialties || []);
  const [selectedRateProfileId, setSelectedRateProfileId] = useState<number | null>(currentRateProfileId ?? null);
  const [allowances, setAllowances] = useState<AllowanceItem[]>(currentAllowances || []);
  const scopeIntent = useMemo(
    () => buildScopeIntent(scopeText, selectedDivisions.length > 0 ? selectedDivisions : null, selectedBidMode),
    [scopeText, selectedDivisions, selectedBidMode]
  );
  const bidModeBehavior = useMemo(() => getBidModeBehavior(selectedBidMode), [selectedBidMode]);
  const tradePackageNeedsScope = selectedBidMode === "trade_package" && scopeText.trim().length < 12 && selectedDivisions.length === 0 && selectedSpecialties.length === 0;
  const [saving, setSaving] = useState(false);

  const profilesQuery = trpc.tradeRates.listRateProfiles.useQuery();

  // Reset state when dialog opens (in case project data changed externally)
  useEffect(() => {
    if (open) {
      setSelectedDivisions(currentDivisions || []);
      setSelectedRegion(currentRegion || null);
      setSelectedCurrency(currentCurrency || "USD");
      setSelectedProjectType(normalizeTakeoffProjectType(currentProjectType));
      setSelectedBidMode(normalizeTakeoffBidMode(currentBidMode));
      setScopeText(currentScopeText || "");
      setSelectedSpecialties(currentSpecialties || []);
      setSelectedRateProfileId(currentRateProfileId ?? null);
      setAllowances(currentAllowances || []);
    }
  }, [open, currentDivisions, currentRegion, currentCurrency, currentProjectType, currentBidMode, currentScopeText, currentSpecialties, currentRateProfileId, currentAllowances]);

  const divisionsChanged = JSON.stringify([...(selectedDivisions || [])].sort()) !== JSON.stringify([...(currentDivisions || [])].sort());
  const regionChanged = selectedRegion !== currentRegion;
  const currencyChanged = selectedCurrency !== (currentCurrency || "USD");
  const projectTypeChanged = selectedProjectType !== normalizeTakeoffProjectType(currentProjectType);
  const bidModeChanged = selectedBidMode !== normalizeTakeoffBidMode(currentBidMode);
  const scopeChanged = scopeText !== (currentScopeText || "");
  const specialtiesChanged = JSON.stringify([...(selectedSpecialties || [])].sort()) !== JSON.stringify([...(currentSpecialties || [])].sort());
  const rateProfileChanged = selectedRateProfileId !== (currentRateProfileId ?? null);
  const allowancesChanged = JSON.stringify(allowances) !== JSON.stringify(currentAllowances || []);
  const hasChanges = divisionsChanged || regionChanged || currencyChanged || projectTypeChanged || bidModeChanged || scopeChanged || specialtiesChanged || rateProfileChanged || allowancesChanged;
  const allowancePresets = useMemo(() => getAllowancePresetsForProjectType(selectedProjectType), [selectedProjectType]);

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
        projectTypeChanged ? selectedProjectType : undefined,
        bidModeChanged ? selectedBidMode : undefined,
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
        className="border-[#d7c7aa] bg-white/65 text-[#716855] shadow-sm hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
      >
        <Settings className="w-4 h-4 mr-2" />
        Edit Settings
      </Button>

      {/* Settings Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col min-w-0 border-[#d7c7aa] bg-[#f4efe4] text-[#171714] shadow-[0_32px_90px_rgba(41,37,28,0.34)] [&_[data-slot=dialog-header]]:border-[#d8c9ad] [&_[data-slot=dialog-footer]]:border-[#d8c9ad] [&_[data-slot=dialog-close]]:text-[#716855] [&_[data-slot=dialog-close]]:hover:bg-white [&_[data-slot=dialog-close]]:hover:text-[#171714]">
          <DialogHeader>
            <DialogTitle className="text-[#171714]">Project Settings</DialogTitle>
            <DialogDescription className="text-[#716855]">
              Edit bid mode, scope boundary, pricing, and review settings for this project.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 py-2 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0 min-w-0 pr-1">
            {/* Current Settings Summary */}
            <div className="space-y-2 rounded-lg border border-[#d7c7aa] bg-white/70 p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#716855]">Current Settings</div>
              <div className="flex flex-wrap gap-2">
                <Badge className="border-[#d7c7aa] bg-white text-[#5d5546]">
                  {CURRENCIES.find((c) => c.code === (currentCurrency || "USD"))?.flag}{" "}
                  {currentCurrency || "USD"}
                </Badge>
                <Badge className="border-blue-200 bg-blue-50 text-[#244c91]">
                  <Building2 className="w-3 h-3 mr-1" />
                  {getTakeoffProjectTypeLabel(currentProjectType)}
                </Badge>
                <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]">
                  {getBidModeBehavior(currentBidMode).shortLabel}
                </Badge>
                {currentDivisions && currentDivisions.length > 0 ? (
                  <Badge className="border-blue-200 bg-blue-50 text-[#244c91]">
                    {currentDivisions.length} divisions
                  </Badge>
                ) : (
                  <Badge className="border-[#d7c7aa] bg-white text-[#716855]">
                    All divisions
                  </Badge>
                )}
                {currentSpecialties && currentSpecialties.length > 0 ? (
                  <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]">
                    <Wrench className="w-3 h-3 mr-1" />
                    {currentSpecialties.length} specialties
                  </Badge>
                ) : (
                  <Badge className="border-[#d7c7aa] bg-white text-[#716855]">
                    Auto-detect specialties
                  </Badge>
                )}
                {currentRegion ? (
                  <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800">
                    {currentRegionName || currentRegion}
                  </Badge>
                ) : (
                  <Badge className="border-[#d7c7aa] bg-white text-[#716855]">
                    National Average
                  </Badge>
                )}
              </div>
              {currentSpecialtyNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {currentSpecialtyNames.map((name) => (
                    <Badge
                      key={name}
                      className="border-[#d7b44d] bg-[#fff7da] text-[9px] text-[#8a6510]"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              )}
              {currentScopeText && (
                <div className="mt-1 border-t border-[#d8c9ad] pt-2 text-xs text-[#716855]">
                  <span className="font-medium text-[#5d5546]">Scope:</span>{" "}
                  <span className="italic">{currentScopeText.length > 120 ? currentScopeText.slice(0, 120) + "..." : currentScopeText}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="text-sm font-semibold text-[#171714]">Bid Mode</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {TAKEOFF_BID_MODES.map((mode) => {
                  const option = BID_MODE_BEHAVIORS[mode];
                  const isActive = selectedBidMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSelectedBidMode(mode)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        isActive ? "border-[#d7b44d] bg-[#fff4cb] shadow-sm" : "border-[#d7c7aa] bg-white/75 hover:bg-white"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#171714]">{option.label}</span>
                      <p className="mt-1 text-[10px] leading-snug text-[#716855]">{option.description}</p>
                    </button>
                  );
                })}
              </div>
              {bidModeChanged && hasProcessedSheets && (
                <div className="flex items-start gap-2 rounded-md border border-[#d7b44d] bg-[#fff7da] p-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#a66d00]" />
                  <span className="text-xs text-[#8a6510]">Bid mode changes apply on the next re-analysis.</span>
                </div>
              )}
              {tradePackageNeedsScope && (
                <div className="flex items-start gap-2 rounded-md border border-[#d7b44d] bg-[#fff7da] p-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#a66d00]" />
                  <span className="text-xs text-[#8a6510]">Trade Package Takeoff needs a scope boundary, selected divisions, or specialties for strict review/exclude behavior.</span>
                </div>
              )}
            </div>

            {/* Currency Toggle */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[#171714]">
                Currency
                <span className="ml-2 text-xs font-medium text-[#716855]">(filters available regions)</span>
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
                          ? "border-[#d7b44d] bg-[#fff4cb] shadow-sm"
                          : "border-[#d7c7aa] bg-white/75 hover:bg-white"
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-semibold text-[#171714]">{c.symbol}</span>
                          <span className="text-sm font-medium text-[#171714]">{c.code}</span>
                        </div>
                        <span className="text-[10px] text-[#716855]">{c.label}</span>
                      </div>
                      {isActive && (
                        <div className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#d9a21a]">
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

            {/* Project Type Selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#171714]">
                <Building2 className="h-4 w-4 text-[#8a6510]" />
                Project Type
                <span className="text-xs font-medium text-[#716855]">(drives QA and allowance defaults)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                {TAKEOFF_PROJECT_TYPE_OPTIONS.map((option) => {
                  const isActive = selectedProjectType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSelectedProjectType(option.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        isActive
                          ? "border-[#d7b44d] bg-[#fff4cb] shadow-sm"
                          : "border-[#d7c7aa] bg-white/75 hover:bg-white"
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#171714]">{option.label}</span>
                      <p className="mt-1 text-[10px] leading-snug text-[#716855]">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Division Selector */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[#171714]">
                Bid Package Divisions
              </div>
              <p className="text-xs text-[#716855]">
                Use divisions as the broad trade boundary, then use Scope Description for narrower subcontract scopes.
              </p>
              <DivisionSelector
                value={selectedDivisions}
                onChange={setSelectedDivisions}
                defaultExpanded={false}
              />
              {divisionsChanged && hasProcessedSheets && onReAnalyze && (
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#244c91]" />
                  <div className="flex-1">
                    <span className="mb-2 block text-xs text-[#244c91]">
                      Division changes require re-analysis to extract new line items. Click "Re-Analyze" below to process your drawings with the updated divisions.
                    </span>
                    <Button
                      size="sm"
                      onClick={handleReAnalyze}
                      className="h-7 border border-blue-200 bg-white text-xs text-[#244c91] hover:bg-blue-50"
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
              <div className="flex items-center gap-2 text-sm font-semibold text-[#171714]">
                <Wrench className="h-4 w-4 text-[#8a6510]" />
                Trade Specialties
                <Badge className="border-emerald-300 bg-emerald-50 text-[10px] font-normal text-emerald-800">
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
                <div className="flex items-start gap-2 rounded-md border border-[#d7b44d] bg-[#fff7da] p-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#a66d00]" />
                  <span className="text-xs text-[#8a6510]">
                    Specialty changes will take effect on the next re-analysis.
                  </span>
                </div>
              )}
            </div>

            {/* Region Selector */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[#171714]">
                Cost Region
                <span className="ml-2 text-xs font-medium text-[#716855]">(recalculates all costs)</span>
              </div>
              <RegionSelector
                value={selectedRegion}
                onChange={setSelectedRegion}
                defaultExpanded={false}
                currency={selectedCurrency}
              />
              {regionChanged && (
                <div className="flex items-start gap-2 rounded-md border border-[#d7b44d] bg-[#fff7da] p-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#a66d00]" />
                  <span className="text-xs text-[#8a6510]">
                    Region change will automatically recalculate all item costs based on the new regional multiplier.
                  </span>
                </div>
              )}
            </div>

            {/* Rate Profile Selector */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#171714]">
                <Bookmark className="h-4 w-4 text-[#8a6510]" />
                Rate Profile
                <span className="text-xs font-medium text-[#716855]">(overrides global hub configuration for this project)</span>
              </div>
              {profilesQuery.isLoading ? (
                <div className="flex items-center gap-2 py-2 text-xs text-[#716855]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />Loading profiles...
                </div>
              ) : (profilesQuery.data ?? []).length === 0 ? (
                <div className="rounded-lg border border-[#d7c7aa] bg-white/70 p-3 text-xs text-[#716855]">
                  No rate profiles saved yet. Go to Trade Rate Library → Rate Profiles to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => setSelectedRateProfileId(null)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all ${
                        selectedRateProfileId === null
                          ? "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]"
                          : "border-[#d7c7aa] bg-white/75 text-[#716855] hover:bg-white hover:text-[#171714]"
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-medium">Use Hub Default</span>
                      <span className="ml-1 text-[#8a806d]">- global configuration from Trade Rate Library</span>
                    </button>
                    {(profilesQuery.data ?? []).map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => setSelectedRateProfileId(profile.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-all ${
                          selectedRateProfileId === profile.id
                            ? "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]"
                            : "border-[#d7c7aa] bg-white/75 text-[#716855] hover:bg-white hover:text-[#171714]"
                        }`}
                      >
                        <Bookmark className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium">{profile.name}</span>
                        {profile.projectType && (
                          <Badge className="ml-auto border-blue-200 bg-blue-50 text-[9px] text-[#244c91]">
                            {profile.projectType.charAt(0).toUpperCase() + profile.projectType.slice(1)}
                          </Badge>
                        )}
                        {profile.workType && (
                          <Badge className="border-[#d7c7aa] bg-white text-[9px] text-[#5d5546]">
                            {profile.workType === "open_shop" ? "Open Shop" : "Union"}
                          </Badge>
                        )}
                        {profile.region && (
                          <Badge className="border-emerald-300 bg-emerald-50 text-[9px] text-emerald-800">
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
              <div className="flex items-center gap-2 text-sm font-semibold text-[#171714]">
                <DollarSign className="h-4 w-4 text-emerald-700" />
                Allowances
                <span className="text-xs font-medium text-[#716855]">({getTakeoffProjectTypeLabel(selectedProjectType)} presets)</span>
              </div>
              {/* Quick-add presets */}
              <div className="space-y-2 mb-2">
                {allowancePresets.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {allowancePresets
                      .filter(preset => !allowances.some(a => a.description.toLowerCase() === preset.label.toLowerCase()))
                      .map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setAllowances(prev => [...prev, { description: preset.label, amount: preset.amount }])}
                        className="rounded-md border border-[#d7b44d] bg-[#fff7da] px-2.5 py-1 text-xs text-[#8a6510] transition-colors hover:bg-[#fff4cb]"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#716855]">No quick-add presets shown for Other / Not sure. Add manual allowances as needed.</p>
                )}
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
                      className="h-9 flex-1 border-[#d7c7aa] bg-white text-sm text-[#171714] placeholder:text-[#8a806d]"
                    />
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[#716855]">$</span>
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
                        className="h-9 w-32 border-[#d7c7aa] bg-white pl-6 text-right text-sm text-[#171714]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowances(allowances.filter((_, i) => i !== idx))}
                      className="rounded p-1.5 text-orange-700/70 transition-colors hover:bg-orange-50 hover:text-orange-800"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setAllowances([...allowances, { description: "", amount: 0 }])}
                  className="flex items-center gap-1.5 py-1 text-xs text-[#8a6510] transition-colors hover:text-[#6f4d00]"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Allowance Item
                </button>
              </div>
              {allowances.length > 0 && (
                <div className="flex items-center justify-between rounded-lg border border-[#d7c7aa] bg-white/75 px-3 py-2">
                  <span className="text-xs text-[#716855]">Total Allowances</span>
                  <span className="font-mono text-sm font-semibold text-[#a66d00]">
                    ${(allowances.reduce((sum, a) => sum + a.amount, 0) / 100).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Scope Text */}
            <div className="space-y-2 min-w-0 overflow-hidden">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm font-semibold text-[#171714]">
                <FileText className="h-4 w-4 text-[#8a6510]" />
                <span>{selectedBidMode === "full_gc" ? "GC Scope Notes" : selectedBidMode === "fast_scope_check" ? "Scope Check Question" : "Trade Scope Boundary"}</span>
                <span className="break-words text-xs font-medium text-[#716855]">({bidModeBehavior.shortLabel})</span>
              </div>
              <div ref={scopeRef} className="min-w-0">
              <Textarea
                value={scopeText}
                onChange={(e) => setScopeText(e.target.value)}
                placeholder={selectedBidMode === "full_gc"
                  ? "e.g. Full GC estimate. Include normal trade coverage and call out owner-furnished equipment exclusions."
                  : selectedBidMode === "fast_scope_check"
                    ? "e.g. Quick bid/no-bid read for below-grade waterproofing and drainage risk. Flag concrete and MEP interfaces for review."
                    : "e.g. Below-grade waterproofing only. Include membrane, protection board, waterstops, foundation drains, and vapor barrier. Exclude roofing and above-grade envelope."}
                className="min-h-[80px] max-h-48 resize-y overflow-y-auto break-words border-[#d7c7aa] bg-white text-[#171714] placeholder:text-[#8a806d]"
                maxLength={2000}
              />
              </div>
              {scopeIntent.hasScope && (
                <div className="max-w-full min-w-0 space-y-2 overflow-hidden rounded-md border border-[#d7b44d] bg-[#fff7da] p-3">
                  <div className="grid gap-2 min-w-0">
                    <div className="rounded-md border border-[#d7b44d] bg-white/60 px-2.5 py-1.5 text-[10px] font-semibold leading-relaxed text-[#8a6510] whitespace-normal break-words [overflow-wrap:anywhere]">
                      {scopeIntent.summary}
                    </div>
                    <p className="min-w-0 whitespace-normal break-words text-xs leading-relaxed text-[#716855]">
                      {bidModeBehavior.reviewSurface}
                    </p>
                  </div>
                  {(scopeIntent.focusDivisions.length > 0 || scopeIntent.excludedDivisions.length > 0) && (
                    <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto pr-1">
                      {scopeIntent.focusDivisions.slice(0, 6).map((division) => (
                        <Badge key={`focus-${division}`} className="whitespace-normal border-emerald-300 bg-emerald-50 text-[10px] text-emerald-800">
                          Include Div {division}
                        </Badge>
                      ))}
                      {scopeIntent.excludedDivisions.slice(0, 6).map((division) => (
                        <Badge key={`exclude-${division}`} className="whitespace-normal border-orange-300 bg-orange-50 text-[10px] text-orange-800">
                          Usually excludes Div {division}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[#716855]">
                  {selectedBidMode === "full_gc"
                    ? "Broad GC mode keeps normal trade work active unless you explicitly narrow the bid."
                    : selectedBidMode === "fast_scope_check"
                      ? "Fast checks prioritize likely scope, high-signal sheets, and visible risk rows."
                      : "Upload full drawings, then describe only the work you are bidding."}
                </p>
                <span className="text-[10px] text-[#8a806d]">{scopeText.length}/2000</span>
              </div>
              {scopeChanged && hasProcessedSheets && (
                <div className="flex items-start gap-2 rounded-md border border-[#d7b44d] bg-[#fff7da] p-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#a66d00]" />
                  <span className="text-xs text-[#8a6510]">
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
                setSelectedProjectType(normalizeTakeoffProjectType(currentProjectType));
                setSelectedBidMode(normalizeTakeoffBidMode(currentBidMode));
                setScopeText(currentScopeText || "");
                setSelectedSpecialties(currentSpecialties || []);
                setAllowances(currentAllowances || []);
                setOpen(false);
              }}
              disabled={saving}
              className="border-[#c8b895] bg-white/70 text-[#29251c] hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="bg-[#171714] text-white hover:bg-[#29251c]"
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
