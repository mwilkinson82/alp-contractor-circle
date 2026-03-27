/**
 * SubscriptionGate — Frosted glass overlay for non-subscribers.
 * Shows blurred/locked content with a prominent CTA to subscribe.
 * Used to wrap portal content pages (Replays, Templates) for non-subscribers.
 */
import { Lock, Crown, Zap, PlayCircle, FileDown, MessageSquare, ChevronRight } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  isSubscribed: boolean;
}

/**
 * Wraps page content. If subscribed, renders children normally.
 * If not subscribed, renders children with a frosted glass overlay + CTA.
 */
export function SubscriptionGate({ children, isSubscribed }: SubscriptionGateProps) {
  if (isSubscribed) return <>{children}</>;

  return (
    <div className="relative">
      {/* Blurred content behind the gate */}
      <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.4 }}>
        {children}
      </div>

      {/* Frosted glass overlay */}
      <div className="absolute inset-0 z-20 flex items-start justify-center pt-8 sm:pt-20 px-4 sm:px-0">
        <div className="max-w-lg w-full">
          {/* Lock card */}
          <div
            className="rounded-2xl p-6 sm:p-8 md:p-10 text-center border backdrop-blur-xl"
            style={{
              background: "oklch(0.08 0.02 260 / 0.92)",
              borderColor: "oklch(0.72 0.12 55 / 0.2)",
              boxShadow: "0 25px 60px -12px oklch(0 0 0 / 0.5), 0 0 40px oklch(0.72 0.12 55 / 0.08)",
            }}
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-ember/10 flex items-center justify-center mx-auto mb-4 sm:mb-5 border border-ember/20">
              <Lock className="w-6 h-6 sm:w-7 sm:h-7 text-ember" />
            </div>

            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold text-cream mb-2 sm:mb-3"
              style={{ fontFamily: "'Sora', sans-serif" }}
            >
              Members Only
            </h2>

            <p
              className="text-cream/50 text-xs sm:text-sm md:text-base leading-relaxed mb-5 sm:mb-6"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              This content is exclusively available to Contractor Circle members. Subscribe to unlock full access to everything you see here.
            </p>

            {/* What's behind the gate */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 sm:mb-6">
              {[
                { icon: PlayCircle, label: "Replays", count: "20+" },
                { icon: FileDown, label: "Templates", count: "18+" },
                { icon: MessageSquare, label: "Community", count: "24/7" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="p-2 sm:p-3 rounded-lg border text-center"
                  style={{ borderColor: "oklch(1 0 0 / 0.06)", background: "oklch(1 0 0 / 0.03)" }}
                >
                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-ember mx-auto mb-1 sm:mb-1.5" />
                  <p className="text-cream text-xs font-semibold">{item.count}</p>
                  <p className="text-cream/30 text-[9px] sm:text-[10px]">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Price + CTA */}
            <div className="mb-4">
              <p className="text-cream/40 text-xs uppercase tracking-wider mb-1" style={{ fontFamily: "'Sora', sans-serif" }}>
                Founding Member Pricing
              </p>
              <p className="text-cream font-bold text-2xl sm:text-3xl" style={{ fontFamily: "'Sora', sans-serif" }}>
                $497<span className="text-sm sm:text-base text-cream/40 font-normal">/month</span>
              </p>
            </div>

            <a
              href="/circle#pricing"
              className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-ember hover:bg-ember/90 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-ember/30 hover:shadow-ember/50 text-sm sm:text-base"
            >
              <Crown className="w-4 h-4" />
              Become a Member
              <ChevronRight className="w-4 h-4" />
            </a>

            <p className="text-cream/20 text-xs mt-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Includes bi-weekly live calls, templates, replays, Discord community, and more.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Persistent top banner for non-subscribers — shown across all portal pages.
 */
export function SubscriptionBanner({ isSubscribed }: { isSubscribed: boolean }) {
  if (isSubscribed) return null;

  return (
    <div
      className="mb-6 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 border"
      style={{
        background: "linear-gradient(135deg, oklch(0.72 0.12 55 / 0.08), oklch(0.72 0.12 55 / 0.03))",
        borderColor: "oklch(0.72 0.12 55 / 0.2)",
      }}
    >
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-ember/15 flex items-center justify-center shrink-0">
          <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-ember" />
        </div>
        <div className="min-w-0">
          <p className="text-cream text-xs sm:text-sm font-semibold" style={{ fontFamily: "'Sora', sans-serif" }}>
            You're previewing the Contractor Circle portal
          </p>
          <p className="text-cream/40 text-[10px] sm:text-xs mt-0.5 leading-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Subscribe to unlock full access to all content, templates, and community features.
          </p>
        </div>
      </div>
      <a
        href="/circle#pricing"
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 bg-ember hover:bg-ember/90 text-white text-xs sm:text-sm font-semibold rounded-lg transition-all duration-300 shadow-md shadow-ember/20"
      >
        <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        <span>Subscribe Now</span>
      </a>
    </div>
  );
}

/**
 * Individual lock overlay for specific items (replay cards, template download buttons).
 * Renders a small lock icon overlay on top of the item.
 */
export function ItemLockOverlay({ onClick }: { onClick?: () => void }) {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-lg cursor-pointer group"
      style={{ background: "oklch(0.08 0.02 260 / 0.7)", backdropFilter: "blur(2px)" }}
      onClick={onClick || (() => { window.location.href = "/circle#pricing"; })}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-ember/20 border border-ember/30 group-hover:bg-ember/30 transition-colors">
        <Lock className="w-3.5 h-3.5 text-ember" />
        <span className="text-xs font-semibold text-ember">Subscribe to Unlock</span>
      </div>
    </div>
  );
}
