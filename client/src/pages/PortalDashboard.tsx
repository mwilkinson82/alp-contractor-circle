/**
 * Member Dashboard — The Contractor Circle portal home.
 * Shows welcome message, subscription status, quick links, and upcoming events.
 */
import { useMember } from "@/hooks/useMember";
import { trpc } from "@/lib/trpc";
import {
  Crown,
  Calendar,
  PlayCircle,
  FileDown,
  MessageSquare,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
} from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/KUTmm9D5aW";

// Zoom recurring meeting link for Thursday calls at 12 PM EST
// Update this URL when the Zoom meeting link changes
const ZOOM_CALL_LINK = "https://us06web.zoom.us/j/83215167292?pwd=Mtt970HFCPStqSw62btyyta2Wxo0Pr.1";

/** Returns the next Thursday at 12:00 PM EST as a formatted string */
function getNextThursday(): string {
  const now = new Date();
  // Convert to EST (UTC-5 standard, UTC-4 daylight)
  const estOffset = -4; // EDT (daylight saving)
  const estNow = new Date(now.getTime() + (now.getTimezoneOffset() + estOffset * 60) * 60000);
  const dayOfWeek = estNow.getDay(); // 0=Sun, 4=Thu
  const daysUntilThursday = (4 - dayOfWeek + 7) % 7 || 7; // always next Thursday
  const nextThursday = new Date(estNow);
  nextThursday.setDate(estNow.getDate() + daysUntilThursday);
  return nextThursday.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string; icon: any }> = {
    active: { color: "text-green-400", bg: "bg-green-500/10", label: "Active", icon: CheckCircle2 },
    trialing: { color: "text-blue-400", bg: "bg-blue-500/10", label: "Trial", icon: Clock },
    past_due: { color: "text-yellow-400", bg: "bg-yellow-500/10", label: "Past Due", icon: AlertCircle },
    canceled: { color: "text-red-400", bg: "bg-red-500/10", label: "Canceled", icon: AlertCircle },
    none: { color: "text-cream-muted", bg: "bg-white/5", label: "No Subscription", icon: AlertCircle },
  };

  const c = config[status] || config.none;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${c.color} ${c.bg}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export default function PortalDashboard() {
  const { member } = useMember();
  const { data: subscription, isLoading: subLoading } = trpc.member.subscription.useQuery(undefined, {
    retry: false,
  });

  const displayName = member?.displayName || member?.discordUsername || "Member";
  const firstName = displayName.split(" ")[0];

  // Get time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const quickLinks = [
    {
      icon: PlayCircle,
      title: "Replay Library",
      description: "Watch past calls and bootcamp sessions",
      href: "/portal/replays",
      color: "text-blue-accent",
      bg: "bg-blue-accent/10",
    },
    {
      icon: FileDown,
      title: "Templates",
      description: "Download proposal and contract templates",
      href: "/portal/templates",
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      icon: MessageSquare,
      title: "Discord Community",
      description: "Connect with fellow contractors",
      href: DISCORD_INVITE,
      external: true,
      color: "text-[#5865F2]",
      bg: "bg-[#5865F2]/10",
    },
    {
      icon: Calendar,
      title: "Next Live Call",
      description: `${getNextThursday()} at 12 PM EST`,
      href: ZOOM_CALL_LINK,
      external: true,
      color: "text-ember",
      bg: "bg-ember/10",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold text-cream">
            {greeting}, {firstName}
          </h1>
          <p className="text-cream-muted mt-1">
            Welcome to your Contractor Circle member portal.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {member?.memberRole === "founding_member" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20">
              <Crown className="w-3.5 h-3.5 text-ember" />
              <span className="text-xs font-semibold text-ember uppercase tracking-wider">Founding Member</span>
            </span>
          )}
        </div>
      </div>

      {/* Subscription Status Card */}
      <div className="glass-card rounded-2xl p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-ember/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-ember" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-semibold text-cream">
                {subscription?.plan || "The Contractor Circle"}
              </h2>
              <p className="text-cream-muted text-sm mt-0.5">
                {subLoading ? (
                  "Loading subscription..."
                ) : subscription?.currentPeriodEnd ? (
                  `Renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                ) : subscription?.status === "active" ? (
                  "$497/month subscription"
                ) : (
                  "No active subscription"
                )}
              </p>
            </div>
          </div>
          <StatusBadge status={subscription?.status || member?.subscriptionStatus || "none"} />
        </div>

        {subscription?.cancelAtPeriodEnd && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
            <p className="text-yellow-400 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Your subscription will end at the current billing period.
            </p>
          </div>
        )}
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {quickLinks.map(link => (
          <a
            key={link.title}
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            onClick={link.href === "#" ? (e) => e.preventDefault() : undefined}
            className="group glass-card rounded-xl p-5 hover:bg-white/[0.03] transition-all duration-300 block"
          >
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-lg ${link.bg} flex items-center justify-center shrink-0`}>
                <link.icon className={`w-5 h-5 ${link.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-semibold text-cream group-hover:text-ember transition-colors">
                    {link.title}
                  </h3>
                  {link.external && <ExternalLink className="w-3 h-3 text-cream-muted" />}
                </div>
                <p className="text-cream-muted text-xs mt-1">{link.description}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Motivational Quote */}
      <div className="glass-card rounded-2xl p-6 md:p-8 text-center">
        <blockquote className="text-cream/80 text-lg md:text-xl font-heading italic leading-relaxed max-w-2xl mx-auto">
          "The difference between a contractor and a business owner is the system they build around themselves."
        </blockquote>
        <p className="text-ember text-sm mt-4 font-medium">— Marshall Wilkinson</p>
      </div>
    </div>
  );
}
