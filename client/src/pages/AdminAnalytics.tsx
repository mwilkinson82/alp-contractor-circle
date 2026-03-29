/**
 * Admin Analytics Dashboard — Revenue metrics, member breakdown, growth.
 */
import { trpc } from "@/lib/trpc";
import {
  DollarSign,
  Users,
  TrendingUp,
  Crown,
  Gift,
  CreditCard,
  BarChart3,
  Calendar,
} from "lucide-react";

function MetricCard({
  icon: Icon,
  label,
  value,
  subtext,
  color = "ember",
}: {
  icon: any;
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    ember: { bg: "bg-ember/10", text: "text-ember", border: "border-ember/20" },
    green: { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  };
  const c = colorMap[color] || colorMap.ember;

  return (
    <div className={`glass-card rounded-2xl p-4 sm:p-6 border ${c.border}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
        <span className="text-cream-muted text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-heading text-2xl sm:text-3xl font-bold text-cream">{value}</p>
      {subtext && <p className="text-cream-muted text-xs mt-1">{subtext}</p>}
    </div>
  );
}

export default function AdminAnalytics() {
  const { data, isLoading } = trpc.member.adminAnalytics.useQuery();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full border-2 border-ember border-t-transparent animate-spin" />
          <span className="text-cream-muted text-sm">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-cream-muted">Failed to load analytics data.</p>
      </div>
    );
  }

  const { paying, comped, total, mrr, totalCollected, members } = data;
  const payingMembers = members?.filter((m) => m.type === "paying") || [];
  const compedMembers = members?.filter((m) => m.type === "comped") || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-ember" />
          Analytics
        </h1>
        <p className="text-cream-muted mt-1">
          Revenue metrics, member breakdown, and growth overview.
        </p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Monthly Revenue"
          value={`$${mrr.toLocaleString()}`}
          subtext={`${paying} paying members × $497/mo`}
          color="green"
        />
        <MetricCard
          icon={Users}
          label="Total Members"
          value={total.toString()}
          subtext={`${paying} paying · ${comped} comped`}
          color="blue"
        />
        <MetricCard
          icon={CreditCard}
          label="Paying Members"
          value={paying.toString()}
          subtext="Active Stripe subscriptions"
          color="ember"
        />
        <MetricCard
          icon={Gift}
          label="Comped Members"
          value={comped.toString()}
          subtext="Granted access (no Stripe)"
          color="purple"
        />
      </div>

      {/* Stripe Balance */}
      {(totalCollected ?? 0) > 0 && (
        <div className="glass-card rounded-2xl p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h2 className="font-heading text-sm font-semibold text-green-400 uppercase tracking-wider">
              Stripe Balance
            </h2>
          </div>
          <p className="font-heading text-3xl font-bold text-cream">
            ${((totalCollected ?? 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-cream-muted text-xs mt-1">Available + pending balance in Stripe</p>
        </div>
      )}

      {/* Revenue Breakdown Visual */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-6">
          <Crown className="w-4 h-4 text-ember" />
          <h2 className="font-heading text-sm font-semibold text-ember uppercase tracking-wider">
            Member Breakdown
          </h2>
        </div>

        {/* Visual bar */}
        <div className="mb-6">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-cream text-sm font-medium">{total} of 50 founding spots filled</span>
          </div>
          <div className="w-full h-8 bg-white/5 rounded-full overflow-hidden flex">
            {paying > 0 && (
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                style={{ width: `${(paying / 50) * 100}%` }}
              >
                {paying > 2 && `${paying} paying`}
              </div>
            )}
            {comped > 0 && (
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 flex items-center justify-center text-[10px] font-bold text-white transition-all duration-700"
                style={{ width: `${(comped / 50) * 100}%` }}
              >
                {comped > 2 && `${comped} comped`}
              </div>
            )}
            <div
              className="h-full bg-white/5 flex items-center justify-center text-[10px] text-cream-muted transition-all duration-700"
              style={{ width: `${((50 - total) / 50) * 100}%` }}
            >
              {50 - total > 5 && `${50 - total} open`}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-cream-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" /> Paying
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" /> Comped
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-white/10" /> Open
            </span>
          </div>
        </div>
      </div>

      {/* Paying Members Table */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-green-400" />
          <h2 className="font-heading text-sm font-semibold text-green-400 uppercase tracking-wider">
            Paying Members ({paying})
          </h2>
        </div>
        <div className="space-y-2">
          {payingMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-400" />
                </div>
                <div>
                  <p className="text-cream text-sm font-medium">{m.name}</p>
                  <p className="text-cream-muted text-xs">{m.email || "No email"}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-400 text-sm font-semibold">$497/mo</p>
                {m.joinedAt && (
                  <p className="text-cream-muted text-[10px] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          {payingMembers.length === 0 && (
            <p className="text-cream-muted text-sm text-center py-4">No paying members yet.</p>
          )}
        </div>
      </div>

      {/* Comped Members Table */}
      <div className="glass-card rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-4 h-4 text-purple-400" />
          <h2 className="font-heading text-sm font-semibold text-purple-400 uppercase tracking-wider">
            Comped Members ({comped})
          </h2>
        </div>
        <div className="space-y-2">
          {compedMembers.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Gift className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-cream text-sm font-medium">{m.name}</p>
                  <p className="text-cream-muted text-xs">{m.email || "No email"}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-medium">
                  Comped
                </span>
                {m.joinedAt && (
                  <p className="text-cream-muted text-[10px] flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(m.joinedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
          {compedMembers.length === 0 && (
            <p className="text-cream-muted text-sm text-center py-4">No comped members.</p>
          )}
        </div>
      </div>
    </div>
  );
}
