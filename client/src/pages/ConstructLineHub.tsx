/**
 * ConstructLineHub — Entry point for the ConstructLine suite.
 *
 * This page is the first thing users see when they click "ConstructLine" in the
 * portal sidebar. It triggers the Rate Setup Wizard on first visit (no saved config),
 * then presents the four ConstructLine modules as launch cards.
 *
 * Routes to:
 *   /portal/takeoff        — Quantity Takeoff (C2)
 *   /portal/cost-library   — Cost Library (C3)
 *   /portal/labor-library  — Trade Rate Library (C4)
 *   /portal/scheduler      — CPM Schedule (C1)
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
} from "lucide-react";
import { ConstructLineWordmark } from "@/components/ConstructLineBrand";
import RateSetupWizard, {
  loadRateConfig,
  saveRateConfig,
  type RateSetupConfig,
} from "@/components/RateSetupWizard";
import { trpc } from "@/lib/trpc";

// ─── Module Cards ─────────────────────────────────────────────────────────────

const MODULES = [
  {
    id: "takeoff",
    label: "C2",
    name: "Quantity Takeoff",
    description: "Upload drawings, auto-detect dimensions, and generate material quantities with ConstructLine's computer vision engine.",
    icon: Ruler,
    path: "/portal/takeoff",
    accent: "from-amber-500/10 to-amber-500/5",
    iconColor: "text-amber-400",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    available: true,
  },
  {
    id: "cost-library",
    label: "C3",
    name: "Cost Library",
    description: "Maintain your material unit costs across all CSI divisions. Sync ConstructLine baseline pricing or enter your own negotiated rates.",
    icon: Database,
    path: "/portal/cost-library",
    accent: "from-blue-500/10 to-blue-500/5",
    iconColor: "text-blue-400",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    available: true,
  },
  {
    id: "labor-library",
    label: "C4",
    name: "Trade Rate Library",
    description: "Configure RS Means-calibrated labor rates for your crews. Set work type, region, and specialty to get accurate fully-burdened rates.",
    icon: HardHat,
    path: "/portal/labor-library",
    accent: "from-emerald-500/10 to-emerald-500/5",
    iconColor: "text-emerald-400",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    available: true,
  },
  {
    id: "scheduler",
    label: "C1",
    name: "CPM Schedule",
    description: "Build critical path method schedules, track float, and generate Gantt charts for your projects.",
    icon: GanttChart,
    path: "/portal/scheduler",
    accent: "from-purple-500/10 to-purple-500/5",
    iconColor: "text-purple-400",
    badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    available: true,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConstructLineHub() {
  const [, navigate] = useLocation();

  // Wizard state — fires on first visit (no saved config)
  const [rateConfig, setRateConfig] = useState<RateSetupConfig | null>(loadRateConfig());
  const [showWizard, setShowWizard] = useState(!loadRateConfig());

  const configureMutation = trpc.tradeRates.configureRates.useMutation({
    onSuccess: () => {
      toast.success("ConstructLine configured — your rates are ready.");
    },
    onError: () => {
      // Config saved locally; non-fatal
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
      {/* Header */}
      <div className="border-b border-white/5 bg-navy/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <ConstructLineWordmark size="md" showSubtitle />
          <div className="flex items-center gap-3">
            {configSummary && (
              <span className="text-xs text-cream-muted hidden sm:block">{configSummary}</span>
            )}
            <Button
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

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-start gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-medium">
                <Sparkles className="w-3 h-3 mr-1" />
                Estimating Suite
              </Badge>
              {rateConfig && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                  Configured
                </Badge>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Construct<span className="text-amber-400">Line</span>
            </h1>
            <p className="text-cream-muted text-base max-w-xl">
              Your complete construction estimating platform. Takeoff quantities, build cost libraries, configure labor rates, and generate winning proposals — all in one place.
            </p>
          </div>
        </div>

        {/* Rate config prompt if not configured */}
        {!rateConfig && (
          <div
            className="mt-6 flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 cursor-pointer hover:bg-amber-500/10 transition-colors"
            onClick={() => setShowWizard(true)}
          >
            <Settings2 className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-300 font-medium">Set up your labor rates to get started</p>
              <p className="text-xs text-amber-400/70">Takes 60 seconds — calibrates all trade rates to your work type and region</p>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-400/60 shrink-0" />
          </div>
        )}
      </div>

      {/* Module Cards */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => navigate(mod.path)}
                className={`group text-left rounded-xl border border-white/8 bg-gradient-to-br ${mod.accent} p-5 hover:border-white/15 hover:bg-white/5 transition-all duration-200`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                      <Icon className={`w-4.5 h-4.5 ${mod.iconColor}`} />
                    </div>
                    <Badge className={`text-xs font-mono ${mod.badgeColor}`}>{mod.label}</Badge>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">{mod.name}</h3>
                <p className="text-sm text-cream-muted leading-relaxed">{mod.description}</p>
              </button>
            );
          })}
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
