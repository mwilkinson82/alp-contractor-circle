/**
 * Account Management — View profile, subscription details, and payment history.
 */
import { useState, useEffect } from "react";
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
  Building2,
  Save,
  Check,
  Upload,
  Image,
  X,
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

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const utils = trpc.useUtils();
  const cancelMutation = trpc.member.cancelSubscription.useMutation({
    onSuccess: () => {
      utils.member.subscription.invalidate();
    },
  });
  const reactivateMutation = trpc.member.reactivateSubscription.useMutation({
    onSuccess: () => {
      utils.member.subscription.invalidate();
    },
  });
  const billingPortalMutation = trpc.member.createBillingPortal.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
  });

  const [companyName, setCompanyName] = useState(member?.companyName || "");
  const [companyNameSaved, setCompanyNameSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(member?.companyLogo || null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const updateProfileMut = trpc.member.updateProfile.useMutation({
    onSuccess: () => {
      setCompanyNameSaved(true);
      utils.member.me.invalidate();
      setTimeout(() => setCompanyNameSaved(false), 2000);
    },
  });
  const uploadLogoMut = trpc.member.uploadLogo.useMutation({
    onSuccess: (data) => {
      setLogoPreview(data.url);
      setLogoUploading(false);
      setLogoSaved(true);
      utils.member.me.invalidate();
      setTimeout(() => setLogoSaved(false), 2000);
    },
    onError: () => setLogoUploading(false),
  });
  const removeLogoMut = trpc.member.updateProfile.useMutation({
    onSuccess: () => {
      setLogoPreview(null);
      utils.member.me.invalidate();
    },
  });

  // Sync companyName and logo from member data when it loads
  useEffect(() => {
    if (member?.companyName && !companyName) setCompanyName(member.companyName);
    if (member?.companyLogo && !logoPreview) setLogoPreview(member.companyLogo);
  }, [member?.companyName, member?.companyLogo]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Logo must be under 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }
    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadLogoMut.mutate({
        imageData: base64,
        contentType: file.type,
        filename: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const displayName = member?.displayName || member?.discordUsername || "Member";
  const memberRole = member?.memberRole || "member";
  const roleLabel =
    memberRole === "founding_member"
      ? "Founding Member"
      : memberRole === "admin"
        ? "Admin"
        : "Member";

  return (
    <div className="member-warm-page max-w-3xl mx-auto space-y-8">
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
      <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
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

      {/* Company / Business Info Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-4 h-4 text-ember" />
          <h2 className="font-heading text-sm font-semibold text-ember uppercase tracking-wider">Business Info</h2>
        </div>

        <p className="text-xs text-cream-muted/60 mb-5">Your company info will automatically appear in PDF exports and schedule reports.</p>
        <div className="space-y-5">
          {/* Company Logo */}
          <div>
            <label className="block text-xs text-cream-muted mb-2">Company Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative group">
                  <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                    <img src={logoPreview} alt="Company logo" className="w-full h-full object-contain p-1" />
                  </div>
                  <button
                    onClick={() => removeLogoMut.mutate({ companyLogo: "" })}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove logo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 border-dashed flex items-center justify-center">
                  <Image className="w-6 h-6 text-cream-muted/30" />
                </div>
              )}
              <div>
                <label className="cursor-pointer px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-cream text-xs hover:bg-white/10 transition-all inline-flex items-center gap-2">
                  <Upload className="w-3.5 h-3.5" />
                  {logoUploading ? "Uploading..." : logoSaved ? "Uploaded!" : "Upload Logo"}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={logoUploading} />
                </label>
                <p className="text-[10px] text-cream-muted/40 mt-1">PNG, JPG, or SVG. Max 2MB.</p>
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="block text-xs text-cream-muted mb-1.5">Company Name</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={companyName}
                onChange={(e) => { setCompanyName(e.target.value); setCompanyNameSaved(false); }}
                placeholder="Enter your company name"
                className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-cream text-sm placeholder:text-cream-muted/40 focus:outline-none focus:border-ember/40 focus:ring-1 focus:ring-ember/20 transition-all"
              />
              <button
                onClick={() => updateProfileMut.mutate({ companyName })}
                disabled={updateProfileMut.isPending || companyNameSaved}
                className="px-4 py-2 rounded-lg bg-ember/10 border border-ember/20 text-ember hover:bg-ember/20 text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-2 shrink-0"
              >
                {companyNameSaved ? (
                  <><Check className="w-3.5 h-3.5" /> Saved</>
                ) : updateProfileMut.isPending ? (
                  <>Saving...</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> Save</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
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
                  {subscription?.plan || "The Contractor Circle"}
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
                <button
                  onClick={() => reactivateMutation.mutate()}
                  disabled={reactivateMutation.isPending}
                  className="mt-3 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs font-medium transition-all disabled:opacity-50"
                >
                  {reactivateMutation.isPending ? "Reactivating..." : "Keep My Subscription"}
                </button>
              </div>
            )}

            {subscription?.status === "active" && !subscription?.cancelAtPeriodEnd && (
              <div className="flex flex-wrap gap-3 mt-3">
                <button
                  onClick={() => billingPortalMutation.mutate()}
                  disabled={billingPortalMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-ember/10 border border-ember/20 text-ember hover:bg-ember/20 text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  {billingPortalMutation.isPending ? "Opening..." : "Manage Billing"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-cream-muted hover:text-red-400 text-xs font-medium transition-all"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 md:p-8">
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

      {/* Cancellation Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] rounded-2xl p-6 max-w-sm w-full border border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-cream mb-2">Cancel Subscription?</h3>
            <p className="text-cream-muted text-sm mb-1">
              Your subscription will remain active until the end of your current billing period{subscription?.currentPeriodEnd
                ? ` (${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })})`
                : ""}.
            </p>
            <p className="text-cream-muted text-sm mb-5">
              You can rejoin anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-cream hover:bg-white/10 transition-colors text-sm font-medium"
              >
                Keep Subscription
              </button>
              <button
                onClick={async () => {
                  await cancelMutation.mutateAsync();
                  setShowCancelConfirm(false);
                }}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelMutation.isPending ? "Canceling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

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
