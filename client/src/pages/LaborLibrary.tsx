/**
 * LaborLibrary (Trade Rate Library) — Manage trade rates, burden configuration,
 * and crew definitions for ConstructLine estimating.
 *
 * Structure: Trades × Classifications × Labor Types × Regional Factors
 * Burden: User enters actual burden rates → system calculates fully burdened rate
 */
import { useState, useMemo } from "react";
import { useMember } from "@/hooks/useMember";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft, MapPin, ChevronDown, ChevronRight, Search, X,
  Loader2, Settings2, Plus, Download, RefreshCw,
  Pencil, Check, Info, HardHat, Users,
} from "lucide-react";
import CrewBuilder from "@/components/CrewBuilder";
import { COST_REGION_GROUPS, type CostRegionGroup } from "../../../shared/costRegions";
import {
  TRADES, getBaseWage,
  LABOR_TYPE_LABELS, DEFAULT_BURDENS, calculateBurdenedRate,
  type LaborType, type BurdenDefaults,
} from "../../../shared/tradeRates";

// ─── Constants ────────────────────────────────────────────────────────────────
const LABOR_TYPES: LaborType[] = ["res_open", "res_union", "com_open", "com_union"];
const LABOR_TYPE_SHORT: Record<LaborType, string> = {
  res_open: "Res Open",
  res_union: "Res Union",
  com_open: "Com Open",
  com_union: "Com Union",
};

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

