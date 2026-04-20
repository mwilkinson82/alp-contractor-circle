/**
 * ProcessingOverlay — Polished construction-themed overlay shown during
 * ConstructLine analysis. Features:
 * - Branded splash intro animation (wordmark reveal + glow pulse)
 * - Clear 3-step phase progression: Index → Extract → Consolidate
 * - Circular progress ring with live countdown timer as the HERO element
 * - Rotating status messages that cycle through analysis phases
 * - Sheet status grid showing completed/processing/pending sheets
 * - Elapsed time display
 */
import { useState, useEffect, useMemo, useRef } from "react";
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format milliseconds to "M:SS" or "H:MM:SS" */
function formatTime(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── SVG Circular Progress Ring ──────────────────────────────────────────────

const RING_SIZE = 180;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({
  percentage,
  isIndeterminate,
  color,
}: {
  percentage: number;
  isIndeterminate: boolean;
  color: "amber" | "emerald";
}) {
  const strokeColor = color === "amber" ? "#f59e0b" : "#10b981";
  const glowColor =
    color === "amber" ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)";
  const trackColor = "rgba(255, 255, 255, 0.06)";

  const offset = isIndeterminate
    ? RING_CIRCUMFERENCE * 0.75
    : RING_CIRCUMFERENCE * (1 - Math.min(percentage, 100) / 100);

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="block"
      style={{ filter: `drop-shadow(0 0 12px ${glowColor})` }}
    >
      {/* Background track */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={trackColor}
        strokeWidth={RING_STROKE}
      />
      {/* Progress arc */}
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={strokeColor}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        style={{
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: isIndeterminate
            ? "none"
            : "stroke-dashoffset 0.8s ease-out",
          animation: isIndeterminate
            ? "cl-ring-spin 2s linear infinite"
            : "none",
        }}
      />
    </svg>
  );
}

// ─── Splash Animation Component ──────────────────────────────────────────────

