/**
 * CrewBuilder — Define crews from trade rates, auto-calculate blended hourly rate.
 * Users pick trades + classifications + count → system calculates crew cost/hr.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus, Trash2, Users, Loader2, Check, X, ChevronDown, ChevronRight,
  Pencil, DollarSign, HardHat, Save,
} from "lucide-react";
import {
  TRADES, getBaseWage,
  LABOR_TYPE_LABELS, DEFAULT_BURDENS, calculateBurdenedRate,
  type LaborType, type BurdenDefaults,
} from "../../../shared/tradeRates";

interface CrewMember {
  tradeName: string;
  classification: string;
  count: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface CrewBuilderProps {
  laborType: LaborType;
  burden: BurdenDefaults;
  regionMultiplier: number; // 1.0 = national
  /** Map of "tradeName|classification" → baseWageCents (user overrides) */
  userRateMap: Map<string, number>;
}

export default function CrewBuilder({ laborType, burden, regionMultiplier, userRateMap }: CrewBuilderProps) {
  const [expandedCrew, setExpandedCrew] = useState<number | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCrewName, setNewCrewName] = useState("");
  const [newCrewMembers, setNewCrewMembers] = useState<CrewMember[]>([
    { tradeName: TRADES[0]?.tradeName || "Laborer", classification: "journeyman", count: 1 },
  ]);
  const [newCrewNotes, setNewCrewNotes] = useState("");

  const crewsQuery = trpc.tradeRates.getCrews.useQuery();
  const utils = trpc.useUtils();

  const seedDefaultCrewsMutation = trpc.tradeRates.seedDefaultCrews.useMutation({
    onSuccess: (data) => {
      toast.success(`Loaded ${data.count} default crews`);
      utils.tradeRates.getCrews.invalidate();
    },
    onError: () => toast.error("Failed to load default crews"),
  });

  const createCrewMutation = trpc.tradeRates.createCrew.useMutation({
    onSuccess: () => {
      toast.success("Crew created");
      utils.tradeRates.getCrews.invalidate();
      setShowCreateForm(false);
      setNewCrewName("");
      setNewCrewMembers([{ tradeName: TRADES[0]?.tradeName || "Laborer", classification: "journeyman", count: 1 }]);
      setNewCrewNotes("");
    },
    onError: () => toast.error("Failed to create crew"),
  });

  const deleteCrewMutation = trpc.tradeRates.deleteCrew.useMutation({
    onSuccess: () => {
      toast.success("Crew deleted");
      utils.tradeRates.getCrews.invalidate();
    },
    onError: () => toast.error("Failed to delete crew"),
  });

  const getBaseRate = (tradeName: string, cls: string): number => {
    const userRate = userRateMap.get(`${tradeName}|${cls}`);
    if (userRate !== undefined) return userRate;
    const baseWage = getBaseWage(tradeName, cls, laborType);
    return baseWage ?? 0;
  };

  const getBurdenedRate = (baseWageCents: number): number => {
    return Math.round(calculateBurdenedRate(baseWageCents, burden) * regionMultiplier);
  };

  const calculateCrewCost = (members: CrewMember[]): { totalPerHr: number; headcount: number; blendedRate: number } => {
    let totalPerHr = 0;
    let headcount = 0;
    for (const m of members) {
      const base = getBaseRate(m.tradeName, m.classification);
      const burdened = getBurdenedRate(base);
      totalPerHr += burdened * m.count;
      headcount += m.count;
    }
    const blendedRate = headcount > 0 ? Math.round(totalPerHr / headcount) : 0;
    return { totalPerHr, headcount, blendedRate };
  };

  const crews = crewsQuery.data || [];

  const addMember = () => {
    setNewCrewMembers(prev => [...prev, { tradeName: allTradeOptions[0]?.tradeName || "Laborer", classification: allTradeOptions[0]?.roles[0]?.roleKey || "journeyman", count: 1 }]);
  };

  const removeMember = (idx: number) => {
    setNewCrewMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMember = (idx: number, field: keyof CrewMember, value: any) => {
    setNewCrewMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleCreate = () => {
    if (!newCrewName.trim()) { toast.error("Enter a crew name"); return; }
    if (newCrewMembers.length === 0) { toast.error("Add at least one crew member"); return; }
    createCrewMutation.mutate({
      crewName: newCrewName.trim(),
      laborType,
      crewMembers: JSON.stringify(newCrewMembers),
      notes: newCrewNotes.trim() || undefined,
    });
  };

  // Fetch user's custom trade rates to merge into dropdowns
  const tradeRatesQuery = trpc.tradeRates.getTradeRates.useQuery({ laborType });

  // Build merged trade/classification options: standard TRADES + custom DB roles
  const allTradeOptions = useMemo(() => {
    const standard = TRADES.map(t => ({ tradeName: t.tradeName, roles: t.roles.map(r => ({ roleKey: r.roleKey, roleLabel: r.roleLabel })) }));
    const customRates = (tradeRatesQuery.data as any[] || []).filter(
      (r: any) => !TRADES.some(t => t.tradeName === r.tradeName)
    );
    // Group custom rates by tradeName
    const customMap = new Map<string, { roleKey: string; roleLabel: string }[]>();
    for (const r of customRates) {
      const key = r.tradeName;
      if (!customMap.has(key)) customMap.set(key, []);
      customMap.get(key)!.push({ roleKey: r.classification, roleLabel: r.classification.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) });
    }
    const customEntries = Array.from(customMap.entries()).map(([tradeName, roles]) => ({ tradeName, roles, isCustom: true }));
    return [...standard, ...customEntries];
  }, [tradeRatesQuery.data]);

  const tradeNames = allTradeOptions.map(t => t.tradeName);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-400" />
          <h2 className="text-cream font-semibold text-lg">Crew Definitions</h2>
          <Badge variant="outline" className="text-[10px] border-white/20 text-cream-muted">{crews.length} crews</Badge>
        </div>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}
          className={showCreateForm ? "bg-white/10 text-cream" : "bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold gap-1.5"}>
          {showCreateForm ? <><X className="w-3.5 h-3.5" />Cancel</> : <><Plus className="w-3.5 h-3.5" />New Crew</>}
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-navy-medium/50 border border-amber-500/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Crew name (e.g., Concrete Crew A)"
              value={newCrewName}
              onChange={e => setNewCrewName(e.target.value)}
              className="bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/50 flex-1"
            />
            <Input
              placeholder="Notes (optional)"
              value={newCrewNotes}
              onChange={e => setNewCrewNotes(e.target.value)}
              className="bg-navy-deep border-white/10 text-cream placeholder:text-cream-muted/50 w-48"
            />
          </div>

          {/* Crew Members */}
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_80px_120px_120px_40px] gap-2 text-[11px] text-cream-muted uppercase tracking-wider px-1">
              <span>Trade</span><span>Classification</span><span>Count</span><span>Base/hr</span><span>Burdened/hr</span><span></span>
            </div>
            {newCrewMembers.map((m, idx) => {
              const base = getBaseRate(m.tradeName, m.classification);
              const burdened = getBurdenedRate(base);
              return (
                <div key={idx} className="grid grid-cols-[1fr_1fr_80px_120px_120px_40px] gap-2 items-center">
                  <select
                    value={m.tradeName}
                    onChange={e => updateMember(idx, "tradeName", e.target.value)}
                    className="h-8 rounded-md border border-white/10 bg-navy-deep text-cream text-sm px-2"
                  >
                    {tradeNames.map(tn => <option key={tn} value={tn}>{tn}</option>)}
                  </select>
                  <select
                    value={m.classification}
                    onChange={e => updateMember(idx, "classification", e.target.value)}
                    className="h-8 rounded-md border border-white/10 bg-navy-deep text-cream text-sm px-2"
                  >
                    {(() => {
                      const trade = allTradeOptions.find(t => t.tradeName === m.tradeName);
                      return (trade?.roles || []).map(r => <option key={r.roleKey} value={r.roleKey}>{r.roleLabel}</option>);
                    })()}
                  </select>
                  <Input
                    type="number" min={1} max={50}
                    value={m.count}
                    onChange={e => updateMember(idx, "count", Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-8 bg-navy-deep border-white/10 text-cream text-center text-sm"
                  />
                  <span className="text-cream font-mono text-sm text-center">{formatCents(base)}</span>
                  <span className="text-emerald-400 font-mono text-sm font-semibold text-center">{formatCents(burdened)}</span>
                  <button onClick={() => removeMember(idx)} className="p-1 hover:bg-red-500/20 rounded mx-auto">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              );
            })}
            <button onClick={addMember} className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 px-1 py-1">
              <Plus className="w-3 h-3" />Add crew member
            </button>
          </div>

          {/* Summary */}
          {newCrewMembers.length > 0 && (() => {
            const { totalPerHr, headcount, blendedRate } = calculateCrewCost(newCrewMembers);
            return (
              <div className="flex items-center justify-between bg-navy-deep/50 rounded-lg px-4 py-2 border border-white/5">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-cream-muted">Headcount: <span className="text-cream font-semibold">{headcount}</span></span>
                  <span className="text-cream-muted">Blended Rate: <span className="text-emerald-400 font-mono font-semibold">{formatCents(blendedRate)}/hr</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-cream-muted text-sm">Crew Cost:</span>
                  <span className="text-emerald-400 font-mono font-bold text-lg">{formatCents(totalPerHr)}/hr</span>
                </div>
              </div>
            );
          })()}

          <div className="flex justify-end">
            <Button onClick={handleCreate} disabled={createCrewMutation.isPending}
              className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold gap-1.5">
              {createCrewMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Crew
            </Button>
          </div>
        </div>
      )}

      {/* Existing Crews */}
      {crews.length === 0 && !showCreateForm ? (
        <div className="text-center py-12 text-cream-muted">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm mb-4">No crews defined yet. Load 30 pre-built crews for all CSI divisions, or create your own.</p>
          <Button
            onClick={() => seedDefaultCrewsMutation.mutate({ laborType })}
            disabled={seedDefaultCrewsMutation.isPending}
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold gap-2">
            {seedDefaultCrewsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <HardHat className="w-4 h-4" />}
            Load Default Crews (30 crews)
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {crews.map((crew: any) => {
            const members: CrewMember[] = JSON.parse(crew.crewMembers || "[]");
            const { totalPerHr, headcount, blendedRate } = calculateCrewCost(members);
            const isExpanded = expandedCrew === crew.id;

            return (
              <div key={crew.id} className="bg-navy-medium/30 border border-white/5 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCrew(isExpanded ? null : crew.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-cream-muted" /> : <ChevronRight className="w-4 h-4 text-cream-muted" />}
                    <Users className="w-4 h-4 text-amber-400/60" />
                    <span className="text-cream font-medium">{crew.crewName}</span>
                    <Badge variant="outline" className="text-[10px] border-white/20 text-cream-muted">{headcount} workers</Badge>
                    {crew.notes && <span className="text-cream-muted text-xs ml-2">{crew.notes}</span>}
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-cream-muted">Blended: <span className="text-cream font-mono">{formatCents(blendedRate)}/hr</span></span>
                    <span className="text-cream-muted">→</span>
                    <span className="text-emerald-400 font-mono font-bold">{formatCents(totalPerHr)}/hr crew</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="bg-navy-deep/30 border-t border-white/5 px-4 py-3">
                    <table className="w-full">
                      <thead>
                        <tr className="text-[11px] text-cream-muted uppercase tracking-wider">
                          <th className="text-left py-1.5 pl-2">Trade</th>
                          <th className="text-left py-1.5">Classification</th>
                          <th className="text-center py-1.5">Count</th>
                          <th className="text-right py-1.5">Base/hr</th>
                          <th className="text-right py-1.5">Burdened/hr</th>
                          <th className="text-right py-1.5 pr-2">Line Total/hr</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/3">
                        {members.map((m, idx) => {
                          const base = getBaseRate(m.tradeName, m.classification);
                          const burdened = getBurdenedRate(base);
                          return (
                            <tr key={idx} className="text-sm">
                              <td className="py-2 pl-2 text-cream">{m.tradeName}</td>
                              <td className="py-2 text-cream-muted">{(() => {
                                const trade = TRADES.find(t => t.tradeName === m.tradeName);
                                const role = trade?.roles.find(r => r.roleKey === m.classification);
                                return role?.roleLabel || m.classification;
                              })()}</td>
                              <td className="py-2 text-center text-cream">{m.count}</td>
                              <td className="py-2 text-right text-cream font-mono">{formatCents(base)}</td>
                              <td className="py-2 text-right text-cream font-mono">{formatCents(burdened)}</td>
                              <td className="py-2 text-right pr-2 text-emerald-400 font-mono font-semibold">{formatCents(burdened * m.count)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-white/10">
                          <td colSpan={2} className="py-2 pl-2 text-cream font-semibold text-sm">Total</td>
                          <td className="py-2 text-center text-cream font-semibold">{headcount}</td>
                          <td></td>
                          <td className="py-2 text-right text-cream-muted text-xs">Blended: {formatCents(blendedRate)}</td>
                          <td className="py-2 text-right pr-2 text-emerald-400 font-mono font-bold">{formatCents(totalPerHr)}/hr</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="flex justify-end mt-2">
                      <Button variant="ghost" size="sm"
                        onClick={() => { if (confirm(`Delete crew "${crew.crewName}"?`)) deleteCrewMutation.mutate({ id: crew.id }); }}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5 text-xs">
                        <Trash2 className="w-3 h-3" />Delete Crew
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
