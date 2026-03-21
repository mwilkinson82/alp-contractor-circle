/**
 * Account Management — View profile, subscription details, and payment history.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import {
  User,
  Mail,
  Crown,
  CreditCard,
  Calendar,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Receipt,
  Shield,
} from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    active: { color: "text-green-400", bg: "bg-green-500/10", label: "Active", icon: CheckCircle2 },
    trialing: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Trial", icon: Clock },
    past_due: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Past Due", icon: AlertCircle },
    canceled: { color: "text-red-400", bg: "bg-red-500/10", label: "Canceled", icon: AlertCircle },
    none: { color: "text-cream-muted", bg: "bg-white/5", label: "No Subscription", icon: AlertCircle },
    succeeded: { color: "text-green-400", bg: "bg-green-500/10", label: "Paid", icon: CheckCircle2 },
    pending: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Pending", icon: Clock },
    failed: { color: "text-red-400", bg: "bg-red-500/10", label: "Failed", icon: AlertCircle },
  };

  const c = config[status] || config.none;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${c.color} ${c.bg}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export default function PortalAccount() {
  const { member, logout } = useMember();
  const { data: subscription, isLoading: subLoading } = trpc.member.subscription.useQuery(undefined, {
    retry: false,
  });
  const { data: paymentsData, isLoading: paymentsLoading } = trpc.member.payments.useQuery(undefined, {
    retry: false,
  });

  const displayName = member?.displayName || member?.discordUsername || "Member";
  const memberRole = member?.memberRole || "member";
  const roleLabel =
    memberRole === "founding_member"
      ? "Founding Member"
      : memberRole === "admin"
        ? "Admin"
        : "Member";

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream">
          Account Settings
        </h1>
        <p className="text-cream-muted mt-1">
          Manage your profile, subscription, and payment history.
        </p>
      </div>

      {/* Profile Card */}
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <User className="w-4 h-4 text-ember" />
          <h2 className="font-heading text-sm font-semibold text-ember uppercase tracking-wider">Profile</h2>
        </div>

        <div className="flex items-center gap-5">
          <img
            src={member?.avatarUrl || ""}
            alt={displayName}
            className="w-16 h-16 rounded-full border-2 border-ember/20"
          />
          <div>
            <h3 className="font-heading text-xl font-bold text-cream">{displayName}</h3>
            <p className="text-cream-muted text-sm">@{member?.discordUsername}</p>
            <div className="flex items-center gap-2 mt-2">
              {memberRole === "founding_member" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-ember/10 border border-ember/20">
                  <Crown className="w-3 h-3 text-ember" />
                  <span className="text-[10px] font-semibold text-ember uppercase tracking-wider">{roleLabel}</span>
                </span>
              )}
              {memberRole === "member" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5">
                  <Shield className="w-3 h-3 text-cream-muted" />
                  <span className="text-[10px] font-medium text-cream-muted uppercase tracking-wider">{roleLabel}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-cream-muted" />
            <span className="text-cream-muted">Email:</span>
            <span className="text-cream">{member?.email || "Not provided"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-cream-muted" />
            <span className="text-cream-muted">Member since:</span>
            <span className="text-cream">
              {member?.createdAt
                ? new Date(member.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <CreditCard className="w-4 h-4 text-ember" />
          <h2 className="font-heading text-sm font-semibold text-ember uppercase tracking-wider">Subscription</h2>
        </div>

        {subLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-ember border-t-transparent animate-spin" />
            <span className="text-cream-muted text-sm">Loading subscription details...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading text-lg font-semibold text-cream">
                  {subscription?.plan || "The Contracting Circle"}
                </h3>
                <p className="text-cream-muted text-sm mt-0.5">
                  ${((subscription?.amount || 49700) / 100).toFixed(0)}/{subscription?.interval || "month"}
                </p>
              </div>
              <StatusBadge status={subscription?.status || "none"} />
            </div>

            {subscription?.currentPeriodEnd && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-cream-muted" />
                <span className="text-cream-muted">
                  {subscription.cancelAtPeriodEnd ? "Access until:" : "Next billing date:"}
                </span>
                <span className="text-cream">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}

            {subscription?.cancelAtPeriodEnd && (
              <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <p className="text-yellow-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Your subscription is set to cancel at the end of the current billing period.
                </p>
              </div>
            )}

            <p className="text-cream-muted text-xs">
              To manage your subscription or update payment method, contact support in the Discord.
            </p>
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Receipt className="w-4 h-4 text-ember" />
          <h2 className="font-heading text-sm font-semibold text-ember uppercase tracking-wider">Payment History</h2>
        </div>

        {paymentsLoading ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-ember border-t-transparent animate-spin" />
            <span className="text-cream-muted text-sm">Loading payment history...</span>
          </div>
        ) : !paymentsData?.payments?.length ? (
          <div className="text-center py-8">
            <Receipt className="w-8 h-8 text-cream-muted mx-auto mb-3 opacity-50" />
            <p className="text-cream-muted text-sm">No payment history available yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentsData.payments.map(payment => (
              <div
                key={payment.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-cream-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cream font-medium truncate">
                    {payment.description}
                  </p>
                  <p className="text-xs text-cream-muted">
                    {new Date(payment.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-cream">
                    ${(payment.amount / 100).toFixed(2)}
                  </span>
                  <StatusBadge status={payment.status} />
                  {payment.receiptUrl && (
                    <a
                      href={payment.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-ember/10 flex items-center justify-center transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-cream-muted hover:text-ember" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sign Out */}
      <div className="glass-card rounded-2xl p-6 text-center">
        <button
          onClick={logout}
          className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-cream-muted hover:text-red-400 text-sm font-medium transition-all"
        >
          Sign Out of Member Portal
        </button>
      </div>
    </div>
  );
}