// ─── Component ────────────────────────────────────────────────────────────────
export default function LaborLibrary() {
  const { member } = useMember();
  const betaUser = false; // non-members handled by route guard
  const [, setLocation] = useLocation();

  const [laborType, setLaborType] = useState<LaborType>("com_open");
  const [activeView, setActiveView] = useState<"rates" | "crews">("rates");
  const [search, setSearch] = useState("");
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());
  const [showBurdenPanel, setShowBurdenPanel] = useState(false);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{ code: string; name: string; multiplier: number } | null>(null);
  const [editingRate, setEditingRate] = useState<{ tradeName: string; classification: string } | null>(null);
  const [editValue, setEditValue] = useState("");

  const tradeRatesQuery = trpc.tradeRates.getTradeRates.useQuery({ laborType });
  const burdenQuery = trpc.tradeRates.getBurdenForType.useQuery({ laborType });
  const utils = trpc.useUtils();

  const seedMutation = trpc.tradeRates.seedFromBaseline.useMutation({
    onSuccess: (data) => {
      toast.success(`Loaded ${data.count} baseline rates`);
      utils.tradeRates.getTradeRates.invalidate();
    },
    onError: () => toast.error("Failed to load baseline rates"),
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

  if (!member && !betaUser) {
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

  const regionMultiplier = selectedRegion ? selectedRegion.multiplier / 10000 : 1;

  const userRates = tradeRatesQuery.data || [];
  const userRateMap = new Map<string, number>();
  for (const r of userRates) {
    userRateMap.set(`${r.tradeName}|${r.classification}`, r.baseWageCents);
  }
  const hasUserRates = userRates.length > 0;

  const filteredTrades = useMemo(() => {
    if (!search.trim()) return TRADES;
    const q = search.toLowerCase();
    return TRADES.filter(t => t.tradeName.toLowerCase().includes(q));
  }, [search]);

  const filteredDivisions = useMemo(() => {
    const divs = new Set(filteredTrades.map(t => t.csiDivision));
    return Array.from(divs).sort();
  }, [filteredTrades]);

  const toggleTrade = (tradeName: string) => {
    setExpandedTrades(prev => {
      const next = new Set(prev);
      if (next.has(tradeName)) next.delete(tradeName);
      else next.add(tradeName);
      return next;
    });
  };

  const getRate = (tradeName: string, cls: string): number => {
    const userRate = userRateMap.get(`${tradeName}|${cls}`);
    if (userRate !== undefined) return userRate;
    return getBaseWage(tradeName, cls, laborType) ?? 0;
  };

  const getBurdenedRate = (baseWageCents: number): number => {
    return Math.round(calculateBurdenedRate(baseWageCents, burden) * regionMultiplier);
  };

  const totalBurdenPct = burden.ficaPct + burden.futaPct + burden.sutaPct +
    burden.workersCompPct + burden.generalLiabilityPct + burden.pensionPct +
    burden.vacationPct + burden.trainingPct;
  const fixedBurdenCents = burden.healthInsuranceCentsPerHr + burden.unionFringeCentsPerHr + burden.otherCentsPerHr;

  return (
    <div className="min-h-screen bg-navy-deep">
      {/* Header Bar */}
      <div className="bg-navy-medium/80 border-b border-white/10 px-3 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/portal")} className="text-cream-muted hover:text-cream">
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
            {!hasUserRates && (
              <Button
                onClick={() => seedMutation.mutate({ laborType })}
                disabled={seedMutation.isPending}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-semibold shadow-lg gap-2">
                {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Load Baseline Rates
              </Button>
            )}
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

      {/* Labor Type Toggle + Region Selector */}
      <div className="bg-navy-deep/80 border-b border-white/5 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-navy-medium/50 rounded-lg p-1">
            {LABOR_TYPES.map(lt => (
              <button key={lt}
                onClick={() => setLaborType(lt)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  laborType === lt ? "bg-amber-500/20 text-amber-300 shadow-sm" : "text-cream-muted hover:text-cream hover:bg-white/5"
                }`}>
                {LABOR_TYPE_SHORT[lt]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-navy-medium/50 rounded-lg p-1 mr-4">
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
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRegionModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-medium/50 border border-white/10 hover:border-white/20 transition-all text-sm">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-cream">{selectedRegion ? selectedRegion.name : "National Average"}</span>
              {selectedRegion && <Badge variant="outline" className="text-[10px] border-blue-400/30 text-blue-300">{(selectedRegion.multiplier / 10000).toFixed(2)}x</Badge>}
              <ChevronDown className="w-3 h-3 text-cream-muted" />
            </button>
            <div className="text-xs text-cream-muted">
              Burden: <span className="text-amber-300 font-medium">{formatPct(totalBurdenPct)}</span>
              {fixedBurdenCents > 0 && <> + <span className="text-amber-300 font-medium">{formatCents(fixedBurdenCents)}/hr</span></>}
            </div>
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
            <strong className="text-blue-300">How trade rates work:</strong> Enter your base wages (before burden) for each trade and classification.
            Configure your actual burden rates (FICA, WC, health, etc.) in the Burden Config panel.
            The system calculates the fully burdened rate automatically. These feed into your project estimates.
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
                      // Find the best representative rate: prefer journeyman, then first role with a nonzero rate, then first role
                      const journeymanRole = trade.roles.find(r => r.roleKey === "journeyman");
                      let repLabel = "Journeyman";
                      let repBase = journeymanRole ? getRate(trade.tradeName, "journeyman") : 0;
                      if (!repBase) {
                        // No journeyman or $0 — pick the highest-paid classification as representative
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
                                                className="w-20 h-7 text-right text-sm bg-navy-deep border-amber-500/30 text-cream" autoFocus
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

      {/* Region Selection Modal */}
      {showRegionModal && (
        <RegionModal
          selectedCode={selectedRegion?.code || null}
          onSelect={(region) => {
            if (region.code === "national") setSelectedRegion(null);
            else setSelectedRegion(region);
            setShowRegionModal(false);
          }}
          onClose={() => setShowRegionModal(false)}
        />
      )}
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

// ─── Region Selection Modal ───────────────────────────────────────────────────
function RegionModal({ selectedCode, onSelect, onClose }: {
  selectedCode: string | null;
  onSelect: (region: { code: string; name: string; multiplier: number }) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search.trim()) return COST_REGION_GROUPS;
    const q = search.toLowerCase();
    return COST_REGION_GROUPS
      .map((g: CostRegionGroup) => ({ ...g, metros: g.metros.filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) }))
      .filter(g => g.metros.length > 0);
  }, [search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-navy-medium border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-cream font-semibold flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" />Select Region</h3>
            <button onClick={onClose}><X className="w-4 h-4 text-cream-muted hover:text-cream" /></button>
          </div>
          <Input placeholder="Search cities..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/50" autoFocus />
        </div>
        <div className="overflow-y-auto max-h-[60vh] p-2">
          {filtered.map((group: CostRegionGroup) => (
            <div key={group.region} className="mb-2">
              <div className="text-[10px] text-cream-muted uppercase tracking-wider px-2 py-1 font-semibold">{group.region}</div>
              {group.metros.map(metro => (
                <button key={metro.code}
                  onClick={() => onSelect({ code: metro.code, name: metro.name, multiplier: metro.multiplier })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    selectedCode === metro.code ? "bg-blue-500/15 text-blue-300" : "text-cream hover:bg-white/5"
                  }`}>
                  <span>{metro.name}</span>
                  <span className="text-xs text-cream-muted font-mono">{metro.displayMultiplier}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
