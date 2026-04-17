/**
 * ProcessingOverlay — Animated construction-themed overlay shown during
 * ConstructLine analysis. Features:
 * - Branded splash intro animation (wordmark reveal + glow pulse)
 * - Clear 3-step phase progression: Index → Extract → Consolidate
 * - Animated blueprint/construction visual
 * - Rotating status messages that cycle through analysis phases
 * - Real sheet-by-sheet progress bar
 * - Sheet name display as each one is processed
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Ruler,
  HardHat,
  Layers,
  Calculator,
  ScanLine,
  FileSearch,
  Boxes,
  Hammer,
  Wrench,
  DollarSign,
  CheckCircle2,
  Loader2,
  Circle,
} from "lucide-react";

// ─── Status Messages ──────────────────────────────────────────────────────────

const PHASE1_MESSAGES = [
  { icon: ScanLine, text: "Scanning all drawings to build project context..." },
  { icon: FileSearch, text: "Identifying plan views and section details..." },
  { icon: Ruler, text: "Extracting building dimensions from plans..." },
  { icon: Layers, text: "Mapping structural elements across sheets..." },
];

const PHASE2_MESSAGES = [
  { icon: Boxes, text: "Classifying materials by CSI division..." },
  { icon: Calculator, text: "Calculating material quantities..." },
  { icon: HardHat, text: "Cross-referencing with plan dimensions..." },
  { icon: Hammer, text: "Matching items to unit cost database..." },
  { icon: Wrench, text: "Applying regional cost adjustments..." },
  { icon: DollarSign, text: "Finalizing cost estimates..." },
];

const PHASE3_MESSAGES = [
  { icon: Layers, text: "Merging duplicate items across sheets..." },
  { icon: Calculator, text: "Replacing lump sums with measured quantities..." },
  { icon: Ruler, text: "Generating formwork calculations..." },
  { icon: ScanLine, text: "Enforcing scope compliance..." },
  { icon: DollarSign, text: "Recalculating final costs..." },
];

type AnalysisPhase = "indexing" | "extracting" | "consolidating";

interface ProcessingOverlayProps {
  /** Total number of sheets being processed */
  totalSheets: number;
  /** Number of sheets completed so far */
  processedSheets: number;
  /** List of sheet objects with status info */
  sheets?: Array<{
    id: number;
    sheetName?: string | null;
    pageNumber: number;
    status: string;
  }>;
  /** Current project status for phase display */
  projectStatus?: string;
}

// ─── Splash Animation Component ──────────────────────────────────────────────

function SplashIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Phase 1: Enter animation (1.2s)
    const holdTimer = setTimeout(() => setPhase("hold"), 1200);
    // Phase 2: Hold with glow pulse (2.3s total = 1.2 + 1.1)
    const exitTimer = setTimeout(() => setPhase("exit"), 3500);
    // Phase 3: Exit animation (0.6s), then done
    const doneTimer = setTimeout(() => onCompleteRef.current(), 4100);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []); // Empty deps — run once on mount, use ref for callback

  return (
    <div
      className="flex flex-col items-center justify-center py-16 relative overflow-hidden"
      style={{
        animation:
          phase === "enter"
            ? "cl-splash-fade-in 1s ease-out forwards"
            : phase === "exit"
              ? "cl-splash-exit 0.5s ease-in forwards"
              : undefined,
      }}
    >
      {/* Expanding ring effects */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-32 h-32 rounded-full border-2 border-amber-500/40 absolute"
          style={{
            animation: "cl-splash-ring-expand 2s ease-out 0.3s forwards",
          }}
        />
        <div
          className="w-32 h-32 rounded-full border border-amber-500/20 absolute"
          style={{
            animation: "cl-splash-ring-expand 2.5s ease-out 0.6s forwards",
          }}
        />
      </div>

      {/* Main wordmark */}
      <div
        className="relative z-10"
        style={{
          animation:
            phase === "hold"
              ? "cl-splash-glow-pulse 2s ease-in-out infinite"
              : undefined,
        }}
      >
        <span className="text-5xl sm:text-6xl font-black tracking-tight select-none">
          <span className="text-white">Construct</span>
          <span className="text-amber-400">Line</span>
        </span>
      </div>

      {/* Accent line sweep */}
      <div
        className="h-0.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-4 rounded-full"
        style={{
          animation: "cl-splash-line-sweep 1.2s ease-out 0.4s forwards",
          width: 0,
        }}
      />

      {/* Subtitle */}
      <div
        className="mt-4"
        style={{
          animation: "cl-splash-subtitle-in 0.8s ease-out 0.6s forwards",
          opacity: 0,
        }}
      >
        <span className="text-[10px] text-cream-muted/50 tracking-[0.3em] uppercase font-medium">
          Powered by ALP
        </span>
      </div>

      {/* Loading dots */}
      <div className="flex items-center gap-1.5 mt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-amber-400"
            style={{
              animation: `cl-splash-dots 1.5s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Initializing text */}
      <p
        className="text-xs text-cream-muted/40 mt-3"
        style={{
          animation: "cl-splash-subtitle-in 0.6s ease-out 1s forwards",
          opacity: 0,
        }}
      >
        Initializing analysis engine...
      </p>
    </div>
  );
}

// ─── Main Processing Overlay ─────────────────────────────────────────────────

export default function ProcessingOverlay({
  totalSheets,
  processedSheets,
  sheets,
  projectStatus,
}: ProcessingOverlayProps) {
  const [showSplash, setShowSplash] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Determine current phase
  const currentPhase: AnalysisPhase = useMemo(() => {
    if (projectStatus === "post_processing") return "consolidating";
    if (processedSheets > 0) return "extracting";
    return "indexing";
  }, [projectStatus, processedSheets]);

  // Get messages for current phase
  const phaseMessages = useMemo(() => {
    switch (currentPhase) {
      case "indexing": return PHASE1_MESSAGES;
      case "extracting": return PHASE2_MESSAGES;
      case "consolidating": return PHASE3_MESSAGES;
    }
  }, [currentPhase]);

  // Track elapsed time for ETA calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Rotate through status messages every 3.5 seconds
  useEffect(() => {
    setMessageIndex(0); // Reset when phase changes
  }, [currentPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % phaseMessages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [phaseMessages]);

  const percentage = totalSheets > 0
    ? Math.round((processedSheets / totalSheets) * 100)
    : 0;

  const currentMessage = phaseMessages[messageIndex % phaseMessages.length];
  const CurrentIcon = currentMessage.icon;

  // Find the currently processing sheet
  const currentSheet = useMemo(() => {
    if (!sheets) return null;
    return sheets.find((s) => s.status === "processing");
  }, [sheets]);

  // Phase step config
  const phases = [
    { key: "indexing" as const, label: "Index Drawings", description: "Building project context" },
    { key: "extracting" as const, label: "Extract Quantities", description: "Analyzing each sheet" },
    { key: "consolidating" as const, label: "Consolidate & Enhance", description: "Merging & refining results" },
  ];

  const phaseOrder: AnalysisPhase[] = ["indexing", "extracting", "consolidating"];
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);

  // ─── Splash Phase ────────────────────────────────────────────────────────
  if (showSplash) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-navy-medium/40 to-navy-deep/60 overflow-hidden">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />
        <SplashIntro onComplete={() => setShowSplash(false)} />
      </div>
    );
  }

  // ─── Working Phase ───────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-navy-medium/40 to-navy-deep/60 overflow-hidden"
      style={{ animation: "cl-splash-fade-in 0.6s ease-out" }}
    >
      {/* Top accent bar — animated gradient */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />

      <div className="px-8 py-10">
        {/* Animated Icon Cluster */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            {/* Outer ring — slow pulse */}
            <div className="w-28 h-28 rounded-full border-2 border-amber-500/20 flex items-center justify-center animate-[pulse_3s_ease-in-out_infinite]">
              {/* Inner ring — spinning dashes */}
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-amber-500/40 flex items-center justify-center animate-[spin_8s_linear_infinite]">
                {/* Center icon — current phase */}
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <CurrentIcon className="w-6 h-6 text-amber-400 transition-all duration-500" />
                </div>
              </div>
            </div>
            {/* Orbiting dots */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 rounded-full bg-amber-500/60 animate-[bounce_2s_ease-in-out_infinite]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-orange-500/40 animate-[bounce_2.5s_ease-in-out_infinite_0.5s]" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-cream text-center mb-6">
          <span className="text-white font-bold tracking-tight">Construct</span><span className="text-amber-400 font-bold tracking-tight">Line</span> is Working
        </h3>

        {/* ─── 3-Step Phase Progress ─────────────────────────────────────── */}
        <div className="max-w-lg mx-auto mb-8">
          <div className="flex items-center justify-between">
            {phases.map((phase, i) => {
              const isComplete = i < currentPhaseIndex;
              const isActive = i === currentPhaseIndex;

              return (
                <div key={phase.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {i > 0 && (
                    <div
                      className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${
                        isComplete || isActive
                          ? "bg-emerald-500/40"
                          : "bg-white/10"
                      }`}
                    />
                  )}

                  {/* Step circle */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${
                      isComplete
                        ? "bg-emerald-500/20 border-2 border-emerald-500/50"
                        : isActive
                          ? "bg-amber-500/20 border-2 border-amber-500/50"
                          : "bg-white/5 border-2 border-white/10"
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                    ) : (
                      <Circle className="w-3 h-3 text-cream-muted/30" />
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={`text-xs font-semibold text-center leading-tight ${
                      isComplete
                        ? "text-emerald-400"
                        : isActive
                          ? "text-amber-300"
                          : "text-cream-muted/30"
                    }`}
                  >
                    {phase.label}
                  </span>

                  {/* Step description */}
                  <span
                    className={`text-[10px] text-center mt-0.5 ${
                      isComplete
                        ? "text-emerald-400/60"
                        : isActive
                          ? "text-amber-300/60"
                          : "text-cream-muted/20"
                    }`}
                  >
                    {isComplete ? "Done" : isActive ? phase.description : "Waiting"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current phase message */}
        <p className="text-amber-300/90 text-sm font-medium text-center mb-6 h-5 transition-all duration-300">
          {currentMessage.text}
        </p>

        {/* Progress Bar — different behavior per phase */}
        <div className="max-w-md mx-auto mb-6">
          {currentPhase === "indexing" ? (
            <>
              {/* Indeterminate progress for indexing */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-cream-muted">
                  Scanning {totalSheets} sheets...
                </span>
                <span className="text-xs font-semibold text-amber-400">
                  Indexing
                </span>
              </div>
              <div className="w-full bg-navy-deep/80 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, transparent, #f59e0b, #ea580c, #f59e0b, transparent)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s ease-in-out infinite",
                    opacity: 0.6,
                  }}
                />
              </div>
            </>
          ) : currentPhase === "extracting" ? (
            <>
              {/* Determinate progress for extraction */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-cream-muted">
                  {processedSheets} of {totalSheets} sheets extracted
                </span>
                <span className="text-xs font-semibold text-amber-400">
                  {percentage}%
                </span>
              </div>
              <div className="w-full bg-navy-deep/80 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                  style={{
                    width: `${Math.max(percentage, 3)}%`,
                    background: "linear-gradient(90deg, #f59e0b, #ea580c, #f59e0b)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 2s ease-in-out infinite",
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                      animation: "shimmer 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Indeterminate progress for consolidation */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-cream-muted">
                  All {totalSheets} sheets extracted
                </span>
                <span className="text-xs font-semibold text-amber-400">
                  Enhancing
                </span>
              </div>
              <div className="w-full bg-navy-deep/80 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    width: "100%",
                    background: "linear-gradient(90deg, transparent, #10b981, #059669, #10b981, transparent)",
                    backgroundSize: "200% 100%",
                    animation: "shimmer 1.5s ease-in-out infinite",
                    opacity: 0.6,
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Currently Processing Sheet — only during extraction */}
        {currentPhase === "extracting" && currentSheet && (
          <div className="text-center mb-6">
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-xs px-3 py-1">
              Analyzing: {currentSheet.sheetName || `Page ${currentSheet.pageNumber}`}
            </Badge>
          </div>
        )}

        {/* Sheet Status Pills — only during extraction, max 20 */}
        {currentPhase === "extracting" && sheets && sheets.length > 0 && sheets.length <= 20 && (
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {sheets.map((sheet) => {
              const isCompleted = sheet.status === "completed";
              const isProcessing = sheet.status === "processing";
              const isError = sheet.status === "error";
              return (
                <div
                  key={sheet.id}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold transition-all duration-500 ${
                    isCompleted
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : isProcessing
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse"
                        : isError
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : "bg-white/5 text-cream-muted/40 border border-white/10"
                  }`}
                  title={sheet.sheetName || `Page ${sheet.pageNumber}`}
                >
                  {isCompleted ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isProcessing ? (
                    <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    sheet.pageNumber
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Estimated Time Remaining — only during extraction */}
        {currentPhase === "extracting" && (() => {
          const remaining = totalSheets - processedSheets;
          if (remaining <= 0) return null;
          const avgPerSheet = processedSheets > 0 && elapsed > 5000
            ? elapsed / processedSheets
            : 30000;
          const etaMs = remaining * avgPerSheet;
          const etaMin = Math.ceil(etaMs / 60000);
          const etaSec = Math.ceil(etaMs / 1000);
          const timeStr = etaSec < 60
            ? `~${etaSec} seconds`
            : etaMin === 1
              ? "~1 minute"
              : `~${etaMin} minutes`;
          return (
            <p className="text-center text-xs text-cream-muted/60 mt-4 mb-1">
              Estimated time remaining: <span className="text-amber-300/80 font-medium">{timeStr}</span>
            </p>
          );
        })()}

        {/* Tip */}
        <p className="text-center text-[11px] text-cream-muted/40 mt-4">
          You can leave this page — analysis continues in the background
        </p>
      </div>
    </div>
  );
}