function SplashIntro({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("hold"), 1200);
    const exitTimer = setTimeout(() => setPhase("exit"), 3500);
    const doneTimer = setTimeout(() => onCompleteRef.current(), 4100);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, []);

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
      case "indexing":
        return PHASE1_MESSAGES;
      case "extracting":
        return PHASE2_MESSAGES;
      case "consolidating":
        return PHASE3_MESSAGES;
    }
  }, [currentPhase]);

  // Track elapsed time — update every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Rotate through status messages every 3.5 seconds
  useEffect(() => {
    setMessageIndex(0);
  }, [currentPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % phaseMessages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [phaseMessages]);

  const percentage =
    totalSheets > 0 ? Math.round((processedSheets / totalSheets) * 100) : 0;

  const currentMessage = phaseMessages[messageIndex % phaseMessages.length];
  const CurrentIcon = currentMessage.icon;

  // Find the currently processing sheet
  const currentSheet = useMemo(() => {
    if (!sheets) return null;
    return sheets.find((s) => s.status === "processing");
  }, [sheets]);

  // ETA calculation — real countdown based on per-sheet speed
  const etaMs = useMemo(() => {
    if (currentPhase === "indexing") {
      // During indexing, estimate ~30s per sheet for the full job
      return totalSheets * 30000;
    }
    if (currentPhase === "consolidating") {
      // Consolidation is usually ~60-90s regardless of sheet count
      return 60000;
    }
    // Extracting phase: use actual per-sheet timing
    const remaining = totalSheets - processedSheets;
    if (remaining <= 0) return 0;
    const avgPerSheet =
      processedSheets > 0 && elapsed > 5000
        ? elapsed / processedSheets
        : 30000; // fallback 30s/sheet
    return remaining * avgPerSheet;
  }, [currentPhase, totalSheets, processedSheets, elapsed]);

  // Phase step config
  const phases = [
    {
      key: "indexing" as const,
      label: "Index Drawings",
      description: "Building project context",
    },
    {
      key: "extracting" as const,
      label: "Extract Quantities",
      description: "Analyzing each sheet",
    },
    {
      key: "consolidating" as const,
      label: "Consolidate & Enhance",
      description: "Merging & refining results",
    },
  ];

  const phaseOrder: AnalysisPhase[] = [
    "indexing",
    "extracting",
    "consolidating",
  ];
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);

  const isIndeterminate =
    currentPhase === "indexing" || currentPhase === "consolidating";
  const ringColor = currentPhase === "consolidating" ? "emerald" : "amber";

  // ─── Splash Phase ────────────────────────────────────────────────────────
  if (showSplash) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/5 via-navy-medium/40 to-navy-deep/60 overflow-hidden">
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
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]" />

      <div className="px-6 sm:px-8 py-8 sm:py-10">
        {/* ─── HERO: Circular Progress Ring + Countdown ──────────────── */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <ProgressRing
              percentage={percentage}
              isIndeterminate={isIndeterminate}
              color={ringColor}
            />
            {/* Center content — inside the ring */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isIndeterminate ? (
                <>
                  {/* Pulsing icon for indeterminate phases */}
                  <CurrentIcon
                    className="w-8 h-8 text-amber-400 mb-1"
                    style={{
                      animation: "cl-icon-pulse 2s ease-in-out infinite",
                    }}
                  />
                  <span className="text-[11px] text-cream-muted/60 font-medium">
                    {currentPhase === "indexing" ? "Indexing" : "Enhancing"}
                  </span>
                </>
              ) : (
                <>
                  {/* Live countdown timer — the HERO */}
                  <span className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight leading-none">
                    {formatTime(etaMs)}
                  </span>
                  <span className="text-[11px] text-cream-muted/60 font-medium mt-1">
                    remaining
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Percentage + elapsed row */}
          <div className="flex items-center gap-4 mt-4">
            {!isIndeterminate && (
              <span className="text-sm font-semibold text-amber-400">
                {percentage}% complete
              </span>
            )}
            <span className="text-xs text-cream-muted/50">
              Elapsed: {formatTime(elapsed)}
            </span>
          </div>
        </div>

        {/* ─── 3-Step Phase Progress ─────────────────────────────────── */}
        <div className="max-w-lg mx-auto mb-6">
          <div className="flex items-center justify-between">
            {phases.map((phase, i) => {
              const isComplete = i < currentPhaseIndex;
              const isActive = i === currentPhaseIndex;

              return (
                <div
                  key={phase.key}
                  className="flex-1 flex flex-col items-center relative"
                >
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
                    {isComplete
                      ? "Done"
                      : isActive
                        ? phase.description
                        : "Waiting"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current phase message with icon */}
        <div className="flex items-center justify-center gap-2 mb-6 h-5">
          <CurrentIcon className="w-4 h-4 text-amber-400/70 shrink-0" />
          <p className="text-amber-300/90 text-sm font-medium transition-all duration-300">
            {currentMessage.text}
          </p>
        </div>

        {/* Sheet progress bar (extraction phase only) */}
        {currentPhase === "extracting" && (
          <div className="max-w-md mx-auto mb-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-cream-muted">
                {processedSheets} of {totalSheets} sheets
              </span>
            </div>
            {/* Segmented progress — one segment per sheet */}
            <div className="flex gap-0.5 h-2 rounded-full overflow-hidden bg-navy-deep/80">
              {Array.from({ length: totalSheets }, (_, i) => {
                const isDone = i < processedSheets;
                const isActive = i === processedSheets;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm transition-all duration-500"
                    style={{
                      backgroundColor: isDone
                        ? "#10b981"
                        : isActive
                          ? "#f59e0b"
                          : "rgba(255,255,255,0.04)",
                      ...(isActive
                        ? {
                            animation:
                              "cl-segment-pulse 1.5s ease-in-out infinite",
                          }
                        : {}),
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Currently Processing Sheet — only during extraction */}
        {currentPhase === "extracting" && currentSheet && (
          <div className="text-center mb-5">
            <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-xs px-3 py-1">
              Analyzing: {currentSheet.sheetName || `Page ${currentSheet.pageNumber}`}
            </Badge>
          </div>
        )}

        {/* Sheet Status Grid — during extraction, max 60 sheets */}
        {currentPhase === "extracting" &&
          sheets &&
          sheets.length > 0 &&
          sheets.length <= 60 && (
            <div className="flex flex-wrap justify-center gap-1.5 max-w-lg mx-auto mb-4">
              {sheets.map((sheet) => {
                const isCompleted = sheet.status === "completed";
                const isProcessing = sheet.status === "processing";
                const isError = sheet.status === "error";
                return (
                  <div
                    key={sheet.id}
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold transition-all duration-500 ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : isProcessing
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : isError
                            ? "bg-red-500/20 text-red-400 border border-red-500/30"
                            : "bg-white/5 text-cream-muted/30 border border-white/5"
                    }`}
                    title={sheet.sheetName || `Page ${sheet.pageNumber}`}
                    style={
                      isProcessing
                        ? {
                            animation:
                              "cl-segment-pulse 1.5s ease-in-out infinite",
                          }
                        : undefined
                    }
                  >
                    {isCompleted ? (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : isProcessing ? (
                      <div className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      sheet.pageNumber
                    )}
                  </div>
                );
              })}
            </div>
          )}

        {/* Tip */}
        <p className="text-center text-[11px] text-cream-muted/40 mt-4">
          You can leave this page — analysis continues in the background
        </p>
      </div>

      {/* CSS Keyframes for ring animation */}
      <style>{`
        @keyframes cl-ring-spin {
          from { transform: rotate(-90deg); }
          to { transform: rotate(270deg); }
        }
        @keyframes cl-icon-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes cl-segment-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
