/**
 * CPM Scheduler Quick Start Onboarding Overlay
 * 
 * A guided walkthrough that appears the first time a user opens the CPM Scheduler.
 * Walks them through ALL key features: WBS, activities, relationships, Gantt,
 * activity codes, filtering/sorting, layouts, reports/annotations, and toolbar.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  FolderTree, ListChecks, Link2, BarChart3, Settings, Tags,
  Filter, LayoutGrid, FileText, ChevronRight, ChevronLeft,
  X, Rocket, Lightbulb, Crown
} from "lucide-react";

interface CpmOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  {
    icon: Crown,
    title: "Welcome to ConstructLine",
    subtitle: "Professional-grade CPM scheduling — built for contractors",
    content: [
      "You're now using a professional-grade Critical Path Method (CPM) scheduling application — the same methodology used in Oracle Primavera P6.",
      "Everything you can do in P6, you can do here: WBS hierarchies, activity codes, logic ties, critical path analysis, resource loading, PDF exports, and more.",
      "We've designed it to be intuitive so you can build world-class schedules without the steep learning curve. Let's walk through the key features."
    ],
    tip: null,
  },
  {
    icon: FolderTree,
    title: "Work Breakdown Structure (WBS)",
    subtitle: "Organize your project into logical phases",
    content: [
      "Your schedule is organized by WBS — a hierarchical breakdown of your project. \"Construction\" is the main parent, with trade divisions like Sitework, Concrete, Structural, and MEP as children underneath.",
      "Click any WBS node to expand or collapse its activities. Right-click to add child nodes, rename, reorder, or color-code them.",
      "When grouped by WBS, you see your schedule the way you'd present it to an owner or GC — organized by phase, not just a flat list."
    ],
    tip: "Templates come with a pre-built WBS. Customize it to match your project's actual scope and divisions.",
  },
  {
    icon: ListChecks,
    title: "Activities & Durations",
    subtitle: "The building blocks of your schedule",
    content: [
      "Activities are the individual tasks — each has an ID, name, and duration in working days. Click any row to edit it inline.",
      "Use the + Add button to create new activities, or right-click for more options. The Columns button lets you show/hide fields like Early Start, Early Finish, Total Float, and more.",
      "Activities with 0d Total Float are on the Critical Path — any delay to those activities pushes your project completion date."
    ],
    tip: "Use the Bulk Add button to quickly add multiple activities at once — great for building out a new phase.",
  },
  {
    icon: Link2,
    title: "Logic Ties (Relationships)",
    subtitle: "Connect activities to build your schedule logic",
    content: [
      "Relationships define the sequence of work: Finish-to-Start (FS), Start-to-Start (SS), Finish-to-Finish (FF), and Start-to-Finish (SF).",
      "Select two activities and use the Link button, or click the ··· menu on any activity to add predecessors and successors with lag.",
      "After adding relationships, hit the Calculate button (▶) to run the forward and backward pass — this computes your critical path and all dates."
    ],
    tip: "The most common relationship is FS (Finish-to-Start). Use SS with lag for overlapping activities like \"Start framing 5 days after drywall starts.\"",
  },
  {
    icon: BarChart3,
    title: "Gantt Chart",
    subtitle: "Visualize your schedule timeline",
    content: [
      "The right panel shows the Gantt chart — a visual timeline of all your activities. Green bars show activity durations. Red bars highlight the critical path.",
      "Gray lines between bars show your logic ties (relationships). Scroll horizontally to navigate the timeline.",
      "Use the zoom controls (Day, Week, Month) and percentage buttons (50%, 75%, 100%, 125%, 150%) to adjust the time scale to your liking."
    ],
    tip: "The Gantt updates automatically when you calculate. Look for the red critical path — that's what drives your project end date.",
  },
  {
    icon: Tags,
    title: "Activity Codes",
    subtitle: "Categorize and organize your activities",
    content: [
      "Activity Codes let you tag activities with categories like Phase, Trade, Area, or Responsibility — just like P6 activity codes.",
      "Use the Columns button to add activity code columns to your spreadsheet. Click any cell to assign a code value from the dropdown.",
      "Once coded, you can Group By or Filter by any activity code to see exactly what you need — like \"Show me all Electrical activities\" or \"Group by Phase.\""
    ],
    tip: "Activity codes are powerful for reporting. Code your activities early — it pays off when you need to filter or present to different audiences.",
  },
  {
    icon: Filter,
    title: "Filtering & Sorting",
    subtitle: "Find exactly what you need, instantly",
    content: [
      "The Filter button lets you create filters by any field — WBS, activity code, date range, float, or critical path status.",
      "Sort any column by clicking its header. Sort by Total Float to see your most critical activities first.",
      "The Group button lets you group your view by WBS, Activity Code, or other criteria — switch between views instantly without changing your data."
    ],
    tip: "Create a filter for \"Critical Path Only\" to focus on the activities that matter most during schedule reviews.",
  },
  {
    icon: LayoutGrid,
    title: "Layouts",
    subtitle: "Save and switch between different views",
    content: [
      "Layouts save your entire view configuration — which columns are visible, how you're grouped, what filters are active, and your zoom level.",
      "Save a layout for \"Owner Presentation\" (grouped by WBS, key columns only) and another for \"Detailed Review\" (all columns, sorted by float).",
      "Switch between layouts instantly from the Settings dropdown. Your PDF export settings are saved with each layout too."
    ],
    tip: "The default layout is auto-created when you start from a template. Create additional layouts for different audiences.",
  },
  {
    icon: FileText,
    title: "Reports & Annotations",
    subtitle: "Document, annotate, and export your schedule",
    content: [
      "The Annotate tool lets you mark up your Gantt chart — highlight delays, add notes to activities, and document schedule changes for owner presentations.",
      "Export to PDF with customizable headers and footers — your company name, logo, project name, and client info are pulled automatically from your profile and schedule settings.",
      "The Reports section gives you schedule statistics, critical path summaries, and activity breakdowns you can present to owners and GCs."
    ],
    tip: "Use annotations before schedule review meetings to highlight key changes, delays, or recovery plans directly on the Gantt.",
  },
  {
    icon: Settings,
    title: "You're Ready to Build",
    subtitle: "Everything a P6 scheduler needs — without the complexity",
    content: [
      "You now have a complete CPM scheduling toolset: WBS hierarchies, activity codes, logic ties, critical path analysis, Gantt visualization, filtering, layouts, annotations, and PDF export.",
      "The Settings dropdown has additional options: schedule settings (project name, client, contract number), display preferences, and feedback.",
      "This is YOUR scheduling application. Build it the way you want. Import from P6, start from a template, or build from scratch. You're in control."
    ],
    tip: "Need help? Click Settings → Help / Tour anytime to replay this walkthrough. We're building this for you — send feedback anytime.",
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
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500 ease-out"
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
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30">
              <Icon className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Step {step + 1} of {STEPS.length}
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-1">{current.title}</h2>
          <p className="text-sm text-blue-400/80 font-medium mb-5">{current.subtitle}</p>

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
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-6">
              <Lightbulb className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300/90 leading-relaxed">{current.tip}</p>
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
                      ? "bg-blue-400 w-6"
                      : i < step
                      ? "bg-blue-400/40"
                      : "bg-zinc-600"
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <Button
                size="sm"
                onClick={onComplete}
                className="bg-blue-500 hover:bg-blue-400 text-white font-semibold"
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
