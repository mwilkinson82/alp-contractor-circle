import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, CreditCard, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Account() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const memberQuery = trpc.member.me.useQuery();
  const subscriptionQuery = trpc.member.subscription.useQuery();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center">
        <div className="text-cream">Loading...</div>
      </div>
    );
  }

  if (!user) {
    setLocation("/circle");
    return null;
  }

  const member = memberQuery.data;

  const handleLogout = async () => {
    await logout();
    setLocation("/circle");
  };

  return (
    <div className="min-h-screen bg-navy-deep text-cream">
      <header className="border-b border-white/5 bg-navy-deep/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button onClick={() => setLocation("/portal")} variant="ghost" size="sm" className="text-cream-muted hover:text-cream">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div className="text-2xl font-bold font-display text-ember">ALP</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold font-display mb-8">Account</h1>

        {/* Profile Section */}
        <div className="bg-navy border border-white/5 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-ember" />
            <h2 className="text-xl font-bold font-display">Profile</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              {member?.avatarUrl ? (
                <img src={member.avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-ember/30" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-ember/20 flex items-center justify-center">
                  <User className="w-8 h-8 text-ember" />
                </div>
              )}
              <div>
                <p className="font-bold text-lg">{member?.displayName || user.name || "Member"}</p>
                <p className="text-cream-muted text-sm">{member?.discordUsername ? `@${member.discordUsername}` : ""}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-cream-muted text-xs uppercase tracking-wider mb-1">Email</p>
                <p className="text-sm">{member?.email || user.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-cream-muted text-xs uppercase tracking-wider mb-1">Member Since</p>
                <p className="text-sm">{member?.createdAt ? new Date(member.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="bg-navy border border-white/5 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-5 h-5 text-ember" />
            <h2 className="text-xl font-bold font-display">Subscription</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-cream-muted text-xs uppercase tracking-wider mb-1">Plan</p>
              <p className="font-semibold">Contractor Circle</p>
            </div>
            <div>
              <p className="text-cream-muted text-xs uppercase tracking-wider mb-1">Amount</p>
              <p className="font-semibold">$497/month</p>
            </div>
            <div>
              <p className="text-cream-muted text-xs uppercase tracking-wider mb-1">Status</p>
              <p className="font-semibold capitalize">
                {subscriptionQuery.data?.status === "active" ? (
                  <span className="text-emerald-400">Active</span>
                ) : subscriptionQuery.data?.status === "past_due" ? (
                  <span className="text-amber-400">Past Due</span>
                ) : subscriptionQuery.data?.status === "canceled" ? (
                  <span className="text-red-400">Canceled</span>
                ) : (
                  <span className="text-cream-muted">{subscriptionQuery.data?.status || "None"}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Membership Role */}
        <div className="bg-navy border border-white/5 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-ember" />
            <h2 className="text-xl font-bold font-display">Membership</h2>
          </div>
          <div>
            <p className="text-cream-muted text-xs uppercase tracking-wider mb-1">Role</p>
            <p className="font-semibold capitalize">{member?.memberRole?.replace("_", " ") || "Member"}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button onClick={handleLogout} variant="outline" className="border-white/10 text-cream hover:bg-white/5">
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
