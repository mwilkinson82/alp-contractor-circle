/*
 * Inside the Circle — Premium Showcase Section
 * Mobile: swipeable carousel with peek effect, dot indicators, auto-cycle, swipe prompt
 * Desktop: prominent tab navigation
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, Play, Users, FileText, TrendingUp, Lock, X, ChevronLeft, ZoomIn, ZoomOut } from "lucide-react";

const SHOWCASE_TABS = [
  { id: "portal", label: "Replay Library", icon: "🎯", shortLabel: "Replays" },
  { id: "discord", label: "Community", icon: "💬", shortLabel: "Community" },
  { id: "templates", label: "Templates", icon: "📄", shortLabel: "Templates" },
  { id: "proof", label: "Results", icon: "📈", shortLabel: "Results" },
];

const TRANSFORMATION_STATS = [
  { name: "Sage Construction", from: "$2M", to: "First Year", company: "ALP Member" },
  { name: "Trojan Roofing", from: "$300K", to: "$10M", company: "First Year" },
  { name: "CNY Group", from: "$600K", to: "$20M", company: "18 months" },
  { name: "Davis Contracting", from: "$1M", to: "$4M", company: "6 months" },
  { name: "Del Monte Builders", from: "$2M", to: "$5M", company: "1 year" },
  { name: "Olive Tree Builds", from: "$1M", to: "$3M", company: "Scaling" },
  { name: "ARC Construction Group", from: "License", to: "$1.5M", company: "<1 year" },
];

// Proposal screenshot — the original one already on CDN
const PROPOSAL_PREVIEW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/proposal-preview.webp";

const TEMPLATE_PREVIEWS = [
  { title: "Contractor Proposal Template", category: "Contracts", icon: "📋", previewImage: PROPOSAL_PREVIEW },
  { title: "Construction Agreement", category: "Legal", icon: "⚖️", previewImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/template_construction_agreement.webp" },
  { title: "Bid Sheet & Estimating", category: "Sales", icon: "💰", previewImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/template_bid_sheet_estimating.webp" },
  { title: "Construction SOPs", category: "Operations", icon: "✅", previewImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/template_construction_sops.webp" },
  { title: "Client Communication SOPs", category: "Management", icon: "📞", previewImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/template_client_onboarding.webp" },
  { title: "Subcontractor Management", category: "Operations", icon: "👥", previewImage: "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/template_subcontractor_management.webp" },
];

const PROOF_STATS = [
  { label: "Founding Members", value: "9 of 50", highlight: true },
  { label: "Bi-Weekly Live Calls", value: "Sundays 5 PM ET", highlight: false },
  { label: "Premium Templates", value: "11+", highlight: false },
  { label: "Private Discord", value: "24/7 Access", highlight: false },
];

// CDN URLs for assets
const REPLAY_THUMBNAIL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/replay-thumbnail.webp";
const DISCORD_SCREENSHOT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/discord-screenshot.png";


// ─── Individual card content panels ──────────────────────────────────────────

function PortalCard({ onTemplateSelect }: { onTemplateSelect?: never }) {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-8 md:p-10 border border-ember/20 h-full">
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 items-center h-full">
        <div>
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-cream mb-3">
            Replay Library
          </h3>
          <p className="text-cream-muted mb-5 leading-relaxed text-sm sm:text-base">
            Every Contractor Circle call is recorded and organized by topic. Watch the ALP Outdoor Living Sales Course, Power Hour sessions, or any past call — on demand.
          </p>
          <ul className="space-y-2.5">
            {["Live call recordings", "Organized by category", "Searchable library", "Lifetime access"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-cream-muted text-sm">
                <div className="w-2 h-2 rounded-full bg-ember flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-ember/20 to-transparent rounded-xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
          <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/20 backdrop-blur-sm overflow-hidden">
            <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden">
              <img src={REPLAY_THUMBNAIL} alt="Replay thumbnail" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-all">
                <div className="w-14 h-14 rounded-full bg-ember/80 flex items-center justify-center group-hover:bg-ember transition-all shadow-lg">
                  <Play className="w-6 h-6 text-white fill-white ml-1" />
                </div>
              </div>
            </div>
            <div className="space-y-2 mt-3">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DiscordCard() {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-8 md:p-10 border border-ember/20 h-full">
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6 items-center h-full">
        <div className="order-2 md:order-1 relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-ember/20 to-transparent rounded-xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
          <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/20 backdrop-blur-sm overflow-hidden">
            <div className="rounded-lg overflow-hidden border-2 border-ember/50 shadow-lg shadow-ember/20">
              <img
                src={DISCORD_SCREENSHOT}
                alt="ALP Discord community — AJ Hoover's $4.5M bid discussion with Marshall"
                className="w-full h-auto block"
                loading="lazy"
              />
            </div>
            <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "oklch(0.72 0.12 55)", boxShadow: "0 0 12px oklch(0.72 0.12 55 / 0.5)" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold text-midnight">LIVE</span>
            </div>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-cream mb-3">
            Private Discord Community
          </h3>
          <p className="text-cream-muted mb-5 leading-relaxed text-sm sm:text-base">
            Join 50 elite contractors in a private Discord. Share deals, ask questions, celebrate wins. See real contractors doing real work — like AJ Hoover managing $4.5M bids on weekends.
          </p>
          <ul className="space-y-2.5">
            {["24/7 member access", "Real deal discussions", "Direct Marshall access", "Exclusive announcements"].map((item) => (
              <li key={item} className="flex items-center gap-3 text-cream-muted text-sm">
                <div className="w-2 h-2 rounded-full bg-ember flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function TemplatesCard({ onSelect }: { onSelect: (t: typeof TEMPLATE_PREVIEWS[0]) => void }) {
  return (
    <div className="glass-card rounded-2xl p-4 sm:p-8 md:p-10 border border-ember/20 h-full">
      <h3 className="font-heading text-lg sm:text-2xl font-bold text-cream mb-4 sm:mb-5">
        11+ Premium Templates & SOPs
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
        {TEMPLATE_PREVIEWS.map((template) => (
          <button
            key={template.title}
            onClick={() => onSelect(template)}
            className="group bg-gradient-to-br from-white/10 to-white/5 rounded-lg p-3 sm:p-4 border border-white/10 hover:border-ember/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-ember/20 text-left"
          >
            <div className="flex items-start justify-between mb-1.5 sm:mb-3">
              <span className="text-lg sm:text-2xl">{template.icon}</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cream-muted group-hover:text-ember transition-colors" />
            </div>
            <h4 className="font-semibold text-cream text-xs sm:text-sm mb-0.5 sm:mb-1 group-hover:text-ember transition-colors leading-tight">
              {template.title}
            </h4>
            <p className="text-[10px] sm:text-xs text-cream-muted">{template.category}</p>
          </button>
        ))}
      </div>
      <p className="text-cream-muted text-xs sm:text-sm mt-4 sm:mt-6 text-center">
        All templates are Google Docs. Make a copy and customize for your business.
      </p>
    </div>
  );
}

function ResultsCard() {
  const RESULT_STATS = [
    { value: "$100M+", label: "Total Revenue Generated", highlight: true },
    { value: "15+", label: "Companies Actively Scaling", highlight: false },
    { value: "33×", label: "Highest Growth Multiple", highlight: true },
    { value: "1 Mo", label: "Fastest Time to Results", highlight: false },
  ];

  return (
    <div className="h-full space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5 sm:p-8 border border-ember/20">
          <h3 className="font-heading text-xl font-bold text-cream mb-4">What You Get</h3>
          <div className="space-y-3">
            {PROOF_STATS.map((stat) => (
              <div
                key={stat.label}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  stat.highlight ? "bg-ember/20 border-ember/50" : "bg-white/5 border-white/10 hover:border-ember/30"
                }`}
              >
                <p className="text-cream-muted text-sm mb-1">{stat.label}</p>
                <p className={`font-heading text-lg font-bold ${stat.highlight ? "text-ember" : "text-cream"}`}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 sm:p-8 border border-ember/20">
          <h3 className="font-heading text-xl font-bold text-cream mb-4">By The Numbers</h3>
          <div className="space-y-3">
            {RESULT_STATS.map((stat) => (
              <div key={stat.label} className={`p-4 rounded-lg border transition-all duration-300 ${
                stat.highlight ? "bg-ember/10 border-ember/30" : "bg-white/5 border-white/10 hover:border-ember/30"
              }`}>
                <p className={`font-heading text-2xl font-black ${stat.highlight ? "text-ember" : "text-cream"}`}>
                  {stat.value}
                </p>
                <p className="text-cream-muted text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-ember/20 text-center">
        <p className="text-cream-muted mb-3">Ready to join the elite contractors scaling their businesses?</p>
        <p className="font-heading text-3xl font-bold text-cream mb-5">
          $497<span className="text-lg text-cream-muted">/month</span>
        </p>
        <button
          onClick={() => {
            const pricingEl = document.getElementById("pricing");
            if (pricingEl) pricingEl.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="px-8 py-3 bg-ember hover:bg-ember/90 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-ember/30 hover:shadow-ember/50 cursor-pointer"
        >
          Become a Founding Member
        </button>
      </div>
    </div>
  );
}

// ─── Template Modal with zoom/scroll ─────────────────────────────────────────

function TemplateModal({ template, onClose }: { template: typeof TEMPLATE_PREVIEWS[0]; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const cycleZoom = () => {
    setZoom((z) => {
      if (z === 1) return 1.5;
      if (z === 1.5) return 2.5;
      return 1;
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={handleBackdrop}
    >
      <div className="bg-background border border-ember/30 rounded-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: "92vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div>
            <h3 className="font-heading text-lg font-bold text-cream">{template.title}</h3>
            <p className="text-xs text-cream-muted">{template.category} · Tap image to zoom</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={cycleZoom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-ember/20 border border-white/10 hover:border-ember/40 transition-all text-xs text-cream-muted hover:text-ember"
              title={zoom < 2.5 ? "Zoom in" : "Reset zoom"}
            >
              {zoom < 2.5 ? <ZoomIn className="w-3.5 h-3.5" /> : <ZoomOut className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{zoom === 1 ? "Zoom" : zoom === 1.5 ? "Closer" : "Reset"}</span>
            </button>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all">
              <X className="w-5 h-5 text-cream-muted hover:text-cream" />
            </button>
          </div>
        </div>

        {/* Scrollable image area */}
        <div
          ref={imgRef}
          className="overflow-auto flex-1 cursor-zoom-in"
          style={{ WebkitOverflowScrolling: "touch" }}
          onClick={cycleZoom}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              width: zoom === 1 ? "100%" : `${100 / zoom}%`,
              transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            <img
              src={template.previewImage}
              alt={template.title}
              className="w-full block"
              draggable={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-cream-muted text-xs leading-relaxed flex-1">
            Members get this template plus 10+ others as Google Docs — make a copy and customize for your business.
          </p>
          <button
            onClick={() => {
              onClose();
              setTimeout(() => {
                const pricingEl = document.getElementById("pricing");
                if (pricingEl) pricingEl.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 150);
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-ember hover:bg-ember/90 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-ember/30 text-sm whitespace-nowrap"
          >
            Access This Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InsideTheCircle() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATE_PREVIEWS[0] | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    setActiveIndex(idx);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % SHOWCASE_TABS.length);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + SHOWCASE_TABS.length) % SHOWCASE_TABS.length);
  }, []);

  // Auto-cycle every 4s — pauses after user interaction
  useEffect(() => {
    if (hasInteracted) return;
    autoPlayRef.current = setInterval(goNext, 4000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [hasInteracted, goNext]);

  // Hide swipe hint after 3s or first interaction
  useEffect(() => {
    const timer = setTimeout(() => setShowSwipeHint(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  const handleUserInteraction = useCallback((idx: number) => {
    setHasInteracted(true);
    setShowSwipeHint(false);
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    goTo(idx);
  }, [goTo]);

  // Touch swipe handling
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // Only treat as horizontal swipe if horizontal movement dominates
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      setHasInteracted(true);
      setShowSwipeHint(false);
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const activeTab = SHOWCASE_TABS[activeIndex].id;

  return (
    <section className="relative py-14 sm:py-20 md:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-ember/5 pointer-events-none" />

      <div className="relative z-10">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-14 md:mb-20 px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember/10 border border-ember/20 mb-6">
            <Lock className="w-4 h-4 text-ember" />
            <span className="text-sm font-semibold text-ember uppercase tracking-wider">Inside the Circle</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-cream mb-4">
            This Is What You Get
          </h2>
          <p className="text-cream-muted text-base sm:text-lg max-w-2xl mx-auto">
            Live replays, battle-tested templates, private community, and direct access to Marshall. Everything serious contractors need to scale.
          </p>
        </div>

        {/* ── DESKTOP: Tab Navigation (hidden on mobile) ── */}
        <div className="hidden sm:flex flex-wrap gap-3 justify-center mb-10 px-4 sm:px-6 lg:px-8">
          {SHOWCASE_TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => handleUserInteraction(i)}
              className={`relative px-6 py-3.5 text-base rounded-xl font-semibold transition-all duration-300 ${
                activeIndex === i
                  ? "bg-ember text-white shadow-xl shadow-ember/40 scale-105"
                  : "bg-white/5 text-cream-muted hover:bg-white/10 border border-white/10 hover:border-ember/30"
              }`}
            >
              {activeIndex === i && (
                <span className="absolute inset-0 rounded-xl animate-pulse opacity-30 bg-ember pointer-events-none" />
              )}
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── MOBILE: Swipe prompt + carousel ── */}
        <div className="sm:hidden">
          {/* Swipe prompt — animated, fades out */}
          <div
            className={`flex items-center justify-center gap-2 mb-4 px-4 transition-all duration-700 ${
              showSwipeHint ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
          >
            <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-ember/15 border border-ember/30">
              <span className="text-ember text-sm font-semibold">Swipe to explore</span>
              {/* Animated arrow */}
              <svg className="w-5 h-5 text-ember animate-bounce-x" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          {/* Mobile tab pills — compact, scrollable */}
          <div className="flex gap-2 px-4 mb-5 overflow-x-auto scrollbar-none pb-1">
            {SHOWCASE_TABS.map((tab, i) => (
              <button
                key={tab.id}
                onClick={() => handleUserInteraction(i)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeIndex === i
                    ? "bg-ember text-white shadow-lg shadow-ember/40"
                    : "bg-white/8 text-cream-muted border border-white/15"
                }`}
                style={activeIndex === i ? { boxShadow: "0 0 16px oklch(0.72 0.12 55 / 0.5)" } : {}}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── MOBILE: Carousel with peek effect ── */}
        <div
          className="sm:hidden relative overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          ref={carouselRef}
        >
          {/* Slide track — each slide is 88vw wide, centered, with peek on right */}
          <div
            className="flex transition-transform duration-400 ease-out"
            style={{ transform: `translateX(calc(${activeIndex * -88}vw + ${activeIndex > 0 ? "0px" : "0px"}))`, paddingLeft: "6vw" }}
          >
            {SHOWCASE_TABS.map((tab, i) => (
              <div
                key={tab.id}
                className="flex-shrink-0 pr-3"
                style={{ width: "88vw" }}
                onClick={() => { if (i !== activeIndex) handleUserInteraction(i); }}
              >
                <div className={`transition-all duration-400 ${i === activeIndex ? "opacity-100 scale-100" : "opacity-50 scale-[0.97]"}`}>
                  {tab.id === "portal" && <PortalCard />}
                  {tab.id === "discord" && <DiscordCard />}
                  {tab.id === "templates" && <TemplatesCard onSelect={(t) => { handleUserInteraction(i); setSelectedTemplate(t); }} />}
                  {tab.id === "proof" && <ResultsCard />}
                </div>
              </div>
            ))}
          </div>

          {/* Prev / Next arrow buttons on mobile */}
          <button
            onClick={() => { handleUserInteraction((activeIndex - 1 + SHOWCASE_TABS.length) % SHOWCASE_TABS.length); }}
            className={`absolute left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeIndex === 0 ? "opacity-0 pointer-events-none" : "opacity-80 hover:opacity-100"
            }`}
            style={{ background: "oklch(0.72 0.12 55 / 0.85)", boxShadow: "0 0 12px oklch(0.72 0.12 55 / 0.4)" }}
            aria-label="Previous"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => { handleUserInteraction((activeIndex + 1) % SHOWCASE_TABS.length); }}
            className={`absolute right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
              activeIndex === SHOWCASE_TABS.length - 1 ? "opacity-0 pointer-events-none" : "opacity-80 hover:opacity-100"
            }`}
            style={{ background: "oklch(0.72 0.12 55 / 0.85)", boxShadow: "0 0 12px oklch(0.72 0.12 55 / 0.4)" }}
            aria-label="Next"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Dot indicators (mobile only) ── */}
        <div className="sm:hidden flex items-center justify-center gap-2 mt-5 px-4">
          {SHOWCASE_TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => handleUserInteraction(i)}
              aria-label={`Go to ${tab.label}`}
              className="transition-all duration-300"
            >
              <div
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIndex ? 24 : 8,
                  height: 8,
                  background: i === activeIndex ? "oklch(0.72 0.12 55)" : "oklch(0.72 0.12 55 / 0.3)",
                  boxShadow: i === activeIndex ? "0 0 8px oklch(0.72 0.12 55 / 0.6)" : "none",
                }}
              />
            </button>
          ))}
        </div>

        {/* Progress bar — auto-cycle indicator (mobile only, when not interacted) */}
        {!hasInteracted && (
          <div className="sm:hidden mt-3 px-6">
            <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div
                key={activeIndex}
                className="h-full bg-ember rounded-full"
                style={{ animation: "progress-fill 4s linear forwards" }}
              />
            </div>
          </div>
        )}

        {/* ── DESKTOP: Tab content ── */}
        <div className="hidden sm:block max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-96">
            {activeTab === "portal" && <PortalCard />}
            {activeTab === "discord" && <DiscordCard />}
            {activeTab === "templates" && <TemplatesCard onSelect={setSelectedTemplate} />}
            {activeTab === "proof" && <ResultsCard />}
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <TemplateModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </section>
  );
}
