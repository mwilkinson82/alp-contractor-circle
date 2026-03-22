/*
 * Inside the Circle — Premium Showcase Section
 * Shows portal preview, Discord community proof, template library, and social proof
 * Designed to justify the $497/month investment with billion-dollar brand aesthetic
 */

import { useState } from "react";
import { ChevronRight, Play, Users, FileText, TrendingUp, Lock, X } from "lucide-react";

const SHOWCASE_TABS = [
  { id: "portal", label: "Portal Preview", icon: "🎯" },
  { id: "discord", label: "Community", icon: "💬" },
  { id: "templates", label: "Templates", icon: "📄" },
  { id: "proof", label: "Results", icon: "📈" },
];

const TRANSFORMATION_STATS = [
  { name: "Ronnie Silva", from: "$2M", to: "First Year", company: "Sage Construction" },
  { name: "Morgan Tyler", from: "$300K", to: "$10M", company: "Trojan Roofing" },
  { name: "Brian Betancourt", from: "$600K", to: "$20M", company: "18 months" },
  { name: "Julius Davis", from: "$1M", to: "$4M", company: "6 months" },
  { name: "Dan Del Monte", from: "$2M", to: "$5M", company: "1 year" },
  { name: "Nathan Oliveira", from: "$1M", to: "$3M", company: "Scaling" },
  { name: "Andy Ramirez", from: "License", to: "$1.5M", company: "<1 year" },
];

const TEMPLATE_PREVIEWS = [
  { title: "Contractor Proposal Template", category: "Contracts", icon: "📋" },
  { title: "Construction Agreement", category: "Legal", icon: "⚖️" },
  { title: "Bid Sheet & Estimating", category: "Sales", icon: "💰" },
  { title: "Construction SOPs", category: "Operations", icon: "✅" },
  { title: "Client Communication SOPs", category: "Management", icon: "📞" },
  { title: "Subcontractor Management", category: "Operations", icon: "👥" },
];

const PROOF_STATS = [
  { label: "Founding Members", value: "4 of 50", highlight: true },
  { label: "Bi-Weekly Live Calls", value: "Sundays 5 PM ET", highlight: false },
  { label: "Premium Templates", value: "11+", highlight: false },
  { label: "Private Discord", value: "24/7 Access", highlight: false },
];

// CDN URLs for assets
const REPLAY_THUMBNAIL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Screenshot2026-03-21at7.52.43PM_536195dc.webp";
const DISCORD_SCREENSHOT = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Screenshot2026-03-21at6.10.42PM_2d4e8f1a.webp";
const TEMPLATE_PREVIEW = "https://d2xsxph8kpxj0f.cloudfront.net/310519663332724241/JYLdJEaFQZebZwtiasWNpQ/Screenshot2026-03-21at7.55.32PM_565e119b.webp";

