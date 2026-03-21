/**
 * Inside the Circle — Premium Showcase Section
 * Shows portal preview, Discord community proof, template library, and social proof
 * Designed to justify the $497/month investment with billion-dollar brand aesthetic
 */

import { useState } from "react";
import { ChevronRight, Play, Users, FileText, TrendingUp, Lock } from "lucide-react";

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

export default function InsideTheCircle() {
  const [activeTab, setActiveTab] = useState("portal");

  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-ember/5 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-ember/10 border border-ember/20 mb-6">
            <Lock className="w-4 h-4 text-ember" />
            <span className="text-sm font-semibold text-ember uppercase tracking-wider">Inside the Circle</span>
          </div>
          <h2 className="font-heading text-4xl md:text-5xl font-bold text-cream mb-4">
            This Is What You Get
          </h2>
          <p className="text-cream-muted text-lg max-w-2xl mx-auto">
            Live replays, battle-tested templates, private community, and direct access to Marshall. Everything serious contractors need to scale.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-3 justify-center mb-12">
          {SHOWCASE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
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
            <div className="glass-card rounded-2xl p-8 md:p-12 border border-ember/20 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 gap-8 items-center">
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
                  <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-6 border border-white/20 backdrop-blur-sm">
                    <div className="aspect-video bg-gradient-to-br from-ember/30 to-ember/10 rounded-lg flex items-center justify-center mb-4 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
                      <Play className="w-12 h-12 text-ember/60 relative z-10" />
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
            <div className="glass-card rounded-2xl p-8 md:p-12 border border-ember/20 animate-in fade-in duration-500">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="order-2 md:order-1 relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-ember/20 to-transparent rounded-xl blur-2xl group-hover:blur-3xl transition-all duration-500 opacity-0 group-hover:opacity-100" />
                  <div className="relative bg-gradient-to-br from-white/10 to-white/5 rounded-xl p-4 border border-white/20 backdrop-blur-sm">
                    <div className="bg-gradient-to-b from-slate-700 to-slate-800 rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-ember/30" />
                        <div className="flex-1">
                          <div className="h-2 bg-white/10 rounded w-24" />
                          <div className="h-1.5 bg-white/5 rounded w-16 mt-1" />
                        </div>
                      </div>
                      <div className="bg-white/5 rounded p-3 text-xs text-cream-muted">
                        <p className="mb-2">AJ Hoover working on $4.5M bid on Saturday</p>
                        <p className="text-white/40">Real contractors. Real work. Real results.</p>
                      </div>
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
            <div className="glass-card rounded-2xl p-8 md:p-12 border border-ember/20 animate-in fade-in duration-500">
              <h3 className="font-heading text-2xl font-bold text-cream mb-8">
                11+ Premium Templates & SOPs
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {TEMPLATE_PREVIEWS.map((template) => (
                  <div
                    key={template.title}
                    className="group bg-gradient-to-br from-white/10 to-white/5 rounded-lg p-4 border border-white/10 hover:border-ember/50 transition-all duration-300 cursor-pointer hover:shadow-lg hover:shadow-ember/20"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{template.icon}</span>
                      <ChevronRight className="w-4 h-4 text-cream-muted group-hover:text-ember transition-colors" />
                    </div>
                    <h4 className="font-semibold text-cream text-sm mb-1 group-hover:text-ember transition-colors">
                      {template.title}
                    </h4>
                    <p className="text-xs text-cream-muted">{template.category}</p>
                  </div>
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
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Stats */}
                <div className="glass-card rounded-2xl p-8 border border-ember/20">
                  <h3 className="font-heading text-xl font-bold text-cream mb-6">What You Get</h3>
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

                {/* Transformations */}
                <div className="glass-card rounded-2xl p-8 border border-ember/20">
                  <h3 className="font-heading text-xl font-bold text-cream mb-6">Member Results</h3>
                  <div className="space-y-4">
                    {TRANSFORMATION_STATS.map((member) => (
                      <div key={member.name} className="p-4 bg-white/5 rounded-lg border border-white/10 hover:border-ember/30 transition-all">
                        <p className="font-semibold text-cream text-sm">{member.name}</p>
                        <p className="text-ember font-bold text-lg">{member.from} → {member.to}</p>
                        <p className="text-cream-muted text-xs">{member.company}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="glass-card rounded-2xl p-8 md:p-12 border border-ember/20 text-center">
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
    </section>
  );
}
