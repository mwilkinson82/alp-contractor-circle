/**
 * SetupChecklist — Guided onboarding checklist for ConstructLine beta users.
 * Shows in the sidebar under the ConstructLine section.
 * Tracks 4 setup steps, persists completion in localStorage,
 * and auto-hides once all steps are done.
 */
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle2,
  Circle,
  ChevronRight,
  Sparkles,
  HardHat,
  Ruler,
  Settings2,
  X,
  Database,
} from "lucide-react";

const STORAGE_KEY = "alp-cl-setup-checklist-v2";
const DISMISSED_KEY = "alp-cl-setup-dismissed-v2";

export interface SetupStep {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: "rates",
    label: "Configure Basis Setup",
    description: "Set work type, region, and default pricing setup",
    path: "/portal/labor-library",
    icon: Settings2,
  },
  {
    id: "costs",
    label: "Check Cost Library",
    description: "Review the unit costs Basis uses for material pricing",
    path: "/portal/cost-library",
    icon: Database,
  },
  {
    id: "crews",
    label: "Check Trade Rates",
    description: "Review fully burdened rates and crew assumptions",
    path: "/portal/labor-library?tab=crews",
    icon: HardHat,
  },
  {
    id: "project",
    label: "Create First Basis Bid",
    description: "Upload drawings and run your first Basis estimate",
    path: "/portal/takeoff",
    icon: Ruler,
  },
];

function loadCompleted(): Set<string> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return new Set(JSON.parse(saved));
  } catch {}
  return new Set();
}

function saveCompleted(completed: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(completed)));
}

function isDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === "true";
}

function setDismissed() {
  localStorage.setItem(DISMISSED_KEY, "true");
}

interface SetupChecklistProps {
  discordConnected?: boolean;
  hasRateConfig?: boolean;
  hasTakeoffProject?: boolean;
}

export function SetupChecklist({
  discordConnected,
  hasRateConfig,
  hasTakeoffProject,
}: SetupChecklistProps) {
  const [, setLocation] = useLocation();
  const [completed, setCompleted] = useState<Set<string>>(loadCompleted);
  const [dismissed, setDismissedState] = useState(isDismissed);
  const [animatingStep, setAnimatingStep] = useState<string | null>(null);

  // Auto-complete steps based on external state
  useEffect(() => {
    const updated = new Set(completed);
    let changed = false;

    if (hasRateConfig && !updated.has("rates")) {
      updated.add("rates");
      changed = true;
    }
    if (hasTakeoffProject && !updated.has("project")) {
      updated.add("project");
      changed = true;
    }

    if (changed) {
      setCompleted(updated);
      saveCompleted(updated);
    }
  }, [discordConnected, hasRateConfig, hasTakeoffProject]);

  const completedCount = completed.size;
  const totalSteps = SETUP_STEPS.length;
  const allDone = completedCount >= totalSteps;
  const progress = (completedCount / totalSteps) * 100;

  // Find next incomplete step
  const nextStep = useMemo(
    () => SETUP_STEPS.find(s => !completed.has(s.id)),
    [completed]
  );

  if (dismissed && !allDone) return null;
  if (allDone && dismissed) return null;

  const handleStepClick = (step: SetupStep) => {
    if (step.id === "costs" || step.id === "crews") {
      markComplete(step.id);
    }
    setLocation(step.path);
  };

  const markComplete = (stepId: string) => {
    const updated = new Set(completed);
    updated.add(stepId);
    setCompleted(updated);
    saveCompleted(updated);
    setAnimatingStep(stepId);
    setTimeout(() => setAnimatingStep(null), 600);
  };

  const handleDismiss = () => {
    setDismissed();
    setDismissedState(true);
  };

  if (allDone) {
    return (
      <div className="mx-2 mb-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">
              Setup Complete!
            </span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-emerald-400/60 hover:text-emerald-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-emerald-300/60 mt-1">
          You're all set. Your libraries are configured and ready to estimate.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-2 mb-2 rounded-lg bg-gradient-to-b from-amber-500/8 to-transparent border border-amber-500/15 overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-amber-400" />
          </div>
          <span
            className="text-xs font-bold text-cream tracking-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Getting Started
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="text-cream-muted/40 hover:text-cream-muted transition-colors"
          title="Dismiss checklist"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-cream-muted">
            {completedCount} of {totalSteps} complete
          </span>
          <span className="text-[10px] text-amber-400 font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="px-2 pb-2 space-y-0.5">
        {SETUP_STEPS.map(step => {
          const done = completed.has(step.id);
          const isNext = nextStep?.id === step.id;
          const isAnimating = animatingStep === step.id;
          const Icon = step.icon;

          return (
            <button
              key={step.id}
              onClick={() => {
                if (!done) handleStepClick(step);
              }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-200 group ${
                done
                  ? "opacity-60"
                  : isNext
                    ? "bg-amber-500/10 hover:bg-amber-500/15"
                    : "hover:bg-white/5"
              } ${isAnimating ? "scale-[1.02]" : ""}`}
            >
              {done ? (
                <CheckCircle2
                  className={`w-4 h-4 text-emerald-400 shrink-0 ${
                    isAnimating ? "animate-bounce" : ""
                  }`}
                />
              ) : (
                <Circle
                  className={`w-4 h-4 shrink-0 ${
                    isNext ? "text-amber-400" : "text-cream-muted/30"
                  }`}
                />
              )}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-xs font-medium block truncate ${
                    done
                      ? "text-cream-muted line-through"
                      : isNext
                        ? "text-cream"
                        : "text-cream-muted"
                  }`}
                >
                  {step.label}
                </span>
                {isNext && !done && (
                  <span className="text-[10px] text-cream-muted/60 block truncate">
                    {step.description}
                  </span>
                )}
              </div>
              {isNext && !done && (
                <ChevronRight className="w-3.5 h-3.5 text-amber-400/60 group-hover:text-amber-400 transition-colors shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { loadCompleted, saveCompleted, SETUP_STEPS };
