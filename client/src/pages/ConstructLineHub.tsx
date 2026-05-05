/**
 * ConstructLineHub — polished entry point for the ConstructLine suite.
 *
 * This is the first impression for Review → Estimate → Submit, so it favors
 * decisive project routing and bid packaging over generic module navigation.
 */
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  GanttChart,
  HardHat,
  Layers,
  Loader2,
  PackageCheck,
  Plus,
  Ruler,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import RateSetupWizard, {
  loadRateConfig,
  saveRateConfig,
  type RateSetupConfig,
} from "@/components/RateSetupWizard";
import { trpc } from "@/lib/trpc";

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: any }
> = {
  draft: {
    label: "Draft",
    className: "border-[#d7c7aa] bg-white text-[#716855]",
    icon: FileText,
  },
  uploading: {
    label: "Uploading",
    className: "border-blue-200 bg-blue-50 text-[#244c91]",
    icon: Loader2,
  },
  processing: {
    label: "Estimating",
    className: "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]",
    icon: Loader2,
  },
  post_processing: {
    label: "Estimating",
    className: "border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]",
    icon: Loader2,
  },
  completed: {
    label: "Complete",
    className: "border-emerald-300 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  error: {
    label: "Needs Review",
    className: "border-orange-300 bg-orange-50 text-orange-800",
    icon: ShieldCheck,
  },
};

