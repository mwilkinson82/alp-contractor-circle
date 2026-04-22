/**
 * ProcessingOverlay — Cinematic, cream-toned overlay shown during
 * ConstructLine analysis. Features:
 * - Branded cinematic splash intro (wordmark reveal + elegant sweep)
 * - Clear 3-step phase progression: Index → Extract → Price & Consolidate
 * - Circular progress ring with live countdown timer as the HERO element
 * - Rotating status messages that cycle through analysis phases
 * - Segmented sheet progress bar + sheet status grid
 * - Smart remaining time estimate (never shows 0:00 while processing)
 *
 * Design: Warm cream/off-white background, charcoal text, copper/bronze accents
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

// ─── Design Tokens ──────────────────────────────────────────────────────────

const COLORS = {
  bg: "#FAF8F5",           // warm cream
  bgSubtle: "#F3F0EB",     // slightly deeper cream
  bgCard: "#FFFFFF",        // white card surfaces
  text: "#2C2825",          // warm charcoal
  textMuted: "#8A8279",     // muted warm gray
  textLight: "#B5AEA4",     // light warm gray
  accent: "#B8865C",        // copper/bronze accent
  accentLight: "#D4A574",   // lighter copper
  accentGlow: "rgba(184, 134, 92, 0.25)",
  success: "#5B8A72",       // sage green
  successLight: "rgba(91, 138, 114, 0.15)",
  active: "#B8865C",        // copper for active states
  activeLight: "rgba(184, 134, 92, 0.12)",
  error: "#C4645A",         // muted red
  pending: "#E8E3DC",       // light warm gray for pending
  border: "#E8E3DC",        // warm border
  borderAccent: "rgba(184, 134, 92, 0.3)",
};

// ─── Status Messages ──────────────────────────────────────────────────────────

const PHASE1_MESSAGES = [
  { icon: ScanLine, text: "Scanning drawings — classifying sheet types..." },
  { icon: FileSearch, text: "Identifying plan views, sections, and details..." },
  { icon: Layers, text: "Detecting cover sheets and schedules..." },
  { icon: Ruler, text: "Preparing sheets for extraction..." },
];

const PHASE2_MESSAGES = [
  { icon: HardHat, text: "Pass 1 — Reading the drawing holistically..." },
  { icon: Boxes, text: "Pass 1 — Extracting every measurable quantity..." },
  { icon: Calculator, text: "Pass 1 — Classifying items by CSI division..." },
  { icon: ScanLine, text: "Pass 2 — Verifying quantities against the drawing..." },
  { icon: FileSearch, text: "Pass 2 — Checking for missing items..." },
  { icon: Wrench, text: "Pass 2 — Correcting any quantity errors..." },
  { icon: Hammer, text: "Merging verified results..." },
];

const PHASE3_MESSAGES = [
  { icon: Layers, text: "Consolidating duplicate items across all sheets..." },
  { icon: Calculator, text: "Converting lump sums to measured quantities..." },
  { icon: Ruler, text: "Calculating formwork (SFCA)..." },
  { icon: Wrench, text: "Enhancing rebar quantities..." },
  { icon: DollarSign, text: "Applying material and labor pricing..." },
  { icon: ScanLine, text: "Applying regional cost multiplier..." },
];

type AnalysisPhase = "indexing" | "extracting" | "consolidating";

interface ProcessingOverlayProps {
  totalSheets: number;
  processedSheets: number;
  sheets?: Array<{
    id: number;
    sheetName?: string | null;
    pageNumber: number;
    status: string;
  }>;
  projectStatus?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ms: number): string {
  if (ms <= 0) return "< 1 min";
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

const RING_SIZE = 200;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({
  percentage,
  isIndeterminate,
  phase,
}: {
  percentage: number;
  isIndeterminate: boolean;
  phase: AnalysisPhase;
}) {
  const strokeColor = phase === "consolidating" ? COLORS.success : COLORS.accent;
  const glowColor = phase === "consolidating"
    ? "rgba(91, 138, 114, 0.3)"
    : COLORS.accentGlow;
  const trackColor = COLORS.border;

  const offset = isIndeterminate
    ? RING_CIRCUMFERENCE * 0.75
    : RING_CIRCUMFERENCE * (1 - Math.min(percentage, 100) / 100);

  return (
    <svg
      width={RING_SIZE}
      height={RING_SIZE}
      viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
      className="block"
      style={{ filter: `drop-shadow(0 0 16px ${glowColor})` }}
    >
      <circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        fill="none"
        stroke={trackColor}
        strokeWidth={RING_STROKE}
      />
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
          transition: isIndeterminate ? "none" : "stroke-dashoffset 0.8s ease-out",
          animation: isIndeterminate ? "cl-ring-spin 2s linear infinite" : "none",
        }}
      />
    </svg>
  );
}

// ─── Cinematic Splash Animation ─────────────────────────────────────────────

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
      className="flex flex-col items-center justify-center py-20 relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.bgSubtle} 100%)`,
        animation:
          phase === "enter"
            ? "cl-splash-fade-in 1.2s ease-out forwards"
            : phase === "exit"
              ? "cl-splash-exit 0.5s ease-in forwards"
              : undefined,
      }}
    >
      {/* Expanding ring effects — subtle and elegant */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-32 h-32 rounded-full absolute"
          style={{
            border: `1.5px solid ${COLORS.borderAccent}`,
            animation: "cl-splash-ring-expand 2.5s ease-out 0.3s forwards",
          }}
        />
        <div
          className="w-32 h-32 rounded-full absolute"
          style={{
            border: `1px solid rgba(184, 134, 92, 0.12)`,
            animation: "cl-splash-ring-expand 3s ease-out 0.6s forwards",
          }}
        />
      </div>

      {/* Main wordmark */}
      <div
        className="relative z-10"
        style={{
          animation:
            phase === "hold"
              ? "cl-splash-glow-pulse 2.5s ease-in-out infinite"
              : undefined,
        }}
      >
        <span className="text-5xl sm:text-6xl font-black tracking-tight select-none">
          <span style={{ color: COLORS.text }}>Construct</span>
          <span style={{ color: COLORS.accent }}>Line</span>
        </span>
      </div>

      {/* Accent line sweep */}
      <div
        className="h-px mt-5 rounded-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
          animation: "cl-splash-line-sweep 1.2s ease-out 0.4s forwards",
          width: 0,
        }}
      />

      {/* Subtitle */}
      <div
        className="mt-5"
        style={{
          animation: "cl-splash-subtitle-in 0.8s ease-out 0.6s forwards",
          opacity: 0,
        }}
      >
        <span
          className="text-[10px] tracking-[0.35em] uppercase font-medium"
          style={{ color: COLORS.textLight }}
        >
          Powered by ALP
        </span>
      </div>

      {/* Loading dots */}
      <div className="flex items-center gap-2 mt-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: COLORS.accent,
              animation: `cl-splash-dots 1.5s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Initializing text */}
      <p
        className="text-xs mt-4"
        style={{
          color: COLORS.textLight,
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
  const consolidationStartRef = useRef<number | null>(null);
  const [consolidationElapsed, setConsolidationElapsed] = useState(0);

  const currentPhase: AnalysisPhase = useMemo(() => {
    if (projectStatus === "post_processing") return "consolidating";
    if (processedSheets > 0) return "extracting";
    return "indexing";
  }, [projectStatus, processedSheets]);

  useEffect(() => {
    if (currentPhase === "consolidating") {
      if (!consolidationStartRef.current) {
        consolidationStartRef.current = Date.now();
      }
      const interval = setInterval(() => {
        setConsolidationElapsed(Date.now() - (consolidationStartRef.current || Date.now()));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      consolidationStartRef.current = null;
      setConsolidationElapsed(0);
    }
  }, [currentPhase]);

  const phaseMessages = useMemo(() => {
    switch (currentPhase) {
      case "indexing": return PHASE1_MESSAGES;
      case "extracting": return PHASE2_MESSAGES;
      case "consolidating": return PHASE3_MESSAGES;
    }
  }, [currentPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    setMessageIndex(0);
  }, [currentPhase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % phaseMessages.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [phaseMessages]);

  const percentage = totalSheets > 0 ? Math.round((processedSheets / totalSheets) * 100) : 0;
  const currentMessage = phaseMessages[messageIndex % phaseMessages.length];
  const CurrentIcon = currentMessage.icon;

  const currentSheet = useMemo(() => {
    if (!sheets) return null;
    return sheets.find((s) => s.status === "processing");
  }, [sheets]);

  const CONSOLIDATION_ESTIMATE_MS = 180000;

  const etaMs = useMemo(() => {
    if (currentPhase === "indexing") return 0; // No timer during indexing
    if (currentPhase === "consolidating") {
      // Never let it hit zero — show at least 15s while still in this phase
      return Math.max(15000, CONSOLIDATION_ESTIMATE_MS - consolidationElapsed);
    }
    const remaining = totalSheets - processedSheets;
    if (remaining <= 0) return 15000; // Almost done — show minimal time
    const avgPerSheet = processedSheets > 0 && elapsed > 5000
      ? elapsed / processedSheets
      : 30000;
    return Math.max(15000, remaining * avgPerSheet); // Never show less than 15s
  }, [currentPhase, totalSheets, processedSheets, elapsed, consolidationElapsed]);

  const phases = [
    { key: "indexing" as const, label: "Classify Sheets", description: "Identifying sheet types" },
    { key: "extracting" as const, label: "Extract & Verify", description: "2-pass AI per sheet" },
    { key: "consolidating" as const, label: "Price & Consolidate", description: "Material + labor pricing" },
  ];

  const phaseOrder: AnalysisPhase[] = ["indexing", "extracting", "consolidating"];
  const currentPhaseIndex = phaseOrder.indexOf(currentPhase);

  const isIndeterminate = currentPhase === "indexing";
  const consolidationPercentage = currentPhase === "consolidating"
    ? Math.min(95, Math.round((consolidationElapsed / CONSOLIDATION_ESTIMATE_MS) * 100))
    : 0;
  const displayPercentage = currentPhase === "consolidating" ? consolidationPercentage : percentage;

  // ─── Splash Phase ────────────────────────────────────────────────────────
  if (showSplash) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border: `1px solid ${COLORS.border}`,
          boxShadow: `0 4px 24px rgba(44, 40, 37, 0.08), 0 1px 3px rgba(44, 40, 37, 0.04)`,
        }}
      >
        <div
          className="h-1"
          style={{
            background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentLight}, ${COLORS.accent})`,
            backgroundSize: "200% 100%",
            animation: "shimmer 2s ease-in-out infinite",
          }}
        />
        <SplashIntro onComplete={() => setShowSplash(false)} />
      </div>
    );
  }

  // ─── Working Phase ───────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: `1px solid ${COLORS.border}`,
        background: `linear-gradient(180deg, ${COLORS.bg} 0%, ${COLORS.bgSubtle} 100%)`,
        boxShadow: `0 4px 24px rgba(44, 40, 37, 0.08), 0 1px 3px rgba(44, 40, 37, 0.04)`,
        animation: "cl-splash-fade-in 0.6s ease-out",
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${COLORS.accent}, ${COLORS.accentLight}, ${COLORS.accent})`,
          backgroundSize: "200% 100%",
          animation: "shimmer 2s ease-in-out infinite",
        }}
      />

      <div className="px-6 sm:px-10 py-10 sm:py-12">
        {/* ─── HERO: Circular Progress Ring + Countdown ──────────────── */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative">
            <ProgressRing
              percentage={displayPercentage}
              isIndeterminate={isIndeterminate}
              phase={currentPhase}
            />
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isIndeterminate ? (
                <>
                  <CurrentIcon
                    className="w-8 h-8 mb-1"
                    style={{
                      color: COLORS.accent,
                      animation: "cl-icon-pulse 2s ease-in-out infinite",
                    }}
                  />
                  <span className="text-[11px] font-medium" style={{ color: COLORS.textMuted }}>
                    Indexing
                  </span>
                </>
              ) : currentPhase === "consolidating" ? (
                <>
                  <CurrentIcon
                    className="w-8 h-8 mb-1"
                    style={{
                      color: COLORS.success,
                      animation: "cl-icon-pulse 2s ease-in-out infinite",
                    }}
                  />
                  <span className="text-[11px] font-medium" style={{ color: COLORS.textMuted }}>
                    Finalizing
                  </span>
                </>
              ) : (
                <>
                  <span
                    className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight leading-none"
                    style={{ color: COLORS.text }}
                  >
                    {formatTime(etaMs)}
                  </span>
                  <span className="text-[11px] font-medium mt-1.5" style={{ color: COLORS.textMuted }}>
                    remaining
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Percentage row */}
          {!isIndeterminate && (
            <div className="flex items-center gap-4 mt-5">
              <span className="text-sm font-semibold" style={{ color: COLORS.accent }}>
                {displayPercentage}% complete
              </span>
            </div>
          )}
        </div>

        {/* ─── 3-Step Phase Progress ─────────────────────────────────── */}
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
                      className="absolute top-4 right-1/2 w-full h-px -z-10"
                      style={{
                        backgroundColor: isComplete || isActive
                          ? COLORS.success
                          : COLORS.border,
                        opacity: isComplete || isActive ? 0.5 : 1,
                      }}
                    />
                  )}

                  {/* Step circle */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mb-2.5"
                    style={{
                      transition: "all 0.5s ease",
                      backgroundColor: isComplete
                        ? COLORS.successLight
                        : isActive
                          ? COLORS.activeLight
                          : "transparent",
                      border: `2px solid ${
                        isComplete
                          ? COLORS.success
                          : isActive
                            ? COLORS.accent
                            : COLORS.border
                      }`,
                    }}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="w-4 h-4" style={{ color: COLORS.success }} />
                    ) : isActive ? (
                      <Loader2
                        className="w-4 h-4 animate-spin"
                        style={{ color: COLORS.accent }}
                      />
                    ) : (
                      <Circle className="w-3 h-3" style={{ color: COLORS.textLight }} />
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className="text-xs font-semibold text-center leading-tight"
                    style={{
                      color: isComplete
                        ? COLORS.success
                        : isActive
                          ? COLORS.accent
                          : COLORS.textLight,
                    }}
                  >
                    {phase.label}
                  </span>

                  {/* Step description */}
                  <span
                    className="text-[10px] text-center mt-0.5"
                    style={{
                      color: isComplete
                        ? `${COLORS.success}99`
                        : isActive
                          ? `${COLORS.accent}99`
                          : COLORS.textLight,
                    }}
                  >
                    {isComplete ? "Done" : isActive ? phase.description : "Waiting"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current phase message with icon */}
        <div className="flex items-center justify-center gap-2.5 mb-8 h-5">
          <CurrentIcon className="w-4 h-4 shrink-0" style={{ color: `${COLORS.accent}B3` }} />
          <p
            className="text-sm font-medium"
            style={{
              color: COLORS.text,
              transition: "all 0.3s ease",
              opacity: 0.8,
            }}
          >
            {currentMessage.text}
          </p>
        </div>

        {/* Sheet progress bar (extraction phase only) */}
        {currentPhase === "extracting" && (
          <div className="max-w-md mx-auto mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: COLORS.textMuted }}>
                {processedSheets} of {totalSheets} sheets
              </span>
            </div>
            <div
              className="flex gap-0.5 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: COLORS.pending }}
            >
              {Array.from({ length: totalSheets }, (_, i) => {
                const isDone = i < processedSheets;
                const isActive = i === processedSheets;
                return (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      transition: "all 0.5s ease",
                      backgroundColor: isDone
                        ? COLORS.success
                        : isActive
                          ? COLORS.accent
                          : "transparent",
                      ...(isActive
                        ? { animation: "cl-segment-pulse 1.5s ease-in-out infinite" }
                        : {}),
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Currently Processing Sheet */}
        {currentPhase === "extracting" && currentSheet && (
          <div className="text-center mb-6">
            <Badge
              className="text-xs px-3 py-1 font-medium"
              style={{
                backgroundColor: COLORS.activeLight,
                color: COLORS.accent,
                border: `1px solid ${COLORS.borderAccent}`,
              }}
            >
              Analyzing: {currentSheet.sheetName || `Page ${currentSheet.pageNumber}`}
            </Badge>
          </div>
        )}

        {/* Sheet Status Grid — during extraction, max 60 sheets */}
        {currentPhase === "extracting" &&
          sheets &&
          sheets.length > 0 &&
          sheets.length <= 60 && (
            <div className="flex flex-wrap justify-center gap-1.5 max-w-lg mx-auto mb-5">
              {sheets.map((sheet) => {
                const isCompleted = sheet.status === "completed";
                const isProcessing = sheet.status === "processing";
                const isError = sheet.status === "error";
                return (
                  <div
                    key={sheet.id}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-mono font-bold"
                    style={{
                      transition: "all 0.5s ease",
                      backgroundColor: isCompleted
                        ? COLORS.successLight
                        : isProcessing
                          ? COLORS.activeLight
                          : isError
                            ? "rgba(196, 100, 90, 0.12)"
                            : COLORS.pending,
                      color: isCompleted
                        ? COLORS.success
                        : isProcessing
                          ? COLORS.accent
                          : isError
                            ? COLORS.error
                            : COLORS.textLight,
                      border: `1px solid ${
                        isCompleted
                          ? `${COLORS.success}40`
                          : isProcessing
                            ? COLORS.borderAccent
                            : isError
                              ? "rgba(196, 100, 90, 0.3)"
                              : COLORS.border
                      }`,
                      ...(isProcessing
                        ? { animation: "cl-segment-pulse 1.5s ease-in-out infinite" }
                        : {}),
                    }}
                    title={sheet.sheetName || `Page ${sheet.pageNumber}`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : isProcessing ? (
                      <div
                        className="w-2.5 h-2.5 rounded-full animate-spin"
                        style={{
                          border: `2px solid ${COLORS.accent}`,
                          borderTopColor: "transparent",
                        }}
                      />
                    ) : (
                      sheet.pageNumber
                    )}
                  </div>
                );
              })}
            </div>
          )}

        {/* Tip */}
        <p className="text-center text-[11px] mt-5" style={{ color: COLORS.textLight }}>
          You can leave this page — analysis continues in the background
        </p>
      </div>

      {/* CSS Keyframes */}
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
        @keyframes cl-splash-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cl-splash-exit {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.97); }
        }
        @keyframes cl-splash-ring-expand {
          from { transform: scale(1); opacity: 0.6; }
          to { transform: scale(4); opacity: 0; }
        }
        @keyframes cl-splash-glow-pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.15); }
        }
        @keyframes cl-splash-line-sweep {
          from { width: 0; }
          to { width: 240px; }
        }
        @keyframes cl-splash-subtitle-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes cl-splash-dots {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