export default function InsideTheCircle() {
  const [activeTab, setActiveTab] = useState("portal");
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATE_PREVIEWS[0] | null>(null);

  return (
    <section className="relative py-14 sm:py-20 md:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-ember/5 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-16 md:mb-20">
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

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mb-8 sm:mb-12">
          {SHOWCASE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base rounded-lg font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? "bg-ember text-white shadow-lg shadow-ember/30"
                  : "bg-white/5 text-cream-muted hover:bg-white/10 border border-white/10"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-96">
          {/* Portal Preview */}
          {activeTab === "portal" && (
            <div className="glass-card rounded-2xl p-5 sm:p-8 md:p-12 border border-ember/20 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
                <div>
                  <h3 className="font-heading text-2xl font-bold text-cream mb-4">
                    Replay Library
                  </h3>
                  <p className="text-cream-muted mb-6 leading-relaxed">
                    Every Contractor Circle call is recorded and organized by topic. Members access replays on demand — watch the ALP Outdoor Living Sales Course, Power Hour strategy sessions, or any past call.
                  </p>
                  <ul className="space-y-3">
                    {["Live call recordings", "Organized by category", "Searchable library", "Lifetime access"].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-cream-muted">
                        <div className="w-2 h-2 rounded-full bg-ember" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-ember/20 to-transparent rounded-xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                  <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-6 border border-white/20 backdrop-blur-sm overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                      {/* Thumbnail image */}
                      <img
                        src={REPLAY_THUMBNAIL}
                        alt="Replay thumbnail"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {/* Play button overlay */}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-all">
                        <div className="w-14 h-14 rounded-full bg-ember/80 flex items-center justify-center group-hover:bg-ember transition-all shadow-lg">
                          <Play className="w-6 h-6 text-white fill-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                      <div className="h-2 bg-white/5 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Discord Community */}
          {activeTab === "discord" && (
            <div className="glass-card rounded-2xl p-5 sm:p-8 md:p-12 border border-ember/20 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center">
                <div className="order-2 md:order-1 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-ember/20 to-transparent rounded-xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                  <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/20 backdrop-blur-sm overflow-hidden">
                    {/* Discord-style chat UI illustration */}
                    <div className="rounded-lg overflow-hidden border-2 border-ember/50 shadow-lg shadow-ember/20" style={{ background: "#1e1f22" }}>
                      {/* Discord sidebar + main layout */}
                      <div className="flex" style={{ minHeight: 260 }}>
                        {/* Sidebar */}
                        <div className="flex flex-col gap-1 p-2 shrink-0" style={{ width: 48, background: "#1e1f22", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                          {/* Server icon */}
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white mb-1" style={{ background: "oklch(0.72 0.12 55)" }}>A</div>
                          <div className="w-8 h-[1px] mx-auto" style={{ background: "rgba(255,255,255,0.1)" }} />
                          {["#","@","🔔"].map((icon, i) => (
                            <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>{icon}</div>
                          ))}
                        </div>
                        {/* Channel list */}
                        <div className="flex flex-col p-2 shrink-0" style={{ width: 120, background: "#2b2d31", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                          <p className="text-[9px] font-bold uppercase tracking-wider mb-2 px-1" style={{ color: "rgba(255,255,255,0.35)" }}>ALP Circle</p>
                          {["# general","# deal-reviews","# wins","# templates","# announcements"].map((ch, i) => (
                            <div key={ch} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] mb-0.5" style={{ background: i === 1 ? "rgba(255,255,255,0.08)" : "transparent", color: i === 1 ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.4)" }}>
                              <span>{ch}</span>
                            </div>
                          ))}
                          <p className="text-[9px] font-bold uppercase tracking-wider mt-3 mb-1 px-1" style={{ color: "rgba(255,255,255,0.25)" }}>Members</p>
                          {["Marshall W.","AJ Hoover","Brian B."].map((name) => (
                            <div key={name} className="flex items-center gap-1.5 px-1 py-0.5">
                              <div className="w-4 h-4 rounded-full shrink-0" style={{ background: "oklch(0.72 0.12 55 / 0.6)" }} />
                              <span className="text-[9px] truncate" style={{ color: "rgba(255,255,255,0.45)" }}>{name}</span>
                            </div>
                          ))}
                        </div>
                        {/* Chat area */}
                        <div className="flex-1 flex flex-col p-3 gap-2 overflow-hidden" style={{ background: "#313338" }}>
                          <p className="text-[9px] font-bold" style={{ color: "rgba(255,255,255,0.25)" }}># deal-reviews</p>
                          {[
                            { name: "Marshall W.", color: "oklch(0.72 0.12 55)", msg: "Let's break down AJ's $4.5M bid. First — your margin is too thin on labor. Here's how to fix it 👇", time: "Today at 5:02 PM" },
                            { name: "AJ Hoover", color: "#7289da", msg: "Just closed it. $4.5M contract signed. This community is unreal 🔥", time: "Today at 5:18 PM" },
                            { name: "Brian B.", color: "#43b581", msg: "From $600K to $20M in 18 months. The deal review sessions are the reason.", time: "Today at 5:31 PM" },
                          ].map((m) => (
                            <div key={m.name} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full shrink-0 mt-0.5" style={{ background: m.color + "80" }} />
                              <div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-[10px] font-semibold" style={{ color: m.color }}>{m.name}</span>
                                  <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.25)" }}>{m.time}</span>
                                </div>
                                <p className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>{m.msg}</p>
                              </div>
                            </div>
                          ))}
                          {/* Input bar */}
                          <div className="mt-auto rounded-lg px-3 py-2 text-[10px]" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            Message #deal-reviews
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Live badge */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "oklch(0.72 0.12 55)", boxShadow: "0 0 12px oklch(0.72 0.12 55 / 0.5)" }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] font-bold text-midnight">LIVE</span>
                    </div>
                  </div>
                </div>
                <div className="order-1 md:order-2">
                  <h3 className="font-heading text-2xl font-bold text-cream mb-4">
                    Private Discord Community
                  </h3>
                  <p className="text-cream-muted mb-6 leading-relaxed">
                    Join 50 elite contractors in a private Discord. Share deals, ask questions, celebrate wins. See real contractors doing real work — like AJ Hoover managing $4.5M bids on weekends.
                  </p>
                  <ul className="space-y-3">
                    {["24/7 member access", "Real deal discussions", "Direct Marshall access", "Exclusive announcements"].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-cream-muted">
                        <div className="w-2 h-2 rounded-full bg-ember" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Templates */}
          {activeTab === "templates" && (
            <div className="glass-card rounded-2xl p-5 sm:p-8 md:p-12 border border-ember/20 animate-in fade-in duration-500">
              <h3 className="font-heading text-xl sm:text-2xl font-bold text-cream mb-5 sm:mb-8">
                11+ Premium Templates & SOPs
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {TEMPLATE_PREVIEWS.map((template) => (
                  <button
                    key={template.title}
                    onClick={() => setSelectedTemplate(template)}
                    className="group bg-gradient-to-br from-white/10 to-white/5 rounded-lg p-4 border border-white/10 hover:border-ember/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-ember/20 text-left"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{template.icon}</span>
                      <ChevronRight className="w-4 h-4 text-cream-muted group-hover:text-ember transition-colors" />
                    </div>
                    <h4 className="font-semibold text-cream text-sm mb-1 group-hover:text-ember transition-colors">
                      {template.title}
                    </h4>
                    <p className="text-xs text-cream-muted">{template.category}</p>
                  </button>
                ))}
              </div>
              <p className="text-cream-muted text-sm mt-8 text-center">
                All templates are Google Docs. Make a copy and customize for your business. Used across $2.5B+ in construction projects.
              </p>
            </div>
          )}

          {/* Social Proof */}
          {activeTab === "proof" && (
            <div className="animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 gap-5 sm:gap-8 mb-8 sm:mb-12">
                {/* Stats */}
                <div className="glass-card rounded-2xl p-5 sm:p-8 border border-ember/20">
                  <h3 className="font-heading text-xl font-bold text-cream mb-4 sm:mb-6">What You Get</h3>
                  <div className="space-y-4">
                    {PROOF_STATS.map((stat) => (
                      <div
                        key={stat.label}
                        className={`p-4 rounded-lg border transition-all duration-300 ${
                          stat.highlight
                            ? "bg-ember/20 border-ember/50"
                            : "bg-white/5 border-white/10 hover:border-ember/30"
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

                {/* Transformations - Scrollable */}
                <div className="glass-card rounded-2xl p-5 sm:p-8 border border-ember/20">
                  <h3 className="font-heading text-xl font-bold text-cream mb-4 sm:mb-6">Member Results</h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-ember/30 scrollbar-track-white/5">
                    {TRANSFORMATION_STATS.map((member) => (
                      <div key={member.name} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-ember/30 transition-all">
                        <p className="font-semibold text-cream text-sm">{member.name}</p>
                        <p className="text-ember font-bold text-base">{member.from} → {member.to}</p>
                        <p className="text-cream-muted text-xs">{member.company}</p>
                      </div>
                    ))}
                    <div className="p-4 bg-ember/10 rounded-lg border border-ember/30 text-center">
                      <p className="text-cream-muted text-sm font-semibold">Plus dozens more inside the Circle</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="glass-card rounded-2xl p-6 sm:p-8 md:p-12 border border-ember/20 text-center">
                <p className="text-cream-muted mb-4">Ready to join the elite contractors scaling their businesses?</p>
                <p className="font-heading text-3xl font-bold text-cream mb-6">
                  $497<span className="text-lg text-cream-muted">/month</span>
                </p>
                <button className="px-8 py-3 bg-ember hover:bg-ember/90 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-ember/30 hover:shadow-ember/50">
                  Become a Founding Member
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-background border border-ember/30 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-in scale-in duration-300">
            {/* Modal Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-background/95 backdrop-blur">
              <div>
                <h3 className="font-heading text-xl font-bold text-cream">{selectedTemplate.title}</h3>
                <p className="text-sm text-cream-muted">{selectedTemplate.category}</p>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <X className="w-5 h-5 text-cream-muted hover:text-cream" />
              </button>
            </div>

            {/* Modal Content - Template Preview */}
            <div className="p-6">
              <img
                src={TEMPLATE_PREVIEW}
                alt={selectedTemplate.title}
                className="w-full rounded-lg border border-white/10 shadow-lg"
              />
              <p className="text-cream-muted text-sm mt-6 leading-relaxed">
                This is a preview of the {selectedTemplate.title}. When you join the Contractor Circle, you'll get access to this template and 10+ others. All templates are Google Docs — simply make a copy and customize for your business.
              </p>
              <button className="w-full mt-6 px-6 py-3 bg-ember hover:bg-ember/90 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg shadow-ember/30">
                Access This Template
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
