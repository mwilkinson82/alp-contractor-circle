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
  ArrowLeft, ChevronDown, ChevronRight, Search, X,
  Loader2, Settings2, Download,
  Pencil, Check, Info, HardHat, Users, Sparkles,
} from "lucide-react";
import CrewBuilder from "@/components/CrewBuilder";
import {
  TRADES, getBaseWage,
  LABOR_TYPE_LABELS, DEFAULT_BURDENS, calculateBurdenedRate,
  type LaborType, type BurdenDefaults,
} from "../../../shared/tradeRates";
import RateSetupWizard, {
  loadRateConfig, saveRateConfig,
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
  "02": "Existing Conditions", "03": "Concrete", "04": "Masonry", "05": "Metals",
  "06": "Wood/Plastics/Composites", "07": "Thermal & Moisture", "08": "Openings",
  "09": "Finishes", "10": "Specialties", "21": "Fire Suppression", "22": "Plumbing",
  "23": "HVAC", "26": "Electrical", "27": "Communications", "31": "Earthwork",
  "32": "Exterior Improvements", "33": "Utilities",
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
  const urlTab = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null;
  const [activeView, setActiveView] = useState<"rates" | "crews">(urlTab === 'crews' ? 'crews' : 'rates');
  const [search, setSearch] = useState("");
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());
  const [showBurdenPanel, setShowBurdenPanel] = useState(false);
  const [editingRate, setEditingRate] = useState<{ tradeName: string; classification: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const tradeRatesQuery = trpc.tradeRates.getTradeRates.useQuery({ laborType });
  const burdenQuery = trpc.tradeRates.getBurdenForType.useQuery({ laborType });
  const utils = trpc.useUtils();

  const configureMutation = trpc.tradeRates.configureRates.useMutation({
    onSuccess: (data) => {
      toast.success(`Calibrated ${data.count} trade rates`);
      utils.tradeRates.getTradeRates.invalidate();
    },
    onError: () => toast.error("Failed to configure rates"),
  });

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

  const burden: BurdenDefaults = (burdenQuery.data && 'ficaPct' in burdenQuery.data)
    ? burdenQuery.data as unknown as BurdenDefaults
    : DEFAULT_BURDENS[laborType];

  const totalBurdenPct = burden.ficaPct + burden.futaPct + burden.sutaPct +
    burden.workersCompPct + burden.generalLiabilityPct +
    burden.pensionPct + burden.vacationPct + burden.trainingPct;
  const fixedBurdenCents = burden.healthInsuranceCentsPerHr +
    burden.unionFringeCentsPerHr + burden.otherCentsPerHr;

  // Build user rate map for quick lookups
  const userRateMap = useMemo(() => {
    const map = new Map<string, number>();
    if (tradeRatesQuery.data) {
      for (const r of tradeRatesQuery.data as any[]) {
        map.set(`${r.tradeName}::${r.classification}`, r.baseWageCents);
      }
    }
    return map;
  }, [tradeRatesQuery.data]);

  const hasUserRates = userRateMap.size > 0;

  const getRate = (tradeName: string, classification: string): number => {
    return userRateMap.get(`${tradeName}::${classification}`) || getBaseWage(tradeName, classification, laborType) || 0;
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
    return TRADES.filter(t =>
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
  const configLabel = rateConfig ? LABOR_TYPE_DISPLAY[rateConfig.laborType] : "Commercial · Open Shop";
  const regionLabel = rateConfig?.regionName || "National Average";
  const specialtyLabel = rateConfig?.specialty
    ? rateConfig.specialty.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/^Standard.*$/, "")
    : null;
  const combinedFactor = rateConfig
    ? ((rateConfig.regionMultiplier / 10000) * (rateConfig.specialtyMultiplier / 10000)).toFixed(2)
    : "1.00";

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Header Bar */}
      <div className="bg-navy-medium/80 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/portal/constructline")} className="text-cream-muted hover:text-cream">
              <ArrowLeft className="w-4 h-4 mr-1" />Back
            </Button>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-white leading-tight">Construct<span className="text-amber-400">Line</span></span>
              <span className="text-[8px] text-gray-500 tracking-wider uppercase leading-tight">Powered by ALP</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div>
              <h1 className="text-lg font-bold text-cream">Trade Rate Library</h1>
              <p className="text-cream-muted text-xs hidden sm:block">
                Base wages + your burden = fully burdened rates for estimating.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm"
              onClick={() => setShowBurdenPanel(!showBurdenPanel)}
              className={`gap-1.5 ${showBurdenPanel ? "border-amber-500/50 text-amber-300 bg-amber-500/10" : "border-white/20 text-cream hover:bg-white/5"}`}>
              <Settings2 className="w-3.5 h-3.5" />Burden Config
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => {
                const rows: string[] = ["Trade,Classification,Base Wage ($/hr),Burdened Rate ($/hr)"];
                for (const trade of TRADES) {
                  for (const role of trade.roles) {
                    const base = getRate(trade.tradeName, role.roleKey);
                    const burdened = getBurdenedRate(base);
                    rows.push(`"${trade.tradeName}",${role.roleLabel},${(base/100).toFixed(2)},${(burdened/100).toFixed(2)}`);
                  }
                }
                const blob = new Blob([rows.join("\n")], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a"); a.href = url; a.download = `trade-rates-${laborType}.csv`; a.click();
                URL.revokeObjectURL(url);
                toast.success("Exported trade rates");
              }}
              className="border-white/20 text-cream hover:bg-white/5 gap-1.5">
              <Download className="w-3.5 h-3.5" />Export
            </Button>
          </div>
        </div>
      </div>

      {/* Rate Configuration Summary Card */}
      <div className="bg-gradient-to-r from-amber-500/5 via-navy-deep to-amber-500/5 border-b border-amber-500/10 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Config badges */}
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-cream">Rate Configuration</span>
            </div>
            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 px-2.5 py-0.5 text-xs font-medium">
              {configLabel}
            </Badge>
            <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25 px-2.5 py-0.5 text-xs font-medium">
              {regionLabel}
            </Badge>
            {specialtyLabel && (
              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/25 px-2.5 py-0.5 text-xs font-medium">
                {specialtyLabel}
              </Badge>
            )}
            {combinedFactor !== "1.00" && (
              <span className="text-xs text-cream-muted">
                Combined: <span className="text-amber-400 font-bold">{combinedFactor}x</span>
              </span>
            )}
            <span className="text-xs text-cream-muted">
              Burden: <span className="text-amber-300 font-medium">{formatPct(totalBurdenPct)}</span>
              {fixedBurdenCents > 0 && <> + <span className="text-amber-300 font-medium">{formatCents(fixedBurdenCents)}/hr</span></>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-navy-medium/50 rounded-lg p-1 mr-2">
              <button onClick={() => setActiveView("rates")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "rates" ? "bg-white/10 text-cream shadow-sm" : "text-cream-muted hover:text-cream hover:bg-white/5"
                }`}>
                <HardHat className="w-3 h-3" />Trade Rates
              </button>
              <button onClick={() => setActiveView("crews")}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeView === "crews" ? "bg-white/10 text-cream shadow-sm" : "text-cream-muted hover:text-cream hover:bg-white/5"
                }`}>
                <Users className="w-3 h-3" />Crew Builder
              </button>
            </div>
            <Button
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/30 text-amber-300 hover:from-amber-500/30 hover:to-orange-600/30 gap-1.5 text-xs font-semibold"
              size="sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Reconfigure Rates
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* Burden Configuration Panel */}
        {showBurdenPanel && (
          <BurdenPanel
            laborType={laborType}
            burden={burden}
            onSave={(data) => saveBurdenMutation.mutate({ laborType, ...data })}
            saving={saveBurdenMutation.isPending}
            onClose={() => setShowBurdenPanel(false)}
          />
        )}

        {activeView === "crews" ? (
          <CrewBuilder
            laborType={laborType}
            burden={burden}
            regionMultiplier={regionMultiplier}
            userRateMap={userRateMap}
          />
        ) : (<div className="space-y-3">
        {/* Info Banner */}
        <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-200/80">
            <strong className="text-blue-300">How trade rates work:</strong> Your rates are calibrated based on your configuration above.
            You can edit any individual rate by clicking the pencil icon. Configure your burden rates (FICA, WC, health, etc.) in the Burden Config panel.
            The system calculates the fully burdened rate automatically.
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-muted" />
          <Input placeholder="Search trades..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-navy-medium/40 border-white/10 text-cream placeholder:text-cream-muted/50" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
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
              const divTrades = filteredTrades.filter(t => t.csiDivision === div);
              return (
                <div key={div} className="bg-navy-medium/30 border border-white/5 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-navy-medium/50 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-cream font-semibold text-sm">Div {div} — {CSI_DIV_NAMES[div] || "Other"}</span>
                      <Badge variant="outline" className="text-[10px] border-white/20 text-cream-muted">{divTrades.length} trades</Badge>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {divTrades.map(trade => {
                      const isExpanded = expandedTrades.has(trade.tradeName);
                      // Find the best representative rate
                      const journeymanRole = trade.roles.find(r => r.roleKey === "journeyman");
                      let repLabel = "Journeyman";
                      let repBase = journeymanRole ? getRate(trade.tradeName, "journeyman") : 0;
                      if (!repBase) {
                        let bestRate = 0;
                        let bestRole = trade.roles[0];
                        for (const role of trade.roles) {
                          const r = getRate(trade.tradeName, role.roleKey);
                          if (r > bestRate) { bestRate = r; bestRole = role; }
                        }
                        if (bestRole) {
                          repLabel = bestRole.roleLabel;
                          repBase = bestRate;
                        }
                      }
                      const repBurdened = getBurdenedRate(repBase);
                      return (
                        <div key={trade.tradeName}>
                          <button onClick={() => toggleTrade(trade.tradeName)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/3 transition-colors">
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown className="w-4 h-4 text-cream-muted" /> : <ChevronRight className="w-4 h-4 text-cream-muted" />}
                              <HardHat className="w-4 h-4 text-amber-400/60" />
                              <span className="text-cream font-medium text-sm">{trade.tradeName}</span>
                            </div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-cream-muted">{repLabel}:</span>
                              <span className="text-cream font-mono">{formatCents(repBase)}/hr</span>
                              <span className="text-cream-muted">→</span>
                              <span className="text-emerald-400 font-mono font-semibold">{formatCents(repBurdened)}/hr burdened</span>
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="bg-navy-deep/30 border-t border-white/5">
                              <table className="w-full">
                                <thead>
                                  <tr className="text-[11px] text-cream-muted uppercase tracking-wider">
                                    <th className="text-left px-4 py-2 pl-14">Classification</th>
                                    <th className="text-right px-4 py-2">Base Wage</th>
                                    <th className="text-right px-4 py-2">Burden</th>
                                    <th className="text-right px-4 py-2">Burdened Rate</th>
                                    <th className="text-right px-4 py-2 w-16"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/3">
                                  {trade.roles.map(role => {
                                    const cls = role.roleKey;
                                    const base = getRate(trade.tradeName, cls);
                                    const burdened = getBurdenedRate(base);
                                    const burdenAmount = burdened - Math.round(base * regionMultiplier);
                                    const isEditing = editingRate?.tradeName === trade.tradeName && editingRate?.classification === cls;
                                    return (
                                      <tr key={cls} className="hover:bg-white/3 transition-colors">
                                        <td className="px-4 py-2.5 pl-14 text-sm text-cream">{role.roleLabel}</td>
                                        <td className="px-4 py-2.5 text-right">
                                          {isEditing ? (
                                            <div className="flex items-center justify-end gap-1">
                                              <span className="text-cream-muted text-xs">$</span>
                                              <Input value={editValue} onChange={e => setEditValue(e.target.value)}
                                                className="w-20 h-7 text-right text-sm bg-navy-deep border-white/20 text-cream" autoFocus
                                                onKeyDown={e => {
                                                  if (e.key === "Enter") {
                                                    const cents = parseDollarsToCents(editValue);
                                                    if (cents > 0) updateRateMutation.mutate({ tradeName: trade.tradeName, classification: cls, laborType, baseWageCents: cents, csiDivision: trade.csiDivision });
                                                  }
                                                  if (e.key === "Escape") setEditingRate(null);
                                                }} />
                                              <span className="text-cream-muted text-xs">/hr</span>
                                            </div>
                                          ) : (
                                            <span className="text-cream font-mono text-sm">{formatCents(base)}/hr</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-cream-muted font-mono text-xs">+{formatCents(burdenAmount)}</td>
                                        <td className="px-4 py-2.5 text-right">
                                          <span className="text-emerald-400 font-mono font-semibold text-sm">{formatCents(burdened)}/hr</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                          {isEditing ? (
                                            <div className="flex items-center justify-end gap-1">
                                              <button onClick={() => {
                                                const cents = parseDollarsToCents(editValue);
                                                if (cents > 0) updateRateMutation.mutate({ tradeName: trade.tradeName, classification: cls, laborType, baseWageCents: cents, csiDivision: trade.csiDivision });
                                              }} className="p-1 hover:bg-emerald-500/20 rounded"><Check className="w-3.5 h-3.5 text-emerald-400" /></button>
                                              <button onClick={() => setEditingRate(null)} className="p-1 hover:bg-red-500/20 rounded"><X className="w-3.5 h-3.5 text-red-400" /></button>
                                            </div>
                                          ) : (
                                            <button onClick={() => { setEditingRate({ tradeName: trade.tradeName, classification: cls }); setEditValue((base / 100).toFixed(2)); }}
                                              className="p-1 hover:bg-white/10 rounded opacity-50 hover:opacity-100 transition-opacity">
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
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>)}
      </div>

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
function BurdenPanel({ laborType, burden, onSave, saving, onClose }: {
  laborType: LaborType; burden: BurdenDefaults; onSave: (data: BurdenDefaults) => void; saving: boolean; onClose: () => void;
}) {
  const [form, setForm] = useState({
    ficaPct: (burden.ficaPct / 100).toFixed(2),
    futaPct: (burden.futaPct / 100).toFixed(2),
    sutaPct: (burden.sutaPct / 100).toFixed(2),
    workersCompPct: (burden.workersCompPct / 100).toFixed(2),
    generalLiabilityPct: (burden.generalLiabilityPct / 100).toFixed(2),
    healthInsuranceCentsPerHr: (burden.healthInsuranceCentsPerHr / 100).toFixed(2),
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
      healthInsuranceCentsPerHr: parseDollarsToCents(form.healthInsuranceCentsPerHr),
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
        <Input value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          className="w-20 h-7 text-right text-sm bg-navy-deep border-white/10 text-cream" />
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
        <Input value={form[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
          className="w-20 h-7 text-right text-sm bg-navy-deep border-white/10 text-cream" />
        <span className="text-cream-muted text-xs w-4">/hr</span>
      </div>
    </div>
  );

  const exampleBase = 3000;
  const exampleBurdened = calculateBurdenedRate(exampleBase, {
    ficaPct: parsePctToBasisPoints(form.ficaPct), futaPct: parsePctToBasisPoints(form.futaPct),
    sutaPct: parsePctToBasisPoints(form.sutaPct), workersCompPct: parsePctToBasisPoints(form.workersCompPct),
    generalLiabilityPct: parsePctToBasisPoints(form.generalLiabilityPct),
    healthInsuranceCentsPerHr: parseDollarsToCents(form.healthInsuranceCentsPerHr),
    pensionPct: parsePctToBasisPoints(form.pensionPct), vacationPct: parsePctToBasisPoints(form.vacationPct),
    trainingPct: parsePctToBasisPoints(form.trainingPct),
    unionFringeCentsPerHr: parseDollarsToCents(form.unionFringeCentsPerHr),
    otherCentsPerHr: parseDollarsToCents(form.otherCentsPerHr),
  });

  return (
    <div className="bg-navy-medium/50 border border-amber-500/20 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-amber-400" />
          <h3 className="text-cream font-semibold text-sm">Burden Configuration — {LABOR_TYPE_LABELS[laborType]}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-cream-muted">
            Example: $30.00/hr base → <span className="text-emerald-400 font-semibold">{formatCents(exampleBurdened)}/hr burdened</span>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving}
            className="bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save
          </Button>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-cream-muted" /></button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        <div>
          <h4 className="text-xs text-cream-muted uppercase tracking-wider mb-2 font-semibold">Percentage-Based (% of base wage)</h4>
          {pctField("FICA", "ficaPct", "Social Security + Medicare")}
          {pctField("FUTA", "futaPct", "Federal Unemployment")}
          {pctField("SUTA", "sutaPct", "State Unemployment")}
          {pctField("Workers Comp", "workersCompPct", "Varies by trade & state")}
          {pctField("General Liability", "generalLiabilityPct", "GL Insurance")}
          {pctField("Pension / 401k", "pensionPct", "Retirement contribution")}
          {pctField("Vacation / Holiday", "vacationPct", "Paid time off")}
          {pctField("Training Fund", "trainingPct", "Apprenticeship / training")}
        </div>
        <div>
          <h4 className="text-xs text-cream-muted uppercase tracking-wider mb-2 font-semibold">Fixed Dollar ($/hr per employee)</h4>
          {dollarField("Health Insurance", "healthInsuranceCentsPerHr", "Medical/dental/vision")}
          {dollarField("Union Fringe", "unionFringeCentsPerHr", "Union dues & benefits")}
          {dollarField("Other", "otherCentsPerHr", "Any additional burden")}
        </div>
      </div>
    </div>
  );
}
