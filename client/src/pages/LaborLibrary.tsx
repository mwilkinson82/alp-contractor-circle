/**
 * LaborLibrary (Trade Rate Library) — Manage trade rates, burden configuration,
 * and crew definitions for ConstructLine estimating.
 *
 * Structure: Trades × Classifications × Labor Types × Regional Factors
 * Burden: User enters actual burden rates → system calculates fully burdened rate
 */
import { useState, useMemo, useEffect } from "react";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Search,
  X,
  Loader2,
  Settings2,
  Download,
  Pencil,
  Check,
  Info,
  HardHat,
  Users,
  Sparkles,
  Plus,
  UserPlus,
  Bookmark,
  Trash2,
  Save,
  FolderOpen,
  Copy,
} from "lucide-react";
import CrewBuilder from "@/components/CrewBuilder";
import {
  TRADES,
  getResolvedBaseWage,
  LABOR_TYPE_LABELS,
  DEFAULT_BURDENS,
  calculateBurdenedRate,
  type LaborType,
  type BurdenDefaults,
} from "../../../shared/tradeRates";
import RateSetupWizard, {
  loadRateConfig,
  saveRateConfig,
  type RateSetupConfig,
} from "@/components/RateSetupWizard";

// ─── Constants ────────────────────────────────────────────────────────────────
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function formatPct(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2)}%`;
}
function parsePctToBasisPoints(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100);
}
function parseDollarsToCents(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

const CSI_DIV_NAMES: Record<string, string> = {
  "02": "Existing Conditions",
  "03": "Concrete",
  "04": "Masonry",
  "05": "Metals",
  "06": "Wood/Plastics/Composites",
  "07": "Thermal & Moisture",
  "08": "Openings",
  "09": "Finishes",
  "10": "Specialties",
  "21": "Fire Suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "31": "Earthwork",
  "32": "Exterior Improvements",
  "33": "Utilities",
};

const LABOR_TYPE_DISPLAY: Record<LaborType, string> = {
  res_open: "Residential · Open Shop",
  res_union: "Residential · Union",
  com_open: "Commercial · Open Shop",
  com_union: "Commercial · Union",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function LaborLibrary() {
  const { member } = useMember();
  const [, setLocation] = useLocation();

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [rateConfig, setRateConfig] = useState<RateSetupConfig | null>(null);

  // Derived from config or defaults
  const laborType: LaborType = rateConfig?.laborType || "com_open";
  const regionMultiplier = 1; // Region is already baked into rates by wizard; display multiplier is 1x

  // Support ?tab=crews URL param from the setup checklist
  const urlTab =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("tab")
      : null;
  const [activeView, setActiveView] = useState<"rates" | "crews" | "profiles">(
    urlTab === "crews" ? "crews" : "rates"
  );
  const [search, setSearch] = useState("");
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());
  const [showBurdenPanel, setShowBurdenPanel] = useState(false);
  const [editingRate, setEditingRate] = useState<{
    tradeName: string;
    classification: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  // Custom role dialog
  const [addCustomRole, setAddCustomRole] = useState<{ div: string } | null>(
    null
  );
  const [customTradeName, setCustomTradeName] = useState("");
  const [customClassification, setCustomClassification] = useState("");
  const [customHourlyRate, setCustomHourlyRate] = useState("");
  const [customRoleNotes, setCustomRoleNotes] = useState("");

  const tradeRatesQuery = trpc.tradeRates.getTradeRates.useQuery({ laborType });
  const burdenQuery = trpc.tradeRates.getBurdenForType.useQuery({ laborType });
  const utils = trpc.useUtils();

  const configureMutation = trpc.tradeRates.configureRates.useMutation({
    onSuccess: data => {
      toast.success(`Calibrated ${data.count} trade rates`);
      utils.tradeRates.getTradeRates.invalidate();
    },
    onError: () => toast.error("Failed to configure rates"),
  });

  const saveCustomRoleMutation = trpc.tradeRates.updateTradeRate.useMutation({
    onSuccess: () => {
      toast.success("Custom role saved");
      utils.tradeRates.getTradeRates.invalidate();
      setAddCustomRole(null);
      setCustomTradeName("");
      setCustomClassification("");
      setCustomHourlyRate("");
      setCustomRoleNotes("");
    },
    onError: () => toast.error("Failed to save custom role"),
  });

  const handleSaveCustomRole = () => {
    if (
      !customTradeName.trim() ||
      !customClassification.trim() ||
      !customHourlyRate.trim()
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    const cents = parseDollarsToCents(customHourlyRate);
    if (cents <= 0) {
      toast.error("Invalid hourly rate");
      return;
    }
    saveCustomRoleMutation.mutate({
      tradeName: customTradeName.trim(),
      classification: customClassification
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_"),
      laborType,
      baseWageCents: cents,
      csiDivision: addCustomRole?.div || "05",
    });
  };

  const updateRateMutation = trpc.tradeRates.updateTradeRate.useMutation({
    onSuccess: () => {
      utils.tradeRates.getTradeRates.invalidate();
      setEditingRate(null);
    },
    onError: () => toast.error("Failed to update rate"),
  });

  const saveBurdenMutation = trpc.tradeRates.saveBurdenConfig.useMutation({
    onSuccess: () => {
      toast.success("Burden configuration saved");
      utils.tradeRates.getBurdenForType.invalidate();
      utils.tradeRates.getTradeRates.invalidate();
    },
    onError: () => toast.error("Failed to save burden config"),
  });

  // Load saved config on mount
  useEffect(() => {
    const saved = loadRateConfig();
    if (saved) {
      setRateConfig(saved);
    } else {
      // First visit — show wizard automatically
      setShowWizard(true);
    }
  }, []);

  // Handle wizard completion
  const handleWizardComplete = (config: RateSetupConfig) => {
    setRateConfig(config);
    saveRateConfig(config);
    setShowWizard(false);
    // Fire the backend mutation to recalculate all rates
    configureMutation.mutate({
      laborType: config.laborType,
      regionCode: config.regionCode ?? null,
      regionMultiplier: config.regionMultiplier ?? 10000,
      specialtyMultiplier: config.specialtyMultiplier ?? 10000,
    });
  };

  if (!member) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto mb-4" />
          <p className="text-cream-muted">Loading...</p>
        </div>
      </div>
    );
  }

  const burden: BurdenDefaults =
    burdenQuery.data && "ficaPct" in burdenQuery.data
      ? (burdenQuery.data as unknown as BurdenDefaults)
      : DEFAULT_BURDENS[laborType];

  const totalBurdenPct =
    burden.ficaPct +
    burden.futaPct +
    burden.sutaPct +
    burden.workersCompPct +
    burden.generalLiabilityPct +
    burden.pensionPct +
    burden.vacationPct +
    burden.trainingPct;
  const fixedBurdenCents =
    burden.healthInsuranceCentsPerHr +
    burden.unionFringeCentsPerHr +
    burden.otherCentsPerHr;

  // Build user rate map for quick lookups
  const userRateMap = useMemo(() => {
    const map = new Map<string, number>();
    if (tradeRatesQuery.data) {
      for (const r of tradeRatesQuery.data as any[]) {
        map.set(`${r.tradeName}|${r.classification}`, r.baseWageCents);
      }
    }
    return map;
  }, [tradeRatesQuery.data]);

  const hasUserRates = userRateMap.size > 0;

  const getRate = (tradeName: string, classification: string): number => {
    return (
      getResolvedBaseWage(tradeName, classification, laborType, userRateMap) ||
      0
    );
  };

  const getBurdenedRate = (baseCents: number): number => {
    const adjusted = Math.round(baseCents * regionMultiplier);
    return calculateBurdenedRate(adjusted, burden);
  };

  const toggleTrade = (name: string) => {
    setExpandedTrades(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const filteredTrades = useMemo(() => {
    if (!search.trim()) return TRADES;
    const q = search.toLowerCase();
    return TRADES.filter(
      t =>
        t.tradeName.toLowerCase().includes(q) ||
        t.csiDivision.includes(q) ||
        t.roles.some(r => r.roleLabel.toLowerCase().includes(q))
    );
  }, [search]);

  const filteredDivisions = useMemo(() => {
    const divs = Array.from(new Set(filteredTrades.map(t => t.csiDivision)));
    divs.sort();
    return divs;
  }, [filteredTrades]);

  // ─── Config summary values ──────────────────────────────────────────────
  const configLabel = rateConfig
    ? LABOR_TYPE_DISPLAY[rateConfig.laborType]
    : "Commercial · Open Shop";
  const regionLabel = rateConfig?.regionName || "National Average";
  const specialtyLabel = rateConfig?.specialty
    ? rateConfig.specialty
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase())
        .replace(/^Standard.*$/, "")
    : null;
  const combinedFactor = rateConfig
    ? (
        (rateConfig.regionMultiplier / 10000) *
        (rateConfig.specialtyMultiplier / 10000)
      ).toFixed(2)
    : "1.00";

  return (
    <div className="constructline-library-page constructline-rate-page min-h-screen bg-[#f5f2eb] text-[#171714]">
      {/* Header Bar */}
      <div
        data-tour="labor-library-header"
        className="bg-navy-medium/80 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/portal/constructline")}
              className="text-cream-muted hover:text-cream"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white leading-tight">
                Construct<span className="text-amber-400">Line</span>
              </span>
              <span className="text-[8px] text-gray-500 tracking-wider uppercase leading-tight">
                Powered by ALP
              </span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <h1 className="text-lg font-bold text-cream">
                Trade Rate Library
              </h1>
              <p className="text-cream-muted text-xs hidden sm:block">
                Fully burdened rates and crews Basis uses when confirming labor.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBurdenPanel(!showBurdenPanel)}
              className={`gap-1.5 ${showBurdenPanel ? "border-amber-500/50 text-amber-300 bg-amber-500/10" : "border-white/20 text-cream hover:bg-white/5"}`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Burden Config
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rows: string[] = [
                  "Trade,Classification,Base Wage ($/hr),Burdened Rate ($/hr)",
                ];
                for (const trade of TRADES) {
                  for (const role of trade.roles) {
                    const base = getRate(trade.tradeName, role.roleKey);
                    const burdened = getBurdenedRate(base);
                    rows.push(
                      `"${trade.tradeName}",${role.roleLabel},${(base / 100).toFixed(2)},${(burdened / 100).toFixed(2)}`
                    );
                  }
                }
                const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `trade-rates-${laborType}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Exported trade rates");
              }}
              className="border-white/20 text-cream hover:bg-white/5 gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Rate Configuration Summary Card */}
      <div className="border-b border-[#d7c7aa] bg-[#fff8e8] px-3 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-700" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-800">
                  Active rate configuration
                </p>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-[#171714]">
                {configLabel} · {regionLabel}
                {specialtyLabel ? ` · ${specialtyLabel}` : ""}
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-[#716855]">
                Basis uses this profile when confirming labor. Change the setup
                here, then save named profiles for public work, open-shop work,
                regions, or specialty bid conditions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                data-tour="labor-library-seed"
                onClick={() => setShowWizard(true)}
                className="gap-1.5 border border-[#171714] bg-[#171714] text-xs font-semibold text-white shadow-sm hover:bg-black"
                size="sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Reconfigure Rates
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveView("profiles")}
                className="gap-1.5 border-[#cdbb9b] bg-white text-xs font-semibold text-[#4f4638] shadow-sm hover:bg-[#fff4d2]"
                size="sm"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Manage Profiles
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-[#d7b44d] bg-[#fff4cb] px-2.5 py-0.5 text-xs font-medium text-[#8a6510]">
              {configLabel}
            </Badge>
            <Badge className="border-[#8db4f8] bg-[#eff6ff] px-2.5 py-0.5 text-xs font-medium text-[#244c91]">
              {regionLabel}
            </Badge>
            {specialtyLabel && (
              <Badge className="border-[#c7b4ff] bg-[#f2ecff] px-2.5 py-0.5 text-xs font-medium text-[#5d3fb0]">
                {specialtyLabel}
              </Badge>
            )}
            {combinedFactor !== "1.00" && (
              <span className="rounded-full border border-[#e4d7bf] bg-white px-2.5 py-1 text-xs font-medium text-[#5f5545]">
                Combined:{" "}
                <span className="font-bold text-[#8a6510]">
                  {combinedFactor}x
                </span>
              </span>
            )}
            <span className="rounded-full border border-[#e4d7bf] bg-white px-2.5 py-1 text-xs font-medium text-[#5f5545]">
              Burden:{" "}
              <span className="font-bold text-[#8a6510]">
                {formatPct(totalBurdenPct)}
              </span>
              {fixedBurdenCents > 0 && (
                <>
                  {" "}
                  +{" "}
                  <span className="font-bold text-[#8a6510]">
                    {formatCents(fixedBurdenCents)}/hr
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              data-tour="labor-library-tabs"
              className="flex items-center gap-1 rounded-lg border border-[#e4d7bf] bg-white p-1 shadow-sm"
            >
              <button
                onClick={() => setActiveView("rates")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "rates"
                    ? "bg-[#171714] text-white shadow-sm"
                    : "text-[#716855] hover:bg-[#f7f0df] hover:text-[#171714]"
                }`}
              >
                <HardHat className="w-3 h-3" />
                Trade Rates
              </button>
              <button
                onClick={() => setActiveView("crews")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "crews"
                    ? "bg-[#171714] text-white shadow-sm"
                    : "text-[#716855] hover:bg-[#f7f0df] hover:text-[#171714]"
                }`}
              >
                <Users className="w-3 h-3" />
                Crew Builder
              </button>
              <button
                onClick={() => setActiveView("profiles")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "profiles"
                    ? "bg-[#171714] text-white shadow-sm"
                    : "text-[#716855] hover:bg-[#f7f0df] hover:text-[#171714]"
                }`}
              >
                <Bookmark className="w-3 h-3" />
                Rate Profiles
              </button>
            </div>
            <p className="text-xs text-[#716855]">
              Save profiles from the Rate Profiles tab after you finish tuning
              burden, wages, and crews.
            </p>
          </div>
        </div>
      </div>

      <section
        data-tour="labor-library-crew-builder"
        className="border-b border-emerald-400/10 bg-[radial-gradient(circle_at_top_left,rgba(111,209,157,0.12),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] px-3 py-5 sm:px-6"
      >
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
              Basis labor input
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-cream">
              Trade Rate Library turns default crews into contractor-specific
              labor pricing.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-cream-muted">
              ConstructLine gives users a strong starting set of trades,
              classifications, burden, and crew patterns. They tune wages,
              burden, and crew makeup here, then Basis uses those fully burdened
              crews when labor is confirmed in the estimate.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                [
                  "Burdened rates",
                  "Base wage plus taxes, insurance, benefits, and fixed hourly burden.",
                ],
                [
                  "Crew builder",
                  "Default crews can be tweaked instead of built from scratch.",
                ],
                [
                  "Estimate handoff",
                  "Confirmed labor in Basis uses these rates and crew assumptions.",
                ],
              ].map(([title, detail]) => (
                <div
                  key={title}
                  className="rounded-xl border border-white/10 bg-navy-deep/45 p-3"
                >
                  <Check className="mb-2 h-4 w-4 text-emerald-300" />
                  <p className="text-sm font-semibold text-cream">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-cream-muted">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
            <Users className="h-5 w-5 text-emerald-300" />
            <p className="mt-3 text-sm font-semibold text-cream">
              Before confirming labor
            </p>
            <p className="mt-2 text-sm leading-6 text-cream-muted">
              Open Burden Config, verify the region and shop type, then check
              the Crew Builder for the trades your company actually
              self-performs or manages.
            </p>
            <Button
              type="button"
              onClick={() => setActiveView("crews")}
              className="mt-4 w-full bg-emerald-400 text-black hover:bg-emerald-300"
            >
              <HardHat className="mr-2 h-4 w-4" />
              Review Crews
            </Button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Burden Configuration Panel */}
        {showBurdenPanel && (
          <BurdenPanel
            laborType={laborType}
            burden={burden}
            onSave={data => saveBurdenMutation.mutate({ laborType, ...data })}
            saving={saveBurdenMutation.isPending}
            onClose={() => setShowBurdenPanel(false)}
          />
        )}

        {activeView === "profiles" ? (
          <RateProfilesPanel
            laborType={laborType}
            currentRates={tradeRatesQuery.data ?? []}
            currentCrews={[]}
          />
        ) : activeView === "crews" ? (
          <CrewBuilder
            laborType={laborType}
            burden={burden}
            regionMultiplier={regionMultiplier}
            userRateMap={userRateMap}
          />
        ) : (
          <div className="space-y-3">
            {/* Info Banner */}
            <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
              <div className="text-sm text-blue-200/80">
                <strong className="text-blue-300">How trade rates work:</strong>{" "}
                Your rates are calibrated based on your configuration above. You
                can edit any individual rate by clicking the pencil icon.
                Configure your burden rates (FICA, WC, health, etc.) in the
                Burden Config panel. The system calculates the fully burdened
                rate automatically.
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-muted" />
              <Input
                placeholder="Search trades..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-navy-medium/40 border-white/10 text-cream placeholder:text-cream-muted/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-cream-muted hover:text-cream" />
                </button>
              )}
            </div>

            {tradeRatesQuery.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDivisions.map(div => {
                  const divTrades = filteredTrades.filter(
                    t => t.csiDivision === div
                  );
                  return (
                    <div
                      key={div}
                      className="bg-navy-medium/30 border border-white/5 rounded-xl overflow-hidden"
                    >
                      <div className="px-4 py-3 bg-navy-medium/50 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-cream font-semibold text-sm">
                            Div {div} — {CSI_DIV_NAMES[div] || "Other"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] border-white/20 text-cream-muted"
                          >
                            {divTrades.length} trades
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-cream-muted hover:text-amber-400 hover:bg-amber-500/10"
                          onClick={() => {
                            setAddCustomRole({ div });
                            setCustomTradeName("");
                            setCustomClassification("");
                            setCustomHourlyRate("");
                            setCustomRoleNotes("");
                          }}
                        >
                          <UserPlus className="w-3 h-3" />
                          Add Custom Role
                        </Button>
                      </div>
                      <div className="divide-y divide-white/5">
                        {divTrades.map(trade => {
                          const isExpanded = expandedTrades.has(
                            trade.tradeName
                          );
                          // Find the best representative rate
                          const journeymanRole = trade.roles.find(
                            r => r.roleKey === "journeyman"
                          );
                          let repLabel = "Journeyman";
                          let repBase = journeymanRole
                            ? getRate(trade.tradeName, "journeyman")
                            : 0;
                          if (!repBase) {
                            let bestRate = 0;
                            let bestRole = trade.roles[0];
                            for (const role of trade.roles) {
                              const r = getRate(trade.tradeName, role.roleKey);
                              if (r > bestRate) {
                                bestRate = r;
                                bestRole = role;
                              }
                            }
                            if (bestRole) {
                              repLabel = bestRole.roleLabel;
                              repBase = bestRate;
                            }
                          }
                          const repBurdened = getBurdenedRate(repBase);
                          return (
                            <div key={trade.tradeName}>
                              <button
                                onClick={() => toggleTrade(trade.tradeName)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/3 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-cream-muted" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-cream-muted" />
                                  )}
                                  <HardHat className="w-4 h-4 text-amber-400/60" />
                                  <span className="text-cream font-medium text-sm">
                                    {trade.tradeName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-cream-muted">
                                    {repLabel}:
                                  </span>
                                  <span className="text-cream font-mono">
                                    {formatCents(repBase)}/hr
                                  </span>
                                  <span className="text-cream-muted">→</span>
                                  <span className="text-emerald-400 font-mono font-semibold">
                                    {formatCents(repBurdened)}/hr burdened
                                  </span>
                                </div>
                              </button>
                              {isExpanded && (
                                <div className="bg-navy-deep/30 border-t border-white/5">
                                  <table className="w-full">
                                    <thead>
                                      <tr className="text-[11px] text-cream-muted uppercase tracking-wider">
                                        <th className="text-left px-4 py-2 pl-14">
                                          Classification
                                        </th>
                                        <th className="text-right px-4 py-2">
                                          Base Wage
                                        </th>
                                        <th className="text-right px-4 py-2">
                                          Burden
                                        </th>
                                        <th className="text-right px-4 py-2">
                                          Burdened Rate
                                        </th>
                                        <th className="text-right px-4 py-2 w-16"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/3">
                                      {trade.roles.map(role => {
                                        const cls = role.roleKey;
                                        const base = getRate(
                                          trade.tradeName,
                                          cls
                                        );
                                        const burdened = getBurdenedRate(base);
                                        const burdenAmount =
                                          burdened -
                                          Math.round(base * regionMultiplier);
                                        const isEditing =
                                          editingRate?.tradeName ===
                                            trade.tradeName &&
                                          editingRate?.classification === cls;
                                        return (
                                          <tr
                                            key={cls}
                                            className="hover:bg-white/3 transition-colors"
                                          >
                                            <td className="px-4 py-2.5 pl-14 text-sm text-cream">
                                              {role.roleLabel}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                              {isEditing ? (
                                                <div className="flex items-center justify-end gap-1">
                                                  <span className="text-cream-muted text-xs">
                                                    $
                                                  </span>
                                                  <Input
                                                    value={editValue}
                                                    onChange={e =>
                                                      setEditValue(
                                                        e.target.value
                                                      )
                                                    }
                                                    className="w-20 h-7 text-right text-sm bg-navy-deep border-white/20 text-cream"
                                                    autoFocus
                                                    onKeyDown={e => {
                                                      if (e.key === "Enter") {
                                                        const cents =
                                                          parseDollarsToCents(
                                                            editValue
                                                          );
                                                        if (cents > 0)
                                                          updateRateMutation.mutate(
                                                            {
                                                              tradeName:
                                                                trade.tradeName,
                                                              classification:
                                                                cls,
                                                              laborType,
                                                              baseWageCents:
                                                                cents,
                                                              csiDivision:
                                                                trade.csiDivision,
                                                            }
                                                          );
                                                      }
                                                      if (e.key === "Escape")
                                                        setEditingRate(null);
                                                    }}
                                                  />
                                                  <span className="text-cream-muted text-xs">
                                                    /hr
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-cream font-mono text-sm">
                                                  {formatCents(base)}/hr
                                                </span>
                                              )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right text-cream-muted font-mono text-xs">
                                              +{formatCents(burdenAmount)}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                              <span className="text-emerald-400 font-mono font-semibold text-sm">
                                                {formatCents(burdened)}/hr
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                              {isEditing ? (
                                                <div className="flex items-center justify-end gap-1">
                                                  <button
                                                    onClick={() => {
                                                      const cents =
                                                        parseDollarsToCents(
                                                          editValue
                                                        );
                                                      if (cents > 0)
                                                        updateRateMutation.mutate(
                                                          {
                                                            tradeName:
                                                              trade.tradeName,
                                                            classification: cls,
                                                            laborType,
                                                            baseWageCents:
                                                              cents,
                                                            csiDivision:
                                                              trade.csiDivision,
                                                          }
                                                        );
                                                    }}
                                                    className="p-1 hover:bg-emerald-500/20 rounded"
                                                  >
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                  </button>
                                                  <button
                                                    onClick={() =>
                                                      setEditingRate(null)
                                                    }
                                                    className="p-1 hover:bg-red-500/20 rounded"
                                                  >
                                                    <X className="w-3.5 h-3.5 text-red-400" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    setEditingRate({
                                                      tradeName:
                                                        trade.tradeName,
                                                      classification: cls,
                                                    });
                                                    setEditValue(
                                                      (base / 100).toFixed(2)
                                                    );
                                                  }}
                                                  className="p-1 hover:bg-white/10 rounded opacity-50 hover:opacity-100 transition-opacity"
                                                >
                                                  <Pencil className="w-3.5 h-3.5 text-cream-muted" />
                                                </button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Custom roles for this division from DB */}
                        {(() => {
                          const customRoles = (
                            (tradeRatesQuery.data as any[]) || []
                          ).filter(
                            (r: any) =>
                              r.csiDivision === div &&
                              !TRADES.some(t => t.tradeName === r.tradeName)
                          );
                          if (!customRoles.length) return null;
                          return (
                            <div className="border-t border-amber-500/10">
                              <div className="px-4 py-2 bg-amber-500/5">
                                <span className="text-[10px] text-amber-400/70 uppercase tracking-wider font-semibold">
                                  Custom Roles
                                </span>
                              </div>
                              <table className="w-full">
                                <tbody className="divide-y divide-white/3">
                                  {customRoles.map((r: any) => {
                                    const base = r.baseWageCents || 0;
                                    const burdened = getBurdenedRate(base);
                                    const burdenAmount = burdened - base;
                                    const isEditing =
                                      editingRate?.tradeName === r.tradeName &&
                                      editingRate?.classification ===
                                        r.classification;
                                    return (
                                      <tr
                                        key={`${r.tradeName}::${r.classification}`}
                                        className="hover:bg-white/3 transition-colors"
                                      >
                                        <td className="px-4 py-2.5 pl-8 text-sm">
                                          <div className="flex items-center gap-2">
                                            <UserPlus className="w-3 h-3 text-amber-400/60" />
                                            <span className="text-cream">
                                              {r.tradeName}
                                            </span>
                                            <span className="text-cream-muted text-xs">
                                              ·{" "}
                                              {r.classification.replace(
                                                /_/g,
                                                " "
                                              )}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {isEditing ? (
                                            <div className="flex items-center justify-end gap-1">
                                              <span className="text-cream-muted text-xs">
                                                $
                                              </span>
                                              <Input
                                                value={editValue}
                                                onChange={e =>
                                                  setEditValue(e.target.value)
                                                }
                                                className="w-20 h-7 text-right text-sm bg-navy-deep border-white/20 text-cream"
                                                autoFocus
                                                onKeyDown={e => {
                                                  if (e.key === "Enter") {
                                                    const cents =
                                                      parseDollarsToCents(
                                                        editValue
                                                      );
                                                    if (cents > 0)
                                                      updateRateMutation.mutate(
                                                        {
                                                          tradeName:
                                                            r.tradeName,
                                                          classification:
                                                            r.classification,
                                                          laborType,
                                                          baseWageCents: cents,
                                                          csiDivision: div,
                                                        }
                                                      );
                                                  }
                                                  if (e.key === "Escape")
                                                    setEditingRate(null);
                                                }}
                                              />
                                              <span className="text-cream-muted text-xs">
                                                /hr
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-cream font-mono text-sm">
                                              {formatCents(base)}/hr
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-cream-muted font-mono text-xs">
                                          +{formatCents(burdenAmount)}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          <span className="text-emerald-400 font-mono font-semibold text-sm">
                                            {formatCents(burdened)}/hr
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {isEditing ? (
                                            <div className="flex items-center justify-end gap-1">
                                              <button
                                                onClick={() => {
                                                  const cents =
                                                    parseDollarsToCents(
                                                      editValue
                                                    );
                                                  if (cents > 0)
                                                    updateRateMutation.mutate({
                                                      tradeName: r.tradeName,
                                                      classification:
                                                        r.classification,
                                                      laborType,
                                                      baseWageCents: cents,
                                                      csiDivision: div,
                                                    });
                                                }}
                                                className="p-1 hover:bg-emerald-500/20 rounded"
                                              >
                                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                              </button>
                                              <button
                                                onClick={() =>
                                                  setEditingRate(null)
                                                }
                                                className="p-1 hover:bg-red-500/20 rounded"
                                              >
                                                <X className="w-3.5 h-3.5 text-red-400" />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                setEditingRate({
                                                  tradeName: r.tradeName,
                                                  classification:
                                                    r.classification,
                                                });
                                                setEditValue(
                                                  (base / 100).toFixed(2)
                                                );
                                              }}
                                              className="p-1 hover:bg-white/10 rounded opacity-50 hover:opacity-100 transition-opacity"
                                            >
                                              <Pencil className="w-3.5 h-3.5 text-cream-muted" />
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Custom Role Modal */}
      {addCustomRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">
                  Add Custom Role
                </h3>
              </div>
              <button
                onClick={() => setAddCustomRole(null)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-cream-muted">
                Add a specialist or custom trade to{" "}
                <span className="text-amber-400 font-medium">
                  Div {addCustomRole.div} —{" "}
                  {CSI_DIV_NAMES[addCustomRole.div] || "Other"}
                </span>
                . This role will appear in your rate library and can be added to
                crews.
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-cream-muted uppercase tracking-wider font-semibold block mb-1.5">
                    Trade / Specialty Name{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Specialty Welder, Crane Operator, Tile Setter"
                    value={customTradeName}
                    onChange={e => setCustomTradeName(e.target.value)}
                    className="bg-navy-deep border-white/20 text-cream placeholder:text-cream-muted/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-cream-muted uppercase tracking-wider font-semibold block mb-1.5">
                    Classification / Role{" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Journeyman, Foreman, Apprentice, Specialist"
                    value={customClassification}
                    onChange={e => setCustomClassification(e.target.value)}
                    className="bg-navy-deep border-white/20 text-cream placeholder:text-cream-muted/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-cream-muted uppercase tracking-wider font-semibold block mb-1.5">
                    Base Hourly Rate ($/hr){" "}
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted text-sm">
                      $
                    </span>
                    <Input
                      placeholder="0.00"
                      value={customHourlyRate}
                      onChange={e => setCustomHourlyRate(e.target.value)}
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7 bg-navy-deep border-white/20 text-cream placeholder:text-cream-muted/50"
                    />
                  </div>
                  {customHourlyRate && parseFloat(customHourlyRate) > 0 && (
                    <p className="text-xs text-emerald-400/70 mt-1">
                      Burdened rate ≈{" "}
                      {formatCents(
                        getBurdenedRate(parseDollarsToCents(customHourlyRate))
                      )}
                      /hr
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-cream-muted uppercase tracking-wider font-semibold block mb-1.5">
                    Notes (optional)
                  </label>
                  <Input
                    placeholder="e.g. Prevailing wage, certified welder, night shift premium"
                    value={customRoleNotes}
                    onChange={e => setCustomRoleNotes(e.target.value)}
                    className="bg-navy-deep border-white/20 text-cream placeholder:text-cream-muted/50"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setAddCustomRole(null)}
                className="border-white/20 text-cream"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveCustomRole}
                disabled={
                  saveCustomRoleMutation.isPending ||
                  !customTradeName.trim() ||
                  !customClassification.trim() ||
                  !customHourlyRate.trim()
                }
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white gap-2"
              >
                {saveCustomRoleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Save Custom Role
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rate Setup Wizard Modal */}
      <RateSetupWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
        isApplying={configureMutation.isPending}
        existingConfig={rateConfig}
      />
    </div>
  );
}

// ─── Burden Configuration Panel ───────────────────────────────────────────────
function BurdenPanel({
  laborType,
  burden,
  onSave,
  saving,
  onClose,
}: {
  laborType: LaborType;
  burden: BurdenDefaults;
  onSave: (data: BurdenDefaults) => void;
  saving: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    ficaPct: (burden.ficaPct / 100).toFixed(2),
    futaPct: (burden.futaPct / 100).toFixed(2),
    sutaPct: (burden.sutaPct / 100).toFixed(2),
    workersCompPct: (burden.workersCompPct / 100).toFixed(2),
    generalLiabilityPct: (burden.generalLiabilityPct / 100).toFixed(2),
    healthInsuranceCentsPerHr: (burden.healthInsuranceCentsPerHr / 100).toFixed(
      2
    ),
    pensionPct: (burden.pensionPct / 100).toFixed(2),
    vacationPct: (burden.vacationPct / 100).toFixed(2),
    trainingPct: (burden.trainingPct / 100).toFixed(2),
    unionFringeCentsPerHr: (burden.unionFringeCentsPerHr / 100).toFixed(2),
    otherCentsPerHr: (burden.otherCentsPerHr / 100).toFixed(2),
  });

  const handleSave = () => {
    onSave({
      ficaPct: parsePctToBasisPoints(form.ficaPct),
      futaPct: parsePctToBasisPoints(form.futaPct),
      sutaPct: parsePctToBasisPoints(form.sutaPct),
      workersCompPct: parsePctToBasisPoints(form.workersCompPct),
      generalLiabilityPct: parsePctToBasisPoints(form.generalLiabilityPct),
      healthInsuranceCentsPerHr: parseDollarsToCents(
        form.healthInsuranceCentsPerHr
      ),
      pensionPct: parsePctToBasisPoints(form.pensionPct),
      vacationPct: parsePctToBasisPoints(form.vacationPct),
      trainingPct: parsePctToBasisPoints(form.trainingPct),
      unionFringeCentsPerHr: parseDollarsToCents(form.unionFringeCentsPerHr),
      otherCentsPerHr: parseDollarsToCents(form.otherCentsPerHr),
    });
  };

  const pctField = (label: string, key: keyof typeof form, hint: string) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <div>
        <span className="text-sm text-cream">{label}</span>
        <span className="text-[10px] text-cream-muted ml-2">{hint}</span>
      </div>
      <div className="flex items-center gap-1">
        <Input
          value={form[key]}
          onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          className="w-20 h-7 text-right text-sm bg-navy-deep border-white/10 text-cream"
        />
        <span className="text-cream-muted text-xs w-4">%</span>
      </div>
    </div>
  );

  const dollarField = (label: string, key: keyof typeof form, hint: string) => (
    <div className="flex items-center justify-between py-2 border-b border-white/5">
      <div>
        <span className="text-sm text-cream">{label}</span>
        <span className="text-[10px] text-cream-muted ml-2">{hint}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-cream-muted text-xs">$</span>
        <Input
          value={form[key]}
          onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          className="w-20 h-7 text-right text-sm bg-navy-deep border-white/10 text-cream"
        />
        <span className="text-cream-muted text-xs w-4">/hr</span>
      </div>
    </div>
  );

  const exampleBase = 3000;
  const exampleBurdened = calculateBurdenedRate(exampleBase, {
    ficaPct: parsePctToBasisPoints(form.ficaPct),
    futaPct: parsePctToBasisPoints(form.futaPct),
    sutaPct: parsePctToBasisPoints(form.sutaPct),
    workersCompPct: parsePctToBasisPoints(form.workersCompPct),
    generalLiabilityPct: parsePctToBasisPoints(form.generalLiabilityPct),
    healthInsuranceCentsPerHr: parseDollarsToCents(
      form.healthInsuranceCentsPerHr
    ),
    pensionPct: parsePctToBasisPoints(form.pensionPct),
    vacationPct: parsePctToBasisPoints(form.vacationPct),
    trainingPct: parsePctToBasisPoints(form.trainingPct),
    unionFringeCentsPerHr: parseDollarsToCents(form.unionFringeCentsPerHr),
    otherCentsPerHr: parseDollarsToCents(form.otherCentsPerHr),
  });

  return (
    <div className="bg-navy-medium/50 border border-amber-500/20 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <h3 className="text-cream font-semibold text-sm">
            Burden Configuration — {LABOR_TYPE_LABELS[laborType]}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-cream-muted">
            Example: $30.00/hr base →{" "}
            <span className="text-emerald-400 font-semibold">
              {formatCents(exampleBurdened)}/hr burdened
            </span>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 gap-1.5"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save
          </Button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <X className="w-4 h-4 text-cream-muted" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <div>
          <h4 className="text-xs text-cream-muted uppercase tracking-wider mb-2 font-semibold">
            Percentage-Based (% of base wage)
          </h4>
          {pctField("FICA", "ficaPct", "Social Security + Medicare")}
          {pctField("FUTA", "futaPct", "Federal Unemployment")}
          {pctField("SUTA", "sutaPct", "State Unemployment")}
          {pctField(
            "Workers Comp",
            "workersCompPct",
            "Varies by trade & state"
          )}
          {pctField("General Liability", "generalLiabilityPct", "GL Insurance")}
          {pctField("Pension / 401k", "pensionPct", "Retirement contribution")}
          {pctField("Vacation / Holiday", "vacationPct", "Paid time off")}
          {pctField(
            "Training Fund",
            "trainingPct",
            "Apprenticeship / training"
          )}
        </div>
        <div>
          <h4 className="text-xs text-cream-muted uppercase tracking-wider mb-2 font-semibold">
            Fixed Dollar ($/hr per employee)
          </h4>
          {dollarField(
            "Health Insurance",
            "healthInsuranceCentsPerHr",
            "Medical/dental/vision"
          )}
          {dollarField(
            "Union Fringe",
            "unionFringeCentsPerHr",
            "Union dues & benefits"
          )}
          {dollarField("Other", "otherCentsPerHr", "Any additional burden")}
        </div>
      </div>
    </div>
  );
}

// ─── Rate Profiles Panel ──────────────────────────────────────────────────────

interface RateProfilesPanelProps {
  laborType: string;
  currentRates: any[];
  currentCrews: any[];
}

function RateProfilesPanel({
  laborType,
  currentRates,
  currentCrews,
}: RateProfilesPanelProps) {
  const utils = trpc.useUtils();
  const profilesQuery = trpc.tradeRates.listRateProfiles.useQuery();
  const createMutation = trpc.tradeRates.createRateProfile.useMutation({
    onSuccess: () => {
      toast.success("Rate profile saved");
      utils.tradeRates.listRateProfiles.invalidate();
      setShowSaveDialog(false);
      setNewProfileName("");
      setNewProfileDesc("");
    },
    onError: () => toast.error("Failed to save profile"),
  });
  const deleteMutation = trpc.tradeRates.deleteRateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile deleted");
      utils.tradeRates.listRateProfiles.invalidate();
    },
    onError: () => toast.error("Failed to delete profile"),
  });

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileDesc, setNewProfileDesc] = useState("");

  const rateConfig = loadRateConfig();

  const LABOR_TYPE_DISPLAY_MAP: Record<string, string> = {
    com_open: "Commercial · Open Shop",
    com_union: "Commercial · Union",
    res_open: "Residential · Open Shop",
    res_union: "Residential · Union",
  };

  function handleSaveCurrentAsProfile() {
    if (!newProfileName.trim()) {
      toast.error("Please enter a profile name");
      return;
    }
    // Derive projectType from laborType
    const lt = rateConfig?.laborType ?? laborType;
    const projectType = lt?.startsWith("res") ? "residential" : "commercial";
    const workType = lt?.includes("union") ? "union" : "open_shop";
    createMutation.mutate({
      name: newProfileName.trim(),
      projectType,
      workType,
      region: rateConfig?.regionName ?? rateConfig?.regionCode ?? undefined,
      ratesSnapshot: JSON.stringify(currentRates),
      crewsSnapshot: JSON.stringify(currentCrews),
      description: newProfileDesc.trim() || undefined,
    });
  }

  const profiles = profilesQuery.data ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#e4d7bf] bg-[#fffdf8] p-4 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a6510]">
            Saved configurations
          </p>
          <h3 className="mt-1 text-base font-semibold text-[#171714]">
            Rate Profiles
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-[#716855]">
            Save named setups for real bid conditions: commercial union, public
            works, residential open shop, specialty regions, or client-specific
            burden assumptions.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="gap-1.5 border border-[#171714] bg-[#171714] text-xs font-semibold text-white hover:bg-black"
        >
          <Save className="w-3.5 h-3.5" />
          Save Current as Profile
        </Button>
      </div>

      {/* Current Config Summary */}
      {rateConfig && (
        <div className="rounded-xl border border-[#e4d7bf] bg-white p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#716855]">
            Current Basis Configuration
          </p>
          <div className="flex flex-wrap gap-2">
            {rateConfig.laborType && (
              <Badge className="border-[#8db4f8] bg-[#eff6ff] text-xs text-[#244c91]">
                {LABOR_TYPE_DISPLAY_MAP[rateConfig.laborType] ??
                  rateConfig.laborType}
              </Badge>
            )}
            {rateConfig.regionName && (
              <Badge className="border-[#9bd8b9] bg-[#e8f7ef] text-xs text-[#24724f]">
                {rateConfig.regionName}
              </Badge>
            )}
            {rateConfig.specialty && (
              <Badge className="border-[#d7b44d] bg-[#fff4cb] text-xs text-[#8a6510]">
                {rateConfig.specialty}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Profiles List */}
      {profilesQuery.isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#d7c7aa] bg-white/70 py-12 text-center">
          <Bookmark className="mx-auto mb-3 h-8 w-8 text-[#8a6510] opacity-60" />
          <p className="text-sm font-medium text-[#171714]">
            No rate profiles saved yet.
          </p>
          <p className="mt-1 text-xs text-[#716855]">
            Save your current configuration as a named profile — e.g.,
            "Commercial Union NYC" or "Residential Open Shop FL".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profiles.map(profile => (
            <div
              key={profile.id}
              className="flex flex-col gap-3 rounded-xl border border-[#e4d7bf] bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-[#171714]">
                    {profile.name}
                  </p>
                  {profile.description && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-[#716855]">
                      {profile.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete profile "${profile.name}"?`)) {
                      deleteMutation.mutate({ id: profile.id });
                    }
                  }}
                  className="mt-0.5 shrink-0 text-red-700/70 transition-colors hover:text-red-700"
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {profile.projectType && (
                  <Badge className="border-[#8db4f8] bg-[#eff6ff] text-xs text-[#244c91]">
                    {profile.projectType.charAt(0).toUpperCase() +
                      profile.projectType.slice(1)}
                  </Badge>
                )}
                {profile.workType && (
                  <Badge className="border-[#c7b4ff] bg-[#f2ecff] text-xs text-[#5d3fb0]">
                    {profile.workType === "open_shop"
                      ? "Open Shop"
                      : profile.workType.charAt(0).toUpperCase() +
                        profile.workType.slice(1)}
                  </Badge>
                )}
                {profile.region && (
                  <Badge className="border-[#9bd8b9] bg-[#e8f7ef] text-xs text-[#24724f]">
                    {profile.region
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#8a806d]">
                Saved {new Date(profile.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#d7c7aa] bg-[#fffdf8] p-6 shadow-2xl">
            <h3 className="mb-1 text-base font-semibold text-[#171714]">
              Save Rate Profile
            </h3>
            <p className="mb-4 text-xs text-[#716855]">
              Snapshot the current setup so it can be reused on future bids.
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#5f5545]">
                  Profile Name *
                </label>
                <Input
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  placeholder="e.g. Commercial Union — New York City"
                  className="border-[#d7c7aa] bg-white text-sm text-[#171714]"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#5f5545]">
                  Notes (optional)
                </label>
                <Input
                  value={newProfileDesc}
                  onChange={e => setNewProfileDesc(e.target.value)}
                  placeholder="e.g. For NYC commercial bids, prevailing wage"
                  className="border-[#d7c7aa] bg-white text-sm text-[#171714]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 border-[#cdbb9b] bg-white text-[#4f4638] hover:bg-[#fff4d2]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCurrentAsProfile}
                disabled={createMutation.isPending || !newProfileName.trim()}
                className="flex-1 border border-[#171714] bg-[#171714] text-white hover:bg-black disabled:border-[#d7c7aa] disabled:bg-[#e9dfcf] disabled:text-[#8a806d]"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Profile
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
