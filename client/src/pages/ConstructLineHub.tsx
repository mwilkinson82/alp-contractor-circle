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
  Search,
  SlidersHorizontal,
  ClipboardCheck,
  ShieldCheck,
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
  draft:           { label: "Draft",      color: "bg-white text-[#716855] border-[#d7c7aa]",    icon: FileText },
  uploading:       { label: "Uploading",  color: "bg-blue-50 text-[#244c91] border-blue-200",    icon: Upload },
  processing:      { label: "Processing", color: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]",   icon: Loader2 },
  post_processing: { label: "Processing", color: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]",   icon: Loader2 },
  completed:       { label: "Completed",  color: "bg-emerald-50 text-emerald-800 border-emerald-300", icon: CheckCircle2 },
  error:           { label: "Error",      color: "bg-orange-50 text-orange-800 border-orange-300",     icon: AlertCircle },
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
    tone: "amber",
    proof: "Plan dates, float, and project logic",
    featured: true,
  },
  {
    id: "takeoff",
    label: "C2",
    name: "Quantity Takeoff",
    description: "Upload drawings, auto-detect dimensions, and generate material quantities with the ConstructLine CV engine.",
    icon: Ruler,
    path: "/portal/takeoff",
    tone: "green",
    proof: "Review scope, accept rows, price the bid",
  },
  {
    id: "cost-library",
    label: "C3",
    name: "Cost Library",
    description: "Maintain material unit costs across all CSI divisions. Sync ConstructLine baseline pricing or enter your own negotiated rates.",
    icon: Database,
    path: "/portal/cost-library",
    tone: "blue",
    proof: "Material pricing with audit trail",
  },
  {
    id: "labor-library",
    label: "C4",
    name: "Trade Rate Library",
    description: "Configure RS Means-calibrated labor rates for your crews. Set work type, region, and specialty to get accurate fully-burdened rates.",
    icon: HardHat,
    path: "/portal/labor-library",
    tone: "gray",
    proof: "Crew labor basis for estimates",
  },
];

const WORKFLOW_STEPS = [
  {
    label: "Review",
    detail: "Decide what belongs",
    icon: ClipboardCheck,
    tone: "amber",
  },
  {
    label: "Estimate",
    detail: "Decide what it costs",
    icon: DollarSign,
    tone: "green",
  },
  {
    label: "Submit",
    detail: "Package the bid",
    icon: ShieldCheck,
    tone: "blue",
  },
];

