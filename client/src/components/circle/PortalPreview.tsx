import { useState } from "react";
import { Monitor, Layout, Play, FileText, ChevronRight } from "lucide-react";

const PORTAL_SCREENSHOTS = [
  {
    id: "dashboard",
    label: "Member Dashboard",
    icon: Layout,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/portal-dashboard_81649bf0.webp",
    description: "Your command center — upcoming calls, quick links, question submission, and everything you need in one place.",
  },
  {
    id: "replays",
    label: "Replay Library",
    icon: Play,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/portal-replay-library_d569b858.webp",
    description: "Every Contractor Circle call, bootcamp, and masterclass recorded and organized. Watch on demand, anytime.",
  },
  {
    id: "templates",
    label: "Template Library",
    icon: FileText,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/portal-template-library_b5ce70a4.webp",
    description: "11+ battle-tested templates — proposals, contracts, SOPs, bid sheets — built on the ALP framework. Ready to use.",
  },
];

export function PortalPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const active = PORTAL_SCREENSHOTS[activeTab];

  return (
    <section className="relative z-10 py-14 sm:py-20 lg:py-28 px-4 sm:px-6 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, oklch(0.72 0.12 55 / 0.03), transparent 60%)",
        }}
      />

      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember/10 border border-ember/20 mb-6">
            <Monitor className="w-4 h-4 text-ember" />
            <span className="text-sm font-semibold text-ember uppercase tracking-wider" style={{ fontFamily: "'Sora', sans-serif" }}>
              Member Portal
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-cream leading-tight mb-4"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Your Private{" "}
            <span className="text-ember">Command Center</span>
          </h2>
          <p
            className="text-base sm:text-lg text-cream/50 max-w-2xl mx-auto"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Behind the login, members get a premium portal with everything organized and accessible. Here's what it looks like inside.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-8 sm:mb-10">
          {PORTAL_SCREENSHOTS.map((tab, i) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 cursor-pointer ${
                  activeTab === i
                    ? "bg-ember text-white shadow-xl shadow-ember/40"
                    : "bg-white/5 text-cream/60 hover:bg-white/10 border border-white/10 hover:border-ember/30"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ").pop()}</span>
              </button>
            );
          })}
        </div>

        {/* Screenshot display */}
        <div className="relative">
          {/* Browser chrome mockup */}
          <div
            className="rounded-xl sm:rounded-2xl overflow-hidden border"
            style={{ borderColor: "oklch(0.72 0.12 55 / 0.15)", background: "oklch(0.12 0.02 260)" }}
          >
            {/* Browser bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "oklch(0.72 0.12 55 / 0.1)", background: "oklch(0.1 0.02 260)" }}>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md text-xs text-cream/30 bg-white/5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  alpcontractorcircle.com/portal
                </div>
              </div>
            </div>

            {/* Screenshot */}
            <div className="relative">
              <img
                src={active.image}
                alt={active.label}
                className="w-full h-auto block"
                loading="lazy"
              />
              {/* Gradient overlay at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-24 sm:h-32 pointer-events-none"
                style={{ background: "linear-gradient(to top, oklch(0.12 0.02 260), transparent)" }}
              />
            </div>
          </div>

          {/* Description below screenshot */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <div className="flex-1">
              <h3
                className="text-lg sm:text-xl font-bold text-cream mb-2"
                style={{ fontFamily: "'Sora', sans-serif" }}
              >
                {active.label}
              </h3>
              <p
                className="text-sm sm:text-base text-cream/50 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {active.description}
              </p>
            </div>
            <button
              onClick={() => {
                const pricingEl = document.getElementById("pricing");
                if (pricingEl) pricingEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex items-center gap-2 px-6 py-3 bg-ember hover:bg-ember/90 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-ember/30 hover:shadow-ember/50 cursor-pointer whitespace-nowrap text-sm sm:text-base"
            >
              Get Access
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
