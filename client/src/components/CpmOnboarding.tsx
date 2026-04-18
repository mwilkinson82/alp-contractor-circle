/**
 * CPM Scheduler Quick Start Onboarding Overlay
 * 
 * A guided walkthrough that appears the first time a user opens the CPM Scheduler.
 * Walks them through the key concepts: WBS view, activities, relationships, Gantt chart, and toolbar.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FolderTree, ListChecks, Link2, BarChart3, Settings,
  ChevronRight, ChevronLeft, X, Rocket, Lightbulb
} from "lucide-react";

interface CpmOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    icon: Rocket,
    title: "Welcome to CPM Schedule Builder",
    subtitle: "Your construction scheduling command center",
    content: [
      "This is a professional-grade Critical Path Method (CPM) scheduling tool — the same methodology used in Primavera P6 and Microsoft Project.",
      "We've designed it to be intuitive so you can focus on building great schedules without the steep learning curve.",
      "Let's walk through the key features in about 60 seconds."
    ],
    tip: null,
  },
  {
    icon: FolderTree,
    title: "Work Breakdown Structure (WBS)",
    subtitle: "Organize your project into logical phases",
    content: [
      "The left panel shows your WBS tree — a hierarchical breakdown of your project into phases like Sitework, Foundation, Structure, etc.",
      "Each WBS node groups related activities together. Click a WBS node to expand/collapse its activities.",
      "You can add, rename, reorder, and color-code WBS nodes to match your project's structure."
    ],
    tip: "If you started from a template, your WBS is already set up. You can customize it anytime.",
  },
  {
    icon: ListChecks,
    title: "Activities & Durations",
    subtitle: "The building blocks of your schedule",
    content: [
      "Activities are the individual tasks in your schedule — each has an ID, name, and duration (in working days).",
      "Click any activity row to edit it. Use the + button or right-click to add new activities.",
      "The columns panel lets you show/hide fields like Early Start, Early Finish, Total Float, and more."
    ],
    tip: "Activities with 0 Total Float are on the Critical Path — any delay pushes your project end date.",
  },
  {
    icon: Link2,
    title: "Logic Ties (Relationships)",
    subtitle: "Connect activities to build your schedule logic",
    content: [
      "Relationships define the sequence: which activities must finish before others can start.",
      "The most common type is Finish-to-Start (FS): Activity A must finish before Activity B starts.",
      "Select two activities and use the Link button to create a relationship, or edit them in the activity detail panel."
    ],
    tip: "After adding relationships, click the Calculate (play) button to compute your critical path and dates.",
  },
  {
    icon: BarChart3,
    title: "Gantt Chart",
    subtitle: "Visualize your schedule timeline",
    content: [
      "The right panel shows the Gantt chart — a visual timeline of all your activities.",
      "Blue bars show activity durations. Red bars highlight the critical path. Gray lines show relationships.",
      "Scroll horizontally to navigate the timeline. Use the zoom controls to adjust the time scale."
    ],
    tip: "The Gantt updates automatically when you calculate the schedule. Look for the red critical path!",
  },
  {
    icon: Settings,
    title: "Toolbar & Settings",
    subtitle: "Everything you need is one click away",
    content: [
      "The toolbar at the top gives you quick access to: Calculate (play button), Save, Undo/Redo, Columns, Filters, and more.",
      "The Settings dropdown has display options, PDF export, activity codes, and schedule settings.",
      "Use Group By to organize your view by WBS, Activity Code, or other criteria."
    ],
    tip: "Export to PDF anytime — your header/footer settings are saved automatically for next time.",
  },
];

export function CpmOnboarding({ onComplete, onSkip }: CpmOnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-lg mx-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Skip button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30">
              <Icon className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Step {step + 1} of {STEPS.length}
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-1">{current.title}</h2>
          <p className="text-sm text-amber-400/80 font-medium mb-5">{current.subtitle}</p>

          {/* Content paragraphs */}
          <div className="space-y-3 mb-5">
            {current.content.map((paragraph, i) => (
              <p key={i} className="text-sm text-zinc-300 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Tip */}
          {current.tip && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-6">
              <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-300/90 leading-relaxed">{current.tip}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              disabled={isFirst}
              className="text-zinc-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {/* Step dots */}
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === step
                      ? "bg-amber-400 w-6"
                      : i < step
                      ? "bg-amber-400/40"
                      : "bg-zinc-600"
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <Button
                size="sm"
                onClick={onComplete}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                Get Started
                <Rocket className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setStep(s => s + 1)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