const toneClasses = {
  amber: {
    icon: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]",
    badge: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]",
    card: "hover:border-[#d7b44d] hover:shadow-[0_24px_70px_rgba(138,101,16,0.14)]",
  },
  green: {
    icon: "bg-emerald-50 text-emerald-800 border-emerald-300",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
    card: "hover:border-emerald-300 hover:shadow-[0_24px_70px_rgba(6,95,70,0.12)]",
  },
  blue: {
    icon: "bg-blue-50 text-[#244c91] border-blue-200",
    badge: "bg-blue-50 text-[#244c91] border-blue-200",
    card: "hover:border-blue-200 hover:shadow-[0_24px_70px_rgba(36,76,145,0.12)]",
  },
  gray: {
    icon: "bg-[#f1eee6] text-[#716855] border-[#d7c7aa]",
    badge: "bg-[#f1eee6] text-[#716855] border-[#d7c7aa]",
    card: "hover:border-[#c8b895] hover:shadow-[0_24px_70px_rgba(41,37,28,0.12)]",
  },
} as const;

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
  new:      "bg-emerald-50 text-emerald-800 border-emerald-300",
  improved: "bg-[#fff4cb] text-[#8a6510] border-[#d7b44d]",
  fix:      "bg-blue-50 text-[#244c91] border-blue-200",
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
    <div className="min-h-screen bg-[#f5f2eb] text-[#171714]">

      {/* ── Sticky Header ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-[#d7c7aa] bg-[#f7f4ed]/92 shadow-[0_10px_36px_rgba(41,37,28,0.08)] backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <ConstructLineWordmark size="md" showSubtitle tone="light" />
          <div className="flex items-center gap-3">
            {configSummary && (
              <span className="hidden text-xs font-medium text-[#716855] md:block">{configSummary}</span>
            )}
            <Button
              data-tour="hub-configure-rates"
              variant="outline"
              size="sm"
              className="gap-1.5 border-[#c8b895] bg-white/70 text-[#29251c] hover:!bg-[#faf8f2] hover:!text-[#171714] active:!bg-[#f1eee6] active:!text-[#171714]"
              onClick={() => setShowWizard(true)}
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configure Rates</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-7">
        <section className="overflow-hidden rounded-xl border border-[#d7c7aa] bg-[#f7f4ed] shadow-[0_28px_90px_rgba(41,37,28,0.14)]">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="bg-white/58 p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]">
                  <Sparkles className="w-3 h-3 mr-1" />
                  ConstructLine 2.0
                </Badge>
                {rateConfig && (
                  <Badge className="border-emerald-300 bg-emerald-50 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Rates configured
                  </Badge>
                )}
              </div>
              <h1 data-tour="hub-hero" className="mt-4 max-w-3xl text-4xl font-semibold tracking-normal text-[#171714] lg:text-5xl">
                A cleaner command center for every bid you are building.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[#5d5546]">
                Upload drawings, review scope, price accepted work, and package a bid from one decisive estimating cockpit.
              </p>

              <div className="mt-7 grid gap-3 md:grid-cols-3">
                {WORKFLOW_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const tone = toneClasses[step.tone as keyof typeof toneClasses];
                  return (
                    <div key={step.label} className="rounded-xl border border-[#d7c7aa] bg-[#fffdf8] p-4 shadow-[0_14px_34px_rgba(41,37,28,0.07)]">
                      <div className="flex items-center justify-between gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tone.icon}`}>
                          <StepIcon className="h-5 w-5" />
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#8a806d]">0{index + 1}</span>
                      </div>
                      <p className="mt-4 text-lg font-semibold text-[#171714]">{step.label}</p>
                      <p className="text-sm text-[#716855]">{step.detail}</p>
                    </div>
                  );
                })}
              </div>

              {!rateConfig && (
                <button
                  type="button"
                  className="mt-5 flex w-full items-center gap-3 rounded-xl border border-[#d7b44d] bg-[#fff4cb] px-4 py-3.5 text-left shadow-[0_16px_38px_rgba(138,101,16,0.1)] transition-colors hover:bg-[#ffeaa3]"
                  onClick={() => setShowWizard(true)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/70 text-[#8a6510]">
                    <Settings2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#171714]">Set up your labor rates to get started</p>
                    <p className="mt-0.5 text-xs text-[#716855]">Takes 60 seconds and calibrates trade rates to your work type and region.</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8a6510] shrink-0" />
                </button>
              )}
            </div>

            <aside className="border-t border-[#d7c7aa] bg-[#ebe0cc] p-6 lg:border-l lg:border-t-0 lg:p-7">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#d7c7aa] bg-white/78 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#716855]">Projects</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#171714]">{totalProjects}</p>
                </div>
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-800/70">Portfolio</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-emerald-800">
                    {totalEstimatedValue > 0
                      ? `$${(totalEstimatedValue / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-800/70">Active</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#244c91]">{activeProjects}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-[#d7c7aa] bg-white/78 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#716855]">Last Activity</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-2xl font-semibold text-[#171714]">
                    {lastActivityDate ? lastActivityDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No projects yet"}
                  </p>
                  <Clock className="h-5 w-5 text-[#8a806d]" />
                </div>
              </div>
              <Button
                data-tour="hub-new-project"
                className="mt-4 h-11 w-full bg-[#171714] text-white shadow-[0_18px_45px_rgba(23,23,20,0.2)] hover:bg-[#29251c]"
                onClick={() => navigate("/portal/takeoff")}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Bid
              </Button>
            </aside>
          </div>
        </section>

        <div className="mt-7 grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-7">
            <section data-tour="hub-recent-projects" className="rounded-xl border border-[#d7c7aa] bg-white/86 p-5 shadow-[0_18px_50px_rgba(41,37,28,0.08)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#8a806d]" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f5542]">Recent Projects</h2>
                  </div>
                  <p className="mt-1 text-xs text-[#716855]">Open the bid that needs the next decision.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="relative min-w-[230px]">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8a806d]" />
                    <div className="h-9 rounded-lg border border-[#d7c7aa] bg-[#faf8f2] pl-9 pr-3 text-left text-xs leading-9 text-[#8a806d]">
                      Search projects in Takeoff
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 border-[#c8b895] bg-white text-[#29251c] hover:bg-[#faf8f2]"
                    onClick={() => navigate("/portal/takeoff")}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
                    View All
                  </Button>
                </div>
              </div>

              {recentProjects.length === 0 ? (
                <button
                  onClick={() => navigate("/portal/takeoff")}
                  className="mt-4 flex w-full items-center gap-3 rounded-xl border border-dashed border-[#d7c7aa] bg-[#faf8f2] px-4 py-5 text-left transition-all hover:border-[#d7b44d] hover:bg-[#fff4cb]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#d7c7aa] bg-white">
                    <FileStack className="w-4 h-4 text-[#8a6510]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#171714]">No projects yet</p>
                    <p className="text-xs text-[#716855]">Start the first takeoff and build the bid from Review to Submit.</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#8a6510] ml-auto" />
                </button>
              ) : (
                <div className="mt-4 grid gap-3">
                  {recentProjects.map((project, index) => {
                    const status = STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
                    const StatusIcon = status.icon;
                    const isSpinning = project.status === "processing" || project.status === "post_processing";
                    return (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/takeoff/${project.id}`)}
                        className="group grid gap-3 rounded-xl border border-[#e0d2b7] bg-white p-3 text-left shadow-[0_14px_36px_rgba(41,37,28,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#d7b44d] hover:shadow-[0_22px_60px_rgba(41,37,28,0.13)] sm:grid-cols-[104px_minmax(0,1fr)_auto]"
                      >
                        <div className="relative h-24 overflow-hidden rounded-lg border border-[#d7c7aa] bg-[#e9e2d4]">
                          <div
                            className={`absolute inset-0 ${
                              index % 3 === 0
                                ? "bg-[linear-gradient(135deg,#e7d8bd_0%,#f8f5ed_55%,#cbd9d2_100%)]"
                                : index % 3 === 1
                                  ? "bg-[linear-gradient(135deg,#d8e4df_0%,#f8f5ed_52%,#d8c6a4_100%)]"
                                  : "bg-[linear-gradient(135deg,#d8dce5_0%,#f8f5ed_55%,#e4d0aa_100%)]"
                            }`}
                          />
                          <div className="absolute inset-x-4 bottom-4 top-6 rounded-sm border-2 border-white/80 bg-white/35 shadow-sm" />
                          <div className="absolute bottom-3 left-3 rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold text-[#716855]">
                            CL
                          </div>
                        </div>
                        <div className="min-w-0 py-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={`${status.color} border text-[10px]`}>
                              <StatusIcon className={`mr-1 h-3 w-3 ${isSpinning ? "animate-spin" : ""}`} />
                              {status.label}
                            </Badge>
                            {(project as any).rateProfileId && profileNameMap.has((project as any).rateProfileId) && (
                              <Badge className="border-blue-200 bg-blue-50 text-[10px] text-[#244c91]">
                                {profileNameMap.get((project as any).rateProfileId)}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 truncate text-base font-semibold text-[#171714] group-hover:text-[#8a6510]">{project.name}</p>
                          <p className="mt-1 text-xs text-[#716855]">
                            {project.totalSheets} sheet{project.totalSheets !== 1 ? "s" : ""} · Updated {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-end justify-between gap-3 sm:flex-col sm:items-end sm:py-1">
                          <p className="font-mono text-lg font-semibold text-emerald-800">
                            {project.totalEstimatedCost
                              ? `$${(project.totalEstimatedCost / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                              : "—"}
                          </p>
                          <ArrowRight className="w-4 h-4 text-[#8a6510] transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section data-tour="hub-module-cards">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#8a806d]" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f5542]">ConstructLine Tools</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isFeatured = (mod as any).featured;
                  const tone = toneClasses[mod.tone as keyof typeof toneClasses];
                  return (
                    <button
                      key={mod.id}
                      onClick={() => navigate(mod.path)}
                      className={`group rounded-xl border border-[#e0d2b7] bg-white p-5 text-left shadow-[0_18px_50px_rgba(41,37,28,0.08)] transition-all hover:-translate-y-0.5 ${tone.card} ${
                        isFeatured ? "ring-1 ring-[#d7b44d]/50" : ""
                      }`}
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${tone.icon}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <Badge className={`font-mono text-xs ${tone.badge}`}>{mod.label}</Badge>
                          {isFeatured && (
                            <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[10px] text-[#8a6510]">
                              <Zap className="w-2.5 h-2.5 mr-0.5" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#8a806d] transition-all group-hover:translate-x-0.5 group-hover:text-[#171714]" />
                      </div>
                      <h3 className="text-base font-semibold text-[#171714]">{mod.name}</h3>
                      <p className="mt-1 text-sm leading-6 text-[#716855]">{mod.description}</p>
                      <p className="mt-4 border-t border-[#eadcc4] pt-3 text-xs font-medium text-[#5d5546]">{mod.proof}</p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside data-tour="hub-whats-new" className="space-y-4">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-[#8a806d]" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#5f5542]">What's New</h2>
            </div>

            <div className="space-y-4">
              {CHANGELOG.map((entry, entryIdx) => (
                <div
                  key={entry.version}
                  className={`overflow-hidden rounded-xl border bg-white shadow-[0_18px_50px_rgba(41,37,28,0.07)] ${entryIdx === 0 ? "border-[#d7b44d]" : "border-[#e0d2b7]"}`}
                >
                  <div className={`flex items-center justify-between border-b px-4 py-3 ${entryIdx === 0 ? "border-[#d7b44d] bg-[#fff4cb]" : "border-[#eadcc4] bg-[#faf8f2]"}`}>
                    <div>
                      <p className="text-xs font-semibold text-[#171714]">{entry.title}</p>
                      <p className="mt-0.5 text-[10px] text-[#716855]">{entry.date}</p>
                    </div>
                    {entryIdx === 0 && (
                      <Badge className="border-[#d7b44d] bg-white/70 text-[9px] text-[#8a6510]">
                        <Zap className="w-2.5 h-2.5 mr-0.5" />
                        Latest
                      </Badge>
                    )}
                  </div>

                  <div className="divide-y divide-[#eadcc4]">
                    {entry.highlights.map((h, hi) => {
                      const HIcon = h.icon;
                      return (
                        <div key={hi} className="flex items-start gap-3 px-4 py-3">
                          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#d7c7aa] bg-[#f7f4ed]">
                            <HIcon className="w-3.5 h-3.5 text-[#716855]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                              <p className="text-xs font-semibold text-[#171714]">{h.label}</p>
                              {h.tag && (
                                <Badge className={`${TAG_STYLES[h.tag]} text-[9px] font-medium px-1.5 py-0`}>
                                  {h.tag === "new" ? "New" : h.tag === "improved" ? "Improved" : "Fix"}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[11px] leading-5 text-[#716855]">{h.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>
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
