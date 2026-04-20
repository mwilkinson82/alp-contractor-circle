/**
 * ConstructLineHub — Entry point for the ConstructLine suite.
 *
 * Triggers Rate Setup Wizard on first visit (no saved config).
 * Shows recent takeoff projects, four module launch cards, and a changelog feed.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Ruler,
  Database,
  HardHat,
  GanttChart,
  ArrowRight,
  Settings2,
  Sparkles,
  ChevronRight,
  FileStack,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Loader2,
  Plus,
  Layers,
  Zap,
  Wrench,
  Palette,
  ScanLine,
  DollarSign,
  BarChart3,
  PenTool,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import { ConstructLineWordmark } from "@/components/ConstructLineBrand";
import RateSetupWizard, {
  loadRateConfig,
  saveRateConfig,
  type RateSetupConfig,
} from "@/components/RateSetupWizard";
import { trpc } from "@/lib/trpc";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft:           { label: "Draft",      color: "text-gray-400",    icon: FileText },
  uploading:       { label: "Uploading",  color: "text-blue-400",    icon: Upload },
  processing:      { label: "Processing", color: "text-amber-400",   icon: Loader2 },
  post_processing: { label: "Processing", color: "text-amber-400",   icon: Loader2 },
  completed:       { label: "Completed",  color: "text-emerald-400", icon: CheckCircle2 },
  error:           { label: "Error",      color: "text-red-400",     icon: AlertCircle },
};

// ─── Module Cards ──────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: "scheduler",
    label: "C1",
    name: "CPM Schedule",
    description: "Build critical path method schedules, track float, and generate Gantt charts for your projects.",
    icon: GanttChart,
    path: "/portal/scheduler",
    accent: "from-amber-500/20 to-amber-500/5",
    border: "hover:border-amber-500/40",
    iconBg: "bg-amber-500/15",
    iconColor: "text-amber-400",
    badgeColor: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    glow: "group-hover:shadow-amber-500/15",
    featured: true,
  },
  {
    id: "takeoff",
    label: "C2",
    name: "Quantity Takeoff",
    description: "Upload drawings, auto-detect dimensions, and generate material quantities with the ConstructLine CV engine.",
    icon: Ruler,
    path: "/portal/takeoff",
    accent: "from-orange-500/15 to-orange-500/5",
    border: "hover:border-orange-500/30",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-400",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    glow: "group-hover:shadow-orange-500/10",
  },
  {
    id: "cost-library",
    label: "C3",
    name: "Cost Library",
    description: "Maintain material unit costs across all CSI divisions. Sync ConstructLine baseline pricing or enter your own negotiated rates.",
    icon: Database,
    path: "/portal/cost-library",
    accent: "from-blue-500/15 to-blue-500/5",
    border: "hover:border-blue-500/30",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    glow: "group-hover:shadow-blue-500/10",
  },
  {
    id: "labor-library",
    label: "C4",
    name: "Trade Rate Library",
    description: "Configure RS Means-calibrated labor rates for your crews. Set work type, region, and specialty to get accurate fully-burdened rates.",
    icon: HardHat,
    path: "/portal/labor-library",
    accent: "from-emerald-500/15 to-emerald-500/5",
    border: "hover:border-emerald-500/30",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-400",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    glow: "group-hover:shadow-emerald-500/10",
  },
];

// ─── Changelog data (mirrors WhatsNewModal) ────────────────────────────────────
const CHANGELOG = [
  {
    version: "2026.04.19",
    date: "April 19, 2026",
    title: "Task-Based Labor Grouping",
    highlights: [
      { icon: Layers, label: "Task-Based Labor Grouping", description: "ConstructLine now clusters related takeoff items into named installation tasks and assigns one crew per task — dramatically improving labor accuracy.", tag: "new" as const },
      { icon: Wrench, label: "Inline Crew Editing", description: "Swap, add, or remove crews directly in the Labor Review Panel before confirming — no need to navigate to Trade Rate Library.", tag: "new" as const },
      { icon: Settings2, label: "ConstructLine Hub", description: "Dedicated hub page at /portal/constructline with recent projects, module cards, and this changelog feed.", tag: "new" as const },
    ],
  },
  {
    version: "2026.04.17",
    date: "April 17, 2026",
    title: "Trade Specialty Intelligence & Branding",
    highlights: [
      { icon: Wrench, label: "Trade Specialty Intelligence", description: "18 specialties across 8 CSI divisions. Auto-detects specialties from drawings and generates specialty-specific line items.", tag: "new" as const },
      { icon: Palette, label: "Branded ConstructLine Experience", description: "Consistent ConstructLine branding throughout — sidebar, headers, processing overlay, modals, and analysis screens.", tag: "improved" as const },
      { icon: Sparkles, label: "Cinematic Splash Animation", description: "New branded splash intro when the ConstructLine engine starts analyzing your drawings.", tag: "new" as const },
    ],
  },
  {
    version: "2026.04.16",
    date: "April 16, 2026",
    title: "Measurement Tools & Drawing Markup",
    highlights: [
      { icon: Ruler, label: "On-Drawing Measurements", description: "Measure distances, areas, and perimeters directly on your construction drawings. Auto-calibrate from known dimensions.", tag: "new" as const },
      { icon: PenTool, label: "Drawing Markup Mode", description: "Annotate drawings with freehand, lines, rectangles, circles, arrows, and text.", tag: "new" as const },
      { icon: ScanLine, label: "Fullscreen Drawing Viewer", description: "View any drawing sheet in fullscreen with smooth pan and zoom.", tag: "new" as const },
    ],
  },
  {
    version: "2026.04.14",
    date: "April 14, 2026",
    title: "Consolidate & Enhance + Bid Calculator",
    highlights: [
      { icon: Layers, label: "Consolidate & Enhance", description: "One-click post-processing that merges duplicates, converts lump sums, calculates concrete volumes, and enforces scope compliance.", tag: "new" as const },
      { icon: DollarSign, label: "Bid Calculator", description: "Apply overhead, profit, contingency, and bond percentages to your takeoff total. Export a bid-ready summary.", tag: "new" as const },
      { icon: BarChart3, label: "CPM Schedule Reports", description: "Resource Leveling, Earned Value Management, Cash Flow S-Curve, Resource Histogram, Delay Analysis, and more.", tag: "new" as const },
    ],
  },
];

const TAG_STYLES = {
  new:      "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  improved: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  fix:      "bg-blue-500/15 text-blue-300 border-blue-500/25",
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function ConstructLineHub() {
  const [, navigate] = useLocation();

  // Wizard state — fires on first visit (no saved config)
  const [rateConfig, setRateConfig] = useState<RateSetupConfig | null>(loadRateConfig());
  const [showWizard, setShowWizard] = useState(!loadRateConfig());

  // Recent projects + quick stats
  const { data: projects } = trpc.takeoff.listProjects.useQuery();
  const recentProjects = (projects ?? []).slice(0, 3);

  // Quick stats derived from project list
  const totalProjects = projects?.length ?? 0;
  const activeProjects = (projects ?? []).filter(
    (p) => p.status === "processing" || p.status === "post_processing" || p.status === "uploading"
  ).length;
  const totalEstimatedValue = (projects ?? []).reduce(
    (sum, p) => sum + (p.totalEstimatedCost ?? 0),
    0
  );
  const lastActivityDate = projects && projects.length > 0
    ? new Date(Math.max(...projects.map((p) => new Date(p.updatedAt).getTime())))
    : null;

  // Rate profiles for badge display
  const { data: rateProfilesList } = trpc.tradeRates.listRateProfiles.useQuery();
  const profileNameMap = new Map((rateProfilesList ?? []).map((p: any) => [p.id, p.name]));

  const configureMutation = trpc.tradeRates.configureRates.useMutation({
    onSuccess: () => {
      toast.success("ConstructLine configured — your rates are ready.");
    },
  });

  const handleWizardComplete = (config: RateSetupConfig) => {
    setRateConfig(config);
    saveRateConfig(config);
    setShowWizard(false);
    configureMutation.mutate({
      laborType: config.laborType,
      regionCode: config.regionCode ?? null,
      regionMultiplier: config.regionMultiplier ?? 10000,
      specialtyMultiplier: config.specialtyMultiplier ?? 10000,
    });
  };

  const configSummary = rateConfig
    ? [
        rateConfig.workType === "residential" ? "Residential" : "Commercial",
        rateConfig.shopType === "union" ? "Union" : "Open Shop",
        rateConfig.regionName ?? "National Average",
      ].join(" · ")
    : null;

  return (
    <div className="min-h-screen bg-navy-deep">

      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <div className="border-b border-white/5 bg-navy/70 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <ConstructLineWordmark size="md" showSubtitle />
          <div className="flex items-center gap-3">
            {configSummary && (
              <span className="text-xs text-cream-muted hidden md:block">{configSummary}</span>
            )}
            <Button
              data-tour="hub-configure-rates"
              variant="ghost"
              size="sm"
              className="text-cream-muted hover:text-cream gap-1.5"
              onClick={() => setShowWizard(true)}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configure Rates</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-8 pb-20">

        {/* ── Quick Stats Bar ────────────────────────────────────────── */}
        {totalProjects > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="rounded-xl border border-white/8 bg-white/2 px-4 py-3">
              <p className="text-[10px] text-cream-muted uppercase tracking-wider mb-1">Total Projects</p>
              <p className="text-2xl font-bold text-white">{totalProjects}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/2 px-4 py-3">
              <p className="text-[10px] text-cream-muted uppercase tracking-wider mb-1">Est. Portfolio Value</p>
              <p className="text-2xl font-bold text-amber-400">
                {totalEstimatedValue > 0
                  ? `$${(totalEstimatedValue / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                  : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/2 px-4 py-3">
              <p className="text-[10px] text-cream-muted uppercase tracking-wider mb-1">Last Activity</p>
              <p className="text-2xl font-bold text-white">
                {lastActivityDate ? lastActivityDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
              </p>
              {activeProjects > 0 && (
                <p className="text-[10px] text-emerald-400 mt-0.5">{activeProjects} active</p>
              )}
            </div>
          </div>
        )}

        {/* ── Two-column layout: main content + sidebar ──────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: main content (2 cols) ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Hero */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-medium">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Estimating Suite
                </Badge>
                {rateConfig && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                )}
              </div>
            <h1 data-tour="hub-hero" className="text-4xl font-bold text-white tracking-tight mb-3">
              Construct<span className="text-amber-400">Line</span>
            </h1>
              <p className="text-cream-muted text-base max-w-xl leading-relaxed">
                Your complete construction estimating platform. Takeoff quantities, build cost libraries, configure labor rates, and generate winning proposals — all in one place.
              </p>

              {/* Rate config prompt if not configured */}
              {!rateConfig && (
                <div
                  className="mt-5 flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25 cursor-pointer hover:bg-amber-500/12 transition-colors"
                  onClick={() => setShowWizard(true)}
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Settings2 className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-300 font-semibold">Set up your labor rates to get started</p>
                    <p className="text-xs text-amber-400/70 mt-0.5">Takes 60 seconds — calibrates all trade rates to your work type and region</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400/60 shrink-0" />
                </div>
              )}
            </div>

            {/* Recent Projects */}
            <div data-tour="hub-recent-projects">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cream-muted" />
                  <h2 className="text-sm font-semibold text-cream uppercase tracking-wider">Recent Projects</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-cream-muted hover:text-cream text-xs gap-1.5"
                  onClick={() => navigate("/portal/takeoff")}
                >
                  <Plus className="w-3.5 h-3.5" />
                  New Project
                </Button>
              </div>

              {recentProjects.length === 0 ? (
                <button
                  onClick={() => navigate("/portal/takeoff")}
                  className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-dashed border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
                >
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-amber-500/10">
                    <FileStack className="w-4 h-4 text-cream-muted group-hover:text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-cream-muted group-hover:text-cream">No projects yet</p>
                    <p className="text-xs text-cream-muted/60">Click to start your first takeoff</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-amber-400/60 ml-auto" />
                </button>
              ) : (
                <div className="space-y-2">
                  {recentProjects.map((project) => {
                    const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
                    const StatusIcon = status.icon;
                    const isSpinning = project.status === "processing" || project.status === "post_processing";
                    return (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/takeoff/${project.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/2 hover:border-amber-500/20 hover:bg-amber-500/5 transition-all group text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-amber-500/8 flex items-center justify-center shrink-0">
                          <Ruler className="w-4 h-4 text-amber-400/70" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-cream truncate">{project.name}</p>
                          <p className="text-xs text-cream-muted/60">
                            {project.totalSheets} sheet{project.totalSheets !== 1 ? "s" : ""} · {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {(project as any).rateProfileId && profileNameMap.has((project as any).rateProfileId) && (
                          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/25 truncate max-w-[100px]">
                            {profileNameMap.get((project as any).rateProfileId)}
                          </span>
                        )}
                        <div className={`flex items-center gap-1.5 text-xs ${status.color} shrink-0`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                          <span className="hidden sm:inline">{status.label}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-amber-400/50 shrink-0" />
                      </button>
                    );
                  })}
                  {(projects?.length ?? 0) > 3 && (
                    <button
                      onClick={() => navigate("/portal/takeoff")}
                      className="w-full text-center text-xs text-cream-muted hover:text-amber-400 py-2 transition-colors"
                    >
                      View all {projects!.length} projects →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Module Cards */}
            <div data-tour="hub-module-cards">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-cream-muted" />
                <h2 className="text-sm font-semibold text-cream uppercase tracking-wider">Tools</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isFeatured = (mod as any).featured;
                  return (
                    <button
                      key={mod.id}
                      onClick={() => navigate(mod.path)}
                      className={`group text-left rounded-xl border bg-gradient-to-br ${mod.accent} p-5 ${mod.border} hover:shadow-lg ${mod.glow} transition-all duration-200 ${
                        isFeatured
                          ? "border-amber-500/30 ring-1 ring-amber-500/20 shadow-md shadow-amber-500/5"
                          : "border-white/8"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${mod.iconBg} flex items-center justify-center`}>
                            <Icon className={`w-4.5 h-4.5 ${mod.iconColor}`} />
                          </div>
                          <Badge className={`text-xs font-mono ${mod.badgeColor}`}>{mod.label}</Badge>
                          {isFeatured && (
                            <Badge className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/25 animate-pulse">
                              <Zap className="w-2.5 h-2.5 mr-0.5" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <h3 className="text-base font-semibold text-white mb-1.5">{mod.name}</h3>
                      <p className="text-sm text-cream-muted leading-relaxed">{mod.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* ── Right: Changelog sidebar ──────────────────────────────── */}
          <div data-tour="hub-whats-new" className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Newspaper className="w-4 h-4 text-cream-muted" />
              <h2 className="text-sm font-semibold text-cream uppercase tracking-wider">What's New</h2>
            </div>

            <div className="space-y-4">
              {CHANGELOG.map((entry, entryIdx) => (
                <div
                  key={entry.version}
                  className={`rounded-xl border border-white/8 overflow-hidden ${entryIdx === 0 ? "border-amber-500/20 bg-amber-500/3" : "bg-white/2"}`}
                >
                  {/* Entry header */}
                  <div className={`px-4 py-3 border-b border-white/5 flex items-center justify-between ${entryIdx === 0 ? "bg-amber-500/8" : "bg-white/3"}`}>
                    <div>
                      <p className="text-xs font-semibold text-cream">{entry.title}</p>
                      <p className="text-[10px] text-cream-muted/60 mt-0.5">{entry.date}</p>
                    </div>
                    {entryIdx === 0 && (
                      <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[9px]">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                        Latest
                      </Badge>
                    )}
                  </div>

                  {/* Highlights */}
                  <div className="divide-y divide-white/5">
                    {entry.highlights.map((h, hi) => {
                      const HIcon = h.icon;
                      return (
                        <div key={hi} className="px-4 py-3 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                            <HIcon className="w-3 h-3 text-cream-muted" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                              <p className="text-xs font-medium text-cream">{h.label}</p>
                              {h.tag && (
                                <Badge className={`${TAG_STYLES[h.tag]} text-[9px] font-medium px-1.5 py-0`}>
                                  {h.tag === "new" ? "New" : h.tag === "improved" ? "Improved" : "Fix"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-cream-muted/70 leading-relaxed">{h.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Rate Setup Wizard */}
      <RateSetupWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={handleWizardComplete}
        isApplying={configureMutation.isPending}
        existingConfig={rateConfig}
      />
    </div>
  );
}