const MODULES = [
  {
    code: "C1",
    name: "CPM Schedule",
    description: "Build schedules, track float, and generate Gantt charts.",
    icon: GanttChart,
    path: "/portal/scheduler",
    className: "border-[#f1d38d] bg-[#fffaf0] text-[#8a6510]",
  },
  {
    code: "C2",
    name: "Quantity Takeoff",
    description: "Upload drawings, auto-detect, and generate quantities.",
    icon: Ruler,
    path: "/portal/takeoff",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  {
    code: "C3",
    name: "Cost Library",
    description: "Maintain unit costs across CSI divisions.",
    icon: Database,
    path: "/portal/cost-library",
    className: "border-blue-200 bg-blue-50 text-[#244c91]",
  },
  {
    code: "C4",
    name: "Trade Rate Library",
    description: "Set calibrated labor rates by trade and region.",
    icon: HardHat,
    path: "/portal/labor-library",
    className: "border-violet-200 bg-violet-50 text-violet-800",
  },
];

const NEWS = [
  {
    title: "Source-Based Anomaly Review",
    date: "May 5, 2026",
    detail:
      "Open a flagged row against its drawing, then include, review, exclude, confirm, or open item detail.",
    icon: FileCheck2,
    tag: "Latest",
  },
  {
    title: "Full-Screen Drawing Review",
    date: "May 5, 2026",
    detail:
      "Drawing Navigator previews now open into a full-screen zoomable review surface.",
    icon: Ruler,
    tag: "New",
  },
  {
    title: "Discrepancy Review Actions",
    date: "May 5, 2026",
    detail:
      "Anomaly rows now support source review, scope decisions, quantity confirmation, and dismissal.",
    icon: ShieldCheck,
    tag: "New",
  },
];

const HEALTH_SEGMENTS = [
  { label: "In Review", color: "bg-[#d7b44d]" },
  { label: "Estimating", color: "bg-emerald-400" },
  { label: "In Pricing", color: "bg-blue-400" },
  { label: "Complete", color: "bg-violet-400" },
];

function formatCurrency(cents?: number | null): string {
  if (!cents || cents <= 0) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "No activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getBidPhase(
  status: string
): "In Review" | "Estimating" | "In Pricing" | "Complete" {
  if (status === "completed") return "Complete";
  if (
    status === "processing" ||
    status === "post_processing" ||
    status === "uploading"
  ) {
    return "Estimating";
  }
  if (status === "draft") return "In Review";
  return "In Pricing";
}

function BuildingHeroArt() {
  return (
    <div className="relative hidden min-h-[360px] overflow-hidden bg-[#0b0d10] lg:block">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(241,181,29,0.16),transparent_28%),radial-gradient(circle_at_70%_22%,rgba(111,209,157,0.16),transparent_24%)]" />
      <div className="absolute left-10 right-10 top-10 rounded-xl border border-white/10 bg-white/[0.06] p-5 shadow-[0_40px_90px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f1b51d]">
              Bid cockpit
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              Crystal Car Wash
            </p>
          </div>
          <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
            Ready to package
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[1fr_150px] gap-4">
          <div className="space-y-3">
            {[
              ["Review", "Scope clear", "100%"],
              ["Estimate", "$546,286", "100%"],
              ["Submit", "Proposal package", "Ready"],
            ].map(([label, value, pct]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-black/22 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                    {label}
                  </p>
                  <p className="font-mono text-xs text-[#f1b51d]">{pct}</p>
                </div>
                <p className="mt-2 text-base font-semibold text-white">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-[#f1b51d]/25 bg-[#f1b51d]/10 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f1b51d]">
              Outputs
            </p>
            <div className="mt-4 space-y-3 text-sm text-white/72">
              <p>Proposal PDF</p>
              <p>Bid Summary</p>
              <p>AIA SOV</p>
              <p>Company Assets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConstructLineHub() {
  const [, navigate] = useLocation();
  const [rateConfig, setRateConfig] = useState<RateSetupConfig | null>(
    loadRateConfig()
  );
  const [showWizard, setShowWizard] = useState(!loadRateConfig());

  const { data: projects } = trpc.takeoff.listProjects.useQuery();
  const { data: rateProfilesList } =
    trpc.tradeRates.listRateProfiles.useQuery();

  const sortedProjects = useMemo(
    () =>
      [...(projects ?? [])].sort(
        (a: any, b: any) =>
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime()
      ),
    [projects]
  );
  const recentProjects = sortedProjects.slice(0, 3);
  const totalProjects = projects?.length ?? 0;
  const activeProjects = (projects ?? []).filter((project: any) =>
    ["draft", "uploading", "processing", "post_processing"].includes(
      project.status
    )
  ).length;
  const bidsInReview = (projects ?? []).filter((project: any) =>
    ["draft", "error"].includes(project.status)
  ).length;
  const completedProjects = (projects ?? []).filter(
    (project: any) => project.status === "completed"
  );
  const readyToPackage = completedProjects.length;
  const totalEstimatedValue = (projects ?? []).reduce(
    (sum: number, project: any) => sum + (project.totalEstimatedCost ?? 0),
    0
  );
  const lastProject = sortedProjects[0] as any | undefined;
  const profileNameMap = new Map(
    (rateProfilesList ?? []).map((profile: any) => [profile.id, profile.name])
  );

  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "In Review": 0,
      Estimating: 0,
      "In Pricing": 0,
      Complete: 0,
    };
    for (const project of projects ?? [])
      counts[getBidPhase(project.status)] += 1;
    return counts;
  }, [projects]);

  const configureMutation = trpc.tradeRates.configureRates.useMutation({
    onSuccess: () =>
      toast.success("ConstructLine configured — your rates are ready."),
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

  const openProject = (projectId: number) => navigate(`/takeoff/${projectId}`);
  const openSubmit = (projectId?: number) => {
    if (projectId) {
      navigate(`/takeoff/${projectId}?tab=estimate`);
      return;
    }
    navigate("/portal/takeoff");
  };

  return (
    <div className="min-h-screen bg-[#f8f5ef] text-[#171714]">
      <header className="sticky top-0 z-20 border-b border-black/10 bg-[#07090b] text-white shadow-[0_18px_50px_rgba(0,0,0,0.20)]">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-6 py-3">
          <div className="min-w-[190px]">
            <p className="text-xl font-semibold leading-none">
              Construct<span className="text-[#f1b51d]">Line</span>
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
              Powered by ALP
            </p>
          </div>
          <div className="relative hidden flex-1 md:block">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <div className="h-10 rounded-xl border border-white/10 bg-white/8 pl-11 pr-4 text-sm leading-10 text-white/56 shadow-inner">
              Search projects, drawings, tools...
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="hidden h-10 rounded-xl border-white/10 bg-white/8 text-white hover:!bg-white/14 hover:!text-white lg:inline-flex"
            onClick={() => setShowWizard(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            Configure
          </Button>
          <Button
            size="sm"
            className="h-10 rounded-xl bg-[#111317] text-white hover:bg-[#1a1d23]"
            onClick={() => navigate("/portal/takeoff")}
          >
            <Sparkles className="mr-2 h-4 w-4 text-[#f1b51d]" />
            New Bid
          </Button>
          <div className="relative">
            <Bell className="h-5 w-5 text-white/70" />
            {bidsInReview > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f1b51d] px-1 text-[10px] font-bold text-black">
                {bidsInReview}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-6 py-7">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="overflow-hidden rounded-xl border border-[#d7c7aa] bg-[#fffdf8] shadow-[0_30px_90px_rgba(41,37,28,0.12)]">
            <div className="grid min-h-[360px] lg:grid-cols-[minmax(0,0.9fr)_600px]">
              <div className="flex flex-col justify-between p-8 lg:p-10">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b58513]">
                    Welcome back, Marshall
                  </p>
                  <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-normal text-[#11100c] lg:text-[58px]">
                    Your bids are moving. Choose the next decision.
                  </h1>
                  <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#6d6558]">
                    Review scope, estimate accepted work, and turn completed
                    takeoffs into premium proposal packages.
                  </p>
                </div>
                {!rateConfig && (
                  <button
                    type="button"
                    onClick={() => setShowWizard(true)}
                    className="mt-6 flex w-full max-w-xl items-center gap-3 rounded-xl border border-[#d7b44d] bg-[#fff4cb] px-4 py-3 text-left shadow-[0_16px_38px_rgba(138,101,16,0.10)] transition-colors hover:bg-[#ffeaa3]"
                  >
                    <Settings2 className="h-5 w-5 text-[#8a6510]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#171714]">
                        Finish labor-rate setup
                      </p>
                      <p className="text-xs text-[#716855]">
                        Calibrate crew rates before pricing bids.
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#8a6510]" />
                  </button>
                )}
                <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                  {[
                    ["Review", `${bidsInReview}`, "needs decision"],
                    ["Estimate", `${activeProjects}`, "active bids"],
                    ["Submit", `${readyToPackage}`, "ready packages"],
                  ].map(([label, value, detail]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-[#eadcc4] bg-white/70 p-3"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#716855]">
                        {label}
                      </p>
                      <p className="mt-2 font-mono text-2xl font-semibold text-[#171714]">
                        {value}
                      </p>
                      <p className="mt-1 text-[11px] text-[#716855]">
                        {detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <BuildingHeroArt />
            </div>
          </div>

          <aside className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.07)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#716855]">
                    Active Projects
                  </p>
                  <p className="mt-3 font-mono text-2xl font-semibold text-[#171714]">
                    {activeProjects}
                  </p>
                  <p className="mt-1 text-xs text-[#716855]">
                    of {totalProjects} total
                  </p>
                </div>
                <BriefcaseBusiness className="h-5 w-5 text-[#c48d12]" />
              </div>
            </div>
            <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.07)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#716855]">
                Portfolio Value
              </p>
              <p className="mt-3 font-mono text-2xl font-semibold text-[#171714]">
                {formatCurrency(totalEstimatedValue)}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                <TrendingUp className="h-3.5 w-3.5" />
                Active bid pipeline
              </div>
            </div>
            <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.07)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#716855]">
                Bids In Review
              </p>
              <p className="mt-3 font-mono text-2xl font-semibold text-[#171714]">
                {bidsInReview}
              </p>
              <p className="mt-1 text-xs text-[#716855]">
                Needs your attention
              </p>
            </div>
            <div className="rounded-xl border border-[#d7c7aa] bg-white p-5 shadow-[0_18px_50px_rgba(41,37,28,0.07)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#716855]">
                Last Activity
              </p>
              <p className="mt-3 text-xl font-semibold text-[#171714]">
                {formatDate(lastProject?.updatedAt || lastProject?.createdAt)}
              </p>
              <p className="mt-1 truncate text-xs text-[#716855]">
                {lastProject?.name || "No projects yet"}
              </p>
            </div>
            <Button
              className="col-span-full h-12 rounded-xl bg-[#090b0f] text-[#f1b51d] shadow-[0_18px_45px_rgba(0,0,0,0.20)] hover:bg-[#171a20]"
              onClick={() => navigate("/portal/takeoff")}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create New Bid
            </Button>
          </aside>
        </section>

        <section className="mt-6 overflow-hidden rounded-xl border border-black/10 bg-[#07090b] p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.20em] text-[#f1b51d]">
            The Estimating Flow
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            {[
              {
                label: "Review",
                detail: "Decide what belongs",
                icon: ClipboardCheck,
                color: "border-[#d7b44d] bg-[#d7b44d]/10 text-[#f1b51d]",
              },
              {
                label: "Estimate",
                detail: "Decide what it costs",
                icon: TrendingUp,
                color: "border-emerald-400 bg-emerald-400/10 text-emerald-300",
              },
              {
                label: "Submit",
                detail: "Package the bid",
                icon: ShieldCheck,
                color: "border-violet-400 bg-violet-400/10 text-violet-300",
              },
            ].map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div key={step.label} className="contents">
                  <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.03] p-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl border ${step.color}`}
                    >
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-mono text-xs text-white/45">
                        0{index + 1}
                      </p>
                      <p className="text-lg font-semibold">{step.label}</p>
                      <p className="text-sm text-white/55">{step.detail}</p>
                    </div>
                  </div>
                  {index < 2 && (
                    <ArrowRight className="hidden h-5 w-5 text-[#f1b51d] md:block" />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_18px_55px_rgba(41,37,28,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#716855]" />
                    <h2 className="font-semibold text-[#171714]">
                      Recent Projects
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-[#716855]">
                    Open the bid that needs your next decision.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#716855] hover:text-[#171714]"
                  onClick={() => navigate("/portal/takeoff")}
                >
                  View All Projects
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="mt-5 overflow-hidden rounded-xl border border-[#eadcc4]">
                {recentProjects.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => navigate("/portal/takeoff")}
                    className="flex w-full items-center gap-3 bg-[#faf8f2] p-5 text-left transition-colors hover:bg-[#fff4cb]"
                  >
                    <FileText className="h-5 w-5 text-[#8a6510]" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#171714]">
                        Start your first bid
                      </p>
                      <p className="text-sm text-[#716855]">
                        Upload drawings and build the estimate from source
                        evidence.
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#8a6510]" />
                  </button>
                ) : (
                  recentProjects.map((project: any, index: number) => {
                    const status =
                      STATUS_CONFIG[project.status] ?? STATUS_CONFIG.draft;
                    const StatusIcon = status.icon;
                    const isWorking =
                      project.status === "processing" ||
                      project.status === "post_processing" ||
                      project.status === "uploading";
                    const isComplete = project.status === "completed";
                    return (
                      <div
                        key={project.id}
                        className={`grid gap-4 p-4 transition-colors hover:bg-[#faf8f2] md:grid-cols-[112px_minmax(0,1fr)_150px_130px] md:items-center ${
                          index > 0 ? "border-t border-[#eadcc4]" : ""
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openProject(project.id)}
                          className="relative h-20 overflow-hidden rounded-lg border border-[#d7c7aa] bg-[#efe7d9] text-left"
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,#d7c3a2,#ffffff_48%,#c9ded6)]" />
                          <div className="absolute bottom-3 left-3 right-4 top-4 rounded-sm border border-white/80 bg-white/38" />
                          <div className="absolute bottom-2 left-2 rounded bg-white/85 px-1.5 py-0.5 text-[9px] font-semibold text-[#716855]">
                            CL
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => openProject(project.id)}
                          className="min-w-0 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              className={`${status.className} border text-[10px]`}
                            >
                              <StatusIcon
                                className={`mr-1 h-3 w-3 ${isWorking ? "animate-spin" : ""}`}
                              />
                              {status.label}
                            </Badge>
                            {(project as any).rateProfileId &&
                              profileNameMap.has(
                                (project as any).rateProfileId
                              ) && (
                                <Badge className="border-blue-200 bg-blue-50 text-[10px] text-[#244c91]">
                                  {profileNameMap.get(
                                    (project as any).rateProfileId
                                  )}
                                </Badge>
                              )}
                          </div>
                          <p className="mt-2 truncate text-base font-semibold text-[#171714]">
                            {project.name}
                          </p>
                          <p className="mt-1 text-xs text-[#716855]">
                            {project.totalSheets || 0} sheet
                            {project.totalSheets === 1 ? "" : "s"} · Updated{" "}
                            {formatDate(project.updatedAt || project.createdAt)}
                          </p>
                        </button>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#716855]">
                            Bid Total
                          </p>
                          <p className="mt-1 font-mono text-lg font-semibold text-[#171714]">
                            {formatCurrency(project.totalEstimatedCost)}
                          </p>
                        </div>
                        <div className="flex gap-2 md:justify-end">
                          {isComplete ? (
                            <Button
                              size="sm"
                              className="h-9 bg-[#171714] text-white hover:bg-[#29251c]"
                              onClick={() => openSubmit(project.id)}
                            >
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              Package
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 border-[#d7c7aa] bg-white text-[#5d5546] hover:!bg-[#faf8f2]"
                              onClick={() => openProject(project.id)}
                            >
                              Open
                              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_18px_55px_rgba(41,37,28,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#716855]" />
                    <h2 className="font-semibold text-[#171714]">
                      ConstructLine Tools
                    </h2>
                  </div>
                  <p className="mt-1 text-sm text-[#716855]">
                    Everything needed to build better bids.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#716855] hover:text-[#171714]"
                  onClick={() => navigate("/portal/takeoff")}
                >
                  View All Tools
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {MODULES.map(module => {
                  const Icon = module.icon;
                  return (
                    <button
                      key={module.code}
                      type="button"
                      onClick={() => navigate(module.path)}
                      className="group rounded-xl border border-[#eadcc4] bg-[#fffdf8] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#d7b44d] hover:shadow-[0_20px_55px_rgba(41,37,28,0.10)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg border ${module.className}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge className="border-[#d7c7aa] bg-white text-[10px] text-[#716855]">
                          {module.code}
                        </Badge>
                      </div>
                      <p className="mt-4 font-semibold text-[#171714]">
                        {module.name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#716855]">
                        {module.description}
                      </p>
                      <div className="mt-4 flex justify-end">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d7c7aa] text-[#8a6510] transition-transform group-hover:translate-x-0.5">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-xl border border-[#c9b27c] bg-[#07090b] text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
              <div className="p-5">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-[#f1b51d]" />
                  <h2 className="font-semibold">Submit Center</h2>
                </div>
                <p className="mt-1 text-sm text-white/58">
                  The finish line for bid-ready work.
                </p>
                <div className="mt-4 rounded-xl border border-[#f1b51d]/25 bg-[#f1b51d]/10 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f1b51d]">
                    Ready to Package
                  </p>
                  <p className="mt-2 font-mono text-4xl font-semibold text-white">
                    {readyToPackage}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/62">
                    Create proposal layouts, attach company assets, and export
                    the owner-facing package.
                  </p>
                  <Button
                    className="mt-4 h-10 w-full bg-[#f1b51d] text-[#171714] hover:bg-[#ffd45c]"
                    onClick={() => openSubmit(completedProjects[0]?.id)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Open Submit Package
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {["Proposal", "Bid Summary", "AIA SOV"].map(label => (
                    <div
                      key={label}
                      className="rounded-lg border border-white/10 bg-white/[0.05] px-2 py-3"
                    >
                      <FileCheck2 className="mx-auto h-4 w-4 text-[#f1b51d]" />
                      <p className="mt-1 text-[11px] font-semibold text-white/78">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_18px_55px_rgba(41,37,28,0.07)]">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#716855]" />
                <h2 className="font-semibold text-[#171714]">Project Health</h2>
              </div>
              <p className="mt-1 text-sm text-[#716855]">
                Overview of your active projects.
              </p>
              <div className="mx-auto mt-5 grid h-44 w-44 place-items-center rounded-full bg-[conic-gradient(#d7b44d_0_25%,#6fd19d_25%_50%,#7fb1ff_50%_75%,#9a8cff_75%_100%)]">
                <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
                  <div>
                    <p className="font-mono text-3xl font-semibold text-[#171714]">
                      {totalProjects}
                    </p>
                    <p className="text-xs text-[#716855]">Total Projects</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {HEALTH_SEGMENTS.map(segment => (
                  <div
                    key={segment.label}
                    className="flex items-center gap-2 text-xs text-[#5d5546]"
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-sm ${segment.color}`}
                    />
                    <span className="flex-1">{segment.label}</span>
                    <span className="font-mono font-semibold">
                      {phaseCounts[segment.label] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#e4d7bf] bg-white p-5 shadow-[0_18px_55px_rgba(41,37,28,0.07)]">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-[#8a6510]" />
                <h2 className="font-semibold text-[#171714]">What’s New</h2>
              </div>
              <p className="mt-1 text-sm text-[#716855]">
                Latest ConstructLine updates.
              </p>
              <div className="mt-4 space-y-3">
                {NEWS.map(item => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-xl border border-[#eadcc4] bg-[#fffdf8] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#d7b44d] bg-[#fff4cb] text-[#8a6510]">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[#171714]">
                              {item.title}
                            </p>
                            <Badge className="border-[#d7b44d] bg-[#fff4cb] text-[9px] text-[#8a6510]">
                              {item.tag}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[#716855]">
                            <CalendarClock className="h-3 w-3" />
                            {item.date}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-[#716855]">
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </main>

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
