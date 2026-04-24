/**
 * Admin Members Dashboard — View all members with subscription and Discord status.
 * Admin-only access.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Crown,
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Search,
  RefreshCw,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-400",
    trialing: "bg-blue-400",
    past_due: "bg-yellow-400",
    canceled: "bg-red-400",
    none: "bg-gray-500",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] || colors.none}`}
      title={status}
    />
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "founding_member") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ember/10 border border-ember/20">
        <Crown className="w-3 h-3 text-ember" />
        <span className="text-[10px] font-semibold text-ember uppercase tracking-wider">Founding</span>
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
        <Shield className="w-3 h-3 text-blue-400" />
        <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Admin</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5">
      <span className="text-[10px] font-medium text-cream-muted uppercase tracking-wider">Member</span>
    </span>
  );
}

function VerifyButton({ memberId, memberName }: { memberId: number; memberName: string }) {
  const utils = trpc.useUtils();
  const verify = trpc.member.verifySubscription.useMutation({
    onSuccess: (result) => {
      utils.member.adminMembers.invalidate();
      if (result.status === "updated") {
        toast.success(`${memberName}: ${result.message}`);
      } else if (result.status === "no_customer") {
        toast.warning(`${memberName}: ${result.message}`);
      } else {
        toast.info(`${memberName}: ${result.message}`);
      }
    },
    onError: (err) => {
      toast.error(`Failed to verify ${memberName}: ${err.message}`);
    },
  });

  return (
    <button
      onClick={() => verify.mutate({ memberId })}
      disabled={verify.isPending}
      className="w-6 h-6 rounded bg-white/5 hover:bg-ember/10 flex items-center justify-center transition-colors disabled:opacity-50"
      title="Verify subscription with Stripe"
    >
      <RefreshCw className={`w-3 h-3 text-cream-muted hover:text-ember ${verify.isPending ? "animate-spin" : ""}`} />
    </button>
  );
}

export default function AdminMembers() {
  const { member } = useMember();
  const { data, isLoading } = trpc.member.adminMembers.useQuery(undefined, {
    retry: false,
  });

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const isAdmin = member?.memberRole === "admin";

  // Verify all members mutation
  const utils = trpc.useUtils();
  const verifyAll = trpc.member.verifySubscription.useMutation({
    onSuccess: () => {
      utils.member.adminMembers.invalidate();
    },
  });
  const [verifyingAll, setVerifyingAll] = useState(false);

  const handleVerifyAll = async () => {
    if (!data?.members || verifyingAll) return;
    setVerifyingAll(true);
    let updated = 0;
    let noChange = 0;
    let errors = 0;
    for (const m of data.members) {
      try {
        const result = await verifyAll.mutateAsync({ memberId: m.id });
        if (result.status === "updated") updated++;
        else noChange++;
      } catch {
        errors++;
      }
    }
    setVerifyingAll(false);
    utils.member.adminMembers.invalidate();
    toast.success(`Verification complete: ${updated} updated, ${noChange} unchanged, ${errors} errors`);
  };

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    return data.members.filter(m => {
      const matchesSearch =
        !search ||
        m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase()) ||
        m.discordUsername?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || m.subscriptionStatus === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [data?.members, search, filterStatus]);

  const stats = useMemo(() => {
    if (!data?.members) return { total: 0, active: 0, canceled: 0, noSub: 0, discordLinked: 0 };
    const members = data.members;
    return {
      total: members.length,
      active: members.filter(m => m.subscriptionStatus === "active").length,
      canceled: members.filter(m => m.subscriptionStatus === "canceled").length,
      noSub: members.filter(m => !m.subscriptionStatus || m.subscriptionStatus === "none").length,
      discordLinked: members.filter(m => m.hasDiscord).length,
    };
  }, [data?.members]);

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <Shield className="w-12 h-12 text-cream-muted mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-bold text-cream mb-2">Admin Access Required</h2>
        <p className="text-cream-muted">This page is only accessible to administrators.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream">
            Members Dashboard
          </h1>
          <p className="text-cream-muted mt-1">
            View all members, subscription status, and Discord link status.
          </p>
        </div>
        <button
          onClick={handleVerifyAll}
          disabled={verifyingAll || isLoading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ember/10 border border-ember/20 text-ember text-xs font-semibold hover:bg-ember/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${verifyingAll ? "animate-spin" : ""}`} />
          {verifyingAll ? "Verifying..." : "Verify All"}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cream">{stats.active}</p>
          <p className="text-xs text-cream-muted mt-1">Active</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cream">{stats.total}</p>
          <p className="text-xs text-cream-muted mt-1">Total Records</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cream">{stats.discordLinked}</p>
          <p className="text-xs text-cream-muted mt-1">Discord Linked</p>
        </div>
        <div className="glass-card rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-cream">{stats.canceled}</p>
          <p className="text-xs text-cream-muted mt-1">Canceled</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cream-muted" />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-cream text-sm placeholder:text-cream-muted/50 focus:outline-none focus:border-ember/40"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {["all", "active", "canceled", "none"].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filterStatus === status
                  ? "bg-ember/20 text-ember border border-ember/30"
                  : "bg-white/5 text-cream-muted border border-white/10 hover:bg-white/10"
              }`}
            >
              {status === "all" ? "All" : status === "none" ? "No Sub" : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Members List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-ember border-t-transparent animate-spin" />
            <span className="text-cream-muted text-sm ml-3">Loading members...</span>
          </div>
        ) : !filteredMembers.length ? (
          <div className="text-center py-12">
            <Users className="w-8 h-8 text-cream-muted mx-auto mb-3 opacity-50" />
            <p className="text-cream-muted text-sm">No members found.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {/* Table Header - hidden on mobile */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 text-[11px] font-semibold text-cream-muted uppercase tracking-wider bg-white/[0.02]">
              <div className="col-span-3">Member</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Role</div>
              <div className="col-span-2">Discord</div>
              <div className="col-span-2">Joined</div>
              <div className="col-span-1">Actions</div>
            </div>

            {filteredMembers.map(m => (
              <div
                key={m.id}
                className="px-4 sm:px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Mobile layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-center gap-3">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-9 h-9 rounded-full border border-white/10" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center">
                        <Users className="w-4 h-4 text-cream-muted" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-cream truncate">{m.displayName || "Unknown"}</p>
                      <p className="text-xs text-cream-muted truncate">{m.email || "No email"}</p>
                    </div>
                    <StatusDot status={m.subscriptionStatus || "none"} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <RoleBadge role={m.memberRole || "member"} />
                    {m.hasDiscord ? (
                      <span className="text-[10px] text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Discord
                      </span>
                    ) : (
                      <span className="text-[10px] text-yellow-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> No Discord
                      </span>
                    )}
                    {m.stripeCustomerId && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${m.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-cream-muted hover:text-ember flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" /> Stripe
                      </a>
                    )}
                    <VerifyButton memberId={m.id} memberName={m.displayName || m.email || "Member"} />
                  </div>
                </div>

                {/* Desktop layout */}
                <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-3 flex items-center gap-3 min-w-0">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="w-8 h-8 rounded-full border border-white/10 shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-cream-muted" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-cream truncate">{m.displayName || "Unknown"}</p>
                      <p className="text-xs text-cream-muted truncate">{m.email || "No email"}</p>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <StatusDot status={m.subscriptionStatus || "none"} />
                    <span className="text-xs text-cream-muted capitalize">{m.subscriptionStatus || "none"}</span>
                  </div>
                  <div className="col-span-2">
                    <RoleBadge role={m.memberRole || "member"} />
                  </div>
                  <div className="col-span-2">
                    {m.hasDiscord ? (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Linked
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-cream-muted">
                      {m.createdAt
                        ? new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1.5">
                    <VerifyButton memberId={m.id} memberName={m.displayName || m.email || "Member"} />
                    {m.stripeCustomerId && (
                      <a
                        href={`https://dashboard.stripe.com/customers/${m.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-6 h-6 rounded bg-white/5 hover:bg-ember/10 flex items-center justify-center transition-colors"
                        title="View in Stripe"
                      >
                        <ExternalLink className="w-3 h-3 text-cream-muted hover:text-ember" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <p className="text-center text-cream-muted text-xs">
        Showing {filteredMembers.length} of {stats.total} total records
      </p>
    </div>
  );
}
