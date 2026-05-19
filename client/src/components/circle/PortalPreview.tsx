import { useState } from "react";
import { Monitor, Layout, Play, FileText, ChevronRight } from "lucide-react";

const PORTAL_SCREENSHOTS = [
  {
    id: "dashboard",
    label: "Member Dashboard",
    icon: Layout,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/portal-dashboard-preview.png",
    description: "Your command center — upcoming calls, quick links, question submission, and everything you need in one place.",
  },
  {
    id: "replays",
    label: "Replay Library",
    icon: Play,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/portal-replay-preview.png",
    description: "Every Contractor Circle call, bootcamp, and masterclass recorded and organized. Watch on demand, anytime.",
  },
  {
    id: "templates",
    label: "Template Library",
    icon: FileText,
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/portal-templates-preview.png",
    description: "11+ battle-tested templates — proposals, contracts, SOPs, bid sheets — built on the ALP framework. Ready to use.",
  },
];

export function PortalPreview() {
  const [activeTab, setActiveTab] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
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
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-12 sm:mb-16">
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

        {/* Card display with proper 3D perspective */}
        <div className="relative mb-12 sm:mb-16" style={{ perspective: "1800px" }}>
          {/* Reflection/shadow on surface beneath */}
          <div
            className="absolute -bottom-8 left-[10%] right-[10%] h-16 rounded-[50%] blur-2xl pointer-events-none transition-all duration-500"
            style={{
              background: isHovered
                ? "radial-gradient(ellipse, oklch(0.72 0.12 55 / 0.25), transparent 70%)"
                : "radial-gradient(ellipse, oklch(0.72 0.12 55 / 0.15), transparent 70%)",
            }}
          />

          <div
            className="relative w-full rounded-2xl overflow-hidden transition-all duration-700 ease-out"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
              transform: isHovered
                ? "rotateX(0deg) scale(1.01)"
                : "rotateX(8deg)",
              transformOrigin: "center bottom",
              boxShadow: isHovered
                ? "0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(255,127,80,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"
                : "0 40px 100px rgba(0,0,0,0.6), 0 0 40px rgba(255,127,80,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {/* Browser chrome bar */}
            <div className="bg-[#1a1a2e] border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white/[0.06] rounded-md px-4 py-1 text-xs text-cream/30 font-mono max-w-xs w-full text-center">
                  app.alpcontractorcircle.com/login
                </div>
              </div>
              <div className="w-12" />
            </div>

            {/* Screenshot image — object-top so the top of the page is always visible */}
            <img
              src={active.image}
              alt={active.label}
              className="w-full block"
              loading="lazy"
            />

            {/* Gradient fade at bottom to blend into page */}
            <div
              className="absolute bottom-0 left-0 right-0 h-20 sm:h-28 pointer-events-none"
              style={{ background: "linear-gradient(to top, oklch(0.12 0.02 260), transparent)" }}
            />

            {/* Subtle screen glare effect */}
            <div
              className="absolute inset-0 pointer-events-none transition-opacity duration-700"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.01) 100%)",
                opacity: isHovered ? 0.6 : 1,
              }}
            />
          </div>
        </div>

        {/* Description and CTA below */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 max-w-2xl mx-auto">
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
    </section>
  );
}
